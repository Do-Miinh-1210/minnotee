using MinNote.Services;
using MinNote.Views;
using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using Microsoft.Web.WebView2.Core;
using Wpf.Ui.Controls;
using MessageBox = System.Windows.MessageBox;
using MessageBoxButton = System.Windows.MessageBoxButton;
using MessageBoxImage = System.Windows.MessageBoxImage;

namespace MinNote
{
    public partial class MainWindow : FluentWindow
    {
        private static readonly string LogFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "minnote_debug.log");
        private readonly SemaphoreSlim _initLock = new(1, 1);
        private bool _isInitialized = false;
        private bool _eventsAttached = false;
        private bool _isFullScreen = false;

        private bool _isTogglingFullScreen = false;
        private bool _onlineCheckDone;
        private DateTime _lastAutoRecover = DateTime.MinValue;
        private string? _pendingWordPath;
        private string? _lastBatchDownloadDir;
        private DateTime _lastBatchDownloadUtc = DateTime.MinValue;
        private readonly System.Windows.Threading.DispatcherTimer _licenseTimer = new() { Interval = TimeSpan.FromMinutes(10) };
        private WindowState _previousWindowState = WindowState.Normal;
        private WindowStyle _previousWindowStyle = WindowStyle.SingleBorderWindow;
        private RecorderOverlayController? _recOverlay;
        private int _nativeRecStopping;
        private string _nativeRecDocName = "";
        private UpdateInfo? _availableUpdate;

        public static void Log(string msg)
        {
            try
            {
                File.AppendAllText(LogFile, $"[{DateTime.Now:HH:mm:ss.fff}] {msg}\n");
            }
            catch { }
        }

        public MainWindow()
        {
            Log("MainWindow constructor start");
            InitializeComponent();
            Log("InitializeComponent completed");

            string currentVer = GitHubUpdateService.Instance.CurrentVersion;
            TxtAppVersion.Text = $"v{currentVer}";
            Title = $"MinNote v{currentVer} • Bảng Viết & Vẽ Hình Toán Học - Đỗ Miinh Math";
            BtnUpdateTop.ToolTip = $"MinNote v{currentVer} • Bấm để kiểm tra bản cập nhật mới";

            // Kích hoạt & đồng bộ bản quyền Cloud; bảng viết chỉ mở khi license đã ký có quyền "whiteboard"
            RunLockedMid.Text = HardwareInfoService.GetMachineId();
            OnLicense(SupabaseLicenseService.Instance.GetCurrentLicense());
            SupabaseLicenseService.Instance.LicenseChanged += (s, info) => Dispatcher.Invoke(() => OnLicense(info));
            _ = SyncLicenseAsync();
            _licenseTimer.Tick += async (s, e) => await SyncLicenseAsync();
            _licenseTimer.Start();

            Closing += (s, e) => Log($"Window Closing: Cancel={e.Cancel}");
            Closed += (s, e) =>
            {
                Log("Window Closed");
                try { _recOverlay?.Dispose(); } catch { }
                try { NativeScreenRecorder.Instance.Dispose(); } catch { }
                try { MininkEmfService.Instance.Dispose(); } catch { }
                try { VideoRecorderService.Instance.Dispose(); } catch { }
            };

            // Tự dò & làm nóng Inkscape/MinInk nền (hoặc tải MinInk có xác thực SHA-256 nếu máy chưa có)
            _ = Task.Run(() => MininkEmfService.Instance.EnsureAvailableOnStartupAsync(Log));

            // Khởi chạy ngầm WebView2 ngay từ constructor để loại bỏ hoàn toàn độ trễ
            _ = InitializeWhiteboardAsync();

            // Tự động kiểm tra bản cập nhật mới âm thầm sau 3 giây khi mở cửa sổ
            Loaded += (_, _) => _ = CheckForUpdateSilentlyOnStartupAsync();
        }

        private async Task CheckForUpdateSilentlyOnStartupAsync()
        {
            try
            {
                await Task.Delay(3000);
                if (!IsLoaded) return;

                var update = await GitHubUpdateService.Instance.CheckForUpdatesAsync();
                if (update == null || !IsLoaded) return;

                await Dispatcher.InvokeAsync(() =>
                {
                    if (!IsLoaded || !BtnUpdateTop.IsEnabled) return;
                    _availableUpdate = update;
                    ApplyAvailableUpdateHighlight(update);
                });
            }
            catch (Exception ex)
            {
                Log($"Silent startup update check skipped: {ex.Message}");
            }
        }

        private void ApplyAvailableUpdateHighlight(UpdateInfo update)
        {
            BtnUpdateTop.Content = $"Cập nhật v{update.Version}";
            BtnUpdateTop.Foreground = new System.Windows.Media.SolidColorBrush(
                System.Windows.Media.Color.FromRgb(147, 197, 253));
            BtnUpdateTop.Background = new System.Windows.Media.SolidColorBrush(
                System.Windows.Media.Color.FromArgb(56, 37, 99, 235));
            BtnUpdateTop.BorderBrush = new System.Windows.Media.SolidColorBrush(
                System.Windows.Media.Color.FromArgb(165, 59, 130, 246));
            BtnUpdateTop.BorderThickness = new Thickness(1);
            BtnUpdateTop.ToolTip = $"Đã có MinNote v{update.Version} trên GitHub (hiện tại v{GitHubUpdateService.Instance.CurrentVersion}) • Bấm để cập nhật ngay";
        }

