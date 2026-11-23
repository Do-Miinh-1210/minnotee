using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;

namespace MinNote.Services
{
    public sealed class NativeRecordingResult
    {
        public string TempPath { get; init; } = "";
        public string FileName { get; init; } = "";
        public long SizeBytes { get; init; }
        public long DurationMs { get; init; }
        public int Width { get; init; }
        public int Height { get; init; }
        public int Fps { get; init; }
        public bool HasAudio { get; init; }
    }

    /// <summary>
    /// Pure native Windows screen + microphone recorder using:
    /// - GDI BitBlt (captures exact screen coordinates; automatically excludes any HWND with WDA_EXCLUDEFROMCAPTURE)
    /// - Windows Media Foundation IMFSinkWriter (hardware-accelerated H.264 + AAC -> standard .mp4 directly on disk)
    /// - WinMM waveIn (48 kHz 16-bit PCM microphone capture)
    /// Zero browser getDisplayMedia -> ZERO "Sharing this tab" infobar, ZERO layout shift, ZERO RAM bloat.
    /// </summary>
    public sealed class NativeScreenRecorder : IDisposable
    {
        public static NativeScreenRecorder Instance { get; } = new NativeScreenRecorder();

        public static string GetTempDir()
        {
            string dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "MinNote",
                "rec_temp");
            Directory.CreateDirectory(dir);
            return dir;
        }

        private readonly object _stateLock = new();
        private readonly object _writeLock = new();

        private Thread? _captureThread;
        private CancellationTokenSource? _cts;
        private TaskCompletionSource<NativeRecordingResult>? _stopTcs;

        private volatile bool _isRecording;
        private volatile bool _isPaused;

        private string _tempPath = "";
        private string _fileName = "";
        private int _screenX, _screenY, _width, _height, _fps, _videoBitrate, _audioBitrate;
        private bool _captureMic, _showCursor;

        // Shared timing (100-nanosecond Media Foundation ticks)
        private readonly Stopwatch _clock = new();
        private long _accumulatedTicks100Ns;
        private long _lastVideoTs100Ns = -1;
        private long _audioSamplesWritten;
        private int _audioStreamIndex = -1;
        private int _videoStreamIndex = -1;
        private IMFSinkWriter? _sinkWriter;

        // WinMM waveIn microphone fields (CALLBACK_EVENT + dedicated MTA pump thread)
        private IntPtr _hWaveIn = IntPtr.Zero;
        private AutoResetEvent? _waveEvent;
        private Thread? _audioThread;
        private GCHandle[]? _waveHdrHandles;
        private GCHandle[]? _waveBufHandles;
        private IntPtr[]? _waveHdrPtrs;
        private int _audioChannels = 2;
        private const int AudioSampleRate = 48000;
        private const int AudioBitsPerSample = 16;

        public bool IsRecording => _isRecording;
        public bool IsPaused => _isPaused;

        public long ElapsedMs
        {
            get
            {
                lock (_writeLock)
                {
                    long ticks = _accumulatedTicks100Ns;
                    if (_isRecording && !_isPaused && _clock.IsRunning)
                    {
                        ticks += (long)(_clock.Elapsed.TotalSeconds * 10_000_000.0);
                    }
                    return ticks / 10_000;
                }
            }
        }

        public event Action<bool, bool>? StateChanged; // (isRecording, isPaused)

        private NativeScreenRecorder() { }

        public void Start(
            int screenX, int screenY, int width, int height,
            int fps, int videoBitrate, int audioBitrate,
            bool captureMic, bool showCursor)
        {
            lock (_stateLock)
            {
                if (_isRecording) throw new InvalidOperationException("Đang quay màn hình.");

                // H.264 requires even width/height
                _screenX = screenX;
                _screenY = screenY;
                _width = Math.Max(64, (width / 2) * 2);
                _height = Math.Max(64, (height / 2) * 2);
                _fps = fps == 30 ? 30 : 60;
                _videoBitrate = Math.Clamp(videoBitrate, 2_000_000, 40_000_000);
                _audioBitrate = Math.Clamp(audioBitrate, 96_000, 256_000);
                _captureMic = captureMic;
                _showCursor = showCursor;

                CleanupOldTempFiles();
                string dir = GetTempDir();
                _fileName = $"rec_{DateTime.Now:yyyyMMdd_HHmmss}_{Guid.NewGuid().ToString("N")[..6]}.mp4";
                _tempPath = Path.Combine(dir, _fileName);

                _isPaused = false;
                _accumulatedTicks100Ns = 0;
                _lastVideoTs100Ns = -1;
                _audioSamplesWritten = 0;
                _audioStreamIndex = -1;
                _videoStreamIndex = -1;
                _clock.Reset();

                _cts = new CancellationTokenSource();
                _stopTcs = new TaskCompletionSource<NativeRecordingResult>(TaskCreationOptions.RunContinuationsAsynchronously);

                var initDone = new ManualResetEventSlim(false);
                Exception? initError = null;

                _captureThread = new Thread(() => CaptureLoop(initDone, err => initError = err, _cts.Token))
                {
                    IsBackground = true,
                    Name = "MinNote-NativeRecorder",
                    Priority = ThreadPriority.AboveNormal
                };
                _captureThread.SetApartmentState(ApartmentState.MTA);
                _captureThread.Start();

                initDone.Wait(TimeSpan.FromSeconds(10));
                if (initError != null)
                {
                    _cts.Cancel();
                    throw new InvalidOperationException("Không thể khởi tạo bộ mã hóa video Windows: " + initError.Message, initError);
                }

                _isRecording = true;
            }

            StateChanged?.Invoke(true, false);
        }

        public bool TogglePause()
        {
            bool nowPaused;
            lock (_writeLock)
            {
                if (!_isRecording) return false;
                if (!_isPaused)
                {
                    _accumulatedTicks100Ns += (long)(_clock.Elapsed.TotalSeconds * 10_000_000.0);
                    _clock.Reset();
                    _isPaused = true;
                }
                else
                {
                    _clock.Restart();
                    _isPaused = false;
                }
                nowPaused = _isPaused;
            }
            StateChanged?.Invoke(true, nowPaused);
            return nowPaused;
        }

