#!/usr/bin/env node
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
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

// Built dynamically so this script's own source does not false-positive sentinel checks.
const HEADER_SENTINEL = ['DM-COPYRIGHT-OWNER', 'DoMiinhMath'].join(': ');
const FOOTER_SENTINEL = ['DM-COPYRIGHT-CORE', 'DoMiinhMath'].join(': ');
const SPDX_ID = ['LicenseRef', 'Proprietary', 'DoMiinhMath'].join('-');
const TDM_LINE = ['TDM-Reservation', '1'].join(': ');

const NOTICE_LINES = [
  '=============================================================================',
  'BẢN QUYỀN SỞ HỮU TRÍ TUỆ — ĐỖ MIINH MATH (MINNOTE PROPRIETARY)',
  'Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.',
  HEADER_SENTINEL,
  `SPDX-License-Identifier: ${SPDX_ID}`,
  TDM_LINE,
  '-----------------------------------------------------------------------------',
  'Đây là bản quyền thuộc sở hữu độc quyền của Đỗ Miinh Math (MinNote).',
  'Nghiêm cấm sao chép, phân phối lại, dịch ngược (reverse engineering),',
  'giải biên dịch (decompilation), tách thuật toán hoặc sử dụng công cụ AI/LLM',
  'tự động trích xuất, tái tạo, huấn luyện trên mã nguồn này khi chưa có sự',
  'đồng ý bằng văn bản từ Đỗ Miinh Math.',
  'Proprietary & Confidential. Reverse engineering, decompilation, and automated',
  'AI/LLM extraction, reconstruction, or training are strictly prohibited.',
  '============================================================================='
];

const FOOTER_TEXT = `[${FOOTER_SENTINEL}] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (${TDM_LINE}).`;

const PACKAGE_COPYRIGHT =
  `Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved. Proprietary — ${TDM_LINE} (${HEADER_SENTINEL}).`;
const SCHEMA_COMMENT =
  `Đây là bản quyền thuộc sở hữu của Đỗ Miinh Math (MinNote Proprietary). ${TDM_LINE} — Nghiêm cấm sao chép, dịch ngược hoặc trích xuất tự động bằng AI (${HEADER_SENTINEL}).`;
const JSON_COPYRIGHT =
  `Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (${TDM_LINE}). Đây là bản quyền thuộc sở hữu của Đỗ Miinh Math; nghiêm cấm sao chép, dịch ngược hoặc trích xuất tự động bằng AI (${HEADER_SENTINEL}).`;

const CODE_EXTENSIONS = new Set([
  '.js', '.cjs', '.cs', '.css', '.html', '.xaml', '.csproj',
  '.py', '.yml', '.ps1', '.iss', '.bat'
]);

const DOC_EXTENSIONS = new Set(['.md', '.txt']);

const BINARY_EXTENSIONS = new Set([
  '.pak', '.dll', '.node', '.exe', '.asar', '.png', '.svg', '.woff2', '.woff',
  '.ttf', '.otf', '.ico', '.bin', '.dat', '.jpg', '.jpeg', '.webp', '.gif',
  '.mp4', '.webm', '.wav', '.mp3', '.zip', '.pdf', '.pdb', '.manifest'
]);

const EXCLUDED_EXACT_PATHS = new Set([
  'MinNote_App/vk_swiftshader_icd.json',
  'MinNote_App/resources/app-update.yml',
  'MinNote_App/version',
  'MinNote_App/LICENSE',
  'MinNote_App/LICENSE.electron.txt',
  'MinNote_App/LICENSES.chromium.html',
  '.gitignore',
  'app.manifest'
]);

const FIRST_PARTY_SCAN_PREFIXES = [
  'Services/',
  'Views/',
  'Resources/Whiteboard/',
  'scripts/',
  'prompts/',
  '.github/'
];