        private static string? FindWhiteboardDirectory()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] candidates = new[]
            {
                Path.Combine(baseDir, "Resources", "Whiteboard"),
                Path.GetFullPath(Path.Combine(baseDir, "..", "Resources", "Whiteboard")),
                Path.GetFullPath(Path.Combine(baseDir, "..", "..", "Resources", "Whiteboard")),
                Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "Resources", "Whiteboard")),
                Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "..", "Resources", "Whiteboard")),
                @"M:\IT\Minnote\Resources\Whiteboard",
                @"X:\desktop_csharp\src\MatrixExamAI.Desktop\Resources\Whiteboard"
            };

            foreach (var dir in candidates)
            {
                try
                {
                    if (Directory.Exists(dir) && File.Exists(Path.Combine(dir, "index.html")))
                    {
                        Log($"Found Whiteboard dir: {dir}");
                        return dir;
                    }
                }
                catch { }
            }
            Log("Whiteboard dir NOT found!");
            return null;
        }

        private void ShowErrorState(string message)
        {
            Log($"ShowErrorState: {message}");
            LoadingRing.Visibility = Visibility.Collapsed;
            TxtLoadingTitle.Text = "Không thể mở MinNote";
            TxtLoadingSubtitle.Text = message;
            BtnRetryInit.Visibility = Visibility.Visible;
            PanelLoading.Visibility = Visibility.Visible;
        }

        private void BtnRetryInit_Click(object sender, RoutedEventArgs e) => RecreateWhiteboard();

        /// <summary>
        /// Sau khi tiến trình trình duyệt WebView2 chết (bị tắt từ bên ngoài, hết bộ nhớ…) control cũ không dùng lại được:
        /// thay bằng control mới rồi khởi tạo lại. Trước đây chỉ gọi lại InitializeWhiteboardAsync → thoát ngay vì
        /// _isInitialized vẫn true, màn hình "Đang khởi tạo lại" quay mãi.
        /// </summary>
        private void RecreateWhiteboard()
        {
            LoadingRing.Visibility = Visibility.Visible;
            TxtLoadingTitle.Text = "Đang khởi tạo lại MinNote...";
            TxtLoadingSubtitle.Text = "Đang kết nối không gian vẽ Canvas...";
            BtnRetryInit.Visibility = Visibility.Collapsed;
            PanelLoading.Visibility = Visibility.Visible;

            var old = WvWhiteboard;
            var host = (System.Windows.Controls.Panel)old.Parent;
            int index = host.Children.IndexOf(old);
            host.Children.Remove(old);
            try { old.Dispose(); } catch (Exception ex) { Log($"Dispose old WebView2: {ex.Message}"); }

            WvWhiteboard = new Microsoft.Web.WebView2.Wpf.WebView2();
            host.Children.Insert(index, WvWhiteboard);
            _isInitialized = false;
            _eventsAttached = false;
            OnLicense(SupabaseLicenseService.Instance.GetCurrentLicense());
            _ = InitializeWhiteboardAsync();
        }

        private static string ProfileDir(string name) =>
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MinNote", name);

        /// <summary>
        /// Hồ sơ dự phòng CỐ ĐỊNH (không tạo thư mục Temp ngẫu nhiên mỗi lần): giữ cache + dữ liệu bảng viết giữa các lần mở,
        /// khởi động lại không phải dựng hồ sơ trắng.
        /// </summary>
        public static Task<CoreWebView2Environment> CreateAlternateEnvironmentAsync()
        {
            string dir = ProfileDir("WebView2_alt");
            Directory.CreateDirectory(dir);
            Log($"Using alternate WebView2 profile: {dir}");
            return CoreWebView2Environment.CreateAsync(null, dir, new CoreWebView2EnvironmentOptions { AdditionalBrowserArguments = BrowserArgs });
        }

        // Không mở cổng remote debugging: bất kỳ chương trình nào trên máy cũng có thể điều khiển trang qua cổng đó
        // Cho phép pinch touchpad (DirectManipulation -> wheel ctrlKey) để phóng to/thu nhỏ trực tiếp trên canvas bảng viết
        // Tự động chấp nhận quay tab hiện tại (--auto-accept-this-tab-capture) để bỏ qua hộp thoại xác nhận trình duyệt
        private const string BrowserArgs = "--disable-features=Translate,OptimizationHints,MediaRouter --disable-background-networking --disable-component-update --disable-sync --disable-domain-reliability --disable-client-side-phishing-detection --disable-default-apps --no-default-browser-check --enable-gpu-rasterization --enable-zero-copy --disable-hang-monitor --auto-accept-this-tab-capture --auto-select-tab-capture-source-by-title=MinNote";

        public static async Task<CoreWebView2Environment> CreateEnvironmentWithFallbackAsync()
        {
            string primaryDir = ProfileDir("WebView2");
            try
            {
                Directory.CreateDirectory(primaryDir);
                Log($"Creating CoreWebView2Environment at: {primaryDir}");
                return await CoreWebView2Environment.CreateAsync(null, primaryDir,
                    new CoreWebView2EnvironmentOptions { AdditionalBrowserArguments = BrowserArgs });
            }
            catch (Exception ex)
            {
                Log($"Primary UserDataDir notice ({ex.Message}, HResult=0x{ex.HResult:X8}).");
                return await CreateAlternateEnvironmentAsync();
            }
        }

        private async Task InitializeWhiteboardAsync()
        {
            Log("InitializeWhiteboardAsync start");
            if (_isInitialized) return;
            await _initLock.WaitAsync();
            try
            {
                if (_isInitialized) return;

                string? whiteboardDir = FindWhiteboardDirectory();
                if (string.IsNullOrEmpty(whiteboardDir))
                {
                    ShowErrorState("Không tìm thấy tệp tài nguyên Resources/Whiteboard/index.html.");
                    return;
                }

                CoreWebView2Environment env = App.PrewarmedEnvTask != null 
                    ? await App.PrewarmedEnvTask 
                    : await CreateEnvironmentWithFallbackAsync();
                Log("CoreWebView2Environment acquired successfully");

                try
                {
                    Log("Calling EnsureCoreWebView2Async");
                    await WvWhiteboard.EnsureCoreWebView2Async(env);
                    Log("EnsureCoreWebView2Async succeeded");
                }
                catch (Exception exEnv)
                {
                    // Hồ sơ chính còn bị tiến trình WebView2 cũ giữ (vừa đóng app): đợi ngắn rồi thử lại trước khi dùng hồ sơ dự phòng
                    Log($"EnsureCoreWebView2Async with environment failed ({exEnv.Message}). Retrying primary profile...");
                    await Task.Delay(700);
                    try
                    {
                        await WvWhiteboard.EnsureCoreWebView2Async(await CreateEnvironmentWithFallbackAsync());
                    }
                    catch (Exception exRetry)
                    {
                        Log($"Primary profile still busy ({exRetry.Message}).");
                        await WvWhiteboard.EnsureCoreWebView2Async(await CreateAlternateEnvironmentAsync());
                    }
                }

                WvWhiteboard.DefaultBackgroundColor = System.Drawing.Color.Transparent;

                WvWhiteboard.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "minnote.app",
                    whiteboardDir,
                    CoreWebView2HostResourceAccessKind.Allow
                );
                WvWhiteboard.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "minnote-rec.local",
                    NativeScreenRecorder.GetTempDir(),
                    CoreWebView2HostResourceAccessKind.Allow
                );
                Log("SetVirtualHostNameToFolderMapping completed");

                if (!_eventsAttached)
                {
                    _eventsAttached = true;
                    WvWhiteboard.ZoomFactor = 1.0;
                    WvWhiteboard.ZoomFactorChanged += (s, e) =>
                    {
                        if (Math.Abs(WvWhiteboard.ZoomFactor - 1.0) > 0.001)
                        {
                            WvWhiteboard.ZoomFactor = 1.0;
                        }
                    };
                    try
                    {
                        WvWhiteboard.CoreWebView2.Settings.AreDevToolsEnabled = true;
                        WvWhiteboard.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                        WvWhiteboard.CoreWebView2.Settings.IsStatusBarEnabled = false;
                        WvWhiteboard.CoreWebView2.Settings.IsZoomControlEnabled = false;
                        WvWhiteboard.CoreWebView2.Settings.IsPinchZoomEnabled = true;
                        WvWhiteboard.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = true;
                        WvWhiteboard.CoreWebView2.Settings.IsSwipeNavigationEnabled = false;
                    }
                    catch { }

                    // Hộp thoại xác nhận phi đồng bộ chuẩn WPF, tránh đơ UI/deadlock
                    WvWhiteboard.CoreWebView2.ScriptDialogOpening += (s, e) =>
                    {
                        var deferral = e.GetDeferral();
                        Dispatcher.InvokeAsync(() =>
                        {
                            try
                            {
                                if (e.Kind == CoreWebView2ScriptDialogKind.Confirm)
                                {
                                    var result = System.Windows.MessageBox.Show(
                                        this,
                                        e.Message,
                                        "MinNote • Xác nhận thao tác",
                                        MessageBoxButton.OKCancel,
                                        MessageBoxImage.Question,
                                        System.Windows.MessageBoxResult.Cancel
                                    );
                                    if (result == System.Windows.MessageBoxResult.OK)
                                    {
                                        e.Accept();
                                    }
                                }
                                else if (e.Kind == CoreWebView2ScriptDialogKind.Alert)
                                {
                                    System.Windows.MessageBox.Show(
                                        this,
                                        e.Message,
                                        "MinNote • Thông báo",
                                        MessageBoxButton.OK,
                                        MessageBoxImage.Information
                                    );
                                    e.Accept();
                                }
                                else
                                {
                                    e.Accept();
                                }
                            }
                            catch (Exception ex)
                            {
                                Log($"ScriptDialogOpening error: {ex.Message}");
                                e.Accept();
                            }
                            finally
                            {
                                deferral.Complete();
                            }
                        });
                    };

                    WvWhiteboard.CoreWebView2.ContainsFullScreenElementChanged += (s, e) =>
                    {
                        Dispatcher.Invoke(() =>
                        {
                            if (!_isTogglingFullScreen && WvWhiteboard.CoreWebView2 != null && WvWhiteboard.CoreWebView2.ContainsFullScreenElement != _isFullScreen)
                            {
                                ToggleFullScreen();
                            }
                        });
                    };

                    WvWhiteboard.CoreWebView2.PermissionRequested += (s, e) =>
                    {
                        bool isLocalApp = !string.IsNullOrEmpty(e.Uri) &&
                            (e.Uri.StartsWith("https://minnote.app/", StringComparison.OrdinalIgnoreCase) ||
                             e.Uri.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase) ||
                             e.Uri.StartsWith("http://127.0.0.1", StringComparison.OrdinalIgnoreCase));
                        if (isLocalApp && (
                            e.PermissionKind == CoreWebView2PermissionKind.ClipboardRead ||
                            e.PermissionKind == CoreWebView2PermissionKind.Microphone ||
                            e.PermissionKind == CoreWebView2PermissionKind.Camera ||
                            e.PermissionKind == CoreWebView2PermissionKind.MultipleAutomaticDownloads))
                        {
                            e.State = CoreWebView2PermissionState.Allow;
                        }
                    };

                    WvWhiteboard.CoreWebView2.ScreenCaptureStarting += (s, e) =>
                    {
                        string src = e.OriginalSourceFrameInfo?.Source ?? "";
                        Log($"[ScreenCaptureStarting] source={src}");
                        bool isLocalApp = string.IsNullOrEmpty(src) ||
                            src.StartsWith("https://minnote.app/", StringComparison.OrdinalIgnoreCase) ||
                            src.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase) ||
                            src.StartsWith("http://127.0.0.1", StringComparison.OrdinalIgnoreCase);
                        if (!isLocalApp)
                        {
                            e.Cancel = true;
                        }
                    };

                    // Chặn hoàn toàn hộp thoại "Nội dung tải xuống" kiểu trình duyệt web,
                    // thay bằng hộp thoại lưu chuẩn Windows / lưu thẳng thư mục cài đặt + thông báo trong app.
                    WvWhiteboard.CoreWebView2.DownloadStarting += (s, e) =>
                    {
                        e.Handled = true;
                        string origPath = e.ResultFilePath ?? "";
                        string origName = Path.GetFileName(origPath);
                        if (string.IsNullOrWhiteSpace(origName)) origName = "MinNote_Export";
                        string ext = Path.GetExtension(origName).ToLowerInvariant();

                        if (ext == ".mp4" || ext == ".webm")
                        {
                            string folder = VideoRecorderService.Instance.EnsureFolderExists();
                            string dest = VideoRecorderService.ResolveUniquePath(folder, Path.GetFileNameWithoutExtension(origName), ext.TrimStart('.'));
                            e.ResultFilePath = dest;
                            var op = e.DownloadOperation;
                            op.StateChanged += (_, __) =>
                            {
                                if (op.State == CoreWebView2DownloadState.Completed)
                                {
                                    Dispatcher.InvokeAsync(() =>
                                    {
                                        string esc = Path.GetFileName(dest).Replace("\\", "\\\\").Replace("'", "\\'");
                                        WvWhiteboard?.CoreWebView2?.ExecuteScriptAsync($"if (typeof window.showToast === 'function') window.showToast('Đã lưu video: {esc}', 'success');");
                                    });
                                }
                            };
                            return;
                        }

                        var deferral = e.GetDeferral();
                        Dispatcher.InvokeAsync(() =>
                        {
                            try
                            {
                                string? targetPath = null;
                                // Nếu xuất hàng loạt nhiều ảnh PNG liên tiếp trong 3 giây → dùng chung thư mục vừa chọn
                                if (!string.IsNullOrEmpty(_lastBatchDownloadDir)
                                    && Directory.Exists(_lastBatchDownloadDir)
                                    && (DateTime.UtcNow - _lastBatchDownloadUtc).TotalSeconds <= 3.0)
                                {
                                    targetPath = Path.Combine(_lastBatchDownloadDir, origName);
                                    _lastBatchDownloadUtc = DateTime.UtcNow;
                                }
                                else
                                {
                                    string filter = ext switch
                                    {
                                        ".pdf" => "Tài liệu PDF (*.pdf)|*.pdf|Tất cả tệp (*.*)|*.*",
                                        ".png" => "Ảnh PNG (*.png)|*.png|Tất cả tệp (*.*)|*.*",
                                        ".svg" => "Ảnh Vector SVG (*.svg)|*.svg|Tất cả tệp (*.*)|*.*",
                                        ".html" or ".htm" => "Trang HTML (*.html)|*.html|Tất cả tệp (*.*)|*.*",
                                        ".nrn" => "Sổ ghi chú MinNote (*.nrn)|*.nrn|Tất cả tệp (*.*)|*.*",
                                        _ => "Tất cả tệp (*.*)|*.*"
                                    };
                                    var sfd = new Microsoft.Win32.SaveFileDialog
                                    {
                                        Title = "Lưu tệp từ MinNote",
                                        FileName = origName,
                                        Filter = filter
                                    };
                                    if (sfd.ShowDialog(this) == true && !string.IsNullOrWhiteSpace(sfd.FileName))
                                    {
                                        targetPath = sfd.FileName;
                                        _lastBatchDownloadDir = Path.GetDirectoryName(targetPath);
                                        _lastBatchDownloadUtc = DateTime.UtcNow;
                                    }
                                    else
                                    {
                                        e.Cancel = true;
                                    }
                                }

                                if (!e.Cancel && !string.IsNullOrEmpty(targetPath))
                                {
                                    e.ResultFilePath = targetPath;
                                    string savedName = Path.GetFileName(targetPath);
                                    var op = e.DownloadOperation;
                                    op.StateChanged += (_, __) =>
                                    {
                                        if (op.State == CoreWebView2DownloadState.Completed)
                                        {
                                            Dispatcher.InvokeAsync(() =>
                                            {
                                                string esc = savedName.Replace("\\", "\\\\").Replace("'", "\\'");
                                                WvWhiteboard?.CoreWebView2?.ExecuteScriptAsync($"if (typeof window.showToast === 'function') window.showToast('Đã lưu tệp: {esc}', 'success');");
                                            });
                                        }
                                    };
                                }
                            }
                            catch (Exception exDl)
                            {
                                Log($"DownloadStarting error: {exDl.Message}");
                            }
                            finally
                            {
                                deferral.Complete();
                            }
                        });
                    };

                    WvWhiteboard.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

                    WvWhiteboard.CoreWebView2.ProcessFailed += (s, e) =>
                    {
                        Log($"CoreWebView2 ProcessFailed: {e.ProcessFailedKind}, reason={e.Reason}");
                        Dispatcher.BeginInvoke(() =>
                        {
                            // Chỉ trình hiển thị trang chết → nạp lại trang là đủ
                            if (e.ProcessFailedKind == CoreWebView2ProcessFailedKind.RenderProcessExited
                                || e.ProcessFailedKind == CoreWebView2ProcessFailedKind.RenderProcessUnresponsive)
                            {
                                try { WvWhiteboard.Reload(); return; } catch (Exception ex) { Log($"Reload failed: {ex.Message}"); }
                            }
                            if (e.ProcessFailedKind != CoreWebView2ProcessFailedKind.BrowserProcessExited) return;

                            // Cả trình duyệt chết: tự dựng lại 1 lần trong 2 phút, lặp lại nữa thì để người dùng bấm
                            if (DateTime.Now - _lastAutoRecover > TimeSpan.FromMinutes(2))
                            {
                                _lastAutoRecover = DateTime.Now;
                                RecreateWhiteboard();
                            }
                            else
                            {
                                ShowErrorState("Trình duyệt Canvas gặp sự cố. Bấm nút dưới để nạp lại.");
                            }
                        });
                    };

                    WvWhiteboard.NavigationCompleted += (s, e) =>
                    {
                        Log($"NavigationCompleted: isSuccess={e.IsSuccess}, error={e.WebErrorStatus}");
                        PanelLoading.Visibility = Visibility.Collapsed;
                        if (!e.IsSuccess)
                        {
                            ShowErrorState($"Lỗi tải trang Bảng viết: {e.WebErrorStatus}");
                        }
                    };
                }

                Log("Navigating to https://minnote.app/index.html");
                WvWhiteboard.CoreWebView2.Navigate("https://minnote.app/index.html");
                _isInitialized = true;
            }
            catch (Exception ex)
            {
                Log($"InitializeWhiteboardAsync exception: {ex}");
                ShowErrorState($"Khởi tạo thất bại: {ex.Message}");
            }
            finally
            {
                _initLock.Release();
            }
        }

        private string ConvertWordToPdf(string inputPath)
        {
            string tmpDir = Path.Combine(Path.GetTempPath(), "minnote_word_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tmpDir);
            string outPdf = Path.Combine(tmpDir, "document.pdf");
            string absIn = Path.GetFullPath(inputPath);

            // Method 1: Microsoft Word COM via PowerShell
            string psScript = $"$w = New-Object -ComObject Word.Application; try {{ $w.Visible = $false; $d = $w.Documents.Open('{absIn.Replace("'", "''")}', $false, $true, $false); $d.ExportAsFixedFormat('{outPdf.Replace("'", "''")}', 17); $d.Close(0) }} finally {{ $w.Quit() }}";
            try
            {
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-NoProfile -NonInteractive -Command \"{psScript}\"",
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden
                };
                using var proc = System.Diagnostics.Process.Start(psi);
                proc?.WaitForExit(35000);
            }
            catch (Exception ex)
            {
                Log($"PowerShell Word COM conversion failed: {ex.Message}");
            }

            if (File.Exists(outPdf))
            {
                return outPdf;
            }

            // Method 2: LibreOffice fallback
            string[] libreCandidates = new[]
            {
                @"C:\Program Files\LibreOffice\program\soffice.exe",
                @"C:\Program Files (x86)\LibreOffice\program\soffice.exe"
            };
            foreach (var soffice in libreCandidates)
            {
                if (File.Exists(soffice))
                {
                    try
                    {
                        var lpsi = new System.Diagnostics.ProcessStartInfo
                        {
                            FileName = soffice,
                            Arguments = $"--headless --convert-to pdf \"{absIn}\" --outdir \"{tmpDir}\"",
                            CreateNoWindow = true,
                            UseShellExecute = false,
                            WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden
                        };
                        using var lproc = System.Diagnostics.Process.Start(lpsi);
                        lproc?.WaitForExit(35000);

                        string baseName = Path.GetFileNameWithoutExtension(absIn);
                        string candPdf = Path.Combine(tmpDir, baseName + ".pdf");
                        if (File.Exists(candPdf)) return candPdf;
                    }
                    catch (Exception ex)
                    {
                        Log($"LibreOffice conversion failed: {ex.Message}");
                    }
                }
            }

            throw new InvalidOperationException("Không thể chuyển đổi Word sang PDF. Vui lòng cài đặt Microsoft Word hoặc LibreOffice.");
        }

        async void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string json = e.WebMessageAsJson;
                Log($"[WebMessage] {(json.Length > 300 ? json.Substring(0, 300) + "...(truncated)" : json)}");
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (root.TryGetProperty("type", out var typeElem))
                {
                    string msgType = typeElem.GetString() ?? string.Empty;
                    if (msgType == "NAVIGATE_TO_MINDMAP")
                    {
                        BtnMindmapTop_Click(this, new RoutedEventArgs());
                    }
                    else if (msgType == "TOGGLE_FULLSCREEN")
                    {
                        ToggleFullScreen();
                    }
                    else if (msgType == "WINDOW_MINIMIZE")
                    {
                        WindowState = WindowState.Minimized;
                    }
                    else if (msgType == "WINDOW_MAXIMIZE")
                    {
                        WindowState = (WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized);
                    }
                    else if (msgType == "WINDOW_CLOSE")
                    {
                        Close();
                    }
                    else if (msgType == "GET_QUESTION_BANK_DATA")
                    {
                        _ = Task.Run(async () =>
                        {
                            try { await LoadAndSendQuestionBankAsync(); } catch (Exception ex) { Log($"GET_QUESTION_BANK_DATA error: {ex.Message}"); }
                        });
                    }
                    else if (msgType == "INSERT_TO_MEA")
                    {
                        MessageBox.Show(
                            "Bảng viết MinNote hoạt động độc lập!\nBạn có thể xuất ảnh PNG/SVG hoặc sao chép hình vẽ trực tiếp bằng các công cụ trên thanh bảng viết.",
                            "MinNote Độc Lập • Đỗ Miinh Math",
                            MessageBoxButton.OK,
                            MessageBoxImage.Information);
                    }
                    else if (msgType == "CAPTURE_MINDMAP")
                    {
                        var oldBg = WvWhiteboard.DefaultBackgroundColor;
                        try
                        {
                            string action = root.TryGetProperty("action", out var actElem) ? actElem.GetString() ?? "insert_board" : "insert_board";
                            var rect = root.GetProperty("rect");
                            double x = Math.Max(0, rect.GetProperty("x").GetDouble());
                            double y = Math.Max(0, rect.GetProperty("y").GetDouble());
                            double w = Math.Max(50, rect.GetProperty("width").GetDouble());
                            double h = Math.Max(50, rect.GetProperty("height").GetDouble());

                            // ponytail: scale 3.5x for Retina/4K sharpness up to 500% zoom, upgrade to dynamic DPR if 8K canvas needed
                            var clipObj = new
                            {
                                format = "png",
                                clip = new
                                {
                                    x = x,
                                    y = y,
                                    width = w,
                                    height = h,
                                    scale = 4.5
                                },
                                captureBeyondViewport = true
                            };
                            string jsonParams = JsonSerializer.Serialize(clipObj);

                            string cdpResult;
                            try
                            {
                                WvWhiteboard.DefaultBackgroundColor = System.Drawing.Color.Transparent;
                                await WvWhiteboard.CoreWebView2.CallDevToolsProtocolMethodAsync(
                                    "Emulation.setDefaultBackgroundColorOverride",
                                    "{\"color\":{\"r\":0,\"g\":0,\"b\":0,\"a\":0}}"
                                );

                                cdpResult = await WvWhiteboard.CoreWebView2.CallDevToolsProtocolMethodAsync("Page.captureScreenshot", jsonParams);
                            }
                            finally
                            {
                                try
                                {
                                    await WvWhiteboard.CoreWebView2.CallDevToolsProtocolMethodAsync(
                                        "Emulation.setDefaultBackgroundColorOverride",
                                        "{}"
                                    );
                                }
                                catch { }
                                WvWhiteboard.DefaultBackgroundColor = oldBg;
                                try
                                {
                                    await WvWhiteboard.CoreWebView2.ExecuteScriptAsync("if (typeof window.restoreAfterMindmapCapture === 'function') window.restoreAfterMindmapCapture();");
                                }
                                catch { }
                            }

                            using var resDoc = JsonDocument.Parse(cdpResult);
                            string base64Png = resDoc.RootElement.GetProperty("data").GetString() ?? "";
                            string dataUri = $"data:image/png;base64,{base64Png}";

                            if (action == "insert_board")
                            {
                                WvWhiteboard.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new
                                {
                                    type = "MINDMAP_CAPTURED",
                                    dataUri = dataUri
                                }));
                            }
                            else if (action == "copy_word")
                            {
                                try
                                {
                                    byte[] bytes = Convert.FromBase64String(base64Png);
                                    using var ms = new MemoryStream(bytes);
                                    var bitmap = new System.Windows.Media.Imaging.BitmapImage();
                                    bitmap.BeginInit();
                                    bitmap.StreamSource = ms;
                                    bitmap.CacheOption = System.Windows.Media.Imaging.BitmapCacheOption.OnLoad;
                                    bitmap.EndInit();
                                    bitmap.Freeze();

                                    var dataObj = new System.Windows.DataObject();
                                    dataObj.SetData("PNG", new MemoryStream(bytes), false);
                                    dataObj.SetImage(bitmap);

                                    for (int retry = 0; retry < 3; retry++)
                                    {
                                        try
                                        {
                                            System.Windows.Clipboard.SetDataObject(dataObj, true);
                                            break;
                                        }
                                        catch (System.Runtime.InteropServices.COMException)
                                        {
                                            await Task.Delay(100);
                                        }
                                    }
                                    await WvWhiteboard.CoreWebView2.ExecuteScriptAsync("if (typeof window.showToast === 'function') window.showToast('Đã sao chép sơ đồ tư duy trong suốt vào Clipboard! Có thể dán (Ctrl+V) vào Word.', 'success');");
                                }
                                catch (Exception exClip)
                                {
                                    Log($"Clipboard error: {exClip.Message}");
                                    await WvWhiteboard.CoreWebView2.ExecuteScriptAsync($"if (typeof window.showToast === 'function') window.showToast('Lỗi sao chép Clipboard: {exClip.Message}', 'error');");
                                }
                            }
                            else if (action == "save_png")
                            {
                                try
                                {
                                    var sfd = new Microsoft.Win32.SaveFileDialog
                                    {
                                        Filter = "PNG Image (*.png)|*.png",
                                        FileName = $"So_Do_Tu_Duy_{DateTime.Now:yyyyMMdd_HHmmss}.png"
                                    };
                                    if (sfd.ShowDialog() == true)
                                    {
                                        byte[] bytes = Convert.FromBase64String(base64Png);
                                        File.WriteAllBytes(sfd.FileName, bytes);
                                        await WvWhiteboard.CoreWebView2.ExecuteScriptAsync("if (typeof window.showToast === 'function') window.showToast('Đã lưu ảnh sơ đồ tư duy thành công!', 'success');");
                                    }
                                }
                                catch (Exception exSave)
                                {
                                    Log($"Save PNG error: {exSave.Message}");
                                    await WvWhiteboard.CoreWebView2.ExecuteScriptAsync($"if (typeof window.showToast === 'function') window.showToast('Lỗi lưu ảnh: {exSave.Message}', 'error');");
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            Log($"CAPTURE_MINDMAP error: {ex.Message}");
                            await WvWhiteboard.CoreWebView2.ExecuteScriptAsync($"if (typeof window.showToast === 'function') window.showToast('Lỗi chụp sơ đồ tư duy: {ex.Message.Replace("'", "\\'")}', 'error');");
                        }
                    }
                    else if (msgType == "PICK_WORD")
                    {
                        var dlg = new Microsoft.Win32.OpenFileDialog
                        {
                            Title = "Chọn tài liệu Word (.docx, .doc)",
                            Filter = "Tài liệu Word (*.docx;*.doc)|*.docx;*.doc|Tất cả tệp (*.*)|*.*"
                        };
                        bool? res = dlg.ShowDialog(this);
                        if (res == true && !string.IsNullOrEmpty(dlg.FileName))
                        {
                            _pendingWordPath = dlg.FileName;
                            await WvWhiteboard.CoreWebView2.ExecuteScriptAsync("if(window.__wordPickCallback) window.__wordPickCallback(true);");
                        }
                        else
                        {
                            _pendingWordPath = null;
                            await WvWhiteboard.CoreWebView2.ExecuteScriptAsync("if(window.__wordPickCallback) window.__wordPickCallback(false);");
                        }
                    }
                    else if (msgType == "CONVERT_WORD")
                    {
                        _ = Task.Run(async () =>
                        {
                            string? target = _pendingWordPath;
                            if (root.TryGetProperty("path", out var pElem) && !string.IsNullOrEmpty(pElem.GetString()))
                            {
                                target = pElem.GetString();
                            }
                            if (string.IsNullOrEmpty(target) || !File.Exists(target))
                            {
                                await Dispatcher.InvokeAsync(async () =>
                                {
                                    await WvWhiteboard.CoreWebView2.ExecuteScriptAsync("if(window.__wordConvertCallback) window.__wordConvertCallback({error:'not_found'});");
                                });
                                return;
                            }

                            try
                            {
                                string outPdf = ConvertWordToPdf(target);
                                byte[] bytes = File.ReadAllBytes(outPdf);
                                string base64 = Convert.ToBase64String(bytes);
                                try { File.Delete(outPdf); } catch { }

                                await Dispatcher.InvokeAsync(async () =>
                                {
                                    string s = $"if(window.__wordConvertCallback) window.__wordConvertCallback({{pdf: Uint8Array.from(atob('{base64}'), c => c.charCodeAt(0))}});";
                                    await WvWhiteboard.CoreWebView2.ExecuteScriptAsync(s);
                                });
                            }
                            catch (Exception ex)
                            {
                                Log($"CONVERT_WORD error: {ex.Message}");
                                await Dispatcher.InvokeAsync(async () =>
                                {
                                    string errEsc = ex.Message.Replace("'", "\\'").Replace("\n", " ");
                                    await WvWhiteboard.CoreWebView2.ExecuteScriptAsync($"alert('Lỗi chuyển đổi Word: {errEsc}'); if(window.__wordConvertCallback) window.__wordConvertCallback({{error:'failed'}});");
                                });
                            }
                        });
                    }
                    else if (msgType == "COPY_EMF_SELECTION")
                    {
                        string svgContent = root.TryGetProperty("svg", out var svgProp) ? (svgProp.GetString() ?? "") : "";
                        string pngBase64 = root.TryGetProperty("pngBase64", out var pngProp) ? (pngProp.GetString() ?? "") : "";
                        bool emfOnly = root.TryGetProperty("emfOnly", out var eoProp) && eoProp.ValueKind == JsonValueKind.True;

                        byte[]? pngBytes = null;
                        if (!string.IsNullOrEmpty(pngBase64))
                        {
                            try { pngBytes = Convert.FromBase64String(pngBase64); } catch { }
                        }

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                byte[]? emfBytes = null;
                                if (!string.IsNullOrWhiteSpace(svgContent))
                                {
                                    emfBytes = await MininkEmfService.Instance.ConvertSvgToEmfAsync(svgContent, 15000, Log).ConfigureAwait(false);
                                }

                                bool ok = await Dispatcher.InvokeAsync(() =>
                                    NativeClipboardService.SetEmfAndTransparentPng(emfBytes, pngBytes, emfOnly)
                                );

                                if (ok && emfBytes != null)
                                {
                                    Log($"[EMF] Copied to clipboard: EMF={emfBytes.Length}B, PNG={(pngBytes?.Length ?? 0)}B, emfOnly={emfOnly}");
                                    if (emfOnly)
                                    {
                                        await Dispatcher.InvokeAsync(async () =>
                                        {
                                            await WvWhiteboard.CoreWebView2.ExecuteScriptAsync(
                                                "if (typeof window.showToast === 'function') window.showToast('Đã sao chép vector EMF không nền! Dán (Ctrl+V) vào Word/PowerPoint không vỡ nét.', 'success');");
                                        });
                                    }
                                }
                                else if (ok && pngBytes != null)
                                {
                                    Log($"[EMF] Fallback transparent PNG copied ({pngBytes.Length}B); MinInk downloading={MininkEmfService.Instance.IsDownloading}");
                                    if (emfOnly)
                                    {
                                        string msg = MininkEmfService.Instance.IsDownloading
                                            ? "Đang tự động tải công cụ xuất EMF (MinInk) ở nền... Đã tạm chép ảnh PNG tách nền."
                                            : "Chưa tìm thấy Inkscape/MinInk. Đã chép ảnh PNG tách nền thay thế.";
                                        await Dispatcher.InvokeAsync(async () =>
                                        {
                                            await WvWhiteboard.CoreWebView2.ExecuteScriptAsync(
                                                $"if (typeof window.showToast === 'function') window.showToast('{msg}', 'info');");
                                        });
                                    }
                                }
                            }
                            catch (Exception exEmf)
                            {
                                Log($"[EMF] COPY_EMF_SELECTION error: {exEmf.Message}");
                            }
                        });
                    }
                    else if (msgType == "SAVE_EMF_FILE")
                    {
                        string svgContent = root.TryGetProperty("svg", out var svgProp) ? (svgProp.GetString() ?? "") : "";
                        string suggestedName = root.TryGetProperty("fileName", out var fnProp) ? (fnProp.GetString() ?? "") : "";
                        if (string.IsNullOrWhiteSpace(suggestedName))
                            suggestedName = $"MinNote_Vector_{DateTime.Now:yyyyMMdd_HHmmss}.emf";
                        if (!suggestedName.EndsWith(".emf", StringComparison.OrdinalIgnoreCase))
                            suggestedName += ".emf";

                        if (string.IsNullOrWhiteSpace(svgContent))
                        {
                            await WvWhiteboard.CoreWebView2.ExecuteScriptAsync(
                                "if (typeof window.showToast === 'function') window.showToast('Trang hoặc vùng chọn đang trống, không có hình để xuất EMF.', 'warning');");
                            return;
                        }

                        var sfd = new Microsoft.Win32.SaveFileDialog
                        {
                            Title = "Xuất ảnh vector EMF (không nền)",
                            Filter = "Enhanced Metafile Vector (*.emf)|*.emf",
                            FileName = suggestedName
                        };

                        if (sfd.ShowDialog() == true)
                        {
                            string outPath = sfd.FileName;
                            _ = Task.Run(async () =>
                            {
                                try
                                {
                                    if (!MininkEmfService.Instance.IsAvailable)
                                    {
                                        await Dispatcher.InvokeAsync(async () =>
                                        {
                                            await WvWhiteboard.CoreWebView2.ExecuteScriptAsync(
                                                "if (typeof window.showToast === 'function') window.showToast('Đang tự động tải MinInk (Inkscape thu gọn) để xuất EMF...', 'info');");
                                        });
                                        await MininkEmfService.Instance.DownloadMininkAsync(Log).ConfigureAwait(false);
                                    }

                                    byte[]? emfBytes = await MininkEmfService.Instance.ConvertSvgToEmfAsync(svgContent, 20000, Log).ConfigureAwait(false);
                                    if (emfBytes != null && emfBytes.Length >= 88)
                                    {
                                        await File.WriteAllBytesAsync(outPath, emfBytes).ConfigureAwait(false);
                                        Log($"[EMF] Saved {emfBytes.Length}B to {outPath}");
                                        await Dispatcher.InvokeAsync(async () =>
                                        {
                                            await WvWhiteboard.CoreWebView2.ExecuteScriptAsync(
                                                "if (typeof window.showToast === 'function') window.showToast('Đã xuất file vector EMF không nền thành công!', 'success');");
                                        });
                                    }
                                    else
                                    {
                                        await Dispatcher.InvokeAsync(async () =>
                                        {
                                            await WvWhiteboard.CoreWebView2.ExecuteScriptAsync(
                                                "if (typeof window.showToast === 'function') window.showToast('Không thể chuyển sang EMF (chưa có Inkscape/MinInk).', 'error');");
                                        });
                                    }
                                }
                                catch (Exception exSaveEmf)
                                {
                                    Log($"[EMF] SAVE_EMF_FILE error: {exSaveEmf.Message}");
                                    string esc = exSaveEmf.Message.Replace("\\", "\\\\").Replace("'", "\\'");
                                    await Dispatcher.InvokeAsync(async () =>
                                    {
                                        await WvWhiteboard.CoreWebView2.ExecuteScriptAsync(
                                            $"if (typeof window.showToast === 'function') window.showToast('Lỗi xuất EMF: {esc}', 'error');");
                                    });
                                }
                            });
                        }
                    }
                    else if (msgType == "RENDER_TIKZ")
                    {
                        string reqId = root.TryGetProperty("id", out var idElem) ? (idElem.GetString() ?? "") : "";
                        string source = root.TryGetProperty("source", out var srcElem) ? (srcElem.GetString() ?? "") : "";
                        string defs = root.TryGetProperty("defs", out var defsElem) ? (defsElem.GetString() ?? "") : "";

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var rendered = await TikzCompilerService.Instance.RenderTikzAsync(source, defs, Log).ConfigureAwait(false);
                                string payload = JsonSerializer.Serialize(new
                                {
                                    type = "TIKZ_RESULT",
                                    id = reqId,
                                    ok = true,
                                    result = new { src = rendered.Src, w = rendered.W, h = rendered.H }
                                });
                                await Dispatcher.InvokeAsync(() =>
                                {
                                    WvWhiteboard?.CoreWebView2?.PostWebMessageAsJson(payload);
                                });
                            }
                            catch (Exception exTikz)
                            {
                                Log($"[TikZ] RENDER_TIKZ error: {exTikz.Message}");
                                string payload = JsonSerializer.Serialize(new
                                {
                                    type = "TIKZ_RESULT",
                                    id = reqId,
                                    ok = false,
                                    error = exTikz.Message
                                });
                                await Dispatcher.InvokeAsync(() =>
                                {
                                    WvWhiteboard?.CoreWebView2?.PostWebMessageAsJson(payload);
                                });
                            }
                        });
                    }
                    else if (msgType == "TRACE_TIKZ")
                    {
                        string reqId = root.TryGetProperty("id", out var idElem) ? (idElem.GetString() ?? "") : "";
                        string source = root.TryGetProperty("source", out var srcElem) ? (srcElem.GetString() ?? "") : "";
                        string defs = root.TryGetProperty("defs", out var defsElem) ? (defsElem.GetString() ?? "") : "";

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                string traceText = await TikzCompilerService.Instance.TraceTikzAsync(source, defs, Log).ConfigureAwait(false);
                                string payload = JsonSerializer.Serialize(new
                                {
                                    type = "TIKZ_RESULT",
                                    id = reqId,
                                    ok = true,
                                    result = traceText
                                });
                                await Dispatcher.InvokeAsync(() =>
                                {
                                    WvWhiteboard?.CoreWebView2?.PostWebMessageAsJson(payload);
                                });
                            }
                            catch (Exception exTrace)
                            {
                                Log($"[TikZ] TRACE_TIKZ error: {exTrace.Message}");
                                string payload = JsonSerializer.Serialize(new
                                {
                                    type = "TIKZ_RESULT",
                                    id = reqId,
                                    ok = false,
                                    error = exTrace.Message
                                });
                                await Dispatcher.InvokeAsync(() =>
                                {
                                    WvWhiteboard?.CoreWebView2?.PostWebMessageAsJson(payload);
                                });
                            }
                        });
                    }
                    else if (msgType == "DOWNLOAD_MINDMAP_SVG")
                    {
                        if (root.TryGetProperty("svg", out var svgElem))
                        {
                            string svg = svgElem.GetString() ?? "";
                            try
                            {
                                var sfd = new Microsoft.Win32.SaveFileDialog
                                {
                                    Filter = "SVG Image (*.svg)|*.svg",
                                    FileName = $"So_Do_Tu_Duy_{DateTime.Now:yyyyMMdd_HHmmss}.svg"
                                };
                                if (sfd.ShowDialog() == true)
                                {
                                    File.WriteAllText(sfd.FileName, svg, System.Text.Encoding.UTF8);
                                    await WvWhiteboard.CoreWebView2.ExecuteScriptAsync("if (typeof window.showToast === 'function') window.showToast('Đã xuất file vector SVG thành công!', 'success');");
                                }
                            }
                            catch (Exception ex)
                            {
                                Log($"Save SVG error: {ex.Message}");
                            }
                        }
                    }
                    else if (msgType == "REC_GET_SETTINGS")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var settings = VideoRecorderService.Instance.GetSettings();
                                VideoRecorderService.Instance.EnsureFolderExists(settings.Folder);
                                var videos = VideoRecorderService.Instance.ListRecentVideos(settings.Folder);
                                await PostRecResultAsync(reqId, true, new { settings, videos, nativeRecorder = true });
                            }
                            catch (Exception exRec)
                            {
                                await PostRecResultAsync(reqId, false, null, exRec.Message);
                            }
                        });
                    }
                    else if (msgType == "REC_SAVE_SETTINGS")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string settingsJson = root.TryGetProperty("settings", out var sEl) ? sEl.GetRawText() : "{}";
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var incoming = JsonSerializer.Deserialize<VideoRecorderSettings>(settingsJson,
                                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new VideoRecorderSettings();
                                var saved = VideoRecorderService.Instance.SaveSettings(incoming);
                                var videos = VideoRecorderService.Instance.ListRecentVideos(saved.Folder);
                                await PostRecResultAsync(reqId, true, new { settings = saved, videos });
                            }
                            catch (Exception exRec)
                            {
                                await PostRecResultAsync(reqId, false, null, exRec.Message);
                            }
                        });
                    }
                    else if (msgType == "REC_CHOOSE_FOLDER")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        try
                        {
                            string currentFolder = VideoRecorderService.Instance.EnsureFolderExists();
                            var ofd = new Microsoft.Win32.OpenFolderDialog
                            {
                                Title = "Chọn thư mục lưu video quay màn hình MinNote",
                                InitialDirectory = currentFolder,
                                Multiselect = false
                            };
                            if (ofd.ShowDialog(this) == true && !string.IsNullOrWhiteSpace(ofd.FolderName))
                            {
                                var saved = VideoRecorderService.Instance.SetFolder(ofd.FolderName);
                                var videos = VideoRecorderService.Instance.ListRecentVideos(saved.Folder);
                                await PostRecResultAsync(reqId, true, new { folder = saved.Folder, settings = saved, videos });
                            }
                            else
                            {
                                await PostRecResultAsync(reqId, true, new { folder = (string?)null, cancelled = true });
                            }
                        }
                        catch (Exception exRec)
                        {
                            await PostRecResultAsync(reqId, false, null, exRec.Message);
                        }
                    }
                    else if (msgType == "REC_OPEN_FOLDER")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string? folder = root.TryGetProperty("folder", out var fEl) ? fEl.GetString() : null;
                        try
                        {
                            VideoRecorderService.Instance.OpenFolder(folder);
                            await PostRecResultAsync(reqId, true, new { opened = true });
                        }
                        catch (Exception exRec)
                        {
                            await PostRecResultAsync(reqId, false, null, exRec.Message);
                        }
                    }
                    else if (msgType == "REC_OPEN_FILE")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string path = root.TryGetProperty("path", out var pEl) ? (pEl.GetString() ?? "") : "";
                        try
                        {
                            VideoRecorderService.Instance.OpenFile(path);
                            await PostRecResultAsync(reqId, true, new { opened = true });
                        }
                        catch (Exception exRec)
                        {
                            await PostRecResultAsync(reqId, false, null, exRec.Message);
                        }
                    }
                    else if (msgType == "REC_REVEAL_FILE")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string path = root.TryGetProperty("path", out var pEl) ? (pEl.GetString() ?? "") : "";
                        try
                        {
                            VideoRecorderService.Instance.RevealFile(path);
                            await PostRecResultAsync(reqId, true, new { revealed = true });
                        }
                        catch (Exception exRec)
                        {
                            await PostRecResultAsync(reqId, false, null, exRec.Message);
                        }
                    }
                    else if (msgType == "REC_LIST_VIDEOS")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string? folder = root.TryGetProperty("folder", out var fEl) ? fEl.GetString() : null;
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var videos = VideoRecorderService.Instance.ListRecentVideos(folder);
                                await PostRecResultAsync(reqId, true, new { videos });
                            }
                            catch (Exception exRec)
                            {
                                await PostRecResultAsync(reqId, false, null, exRec.Message);
                            }
                        });
                    }
                    else if (msgType == "REC_DELETE_VIDEO")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string path = root.TryGetProperty("path", out var pEl) ? (pEl.GetString() ?? "") : "";
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                bool deleted = VideoRecorderService.Instance.DeleteVideo(path);
                                var videos = VideoRecorderService.Instance.ListRecentVideos();
                                await PostRecResultAsync(reqId, true, new { deleted, videos });
                            }
                            catch (Exception exRec)
                            {
                                await PostRecResultAsync(reqId, false, null, exRec.Message);
                            }
                        });
                    }
                    else if (msgType == "REC_PICK_SAVE_PATH")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string suggestedName = root.TryGetProperty("fileName", out var fnEl) ? (fnEl.GetString() ?? "MinNote_Video") : "MinNote_Video";
                        string ext = root.TryGetProperty("ext", out var exEl) ? (exEl.GetString() ?? "mp4") : "mp4";
                        ext = ext.Trim().TrimStart('.').ToLowerInvariant();
                        if (ext != "webm") ext = "mp4";
                        try
                        {
                            string initialDir = VideoRecorderService.Instance.EnsureFolderExists();
                            string cleanName = VideoRecorderService.SanitizeFileName(suggestedName);
                            if (!cleanName.EndsWith("." + ext, StringComparison.OrdinalIgnoreCase)) cleanName += "." + ext;
                            var sfd = new Microsoft.Win32.SaveFileDialog
                            {
                                Title = "Chọn nơi lưu video MinNote",
                                InitialDirectory = initialDir,
                                FileName = cleanName,
                                Filter = ext == "webm"
                                    ? "Video WebM (*.webm)|*.webm|Video MP4 (*.mp4)|*.mp4"
                                    : "Video MP4 (*.mp4)|*.mp4|Video WebM (*.webm)|*.webm"
                            };
                            if (sfd.ShowDialog(this) == true && !string.IsNullOrWhiteSpace(sfd.FileName))
                            {
                                await PostRecResultAsync(reqId, true, new { path = sfd.FileName });
                            }
                            else
                            {
                                await PostRecResultAsync(reqId, true, new { path = (string?)null, cancelled = true });
                            }
                        }
                        catch (Exception exRec)
                        {
                            await PostRecResultAsync(reqId, false, null, exRec.Message);
                        }
                    }
                    else if (msgType == "REC_FILE_BEGIN")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string? fullPath = root.TryGetProperty("fullPath", out var fpEl) ? fpEl.GetString() : null;
                        string? folder = root.TryGetProperty("folder", out var fEl) ? fEl.GetString() : null;
                        string? fileName = root.TryGetProperty("fileName", out var fnEl) ? fnEl.GetString() : null;
                        string? ext = root.TryGetProperty("ext", out var exEl) ? exEl.GetString() : "mp4";
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var (sessionId, finalPath) = VideoRecorderService.Instance.BeginWrite(fullPath, folder, fileName, ext);
                                await PostRecResultAsync(reqId, true, new { sessionId, path = finalPath });
                            }
                            catch (Exception exRec)
                            {
                                await PostRecResultAsync(reqId, false, null, exRec.Message);
                            }
                        });
                    }
                    else if (msgType == "REC_FILE_CHUNK")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string sessionId = root.TryGetProperty("sessionId", out var sEl) ? (sEl.GetString() ?? "") : "";
                        string data = root.TryGetProperty("data", out var dEl) ? (dEl.GetString() ?? "") : "";
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                long written = VideoRecorderService.Instance.WriteChunk(sessionId, data);
                                await PostRecResultAsync(reqId, true, new { bytesWritten = written });
                            }
                            catch (Exception exRec)
                            {
                                await PostRecResultAsync(reqId, false, null, exRec.Message);
                            }
                        });
                    }
                    else if (msgType == "REC_FILE_END")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string sessionId = root.TryGetProperty("sessionId", out var sEl) ? (sEl.GetString() ?? "") : "";
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var (finalPath, savedName, sizeBytes) = VideoRecorderService.Instance.FinishWrite(sessionId);
                                var videos = VideoRecorderService.Instance.ListRecentVideos();
                                Log($"[REC] Saved video: {finalPath} ({sizeBytes} bytes)");
                                await PostRecResultAsync(reqId, true, new { path = finalPath, fileName = savedName, sizeBytes, videos });
                            }
                            catch (Exception exRec)
                            {
                                await PostRecResultAsync(reqId, false, null, exRec.Message);
                            }
                        });
                    }
                    else if (msgType == "REC_FILE_ABORT")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string sessionId = root.TryGetProperty("sessionId", out var sEl) ? (sEl.GetString() ?? "") : "";
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                VideoRecorderService.Instance.AbortWrite(sessionId);
                                await PostRecResultAsync(reqId, true, new { aborted = true });
                            }
                            catch (Exception exRec)
                            {
                                await PostRecResultAsync(reqId, false, null, exRec.Message);
                            }
                        });
                    }
                    else if (msgType == "REC_NATIVE_START")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        double cssX = root.TryGetProperty("x", out var xEl) && xEl.TryGetDouble(out var xv) ? xv : 0;
                        double cssY = root.TryGetProperty("y", out var yEl) && yEl.TryGetDouble(out var yv) ? yv : 0;
                        double cssW = root.TryGetProperty("w", out var wEl) && wEl.TryGetDouble(out var wv) ? wv : WvWhiteboard.ActualWidth;
                        double cssH = root.TryGetProperty("h", out var hEl) && hEl.TryGetDouble(out var hv) ? hv : WvWhiteboard.ActualHeight;
                        string quality = root.TryGetProperty("quality", out var qEl) ? (qEl.GetString() ?? "ultra") : "ultra";
                        int fps = root.TryGetProperty("fps", out var fpsEl) && fpsEl.TryGetInt32(out var fv) ? fv : 60;
                        bool mic = !root.TryGetProperty("mic", out var mEl) || mEl.ValueKind != JsonValueKind.False;
                        bool showCursor = !root.TryGetProperty("showCursor", out var cEl) || cEl.ValueKind != JsonValueKind.False;
                        _nativeRecDocName = root.TryGetProperty("docName", out var dnEl) ? (dnEl.GetString() ?? "") : "";

                        try
                        {
                            var originPx = WvWhiteboard.PointToScreen(new System.Windows.Point(0, 0));
                            var ps = PresentationSource.FromVisual(WvWhiteboard);
                            double dpiX = ps?.CompositionTarget?.TransformToDevice.M11 ?? 1.0;
                            double dpiY = ps?.CompositionTarget?.TransformToDevice.M22 ?? 1.0;

                            double maxCssW = Math.Max(64, WvWhiteboard.ActualWidth);
                            double maxCssH = Math.Max(64, WvWhiteboard.ActualHeight);
                            double cx = Math.Clamp(cssX, 0, Math.Max(0, maxCssW - 64));
                            double cy = Math.Clamp(cssY, 0, Math.Max(0, maxCssH - 64));
                            double cw = Math.Clamp(cssW, 64, maxCssW - cx);
                            double ch = Math.Clamp(cssH, 64, maxCssH - cy);

                            int sx = (int)Math.Round(originPx.X + cx * dpiX);
                            int sy = (int)Math.Round(originPx.Y + cy * dpiY);
                            int sw = Math.Max(64, ((int)Math.Round(cw * dpiX) / 2) * 2);
                            int sh = Math.Max(64, ((int)Math.Round(ch * dpiY) / 2) * 2);

                            var dipRect = new Rect((originPx.X / dpiX) + cx, (originPx.Y / dpiY) + cy, cw, ch);

                            int vBitrate = quality.ToLowerInvariant() switch
                            {
                                "standard" => 8_000_000,
                                "high" => 16_000_000,
                                _ => 24_000_000
                            };
                            int aBitrate = string.Equals(quality, "standard", StringComparison.OrdinalIgnoreCase) ? 128_000 : 192_000;

                            _ = Task.Run(async () =>
                            {
                                try
                                {
                                    NativeScreenRecorder.Instance.Start(sx, sy, sw, sh, fps, vBitrate, aBitrate, mic, showCursor);
                                    await Dispatcher.InvokeAsync(() =>
                                    {
                                        if (_recOverlay == null)
                                        {
                                            _recOverlay = new RecorderOverlayController(this);
                                            _recOverlay.PauseClicked += () =>
                                            {
                                                bool nowPaused = NativeScreenRecorder.Instance.TogglePause();
                                                _recOverlay?.SetPaused(nowPaused);
                                                _ = PostRecEventAsync("paused", new { paused = nowPaused });
                                            };
                                            _recOverlay.StopClicked += () =>
                                            {
                                                _ = StopNativeRecordingAsync(sendEventToJs: true);
                                            };
                                        }
                                        _recOverlay.Show(dipRect);
                                    });
                                    Log($"[REC_NATIVE] Started {sw}x{sh} @ {fps}fps (mic={mic}, cursor={showCursor})");
                                    await PostRecResultAsync(reqId, true, new { started = true, width = sw, height = sh, fps });
                                }
                                catch (Exception exRec)
                                {
                                    Log($"[REC_NATIVE] Start error: {exRec.Message}");
                                    await PostRecResultAsync(reqId, false, null, exRec.Message);
                                }
                            });
                        }
                        catch (Exception exRec)
                        {
                            await PostRecResultAsync(reqId, false, null, exRec.Message);
                        }
                    }
                    else if (msgType == "REC_NATIVE_PAUSE")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        try
                        {
                            bool nowPaused = NativeScreenRecorder.Instance.TogglePause();
                            _recOverlay?.SetPaused(nowPaused);
                            await PostRecResultAsync(reqId, true, new { paused = nowPaused });
                        }
                        catch (Exception exRec)
                        {
                            await PostRecResultAsync(reqId, false, null, exRec.Message);
                        }
                    }
                    else if (msgType == "REC_NATIVE_STOP")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var payload = await StopNativeRecordingAsync(sendEventToJs: false);
                                await PostRecResultAsync(reqId, true, payload);
                            }
                            catch (Exception exRec)
                            {
                                await PostRecResultAsync(reqId, false, null, exRec.Message);
                            }
                        });
                    }
                    else if (msgType == "REC_NATIVE_COMMIT")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string tempPath = root.TryGetProperty("tempPath", out var tpEl) ? (tpEl.GetString() ?? "") : "";
                        string? fullPath = root.TryGetProperty("fullPath", out var fpEl) ? fpEl.GetString() : null;
                        string? folder = root.TryGetProperty("folder", out var fEl) ? fEl.GetString() : null;
                        string? fileName = root.TryGetProperty("fileName", out var fnEl) ? fnEl.GetString() : null;
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var (finalPath, savedName, sizeBytes) = VideoRecorderService.Instance.CommitTempFile(
                                    tempPath, fullPath, folder, fileName, "mp4");
                                var videos = VideoRecorderService.Instance.ListRecentVideos();
                                Log($"[REC_NATIVE] Committed video: {finalPath} ({sizeBytes} bytes)");
                                await PostRecResultAsync(reqId, true, new { path = finalPath, fileName = savedName, sizeBytes, videos });
                            }
                            catch (Exception exRec)
                            {
                                await PostRecResultAsync(reqId, false, null, exRec.Message);
                            }
                        });
                    }
                    else if (msgType == "REC_NATIVE_DISCARD")
                    {
                        string reqId = root.TryGetProperty("id", out var idEl) ? (idEl.GetString() ?? "") : "";
                        string tempPath = root.TryGetProperty("tempPath", out var tpEl) ? (tpEl.GetString() ?? "") : "";
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                NativeScreenRecorder.DeleteTempFile(tempPath);
                                await PostRecResultAsync(reqId, true, new { discarded = true });
                            }
                            catch (Exception exRec)
                            {
                                await PostRecResultAsync(reqId, false, null, exRec.Message);
                            }
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                Log($"WebMessage error: {ex.Message}");
            }
        }

        private async Task<object?> StopNativeRecordingAsync(bool sendEventToJs)
        {
            if (Interlocked.CompareExchange(ref _nativeRecStopping, 1, 0) != 0)
            {
                return new { alreadyStopping = true };
            }
            try
            {
                await Dispatcher.InvokeAsync(() =>
                {
                    try { _recOverlay?.Close(); } catch { }
                });

                var res = await NativeScreenRecorder.Instance.StopAsync();
                if (res == null)
                {
                    var empty = new { stopped = true, empty = true };
                    if (sendEventToJs) await PostRecEventAsync("stopped", empty);
                    return empty;
                }

                var settings = VideoRecorderService.Instance.GetSettings();
                string prefix = string.IsNullOrWhiteSpace(settings.FilePrefix) ? "MinNote" : settings.FilePrefix;
                string docPart = string.IsNullOrWhiteSpace(_nativeRecDocName)
                    ? ""
                    : "_" + VideoRecorderService.SanitizeFileName(_nativeRecDocName);
                string suggestedBase = $"{prefix}{docPart}_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}";

                object payload;
                if (string.Equals(settings.SaveMode, "auto", StringComparison.OrdinalIgnoreCase) && res.SizeBytes > 0)
                {
                    var (finalPath, savedName, sizeBytes) = VideoRecorderService.Instance.CommitTempFile(
                        res.TempPath, null, settings.Folder, suggestedBase, "mp4");
                    var videos = VideoRecorderService.Instance.ListRecentVideos();
                    Log($"[REC_NATIVE] Auto-saved video: {finalPath} ({sizeBytes} bytes, {res.DurationMs}ms)");
                    payload = new
                    {
                        saved = true,
                        path = finalPath,
                        fileName = savedName,
                        sizeBytes,
                        durationMs = res.DurationMs,
                        width = res.Width,
                        height = res.Height,
                        fps = res.Fps,
                        hasAudio = res.HasAudio,
                        videos
                    };
                }
                else
                {
                    Log($"[REC_NATIVE] Stopped -> preview ready: {res.TempPath} ({res.SizeBytes} bytes, {res.DurationMs}ms)");
                    payload = new
                    {
                        saved = false,
                        tempPath = res.TempPath,
                        previewUrl = $"https://minnote-rec.local/{Uri.EscapeDataString(res.FileName)}",
                        suggestedName = suggestedBase,
                        fileName = res.FileName,
                        sizeBytes = res.SizeBytes,
                        durationMs = res.DurationMs,
                        width = res.Width,
                        height = res.Height,
                        fps = res.Fps,
                        hasAudio = res.HasAudio
                    };
                }

                if (sendEventToJs)
                {
                    await PostRecEventAsync("stopped", payload);
                }
                return payload;
            }
            catch (Exception ex)
            {
                Log($"[REC_NATIVE] Stop error: {ex.Message}");
                if (sendEventToJs)
                {
                    await PostRecEventAsync("error", new { error = ex.Message });
                }
                throw;
            }
            finally
            {
                Interlocked.Exchange(ref _nativeRecStopping, 0);
            }
        }

        private async Task PostRecEventAsync(string eventName, object? data)
        {
            try
            {
                string payload = JsonSerializer.Serialize(new
                {
                    type = "REC_NATIVE_EVENT",
                    @event = eventName,
                    data
                });
                await Dispatcher.InvokeAsync(() =>
                {
                    WvWhiteboard?.CoreWebView2?.PostWebMessageAsJson(payload);
                });
            }
            catch (Exception ex)
            {
                Log($"PostRecEventAsync error: {ex.Message}");
            }
        }

        private async Task PostRecResultAsync(string reqId, bool ok, object? result, string? error = null)
        {
            if (string.IsNullOrEmpty(reqId)) return;
            try
            {
                string payload = JsonSerializer.Serialize(new
                {
                    type = "REC_RESULT",
                    id = reqId,
                    ok,
                    result,
                    error
                });
                await Dispatcher.InvokeAsync(() =>
                {
                    WvWhiteboard?.CoreWebView2?.PostWebMessageAsJson(payload);
                });
            }
            catch (Exception ex)
            {
                Log($"PostRecResultAsync error: {ex.Message}");
            }
        }

        public void ToggleFullScreen()
        {
            if (_isTogglingFullScreen) return;
            _isTogglingFullScreen = true;
            try
            {
                if (!_isFullScreen)
                {
                    _previousWindowState = WindowState;
                    _previousWindowStyle = WindowStyle;
                    WindowStyle = WindowStyle.None;
                    WindowState = WindowState.Normal;
                    WindowState = WindowState.Maximized;
                    TopHeaderBar.Visibility = Visibility.Collapsed;
                    _isFullScreen = true;
                    if (BtnFullScreenTop != null)
                    {
                        BtnFullScreenTop.Icon = new Wpf.Ui.Controls.SymbolIcon(Wpf.Ui.Controls.SymbolRegular.FullScreenMinimize24);
                        BtnFullScreenTop.ToolTip = "Thoát Toàn Màn Hình (F11 hoặc Esc)";
                    }
                    WvWhiteboard.CoreWebView2?.ExecuteScriptAsync("if (typeof window.onHostFullScreenChanged === 'function') window.onHostFullScreenChanged(true); document.body.classList.add('fullscreen-mode');");
                }
                else
                {
                    TopHeaderBar.Visibility = Visibility.Visible;
                    WindowStyle = _previousWindowStyle;
                    WindowState = _previousWindowState;
                    _isFullScreen = false;
                    if (BtnFullScreenTop != null)
                    {
                        BtnFullScreenTop.Icon = new Wpf.Ui.Controls.SymbolIcon(Wpf.Ui.Controls.SymbolRegular.FullScreenMaximize24);
                        BtnFullScreenTop.ToolTip = "Bật/Tắt Toàn Màn Hình (F11)";
                    }
                    WvWhiteboard.CoreWebView2?.ExecuteScriptAsync("if (typeof window.onHostFullScreenChanged === 'function') window.onHostFullScreenChanged(false); document.body.classList.remove('fullscreen-mode');");
                }
            }
            finally
            {
                _isTogglingFullScreen = false;
            }
        }

        
        private void BtnPasteHtmlTop_Click(object sender, RoutedEventArgs e)
        {
            PromptPasteHtmlContent();
        }

        private void PromptPasteHtmlContent()
        {
            try
            {
                string text = "";
                if (System.Windows.Clipboard.ContainsText())
                {
                    text = System.Windows.Clipboard.GetText();
                }

                if (!string.IsNullOrEmpty(text))
                {
                    string b64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(text));
                    string script = $"if (typeof window.openPasteHtmlModal === 'function') {{ const decoded = decodeURIComponent(escape(atob('{b64}'))); window.openPasteHtmlModal(decoded); }}";
                    WvWhiteboard.CoreWebView2?.ExecuteScriptAsync(script);
                }
                else
                {
                    WvWhiteboard.CoreWebView2?.ExecuteScriptAsync("if (typeof window.openPasteHtmlModal === 'function') window.openPasteHtmlModal();");
                }
            }
            catch
            {
                WvWhiteboard.CoreWebView2?.ExecuteScriptAsync("if (typeof window.openPasteHtmlModal === 'function') window.openPasteHtmlModal();");
            }
        }

        private void BtnPresentHtmlTop_Click(object sender, RoutedEventArgs e)
        {
            PromptAndPresentHtmlFile();
        }

        private void MainWindow_Drop(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                string[] files = (string[])e.Data.GetData(DataFormats.FileDrop);
                if (files != null && files.Length > 0)
                {
                    string filePath = files[0];
                    string ext = Path.GetExtension(filePath).ToLowerInvariant();
                    if (ext == ".html" || ext == ".htm")
                    {
                        LoadAndPresentHtmlFile(filePath);
                    }
                }
            }
        }

        private void MainWindow_DragOver(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                e.Effects = DragDropEffects.Copy;
                e.Handled = true;
            }
        }

        private void PromptAndPresentHtmlFile()
        {
            try
            {
                var dlg = new Microsoft.Win32.OpenFileDialog
                {
                    Filter = "Tệp HTML (*.html;*.htm)|*.html;*.htm|Tất cả tệp (*.*)|*.*",
                    Title = "Chọn file bài giảng HTML để trình chiếu",
                    CheckFileExists = true
                };
                if (dlg.ShowDialog() == true)
                {
                    LoadAndPresentHtmlFile(dlg.FileName);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Lỗi chọn file HTML: " + ex.Message, "Lỗi", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void LoadAndPresentHtmlFile(string filePath)
        {
            try
            {
                if (!File.Exists(filePath)) return;
                string content = File.ReadAllText(filePath, System.Text.Encoding.UTF8);
                string title = Path.GetFileNameWithoutExtension(filePath);
                string b64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(content));
                string script = $"(function() {{ if (typeof window.startFullHtmlPresentation === 'function') {{ const decoded = decodeURIComponent(escape(atob('{b64}'))); window.startFullHtmlPresentation(decoded, {JsonSerializer.Serialize(title)}); }} else if (typeof window.promptOpenHtmlFile === 'function') {{ window.promptOpenHtmlFile(); }} }})();";
                WvWhiteboard.CoreWebView2?.ExecuteScriptAsync(script);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Không thể nạp file HTML: " + ex.Message, "Lỗi nạp file", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void BtnFullScreenTop_Click(object sender, RoutedEventArgs e)
        {
            ToggleFullScreen();
        }

                private void ExecuteScriptSafe(string script)
        {
            try
            {
                if (WvWhiteboard != null && WvWhiteboard.CoreWebView2 != null)
                {
                    WvWhiteboard.CoreWebView2.ExecuteScriptAsync(script);
                }
            }
            catch (Exception ex)
            {
                Log($"ExecuteScriptSafe error: {ex.Message}");
            }
        }

        
        private void UpdateTopBarLicense(LicenseInfo info)
        {
            if (BtnLicenseTop == null) return;
            string owner = string.IsNullOrWhiteSpace(info.Name) ? "MinNote" : info.Name;
            if (owner.Length > 16) owner = owner[..14] + "...";

            if (info.IsActive)
            {
                BtnLicenseTop.Content = $"Bản quyền: {info.DisplayTier}";
                BtnLicenseTop.ToolTip = $"Bản quyền: {owner} ({info.DisplayTier}) • Hạn: {info.Expiry}\nMã máy: {info.MachineId}\n(Bấm để xem chi tiết)";
                try
                {
                    BtnLicenseTop.Foreground = new System.Windows.Media.SolidColorBrush(
                        (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(info.BadgeColor));
                }
                catch { }
            }
            else
            {
                string statusText = string.Equals(info.Status, "revoked", StringComparison.OrdinalIgnoreCase)
                    ? "Đã khóa"
                    : (info.IsExpired ? "Hết hạn" : "Chưa kích hoạt");
                BtnLicenseTop.Content = $"Bản quyền: {statusText}";
                BtnLicenseTop.ToolTip = $"Chưa kích hoạt bản quyền MinNote • Mã máy: {info.MachineId}\n(Bấm để kích hoạt)";
                try
                {
                    BtnLicenseTop.Foreground = new System.Windows.Media.SolidColorBrush(
                        (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(info.BadgeColor));
                }
                catch { }
            }
        }

        private async void BtnUpdateTop_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                BtnUpdateTop.IsEnabled = false;
                UpdateInfo? update = _availableUpdate;
                if (update == null)
                {
                    BtnUpdateTop.Content = "Đang kiểm tra…";
                    update = await GitHubUpdateService.Instance.CheckForUpdatesAsync();
                }

                if (update != null)
                {
                    _availableUpdate = update;
                    var res = MessageBox.Show(this,
                        $"Đã có phiên bản mới v{update.Version} trên GitHub!\n\nChi tiết:\n{update.ReleaseNotes}\n\nBạn có muốn tải và cài đặt ngay không?",
                        "Cập nhật MinNote",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Information);

                    if (res == System.Windows.MessageBoxResult.Yes)
                    {
                        BtnUpdateTop.Content = "Đang tải…";
                        bool ok = await GitHubUpdateService.Instance.DownloadAndInstallUpdateAsync(update, pct =>
                        {
                            Dispatcher.Invoke(() => BtnUpdateTop.Content = $"{pct:F0}%");
                        });
                        if (!ok)
                        {
                            _availableUpdate = null;
                        }
                    }
                }
                else
                {
                    MessageBox.Show(this, $"MinNote đang ở phiên bản mới nhất: v{GitHubUpdateService.Instance.CurrentVersion}!", "Kiểm tra cập nhật", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, $"Lỗi kiểm tra cập nhật: {ex.Message}", "Lỗi", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
            finally
            {
                BtnUpdateTop.IsEnabled = true;
                if (_availableUpdate != null)
                {
                    ApplyAvailableUpdateHighlight(_availableUpdate);
                }
                else
                {
                    BtnUpdateTop.Content = "Cập nhật";
                }
            }
        }

        private void BtnLicenseTop_Click(object sender, RoutedEventArgs e)
        {
            var dlg = new ActivationDialog { Owner = this };
            dlg.ShowDialog();
        }

        private void BtnQuestionBankTop_Click(object sender, RoutedEventArgs e)
        {
            ExecuteScriptSafe("if (typeof toggleQuestionBankModal === 'function') toggleQuestionBankModal();");
        }

        /// <summary>Kiểm tra online (lúc mở app, mỗi 10 phút, khi bấm "Kiểm tra lại"); lỗi được ghi log thay vì nuốt im lặng.</summary>
        private async Task SyncLicenseAsync()
        {
            try
            {
                await Task.Run(() => SupabaseLicenseService.Instance.CheckLicenseAsync(forceOnline: true));
            }
            catch (Exception ex)
            {
                Log($"License sync failed: {ex}");
            }
            finally
            {
                _onlineCheckDone = true;
                OnLicense(SupabaseLicenseService.Instance.GetCurrentLicense());
            }
        }

        private void OnLicense(LicenseInfo info)
        {
            UpdateTopBarLicense(info);
            var (state, reason) = LicenseGate.Evaluate(info, LicenseGate.Whiteboard, _onlineCheckDone);
            Log($"License gate: {state} (status={info.Status}, tier={info.Tier}, signed={info.IsServerSigned}, offline={info.Offline})");
            bool allowed = state == GateState.Allowed;
            WvWhiteboard.Visibility = allowed ? Visibility.Visible : Visibility.Hidden;
            PanelLocked.Visibility = allowed ? Visibility.Collapsed : Visibility.Visible;
            BtnRecheckLicense.IsEnabled = state != GateState.Checking;
            TxtLockedTitle.Text = state == GateState.Checking ? "Đang kiểm tra bản quyền…" : "MinNote đang bị khóa";
            IconLocked.Symbol = state == GateState.Checking ? SymbolRegular.ShieldCheckmark24 : SymbolRegular.LockClosed24;
            TxtLockedReason.Text = state == GateState.Checking ? "Đang kết nối máy chủ bản quyền, vui lòng chờ." : reason;
        }

        private async void BtnRecheckLicense_Click(object sender, RoutedEventArgs e)
        {
            BtnRecheckLicense.IsEnabled = false;
            await SyncLicenseAsync();
        }

        private void BtnCopyMid_Click(object sender, RoutedEventArgs e)
        {
            try { Clipboard.SetText(RunLockedMid.Text); } catch (Exception ex) { Log($"Copy MID failed: {ex.Message}"); }
        }

        private void BtnMindmapTop_Click(object sender, RoutedEventArgs e)
        {
            var (state, reason) = LicenseGate.Evaluate(SupabaseLicenseService.Instance.GetCurrentLicense(), LicenseGate.Mindmap, _onlineCheckDone);
            if (state != GateState.Allowed)
            {
                MessageBox.Show(this, state == GateState.Checking ? "Đang kiểm tra bản quyền, thử lại sau giây lát." : reason,
                    "Sơ đồ tư duy", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }
            ExecuteScriptSafe("if (typeof toggleMindMapStudio === 'function') toggleMindMapStudio();");
        }

        private void MainWindow_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.V && (Keyboard.Modifiers & (ModifierKeys.Control | ModifierKeys.Shift)) == (ModifierKeys.Control | ModifierKeys.Shift))
            {
                e.Handled = true;
                PromptPasteHtmlContent();
            }
            else if (e.Key == Key.F5)
            {
                e.Handled = true;
                PromptAndPresentHtmlFile();
            }
            else if (e.Key == Key.F11)
            {
                e.Handled = true;
                ToggleFullScreen();
            }
            else if (e.Key == Key.Escape && _isFullScreen)
            {
                e.Handled = true;
                ToggleFullScreen();
            }
            else if (e.Key == Key.Q && (Keyboard.Modifiers & ModifierKeys.Control) == ModifierKeys.Control)
            {
                e.Handled = true;
                ExecuteScriptSafe("if (typeof toggleQuestionBankModal === 'function') toggleQuestionBankModal();");
            }
            else if (e.Key == Key.M && (Keyboard.Modifiers & (ModifierKeys.Control | ModifierKeys.Alt)) == (ModifierKeys.Control | ModifierKeys.Alt))
            {
                e.Handled = true;
                ExecuteScriptSafe("if (typeof toggleMindMapStudio === 'function') toggleMindMapStudio();");
            }
        }
    
        
        private void TopHeaderBar_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (e.ClickCount == 2)
            {
                WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
                return;
            }

            if (e.ButtonState == MouseButtonState.Pressed)
            {
                if (WindowState == WindowState.Maximized)
                {
                    Point mousePos = PointToScreen(e.GetPosition(this));
                    double percentHorizontal = e.GetPosition(this).X / ActualWidth;
                    double targetWidth = RestoreBounds.Width > 0 ? RestoreBounds.Width : 1280;
                    WindowState = WindowState.Normal;
                    Left = mousePos.X - (targetWidth * percentHorizontal);
                    Top = mousePos.Y - 15;
                }
                try
                {
                    DragMove();
                }
                catch { }
            }
        }

        private void BtnWinMin_Click(object sender, RoutedEventArgs e)
        {
            WindowState = WindowState.Minimized;
        }

        private void BtnWinMax_Click(object sender, RoutedEventArgs e)
        {
            WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
        }

        private void BtnWinClose_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }

        private async Task LoadAndSendQuestionBankAsync()
        {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string[] dbPaths = [
                Path.Combine(localAppData, "MatrixExamAI", "question_bank.db"),
                Path.Combine(userProfile, ".exam_generator", "question_bank.db")
            ];

            string? activeDb = dbPaths.FirstOrDefault(File.Exists);
            if (activeDb == null) return;

            var questions = new List<Dictionary<string, object?>>();
            using (var conn = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={activeDb};"))
            {
                await conn.OpenAsync();
                using var checkCmd = conn.CreateCommand();
                checkCmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='questions';";
                long count = Convert.ToInt64(await checkCmd.ExecuteScalarAsync());
                if (count == 0) return;

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT id, question_code, topic, cognitive_level, content, options_json, correct_answer, explanation FROM questions ORDER BY id DESC;";
                using var reader = await cmd.ExecuteReaderAsync();
                int idx = 1;
                while (await reader.ReadAsync())
                {
                    string id = reader["id"]?.ToString() ?? idx.ToString();
                    string code = reader["question_code"]?.ToString() ?? $"Câu {idx}";
                    string topic = reader["topic"]?.ToString() ?? "Tổng hợp";
                    string level = reader["cognitive_level"]?.ToString() ?? "Thông hiểu";
                    string qContent = reader["content"]?.ToString() ?? "";
                    string optJson = reader["options_json"]?.ToString() ?? "";
                    string ans = reader["correct_answer"]?.ToString() ?? "";
                    string exp = reader["explanation"]?.ToString() ?? "";

                    Dictionary<string, string> options = new();
                    if (!string.IsNullOrWhiteSpace(optJson))
                    {
                        try { options = JsonSerializer.Deserialize<Dictionary<string, string>>(optJson) ?? new(); } catch { }
                    }

                    questions.Add(new Dictionary<string, object?>
                    {
                        ["id"] = id,
                        ["code"] = code,
                        ["topic"] = topic,
                        ["level"] = level,
                        ["content"] = qContent,
                        ["options"] = options,
                        ["correctAnswer"] = ans,
                        ["explanation"] = exp
                    });
                    idx++;
                }
            }

            if (questions.Count == 0) return;

            var grouped = questions
                .GroupBy(q => (q["topic"]?.ToString() ?? "Tổng hợp"))
                .Select(g => new Dictionary<string, object?>
                {
                    ["id"] = "exam_sqlite_" + Math.Abs(g.Key.GetHashCode()),
                    ["title"] = g.Key,
                    ["source"] = "Kho SQLite MatrixExamAI (" + g.Count() + " câu)",
                    ["subject"] = "Toán học",
                    ["grade"] = 12,
                    ["questions"] = g.ToList()
                }).ToList();

            string jsonExams = JsonSerializer.Serialize(grouped);
            await Dispatcher.InvokeAsync(async () =>
            {
                await WvWhiteboard.CoreWebView2.ExecuteScriptAsync($"if (typeof window.receiveQuestionBankData === 'function') window.receiveQuestionBankData({jsonExams});");
            });
        }
    }
}