        public async Task<NativeRecordingResult?> StopAsync()
        {
            Task<NativeRecordingResult>? waitTask;
            lock (_stateLock)
            {
                if (!_isRecording || _cts == null || _stopTcs == null) return null;
                _cts.Cancel();
                waitTask = _stopTcs.Task;
            }

            try
            {
                var res = await waitTask.WaitAsync(TimeSpan.FromSeconds(15));
                return res;
            }
            finally
            {
                lock (_stateLock)
                {
                    _isRecording = false;
                    _isPaused = false;
                    _cts?.Dispose();
                    _cts = null;
                    _captureThread = null;
                }
                StateChanged?.Invoke(false, false);
            }
        }

        public static void DeleteTempFile(string? tempPath)
        {
            if (string.IsNullOrWhiteSpace(tempPath)) return;
            try
            {
                string full = Path.GetFullPath(tempPath);
                string tempDir = Path.GetFullPath(GetTempDir());
                if (full.StartsWith(tempDir, StringComparison.OrdinalIgnoreCase) && File.Exists(full))
                {
                    File.Delete(full);
                }
            }
            catch { }
        }

        private static void CleanupOldTempFiles()
        {
            try
            {
                string dir = GetTempDir();
                DateTime cutoff = DateTime.UtcNow.AddHours(-6);
                foreach (var f in Directory.GetFiles(dir, "rec_*.mp4"))
                {
                    try
                    {
                        if (File.GetLastWriteTimeUtc(f) < cutoff) File.Delete(f);
                    }
                    catch { }
                }
            }
            catch { }
        }

        private long GetCurrentTimestamp100NsLocked()
        {
            long ticks = _accumulatedTicks100Ns;
            if (!_isPaused && _clock.IsRunning)
            {
                ticks += (long)(_clock.Elapsed.TotalSeconds * 10_000_000.0);
            }
            return ticks;
        }

        private void CaptureLoop(ManualResetEventSlim initDone, Action<Exception> onInitError, CancellationToken token)
        {
            bool mfStarted = false;
            IntPtr desktopDc = IntPtr.Zero;
            IntPtr memDc = IntPtr.Zero;
            IntPtr hBitmap = IntPtr.Zero;
            IntPtr oldObj = IntPtr.Zero;
            IntPtr dibBits = IntPtr.Zero;
            bool hasAudio = false;
            long finalDurationMs = 0;

            try
            {
                int hr = MFStartup(MF_VERSION, MFSTARTUP_NOSOCKET);
                if (hr < 0) Marshal.ThrowExceptionForHR(hr);
                mfStarted = true;

                // Create IMFSinkWriter with hardware transforms + MP4 container
                hr = MFCreateAttributes(out IMFAttributes attrs, 4);
                if (hr < 0) Marshal.ThrowExceptionForHR(hr);
                attrs.SetUINT32(MF_READWRITE_ENABLE_HARDWARE_TRANSFORMS, 1);
                attrs.SetUINT32(MF_SINK_WRITER_DISABLE_THROTTLING, 1);
                attrs.SetGUID(MF_TRANSCODE_CONTAINERTYPE, MFTranscodeContainerType_MPEG4);

                hr = MFCreateSinkWriterFromURL(_tempPath, IntPtr.Zero, attrs, out _sinkWriter);
                Marshal.ReleaseComObject(attrs);
                if (hr < 0) Marshal.ThrowExceptionForHR(hr);

                // 1. Configure H.264 Output Video Stream
                hr = MFCreateMediaType(out IMFMediaType videoOut);
                if (hr < 0) Marshal.ThrowExceptionForHR(hr);
                videoOut.SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Video);
                videoOut.SetGUID(MF_MT_SUBTYPE, MFVideoFormat_H264);
                videoOut.SetUINT32(MF_MT_AVG_BITRATE, (uint)_videoBitrate);
                videoOut.SetUINT32(MF_MT_INTERLACE_MODE, 2); // Progressive
                videoOut.SetUINT64(MF_MT_FRAME_SIZE, PackUInt64((uint)_width, (uint)_height));
                videoOut.SetUINT64(MF_MT_FRAME_RATE, PackUInt64((uint)_fps, 1));
                videoOut.SetUINT64(MF_MT_PIXEL_ASPECT_RATIO, PackUInt64(1, 1));
                videoOut.SetUINT32(MF_MT_MPEG2_PROFILE, 100); // H.264 High Profile
                hr = _sinkWriter.AddStream(videoOut, out _videoStreamIndex);
                Marshal.ReleaseComObject(videoOut);
                if (hr < 0) Marshal.ThrowExceptionForHR(hr);

                // Configure RGB32 Input Video Stream (top-down DIB, positive stride = width * 4)
                hr = MFCreateMediaType(out IMFMediaType videoIn);
                if (hr < 0) Marshal.ThrowExceptionForHR(hr);
                videoIn.SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Video);
                videoIn.SetGUID(MF_MT_SUBTYPE, MFVideoFormat_RGB32);
                videoIn.SetUINT32(MF_MT_INTERLACE_MODE, 2);
                videoIn.SetUINT64(MF_MT_FRAME_SIZE, PackUInt64((uint)_width, (uint)_height));
                videoIn.SetUINT64(MF_MT_FRAME_RATE, PackUInt64((uint)_fps, 1));
                videoIn.SetUINT64(MF_MT_PIXEL_ASPECT_RATIO, PackUInt64(1, 1));
                videoIn.SetUINT32(MF_MT_DEFAULT_STRIDE, (uint)(_width * 4));
                hr = _sinkWriter.SetInputMediaType(_videoStreamIndex, videoIn, null);
                Marshal.ReleaseComObject(videoIn);
                if (hr < 0) Marshal.ThrowExceptionForHR(hr);

                // 2. Optional AAC Audio Stream (Microphone)
                if (_captureMic)
                {
                    hasAudio = TryConfigureAudioStream();
                }

                // 3. Begin writing MP4
                hr = _sinkWriter.BeginWriting();
                if (hr < 0) Marshal.ThrowExceptionForHR(hr);

                // 4. Allocate reusable top-down 32-bit GDI DIBSection
                desktopDc = GetDC(IntPtr.Zero);
                memDc = CreateCompatibleDC(desktopDc);
                var bmi = new BITMAPINFO
                {
                    bmiHeader = new BITMAPINFOHEADER
                    {
                        biSize = (uint)Marshal.SizeOf<BITMAPINFOHEADER>(),
                        biWidth = _width,
                        biHeight = -_height, // negative = top-down DIB matching positive MF_MT_DEFAULT_STRIDE!
                        biPlanes = 1,
                        biBitCount = 32,
                        biCompression = 0 // BI_RGB
                    }
                };
                hBitmap = CreateDIBSection(memDc, ref bmi, 0, out dibBits, IntPtr.Zero, 0);
                if (hBitmap == IntPtr.Zero || dibBits == IntPtr.Zero)
                    throw new InvalidOperationException("CreateDIBSection failed.");
                oldObj = SelectObject(memDc, hBitmap);

