using System;
using System.Linq;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using Wpf.Ui.Controls;

namespace MinNote.Views
{
    public enum MinNoteDialogMode
    {
        Alert,
        Confirm,
        Prompt
    }

    public enum MinNoteDialogTone
    {
        Info,
        Success,
        Warning,
        Danger,
        Question
    }

    public partial class MinNoteDialog : Window
    {
        private readonly MinNoteDialogMode _mode;

        public bool Confirmed { get; private set; }
        public string? PromptValue { get; private set; }

        public MinNoteDialog(
            MinNoteDialogMode mode,
            string message,
            string title,
            MinNoteDialogTone tone,
            string okText,
            string cancelText,
            string defaultPromptValue = "")
        {
            InitializeComponent();
            _mode = mode;

            TxtTitle.Text = string.IsNullOrWhiteSpace(title) ? "MinNote" : title;
            Title = TxtTitle.Text;
            TxtMessage.Text = message ?? string.Empty;
            BtnPrimary.Content = string.IsNullOrWhiteSpace(okText)
                ? (mode == MinNoteDialogMode.Alert ? "Đã hiểu" : "Xác nhận")
                : okText;
            BtnCancel.Content = string.IsNullOrWhiteSpace(cancelText) ? "Hủy" : cancelText;

            if (mode == MinNoteDialogMode.Alert)
            {
                BtnCancel.Visibility = Visibility.Collapsed;
            }
            else if (mode == MinNoteDialogMode.Prompt)
            {
                TxtPromptInput.Visibility = Visibility.Visible;
                TxtPromptInput.Text = defaultPromptValue ?? string.Empty;
                Loaded += (_, _) =>
                {
                    TxtPromptInput.Focus();
                    TxtPromptInput.SelectAll();
                };
            }

            ApplyTone(tone);
        }

        private void ApplyTone(MinNoteDialogTone tone)
        {
            switch (tone)
            {
                case MinNoteDialogTone.Danger:
                    IconBadge.Background = new SolidColorBrush(Color.FromRgb(69, 10, 10));
                    IconBadge.BorderBrush = new SolidColorBrush(Color.FromRgb(185, 28, 28));
                    IconGlyph.Foreground = new SolidColorBrush(Color.FromRgb(252, 165, 165));
                    IconGlyph.Symbol = SymbolRegular.ErrorCircle24;
                    BtnPrimary.Background = new SolidColorBrush(Color.FromRgb(220, 38, 38));
                    BtnPrimary.BorderBrush = new SolidColorBrush(Color.FromRgb(239, 68, 68));
                    break;
                case MinNoteDialogTone.Warning:
                    IconBadge.Background = new SolidColorBrush(Color.FromRgb(69, 26, 3));
                    IconBadge.BorderBrush = new SolidColorBrush(Color.FromRgb(180, 83, 9));
                    IconGlyph.Foreground = new SolidColorBrush(Color.FromRgb(252, 211, 77));
                    IconGlyph.Symbol = SymbolRegular.Warning24;
                    BtnPrimary.Background = new SolidColorBrush(Color.FromRgb(217, 119, 6));
                    BtnPrimary.BorderBrush = new SolidColorBrush(Color.FromRgb(245, 158, 11));
                    break;
                case MinNoteDialogTone.Success:
                    IconBadge.Background = new SolidColorBrush(Color.FromRgb(6, 78, 59));
                    IconBadge.BorderBrush = new SolidColorBrush(Color.FromRgb(5, 150, 105));
                    IconGlyph.Foreground = new SolidColorBrush(Color.FromRgb(110, 231, 183));
                    IconGlyph.Symbol = SymbolRegular.CheckmarkCircle24;
                    break;
                case MinNoteDialogTone.Question:
                    IconBadge.Background = new SolidColorBrush(Color.FromRgb(30, 58, 138));
                    IconBadge.BorderBrush = new SolidColorBrush(Color.FromRgb(59, 130, 246));
                    IconGlyph.Foreground = new SolidColorBrush(Color.FromRgb(147, 197, 253));
                    IconGlyph.Symbol = SymbolRegular.QuestionCircle24;
                    break;
                default:
                    IconBadge.Background = new SolidColorBrush(Color.FromRgb(30, 58, 138));
                    IconBadge.BorderBrush = new SolidColorBrush(Color.FromRgb(59, 130, 246));
                    IconGlyph.Foreground = new SolidColorBrush(Color.FromRgb(147, 197, 253));
                    IconGlyph.Symbol = _mode == MinNoteDialogMode.Prompt ? SymbolRegular.Edit24 : SymbolRegular.Info24;
                    break;
            }
        }

