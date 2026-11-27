/*
 * =============================================================================
 * BẢN QUYỀN SỞ HỮU TRÍ TUỆ — ĐỖ MIINH MATH (MINNOTE PROPRIETARY)
 * Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.
 * DM-COPYRIGHT-OWNER: DoMiinhMath
 * SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath
 * TDM-Reservation: 1
 * -----------------------------------------------------------------------------
 * Đây là bản quyền thuộc sở hữu độc quyền của Đỗ Miinh Math (MinNote).
 * Nghiêm cấm sao chép, phân phối lại, dịch ngược (reverse engineering),
 * giải biên dịch (decompilation), tách thuật toán hoặc sử dụng công cụ AI/LLM
 * tự động trích xuất, tái tạo, huấn luyện trên mã nguồn này khi chưa có sự
 * đồng ý bằng văn bản từ Đỗ Miinh Math.
 * Proprietary & Confidential. Reverse engineering, decompilation, and automated
 * AI/LLM extraction, reconstruction, or training are strictly prohibited.
 * =============================================================================
 */
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
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
    string AssetName,
    string ExpectedSha256 = ""
);

public class GitHubUpdateService
{
    private const string FallbackVersion = "0.0.9.25";
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

    private static readonly string[] TrustedGitHubDownloadHosts =
    [
        "github.com",
        "objects.githubusercontent.com",
        "release-assets.githubusercontent.com",
        "github-releases.githubusercontent.com"
    ];

    private static readonly Regex Sha256HexRegex = new(@"(?<![0-9a-fA-F])([0-9a-fA-F]{64})(?![0-9a-fA-F])", RegexOptions.Compiled);

