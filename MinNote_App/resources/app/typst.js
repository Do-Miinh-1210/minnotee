// MinNote Typst & CeTZ Compiler
// Lazy senior dev: 100% stdlib.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function findTypstBin() {
  const isWin = process.platform === 'win32';
  const exe = isWin ? 'typst.exe' : 'typst';

  const envPath = (process.env.PATH || '').split(path.delimiter);
  for (const p of envPath) {
    const full = path.join(p, exe);
    if (fs.existsSync(full)) return full;
  }

  if (isWin) {
    const localApp = process.env.LOCALAPPDATA || '';
    const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const home = os.homedir();

    const candidates = [
      path.join(localApp, 'Microsoft', 'WinGet', 'Links', exe),
      path.join(home, 'scoop', 'shims', exe),
      path.join(localApp, 'Programs', 'Typst', exe),
      path.join(home, '.cargo', 'bin', exe),
      path.join(progFiles, 'Typst', exe),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  return null;
}

function renderTypst(source) {
  const typst = findTypstBin();
  if (!typst) {
    throw new Error('Chưa cài đặt Typst trên máy tính này. Cài đặt bằng: winget install Typst.Typst');
  }

  let code = source.trim();
  if (/\bcetz\./.test(code) && !code.includes('@preview/cetz')) {
    code = `#import "@preview/cetz:0.4.2"\n` + code;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minnote-typst-'));
  const typFile = path.join(tmpDir, 'document.typ');
  const outPngPattern = path.join(tmpDir, 'page-{p}.png');
  const page1 = path.join(tmpDir, 'page-1.png');

  try {
    fs.writeFileSync(typFile, code, 'utf8');

    const res = spawnSync(typst, ['compile', 'document.typ', outPngPattern, '--ppi', '300'], {
      cwd: tmpDir,
      timeout: 15000,
      windowsHide: true
    });

    if (!fs.existsSync(page1)) {
      throw new Error(res.stderr ? res.stderr.toString() : 'Lỗi biên dịch Typst không rõ.');
    }

    const pngBuf = fs.readFileSync(page1);
    return `data:image/png;base64,${pngBuf.toString('base64')}`;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
}

module.exports = { renderTypst, findTypstBin };
