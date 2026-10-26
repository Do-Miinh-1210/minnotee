using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;

namespace MinNote.Services;

public record UpdateInfo(
    string Version,
    string TagName,
    string ReleaseNotes,
    string DownloadUrl,
    long FileSize,
    string AssetName
);

public class GitHubUpdateService
{
    public static GitHubUpdateService Instance { get; } = new();

    public string CurrentVersion { get; set; } = "0.0.0.2";
    public string GitHubRepo { get; set; } = "Do-Miinh-1210/minnotee";

    private readonly HttpClient _httpClient;

    public GitHubUpdateService()
    {
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("MinNote", CurrentVersion));
    }

    public async Task<UpdateInfo?> CheckForUpdatesAsync()
    {
        try
        {
            string url = $"https://api.github.com/repos/{GitHubRepo}/releases/latest";
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            var resp = await _httpClient.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return null;

            string json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            string tagName = root.TryGetProperty("tag_name", out var tElem) ? tElem.GetString() ?? "" : "";
            string cleanVersion = tagName.TrimStart('v', 'V');
            string body = root.TryGetProperty("body", out var bElem) ? bElem.GetString() ?? "" : "";

            if (!IsNewer(cleanVersion, CurrentVersion))
            {
                return null;
            }

            string downloadUrl = "";
            string assetName = "";
            long size = 0;

            if (root.TryGetProperty("assets", out var assets) && assets.ValueKind == JsonValueKind.Array)
            {
                foreach (var asset in assets.EnumerateArray())
                {
                    string name = asset.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                    if (name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                    {
                        assetName = name;
                        downloadUrl = asset.TryGetProperty("browser_download_url", out var u) ? u.GetString() ?? "" : "";
                        size = asset.TryGetProperty("size", out var s) ? s.GetInt64() : 0;
                        break;
                    }
                }
            }

            if (string.IsNullOrEmpty(downloadUrl)) return null;

            return new UpdateInfo(cleanVersion, tagName, body, downloadUrl, size, assetName);
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[UpdateCheck] Error: {ex.Message}");
            return null;
        }
    }

    public static bool IsNewer(string remote, string local)
    {
        try
        {
            var rParts = remote.Split(new[] { '.', '-', '_' }, StringSplitOptions.RemoveEmptyEntries);
            var lParts = local.Split(new[] { '.', '-', '_' }, StringSplitOptions.RemoveEmptyEntries);

            int len = Math.Max(rParts.Length, lParts.Length);
            for (int i = 0; i < len; i++)
            {
                int r = i < rParts.Length && int.TryParse(rParts[i], out int rv) ? rv : 0;
                int l = i < lParts.Length && int.TryParse(lParts[i], out int lv) ? lv : 0;
                if (r > l) return true;
                if (r < l) return false;
            }
            return false;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> DownloadAndInstallUpdateAsync(UpdateInfo info, Action<double>? onProgress = null)
    {
        try
        {
            string tempDir = Path.Combine(Path.GetTempPath(), "MinNote_Update");
            Directory.CreateDirectory(tempDir);
            string setupPath = Path.Combine(tempDir, info.AssetName.Length > 0 ? info.AssetName : "MinNote_Setup.exe");

            using (var resp = await _httpClient.GetAsync(info.DownloadUrl, HttpCompletionOption.ResponseHeadersRead))
            {
                resp.EnsureSuccessStatusCode();
                long totalBytes = resp.Content.Headers.ContentLength ?? info.FileSize;

                using var stream = await resp.Content.ReadAsStreamAsync();
                using var fs = new FileStream(setupPath, FileMode.Create, FileAccess.Write, FileShare.None);

                byte[] buffer = new byte[81920];
                long totalRead = 0;
                int read;
                while ((read = await stream.ReadAsync(buffer, 0, buffer.Length)) > 0)
                {
                    await fs.WriteAsync(buffer, 0, read);
                    totalRead += read;
                    if (totalBytes > 0 && onProgress != null)
                    {
                        onProgress((double)totalRead / totalBytes * 100);
                    }
                }
            }

            // Launch installer and shutdown
            Process.Start(new ProcessStartInfo
            {
                FileName = setupPath,
                Arguments = "/SILENT /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS",
                UseShellExecute = true
            });

            Application.Current.Dispatcher.Invoke(() => Application.Current.Shutdown());
            return true;
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Lỗi khi tải bản cập nhật: {ex.Message}", "Cập nhật thất bại", MessageBoxButton.OK, MessageBoxImage.Error);
            return false;
        }
    }
}
