using MinNote.Services;
using MinNote.Views;
using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;
using Wpf.Ui.Controls;

namespace MinNote
{
    public partial class MainWindow : FluentWindow
    {
        private static readonly string LogFile = App.LogFile;
        private static readonly object LogLock = new();
        private const long MaxLogBytes = 2L * 1024 * 1024;
        private const string WebView2EvergreenDownloadUrl = "https://go.microsoft.com/fwlink/p/?LinkId=2124703";
        private static readonly Regex SensitiveJsonRegex = new(
            "\"(rawKeys|apiKey|apiKeys|key|keys|token|refreshToken|accessToken|password|secret|clientSecret|adminApiKey|authorization|bearer|serverSignature|signed_payload)\"\\s*:\\s*\"(?:[^\"\\\\]|\\\\.)*\"",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex SensitiveBearerRegex = new(
            @"\b(Bearer)\s+[A-Za-z0-9\-._~+/]+=*",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly HashSet<string> AllowedSaveExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            "gif", "webm", "mp4", "tex", "json", "svg", "png", "pdf", "txt", "nrn"
        };
        private static readonly HashSet<string> BlockedExecutableExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".exe", ".bat", ".cmd", ".ps1", ".psm1", ".psd1", ".vbs", ".vbe", ".js", ".jse",
            ".wsf", ".wsh", ".msi", ".msp", ".dll", ".scr", ".com", ".pif", ".hta", ".cpl",
            ".msc", ".jar", ".lnk", ".reg", ".inf", ".scf", ".sh"
        };
        private static bool IsTrustedAppUri(string? uri) =>
            Uri.TryCreate(uri, UriKind.Absolute, out var u) && u.Scheme == Uri.UriSchemeHttps &&
            string.Equals(u.Host, "minnote.app", StringComparison.OrdinalIgnoreCase);
        private static bool IsAllowedAppOrigin(string? uri)
        {
            if (string.IsNullOrEmpty(uri)) return false;
            if (uri.StartsWith("https://minnote.app/", StringComparison.OrdinalIgnoreCase)) return true;
#if DEBUG
            if (uri.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase) ||
                uri.StartsWith("http://127.0.0.1", StringComparison.OrdinalIgnoreCase))
                return true;
#endif
            return false;
        }
        private static string RedactSensitive(string text)
        {
            if (string.IsNullOrEmpty(text)) return string.Empty;
            string masked = SensitiveJsonRegex.Replace(text, "\"$1\":\"***\"");
            masked = SensitiveBearerRegex.Replace(masked, "$1 ***");
            return masked;
        }
        private readonly SemaphoreSlim _initLock = new(1, 1);
        private bool _isInitialized = false;
        private bool _eventsAttached = false;
        private bool _isFullScreen = false;

        private bool _isTogglingFullScreen = false;
        private bool _onlineCheckDone;
        private DateTime _lastAutoRecover = DateTime.MinValue;
        private string? _lastBatchDownloadDir;
        private DateTime _lastBatchDownloadUtc = DateTime.MinValue;
        private readonly System.Windows.Threading.DispatcherTimer _licenseTimer = new() { Interval = TimeSpan.FromMinutes(10) };
        private WindowState _previousWindowState = WindowState.Normal;
        private WindowStyle _previousWindowStyle = WindowStyle.SingleBorderWindow;
        private RecorderOverlayController? _recOverlay;
        private int _nativeRecStopping;
        private string _nativeRecDocName = "";
        private UpdateInfo? _availableUpdate;
        private bool _isDirty;
        private bool _allowCloseNow;
        private bool _isHandlingClose;
        private string _lastSavedDisplay = "";
        private int _lastKnownSheetCount = 1;
        private readonly ConcurrentDictionary<string, TaskCompletionSource<JsonElement>> _pendingHostRequests = new();
        private StartupRecoveryInfo _sessionMeta = new();

        public static void Log(string msg)
        {
            try
            {
                string safeMsg = RedactSensitive(msg ?? string.Empty);
                lock (LogLock)
                {
                    string? dir = Path.GetDirectoryName(LogFile);
                    if (!string.IsNullOrEmpty(dir))
                    {
                        Directory.CreateDirectory(dir);
                    }
                    try
                    {
                        if (File.Exists(LogFile))
                        {
                            var fi = new FileInfo(LogFile);
                            if (fi.Length > MaxLogBytes)
                            {
                                File.Move(LogFile, LogFile + ".old", overwrite: true);
                            }
                        }
                    }
                    catch { }
                    File.AppendAllText(LogFile, $"[{DateTime.Now:HH:mm:ss.fff}] {safeMsg}\n");
                }
            }
            catch { }
        }

