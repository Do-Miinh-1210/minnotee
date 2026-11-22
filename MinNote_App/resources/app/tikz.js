// MinNote TikZ & TikZ-3D Compiler (supports both TeX Live and MiKTeX)
// 100% Node stdlib (child_process, fs, os, path). Zero npm dependencies.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const COMPILE_TIMEOUT_MS = 30000;
const CONVERT_TIMEOUT_MS = 20000;
const PNG_DPI = 300;

function findTexBin(name) {
  const isWin = process.platform === 'win32';
  const exe = isWin && !name.toLowerCase().endsWith('.exe') ? `${name}.exe` : name;

  // 1. Check PATH
  const envPath = (process.env.PATH || '').split(path.delimiter);
  for (const p of envPath) {
    if (!p) continue;
    const full = path.join(p.replace(/^"|"$/g, ''), exe);
    if (fs.existsSync(full)) return full;
  }

  // 2. Common Windows paths (TeX Live newest year first, MiKTeX, Ghostscript)
  if (isWin) {
    const localApp = process.env.LOCALAPPDATA || '';
    const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const progFiles86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const candidates = [];

    const texLiveRoot = 'C:\\texlive';
    if (fs.existsSync(texLiveRoot)) {
      try {
        const dirs = fs.readdirSync(texLiveRoot)
          .filter(d => /^\d{4}$/.test(d))
          .sort((a, b) => b.localeCompare(a));
        for (const yr of dirs) {
          candidates.push(path.join(texLiveRoot, yr, 'bin', 'windows', exe));
          candidates.push(path.join(texLiveRoot, yr, 'bin', 'win32', exe));
          if (/^gs/i.test(name)) {
            candidates.push(path.join(texLiveRoot, yr, 'tlpkg', 'tlgs', 'bin', exe));
          }
        }
      } catch (_) {}
    }

    if (localApp) candidates.push(path.join(localApp, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', exe));
    candidates.push(path.join(progFiles, 'MiKTeX', 'miktex', 'bin', 'x64', exe));
    candidates.push(path.join(progFiles, 'MiKTeX 2.9', 'miktex', 'bin', 'x64', exe));
    candidates.push(path.join(progFiles86, 'MiKTeX', 'miktex', 'bin', 'x64', exe));
    candidates.push(path.join(progFiles86, 'MiKTeX 2.9', 'miktex', 'bin', 'x64', exe));

    if (/^gs/i.test(name)) {
      for (const root of [path.join(progFiles, 'gs'), path.join(progFiles86, 'gs')]) {
        if (!fs.existsSync(root)) continue;
        try {
          const subs = fs.readdirSync(root).sort((a, b) => b.localeCompare(a));
          for (const s of subs) {
            candidates.push(path.join(root, s, 'bin', exe));
          }
        } catch (_) {}
      }
    }

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  return null;
}

function isMikTex(exePath) {
  return /miktex/i.test(exePath || '');
}

function buildTexArgs(exePath, texFileName) {
  if (isMikTex(exePath)) {
    return ['-interaction=nonstopmode', '-halt-on-error', '-enable-installer', texFileName];
  }
  return ['-interaction=nonstopmode', '-halt-on-error', texFileName];
}

function requiresPdfLatex(combined) {
  return /\\includegraphics\b|\\pdf[a-zA-Z]+\b|\\usepackage(\[[^\]]*\])?\{[^}]*(pdfpages|transparent)[^}]*\}/i.test(combined);
}

const TRACE_HOOK_PREAMBLE = String.raw`
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
`;

