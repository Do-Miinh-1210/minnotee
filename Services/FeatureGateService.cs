using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MinNote.Services;

public record FeatureDefinition(
    string Id,
    string Name,
    string Description,
    string Category,
    int UnitPrice,
    string MinTier,
    string IconSymbol = "ShieldCheckmark24",
    string AppModule = "",
    string Details = ""
);

public record TierPackage(
    string TierCode,
    string Name,
    int Price,
    string ExpiryLabel,
    string Description,
    List<string> IncludedFeatureIds
);

public class FeatureGateService
{
    public static FeatureGateService Instance { get; } = new();

    public static readonly List<FeatureDefinition> Catalog = new()
    {
        new(
            "convert",
            "Chuyển đổi PDF / Ảnh sang Word (OCR AI)",
            "Chuyển PDF scan & ảnh đề thi sang Word chuẩn, giữ bảng biểu và công thức toán",
            "Chuyển đổi",
            250000,
            "BASIC",
            "DocumentSync24",
            "Module Convert",
            "• Nhận diện chữ tiếng Việt có dấu và ảnh scan chụp mờ\n• Tự động dựng công thức toán chuẩn Word (OMML/MathType)\n• Giữ nguyên cấu trúc bảng biểu, đáp án ABCD và hình minh họa\n• Tách đề bài và bảng lời giải thành các file riêng biệt"
        ),
        new(
            "matrix",
            "Soạn đề theo Ma trận chuẩn BGD (Ma trận Exam)",
            "Lập ma trận phân bổ 4 mức độ tư duy (NB-TH-VD-VDC) và tự động sinh đề chuẩn BGD",
            "Soạn đề AI",
            200000,
            "PRO",
            "TableSettings24",
            "Module Ma trận",
            "• Chuẩn định dạng 2025: Trắc nghiệm 4 lựa chọn, Đúng/Sai, Trả lời ngắn\n• Tự động sinh đề bám sát khung chương trình GDPT 2018\n• Tùy biến tỷ lệ điểm, thời gian làm bài và số lượng câu từng phần\n• Xuất bảng đặc tả ma trận đề thi chuẩn quy định"
        ),
        new(
            "tikz",
            "AI Vẽ hình toán học TikZ & Đồ thị Vector",
            "Sinh mã TikZ 2D/3D từ câu hỏi, thư viện hình mẫu, tự động xuất vector EMF chống vỡ nét",
            "Đồ họa Toán",
            300000,
            "PRO",
            "Shape24",
            "Module TikZ",
            "• Vẽ hình học không gian 3D (chóp, lăng trụ, nón, trụ, cầu)\n• Vẽ hình học phẳng 2D, tam giác, đường tròn, tiếp tuyến\n• Lập bảng biến thiên và đồ thị hàm số giải tích tự động\n• Xuất ảnh vector EMF chống vỡ nét tuyệt đối khi in ấn"
        ),
        new(
            "html_model",
            "Mô hình Toán học HTML 3D tương tác",
            "Tạo không gian mô hình 3D tương tác trực quan thời gian thực (Three.js/Canvas)",
            "Trực quan 3D",
            200000,
            "PRO",
            "Cube24",
            "Module Mô hình 3D",
            "• Xoay 360 độ, phóng to thu nhỏ, thay đổi góc nhìn không gian\n• Cắt lớp đa diện, mô phỏng thiết diện mặt phẳng trực quan\n• Tích hợp trực tiếp vào bài giảng trình chiếu PowerPoint\n• Tùy chỉnh thông số cạnh, bán kính, chiều cao thời gian thực"
        ),
        new(
            "whiteboard",
            "Bảng viết Kỹ thuật số & Minnote Studio",
            "Không gian giảng bài, vẽ đồ thị, viết bút số, chèn công thức và tách trang câu hỏi",
            "Giảng bài",
            150000,
            "BASIC",
            "Board24",
            "Module Bảng viết",
            "• Bút vẽ kỹ thuật số chống rung, đổi màu nét và kích thước tự do\n• Tách mỗi câu hỏi thành 1 trang riêng biệt với lời giải và đáp án\n• Chèn công thức toán học KaTeX, hình học và sơ đồ linh hoạt\n• Xuất ảnh bài giảng sắc nét chất lượng cao gửi cho học sinh"
        ),
        new(
            "mindmap",
            "Sơ đồ tư duy Toán học (Mindmap Studio)",
            "Mindmap Studio tích hợp KaTeX/Markdown, tạo nhánh tư duy công thức và xuất ảnh/SVG",
            "Tư duy",
            200000,
            "ULTRA",
            "TreeBranch24",
            "Module Mindmap",
            "• Cây sơ đồ logic công thức theo từng chuyên đề lớp 10, 11, 12\n• Tích hợp KaTeX/Markdown trong từng node tư duy\n• Tự động dàn trang layout thông minh không bị chồng chéo\n• Xuất file ảnh PNG và vector SVG độ phân giải cao"
        ),
        new(
            "shuffle",
            "Trộn đề hoán vị & Phiếu trắc nghiệm OMR",
            "Đảo câu hỏi, xáo trộn phương án ngẫu nhiên, xuất bảng đáp án và phiếu tô OMR",
            "Thi cử",
            150000,
            "BASIC",
            "ArrowShuffle24",
            "Module Trộn đề & OMR",
            "• Xáo trộn câu hỏi và phương án, giữ nguyên nhóm câu liên kết\n• Tự động sinh bảng đáp án đối chiếu cho giáo viên\n• Tạo mẫu phiếu trắc nghiệm chuẩn OMR Bộ GD&ĐT\n• Tương thích các phần mềm chấm trắc nghiệm bằng điện thoại"
        ),
        new(
            "bank",
            "Ngân hàng câu hỏi thông minh",
            "Lưu trữ kho câu hỏi phân loại theo khối lớp, chuyên đề, dạng bài và mức độ",
            "Quản lý đề",
            200000,
            "ULTRA",
            "Database24",
            "Module Ngân hàng đề",
            "• Phân loại câu hỏi theo 4 mức độ tư duy: NB - TH - VD - VDC\n• Lọc và tìm kiếm câu hỏi thông minh theo từ khóa hoặc công thức\n• Trích xuất đề thi tương đương thay số tự động bằng AI\n• Đồng bộ kho câu hỏi cá nhân và đề thi trường học"
        ),
        new(
            "ai_usage",
            "Thống kê Quota & Phân tích phổ điểm AI",
            "Giám sát lưu lượng AI, quản lý API key và phân tích độ phân hóa ma trận đề thi",
            "Thống kê",
            150000,
            "ULTRA",
            "DataTrending24",
            "Module Phân tích AI",
            "• Đo lường hạn ngạch (quota) và chi phí token AI theo thời gian thực\n• Cấu hình linh hoạt API Key Gemini / OpenAI độc lập\n• Biểu đồ phân tích độ khó và phổ điểm dự kiến của đề thi\n• Báo cáo đánh giá chất lượng phân hóa câu hỏi"
        ),
        new(
            "mathtype",
            "MathType Studio & Đồng bộ Word Ribbon",
            "Chuyển đổi TeX <-> MathType 2 chiều, nhúng tab MEA MathTool trực tiếp vào Word",
            "Công thức Toán",
            200000,
            "PRO",
            "MathFormatLinear24",
            "Module MathType",
            "• Chuyển đổi hàng loạt công thức TeX sang MathType và ngược lại\n• Thanh công cụ Add-in Word (.dotm) chuyên nghiệp, 1-click thao tác\n• Không bao giờ lỗi font, không mất định dạng chỉ số trên/dưới\n• Chuẩn hóa toàn bộ cỡ chữ công thức về 12pt/13pt đồng bộ"
        ),
        new(
            "quick_gen",
            "Tạo đề siêu tốc (Smart Prompt & Quick Gen)",
            "Nhập yêu cầu tự nhiên, AI phân tích cấu trúc và sinh đề thi hoàn chỉnh trong vài giây",
            "Sinh đề AI",
            150000,
            "PRO",
            "Flash24",
            "Module Smart Prompt",
            "• Ra lệnh bằng văn bản tự nhiên (VD: Tạo đề ôn tập chương 1 Giải tích)\n• AI tự động tạo đề bài, 4 phương án, đáp án đúng và lời giải\n• Hỗ trợ đầy đủ các định dạng câu hỏi trắc nghiệm mới nhất\n• Tự động chèn hình minh họa TikZ tương ứng cho câu hình học"
        ),
        new(
            "qc",
            "Kiểm định chất lượng đề thi (AI QC)",
            "Tự động quét phản biện đáp án, phát hiện câu hỏi mơ hồ, lỗi chính tả và công thức sai",
            "Kiểm định",
            150000,
            "ULTRA",
            "CheckmarkCircle24",
            "Module Thẩm định QC",
            "• Tự động giải lại đề để kiểm tra tính duy nhất của đáp án đúng\n• Cảnh báo câu hỏi mơ hồ, câu hỏi thiếu điều kiện hoặc sai đề\n• Phát hiện lỗi chính tả, sai ký hiệu toán học và công thức lỗi\n• Chấm điểm độ tin cậy của đề thi kèm gợi ý chỉnh sửa cụ thể"
        )
    };