        private async Task ShowWebToastAsync(string message, string tone = "info")
        {
            try
            {
                string mLit = JsonSerializer.Serialize(message ?? string.Empty);
                string tLit = JsonSerializer.Serialize(tone ?? "info");
                await Dispatcher.InvokeAsync(() =>
                    (Task?)WvWhiteboard?.CoreWebView2?.ExecuteScriptAsync($"if (typeof window.showToast === 'function') window.showToast({mLit}, {tLit});") ?? Task.CompletedTask
                ).Task.Unwrap();
            }
            catch (Exception ex)
            {
                Log($"ShowWebToastAsync notice: {ex.Message}");
            }
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

            _sessionMeta = NotebookBackupService.Instance.MarkSessionStarted();
            Log($"SessionStarted: prevCleanExit={_sessionMeta.PreviousCleanExit}, pendingUpdateRestore={_sessionMeta.PendingUpdateRestore}");

            // Kích hoạt & đồng bộ bản quyền Cloud; bảng viết chỉ mở khi license đã ký có quyền "whiteboard"
            RunLockedMid.Text = HardwareInfoService.GetMachineId();
            OnLicense(SupabaseLicenseService.Instance.GetCurrentLicense());
            SupabaseLicenseService.Instance.LicenseChanged += (s, info) => Dispatcher.Invoke(() => OnLicense(info));
            _ = SyncLicenseAsync();
            _licenseTimer.Tick += async (s, e) => await SyncLicenseAsync();
            _licenseTimer.Start();

            Closing += MainWindow_Closing;
            Closed += (s, e) =>
            {
                Log("Window Closed");
                try { MatrixExamSyncService.Instance.SyncChanged -= OnMeaSyncChanged; } catch { }
                try { MatrixExamSyncService.Instance.Dispose(); } catch { }
                try { WvWhiteboard?.Dispose(); } catch { }
                try { _recOverlay?.Dispose(); } catch { }
                try { NativeScreenRecorder.Instance.Dispose(); } catch { }
                try { MininkEmfService.Instance.Dispose(); } catch { }
                try { VideoRecorderService.Instance.Dispose(); } catch { }
            };

            // Đồng bộ thời gian thực hai chiều với MatrixExamAI Pro (config.json, question_bank.db, figures/)
            MatrixExamSyncService.Instance.SyncChanged += OnMeaSyncChanged;
            MatrixExamSyncService.Instance.EnsureWatchersStarted();

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
#if DEBUG
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
#else
            string[] candidates = new[]
            {
                Path.Combine(baseDir, "Resources", "Whiteboard")
            };
#endif

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

        private void HandleMissingWebView2Runtime()
        {
            ShowErrorState("Máy tính chưa cài đặt Microsoft Edge WebView2 Runtime. Vui lòng cài đặt WebView2 Runtime từ Microsoft rồi bấm \"Tải lại Bảng viết\".");
            Dispatcher.BeginInvoke(DispatcherPriority.ApplicationIdle, () =>
            {
                try
                {
                    bool openDownload = MinNoteDialog.ShowConfirm(
                        this,
                        "MinNote cần thành phần Microsoft Edge WebView2 Runtime (miễn phí từ Microsoft) để hiển thị không gian bảng viết.\n\nBạn có muốn mở trang tải bộ cài chính thức từ Microsoft ngay bây giờ không? Sau khi cài xong, bấm \"Tải lại Bảng viết\" để tiếp tục.",
                        "Thiếu Microsoft Edge WebView2 Runtime",
                        MinNoteDialogTone.Warning,
                        "Tải WebView2 Runtime",
                        "Để sau");
                    if (openDownload)
                    {
                        Process.Start(new ProcessStartInfo(WebView2EvergreenDownloadUrl) { UseShellExecute = true });
                    }
                }
                catch (Exception exOpen)
                {
                    Log($"[WebView2] Không mở được liên kết tải WebView2 Runtime: {exOpen.Message}");
                }
            });
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
            catch (WebView2RuntimeNotFoundException)
            {
                throw;
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

                var (integrityOk, tamperedFiles) = AssetIntegrityService.VerifyWhiteboardAssets(whiteboardDir, Log);
                if (!integrityOk)
                {
                    string detail = tamperedFiles != null && tamperedFiles.Count > 0
                        ? string.Join("; ", tamperedFiles)
                        : "unknown";
                    Log($"[Integrity] Whiteboard asset verification FAILED: {detail}");
                    ShowErrorState("Phát hiện tệp tài nguyên ứng dụng bị thay đổi hoặc thiếu tính toàn vẹn. Vui lòng cài đặt lại MinNote bản chính thức từ trang phát hành.");
                    return;
                }

                var prewarmed = App.TakePrewarmedEnvTask();
                CoreWebView2Environment env = prewarmed != null
                    ? await prewarmed
                    : await CreateEnvironmentWithFallbackAsync();
                Log("CoreWebView2Environment acquired successfully");

                bool attachedPrimary = false;
                try
                {
                    Log("Calling EnsureCoreWebView2Async");
                    await WvWhiteboard.EnsureCoreWebView2Async(env);
                    attachedPrimary = true;
                    Log("EnsureCoreWebView2Async succeeded");
                }
                catch (WebView2RuntimeNotFoundException)
                {
                    throw;
                }
                catch (Exception exEnv)
                {
                    // Hồ sơ chính còn bị tiến trình WebView2 cũ giữ (sau cập nhật hoặc khởi động lại nhanh): đợi tối đa ~3 giây rồi mới sang hồ sơ dự phòng
                    Log($"EnsureCoreWebView2Async failed ({exEnv.Message}). Retrying primary profile...");
                    for (int attempt = 1; attempt <= 6 && !attachedPrimary; attempt++)
                    {
                        await Task.Delay(500);
                        try
                        {
                            string primaryDir = ProfileDir("WebView2");
                            Directory.CreateDirectory(primaryDir);
                            var primaryEnv = await CoreWebView2Environment.CreateAsync(null, primaryDir,
                                new CoreWebView2EnvironmentOptions { AdditionalBrowserArguments = BrowserArgs });
                            await WvWhiteboard.EnsureCoreWebView2Async(primaryEnv);
                            attachedPrimary = true;
                            Log($"EnsureCoreWebView2Async primary profile succeeded on retry {attempt}");
                        }
                        catch (WebView2RuntimeNotFoundException)
                        {
                            throw;
                        }
                        catch (Exception exRetry)
                        {
                            Log($"Primary profile retry {attempt}/6 busy: {exRetry.Message}");
                        }
                    }

                    if (!attachedPrimary)
                    {
                        Log("Primary profile still locked after retries; switching to alternate profile.");
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
                WvWhiteboard.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "minnote-media.local",
                    GetMediaCacheDirectory(),
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
                        var settings = WvWhiteboard.CoreWebView2.Settings;
#if DEBUG
                        settings.AreDevToolsEnabled = true;
                        settings.AreBrowserAcceleratorKeysEnabled = true;
#else
                        settings.AreDevToolsEnabled = false;
                        settings.AreBrowserAcceleratorKeysEnabled = false;
#endif
                        settings.AreDefaultContextMenusEnabled = false;
                        settings.IsStatusBarEnabled = false;
                        settings.IsZoomControlEnabled = false;
                        settings.IsPinchZoomEnabled = true;
                        settings.IsSwipeNavigationEnabled = false;
                        settings.AreDefaultScriptDialogsEnabled = false;
                        settings.IsGeneralAutofillEnabled = false;
                        settings.IsPasswordAutosaveEnabled = false;
                        settings.IsBuiltInErrorPageEnabled = false;
                    }
                    catch (Exception exSettings)
                    {
                        Log($"WebView2 settings notice: {exSettings.Message}");
                    }
#if !DEBUG
                    WvWhiteboard.PreviewKeyDown += (s, e) =>
                    {
                        if (IsBlockedDevToolsShortcut(e))
                        {
                            e.Handled = true;
                        }
                    };
#endif

                    WvWhiteboard.CoreWebView2.NewWindowRequested += (s, e) =>
                    {
                        e.Handled = true;
                        string targetUri = e.Uri ?? string.Empty;
                        if (Uri.TryCreate(targetUri, UriKind.Absolute, out var nu) && nu.Scheme == Uri.UriSchemeHttps)
                        {
                            Log($"[NewWindowRequested] Mở liên kết HTTPS bằng trình duyệt mặc định: {nu.AbsoluteUri}");
                            try { Process.Start(new ProcessStartInfo(nu.AbsoluteUri) { UseShellExecute = true }); }
                            catch (Exception ex) { Log($"[NewWindowRequested] Không mở được trình duyệt: {ex.Message}"); }
                        }
                        else
                        {
                            Log($"[NewWindowRequested] Chặn cửa sổ mới không phải HTTPS: {targetUri}");
                        }
                    };

                    // Hộp thoại chuẩn MinNote trong app (phi đồng bộ, chặn hoàn toàn popup "minnote.app cho biết")
                    WvWhiteboard.CoreWebView2.ScriptDialogOpening += (s, e) =>
                    {
                        var deferral = e.GetDeferral();
                        Dispatcher.InvokeAsync(() =>
                        {
                            try
                            {
                                if (e.Kind == CoreWebView2ScriptDialogKind.Confirm)
                                {
                                    bool ok = MinNoteDialog.ShowConfirm(
                                        this,
                                        e.Message,
                                        "MinNote • Xác nhận thao tác",
                                        MinNoteDialogTone.Question,
                                        "Xác nhận",
                                        "Hủy");
                                    if (ok)
                                    {
                                        e.Accept();
                                    }
                                }
                                else if (e.Kind == CoreWebView2ScriptDialogKind.Prompt)
                                {
                                    string? val = MinNoteDialog.ShowPrompt(
                                        this,
                                        e.Message,
                                        e.DefaultText ?? string.Empty,
                                        "MinNote • Nhập thông tin");
                                    if (val != null)
                                    {
                                        e.ResultText = val;
                                        e.Accept();
                                    }
                                }
                                else if (e.Kind == CoreWebView2ScriptDialogKind.Alert)
                                {
                                    MinNoteDialog.ShowAlert(
                                        this,
                                        e.Message,
                                        "MinNote • Thông báo",
                                        MinNoteDialogTone.Info);
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
                        bool isLocalApp = IsAllowedAppOrigin(e.Uri);
                        if (isLocalApp && (
                            e.PermissionKind == CoreWebView2PermissionKind.ClipboardRead ||
                            e.PermissionKind == CoreWebView2PermissionKind.Microphone ||
                            e.PermissionKind == CoreWebView2PermissionKind.Camera ||
                            e.PermissionKind == CoreWebView2PermissionKind.MultipleAutomaticDownloads))
                        {
                            e.State = CoreWebView2PermissionState.Allow;
                        }
                        else if (!isLocalApp)
                        {
                            e.State = CoreWebView2PermissionState.Deny;
                        }
                    };

                    WvWhiteboard.CoreWebView2.ScreenCaptureStarting += (s, e) =>
                    {
                        string src = e.OriginalSourceFrameInfo?.Source ?? "";
                        string effectiveSrc = string.IsNullOrEmpty(src) ? (WvWhiteboard?.CoreWebView2?.Source ?? "") : src;
                        Log($"[ScreenCaptureStarting] source={effectiveSrc}");
                        if (!IsAllowedAppOrigin(effectiveSrc))
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
                                    _ = ShowWebToastAsync($"Đã lưu video: {Path.GetFileName(dest)}", "success");
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
                                    string targetExt = Path.GetExtension(targetPath);
                                    if (!string.IsNullOrEmpty(targetExt) && BlockedExecutableExtensions.Contains(targetExt))
                                    {
                                        Log($"[DownloadStarting] Blocked executable download extension: '{targetExt}'");
                                        e.Cancel = true;
                                    }
                                    else
                                    {
                                        e.ResultFilePath = targetPath;
                                        string savedName = Path.GetFileName(targetPath);
                                        var op = e.DownloadOperation;
                                        op.StateChanged += (_, __) =>
                                        {
                                            if (op.State == CoreWebView2DownloadState.Completed)
                                            {
                                                _ = ShowWebToastAsync($"Đã lưu tệp: {savedName}", "success");
                                            }
                                        };
                                    }
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

                    WvWhiteboard.CoreWebView2.NavigationStarting += CoreWebView2_NavigationStarting;
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
            catch (WebView2RuntimeNotFoundException ex)
            {
                Log($"[WebView2] Microsoft Edge WebView2 Runtime not found: {ex.Message}");
                HandleMissingWebView2Runtime();
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

        private void CoreWebView2_NavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
        {
            string uri = e.Uri ?? string.Empty;
            if (IsTrustedAppUri(uri) || uri.StartsWith("about:", StringComparison.OrdinalIgnoreCase) ||
                uri.StartsWith("blob:", StringComparison.OrdinalIgnoreCase) || uri.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                return;
            if (Uri.TryCreate(uri, UriKind.Absolute, out var u) &&
                u.Scheme == Uri.UriSchemeHttps &&
                (string.Equals(u.Host, "minnote-rec.local", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(u.Host, "minnote-media.local", StringComparison.OrdinalIgnoreCase)))
                return;
            e.Cancel = true;
            Log($"[Navigation] Chặn điều hướng ra ngoài app: {uri}");
            if (u != null && u.Scheme == Uri.UriSchemeHttps)
            {
                try { Process.Start(new ProcessStartInfo(u.AbsoluteUri) { UseShellExecute = true }); }
                catch (Exception ex) { Log($"[Navigation] Không mở được trình duyệt: {ex.Message}"); }
            }
        }

        async void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                if (!IsTrustedAppUri(e.Source))
                {
                    Log($"[WebMessage] Bỏ qua message từ nguồn không tin cậy: {e.Source}");
                    return;
                }
                string json = e.WebMessageAsJson;
                string safeLog = RedactSensitive(json);
                Log($"[WebMessage] {(safeLog.Length > 300 ? safeLog.Substring(0, 300) + "...(truncated)" : safeLog)}");
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (root.TryGetProperty("type", out var typeElem))
                {
                    string msgType = typeElem.GetString() ?? string.Empty;
                    string? requiredFeature = LicenseGate.RequiredFeatureForMessage(msgType);
                    if (requiredFeature != null)
                    {
                        var (gateState, gateReason) = LicenseGate.Evaluate(SupabaseLicenseService.Instance.GetCurrentLicense(), requiredFeature, _onlineCheckDone);
                        if (gateState != GateState.Allowed)
                        {
                            Log($"[WebMessage] {msgType} bị chặn: thiếu quyền '{requiredFeature}' ({gateState}).");
                            string deniedReqId = GetJsonString(root, "id");
                            if (!string.IsNullOrEmpty(deniedReqId))
                                await PostMeaSyncResultAsync(deniedReqId, false, null,
                                    gateState == GateState.Checking ? "Đang kiểm tra bản quyền, thử lại sau giây lát." : gateReason);
                            return;
                        }
                    }
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
                        MinNoteDialog.ShowAlert(
                            this,
                            "Bảng viết MinNote hoạt động độc lập!\nBạn có thể xuất ảnh PNG/SVG hoặc sao chép hình vẽ trực tiếp bằng các công cụ trên thanh bảng viết.",
                            "MinNote Độc Lập • Đỗ Miinh Math",
                            MinNoteDialogTone.Info);
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
                                    await ShowWebToastAsync("Đã sao chép sơ đồ tư duy trong suốt vào Clipboard! Có thể dán (Ctrl+V) vào Word.", "success");
                                }
                                catch (Exception exClip)
                                {
                                    Log($"Clipboard error: {exClip.Message}");
                                    await ShowWebToastAsync($"Lỗi sao chép Clipboard: {exClip.Message}", "error");
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
                                        await ShowWebToastAsync("Đã lưu ảnh sơ đồ tư duy thành công!", "success");
                                    }
                                }
                                catch (Exception exSave)
                                {
                                    Log($"Save PNG error: {exSave.Message}");
                                    await ShowWebToastAsync($"Lỗi lưu ảnh: {exSave.Message}", "error");
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            Log($"CAPTURE_MINDMAP error: {ex.Message}");
                            await ShowWebToastAsync($"Lỗi chụp sơ đồ tư duy: {ex.Message}", "error");
                        }
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
                                        await ShowWebToastAsync("Đã sao chép vector EMF không nền! Dán (Ctrl+V) vào Word/PowerPoint không vỡ nét.", "success");
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
                                        await ShowWebToastAsync(msg, "info");
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
                            await ShowWebToastAsync("Trang hoặc vùng chọn đang trống, không có hình để xuất EMF.", "warning");
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
                                        await ShowWebToastAsync("Đang tự động tải MinInk (Inkscape thu gọn) để xuất EMF...", "info");
                                        await MininkEmfService.Instance.DownloadMininkAsync(Log).ConfigureAwait(false);
                                    }

                                    byte[]? emfBytes = await MininkEmfService.Instance.ConvertSvgToEmfAsync(svgContent, 20000, Log).ConfigureAwait(false);
                                    if (emfBytes != null && emfBytes.Length >= 88)
                                    {
                                        await File.WriteAllBytesAsync(outPath, emfBytes).ConfigureAwait(false);
                                        Log($"[EMF] Saved {emfBytes.Length}B to {outPath}");
                                        await ShowWebToastAsync("Đã xuất file vector EMF không nền thành công!", "success");
                                    }
                                    else
                                    {
                                        await ShowWebToastAsync("Không thể chuyển sang EMF (chưa có Inkscape/MinInk).", "error");
                                    }
                                }
                                catch (Exception exSaveEmf)
                                {
                                    Log($"[EMF] SAVE_EMF_FILE error: {exSaveEmf.Message}");
                                    await ShowWebToastAsync($"Lỗi xuất EMF: {exSaveEmf.Message}", "error");
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
                                    await ShowWebToastAsync("Đã xuất file vector SVG thành công!", "success");
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
                                VideoRecorderService.Instance.AuthorizeSavePath(sfd.FileName);
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
                    else if (msgType == "PERSIST_HOST_REPLY")
                    {
                        string reqId = GetJsonString(root, "reqId");
                        if (!string.IsNullOrEmpty(reqId) && _pendingHostRequests.TryRemove(reqId, out var tcs))
                        {
                            tcs.TrySetResult(root.Clone());
                        }
                    }
                    else if (msgType == "PERSIST_DIRTY_STATE")
                    {
                        bool dirty = root.TryGetProperty("dirty", out var dEl) && dEl.ValueKind == JsonValueKind.True;
                        string savedAt = GetJsonString(root, "savedAtDisplay");
                        int sheetCnt = root.TryGetProperty("sheetCount", out var scEl) && scEl.TryGetInt32(out var sc) ? sc : 1;
                        _isDirty = dirty;
                        if (sheetCnt > 0) _lastKnownSheetCount = sheetCnt;
                        if (!string.IsNullOrWhiteSpace(savedAt)) _lastSavedDisplay = savedAt;
                        UpdateSaveStatusUi(_isDirty, _lastSavedDisplay, _lastKnownSheetCount);
                    }
                    else if (msgType == "PERSIST_HYDRATE")
                    {
                        string reqId = GetJsonString(root, "id");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var payload = NotebookBackupService.Instance.GetHydrationPayload();
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, payload);
                            }
                            catch (Exception exHyd)
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exHyd.Message);
                            }
                        });
                    }
                    else if (msgType == "PERSIST_MIRROR_WRITE")
                    {
                        string reqId = GetJsonString(root, "id");
                        string dir = GetJsonString(root, "dir");
                        string name = GetJsonString(root, "name");
                        string b64 = GetJsonString(root, "base64");
                        long modifiedMs = root.TryGetProperty("modifiedMs", out var mEl) && mEl.TryGetInt64(out var mv) ? mv : 0;
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                byte[] bytes = string.IsNullOrEmpty(b64) ? Array.Empty<byte>() : Convert.FromBase64String(b64);
                                NotebookBackupService.Instance.MirrorWriteFile(dir, name, bytes, modifiedMs);
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { saved = true, sizeBytes = bytes.Length });
                            }
                            catch (Exception exMw)
                            {
                                Log($"[PERSIST_MIRROR_WRITE] {dir}/{name}: {exMw.Message}");
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exMw.Message);
                            }
                        });
                    }
                    else if (msgType == "PERSIST_MIRROR_REMOVE")
                    {
                        string reqId = GetJsonString(root, "id");
                        string dir = GetJsonString(root, "dir");
                        string name = GetJsonString(root, "name");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                NotebookBackupService.Instance.MirrorRemoveFile(dir, name);
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { removed = true });
                            }
                            catch (Exception exMr)
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exMr.Message);
                            }
                        });
                    }
                    else if (msgType == "PERSIST_MIRROR_MAKEDIR")
                    {
                        string reqId = GetJsonString(root, "id");
                        string dir = GetJsonString(root, "dir");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                NotebookBackupService.Instance.MirrorMakeDir(dir);
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { created = true });
                            }
                            catch (Exception exMd)
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exMd.Message);
                            }
                        });
                    }
                    else if (msgType == "PERSIST_MIRROR_REMOVEDIR")
                    {
                        string reqId = GetJsonString(root, "id");
                        string dir = GetJsonString(root, "dir");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                NotebookBackupService.Instance.MirrorRemoveDir(dir);
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { removed = true });
                            }
                            catch (Exception exRd)
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exRd.Message);
                            }
                        });
                    }
                    else if (msgType == "PERSIST_MIRROR_MOVE")
                    {
                        string reqId = GetJsonString(root, "id");
                        string oldDir = GetJsonString(root, "oldDir");
                        string oldName = GetJsonString(root, "oldName");
                        string newDir = GetJsonString(root, "newDir");
                        string newName = GetJsonString(root, "newName");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                NotebookBackupService.Instance.MirrorMoveFile(oldDir, oldName, newDir, newName);
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { moved = true });
                            }
                            catch (Exception exMv)
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exMv.Message);
                            }
                        });
                    }
                    else if (msgType == "PERSIST_MIRROR_MOVEDIR")
                    {
                        string reqId = GetJsonString(root, "id");
                        string oldDir = GetJsonString(root, "oldDir");
                        string newDir = GetJsonString(root, "newDir");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                NotebookBackupService.Instance.MirrorMoveDir(oldDir, newDir);
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { moved = true });
                            }
                            catch (Exception exMd)
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exMd.Message);
                            }
                        });
                    }
                    else if (msgType == "PERSIST_SAVE_SESSION")
                    {
                        string reqId = GetJsonString(root, "id");
                        string tabsJson = GetJsonString(root, "tabsJson");
                        string placesJson = GetJsonString(root, "placesJson");
                        string geoScriptsJson = GetJsonString(root, "geoScriptsJson");
                        int tabCount = root.TryGetProperty("tabCount", out var tcEl) && tcEl.TryGetInt32(out var tc) ? tc : 0;
                        int sheetCount = root.TryGetProperty("sheetCount", out var scEl) && scEl.TryGetInt32(out var sc) ? sc : 1;
                        string activeTabName = GetJsonString(root, "activeTabName");
                        string reason = GetJsonString(root, "reason");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                NotebookBackupService.Instance.SaveSessionSnapshot(tabsJson, placesJson, tabCount, sheetCount, activeTabName, reason, geoScriptsJson);
                                string hhmm = DateTime.Now.ToString("HH:mm:ss");
                                await Dispatcher.InvokeAsync(() =>
                                {
                                    _lastSavedDisplay = hhmm;
                                    if (sheetCount > 0) _lastKnownSheetCount = sheetCount;
                                    UpdateSaveStatusUi(_isDirty, _lastSavedDisplay, _lastKnownSheetCount);
                                });
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { saved = true, savedAtDisplay = hhmm });
                            }
                            catch (Exception exSs)
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exSs.Message);
                            }
                        });
                    }
                    else if (msgType == "PERSIST_GET_STATUS")
                    {
                        string reqId = GetJsonString(root, "id");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var backup = NotebookBackupService.Instance.GetStatusInfo();
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { backup });
                            }
                            catch (Exception exSt)
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exSt.Message);
                            }
                        });
                    }
                    else if (msgType == "PERSIST_OPEN_FOLDER")
                    {
                        string reqId = GetJsonString(root, "id");
                        string which = GetJsonString(root, "which");
                        try
                        {
                            NotebookBackupService.Instance.OpenFolderInExplorer(which);
                            await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { opened = true });
                        }
                        catch (Exception exOf)
                        {
                            await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exOf.Message);
                        }
                    }
                    else if (msgType == "PERSIST_CHOOSE_SYNC_FOLDER")
                    {
                        string reqId = GetJsonString(root, "id");
                        try
                        {
                            var current = NotebookBackupService.Instance.GetSettings().SyncFolderPath;
                            var ofd = new Microsoft.Win32.OpenFolderDialog
                            {
                                Title = "Chọn thư mục sao lưu ngoài (OneDrive / USB / Ổ đĩa khác...)",
                                InitialDirectory = !string.IsNullOrWhiteSpace(current) && Directory.Exists(current)
                                    ? current
                                    : Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                                Multiselect = false
                            };
                            if (ofd.ShowDialog(this) == true && !string.IsNullOrWhiteSpace(ofd.FolderName))
                            {
                                NotebookBackupService.Instance.SaveSettings(confirmExitWhenSaved: null, syncFolderPath: ofd.FolderName);
                                var backup = NotebookBackupService.Instance.GetStatusInfo();
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { cancelled = false, folder = ofd.FolderName, backup });
                            }
                            else
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { cancelled = true });
                            }
                        }
                        catch (Exception exCf)
                        {
                            await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exCf.Message);
                        }
                    }
                    else if (msgType == "PERSIST_SET_SYNC_FOLDER")
                    {
                        string reqId = GetJsonString(root, "id");
                        string folder = GetJsonString(root, "folder");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                if (!string.IsNullOrWhiteSpace(folder) && !Directory.Exists(folder))
                                {
                                    throw new DirectoryNotFoundException("Không tìm thấy thư mục đã chọn trên máy.");
                                }
                                NotebookBackupService.Instance.SaveSettings(confirmExitWhenSaved: null, syncFolderPath: folder);
                                var backup = NotebookBackupService.Instance.GetStatusInfo();
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { backup });
                            }
                            catch (Exception exSf)
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exSf.Message);
                            }
                        });
                    }
                    else if (msgType == "PERSIST_SYNC_FOLDER_NOW")
                    {
                        string reqId = GetJsonString(root, "id");
                        string folder = GetJsonString(root, "folder");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var result = await NotebookBackupService.Instance.SyncToFolderNowAsync(string.IsNullOrWhiteSpace(folder) ? null : folder);
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, result);
                            }
                            catch (Exception exSy)
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exSy.Message);
                            }
                        });
                    }
                    else if (msgType == "PERSIST_RESTORE_FROM_FOLDER")
                    {
                        string reqId = GetJsonString(root, "id");
                        string folder = GetJsonString(root, "folder");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var result = await NotebookBackupService.Instance.RestoreFromFolderAsync(string.IsNullOrWhiteSpace(folder) ? null : folder);
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, result);
                            }
                            catch (Exception exRf)
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exRf.Message);
                            }
                        });
                    }
                    else if (msgType == "PERSIST_SET_SETTINGS")
                    {
                        string reqId = GetJsonString(root, "id");
                        bool? confirmExit = root.TryGetProperty("confirmExitWhenSaved", out var ceEl) &&
                            (ceEl.ValueKind == JsonValueKind.True || ceEl.ValueKind == JsonValueKind.False)
                            ? ceEl.GetBoolean()
                            : null;
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var saved = NotebookBackupService.Instance.SaveSettings(confirmExit, syncFolderPath: null);
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, true, new { settings = saved });
                            }
                            catch (Exception exSs)
                            {
                                await PostBridgeResultAsync("PERSIST_RESULT", reqId, false, null, exSs.Message);
                            }
                        });
                    }
                    else if (msgType == "MEA_GET_AI_CONFIG")
                    {
                        string reqId = GetJsonString(root, "id");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var cfg = await MatrixExamSyncService.Instance.GetAiConfigAsync();
                                await PostMeaSyncResultAsync(reqId, true, cfg);
                            }
                            catch (Exception exMea)
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                            }
                        });
                    }
                    else if (msgType == "MEA_REVEAL_API_KEY")
                    {
                        string reqId = GetJsonString(root, "id");
                        string? prov = GetJsonOptionalString(root, "provider");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var (resolvedProv, rawKeys, keyCount, masked) = MatrixExamSyncService.Instance.RevealApiKey(prov);
                                await PostMeaSyncResultAsync(reqId, true, new
                                {
                                    provider = resolvedProv,
                                    rawKeys,
                                    keyCount,
                                    masked
                                });
                            }
                            catch (Exception exMea)
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                            }
                        });
                    }
                    else if (msgType == "MEA_SAVE_AI_CONFIG")
                    {
                        string reqId = GetJsonString(root, "id");
                        var saveReq = new MeaSaveAiConfigRequest
                        {
                            Provider = GetJsonString(root, "provider"),
                            Model = GetJsonString(root, "model"),
                            RawKeys = root.TryGetProperty("rawKeys", out var rkEl) && rkEl.ValueKind == JsonValueKind.String
                                ? rkEl.GetString()
                                : (root.TryGetProperty("apiKey", out var akEl) && akEl.ValueKind == JsonValueKind.String ? akEl.GetString() : null),
                            KeyEdited = root.TryGetProperty("keyEdited", out var keEl) && keEl.ValueKind == JsonValueKind.True,
                            ClearKey = root.TryGetProperty("clearKey", out var ckEl) && ckEl.ValueKind == JsonValueKind.True,
                            KeyRotation = root.TryGetProperty("keyRotation", out var krEl) && (krEl.ValueKind == JsonValueKind.True || krEl.ValueKind == JsonValueKind.False)
                                ? krEl.GetBoolean()
                                : null
                        };
                        if (root.TryGetProperty("keysByProvider", out var kbpEl) && kbpEl.ValueKind == JsonValueKind.Object)
                        {
                            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                            foreach (var prop in kbpEl.EnumerateObject())
                            {
                                if (prop.Value.ValueKind == JsonValueKind.String)
                                {
                                    map[prop.Name] = prop.Value.GetString() ?? "";
                                }
                            }
                            saveReq.KeysByProvider = map;
                        }

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var updated = await MatrixExamSyncService.Instance.SaveAiConfigAsync(saveReq);
                                await PostMeaSyncResultAsync(reqId, true, updated);
                            }
                            catch (Exception exMea)
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                            }
                        });
                    }
                    else if (msgType == "MEA_REFRESH_MODELS")
                    {
                        string reqId = GetJsonString(root, "id");
                        string? prov = GetJsonOptionalString(root, "provider");
                        string? rawKeys = GetJsonOptionalString(root, "rawKeys") ?? GetJsonOptionalString(root, "apiKey");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var (models, live, note) = await MatrixExamSyncService.Instance.RefreshModelsAsync(prov, rawKeys);
                                string resolvedProv = string.IsNullOrWhiteSpace(prov)
                                    ? (await MatrixExamSyncService.Instance.GetAiConfigAsync()).Provider
                                    : MatrixExamSyncService.NormalizeProviderName(prov);
                                await PostMeaSyncResultAsync(reqId, true, new
                                {
                                    provider = resolvedProv,
                                    models,
                                    live,
                                    note
                                });
                            }
                            catch (Exception exMea)
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                            }
                        });
                    }
                    else if (msgType == "MEA_TEST_AI_KEY")
                    {
                        string reqId = GetJsonString(root, "id");
                        string? prov = GetJsonOptionalString(root, "provider");
                        string? model = GetJsonOptionalString(root, "model");
                        string? rawKeys = GetJsonOptionalString(root, "rawKeys") ?? GetJsonOptionalString(root, "apiKey");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var res = await MatrixExamSyncService.Instance.TestConnectionAsync(prov, model, rawKeys);
                                await PostMeaSyncResultAsync(reqId, true, res);
                            }
                            catch (Exception exMea)
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                            }
                        });
                    }
                    else if (msgType == "MEA_PICK_KEY_FILE")
                    {
                        string reqId = GetJsonString(root, "id");
                        try
                        {
                            var dlg = new Microsoft.Win32.OpenFileDialog
                            {
                                Title = "Chọn tệp danh sách API Key (.txt)",
                                Filter = "Tệp văn bản (*.txt)|*.txt|Tất cả tệp (*.*)|*.*"
                            };
                            if (dlg.ShowDialog(this) == true && !string.IsNullOrWhiteSpace(dlg.FileName))
                            {
                                string content = File.ReadAllText(dlg.FileName, System.Text.Encoding.UTF8);
                                int count = MatrixExamSyncService.SplitKeys(content).Count;
                                await PostMeaSyncResultAsync(reqId, true, new
                                {
                                    cancelled = false,
                                    fileName = Path.GetFileName(dlg.FileName),
                                    rawKeys = content,
                                    keyCount = count
                                });
                            }
                            else
                            {
                                await PostMeaSyncResultAsync(reqId, true, new { cancelled = true, keyCount = 0 });
                            }
                        }
                        catch (Exception exMea)
                        {
                            await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                        }
                    }
                    else if (msgType == "MEA_SAVE_KEY_FILE")
                    {
                        string reqId = GetJsonString(root, "id");
                        string? rawKeys = GetJsonOptionalString(root, "rawKeys") ?? GetJsonOptionalString(root, "apiKey");
                        string? prov = GetJsonOptionalString(root, "provider");
                        try
                        {
                            if (string.IsNullOrWhiteSpace(rawKeys) || rawKeys.Contains("••••", StringComparison.Ordinal))
                            {
                                rawKeys = MatrixExamSyncService.Instance.RevealApiKey(prov).RawKeys;
                            }
                            if (string.IsNullOrWhiteSpace(rawKeys))
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, "Chưa có nội dung API Key để lưu.");
                                return;
                            }

                            var sfd = new Microsoft.Win32.SaveFileDialog
                            {
                                Title = "Lưu danh sách API Key vào máy tính",
                                Filter = "Tệp văn bản (*.txt)|*.txt|Tất cả tệp (*.*)|*.*",
                                FileName = "api.txt",
                                DefaultExt = ".txt"
                            };
                            if (sfd.ShowDialog(this) == true && !string.IsNullOrWhiteSpace(sfd.FileName))
                            {
                                File.WriteAllText(sfd.FileName, rawKeys.Trim(), new System.Text.UTF8Encoding(false));
                                int count = MatrixExamSyncService.SplitKeys(rawKeys).Count;
                                await PostMeaSyncResultAsync(reqId, true, new
                                {
                                    cancelled = false,
                                    path = sfd.FileName,
                                    fileName = Path.GetFileName(sfd.FileName),
                                    keyCount = count
                                });
                            }
                            else
                            {
                                await PostMeaSyncResultAsync(reqId, true, new { cancelled = true, keyCount = 0 });
                            }
                        }
                        catch (Exception exMea)
                        {
                            await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                        }
                    }
                    else if (msgType == "MEA_AI_EXECUTE")
                    {
                        string reqId = GetJsonString(root, "id");
                        string prompt = GetJsonString(root, "prompt");
                        string? systemPrompt = GetJsonOptionalString(root, "systemPrompt");
                        string? prov = GetJsonOptionalString(root, "provider");
                        string? model = GetJsonOptionalString(root, "model");
                        string? rawKeys = GetJsonOptionalString(root, "rawKeys") ?? GetJsonOptionalString(root, "apiKey");
                        string? imageBase64 = GetJsonOptionalString(root, "imageBase64");
                        string imageMime = GetJsonOptionalString(root, "imageMimeType") ?? "image/png";

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var res = await MatrixExamSyncService.Instance.ExecutePromptAsync(
                                    prompt, systemPrompt, prov, model, rawKeys, imageBase64, imageMime);
                                if (res.Ok)
                                {
                                    await PostMeaSyncResultAsync(reqId, true, new
                                    {
                                        content = res.Content,
                                        provider = res.Provider,
                                        model = res.Model,
                                        latencyMs = res.LatencyMs
                                    });
                                }
                                else
                                {
                                    await PostMeaSyncResultAsync(reqId, false, new
                                    {
                                        provider = res.Provider,
                                        model = res.Model,
                                        latencyMs = res.LatencyMs
                                    }, res.Error ?? "Lỗi gọi AI.");
                                }
                            }
                            catch (Exception exMea)
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                            }
                        });
                    }
                    else if (msgType == "MEA_QB_LIST")
                    {
                        string reqId = GetJsonString(root, "id");
                        string? keyword = GetJsonOptionalString(root, "keyword") ?? GetJsonOptionalString(root, "query");
                        int? grade = GetJsonNullableInt(root, "grade");
                        string? topic = GetJsonOptionalString(root, "topic");
                        string? level = GetJsonOptionalString(root, "level");
                        string? qtype = GetJsonOptionalString(root, "qtype");
                        string? sourceDb = GetJsonOptionalString(root, "sourceDb");
                        int limit = GetJsonNullableInt(root, "limit") ?? 100;
                        int offset = GetJsonNullableInt(root, "offset") ?? 0;
                        bool resolveImages = !root.TryGetProperty("resolveImages", out var riEl) || riEl.ValueKind != JsonValueKind.False;

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var listRes = await MatrixExamSyncService.Instance.ListQuestionsAsync(
                                    keyword, grade, topic, level, qtype, limit, offset, resolveImages, sourceDb);
                                await PostMeaSyncResultAsync(reqId, true, listRes);
                            }
                            catch (Exception exMea)
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                            }
                        });
                    }
                    else if (msgType == "MEA_QB_SAVE_QUESTION")
                    {
                        string reqId = GetJsonString(root, "id");
                        JsonElement qSource = root.TryGetProperty("question", out var qObj) && qObj.ValueKind == JsonValueKind.Object
                            ? qObj
                            : root;
                        var qDto = ParseQuestionFromJson(qSource);

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var (savedId, code, updated, dbPath, schema) = await MatrixExamSyncService.Instance.SaveQuestionAsync(qDto);
                                await PostMeaSyncResultAsync(reqId, true, new
                                {
                                    id = savedId,
                                    code,
                                    updated,
                                    dbPath,
                                    schema
                                });
                            }
                            catch (Exception exMea)
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                            }
                        });
                    }
                    else if (msgType == "MEA_FIG_LIST")
                    {
                        string reqId = GetJsonString(root, "id");
                        string? keyword = GetJsonOptionalString(root, "keyword") ?? GetJsonOptionalString(root, "query");
                        string? source = GetJsonOptionalString(root, "source") ?? "all";
                        int limit = GetJsonNullableInt(root, "limit") ?? 120;
                        bool includePreview = !root.TryGetProperty("includePreview", out var ipEl) || ipEl.ValueKind != JsonValueKind.False;

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var (figuresDir, total, figures) = await MatrixExamSyncService.Instance.ListFiguresAsync(keyword, source, limit, includePreview);
                                await PostMeaSyncResultAsync(reqId, true, new
                                {
                                    figuresDir,
                                    total,
                                    figures
                                });
                            }
                            catch (Exception exMea)
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                            }
                        });
                    }
                    else if (msgType == "MEA_FIG_PUSH")
                    {
                        string reqId = GetJsonString(root, "id");
                        string? figureId = GetJsonOptionalString(root, "figureId")
                                           ?? GetJsonOptionalString(root, "targetId")
                                           ?? GetJsonOptionalString(root, "figId");
                        string? title = GetJsonOptionalString(root, "title");
                        string? description = GetJsonOptionalString(root, "description");
                        var tags = GetJsonStringList(root, "tags");
                        string tikzCode = GetJsonString(root, "tikzCode");
                        string? pngDataUrl = GetJsonOptionalString(root, "pngDataUrl") ?? GetJsonOptionalString(root, "pngBase64");
                        string? mnoteJson = GetJsonOptionalString(root, "mnoteJson");
                        string source = GetJsonOptionalString(root, "source") ?? "minnote";

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var (figure, updated, figuresDir) = await MatrixExamSyncService.Instance.PushFigureAsync(
                                    figureId, title, description, tags, tikzCode, pngDataUrl, mnoteJson, source);
                                await PostMeaSyncResultAsync(reqId, true, new
                                {
                                    figure,
                                    updated,
                                    figuresDir
                                });
                            }
                            catch (Exception exMea)
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                            }
                        });
                    }
                    else if (msgType == "MEA_FIG_LOAD")
                    {
                        string reqId = GetJsonString(root, "id");
                        string figureId = GetJsonOptionalString(root, "figureId")
                                          ?? GetJsonOptionalString(root, "targetId")
                                          ?? GetJsonOptionalString(root, "figId")
                                          ?? "";

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var figure = await MatrixExamSyncService.Instance.LoadFigureAsync(figureId);
                                if (figure == null)
                                {
                                    await PostMeaSyncResultAsync(reqId, false, null, $"Không tìm thấy hình #{figureId} trong Kho hình MatrixExamAI.");
                                }
                                else
                                {
                                    await PostMeaSyncResultAsync(reqId, true, figure);
                                }
                            }
                            catch (Exception exMea)
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                            }
                        });
                    }
                    else if (msgType == "MEA_FIG_DELETE")
                    {
                        string reqId = GetJsonString(root, "id");
                        string figureId = GetJsonOptionalString(root, "figureId")
                                          ?? GetJsonOptionalString(root, "targetId")
                                          ?? GetJsonOptionalString(root, "figId")
                                          ?? "";

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                bool deleted = await MatrixExamSyncService.Instance.DeleteFigureAsync(figureId);
                                await PostMeaSyncResultAsync(reqId, true, new { deleted, figureId });
                            }
                            catch (Exception exMea)
                            {
                                await PostMeaSyncResultAsync(reqId, false, null, exMea.Message);
                            }
                        });
                    }
                    else if (msgType == "PICK_VIDEO")
                    {
                        string reqId = GetJsonString(root, "id");
                        try
                        {
                            var dlg = new Microsoft.Win32.OpenFileDialog
                            {
                                Title = "Chọn tệp Video để chèn vào bảng viết MinNote",
                                Filter = "Tệp Video (*.mp4;*.webm;*.mov;*.mkv;*.m4v)|*.mp4;*.webm;*.mov;*.mkv;*.m4v|Tất cả tệp (*.*)|*.*",
                                CheckFileExists = true
                            };

                            if (dlg.ShowDialog(this) == true && !string.IsNullOrWhiteSpace(dlg.FileName) && File.Exists(dlg.FileName))
                            {
                                string srcPath = dlg.FileName;
                                _ = Task.Run(async () =>
                                {
                                    try
                                    {
                                        string cacheDir = GetMediaCacheDirectory();
                                        var srcInfo = new FileInfo(srcPath);
                                        string ext = Path.GetExtension(srcPath).ToLowerInvariant();
                                        if (string.IsNullOrEmpty(ext)) ext = ".mp4";
                                        string baseName = VideoRecorderService.SanitizeFileName(Path.GetFileNameWithoutExtension(srcPath));
                                        if (baseName.Length > 48) baseName = baseName[..48];
                                        string fingerprint = $"{srcPath}|{srcInfo.Length}|{srcInfo.LastWriteTimeUtc.Ticks}";
                                        string shortHash = Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(fingerprint)))[..8];
                                        string safeFileName = $"{baseName}_{shortHash}{ext}";
                                        string destPath = Path.Combine(cacheDir, safeFileName);

                                        if (!File.Exists(destPath) || new FileInfo(destPath).Length != srcInfo.Length)
                                        {
                                            File.Copy(srcPath, destPath, overwrite: true);
                                        }

                                        string mediaUrl = $"https://minnote-media.local/{Uri.EscapeDataString(safeFileName)}";
                                        await PostMeaSyncResultAsync(reqId, true, new
                                        {
                                            cancelled = false,
                                            url = mediaUrl,
                                            fileName = srcInfo.Name,
                                            cachedFileName = safeFileName,
                                            localPath = destPath,
                                            sizeBytes = srcInfo.Length
                                        });
                                    }
                                    catch (Exception exCopy)
                                    {
                                        await PostMeaSyncResultAsync(reqId, false, null, exCopy.Message);
                                    }
                                });
                            }
                            else
                            {
                                await PostMeaSyncResultAsync(reqId, true, new { cancelled = true });
                            }
                        }
                        catch (Exception exVid)
                        {
                            await PostMeaSyncResultAsync(reqId, false, null, exVid.Message);
                        }
                    }
                    else if (msgType == "SAVE_MEDIA_FILE")
                    {
                        string reqId = GetJsonString(root, "id");
                        string suggestedName = GetJsonString(root, "fileName");
                        string rawExt = GetJsonString(root, "ext").Trim().TrimStart('.').ToLowerInvariant();
                        string? base64Data = GetJsonOptionalString(root, "base64Data");
                        string? textData = GetJsonOptionalString(root, "textData");

                        if (string.IsNullOrEmpty(rawExt) && !string.IsNullOrWhiteSpace(suggestedName))
                        {
                            rawExt = Path.GetExtension(suggestedName).TrimStart('.').ToLowerInvariant();
                        }
                        if (string.IsNullOrEmpty(rawExt))
                        {
                            rawExt = !string.IsNullOrEmpty(base64Data) ? "gif" : "tex";
                        }
                        if (!AllowedSaveExtensions.Contains(rawExt))
                        {
                            Log($"[SAVE_MEDIA_FILE] Blocked unsupported extension: '{rawExt}'");
                            await PostMeaSyncResultAsync(reqId, false, null, "Định dạng tệp không được hỗ trợ lưu.");
                            return;
                        }

                        suggestedName = Path.GetFileName(suggestedName ?? string.Empty).Trim();
                        if (string.IsNullOrWhiteSpace(suggestedName))
                        {
                            suggestedName = $"MinNote_Export_{DateTime.Now:yyyyMMdd_HHmmss}.{rawExt}";
                        }
                        else if (!suggestedName.EndsWith("." + rawExt, StringComparison.OrdinalIgnoreCase))
                        {
                            suggestedName += "." + rawExt;
                        }

                        string filter = rawExt switch
                        {
                            "gif" => "Ảnh động GIF (*.gif)|*.gif|Tất cả tệp (*.*)|*.*",
                            "webm" => "Video WebM (*.webm)|*.webm|Video MP4 (*.mp4)|*.mp4|Tất cả tệp (*.*)|*.*",
                            "mp4" => "Video MP4 (*.mp4)|*.mp4|Video WebM (*.webm)|*.webm|Tất cả tệp (*.*)|*.*",
                            "tex" => "Mã LaTeX / TikZ (*.tex)|*.tex|Tệp văn bản (*.txt)|*.txt|Tất cả tệp (*.*)|*.*",
                            "json" => "Tệp JSON hình học (*.json)|*.json|Tất cả tệp (*.*)|*.*",
                            "svg" => "Ảnh Vector SVG (*.svg)|*.svg|Tất cả tệp (*.*)|*.*",
                            "png" => "Ảnh PNG (*.png)|*.png|Tất cả tệp (*.*)|*.*",
                            "pdf" => "Tài liệu PDF (*.pdf)|*.pdf|Tất cả tệp (*.*)|*.*",
                            "txt" => "Tệp văn bản (*.txt)|*.txt|Tất cả tệp (*.*)|*.*",
                            "nrn" => "Sổ ghi chú MinNote (*.nrn)|*.nrn|Tất cả tệp (*.*)|*.*",
                            _ => "Tất cả tệp (*.*)|*.*"
                        };

                        try
                        {
                            var sfd = new Microsoft.Win32.SaveFileDialog
                            {
                                Title = rawExt == "tex" ? "Lưu mã TikZ (.tex)" : $"Lưu tệp xuất (.{rawExt})",
                                Filter = filter,
                                FileName = suggestedName,
                                DefaultExt = "." + rawExt
                            };

                            if (sfd.ShowDialog(this) == true && !string.IsNullOrWhiteSpace(sfd.FileName))
                            {
                                string outPath = sfd.FileName;
                                string finalExt = Path.GetExtension(outPath);
                                if (!string.IsNullOrEmpty(finalExt) && BlockedExecutableExtensions.Contains(finalExt))
                                {
                                    Log($"[SAVE_MEDIA_FILE] Blocked executable output extension: '{finalExt}'");
                                    await PostMeaSyncResultAsync(reqId, false, null, "Định dạng tệp không được hỗ trợ lưu.");
                                    return;
                                }
                                _ = Task.Run(async () =>
                                {
                                    try
                                    {
                                        long sizeBytes;
                                        if (!string.IsNullOrEmpty(base64Data))
                                        {
                                            string cleanB64 = MatrixExamSyncService.StripDataUriPrefix(base64Data);
                                            byte[] bytes = Convert.FromBase64String(cleanB64);
                                            await File.WriteAllBytesAsync(outPath, bytes).ConfigureAwait(false);
                                            sizeBytes = bytes.Length;
                                        }
                                        else
                                        {
                                            byte[] utf8 = new System.Text.UTF8Encoding(false).GetBytes(textData ?? "");
                                            await File.WriteAllBytesAsync(outPath, utf8).ConfigureAwait(false);
                                            sizeBytes = utf8.Length;
                                        }

                                        await PostMeaSyncResultAsync(reqId, true, new
                                        {
                                            cancelled = false,
                                            path = outPath,
                                            fileName = Path.GetFileName(outPath),
                                            sizeBytes
                                        });
                                    }
                                    catch (Exception exSave)
                                    {
                                        await PostMeaSyncResultAsync(reqId, false, null, exSave.Message);
                                    }
                                });
                            }
                            else
                            {
                                await PostMeaSyncResultAsync(reqId, true, new { cancelled = true });
                            }
                        }
                        catch (Exception exDlg)
                        {
                            await PostMeaSyncResultAsync(reqId, false, null, exDlg.Message);
                        }
                    }
                    else if (msgType == "GENERATE_AI_MINDMAP")
                    {
                        string reqId = GetJsonString(root, "id");
                        string topic = GetJsonString(root, "topic");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                if (string.IsNullOrWhiteSpace(topic))
                                {
                                    throw new InvalidOperationException("Chủ đề sơ đồ tư duy không được để trống.");
                                }

                                var aiRes = await MatrixExamSyncService.Instance.GenerateMindmapMarkdownAsync(topic);
                                if (aiRes.Ok)
                                {
                                    if (!string.IsNullOrEmpty(reqId))
                                    {
                                        await PostMeaSyncResultAsync(reqId, true, new
                                        {
                                            markdown = aiRes.Content,
                                            provider = aiRes.Provider,
                                            model = aiRes.Model,
                                            latencyMs = aiRes.LatencyMs
                                        });
                                    }

                                    string payloadObj = JsonSerializer.Serialize(new
                                    {
                                        ok = true,
                                        markdown = aiRes.Content,
                                        provider = aiRes.Provider,
                                        model = aiRes.Model,
                                        latencyMs = aiRes.LatencyMs
                                    });
                                    string mdLit = JsonSerializer.Serialize(aiRes.Content);
                                    await Dispatcher.InvokeAsync(async () =>
                                    {
                                        if (WvWhiteboard?.CoreWebView2 == null) return;
                                        await WvWhiteboard.CoreWebView2.ExecuteScriptAsync(
                                            $"if (typeof window.receiveAiMindmapResult === 'function') window.receiveAiMindmapResult({payloadObj}); else if (typeof window.onAiMindmapGenerated === 'function') window.onAiMindmapGenerated({mdLit});");
                                    });
                                }
                                else
                                {
                                    string errMsg = aiRes.Error ?? "AI không trả về sơ đồ tư duy hợp lệ.";
                                    if (!string.IsNullOrEmpty(reqId))
                                    {
                                        await PostMeaSyncResultAsync(reqId, false, null, errMsg);
                                    }
                                    string errObj = JsonSerializer.Serialize(new
                                    {
                                        ok = false,
                                        error = errMsg,
                                        provider = aiRes.Provider,
                                        model = aiRes.Model
                                    });
                                    string errLit = JsonSerializer.Serialize(errMsg);
                                    await Dispatcher.InvokeAsync(async () =>
                                    {
                                        if (WvWhiteboard?.CoreWebView2 == null) return;
                                        await WvWhiteboard.CoreWebView2.ExecuteScriptAsync(
                                            $"if (typeof window.receiveAiMindmapResult === 'function') window.receiveAiMindmapResult({errObj}); else if (typeof window.onAiMindmapError === 'function') window.onAiMindmapError({errLit});");
                                    });
                                }
                            }
                            catch (Exception exMm)
                            {
                                Log($"GENERATE_AI_MINDMAP error: {exMm.Message}");
                                if (!string.IsNullOrEmpty(reqId))
                                {
                                    await PostMeaSyncResultAsync(reqId, false, null, exMm.Message);
                                }
                                string errObj = JsonSerializer.Serialize(new { ok = false, error = exMm.Message });
                                string errLit = JsonSerializer.Serialize(exMm.Message);
                                await Dispatcher.InvokeAsync(async () =>
                                {
                                    if (WvWhiteboard?.CoreWebView2 == null) return;
                                    await WvWhiteboard.CoreWebView2.ExecuteScriptAsync(
                                        $"if (typeof window.receiveAiMindmapResult === 'function') window.receiveAiMindmapResult({errObj}); else if (typeof window.onAiMindmapError === 'function') window.onAiMindmapError({errLit});");
                                });
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

        private static string GetJsonString(JsonElement root, string propertyName) =>
            root.TryGetProperty(propertyName, out var el) && el.ValueKind == JsonValueKind.String
                ? (el.GetString() ?? "")
                : "";

        private static string? GetJsonOptionalString(JsonElement root, string propertyName) =>
            root.TryGetProperty(propertyName, out var el) && el.ValueKind == JsonValueKind.String
                ? el.GetString()
                : null;

        private static int? GetJsonNullableInt(JsonElement root, string propertyName)
        {
            if (!root.TryGetProperty(propertyName, out var el)) return null;
            if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out int num)) return num;
            if (el.ValueKind == JsonValueKind.String && int.TryParse(el.GetString(), out int parsed)) return parsed;
            return null;
        }

        private static List<string>? GetJsonStringList(JsonElement root, string propertyName)
        {
            if (!root.TryGetProperty(propertyName, out var el)) return null;
            if (el.ValueKind == JsonValueKind.Array)
            {
                var list = new List<string>();
                foreach (var item in el.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String)
                    {
                        string val = (item.GetString() ?? "").Trim();
                        if (!string.IsNullOrEmpty(val)) list.Add(val);
                    }
                }
                return list;
            }
            if (el.ValueKind == JsonValueKind.String)
            {
                string raw = el.GetString() ?? "";
                return raw.Split(new[] { ',', ';', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                          .Select(s => s.Trim())
                          .Where(s => !string.IsNullOrEmpty(s))
                          .ToList();
            }
            return null;
        }

        private static MeaQuestionDto ParseQuestionFromJson(JsonElement el)
        {
            long id = 0;
            if (el.TryGetProperty("id", out var idEl))
            {
                if (idEl.ValueKind == JsonValueKind.Number && idEl.TryGetInt64(out long lid)) id = lid;
                else if (idEl.ValueKind == JsonValueKind.String && long.TryParse(idEl.GetString(), out long sid)) id = sid;
            }

            var options = new Dictionary<string, string>();
            if (el.TryGetProperty("options", out var optEl) && optEl.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in optEl.EnumerateObject())
                {
                    options[prop.Name] = prop.Value.ValueKind == JsonValueKind.String ? (prop.Value.GetString() ?? "") : prop.Value.ToString();
                }
            }

            return new MeaQuestionDto
            {
                Id = id,
                Code = GetJsonOptionalString(el, "code") ?? GetJsonOptionalString(el, "questionCode") ?? "",
                Subject = GetJsonOptionalString(el, "subject") ?? "Toán",
                Grade = GetJsonNullableInt(el, "grade") ?? 12,
                Topic = GetJsonOptionalString(el, "topic") ?? "",
                Level = GetJsonOptionalString(el, "level") ?? GetJsonOptionalString(el, "cognitiveLevel") ?? "Thông hiểu",
                Qtype = GetJsonOptionalString(el, "qtype") ?? GetJsonOptionalString(el, "questionType") ?? "MultipleChoice4",
                Content = GetJsonOptionalString(el, "content") ?? "",
                Options = options,
                CorrectAnswer = GetJsonOptionalString(el, "correctAnswer") ?? GetJsonOptionalString(el, "answer") ?? "",
                Explanation = GetJsonOptionalString(el, "explanation") ?? GetJsonOptionalString(el, "solution") ?? "",
                TikzCode = GetJsonOptionalString(el, "tikzCode") ?? "",
                Images = GetJsonStringList(el, "images") ?? new List<string>(),
                Source = GetJsonOptionalString(el, "source") ?? "MinNote"
            };
        }

        private static string GetMediaCacheDirectory()
        {
            string dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "MinNote",
                "media_cache");
            Directory.CreateDirectory(dir);
            return dir;
        }

        private void OnMeaSyncChanged(string eventType, object summary)
        {
            _ = PostMeaSyncEventAsync(eventType, summary);
            if (string.Equals(eventType, "question_bank_changed", StringComparison.OrdinalIgnoreCase))
            {
                _ = Task.Run(async () =>
                {
                    try { await LoadAndSendQuestionBankAsync(); }
                    catch (Exception ex) { Log($"Auto sync question bank error: {ex.Message}"); }
                });
            }
        }

        private async Task PostMeaSyncEventAsync(string eventType, object summary)
        {
            try
            {
                string payload = JsonSerializer.Serialize(new
                {
                    type = "MEA_SYNC_EVENT",
                    @event = eventType,
                    summary
                });
                await Dispatcher.InvokeAsync(() =>
                {
                    WvWhiteboard?.CoreWebView2?.PostWebMessageAsJson(payload);
                });
            }
            catch (Exception ex)
            {
                Log($"PostMeaSyncEventAsync ({eventType}) error: {ex.Message}");
            }
        }

        private async Task PostMeaSyncResultAsync(string reqId, bool ok, object? data, string? error = null)
        {
            if (string.IsNullOrEmpty(reqId)) return;
            try
            {
                string payload = JsonSerializer.Serialize(new
                {
                    type = "MEA_SYNC_RESULT",
                    id = reqId,
                    ok,
                    data,
                    error
                });
                await Dispatcher.InvokeAsync(() =>
                {
                    WvWhiteboard?.CoreWebView2?.PostWebMessageAsJson(payload);
                });
            }
            catch (Exception ex)
            {
                Log($"PostMeaSyncResultAsync error: {ex.Message}");
            }
        }

        private Task PostRecResultAsync(string reqId, bool ok, object? result, string? error = null) =>
            PostBridgeResultAsync("REC_RESULT", reqId, ok, result, error);

        private async Task PostBridgeResultAsync(string messageType, string reqId, bool ok, object? result, string? error = null)
        {
            if (string.IsNullOrEmpty(reqId)) return;
            try
            {
                string payload = JsonSerializer.Serialize(new
                {
                    type = messageType,
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
                Log($"PostBridgeResultAsync ({messageType}) error: {ex.Message}");
            }
        }

        private sealed class WhiteboardExitStatus
        {
            public bool IsDirty { get; init; }
            public bool HasContent { get; init; }
            public string DocName { get; init; } = "";
            public int TabCount { get; init; } = 1;
            public int SheetCount { get; init; } = 1;
        }

        private async Task<JsonElement?> SendHostCommandAsync(string cmd, string reason, int timeoutMs)
        {
            if (!_isInitialized || WvWhiteboard?.CoreWebView2 == null) return null;

            string reqId = "host_" + Guid.NewGuid().ToString("N")[..10];
            var tcs = new TaskCompletionSource<JsonElement>(TaskCreationOptions.RunContinuationsAsynchronously);
            _pendingHostRequests[reqId] = tcs;
            try
            {
                string argJson = JsonSerializer.Serialize(new { reqId, cmd, reason });
                string script = $"if (window.__minnotePersistence && typeof window.__minnotePersistence.handleHostCommand === 'function') {{ window.__minnotePersistence.handleHostCommand({argJson}); }} else if (window.chrome && window.chrome.webview) {{ window.chrome.webview.postMessage({{ type: 'PERSIST_HOST_REPLY', reqId: {JsonSerializer.Serialize(reqId)}, unsupported: true }}); }}";
                await Dispatcher.InvokeAsync(() =>
                {
                    WvWhiteboard?.CoreWebView2?.ExecuteScriptAsync(script);
                });

                using var cts = new CancellationTokenSource(timeoutMs);
                return await tcs.Task.WaitAsync(cts.Token);
            }
            catch (Exception ex)
            {
                Log($"SendHostCommandAsync({cmd}) notice: {ex.Message}");
                return null;
            }
            finally
            {
                _pendingHostRequests.TryRemove(reqId, out _);
            }
        }

        private async Task<WhiteboardExitStatus> QueryWhiteboardExitStatusAsync(int timeoutMs = 2500)
        {
            var replyOpt = await SendHostCommandAsync("getExitStatus", "closing_check", timeoutMs);
            if (replyOpt is not JsonElement reply ||
                (reply.TryGetProperty("unsupported", out var uns) && uns.ValueKind == JsonValueKind.True))
            {
                return new WhiteboardExitStatus { IsDirty = _isDirty, HasContent = _isDirty };
            }

            bool dirty = reply.TryGetProperty("isDirty", out var dEl) && dEl.ValueKind == JsonValueKind.True;
            bool hasContent = reply.TryGetProperty("hasContent", out var hEl) && hEl.ValueKind == JsonValueKind.True;
            string name = GetJsonString(reply, "activeTabName");
            int tabCnt = reply.TryGetProperty("tabCount", out var tcEl) && tcEl.TryGetInt32(out var tc) ? tc : 1;
            int sheetCnt = reply.TryGetProperty("sheetCount", out var scEl) && scEl.TryGetInt32(out var sc) ? sc : 1;
            return new WhiteboardExitStatus
            {
                IsDirty = dirty || _isDirty,
                HasContent = hasContent || dirty || tabCnt > 1 || sheetCnt > 1,
                DocName = name,
                TabCount = Math.Max(1, tabCnt),
                SheetCount = Math.Max(1, sheetCnt)
            };
        }

        private async Task<bool> FlushAndSaveWhiteboardAsync(string reason, int timeoutMs = 5500)
        {
            if (!_isInitialized || WvWhiteboard?.CoreWebView2 == null) return false;
            var replyOpt = await SendHostCommandAsync("saveAllNow", reason, timeoutMs);
            if (replyOpt is JsonElement reply)
            {
                bool ok = reply.TryGetProperty("ok", out var okEl) && okEl.ValueKind == JsonValueKind.True;
                if (ok)
                {
                    _isDirty = false;
                    _lastSavedDisplay = DateTime.Now.ToString("HH:mm:ss");
                    int sc = reply.TryGetProperty("sheetCount", out var scEl) && scEl.TryGetInt32(out var sVal) ? sVal : _lastKnownSheetCount;
                    if (sc > 0) _lastKnownSheetCount = sc;
                    await Dispatcher.InvokeAsync(() => UpdateSaveStatusUi(false, _lastSavedDisplay, _lastKnownSheetCount));
                }
                return ok;
            }
            return false;
        }

        private void UpdateSaveStatusUi(bool dirty, string? savedTimeText, int sheetCount)
        {
            if (BtnSaveStatusTop == null) return;
            string sheetNote = sheetCount > 1 ? $" ({sheetCount} sheet)" : "";
            string timeNote = string.IsNullOrWhiteSpace(savedTimeText) ? "" : $" lúc {savedTimeText}";

            if (dirty)
            {
                BtnSaveStatusTop.Content = "Chưa lưu";
                BtnSaveStatusTop.Foreground = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromRgb(252, 211, 77));
                BtnSaveStatusTop.Background = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromArgb(40, 245, 158, 11));
                BtnSaveStatusTop.BorderBrush = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromArgb(120, 245, 158, 11));
                BtnSaveStatusTop.BorderThickness = new Thickness(1);
                BtnSaveStatusTop.ToolTip = $"Có thao tác chưa lưu{sheetNote} • Bấm để lưu tất cả tab & sheet ngay (Ctrl+S)";
            }
            else
            {
                BtnSaveStatusTop.Content = string.IsNullOrWhiteSpace(savedTimeText) ? "Đã lưu" : $"Đã lưu {savedTimeText}";
                BtnSaveStatusTop.Foreground = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromRgb(134, 239, 172));
                BtnSaveStatusTop.Background = System.Windows.Media.Brushes.Transparent;
                BtnSaveStatusTop.BorderBrush = System.Windows.Media.Brushes.Transparent;
                BtnSaveStatusTop.BorderThickness = new Thickness(0);
                BtnSaveStatusTop.ToolTip = $"Đã tự động lưu an toàn{timeNote}{sheetNote} • Bấm để lưu ngay";
            }
        }

        private async void BtnSaveStatusTop_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                BtnSaveStatusTop.IsEnabled = false;
                BtnSaveStatusTop.Content = "Đang lưu…";
                bool ok = await FlushAndSaveWhiteboardAsync("manual_top", 6000);
                if (ok && WvWhiteboard?.CoreWebView2 != null)
                {
                    await ShowWebToastAsync("Đã lưu tất cả sổ và các sheet an toàn ra ổ đĩa!", "success");
                }
            }
            catch (Exception ex)
            {
                Log($"BtnSaveStatusTop_Click error: {ex.Message}");
            }
            finally
            {
                BtnSaveStatusTop.IsEnabled = true;
                UpdateSaveStatusUi(_isDirty, _lastSavedDisplay, _lastKnownSheetCount);
            }
        }

        private void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
        {
            Log($"Window Closing: allowNow={_allowCloseNow}, handling={_isHandlingClose}, dirty={_isDirty}");
            if (_allowCloseNow) return;

            e.Cancel = true;
            if (_isHandlingClose) return;
            _isHandlingClose = true;
            _ = HandleWindowClosingAsync();
        }

        private async Task HandleWindowClosingAsync()
        {
            try
            {
                if (!_isInitialized || WvWhiteboard?.CoreWebView2 == null || PanelLocked.Visibility == Visibility.Visible)
                {
                    NotebookBackupService.Instance.MarkCleanExit("early_exit", pendingUpdateRestore: false);
                    _allowCloseNow = true;
                    Close();
                    return;
                }

                var status = await QueryWhiteboardExitStatusAsync(2500);
                var settings = NotebookBackupService.Instance.GetSettings();

                if (status.IsDirty || (status.HasContent && settings.ConfirmExitWhenSaved))
                {
                    string lastTime = string.IsNullOrWhiteSpace(_lastSavedDisplay) ? "" : $"lúc {_lastSavedDisplay}";
                    var dlg = new ExitConfirmDialog(
                        status.IsDirty,
                        status.DocName,
                        status.TabCount,
                        status.SheetCount,
                        lastTime,
                        showDontAskAgainCheckbox: !status.IsDirty)
                    {
                        Owner = this
                    };
                    dlg.ShowDialog();

                    if (dlg.Choice == ExitDialogChoice.Cancel)
                    {
                        _isHandlingClose = false;
                        return;
                    }

                    if (dlg.Choice == ExitDialogChoice.SaveAndExit)
                    {
                        if (!status.IsDirty && dlg.DontAskAgainChecked)
                        {
                            NotebookBackupService.Instance.SaveSettings(confirmExitWhenSaved: false, syncFolderPath: null);
                        }
                        await FlushAndSaveWhiteboardAsync("exit", 6000);
                        NotebookBackupService.Instance.MarkCleanExit("exit", pendingUpdateRestore: false);
                    }
                    else
                    {
                        NotebookBackupService.Instance.MarkCleanExit("discard_exit", pendingUpdateRestore: false);
                    }
                }
                else
                {
                    if (status.HasContent)
                    {
                        await FlushAndSaveWhiteboardAsync("quiet_exit", 2000);
                    }
                    NotebookBackupService.Instance.MarkCleanExit("quiet_exit", pendingUpdateRestore: false);
                }

                try { WvWhiteboard?.Dispose(); } catch { }
                await Task.Delay(150);
                _allowCloseNow = true;
                Close();
            }
            catch (Exception ex)
            {
                Log($"HandleWindowClosingAsync error: {ex.Message}");
                _allowCloseNow = true;
                Close();
            }
        }

        /// <summary>Xả lưu khẩn cấp khi Windows tắt máy / khởi động lại (tối đa 2.5 giây, không hiện hộp thoại).</summary>
        public void FlushForSessionEnding()
        {
            if (_allowCloseNow) return;
            _allowCloseNow = true;
            try
            {
                if (_isInitialized && WvWhiteboard?.CoreWebView2 != null && CheckAccess())
                {
                    var frame = new DispatcherFrame();
                    _ = Task.Run(async () =>
                    {
                        try { await FlushAndSaveWhiteboardAsync("windows_shutdown", 2300).ConfigureAwait(false); } catch { }
                        frame.Continue = false;
                    });
                    var killer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(2500) };
                    killer.Tick += (_, _) =>
                    {
                        killer.Stop();
                        frame.Continue = false;
                    };
                    killer.Start();
                    Dispatcher.PushFrame(frame);
                }
            }
            catch (Exception ex)
            {
                Log($"FlushForSessionEnding error: {ex.Message}");
            }
            finally
            {
                NotebookBackupService.Instance.MarkCleanExit("windows_shutdown", pendingUpdateRestore: false);
                try { WvWhiteboard?.Dispose(); } catch { }
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
                MinNoteDialog.ShowAlert(this, "Lỗi chọn file HTML: " + ex.Message, "Lỗi chọn file", MinNoteDialogTone.Danger);
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
                MinNoteDialog.ShowAlert(this, "Không thể nạp file HTML: " + ex.Message, "Lỗi nạp file", MinNoteDialogTone.Danger);
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
                    bool shouldInstall = ShowUpdatePromptDialog(update);

                    if (shouldInstall)
                    {
                        BtnUpdateTop.Content = "Đang lưu dữ liệu…";
                        await FlushAndSaveWhiteboardAsync("pre_update_download", 6000);

                        BtnUpdateTop.Content = "Đang tải…";
                        bool ok = await GitHubUpdateService.Instance.DownloadAndInstallUpdateAsync(
                            update,
                            pct => Dispatcher.Invoke(() => BtnUpdateTop.Content = $"{pct:F0}%"),
                            beforeInstallLaunch: async () =>
                            {
                                await Dispatcher.InvokeAsync(() =>
                                {
                                    BtnUpdateTop.Content = "Đang lưu sheet…";
                                });
                                await FlushAndSaveWhiteboardAsync("pre_update_install", 6000);
                                NotebookBackupService.Instance.MarkCleanExit("update", pendingUpdateRestore: true);
                                await Dispatcher.InvokeAsync(() =>
                                {
                                    _allowCloseNow = true;
                                });
                            });
                        if (!ok)
                        {
                            _allowCloseNow = false;
                            NotebookBackupService.Instance.MarkSessionStarted();
                            _availableUpdate = null;
                        }
                    }
                }
                else
                {
                    MinNoteDialog.ShowAlert(this, $"MinNote đang ở phiên bản mới nhất: v{GitHubUpdateService.Instance.CurrentVersion}!", "Kiểm tra cập nhật", MinNoteDialogTone.Success);
                }
            }
            catch (Exception ex)
            {
                MinNoteDialog.ShowAlert(this, $"Lỗi kiểm tra cập nhật: {ex.Message}", "Lỗi cập nhật", MinNoteDialogTone.Warning);
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

        private bool ShowUpdatePromptDialog(UpdateInfo update)
        {
            string cleanNotes = FormatReleaseNotesForDialog(update.ReleaseNotes);
            string sizeLabel = update.FileSize > 0
                ? $" • {update.FileSize / (1024.0 * 1024.0):F1} MB"
                : "";

            double maxWinHeight = Math.Max(360, Math.Min(500, SystemParameters.WorkArea.Height - 96));
            double scrollMaxH = Math.Max(150, maxWinHeight - 195);

            var dlg = new Window
            {
                Owner = this,
                Title = "Cập nhật MinNote",
                Width = 540,
                MaxHeight = maxWinHeight,
                SizeToContent = SizeToContent.Height,
                ResizeMode = ResizeMode.NoResize,
                WindowStartupLocation = WindowStartupLocation.CenterOwner,
                WindowStyle = WindowStyle.None,
                AllowsTransparency = true,
                Background = System.Windows.Media.Brushes.Transparent,
                ShowInTaskbar = false,
                Style = null
            };

            bool accepted = false;

            var rootBorder = new System.Windows.Controls.Border
            {
                Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(15, 23, 42)),
                BorderBrush = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(51, 65, 85)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(14),
                Margin = new Thickness(6)
            };

            var layout = new System.Windows.Controls.Grid();
            layout.RowDefinitions.Add(new System.Windows.Controls.RowDefinition { Height = GridLength.Auto });
            layout.RowDefinitions.Add(new System.Windows.Controls.RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            layout.RowDefinitions.Add(new System.Windows.Controls.RowDefinition { Height = GridLength.Auto });

            // Header (draggable)
            var header = new System.Windows.Controls.Border
            {
                Padding = new Thickness(20, 16, 16, 14),
                BorderBrush = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(30, 41, 59)),
                BorderThickness = new Thickness(0, 0, 0, 1),
                Background = System.Windows.Media.Brushes.Transparent
            };
            header.MouseLeftButtonDown += (_, args) =>
            {
                if (args.ButtonState == MouseButtonState.Pressed)
                {
                    try { dlg.DragMove(); } catch { }
                }
            };

            var headerGrid = new System.Windows.Controls.Grid();
            headerGrid.ColumnDefinitions.Add(new System.Windows.Controls.ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            headerGrid.ColumnDefinitions.Add(new System.Windows.Controls.ColumnDefinition { Width = GridLength.Auto });

            var titleStack = new System.Windows.Controls.StackPanel();
            var titleRow = new System.Windows.Controls.StackPanel { Orientation = System.Windows.Controls.Orientation.Horizontal };
            titleRow.Children.Add(new System.Windows.Controls.TextBlock
            {
                Text = "Cập nhật MinNote",
                FontSize = 16,
                FontWeight = FontWeights.SemiBold,
                Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(248, 250, 252)),
                VerticalAlignment = VerticalAlignment.Center
            });
            var badge = new System.Windows.Controls.Border
            {
                Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(37, 99, 235)),
                CornerRadius = new CornerRadius(999),
                Padding = new Thickness(9, 2, 9, 3),
                Margin = new Thickness(10, 0, 0, 0),
                VerticalAlignment = VerticalAlignment.Center,
                Child = new System.Windows.Controls.TextBlock
                {
                    Text = $"v{update.Version}",
                    FontSize = 11.5,
                    FontWeight = FontWeights.Bold,
                    Foreground = System.Windows.Media.Brushes.White
                }
            };
            titleRow.Children.Add(badge);
            titleStack.Children.Add(titleRow);
            titleStack.Children.Add(new System.Windows.Controls.TextBlock
            {
                Text = $"Phiên bản hiện tại: v{GitHubUpdateService.Instance.CurrentVersion} → v{update.Version}{sizeLabel}",
                FontSize = 12,
                Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(148, 163, 184)),
                Margin = new Thickness(0, 4, 0, 0)
            });
            System.Windows.Controls.Grid.SetColumn(titleStack, 0);
            headerGrid.Children.Add(titleStack);

            var btnClose = BuildUpdateDialogButton(
                "✕",
                System.Windows.Media.Color.FromRgb(30, 41, 59),
                System.Windows.Media.Color.FromRgb(51, 65, 85),
                System.Windows.Media.Color.FromRgb(203, 213, 225),
                width: 30,
                height: 30);
            btnClose.IsCancel = true;
            btnClose.VerticalAlignment = VerticalAlignment.Top;
            btnClose.Click += (_, _) => dlg.DialogResult = false;
            System.Windows.Controls.Grid.SetColumn(btnClose, 1);
            headerGrid.Children.Add(btnClose);
            header.Child = headerGrid;
            System.Windows.Controls.Grid.SetRow(header, 0);
            layout.Children.Add(header);

            // Scrollable notes body (strictly capped so footer buttons NEVER leave viewport!)
            var notesBox = new System.Windows.Controls.TextBlock
            {
                Text = string.IsNullOrWhiteSpace(cleanNotes)
                    ? "Bản cập nhật mới đã sẵn sàng để tải và cài đặt tự động."
                    : cleanNotes,
                FontSize = 13,
                LineHeight = 20,
                Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(226, 232, 240)),
                TextWrapping = TextWrapping.Wrap,
                Padding = new Thickness(20, 14, 20, 14)
            };
            var scroll = new System.Windows.Controls.ScrollViewer
            {
                MaxHeight = scrollMaxH,
                VerticalScrollBarVisibility = System.Windows.Controls.ScrollBarVisibility.Auto,
                HorizontalScrollBarVisibility = System.Windows.Controls.ScrollBarVisibility.Disabled,
                Content = notesBox
            };
            System.Windows.Controls.Grid.SetRow(scroll, 1);
            layout.Children.Add(scroll);

            // Pinned footer buttons
            var footer = new System.Windows.Controls.Border
            {
                Padding = new Thickness(20, 12, 20, 16),
                BorderBrush = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(30, 41, 59)),
                BorderThickness = new Thickness(0, 1, 0, 0),
                Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(11, 18, 32)),
                CornerRadius = new CornerRadius(0, 0, 13, 13)
            };
            var footerGrid = new System.Windows.Controls.Grid();
            footerGrid.ColumnDefinitions.Add(new System.Windows.Controls.ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            footerGrid.ColumnDefinitions.Add(new System.Windows.Controls.ColumnDefinition { Width = GridLength.Auto });

            var hintTxt = new System.Windows.Controls.TextBlock
            {
                Text = "Dữ liệu bảng viết sẽ tự động sao lưu trước khi cài.",
                FontSize = 11.5,
                Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(148, 163, 184)),
                VerticalAlignment = VerticalAlignment.Center,
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 0, 12, 0)
            };
            System.Windows.Controls.Grid.SetColumn(hintTxt, 0);
            footerGrid.Children.Add(hintTxt);

            var btnRow = new System.Windows.Controls.StackPanel { Orientation = System.Windows.Controls.Orientation.Horizontal };
            var btnLater = BuildUpdateDialogButton(
                "Để sau",
                System.Windows.Media.Color.FromRgb(30, 41, 59),
                System.Windows.Media.Color.FromRgb(51, 65, 85),
                System.Windows.Media.Color.FromRgb(226, 232, 240),
                minWidth: 88,
                height: 36);
            btnLater.IsCancel = true;
            btnLater.Margin = new Thickness(0, 0, 8, 0);
            btnLater.Click += (_, _) => dlg.DialogResult = false;

            var btnInstall = BuildUpdateDialogButton(
                "Cập nhật ngay",
                System.Windows.Media.Color.FromRgb(37, 99, 235),
                System.Windows.Media.Color.FromRgb(29, 78, 216),
                System.Windows.Media.Colors.White,
                minWidth: 132,
                height: 36);
            btnInstall.IsDefault = true;
            btnInstall.Click += (_, _) =>
            {
                accepted = true;
                dlg.DialogResult = true;
            };

            btnRow.Children.Add(btnLater);
            btnRow.Children.Add(btnInstall);
            System.Windows.Controls.Grid.SetColumn(btnRow, 1);
            footerGrid.Children.Add(btnRow);
            footer.Child = footerGrid;
            System.Windows.Controls.Grid.SetRow(footer, 2);
            layout.Children.Add(footer);

            rootBorder.Child = layout;
            dlg.Content = rootBorder;

            bool? res = dlg.ShowDialog();
            return accepted || res == true;
        }

        private static System.Windows.Controls.Button BuildUpdateDialogButton(
            string text,
            System.Windows.Media.Color normalBg,
            System.Windows.Media.Color hoverBg,
            System.Windows.Media.Color fg,
            double? width = null,
            double? minWidth = null,
            double height = 34)
        {
            var normalBrush = new System.Windows.Media.SolidColorBrush(normalBg);
            var hoverBrush = new System.Windows.Media.SolidColorBrush(hoverBg);
            var fgBrush = new System.Windows.Media.SolidColorBrush(fg);

            var borderFactory = new FrameworkElementFactory(typeof(System.Windows.Controls.Border));
            borderFactory.Name = "bd";
            borderFactory.SetValue(System.Windows.Controls.Border.BackgroundProperty, normalBrush);
            borderFactory.SetValue(System.Windows.Controls.Border.CornerRadiusProperty, new CornerRadius(8));
            borderFactory.SetValue(System.Windows.Controls.Border.PaddingProperty, width.HasValue ? new Thickness(0) : new Thickness(14, 0, 14, 0));

            var cp = new FrameworkElementFactory(typeof(System.Windows.Controls.ContentPresenter));
            cp.SetValue(HorizontalAlignmentProperty, HorizontalAlignment.Center);
            cp.SetValue(VerticalAlignmentProperty, VerticalAlignment.Center);
            borderFactory.AppendChild(cp);

            var tpl = new System.Windows.Controls.ControlTemplate(typeof(System.Windows.Controls.Button))
            {
                VisualTree = borderFactory
            };
            var hoverTrigger = new Trigger { Property = UIElement.IsMouseOverProperty, Value = true };
            hoverTrigger.Setters.Add(new Setter(System.Windows.Controls.Border.BackgroundProperty, hoverBrush, "bd"));
            tpl.Triggers.Add(hoverTrigger);

            var btn = new System.Windows.Controls.Button
            {
                Content = text,
                Height = height,
                Foreground = fgBrush,
                FontSize = 13,
                FontWeight = FontWeights.SemiBold,
                Cursor = Cursors.Hand,
                Style = null,
                Template = tpl
            };
            if (width.HasValue) btn.Width = width.Value;
            if (minWidth.HasValue) btn.MinWidth = minWidth.Value;
            return btn;
        }

        private static string FormatReleaseNotesForDialog(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "";
            string s = raw.Replace("\r\n", "\n");
            s = System.Text.RegularExpressions.Regex.Replace(s, @"<!--[\s\S]*?-->", "");
            s = System.Text.RegularExpressions.Regex.Replace(s, @"^\s*#{1,6}\s*", "", System.Text.RegularExpressions.RegexOptions.Multiline);
            s = s.Replace("**", "").Replace("`", "");
            s = System.Text.RegularExpressions.Regex.Replace(s, @"\n{3,}", "\n\n");
            return s.Trim();
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
                MinNoteDialog.ShowAlert(this, state == GateState.Checking ? "Đang kiểm tra bản quyền, thử lại sau giây lát." : reason,
                    "Sơ đồ tư duy", MinNoteDialogTone.Info);
                return;
            }
            ExecuteScriptSafe("if (typeof toggleMindMapStudio === 'function') toggleMindMapStudio();");
        }

