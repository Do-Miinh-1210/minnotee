// MinNote Word (.docx) to PDF Converter
// Uses Microsoft Word COM Automation via PowerShell; fallbacks to LibreOffice CLI.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function findLibreOffice() {
  const isWin = process.platform === 'win32';
  const exe = isWin ? 'soffice.exe' : 'soffice';

  // 1. Check PATH
  const envPath = (process.env.PATH || '').split(path.delimiter);
  for (const p of envPath) {
    const full = path.join(p, exe);
    if (fs.existsSync(full)) return full;
  }

  // 2. Common Windows paths
  if (isWin) {
    const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const progFiles86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const candidates = [
      path.join(progFiles, 'LibreOffice', 'program', exe),
      path.join(progFiles86, 'LibreOffice', 'program', exe)
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  return null;
}

function convertWordToPdf(inputWordPath) {
  if (!fs.existsSync(inputWordPath)) {
    throw new Error('File Word không tồn tại: ' + inputWordPath);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minnote-word-'));
  const outPdf = path.join(tmpDir, 'document.pdf');
  const absIn = path.resolve(inputWordPath);

  // Method 1: Microsoft Word COM via PowerShell
  if (process.platform === 'win32') {
    const psScript = `$w = New-Object -ComObject Word.Application; try { $w.Visible = $false; $d = $w.Documents.Open($env:NR_IN, $false, $true, $false); $d.ExportAsFixedFormat($env:NR_OUT, 17); $d.Close(0) } finally { $w.Quit() }`;
    const res = spawnSync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      psScript
    ], {
      env: { ...process.env, NR_IN: absIn, NR_OUT: outPdf },
      timeout: 30000,
      windowsHide: true
    });

    if (fs.existsSync(outPdf)) {
      return outPdf;
    }
  }

  // Method 2: LibreOffice fallback
  const soffice = findLibreOffice();
  if (soffice) {
    spawnSync(soffice, [
      '--headless',
      '--convert-to', 'pdf',
      absIn,
      '--outdir', tmpDir
    ], { timeout: 30000, windowsHide: true });

    // Output file usually takes base name of docx
    const baseName = path.basename(absIn, path.extname(absIn));
    const candPdf = path.join(tmpDir, `${baseName}.pdf`);
    if (fs.existsSync(candPdf)) {
      return candPdf;
    }
  }

  throw new Error('Không thể chuyển đổi file Word sang PDF. Cần cài đặt Microsoft Word hoặc LibreOffice trên máy tính.');
}

module.exports = { convertWordToPdf, findLibreOffice };