                // Start clock and microphone capture
                lock (_writeLock)
                {
                    _clock.Restart();
                }
                if (hasAudio)
                {
                    if (!StartWaveInCapture(token))
                    {
                        hasAudio = false;
                    }
                }

                initDone.Set();

                // 5. High-precision frame capture loop
                int frameBytes = _width * _height * 4;
                long frameDur100Ns = 10_000_000L / _fps;
                double frameIntervalMs = 1000.0 / _fps;
                var paceSw = Stopwatch.StartNew();
                long frameNum = 0;

                while (!token.IsCancellationRequested)
                {
                    if (_isPaused)
                    {
                        Thread.Sleep(25);
                        paceSw.Restart();
                        frameNum = 0;
                        continue;
                    }

                    long ts100Ns;
                    lock (_writeLock)
                    {
                        if (_isPaused) continue;
                        ts100Ns = GetCurrentTimestamp100NsLocked();
                        if (_lastVideoTs100Ns >= 0 && ts100Ns <= _lastVideoTs100Ns)
                        {
                            ts100Ns = _lastVideoTs100Ns + 10_000; // monotonic guarantee (+1ms)
                        }
                    }

                    // Capture exact desktop region (any WDA_EXCLUDEFROMCAPTURE window is omitted by DWM!)
                    if (!BitBlt(memDc, 0, 0, _width, _height, desktopDc, _screenX, _screenY, SRCCOPY))
                    {
                        if (desktopDc != IntPtr.Zero) ReleaseDC(IntPtr.Zero, desktopDc);
                        desktopDc = GetDC(IntPtr.Zero);
                        BitBlt(memDc, 0, 0, _width, _height, desktopDc, _screenX, _screenY, SRCCOPY);
                    }

                    if (_showCursor)
                    {
                        DrawSystemCursor(memDc, _screenX, _screenY);
                    }

                    WriteVideoFrame(dibBits, frameBytes, ts100Ns, frameDur100Ns);

                    frameNum++;
                    double targetMs = frameNum * frameIntervalMs;
                    double remainingMs = targetMs - paceSw.Elapsed.TotalMilliseconds;
                    if (remainingMs > 2.0)
                    {
                        Thread.Sleep((int)(remainingMs - 1.0));
                    }
                    while (!token.IsCancellationRequested && paceSw.Elapsed.TotalMilliseconds < targetMs)
                    {
                        Thread.SpinWait(80);
                    }
                }

                // Finalize cleanly
                StopWaveInCapture();

                lock (_writeLock)
                {
                    finalDurationMs = GetCurrentTimestamp100NsLocked() / 10_000;
                    _clock.Stop();
                    if (_sinkWriter != null)
                    {
                        try { _sinkWriter.Finalize(); } catch { }
                        Marshal.ReleaseComObject(_sinkWriter);
                        _sinkWriter = null;
                    }
                }

