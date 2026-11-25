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
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace MinNote.Services
{
    public sealed class TikzRenderResult
    {
        public string Src { get; init; } = "";
        public double W { get; init; }
        public double H { get; init; }
    }

    /// <summary>
    /// Biên dịch mã TikZ / tkz-euclide / tkz-tab / pgfplots / tikz-3dplot / tabular bằng TeX trên máy
    /// (hỗ trợ đầy đủ cả TeX Live và MiKTeX).
    /// - RenderTikzAsync: trả về { src, w, h } (ưu tiên vector SVG trong suốt qua latex + dvisvgm, dự phòng pdflatex + gs/pdftoppm).
    /// - TraceTikzAsync: trích xuất tọa độ điểm (P xpt ypt name), màu (C+/C-/C) và luồng nét vẽ PGF để dựng hình hình học kéo điểm được.
    /// </summary>
    public sealed class TikzCompilerService
    {
        public static TikzCompilerService Instance { get; } = new TikzCompilerService();

        private const int CompileTimeoutMs = 30000;
        private const int ConvertTimeoutMs = 20000;
        private const int PngDpi = 300;

        private TikzCompilerService() { }

        public string? FindTexBin(string name)
        {
            string exe = name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? name : name + ".exe";

            // 1. Check PATH
            string? pathEnv = Environment.GetEnvironmentVariable("PATH");
            if (!string.IsNullOrEmpty(pathEnv))
            {
                foreach (var raw in pathEnv.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
                {
                    try
                    {
                        string candidate = Path.Combine(raw.Trim().Trim('"'), exe);
                        if (File.Exists(candidate)) return candidate;
                    }
                    catch { }
                }
            }

            // 2. Common Windows paths (TeX Live newest year first, MiKTeX, Ghostscript)
            var candidates = new List<string>();

            string texLiveRoot = @"C:\texlive";
            if (Directory.Exists(texLiveRoot))
            {
                try
                {
                    var years = Directory.GetDirectories(texLiveRoot)
                        .Select(Path.GetFileName)
                        .Where(d => d != null && Regex.IsMatch(d, @"^\d{4}$"))
                        .OrderByDescending(d => d, StringComparer.Ordinal);
                    foreach (var yr in years)
                    {
                        candidates.Add(Path.Combine(texLiveRoot, yr!, "bin", "windows", exe));
                        candidates.Add(Path.Combine(texLiveRoot, yr!, "bin", "win32", exe));
                        if (name.StartsWith("gs", StringComparison.OrdinalIgnoreCase))
                        {
                            candidates.Add(Path.Combine(texLiveRoot, yr!, "tlpkg", "tlgs", "bin", exe));
                        }
                    }
                }
                catch { }
            }

            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string progFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string progFiles86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);

            if (!string.IsNullOrEmpty(localApp))
                candidates.Add(Path.Combine(localApp, "Programs", "MiKTeX", "miktex", "bin", "x64", exe));
            if (!string.IsNullOrEmpty(progFiles))
            {
                candidates.Add(Path.Combine(progFiles, "MiKTeX", "miktex", "bin", "x64", exe));
                candidates.Add(Path.Combine(progFiles, "MiKTeX 2.9", "miktex", "bin", "x64", exe));
            }
            if (!string.IsNullOrEmpty(progFiles86))
            {
                candidates.Add(Path.Combine(progFiles86, "MiKTeX", "miktex", "bin", "x64", exe));
                candidates.Add(Path.Combine(progFiles86, "MiKTeX 2.9", "miktex", "bin", "x64", exe));
            }

            // Standalone Ghostscript installs (e.g. C:\Program Files\gs\gs10.04.0\bin\gswin64c.exe)
            if (name.StartsWith("gs", StringComparison.OrdinalIgnoreCase))
            {
                foreach (var root in new[] { Path.Combine(progFiles, "gs"), Path.Combine(progFiles86, "gs") })
                {
                    if (!Directory.Exists(root)) continue;
                    try
                    {
                        foreach (var sub in Directory.GetDirectories(root).OrderByDescending(s => s, StringComparer.Ordinal))
                        {
                            candidates.Add(Path.Combine(sub, "bin", exe));
                        }
                    }
                    catch { }
                }
            }

            foreach (var c in candidates)
            {
                try
                {
                    if (File.Exists(c)) return c;
                }
                catch { }
            }

            return null;
        }

        private static bool IsMikTex(string exePath) =>
            exePath.IndexOf("miktex", StringComparison.OrdinalIgnoreCase) >= 0;

        private static bool RequiresPdfLatex(string combinedSource)
        {
            return Regex.IsMatch(combinedSource, @"\\includegraphics\b|\\pdf[a-zA-Z]+\b|\\usepackage(\[[^\]]*\])?\{[^}]*(pdfpages|transparent)[^}]*\}", RegexOptions.IgnoreCase);
        }

        /// <summary>
        /// Tách preamble & body từ mã người dùng (hỗ trợ cả tài liệu đầy đủ \documentclass...\begin{document},
        /// đoạn \begin{tikzpicture}...\end{tikzpicture}, \begin{tabular}, hoặc chỉ các lệnh TikZ trần).
        /// </summary>
        public static string BuildLatexDocument(string rawSource, string? rawDefs, bool forDvisvgm, bool forTrace)
        {
            string source = (rawSource ?? "").Replace("\r\n", "\n").Trim();
            string defs = (rawDefs ?? "").Replace("\r\n", "\n").Trim();

            var extraPreamble = new StringBuilder();
            string body = source;

            // 1. Nếu người dùng dán cả tài liệu LaTeX có \begin{document}...\end{document}
            var docMatch = Regex.Match(body, @"\\begin\{document\}([\s\S]*?)\\end\{document\}");
            if (docMatch.Success)
            {
                string userPreamble = body.Substring(0, docMatch.Index);
                body = docMatch.Groups[1].Value.Trim();

                // Bỏ \documentclass và các gói cơ bản dễ gây Option clash
                userPreamble = Regex.Replace(userPreamble, @"\\documentclass(\[[^\]]*\])?\{[^}]*\}", "");
                userPreamble = Regex.Replace(userPreamble, @"\\usepackage(\[[^\]]*\])?\{(geometry|inputenc|fontenc|standalone|tikz|xcolor|amsmath|amssymb|amsfonts)\}", "");
                userPreamble = Regex.Replace(userPreamble, @"\\pagestyle\{[^}]*\}", "");
                userPreamble = Regex.Replace(userPreamble, @"\\thispagestyle\{[^}]*\}", "");
                if (!string.IsNullOrWhiteSpace(userPreamble))
                    extraPreamble.AppendLine(userPreamble.Trim());
            }

            // 2. Hoist các lệnh preamble (\usepackage, \usetikzlibrary, \usepgfplotslibrary, \pgfplotsset, \RequirePackage)
            // nếu người dùng viết ngay trước \begin{tikzpicture} hoặc trong defs
            string HoistPreambleDirectives(string text)
            {
                if (string.IsNullOrWhiteSpace(text)) return "";
                var lines = text.Split('\n');
                var kept = new List<string>(lines.Length);
                foreach (var line in lines)
                {
                    string trimmed = line.Trim();
                    if (Regex.IsMatch(trimmed, @"^\\(usepackage|RequirePackage|usetikzlibrary|usepgfplotslibrary|pgfplotsset|tkzSetUp[A-Za-z]*)\b"))
                    {
                        // Bỏ qua nếu trùng gói cơ bản có thể gây Option clash
                        if (!Regex.IsMatch(trimmed, @"^\\usepackage(\[[^\]]*\])?\{(geometry|inputenc|fontenc|standalone|tikz|xcolor|amsmath|amssymb|amsfonts)\}\s*$"))
                        {
                            extraPreamble.AppendLine(line);
                        }
                    }
                    else
                    {
                        kept.Add(line);
                    }
                }
                return string.Join("\n", kept).Trim();
            }

            body = HoistPreambleDirectives(body);
            string cleanDefs = HoistPreambleDirectives(defs);
            if (!string.IsNullOrWhiteSpace(cleanDefs))
            {
                extraPreamble.AppendLine(cleanDefs);
            }

            // 3. Nếu chỉ là các lệnh TikZ trần (không có \begin{tikzpicture}, \begin{tabular}, \begin{pgfpicture}, \begin{circuitikz}, \begin{forest}, \tikz)
            bool hasOuterEnv = Regex.IsMatch(body, @"\\begin\s*\{(tikzpicture|pgfpicture|tabular|tabularx|array|circuitikz|forest|pspicture|matrix)\}|\\tikz\b", RegexOptions.IgnoreCase);
            if (!hasOuterEnv)
            {
                body = "\\begin{tikzpicture}\n" + body + "\n\\end{tikzpicture}";
            }

            string combined = extraPreamble.ToString() + "\n" + body;
            bool isNonAscii = combined.Any(c => c > 127);

            var sb = new StringBuilder();
            sb.AppendLine(forDvisvgm
                ? @"\documentclass[dvisvgm,border=2pt]{standalone}"
                : @"\documentclass[border=2pt]{standalone}");
            sb.AppendLine(@"\usepackage[utf8]{inputenc}");
            if (isNonAscii)
                sb.AppendLine(@"\usepackage[T5]{fontenc}");
            sb.AppendLine(@"\usepackage{amsmath,amssymb,amsfonts}");
            sb.AppendLine(@"\usepackage[dvipsnames]{xcolor}");
            sb.AppendLine(@"\usepackage{tikz}");
            sb.AppendLine(@"\usetikzlibrary{arrows,arrows.meta,calc,angles,quotes,intersections,patterns,positioning,shapes.geometric,shapes.misc,decorations.markings,decorations.pathreplacing,decorations.pathmorphing,backgrounds,fit,through,shadings,bending,3d}");

            if (Regex.IsMatch(combined, @"pattern\s*=\s*\{?\s*(Lines|Hatch|Dots|Stars|Bricks|FivePointedStars|SixPointedStars)\b|patterns\.meta", RegexOptions.IgnoreCase))
                sb.AppendLine(@"\usetikzlibrary{patterns.meta}");

            if (Regex.IsMatch(combined, @"\\tkzTab", RegexOptions.IgnoreCase))
                sb.AppendLine(@"\usepackage{tkz-tab}");

            if (Regex.IsMatch(combined, @"\\tkz(?!Tab)", RegexOptions.IgnoreCase))
                sb.AppendLine(@"\usepackage{tkz-euclide}");

            if (Regex.IsMatch(combined, @"\\tkzFct", RegexOptions.IgnoreCase))
                sb.AppendLine(@"\usepackage{tkz-fct}");

            if (Regex.IsMatch(combined, @"\\tdplot|tikz-3dplot", RegexOptions.IgnoreCase))
                sb.AppendLine(@"\usepackage{tikz-3dplot}");

            if (Regex.IsMatch(combined, @"\\begin\s*\{(axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis|groupplot)\}|\\addplot|\\pgfplot", RegexOptions.IgnoreCase))
            {
                sb.AppendLine(@"\usepackage{pgfplots}");
                sb.AppendLine(@"\pgfplotsset{compat=1.18}");
                if (Regex.IsMatch(combined, @"fill\s+between|name\s+path", RegexOptions.IgnoreCase))
                    sb.AppendLine(@"\usepgfplotslibrary{fillbetween}");
                if (Regex.IsMatch(combined, @"polaraxis", RegexOptions.IgnoreCase))
                    sb.AppendLine(@"\usepgfplotslibrary{polar}");
                if (Regex.IsMatch(combined, @"groupplot", RegexOptions.IgnoreCase))
                    sb.AppendLine(@"\usepgfplotslibrary{groupplots}");
            }

            if (Regex.IsMatch(combined, @"circuitikz|\\ctikz", RegexOptions.IgnoreCase))
                sb.AppendLine(@"\usepackage{circuitikz}");

            if (Regex.IsMatch(combined, @"\\begin\s*\{forest\}", RegexOptions.IgnoreCase))
                sb.AppendLine(@"\usepackage{forest}");

            if (Regex.IsMatch(combined, @"\\begin\s*\{(tabular|tabularx)\}|\\toprule|\\midrule|\\bottomrule|\\multirow|\\rowcolor|\\cellcolor", RegexOptions.IgnoreCase))
                sb.AppendLine(@"\usepackage{booktabs,array,multirow,colortbl}");

            if (Regex.IsMatch(combined, @"\\SI\b|\\qty\b|\\unit\b|\\num\b"))
                sb.AppendLine(@"\usepackage{siunitx}");

            if (Regex.IsMatch(combined, @"\\ce\s*\{"))
                sb.AppendLine(@"\usepackage[version=4]{mhchem}");

            // Macro phổ biến của đề thi Toán Việt Nam (ex_test) — chỉ định nghĩa nếu chưa có
            sb.AppendLine(@"\providecommand{\hoac}[1]{\left[\begin{aligned}#1\end{aligned}\right.}");
            sb.AppendLine(@"\providecommand{\heva}[1]{\left\{\begin{aligned}#1\end{aligned}\right.}");

            if (extraPreamble.Length > 0)
            {
                sb.AppendLine(extraPreamble.ToString().Trim());
            }

            if (forTrace)
            {
                sb.AppendLine(TraceHookPreamble);
            }

            sb.AppendLine(@"\begin{document}");
            sb.AppendLine(body);
            sb.AppendLine(@"\end{document}");

            return sb.ToString();
        }

        private const string TraceHookPreamble = @"
\makeatletter
\newwrite\nr@trace
\immediate\openout\nr@trace=trace.txt
\let\nr@orig@invoke\pgfsys@invoke
\def\pgfsys@invoke#1{%
  \immediate\write\nr@trace{#1}%
  \nr@orig@invoke{#1}%
}
\let\nr@orig@setcolor\set@color
\def\set@color{%
  \immediate\write\nr@trace{C+ \current@color}%
  \aftergroup\nr@pop@color
  \nr@orig@setcolor
}
\def\nr@pop@color{\immediate\write\nr@trace{C-}}
\let\nr@orig@rgb@s\pgfsys@color@rgb@stroke
\def\pgfsys@color@rgb@stroke#1#2#3{\immediate\write\nr@trace{C #1 #2 #3 RG}\nr@orig@rgb@s{#1}{#2}{#3}}
\let\nr@orig@rgb@f\pgfsys@color@rgb@fill
\def\pgfsys@color@rgb@fill#1#2#3{\immediate\write\nr@trace{C #1 #2 #3 rg}\nr@orig@rgb@f{#1}{#2}{#3}}
\let\nr@orig@gray@s\pgfsys@color@gray@stroke
\def\pgfsys@color@gray@stroke#1{\immediate\write\nr@trace{C #1 G}\nr@orig@gray@s{#1}}
\let\nr@orig@gray@f\pgfsys@color@gray@fill
\def\pgfsys@color@gray@fill#1{\immediate\write\nr@trace{C #1 g}\nr@orig@gray@f{#1}}
\let\nr@orig@cmyk@s\pgfsys@color@cmyk@stroke
\def\pgfsys@color@cmyk@stroke#1#2#3#4{\immediate\write\nr@trace{C #1 #2 #3 #4 K}\nr@orig@cmyk@s{#1}{#2}{#3}{#4}}
\let\nr@orig@cmyk@f\pgfsys@color@cmyk@fill
\def\pgfsys@color@cmyk@fill#1#2#3#4{\immediate\write\nr@trace{C #1 #2 #3 #4 k}\nr@orig@cmyk@f{#1}{#2}{#3}{#4}}
\def\nr@emit@pt#1{%
  \if\relax\detokenize{#1}\relax\else
    \@ifundefined{pgf@sh@ns@#1}{}{%
      \begingroup
        \pgftransformreset
        \pgfpointanchor{#1}{center}%
        \immediate\write\nr@trace{P \the\pgf@x\space\the\pgf@y\space #1}%
      \endgroup
    }%
  \fi
}
\let\nr@orig@coord\pgfcoordinate
\def\pgfcoordinate#1#2{\nr@orig@coord{#1}{#2}\nr@emit@pt{#1}}
\let\nr@orig@mpnode\pgfmultipartnode
\def\pgfmultipartnode#1#2#3#4{\nr@orig@mpnode{#1}{#2}{#3}{#4}\nr@emit@pt{#3}}
\let\nr@orig@alias\pgfnodealias
\def\pgfnodealias#1#2{\nr@orig@alias{#1}{#2}\nr@emit@pt{#1}}
\AtEndDocument{\immediate\closeout\nr@trace}
\makeatother
";

        public async Task<TikzRenderResult> RenderTikzAsync(string tikzSource, string? defs = null, Action<string>? log = null)
        {
            if (string.IsNullOrWhiteSpace(tikzSource))
                throw new InvalidOperationException("Mã TikZ đang trống.");

            string? latex = FindTexBin("latex");
            string? pdflatex = FindTexBin("pdflatex");
            string? dvisvgm = FindTexBin("dvisvgm");
            string? pdftoppm = FindTexBin("pdftoppm");
            string? gs = FindTexBin("gswin64c") ?? FindTexBin("gswin32c");

            if (latex == null && pdflatex == null)
                throw new InvalidOperationException("Chưa cài đặt TeX (MiKTeX hoặc TeX Live) trên máy tính này để vẽ hình TikZ.");

            string tmpDir = Path.Combine(Path.GetTempPath(), "minnote-tikz-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tmpDir);

            try
            {
                bool forcePdf = RequiresPdfLatex((defs ?? "") + "\n" + tikzSource);
                string? svgError = null;

                // 1. Primary path: latex + dvisvgm (vector SVG trong suốt, siêu nét khi zoom, không phụ thuộc font)
                if (!forcePdf && latex != null && dvisvgm != null)
                {
                    try
                    {
                        string texContent = BuildLatexDocument(tikzSource, defs, forDvisvgm: true, forTrace: false);
                        string texFile = Path.Combine(tmpDir, "picture.tex");
                        string dviFile = Path.Combine(tmpDir, "picture.dvi");
                        string svgFile = Path.Combine(tmpDir, "picture.svg");
                        await File.WriteAllTextAsync(texFile, texContent, new UTF8Encoding(false)).ConfigureAwait(false);

                        var latexArgs = BuildTexArgs(latex, "picture.tex");
                        var rLatex = await RunProcessAsync(latex, latexArgs, tmpDir, CompileTimeoutMs).ConfigureAwait(false);

                        if (File.Exists(dviFile))
                        {
                            var rSvg = await RunProcessAsync(dvisvgm, new[] { "--no-fonts", "--exact-bbox", "-o", "picture.svg", "picture.dvi" }, tmpDir, ConvertTimeoutMs).ConfigureAwait(false);
                            if (File.Exists(svgFile))
                            {
                                string svgText = await File.ReadAllTextAsync(svgFile, Encoding.UTF8).ConfigureAwait(false);
                                var (w, h) = ParseSvgDimensionsPt(svgText);
                                if (w > 0 && h > 0)
                                {
                                    string b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(svgText));
                                    log?.Invoke($"[TikZ] SVG compiled OK ({w:F1}x{h:F1}pt, {svgText.Length}B)");
                                    return new TikzRenderResult
                                    {
                                        Src = "data:image/svg+xml;base64," + b64,
                                        W = w,
                                        H = h
                                    };
                                }
                            }
                            svgError = !string.IsNullOrWhiteSpace(rSvg.Stderr) ? rSvg.Stderr.Trim() : "dvisvgm không tạo được SVG.";
                        }
                        else
                        {
                            svgError = ExtractLatexError(Path.Combine(tmpDir, "picture.log"), rLatex.Stdout, rLatex.Stderr, rLatex.TimedOut);
                        }
                    }
                    catch (Exception ex)
                    {
                        svgError = ex.Message;
                    }

                    log?.Invoke($"[TikZ] DVI/SVG path failed ({svgError}), trying pdflatex fallback...");
                }

                // 2. Fallback path: pdflatex + Ghostscript (pngalpha trong suốt) / pdftoppm
                if (pdflatex == null)
                    throw new InvalidOperationException(svgError ?? "Không tìm thấy pdflatex để biên dịch TikZ.");

                if (gs == null && pdftoppm == null)
                    throw new InvalidOperationException("Không tìm thấy dvisvgm, pdftoppm hoặc Ghostscript để xuất ảnh từ TeX.");

                string pdfTexFile = Path.Combine(tmpDir, "picture_pdf.tex");
                string pdfFile = Path.Combine(tmpDir, "picture_pdf.pdf");
                string pngFile = Path.Combine(tmpDir, "picture_pdf.png");

                string pdfTexContent = BuildLatexDocument(tikzSource, defs, forDvisvgm: false, forTrace: false);
                await File.WriteAllTextAsync(pdfTexFile, pdfTexContent, new UTF8Encoding(false)).ConfigureAwait(false);

                var pdfArgs = BuildTexArgs(pdflatex, "picture_pdf.tex");
                var rPdf = await RunProcessAsync(pdflatex, pdfArgs, tmpDir, CompileTimeoutMs).ConfigureAwait(false);

                if (!File.Exists(pdfFile))
                {
                    string err = ExtractLatexError(Path.Combine(tmpDir, "picture_pdf.log"), rPdf.Stdout, rPdf.Stderr, rPdf.TimedOut);
                    throw new InvalidOperationException(err);
                }

                // Prefer Ghostscript pngalpha (transparent background) -> fallback to pdftoppm
                if (gs != null)
                {
                    await RunProcessAsync(gs, new[]
                    {
                        "-dSAFER", "-dBATCH", "-dNOPAUSE",
                        "-sDEVICE=pngalpha", "-dTextAlphaBits=4", "-dGraphicsAlphaBits=4",
                        $"-r{PngDpi}", "-sOutputFile=picture_pdf.png", "picture_pdf.pdf"
                    }, tmpDir, ConvertTimeoutMs).ConfigureAwait(false);
                }

                if (!File.Exists(pngFile) && pdftoppm != null)
                {
                    await RunProcessAsync(pdftoppm, new[]
                    {
                        "-png", "-r", PngDpi.ToString(CultureInfo.InvariantCulture),
                        "-singlefile", "picture_pdf.pdf", "picture_pdf"
                    }, tmpDir, ConvertTimeoutMs).ConfigureAwait(false);
                }

                if (!File.Exists(pngFile))
                    throw new InvalidOperationException("Không tạo được file ảnh PNG từ kết quả PDF.");

                byte[] pngBytes = await File.ReadAllBytesAsync(pngFile).ConfigureAwait(false);
                var (pxW, pxH) = ParsePngDimensions(pngBytes);
                double ptW = pxW > 0 ? pxW * 72.0 / PngDpi : 180.0;
                double ptH = pxH > 0 ? pxH * 72.0 / PngDpi : 120.0;

                log?.Invoke($"[TikZ] PNG compiled OK ({ptW:F1}x{ptH:F1}pt, {pngBytes.Length}B)");
                return new TikzRenderResult
                {
                    Src = "data:image/png;base64," + Convert.ToBase64String(pngBytes),
                    W = ptW,
                    H = ptH
                };
            }
            finally
            {
                try { Directory.Delete(tmpDir, recursive: true); } catch { }
            }
        }

        public async Task<string> TraceTikzAsync(string tikzSource, string? defs = null, Action<string>? log = null)
        {
            if (string.IsNullOrWhiteSpace(tikzSource))
                throw new InvalidOperationException("Mã TikZ đang trống.");

            string? pdflatex = FindTexBin("pdflatex");
            if (pdflatex == null)
                throw new InvalidOperationException("Chưa cài đặt TeX (MiKTeX hoặc TeX Live) trên máy tính này.");

            string tmpDir = Path.Combine(Path.GetTempPath(), "minnote-trace-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tmpDir);

            try
            {
                string texFile = Path.Combine(tmpDir, "trace.tex");
                string traceFile = Path.Combine(tmpDir, "trace.txt");
                string texContent = BuildLatexDocument(tikzSource, defs, forDvisvgm: false, forTrace: true);
                await File.WriteAllTextAsync(texFile, texContent, new UTF8Encoding(false)).ConfigureAwait(false);

                var args = BuildTexArgs(pdflatex, "trace.tex");
                var res = await RunProcessAsync(pdflatex, args, tmpDir, CompileTimeoutMs).ConfigureAwait(false);

                if (File.Exists(traceFile))
                {
                    string traceText = await File.ReadAllTextAsync(traceFile, Encoding.UTF8).ConfigureAwait(false);
                    if (!string.IsNullOrWhiteSpace(traceText))
                    {
                        log?.Invoke($"[TikZ] Trace OK ({traceText.Length} chars)");
                        return traceText;
                    }
                }

                string err = ExtractLatexError(Path.Combine(tmpDir, "trace.log"), res.Stdout, res.Stderr, res.TimedOut);
                throw new InvalidOperationException(err);
            }
            finally
            {
                try { Directory.Delete(tmpDir, recursive: true); } catch { }
            }
        }

        private static string[] BuildTexArgs(string exePath, string texFileName)
        {
            if (IsMikTex(exePath))
            {
                return new[] { "-interaction=nonstopmode", "-halt-on-error", "-enable-installer", texFileName };
            }
            return new[] { "-interaction=nonstopmode", "-halt-on-error", texFileName };
        }

        private static (double W, double H) ParseSvgDimensionsPt(string svg)
        {
            var tagMatch = Regex.Match(svg, @"<svg\b[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
            if (!tagMatch.Success) return (0, 0);
            string tag = tagMatch.Value;

            double ParseUnit(string val)
            {
                var m = Regex.Match(val.Trim(), @"^([0-9.eE+-]+)\s*([a-z%]*)$", RegexOptions.IgnoreCase);
                if (!m.Success) return 0;
                if (!double.TryParse(m.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out double n))
                    return 0;
                return m.Groups[2].Value.ToLowerInvariant() switch
                {
                    "pt" or "" => n,
                    "px" => n * 72.0 / 96.0,
                    "mm" => n * 72.0 / 25.4,
                    "cm" => n * 72.0 / 2.54,
                    "in" => n * 72.0,
                    _ => n
                };
            }

            var wm = Regex.Match(tag, @"\bwidth\s*=\s*['""]([^'""]+)['""]", RegexOptions.IgnoreCase);
            var hm = Regex.Match(tag, @"\bheight\s*=\s*['""]([^'""]+)['""]", RegexOptions.IgnoreCase);
            if (wm.Success && hm.Success)
            {
                double w = ParseUnit(wm.Groups[1].Value);
                double h = ParseUnit(hm.Groups[1].Value);
                if (w > 0 && h > 0) return (w, h);
            }

            var vb = Regex.Match(tag, @"\bviewBox\s*=\s*['""]\s*([0-9.eE+-]+)[,\s]+([0-9.eE+-]+)[,\s]+([0-9.eE+-]+)[,\s]+([0-9.eE+-]+)\s*['""]", RegexOptions.IgnoreCase);
            if (vb.Success
                && double.TryParse(vb.Groups[3].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out double vw)
                && double.TryParse(vb.Groups[4].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out double vh)
                && vw > 0 && vh > 0)
            {
                return (vw, vh);
            }

            return (0, 0);
        }

        private static (int W, int H) ParsePngDimensions(byte[] png)
        {
            if (png.Length < 24) return (0, 0);
            if (png[0] != 0x89 || png[1] != 0x50 || png[2] != 0x4E || png[3] != 0x47) return (0, 0);
            int w = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19];
            int h = (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23];
            return (w, h);
        }

        private static string ExtractLatexError(string logPath, string stdout, string stderr, bool timedOut)
        {
            if (timedOut)
                return "Biên dịch TeX quá thời gian cho phép (30 giây). Vui lòng kiểm tra vòng lặp hoặc cú pháp TikZ.";

            string logText = "";
            try
            {
                if (File.Exists(logPath))
                    logText = File.ReadAllText(logPath, Encoding.UTF8);
            }
            catch { }

            string combined = !string.IsNullOrEmpty(logText) ? logText : (stdout + "\n" + stderr);
            if (string.IsNullOrWhiteSpace(combined))
                return "Lỗi biên dịch TeX không rõ nguyên nhân.";

            // Tìm lỗi dạng "! ... \nl.<số> ..."
            var m = Regex.Match(combined, @"^! [^\r\n]+(?:\r?\n(?!! )[^\r\n]*){0,6}?\r?\nl\.\d+[^\r\n]*", RegexOptions.Multiline);
            if (m.Success)
                return m.Value.Trim();

            var mBang = Regex.Match(combined, @"^! [^\r\n]+(?:\r?\n[^\r\n]+){0,2}", RegexOptions.Multiline);
            if (mBang.Success)
                return mBang.Value.Trim();

            string tail = combined.Trim();
            return tail.Length > 400 ? tail.Substring(tail.Length - 400) : tail;
        }

        private sealed class ProcessResult
        {
            public int ExitCode { get; init; }
            public string Stdout { get; init; } = "";
            public string Stderr { get; init; } = "";
            public bool TimedOut { get; init; }
        }

        private static async Task<ProcessResult> RunProcessAsync(string fileName, string[] args, string workingDir, int timeoutMs)
        {
            var psi = new ProcessStartInfo
            {
                FileName = fileName,
                WorkingDirectory = workingDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8
            };
            foreach (var a in args) psi.ArgumentList.Add(a);

            using var proc = new Process { StartInfo = psi };
            proc.Start();

            Task<string> outTask = proc.StandardOutput.ReadToEndAsync();
            Task<string> errTask = proc.StandardError.ReadToEndAsync();

            using var cts = new CancellationTokenSource(timeoutMs);
            bool timedOut = false;
            try
            {
                await proc.WaitForExitAsync(cts.Token).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                timedOut = true;
                try { proc.Kill(entireProcessTree: true); } catch { }
            }

            string stdout = "";
            string stderr = "";
            try { stdout = await outTask.ConfigureAwait(false); } catch { }
            try { stderr = await errTask.ConfigureAwait(false); } catch { }

            return new ProcessResult
            {
                ExitCode = timedOut ? -1 : proc.ExitCode,
                Stdout = stdout,
                Stderr = stderr,
                TimedOut = timedOut
            };
        }
    }
}
// [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1).
