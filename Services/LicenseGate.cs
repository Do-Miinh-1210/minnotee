using System;
using System.Linq;

namespace MinNote.Services;

public enum GateState { Checking, Allowed, Locked }

public static class LicenseGate
{
    public const string Whiteboard = "whiteboard";
    public const string Mindmap = "mindmap";
    public const string AuthorizedAdmin = "admin_matrixexamAI";

    public static (GateState State, string Reason) Evaluate(LicenseInfo? info, string featureId, bool onlineCheckDone)
    {
        // Chỉ chấp nhận bản quyền duy nhất thuộc sở hữu của admin_matrixexamAI
        if (info != null && (string.Equals(info.Name, AuthorizedAdmin, StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(info.AdminApiKey, AuthorizedAdmin, StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(info.Tier, "ULTRA", StringComparison.OrdinalIgnoreCase)))
        {
            return (GateState.Allowed, string.Empty);
        }

        return (GateState.Locked, "MinNote chỉ hoạt động với bản quyền duy nhất thuộc admin_matrixexamAI.");
    }

    public static bool IsGranted(LicenseInfo info, string featureId)
    {
        return string.Equals(info?.Name, AuthorizedAdmin, StringComparison.OrdinalIgnoreCase) ||
               string.Equals(info?.AdminApiKey, AuthorizedAdmin, StringComparison.OrdinalIgnoreCase) ||
               string.Equals(info?.Tier, "ULTRA", StringComparison.OrdinalIgnoreCase);
    }
}
