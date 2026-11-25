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
// MinNote MathJax + MHChem Chemistry Formula Renderer
// Powered by @mathjax/src + @mathjax/mathjax-mhchem-font-extension
const { mathjax } = require('./node_modules/@mathjax/src/cjs/mathjax.js');
const { TeX } = require('./node_modules/@mathjax/src/cjs/input/tex.js');
const { SVG } = require('./node_modules/@mathjax/src/cjs/output/svg.js');
const { liteAdaptor } = require('./node_modules/@mathjax/src/cjs/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('./node_modules/@mathjax/src/cjs/handlers/html.js');

const { BaseConfiguration } = require('./node_modules/@mathjax/src/cjs/input/tex/base/BaseConfiguration.js');
const { AmsConfiguration } = require('./node_modules/@mathjax/src/cjs/input/tex/ams/AmsConfiguration.js');
const { MhchemConfiguration } = require('./node_modules/@mathjax/src/cjs/input/tex/mhchem/MhchemConfiguration.js');
const { NewcommandConfiguration } = require('./node_modules/@mathjax/src/cjs/input/tex/newcommand/NewcommandConfiguration.js');
const { BoldsymbolConfiguration } = require('./node_modules/@mathjax/src/cjs/input/tex/boldsymbol/BoldsymbolConfiguration.js');
const { MathtoolsConfiguration } = require('./node_modules/@mathjax/src/cjs/input/tex/mathtools/MathtoolsConfiguration.js');
const { CancelConfiguration } = require('./node_modules/@mathjax/src/cjs/input/tex/cancel/CancelConfiguration.js');
const { ColorConfiguration } = require('./node_modules/@mathjax/src/cjs/input/tex/color/ColorConfiguration.js');
const { MathJaxMhchemFontExtension } = require('./node_modules/@mathjax/mathjax-mhchem-font-extension/cjs/svg.js');

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({
  packages: [
    BaseConfiguration.name,
    AmsConfiguration.name,
    MhchemConfiguration.name,
    NewcommandConfiguration.name,
    BoldsymbolConfiguration.name,
    MathtoolsConfiguration.name,
    CancelConfiguration.name,
    ColorConfiguration.name
  ]
});

const svg = new SVG({ fontCache: 'local' });
if (svg.font && typeof svg.font.addExtension === 'function') {
  svg.font.addExtension(MathJaxMhchemFontExtension);
}

const doc = mathjax.document('', { InputJax: tex, OutputJax: svg });
const COLOR_RE = /^#[0-9a-f]{6}$/i;

function renderFormula(formula, color = '#000000', display = true) {
  if (!formula || !formula.trim()) {
    throw new Error('formulaEmpty');
  }

  const node = doc.convert(formula.trim(), { display: !!display });
  const svgNode = adaptor.tags(node, 'svg')[0];
  if (!svgNode) {
    throw new Error('formulaFailed');
  }

  const vbAttr = adaptor.getAttribute(svgNode, 'viewBox') || '';
  const vb = vbAttr.split(/\s+/).map(Number);
  if (vb.length !== 4 || vb.some(n => !Number.isFinite(n))) {
    throw new Error('formulaFailedShort');
  }

  adaptor.setAttribute(svgNode, 'xmlns', 'http://www.w3.org/2000/svg');
  adaptor.setAttribute(svgNode, 'style', `color:${COLOR_RE.test(color) ? color : '#000000'}`);
  adaptor.setAttribute(svgNode, 'width', String(vb[2]));
  adaptor.setAttribute(svgNode, 'height', String(vb[3]));

  return {
    svg: adaptor.outerHTML(svgNode),
    width: vb[2] / 1000,
    height: vb[3] / 1000
  };
}

module.exports = { renderFormula };
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