    public static readonly Dictionary<string, TierPackage> Packages = new(StringComparer.OrdinalIgnoreCase)
    {
        ["BASIC"] = new(
            "BASIC",
            "Gói Cơ Bản (BASIC)",
            399000,
            "1 Năm",
            "Phù hợp giáo viên cần chuyển đổi đề PDF sang Word, trộn đề, bảng viết và sơ đồ tư duy cơ bản",
            new() { "convert", "shuffle", "whiteboard", "mindmap" }
        ),
        ["PRO"] = new(
            "PRO",
            "Gói Chuyên Nghiệp (PRO)",
            899000,
            "1 Năm",
            "Đầy đủ công cụ soạn đề AI, ma trận BGD, vẽ hình TikZ, mô hình 3D, sơ đồ tư duy và MathType Studio",
            new() { "convert", "shuffle", "whiteboard", "mindmap", "matrix", "tikz", "html_model", "mathtype", "quick_gen" }
        ),
        ["ULTRA"] = new(
            "ULTRA",
            "Gói Toàn Năng (ULTRA VIP)",
            1499000,
            "Vĩnh viễn",
            "Mở khóa 100% tất cả tính năng, không giới hạn thời gian, ưu tiên cập nhật AI cao cấp nhất",
            Catalog.Select(c => c.Id).ToList()
        ),
        ["MINNOTE"] = new(
            "MINNOTE",
            "Gói MinNote Bảng viết & Sơ đồ tư duy",
            299000,
            "1 Năm",
            "Không gian bảng viết MinNote Studio & Sơ đồ tư duy Toán học",
            new() { "whiteboard", "mindmap" }
        )
    };