function buildLatexDocument(rawSource, rawDefs, forDvisvgm, forTrace) {
  const source = String(rawSource || '').replace(/\r\n/g, '\n').trim();
  const defs = String(rawDefs || '').replace(/\r\n/g, '\n').trim();

  const extraPreambleLines = [];
  let body = source;

  const docMatch = /\\begin\{document\}([\s\S]*?)\\end\{document\}/.exec(body);
  if (docMatch) {
    let userPreamble = body.slice(0, docMatch.index);
    body = docMatch[1].trim();
    userPreamble = userPreamble
      .replace(/\\documentclass(\[[^\]]*\])?\{[^}]*\}/g, '')
      .replace(/\\usepackage(\[[^\]]*\])?\{(geometry|inputenc|fontenc|standalone|tikz|xcolor|amsmath|amssymb|amsfonts)\}/g, '')
      .replace(/\\(this)?pagestyle\{[^}]*\}/g, '')
      .trim();
    if (userPreamble) extraPreambleLines.push(userPreamble);
  }

  function hoistDirectives(text) {
    if (!text) return '';
    const kept = [];
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (/^\\(usepackage|RequirePackage|usetikzlibrary|usepgfplotslibrary|pgfplotsset|tkzSetUp[A-Za-z]*)\b/.test(trimmed)) {
        if (!/^\\usepackage(\[[^\]]*\])?\{(geometry|inputenc|fontenc|standalone|tikz|xcolor|amsmath|amssymb|amsfonts)\}\s*$/.test(trimmed)) {
          extraPreambleLines.push(line);
        }
      } else {
        kept.push(line);
      }
    }
    return kept.join('\n').trim();
  }

  body = hoistDirectives(body);
  const cleanDefs = hoistDirectives(defs);
  if (cleanDefs) extraPreambleLines.push(cleanDefs);

  const hasOuterEnv = /\\begin\s*\{(tikzpicture|pgfpicture|tabular|tabularx|array|circuitikz|forest|pspicture|matrix)\}|\\tikz\b/i.test(body);
  if (!hasOuterEnv) {
    body = `\\begin{tikzpicture}\n${body}\n\\end{tikzpicture}`;
  }

  const extraPreamble = extraPreambleLines.join('\n').trim();
  const combined = `${extraPreamble}\n${body}`;
  const isNonAscii = /[^\x00-\x7f]/.test(combined);

  const lines = [
    forDvisvgm ? '\\documentclass[dvisvgm,border=2pt]{standalone}' : '\\documentclass[border=2pt]{standalone}',
    '\\usepackage[utf8]{inputenc}',
  ];
  if (isNonAscii) lines.push('\\usepackage[T5]{fontenc}');
  lines.push(
    '\\usepackage{amsmath,amssymb,amsfonts}',
    '\\usepackage[dvipsnames]{xcolor}',
    '\\usepackage{tikz}',
    '\\usetikzlibrary{arrows,arrows.meta,calc,angles,quotes,intersections,patterns,positioning,shapes.geometric,shapes.misc,decorations.markings,decorations.pathreplacing,decorations.pathmorphing,backgrounds,fit,through,shadings,bending,3d}'
  );

  if (/pattern\s*=\s*\{?\s*(Lines|Hatch|Dots|Stars|Bricks|FivePointedStars|SixPointedStars)\b|patterns\.meta/i.test(combined)) {
    lines.push('\\usetikzlibrary{patterns.meta}');
  }
  if (/\\tkzTab/i.test(combined)) lines.push('\\usepackage{tkz-tab}');
  if (/\\tkz(?!Tab)/i.test(combined)) lines.push('\\usepackage{tkz-euclide}');
  if (/\\tkzFct/i.test(combined)) lines.push('\\usepackage{tkz-fct}');
  if (/\\tdplot|tikz-3dplot/i.test(combined)) lines.push('\\usepackage{tikz-3dplot}');
  if (/\\begin\s*\{(axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis|groupplot)\}|\\addplot|\\pgfplot/i.test(combined)) {
    lines.push('\\usepackage{pgfplots}', '\\pgfplotsset{compat=1.18}');
    if (/fill\s+between|name\s+path/i.test(combined)) lines.push('\\usepgfplotslibrary{fillbetween}');
    if (/polaraxis/i.test(combined)) lines.push('\\usepgfplotslibrary{polar}');
    if (/groupplot/i.test(combined)) lines.push('\\usepgfplotslibrary{groupplots}');
  }
  if (/circuitikz|\\ctikz/i.test(combined)) lines.push('\\usepackage{circuitikz}');
  if (/\\begin\s*\{forest\}/i.test(combined)) lines.push('\\usepackage{forest}');
  if (/\\begin\s*\{(tabular|tabularx)\}|\\toprule|\\midrule|\\bottomrule|\\multirow|\\rowcolor|\\cellcolor/i.test(combined)) {
    lines.push('\\usepackage{booktabs,array,multirow,colortbl}');
  }
  if (/\\SI\b|\\qty\b|\\unit\b|\\num\b/.test(combined)) lines.push('\\usepackage{siunitx}');
  if (/\\ce\s*\{/.test(combined)) lines.push('\\usepackage[version=4]{mhchem}');

  lines.push(
    '\\providecommand{\\hoac}[1]{\\left[\\begin{aligned}#1\\end{aligned}\\right.}',
    '\\providecommand{\\heva}[1]{\\left\\{\\begin{aligned}#1\\end{aligned}\\right.}'
  );

  if (extraPreamble) lines.push(extraPreamble);
  if (forTrace) lines.push(TRACE_HOOK_PREAMBLE);

  lines.push('\\begin{document}', body, '\\end{document}');
  return lines.join('\n') + '\n';
}

function runProcess(cmd, args, cwd, timeoutMs) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const proc = spawn(cmd, args, { cwd, windowsHide: true });
    const timer = setTimeout(() => {
      timedOut = true;
      try { proc.kill(); } catch (_) {}
    }, timeoutMs);

    proc.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
    proc.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr || err.message, timedOut });
    });
    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: timedOut ? -1 : (code ?? -1), stdout, stderr, timedOut });
    });
  });
}

