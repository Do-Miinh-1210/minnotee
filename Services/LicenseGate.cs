using System;
using System.Linq;

namespace MinNote.Services;

public enum GateState { Checking, Allowed, Locked }

/// <summary>
/// Quyết định có cho dùng một tính năng MinNote hay không. Chỉ tin license có chữ ký admin (cache đã ký hoặc
/// kết quả online); bản "dùng thử" dựng sẵn khi chưa có mạng không còn mở khóa gì.
/// </summary>
public static class LicenseGate
{
    public const string Whiteboard = "whiteboard";
    public const string Mindmap = "mindmap";

    public static (GateState State, string Reason) Evaluate(LicenseInfo? info, string featureId, bool onlineCheckDone)
    {
        if (info == null || !info.IsServerSigned)
        {
            if (!onlineCheckDone) return (GateState.Checking, "Đang kiểm tra bản quyền…");
            string status = (info?.Status ?? "").ToLowerInvariant();
            return (GateState.Locked, status switch
            {
                "unregistered" => "Máy này chưa được cấp quyền MinNote. Gửi Mã máy bên dưới cho Quản trị viên để kích hoạt.",
                _ when info?.Offline == true => "Cần kết nối mạng để xác thực bản quyền lần đầu. Kết nối mạng rồi bấm \"Kiểm tra lại\".",
                _ => info?.Message is { Length: > 0 } m ? m : "Không xác thực được bản quyền."
            });
        }

        if (!info.IsActive)
        {
            bool revoked = string.Equals(info.Status, "revoked", StringComparison.OrdinalIgnoreCase);
            return (GateState.Locked, revoked
                ? "Bản quyền của máy này đã bị Quản trị viên khóa."
                : $"Bản quyền đã hết hạn ({info.Expiry}). Liên hệ Quản trị viên để gia hạn.");
        }

        return IsGranted(info, featureId)
            ? (GateState.Allowed, "")
            : (GateState.Locked, "Gói bản quyền hiện tại không gồm tính năng này. Liên hệ Quản trị viên để nâng cấp.");
    }

    /// <summary>Cùng quy tắc với MatrixExamAI: ULTRA/MINNOTE mở hết; có danh sách tính năng thì đúng danh sách; không có thì theo gói.</summary>
    public static bool IsGranted(LicenseInfo info, string featureId)
    {
        string tier = (info.Tier ?? "").Trim().ToUpperInvariant();
        if (tier is "ULTRA" or "VIP" or "PREMIUM" or "MINNOTE") return true;

        // Nếu người dùng có quyền minnote hoặc whiteboard thì mở whiteboard
        if (string.Equals(featureId, Whiteboard, StringComparison.OrdinalIgnoreCase))
        {
            if (tier is "BASIC" or "PRO" or "CUSTOM") return true;
        }

        if (info.Features is { Count: > 0 })
        {
            return info.Features.Any(f => string.Equals(f, featureId, StringComparison.OrdinalIgnoreCase)
                                       || (string.Equals(featureId, Whiteboard, StringComparison.OrdinalIgnoreCase) && string.Equals(f, "minnote", StringComparison.OrdinalIgnoreCase))
                                       || (string.Equals(featureId, Mindmap, StringComparison.OrdinalIgnoreCase) && (string.Equals(f, "minnote", StringComparison.OrdinalIgnoreCase) || string.Equals(f, "mindmap", StringComparison.OrdinalIgnoreCase))));
        }

        return FeatureGateService.Packages.TryGetValue(tier, out var pkg)
               && pkg.IncludedFeatureIds.Contains(featureId, StringComparer.OrdinalIgnoreCase);
    }
}
