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
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Win32;

namespace MinNote.Services;

public sealed record LocalTrialState(
    bool Exists,
    bool IsActive,
    bool JustStarted,
    bool IsTampered,
    DateTime StartedUtc,
    DateTime ExpiresUtc,
    DateTime LastSeenUtc,
    DateTime EffectiveNowUtc);

/// <summary>
/// Quản lý gói dùng thử miễn phí 1 ngày (24 giờ) cho máy tính mới cài đặt MinNote.
/// Lưu trạng thái có chữ ký HMAC-SHA256 + mã hóa DPAPI gắn chặt MachineId tại nhiều điểm neo
/// (LocalAppData, Roaming AppData và Windows Registry HKCU) kèm chống lùi đồng hồ đơn điệu,
/// bảo đảm mỗi máy chỉ dùng thử 1 lần duy nhất kể cả khi gỡ đi cài lại.
/// </summary>
public sealed class LocalTrialService
{
    public static readonly TimeSpan TrialDuration = TimeSpan.FromHours(24);
    public static readonly string[] TrialFeatures =
    [
        LicenseGate.Whiteboard,
        LicenseGate.Mindmap,
        LicenseGate.Tikz,
        LicenseGate.Bank
    ];

    private const int RecordVersion = 1;
    private const string RegPrimaryPath = @"Software\DoMiinhMath\MinNote";
    private const string RegPrimaryValue = "TrialState";
    private const string RegShadowPath = @"Software\Classes\CLSID\{B5A9D214-7E3C-4F9A-81D2-9F1C5E3B8D44}";
    private const string RegShadowValue = "StateBlob";

    private static readonly byte[] MagicDpapi = [0x4D, 0x4E, 0x54, 0x52, 0x31, 0x00]; // "MNTR1\0"
    private static readonly byte[] MagicAes   = [0x4D, 0x4E, 0x54, 0x52, 0x32, 0x00]; // "MNTR2\0"

    private readonly string[] _fileAnchors;
    private readonly bool _useRegistry;
    private readonly Func<DateTime> _utcNowProvider;
    private readonly object _sync = new();

    private sealed class TrialRecord
    {
        public int Version { get; set; } = RecordVersion;
        public string MachineId { get; set; } = string.Empty;
        public long StartedUtcTicks { get; set; }
        public long ExpiresUtcTicks { get; set; }
        public long LastSeenUtcTicks { get; set; }
        public bool Tampered { get; set; }
        public string Signature { get; set; } = string.Empty;
    }

