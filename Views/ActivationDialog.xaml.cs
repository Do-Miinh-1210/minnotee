using System;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Wpf.Ui.Controls;
using MinNote.Services;

namespace MinNote.Views;

public partial class ActivationDialog : FluentWindow
{
    private readonly SupabaseLicenseService _licenseService;
    private readonly string _machineId;
    public string MachineIdText => TxtMachineId.Text;

    public ActivationDialog()
    {
        InitializeComponent();

        _licenseService = SupabaseLicenseService.Instance;
        _machineId = HardwareInfoService.GetMachineId();

        TxtMachineId.Text = _machineId;
        TxtHardwareDisplay.Text = HardwareInfoService.GetMachineDisplay();

        Loaded += ActivationDialog_Loaded;
    }

    private void ActivationDialog_Loaded(object sender, RoutedEventArgs e)
    {
        UpdateLicenseDisplay(_licenseService.GetCurrentLicense());
        UpdateVietQrImage();
    }

    private void UpdateLicenseDisplay(LicenseInfo info)
    {
        TxtBadgeStatus.Text = info.BadgeText;

        try
        {
            var brush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(info.BadgeColor));
            BadgeLicenseStatus.Background = new SolidColorBrush(Color.FromArgb(30, brush.Color.R, brush.Color.G, brush.Color.B));
            TxtBadgeStatus.Foreground = brush;
        }
        catch
        {
            BadgeLicenseStatus.Background = new SolidColorBrush(Color.FromArgb(30, 107, 114, 128));
            TxtBadgeStatus.Foreground = new SolidColorBrush(Color.FromRgb(107, 114, 128));
        }

        string owner = string.IsNullOrWhiteSpace(info.Name) ? "Chưa kích hoạt" : info.Name;
        string expiry = string.IsNullOrWhiteSpace(info.Expiry) ? "Chưa xác định" : info.Expiry;
        string tier = info.DisplayTier;

        TxtLicenseDetail.Text = $"Chủ sở hữu: {owner} • Gói: {tier} • Hạn dùng: {expiry}";
    }

    private async void UpdateVietQrImage()
    {
        try
        {
            string amount = "299000";
            string packageCode = "MINNOTE";
            if (CmbPricingPackage?.SelectedItem is ComboBoxItem item && item.Tag is string tagStr)
            {
                var parts = tagStr.Split('|');
                if (parts.Length >= 3)
                {
                    packageCode = parts[0].ToUpperInvariant();
                    amount = parts[2];
                }
            }

            var bmp = await SupabaseLicenseService.GetVietQrBitmapAsync(_machineId, packageCode, amount);
            if (bmp != null)
            {
                ImgVietQr.Source = bmp;
            }
        }
        catch { }
    }

    private void CmbPricingPackage_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (IsLoaded) UpdateVietQrImage();
    }

    private async void BtnRefreshStatus_Click(object sender, RoutedEventArgs e)
    {
        BtnRefreshStatus.IsEnabled = false;
        TxtBadgeStatus.Text = "ĐANG ĐỒNG BỘ...";

        try
        {
            var updated = await _licenseService.CheckLicenseAsync(forceOnline: true);
            UpdateLicenseDisplay(updated);

            if (updated.IsActive)
            {
                ShowNotify("Đồng bộ bản quyền thành công! MinNote đã được kích hoạt.", InfoBarSeverity.Success);
            }
            else
            {
                ShowNotify("Máy chủ báo: Chưa kích hoạt giấy phép cho Mã máy này. Vui lòng liên hệ Admin.", InfoBarSeverity.Warning);
            }
        }
        catch (Exception ex)
        {
            ShowNotify($"Lỗi kết nối máy chủ bản quyền: {ex.Message}", InfoBarSeverity.Error);
        }
        finally
        {
            BtnRefreshStatus.IsEnabled = true;
        }
    }

    private void BtnCopyMid_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            Clipboard.SetText(_machineId);
            ShowNotify($"Đã sao chép Mã máy: {_machineId} vào khay nhớ tạm!", InfoBarSeverity.Success);
        }
        catch (Exception ex)
        {
            ShowNotify($"Lỗi sao chép: {ex.Message}", InfoBarSeverity.Error);
        }
    }

    private void BtnContactZalo_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            Clipboard.SetText(_machineId);
            Process.Start(new ProcessStartInfo
            {
                FileName = "https://zalo.me/0339998261",
                UseShellExecute = true
            });
            ShowNotify($"Đã mở Zalo và tự động sao chép Mã máy {_machineId} để bạn gửi cho Admin!", InfoBarSeverity.Success);
        }
        catch (Exception ex)
        {
            ShowNotify($"Lỗi: {ex.Message}", InfoBarSeverity.Error);
        }
    }

    private void ShowNotify(string message, InfoBarSeverity severity)
    {
        InfoActivation.Message = message;
        InfoActivation.Severity = severity;
        InfoActivation.IsOpen = true;
    }

    private void BtnClose_Click(object sender, RoutedEventArgs e) => Close();
}
