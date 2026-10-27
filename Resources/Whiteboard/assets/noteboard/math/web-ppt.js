/**
 * NoteBoard Ink - Web-PPT Client-Side Engine
 * Đọc, phân tích và dựng trình chiếu PowerPoint (.pptx) trực tiếp trong trình duyệt
 * Không phụ thuộc thư viện ngoài, tối ưu hiệu năng và giữ nguyên thiết kế & hoạt ảnh.
 */
(() => {
'use strict';

const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const P_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const M_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math';

// Helper giải mã UTF-8
const dec = new TextDecoder();

function parseXml(xmlStr) {
  const parser = new DOMParser();
  return parser.parseFromString(xmlStr, 'application/xml');
}

/**
 * Chuyển đổi Uint8Array sang Base64 theo từng khối để tránh tràn ngăn xếp và tối ưu tốc độ
 */
function bytesToBase64(u8) {
  let binary = '';
  const len = u8.length;
  const chunk = 8192;
  for (let i = 0; i < len; i += chunk) {
    const end = Math.min(i + chunk, len);
    binary += String.fromCharCode.apply(null, u8.subarray(i, end));
  }
  return btoa(binary);
}


/**
 * Trích xuất bảng màu Theme từ ppt/theme/theme1.xml
 */
function extractThemeColors(themeXmlStr) {
  const scheme = {
    dk1: '#000000', lt1: '#ffffff',
    dk2: '#1f497d', lt2: '#eeece1',
    accent1: '#4f81bd', accent2: '#c0504d',
    accent3: '#9bbb59', accent4: '#8064a2',
    accent5: '#4bacc6', accent6: '#f79646',
    hlink: '#0000ff', folHlink: '#800080',
    bg1: '#ffffff', tx1: '#000000',
    bg2: '#eeece1', tx2: '#1f497d'
  };
  if (!themeXmlStr) return scheme;

  try {
    const doc = parseXml(themeXmlStr);
    const clrScheme = doc.querySelector('clrScheme') || doc.getElementsByTagNameNS(A_NS, 'clrScheme')[0];
    if (!clrScheme) return scheme;

    for (const child of clrScheme.children) {
      const name = child.localName;
      const srgb = child.querySelector('srgbClr') || child.getElementsByTagNameNS(A_NS, 'srgbClr')[0];
      const sys = child.querySelector('sysClr') || child.getElementsByTagNameNS(A_NS, 'sysClr')[0];
      if (srgb && srgb.getAttribute('val')) {
        scheme[name] = '#' + srgb.getAttribute('val');
      } else if (sys && sys.getAttribute('lastClr')) {
        scheme[name] = '#' + sys.getAttribute('lastClr');
      }
    }
  } catch (_) {}
  return scheme;
}

/**
 * Chuyển đổi và điều chỉnh màu sắc theo các biến đổi DrawingML
 * (lumMod, lumOff, shade, tint, satMod, satOff, alpha)
 */
function applyColorTransforms(baseHex, colorNode, parentNode) {
  if (!baseHex) return null;
  const m = baseHex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return baseHex;

  let r = parseInt(m[1], 16) / 255;
  let g = parseInt(m[2], 16) / 255;
  let b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const findTag = name => (colorNode && (colorNode.querySelector(name) || colorNode.getElementsByTagNameNS(A_NS, name)[0])) ||
                          (parentNode && (parentNode.querySelector(name) || parentNode.getElementsByTagNameNS(A_NS, name)[0]));

  const lumMod = findTag('lumMod');
  if (lumMod) l *= (parseInt(lumMod.getAttribute('val')) || 100000) / 100000;

  const lumOff = findTag('lumOff');
  if (lumOff) l += (parseInt(lumOff.getAttribute('val')) || 0) / 100000;

  const shade = findTag('shade');
  if (shade) l *= (parseInt(shade.getAttribute('val')) || 100000) / 100000;

  const tint = findTag('tint');
  if (tint) {
    const t = (parseInt(tint.getAttribute('val')) || 100000) / 100000;
    l = l * t + (1 - t);
  }

  const satMod = findTag('satMod');
  if (satMod) s *= (parseInt(satMod.getAttribute('val')) || 100000) / 100000;

  const satOff = findTag('satOff');
  if (satOff) s += (parseInt(satOff.getAttribute('val')) || 0) / 100000;

  l = Math.max(0, Math.min(1, l));
  s = Math.max(0, Math.min(1, s));

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const outR = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const outG = Math.round(hue2rgb(p, q, h) * 255);
  const outB = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  const alpha = findTag('alpha');
  if (alpha) {
    const a = (parseInt(alpha.getAttribute('val')) || 100000) / 100000;
    return `rgba(${outR},${outG},${outB},${a.toFixed(2)})`;
  }
  return '#' + [outR, outG, outB].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Phân tích màu từ node OpenXML kèm biến đổi màu sắc
 */
function resolveColor(node, themeScheme) {
  if (!node) return null;
  let baseClr = null;
  let clrNode = null;

  const srgb = node.querySelector('srgbClr') || node.getElementsByTagNameNS(A_NS, 'srgbClr')[0];
  if (srgb && srgb.getAttribute('val')) {
    baseClr = '#' + srgb.getAttribute('val');
    clrNode = srgb;
  } else {
    const schemeClr = node.querySelector('schemeClr') || node.getElementsByTagNameNS(A_NS, 'schemeClr')[0];
    if (schemeClr) {
      const val = schemeClr.getAttribute('val');
      if (themeScheme && themeScheme[val]) {
        baseClr = themeScheme[val];
        clrNode = schemeClr;
      }
    } else {
      const sysClr = node.querySelector('sysClr') || node.getElementsByTagNameNS(A_NS, 'sysClr')[0];
      if (sysClr && sysClr.getAttribute('lastClr')) {
        baseClr = '#' + sysClr.getAttribute('lastClr');
        clrNode = sysClr;
      } else {
        const prstClr = node.querySelector('prstClr') || node.getElementsByTagNameNS(A_NS, 'prstClr')[0];
        if (prstClr) {
          const val = prstClr.getAttribute('val');
          const PRESET_COLORS = {
            white: '#ffffff', black: '#000000', red: '#ff0000', green: '#00ff00', blue: '#0000ff',
            yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff', gray: '#808080', grey: '#808080',
            lightGray: '#d3d3d3', darkGray: '#a9a9a9', orange: '#ffa500'
          };
          baseClr = PRESET_COLORS[val] || (val ? '#' + val : '#ffffff');
          clrNode = prstClr;
        }
      }
    }
  }

  if (!baseClr) return null;
  return applyColorTransforms(baseClr, clrNode, node);
}

function hasDirectChild(parent, tag) {
  if (!parent) return false;
  for (const ch of parent.children) {
    if (ch.localName === tag) return true;
  }
  return false;
}

function mapSymbolChar(ch, fontName) {
  if (!ch) return '';
  const code = ch.codePointAt(0);
  const byte = code & 0xff;
  const fn = fontName || '';
  const isWingdings2 = /wingdings\s*2/i.test(fn);
  const isWingdings = /wingdings/i.test(fn) && !isWingdings2;
  const isSymbolFont = isWingdings2 || isWingdings || /symbol|webdings/i.test(fn);
  const isPUA = code >= 0xf000 && code <= 0xf0ff;

  // Không bao giờ ánh xạ các ký tự Latin hoặc tiếng Việt thông thường
  if (!isSymbolFont && !isPUA) {
    return ch;
  }

  if (isWingdings2 || (isPUA && byte === 0x76)) {
    if (byte >= 0x75 && byte <= 0x7e) return String.fromCodePoint(0x2776 + (byte - 0x75)); // ❶..❿
    if (byte >= 0x80 && byte <= 0x89) return String.fromCodePoint(0x2780 + (byte - 0x80)); // ➀..➉
    if (byte === 0x50) return '✔';
    if (byte === 0x4f) return '✗';
    if (byte === 0x76) return '❷';
  }
  if (isWingdings) {
    if (byte === 0xfc) return '✔';
    if (byte === 0xfd) return '✗';
    if (byte === 0xfe) return '☑';
    if (byte === 0xa8) return '☐';
    if (byte === 0x76) return '❖';
    if (byte === 0x75) return '◆';
    if (byte === 0x6e) return '■';
    if (byte === 0x21 || byte === 0x40 || byte === 0x2a) return '✍';
    if (byte >= 0x30 && byte <= 0x39) return String.fromCharCode(byte);
  }
  // PUA fallback (0xF000..0xF0FF)
  if (isPUA) {
    if (byte === 0x76) return '❷';
    if (byte === 0x21 || byte === 0x40 || byte === 0x2a) return '✍';
    if (byte >= 0x75 && byte <= 0x7e) return String.fromCodePoint(0x2776 + (byte - 0x75));
  }
  return ch;
}

/**
 * Đọc quan hệ .rels
 */
function parseRels(relsXmlStr) {
  const map = {};
  if (!relsXmlStr) return map;
  try {
    const doc = parseXml(relsXmlStr);
    const rels = doc.getElementsByTagName('Relationship');
    for (const r of rels) {
      const id = r.getAttribute('Id');
      const target = r.getAttribute('Target');
      if (id && target) map[id] = target;
    }
  } catch (_) {}
  return map;
}

/**
 * Đọc các bước animation từ <p:timing>
 */
function extractSlideAnimations(slideDoc) {
  const steps = [];
  try {
    const timing = slideDoc.querySelector('timing') || slideDoc.getElementsByTagNameNS(P_NS, 'timing')[0];
    if (!timing) return steps;

    const animNodes = timing.querySelectorAll('cTn[presetClass="entr"]');
    let currentStepList = [];

    animNodes.forEach(node => {
      const spTgt = node.querySelector('spTgt');
      if (!spTgt) return;
      const spid = spTgt.getAttribute('spid');
      if (!spid) return;

      const presetId = node.getAttribute('presetID') || '1';
      let effect = 'appear';
      if (presetId === '10') effect = 'fade';
      else if (presetId === '2') effect = 'fly';
      else if (presetId === '22') effect = 'wipe';
      else if (presetId === '11') effect = 'zoom';

      const nodeType = node.getAttribute('nodeType');
      if (nodeType === 'clickEffect' || !currentStepList.length) {
        if (currentStepList.length) steps.push(currentStepList);
        currentStepList = [{ spid, effect }];
      } else {
        currentStepList.push({ spid, effect });
      }
    });

    if (currentStepList.length) steps.push(currentStepList);
  } catch (_) {}
  return steps;
}

/**
 * Trình biên dịch Web-PPT
 */
class WebPPT {
  /**
   * Đọc file PowerPoint (.pptx) từ File hoặc ArrayBuffer
   */
  static async read(fileOrBuffer) {
    let buf;
    if (fileOrBuffer instanceof ArrayBuffer) {
      buf = fileOrBuffer;
    } else if (fileOrBuffer && typeof fileOrBuffer.arrayBuffer === 'function') {
      buf = await fileOrBuffer.arrayBuffer();
    } else {
      throw new Error('Đầu vào không hợp lệ: cần File hoặc ArrayBuffer');
    }

    const { unzip, inflate, MIME, omml2tex, texEsc } = window.NBWordCore || {};
    if (!unzip || !inflate) throw new Error('Không tìm thấy module giải nén NBWordCore');

    const entries = await unzip(buf);

    // 1. Đọc kích thước slide từ ppt/presentation.xml
    if (!entries['ppt/presentation.xml']) throw new Error('File không phải bài trình chiếu PowerPoint hợp lệ');
    const presDocRaw = await inflate(entries['ppt/presentation.xml']);
    const presDoc = parseXml(dec.decode(presDocRaw));

    const sldSz = presDoc.querySelector('sldSz') || presDoc.getElementsByTagNameNS(P_NS, 'sldSz')[0];
    const emuW = sldSz ? parseInt(sldSz.getAttribute('cx')) || 12192000 : 12192000;
    const emuH = sldSz ? parseInt(sldSz.getAttribute('cy')) || 6858000 : 6858000;
    const ratio = emuW / emuH;

    const is169 = ratio > 1.5;
    const targetW = 1600;
    const targetH = is169 ? 900 : 1200;

    // 2. Đọc tất cả Theme Colors từ các file ppt/theme/theme*.xml
    const allThemes = {};
    for (const [k, v] of Object.entries(entries)) {
      if (/^ppt\/theme\/theme\d+\.xml$/i.test(k)) {
        const raw = await inflate(v);
        allThemes[k.toLowerCase()] = extractThemeColors(dec.decode(raw));
      }
    }
    const defaultThemeColors = allThemes['ppt/theme/theme1.xml'] || Object.values(allThemes)[0] || {};

    // 3. Đọc danh sách slide từ presentation.xml.rels
    let presRels = {};
    if (entries['ppt/_rels/presentation.xml.rels']) {
      const relsRaw = await inflate(entries['ppt/_rels/presentation.xml.rels']);
      presRels = parseRels(dec.decode(relsRaw));
    }

    const sldIdNodes = presDoc.querySelectorAll('sldId') || presDoc.getElementsByTagNameNS(P_NS, 'sldId');
    const slideEntries = [];
    for (const node of sldIdNodes) {
      const rId = node.getAttribute('r:id') || node.getAttributeNS(R_NS, 'id');
      if (rId && presRels[rId]) {
        let target = presRels[rId];
        if (target.startsWith('/')) target = target.slice(1);
        if (!target.startsWith('ppt/')) target = 'ppt/' + target.replace(/^\.\.\//, '');
        if (entries[target]) {
          slideEntries.push({ rId, target });
        }
      }
    }

    if (!slideEntries.length) {
      const slideKeys = Object.keys(entries).filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k));
      slideKeys.sort((a, b) => {
        const na = parseInt((a.match(/\d+/) || [0])[0]);
        const nb = parseInt((b.match(/\d+/) || [0])[0]);
        return na - nb;
      });
      slideKeys.forEach((target, i) => slideEntries.push({ rId: 'rId' + (i + 1), target }));
    }

    // 4. Phân tích từng slide
    const parsedSlides = [];
    for (let i = 0; i < slideEntries.length; i++) {
      const sEntry = slideEntries[i];
      const slideRaw = await inflate(entries[sEntry.target]);
      const slideDoc = parseXml(dec.decode(slideRaw));

      const relsPath = sEntry.target.replace(/ppt\/slides\/([^/]+)$/, 'ppt/slides/_rels/$1.rels');
      let slideRels = {};
      if (entries[relsPath]) {
        const sRelsRaw = await inflate(entries[relsPath]);
        slideRels = parseRels(dec.decode(sRelsRaw));
      }

      // Tìm slideLayout, master và Theme tương ứng của slide
      let slideThemeColors = defaultThemeColors;
      let layoutDoc = null;
      let layoutRels = {};
      const layoutRel = Object.values(slideRels).find(t => /slideLayouts\//i.test(t));
      if (layoutRel) {
        let layoutPath = layoutRel.startsWith('/') ? layoutRel.slice(1) : layoutRel;
        if (!layoutPath.startsWith('ppt/')) layoutPath = 'ppt/' + layoutPath.replace(/^(\.\.\/)+/, '');
        const lEntry = entries[layoutPath] || Object.entries(entries).find(([k]) => k.toLowerCase() === layoutPath.toLowerCase())?.[1];
        if (lEntry) {
          const lRaw = await inflate(lEntry);
          layoutDoc = parseXml(dec.decode(lRaw));
          const lRelsPath = layoutPath.replace(/slideLayouts\/([^/]+)$/, 'slideLayouts/_rels/$1.rels');
          const lRelsEntry = entries[lRelsPath] || Object.entries(entries).find(([k]) => k.toLowerCase() === lRelsPath.toLowerCase())?.[1];
          if (lRelsEntry) {
            const lrRaw = await inflate(lRelsEntry);
            layoutRels = parseRels(dec.decode(lrRaw));
          }
          const masterRel = Object.values(layoutRels).find(t => /slideMasters\//i.test(t));
          if (masterRel) {
            let masterPath = masterRel.startsWith('/') ? masterRel.slice(1) : masterRel;
            if (!masterPath.startsWith('ppt/')) masterPath = 'ppt/' + masterPath.replace(/^(\.\.\/)+/, '');
            const mRelsPath = masterPath.replace(/slideMasters\/([^/]+)$/, 'slideMasters/_rels/$1.rels');
            const mRelsEntry = entries[mRelsPath] || Object.entries(entries).find(([k]) => k.toLowerCase() === mRelsPath.toLowerCase())?.[1];
            if (mRelsEntry) {
              const mrRaw = await inflate(mRelsEntry);
              const masterRels = parseRels(dec.decode(mrRaw));
              const themeRel = Object.values(masterRels).find(t => /theme\//i.test(t));
              if (themeRel) {
                let themePath = themeRel.startsWith('/') ? themeRel.slice(1) : themeRel;
                if (!themePath.startsWith('ppt/')) themePath = 'ppt/' + themePath.replace(/^(\.\.\/)+/, '');
                const thClr = allThemes[themePath.toLowerCase()] || Object.entries(allThemes).find(([k]) => k.toLowerCase() === themePath.toLowerCase())?.[1];
                if (thClr) slideThemeColors = thClr;
              }
            }
          }
        }
      }

      // Media map: hỗ trợ PNG, JPEG, SVG, và tự động chuyển đổi vector EMF/WMF sang SVG data URL
      const mediaMap = {};
      const allRelsEntries = [...Object.entries(slideRels), ...Object.entries(layoutRels)];
      for (const [rId, target] of allRelsEntries) {
        if (/media\//i.test(target) && !mediaMap[rId]) {
          let mediaPath = target.startsWith('/') ? target.slice(1) : target;
          if (!mediaPath.startsWith('ppt/')) mediaPath = 'ppt/' + mediaPath.replace(/^(\.\.\/)+/, '');
          const entry = entries[mediaPath] || entries[mediaPath.replace(/\\/g, '/')] || entries[mediaPath.toLowerCase()] ||
            Object.entries(entries).find(([k]) => k.toLowerCase() === mediaPath.toLowerCase())?.[1];
          if (entry) {
            const ext = (mediaPath.split('.').pop() || 'png').toLowerCase();
            const mime = (MIME && MIME[ext]) || 'image/png';
            const mBytes = await inflate(entry);
            if (mBytes && mBytes.length) {
              let converted = false;
              if (ext === 'emf') {
                const emfApi = (typeof window !== 'undefined' && window.NBEmf) || (typeof NBEmf !== 'undefined' ? NBEmf : null);
                if (emfApi && emfApi.toSvg) {
                  try {
                    const svgStr = emfApi.toSvg(mBytes);
                    if (svgStr) {
                      mediaMap[rId] = 'data:image/svg+xml;base64,' + bytesToBase64(new TextEncoder().encode(svgStr));
                      converted = true;
                    }
                  } catch (_) {}
                }
                if (!converted) {
                  const pngPath = mediaPath.replace(/\.emf$/i, '.png');
                  const pngEntry = entries[pngPath] || Object.entries(entries).find(([k]) => k.toLowerCase() === pngPath.toLowerCase())?.[1];
                  if (pngEntry) {
                    const pngBytes = await inflate(pngEntry);
                    if (pngBytes && pngBytes.length) {
                      mediaMap[rId] = 'data:image/png;base64,' + bytesToBase64(pngBytes);
                      converted = true;
                    }
                  }
                }
              } else if (ext === 'wmf') {
                const wmfApi = (typeof window !== 'undefined' && window.NBWmf) || (typeof NBWmf !== 'undefined' ? NBWmf : null);
                if (wmfApi && wmfApi.toSvg) {
                  try {
                    const svgStr = wmfApi.toSvg(mBytes);
                    if (svgStr) {
                      mediaMap[rId] = 'data:image/svg+xml;base64,' + bytesToBase64(new TextEncoder().encode(svgStr));
                      converted = true;
                    }
                  } catch (_) {}
                }
                if (!converted) {
                  const pngPath = mediaPath.replace(/\.wmf$/i, '.png');
                  const pngEntry = entries[pngPath] || Object.entries(entries).find(([k]) => k.toLowerCase() === pngPath.toLowerCase())?.[1];
                  if (pngEntry) {
                    const pngBytes = await inflate(pngEntry);
                    if (pngBytes && pngBytes.length) {
                      mediaMap[rId] = 'data:image/png;base64,' + bytesToBase64(pngBytes);
                      converted = true;
                    }
                  }
                }
              }
              if (!converted) {
                mediaMap[rId] = `data:${mime};base64,` + bytesToBase64(mBytes);
              }
            }
          }
        }
      }

      const animSteps = extractSlideAnimations(slideDoc);
      const animSpidMap = {};
      animSteps.forEach((stepList, stepIdx) => {
        stepList.forEach(item => {
          animSpidMap[item.spid] = { step: stepIdx + 1, effect: item.effect };
        });
      });

      const slideData = WebPPT._renderSlideContent({
        slideDoc,
        layoutDoc,
        slideIdx: i + 1,
        emuW, emuH,
        targetW, targetH,
        themeColors: slideThemeColors,
        mediaMap,
        animSpidMap,
        omml2tex, texEsc
      });

      slideData.totalSteps = animSteps.length;
      parsedSlides.push(slideData);
    }

    return {
      aspectRatio: is169 ? '16:9' : '4:3',
      width: targetW,
      height: targetH,
      slides: parsedSlides
    };
  }

  /**
   * Dựng DOM các phần tử trên một Slide
   */
  static _renderSlideContent(ctx) {
    const { slideDoc, layoutDoc, slideIdx, emuW, emuH, targetW, targetH, themeColors } = ctx;
    const rootEl = document.createElement('div');
    rootEl.className = 'ppt-slide';
    rootEl.dataset.slide = slideIdx;
    rootEl.style.cssText = `position:relative;width:${targetW}px;height:${targetH}px;overflow:hidden;background:#ffffff;user-select:none;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;`;

    // 1. Nền slide (từ slide hoặc kế thừa từ layout)
    const bgNode = slideDoc.querySelector('bg') || slideDoc.getElementsByTagNameNS(P_NS, 'bg')[0] ||
      (layoutDoc ? (layoutDoc.querySelector('bg') || layoutDoc.getElementsByTagNameNS(P_NS, 'bg')[0]) : null);
    if (bgNode) {
      const bgColor = resolveColor(bgNode, themeColors);
      if (bgColor) rootEl.style.backgroundColor = bgColor;
    }

    // 1.5. Các hình đồ họa tĩnh từ slideLayout (bỏ qua placeholder như title/subtitle)
    if (layoutDoc) {
      const layoutSpTree = layoutDoc.querySelector('spTree') || layoutDoc.getElementsByTagNameNS(P_NS, 'spTree')[0];
      if (layoutSpTree) {
        for (const child of layoutSpTree.children) {
          if (child.localName === 'nvGrpSpPr' || child.localName === 'grpSpPr') continue;
          if (child.querySelector('ph')) continue;
          if (child.localName === 'sp') {
            const spEl = WebPPT._renderShape(child, { ...ctx, animSpidMap: {}, originX: 0, originY: 0 });
            if (spEl) { spEl.classList.add('ppt-layout-shape'); rootEl.appendChild(spEl); }
          } else if (child.localName === 'grpSp') {
            const grpEl = WebPPT._renderGroup(child, { ...ctx, animSpidMap: {}, originX: 0, originY: 0 });
            if (grpEl) { grpEl.classList.add('ppt-layout-shape'); rootEl.appendChild(grpEl); }
          } else if (child.localName === 'pic') {
            const picEl = WebPPT._renderPic(child, { ...ctx, animSpidMap: {}, originX: 0, originY: 0 });
            if (picEl) { picEl.classList.add('ppt-layout-shape'); rootEl.appendChild(picEl); }
          }
        }
      }
    }

    // 2. Shape tree của slide
    const spTree = slideDoc.querySelector('spTree') || slideDoc.getElementsByTagNameNS(P_NS, 'spTree')[0];
    if (!spTree) return { index: slideIdx, element: rootEl, html: rootEl.outerHTML };

    WebPPT._renderChildren(spTree, rootEl, {
      ...ctx,
      originX: 0,
      originY: 0,
    });

    return {
      index: slideIdx,
      element: rootEl,
      html: rootEl.outerHTML
    };
  }

  static _renderChildren(containerNode, parentEl, ctx) {
    for (const child of containerNode.children) {
      const tagName = child.localName;

      // 2.1 Hình vẽ & Text Box (<p:sp>)
      if (tagName === 'sp') {
        const spEl = WebPPT._renderShape(child, ctx);
        if (spEl) parentEl.appendChild(spEl);
      }
      // 2.2 Nhóm hình vẽ (<p:grpSp>)
      else if (tagName === 'grpSp') {
        const grpEl = WebPPT._renderGroup(child, ctx);
        if (grpEl) parentEl.appendChild(grpEl);
      }
      // 2.3 Hình ảnh (<p:pic>)
      else if (tagName === 'pic') {
        const picEl = WebPPT._renderPic(child, ctx);
        if (picEl) parentEl.appendChild(picEl);
      }
      // 2.4 Khung đồ họa / Bảng (<p:graphicFrame>)
      else if (tagName === 'graphicFrame') {
        const gfEl = WebPPT._renderGraphicFrame(child, ctx);
        if (gfEl) parentEl.appendChild(gfEl);
      }
      // 2.5 Khung tương thích nội dung (<mc:AlternateContent>)
      else if (tagName === 'AlternateContent') {
        let target = null;
        for (const ac of child.children) {
          if (ac.localName === 'Choice') { target = ac; break; }
          if (ac.localName === 'Fallback') { target = ac; }
        }
        if (target) {
          WebPPT._renderChildren(target, parentEl, ctx);
        }
      }
    }
  }

  /**
   * Dựng nhóm hình vẽ (<p:grpSp>)
   */
  static _renderGroup(grpNode, ctx) {
    const cNvPr = grpNode.querySelector('cNvPr');
    const spid = cNvPr ? cNvPr.getAttribute('id') : '';

    const grpSpPr = grpNode.querySelector('grpSpPr');
    const xfrm = grpSpPr ? grpSpPr.querySelector('xfrm') : null;
    if (!xfrm) return null;

    const off = xfrm.querySelector('off');
    const ext = xfrm.querySelector('ext');
    const chOff = xfrm.querySelector('chOff');
    const chExt = xfrm.querySelector('chExt');
    if (!off || !ext) return null;

    const gx = parseInt(off.getAttribute('x')) || 0;
    const gy = parseInt(off.getAttribute('y')) || 0;
    const gw = parseInt(ext.getAttribute('cx')) || 0;
    const gh = parseInt(ext.getAttribute('cy')) || 0;

    const chX = chOff ? (parseInt(chOff.getAttribute('x')) || 0) : gx;
    const chY = chOff ? (parseInt(chOff.getAttribute('y')) || 0) : gy;
    const chW = chExt ? (parseInt(chExt.getAttribute('cx')) || gw) : gw;
    const chH = chExt ? (parseInt(chExt.getAttribute('cy')) || gh) : gh;

    const groupDiv = document.createElement('div');
    groupDiv.className = 'ppt-group';
    groupDiv.dataset.spid = spid;

    if (spid && ctx.animSpidMap && ctx.animSpidMap[spid]) {
      const anim = ctx.animSpidMap[spid];
      groupDiv.classList.add('ppt-anim', `ppt-fx-${anim.effect}`);
      groupDiv.dataset.pptStep = anim.step;
    }

    const origX = ctx.originX || 0;
    const origY = ctx.originY || 0;
    const styleLeft = (((gx - origX) / ctx.emuW) * 100).toFixed(3) + '%';
    const styleTop = (((gy - origY) / ctx.emuH) * 100).toFixed(3) + '%';
    const styleWidth = ((gw / ctx.emuW) * 100).toFixed(3) + '%';
    const styleHeight = ((gh / ctx.emuH) * 100).toFixed(3) + '%';

    let groupCss = `position:absolute;left:${styleLeft};top:${styleTop};width:${styleWidth};height:${styleHeight};box-sizing:border-box;pointer-events:none;`;
    const transforms = [];
    const rotAttr = parseInt(xfrm.getAttribute('rot'));
    if (rotAttr) transforms.push(`rotate(${(rotAttr / 60000).toFixed(1)}deg)`);
    if (xfrm.getAttribute('flipH') === '1') transforms.push('scaleX(-1)');
    if (xfrm.getAttribute('flipV') === '1') transforms.push('scaleY(-1)');
    if (transforms.length > 0) groupCss += `transform:${transforms.join(' ')};`;
    groupDiv.style.cssText = groupCss;

    let groupFill = ctx.groupFill || null;
    const grpSolidFill = grpSpPr ? Array.from(grpSpPr.children).find(c => c.localName === 'solidFill') : null;
    if (grpSolidFill) {
      groupFill = resolveColor(grpSolidFill, ctx.themeColors) || groupFill;
    }

    const childCtx = {
      ...ctx,
      emuW: chW,
      emuH: chH,
      originX: chX,
      originY: chY,
      groupFill,
    };

    WebPPT._renderChildren(grpNode, groupDiv, childCtx);
    return groupDiv;
  }

  /**
   * Dựng hình vector tùy biến (<a:custGeom>) thành SVG
   */
  static _renderCustGeomSvg(custGeom, spPr, themeColors, groupFill) {
    const pathNode = custGeom.querySelector('path');
    if (!pathNode) return null;
    const w = parseInt(pathNode.getAttribute('w')) || 1000;
    const h = parseInt(pathNode.getAttribute('h')) || 1000;

    let d = '';
    for (const cmd of pathNode.children) {
      const name = cmd.localName;
      if (name === 'moveTo') {
        const pt = cmd.querySelector('pt');
        if (pt) d += `M ${pt.getAttribute('x')} ${pt.getAttribute('y')} `;
      } else if (name === 'lnTo') {
        const pt = cmd.querySelector('pt');
        if (pt) d += `L ${pt.getAttribute('x')} ${pt.getAttribute('y')} `;
      } else if (name === 'cubicBezTo') {
        const pts = cmd.querySelectorAll('pt');
        if (pts.length === 3) {
          d += `C ${pts[0].getAttribute('x')} ${pts[0].getAttribute('y')}, ${pts[1].getAttribute('x')} ${pts[1].getAttribute('y')}, ${pts[2].getAttribute('x')} ${pts[2].getAttribute('y')} `;
        }
      } else if (name === 'quadBezTo') {
        const pts = cmd.querySelectorAll('pt');
        if (pts.length === 2) {
          d += `Q ${pts[0].getAttribute('x')} ${pts[0].getAttribute('y')}, ${pts[1].getAttribute('x')} ${pts[1].getAttribute('y')} `;
        }
      } else if (name === 'close') {
        d += 'Z ';
      }
    }
    if (!d) return null;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;display:block;';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d.trim());

    // Nền tô
    let fill = 'none';
    if (!hasDirectChild(spPr, 'noFill')) {
      if (hasDirectChild(spPr, 'grpFill') && groupFill) {
        fill = groupFill;
      } else {
        const directFill = Array.from(spPr.children).find(c => c.localName === 'solidFill');
        let fillClr = resolveColor(directFill || spPr.querySelector('solidFill'), themeColors);
        if (!fillClr && !hasDirectChild(spPr, 'grpFill')) {
          const fillRef = spPr.parentElement?.querySelector('style > fillRef');
          if (fillRef && parseInt(fillRef.getAttribute('idx')) > 0) {
            fillClr = resolveColor(fillRef, themeColors);
          }
        }
        if (fillClr) fill = fillClr;
      }
    }
    path.setAttribute('fill', fill);

    // Viền nét
    const ln = spPr.querySelector('ln');
    if (ln && !hasDirectChild(ln, 'noFill')) {
      const strokeClr = resolveColor(ln.querySelector('solidFill'), themeColors);
      if (strokeClr) {
        path.setAttribute('stroke', strokeClr);
        const wAttr = parseInt(ln.getAttribute('w'));
        const strokeW = wAttr ? Math.max(1, Math.round(wAttr / 9525)) : 1;
        path.setAttribute('stroke-width', strokeW);
        const prstDash = ln.querySelector('prstDash');
        const dashVal = prstDash ? prstDash.getAttribute('val') : 'solid';
        if (dashVal === 'dash' || dashVal === 'sysDash') path.setAttribute('stroke-dasharray', '8,4');
        else if (dashVal === 'dot' || dashVal === 'sysDot') path.setAttribute('stroke-dasharray', '3,3');
      }
    }

    svg.appendChild(path);
    return svg;
  }

  static _renderShape(spNode, ctx) {
    const { emuW, emuH, themeColors, animSpidMap, omml2tex, texEsc, mediaMap } = ctx;
    const cNvPr = spNode.querySelector('cNvPr');
    const spid = cNvPr ? cNvPr.getAttribute('id') : '';

    const spPr = spNode.querySelector('spPr');
    const xfrm = spPr ? spPr.querySelector('xfrm') : null;
    const ph = spNode.querySelector('ph');

    let x = 0, y = 0, w = 0, h = 0;
    if (xfrm) {
      const off = xfrm.querySelector('off');
      const ext = xfrm.querySelector('ext');
      if (off && ext) {
        x = parseInt(off.getAttribute('x')) || 0;
        y = parseInt(off.getAttribute('y')) || 0;
        w = parseInt(ext.getAttribute('cx')) || 0;
        h = parseInt(ext.getAttribute('cy')) || 0;
      }
    }

    const origX = ctx.originX || 0;
    const origY = ctx.originY || 0;
    let styleLeft = '', styleTop = '', styleWidth = '', styleHeight = '';
    if (w > 0 && h > 0) {
      styleLeft = (((x - origX) / emuW) * 100).toFixed(3) + '%';
      styleTop = (((y - origY) / emuH) * 100).toFixed(3) + '%';
      styleWidth = ((w / emuW) * 100).toFixed(3) + '%';
      styleHeight = ((h / emuH) * 100).toFixed(3) + '%';
    } else if (ph) {
      const type = ph.getAttribute('type') || '';
      if (type === 'ctrTitle') {
        styleLeft = '10%'; styleTop = '26%'; styleWidth = '80%'; styleHeight = '28%';
      } else if (type === 'subTitle') {
        styleLeft = '12%'; styleTop = '58%'; styleWidth = '76%'; styleHeight = '22%';
      } else if (type === 'title') {
        styleLeft = '6%'; styleTop = '6%'; styleWidth = '88%'; styleHeight = '15%';
      } else {
        styleLeft = '6%'; styleTop = '22%'; styleWidth = '88%'; styleHeight = '70%';
      }
    } else {
      return null;
    }

    const div = document.createElement('div');
    div.className = 'ppt-shape';
    div.dataset.spid = spid;

    if (spid && animSpidMap && animSpidMap[spid]) {
      const anim = animSpidMap[spid];
      div.classList.add('ppt-anim', `ppt-fx-${anim.effect}`);
      div.dataset.pptStep = anim.step;
    }

    let css = `position:absolute;left:${styleLeft};top:${styleTop};width:${styleWidth};height:${styleHeight};box-sizing:border-box;display:flex;flex-direction:column;`;
    if (xfrm) {
      const transforms = [];
      const rotAttr = parseInt(xfrm.getAttribute('rot'));
      if (rotAttr) transforms.push(`rotate(${(rotAttr / 60000).toFixed(1)}deg)`);
      if (xfrm.getAttribute('flipH') === '1') transforms.push('scaleX(-1)');
      if (xfrm.getAttribute('flipV') === '1') transforms.push('scaleY(-1)');
      if (transforms.length > 0) css += `transform:${transforms.join(' ')};`;
    }
    let shapeBgImg = null;

    if (spPr) {
      const styleNode = spNode.querySelector('style');
      const custGeom = spPr.querySelector('custGeom');
      const boxShadows = [];

      // Ảnh trong TextBox / Shape (<a:blipFill>)
      const blipFill = spPr.querySelector('blipFill');
      if (blipFill) {
        const blip = blipFill.querySelector('blip');
        let rEmbed = null;
        if (blip) {
          const svgBlip = blip.querySelector('svgBlip') || Array.from(blip.getElementsByTagName('*')).find(el => el.localName === 'svgBlip');
          if (svgBlip) {
            rEmbed = svgBlip.getAttribute('r:embed') || svgBlip.getAttributeNS(R_NS, 'embed') || svgBlip.getAttribute('embed');
          }
          if (!rEmbed || !mediaMap || !mediaMap[rEmbed]) {
            rEmbed = blip.getAttribute('r:embed') || blip.getAttributeNS(R_NS, 'embed') || blip.getAttribute('embed');
          }
        }
        const src = rEmbed && mediaMap ? mediaMap[rEmbed] : null;
        if (src) {
          shapeBgImg = document.createElement('img');
          shapeBgImg.src = src;
          shapeBgImg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:fill;pointer-events:none;z-index:0;border-radius:inherit;display:block;';
          shapeBgImg.onerror = () => { shapeBgImg.style.display = 'none'; };
        }
      }

      // Chỉ đọc effectLst trực tiếp, tránh lấy nhầm hiddenEffects trong <a:extLst> (ví dụ Rectangle 17 bị tắt hiệu ứng)
      const directEffectLst = Array.from(spPr.children).find(c => c.localName === 'effectLst');

      // 1. Hiệu ứng Glow (<a:effectLst><a:glow>)
      const glow = directEffectLst ? directEffectLst.querySelector('glow') : null;
      if (glow) {
        const radAttr = parseInt(glow.getAttribute('rad'));
        const radPx = radAttr ? Math.max(2, Math.round(radAttr / 9525)) : 8;
        const glowClr = resolveColor(glow, themeColors) || 'rgba(34, 211, 238, 0.55)';
        boxShadows.push(`0 0 ${radPx}px ${Math.max(1, Math.round(radPx / 3))}px ${glowClr}`);
        boxShadows.push(`0 0 ${Math.round(radPx * 1.5)}px ${glowClr}`);
      }

      // 2. Hiệu ứng Outer Shadow (<a:effectLst><a:outerShdw>)
      const outerShdw = directEffectLst ? directEffectLst.querySelector('outerShdw') : null;
      if (outerShdw) {
        const blurRadAttr = parseInt(outerShdw.getAttribute('blurRad'));
        const blurPx = blurRadAttr ? Math.max(1, Math.round(blurRadAttr / 9525)) : 6;
        const distAttr = parseInt(outerShdw.getAttribute('dist')) || 0;
        const distPx = distAttr ? Math.round(distAttr / 9525) : 2;
        const dirAttr = parseInt(outerShdw.getAttribute('dir')) || 5400000;
        const rad = (dirAttr / 60000) * (Math.PI / 180);
        const dx = Math.round(distPx * Math.cos(rad));
        const dy = Math.round(distPx * Math.sin(rad));
        const shdwClr = resolveColor(outerShdw, themeColors) || 'rgba(0, 0, 0, 0.35)';
        boxShadows.push(`${dx}px ${dy}px ${blurPx}px ${shdwClr}`);
      }

      // 3. Hiệu ứng 3D Bevel & Contour (<a:sp3d>)
      const sp3d = Array.from(spPr.children).find(c => c.localName === 'sp3d');
      if (sp3d) {
        const contourWAttr = parseInt(sp3d.getAttribute('contourW'));
        if (contourWAttr) {
          const contourW = Math.max(1, Math.round(contourWAttr / 9525));
          const contourClrNode = sp3d.querySelector('contourClr');
          const contourClr = resolveColor(contourClrNode, themeColors) || '#ffffff';
          css += `border:${contourW}px solid ${contourClr};`;
        }
        const bevelT = sp3d.querySelector('bevelT');
        if (bevelT) {
          boxShadows.push('inset 0 2px 4px rgba(255, 255, 255, 0.65)');
          boxShadows.push('inset 0 -2px 4px rgba(0, 0, 0, 0.35)');
        }
      }

      const ln = spPr.querySelector('ln');

      if (custGeom) {
        // Hình vector SVG: không gán viền hay nền hộp chữ nhật thừa
        const svgEl = WebPPT._renderCustGeomSvg(custGeom, spPr, themeColors, ctx.groupFill);
        if (svgEl) div.appendChild(svgEl);
      } else {
        // Hình học thông thường: CHỈ thêm nền và viền nếu được định nghĩa tường minh
        if (!hasDirectChild(spPr, 'noFill')) {
          if (hasDirectChild(spPr, 'grpFill') && ctx.groupFill) {
            css += `background-color:${ctx.groupFill};`;
          } else {
            const fillClr = resolveColor(spPr.querySelector('solidFill'), themeColors);
            if (fillClr) css += `background-color:${fillClr};`;
          }
        }

        // Không vẽ viền nếu ln có noFill
        if (ln && !hasDirectChild(ln, 'noFill')) {
          let lnClr = resolveColor(ln.querySelector('solidFill'), themeColors);
          if (!lnClr) {
            const lnRef = styleNode?.querySelector('lnRef');
            if (lnRef && parseInt(lnRef.getAttribute('idx')) > 0) {
              lnClr = resolveColor(lnRef, themeColors);
            }
          }
          if (!lnClr) {
            const shapeSolidFill = spPr.querySelector('solidFill');
            if (shapeSolidFill) {
              const schemeClr = shapeSolidFill.querySelector('schemeClr');
              if (schemeClr) {
                const val = schemeClr.getAttribute('val');
                if (themeColors && themeColors[val]) {
                  lnClr = applyColorTransforms(themeColors[val], null, {
                    querySelector: (tag) => tag === 'lumMod' ? { getAttribute: () => '75000' } : null
                  });
                }
              }
            }
          }

          if (lnClr) {
            const wAttr = parseInt(ln.getAttribute('w'));
            const lnW = wAttr ? Math.max(1, Math.round(wAttr / 9525)) : 1;
            const prstDash = ln.querySelector('prstDash');
            const dashVal = prstDash ? prstDash.getAttribute('val') : 'solid';
            let borderStyle = 'solid';
            if (dashVal === 'dash' || dashVal === 'sysDash') borderStyle = 'dashed';
            else if (dashVal === 'dot' || dashVal === 'sysDot') borderStyle = 'dotted';
            css += `border:${lnW}px ${borderStyle} ${lnClr};`;
          }
        }

        const prstGeom = spPr.querySelector('prstGeom');
        if (prstGeom) {
          const prst = prstGeom.getAttribute('prst');
          if (prst === 'roundRect') css += 'border-radius:12px;';
          else if (prst === 'ellipse') css += 'border-radius:50%;';
        }
      }

      // Kiểm tra style preset nếu spPr không chỉ định fill/line
      if (styleNode) {
        if (!css.includes('background-color') && !hasDirectChild(spPr, 'noFill') && !hasDirectChild(spPr, 'grpFill')) {
          const fillRef = styleNode.querySelector('fillRef');
          if (fillRef && parseInt(fillRef.getAttribute('idx')) > 0) {
            const clr = resolveColor(fillRef, themeColors);
            if (clr) css += `background-color:${clr};`;
          }
        }
        if (!css.includes('border:') && !(ln && hasDirectChild(ln, 'noFill')) && !hasDirectChild(spPr, 'noFill')) {
          const lnRef = styleNode.querySelector('lnRef');
          if (lnRef && parseInt(lnRef.getAttribute('idx')) > 0) {
            const clr = resolveColor(lnRef, themeColors);
            if (clr) css += `border:1px solid ${clr};`;
          }
        }
      }

      if (boxShadows.length > 0) {
        css += `box-shadow:${boxShadows.join(', ')};`;
      }
    }

    // Văn bản trong shape (<p:txBody>)
    const txBody = spNode.querySelector('txBody');
    if (txBody) {
      const isTxBox = !!spNode.querySelector('cNvSpPr[txBox="1"]');
      const bodyPr = txBody.querySelector('bodyPr');
      const anchor = bodyPr ? bodyPr.getAttribute('anchor') : '';
      if (anchor === 'ctr') css += 'justify-content:center;';
      else if (anchor === 'b') css += 'justify-content:flex-end;';
      else css += 'justify-content:flex-start;';

      if (bodyPr) {
        const lInsAttr = bodyPr.getAttribute('lIns');
        const rInsAttr = bodyPr.getAttribute('rIns');
        const tInsAttr = bodyPr.getAttribute('tIns');
        const bInsAttr = bodyPr.getAttribute('bIns');

        const defaultL = isTxBox ? 0 : 91440;
        const defaultT = isTxBox ? 0 : 45720;

        const lEmu = lInsAttr !== null ? (parseInt(lInsAttr) || 0) : defaultL;
        const rEmu = rInsAttr !== null ? (parseInt(rInsAttr) || 0) : defaultL;
        const tEmu = tInsAttr !== null ? (parseInt(tInsAttr) || 0) : defaultT;
        const bEmu = bInsAttr !== null ? (parseInt(bInsAttr) || 0) : defaultT;

        const padL = Math.max(0, Math.round((lEmu / 12192000) * 1600));
        const padR = Math.max(0, Math.round((rEmu / 12192000) * 1600));
        const padT = Math.max(0, Math.round((tEmu / 12192000) * 1600));
        const padB = Math.max(0, Math.round((bEmu / 12192000) * 1600));

        if (padL || padR || padT || padB) {
          css += `padding:${padT}px ${padR}px ${padB}px ${padL}px;`;
        }
      }

      div.style.cssText = css;
      if (shapeBgImg) div.appendChild(shapeBgImg);

      const lstStyle = txBody.querySelector('lstStyle');
      const pNodes = txBody.querySelectorAll('p');
      let autoNumCounter = 0;
      for (const pNode of pNodes) {
        const pPrNode = Array.from(pNode.children).find(c => c.localName === 'pPr');
        const hasAutoNum = (pPrNode && Array.from(pPrNode.children).some(c => c.localName === 'buAutoNum')) ||
                           (lstStyle && Array.from(lstStyle.querySelectorAll('*')).some(c => c.localName === 'buAutoNum'));
        if (hasAutoNum) {
          autoNumCounter++;
        }
        const pEl = WebPPT._renderParagraph(pNode, { themeColors, omml2tex, texEsc, lstStyle, autoNumIdx: autoNumCounter });
        if (pEl) {
          if (shapeBgImg) {
            pEl.style.position = 'relative';
            pEl.style.zIndex = '1';
          }
          div.appendChild(pEl);
        }
      }
    } else {
      div.style.cssText = css;
      if (shapeBgImg) div.appendChild(shapeBgImg);
    }

    return div;
  }

  static _renderParagraph(pNode, { themeColors, omml2tex, texEsc, lstStyle, autoNumIdx }) {
    const pEl = document.createElement('div');
    pEl.className = 'ppt-p';

    const pPr = Array.from(pNode.children).find(c => c.localName === 'pPr') || pNode.querySelector('pPr');
    let align = 'left';
    let lvl = 0;
    let bulletChar = null;
    let isAutoNum = false;
    let buFontName = 'Wingdings';
    let spcAftPx = 2;
    let lineH = 1.25;
    let padLeftPx = 0;
    let indentPx = 0;
    let baseSz = 0;

    if (pPr) {
      const algn = pPr.getAttribute('algn');
      if (algn === 'ctr') align = 'center';
      else if (algn === 'r') align = 'right';
      else if (algn === 'just') align = 'justify';
      lvl = parseInt(pPr.getAttribute('lvl')) || 0;

      const marLAttr = parseInt(pPr.getAttribute('marL'));
      if (marLAttr) {
        padLeftPx = Math.max(0, Math.round((marLAttr / 12192000) * 1600));
      } else if (lvl > 0) {
        padLeftPx = lvl * 28;
      }

      const indentAttr = parseInt(pPr.getAttribute('indent'));
      if (!isNaN(indentAttr) && indentAttr !== 0) {
        indentPx = Math.round((indentAttr / 12192000) * 1600);
      }

      const buNone = hasDirectChild(pPr, 'buNone');
      if (buNone) {
        bulletChar = null;
      } else {
        const buAutoNum = Array.from(pPr.children).find(c => c.localName === 'buAutoNum') ||
                          (lstStyle && Array.from(lstStyle.querySelectorAll('*')).find(c => c.localName === 'buAutoNum'));
        if (buAutoNum) {
          isAutoNum = true;
          const type = buAutoNum.getAttribute('type') || 'arabicPeriod';
          const startAt = parseInt(buAutoNum.getAttribute('startAt')) || (autoNumIdx || 1);
          if (type === 'arabicParenR') bulletChar = `${startAt})`;
          else bulletChar = `${startAt}.`;
        } else {
          const buChar = Array.from(pPr.children).find(c => c.localName === 'buChar');
          if (buChar) {
            bulletChar = buChar.getAttribute('char');
            const buFont = Array.from(pPr.children).find(c => c.localName === 'buFont');
            if (buFont) buFontName = buFont.getAttribute('typeface') || 'Wingdings';
          } else if (lstStyle) {
            const lvlTag = 'lvl' + (lvl + 1) + 'pPr';
            const lvlPPr = lstStyle.querySelector(lvlTag) || lstStyle.querySelector('lvl1pPr');
            if (lvlPPr && !hasDirectChild(lvlPPr, 'buNone')) {
              const bu = lvlPPr.querySelector('buChar');
              if (bu) {
                bulletChar = bu.getAttribute('char');
                const buFont = lvlPPr.querySelector('buFont');
                if (buFont) buFontName = buFont.getAttribute('typeface') || 'Wingdings';
              }
            }
          }
        }
      }

      const spcAft = pPr.querySelector('spcAft');
      if (spcAft) {
        const pts = spcAft.querySelector('spcPts');
        if (pts) {
          const val = parseInt(pts.getAttribute('val')) || 0;
          if (val > 0) spcAftPx = Math.max(1, Math.round(val / 100 * 0.9));
        }
      }

      const lnSpc = pPr.querySelector('lnSpc');
      if (lnSpc) {
        const pct = lnSpc.querySelector('spcPct');
        if (pct) {
          const val = parseInt(pct.getAttribute('val')) || 100000;
          lineH = (val / 100000).toFixed(2);
        }
      }
      const defRPr = pPr.querySelector('defRPr');
      if (defRPr && defRPr.getAttribute('sz')) {
        baseSz = parseInt(defRPr.getAttribute('sz'));
      }
    } else if (lstStyle) {
      const lvlPPr = lstStyle.querySelector('lvl1pPr');
      if (lvlPPr && !hasDirectChild(lvlPPr, 'buNone')) {
        const bu = lvlPPr.querySelector('buChar');
        if (bu) {
          bulletChar = bu.getAttribute('char');
          const buFont = lvlPPr.querySelector('buFont');
          if (buFont) buFontName = buFont.getAttribute('typeface') || 'Wingdings';
        }
      }
    }

    if (!baseSz && lstStyle) {
      const lvlTag = 'lvl' + (lvl + 1) + 'pPr';
      const lvlPPr = lstStyle.querySelector(lvlTag) || lstStyle.querySelector('lvl1pPr') || lstStyle.querySelector('defPPr');
      const defRPr = lvlPPr?.querySelector('defRPr');
      if (defRPr && defRPr.getAttribute('sz')) {
        baseSz = parseInt(defRPr.getAttribute('sz'));
      }
    }

    if (!baseSz) {
      const firstRPr = pNode.querySelector('r > rPr');
      if (firstRPr && firstRPr.getAttribute('sz')) {
        baseSz = parseInt(firstRPr.getAttribute('sz'));
      }
    }
    const basePx = baseSz ? Math.max(12, Math.round((baseSz / 100) * 1.35)) : 22;

    const hasHangingIndent = !!(bulletChar && indentPx < 0 && padLeftPx >= Math.abs(indentPx));
    const finalIndentPx = hasHangingIndent ? 0 : indentPx;

    pEl.style.cssText = `text-align:${align};font-size:${basePx}px;margin-top:0px;margin-bottom:${spcAftPx}px;line-height:${lineH};word-break:break-word;${padLeftPx > 0 ? `padding-left:${padLeftPx}px;` : ''}${finalIndentPx !== 0 ? `text-indent:${finalIndentPx}px;` : ''}`;

    if (bulletChar) {
      const bSpan = document.createElement('span');
      bSpan.className = 'ppt-bullet';
      const displayBullet = isAutoNum ? bulletChar : mapSymbolChar(bulletChar, buFontName);
      bSpan.textContent = displayBullet + ' ';
      if (hasHangingIndent) {
        bSpan.style.cssText = `display:inline-block;margin-left:${indentPx}px;width:${Math.abs(indentPx)}px;text-align:left;font-family:inherit;font-size:0.95em;line-height:1;vertical-align:baseline;`;
      } else {
        bSpan.style.cssText = 'display:inline-block;margin-right:8px;font-family:Segoe UI Symbol,Segoe UI Emoji,sans-serif,Wingdings;font-size:0.9em;line-height:1;vertical-align:baseline;';
      }
      pEl.appendChild(bSpan);
    }

    let hasContent = false;
    for (const child of pNode.children) {
      const tagName = child.localName;
      if (tagName === 'r') {
        const rEl = WebPPT._renderRun(child, { themeColors, texEsc });
        if (rEl) { pEl.appendChild(rEl); hasContent = true; }
      } else if (tagName === 'br') {
        pEl.appendChild(document.createElement('br'));
        hasContent = true;
      } else if ((tagName === 'oMath' || tagName === 'm') && omml2tex) {
        const oMath = tagName === 'oMath' ? child : (child.querySelector('oMath') || child);
        try {
          const tex = omml2tex(oMath);
          if (tex) {
            const span = document.createElement('span');
            span.className = 'ppt-math';
            span.textContent = `$${tex}$`;
            pEl.appendChild(span);
            hasContent = true;
          }
        } catch (_) {}
      } else if (tagName === 'AlternateContent' && omml2tex) {
        const oMath = child.querySelector('oMath');
        if (oMath) {
          try {
            const tex = omml2tex(oMath);
            if (tex) {
              const span = document.createElement('span');
              span.className = 'ppt-math';
              span.textContent = `$${tex}$`;
              pEl.appendChild(span);
              hasContent = true;
            }
          } catch (_) {}
        }
      }
    }

    if (!hasContent) {
      pEl.innerHTML = '&nbsp;';
    }

    return pEl;
  }

  static _renderRun(rNode, { themeColors, texEsc }) {
    const t = Array.from(rNode.children).find(c => c.localName === 't') || rNode.querySelector('t');
    if (!t) return null;

    const span = document.createElement('span');
    let text = t.textContent;

    const rPr = Array.from(rNode.children).find(c => c.localName === 'rPr') || rNode.querySelector('rPr');
    let css = '';
    let fontName = '';
    if (rPr) {
      const sym = rPr.querySelector('sym');
      const symTypeface = sym ? sym.getAttribute('typeface') : '';
      const latin = rPr.querySelector('latin');
      const latinTypeface = latin ? latin.getAttribute('typeface') : '';
      fontName = symTypeface || latinTypeface || '';

      if (sym && sym.getAttribute('char')) {
        text = sym.getAttribute('char');
      }

      const sz = parseInt(rPr.getAttribute('sz'));
      if (sz) {
        const px = Math.max(12, Math.round((sz / 100) * 1.35));
        css += `font-size:${px}px;`;
      }
      if (rPr.getAttribute('b') === '1') css += 'font-weight:bold;';
      if (rPr.getAttribute('i') === '1') css += 'font-style:italic;';
      if (rPr.getAttribute('u') === 'sng') css += 'text-decoration:underline;';

      const baseline = parseInt(rPr.getAttribute('baseline'));
      if (baseline) {
        if (baseline > 0) {
          css += 'vertical-align:super;font-size:0.72em;';
        } else if (baseline < 0) {
          css += 'vertical-align:sub;font-size:0.72em;';
        }
      }

      // Màu chữ: ưu tiên solidFill trực tiếp của rPr (không lấy nhầm solidFill bên trong ln của viền nét)
      const directFill = Array.from(rPr.children).find(c => c.localName === 'solidFill');
      const color = resolveColor(directFill, themeColors) || resolveColor(rPr.querySelector('solidFill'), themeColors);
      if (color) css += `color:${color};`;

      // Text stroke (viền nét chữ nghệ thuật OpenXML ln)
      const textLn = rPr.querySelector('ln');
      if (textLn && !textLn.querySelector('noFill')) {
        const strokeClr = resolveColor(textLn.querySelector('solidFill'), themeColors);
        if (strokeClr) {
          const strokeW = parseInt(textLn.getAttribute('w'));
          const px = strokeW ? Math.max(0.5, (strokeW / 9525) * 0.8).toFixed(1) : '0.8';
          css += `-webkit-text-stroke:${px}px ${strokeClr};`;
        }
      }

      if (latinTypeface && !/wingdings/i.test(latinTypeface)) {
        if (/bold|black/i.test(latinTypeface)) css += 'font-weight:bold;';
      }
    }

    if (text) {
      text = Array.from(text).map(ch => mapSymbolChar(ch, fontName)).join('');
    }
    span.textContent = text;

    if (css) span.style.cssText = css;
    return span;
  }

  static _renderPic(picNode, ctx) {
    const { emuW, emuH, mediaMap, animSpidMap, themeColors } = ctx;
    const cNvPr = picNode.querySelector('cNvPr');
    const spid = cNvPr ? cNvPr.getAttribute('id') : '';

    const spPr = picNode.querySelector('spPr');
    const xfrm = spPr ? spPr.querySelector('xfrm') : null;
    if (!xfrm) return null;

    const off = xfrm.querySelector('off');
    const ext = xfrm.querySelector('ext');
    if (!off || !ext) return null;

    const x = parseInt(off.getAttribute('x')) || 0;
    const y = parseInt(off.getAttribute('y')) || 0;
    const w = parseInt(ext.getAttribute('cx')) || 0;
    const h = parseInt(ext.getAttribute('cy')) || 0;

    const blipFill = picNode.querySelector('blipFill');
    const blip = blipFill ? blipFill.querySelector('blip') : picNode.querySelector('blip');
    let rEmbed = null;
    if (blip) {
      const svgBlip = blip.querySelector('svgBlip') || Array.from(blip.getElementsByTagName('*')).find(el => el.localName === 'svgBlip');
      if (svgBlip) {
        rEmbed = svgBlip.getAttribute('r:embed') || svgBlip.getAttributeNS(R_NS, 'embed') || svgBlip.getAttribute('embed');
      }
      if (!rEmbed || !mediaMap[rEmbed]) {
        rEmbed = blip.getAttribute('r:embed') || blip.getAttributeNS(R_NS, 'embed') || blip.getAttribute('embed');
      }
    }
    const src = rEmbed ? mediaMap[rEmbed] : null;
    if (!src) return null;

    const wrap = document.createElement('div');
    wrap.className = 'ppt-pic';
    wrap.dataset.spid = spid;

    if (spid && animSpidMap && animSpidMap[spid]) {
      const anim = animSpidMap[spid];
      wrap.classList.add('ppt-anim', `ppt-fx-${anim.effect}`);
      wrap.dataset.pptStep = anim.step;
    }

    const origX = ctx.originX || 0;
    const origY = ctx.originY || 0;
    const srcRect = blipFill ? blipFill.querySelector('srcRect') : null;
    let wrapCss = `position:absolute;left:${(((x - origX) / emuW) * 100).toFixed(3)}%;top:${(((y - origY) / emuH) * 100).toFixed(3)}%;width:${((w / emuW) * 100).toFixed(3)}%;height:${((h / emuH) * 100).toFixed(3)}%;${srcRect ? 'overflow:hidden;' : 'overflow:visible;'}`;

    // Transforms (rot, flipH, flipV)
    const transforms = [];
    const rotAttr = parseInt(xfrm.getAttribute('rot'));
    if (rotAttr) transforms.push(`rotate(${(rotAttr / 60000).toFixed(1)}deg)`);
    if (xfrm.getAttribute('flipH') === '1') transforms.push('scaleX(-1)');
    if (xfrm.getAttribute('flipV') === '1') transforms.push('scaleY(-1)');
    if (transforms.length > 0) wrapCss += `transform:${transforms.join(' ')};`;

    let imgFilter = '';
    if (spPr) {
      // Background color từ spPr (ví dụ hình bốc hơi có nền màu sẫm)
      let hasBg = false;
      if (!hasDirectChild(spPr, 'noFill')) {
        const fillClr = resolveColor(spPr.querySelector('solidFill'), themeColors);
        if (fillClr) { wrapCss += `background-color:${fillClr};`; hasBg = true; }
      }
      const directEffectLst = Array.from(spPr.children).find(c => c.localName === 'effectLst');
      if (directEffectLst) {
        const outerShdw = directEffectLst.querySelector('outerShdw');
        if (outerShdw) {
          const blurRadAttr = parseInt(outerShdw.getAttribute('blurRad'));
          const blurPx = blurRadAttr ? Math.max(1, Math.round(blurRadAttr / 9525)) : 6;
          const distAttr = parseInt(outerShdw.getAttribute('dist')) || 0;
          const distPx = distAttr ? Math.round(distAttr / 9525) : 2;
          const dirAttr = parseInt(outerShdw.getAttribute('dir')) || 5400000;
          const rad = (dirAttr / 60000) * (Math.PI / 180);
          const dx = Math.round(distPx * Math.cos(rad));
          const dy = Math.round(distPx * Math.sin(rad));
          const shdwClr = resolveColor(outerShdw, themeColors) || 'rgba(0, 0, 0, 0.35)';
          if (hasBg) {
            wrapCss += `box-shadow:${dx}px ${dy}px ${blurPx}px ${shdwClr};`;
          } else {
            imgFilter = `drop-shadow(${dx}px ${dy}px ${blurPx}px ${shdwClr})`;
          }
        }
      }
      const ln = spPr.querySelector('ln');
      if (ln && !hasDirectChild(ln, 'noFill')) {
        const lnClr = resolveColor(ln.querySelector('solidFill'), themeColors);
        if (lnClr) {
          const wAttr = parseInt(ln.getAttribute('w'));
          const lnW = wAttr ? Math.max(1, Math.round(wAttr / 9525)) : 1;
          wrapCss += `border:${lnW}px solid ${lnClr};`;
        }
      }
    }

    wrap.style.cssText = wrapCss;

    const img = document.createElement('img');
    img.draggable = false;
    img.onerror = () => { img.style.display = 'none'; };
    img.src = src;

    const isStretch = !blipFill || !!blipFill.querySelector('stretch');
    const objFit = isStretch ? 'fill' : 'contain';

    // Hỗ trợ crop hình ảnh bằng <a:srcRect>
    if (srcRect) {
      const cL = (parseInt(srcRect.getAttribute('l')) || 0) / 100000;
      const cT = (parseInt(srcRect.getAttribute('t')) || 0) / 100000;
      const cR = (parseInt(srcRect.getAttribute('r')) || 0) / 100000;
      const cB = (parseInt(srcRect.getAttribute('b')) || 0) / 100000;
      const visW = Math.max(0.001, 1 - cL - cR);
      const visH = Math.max(0.001, 1 - cT - cB);
      img.style.cssText = `position:absolute;left:${(-cL / visW * 100).toFixed(2)}%;top:${(-cT / visH * 100).toFixed(2)}%;width:${(1 / visW * 100).toFixed(2)}%;height:${(1 / visH * 100).toFixed(2)}%;object-fit:${objFit};display:block;pointer-events:none;background-color:transparent;max-width:none;max-height:none;${imgFilter ? `filter:${imgFilter};` : ''}`;
    } else {
      img.style.cssText = `width:100%;height:100%;object-fit:${objFit};display:block;pointer-events:none;background-color:transparent;${imgFilter ? `filter:${imgFilter};` : ''}`;
    }

    wrap.appendChild(img);
    return wrap;
  }

  static _renderGraphicFrame(gfNode, ctx) {
    const { emuW, emuH, themeColors, animSpidMap, omml2tex, texEsc } = ctx;
    const cNvPr = gfNode.querySelector('cNvPr');
    const spid = cNvPr ? cNvPr.getAttribute('id') : '';

    const xfrm = gfNode.querySelector('xfrm');
    if (!xfrm) return null;
    const off = xfrm.querySelector('off');
    const ext = xfrm.querySelector('ext');
    if (!off || !ext) return null;

    const x = parseInt(off.getAttribute('x')) || 0;
    const y = parseInt(off.getAttribute('y')) || 0;
    const w = parseInt(ext.getAttribute('cx')) || 0;
    const h = parseInt(ext.getAttribute('cy')) || 0;

    const tbl = gfNode.querySelector('tbl');
    if (!tbl) return null;

    const wrap = document.createElement('div');
    wrap.className = 'ppt-tbl-wrap';
    wrap.dataset.spid = spid;

    if (spid && animSpidMap && animSpidMap[spid]) {
      const anim = animSpidMap[spid];
      wrap.classList.add('ppt-anim', `ppt-fx-${anim.effect}`);
      wrap.dataset.pptStep = anim.step;
    }

    const origX = ctx.originX || 0;
    const origY = ctx.originY || 0;
    wrap.style.cssText = `position:absolute;left:${(((x - origX) / emuW) * 100).toFixed(3)}%;top:${(((y - origY) / emuH) * 100).toFixed(3)}%;width:${((w / emuW) * 100).toFixed(3)}%;height:${((h / emuH) * 100).toFixed(3)}%;box-sizing:border-box;`;

    const table = document.createElement('table');
    table.style.cssText = 'width:100%;height:100%;border-collapse:collapse;table-layout:fixed;box-sizing:border-box;';

    // 1. Độ rộng cột từ tblGrid
    const tblGrid = tbl.querySelector('tblGrid');
    const gridCols = tblGrid ? Array.from(tblGrid.querySelectorAll('gridCol')) : [];
    let totalGridW = 0;
    const colWidths = gridCols.map(col => {
      const cw = parseInt(col.getAttribute('w')) || 0;
      totalGridW += cw;
      return cw;
    });

    if (colWidths.length > 0 && totalGridW > 0) {
      const colgroup = document.createElement('colgroup');
      for (const cw of colWidths) {
        const colEl = document.createElement('col');
        colEl.style.width = ((cw / totalGridW) * 100).toFixed(3) + '%';
        colgroup.appendChild(colEl);
      }
      table.appendChild(colgroup);
    }

    // 2. Thuộc tính định kiểu bảng
    const tblPr = tbl.querySelector('tblPr');
    const isFirstRow = tblPr?.getAttribute('firstRow') === '1';
    const isFirstCol = tblPr?.getAttribute('firstCol') === '1';
    const isBandRow = tblPr?.getAttribute('bandRow') === '1';

    // Helper phân tích đường viền ô
    const parseLn = (lnNode) => {
      if (!lnNode) return null;
      if (hasDirectChild(lnNode, 'noFill')) return 'none';
      const wAttr = parseInt(lnNode.getAttribute('w'));
      const px = wAttr ? Math.max(1, Math.round(wAttr / 9525)) : 1;
      const solidFill = Array.from(lnNode.children).find(c => c.localName === 'solidFill');
      const clr = resolveColor(solidFill, themeColors) || '#ffffff';
      const prstDash = lnNode.querySelector('prstDash');
      const dashVal = prstDash ? prstDash.getAttribute('val') : 'solid';
      let borderStyle = 'solid';
      if (dashVal === 'dash' || dashVal === 'sysDash') borderStyle = 'dashed';
      else if (dashVal === 'dot' || dashVal === 'sysDot') borderStyle = 'dotted';
      return `${px}px ${borderStyle} ${clr}`;
    };

    // 3. Dựng từng hàng và ô
    const trNodes = Array.from(tbl.querySelectorAll('tr'));
    trNodes.forEach((trNode, rIdx) => {
      const tr = document.createElement('tr');
      const hAttr = parseInt(trNode.getAttribute('h'));
      if (hAttr && h > 0) {
        tr.style.height = ((hAttr / h) * 100).toFixed(2) + '%';
      }

      const tcNodes = Array.from(trNode.querySelectorAll('tc'));
      let colIdx = 0;
      for (const tcNode of tcNodes) {
        // Bỏ qua các ô giữ chỗ đã gộp ngang hoặc dọc
        const hMerge = tcNode.getAttribute('hMerge');
        const vMerge = tcNode.getAttribute('vMerge');
        if (hMerge === '1' || vMerge === '1') {
          colIdx++;
          continue;
        }

        const td = document.createElement('td');
        const gridSpan = parseInt(tcNode.getAttribute('gridSpan'));
        if (gridSpan && gridSpan > 1) {
          td.setAttribute('colspan', gridSpan);
        }
        const rowSpan = parseInt(tcNode.getAttribute('rowSpan'));
        if (rowSpan && rowSpan > 1) {
          td.setAttribute('rowspan', rowSpan);
        }

        const tcPr = tcNode.querySelector('tcPr');
        let padL = 8, padR = 8, padT = 4, padB = 4;
        let vAlign = 'middle';

        if (tcPr) {
          const marL = parseInt(tcPr.getAttribute('marL'));
          const marR = parseInt(tcPr.getAttribute('marR'));
          const marT = parseInt(tcPr.getAttribute('marT'));
          const marB = parseInt(tcPr.getAttribute('marB'));
          if (!isNaN(marL)) padL = Math.max(2, Math.round(marL / 9525));
          if (!isNaN(marR)) padR = Math.max(2, Math.round(marR / 9525));
          if (!isNaN(marT)) padT = Math.round(marT / 9525);
          if (!isNaN(marB)) padB = Math.round(marB / 9525);

          const anchor = tcPr.getAttribute('anchor');
          if (anchor === 't') vAlign = 'top';
          else if (anchor === 'b') vAlign = 'bottom';
          else if (anchor === 'ctr') vAlign = 'middle';
        }

        td.style.cssText = `padding:${padT}px ${padR}px ${padB}px ${padL}px;vertical-align:${vAlign};word-break:break-word;box-sizing:border-box;`;

        // Màu nền ô: CHỈ lấy solidFill là con trực tiếp của tcPr (tránh lấy nhầm của viền lnL, lnR...)
        let cellBg = null;
        if (tcPr) {
          const directFill = Array.from(tcPr.children).find(c => c.localName === 'solidFill');
          if (directFill && !hasDirectChild(tcPr, 'noFill')) {
            cellBg = resolveColor(directFill, themeColors);
          }
        }

        // Bổ sung màu nền theo kiểu bảng mặc định nếu tcPr không có màu riêng
        if (!cellBg) {
          if (rIdx === 0 && isFirstRow) {
            cellBg = themeColors.accent1 || '#276668';
          } else if (colIdx === 0 && isFirstCol) {
            cellBg = themeColors.accent1 || '#276668';
          } else if (isBandRow) {
            cellBg = (rIdx % 2 === 1) ? 'rgba(39, 102, 104, 0.18)' : 'rgba(39, 102, 104, 0.08)';
          }
        }
        if (cellBg) {
          td.style.backgroundColor = cellBg;
        }

        // Đường viền ô
        const lnL = parseLn(tcPr?.querySelector('lnL'));
        const lnR = parseLn(tcPr?.querySelector('lnR'));
        const lnT = parseLn(tcPr?.querySelector('lnT'));
        const lnB = parseLn(tcPr?.querySelector('lnB'));

        const defBorder = cellBg ? '1px solid rgba(255, 255, 255, 0.45)' : '1px solid rgba(0, 0, 0, 0.15)';
        td.style.borderLeft = lnL !== null ? lnL : defBorder;
        td.style.borderRight = lnR !== null ? lnR : defBorder;
        td.style.borderTop = lnT !== null ? lnT : defBorder;
        td.style.borderBottom = lnB !== null ? lnB : defBorder;

        // Nội dung văn bản
        const txBody = tcNode.querySelector('txBody');
        if (txBody) {
          const pNodes = txBody.querySelectorAll('p');
          for (const p of pNodes) {
            const pEl = WebPPT._renderParagraph(p, { themeColors, omml2tex, texEsc });
            if (pEl) td.appendChild(pEl);
          }
        }

        tr.appendChild(td);
        colIdx += (gridSpan || 1);
      }
      table.appendChild(tr);
    });

    wrap.appendChild(table);
    return wrap;
  }
}

// Global Export
window.NBWebPPT = WebPPT;

})();