    public static bool IsTrustedGitHubDownloadUri(Uri? uri)
    {
        if (uri == null || !uri.IsAbsoluteUri) return false;
        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)) return false;
        if (!uri.IsDefaultPort) return false;
        if (!string.IsNullOrEmpty(uri.UserInfo)) return false;

        string host = uri.Host;
        foreach (string allowed in TrustedGitHubDownloadHosts)
        {
            if (string.Equals(host, allowed, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        return false;
    }

    private static string NormalizeSha256Hex(string? raw, string? preferredAssetName = null)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

        string trimmed = raw.Trim();
        if (trimmed.StartsWith("sha256:", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = trimmed.Substring("sha256:".Length).Trim();
            if (trimmed.Length == 64 && Sha256HexRegex.IsMatch(trimmed))
            {
                return trimmed.ToLowerInvariant();
            }
        }

        string[] lines = trimmed.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        if (!string.IsNullOrWhiteSpace(preferredAssetName) && lines.Length > 1)
        {
            foreach (string line in lines)
            {
                if (line.IndexOf(preferredAssetName, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    var mPref = Sha256HexRegex.Match(line);
                    if (mPref.Success) return mPref.Groups[1].Value.ToLowerInvariant();
                }
            }
        }

        foreach (string line in lines)
        {
            var m = Sha256HexRegex.Match(line);
            if (m.Success) return m.Groups[1].Value.ToLowerInvariant();
        }

        return string.Empty;
    }

    private async Task<string> TryFetchSiblingSha256Async(string tagName, string assetName, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(tagName) || string.IsNullOrWhiteSpace(assetName))
        {
            return string.Empty;
        }

        try
        {
            string shaUrl = $"https://github.com/{GitHubRepo}/releases/download/{Uri.EscapeDataString(tagName)}/{Uri.EscapeDataString(assetName)}.sha256";
            if (!Uri.TryCreate(shaUrl, UriKind.Absolute, out var shaUri) || !IsTrustedGitHubDownloadUri(shaUri))
            {
                return string.Empty;
            }

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(10));

            using var req = CreateNoCacheRequest(HttpMethod.Get, WithCacheBuster(shaUrl));
            using var resp = await _httpClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, timeoutCts.Token);
            if (!resp.IsSuccessStatusCode) return string.Empty;
            if (!IsTrustedGitHubDownloadUri(resp.RequestMessage?.RequestUri)) return string.Empty;

            if (resp.Content.Headers.ContentLength is long len && len > 65536)
            {
                return string.Empty;
            }

            string content = await resp.Content.ReadAsStringAsync(timeoutCts.Token);
            return NormalizeSha256Hex(content, assetName);
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[Sha256Check] Sibling .sha256 fetch skipped: {ex.Message}");
            return string.Empty;
        }
    }

    private static void TryDeleteFile(string path)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch { }
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
            Uri? finalWebUri = webResp.RequestMessage?.RequestUri;
            if (!IsTrustedGitHubDownloadUri(finalWebUri))
            {
                throw new InvalidOperationException("URL chuyển hướng GitHub Releases không hợp lệ.");
            }
            string finalUrl = finalWebUri?.ToString() ?? "";
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

                string siblingSha = await TryFetchSiblingSha256Async(tagName, DefaultSetupAssetName, token);
                return new UpdateInfo(
                    cleanVersion,
                    tagName,
                    "Bản cập nhật MinNote chính thức từ GitHub Releases.",
                    downloadUrl,
                    assetSize,
                    DefaultSetupAssetName,
                    siblingSha);
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
        string expectedSha256 = "";
        long size = 0;

        if (root.TryGetProperty("assets", out var assets) && assets.ValueKind == JsonValueKind.Array)
        {
            foreach (var asset in assets.EnumerateArray())
            {
                string name = asset.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                long assetSize = asset.TryGetProperty("size", out var s) && s.TryGetInt64(out var parsedSize) ? parsedSize : 0;
                string url = asset.TryGetProperty("browser_download_url", out var u) ? u.GetString() ?? "" : "";
                if (string.IsNullOrWhiteSpace(url) || assetSize <= 0) continue;
                if (!Uri.TryCreate(url, UriKind.Absolute, out var parsedUri) || !IsTrustedGitHubDownloadUri(parsedUri)) continue;

                string digestRaw = asset.TryGetProperty("digest", out var d) && d.ValueKind == JsonValueKind.String
                    ? d.GetString() ?? ""
                    : "";
                string parsedSha = NormalizeSha256Hex(digestRaw, name);

                if (string.Equals(name, DefaultSetupAssetName, StringComparison.OrdinalIgnoreCase))
                {
                    assetName = name;
                    downloadUrl = url;
                    size = assetSize;
                    expectedSha256 = parsedSha;
                    break;
                }

                if (string.IsNullOrEmpty(downloadUrl) && name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                {
                    assetName = name;
                    downloadUrl = url;
                    size = assetSize;
                    expectedSha256 = parsedSha;
                }
            }
        }

        if (string.IsNullOrEmpty(downloadUrl))
        {
            return null;
        }

        return new UpdateInfo(cleanVersion, tagName, body, downloadUrl, size, assetName, expectedSha256);
    }

    private async Task<(bool Exists, long Size)> VerifyAssetExistsAsync(string downloadUrl, CancellationToken ct)
    {
        try
        {
            if (!Uri.TryCreate(downloadUrl, UriKind.Absolute, out var initUri) || !IsTrustedGitHubDownloadUri(initUri))
            {
                return (false, 0);
            }

            using var headReq = CreateNoCacheRequest(HttpMethod.Head, WithCacheBuster(downloadUrl));
            using var headResp = await _httpClient.SendAsync(headReq, HttpCompletionOption.ResponseHeadersRead, ct);
            if (headResp.IsSuccessStatusCode && IsTrustedGitHubDownloadUri(headResp.RequestMessage?.RequestUri))
            {
                long len = headResp.Content.Headers.ContentLength ?? 0;
                return (true, len);
            }

            if (headResp.StatusCode == HttpStatusCode.MethodNotAllowed)
            {
                using var rangeReq = CreateNoCacheRequest(HttpMethod.Get, WithCacheBuster(downloadUrl));
                rangeReq.Headers.Range = new RangeHeaderValue(0, 0);
                using var rangeResp = await _httpClient.SendAsync(rangeReq, HttpCompletionOption.ResponseHeadersRead, ct);
                if (rangeResp.IsSuccessStatusCode && IsTrustedGitHubDownloadUri(rangeResp.RequestMessage?.RequestUri))
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

    internal static void ValidateDownloadedInstaller(
        string setupPath,
        long totalRead,
        byte peSig0,
        byte peSig1,
        byte[] actualHash,
        long expectedFileSize,
        string expectedSha256)
    {
        if (totalRead < 1024)
        {
            TryDeleteFile(setupPath);
            throw new IOException("Tệp cài đặt tải về bị rỗng hoặc không đầy đủ.");
        }

        if (peSig0 != 0x4D || peSig1 != 0x5A)
        {
            TryDeleteFile(setupPath);
            throw new InvalidOperationException("Cảnh báo bảo mật: Tệp cập nhật tải về không phải tệp cài đặt Windows (PE) hợp lệ.");
        }

        if (expectedFileSize > 0 && totalRead != expectedFileSize)
        {
            TryDeleteFile(setupPath);
            throw new IOException($"Kích thước tệp cập nhật không khớp với bản phát hành ({totalRead} / {expectedFileSize} bytes).");
        }

        if (!string.IsNullOrWhiteSpace(expectedSha256))
        {
            string normalized = NormalizeSha256Hex(expectedSha256);
            if (normalized.Length != 64)
            {
                TryDeleteFile(setupPath);
                throw new InvalidOperationException("Cảnh báo bảo mật: Định dạng mã kiểm tra SHA-256 của bản phát hành không hợp lệ.");
            }
            byte[] expectedHash = Convert.FromHexString(normalized);
            if (!CryptographicOperations.FixedTimeEquals(actualHash, expectedHash))
            {
                TryDeleteFile(setupPath);
                throw new InvalidOperationException("Cảnh báo bảo mật: Mã kiểm tra SHA-256 của tệp cập nhật không khớp với bản phát hành chính thức. Đã hủy cài đặt để bảo vệ máy tính.");
            }
        }
    }

    public async Task<bool> DownloadAndInstallUpdateAsync(
        UpdateInfo info,
        Action<double>? onProgress = null,
        Func<Task>? beforeInstallLaunch = null)
    {
        string? setupPath = null;
        bool launched = false;
        try
        {
            if (!Uri.TryCreate(info.DownloadUrl, UriKind.Absolute, out var initialUri) || !IsTrustedGitHubDownloadUri(initialUri))
            {
                throw new InvalidOperationException("Cảnh báo bảo mật: Đường dẫn tải bản cập nhật không thuộc máy chủ GitHub chính thức.");
            }

            string tempDir = Path.Combine(Path.GetTempPath(), "MinNote_Update");
            Directory.CreateDirectory(tempDir);

            string safeTag = string.Concat((info.TagName ?? "").Where(c => char.IsLetterOrDigit(c) || c == '.' || c == '-' || c == '_'));
            string baseAsset = !string.IsNullOrWhiteSpace(info.AssetName) ? Path.GetFileName(info.AssetName) : DefaultSetupAssetName;
            string setupFileName = !string.IsNullOrWhiteSpace(safeTag)
                ? $"{Path.GetFileNameWithoutExtension(baseAsset)}_{safeTag}{Path.GetExtension(baseAsset)}"
                : baseAsset;
            setupPath = Path.Combine(tempDir, setupFileName);

            string expectedSha256 = NormalizeSha256Hex(info.ExpectedSha256, baseAsset);
            if (!string.IsNullOrWhiteSpace(info.ExpectedSha256) && expectedSha256.Length != 64)
            {
                throw new InvalidOperationException("Cảnh báo bảo mật: Định dạng mã kiểm tra SHA-256 của bản phát hành không hợp lệ.");
            }
            if (string.IsNullOrEmpty(expectedSha256) && !string.IsNullOrWhiteSpace(info.TagName))
            {
                expectedSha256 = await TryFetchSiblingSha256Async(info.TagName, baseAsset, CancellationToken.None);
            }

            byte[] actualHash;
            long totalRead = 0;
            byte peSig0 = 0;
            byte peSig1 = 0;

            using (var dlReq = CreateNoCacheRequest(HttpMethod.Get, WithCacheBuster(info.DownloadUrl)))
            using (var resp = await _httpClient.SendAsync(dlReq, HttpCompletionOption.ResponseHeadersRead))
            {
                resp.EnsureSuccessStatusCode();

                Uri? finalUri = resp.RequestMessage?.RequestUri;
                if (!IsTrustedGitHubDownloadUri(finalUri))
                {
                    throw new InvalidOperationException("Cảnh báo bảo mật: Địa chỉ chuyển hướng tải bản cập nhật không thuộc máy chủ GitHub chính thức.");
                }

                long totalBytes = resp.Content.Headers.ContentLength ?? info.FileSize;

                using var stream = await resp.Content.ReadAsStreamAsync();
                using var hasher = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
                using (var fs = new FileStream(setupPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    byte[] buffer = new byte[81920];
                    int read;
                    while ((read = await stream.ReadAsync(buffer, 0, buffer.Length)) > 0)
                    {
                        if (totalRead == 0)
                        {
                            peSig0 = buffer[0];
                            if (read > 1) peSig1 = buffer[1];
                        }
                        else if (totalRead == 1)
                        {
                            peSig1 = buffer[0];
                        }

                        await fs.WriteAsync(buffer, 0, read);
                        hasher.AppendData(buffer, 0, read);
                        totalRead += read;
                        if (totalBytes > 0 && onProgress != null)
                        {
                            onProgress((double)totalRead / totalBytes * 100);
                        }
                    }
                }

                actualHash = hasher.GetHashAndReset();
            }

            ValidateDownloadedInstaller(setupPath, totalRead, peSig0, peSig1, actualHash, info.FileSize, expectedSha256);

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
                launched = setupProc != null;
            }
            catch (Win32Exception w32) when (w32.NativeErrorCode == 1223)
            {
                // Người dùng bấm Không (Cancel) ở hộp thoại UAC
                return false;
            }

            if (setupProc != null)
            {
                const string watcherScript =
                    "Wait-Process -Id ([int]$env:MINNOTE_SETUP_PID) -ErrorAction SilentlyContinue; " +
                    "Start-Sleep -Seconds 3; " +
                    "if (-not (Get-Process -Name 'MinNote' -ErrorAction SilentlyContinue)) { " +
                    "if ($env:MINNOTE_EXE_1 -and (Test-Path -LiteralPath $env:MINNOTE_EXE_1)) { Start-Process -FilePath $env:MINNOTE_EXE_1 } " +
                    "elseif ($env:MINNOTE_EXE_2 -and (Test-Path -LiteralPath $env:MINNOTE_EXE_2)) { Start-Process -FilePath $env:MINNOTE_EXE_2 } " +
                    "}";

                var watcherPsi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                watcherPsi.ArgumentList.Add("-NoProfile");
                watcherPsi.ArgumentList.Add("-NonInteractive");
                watcherPsi.ArgumentList.Add("-WindowStyle");
                watcherPsi.ArgumentList.Add("Hidden");
                watcherPsi.ArgumentList.Add("-Command");
                watcherPsi.ArgumentList.Add(watcherScript);
                watcherPsi.Environment["MINNOTE_SETUP_PID"] = setupProc.Id.ToString(CultureInfo.InvariantCulture);
                watcherPsi.Environment["MINNOTE_EXE_1"] = installedExe;
                watcherPsi.Environment["MINNOTE_EXE_2"] = fallbackExe;

                Process.Start(watcherPsi);
            }

            Application.Current.Dispatcher.Invoke(() => Application.Current.Shutdown());
            return true;
        }
        catch (Exception ex)
        {
            if (!launched && !string.IsNullOrEmpty(setupPath))
            {
                TryDeleteFile(setupPath);
            }

            MinNote.Views.MinNoteDialog.ShowAlert(
                null,
                $"Lỗi khi tải bản cập nhật: {ex.Message}",
                "Cập nhật thất bại",
                MinNote.Views.MinNoteDialogTone.Danger);
            return false;
        }
    }
}
// [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1).