        private void BtnPrimary_Click(object sender, RoutedEventArgs e)
        {
            Confirmed = true;
            if (_mode == MinNoteDialogMode.Prompt)
            {
                PromptValue = TxtPromptInput.Text;
            }
            DialogResult = true;
            Close();
        }

        private void BtnCancel_Click(object sender, RoutedEventArgs e)
        {
            Confirmed = false;
            PromptValue = null;
            DialogResult = false;
            Close();
        }

        private void Header_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (e.ButtonState == MouseButtonState.Pressed)
            {
                try { DragMove(); } catch { }
            }
        }

        private void Window_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Escape)
            {
                e.Handled = true;
                BtnCancel_Click(sender, e);
            }
            else if (e.Key == Key.Enter && _mode == MinNoteDialogMode.Prompt)
            {
                e.Handled = true;
                BtnPrimary_Click(sender, e);
            }
        }

        private static Window? ResolveOwner(Window? explicitOwner)
        {
            if (explicitOwner != null && explicitOwner.IsLoaded && explicitOwner.IsVisible)
                return explicitOwner;

            var app = Application.Current;
            if (app == null) return null;

            var active = app.Windows.OfType<Window>().FirstOrDefault(w => w.IsActive && w.IsVisible);
            if (active != null) return active;

            var main = app.MainWindow;
            if (main != null && main.IsLoaded && main.IsVisible)
                return main;

            return null;
        }

        private static T RunOnUi<T>(Func<T> action)
        {
            var disp = Application.Current?.Dispatcher;
            if (disp != null && !disp.CheckAccess())
            {
                return disp.Invoke(action);
            }
            return action();
        }

        public static void ShowAlert(
            Window? owner,
            string message,
            string title = "Thông báo",
            MinNoteDialogTone tone = MinNoteDialogTone.Info,
            string okText = "Đã hiểu")
        {
            RunOnUi(() =>
            {
                var dlg = new MinNoteDialog(MinNoteDialogMode.Alert, message, title, tone, okText, "Đóng");
                var resolved = ResolveOwner(owner);
                if (resolved != null && resolved != dlg)
                {
                    dlg.Owner = resolved;
                    dlg.WindowStartupLocation = WindowStartupLocation.CenterOwner;
                }
                else
                {
                    dlg.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                }
                dlg.ShowDialog();
                return true;
            });
        }

        public static bool ShowConfirm(
            Window? owner,
            string message,
            string title = "Xác nhận thao tác",
            MinNoteDialogTone tone = MinNoteDialogTone.Question,
            string okText = "Xác nhận",
            string cancelText = "Hủy")
        {
            return RunOnUi(() =>
            {
                var dlg = new MinNoteDialog(MinNoteDialogMode.Confirm, message, title, tone, okText, cancelText);
                var resolved = ResolveOwner(owner);
                if (resolved != null && resolved != dlg)
                {
                    dlg.Owner = resolved;
                    dlg.WindowStartupLocation = WindowStartupLocation.CenterOwner;
                }
                else
                {
                    dlg.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                }
                bool? res = dlg.ShowDialog();
                return res == true && dlg.Confirmed;
            });
        }

        public static string? ShowPrompt(
            Window? owner,
            string message,
            string defaultValue = "",
            string title = "Nhập thông tin",
            string okText = "Lưu",
            string cancelText = "Hủy")
        {
            return RunOnUi(() =>
            {
                var dlg = new MinNoteDialog(MinNoteDialogMode.Prompt, message, title, MinNoteDialogTone.Info, okText, cancelText, defaultValue);
                var resolved = ResolveOwner(owner);
                if (resolved != null && resolved != dlg)
                {
                    dlg.Owner = resolved;
                    dlg.WindowStartupLocation = WindowStartupLocation.CenterOwner;
                }
                else
                {
                    dlg.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                }
                bool? res = dlg.ShowDialog();
                return (res == true && dlg.Confirmed) ? dlg.PromptValue : null;
            });
        }
    }
}