const IGNORED_DIRS = new Set([
  '.git', '.vs', '.claude', 'bin', 'obj', 'dist', 'publish',
  'publish_selfcontained', 'node_modules', 'redist'
]);

function toPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function detectEol(text) {
  const crlf = (text.match(/\r\n/g) || []).length;
  const lf = (text.match(/(?<!\r)\n/g) || []).length;
  return crlf > lf ? '\r\n' : '\n';
}

function hasThirdPartyOssHeaderInVinacal(absPath) {
  try {
    const sample = fs.readFileSync(absPath, 'utf8').slice(0, 1200);
    if (sample.includes(HEADER_SENTINEL)) return false;
    return /\b(MIT License|Apache License|BSD \d-Clause|GNU General Public License|Mozilla Public License|@license\b|SPDX-License-Identifier:\s*(?!LicenseRef-Proprietary-DoMiinhMath))/i.test(sample);
  } catch (_) {
    return false;
  }
}

function classifyFile(relPath) {
  const norm = toPosix(relPath);
  const base = path.basename(norm);
  const ext = path.extname(base).toLowerCase();

  if (EXCLUDED_EXACT_PATHS.has(norm)) {
    return { category: 'excluded_third_party', reason: 'excluded-config-or-third-party', ext: ext || '(noext)' };
  }
  if (norm.startsWith('MinNote_App/resources/app.asar.unpacked/')) {
    return { category: 'excluded_third_party', reason: 'app.asar.unpacked', ext: ext || '(noext)' };
  }
  if (/(^|\/)mathjax\//i.test(norm)) {
    return { category: 'excluded_third_party', reason: 'mathjax', ext: ext || '(noext)' };
  }
  if (/(^|\/)fonts\//i.test(norm)) {
    return { category: 'excluded_third_party', reason: 'fonts', ext: ext || '(noext)' };
  }
  if (/^katex\.min\./i.test(base)) {
    return { category: 'excluded_third_party', reason: 'katex', ext };
  }
  if (/^pdf-.*\.js$/i.test(base) || /^pdf\.worker-/i.test(base)) {
    return { category: 'excluded_third_party', reason: 'pdf.js', ext };
  }
  if (/^qrcode\.min\.js$/i.test(base)) {
    return { category: 'excluded_third_party', reason: 'qrcode', ext };
  }
  if (/^capacitor-.*\.js$/i.test(base)) {
    return { category: 'excluded_third_party', reason: 'capacitor', ext };
  }
  if (/^LICENSE($|[.\-_])|^LICENSES($|[.\-_])|^OFL-|^THIRD-PARTY\.txt$/.test(base)) {
    return { category: 'excluded_third_party', reason: 'license-file', ext: ext || '(noext)' };
  }
  if (BINARY_EXTENSIONS.has(ext)) {
    return { category: 'excluded_third_party', reason: 'binary-asset', ext };
  }

  // Guard Resources/Whiteboard/assets/vinacal/ against overwriting OSS copyrights
  if (norm.startsWith('Resources/Whiteboard/assets/vinacal/') && (CODE_EXTENSIONS.has(ext) || ext === '.json')) {
    const absPath = path.join(REPO_ROOT, norm);
    if (fs.existsSync(absPath) && hasThirdPartyOssHeaderInVinacal(absPath)) {
      return { category: 'excluded_third_party', reason: 'vinacal-third-party-oss', ext };
    }
  }

  if (DOC_EXTENSIONS.has(ext)) {
    return { category: 'excluded_docs', reason: 'documentation', ext };
  }
  if (ext === '.json') {
    return { category: 'eligible_json', reason: 'first-party-json', ext };
  }
  if (CODE_EXTENSIONS.has(ext)) {
    return { category: 'eligible_code', reason: 'first-party-code', ext };
  }
  return { category: 'excluded_third_party', reason: 'unrecognized-or-binary', ext: ext || '(noext)' };
}

