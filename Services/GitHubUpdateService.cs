using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Reflection;
using System.Text.Json;
using System.Threading;
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
    private const string FallbackVersion = "0.0.9.6";
    private const string DefaultSetupAssetName = "MinNote_Setup.exe";

    public static GitHubUpdateService Instance { get; } = new();

    public string CurrentVersion { get; set; } = ResolveAssemblyVersion();
    public string GitHubRepo { get; set; } = "Do-Miinh-1210/minnotee";

    private readonly HttpClient _httpClient;

    public GitHubUpdateService()
    {
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromMinutes(10)
        };
        _httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("MinNote", CurrentVersion));
    }

    private static string ResolveAssemblyVersion()
    {
        try
        {
            var version = Assembly.GetExecutingAssembly().GetName().Version;
            if (version != null && (version.Major > 0 || version.Minor > 0 || version.Build > 0 || version.Revision > 0))
            {
                int major = Math.Max(0, version.Major);
                int minor = Math.Max(0, version.Minor);
                int build = Math.Max(0, version.Build);
                int revision = Math.Max(0, version.Revision);
                return $"{major}.{minor}.{build}.{revision}";
            }
        }
        catch { }

        return FallbackVersion;
    }

    private static string WithCacheBuster(string url)
    {
        long ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        char sep = url.Contains('?') ? '&' : '?';
        return $"{url}{sep}ts={ts}";
    }

    private static HttpRequestMessage CreateNoCacheRequest(HttpMethod method, string url, bool acceptGitHubJson = false)
    {
        var req = new HttpRequestMessage(method, url);
        req.Headers.CacheControl = new CacheControlHeaderValue
        {
            NoCache = true,
            NoStore = true,
            MaxAge = TimeSpan.Zero
        };
        req.Headers.Pragma.ParseAdd("no-cache");
        if (acceptGitHubJson)
        {
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        }
        return req;
    }

    public async Task<UpdateInfo?> CheckForUpdatesAsync(CancellationToken ct = default)
    {
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(20));
        CancellationToken token = timeoutCts.Token;

        // 1. Kiểm tra qua GitHub Web Redirect (không tốn quota Rate Limit 60 req/giờ cho máy đã ở bản mới nhất)
        try
        {
            string webUrl = WithCacheBuster($"https://github.com/{GitHubRepo}/releases/latest");
            using var webReq = CreateNoCacheRequest(HttpMethod.Get, webUrl);
            using var webResp = await _httpClient.SendAsync(webReq, HttpCompletionOption.ResponseHeadersRead, token);
            string finalUrl = webResp.RequestMessage?.RequestUri?.ToString() ?? "";
            int tagIdx = finalUrl.IndexOf("/releases/tag/", StringComparison.OrdinalIgnoreCase);
            if (tagIdx >= 0)
            {
                string rawTag = finalUrl.Substring(tagIdx + "/releases/tag/".Length);
                int queryOrHashIdx = rawTag.IndexOfAny(new[] { '?', '#' });
                if (queryOrHashIdx >= 0)
                {
                    rawTag = rawTag.Substring(0, queryOrHashIdx);
                }
                string tagName = Uri.UnescapeDataString(rawTag).Trim('/');
                string cleanVersion = tagName.TrimStart('v', 'V');
                if (string.IsNullOrWhiteSpace(cleanVersion) || !IsNewer(cleanVersion, CurrentVersion))
                {
                    return null;
                }

                // Xác thực bản phát hành đã có đủ MinNote_Setup.exe trước khi báo cập nhật (tránh báo bản chưa upload xong)
                var (apiVerified, apiUpdate) = await TryGetVerifiedTagReleaseViaApiAsync(tagName, token);
                if (apiVerified)
                {
                    return apiUpdate;
                }

                string downloadUrl = $"https://github.com/{GitHubRepo}/releases/download/{Uri.EscapeDataString(tagName)}/{DefaultSetupAssetName}";
                var (assetExists, assetSize) = await VerifyAssetExistsAsync(downloadUrl, token);
                if (!assetExists)
                {
                    Debug.WriteLine($"[UpdateCheck] Release {tagName} does not have {DefaultSetupAssetName} yet; skipping.");
                    return null;
                }

                return new UpdateInfo(
                    cleanVersion,
                    tagName,
                    "Bản cập nhật MinNote chính thức từ GitHub Releases.",
                    downloadUrl,
                    assetSize,
                    DefaultSetupAssetName);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            Debug.WriteLine($"[WebCheck] Fallback to API: {ex.Message}");
        }

        // 2. Dự phòng qua GitHub Releases API (có chống cache + kiểm tra asset MinNote_Setup.exe)
        try
        {
            string url = WithCacheBuster($"https://api.github.com/repos/{GitHubRepo}/releases/latest");
            using var req = CreateNoCacheRequest(HttpMethod.Get, url, acceptGitHubJson: true);
            using var resp = await _httpClient.SendAsync(req, token);
            if (resp.StatusCode == HttpStatusCode.NotFound)
            {
                throw new InvalidOperationException($"Chưa tìm thấy repo hoặc bản phát hành trên GitHub ({GitHubRepo}). Vui lòng tạo Release trên GitHub trước.");
            }
            if (resp.StatusCode == HttpStatusCode.Forbidden || resp.StatusCode == HttpStatusCode.TooManyRequests)
            {
                throw new InvalidOperationException("Giới hạn lượt truy vấn GitHub API tạm thời bị đầy. Thử lại sau ít phút hoặc tải trực tiếp file MinNote_Setup.exe.");
            }
            if (!resp.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"GitHub API lỗi: {(int)resp.StatusCode} ({resp.ReasonPhrase}).");
            }

            string json = await resp.Content.ReadAsStringAsync(token);
            return ParseVerifiedReleaseJson(json);
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[UpdateCheck] Error: {ex.Message}");
            throw;
        }
    }

    private async Task<(bool Verified, UpdateInfo? Info)> TryGetVerifiedTagReleaseViaApiAsync(string tagName, CancellationToken ct)
    {
        try
        {
            string apiUrl = WithCacheBuster($"https://api.github.com/repos/{GitHubRepo}/releases/tags/{Uri.EscapeDataString(tagName)}");
            using var req = CreateNoCacheRequest(HttpMethod.Get, apiUrl, acceptGitHubJson: true);
            using var resp = await _httpClient.SendAsync(req, ct);
            if (resp.StatusCode == HttpStatusCode.NotFound)
            {
                return (true, null);
            }
            if (!resp.IsSuccessStatusCode)
            {
                return (false, null);
            }

            string json = await resp.Content.ReadAsStringAsync(ct);
            return (true, ParseVerifiedReleaseJson(json));
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[TagApiCheck] Fallback to HEAD verify: {ex.Message}");
            return (false, null);
        }
    }

    private UpdateInfo? ParseVerifiedReleaseJson(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (root.TryGetProperty("draft", out var draftElem) && draftElem.ValueKind == JsonValueKind.True)
        {
            return null;
        }

        string tagName = root.TryGetProperty("tag_name", out var tElem) ? tElem.GetString() ?? "" : "";
        string cleanVersion = tagName.TrimStart('v', 'V');
        string body = root.TryGetProperty("body", out var bElem) ? bElem.GetString() ?? "" : "";

        if (string.IsNullOrWhiteSpace(cleanVersion) || !IsNewer(cleanVersion, CurrentVersion))
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
                long assetSize = asset.TryGetProperty("size", out var s) && s.TryGetInt64(out var parsedSize) ? parsedSize : 0;
                string url = asset.TryGetProperty("browser_download_url", out var u) ? u.GetString() ?? "" : "";
                if (string.IsNullOrWhiteSpace(url) || assetSize <= 0) continue;

                if (string.Equals(name, DefaultSetupAssetName, StringComparison.OrdinalIgnoreCase))
                {
                    assetName = name;
                    downloadUrl = url;
                    size = assetSize;
                    break;
                }

                if (string.IsNullOrEmpty(downloadUrl) && name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                {
                    assetName = name;
                    downloadUrl = url;
                    size = assetSize;
                }
            }
        }

        if (string.IsNullOrEmpty(downloadUrl))
        {
            return null;
        }

        return new UpdateInfo(cleanVersion, tagName, body, downloadUrl, size, assetName);
    }

    private async Task<(bool Exists, long Size)> VerifyAssetExistsAsync(string downloadUrl, CancellationToken ct)
    {
        try
        {
            using var headReq = CreateNoCacheRequest(HttpMethod.Head, WithCacheBuster(downloadUrl));
            using var headResp = await _httpClient.SendAsync(headReq, HttpCompletionOption.ResponseHeadersRead, ct);
            if (headResp.IsSuccessStatusCode)
            {
                long len = headResp.Content.Headers.ContentLength ?? 0;
                return (true, len);
            }

            if (headResp.StatusCode == HttpStatusCode.MethodNotAllowed)
            {
                using var rangeReq = CreateNoCacheRequest(HttpMethod.Get, WithCacheBuster(downloadUrl));
                rangeReq.Headers.Range = new RangeHeaderValue(0, 0);
                using var rangeResp = await _httpClient.SendAsync(rangeReq, HttpCompletionOption.ResponseHeadersRead, ct);
                if (rangeResp.IsSuccessStatusCode)
                {
                    long len = rangeResp.Content.Headers.ContentRange?.Length
                        ?? rangeResp.Content.Headers.ContentLength
                        ?? 0;
                    return (true, len);
                }
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[HeadCheck] Asset verify failed: {ex.Message}");
        }

        return (false, 0);
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

    public async Task<bool> DownloadAndInstallUpdateAsync(
        UpdateInfo info,
        Action<double>? onProgress = null,
        Func<Task>? beforeInstallLaunch = null)
    {
        try
        {
            string tempDir = Path.Combine(Path.GetTempPath(), "MinNote_Update");
            Directory.CreateDirectory(tempDir);

            string safeTag = string.Concat((info.TagName ?? "").Where(c => char.IsLetterOrDigit(c) || c == '.' || c == '-' || c == '_'));
            string baseAsset = !string.IsNullOrWhiteSpace(info.AssetName) ? Path.GetFileName(info.AssetName) : DefaultSetupAssetName;
            string setupFileName = !string.IsNullOrWhiteSpace(safeTag)
                ? $"{Path.GetFileNameWithoutExtension(baseAsset)}_{safeTag}{Path.GetExtension(baseAsset)}"
                : baseAsset;
            string setupPath = Path.Combine(tempDir, setupFileName);

            using (var dlReq = CreateNoCacheRequest(HttpMethod.Get, WithCacheBuster(info.DownloadUrl)))
            using (var resp = await _httpClient.SendAsync(dlReq, HttpCompletionOption.ResponseHeadersRead))
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

                if (totalRead <= 0)
                {
                    throw new IOException("Tệp cài đặt tải về bị rỗng.");
                }
            }

            if (beforeInstallLaunch != null)
            {
                try
                {
                    await beforeInstallLaunch();
                }
                catch { }
            }

            // Luôn ưu tiên khởi chạy lại bản MinNote.exe mới cài trong Program Files\MinNote
            // (tránh mở lại bản cũ ở thư mục portable/Downloads khiến người dùng bị hỏi cập nhật 2 lần)
            string installedExe = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                "MinNote",
                "MinNote.exe");
            string fallbackExe = Environment.ProcessPath ?? installedExe;

            Process? setupProc;
            try
            {
                setupProc = Process.Start(new ProcessStartInfo
                {
                    FileName = setupPath,
                    Arguments = "/SILENT /CLOSEAPPLICATIONS /FORCECLOSEAPPLICATIONS /NORESTART /SUPPRESSMSGBOXES /AUTORELAUNCH",
                    UseShellExecute = true
                });
            }
            catch (Win32Exception w32) when (w32.NativeErrorCode == 1223)
            {
                // Người dùng bấm Không (Cancel) ở hộp thoại UAC
                return false;
            }

            if (setupProc != null)
            {
                string escapedInstalled = installedExe.Replace("'", "''");
                string escapedFallback = fallbackExe.Replace("'", "''");
                string watcherCmd =
                    $"Wait-Process -Id {setupProc.Id} -ErrorAction SilentlyContinue; " +
                    "Start-Sleep -Seconds 3; " +
                    "if (-not (Get-Process -Name 'MinNote' -ErrorAction SilentlyContinue)) { " +
                    $"if (Test-Path '{escapedInstalled}') {{ Start-Process -FilePath '{escapedInstalled}' }} " +
                    $"elseif (Test-Path '{escapedFallback}') {{ Start-Process -FilePath '{escapedFallback}' }} " +
                    "}";
                Process.Start(new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-NoProfile -WindowStyle Hidden -Command \"{watcherCmd}\"",
                    CreateNoWindow = true,
                    UseShellExecute = false
                });
            }

            Application.Current.Dispatcher.Invoke(() => Application.Current.Shutdown());
            return true;
        }
        catch (Exception ex)
        {
            MinNote.Views.MinNoteDialog.ShowAlert(
                null,
                $"Lỗi khi tải bản cập nhật: {ex.Message}",
                "Cập nhật thất bại",
                MinNote.Views.MinNoteDialogTone.Danger);
            return false;
        }
    }
}