    public LocalTrialService(
        IEnumerable<string>? customFileAnchors = null,
        bool? useRegistry = null,
        Func<DateTime>? utcNowProvider = null)
    {
        if (customFileAnchors != null)
        {
            _fileAnchors = [.. customFileAnchors];
            _useRegistry = useRegistry ?? false;
        }
        else
        {
            string localApp = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "MinNote",
                ".trial.dat");
            string roamingApp = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "MinNote",
                ".tstate.dat");
            _fileAnchors = [localApp, roamingApp];
            _useRegistry = useRegistry ?? OperatingSystem.IsWindows();
        }
        _utcNowProvider = utcNowProvider ?? (() => DateTime.UtcNow);
    }

    public LocalTrialState EvaluateOrStart(
        string machineId,
        bool allowStartNew,
        DateTime? serverUtc = null,
        DateTime? clockHwmUtc = null,
        bool clockHwmCorrupted = false)
    {
        if (string.IsNullOrWhiteSpace(machineId))
        {
            var now = _utcNowProvider();
            return new LocalTrialState(false, false, false, false, now, now, now, now);
        }

        lock (_sync)
        {
            DateTime localNowUtc = EnsureUtc(_utcNowProvider());
            DateTime effectiveNowUtc = localNowUtc;
            if (serverUtc.HasValue)
            {
                var srv = EnsureUtc(serverUtc.Value);
                if (srv > effectiveNowUtc) effectiveNowUtc = srv;
            }
            if (clockHwmUtc.HasValue)
            {
                var hwm = EnsureUtc(clockHwmUtc.Value);
                if (hwm > effectiveNowUtc) effectiveNowUtc = hwm;
            }

            var blobs = ReadAllAnchorBlobs();
            var validRecords = new List<TrialRecord>();
            bool anyCorrupted = false;

            foreach (var blob in blobs)
            {
                if (TryDecodeRecord(blob, machineId, out var rec) && rec != null)
                {
                    validRecords.Add(rec);
                }
                else
                {
                    anyCorrupted = true;
                }
            }

            if (anyCorrupted)
            {
                // Fail-closed: phát hiện ít nhất 1 điểm neo dùng thử bị sửa/hỏng
                if (validRecords.Count > 0)
                {
                    var mergedBad = MergeRecords(validRecords, machineId, effectiveNowUtc, forceTampered: true);
                    PersistToAllAnchors(mergedBad, machineId);
                    return new LocalTrialState(
                        Exists: true,
                        IsActive: false,
                        JustStarted: false,
                        IsTampered: true,
                        StartedUtc: new DateTime(mergedBad.StartedUtcTicks, DateTimeKind.Utc),
                        ExpiresUtc: new DateTime(mergedBad.ExpiresUtcTicks, DateTimeKind.Utc),
                        LastSeenUtc: new DateTime(mergedBad.LastSeenUtcTicks, DateTimeKind.Utc),
                        EffectiveNowUtc: effectiveNowUtc);
                }

                return new LocalTrialState(true, false, false, true, localNowUtc, localNowUtc, localNowUtc, effectiveNowUtc);
            }

            if (validRecords.Count > 0)
            {
                long earliestStartTicks = long.MaxValue;
                long strictestExpiryTicks = long.MaxValue;
                long highestSeenTicks = long.MinValue;
                bool anyTampered = false;

                foreach (var r in validRecords)
                {
                    if (r.StartedUtcTicks < earliestStartTicks) earliestStartTicks = r.StartedUtcTicks;
                    if (r.ExpiresUtcTicks < strictestExpiryTicks) strictestExpiryTicks = r.ExpiresUtcTicks;
                    if (r.LastSeenUtcTicks > highestSeenTicks) highestSeenTicks = r.LastSeenUtcTicks;
                    if (r.Tampered) anyTampered = true;
                }

                var startedUtc = new DateTime(earliestStartTicks, DateTimeKind.Utc);
                var maxAllowedExpiry = startedUtc.Add(TrialDuration);
                var expiresUtc = new DateTime(strictestExpiryTicks, DateTimeKind.Utc);
                if (expiresUtc > maxAllowedExpiry) expiresUtc = maxAllowedExpiry;
                var lastSeenUtc = new DateTime(highestSeenTicks, DateTimeKind.Utc);

                if (lastSeenUtc > effectiveNowUtc) effectiveNowUtc = lastSeenUtc;

                bool expiredNaturally = effectiveNowUtc >= expiresUtc;
                bool clockRollback =
                    clockHwmCorrupted
                    || localNowUtc < lastSeenUtc.AddMinutes(-15)
                    || localNowUtc < startedUtc.AddMinutes(-5)
                    || (clockHwmUtc.HasValue && localNowUtc < EnsureUtc(clockHwmUtc.Value).AddHours(-2))
                    || (serverUtc.HasValue && localNowUtc < EnsureUtc(serverUtc.Value).AddHours(-2));

                bool tampered = anyTampered || (!expiredNaturally && clockRollback);
                DateTime nextSeenUtc = effectiveNowUtc > lastSeenUtc ? effectiveNowUtc : lastSeenUtc;

                var updated = new TrialRecord
                {
                    Version = RecordVersion,
                    MachineId = machineId,
                    StartedUtcTicks = startedUtc.Ticks,
                    ExpiresUtcTicks = expiresUtc.Ticks,
                    LastSeenUtcTicks = nextSeenUtc.Ticks,
                    Tampered = tampered
                };
                updated.Signature = ComputeRecordSignature(updated);

                // Đồng bộ & tự vá mọi điểm neo nếu người dùng vừa xóa 1 vị trí lưu trữ
                bool needsSync = blobs.Count < TotalAnchorCount
                    || tampered != anyTampered
                    || nextSeenUtc > lastSeenUtc.AddSeconds(30);
                if (needsSync)
                {
                    PersistToAllAnchors(updated, machineId);
                }

                bool active = !tampered && effectiveNowUtc < expiresUtc;
                return new LocalTrialState(
                    Exists: true,
                    IsActive: active,
                    JustStarted: false,
                    IsTampered: tampered,
                    StartedUtc: startedUtc,
                    ExpiresUtc: expiresUtc,
                    LastSeenUtc: nextSeenUtc,
                    EffectiveNowUtc: effectiveNowUtc);
            }

            // Chưa có dấu vết dùng thử nào trên máy
            if (!allowStartNew)
            {
                return new LocalTrialState(false, false, false, false, localNowUtc, localNowUtc, localNowUtc, effectiveNowUtc);
            }

            if (clockHwmCorrupted)
            {
                return new LocalTrialState(true, false, false, true, localNowUtc, localNowUtc, localNowUtc, effectiveNowUtc);
            }

            DateTime startUtc = serverUtc.HasValue ? EnsureUtc(serverUtc.Value) : localNowUtc;
            if (clockHwmUtc.HasValue)
            {
                var hwm = EnsureUtc(clockHwmUtc.Value);
                if (hwm > startUtc) startUtc = hwm;
            }

            DateTime expireUtc = startUtc.Add(TrialDuration);
            var fresh = new TrialRecord
            {
                Version = RecordVersion,
                MachineId = machineId,
                StartedUtcTicks = startUtc.Ticks,
                ExpiresUtcTicks = expireUtc.Ticks,
                LastSeenUtcTicks = startUtc.Ticks,
                Tampered = false
            };
            fresh.Signature = ComputeRecordSignature(fresh);
            PersistToAllAnchors(fresh, machineId);

            return new LocalTrialState(
                Exists: true,
                IsActive: true,
                JustStarted: true,
                IsTampered: false,
                StartedUtc: startUtc,
                ExpiresUtc: expireUtc,
                LastSeenUtc: startUtc,
                EffectiveNowUtc: startUtc);
        }
    }

    public static LicenseInfo BuildTrialLicense(string machineId, LocalTrialState state)
    {
        DateTime localExpiry = state.ExpiresUtc.ToLocalTime();
        string expiryDisplay = $"Đến {localExpiry:HH:mm dd/MM/yyyy}";

        string message;
        if (state.IsTampered)
        {
            message = "Phát hiện đồng hồ hệ thống bị chỉnh lùi hoặc dữ liệu dùng thử không hợp lệ. Vui lòng đồng bộ lại giờ hệ thống và liên hệ Quản trị viên để kích hoạt bản quyền.";
        }
        else if (state.IsActive)
        {
            message = $"Đang sử dụng bản dùng thử miễn phí 1 ngày cho máy mới cài đặt ({expiryDisplay}).";
        }
        else
        {
            message = $"Thời gian dùng thử 1 ngày cho máy này đã kết thúc ({expiryDisplay}). Vui lòng gửi Mã máy cho Quản trị viên để kích hoạt bản quyền.";
        }

        return new LicenseInfo
        {
            Ok = state.IsActive,
            MachineId = machineId,
            Status = state.IsActive ? "trial" : "expired",
            Tier = "TRIAL",
            Features = new List<string>(TrialFeatures),
            Name = "Dùng thử 1 ngày",
            Expiry = expiryDisplay,
            IssuedAt = state.StartedUtc.ToString("o"),
            LastCheck = state.EffectiveNowUtc.ToString("o"),
            Message = message,
            FromCache = false,
            Offline = false,
            IsLocalTrial = true,
            IsTrialTampered = state.IsTampered,
            TrialJustStarted = state.JustStarted,
            TrialExpiresUtc = state.ExpiresUtc
        };
    }

    private int TotalAnchorCount => _fileAnchors.Length + (_useRegistry ? 2 : 0);

    private static DateTime EnsureUtc(DateTime dt) =>
        dt.Kind == DateTimeKind.Utc ? dt : dt.ToUniversalTime();

    private static TrialRecord MergeRecords(List<TrialRecord> records, string machineId, DateTime effectiveNowUtc, bool forceTampered)
    {
        long start = long.MaxValue;
        long exp = long.MaxValue;
        long seen = effectiveNowUtc.Ticks;
        bool tampered = forceTampered;

        foreach (var r in records)
        {
            if (r.StartedUtcTicks < start) start = r.StartedUtcTicks;
            if (r.ExpiresUtcTicks < exp) exp = r.ExpiresUtcTicks;
            if (r.LastSeenUtcTicks > seen) seen = r.LastSeenUtcTicks;
            if (r.Tampered) tampered = true;
        }

        var merged = new TrialRecord
        {
            Version = RecordVersion,
            MachineId = machineId,
            StartedUtcTicks = start,
            ExpiresUtcTicks = Math.Min(exp, start + TrialDuration.Ticks),
            LastSeenUtcTicks = seen,
            Tampered = tampered
        };
        merged.Signature = ComputeRecordSignature(merged);
        return merged;
    }

    private List<byte[]> ReadAllAnchorBlobs()
    {
        var results = new List<byte[]>();

        foreach (string path in _fileAnchors)
        {
            try
            {
                if (File.Exists(path))
                {
                    results.Add(File.ReadAllBytes(path));
                }
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                System.Diagnostics.Debug.WriteLine($"[LocalTrial] Read file anchor error: {ex.Message}");
            }
        }

        if (_useRegistry && OperatingSystem.IsWindows())
        {
            TryReadRegistryAnchor(RegPrimaryPath, RegPrimaryValue, results);
            TryReadRegistryAnchor(RegShadowPath, RegShadowValue, results);
        }

        return results;
    }

    private static void TryReadRegistryAnchor(string subKeyPath, string valueName, List<byte[]> results)
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(subKeyPath, writable: false);
            if (key == null) return;
            object? raw = key.GetValue(valueName);
            if (raw is byte[] bytes)
            {
                results.Add(bytes);
            }
            else if (raw is string str)
            {
                try { results.Add(Convert.FromBase64String(str)); }
                catch (FormatException) { results.Add(Array.Empty<byte>()); }
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[LocalTrial] Read registry anchor error: {ex.Message}");
        }
    }

    private void PersistToAllAnchors(TrialRecord record, string machineId)
    {
        byte[] encoded = EncodeRecord(record, machineId);

        foreach (string path in _fileAnchors)
        {
            try
            {
                SupabaseLicenseService.WriteBytesAtomicInternal(path, encoded);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[LocalTrial] Write file anchor error ({path}): {ex.Message}");
            }
        }

        if (_useRegistry && OperatingSystem.IsWindows())
        {
            TryWriteRegistryAnchor(RegPrimaryPath, RegPrimaryValue, encoded);
            TryWriteRegistryAnchor(RegShadowPath, RegShadowValue, encoded);
        }
    }

    private static void TryWriteRegistryAnchor(string subKeyPath, string valueName, byte[] data)
    {
        try
        {
            using var key = Registry.CurrentUser.CreateSubKey(subKeyPath, writable: true);
            key?.SetValue(valueName, data, RegistryValueKind.Binary);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[LocalTrial] Write registry anchor error ({subKeyPath}): {ex.Message}");
        }
    }

    private static byte[] EncodeRecord(TrialRecord record, string machineId)
    {
        byte[] plain = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(record));
        byte[]? dpapi = SupabaseLicenseService.TryProtectDpapiInternal(plain, "MinNote_TrialAnchor_v1|" + machineId, "MinNote_LocalTrial");
        if (dpapi != null)
        {
            byte[] wrapped = new byte[MagicDpapi.Length + dpapi.Length];
            Buffer.BlockCopy(MagicDpapi, 0, wrapped, 0, MagicDpapi.Length);
            Buffer.BlockCopy(dpapi, 0, wrapped, MagicDpapi.Length, dpapi.Length);
            return wrapped;
        }

        byte[] aesBytes = EncryptTrialAes(plain, machineId);
        byte[] fallbackWrapped = new byte[MagicAes.Length + aesBytes.Length];
        Buffer.BlockCopy(MagicAes, 0, fallbackWrapped, 0, MagicAes.Length);
        Buffer.BlockCopy(aesBytes, 0, fallbackWrapped, MagicAes.Length, aesBytes.Length);
        return fallbackWrapped;
    }

    private static bool TryDecodeRecord(byte[] blob, string machineId, out TrialRecord? record)
    {
        record = null;
        if (blob == null || blob.Length <= MagicDpapi.Length) return false;

        try
        {
            byte[]? plain = null;
            if (blob.AsSpan(0, MagicDpapi.Length).SequenceEqual(MagicDpapi))
            {
                plain = SupabaseLicenseService.TryUnprotectDpapiInternal(blob[MagicDpapi.Length..], "MinNote_TrialAnchor_v1|" + machineId);
            }
            else if (blob.AsSpan(0, MagicAes.Length).SequenceEqual(MagicAes))
            {
                plain = DecryptTrialAes(blob[MagicAes.Length..], machineId);
            }
            if (plain == null || plain.Length == 0) return false;

            var rec = JsonSerializer.Deserialize<TrialRecord>(Encoding.UTF8.GetString(plain));
            if (rec == null || rec.Version != RecordVersion) return false;
            if (!string.Equals(rec.MachineId, machineId, StringComparison.OrdinalIgnoreCase)) return false;

            // Kiểm tra tính hợp lệ của dấu thời gian & giới hạn tối đa đúng 24 giờ
            if (rec.StartedUtcTicks < DateTime.MinValue.Ticks || rec.StartedUtcTicks > DateTime.MaxValue.Ticks) return false;
            if (rec.ExpiresUtcTicks <= rec.StartedUtcTicks || rec.ExpiresUtcTicks > DateTime.MaxValue.Ticks) return false;
            if (rec.LastSeenUtcTicks < DateTime.MinValue.Ticks || rec.LastSeenUtcTicks > DateTime.MaxValue.Ticks) return false;
            if (rec.ExpiresUtcTicks - rec.StartedUtcTicks > TrialDuration.Ticks + TimeSpan.FromMinutes(1).Ticks) return false;

            string expectedSig = ComputeRecordSignature(rec);
            byte[] expectedBytes = Encoding.UTF8.GetBytes(expectedSig);
            byte[] actualBytes = Encoding.UTF8.GetBytes(rec.Signature ?? string.Empty);
            if (!CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes)) return false;

            record = rec;
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string ComputeRecordSignature(TrialRecord rec)
    {
        string payload = $"MNTR1|{rec.Version}|{rec.MachineId}|{rec.StartedUtcTicks}|{rec.ExpiresUtcTicks}|{rec.LastSeenUtcTicks}|{(rec.Tampered ? 1 : 0)}";
        byte[] key = SHA256.HashData(Encoding.UTF8.GetBytes("MinNote_TrialSign_v1|" + SupabaseLicenseService.SecretSaltInternal + "|" + rec.MachineId));
        using var hmac = new HMACSHA256(key);
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
    }

    private static byte[] EncryptTrialAes(byte[] plain, string machineId)
    {
        using var aes = Aes.Create();
        aes.Key = SHA256.HashData(Encoding.UTF8.GetBytes("MinNote_TrialAesK|" + SupabaseLicenseService.SecretSaltInternal + "|" + machineId));
        aes.IV = SHA256.HashData(Encoding.UTF8.GetBytes("MinNote_TrialAesI|" + machineId + "|" + SupabaseLicenseService.SecretSaltInternal))[..16];
        using var ms = new MemoryStream();
        using (var cs = new CryptoStream(ms, aes.CreateEncryptor(), CryptoStreamMode.Write))
        {
            cs.Write(plain, 0, plain.Length);
        }
        return ms.ToArray();
    }

    private static byte[]? DecryptTrialAes(byte[] cipher, string machineId)
    {
        try
        {
            using var aes = Aes.Create();
            aes.Key = SHA256.HashData(Encoding.UTF8.GetBytes("MinNote_TrialAesK|" + SupabaseLicenseService.SecretSaltInternal + "|" + machineId));
            aes.IV = SHA256.HashData(Encoding.UTF8.GetBytes("MinNote_TrialAesI|" + machineId + "|" + SupabaseLicenseService.SecretSaltInternal))[..16];
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
}
// [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1).
