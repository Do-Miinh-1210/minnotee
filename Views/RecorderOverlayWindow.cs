using System;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Effects;
using System.Windows.Shapes;
using System.Windows.Threading;
using MinNote.Services;

namespace MinNote.Views
{
    /// <summary>
    /// Manages two tiny native WPF overlay windows during screen recording:
    /// 1. FrameWindow (click-through WS_EX_TRANSPARENT): thin red/amber border strictly OUTSIDE capture box.
    /// 2. PillWindow (compact icon-only floating pill, draggable anywhere): timer + Pause + Stop + Minimize.
    /// BOTH windows apply Win32 SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE = 0x11) so they are
    /// 100% INVISIBLE inside the recorded video while staying crisp and interactive on screen!
    /// </summary>
    public sealed class RecorderOverlayController : IDisposable
    {
        private const uint WDA_EXCLUDEFROMCAPTURE = 0x00000011;
        private const int GWL_EXSTYLE = -20;
        private const int WS_EX_TRANSPARENT = 0x00000020;
        private const int WS_EX_TOOLWINDOW = 0x00000080;
        private const int WS_EX_NOACTIVATE = 0x08000000;

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetWindowDisplayAffinity(IntPtr hWnd, uint dwAffinity);

        [DllImport("user32.dll")]
        private static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll")]
        private static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

        private readonly Window _owner;
        private Window? _frameWin;
        private Rectangle? _frameRect;
        private Window? _pillWin;
        private TextBlock? _timeText;
        private Ellipse? _recDot;
        private Button? _pauseBtn;
        private Path? _pauseIcon;
        private StackPanel? _actionsPanel;
        private DispatcherTimer? _timer;
        private bool _minimized;
        private bool _paused;
        private bool _blinkState = true;
        private bool _disposed;

        public event Action? PauseClicked;
        public event Action? StopClicked;

        public RecorderOverlayController(Window owner)
        {
            _owner = owner;
        }

        /// <summary>
        /// Shows the capture-excluded border and icon-only control pill around the given screen-space DIP rectangle.
        /// </summary>
        public void Show(Rect captureRectDip)
        {
            Close();
            _minimized = false;
            _paused = false;

            // 1. Click-through recording border strictly OUTSIDE captureRectDip (3px padding)
            const double pad = 3.0;
            _frameRect = new Rectangle
            {
                Stroke = new SolidColorBrush(Color.FromRgb(239, 68, 68)),
                StrokeThickness = 2.2,
                RadiusX = 3,
                RadiusY = 3,
                Fill = Brushes.Transparent,
                IsHitTestVisible = false
            };

            _frameWin = new Window
            {
                WindowStyle = WindowStyle.None,
                AllowsTransparency = true,
                Background = Brushes.Transparent,
                ShowInTaskbar = false,
                Topmost = true,
                ShowActivated = false,
                ResizeMode = ResizeMode.NoResize,
                IsHitTestVisible = false,
                Owner = _owner,
                Left = captureRectDip.Left - pad,
                Top = captureRectDip.Top - pad,
                Width = captureRectDip.Width + pad * 2,
                Height = captureRectDip.Height + pad * 2,
                Content = _frameRect
            };
            _frameWin.SourceInitialized += (_, _) =>
            {
                IntPtr hwnd = new WindowInteropHelper(_frameWin).Handle;
                int ex = GetWindowLong(hwnd, GWL_EXSTYLE);
                SetWindowLong(hwnd, GWL_EXSTYLE, ex | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE);
                SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
            };
            _frameWin.Show();

            // 2. Ultra-clean icon-only floating control pill (NO text clutter!)
            BuildPillWindow(captureRectDip);

            _timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(250) };
            _timer.Tick += OnTimerTick;
            _timer.Start();
        }

        private void BuildPillWindow(Rect captureRectDip)
        {
            var rootBorder = new Border
            {
                CornerRadius = new CornerRadius(999),
                Background = new SolidColorBrush(Color.FromArgb(236, 24, 24, 34)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(50, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(10, 5, 6, 5),
                Effect = new DropShadowEffect
                {
                    Color = Colors.Black,
                    Opacity = 0.38,
                    BlurRadius = 16,
                    ShadowDepth = 4
                }
            };

            var row = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center
            };

            // Drag grip dots
            var grip = new TextBlock
            {
                Text = "⋮⋮",
                Foreground = new SolidColorBrush(Color.FromArgb(145, 255, 255, 255)),
                FontSize = 12,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 7, 0),
                Cursor = Cursors.SizeAll,
                ToolTip = "Kéo để di chuyển thanh quay (ẩn khỏi video)"
            };
            row.Children.Add(grip);

            // Live status dot
            _recDot = new Ellipse
            {
                Width = 8,
                Height = 8,
                Fill = new SolidColorBrush(Color.FromRgb(239, 68, 68)),
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 6, 0)
            };
            row.Children.Add(_recDot);

