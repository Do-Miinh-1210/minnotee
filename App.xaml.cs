using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace MinNote
{
    public partial class App : Application
    {
        private static Mutex? _mutex;
        private static bool _ownsMutex = false;
        private const string AppGuid = "Global\\MinNote_SingleInstance_Mutex_20261022";

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        private const int SW_RESTORE = 9;

        public static Task<CoreWebView2Environment>? PrewarmedEnvTask { get; private set; }

        private static void AppLog(string msg)
        {
            try
            {
                File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "minnote_debug.log"),
                    $"[{DateTime.Now:HH:mm:ss.fff}] [App] {msg}\n");
            }
            catch { }
        }

        protected override void OnStartup(StartupEventArgs e)
        {
            AppLog("OnStartup start");

            DispatcherUnhandledException += (s, args) =>
            {
                AppLog($"DispatcherUnhandledException: {args.Exception}");
                args.Handled = true;
            };

            AppDomain.CurrentDomain.UnhandledException += (s, args) =>
            {
                AppLog($"AppDomain.UnhandledException: {args.ExceptionObject}");
            };

            try
            {
                _mutex = new Mutex(true, AppGuid, out bool isNewInstance);
                _ownsMutex = isNewInstance;
                AppLog($"Mutex acquired: isNewInstance={isNewInstance}");

                if (!isNewInstance)
                {
                    // Bản thứ hai sẽ tranh hồ sơ WebView2 và dữ liệu bảng viết với bản đang chạy → luôn chỉ đưa bản cũ lên trước.
                    // Tìm theo tiêu đề cửa sổ để bắt cả khi bản cũ chạy qua "dotnet MinNote.dll" (tên tiến trình là dotnet).
                    try
                    {
                        int self = Environment.ProcessId;
                        var existing = Process.GetProcesses()
                            .FirstOrDefault(p => p.Id != self && p.MainWindowHandle != IntPtr.Zero
                                                 && p.MainWindowTitle.StartsWith("MinNote", StringComparison.Ordinal));
                        if (existing != null)
                        {
                            AppLog($"Found existing instance PID={existing.Id}, bringing to front and shutting down.");
                            ShowWindow(existing.MainWindowHandle, SW_RESTORE);
                            SetForegroundWindow(existing.MainWindowHandle);
                        }
                        else
                        {
                            AppLog("Another instance holds the mutex but has no window yet; exiting.");
                            MessageBox.Show("MinNote đang khởi động hoặc đang chạy ở một cửa sổ khác.", "MinNote",
                                MessageBoxButton.OK, MessageBoxImage.Information);
                        }
                    }
                    catch (Exception ex)
                    {
                        AppLog($"Mutex check exception: {ex.Message}");
                    }
                    Shutdown();
                    return;
                }
            }
            catch (Exception ex)
            {
                AppLog($"Mutex exception: {ex.Message}");
            }

            AppLog("Calling InitializeWebView2Loader");
            InitializeWebView2Loader();

            try
            {
                PrewarmedEnvTask = MinNote.MainWindow.CreateEnvironmentWithFallbackAsync();
            }
            catch (Exception ex)
            {
                AppLog($"PrewarmedEnvTask error: {ex.Message}");
            }

            AppLog("Calling base.OnStartup");
            base.OnStartup(e);

            AppLog("Creating MainWindow");
            try
            {
                var mainWin = new MainWindow();
                MainWindow = mainWin;
                AppLog("Showing MainWindow");
                mainWin.Show();
                AppLog("MainWindow shown successfully");
            }
            catch (Exception ex)
            {
                AppLog($"Error creating/showing MainWindow: {ex}");
            }
        }

        private static void InitializeWebView2Loader()
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string arch = Environment.Is64BitProcess ? "win-x64" : "win-x86";
                string[] searchPaths = new[]
                {
                    baseDir,
                    Path.Combine(baseDir, "runtimes", arch, "native"),
                    Path.Combine(baseDir, Environment.Is64BitProcess ? "x64" : "x86"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "MatrixExamAI Pro"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "MatrixExamAI Pro", "runtimes", arch, "native")
                };

                foreach (var path in searchPaths)
                {
                    if (File.Exists(Path.Combine(path, "WebView2Loader.dll")))
                    {
                        CoreWebView2Environment.SetLoaderDllFolderPath(path);
                        AppLog($"SetLoaderDllFolderPath: {path}");
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                AppLog($"InitializeWebView2Loader error: {ex.Message}");
            }
        }

        protected override void OnExit(ExitEventArgs e)
        {
            AppLog("OnExit start");
            try
            {
                if (_ownsMutex)
                {
                    _mutex?.ReleaseMutex();
                }
            }
            catch { }

            try
            {
                _mutex?.Dispose();
            }
            catch { }

            base.OnExit(e);
        }
    }
}
