using System;
using System.Linq;

namespace MinNote.Services;

public enum GateState { Checking, Allowed, Locked }

/// <summary>
/// Quyết định có cho dùng một tính năng MinNote hay không. Chỉ tin license có chữ ký admin (cache đã ký hoặc
/// kết quả online) hoặc máy quản trị đã xác minh khóa ký ECDSA.
/// </summary>
public static class LicenseGate
{
    public const string Whiteboard = "whiteboard";
    public const string Mindmap = "mindmap";
    public const string Bank = "bank";
    public const string Tikz = "tikz";

    public static (GateState State, string Reason) Evaluate(LicenseInfo? info, string featureId, bool onlineCheckDone)
    {
        if (info != null && info.IsAdminMachine)
            return (GateState.Allowed, string.Empty);

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
            ? (GateState.Allowed, string.Empty)
            : (GateState.Locked, "Gói bản quyền hiện tại không gồm tính năng này. Liên hệ Quản trị viên để nâng cấp.");
    }

    public static bool IsGranted(LicenseInfo? info, string featureId)
    {
        if (info == null) return false;
        if (info.IsAdminMachine) return true;

        string tier = (info.Tier ?? "").Trim().ToUpperInvariant();
        if (tier is "ULTRA" or "VIP" or "PREMIUM") return true;

        if (info.Features is { Count: > 0 })
        {
            bool isWhiteboardOrMindmap = string.Equals(featureId, Whiteboard, StringComparison.OrdinalIgnoreCase)
                                         || string.Equals(featureId, Mindmap, StringComparison.OrdinalIgnoreCase);
            return info.Features.Any(f =>
                string.Equals(f, featureId, StringComparison.OrdinalIgnoreCase)
                || string.Equals(f, "all", StringComparison.OrdinalIgnoreCase)
                || (isWhiteboardOrMindmap && string.Equals(f, "minnote", StringComparison.OrdinalIgnoreCase)));
        }

        return FeatureGateService.Packages.TryGetValue(tier, out var pkg)
               && pkg.IncludedFeatureIds.Contains(featureId, StringComparer.OrdinalIgnoreCase);
    }

    public static string? RequiredFeatureForMessage(string msgType) => msgType switch
    {
        "GET_QUESTION_BANK_DATA" or "MEA_QB_LIST" or "MEA_QB_SAVE_QUESTION" => Bank,
        "MEA_FIG_LIST" or "MEA_FIG_LOAD" or "MEA_FIG_PUSH" or "MEA_FIG_DELETE" => Tikz,
        _ when msgType.StartsWith("MEA_", StringComparison.Ordinal) => Whiteboard,
        _ => null
    };
}