function extractLatexError(logPath, stdout, stderr, timedOut) {
  if (timedOut) {
    return 'Biên dịch TeX quá thời gian cho phép (30 giây). Vui lòng kiểm tra cú pháp TikZ.';
  }
  let logText = '';
  try {
    if (fs.existsSync(logPath)) logText = fs.readFileSync(logPath, 'utf8');
  } catch (_) {}
  const combined = logText || `${stdout || ''}\n${stderr || ''}`;
  if (!combined.trim()) return 'Lỗi biên dịch TeX không rõ nguyên nhân.';

  const m = /^! [^\r\n]+(?:\r?\n(?!! )[^\r\n]*){0,6}?\r?\nl\.\d+[^\r\n]*/m.exec(combined);
  if (m) return m[0].trim();

  const mBang = /^! [^\r\n]+(?:\r?\n[^\r\n]+){0,2}/m.exec(combined);
  if (mBang) return mBang[0].trim();

  const tail = combined.trim();
  return tail.length > 400 ? tail.slice(-400) : tail;
}

function parseSvgDimensionsPt(svg) {
  const tagMatch = /<svg\b[^>]*>/i.exec(svg);
  if (!tagMatch) return { w: 0, h: 0 };
  const tag = tagMatch[0];

  function parseUnit(val) {
    const m = /^([0-9.eE+-]+)\s*([a-z%]*)$/i.exec((val || '').trim());
    if (!m) return 0;
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n)) return 0;
    switch (m[2].toLowerCase()) {
      case 'pt':
      case '': return n;
      case 'px': return n * 72 / 96;
      case 'mm': return n * 72 / 25.4;
      case 'cm': return n * 72 / 2.54;
      case 'in': return n * 72;
      default: return n;
    }
  }

  const wm = /\bwidth\s*=\s*['"]([^'"]+)['"]/i.exec(tag);
  const hm = /\bheight\s*=\s*['"]([^'"]+)['"]/i.exec(tag);
  if (wm && hm) {
    const w = parseUnit(wm[1]);
    const h = parseUnit(hm[1]);
    if (w > 0 && h > 0) return { w, h };
  }

  const vb = /\bviewBox\s*=\s*['"]\s*([0-9.eE+-]+)[,\s]+([0-9.eE+-]+)[,\s]+([0-9.eE+-]+)[,\s]+([0-9.eE+-]+)\s*['"]/i.exec(tag);
  if (vb) {
    const w = parseFloat(vb[3]);
    const h = parseFloat(vb[4]);
    if (w > 0 && h > 0) return { w, h };
  }

  return { w: 0, h: 0 };
}

function parsePngDimensions(buf) {
  if (!buf || buf.length < 24) return { w: 0, h: 0 };
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) return { w: 0, h: 0 };
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

