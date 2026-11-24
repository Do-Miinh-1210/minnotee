using System;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using Wpf.Ui.Controls;

namespace MinNote.Views
{
    public enum ExitDialogChoice
    {
        Cancel,
        SaveAndExit,
        DiscardAndExit
    }

    public partial class ExitConfirmDialog : Window
    {
        public ExitDialogChoice Choice { get; private set; } = ExitDialogChoice.Cancel;
        public bool DontAskAgainChecked => ChkDontAskAgain.IsChecked == true;

        public ExitConfirmDialog(
            bool isDirty,
            string docName,
            int tabCount,
            int sheetCount,
            string lastSavedText,
            bool showDontAskAgainCheckbox)
        {
            InitializeComponent();

            string safeName = string.IsNullOrWhiteSpace(docName) ? "Sổ chưa đặt tên" : docName;
            string tabNote = tabCount > 1 ? $", {tabCount} tab đang mở" : "";
            string sheetNote = sheetCount > 0 ? $"{sheetCount} sheet" : "1 sheet";

            if (isDirty)
            {
                Title = "Lưu thay đổi trước khi thoát?";
                TxtTitle.Text = "Lưu thay đổi trước khi thoát?";
                TxtSubtitle.Text = "Bạn có thay đổi chưa được lưu xuống ổ đĩa";
                TxtMessage.Text =
                    $"Sổ \"{safeName}\" ({sheetNote}{tabNote}) đang có thao tác mới chưa được lưu.\n\n" +
                    "• Bấm \"Lưu & Thoát\" để ghi toàn bộ nét vẽ, hình học và các sheet ra ổ đĩa an toàn.\n" +
                    "• Bấm \"Không lưu & Thoát\" nếu bạn vừa thao tác nhầm và muốn bỏ thay đổi chưa lưu.";

                IconBadge.Background = new SolidColorBrush(Color.FromRgb(120, 53, 15));
                IconGlyph.Foreground = new SolidColorBrush(Color.FromRgb(252, 211, 77));
                IconGlyph.Symbol = SymbolRegular.Warning24;

                BtnDiscard.Visibility = Visibility.Visible;
                BtnSaveAndExit.Content = "Lưu & Thoát";
                ChkDontAskAgain.Visibility = Visibility.Collapsed;
            }
            else
            {
                Title = "Xác nhận thoát MinNote";
                TxtTitle.Text = "Xác nhận thoát MinNote";
                TxtSubtitle.Text = "Tất cả sheet đang mở đều được bảo toàn";
                string timePart = string.IsNullOrWhiteSpace(lastSavedText) ? "" : $" ({lastSavedText})";
                TxtMessage.Text =
                    $"Mọi thay đổi trên \"{safeName}\" ({sheetNote}{tabNote}) đã được tự động lưu{timePart}.\n\n" +
                    "Bấm \"Lưu lại & Thoát\" để đồng bộ trạng thái sheet lần cuối và đóng ứng dụng an toàn.";

                IconBadge.Background = new SolidColorBrush(Color.FromRgb(30, 58, 138));
                IconGlyph.Foreground = new SolidColorBrush(Color.FromRgb(147, 197, 253));
                IconGlyph.Symbol = SymbolRegular.Save24;

                BtnDiscard.Visibility = Visibility.Collapsed;
                BtnSaveAndExit.Content = "Lưu lại & Thoát";
                ChkDontAskAgain.Visibility = showDontAskAgainCheckbox ? Visibility.Visible : Visibility.Collapsed;
            }
        }

        private void BtnSaveAndExit_Click(object sender, RoutedEventArgs e)
        {
            Choice = ExitDialogChoice.SaveAndExit;
            DialogResult = true;
            Close();
        }

        private void BtnDiscard_Click(object sender, RoutedEventArgs e)
        {
            Choice = ExitDialogChoice.DiscardAndExit;
            DialogResult = false;
            Close();
        }

        private void BtnCancel_Click(object sender, RoutedEventArgs e)
        {
            Choice = ExitDialogChoice.Cancel;
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
        }
    }
}