    public static string EncodeFeatureMask(IEnumerable<string> enabledFeatureIds)
    {
        int mask = 0;
        var set = enabledFeatureIds.ToHashSet(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < Catalog.Count; i++)
        {
            if (set.Contains(Catalog[i].Id))
            {
                mask |= (1 << i);
            }
        }
        return mask.ToString("X4");
    }

    public static List<string> DecodeFeatureMask(string hexMask)
    {
        var result = new List<string>();
        if (int.TryParse(hexMask, System.Globalization.NumberStyles.HexNumber, null, out int mask))
        {
            for (int i = 0; i < Catalog.Count; i++)
            {
                if ((mask & (1 << i)) != 0)
                {
                    result.Add(Catalog[i].Id);
                }
            }
        }
        return result;
    }

    public static int CalculateTotalPrice(
        string tierCode,
        IEnumerable<string> selectedFeatures,
        Dictionary<string, int>? customPackagePrices = null,
        Dictionary<string, int>? customFeaturePrices = null)
    {
        string norm = tierCode.ToUpperInvariant();
        if (norm != "CUSTOM" && customPackagePrices != null && customPackagePrices.TryGetValue(norm, out int customPkgPrice))
        {
            return customPkgPrice;
        }

        if (Packages.TryGetValue(norm, out var pkg) && norm != "CUSTOM")
        {
            return pkg.Price;
        }

        int sum = 0;
        var set = selectedFeatures.ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var def in Catalog)
        {
            if (set.Contains(def.Id))
            {
                if (customFeaturePrices != null && customFeaturePrices.TryGetValue(def.Id, out int featPrice))
                {
                    sum += featPrice;
                }
                else
                {
                    sum += def.UnitPrice;
                }
            }
        }
        return sum;
    }

    public static string GenerateQuote(string clientName, string machineId, string tier, List<string> selectedFeatures, string expiry, int totalPrice)
    {
        string vietQrUrl = SupabaseLicenseService.GetVietQrUrl(machineId, tier, totalPrice.ToString());
        var sb = new StringBuilder();
        sb.AppendLine($"==================================================");
        sb.AppendLine($"   BÁO GIÁ & THÔNG TIN BẢN QUYỀN MATRIXEXAMAI PRO");
        sb.AppendLine($"==================================================");
        sb.AppendLine($"Kính gửi: Thầy/Cô {clientName}");
        sb.AppendLine($"Mã máy tính (Machine ID): {machineId}");
        sb.AppendLine($"Gói bản quyền: {tier.ToUpperInvariant()} (Thời hạn: {expiry})");
        sb.AppendLine($"Tổng chi phí: {totalPrice:N0} VNĐ");
        sb.AppendLine("Kích hoạt: sau khi thanh toán, mở app → Kích hoạt → bấm \"Nhận bản quyền đã cấp\".");
        sb.AppendLine();
        sb.AppendLine("Danh mục tính năng mở khóa:");
        var set = selectedFeatures.ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var f in Catalog)
        {
            if (set.Contains(f.Id))
            {
                sb.AppendLine($"  - [x] {f.Name} ({f.AppModule})");
            }
        }
        sb.AppendLine();
        sb.AppendLine("THÔNG TIN CHUYỂN KHOẢN (Tự động kích hoạt):");
        sb.AppendLine($"Ngân hàng: {SupabaseLicenseService.BankId} (Vietcombank)");
        sb.AppendLine($"Số tài khoản: {SupabaseLicenseService.BankAccountNo}");
        sb.AppendLine($"Chủ tài khoản: {SupabaseLicenseService.BankAccountName}");
        sb.AppendLine($"Số tiền: {totalPrice:N0} đ");
        sb.AppendLine($"Nội dung CK: {machineId} {tier.ToUpperInvariant()}");
        sb.AppendLine($"QR Code thanh toán nhanh: {vietQrUrl}");
        sb.AppendLine("==================================================");
        return sb.ToString();
    }
}
