using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace MinNote.Services;

public class LicenseInfo
{
    // SEC-19: mặc định fail-closed — thiếu trường trong JSON không được thành premium
    public bool Ok { get; set; } = false;
    public string MachineId { get; set; } = string.Empty;
    public string Status { get; set; } = "unregistered";
    public string Tier { get; set; } = "basic";
    public string Name { get; set; } = string.Empty;
    public string Expiry { get; set; } = "Vĩnh viễn";
    public string Note { get; set; } = string.Empty;
    public string IssuedAt { get; set; } = string.Empty;
    public string LastCheck { get; set; } = string.Empty;
    public string Message { get; set; } = "OK";
    public bool FromCache { get; set; } = false;
    public bool Offline { get; set; } = false;
    public string AdminApiKey { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
    public List<string> Features { get; set; } = new();

    // SEC-18: bản license do server ký (ECDSA); có mặt thì mọi trường quyền được dựng lại từ đây
    public string ServerPayload { get; set; } = string.Empty;
    public string ServerSignature { get; set; } = string.Empty;
    public bool IsServerSigned => !string.IsNullOrEmpty(ServerPayload);

    public bool IsActive => (string.Equals(Status, "active", StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(Status, "trial", StringComparison.OrdinalIgnoreCase)) && !IsExpired;

    // SEC-21: hết hạn tính theo cuối ngày Expiry (UTC)
    public bool IsExpired => ParseExpiryUtc(Expiry) is DateTime exp && DateTime.UtcNow.Date > exp.Date;

    private static readonly string[] ExpiryFormats = ["yyyy-MM-dd", "dd-MM-yyyy", "dd/MM/yyyy", "yyyy/MM/dd"];

    /// <summary>
    /// null = không có hạn ("Vĩnh viễn", "Chế độ dùng thử"...). Chuỗi bắt đầu bằng số nhưng
    /// không parse được → DateTime.MinValue (fail-closed, coi như hết hạn).
    /// </summary>
    public static DateTime? ParseExpiryUtc(string? expiry)
    {
        string s = (expiry ?? string.Empty).Trim();
        if (s.Length == 0 || !char.IsDigit(s[0])) return null;
        if (DateTime.TryParseExact(s, ExpiryFormats, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal, out var d))
            return d;
        if (DateTime.TryParse(s, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal, out d))
            return d;
        return DateTime.MinValue;
    }

    public string DisplayTier
    {
        get
        {
            string t = (Tier ?? "PRO").ToUpperInvariant();
            return t switch
            {
                "ULTRA" => "ULTRA",
                "VIP" => "VIP",
                "PREMIUM" => "PREMIUM",
                "PRO" => "PRO",
                "BASIC" => "BASIC",
                "CUSTOM" or "CUST" => "TÙY CHỌN LẺ",
                _ => t
            };
        }
    }

    public string BadgeText => IsActive
        ? (string.Equals(Status, "trial", StringComparison.OrdinalIgnoreCase) ? $"DÙNG THỬ {DisplayTier}" : $"ĐÃ KÍCH HOẠT {DisplayTier}")
        : (string.Equals(Status, "revoked", StringComparison.OrdinalIgnoreCase) ? "ĐÃ KHÓA / THU HỒI"
            : IsExpired ? "ĐÃ HẾT HẠN" : "CHƯA KÍCH HOẠT");

    public string BadgeColor => IsExpired && !string.Equals(Status, "revoked", StringComparison.OrdinalIgnoreCase) ? "#F59E0B" : Status?.ToLowerInvariant() switch
    {
        "active" => "#10B981",
        "trial" => "#0284C7",
        "expired" => "#F59E0B",
        "revoked" => "#EF4444",
        _ => "#6B7280"
    };
}

public class SupabaseLicenseService
{
    public static SupabaseLicenseService Instance { get; } = new();

    // Ẩn giấu chuỗi nhạy cảm (String Obfuscation via XOR masking) chống công cụ REA / dnSpy / strings
    private static readonly byte[] ObfuscatedUrl = [
        0x32, 0x2E, 0x2E, 0x2A, 0x29, 0x60, 0x75, 0x75, 0x28, 0x30, 0x33, 0x36, 0x3B, 0x20, 0x36, 0x22,
        0x28, 0x36, 0x2B, 0x29, 0x2B, 0x2C, 0x35, 0x38, 0x35, 0x38, 0x2C, 0x39, 0x74, 0x29, 0x2F, 0x2A,
        0x3B, 0x38, 0x3B, 0x29, 0x3F, 0x74, 0x39, 0x35
    ];

    private static readonly byte[] ObfuscatedKey = [
        0x29, 0x38, 0x05, 0x2A, 0x2F, 0x38, 0x36, 0x33, 0x29, 0x32, 0x3B, 0x38, 0x36, 0x3F, 0x05, 0x6E,
        0x22, 0x1B, 0x6D, 0x6C, 0x05, 0x0C, 0x34, 0x15, 0x6C, 0x1F, 0x1F, 0x6F, 0x1B, 0x36, 0x23, 0x31,
        0x10, 0x0A, 0x1B, 0x3F, 0x3D, 0x05, 0x0C, 0x3D, 0x2D, 0x00, 0x13, 0x1D, 0x6E, 0x10
    ];

    private static readonly byte[] ObfuscatedSalt = [
        0x17, 0x1F, 0x1B, 0x05, 0x2C, 0x6F, 0x05, 0x09, 0x1F, 0x19, 0x0F, 0x08, 0x1F, 0x05, 0x09, 0x1B,
        0x16, 0x0E, 0x05, 0x63, 0x1C, 0x62, 0x68, 0x1B, 0x6E, 0x05, 0x1E, 0x15, 0x17, 0x13, 0x14, 0x12,
        0x05, 0x17, 0x1B, 0x0E, 0x12
    ];

    public static string SupabaseUrl => Deobfuscate(ObfuscatedUrl);
    public static string SupabaseAnonKey => Deobfuscate(ObfuscatedKey);
    private static string SecretSalt => Deobfuscate(ObfuscatedSalt);

    private static string Deobfuscate(byte[] data, byte mask = 0x5A)
    {
        var chars = new char[data.Length];
        for (int i = 0; i < data.Length; i++) chars[i] = (char)(data[i] ^ mask);
        return new string(chars);
    }

    public const string BankId = "VCB";
    public const string BankAccountNo = "1017919118";
    public const string BankAccountName = "DO HUYNH BINH MINH";
    public const string AdminPhone = "033.999.8261";
    public const string AdminEmail = "domiinh.369@gmail.com";

    private readonly HttpClient _httpClient;
    private readonly string _cacheFilePath;
    private readonly string _pyCacheFilePath;
    private string _machineId;
    private LicenseInfo? _currentLicense;
    private readonly bool _isCustomCache;
    private LicenseRpcClient? _licenseRpcClient;

    // Lazy: Instance (static) khởi tạo trước các mảng URL/key làm rối nên không dùng SupabaseUrl trong constructor
    private LicenseRpcClient _licenseRpc => _licenseRpcClient ??= new LicenseRpcClient(_httpClient, SupabaseUrl, SupabaseAnonKey);

    public event EventHandler<LicenseInfo>? LicenseChanged;

    public SupabaseLicenseService(HttpClient? httpClient = null, string? customCachePath = null, string? customMachineId = null)
    {
        _httpClient = httpClient ?? new HttpClient();
        _httpClient.Timeout = TimeSpan.FromSeconds(8);
        _machineId = !string.IsNullOrWhiteSpace(customMachineId) ? customMachineId : HardwareInfoService.GetMachineId();

        string userHome = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        _pyCacheFilePath = Path.Combine(userHome, ".exam_generator", "license_cache.json");

        if (!string.IsNullOrEmpty(customCachePath))
        {
            _cacheFilePath = customCachePath;
            _isCustomCache = true;
        }
        else
        {
            _isCustomCache = false;
            string localApp = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MatrixExamAI");
            Directory.CreateDirectory(localApp);
            _cacheFilePath = Path.Combine(localApp, "license_cache.json");
        }
    }

    public LicenseInfo GetCurrentLicense()
    {
        if (_currentLicense != null) return _currentLicense;
        _currentLicense = LoadCache() ?? CreateDefaultFallback(_machineId);
        return _currentLicense;
    }

    public async Task<LicenseInfo> CheckLicenseAsync(bool forceOnline = false, CancellationToken ct = default)
    {
        string mid = _machineId;

        if (!forceOnline)
        {
            var cached = LoadCache();
            if (cached != null && string.Equals(cached.MachineId, mid, StringComparison.OrdinalIgnoreCase))
            {
                cached.FromCache = true;
                _currentLicense = cached;
                // Đồng bộ ngầm với Supabase Cloud ngay khi có mạng không làm chậm khởi động app
                _ = Task.Run(async () =>
                {
                    try { await CheckLicenseAsync(forceOnline: true, ct); } catch { }
                });
                return cached;
            }
        }

        // SEC-18 pha D: chỉ đọc qua RPC get_license và CHỈ tin license có chữ ký hợp lệ của admin.
        // Không còn đọc/ghi bảng licenses trực tiếp (anon sẽ bị thu hồi quyền).
        var rpc = await _licenseRpc.GetLicenseAsync(mid, ct);
        if (rpc.Reachable)
        {
            if (!rpc.Found) return Commit(CreateUnregistered(mid));
            using var rowDoc = JsonDocument.Parse(rpc.RowJson);
            string adminApiKey = Prop(rowDoc.RootElement, "admin_api_key");
            var info = BuildFromSigned(rpc.SignedPayload, rpc.Signature, adminApiKey, mid) ?? CreateUnsigned(mid, rpc.Signature);
            _ = _licenseRpc.TouchAsync(mid);
            return Commit(info);
        }

        // Offline/lỗi mạng: chỉ dùng cache có chữ ký admin, không có thì về chế độ dùng thử
        var fallback = LoadCache() ?? CreateDefaultFallback(mid);
        fallback.Offline = true;
        _currentLicense = fallback;
        LicenseChanged?.Invoke(this, fallback);
        return fallback;
    }

    private LicenseInfo Commit(LicenseInfo info)
    {
        SaveCache(info);
        _currentLicense = info;
        LicenseChanged?.Invoke(this, info);
        return info;
    }

    private static LicenseInfo CreateUnregistered(string mid) => new()
    {
        Ok = false,
        MachineId = mid,
        Status = "unregistered",
        Tier = "trial",
        Name = "Chưa đăng ký",
        Expiry = "Chưa kích hoạt",
        Message = "Thiết bị chưa được cấp quyền. Hãy gửi Mã máy cho Quản trị viên để kích hoạt.",
        FromCache = false,
        Offline = false
    };

    /// <summary>Máy có trong DB nhưng license chưa được ký (hoặc chữ ký sai) → chưa kích hoạt.</summary>
    private static LicenseInfo CreateUnsigned(string mid, string signature) => new()
    {
        Ok = false,
        MachineId = mid,
        Status = "unsigned",
        Tier = "basic",
        Name = "Chưa xác thực",
        Expiry = "Chưa kích hoạt",
        Message = string.IsNullOrEmpty(signature)
            ? "Bản quyền của máy này chưa được Quản trị viên ký số. Vui lòng liên hệ Quản trị viên."
            : "Chữ ký bản quyền không hợp lệ. Vui lòng liên hệ Quản trị viên.",
        FromCache = false,
        Offline = false
    };

    private static string Prop(JsonElement row, string name, string fallback = "") =>
        row.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String ? (p.GetString() ?? fallback) : fallback;

    /// <summary>Dựng LicenseInfo từ một row bảng licenses (Supabase trực tiếp hoặc payload server đã ký).</summary>
    public static LicenseInfo BuildLicenseFromRow(JsonElement row, string mid)
    {
        // Thiếu trường thì mặc định thận trọng (không còn mặc định premium)
        string status = Prop(row, "status", "unregistered");
        string tier = Prop(row, "tier", "basic");
        string name = Prop(row, "name", "Khách hàng");
        string expiryRaw = Prop(row, "expiry");
        string expiry = string.IsNullOrWhiteSpace(expiryRaw) ? "Vĩnh viễn" : expiryRaw;

        bool isOnlineActive = string.Equals(status, "active", StringComparison.OrdinalIgnoreCase) ||
                              string.Equals(status, "trial", StringComparison.OrdinalIgnoreCase);

        var featList = new List<string>();
        string note = Prop(row, "note");
        if (note.Contains("FEATURES:", StringComparison.OrdinalIgnoreCase))
        {
            int idx = note.IndexOf("FEATURES:", StringComparison.OrdinalIgnoreCase);
            string sub = note.Substring(idx + "FEATURES:".Length);
            if (sub.Contains("|")) sub = sub.Substring(0, sub.IndexOf("|"));
            var parts = sub.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
            featList.AddRange(parts.Select(p => p.Trim().ToLowerInvariant()));
        }
        if (row.TryGetProperty("features", out var pFt) && pFt.ValueKind == JsonValueKind.Array)
        {
            foreach (var it in pFt.EnumerateArray())
            {
                string? s = it.ValueKind == JsonValueKind.String ? it.GetString() : null;
                if (!string.IsNullOrEmpty(s)) featList.Add(s.Trim().ToLowerInvariant());
            }
        }

        // Nếu không ghi nhận tính năng lẻ, gán theo gói mặc định
        if (featList.Count == 0 && isOnlineActive)
        {
            if (FeatureGateService.Packages.TryGetValue(tier.ToUpperInvariant(), out var tp) ||
                FeatureGateService.Packages.TryGetValue(tier, out tp))
            {
                featList = new List<string>(tp.IncludedFeatureIds);
            }
            else if (tier is "ultra" or "vip" or "premium")
            {
                featList = FeatureGateService.Catalog.Select(c => c.Id).ToList();
            }
        }

        var info = new LicenseInfo
        {
            Ok = isOnlineActive,
            MachineId = mid,
            Status = status,
            Tier = tier,
            Features = featList.Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            Name = name,
            Expiry = expiry,
            Note = note,
            IssuedAt = Prop(row, "issued_at"),
            LastCheck = DateTime.UtcNow.ToString("o"),
            AdminApiKey = Prop(row, "admin_api_key"),
            Message = isOnlineActive ? "Đã xác thực bản quyền trực tuyến thành công" : "Bản quyền đã bị khóa hoặc thu hồi bởi Quản trị viên trên Cloud.",
            FromCache = false,
            Offline = false
        };
        if (info.IsExpired)
        {
            info.Ok = false;
            info.Message = $"Bản quyền đã hết hạn ngày {expiry}. Vui lòng gia hạn.";
        }
        return info;
    }

    /// <summary>
    /// Dựng license từ payload đã ký trên máy admin; null nếu chữ ký sai, payload hỏng hoặc của máy khác.
    /// </summary>
    public static LicenseInfo? BuildFromSigned(string payloadB64, string signature, string adminApiKey, string mid)
    {
        if (!LicenseRpcClient.TryVerify(payloadB64, signature, out string json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var row = doc.RootElement;
            if (!string.Equals(Prop(row, "machine_id"), mid, StringComparison.OrdinalIgnoreCase)) return null;

            var info = BuildLicenseFromRow(row, mid);
            info.AdminApiKey = adminApiKey ?? string.Empty;
            info.ServerPayload = payloadB64;
            info.ServerSignature = signature;
            return info;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Đã ngừng kích hoạt bằng mã (SEC-18): mã thuật toán sinh được từ salt đã lộ. Khách gửi Machine ID,
    /// admin cấp quyền + ký license trên máy admin; app tự nhận khi kiểm tra trực tuyến.
    /// </summary>
    public async Task<LicenseInfo> ActivateWithKeyAsync(string licenseKey, string ownerName, CancellationToken ct = default)
    {
        var refreshed = await CheckLicenseAsync(forceOnline: true, ct);
        if (refreshed.IsActive && !string.Equals(refreshed.Status, "trial", StringComparison.OrdinalIgnoreCase))
        {
            return refreshed;
        }
        return new LicenseInfo
        {
            Ok = false,
            MachineId = _machineId,
            Status = "key_activation_disabled",
            Message = $"Kích hoạt bằng mã đã ngừng. Vui lòng gửi Machine ID {_machineId} cho quản trị viên " +
                      $"({AdminPhone} / {AdminEmail}); bản quyền sẽ tự cập nhật khi app có mạng."
        };
    }

    public static string GetVietQrUrl(string machineId, string packageCode, string amount)
    {
        string amt = amount.Replace(".", "").Replace(" đ", "").Replace(" d", "").Replace(",", "").Trim();
        string content = Uri.EscapeDataString($"{machineId} {packageCode}".Trim());
        string accName = Uri.EscapeDataString(BankAccountName);
        return $"https://img.vietqr.io/image/{BankId}-{BankAccountNo}-qr_only.png?amount={amt}&addInfo={content}&accountName={accName}";
    }

    public static async System.Threading.Tasks.Task<System.Windows.Media.Imaging.BitmapImage?> GetVietQrBitmapAsync(string machineId, string packageCode, string amount)
    {
        try
        {
            string amt = amount.Replace(".", "").Replace(" đ", "").Replace(" d", "").Replace(",", "").Trim();
            string content = $"{machineId} {packageCode}".Trim();
            long amtNum = long.TryParse(amt, out var v) ? v : 0;

            var payload = new
            {
                accountNo = BankAccountNo,
                accountName = BankAccountName,
                acqId = "970436",
                amount = amtNum,
                addInfo = content,
                format = "text",
                template = "compact2"
            };

            using var client = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(8) };
            var json = System.Text.Json.JsonSerializer.Serialize(payload);
            using var strContent = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");
            var resp = await client.PostAsync("https://api.vietqr.io/v2/generate", strContent);
            if (resp.IsSuccessStatusCode)
            {
                var respJson = await resp.Content.ReadAsStringAsync();
                using var doc = System.Text.Json.JsonDocument.Parse(respJson);
                if (doc.RootElement.TryGetProperty("data", out var dataElem) &&
                    dataElem.TryGetProperty("qrDataURL", out var qrDataUrlElem))
                {
                    string? qrDataUrl = qrDataUrlElem.GetString();
                    if (!string.IsNullOrEmpty(qrDataUrl) && qrDataUrl.Contains(","))
                    {
                        string base64 = qrDataUrl.Substring(qrDataUrl.IndexOf(',') + 1);
                        byte[] bytes = Convert.FromBase64String(base64);
                        var bmp = new System.Windows.Media.Imaging.BitmapImage();
                        bmp.BeginInit();
                        bmp.StreamSource = new System.IO.MemoryStream(bytes);
                        bmp.CacheOption = System.Windows.Media.Imaging.BitmapCacheOption.OnLoad;
                        bmp.EndInit();
                        bmp.Freeze();
                        return bmp;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[VietQR] API Generate error: {ex.Message}");
        }

        try
        {
            string fallbackUrl = GetVietQrUrl(machineId, packageCode, amount);
            using var client2 = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(8) };
            byte[] bytes2 = await client2.GetByteArrayAsync(fallbackUrl);
            var bmp2 = new System.Windows.Media.Imaging.BitmapImage();
            bmp2.BeginInit();
            bmp2.StreamSource = new System.IO.MemoryStream(bytes2);
            bmp2.CacheOption = System.Windows.Media.Imaging.BitmapCacheOption.OnLoad;
            bmp2.EndInit();
            bmp2.Freeze();
            return bmp2;
        }
        catch (Exception ex2)
        {
            System.Diagnostics.Debug.WriteLine($"[VietQR] Fallback download error: {ex2.Message}");
            return null;
        }
    }

    private LicenseInfo CreateDefaultFallback(string mid)
    {
        return new LicenseInfo
        {
            Ok = true,
            MachineId = mid,
            Status = "trial",
            Tier = "basic",
            Features = new List<string>(FeatureGateService.Packages["BASIC"].IncludedFeatureIds),
            Name = "Bản dùng thử (Trial)",
            Expiry = "Chế độ dùng thử",
            Message = "Bản quyền MatrixExamAI Pro (Chế độ dùng thử)",
            FromCache = false,
            Offline = true
        };
    }

    public static string ComputeSignature(LicenseInfo info, string machineId)
    {
        string featStr = string.Join(",", (info.Features ?? new()).OrderBy(x => x));
        string payload = $"{machineId}|{info.Status}|{info.Tier}|{info.Expiry}|{info.IssuedAt}|{info.Name}|{featStr}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(SecretSalt + machineId));
        byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash);
    }

    public static bool VerifySignature(LicenseInfo info, string machineId)
    {
        if (string.IsNullOrEmpty(info.Signature)) return false;
        string expected = ComputeSignature(info, machineId);
        byte[] expectedBytes = Encoding.UTF8.GetBytes(expected);
        byte[] actualBytes = Encoding.UTF8.GetBytes(info.Signature);
        if (CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes)) return true;

        // Tương thích ngược với file cache cũ trước khi có trường Features
        string legacyPayload = $"{machineId}|{info.Status}|{info.Tier}|{info.Expiry}|{info.IssuedAt}|{info.Name}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(SecretSalt + machineId));
        byte[] legacyHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(legacyPayload));
        byte[] expectedLegacyBytes = Encoding.UTF8.GetBytes(Convert.ToHexString(legacyHash));
        return CryptographicOperations.FixedTimeEquals(expectedLegacyBytes, actualBytes);
    }

    private static byte[] EncryptCache(byte[] plain, string machineId)
    {
        using var aes = Aes.Create();
        using var sha = SHA256.Create();
        aes.Key = sha.ComputeHash(Encoding.UTF8.GetBytes(SecretSalt + machineId));
        aes.IV = sha.ComputeHash(Encoding.UTF8.GetBytes(machineId + SecretSalt))[..16];
        using var ms = new MemoryStream();
        using (var cs = new CryptoStream(ms, aes.CreateEncryptor(), CryptoStreamMode.Write))
        {
            cs.Write(plain, 0, plain.Length);
        }
        return ms.ToArray();
    }

    private static byte[]? DecryptCache(byte[] cipher, string machineId)
    {
        try
        {
            using var aes = Aes.Create();
            using var sha = SHA256.Create();
            aes.Key = sha.ComputeHash(Encoding.UTF8.GetBytes(SecretSalt + machineId));
            aes.IV = sha.ComputeHash(Encoding.UTF8.GetBytes(machineId + SecretSalt))[..16];
            using var ms = new MemoryStream();
            using (var cs = new CryptoStream(new MemoryStream(cipher), aes.CreateDecryptor(), CryptoStreamMode.Read))
            {
                cs.CopyTo(ms);
            }
            return ms.ToArray();
        }
        catch
        {
            return null;
        }
    }

    public LicenseInfo? LoadCache()
    {
        string mid = _machineId;

        // 1. Thử file cache C#
        if (File.Exists(_cacheFilePath))
        {
            try
            {
                byte[] fileBytes = File.ReadAllBytes(_cacheFilePath);
                // SEC-19: không nhận cache văn bản rõ nữa; máy có cache cũ sẽ được đồng bộ lại từ cloud
                if (fileBytes.Length == 0 || fileBytes[0] == '{') return null;

                byte[]? decrypted = DecryptCache(fileBytes, mid);
                if (decrypted == null) return null;
                string json = Encoding.UTF8.GetString(decrypted);

                var info = JsonSerializer.Deserialize<LicenseInfo>(json);
                if (info != null && !string.IsNullOrEmpty(info.MachineId))
                {
                    // 1.1 Kiểm tra gắn kết máy
                    if (!string.Equals(info.MachineId, mid, StringComparison.OrdinalIgnoreCase))
                    {
                        return null;
                    }

                    // 1.2 Kiểm tra chữ ký toàn vẹn HMAC — thiếu/sai chữ ký đều từ chối, không tự ký lại
                    if (!VerifySignature(info, mid))
                    {
                        return null;
                    }

                    // 1.3 Chống lùi giờ hệ thống (Clock-rollback tampering)
                    if (DateTime.TryParse(info.LastCheck, out var dtLast) && dtLast > DateTime.UtcNow.AddDays(2))
                    {
                        return null;
                    }

                    // 1.4 SEC-18: cache có license server ký → dựng lại toàn bộ quyền từ payload đã verify,
                    // sửa Status/Tier/Expiry trong file cache (dù đã ký lại HMAC) cũng không có tác dụng
                    if (info.IsServerSigned)
                    {
                        var trusted = BuildFromSigned(info.ServerPayload, info.ServerSignature, info.AdminApiKey, mid);
                        if (trusted == null) return null;
                        trusted.LastCheck = info.LastCheck;
                        trusted.FromCache = true;
                        return trusted;
                    }

                    // Pha D: cache không có chữ ký admin chỉ được giữ khi không cấp quyền gì (chưa đăng ký/chưa ký/khóa)
                    if (info.IsActive) return null;

                    if (info.Features == null || info.Features.Count == 0)
                    {
                        string t = (info.Tier ?? "").Trim().ToUpperInvariant();
                        if (t is "ULTRA" or "VIP" or "PREMIUM")
                            info.Features = FeatureGateService.Catalog.Select(c => c.Id).ToList();
                        else if (FeatureGateService.Packages.TryGetValue(t, out var pkg))
                            info.Features = new List<string>(pkg.IncludedFeatureIds);
                    }

                    info.FromCache = true;
                    return info;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[SupabaseLicenseService] LoadCache error: {ex.Message}");
            }
        }

        // SEC-20: không còn đọc cache Python (~/.exam_generator) vì file đó không có chữ ký kiểm được.
        // File vẫn được ghi trong SaveCache để bản Python cũ hiển thị thông tin.
        return null;
    }

    public void SaveCache(LicenseInfo info)
    {
        try
        {
            if (_isCustomCache && !string.IsNullOrEmpty(info.MachineId))
            {
                _machineId = info.MachineId;
            }

            string mid = _machineId;
            info.MachineId = mid;
            info.Signature = ComputeSignature(info, mid);

            string json = JsonSerializer.Serialize(info, new JsonSerializerOptions { WriteIndented = false });
            byte[] encrypted = EncryptCache(Encoding.UTF8.GetBytes(json), mid);
            File.WriteAllBytes(_cacheFilePath, encrypted);

            // Ghi dự phòng vào .exam_generator để đồng bộ chéo
            if (!_isCustomCache)
            {
                try
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(_pyCacheFilePath)!);
                    var pyObj = new
                    {
                        ok = info.Ok,
                        mid = info.MachineId,
                        status = info.Status,
                        tier = info.Tier,
                        name = info.Name,
                        expiry = info.Expiry,
                        cached_at = DateTime.UtcNow.ToString("o"),
                        signature = info.Signature
                    };
                    File.WriteAllText(_pyCacheFilePath, JsonSerializer.Serialize(pyObj, new JsonSerializerOptions { WriteIndented = true }));
                }
                catch { }
            }
        }
        catch { }
    }
}
