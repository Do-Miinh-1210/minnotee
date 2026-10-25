using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace MinNote.Services;

/// <summary>
/// Kết quả RPC get_license. Reachable=false (lỗi mạng, hàm chưa tạo trên DB) → caller fallback đường cũ.
/// RowJson là object JSON của đúng máy này (rỗng khi chưa đăng ký).
/// </summary>
public record LicenseRpcResult(bool Reachable, bool Found, string RowJson, string SignedPayload, string Signature);

/// <summary>
/// SEC-18 (không server): license được ký trên máy admin (admin/license_signing.py) và lưu trong bảng licenses.
/// Desktop đọc qua RPC security definer chỉ trả đúng 1 máy, rồi verify chữ ký bằng public key nhúng sẵn.
/// </summary>
public class LicenseRpcClient
{
    private const string PublicKeyPem = """
        -----BEGIN PUBLIC KEY-----
        MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEMxKM+zT4UCqwwChZaqVD7Mmx0J1t
        n2a+2nVKEEVMR/p/4g4NOG5Aza3GolnLx2VAMiD6ppYkvhy6ZanbCu20Yw==
        -----END PUBLIC KEY-----
        """;

    // Chỉ test (InternalsVisibleTo) được thay để ký bằng khóa thử
    internal static string VerificationKeyPem { get; set; } = PublicKeyPem;

    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private readonly string _anonKey;

    public LicenseRpcClient(HttpClient httpClient, string supabaseUrl, string anonKey)
    {
        _httpClient = httpClient;
        _baseUrl = supabaseUrl.TrimEnd('/');
        _anonKey = anonKey;
    }

    /// <summary>Verify chữ ký trên đúng bytes đã ký; trả JSON payload khi hợp lệ.</summary>
    public static bool TryVerify(string? payloadB64, string? signatureB64, out string payloadJson)
    {
        payloadJson = string.Empty;
        if (string.IsNullOrEmpty(payloadB64) || string.IsNullOrEmpty(signatureB64)) return false;
        try
        {
            byte[] data = Convert.FromBase64String(payloadB64);
            byte[] sig = Convert.FromBase64String(signatureB64);
            using var ecdsa = ECDsa.Create();
            ecdsa.ImportFromPem(VerificationKeyPem);
            if (!ecdsa.VerifyData(data, sig, HashAlgorithmName.SHA256, DSASignatureFormat.Rfc3279DerSequence)) return false;
            payloadJson = Encoding.UTF8.GetString(data);
            return true;
        }
        catch (Exception ex) when (ex is FormatException or CryptographicException)
        {
            return false;
        }
    }

    public async Task<LicenseRpcResult> GetLicenseAsync(string machineId, CancellationToken ct = default)
    {
        try
        {
            using var resp = await PostRpcAsync("get_license", machineId, ct).ConfigureAwait(false);
            if (!resp.IsSuccessStatusCode) return NotReachable();

            string json = await resp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object) return new LicenseRpcResult(true, false, "", "", "");

            return new LicenseRpcResult(
                Reachable: true,
                Found: true,
                RowJson: root.GetRawText(),
                SignedPayload: Str(root, "signed_payload"),
                Signature: Str(root, "signature"));
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            return NotReachable();
        }
    }

    /// <summary>Cập nhật last_check; trả false nếu RPC chưa có (caller tự PATCH như cũ).</summary>
    public async Task<bool> TouchAsync(string machineId, CancellationToken ct = default)
    {
        try
        {
            using var resp = await PostRpcAsync("touch_license", machineId, ct).ConfigureAwait(false);
            return resp.IsSuccessStatusCode;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return false;
        }
    }

    private Task<HttpResponseMessage> PostRpcAsync(string function, string machineId, CancellationToken ct)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/rest/v1/rpc/{function}")
        {
            Content = new StringContent(JsonSerializer.Serialize(new { p_machine_id = machineId }), Encoding.UTF8, "application/json")
        };
        req.Headers.Add("apikey", _anonKey);
        req.Headers.Add("Authorization", $"Bearer {_anonKey}");
        return _httpClient.SendAsync(req, ct);
    }

    private static LicenseRpcResult NotReachable() => new(false, false, "", "", "");

    private static string Str(JsonElement root, string name) =>
        root.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() ?? "" : "";
}
