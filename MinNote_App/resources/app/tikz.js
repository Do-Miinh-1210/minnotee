// MinNote TikZ & TikZ-3D Compiler
// Lazy senior dev: 100% stdlib (child_process, fs, os, path). Zero npm dependencies.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function findTexBin(name) {
  const isWin = process.platform === 'win32';
  const exe = isWin ? `${name}.exe` : name;

  // 1. Check PATH
  const envPath = (process.env.PATH || '').split(path.delimiter);
  for (const p of envPath) {
    const full = path.join(p, exe);
    if (fs.existsSync(full)) return full;
  }

  // 2. Common Windows paths (MiKTeX & TeX Live)
  if (isWin) {
    const localApp = process.env.LOCALAPPDATA || '';
    const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const progFiles86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    const candidates = [
      path.join(localApp, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', exe),
      path.join(progFiles, 'MiKTeX', 'miktex', 'bin', 'x64', exe),
      path.join(progFiles86, 'MiKTeX', 'miktex', 'bin', 'x64', exe),
    ];
    // Check TeX Live (e.g. C:\texlive\2026\bin\windows or 2025/2024)
    const texLiveRoot = 'C:\\texlive';
    if (fs.existsSync(texLiveRoot)) {
      try {
        const dirs = fs.readdirSync(texLiveRoot).filter(d => /^\d{4}$/.test(d));
        for (const yr of dirs) {
          candidates.push(path.join(texLiveRoot, yr, 'bin', 'windows', exe));
          candidates.push(path.join(texLiveRoot, yr, 'bin', 'win32', exe));
        }
      } catch (_) {}
    }

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  return null;
}

function renderTikz(tikzSource) {
  const pdflatex = findTexBin('pdflatex');
  if (!pdflatex) {
    throw new Error('Chưa cài đặt TeX (MiKTeX hoặc TeX Live) trên máy tính này để vẽ hình TikZ.');
  }

  const pdftoppm = findTexBin('pdftoppm');
  const gs = findTexBin('gswin64c') || findTexBin('gswin32c') || findTexBin('gs');

  if (!pdftoppm && !gs) {
    throw new Error('Không tìm thấy pdftoppm hoặc Ghostscript để xuất ảnh từ TeX.');
  }

  // Auto-detect preamble libraries
  const isNonAscii = /[^\x00-\x7f]/.test(tikzSource);
  let preamble = '\\documentclass[border=2pt]{standalone}\n\\usepackage[utf8]{inputenc}\n';
  if (isNonAscii) preamble += '\\usepackage[T5]{fontenc}\n';
  preamble += '\\usepackage{amsmath,amssymb}\n\\usepackage{tikz}\n';
  preamble += '\\usetikzlibrary{arrows,arrows.meta,calc,angles,quotes,intersections,patterns,positioning,shapes.geometric,decorations.markings}\n';

  if (/pattern\s*=\s*\{?\s*(Lines|Hatch|Dots|Stars)\b/i.test(tikzSource)) {
    preamble += '\\usetikzlibrary{patterns.meta}\n';
  }
  if (/\\tkzTab/i.test(tikzSource)) {
    preamble += '\\usepackage{tkz-tab}\n';
  }
  if (/\\tkz/i.test(tikzSource)) {
    preamble += '\\usepackage{tkz-euclide}\n';
  }
  if (/\\tdplot/i.test(tikzSource) || /tikz-3dplot/i.test(tikzSource)) {
    preamble += '\\usepackage{tikz-3dplot}\n';
  }
  if (/\\begin\s*\{(axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis)\}/i.test(tikzSource)) {
    preamble += '\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.18}\n';
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minnote-tikz-'));
  const texFile = path.join(tmpDir, 'picture.tex');
  const pdfFile = path.join(tmpDir, 'picture.pdf');
  const pngFile = path.join(tmpDir, 'picture.png');

  try {
    const fullLatex = `${preamble}\\begin{document}\n${tikzSource}\n\\end{document}\n`;
    fs.writeFileSync(texFile, fullLatex, 'utf8');

    // Compile LaTeX
    const texRes = spawnSync(pdflatex, [
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-enable-installer',
      'picture.tex'
    ], { cwd: tmpDir, timeout: 20000, windowsHide: true });

    if (!fs.existsSync(pdfFile)) {
      const logContent = fs.existsSync(path.join(tmpDir, 'picture.log'))
        ? fs.readFileSync(path.join(tmpDir, 'picture.log'), 'latin1')
        : (texRes.stderr ? texRes.stderr.toString() : 'Lỗi biên dịch TeX không rõ.');
      const errMatch = logContent.match(/!(?:.(?!\n!))*?\nl\.\d+[^\n]*/s) || [logContent.slice(-400)];
      throw new Error(errMatch[0]);
    }

    // Convert PDF -> PNG
    if (pdftoppm) {
      spawnSync(pdftoppm, ['-png', '-r', '300', '-singlefile', 'picture.pdf', 'picture'], { cwd: tmpDir, windowsHide: true });
    } else if (gs) {
      spawnSync(gs, [
        '-dSAFER', '-dBATCH', '-dNOPAUSE',
        '-sDEVICE=png16m', '-dTextAlphaBits=4', '-dGraphicsAlphaBits=4',
        '-r300', '-sOutputFile=picture.png', 'picture.pdf'
      ], { cwd: tmpDir, windowsHide: true });
    }

    if (!fs.existsSync(pngFile)) {
      throw new Error('Không tạo được file ảnh PNG từ kết quả PDF.');
    }

    const pngBuf = fs.readFileSync(pngFile);
    return `data:image/png;base64,${pngBuf.toString('base64')}`;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
}

function traceTikz(source) {
  // Trace coordinates if needed, or fallback to render
  return renderTikz(source);
}

module.exports = { renderTikz, traceTikz, findTexBin };
