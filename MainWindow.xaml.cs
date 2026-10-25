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
        private readonly System.Windows.Threading.DispatcherTimer _licenseTimer = new() { Interval = TimeSpan.FromMinutes(10) };
        private WindowState _previousWindowState = WindowState.Normal;
        private WindowStyle _previousWindowStyle = WindowStyle.SingleBorderWindow;

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

            // Kích hoạt & đồng bộ bản quyền Cloud; bảng viết chỉ mở khi license đã ký có quyền "whiteboard"
            RunLockedMid.Text = HardwareInfoService.GetMachineId();
            OnLicense(SupabaseLicenseService.Instance.GetCurrentLicense());
            SupabaseLicenseService.Instance.LicenseChanged += (s, info) => Dispatcher.Invoke(() => OnLicense(info));
            _ = SyncLicenseAsync();
            _licenseTimer.Tick += async (s, e) => await SyncLicenseAsync();
            _licenseTimer.Start();

            Closing += (s, e) => Log($"Window Closing: Cancel={e.Cancel}");
            Closed += (s, e) => Log("Window Closed");

            // Khởi chạy ngầm WebView2 ngay từ constructor để loại bỏ hoàn toàn độ trễ
            _ = InitializeWhiteboardAsync();
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
        private const string BrowserArgs = "--disable-pinch --disable-features=PinchToZoom,Translate,OptimizationHints,MediaRouter --disable-background-networking --disable-component-update --disable-sync --disable-domain-reliability --disable-client-side-phishing-detection --disable-default-apps --no-default-browser-check --enable-gpu-rasterization --enable-zero-copy --disable-hang-monitor";

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

                WvWhiteboard.DefaultBackgroundColor = System.Drawing.Color.FromArgb(15, 23, 42);

                WvWhiteboard.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "minnote.app",
                    whiteboardDir,
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
                        WvWhiteboard.CoreWebView2.Settings.IsPinchZoomEnabled = false;
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
                        if (e.PermissionKind == CoreWebView2PermissionKind.ClipboardRead)
                        {
                            e.State = CoreWebView2PermissionState.Allow;
                        }
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

        private async void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string json = e.WebMessageAsJson;
                Log($"[WebMessage] {json}");
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
                }
            }
            catch (Exception ex)
            {
                Log($"WebMessage error: {ex.Message}");
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
                BtnUpdateTop.Content = "Đang kiểm tra…";
                var update = await GitHubUpdateService.Instance.CheckForUpdatesAsync();
                if (update != null)
                {
                    var res = MessageBox.Show(this,
                        $"Đã có phiên bản mới v{update.Version} trên GitHub!\n\nChi tiết:\n{update.ReleaseNotes}\n\nBạn có muốn tải và cài đặt ngay không?",
                        "Cập nhật MinNote",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Information);

                    if (res == System.Windows.MessageBoxResult.Yes)
                    {
                        BtnUpdateTop.Content = "Đang tải…";
                        await GitHubUpdateService.Instance.DownloadAndInstallUpdateAsync(update, pct =>
                        {
                            Dispatcher.Invoke(() => BtnUpdateTop.Content = $"{pct:F0}%");
                        });
                    }
                }
                else
                {
                    MessageBox.Show(this, "MinNote đang ở phiên bản mới nhất!", "Kiểm tra cập nhật", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, $"Lỗi kiểm tra cập nhật: {ex.Message}", "Lỗi", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
            finally
            {
                BtnUpdateTop.IsEnabled = true;
                BtnUpdateTop.Content = "Cập nhật";
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
            else if (e.Key == Key.M && (Keyboard.Modifiers & ModifierKeys.Control) == ModifierKeys.Control)
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