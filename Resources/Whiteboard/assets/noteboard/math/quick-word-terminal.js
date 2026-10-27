/**
 * NoteBoard Ink — Quick Word Terminal (Ô dán & Biên dịch nhanh văn bản Word)
 * Cho phép copy & paste trực tiếp văn bản có hình ảnh, định dạng (in đậm, nghiêng, gạch chân)
 * và công thức MathType / Office Math (Equation) vào ô Terminal cạnh sidebar trái để biên dịch
 * hiển thị lên bảng NoteBoard giống hệt như mở file Word mà không cần lưu file .docx.
 */
(()=>{
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const isProjector = new URLSearchParams(location.search).get('projector') === '1';
  if (isProjector) return;

  /* ============================================================
   * 1. BỘ CHUYỂN ĐỔI MATHML SANG LATEX (MATHML TO KATEX LATEX)
   * Phục vụ công thức MathType và Word 365 khi dán qua Clipboard
   * ============================================================ */
  const MATHML_SYMBOLS = {
    'π': '\\pi ', 'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ', 'δ': '\\delta ',
    'Δ': '\\Delta ', '∆': '\\Delta ', 'ε': '\\varepsilon ', 'ϵ': '\\epsilon ', 'ζ': '\\zeta ',
    'η': '\\eta ', 'θ': '\\theta ', 'Θ': '\\Theta ', 'ι': '\\iota ', 'κ': '\\kappa ',
    'λ': '\\lambda ', 'Λ': '\\Lambda ', 'μ': '\\mu ', 'ν': '\\nu ', 'ξ': '\\xi ',
    'ρ': '\\rho ', 'σ': '\\sigma ', 'Σ': '\\Sigma ', 'τ': '\\tau ', 'υ': '\\upsilon ',
    'φ': '\\varphi ', 'ϕ': '\\phi ', 'Φ': '\\Phi ', 'χ': '\\chi ', 'ψ': '\\psi ',
    'Ψ': '\\Psi ', 'ω': '\\omega ', 'Ω': '\\Omega ', '±': '\\pm ', '∓': '\\mp ',
    '×': '\\times ', '÷': '\\div ', '⋅': '\\cdot ', '·': '\\cdot ', '∙': '\\cdot ',
    '≠': '\\ne ', '≤': '\\le ', '≥': '\\ge ', '≈': '\\approx ', '≡': '\\equiv ',
    '→': '\\to ', '←': '\\leftarrow ', '↔': '\\leftrightarrow ', '⇒': '\\Rightarrow ',
    '⇔': '\\Leftrightarrow ', '↑': '\\uparrow ', '↓': '\\downarrow ', '∞': '\\infty ',
    '∑': '\\sum ', '∏': '\\prod ', '∫': '\\int ', '∬': '\\iint ', '∭': '\\iiint ',
    '∮': '\\oint ', '∂': '\\partial ', '∇': '\\nabla ', '√': '\\sqrt ', '∈': '\\in ',
    '∉': '\\notin ', '⊂': '\\subset ', '∪': '\\cup ', '∩': '\\cap ', '∅': '\\emptyset ',
    '∀': '\\forall ', '∃': '\\exists ', '∠': '\\angle ', '⊥': '\\perp ', '∥': '\\parallel ',
    '≅': '\\cong ', '°': '^\\circ ', '℃': '^{\\circ}\\mathrm{C}', '℉': '^{\\circ}\\mathrm{F}',
    'ℓ': '\\ell ', 'ℝ': '\\mathbb{R}', 'ℤ': '\\mathbb{Z}', 'ℕ': '\\mathbb{N}', 'ℚ': '\\mathbb{Q}'
  };

  function mathml2tex(node) {
    if (!node) return '';
    const name = (node.localName || node.nodeName || '').toLowerCase().replace(/^m:/, '');
    const ch = Array.from(node.childNodes || []).filter(c => c.nodeType === 1);

    const getAttr = (el, a) => el.getAttribute ? (el.getAttribute(a) || el.getAttributeNS?.(null, a) || '') : '';
    const textOf = (el) => (el.textContent || '').trim();

    switch (name) {
      case 'math':
      case 'mrow':
      case 'mstyle':
      case 'mpadded':
      case 'mphantom':
      case 'semantics':
        return ch.map(mathml2tex).join('');

      case 'annotation':
      case 'annotation-xml':
        return '';

      case 'mi': {
        const txt = textOf(node);
        if (MATHML_SYMBOLS[txt]) return MATHML_SYMBOLS[txt];
        if (/^[a-zA-Z]$/.test(txt)) return txt;
        if (/^[a-zA-Z0-9]+$/.test(txt)) return `\\mathrm{${txt}}`;
        return txt;
      }

      case 'mn': {
        return textOf(node);
      }

      case 'mo': {
        const txt = textOf(node);
        if (MATHML_SYMBOLS[txt]) return MATHML_SYMBOLS[txt];
        if (txt === '&minus;' || txt === '−') return '-';
        if (txt === '&plusmn;') return '\\pm ';
        if (txt === '&times;') return '\\times ';
        if (txt === '&le;' || txt === '<=') return '\\le ';
        if (txt === '&ge;' || txt === '>=') return '\\ge ';
        if (txt === '&ne;' || txt === '!=') return '\\ne ';
        if (txt === '&rarr;' || txt === '→') return '\\to ';
        if (txt === '(' || txt === ')' || txt === '[' || txt === ']' || txt === '{' || txt === '}' || txt === '|' || txt === ',') return txt;
        return txt ? ` ${txt} ` : '';
      }

      case 'mtext': {
        const txt = textOf(node);
        return txt ? `\\text{${txt}}` : '';
      }

      case 'mfrac': {
        const num = ch[0] ? mathml2tex(ch[0]) : '';
        const den = ch[1] ? mathml2tex(ch[1]) : '';
        return `\\frac{${num}}{${den}}`;
      }

      case 'msqrt': {
        const body = ch.map(mathml2tex).join('');
        return `\\sqrt{${body}}`;
      }

      case 'mroot': {
        const body = ch[0] ? mathml2tex(ch[0]) : '';
        const deg = ch[1] ? mathml2tex(ch[1]) : '';
        return `\\sqrt[${deg}]{${body}}`;
      }

      case 'msup': {
        const base = ch[0] ? mathml2tex(ch[0]) : '';
        const exp = ch[1] ? mathml2tex(ch[1]) : '';
        return `{${base}}^{${exp}}`;
      }

      case 'msub': {
        const base = ch[0] ? mathml2tex(ch[0]) : '';
        const sub = ch[1] ? mathml2tex(ch[1]) : '';
        return `{${base}}_{${sub}}`;
      }

      case 'msubsup': {
        const base = ch[0] ? mathml2tex(ch[0]) : '';
        const sub = ch[1] ? mathml2tex(ch[1]) : '';
        const exp = ch[2] ? mathml2tex(ch[2]) : '';
        return `{${base}}_{${sub}}^{${exp}}`;
      }

      case 'munder': {
        const base = ch[0] ? mathml2tex(ch[0]) : '';
        const under = ch[1] ? mathml2tex(ch[1]) : '';
        const bTxt = ch[0] ? textOf(ch[0]) : '';
        if (bTxt === 'lim' || base.includes('lim')) return `\\lim_{${under}}`;
        return `{${base}}_{${under}}`;
      }

      case 'mover': {
        const base = ch[0] ? mathml2tex(ch[0]) : '';
        const over = ch[1] ? textOf(ch[1]) : '';
        if (over === '→' || over === '➔') return `\\vec{${base}}`;
        if (over === '¯' || over === '-' || over === '—') return `\\overline{${base}}`;
        if (over === '^') return `\\hat{${base}}`;
        return `{${base}}^{${over}}`;
      }

      case 'munderover': {
        const base = ch[0] ? mathml2tex(ch[0]) : '';
        const under = ch[1] ? mathml2tex(ch[1]) : '';
        const over = ch[2] ? mathml2tex(ch[2]) : '';
        return `{${base}}_{${under}}^{${over}}`;
      }

      case 'mfenced': {
        const open = getAttr(node, 'open') || '(';
        const close = getAttr(node, 'close') || ')';
        const body = ch.map(mathml2tex).join('');
        const l = open === '{' ? '\\{' : open;
        const r = close === '}' ? '\\}' : close;
        return `\\left${l}${body}\\right${r}`;
      }

      case 'mtable': {
        const rows = ch.filter(c => (c.localName || c.nodeName || '').replace(/^m:/, '').toLowerCase() === 'mtr');
        const rTex = rows.map(r => {
          const cells = Array.from(r.childNodes || []).filter(c => c.nodeType === 1);
          return cells.map(mathml2tex).join(' & ');
        }).join(' \\\\ ');
        return `\\begin{matrix}${rTex}\\end{matrix}`;
      }

      default:
        return ch.map(mathml2tex).join('');
    }
  }

  /* ============================================================
   * 2. BỘ CHUẨN HÓA & BIÊN DỊCH WORD CLIPBOARD SANG NOTEBOARD
   * Giữ nguyên ảnh, định dạng in đậm/nghiêng/gạch chân/màu, công thức
   * ============================================================ */
  function convertWordClipboardToHtml(rawHtml, rawText) {
    let h = rawHtml || '';
    if (!h.trim() && rawText && rawText.trim()) {
      h = rawText.split(/\r?\n\r?\n/).map(p => '<p>' + p.replace(/\r?\n/g, '<br>') + '</p>').join('');
    }
    if (!h.trim()) return '';

    // Trích xuất đúng phân đoạn HTML Fragment nếu có header Windows Clipboard
    if (h.includes('<!--StartFragment-->') && h.includes('<!--EndFragment-->')) {
      h = h.split('<!--StartFragment-->')[1].split('<!--EndFragment-->')[0];
    }

    // 0. Chuẩn hóa fake WMF MIME type thành PNG để Chromium hiển thị
    h = h.replace(/src=(["'])data:image\/wmf;base64,(iVBORw0KGgo[A-Za-z0-9+/=]+)\1/gi, 'src="data:image/png;base64,$2" class="eq-img"');

    // 0.1 Gỡ bỏ các lớp chú thích có điều kiện của Microsoft Word nhưng giữ lại nội dung
    h = h
      .replace(/<!--\[if\s+gte\s+mso\s+9\]><xml>([\s\S]*?)<\/xml><!\[endif\]-->/gi, '$1')
      .replace(/<!--\[if\s+!msEquation\]><!-->([\s\S]*?)<!--<!\[endif\]-->/gi, '$1')
      .replace(/<!--\[if\s+!msEquation\]>([\s\S]*?)<!\[endif\]-->/gi, '$1')
      .replace(/<!\[if\s+!vml\]>([\s\S]*?)<!\[endif\]>/gi, '$1')
      .replace(/<!--\[if\s+gte\s+vml\s+1\]>([\s\S]*?)<!\[endif\]-->/gi, '$1');

    // 0.2 Xóa bỏ các thẻ shape VML thừa và các thuộc tính làm vỡ dòng hiển thị
    h = h
      .replace(/<v:shapetype[\s\S]*?<\/v:shapetype>/gi, '')
      .replace(/<v:shape[\s\S]*?<\/v:shape>/gi, '')
      .replace(/style=["'][^"']*position:\s*relative[^"']*["']/gi, '')
      .replace(/style=["'][^"']*mso-text-raise[^"']*["']/gi, '')
      .replace(/\r?\n\s*/g, ' ')
      .replace(/\s+([,.:;?!])/g, '$1');

    const parser = new DOMParser();
    const doc = parser.parseFromString(h, 'text/html');
    const body = doc.body;

    // Loại bỏ các thẻ metadata rác của Word
    body.querySelectorAll('style, link, meta, xml, script').forEach(el => el.remove());

    // 1. Chuyển đổi toàn bộ thẻ MathML (<math>) sang <span class="qwt-math" data-tex="...">$LaTeX$</span>
    const mathNodes = Array.from(body.querySelectorAll('math, *')).filter(el => {
      const name = (el.localName || el.nodeName || '').replace(/^m:/i, '').toLowerCase();
      return name === 'math';
    });
    mathNodes.forEach(m => {
      try {
        const tex = mathml2tex(m);
        if (tex && tex.trim()) {
          const span = doc.createElement('span');
          span.className = 'qwt-math';
          span.setAttribute('data-tex', tex.trim());
          span.textContent = '$' + tex.trim() + '$';
          m.parentNode?.replaceChild(span, m);
        } else {
          m.remove();
        }
      } catch (_) {
        m.remove();
      }
    });

    // 2. Chuyển đổi toàn bộ thẻ Office Math (<m:oMath>, <oMath>, <m:oMathPara>) sang LaTeX
    const ommlNodes = Array.from(body.querySelectorAll('*')).filter(el => {
      const name = (el.localName || el.nodeName || '').replace(/^m:/i, '').toLowerCase();
      return name === 'omath' || name === 'omathpara';
    });
    const H = window.NBWordCore || {};
    ommlNodes.forEach(om => {
      try {
        const tex = H.omml2tex ? H.omml2tex(om) : '';
        if (tex && tex.trim()) {
          const span = doc.createElement('span');
          span.className = 'qwt-math';
          span.setAttribute('data-tex', tex.trim());
          span.textContent = '$' + tex.trim() + '$';
          om.parentNode?.replaceChild(span, om);
        } else {
          om.remove();
        }
      } catch (_) {
        om.remove();
      }
    });

    // 3. Xử lý ảnh công thức MathType (alt hoặc title chứa LaTeX, hoặc ảnh inline)
    const imgNodes = Array.from(body.querySelectorAll('img'));
    imgNodes.forEach(img => {
      const alt = (img.getAttribute('alt') || '').trim();
      const title = (img.getAttribute('title') || '').trim();
      const mathText = alt || title;
      if (/^\$[^$]+\$$|^\\\([\s\S]*?\\\)$|^\\\[[\s\S]*?\\\]$/.test(mathText)) {
        const tex = mathText.replace(/^\\\(|^\\\[|\$+/g, '').replace(/\\\)|\\\]|\$+$/g, '').trim();
        const span = doc.createElement('span');
        span.className = 'qwt-math';
        span.setAttribute('data-tex', tex);
        span.textContent = '$' + tex + '$';
        img.parentNode?.replaceChild(span, img);
        return;
      }
      if (/^\\(?:frac|sqrt|sum|int|begin|alpha|beta|pi|Delta|omega)/.test(mathText)) {
        const span = doc.createElement('span');
        span.className = 'qwt-math';
        span.setAttribute('data-tex', mathText);
        span.textContent = '$' + mathText + '$';
        img.parentNode?.replaceChild(span, img);
        return;
      }
      const w = parseFloat(img.getAttribute('width') || img.style.width || '0');
      const h = parseFloat(img.getAttribute('height') || img.style.height || '0');
      const isFormula = img.classList.contains('eq-img') || (h > 0 && h <= 80 && (w <= 550 || w === 0)) || (!h && !w && /data:image/i.test(img.src));
      if (isFormula) {
        img.classList.add('eq-img');
        img.removeAttribute('width');
        img.removeAttribute('height');
        img.style.height = '1.22em';
        img.style.width = 'auto';
        img.style.maxWidth = '100%';
        img.style.verticalAlign = '-0.22em';
        img.style.display = 'inline-block';
        img.style.margin = '0 0.15em';
      } else {
        img.removeAttribute('width');
        img.removeAttribute('height');
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.verticalAlign = 'middle';
      }
    });

    // 4. Chuẩn hóa LaTeX delimiter: \[...\], \(...\), naked \frac, \sqrt
    const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.parentNode && !walker.currentNode.parentNode.closest('.qwt-math, .eq-tex, script, style')) {
        textNodes.push(walker.currentNode);
      }
    }
    textNodes.forEach(tn => {
      let t = tn.nodeValue;
      if (!t) return;
      if (t.includes('\\[') || t.includes('\\(') || t.includes('\\frac') || t.includes('\\sqrt')) {
        const parts = t.split('$');
        for (let i = 0; i < parts.length; i += 2) {
          parts[i] = parts[i]
            .replace(/\\\[([\s\S]*?)\\\]/g, (m, tex) => ' $' + tex.trim() + '$ ')
            .replace(/\\\(([\s\S]*?)\\\)/g, (m, tex) => ' $' + tex.trim() + '$ ')
            .replace(/\\((?:frac|dfrac|tfrac)\s*\{[^{}]*\}\s*\{[^{}]*\})/g, ' $$$1$ ')
            .replace(/\\((?:sqrt)(?:\[[^{}]*\])?\s*\{[^{}]*\})/g, ' $$$1$ ');
        }
        tn.nodeValue = parts.join('$');
      }
    });

    return body.innerHTML;
  }

  function compileWordHtmlToBlocks(htmlContent, rawPlainText = '') {
    const H = window.NBWordCore || {};
    const blocks = [];

    let sourceHtml = htmlContent || '';
    if (!sourceHtml.trim() && rawPlainText.trim()) {
      sourceHtml = rawPlainText.split(/\r?\n\r?\n/).map(para => '<p>' + para.replace(/\r?\n/g, '<br>') + '</p>').join('');
    }
    if (!sourceHtml.trim()) return blocks;

    // Chuẩn hóa trước
    sourceHtml = convertWordClipboardToHtml(sourceHtml, rawPlainText);

    // Dùng DOMParser bóc tách cây HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceHtml, 'text/html');
    const body = doc.body;

    // Loại bỏ style, link, meta, xml rác
    body.querySelectorAll('style, link, meta, xml, script').forEach(el => el.remove());

    // Thay thế các phần tử KaTeX, .qwt-math, .eq-tex sang $LaTeX$ nguyên bản trước khi chia khối
    const mathSpans = Array.from(body.querySelectorAll('.qwt-math, .eq-tex, .katex'));
    mathSpans.forEach(span => {
      const tex = span.getAttribute('data-tex') ||
                  span.querySelector('annotation[encoding*="tex"]')?.textContent?.trim() ||
                  span.textContent.replace(/^\$+|\$+$/g, '').trim();
      if (tex) {
        const textNode = doc.createTextNode(' $' + tex + '$ ');
        span.parentNode?.replaceChild(textNode, span);
      }
    });

    // 4. Duyệt các khối đoạn văn (<p>, <div>, <h1>-<h6>, <table>, <li>)
    const topElements = Array.from(body.children);
    if (!topElements.length && body.innerHTML.trim()) {
      topElements.push(body);
    }

    const fmtQ = H.formatQuestionBlock || ((h) => h);
    const cleanMarkup = H.cleanMarkup || ((h) => h);
    const markBlock = H.markBlock || (() => '');

    topElements.forEach(el => {
      const tag = (el.tagName || '').toLowerCase();
      if (['style', 'link', 'meta', 'script', 'xml'].includes(tag)) return;

      // Nếu là bảng biểu (Table)
      if (tag === 'table') {
        const tableHtml = cleanMarkup(el.outerHTML);
        blocks.push({
          tag: 'div',
          cls: '',
          html: tableHtml,
          attrs: '',
          notes: ''
        });
        return;
      }

      // Xử lý các đoạn văn con hoặc thẻ đơn lẻ
      const paras = (tag === 'div' && el.querySelector('p, table, h1, h2, h3, h4')) 
        ? Array.from(el.querySelectorAll('p, table, h1, h2, h3, h4, li'))
        : [el];

      paras.forEach(p => {
        const pTag = (p.tagName || '').toLowerCase();
        if (pTag === 'table') {
          blocks.push({ tag: 'div', cls: '', html: cleanMarkup(p.outerHTML), attrs: '', notes: '' });
          return;
        }

        const rawText = (p.textContent || '').trim();
        let innerHtml = p.innerHTML || '';
        if (!rawText && !innerHtml.includes('<img') && !innerHtml.includes('<svg')) return;

        // Chuẩn hóa và làm sạch triệt để ngắt dòng, định vị và khoảng trắng thừa từ Word:
        innerHtml = innerHtml
          .replace(/style=["'][^"']*position:\s*relative[^"']*["']/gi, '')
          .replace(/style=["'][^"']*mso-text-raise[^"']*["']/gi, '')
          .replace(/\r?\n\s*/g, ' ')
          .replace(/\s*([,.:;?!])(?=\s|<|$)/g, '$1')
          .replace(/\s{2,}/g, ' ')
          .trim();

        // Chuẩn hóa công thức LaTeX trong đoạn văn (chỉ xử lý các vùng nằm NGOÀI dấu $):
        const parts = innerHtml.split('$');
        for (let i = 0; i < parts.length; i += 2) {
          parts[i] = parts[i]
            .replace(/\\\[([\s\S]*?)\\\]/g, (m, tex) => ' $' + tex.trim() + '$ ')
            .replace(/\\\(([\s\S]*?)\\\)/g, (m, tex) => ' $' + tex.trim() + '$ ')
            .replace(/([A-D]\.)(\s*\$)/g, '$1 $2')
            .replace(/\\((?:frac|dfrac|tfrac)\s*\{[^{}]*\}\s*\{[^{}]*\})/g, ' $$$1$ ')
            .replace(/\\((?:sqrt)(?:\[[^{}]*\])?\s*\{[^{}]*\})/g, ' $$$1$ ');
        }
        innerHtml = parts.join('$');

        // Nhận diện loại khối: Heading hay Question hay Đoạn thường
        let targetTag = 'p';
        let cls = 'nb-word-blk';
        let isQs = false;

        if (/^h1$/i.test(pTag)) { targetTag = 'h1'; cls = ''; }
        else if (/^h2$/i.test(pTag)) { targetTag = 'h2'; cls = 'sec'; }
        else if (/^h3$/i.test(pTag)) { targetTag = 'h3'; cls = ''; }
        else if (/^li$/i.test(pTag)) { targetTag = 'div'; cls = 'li'; }

        // Kiểm tra mẫu Câu hỏi trắc nghiệm / tự luận
        if (markBlock) {
          const marked = markBlock(rawText, '');
          if (marked) cls = marked + ' nb-word-blk';
        }

        const cleanText = rawText.replace(/\s+/g, ' ').trim();
        if (/^(?:C(?:[âa]|Ă¢|[aA]u)|Câu|B(?:[àa]|Ă |[aA]i)|Bài|V[íi]\s*d[ụu]|VD)\s*\d+/i.test(cleanText)) {
          cls = 'qs nb-word-blk';
          targetTag = 'div';
          isQs = true;
        }

        // Định dạng trắc nghiệm chuyên sâu (huy hiệu Câu, phương án A B C D, lời giải, chia cột)
        const formatted = fmtQ(innerHtml, isQs);
        const finalHtml = cleanMarkup(formatted);

        blocks.push({
          tag: targetTag,
          cls: cls,
          html: finalHtml,
          attrs: '',
          notes: ''
        });
      });
    });

    return blocks;
  }

  /* ============================================================
   * 3. GIAO DIỆN QUICK WORD TERMINAL (CẠNH SIDEBAR TRÁI)
   * Mặc định thu hẹp thành tab nhỏ, bấm vào mở rộng ra
   * ============================================================ */
  const css = document.createElement('style');
  css.textContent = `
    /* Tab thu hẹp gắn cạnh mép phải sidebar trái (#rail) */
    #qwtTab {
      position: fixed;
      left: 68px;
      top: 135px;
      width: 32px;
      height: 156px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-left: none;
      border-radius: 0 12px 12px 0;
      box-shadow: 2px 4px 14px rgba(15, 23, 42, 0.08);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      z-index: 45;
      user-select: none;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #qwtTab:hover {
      left: 68px;
      width: 35px;
      border-color: #168b82;
      background: #f0fdfa;
      box-shadow: 4px 6px 20px rgba(22, 139, 130, 0.2);
    }
    #qwtTab.is-open {
      display: none !important;
    }
    .qwt-tab-icon {
      font-size: 15px;
      color: #168b82;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qwt-tab-label {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: #475569;
      white-space: nowrap;
      text-transform: uppercase;
    }
    .qwt-tab-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    }

    /* Khung Drawer mở rộng trượt ra từ cạnh trái */
    #qwtDrawer {
      position: fixed;
      left: 68px;
      top: 117px;
      bottom: 34px;
      width: 580px;
      max-width: calc(100vw - 80px);
      background: #ffffff;
      border-right: 1px solid #dce3e9;
      box-shadow: 10px 0 32px rgba(15, 23, 42, 0.12);
      z-index: 46;
      display: flex;
      flex-direction: column;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
      transform: translateX(-100%);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
    }
    #qwtDrawer.is-open {
      transform: translateX(0);
      opacity: 1;
      pointer-events: auto;
    }

    /* Header Drawer */
    .qwt-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .qwt-head-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .qwt-head-title b {
      font-size: 14px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .qwt-head-badge {
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 99px;
      background: #e6fffa;
      color: #0d9488;
      border: 1px solid #99f6e4;
    }
    .qwt-head-acts {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .qwt-btn-collapse {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }
    .qwt-btn-collapse:hover {
      background: #f1f5f9;
      border-color: #168b82;
      color: #168b82;
    }
    .qwt-btn-close {
      border: none;
      background: transparent;
      color: #64748b;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      display: grid;
      place-items: center;
    }
    .qwt-btn-close:hover {
      background: #fee2e2;
      color: #ef4444;
    }

    /* Vùng thân nội dung */
    .qwt-body {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding: 14px 16px;
      gap: 12px;
      overflow-y: auto;
    }

    /* Hộp hướng dẫn nhỏ */
    .qwt-hint-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      border-radius: 8px;
      font-size: 12px;
      color: #115e59;
      line-height: 1.45;
    }

    /* Ô soạn thảo dán đa năng Rich Editor */
    .qwt-editor-wrap {
      flex: 1;
      min-height: 180px;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    #qwtEditor {
      flex: 1;
      min-height: 180px;
      padding: 12px 14px;
      background: #f8fafc;
      border: 1.5px dashed #cbd5e1;
      border-radius: 10px;
      outline: none;
      font-size: 13.5px;
      line-height: 1.6;
      color: #1e293b;
      overflow-y: auto;
      user-select: text;
      transition: all 0.18s ease;
    }
    #qwtEditor:focus {
      background: #ffffff;
      border-color: #168b82;
      border-style: solid;
      box-shadow: 0 0 0 3px rgba(22, 139, 130, 0.12);
    }
    #qwtEditor:empty::before {
      content: attr(data-placeholder);
      color: #94a3b8;
      pointer-events: none;
      font-size: 13px;
      line-height: 1.6;
    }
    #qwtEditor img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 4px 0;
      border: 1px solid #e2e8f0;
    }
    #qwtEditor table {
      border-collapse: collapse;
      width: 100%;
      margin: 6px 0;
    }
    #qwtEditor td, #qwtEditor th {
      border: 1px solid #cbd5e1;
      padding: 4px 8px;
      font-size: 12.5px;
    }

    /* Thanh thông số phân tích (Stats Bar) */
    .qwt-stats-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 6px;
      font-size: 11.5px;
      color: #64748b;
      font-weight: 500;
    }
    .qwt-stats-chips {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Thanh tác vụ dưới cùng */
    .qwt-foot {
      padding: 12px 16px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }
    .qwt-actions-main {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .qwt-btn-primary {
      flex: 1;
      height: 38px;
      background: #168b82;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 2px 6px rgba(22, 139, 130, 0.3);
      transition: all 0.15s ease;
    }
    .qwt-btn-primary:hover {
      background: #0f766e;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(22, 139, 130, 0.4);
    }
    .qwt-actions-sub {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .qwt-btn-sub {
      flex: 1;
      height: 32px;
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.15s ease;
    }
    .qwt-btn-sub:hover {
      background: #f1f5f9;
      border-color: #168b82;
      color: #168b82;
    }
    .qwt-btn-clear {
      height: 32px;
      padding: 0 12px;
      background: #ffffff;
      color: #64748b;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .qwt-btn-clear:hover {
      background: #fee2e2;
      border-color: #ef4444;
      color: #b91c1c;
    }

    /* Ẩn hoàn toàn trong chế độ Zen / Toàn màn hình */
    body.zen #qwtTab, body.zen #qwtDrawer {
      display: none !important;
    }
    @media (max-width: 700px) {
      #qwtTab { left: 54px; }
      #qwtDrawer { left: 54px; width: calc(100vw - 60px); }
    }
  `;
  document.head.appendChild(css);

  // Tạo DOM Tab thu hẹp
  const tabEl = document.createElement('div');
  tabEl.id = 'qwtTab';
  tabEl.title = 'Quick Word Terminal · Dán văn bản có MathType/Office Math và ảnh để biên dịch trực tiếp (Click để mở)';
  tabEl.innerHTML = `
    <div class="qwt-tab-icon">⌨</div>
    <div class="qwt-tab-label">Word Terminal</div>
    <div class="qwt-tab-dot"></div>
  `;
  document.body.appendChild(tabEl);

  // Tạo DOM Drawer mở rộng
  const drawerEl = document.createElement('div');
  drawerEl.id = 'qwtDrawer';
  drawerEl.innerHTML = `
    <div class="qwt-head">
      <div class="qwt-head-title">
        <b>⌨ Quick Word Terminal</b>
        <span class="qwt-head-badge">MathType &amp; Office Math</span>
      </div>
      <div class="qwt-head-acts">
        <button type="button" class="qwt-btn-collapse" id="qwtCollapseBtn" title="Thu gọn về tab cạnh sidebar">◀ Thu hẹp</button>
        <button type="button" class="qwt-btn-close" id="qwtCloseBtn" title="Đóng thanh terminal">✕</button>
      </div>
    </div>
    <div class="qwt-body">
      <div class="qwt-hint-box">
        <span>💡</span>
        <span><b>Cách dùng:</b> Copy câu hỏi/bài tập từ Word (Ctrl+C) $\\rightarrow$ Dán vào ô bên dưới (Ctrl+V) $\\rightarrow$ Bấm <b>[Biên dịch]</b>. Hệ thống giữ nguyên ảnh vẽ, in đậm/nghiêng/gạch chân, công thức MathType và Office Math.</span>
      </div>
      <div class="qwt-editor-wrap">
        <div id="qwtEditor" contenteditable="true" spellcheck="false" data-placeholder="Dán (Ctrl+V) nội dung copy từ Microsoft Word vào đây...&#10;&#10;Hỗ trợ:&#10;• Ảnh vẽ, đồ thị, sơ đồ hình học&#10;• Công thức toán MathType, Office Math, LaTeX&#10;• Định dạng in đậm, in nghiêng, gạch chân, màu sắc&#10;• Tự động chia đề trắc nghiệm (Câu 1, A, B, C, D) & Lời giải"></div>
      </div>
      <div class="qwt-stats-bar">
        <div class="qwt-stats-chips" id="qwtStats">
          <span>📄 0 đoạn văn</span>
          <span>·</span>
          <span>Σ 0 công thức</span>
          <span>·</span>
          <span>🖼 0 ảnh</span>
        </div>
        <button type="button" class="qwt-btn-sub" id="qwtSampleBtn" style="flex:none;height:24px;padding:0 8px;font-size:11px;">Mẫu thử nghiệm</button>
      </div>
    </div>
    <div class="qwt-foot">
      <div class="qwt-actions-main">
        <button type="button" class="qwt-btn-primary" id="qwtCompileNewBtn" title="Biên dịch nội dung và mở thành bài giảng mới (thay thế mở file Word) [Ctrl+Enter]">
          <span>⚡ Biên dịch mở bài mới</span>
          <span style="font-size:11px;opacity:0.85;font-weight:normal;">(Ctrl+Enter)</span>
        </button>
      </div>
      <div class="qwt-actions-sub">
        <button type="button" class="qwt-btn-sub" id="qwtCompileAddPageBtn" title="Tự động tạo thêm trang trắng mới và chèn nội dung vừa biên dịch vào đó">➕ Chèn vào trang mới</button>
        <button type="button" class="qwt-btn-sub" id="qwtCompileCurrentPageBtn" title="Chèn tiếp nội dung vào trang đang đứng trên bảng">⬇ Chèn trang hiện tại</button>
        <button type="button" class="qwt-btn-clear" id="qwtClearBtn" title="Xóa nội dung ô soạn">🗑 Xóa</button>
      </div>
    </div>
  `;
  document.body.appendChild(drawerEl);

  /* ============================================================
   * 4. ĐĂNG KÝ SỰ KIỆN ĐÓNG / MỞ & THAO TÁC TERMINAL
   * ============================================================ */
  const editor = drawerEl.querySelector('#qwtEditor');
  const statsEl = drawerEl.querySelector('#qwtStats');

  let rawPastedHtml = '';
  let rawPastedText = '';

  function openTerminal() {
    drawerEl.classList.add('is-open');
    tabEl.classList.add('is-open');
    setTimeout(() => editor.focus(), 120);
  }

  function closeTerminal() {
    drawerEl.classList.remove('is-open');
    tabEl.classList.remove('is-open');
  }

  // Click tab mở terminal
  tabEl.onclick = openTerminal;
  const railBtn = document.getElementById('qwtRailBtn');
  if (railBtn) {
    railBtn.onclick = () => {
      if (drawerEl.classList.contains('is-open')) closeTerminal();
      else openTerminal();
    };
  }
  drawerEl.querySelector('#qwtCollapseBtn').onclick = closeTerminal;
  drawerEl.querySelector('#qwtCloseBtn').onclick = closeTerminal;

  // Render KaTeX trực tiếp trong ô soạn thảo để người dùng nhìn thấy công thức toán ngay
  function renderMathPreviewInEditor(el) {
    if (!el) return;
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (_) {}
    }
  }

  // Cập nhật thống kê khi nội dung thay đổi
  function updateStats() {
    const text = (editor.innerText || '').trim();
    const html = editor.innerHTML || '';
    const paras = text ? text.split(/\r?\n+/).filter(Boolean).length : 0;
    const formulas = (html.match(/<math[\s>]/gi) || []).length + 
                     (html.match(/<m:omath[\s>]/gi) || []).length + 
                     (html.match(/class="[^"]*(?:katex|qwt-math|eq-tex)[^"]*"/gi) || []).length +
                     (html.match(/\$[^$]+\$/g) || []).length;
    const imgs = (html.match(/<img[\s>]/gi) || []).length;

    statsEl.innerHTML = `
      <span>📄 ${paras} đoạn</span>
      <span>·</span>
      <span>Σ ${formulas} công thức</span>
      <span>·</span>
      <span>🖼 ${imgs} ảnh</span>
    `;
  }

  // Lắng nghe sự kiện Paste trong ô Editor
  editor.addEventListener('paste', async (e) => {
    e.preventDefault();

    const clipboard = e.clipboardData || window.clipboardData;
    if (!clipboard) return;

    let html = clipboard.getData('text/html') || '';
    const text = clipboard.getData('text/plain') || '';

    if (window.nbClipboard?.resolveTempImages && html) {
      try {
        html = await window.nbClipboard.resolveTempImages(html);
      } catch (_) {}
    }

    const convertedHtml = convertWordClipboardToHtml(html, text);
    if (convertedHtml) {
      const isEditorEmpty = !editor.innerText.trim() && !editor.querySelector('img, svg');
      if (isEditorEmpty) {
        editor.innerHTML = convertedHtml;
      } else {
        document.execCommand('insertHTML', false, convertedHtml);
      }
      rawPastedHtml = editor.innerHTML;
      rawPastedText = editor.innerText;
    }

    // Render KaTeX trực tiếp trong ô soạn thảo
    renderMathPreviewInEditor(editor);
    setTimeout(updateStats, 40);
  });

  editor.addEventListener('input', () => {
    rawPastedHtml = editor.innerHTML;
    rawPastedText = editor.innerText;
    updateStats();
  });

  // Phím tắt Ctrl+Enter trong ô soạn thảo để biên dịch mở bài mới
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      drawerEl.querySelector('#qwtCompileNewBtn').click();
    } else if (e.key === 'Escape') {
      closeTerminal();
    }
  });

  // Phím tắt toàn cục: Ctrl+Shift+V mở Quick Word Terminal
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
      e.preventDefault();
      if (drawerEl.classList.contains('is-open')) {
        closeTerminal();
      } else {
        openTerminal();
      }
    }
  });

  // Nút xóa nội dung
  drawerEl.querySelector('#qwtClearBtn').onclick = () => {
    editor.innerHTML = '';
    rawPastedHtml = '';
    rawPastedText = '';
    updateStats();
    editor.focus();
  };

  // Nút nạp mẫu thử nghiệm
  drawerEl.querySelector('#qwtSampleBtn').onclick = () => {
    editor.innerHTML = `
      <p><b>Câu 1:</b> Một vật dao động điều hòa với phương trình li độ $x = 5\\cos(4\\pi t + \\frac{\\pi}{3})\\text{ (cm)}$. Hãy xác định biên độ và chu kì dao động của vật.</p>
      <p>A. $A = 5\\text{ cm}, T = 0,5\\text{ s}$  B. $A = 5\\text{ cm}, T = 2\\text{ s}$  C. $A = 10\\text{ cm}, T = 0,5\\text{ s}$  D. $A = 10\\text{ cm}, T = 4\\text{ s}$</p>
      <p><b>Lời giải:</b></p>
      <p>Từ phương trình $x = A\\cos(\\omega t + \\varphi)$, ta có:</p>
      <p>• Biên độ: $A = 5\\text{ cm}$.</p>
      <p>• Chu kì dao động: $T = \\frac{2\\pi}{\\omega} = \\frac{2\\pi}{4\\pi} = 0,5\\text{ s}$.</p>
      <p>Chọn <b>A</b>.</p>
    `;
    rawPastedHtml = editor.innerHTML;
    rawPastedText = editor.innerText;
    updateStats();
    if (typeof window.toast === 'function') window.toast('Đã nạp nội dung mẫu câu hỏi có công thức!');
  };

  /* ============================================================
   * 5. HÀM THỰC THI BIÊN DỊCH VÀ ĐƯA NỘI DUNG LÊN BẢNG NOTEBOARD
   * ============================================================ */
  async function executeCompile(mode = 'new') {
    let htmlToCompile = rawPastedHtml || editor.innerHTML;
    const textToCompile = rawPastedText || editor.innerText;

    if (window.nbClipboard?.resolveTempImages && htmlToCompile.includes('file:///')) {
      try {
        htmlToCompile = await window.nbClipboard.resolveTempImages(htmlToCompile);
      } catch (_) {}
    }

    if (!htmlToCompile.trim() && !textToCompile.trim()) {
      if (typeof window.toast === 'function') {
        window.toast('Vui lòng dán văn bản từ Word vào ô trước khi biên dịch.');
      } else {
        alert('Vui lòng dán văn bản từ Word vào ô trước khi biên dịch.');
      }
      return;
    }

    const blocks = compileWordHtmlToBlocks(htmlToCompile, textToCompile);
    if (!blocks || !blocks.length) {
      if (typeof window.toast === 'function') {
        window.toast('Không tìm thấy nội dung hợp lệ để biên dịch.');
      }
      return;
    }

    if (mode === 'new') {
      // 1. Mở thành bài mới (thay thế mở file Word)
      if (typeof window.start === 'function') {
        window.start(blocks);
        // Đặt tên bài giảng nếu có câu đầu tiên
        const titleInput = document.getElementById('documentTitle');
        if (titleInput) {
          titleInput.value = 'Bài tập Word (Biên dịch nhanh)';
        }
        if (typeof window.toast === 'function') {
          window.toast(`✨ Đã biên dịch bài giảng từ Word thành công (${blocks.length} khối)!`);
        }
        rawPastedHtml = ''; rawPastedText = ''; editor.innerHTML = ''; updateStats();
        closeTerminal();
      }
    } else if (mode === 'add_page') {
      // 2. Chèn vào trang mới
      if (typeof window.addWritingPage === 'function') {
        window.addWritingPage();
      }
      appendBlocksToBoard(blocks);
      if (typeof window.toast === 'function') {
        window.toast(`➕ Đã biên dịch và chèn vào trang mới (${blocks.length} khối)!`);
      }
      rawPastedHtml = ''; rawPastedText = ''; editor.innerHTML = ''; updateStats();
      closeTerminal();
    } else if (mode === 'current_page') {
      // 3. Chèn vào trang hiện tại
      appendBlocksToBoard(blocks);
      if (typeof window.toast === 'function') {
        window.toast(`⬇ Đã chèn ${blocks.length} khối vào trang hiện tại!`);
      }
      rawPastedHtml = ''; rawPastedText = ''; editor.innerHTML = ''; updateStats();
      closeTerminal();
    }
  }

  function appendBlocksToBoard(newBlocks) {
    if (typeof window.appendDocBlocks === 'function') {
      window.appendDocBlocks(newBlocks);
      return;
    }
    const board = document.getElementById('board');
    if (!board) return;

    if (window.blocks && Array.isArray(window.blocks)) {
      newBlocks.forEach(b => {
        window.blocks.push(b);
        const el = document.createElement(b.tag || 'p');
        el.className = ('blk ' + (b.cls || '')).trim();
        const fmt = window.NBWordCore?.formatQuestionBlock;
        el.innerHTML = fmt ? fmt(b.html, b.cls === 'qs') : b.html;
        if (b.attrs) el.setAttribute('data-n', b.attrs);
        board.appendChild(el);
        if (window.els && Array.isArray(window.els)) {
          window.els.push(el);
        }
      });
    }

    // Render KaTeX cho các phần tử mới chèn
    if (window.__katex && window.renderMathInElement) {
      try {
        window.renderMathInElement(board, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (_) {}
    }

    if (typeof window.markPages === 'function') window.markPages();
    if (typeof window.apply === 'function') window.apply();
    if (typeof window.historyCommit === 'function') window.historyCommit();
    if (typeof window.scheduleSave === 'function') window.scheduleSave();
  }

  // Gắn sự kiện các nút biên dịch
  drawerEl.querySelector('#qwtCompileNewBtn').onclick = () => executeCompile('new');
  drawerEl.querySelector('#qwtCompileAddPageBtn').onclick = () => executeCompile('add_page');
  drawerEl.querySelector('#qwtCompileCurrentPageBtn').onclick = () => executeCompile('current_page');

  // Export API toàn cục để kiểm thử hoặc mở từ nơi khác
  window.NBQuickWordTerminal = {
    open: openTerminal,
    close: closeTerminal,
    compile: executeCompile,
    mathml2tex,
    compileWordHtmlToBlocks
  };
})();