function collectRepoFiles() {
  const fileSet = new Set();

  try {
    const tracked = execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    for (const line of tracked.split(/\r?\n/)) {
      const f = line.trim();
      if (f && fs.existsSync(path.join(REPO_ROOT, f))) {
        fileSet.add(toPosix(f));
      }
    }

    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024
    });
    for (const line of untracked.split(/\r?\n/)) {
      const f = toPosix(line.trim());
      if (!f) continue;
      const topSeg = f.split('/')[0];
      if (IGNORED_DIRS.has(topSeg)) continue;
      const isRootFile = !f.includes('/');
      const isScoped = FIRST_PARTY_SCAN_PREFIXES.some((p) => f.startsWith(p));
      if ((isRootFile || isScoped) && fs.existsSync(path.join(REPO_ROOT, f))) {
        fileSet.add(f);
      }
    }
  } catch (_) {
    // Fallback walk if git is unavailable
    const walk = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.isDirectory()) {
          if (IGNORED_DIRS.has(ent.name)) continue;
          walk(path.join(dir, ent.name));
        } else if (ent.isFile()) {
          fileSet.add(toPosix(path.relative(REPO_ROOT, path.join(dir, ent.name))));
        }
      }
    };
    walk(REPO_ROOT);
  }

  return [...fileSet].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function formatBlockComment(eol) {
  return ['/*', ...NOTICE_LINES.map((l) => ` * ${l}`), ' */'].join(eol);
}

function formatXmlComment(eol) {
  // XML 1.0 forbids "--" anywhere inside <!-- ... -->; use Unicode U+2500 box drawing for divider.
  const xmlLines = NOTICE_LINES.map((l) =>
    l.includes('--') ? l.replace(/-/g, '─') : l
  );
  return ['<!--', ...xmlLines.map((l) => `  ${l}`), '-->'].join(eol);
}

function formatHashComment(eol, isPython) {
  const lines = isPython
    ? ['# Đây là bản quyền thuộc sở hữu của Đỗ Miinh Math (MinNote Proprietary).', ...NOTICE_LINES.map((l) => `# ${l}`)]
    : NOTICE_LINES.map((l) => `# ${l}`);
  return lines.join(eol);
}

function formatSemicolonComment(eol) {
  return NOTICE_LINES.map((l) => `; ${l}`).join(eol);
}

function formatBatchComment(eol) {
  return NOTICE_LINES.map((l) => `:: ${l}`).join(eol);
}

function hasHeaderInTop(text) {
  return text.slice(0, 2200).includes(HEADER_SENTINEL);
}

function hasFooterInBottom(text) {
  return text.slice(-900).includes(FOOTER_SENTINEL);
}