                long fileSize = File.Exists(_tempPath) ? new FileInfo(_tempPath).Length : 0;
                _stopTcs?.TrySetResult(new NativeRecordingResult
                {
                    TempPath = _tempPath,
                    FileName = _fileName,
                    SizeBytes = fileSize,
                    DurationMs = finalDurationMs,
                    Width = _width,
                    Height = _height,
                    Fps = _fps,
                    HasAudio = hasAudio
                });
            }
            catch (Exception ex)
            {
                if (!initDone.IsSet)
                {
                    onInitError(ex);
                    initDone.Set();
                }
                StopWaveInCapture();
                lock (_writeLock)
                {
                    if (_sinkWriter != null)
                    {
                        try { Marshal.ReleaseComObject(_sinkWriter); } catch { }
                        _sinkWriter = null;
                    }
                }
                _stopTcs?.TrySetException(ex);
            }
            finally
            {
                if (oldObj != IntPtr.Zero && memDc != IntPtr.Zero) SelectObject(memDc, oldObj);
                if (hBitmap != IntPtr.Zero) DeleteObject(hBitmap);
                if (memDc != IntPtr.Zero) DeleteDC(memDc);
                if (desktopDc != IntPtr.Zero) ReleaseDC(IntPtr.Zero, desktopDc);
                if (mfStarted)
                {
                    try { MFShutdown(); } catch { }
                }
            }
        }

        private bool TryConfigureAudioStream()
        {
            if (_sinkWriter == null || waveInGetNumDevs() == 0) return false;
            foreach (int ch in new[] { 2, 1 })
            {
                try
                {
                    int hr = MFCreateMediaType(out IMFMediaType aacOut);
                    if (hr < 0) continue;
                    aacOut.SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
                    aacOut.SetGUID(MF_MT_SUBTYPE, MFAudioFormat_AAC);
                    aacOut.SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, AudioBitsPerSample);
                    aacOut.SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, AudioSampleRate);
                    aacOut.SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, (uint)ch);
                    aacOut.SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, (uint)(_audioBitrate / 8));
                    aacOut.SetUINT32(MF_MT_AAC_PAYLOAD_TYPE, 0);
                    aacOut.SetUINT32(MF_MT_AAC_AUDIO_PROFILE_LEVEL_INDICATION, 0x29);

                    hr = _sinkWriter.AddStream(aacOut, out int streamIdx);
                    Marshal.ReleaseComObject(aacOut);
                    if (hr < 0) continue;

                    hr = MFCreateMediaType(out IMFMediaType pcmIn);
                    if (hr < 0) continue;
                    int blockAlign = ch * (AudioBitsPerSample / 8);
                    pcmIn.SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Audio);
                    pcmIn.SetGUID(MF_MT_SUBTYPE, MFAudioFormat_PCM);
                    pcmIn.SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE, AudioBitsPerSample);
                    pcmIn.SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND, AudioSampleRate);
                    pcmIn.SetUINT32(MF_MT_AUDIO_NUM_CHANNELS, (uint)ch);
                    pcmIn.SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT, (uint)blockAlign);
                    pcmIn.SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND, (uint)(AudioSampleRate * blockAlign));

                    hr = _sinkWriter.SetInputMediaType(streamIdx, pcmIn, null);
                    Marshal.ReleaseComObject(pcmIn);
                    if (hr >= 0)
                    {
                        _audioChannels = ch;
                        _audioStreamIndex = streamIdx;
                        return true;
                    }
                }
                catch { }
            }
            return false;
        }

        private bool StartWaveInCapture(CancellationToken token)
        {
            if (_audioStreamIndex < 0) return false;
            try
            {
                int blockAlign = _audioChannels * (AudioBitsPerSample / 8);
                var fmt = new WAVEFORMATEX
                {
                    wFormatTag = 1, // WAVE_FORMAT_PCM
                    nChannels = (ushort)_audioChannels,
                    nSamplesPerSec = AudioSampleRate,
                    wBitsPerSample = AudioBitsPerSample,
                    nBlockAlign = (ushort)blockAlign,
                    nAvgBytesPerSec = (uint)(AudioSampleRate * blockAlign),
                    cbSize = 0
                };

                _waveEvent = new AutoResetEvent(false);
                IntPtr hEvent = _waveEvent.SafeWaitHandle.DangerousGetHandle();
                int res = waveInOpen(out _hWaveIn, WAVE_MAPPER, ref fmt, hEvent, IntPtr.Zero, CALLBACK_EVENT);
                if (res != 0 || _hWaveIn == IntPtr.Zero)
                {
                    _waveEvent.Dispose();
                    _waveEvent = null;
                    return false;
                }

                int bufCount = 6;
                int bufBytes = (AudioSampleRate / 25) * blockAlign; // 40ms chunks
                _waveBufHandles = new GCHandle[bufCount];
                _waveHdrHandles = new GCHandle[bufCount];
                _waveHdrPtrs = new IntPtr[bufCount];

                int hdrSize = Marshal.SizeOf<WAVEHDR>();
                for (int i = 0; i < bufCount; i++)
                {
                    byte[] data = new byte[bufBytes];
                    _waveBufHandles[i] = GCHandle.Alloc(data, GCHandleType.Pinned);
                    var hdr = new WAVEHDR
                    {
                        lpData = _waveBufHandles[i].AddrOfPinnedObject(),
                        dwBufferLength = (uint)bufBytes
                    };
                    _waveHdrHandles[i] = GCHandle.Alloc(hdr, GCHandleType.Pinned);
                    _waveHdrPtrs[i] = _waveHdrHandles[i].AddrOfPinnedObject();
                    waveInPrepareHeader(_hWaveIn, _waveHdrPtrs[i], (uint)hdrSize);
                    waveInAddBuffer(_hWaveIn, _waveHdrPtrs[i], (uint)hdrSize);
                }

                if (waveInStart(_hWaveIn) != 0)
                {
                    StopWaveInCapture();
                    return false;
                }

                _audioThread = new Thread(() => AudioPumpLoop(token))
                {
                    IsBackground = true,
                    Name = "MinNote-NativeRecorderAudio",
                    Priority = ThreadPriority.AboveNormal
                };
                _audioThread.SetApartmentState(ApartmentState.MTA);
                _audioThread.Start();
                return true;
            }
            catch
            {
                StopWaveInCapture();
                return false;
            }
        }

        private void AudioPumpLoop(CancellationToken token)
        {
            uint hdrSize = (uint)Marshal.SizeOf<WAVEHDR>();
            while (!token.IsCancellationRequested)
            {
                try
                {
                    _waveEvent?.WaitOne(40);
                }
                catch { break; }

                if (token.IsCancellationRequested) break;
                IntPtr hwi = _hWaveIn;
                var ptrs = _waveHdrPtrs;
                if (hwi == IntPtr.Zero || ptrs == null) break;

                for (int i = 0; i < ptrs.Length; i++)
                {
                    IntPtr pHdr = ptrs[i];
                    if (pHdr == IntPtr.Zero) continue;
                    var hdr = Marshal.PtrToStructure<WAVEHDR>(pHdr);
                    if ((hdr.dwFlags & WHDR_DONE) == 0) continue;

                    if (hdr.dwBytesRecorded > 0 && !_isPaused && _sinkWriter != null && _audioStreamIndex >= 0 && !token.IsCancellationRequested)
                    {
                        WriteAudioChunk(hdr.lpData, (int)hdr.dwBytesRecorded);
                    }

                    if (!token.IsCancellationRequested && _hWaveIn != IntPtr.Zero)
                    {
                        waveInAddBuffer(hwi, pHdr, hdrSize);
                    }
                }
            }
        }

        private void StopWaveInCapture()
        {
            try { _waveEvent?.Set(); } catch { }
            var audioThread = _audioThread;
            _audioThread = null;
            if (audioThread != null && audioThread != Thread.CurrentThread)
            {
                try { audioThread.Join(500); } catch { }
            }

            IntPtr h = _hWaveIn;
            _hWaveIn = IntPtr.Zero;
            if (h != IntPtr.Zero)
            {
                try { waveInStop(h); } catch { }
                try { waveInReset(h); } catch { }
                if (_waveHdrPtrs != null)
                {
                    uint hdrSize = (uint)Marshal.SizeOf<WAVEHDR>();
                    foreach (var p in _waveHdrPtrs)
                    {
                        try { if (p != IntPtr.Zero) waveInUnprepareHeader(h, p, hdrSize); } catch { }
                    }
                }
                try { waveInClose(h); } catch { }
            }
            if (_waveHdrHandles != null)
            {
                foreach (var gh in _waveHdrHandles) { if (gh.IsAllocated) gh.Free(); }
                _waveHdrHandles = null;
            }
            if (_waveBufHandles != null)
            {
                foreach (var gh in _waveBufHandles) { if (gh.IsAllocated) gh.Free(); }
                _waveBufHandles = null;
            }
            _waveHdrPtrs = null;
            try { _waveEvent?.Dispose(); } catch { }
            _waveEvent = null;
        }

        private void WriteVideoFrame(IntPtr srcBits, int byteCount, long ts100Ns, long dur100Ns)
        {
            int hr = MFCreateMemoryBuffer((uint)byteCount, out IMFMediaBuffer buffer);
            if (hr < 0) return;
            IMFSample? sample = null;
            try
            {
                hr = buffer.Lock(out IntPtr dstPtr, out _, out _);
                if (hr < 0) return;
                try
                {
                    CopyMemory(dstPtr, srcBits, (uint)byteCount);
                }
                finally
                {
                    buffer.Unlock();
                }
                buffer.SetCurrentLength((uint)byteCount);

                hr = MFCreateSample(out sample);
                if (hr < 0) return;
                sample.AddBuffer(buffer);
                sample.SetSampleTime(ts100Ns);
                sample.SetSampleDuration(dur100Ns);

                lock (_writeLock)
                {
                    if (_sinkWriter != null && !_isPaused)
                    {
                        _sinkWriter.WriteSample(_videoStreamIndex, sample);
                        _lastVideoTs100Ns = ts100Ns;
                    }
                }
            }
            finally
            {
                if (sample != null) Marshal.ReleaseComObject(sample);
                Marshal.ReleaseComObject(buffer);
            }
        }

        private void WriteAudioChunk(IntPtr pcmData, int byteCount)
        {
            int blockAlign = _audioChannels * (AudioBitsPerSample / 8);
            int numSamples = byteCount / blockAlign;
            if (numSamples <= 0) return;

            int hr = MFCreateMemoryBuffer((uint)byteCount, out IMFMediaBuffer buffer);
            if (hr < 0) return;
            IMFSample? sample = null;
            try
            {
                hr = buffer.Lock(out IntPtr dstPtr, out _, out _);
                if (hr < 0) return;
                try
                {
                    CopyMemory(dstPtr, pcmData, (uint)byteCount);
                }
                finally
                {
                    buffer.Unlock();
                }
                buffer.SetCurrentLength((uint)byteCount);

                hr = MFCreateSample(out sample);
                if (hr < 0) return;
                sample.AddBuffer(buffer);

                long dur100Ns = (long)numSamples * 10_000_000L / AudioSampleRate;
                lock (_writeLock)
                {
                    if (_sinkWriter != null && !_isPaused && _audioStreamIndex >= 0)
                    {
                        long ts100Ns = _audioSamplesWritten * 10_000_000L / AudioSampleRate;
                        // Gently re-align if drifted > 80ms from video clock (e.g., audio startup delay)
                        long curClock = GetCurrentTimestamp100NsLocked();
                        if (_audioSamplesWritten == 0 && curClock > 0)
                        {
                            ts100Ns = curClock;
                            _audioSamplesWritten = curClock * AudioSampleRate / 10_000_000L;
                        }
                        sample.SetSampleTime(ts100Ns);
                        sample.SetSampleDuration(dur100Ns);
                        _sinkWriter.WriteSample(_audioStreamIndex, sample);
                        _audioSamplesWritten += numSamples;
                    }
                }
            }
            finally
            {
                if (sample != null) Marshal.ReleaseComObject(sample);
                Marshal.ReleaseComObject(buffer);
            }
        }

        private static void DrawSystemCursor(IntPtr memDc, int originX, int originY)
        {
            var ci = new CURSORINFO { cbSize = Marshal.SizeOf<CURSORINFO>() };
            if (!GetCursorInfo(ref ci) || (ci.flags & CURSOR_SHOWING) == 0 || ci.hCursor == IntPtr.Zero)
                return;
            int cx = ci.ptScreenPos.X - originX;
            int cy = ci.ptScreenPos.Y - originY;
            if (GetIconInfo(ci.hCursor, out ICONINFO ii))
            {
                try
                {
                    DrawIconEx(memDc, cx - ii.xHotspot, cy - ii.yHotspot, ci.hCursor, 0, 0, 0, IntPtr.Zero, DI_NORMAL);
                }
                finally
                {
                    if (ii.hbmColor != IntPtr.Zero) DeleteObject(ii.hbmColor);
                    if (ii.hbmMask != IntPtr.Zero) DeleteObject(ii.hbmMask);
                }
            }
            else
            {
                DrawIconEx(memDc, cx, cy, ci.hCursor, 0, 0, 0, IntPtr.Zero, DI_NORMAL);
            }
        }

        private static ulong PackUInt64(uint high, uint low) => ((ulong)high << 32) | low;

        public void Dispose()
        {
            try { _cts?.Cancel(); } catch { }
            StopWaveInCapture();
        }

        // =====================================================================
        // Win32 GDI / Cursor P/Invoke
        // =====================================================================
        private const int SRCCOPY = 0x00CC0020;
        private const int CURSOR_SHOWING = 0x00000001;
        private const int DI_NORMAL = 0x0003;

        [DllImport("kernel32.dll", EntryPoint = "RtlMoveMemory")] private static extern void CopyMemory(IntPtr dest, IntPtr src, uint count);
        [DllImport("user32.dll")] private static extern IntPtr GetDC(IntPtr hWnd);
        [DllImport("user32.dll")] private static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
        [DllImport("gdi32.dll")] private static extern IntPtr CreateCompatibleDC(IntPtr hdc);
        [DllImport("gdi32.dll")] private static extern bool DeleteDC(IntPtr hdc);
        [DllImport("gdi32.dll")] private static extern IntPtr SelectObject(IntPtr hdc, IntPtr h);
        [DllImport("gdi32.dll")] private static extern bool DeleteObject(IntPtr ho);
        [DllImport("gdi32.dll")] private static extern bool BitBlt(IntPtr hdcDest, int xDest, int yDest, int w, int h, IntPtr hdcSrc, int xSrc, int ySrc, int rop);
        [DllImport("gdi32.dll")] private static extern IntPtr CreateDIBSection(IntPtr hdc, ref BITMAPINFO pbmi, uint usage, out IntPtr ppvBits, IntPtr hSection, uint offset);
        [DllImport("user32.dll")] private static extern bool GetCursorInfo(ref CURSORINFO pci);
        [DllImport("user32.dll")] private static extern bool GetIconInfo(IntPtr hIcon, out ICONINFO piconinfo);
        [DllImport("user32.dll")] private static extern bool DrawIconEx(IntPtr hdc, int xLeft, int yTop, IntPtr hIcon, int cxWidth, int cyWidth, int istepIfAniCur, IntPtr hbrFlickerFreeDraw, int diFlags);

        [StructLayout(LayoutKind.Sequential)]
        private struct BITMAPINFOHEADER
        {
            public uint biSize;
            public int biWidth;
            public int biHeight;
            public ushort biPlanes;
            public ushort biBitCount;
            public uint biCompression;
            public uint biSizeImage;
            public int biXPelsPerMeter;
            public int biYPelsPerMeter;
            public uint biClrUsed;
            public uint biClrImportant;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct BITMAPINFO
        {
            public BITMAPINFOHEADER bmiHeader;
            public uint bmiColors;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct POINT { public int X; public int Y; }

        [StructLayout(LayoutKind.Sequential)]
        private struct CURSORINFO
        {
            public int cbSize;
            public int flags;
            public IntPtr hCursor;
            public POINT ptScreenPos;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct ICONINFO
        {
            public bool fIcon;
            public int xHotspot;
            public int yHotspot;
            public IntPtr hbmMask;
            public IntPtr hbmColor;
        }

        // =====================================================================
        // WinMM waveIn P/Invoke (Microphone PCM via CALLBACK_EVENT)
        // =====================================================================
        private const uint WAVE_MAPPER = 0xFFFFFFFF;
        private const uint CALLBACK_EVENT = 0x00050000;
        private const uint WHDR_DONE = 0x00000001;

        [StructLayout(LayoutKind.Sequential)]
        private struct WAVEFORMATEX
        {
            public ushort wFormatTag;
            public ushort nChannels;
            public uint nSamplesPerSec;
            public uint nAvgBytesPerSec;
            public ushort nBlockAlign;
            public ushort wBitsPerSample;
            public ushort cbSize;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct WAVEHDR
        {
            public IntPtr lpData;
            public uint dwBufferLength;
            public uint dwBytesRecorded;
            public IntPtr dwUser;
            public uint dwFlags;
            public uint dwLoops;
            public IntPtr lpNext;
            public IntPtr reserved;
        }

        [DllImport("winmm.dll")] private static extern uint waveInGetNumDevs();
        [DllImport("winmm.dll")] private static extern int waveInOpen(out IntPtr phwi, uint uDeviceID, ref WAVEFORMATEX lpFormat, IntPtr dwCallback, IntPtr dwInstance, uint fdwOpen);
        [DllImport("winmm.dll")] private static extern int waveInPrepareHeader(IntPtr hwi, IntPtr pwh, uint cbwh);
        [DllImport("winmm.dll")] private static extern int waveInUnprepareHeader(IntPtr hwi, IntPtr pwh, uint cbwh);
        [DllImport("winmm.dll")] private static extern int waveInAddBuffer(IntPtr hwi, IntPtr pwh, uint cbwh);
        [DllImport("winmm.dll")] private static extern int waveInStart(IntPtr hwi);
        [DllImport("winmm.dll")] private static extern int waveInStop(IntPtr hwi);
        [DllImport("winmm.dll")] private static extern int waveInReset(IntPtr hwi);
        [DllImport("winmm.dll")] private static extern int waveInClose(IntPtr hwi);

        // =====================================================================
        // Windows Media Foundation P/Invoke & COM Interfaces
        // =====================================================================
        private const uint MF_VERSION = 0x00020070;
        private const uint MFSTARTUP_NOSOCKET = 1;

        private static readonly Guid MFMediaType_Video = new("73646976-0000-0010-8000-00AA00389B71");
        private static readonly Guid MFMediaType_Audio = new("73647561-0000-0010-8000-00AA00389B71");
        private static readonly Guid MFVideoFormat_H264 = new("34363248-0000-0010-8000-00AA00389B71");
        private static readonly Guid MFVideoFormat_RGB32 = new("00000016-0000-0010-8000-00AA00389B71");
        private static readonly Guid MFAudioFormat_AAC = new("00001610-0000-0010-8000-00AA00389B71");
        private static readonly Guid MFAudioFormat_PCM = new("00000001-0000-0010-8000-00AA00389B71");

        private static readonly Guid MF_MT_MAJOR_TYPE = new("48eba18e-f8c9-4687-bf11-0a74c9f96a8f");
        private static readonly Guid MF_MT_SUBTYPE = new("f7e34c9a-42e8-4714-b74b-cb29d72c35e5");
        private static readonly Guid MF_MT_AVG_BITRATE = new("20332624-fb0d-4d9e-bd0d-cbf6786c102e");
        private static readonly Guid MF_MT_INTERLACE_MODE = new("e2724bb8-e676-4806-b4b2-a8d6efb44ccd");
        private static readonly Guid MF_MT_FRAME_SIZE = new("1652c33d-d6b2-4012-b834-72030849a37d");
        private static readonly Guid MF_MT_FRAME_RATE = new("c459a2e8-3d2c-4e44-b132-fee5156c7bb0");
        private static readonly Guid MF_MT_PIXEL_ASPECT_RATIO = new("c6376a1e-8d0a-4027-be45-6d9a0ad39bb6");
        private static readonly Guid MF_MT_DEFAULT_STRIDE = new("644b4e48-1e02-4516-b0eb-c01ca9d49ac6");
        private static readonly Guid MF_MT_MPEG2_PROFILE = new("ad76a80b-2d5c-4e0b-84fd-1d5c5bdf00d3");

        private static readonly Guid MF_MT_AUDIO_NUM_CHANNELS = new("37e48bf5-645e-4c5b-89de-ada9e29b696a");
        private static readonly Guid MF_MT_AUDIO_SAMPLES_PER_SECOND = new("5faeeae7-0290-4c31-9e8a-c534f68d9dba");
        private static readonly Guid MF_MT_AUDIO_BITS_PER_SAMPLE = new("f2deb57f-40fa-4764-aa33-ed4f2d1ff669");
        private static readonly Guid MF_MT_AUDIO_AVG_BYTES_PER_SECOND = new("1aab75c8-cfef-451c-ab95-ac034b8e1731");
        private static readonly Guid MF_MT_AUDIO_BLOCK_ALIGNMENT = new("322de230-9eeb-43bd-ab7a-ff412251541d");
        private static readonly Guid MF_MT_AAC_PAYLOAD_TYPE = new("bfbabe79-7434-4d1c-94f0-72a3b9e17188");
        private static readonly Guid MF_MT_AAC_AUDIO_PROFILE_LEVEL_INDICATION = new("7632f0e6-9538-4d61-acda-ea29c8c14456");

        private static readonly Guid MF_READWRITE_ENABLE_HARDWARE_TRANSFORMS = new("a634a91c-822b-41b9-a494-4de4643612b0");
        private static readonly Guid MF_SINK_WRITER_DISABLE_THROTTLING = new("08b845d8-2b74-4afe-9d53-be16d2d5ae4f");
        private static readonly Guid MF_TRANSCODE_CONTAINERTYPE = new("150ff23f-4abc-478b-ac4f-e1916fba1cca");
        private static readonly Guid MFTranscodeContainerType_MPEG4 = new("dc6cd05d-b9d0-40ef-bd35-fa622c1ab28a");

        [DllImport("mfplat.dll")] private static extern int MFStartup(uint version, uint dwFlags);
        [DllImport("mfplat.dll")] private static extern int MFShutdown();
        [DllImport("mfplat.dll")] private static extern int MFCreateAttributes(out IMFAttributes ppMFAttributes, uint cInitialSize);
        [DllImport("mfplat.dll")] private static extern int MFCreateMediaType(out IMFMediaType ppMFType);
        [DllImport("mfplat.dll")] private static extern int MFCreateMemoryBuffer(uint cbMaxLength, out IMFMediaBuffer ppBuffer);
        [DllImport("mfplat.dll")] private static extern int MFCreateSample(out IMFSample ppIMFSample);
        [DllImport("mfreadwrite.dll", CharSet = CharSet.Unicode)]
        private static extern int MFCreateSinkWriterFromURL(
            [MarshalAs(UnmanagedType.LPWStr)] string pwszOutputURL,
            IntPtr pByteStream,
            IMFAttributes pAttributes,
            out IMFSinkWriter ppSinkWriter);

        [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("2cd2d921-c447-44a7-a13c-4adabfc247e3")]
        private interface IMFAttributes
        {
            [PreserveSig] int GetItem(in Guid guidKey, IntPtr pValue);
            [PreserveSig] int GetItemType(in Guid guidKey, out int pType);
            [PreserveSig] int CompareItem(in Guid guidKey, IntPtr Value, out bool pbResult);
            [PreserveSig] int Compare(IMFAttributes pTheirs, int MatchType, out bool pbResult);
            [PreserveSig] int GetUINT32(in Guid guidKey, out uint punValue);
            [PreserveSig] int GetUINT64(in Guid guidKey, out ulong punValue);
            [PreserveSig] int GetDouble(in Guid guidKey, out double pfValue);
            [PreserveSig] int GetGUID(in Guid guidKey, out Guid pguidValue);
            [PreserveSig] int GetStringLength(in Guid guidKey, out uint pcchLength);
            [PreserveSig] int GetString(in Guid guidKey, IntPtr pwszValue, uint cchBufSize, out uint pcchLength);
            [PreserveSig] int GetAllocatedString(in Guid guidKey, out IntPtr ppwszValue, out uint pcchLength);
            [PreserveSig] int GetBlobSize(in Guid guidKey, out uint pcbBlobSize);
            [PreserveSig] int GetBlob(in Guid guidKey, IntPtr pBuf, uint cbBufSize, out uint pcbBlobSize);
            [PreserveSig] int GetAllocatedBlob(in Guid guidKey, out IntPtr ppBuf, out uint pcbSize);
            [PreserveSig] int GetUnknown(in Guid guidKey, in Guid riid, out IntPtr ppv);
            [PreserveSig] int SetItem(in Guid guidKey, IntPtr Value);
            [PreserveSig] int DeleteItem(in Guid guidKey);
            [PreserveSig] int DeleteAllItems();
            [PreserveSig] int SetUINT32(in Guid guidKey, uint unValue);
            [PreserveSig] int SetUINT64(in Guid guidKey, ulong unValue);
            [PreserveSig] int SetDouble(in Guid guidKey, double fValue);
            [PreserveSig] int SetGUID(in Guid guidKey, in Guid guidValue);
            [PreserveSig] int SetString(in Guid guidKey, [MarshalAs(UnmanagedType.LPWStr)] string wszValue);
            [PreserveSig] int SetBlob(in Guid guidKey, IntPtr pBuf, uint cbBufSize);
            [PreserveSig] int SetUnknown(in Guid guidKey, [MarshalAs(UnmanagedType.IUnknown)] object pUnknown);
            [PreserveSig] int LockStore();
            [PreserveSig] int UnlockStore();
            [PreserveSig] int GetCount(out uint pcItems);
            [PreserveSig] int GetItemByIndex(uint unIndex, out Guid pguidKey, IntPtr pValue);
            [PreserveSig] int CopyAllItems(IMFAttributes pDest);
        }

        [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("44ae0fa8-ea31-4109-8d2e-4cae4997c555")]
        private interface IMFMediaType : IMFAttributes
        {
            [PreserveSig] new int GetItem(in Guid guidKey, IntPtr pValue);
            [PreserveSig] new int GetItemType(in Guid guidKey, out int pType);
            [PreserveSig] new int CompareItem(in Guid guidKey, IntPtr Value, out bool pbResult);
            [PreserveSig] new int Compare(IMFAttributes pTheirs, int MatchType, out bool pbResult);
            [PreserveSig] new int GetUINT32(in Guid guidKey, out uint punValue);
            [PreserveSig] new int GetUINT64(in Guid guidKey, out ulong punValue);
            [PreserveSig] new int GetDouble(in Guid guidKey, out double pfValue);
            [PreserveSig] new int GetGUID(in Guid guidKey, out Guid pguidValue);
            [PreserveSig] new int GetStringLength(in Guid guidKey, out uint pcchLength);
            [PreserveSig] new int GetString(in Guid guidKey, IntPtr pwszValue, uint cchBufSize, out uint pcchLength);
            [PreserveSig] new int GetAllocatedString(in Guid guidKey, out IntPtr ppwszValue, out uint pcchLength);
            [PreserveSig] new int GetBlobSize(in Guid guidKey, out uint pcbBlobSize);
            [PreserveSig] new int GetBlob(in Guid guidKey, IntPtr pBuf, uint cbBufSize, out uint pcbBlobSize);
            [PreserveSig] new int GetAllocatedBlob(in Guid guidKey, out IntPtr ppBuf, out uint pcbSize);
            [PreserveSig] new int GetUnknown(in Guid guidKey, in Guid riid, out IntPtr ppv);
            [PreserveSig] new int SetItem(in Guid guidKey, IntPtr Value);
            [PreserveSig] new int DeleteItem(in Guid guidKey);
            [PreserveSig] new int DeleteAllItems();
            [PreserveSig] new int SetUINT32(in Guid guidKey, uint unValue);
            [PreserveSig] new int SetUINT64(in Guid guidKey, ulong unValue);
            [PreserveSig] new int SetDouble(in Guid guidKey, double fValue);
            [PreserveSig] new int SetGUID(in Guid guidKey, in Guid guidValue);
            [PreserveSig] new int SetString(in Guid guidKey, [MarshalAs(UnmanagedType.LPWStr)] string wszValue);
            [PreserveSig] new int SetBlob(in Guid guidKey, IntPtr pBuf, uint cbBufSize);
            [PreserveSig] new int SetUnknown(in Guid guidKey, [MarshalAs(UnmanagedType.IUnknown)] object pUnknown);
            [PreserveSig] new int LockStore();
            [PreserveSig] new int UnlockStore();
            [PreserveSig] new int GetCount(out uint pcItems);
            [PreserveSig] new int GetItemByIndex(uint unIndex, out Guid pguidKey, IntPtr pValue);
            [PreserveSig] new int CopyAllItems(IMFAttributes pDest);

            [PreserveSig] int GetMajorType(out Guid pguidMajorType);
            [PreserveSig] int IsCompressedFormat(out bool pfCompressed);
            [PreserveSig] int IsEqual(IMFMediaType pIMediaType, out uint pdwFlags);
            [PreserveSig] int GetRepresentation(Guid guidRepresentation, out IntPtr ppvRepresentation);
            [PreserveSig] int FreeRepresentation(Guid guidRepresentation, IntPtr pvRepresentation);
        }

        [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("045fa593-8799-42b8-bc8d-8968c6453507")]
        private interface IMFMediaBuffer
        {
            [PreserveSig] int Lock(out IntPtr ppbBuffer, out uint pcbMaxLength, out uint pcbCurrentLength);
            [PreserveSig] int Unlock();
            [PreserveSig] int GetCurrentLength(out uint pcbCurrentLength);
            [PreserveSig] int SetCurrentLength(uint cbCurrentLength);
            [PreserveSig] int GetMaxLength(out uint pcbMaxLength);
        }

        [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("c40a00f2-b93a-4d80-ae8c-5a1c634f58e4")]
        private interface IMFSample : IMFAttributes
        {
            [PreserveSig] new int GetItem(in Guid guidKey, IntPtr pValue);
            [PreserveSig] new int GetItemType(in Guid guidKey, out int pType);
            [PreserveSig] new int CompareItem(in Guid guidKey, IntPtr Value, out bool pbResult);
            [PreserveSig] new int Compare(IMFAttributes pTheirs, int MatchType, out bool pbResult);
            [PreserveSig] new int GetUINT32(in Guid guidKey, out uint punValue);
            [PreserveSig] new int GetUINT64(in Guid guidKey, out ulong punValue);
            [PreserveSig] new int GetDouble(in Guid guidKey, out double pfValue);
            [PreserveSig] new int GetGUID(in Guid guidKey, out Guid pguidValue);
            [PreserveSig] new int GetStringLength(in Guid guidKey, out uint pcchLength);
            [PreserveSig] new int GetString(in Guid guidKey, IntPtr pwszValue, uint cchBufSize, out uint pcchLength);
            [PreserveSig] new int GetAllocatedString(in Guid guidKey, out IntPtr ppwszValue, out uint pcchLength);
            [PreserveSig] new int GetBlobSize(in Guid guidKey, out uint pcbBlobSize);
            [PreserveSig] new int GetBlob(in Guid guidKey, IntPtr pBuf, uint cbBufSize, out uint pcbBlobSize);
            [PreserveSig] new int GetAllocatedBlob(in Guid guidKey, out IntPtr ppBuf, out uint pcbSize);
            [PreserveSig] new int GetUnknown(in Guid guidKey, in Guid riid, out IntPtr ppv);
            [PreserveSig] new int SetItem(in Guid guidKey, IntPtr Value);
            [PreserveSig] new int DeleteItem(in Guid guidKey);
            [PreserveSig] new int DeleteAllItems();
            [PreserveSig] new int SetUINT32(in Guid guidKey, uint unValue);
            [PreserveSig] new int SetUINT64(in Guid guidKey, ulong unValue);
            [PreserveSig] new int SetDouble(in Guid guidKey, double fValue);
            [PreserveSig] new int SetGUID(in Guid guidKey, in Guid guidValue);
            [PreserveSig] new int SetString(in Guid guidKey, [MarshalAs(UnmanagedType.LPWStr)] string wszValue);
            [PreserveSig] new int SetBlob(in Guid guidKey, IntPtr pBuf, uint cbBufSize);
            [PreserveSig] new int SetUnknown(in Guid guidKey, [MarshalAs(UnmanagedType.IUnknown)] object pUnknown);
            [PreserveSig] new int LockStore();
            [PreserveSig] new int UnlockStore();
            [PreserveSig] new int GetCount(out uint pcItems);
            [PreserveSig] new int GetItemByIndex(uint unIndex, out Guid pguidKey, IntPtr pValue);
            [PreserveSig] new int CopyAllItems(IMFAttributes pDest);

            [PreserveSig] int GetSampleFlags(out uint pdwSampleFlags);
            [PreserveSig] int SetSampleFlags(uint dwSampleFlags);
            [PreserveSig] int GetSampleTime(out long phnsSampleTime);
            [PreserveSig] int SetSampleTime(long hnsSampleTime);
            [PreserveSig] int GetSampleDuration(out long phnsSampleDuration);
            [PreserveSig] int SetSampleDuration(long hnsSampleDuration);
            [PreserveSig] int GetBufferCount(out uint pdwBufferCount);
            [PreserveSig] int GetBufferByIndex(uint dwIndex, out IMFMediaBuffer ppBuffer);
            [PreserveSig] int ConvertToContiguousBuffer(out IMFMediaBuffer ppBuffer);
            [PreserveSig] int AddBuffer(IMFMediaBuffer pBuffer);
            [PreserveSig] int RemoveBufferByIndex(uint dwIndex);
            [PreserveSig] int RemoveAllBuffers();
            [PreserveSig] int GetTotalLength(out uint pcbTotalLength);
            [PreserveSig] int CopyToBuffer(IMFMediaBuffer pBuffer);
        }

        [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("3137f1cd-fe5e-4805-a5d8-fb477448cb3d")]
        private interface IMFSinkWriter
        {
            [PreserveSig] int AddStream(IMFMediaType pTargetMediaType, out int pdwStreamIndex);
            [PreserveSig] int SetInputMediaType(int dwStreamIndex, IMFMediaType pInputMediaType, IMFAttributes? pEncodingParameters);
            [PreserveSig] int BeginWriting();
            [PreserveSig] int WriteSample(int dwStreamIndex, IMFSample pSample);
            [PreserveSig] int SendStreamTick(int dwStreamIndex, long llTimestamp);
            [PreserveSig] int PlaceMarker(int dwStreamIndex, IntPtr pvContext);
            [PreserveSig] int NotifyEndOfSegment(int dwStreamIndex);
            [PreserveSig] int Flush(int dwStreamIndex);
            [PreserveSig] int Finalize();
            [PreserveSig] int GetServiceForStream(int dwStreamIndex, in Guid guidService, in Guid riid, out IntPtr ppvObject);
            [PreserveSig] int GetStatistics(int dwStreamIndex, IntPtr pStats);
        }
    }
}