            // Compact monospace timer
            _timeText = new TextBlock
            {
                Text = "00:00",
                Foreground = Brushes.White,
                FontFamily = new FontFamily("Segoe UI"),
                FontSize = 12.5,
                FontWeight = FontWeights.SemiBold,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 6, 0)
            };
            row.Children.Add(_timeText);

            // Icon-only actions panel (hidden when minimized)
            _actionsPanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center
            };

            // Pause / Resume icon button
            _pauseIcon = MakeSvgPath("M6 5h4v14H6zM14 5h4v14h-4z", Brushes.White, 12);
            _pauseBtn = MakeIconButton(_pauseIcon, Color.FromArgb(30, 255, 255, 255), Color.FromArgb(60, 255, 255, 255), "Tạm dừng quay");
            _pauseBtn.Click += (_, _) => PauseClicked?.Invoke();
            _actionsPanel.Children.Add(_pauseBtn);

            // Stop icon button (crisp red square on white pill circle)
            var stopIcon = MakeSvgPath("M6 6h12v12H6z", new SolidColorBrush(Color.FromRgb(220, 38, 38)), 11);
            var stopBtn = MakeIconButton(stopIcon, Color.FromRgb(255, 255, 255), Color.FromRgb(254, 226, 226), "Dừng quay & lưu video");
            stopBtn.Margin = new Thickness(4, 0, 0, 0);
            stopBtn.Click += (_, _) => StopClicked?.Invoke();
            _actionsPanel.Children.Add(stopBtn);

            // Minimize icon button
            var minIcon = MakeSvgPath("M5 12h14", new SolidColorBrush(Color.FromArgb(220, 255, 255, 255)), 12, isStroke: true);
            var minBtn = MakeIconButton(minIcon, Colors.Transparent, Color.FromArgb(40, 255, 255, 255), "Thu nhỏ thành chấm thời gian");
            minBtn.Margin = new Thickness(3, 0, 0, 0);
            minBtn.Click += (_, _) => SetMinimized(true);
            _actionsPanel.Children.Add(minBtn);

            row.Children.Add(_actionsPanel);
            rootBorder.Child = row;

            // Wrap with transparent margin so drop-shadow isn't clipped
            var container = new Grid { Background = Brushes.Transparent, Margin = new Thickness(14) };
            container.Children.Add(rootBorder);

            // Position cleanly above the recording frame (or inside top if frame touches top of virtual screen)
            double pillW = 196;
            double pillH = 66;
            double minX = SystemParameters.VirtualScreenLeft + 4;
            double minY = SystemParameters.VirtualScreenTop + 4;
            double maxX = SystemParameters.VirtualScreenLeft + SystemParameters.VirtualScreenWidth - pillW - 4;
            double maxY = SystemParameters.VirtualScreenTop + SystemParameters.VirtualScreenHeight - pillH - 4;
            double left = captureRectDip.Left + (captureRectDip.Width - pillW) / 2.0;
            double top = (captureRectDip.Top - minY) >= 54 ? captureRectDip.Top - 52 : captureRectDip.Top + 4;
            left = Math.Clamp(left, minX, Math.Max(minX, maxX));
            top = Math.Clamp(top, minY, Math.Max(minY, maxY));

            _pillWin = new Window
            {
                WindowStyle = WindowStyle.None,
                AllowsTransparency = true,
                Background = Brushes.Transparent,
                ShowInTaskbar = false,
                Topmost = true,
                ShowActivated = false,
                ResizeMode = ResizeMode.NoResize,
                SizeToContent = SizeToContent.WidthAndHeight,
                Owner = _owner,
                Left = left,
                Top = top,
                Content = container
            };

            _pillWin.SourceInitialized += (_, _) =>
            {
                IntPtr hwnd = new WindowInteropHelper(_pillWin).Handle;
                int ex = GetWindowLong(hwnd, GWL_EXSTYLE);
                SetWindowLong(hwnd, GWL_EXSTYLE, ex | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE);
                SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
            };

            // Drag pill freely; clicking while minimized restores it
            Point dragStart = default;
            bool dragging = false;
            bool moved = false;

            rootBorder.MouseLeftButtonDown += (s, e) =>
            {
                if (FindAncestor<Button>(e.OriginalSource as DependencyObject) != null) return;
                dragging = true;
                moved = false;
                dragStart = e.GetPosition(_pillWin);
                rootBorder.CaptureMouse();
                e.Handled = true;
            };
            rootBorder.MouseMove += (s, e) =>
            {
                if (!dragging || _pillWin == null) return;
                Point cur = e.GetPosition(_pillWin);
                double dx = cur.X - dragStart.X;
                double dy = cur.Y - dragStart.Y;
                if (!moved && Math.Abs(dx) + Math.Abs(dy) < 4) return;
                moved = true;
                _pillWin.Left += dx;
                _pillWin.Top += dy;
            };
            rootBorder.MouseLeftButtonUp += (s, e) =>
            {
                if (!dragging) return;
                dragging = false;
                rootBorder.ReleaseMouseCapture();
                if (!moved && _minimized)
                {
                    SetMinimized(false);
                }
                e.Handled = true;
            };

            _pillWin.Show();
        }

        public void SetPaused(bool paused)
        {
            _paused = paused;
            if (_frameRect != null)
            {
                _frameRect.Stroke = new SolidColorBrush(paused ? Color.FromRgb(245, 158, 11) : Color.FromRgb(239, 68, 68));
                _frameRect.StrokeDashArray = paused ? new DoubleCollection { 6, 4 } : null;
            }
            if (_recDot != null)
            {
                _recDot.Fill = new SolidColorBrush(paused ? Color.FromRgb(245, 158, 11) : Color.FromRgb(239, 68, 68));
                _recDot.Opacity = 1.0;
            }
            if (_pauseIcon != null && _pauseBtn != null)
            {
                _pauseIcon.Data = Geometry.Parse(paused ? "M7 5l12 7-12 7z" : "M6 5h4v14H6zM14 5h4v14h-4z");
                _pauseBtn.ToolTip = paused ? "Tiếp tục quay" : "Tạm dừng quay";
            }
        }

        private void SetMinimized(bool mini)
        {
            _minimized = mini;
            if (_actionsPanel != null)
            {
                _actionsPanel.Visibility = mini ? Visibility.Collapsed : Visibility.Visible;
            }
            if (_timeText != null)
            {
                _timeText.Margin = mini ? new Thickness(0, 0, 4, 0) : new Thickness(0, 0, 6, 0);
            }
        }

        private void OnTimerTick(object? sender, EventArgs e)
        {
            if (_disposed) return;
            long ms = NativeScreenRecorder.Instance.ElapsedMs;
            int totalSec = (int)Math.Max(0, ms / 1000);
            if (_timeText != null)
            {
                _timeText.Text = $"{totalSec / 60:00}:{totalSec % 60:00}";
            }
            if (_recDot != null && !_paused)
            {
                _blinkState = !_blinkState;
                _recDot.Opacity = _blinkState ? 1.0 : 0.35;
            }
        }

        private static Path MakeSvgPath(string data, Brush brush, double size, bool isStroke = false)
        {
            var p = new Path
            {
                Data = Geometry.Parse(data),
                Width = size,
                Height = size,
                Stretch = Stretch.Uniform,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            if (isStroke)
            {
                p.Stroke = brush;
                p.StrokeThickness = 2.2;
                p.StrokeStartLineCap = PenLineCap.Round;
                p.StrokeEndLineCap = PenLineCap.Round;
            }
            else
            {
                p.Fill = brush;
            }
            return p;
        }

        private static Button MakeIconButton(UIElement content, Color bg, Color hoverBg, string tooltip)
        {
            var bgBrush = new SolidColorBrush(bg);
            var hoverBrush = new SolidColorBrush(hoverBg);

            var borderFactory = new FrameworkElementFactory(typeof(Border));
            borderFactory.Name = "bd";
            borderFactory.SetValue(Border.CornerRadiusProperty, new CornerRadius(999));
            borderFactory.SetValue(Border.BackgroundProperty, bgBrush);
            borderFactory.SetValue(Border.WidthProperty, 26.0);
            borderFactory.SetValue(Border.HeightProperty, 26.0);

            var cpFactory = new FrameworkElementFactory(typeof(ContentPresenter));
            cpFactory.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            cpFactory.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
            borderFactory.AppendChild(cpFactory);

            var tpl = new ControlTemplate(typeof(Button)) { VisualTree = borderFactory };
            var hoverTrigger = new Trigger { Property = UIElement.IsMouseOverProperty, Value = true };
            hoverTrigger.Setters.Add(new Setter(Border.BackgroundProperty, hoverBrush, "bd"));
            tpl.Triggers.Add(hoverTrigger);

            return new Button
            {
                Content = content,
                Template = tpl,
                Cursor = Cursors.Hand,
                ToolTip = tooltip,
                Focusable = false,
                Width = 26,
                Height = 26
            };
        }

        private static T? FindAncestor<T>(DependencyObject? current) where T : DependencyObject
        {
            while (current != null)
            {
                if (current is T match) return match;
                current = VisualTreeHelper.GetParent(current);
            }
            return null;
        }

        public void Close()
        {
            if (_timer != null)
            {
                _timer.Stop();
                _timer.Tick -= OnTimerTick;
                _timer = null;
            }
            try { _pillWin?.Close(); } catch { }
            try { _frameWin?.Close(); } catch { }
            _pillWin = null;
            _frameWin = null;
            _frameRect = null;
            _timeText = null;
            _recDot = null;
            _pauseBtn = null;
            _pauseIcon = null;
            _actionsPanel = null;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            Close();
        }
    }
}