#if !DEBUG
        private static bool IsBlockedDevToolsShortcut(KeyEventArgs e)
        {
            Key key = e.Key == Key.System ? e.SystemKey : e.Key;
            ModifierKeys mods = Keyboard.Modifiers;
            if (key == Key.F12) return true;
            if (mods == (ModifierKeys.Control | ModifierKeys.Shift) && (key == Key.I || key == Key.J || key == Key.C))
                return true;
            if (mods == ModifierKeys.Control && key == Key.U)
                return true;
            return false;
        }
#endif

        private void MainWindow_PreviewKeyDown(object sender, KeyEventArgs e)
        {
#if !DEBUG
            if (IsBlockedDevToolsShortcut(e))
            {
                e.Handled = true;
                return;
            }
#endif
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
            var items = await MatrixExamSyncService.Instance.LoadAllQuestionsForLegacyBankAsync(2000);
            if (items.Count == 0) return;

            var questions = items.Select((q, idx) => new Dictionary<string, object?>
            {
                ["id"] = q.Id.ToString(),
                ["code"] = string.IsNullOrWhiteSpace(q.Code) ? $"Câu {idx + 1}" : q.Code,
                ["subject"] = string.IsNullOrWhiteSpace(q.Subject) ? "Toán học" : q.Subject,
                ["grade"] = q.Grade > 0 ? q.Grade : 12,
                ["topic"] = string.IsNullOrWhiteSpace(q.Topic) ? "Tổng hợp" : q.Topic,
                ["level"] = string.IsNullOrWhiteSpace(q.Level) ? "Thông hiểu" : q.Level,
                ["qtype"] = q.Qtype,
                ["content"] = q.Content,
                ["options"] = q.Options,
                ["correctAnswer"] = q.CorrectAnswer,
                ["explanation"] = q.Explanation,
                ["tikzCode"] = q.TikzCode,
                ["images"] = q.Images,
                ["resolvedImages"] = q.ResolvedImages,
                ["inlineImages"] = q.InlineImages,
                ["source"] = q.Source,
                ["sourceLabel"] = q.SourceLabel
            }).ToList();

            var grouped = questions
                .GroupBy(q => (
                    Grade: q["grade"] is int gi && gi > 0 ? gi : 12,
                    Topic: q["topic"]?.ToString() ?? "Tổng hợp"))
                .OrderByDescending(g => g.Key.Grade)
                .ThenByDescending(g => g.Count())
                .Select(g =>
                {
                    string firstSubject = g.Select(x => x["subject"]?.ToString()).FirstOrDefault(s => !string.IsNullOrWhiteSpace(s)) ?? "Toán học";
                    string topicKey = $"{g.Key.Grade}|{g.Key.Topic.Trim().ToLowerInvariant()}";
                    string stableHash = Convert.ToHexStringLower(
                        System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(topicKey)))[..8];
                    return new Dictionary<string, object?>
                    {
                        ["id"] = $"exam_sqlite_{g.Key.Grade}_{stableHash}",
                        ["title"] = $"Lớp {g.Key.Grade} • {g.Key.Topic}",
                        ["source"] = $"Kho SQLite MatrixExamAI ({g.Count()} câu)",
                        ["subject"] = firstSubject,
                        ["grade"] = g.Key.Grade,
                        ["questions"] = g.ToList()
                    };
                }).ToList();

            string jsonExams = JsonSerializer.Serialize(grouped);
            await Dispatcher.InvokeAsync(async () =>
            {
                if (WvWhiteboard?.CoreWebView2 == null) return;
                await WvWhiteboard.CoreWebView2.ExecuteScriptAsync($"if (typeof window.receiveQuestionBankData === 'function') window.receiveQuestionBankData({jsonExams});");
            });
        }
    }
}