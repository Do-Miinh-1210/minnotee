/*
 * =============================================================================
 * BẢN QUYỀN SỞ HỮU TRÍ TUỆ — ĐỖ MIINH MATH (MINNOTE PROPRIETARY)
 * Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.
 * DM-COPYRIGHT-OWNER: DoMiinhMath
 * SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath
 * TDM-Reservation: 1
 * -----------------------------------------------------------------------------
 * Đây là bản quyền thuộc sở hữu độc quyền của Đỗ Miinh Math (MinNote).
 * Nghiêm cấm sao chép, phân phối lại, dịch ngược (reverse engineering),
 * giải biên dịch (decompilation), tách thuật toán hoặc sử dụng công cụ AI/LLM
 * tự động trích xuất, tái tạo, huấn luyện trên mã nguồn này khi chưa có sự
 * đồng ý bằng văn bản từ Đỗ Miinh Math.
 * Proprietary & Confidential. Reverse engineering, decompilation, and automated
 * AI/LLM extraction, reconstruction, or training are strictly prohibited.
 * =============================================================================
 */
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace MinNote.Services
{
    /// <summary>
    /// Quản lý Inkscape / MinInk (bản thu gọn như MEA_v5.0) để chuyển SVG trong suốt sang ảnh vector EMF không nền.
    /// Sử dụng tiến trình nền `inkscape.com --shell` (warm process) giúp xuất mỗi ảnh EMF chỉ mất ~5-15 ms.
    /// </summary>
    public sealed class MininkEmfService : IDisposable
    {
        // Dùng chung bản MinInk đã ký SHA-256 của hệ sinh thái MEA_v5.0 (không nhân đôi 85 MB trên ổ cứng)
        public const string AssetUrl = "https://github.com/Do-Miinh-1210/MEA_v5/releases/download/tools-minink-1/MatrixExamAI_Minink.zip";
        public const string PinnedSha256 = "ADDA425A3BCFD6C646455576B35A7DEC57F5DD311DF8F0BA6E0DB4C8B55A823F";
        public const string ExeName = "inkscape.com";

        public static MininkEmfService Instance { get; } = new MininkEmfService();

        private readonly SemaphoreSlim _convertGate = new SemaphoreSlim(1, 1);
        private readonly SemaphoreSlim _downloadGate = new SemaphoreSlim(1, 1);
        private readonly HttpClient _http = new HttpClient { Timeout = TimeSpan.FromMinutes(20) };

        private string? _cachedExePath;
        private Process? _shellProcess;
        private StreamWriter? _shellInput;
        private readonly StringBuilder _shellStdout = new StringBuilder();
        private TaskCompletionSource<bool>? _promptWaiter;
        private readonly object _shellLock = new object();
        private bool _disposed;

        public bool IsDownloading { get; private set; }
        public string? DetectedInkscapePath => FindInkscapePath();
        public bool IsAvailable => !string.IsNullOrEmpty(FindInkscapePath());

        public static string SharedMininkDirectory => Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            @"MatrixExamAI\tools\minink");

        public static string LocalMinNoteMininkDirectory => Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            @"MinNote\tools\minink");

        private MininkEmfService() { }

        /// <summary>
        /// Tìm inkscape.com / minink.com theo thứ tự ưu tiên:
        /// 1) Đi kèm MinNote ({app}\tools\minink)
        /// 2) Tự tải trong LocalAppData (MinNote hoặc dùng chung MatrixExamAI)
        /// 3) Inkscape đã cài sẵn trên Windows hoặc trong PATH
        /// </summary>
        public string? FindInkscapePath(bool forceRefresh = false)
        {
            if (!forceRefresh && !string.IsNullOrEmpty(_cachedExePath) && File.Exists(_cachedExePath))
                return _cachedExePath;

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] toolDirs = new[]
            {
                Path.Combine(baseDir, @"tools\minink"),
                LocalMinNoteMininkDirectory,
                SharedMininkDirectory
            };

            foreach (var dir in toolDirs)
            {
                foreach (var name in new[] { "minink.com", "inkscape.com", "inkscape.exe" })
                {
                    string candidate = Path.Combine(dir, name);
                    if (File.Exists(candidate))
                    {
                        _cachedExePath = candidate;
                        return candidate;
                    }
                }
            }

            // Kiểm tra PATH
            string? pathEnv = Environment.GetEnvironmentVariable("PATH");
            if (!string.IsNullOrEmpty(pathEnv))
            {
                foreach (var rawDir in pathEnv.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
                {
                    try
                    {
                        string d = rawDir.Trim();
                        foreach (var name in new[] { "inkscape.com", "inkscape.exe" })
                        {
                            string candidate = Path.Combine(d, name);
                            if (File.Exists(candidate))
                            {
                                _cachedExePath = candidate;
                                return candidate;
                            }
                        }
                    }
                    catch { }
                }
            }

            // Thư mục cài đặt tiêu chuẩn của Inkscape trên Windows
            string[] standardPaths = new[]
            {
                @"C:\Program Files\Inkscape\bin\inkscape.com",
                @"C:\Program Files\Inkscape\inkscape.com",
                @"C:\Program Files (x86)\Inkscape\bin\inkscape.com",
                @"C:\Program Files (x86)\Inkscape\inkscape.com",
                @"C:\Program Files\Inkscape\bin\inkscape.exe"
            };

            foreach (var p in standardPaths)
            {
                if (File.Exists(p))
                {
                    _cachedExePath = p;
                    return p;
                }
            }

            return null;
        }

        /// <summary>
        /// Chạy nền lúc mở MinNote: nếu máy đã có Inkscape/MinInk thì làm nóng shell luôn;
        /// nếu chưa có thì tự tải MinInk (~85 MB, xác thực SHA-256 ghim cứng).
        /// </summary>
        public async Task EnsureAvailableOnStartupAsync(Action<string>? log = null)
        {
            try
            {
                string? exe = FindInkscapePath(forceRefresh: true);
                if (!string.IsNullOrEmpty(exe))
                {
                    log?.Invoke($"[EMF] Found Inkscape/MinInk: {exe}");
                    await WarmUpShellAsync(exe, log).ConfigureAwait(false);
                    return;
                }

                log?.Invoke("[EMF] Inkscape/MinInk not found locally. Downloading MinInk in background...");
                bool downloaded = await DownloadMininkAsync(log).ConfigureAwait(false);
                if (downloaded)
                {
                    exe = FindInkscapePath(forceRefresh: true);
                    if (!string.IsNullOrEmpty(exe))
                    {
                        log?.Invoke($"[EMF] MinInk provisioned: {exe}");
                        await WarmUpShellAsync(exe, log).ConfigureAwait(false);
                    }
                }
            }
            catch (Exception ex)
            {
                log?.Invoke($"[EMF] Startup provision error: {ex.Message}");
            }
        }

        public async Task<bool> DownloadMininkAsync(Action<string>? log = null, CancellationToken ct = default)
        {
            await _downloadGate.WaitAsync(ct).ConfigureAwait(false);
            string installDir = SharedMininkDirectory;
            string parent = Path.GetDirectoryName(Path.GetFullPath(installDir))!;
            string tmpZip = Path.Combine(parent, $"minink_{Guid.NewGuid():N}.zip.part");
            string staging = Path.Combine(parent, $"minink_{Guid.NewGuid():N}.tmp");

            try
            {
                if (File.Exists(Path.Combine(installDir, ExeName)))
                    return true;

                IsDownloading = true;
                Directory.CreateDirectory(parent);

                using (var resp = await _http.GetAsync(AssetUrl, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false))
                {
                    resp.EnsureSuccessStatusCode();
                    await using var fs = File.Create(tmpZip);
                    await resp.Content.CopyToAsync(fs, ct).ConfigureAwait(false);
                }

                string actual;
                await using (var fs = File.OpenRead(tmpZip))
                {
                    actual = Convert.ToHexString(await SHA256.HashDataAsync(fs, ct).ConfigureAwait(false));
                }

                if (!actual.Equals(PinnedSha256, StringComparison.OrdinalIgnoreCase))
                {
                    log?.Invoke($"[EMF] MinInk SHA-256 mismatch ({actual}). Aborting.");
                    return false;
                }

                SafeExtractZip(tmpZip, staging);
                if (!File.Exists(Path.Combine(staging, ExeName)))
                {
                    log?.Invoke("[EMF] Extracted MinInk missing inkscape.com.");
                    return false;
                }

                if (Directory.Exists(installDir))
                    Directory.Delete(installDir, true);
                Directory.Move(staging, installDir);
                _cachedExePath = Path.Combine(installDir, ExeName);
                return true;
            }
            catch (Exception ex)
            {
                log?.Invoke($"[EMF] MinInk download failed: {ex.Message}");
                return false;
            }
            finally
            {
                IsDownloading = false;
                try { if (File.Exists(tmpZip)) File.Delete(tmpZip); } catch { }
                try { if (Directory.Exists(staging)) Directory.Delete(staging, true); } catch { }
                _downloadGate.Release();
            }
        }

        private static void SafeExtractZip(string zipPath, string destDir)
        {
            Directory.CreateDirectory(destDir);
            string fullDest = Path.GetFullPath(destDir) + Path.DirectorySeparatorChar;
            using var archive = ZipFile.OpenRead(zipPath);
            foreach (var entry in archive.Entries)
            {
                string destPath = Path.GetFullPath(Path.Combine(destDir, entry.FullName));
                if (!destPath.StartsWith(fullDest, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException("Blocked zip-slip entry: " + entry.FullName);

                if (string.IsNullOrEmpty(entry.Name))
                {
                    Directory.CreateDirectory(destPath);
                }
                else
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
                    entry.ExtractToFile(destPath, overwrite: true);
                }
            }
        }

        /// <summary>
        /// Chuyển đổi chuỗi SVG (nền trong suốt) sang mảng byte EMF (Enhanced Metafile) vector thuần, không nền.
        /// Ưu tiên dùng tiến trình `--shell` (~5-15 ms), tự động dự phòng gọi CLI 1 lần nếu cần.
        /// </summary>
        public async Task<byte[]?> ConvertSvgToEmfAsync(string svgContent, int timeoutMs = 15000, Action<string>? log = null, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(svgContent))
                return null;

            string? exe = FindInkscapePath();
            if (string.IsNullOrEmpty(exe))
            {
                log?.Invoke("[EMF] Inkscape/MinInk unavailable for EMF conversion.");
                return null;
            }

            await _convertGate.WaitAsync(ct).ConfigureAwait(false);
            string workDir = Path.Combine(Path.GetTempPath(), $"minnote_emf_{Guid.NewGuid():N}");
            try
            {
                Directory.CreateDirectory(workDir);
                string svgPath = Path.Combine(workDir, "in.svg");
                string emfPath = Path.Combine(workDir, "out.emf");

                await File.WriteAllTextAsync(svgPath, svgContent, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false), ct).ConfigureAwait(false);

                // 1. Ưu tiên dùng Inkscape --shell (nhanh ~5-15 ms) nếu đường dẫn temp không chứa dấu chấm phẩy / ký tự đặc biệt
                bool safeShellPath = !workDir.Contains(';') && !workDir.Contains(' ') && workDir.All(ch => ch < 128);
                if (safeShellPath)
                {
                    bool shellOk = await TryConvertViaShellAsync(exe, svgPath, emfPath, timeoutMs, log).ConfigureAwait(false);
                    if (shellOk && IsValidEmfFile(emfPath))
                    {
                        return await File.ReadAllBytesAsync(emfPath, ct).ConfigureAwait(false);
                    }
                }

                // 2. Dự phòng gọi CLI trực tiếp (hỗ trợ mọi đường dẫn tiếng Việt / khoảng trắng)
                bool cliOk = await TryConvertViaCliAsync(exe, svgPath, emfPath, workDir, timeoutMs, log, ct).ConfigureAwait(false);
                if (cliOk && IsValidEmfFile(emfPath))
                {
                    return await File.ReadAllBytesAsync(emfPath, ct).ConfigureAwait(false);
                }

                return null;
            }
            catch (Exception ex)
            {
                log?.Invoke($"[EMF] ConvertSvgToEmfAsync failed: {ex.Message}");
                return null;
            }
            finally
            {
                try
                {
                    if (Directory.Exists(workDir))
                        Directory.Delete(workDir, recursive: true);
                }
                catch { }
                _convertGate.Release();
            }
        }

        private async Task WarmUpShellAsync(string exe, Action<string>? log)
        {
            await _convertGate.WaitAsync().ConfigureAwait(false);
            try
            {
                await EnsureShellStartedLockedAsync(exe, 10000, log).ConfigureAwait(false);
            }
            finally
            {
                _convertGate.Release();
            }
        }

        private async Task<bool> EnsureShellStartedLockedAsync(string exe, int timeoutMs, Action<string>? log)
        {
            if (_disposed) return false;
            if (_shellProcess != null && !_shellProcess.HasExited && _shellInput != null)
                return true;

            KillShellLocked();

            try
            {
                var tcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                lock (_shellLock)
                {
                    _shellStdout.Clear();
                    _promptWaiter = tcs;
                }

                var psi = new ProcessStartInfo
                {
                    FileName = exe,
                    Arguments = "--shell",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardInput = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8
                };

                var proc = new Process { StartInfo = psi, EnableRaisingEvents = true };
                proc.OutputDataReceived += (_, _) => { };
                proc.ErrorDataReceived += (_, _) => { };

                if (!proc.Start())
                    return false;

                _shellProcess = proc;
                _shellInput = proc.StandardInput;
                _shellInput.AutoFlush = true;

                // Đọc stdout theo từng ký tự/khối vì prompt `> ` không có ký tự xuống dòng!
                _ = Task.Run(async () =>
                {
                    char[] buf = new char[256];
                    try
                    {
                        var reader = proc.StandardOutput;
                        while (!proc.HasExited)
                        {
                            int n = await reader.ReadAsync(buf, 0, buf.Length).ConfigureAwait(false);
                            if (n <= 0) break;
                            TaskCompletionSource<bool>? toComplete = null;
                            lock (_shellLock)
                            {
                                _shellStdout.Append(buf, 0, n);
                                if (_shellStdout.ToString().Contains("> ", StringComparison.Ordinal))
                                {
                                    _shellStdout.Clear();
                                    toComplete = _promptWaiter;
                                    _promptWaiter = null;
                                }
                            }
                            toComplete?.TrySetResult(true);
                        }
                    }
                    catch { }
                    finally
                    {
                        TaskCompletionSource<bool>? pending;
                        lock (_shellLock)
                        {
                            pending = _promptWaiter;
                            _promptWaiter = null;
                        }
                        pending?.TrySetResult(false);
                    }
                });

                // Rút cạn stderr để tránh nghẽn buffer
                _ = Task.Run(async () =>
                {
                    try { await proc.StandardError.ReadToEndAsync().ConfigureAwait(false); } catch { }
                });

                var completed = await Task.WhenAny(tcs.Task, Task.Delay(timeoutMs)).ConfigureAwait(false);
                if (completed != tcs.Task || !tcs.Task.Result)
                {
                    log?.Invoke("[EMF] Inkscape --shell startup timed out.");
                    KillShellLocked();
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                log?.Invoke($"[EMF] Failed to start Inkscape --shell: {ex.Message}");
                KillShellLocked();
                return false;
            }
        }

        private async Task<bool> TryConvertViaShellAsync(string exe, string svgPath, string emfPath, int timeoutMs, Action<string>? log)
        {
            if (!await EnsureShellStartedLockedAsync(exe, Math.Min(timeoutMs, 8000), log).ConfigureAwait(false))
                return false;

            try
            {
                var tcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                lock (_shellLock)
                {
                    _shellStdout.Clear();
                    _promptWaiter = tcs;
                }

                string svgFwd = svgPath.Replace('\\', '/');
                string emfFwd = emfPath.Replace('\\', '/');
                string cmd = $"file-open:{svgFwd}; export-type:emf; export-text-to-path; export-dpi:600; export-filename:{emfFwd}; export-do; file-close";

                await _shellInput!.WriteLineAsync(cmd).ConfigureAwait(false);

                var completed = await Task.WhenAny(tcs.Task, Task.Delay(timeoutMs)).ConfigureAwait(false);
                if (completed != tcs.Task || !tcs.Task.Result)
                {
                    log?.Invoke("[EMF] Inkscape --shell export timed out; resetting shell.");
                    KillShellLocked();
                    return false;
                }

                return File.Exists(emfPath);
            }
            catch (Exception ex)
            {
                log?.Invoke($"[EMF] Inkscape --shell command error: {ex.Message}");
                KillShellLocked();
                return false;
            }
        }

        private static async Task<bool> TryConvertViaCliAsync(string exe, string svgPath, string emfPath, string workDir, int timeoutMs, Action<string>? log, CancellationToken ct)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = exe,
                    Arguments = $"\"{svgPath}\" --export-type=emf --export-filename=\"{emfPath}\" --export-text-to-path --export-dpi=600",
                    WorkingDirectory = workDir,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                using var proc = Process.Start(psi);
                if (proc == null) return false;

                var stdoutTask = proc.StandardOutput.ReadToEndAsync();
                var stderrTask = proc.StandardError.ReadToEndAsync();

                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                timeoutCts.CancelAfter(timeoutMs);

                try
                {
                    await proc.WaitForExitAsync(timeoutCts.Token).ConfigureAwait(false);
                }
                catch (OperationCanceledException)
                {
                    try { proc.Kill(entireProcessTree: true); } catch { }
                    log?.Invoke("[EMF] Inkscape CLI timed out.");
                    return false;
                }

                await Task.WhenAll(stdoutTask, stderrTask).ConfigureAwait(false);
                return File.Exists(emfPath);
            }
            catch (Exception ex)
            {
                log?.Invoke($"[EMF] Inkscape CLI error: {ex.Message}");
                return false;
            }
        }

        public static bool IsValidEmfFile(string path)
        {
            try
            {
                if (!File.Exists(path)) return false;
                var fi = new FileInfo(path);
                if (fi.Length < 88) return false;
                byte[] header = new byte[44];
                using var fs = File.OpenRead(path);
                if (fs.Read(header, 0, 44) < 44) return false;
                // Enhanced Metafile signature at byte offset 40 is " EMF" (0x20 0x45 0x4D 0x46)
                return header[40] == 0x20 && header[41] == 0x45 && header[42] == 0x4D && header[43] == 0x46;
            }
            catch
            {
                return false;
            }
        }

        private void KillShellLocked()
        {
            try
            {
                if (_shellInput != null)
                {
                    try { _shellInput.WriteLine("quit"); } catch { }
                    try { _shellInput.Dispose(); } catch { }
                    _shellInput = null;
                }
                if (_shellProcess != null)
                {
                    if (!_shellProcess.HasExited)
                    {
                        try { _shellProcess.Kill(entireProcessTree: true); } catch { }
                    }
                    try { _shellProcess.Dispose(); } catch { }
                    _shellProcess = null;
                }
            }
            catch { }
        }

        public void Dispose()
        {
            _disposed = true;
            KillShellLocked();
            _http.Dispose();
        }
    }
}
// [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1).