async function renderTikz(tikzSource, defs = '') {
  if (!tikzSource || !String(tikzSource).trim()) {
    throw new Error('Mã TikZ đang trống.');
  }

  const latex = findTexBin('latex');
  const pdflatex = findTexBin('pdflatex');
  const dvisvgm = findTexBin('dvisvgm');
  const pdftoppm = findTexBin('pdftoppm');
  const gs = findTexBin('gswin64c') || findTexBin('gswin32c') || findTexBin('gs');

  if (!latex && !pdflatex) {
    throw new Error('Chưa cài đặt TeX (MiKTeX hoặc TeX Live) trên máy tính này để vẽ hình TikZ.');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minnote-tikz-'));
  try {
    const forcePdf = requiresPdfLatex(`${defs || ''}\n${tikzSource}`);
    let svgError = null;

    // 1. Primary: latex + dvisvgm -> crisp transparent vector SVG
    if (!forcePdf && latex && dvisvgm) {
      const texFile = path.join(tmpDir, 'picture.tex');
      const dviFile = path.join(tmpDir, 'picture.dvi');
      const svgFile = path.join(tmpDir, 'picture.svg');
      fs.writeFileSync(texFile, buildLatexDocument(tikzSource, defs, true, false), 'utf8');

      const rLatex = await runProcess(latex, buildTexArgs(latex, 'picture.tex'), tmpDir, COMPILE_TIMEOUT_MS);
      if (fs.existsSync(dviFile)) {
        const rSvg = await runProcess(dvisvgm, ['--no-fonts', '--exact-bbox', '-o', 'picture.svg', 'picture.dvi'], tmpDir, CONVERT_TIMEOUT_MS);
        if (fs.existsSync(svgFile)) {
          const svgText = fs.readFileSync(svgFile, 'utf8');
          const { w, h } = parseSvgDimensionsPt(svgText);
          if (w > 0 && h > 0) {
            return {
              src: `data:image/svg+xml;base64,${Buffer.from(svgText, 'utf8').toString('base64')}`,
              w,
              h
            };
          }
        }
        svgError = rSvg.stderr ? rSvg.stderr.trim() : 'dvisvgm không tạo được SVG.';
      } else {
        svgError = extractLatexError(path.join(tmpDir, 'picture.log'), rLatex.stdout, rLatex.stderr, rLatex.timedOut);
      }
    }

    // 2. Fallback: pdflatex + Ghostscript (pngalpha) / pdftoppm
    if (!pdflatex) {
      throw new Error(svgError || 'Không tìm thấy pdflatex để biên dịch TikZ.');
    }
    if (!gs && !pdftoppm) {
      throw new Error('Không tìm thấy dvisvgm, pdftoppm hoặc Ghostscript để xuất ảnh từ TeX.');
    }

    const pdfTexFile = path.join(tmpDir, 'picture_pdf.tex');
    const pdfFile = path.join(tmpDir, 'picture_pdf.pdf');
    const pngFile = path.join(tmpDir, 'picture_pdf.png');
    fs.writeFileSync(pdfTexFile, buildLatexDocument(tikzSource, defs, false, false), 'utf8');

    const rPdf = await runProcess(pdflatex, buildTexArgs(pdflatex, 'picture_pdf.tex'), tmpDir, COMPILE_TIMEOUT_MS);
    if (!fs.existsSync(pdfFile)) {
      throw new Error(extractLatexError(path.join(tmpDir, 'picture_pdf.log'), rPdf.stdout, rPdf.stderr, rPdf.timedOut));
    }

    if (gs) {
      await runProcess(gs, [
        '-dSAFER', '-dBATCH', '-dNOPAUSE',
        '-sDEVICE=pngalpha', '-dTextAlphaBits=4', '-dGraphicsAlphaBits=4',
        `-r${PNG_DPI}`, '-sOutputFile=picture_pdf.png', 'picture_pdf.pdf'
      ], tmpDir, CONVERT_TIMEOUT_MS);
    }
    if (!fs.existsSync(pngFile) && pdftoppm) {
      await runProcess(pdftoppm, ['-png', '-r', String(PNG_DPI), '-singlefile', 'picture_pdf.pdf', 'picture_pdf'], tmpDir, CONVERT_TIMEOUT_MS);
    }

    if (!fs.existsSync(pngFile)) {
      throw new Error('Không tạo được file ảnh PNG từ kết quả PDF.');
    }

    const pngBuf = fs.readFileSync(pngFile);
    const { w: pxW, h: pxH } = parsePngDimensions(pngBuf);
    const w = pxW > 0 ? (pxW * 72) / PNG_DPI : 180;
    const h = pxH > 0 ? (pxH * 72) / PNG_DPI : 120;
    return {
      src: `data:image/png;base64,${pngBuf.toString('base64')}`,
      w,
      h
    };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
}

async function traceTikz(source, defs = '') {
  if (!source || !String(source).trim()) {
    throw new Error('Mã TikZ đang trống.');
  }

  const pdflatex = findTexBin('pdflatex');
  if (!pdflatex) {
    throw new Error('Chưa cài đặt TeX (MiKTeX hoặc TeX Live) trên máy tính này.');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minnote-trace-'));
  try {
    const texFile = path.join(tmpDir, 'trace.tex');
    const traceFile = path.join(tmpDir, 'trace.txt');
    fs.writeFileSync(texFile, buildLatexDocument(source, defs, false, true), 'utf8');

    const res = await runProcess(pdflatex, buildTexArgs(pdflatex, 'trace.tex'), tmpDir, COMPILE_TIMEOUT_MS);
    if (fs.existsSync(traceFile)) {
      const traceText = fs.readFileSync(traceFile, 'utf8');
      if (traceText.trim()) return traceText;
    }

    throw new Error(extractLatexError(path.join(tmpDir, 'trace.log'), res.stdout, res.stderr, res.timedOut));
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
}

module.exports = { renderTikz, traceTikz, findTexBin, buildLatexDocument };