function stampCodeContent(relPath, rawText, ext) {
  let bom = '';
  let text = rawText;
  if (text.startsWith('\uFEFF')) {
    bom = '\uFEFF';
    text = text.slice(1);
  }

  const eol = detectEol(text);
  const needsHeader = !hasHeaderInTop(text);
  const needsFooter = !hasFooterInBottom(text);

  if (!needsHeader && !needsFooter) {
    return { changed: false, content: rawText };
  }

  if (ext === '.js' || ext === '.cjs') {
    if (needsHeader) {
      const shebang = text.match(/^#![^\r\n]*(?:\r?\n|$)/);
      const header = formatBlockComment(eol);
      if (shebang) {
        const prefix = shebang[0].endsWith('\n') ? shebang[0] : shebang[0] + eol;
        text = prefix + header + eol + text.slice(shebang[0].length);
      } else {
        text = header + eol + text;
      }
    }
    if (needsFooter) {
      const footer = `/* ${FOOTER_TEXT} */`;
      const smMatch = text.match(/((?:\r?\n)[ \t]*(?:\/\/|\/\*)[@#][ \t]*sourceMappingURL=[^\r\n]*(?:\*\/)?[ \t]*(?:\r?\n)*)$/);
      if (smMatch) {
        const idx = text.length - smMatch[1].length;
        text = text.slice(0, idx) + eol + footer + smMatch[1];
      } else {
        const sep = text.endsWith('\n') ? '' : eol;
        text = text + sep + footer + eol;
      }
    }
  } else if (ext === '.cs') {
    if (needsHeader) {
      text = formatBlockComment(eol) + eol + text;
    }
    if (needsFooter) {
      const sep = text.endsWith('\n') ? '' : eol;
      text = text + sep + `// ${FOOTER_TEXT}` + eol;
    }
  } else if (ext === '.css') {
    if (needsHeader) {
      const charset = text.match(/^@charset\s+["'][^"']+["']\s*;[ \t]*(?:\r?\n|$)/i);
      const header = formatBlockComment(eol);
      if (charset) {
        const prefix = charset[0].endsWith('\n') ? charset[0] : charset[0] + eol;
        text = prefix + header + eol + text.slice(charset[0].length);
      } else {
        text = header + eol + text;
      }
    }
    if (needsFooter) {
      const footer = `/* ${FOOTER_TEXT} */`;
      const smMatch = text.match(/((?:\r?\n)[ \t]*\/\*[#@][ \t]*sourceMappingURL=[^\r\n]*\*\/[ \t]*(?:\r?\n)*)$/);
      if (smMatch) {
        const idx = text.length - smMatch[1].length;
        text = text.slice(0, idx) + eol + footer + smMatch[1];
      } else {
        const sep = text.endsWith('\n') ? '' : eol;
        text = text + sep + footer + eol;
      }
    }
  } else if (ext === '.html') {
    if (needsHeader) {
      const doctype = text.match(/^([ \t]*<!doctype\s+html[^>]*>[ \t]*(?:\r?\n)?)/i);
      const header = formatXmlComment(eol);
      if (doctype) {
        const prefix = doctype[1].endsWith('\n') ? doctype[1] : doctype[1] + eol;
        text = prefix + header + eol + text.slice(doctype[1].length);
      } else {
        text = header + eol + text;
      }
    }
    if (needsFooter) {
      const footer = `<!-- ${FOOTER_TEXT} -->`;
      const closeHtml = text.match(/(<\/html>\s*)$/i);
      if (closeHtml) {
        const idx = text.length - closeHtml[1].length;
        const before = text.slice(0, idx);
        const sep = before.endsWith('\n') ? '' : eol;
        text = before + sep + footer + eol + closeHtml[1];
      } else {
        const sep = text.endsWith('\n') ? '' : eol;
        text = text + sep + footer + eol;
      }
    }
  } else if (ext === '.xaml' || ext === '.csproj') {
    if (needsHeader) {
      const xmlDecl = text.match(/^(<\?xml[\s\S]*?\?>[ \t]*(?:\r?\n)?)/i);
      const header = formatXmlComment(eol);
      if (xmlDecl) {
        const prefix = xmlDecl[1].endsWith('\n') ? xmlDecl[1] : xmlDecl[1] + eol;
        text = prefix + header + eol + text.slice(xmlDecl[1].length);
      } else {
        text = header + eol + text;
      }
    }
    if (needsFooter) {
      const sep = text.endsWith('\n') ? '' : eol;
      text = text + sep + `<!-- ${FOOTER_TEXT} -->` + eol;
    }
  } else if (ext === '.py') {
    if (needsHeader) {
      const lines = text.split(/\r?\n/);
      let insertAt = 0;
      if (lines.length > 0 && /^#!/.test(lines[0])) {
        insertAt = 1;
      }
      if (lines.length > insertAt && /^[ \t]*#.*coding[:=][ \t]*[-\w.]+/i.test(lines[insertAt])) {
        insertAt += 1;
      }
      const header = formatHashComment(eol, true);
      if (insertAt > 0) {
        const prefix = lines.slice(0, insertAt).join(eol) + eol;
        const rest = lines.slice(insertAt).join(eol);
        text = prefix + header + eol + rest;
      } else {
        text = header + eol + text;
      }
    }
    if (needsFooter) {
      const sep = text.endsWith('\n') ? '' : eol;
      text = text + sep + `# ${FOOTER_TEXT}` + eol;
    }
  } else if (ext === '.yml' || ext === '.ps1') {
    if (needsHeader) {
      const docStart = ext === '.yml' ? text.match(/^(---[ \t]*(?:\r?\n|$))/) : null;
      const header = formatHashComment(eol, false);
      if (docStart) {
        const prefix = docStart[1].endsWith('\n') ? docStart[1] : docStart[1] + eol;
        text = prefix + header + eol + text.slice(docStart[1].length);
      } else {
        text = header + eol + text;
      }
    }
    if (needsFooter) {
      const sep = text.endsWith('\n') ? '' : eol;
      text = text + sep + `# ${FOOTER_TEXT}` + eol;
    }
  } else if (ext === '.iss') {
    if (needsHeader) {
      text = formatSemicolonComment(eol) + eol + text;
    }
    if (needsFooter) {
      const sep = text.endsWith('\n') ? '' : eol;
      // Inside Inno Setup [Code] section, Pascal Script uses // comments (";" is a syntax error).
      const hasCodeSection = /^[ \t]*\[Code\][ \t]*$/im.test(text);
      const footerLine = hasCodeSection ? `// ${FOOTER_TEXT}` : `; ${FOOTER_TEXT}`;
      text = text + sep + footerLine + eol;
    }
  } else if (ext === '.bat') {
    if (needsHeader) {
      const echoOff = text.match(/^(@echo\s+off[ \t]*(?:\r?\n|$))/i);
      const header = formatBatchComment(eol);
      if (echoOff) {
        const prefix = echoOff[1].endsWith('\n') ? echoOff[1] : echoOff[1] + eol;
        text = prefix + header + eol + text.slice(echoOff[1].length);
      } else {
        text = header + eol + text;
      }
    }
    if (needsFooter) {
      const sep = text.endsWith('\n') ? '' : eol;
      text = text + sep + `:: ${FOOTER_TEXT}` + eol;
    }
  }

  const finalContent = bom + text;
  return { changed: finalContent !== rawText, content: finalContent };
}

function stampJsonContent(relPath, rawText) {
  let bom = '';
  let text = rawText;
  if (text.startsWith('\uFEFF')) {
    bom = '\uFEFF';
    text = text.slice(1);
  }
  const eol = detectEol(text);
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Root JSON must be an object: ${relPath}`);
  }

  const norm = toPosix(relPath);
  let updatedObj;

  if (norm === 'package.json' || norm === 'MinNote_App/resources/app/package.json') {
    if (
      parsed.author === 'Đỗ Miinh Math' &&
      parsed.license === 'UNLICENSED' &&
      parsed.private === true &&
      parsed.copyright === PACKAGE_COPYRIGHT
    ) {
      return { changed: false, content: rawText };
    }
    updatedObj = {};
    let insertedMeta = false;
    for (const [k, v] of Object.entries(parsed)) {
      if (k === 'author' || k === 'license' || k === 'private' || k === 'copyright') continue;
      updatedObj[k] = v;
      if (k === 'description' && !insertedMeta) {
        updatedObj.author = 'Đỗ Miinh Math';
        updatedObj.license = 'UNLICENSED';
        updatedObj.private = true;
        updatedObj.copyright = PACKAGE_COPYRIGHT;
        insertedMeta = true;
      }
    }
    if (!insertedMeta) {
      updatedObj.author = 'Đỗ Miinh Math';
      updatedObj.license = 'UNLICENSED';
      updatedObj.private = true;
      updatedObj.copyright = PACKAGE_COPYRIGHT;
    }
  } else if (norm.startsWith('prompts/schemas/')) {
    if (parsed.$comment === SCHEMA_COMMENT) {
      return { changed: false, content: rawText };
    }
    updatedObj = {};
    let inserted = false;
    for (const [k, v] of Object.entries(parsed)) {
      if (k === '$comment') continue;
      updatedObj[k] = v;
      if (k === '$id' && !inserted) {
        updatedObj.$comment = SCHEMA_COMMENT;
        inserted = true;
      }
    }
    if (!inserted) {
      updatedObj = { $comment: SCHEMA_COMMENT, ...updatedObj };
    }
  } else {
    const keys = Object.keys(parsed);
    if (keys[0] === '$copyright' && parsed.$copyright === JSON_COPYRIGHT) {
      return { changed: false, content: rawText };
    }
    updatedObj = { $copyright: JSON_COPYRIGHT };
    for (const [k, v] of Object.entries(parsed)) {
      if (k === '$copyright') continue;
      updatedObj[k] = v;
    }
  }

  const serialized = JSON.stringify(updatedObj, null, 2).replace(/\n/g, eol) + eol;
  const finalContent = bom + serialized;
  return { changed: finalContent !== rawText, content: finalContent };
}

function checkFileCompliance(relPath, info) {
  const absPath = path.join(REPO_ROOT, relPath);
  const raw = fs.readFileSync(absPath, 'utf8');
  const text = raw.startsWith('\uFEFF') ? raw.slice(1) : raw;

  if (info.category === 'eligible_json') {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      return { ok: false, reason: `Invalid JSON: ${err.message}` };
    }
    const norm = toPosix(relPath);
    if (norm === 'package.json' || norm === 'MinNote_App/resources/app/package.json') {
      if (
        parsed.author !== 'Đỗ Miinh Math' ||
        parsed.license !== 'UNLICENSED' ||
        parsed.private !== true ||
        typeof parsed.copyright !== 'string' ||
        !parsed.copyright.includes(HEADER_SENTINEL)
      ) {
        return { ok: false, reason: 'Missing required package.json author/license/private/copyright fields' };
      }
      return { ok: true };
    }
    if (norm.startsWith('prompts/schemas/')) {
      if (typeof parsed.$comment !== 'string' || !parsed.$comment.includes(HEADER_SENTINEL)) {
        return { ok: false, reason: 'Missing schema $comment sentinel' };
      }
      return { ok: true };
    }
    if (typeof parsed.$copyright !== 'string' || !parsed.$copyright.includes(HEADER_SENTINEL)) {
      return { ok: false, reason: 'Missing root $copyright sentinel' };
    }
    return { ok: true };
  }

  if (info.category === 'eligible_code') {
    const missing = [];
    if (!hasHeaderInTop(text)) missing.push('header');
    if (!hasFooterInBottom(text)) missing.push('footer');
    if (missing.length > 0) {
      return { ok: false, reason: `Missing ${missing.join(' & ')} sentinel` };
    }
    return { ok: true };
  }

  return { ok: true };
}

function buildInventory() {
  const files = collectRepoFiles();
  const buckets = {
    eligible_code: [],
    eligible_json: [],
    excluded_docs: [],
    excluded_third_party: []
  };

  for (const relPath of files) {
    const info = classifyFile(relPath);
    buckets[info.category].push({ relPath, ...info });
  }
  return { total: files.length, buckets };
}

function countByKey(items, key) {
  const counts = {};
  for (const item of items) {
    const k = item[key] || '(unknown)';
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])));
}

function main() {
  const args = new Set(process.argv.slice(2));
  const doApply = args.has('--apply');
  const doCheck = args.has('--check');
  const doReport = args.has('--report');
  const asJson = args.has('--json');

  if (!doApply && !doCheck && !doReport) {
    console.log('Usage: node scripts/stamp_copyright.js [--apply] [--check] [--report] [--json]');
    process.exit(2);
  }

  const inv = buildInventory();
  const eligible = [...inv.buckets.eligible_code, ...inv.buckets.eligible_json];

  if (doApply) {
    let modified = 0;
    let unchanged = 0;
    const errors = [];

    for (const item of eligible) {
      const absPath = path.join(REPO_ROOT, item.relPath);
      try {
        const raw = fs.readFileSync(absPath, 'utf8');
        const res =
          item.category === 'eligible_json'
            ? stampJsonContent(item.relPath, raw)
            : stampCodeContent(item.relPath, raw, item.ext);
        if (res.changed) {
          fs.writeFileSync(absPath, res.content, { encoding: 'utf8' });
          modified++;
        } else {
          unchanged++;
        }
      } catch (err) {
        errors.push({ file: item.relPath, error: err.message });
      }
    }

    console.log(
      `[stamp_copyright] --apply complete: eligible=${eligible.length}, modified=${modified}, unchanged=${unchanged}, skipped_docs=${inv.buckets.excluded_docs.length}, skipped_third_party=${inv.buckets.excluded_third_party.length}`
    );
    if (errors.length > 0) {
      for (const e of errors) {
        console.error(`  ERROR ${e.file}: ${e.error}`);
      }
      process.exit(1);
    }
  }

  if (doCheck) {
    const failures = [];
    for (const item of eligible) {
      const res = checkFileCompliance(item.relPath, item);
      if (!res.ok) {
        failures.push({ file: item.relPath, reason: res.reason });
      }
    }
    if (failures.length > 0) {
      console.error(`[stamp_copyright] --check FAILED: ${failures.length}/${eligible.length} eligible files non-compliant:`);
      for (const f of failures) {
        console.error(`  MISSING ${f.file}: ${f.reason}`);
      }
      process.exit(1);
    }
    console.log(
      `[stamp_copyright] --check PASSED: ${eligible.length}/${eligible.length} eligible files (code=${inv.buckets.eligible_code.length}, json=${inv.buckets.eligible_json.length}) are 100% compliant.`
    );
  }

  if (doReport) {
    const report = {
      totalFiles: inv.total,
      eligibleTotal: eligible.length,
      eligibleCode: {
        count: inv.buckets.eligible_code.length,
        byExtension: countByKey(inv.buckets.eligible_code, 'ext')
      },
      eligibleJson: {
        count: inv.buckets.eligible_json.length,
        files: inv.buckets.eligible_json.map((x) => x.relPath)
      },
      excludedDocs: {
        count: inv.buckets.excluded_docs.length,
        byExtension: countByKey(inv.buckets.excluded_docs, 'ext')
      },
      excludedThirdPartyAndBinaries: {
        count: inv.buckets.excluded_third_party.length,
        byReason: countByKey(inv.buckets.excluded_third_party, 'reason'),
        byExtension: countByKey(inv.buckets.excluded_third_party, 'ext')
      }
    };

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log('=== MinNote Copyright Compliance Report ===');
      console.log(`Total repository files inspected : ${report.totalFiles}`);
      console.log(`Eligible stamped files (total)   : ${report.eligibleTotal}`);
      console.log(`  - Eligible Code                : ${report.eligibleCode.count}`);
      for (const [ext, cnt] of Object.entries(report.eligibleCode.byExtension)) {
        console.log(`      ${ext.padEnd(10)} : ${cnt}`);
      }
      console.log(`  - Eligible JSON                : ${report.eligibleJson.count}`);
      console.log(`Excluded Docs (.md/.txt)         : ${report.excludedDocs.count}`);
      console.log(`Excluded Third-Party & Binaries  : ${report.excludedThirdPartyAndBinaries.count}`);
      for (const [reason, cnt] of Object.entries(report.excludedThirdPartyAndBinaries.byReason)) {
        console.log(`      ${reason.padEnd(30)} : ${cnt}`);
      }
    }
  }
}

main();
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
