using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace MinNote.Services
{
    public sealed class GoogleOAuthConfig
    {
        [JsonPropertyName("clientId")]
        public string ClientId { get; set; } = "";

        [JsonPropertyName("clientSecret")]
        public string ClientSecret { get; set; } = "";
    }

    public sealed class DriveStoredToken
    {
        [JsonPropertyName("refreshToken")]
        public string RefreshToken { get; set; } = "";

        [JsonPropertyName("email")]
        public string Email { get; set; } = "";

        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = "";

        [JsonPropertyName("rootFolderId")]
        public string RootFolderId { get; set; } = "";

        [JsonPropertyName("lastSyncUtc")]
        public string LastSyncUtc { get; set; } = "";
    }

    /// <summary>
    /// Kết nối Google Drive thật qua OAuth 2.0 Desktop Loopback (PKCE),
    /// mã hóa refresh token bằng Windows DPAPI (CryptProtectData) và đồng bộ thư mục "MinNote" trên Google Drive.
    /// Không bao giờ giả lập tài khoản hoặc báo thành công giả khi chưa đăng nhập Google thật.
    /// </summary>
    public sealed class GoogleDriveService
    {
        public static GoogleDriveService Instance { get; } = new();

        private const string DriveScope = "https://www.googleapis.com/auth/drive.file";
        private const string AuthEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
        private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
        private const string RevokeEndpoint = "https://oauth2.googleapis.com/revoke";
        private const string DriveFilesApi = "https://www.googleapis.com/drive/v3/files";
        private const string DriveUploadApi = "https://www.googleapis.com/upload/drive/v3/files";
        private const string FolderMime = "application/vnd.google-apps.folder";
        private const string RootFolderDisplayName = "MinNote";

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            WriteIndented = true,
            PropertyNameCaseInsensitive = true
        };

        private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(60) };
        private readonly SemaphoreSlim _authLock = new(1, 1);

        private string? _accessToken;
        private DateTimeOffset _accessTokenExpiresUtc = DateTimeOffset.MinValue;

        private string UserOAuthConfigPath => Path.Combine(NotebookBackupService.Instance.AppDataDir, "google_oauth.json");
        private string AppBundledOAuthConfigPath => Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "google_oauth.json");
        private string EncryptedTokenPath => Path.Combine(NotebookBackupService.Instance.AppDataDir, "drive_token.dat");

        private GoogleDriveService() { }

        #region Win32 DPAPI P/Invoke

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct DATA_BLOB
        {
            public int cbData;
            public IntPtr pbData;
        }

        [DllImport("crypt32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool CryptProtectData(
            ref DATA_BLOB pDataIn,
            string? szDataDescr,
            IntPtr pOptionalEntropy,
            IntPtr pvReserved,
            IntPtr pPromptStruct,
            uint dwFlags,
            out DATA_BLOB pDataOut);

        [DllImport("crypt32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool CryptUnprotectData(
            ref DATA_BLOB pDataIn,
            IntPtr ppszDataDescr,
            IntPtr pOptionalEntropy,
            IntPtr pvReserved,
            IntPtr pPromptStruct,
            uint dwFlags,
            out DATA_BLOB pDataOut);

        [DllImport("kernel32.dll")]
        private static extern IntPtr LocalFree(IntPtr hMem);

        private const uint CRYPTPROTECT_UI_FORBIDDEN = 0x1;
        private const string DpapiSecretPrefix = "dpapi:";

        private static byte[] ProtectDpapi(byte[] plainBytes)
        {
            var inBlob = new DATA_BLOB();
            var outBlob = new DATA_BLOB();
            try
            {
                inBlob.cbData = plainBytes.Length;
                inBlob.pbData = Marshal.AllocHGlobal(plainBytes.Length);
                Marshal.Copy(plainBytes, 0, inBlob.pbData, plainBytes.Length);

                if (!CryptProtectData(ref inBlob, "MinNote_GoogleDrive_Token", IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, CRYPTPROTECT_UI_FORBIDDEN, out outBlob))
                {
                    throw new InvalidOperationException($"Không thể mã hóa DPAPI ({Marshal.GetLastWin32Error()}).");
                }

                byte[] protectedBytes = new byte[outBlob.cbData];
                Marshal.Copy(outBlob.pbData, protectedBytes, 0, outBlob.cbData);
                return protectedBytes;
            }
            finally
            {
                if (inBlob.pbData != IntPtr.Zero) Marshal.FreeHGlobal(inBlob.pbData);
                if (outBlob.pbData != IntPtr.Zero) LocalFree(outBlob.pbData);
            }
        }

        private static byte[] UnprotectDpapi(byte[] protectedBytes)
        {
            var inBlob = new DATA_BLOB();
            var outBlob = new DATA_BLOB();
            try
            {
                inBlob.cbData = protectedBytes.Length;
                inBlob.pbData = Marshal.AllocHGlobal(protectedBytes.Length);
                Marshal.Copy(protectedBytes, 0, inBlob.pbData, protectedBytes.Length);

                if (!CryptUnprotectData(ref inBlob, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, CRYPTPROTECT_UI_FORBIDDEN, out outBlob))
                {
                    throw new InvalidOperationException($"Không thể giải mã DPAPI ({Marshal.GetLastWin32Error()}).");
                }

                byte[] plainBytes = new byte[outBlob.cbData];
                Marshal.Copy(outBlob.pbData, plainBytes, 0, outBlob.cbData);
                return plainBytes;
            }
            finally
            {
                if (inBlob.pbData != IntPtr.Zero) Marshal.FreeHGlobal(inBlob.pbData);
                if (outBlob.pbData != IntPtr.Zero) LocalFree(outBlob.pbData);
            }
        }

        #endregion

        public GoogleOAuthConfig GetOAuthConfig()
        {
            foreach (string path in new[] { UserOAuthConfigPath, AppBundledOAuthConfigPath })
            {
                try
                {
                    if (!File.Exists(path)) continue;
                    string json = File.ReadAllText(path, Encoding.UTF8);
                    var cfg = JsonSerializer.Deserialize<GoogleOAuthConfig>(json, JsonOpts);
                    if (cfg != null && !string.IsNullOrWhiteSpace(cfg.ClientId))
                    {
                        cfg.ClientId = cfg.ClientId.Trim();
                        string rawSecret = (cfg.ClientSecret ?? "").Trim();
                        if (rawSecret.StartsWith(DpapiSecretPrefix, StringComparison.Ordinal))
                        {
                            string b64 = rawSecret.Substring(DpapiSecretPrefix.Length).Trim();
                            if (string.IsNullOrEmpty(b64))
                            {
                                cfg.ClientSecret = "";
                            }
                            else
                            {
                                byte[] enc = Convert.FromBase64String(b64);
                                byte[] plain = UnprotectDpapi(enc);
                                cfg.ClientSecret = Encoding.UTF8.GetString(plain).Trim();
                            }
                        }
                        else
                        {
                            cfg.ClientSecret = rawSecret;
                        }
                        return cfg;
                    }
                }
                catch { }
            }
            return new GoogleOAuthConfig();
        }

        public object SaveOAuthConfig(string? clientId, string? clientSecret)
        {
            string cid = (clientId ?? "").Trim();
            string csec = (clientSecret ?? "").Trim();

            if (!string.IsNullOrEmpty(cid) && !cid.EndsWith(".apps.googleusercontent.com", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Client ID phải có dạng xxxx.apps.googleusercontent.com (OAuth Desktop App từ Google Cloud Console).");
            }

            string storedSecret = csec;
            if (!string.IsNullOrEmpty(csec) && !csec.StartsWith(DpapiSecretPrefix, StringComparison.Ordinal))
            {
                byte[] enc = ProtectDpapi(Encoding.UTF8.GetBytes(csec));
                storedSecret = DpapiSecretPrefix + Convert.ToBase64String(enc);
            }

            NotebookBackupService.Instance.EnsureDirectoriesExist();
            var cfg = new GoogleOAuthConfig { ClientId = cid, ClientSecret = storedSecret };
            NotebookBackupService.WriteAllTextAtomic(UserOAuthConfigPath, JsonSerializer.Serialize(cfg, JsonOpts));
            return GetStateSnapshot();
        }

        private DriveStoredToken? LoadStoredToken()
        {
            try
            {
                if (!File.Exists(EncryptedTokenPath)) return null;
                byte[] encrypted = File.ReadAllBytes(EncryptedTokenPath);
                byte[] plain = UnprotectDpapi(encrypted);
                string json = Encoding.UTF8.GetString(plain);
                return JsonSerializer.Deserialize<DriveStoredToken>(json, JsonOpts);
            }
            catch
            {
                return null;
            }
        }

        private void SaveStoredToken(DriveStoredToken token)
        {
            NotebookBackupService.Instance.EnsureDirectoriesExist();
            string json = JsonSerializer.Serialize(token, JsonOpts);
            byte[] encrypted = ProtectDpapi(Encoding.UTF8.GetBytes(json));
            NotebookBackupService.WriteAllBytesAtomic(EncryptedTokenPath, encrypted);
        }

        private void ClearStoredToken()
        {
            _accessToken = null;
            _accessTokenExpiresUtc = DateTimeOffset.MinValue;
            try
            {
                if (File.Exists(EncryptedTokenPath)) File.Delete(EncryptedTokenPath);
            }
            catch { }
        }

        public object GetStateSnapshot()
        {
            var cfg = GetOAuthConfig();
            bool configured = !string.IsNullOrWhiteSpace(cfg.ClientId);
            var tok = LoadStoredToken();
            bool signedIn = configured && tok != null && !string.IsNullOrWhiteSpace(tok.RefreshToken);

            string folderId = signedIn ? (tok!.RootFolderId ?? "") : "";
            string folderUrl = !string.IsNullOrEmpty(folderId)
                ? $"https://drive.google.com/drive/folders/{folderId}"
                : "";
            string preview = configured && cfg.ClientId.Length > 24
                ? cfg.ClientId[..12] + "…" + cfg.ClientId[^12..]
                : cfg.ClientId;

            return new
            {
                configured,
                signedIn,
                state = !configured ? "unconfigured" : (signedIn ? "signedIn" : "signedOut"),
                email = signedIn ? (tok!.Email ?? "") : "",
                displayName = signedIn ? (tok!.DisplayName ?? "") : "",
                folderName = RootFolderDisplayName,
                folderId,
                folderUrl,
                lastSyncUtc = signedIn ? (tok!.LastSyncUtc ?? "") : "",
                clientIdPreview = preview
            };
        }

        public Task<object> GetStateAsync() => Task.FromResult(GetStateSnapshot());

        public async Task<object> SignInAsync(CancellationToken ct = default)
        {
            var cfg = GetOAuthConfig();
            if (string.IsNullOrWhiteSpace(cfg.ClientId))
            {
                throw new InvalidOperationException("Chưa cấu hình Google Cloud Desktop OAuth Client ID.");
            }

            int port;
            using (var tcp = new TcpListener(IPAddress.Loopback, 0))
            {
                tcp.Start();
                port = ((IPEndPoint)tcp.LocalEndpoint).Port;
            }

            string redirectUri = $"http://127.0.0.1:{port}/callback/";
            string codeVerifier = Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
            string codeChallenge = Base64UrlEncode(SHA256.HashData(Encoding.ASCII.GetBytes(codeVerifier)));
            string state = Base64UrlEncode(RandomNumberGenerator.GetBytes(16));

            string authUrl = AuthEndpoint + "?" + BuildFormQuery(new Dictionary<string, string>
            {
                ["client_id"] = cfg.ClientId,
                ["redirect_uri"] = redirectUri,
                ["response_type"] = "code",
                ["scope"] = DriveScope,
                ["code_challenge"] = codeChallenge,
                ["code_challenge_method"] = "S256",
                ["access_type"] = "offline",
                ["prompt"] = "consent select_account",
                ["state"] = state
            });

            using var listener = new HttpListener();
            listener.Prefixes.Add(redirectUri);
            listener.Start();

            Process.Start(new ProcessStartInfo(authUrl) { UseShellExecute = true });

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromMinutes(3));

            string? code = null;
            string? callbackError = null;

            while (!timeoutCts.IsCancellationRequested)
            {
                var ctx = await listener.GetContextAsync().WaitAsync(timeoutCts.Token).ConfigureAwait(false);
                var reqPath = ctx.Request.Url?.AbsolutePath ?? "";
                if (!reqPath.StartsWith("/callback", StringComparison.OrdinalIgnoreCase))
                {
                    ctx.Response.StatusCode = 404;
                    ctx.Response.Close();
                    continue;
                }

                var q = ParseQueryString(ctx.Request.Url?.Query ?? "");
                q.TryGetValue("error", out callbackError);
                q.TryGetValue("state", out var respState);
                q.TryGetValue("code", out code);

                bool okCallback = string.IsNullOrEmpty(callbackError)
                    && string.Equals(respState, state, StringComparison.Ordinal)
                    && !string.IsNullOrEmpty(code);

                string html = okCallback
                    ? BuildCallbackHtml(true, "Đăng nhập Google Drive thành công!", "Bạn có thể đóng tab trình duyệt này và quay lại MinNote để đồng bộ sổ viết.")
                    : BuildCallbackHtml(false, "Đăng nhập Google Drive chưa hoàn tất", $"Chi tiết: {WebUtility.HtmlEncode(callbackError ?? "Đã hủy hoặc sai trạng thái xác thực.")}");

                byte[] htmlBytes = Encoding.UTF8.GetBytes(html);
                ctx.Response.ContentType = "text/html; charset=utf-8";
                ctx.Response.ContentLength64 = htmlBytes.Length;
                await ctx.Response.OutputStream.WriteAsync(htmlBytes, CancellationToken.None).ConfigureAwait(false);
                ctx.Response.Close();
                break;
            }

            if (!string.IsNullOrEmpty(callbackError))
            {
                throw new InvalidOperationException($"Google từ chối đăng nhập: {callbackError}");
            }
            if (string.IsNullOrEmpty(code))
            {
                throw new InvalidOperationException("Không nhận được mã xác thực từ Google.");
            }

            // Đổi authorization code lấy access_token & refresh_token
            var tokenForm = new Dictionary<string, string>
            {
                ["client_id"] = cfg.ClientId,
                ["code"] = code,
                ["code_verifier"] = codeVerifier,
                ["grant_type"] = "authorization_code",
                ["redirect_uri"] = redirectUri
            };
            if (!string.IsNullOrWhiteSpace(cfg.ClientSecret))
            {
                tokenForm["client_secret"] = cfg.ClientSecret;
            }

            using var tokenResp = await _http.PostAsync(TokenEndpoint, new FormUrlEncodedContent(tokenForm), ct).ConfigureAwait(false);
            string tokenJson = await tokenResp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
            if (!tokenResp.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Không đổi được mã Google OAuth ({(int)tokenResp.StatusCode}): {tokenJson}");
            }

            using var doc = JsonDocument.Parse(tokenJson);
            var root = doc.RootElement;
            string accessToken = root.GetProperty("access_token").GetString() ?? "";
            int expiresIn = root.TryGetProperty("expires_in", out var expEl) && expEl.TryGetInt32(out var eSec) ? eSec : 3600;
            string refreshToken = root.TryGetProperty("refresh_token", out var refEl) ? (refEl.GetString() ?? "") : "";
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                refreshToken = LoadStoredToken()?.RefreshToken ?? "";
            }
            if (string.IsNullOrWhiteSpace(accessToken) || string.IsNullOrWhiteSpace(refreshToken))
            {
                throw new InvalidOperationException("Google không trả về refresh_token. Hãy thử cấp lại quyền trong tài khoản Google.");
            }

            _accessToken = accessToken;
            _accessTokenExpiresUtc = DateTimeOffset.UtcNow.AddSeconds(Math.Max(60, expiresIn));

            // Lấy email thật và thư mục "MinNote" trên Drive
            var (email, displayName) = await FetchUserProfileAsync(accessToken, ct).ConfigureAwait(false);
            string folderId = await EnsureRootFolderAsync(accessToken, ct).ConfigureAwait(false);

            var stored = new DriveStoredToken
            {
                RefreshToken = refreshToken,
                Email = email,
                DisplayName = displayName,
                RootFolderId = folderId,
                LastSyncUtc = LoadStoredToken()?.LastSyncUtc ?? ""
            };
            SaveStoredToken(stored);

            return GetStateSnapshot();
        }

        public async Task<object> SignOutAsync()
        {
            var tok = LoadStoredToken();
            string? toRevoke = _accessToken ?? tok?.RefreshToken;
            ClearStoredToken();

            if (!string.IsNullOrWhiteSpace(toRevoke))
            {
                try
                {
                    await _http.PostAsync(RevokeEndpoint, new FormUrlEncodedContent(new Dictionary<string, string>
                    {
                        ["token"] = toRevoke
                    })).ConfigureAwait(false);
                }
                catch { }
            }

            return GetStateSnapshot();
        }

        public async Task<string> GetAccessTokenAsync(bool forceRefresh = false, CancellationToken ct = default)
        {
            await _authLock.WaitAsync(ct).ConfigureAwait(false);
            try
            {
                if (!forceRefresh && !string.IsNullOrEmpty(_accessToken) && _accessTokenExpiresUtc > DateTimeOffset.UtcNow.AddSeconds(60))
                {
                    return _accessToken;
                }

                var cfg = GetOAuthConfig();
                if (string.IsNullOrWhiteSpace(cfg.ClientId))
                {
                    throw new InvalidOperationException("drive:unconfigured");
                }

                var stored = LoadStoredToken();
                if (stored == null || string.IsNullOrWhiteSpace(stored.RefreshToken))
                {
                    throw new InvalidOperationException("drive:signedOut");
                }

                var form = new Dictionary<string, string>
                {
                    ["client_id"] = cfg.ClientId,
                    ["refresh_token"] = stored.RefreshToken,
                    ["grant_type"] = "refresh_token"
                };
                if (!string.IsNullOrWhiteSpace(cfg.ClientSecret))
                {
                    form["client_secret"] = cfg.ClientSecret;
                }

                using var resp = await _http.PostAsync(TokenEndpoint, new FormUrlEncodedContent(form), ct).ConfigureAwait(false);
                string body = await resp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                if (resp.StatusCode == HttpStatusCode.BadRequest || resp.StatusCode == HttpStatusCode.Unauthorized)
                {
                    ClearStoredToken();
                    throw new InvalidOperationException("drive:signedOut");
                }
                if (!resp.IsSuccessStatusCode)
                {
                    throw new InvalidOperationException($"drive:failed {body}");
                }

                using var doc = JsonDocument.Parse(body);
                _accessToken = doc.RootElement.GetProperty("access_token").GetString() ?? "";
                int expiresIn = doc.RootElement.TryGetProperty("expires_in", out var expEl) && expEl.TryGetInt32(out var sec) ? sec : 3600;
                _accessTokenExpiresUtc = DateTimeOffset.UtcNow.AddSeconds(Math.Max(60, expiresIn));
                return _accessToken;
            }
            finally
            {
                _authLock.Release();
            }
        }

        public async Task<object> BackupAllNotebooksAsync(CancellationToken ct = default)
        {
            string token = await GetAccessTokenAsync(false, ct).ConfigureAwait(false);
            string rootId = await EnsureRootFolderAsync(token, ct).ConfigureAwait(false);
            var tree = await ListDriveTreeAsync(token, rootId, ct).ConfigureAwait(false);

            var localFiles = NotebookBackupService.Instance.ListAllLocalNotebookFiles();
            int uploaded = 0;
            int updated = 0;

            foreach (var item in localFiles)
            {
                string parentId = await EnsureFolderPathAsync(token, rootId, item.Dir, tree.FolderPathToId, ct).ConfigureAwait(false);
                string fileName = item.Name + ".nrn";
                byte[] bytes = File.ReadAllBytes(item.FullPath);

                string key = string.IsNullOrEmpty(item.Dir) ? fileName : $"{item.Dir}/{fileName}";
                string? existingId = tree.FilePathToId.TryGetValue(key, out var found) ? found : null;

                await UploadDriveFileAsync(token, existingId, fileName, parentId, "application/octet-stream", bytes, ct).ConfigureAwait(false);
                if (existingId != null) updated++; else uploaded++;
            }

            // Đồng bộ luôn metadata session.json lên thư mục MinNote trên Drive
            string sessionPath = NotebookBackupService.Instance.SessionFilePath;
            if (File.Exists(sessionPath))
            {
                byte[] sessBytes = File.ReadAllBytes(sessionPath);
                string? existingSessId = tree.FilePathToId.TryGetValue("minnote_session.json", out var sid) ? sid : null;
                await UploadDriveFileAsync(token, existingSessId, "minnote_session.json", rootId, "application/json", sessBytes, ct).ConfigureAwait(false);
            }

            var stored = LoadStoredToken();
            string syncedAtUtc = DateTime.UtcNow.ToString("O");
            if (stored != null)
            {
                stored.RootFolderId = rootId;
                stored.LastSyncUtc = syncedAtUtc;
                SaveStoredToken(stored);
            }

            return new
            {
                uploaded,
                updated,
                totalFiles = localFiles.Count,
                email = stored?.Email ?? "",
                folderId = rootId,
                folderUrl = $"https://drive.google.com/drive/folders/{rootId}",
                syncedAtUtc
            };
        }

        public async Task<object> RestoreAllNotebooksAsync(CancellationToken ct = default)
        {
            string token = await GetAccessTokenAsync(false, ct).ConfigureAwait(false);
            string rootId = await EnsureRootFolderAsync(token, ct).ConfigureAwait(false);
            var tree = await ListDriveTreeAsync(token, rootId, ct).ConfigureAwait(false);

            var restored = new List<HydratedNotebookFile>();
            SessionSnapshotData? restoredSession = null;

            foreach (var entry in tree.Files)
            {
                if (string.Equals(entry.RelPath, "minnote_session.json", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        byte[] sessBytes = await DownloadDriveFileAsync(token, entry.Id, ct).ConfigureAwait(false);
                        string sessJson = Encoding.UTF8.GetString(sessBytes);
                        restoredSession = JsonSerializer.Deserialize<SessionSnapshotData>(sessJson, JsonOpts);
                        NotebookBackupService.WriteAllBytesAtomic(NotebookBackupService.Instance.SessionFilePath, sessBytes);
                    }
                    catch { }
                    continue;
                }

                if (!entry.Name.EndsWith(".nrn", StringComparison.OrdinalIgnoreCase)) continue;
                string nbName = entry.Name[..^4];
                if (string.IsNullOrWhiteSpace(nbName)) continue;

                byte[] bytes = await DownloadDriveFileAsync(token, entry.Id, ct).ConfigureAwait(false);
                NotebookBackupService.Instance.MirrorWriteFile(entry.Dir, nbName, bytes, entry.ModifiedMs);

                restored.Add(new HydratedNotebookFile
                {
                    Dir = entry.Dir,
                    Name = nbName,
                    ModifiedMs = entry.ModifiedMs,
                    SizeBytes = bytes.Length,
                    Base64 = Convert.ToBase64String(bytes)
                });
            }

            var stored = LoadStoredToken();
            if (stored != null)
            {
                stored.RootFolderId = rootId;
                stored.LastSyncUtc = DateTime.UtcNow.ToString("O");
                SaveStoredToken(stored);
            }

            return new
            {
                downloaded = restored.Count,
                files = restored,
                session = restoredSession,
                email = stored?.Email ?? "",
                folderId = rootId,
                folderUrl = $"https://drive.google.com/drive/folders/{rootId}"
            };
        }

        private static readonly HashSet<string> AllowedProxyMethods = new(StringComparer.OrdinalIgnoreCase)
        {
            "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"
        };

        public static bool IsAllowedGoogleApiProxyUri(string? url, out Uri? validatedUri)
        {
            validatedUri = null;
            if (string.IsNullOrWhiteSpace(url)) return false;
            string trimmed = url.Trim();

            // Check raw path portion before Uri.TryCreate normalizes backslashes ('\') or dot-segments ("..")
            int queryOrFragIdx = trimmed.IndexOfAny(['?', '#']);
            string rawBeforeQuery = queryOrFragIdx >= 0 ? trimmed[..queryOrFragIdx] : trimmed;
            if (rawBeforeQuery.Contains('\\') || rawBeforeQuery.Contains("..", StringComparison.Ordinal))
            {
                return false;
            }
            try
            {
                string rawUnescaped = Uri.UnescapeDataString(rawBeforeQuery);
                if (rawUnescaped.Contains('\\') || rawUnescaped.Contains("..", StringComparison.Ordinal))
                {
                    return false;
                }
            }
            catch
            {
                return false;
            }

            if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri)) return false;
            if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)) return false;
            if (!string.Equals(uri.Host, "www.googleapis.com", StringComparison.OrdinalIgnoreCase)) return false;
            if (!uri.IsDefaultPort) return false;
            if (!string.IsNullOrEmpty(uri.UserInfo)) return false;

            string absPath = uri.AbsolutePath;
            string unescapedPath;
            try
            {
                unescapedPath = Uri.UnescapeDataString(absPath);
            }
            catch
            {
                return false;
            }

            if (absPath.Contains("..", StringComparison.Ordinal)
                || unescapedPath.Contains("..", StringComparison.Ordinal)
                || absPath.Contains('\\')
                || unescapedPath.Contains('\\'))
            {
                return false;
            }

            bool allowedPath =
                absPath.StartsWith("/drive/v3/", StringComparison.OrdinalIgnoreCase) ||
                absPath.StartsWith("/upload/drive/v3/", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(absPath, "/oauth2/v2/userinfo", StringComparison.OrdinalIgnoreCase) ||
                absPath.StartsWith("/oauth2/v2/userinfo/", StringComparison.OrdinalIgnoreCase);

            if (!allowedPath) return false;

            validatedUri = uri;
            return true;
        }

        public async Task<object> ProxyRequestAsync(string method, string url, string? contentType, string? body, bool binary, CancellationToken ct = default)
        {
            if (!IsAllowedGoogleApiProxyUri(url, out var targetUri) || targetUri == null)
            {
                throw new ArgumentException("URL không thuộc phạm vi Google Drive API được phép.");
            }

            string httpMethodName = string.IsNullOrWhiteSpace(method) ? "GET" : method.Trim().ToUpperInvariant();
            if (!AllowedProxyMethods.Contains(httpMethodName))
            {
                throw new ArgumentException($"Phương thức HTTP không được phép: {httpMethodName}");
            }

            for (int attempt = 0; attempt < 2; attempt++)
            {
                string token = await GetAccessTokenAsync(attempt > 0, ct).ConfigureAwait(false);
                using var req = new HttpRequestMessage(new HttpMethod(httpMethodName), targetUri);
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                if (body != null)
                {
                    req.Content = new StringContent(body, Encoding.UTF8);
                    if (!string.IsNullOrWhiteSpace(contentType))
                    {
                        req.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
                    }
                }

                using var resp = await _http.SendAsync(req, ct).ConfigureAwait(false);
                if (resp.StatusCode == HttpStatusCode.Unauthorized && attempt == 0)
                {
                    continue;
                }

                if (binary && resp.IsSuccessStatusCode)
                {
                    byte[] bytes = await resp.Content.ReadAsByteArrayAsync(ct).ConfigureAwait(false);
                    return new { status = (int)resp.StatusCode, body = Convert.ToBase64String(bytes) };
                }

                string respBody = await resp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                return new { status = (int)resp.StatusCode, body = respBody };
            }

            return new { status = 401, body = "{}" };
        }

        public void OpenDriveFolderInBrowser()
        {
            var tok = LoadStoredToken();
            string url = !string.IsNullOrWhiteSpace(tok?.RootFolderId)
                ? $"https://drive.google.com/drive/folders/{tok.RootFolderId}"
                : "https://drive.google.com/drive/my-drive";
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        }

        #region Drive API v3 Helpers

        private async Task<(string Email, string DisplayName)> FetchUserProfileAsync(string accessToken, CancellationToken ct)
        {
            try
            {
                using var req = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)");
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                using var resp = await _http.SendAsync(req, ct).ConfigureAwait(false);
                string json = await resp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                if (resp.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("user", out var u))
                    {
                        string email = u.TryGetProperty("emailAddress", out var em) ? (em.GetString() ?? "") : "";
                        string name = u.TryGetProperty("displayName", out var dn) ? (dn.GetString() ?? "") : "";
                        return (email, name);
                    }
                }
            }
            catch { }
            return ("", "");
        }

        private async Task<string> EnsureRootFolderAsync(string accessToken, CancellationToken ct)
        {
            var tok = LoadStoredToken();
            if (!string.IsNullOrWhiteSpace(tok?.RootFolderId))
            {
                // Xác nhận thư mục chưa bị xóa trong Drive
                using var checkReq = new HttpRequestMessage(HttpMethod.Get, $"{DriveFilesApi}/{Uri.EscapeDataString(tok.RootFolderId)}?fields=id,trashed");
                checkReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                using var checkResp = await _http.SendAsync(checkReq, ct).ConfigureAwait(false);
                if (checkResp.IsSuccessStatusCode)
                {
                    string checkJson = await checkResp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                    using var doc = JsonDocument.Parse(checkJson);
                    bool trashed = doc.RootElement.TryGetProperty("trashed", out var tr) && tr.ValueKind == JsonValueKind.True;
                    if (!trashed) return tok.RootFolderId;
                }
            }

            // Tìm thư mục MinNote sẵn có do app tạo
            string q = Uri.EscapeDataString($"trashed = false and mimeType = '{FolderMime}' and appProperties has {{ key='minnote' and value='root' }}");
            using (var searchReq = new HttpRequestMessage(HttpMethod.Get, $"{DriveFilesApi}?q={q}&spaces=drive&fields=files(id,name,createdTime)"))
            {
                searchReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                using var searchResp = await _http.SendAsync(searchReq, ct).ConfigureAwait(false);
                if (searchResp.IsSuccessStatusCode)
                {
                    string sJson = await searchResp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                    using var doc = JsonDocument.Parse(sJson);
                    if (doc.RootElement.TryGetProperty("files", out var files) && files.GetArrayLength() > 0)
                    {
                        return files[0].GetProperty("id").GetString() ?? "";
                    }
                }
            }

            // Tạo thư mục "MinNote" trên Google Drive
            string createPayload = JsonSerializer.Serialize(new
            {
                name = RootFolderDisplayName,
                mimeType = FolderMime,
                appProperties = new Dictionary<string, string> { ["minnote"] = "root" }
            });
            using var createReq = new HttpRequestMessage(HttpMethod.Post, $"{DriveFilesApi}?fields=id")
            {
                Content = new StringContent(createPayload, Encoding.UTF8, "application/json")
            };
            createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            using var createResp = await _http.SendAsync(createReq, ct).ConfigureAwait(false);
            string cJson = await createResp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
            if (!createResp.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Không thể tạo thư mục MinNote trên Google Drive: {cJson}");
            }
            using var cDoc = JsonDocument.Parse(cJson);
            return cDoc.RootElement.GetProperty("id").GetString() ?? "";
        }

        private sealed class DriveTreeItem
        {
            public string Id { get; init; } = "";
            public string Name { get; init; } = "";
            public string Dir { get; init; } = "";
            public string RelPath => string.IsNullOrEmpty(Dir) ? Name : $"{Dir}/{Name}";
            public long ModifiedMs { get; init; }
        }

        private sealed class DriveTreeResult
        {
            public Dictionary<string, string> FolderPathToId { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, string> FilePathToId { get; } = new(StringComparer.OrdinalIgnoreCase);
            public List<DriveTreeItem> Files { get; } = new();
        }

        private async Task<DriveTreeResult> ListDriveTreeAsync(string accessToken, string rootId, CancellationToken ct)
        {
            var raw = new List<(string Id, string Name, string Parent, bool IsFolder, long ModifiedMs)>();
            string pageToken = "";
            do
            {
                string url = $"{DriveFilesApi}?q={Uri.EscapeDataString("trashed = false")}&spaces=drive&pageSize=1000&fields={Uri.EscapeDataString("nextPageToken,files(id,name,mimeType,parents,modifiedTime)")}"
                    + (string.IsNullOrEmpty(pageToken) ? "" : $"&pageToken={Uri.EscapeDataString(pageToken)}");
                using var req = new HttpRequestMessage(HttpMethod.Get, url);
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                using var resp = await _http.SendAsync(req, ct).ConfigureAwait(false);
                string json = await resp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                if (!resp.IsSuccessStatusCode)
                {
                    throw new InvalidOperationException($"Không thể đọc danh sách tệp trên Drive ({(int)resp.StatusCode}): {json}");
                }

                using var doc = JsonDocument.Parse(json);
                pageToken = doc.RootElement.TryGetProperty("nextPageToken", out var pt) ? (pt.GetString() ?? "") : "";
                if (doc.RootElement.TryGetProperty("files", out var files))
                {
                    foreach (var f in files.EnumerateArray())
                    {
                        string id = f.GetProperty("id").GetString() ?? "";
                        string name = f.GetProperty("name").GetString() ?? "";
                        string mime = f.GetProperty("mimeType").GetString() ?? "";
                        string parent = f.TryGetProperty("parents", out var pArr) && pArr.GetArrayLength() > 0
                            ? (pArr[0].GetString() ?? "")
                            : "";
                        long mtime = 0;
                        if (f.TryGetProperty("modifiedTime", out var mt) && DateTimeOffset.TryParse(mt.GetString(), out var dto))
                        {
                            mtime = dto.ToUnixTimeMilliseconds();
                        }
                        raw.Add((id, name, parent, mime == FolderMime, mtime));
                    }
                }
            } while (!string.IsNullOrEmpty(pageToken));

            var byId = raw.ToDictionary(x => x.Id, x => x);
            var folderRelCache = new Dictionary<string, string?> { [rootId] = "" };

            string? ResolveFolderPath(string folderId, int depth = 0)
            {
                if (folderRelCache.TryGetValue(folderId, out var cached)) return cached;
                if (depth > 32 || !byId.TryGetValue(folderId, out var node) || !node.IsFolder)
                {
                    folderRelCache[folderId] = null;
                    return null;
                }
                string? parentPath = ResolveFolderPath(node.Parent, depth + 1);
                string? full = parentPath == null ? null : (string.IsNullOrEmpty(parentPath) ? node.Name : $"{parentPath}/{node.Name}");
                folderRelCache[folderId] = full;
                return full;
            }

            var res = new DriveTreeResult();
            res.FolderPathToId[""] = rootId;

            foreach (var item in raw.Where(x => x.IsFolder && x.Id != rootId))
            {
                string? p = ResolveFolderPath(item.Id);
                if (p != null && !res.FolderPathToId.ContainsKey(p))
                {
                    res.FolderPathToId[p] = item.Id;
                }
            }

            foreach (var item in raw.Where(x => !x.IsFolder))
            {
                string? dir = ResolveFolderPath(item.Parent);
                if (dir == null) continue;
                var entry = new DriveTreeItem
                {
                    Id = item.Id,
                    Name = item.Name,
                    Dir = dir,
                    ModifiedMs = item.ModifiedMs
                };
                res.Files.Add(entry);
                res.FilePathToId[entry.RelPath] = item.Id;
            }

            return res;
        }

        private async Task<string> EnsureFolderPathAsync(
            string accessToken,
            string rootId,
            string relDir,
            Dictionary<string, string> folderMap,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(relDir)) return rootId;
            if (folderMap.TryGetValue(relDir, out var existing)) return existing;

            string curPath = "";
            string curParentId = rootId;
            foreach (string seg in relDir.Split('/', StringSplitOptions.RemoveEmptyEntries))
            {
                curPath = string.IsNullOrEmpty(curPath) ? seg : $"{curPath}/{seg}";
                if (folderMap.TryGetValue(curPath, out var id))
                {
                    curParentId = id;
                    continue;
                }

                string payload = JsonSerializer.Serialize(new
                {
                    name = seg,
                    mimeType = FolderMime,
                    parents = new[] { curParentId }
                });
                using var req = new HttpRequestMessage(HttpMethod.Post, $"{DriveFilesApi}?fields=id")
                {
                    Content = new StringContent(payload, Encoding.UTF8, "application/json")
                };
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                using var resp = await _http.SendAsync(req, ct).ConfigureAwait(false);
                string json = await resp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                if (!resp.IsSuccessStatusCode)
                {
                    throw new InvalidOperationException($"Không thể tạo thư mục con '{curPath}' trên Drive: {json}");
                }
                using var doc = JsonDocument.Parse(json);
                string createdId = doc.RootElement.GetProperty("id").GetString() ?? "";
                folderMap[curPath] = createdId;
                curParentId = createdId;
            }
            return curParentId;
        }

        private async Task UploadDriveFileAsync(
            string accessToken,
            string? existingFileId,
            string fileName,
            string parentId,
            string contentMime,
            byte[] data,
            CancellationToken ct)
        {
            string metadataJson = existingFileId != null
                ? "{}"
                : JsonSerializer.Serialize(new { name = fileName, parents = new[] { parentId }, mimeType = contentMime });

            using var multipart = new MultipartContent("related");
            var metaContent = new StringContent(metadataJson, Encoding.UTF8, "application/json");
            var fileContent = new ByteArrayContent(data);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentMime);
            multipart.Add(metaContent);
            multipart.Add(fileContent);

            string url = existingFileId != null
                ? $"{DriveUploadApi}/{Uri.EscapeDataString(existingFileId)}?uploadType=multipart&fields=id,modifiedTime"
                : $"{DriveUploadApi}?uploadType=multipart&fields=id,modifiedTime";

            using var req = new HttpRequestMessage(existingFileId != null ? HttpMethod.Patch : HttpMethod.Post, url)
            {
                Content = multipart
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            using var resp = await _http.SendAsync(req, ct).ConfigureAwait(false);
            string body = await resp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
            if (!resp.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Lỗi tải '{fileName}' lên Drive ({(int)resp.StatusCode}): {body}");
            }
        }

        private async Task<byte[]> DownloadDriveFileAsync(string accessToken, string fileId, CancellationToken ct)
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{DriveFilesApi}/{Uri.EscapeDataString(fileId)}?alt=media");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            using var resp = await _http.SendAsync(req, ct).ConfigureAwait(false);
            if (!resp.IsSuccessStatusCode)
            {
                string err = await resp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                throw new InvalidOperationException($"Lỗi tải tệp từ Drive ({(int)resp.StatusCode}): {err}");
            }
            return await resp.Content.ReadAsByteArrayAsync(ct).ConfigureAwait(false);
        }

        private static string Base64UrlEncode(byte[] bytes) =>
            Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        private static string BuildFormQuery(Dictionary<string, string> items) =>
            string.Join("&", items.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));

        private static Dictionary<string, string> ParseQueryString(string query)
        {
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            string q = query.TrimStart('?');
            if (string.IsNullOrEmpty(q)) return dict;
            foreach (string part in q.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                int eq = part.IndexOf('=');
                if (eq < 0) dict[Uri.UnescapeDataString(part)] = "";
                else dict[Uri.UnescapeDataString(part[..eq])] = Uri.UnescapeDataString(part[(eq + 1)..]);
            }
            return dict;
        }

        private static string BuildCallbackHtml(bool ok, string title, string message)
        {
            string color = ok ? "#2563eb" : "#dc2626";
            return $@"<!doctype html>
<html lang=""vi"">
<head><meta charset=""utf-8""><title>{WebUtility.HtmlEncode(title)}</title></head>
<body style=""margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;"">
  <div style=""background:#1e293b;border:1px solid #334155;border-radius:14px;padding:28px 32px;max-width:460px;text-align:center;box-shadow:0 20px 45px rgba(0,0,0,0.45);"">
    <div style=""width:48px;height:48px;border-radius:50%;background:{color};color:#fff;font-size:24px;line-height:48px;margin:0 auto 14px;font-weight:700;"">{(ok ? "✓" : "!")}</div>
    <h2 style=""margin:0 0 10px;font-size:19px;"">{WebUtility.HtmlEncode(title)}</h2>
    <p style=""margin:0 0 18px;font-size:14px;line-height:1.55;color:#cbd5e1;"">{message}</p>
    <button onclick=""window.close()"" style=""padding:10px 20px;border-radius:8px;border:none;background:{color};color:#fff;font-weight:600;cursor:pointer;"">Đóng tab này</button>
  </div>
</body>
</html>";
        }

        #endregion
    }
}
