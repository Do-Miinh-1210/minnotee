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

    public static string? RequiredFeatureForMessage(string msgType)
    {
        if (string.IsNullOrWhiteSpace(msgType)) return null;

        return msgType switch
        {
            // Cho phép các thông điệp cửa sổ / vòng đời / trạng thái thụ động không mang đặc quyền
            "WINDOW_MINIMIZE"
                or "WINDOW_MAXIMIZE"
                or "WINDOW_CLOSE"
                or "TOGGLE_FULLSCREEN"
                or "PERSIST_HOST_REPLY"
                or "PERSIST_DIRTY_STATE" => null,

            // Ngân hàng câu hỏi
            "GET_QUESTION_BANK_DATA"
                or "MEA_QB_LIST"
                or "MEA_QB_SAVE_QUESTION" => Bank,

            // Hình vẽ TikZ / Hình học
            "RENDER_TIKZ"
                or "TRACE_TIKZ" => Tikz,
            _ when msgType.StartsWith("MEA_FIG_", StringComparison.Ordinal) => Tikz,

            // Sơ đồ tư duy
            "NAVIGATE_TO_MINDMAP"
                or "GENERATE_AI_MINDMAP"
                or "CAPTURE_MINDMAP"
                or "DOWNLOAD_MINDMAP_SVG" => Mindmap,

            // Các lệnh chức năng bảng viết / xuất tệp / Media
            "SAVE_MEDIA_FILE"
                or "PICK_VIDEO"
                or "COPY_EMF_SELECTION"
                or "SAVE_EMF_FILE"
                or "INSERT_TO_MEA" => Whiteboard,

            _ when msgType.StartsWith("MEA_", StringComparison.Ordinal)
                || msgType.StartsWith("REC_", StringComparison.Ordinal)
                || msgType.StartsWith("PERSIST_", StringComparison.Ordinal) => Whiteboard,

            // Fail-closed: mọi lệnh IPC không xác định khác đều phải qua kiểm tra bản quyền Whiteboard
            _ => Whiteboard
        };
    }
}
