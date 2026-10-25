/**



 * MatrixExamAI Pro - Studio Math Mindmap Engine (MEA Pro Standard)



 * Supports: Rich Text + LaTeX Math Formulas ($..$, $$..$$), Interactive Tree,



 * Markdown Bidirectional Sync, AI Mindmap Generation, Curated THPT Math Templates,



 * Split/Full Workspace & Integration with Whiteboard / Word.



 */







(function () {



  'use strict';







  // 1. PALETTES & THEME COLORS



  const THEME_COLORS = [



    '#0d9488', // Emerald Teal



    '#0284c7', // Sky Blue



    '#7c3aed', // Violet



    '#d97706', // Amber Gold



    '#059669', // Emerald



    '#e11d48', // Rose Red



    '#475569', // Slate



    '#2563eb'  // Royal Blue



  ];







  // 2. CURATED THPT MATH MINDMAP TEMPLATES



  const MATH_TEMPLATES = {



    dao_ham_12: {



      name: 'Toán 12 • Đạo hàm & Khảo sát hàm số',



      desc: 'Tính đơn điệu, cực trị, GTLN-GTNN và các đường tiệm cận',



      data: {



        id: 'root',



        text: 'Khảo sát hàm số $y=f(x)$',



        color: '#0d9488',



        expanded: true,



        children: [



          {



            id: 'n_1',



            text: '1. Tính đơn điệu hàm số',



            color: '#0284c7',



            expanded: true,



            children: [



              { id: 'n_1_1', text: 'Đồng biến trên $K \\Leftrightarrow f\'(x) \\ge 0, \\forall x \\in K$' },



              { id: 'n_1_2', text: 'Nghịch biến trên $K \\Leftrightarrow f\'(x) \\le 0, \\forall x \\in K$' },



              { id: 'n_1_3', text: 'Đẳng thức $f\'(x) = 0$ chỉ xảy ra tại hữu hạn điểm' }



            ]



          },



          {



            id: 'n_2',



            text: '2. Cực trị hàm số',



            color: '#7c3aed',



            expanded: true,



            children: [



              { id: 'n_2_1', text: 'ĐK cần: $f\'(x_0) = 0$ hoặc $f\'(x_0)$ không xác định' },



              { id: 'n_2_2', text: 'Quy tắc 1: $f\'(x)$ đổi dấu từ $(+) \\to (-)$ qua $x_0 \\Rightarrow$ Cực đại' },



              { id: 'n_2_3', text: 'Quy tắc 1: $f\'(x)$ đổi dấu từ $(-) \\to (+)$ qua $x_0 \\Rightarrow$ Cực tiểu' },



              { id: 'n_2_4', text: 'Quy tắc 2: $f\'(x_0)=0, f\'\'(x_0) < 0 \\Rightarrow$ CĐ; $f\'\'(x_0) > 0 \\Rightarrow$ CT' }



            ]



          },



          {



            id: 'n_3',



            text: '3. Đường tiệm cận',



            color: '#d97706',



            expanded: true,



            children: [



              { id: 'n_3_1', text: 'Tiệm cận đứng: $\\lim_{x \\to x_0^+} y = \\pm\\infty \\Rightarrow x = x_0$' },



              { id: 'n_3_2', text: 'Tiệm cận ngang: $\\lim_{x \\to \\pm\\infty} y = y_0 \\Rightarrow y = y_0$' },



              { id: 'n_3_3', text: 'Tiệm cận xiên: $\\lim_{x \\to \\pm\\infty} [y - (ax+b)] = 0 \\Rightarrow y = ax+b$' }



            ]



          },



          {



            id: 'n_4',



            text: '4. Giá trị lớn nhất & nhỏ nhất',



            color: '#059669',



            expanded: true,



            children: [



              { id: 'n_4_1', text: 'Tìm nghiệm $x_i \\in [a; b]$ của $f\'(x) = 0$' },



              { id: 'n_4_2', text: 'Tính $f(a), f(b), f(x_i)$ rồi so sánh tìm $\\max, \\min$' }



            ]



          }



        ]



      }



    },



    tich_phan_12: {



      name: 'Toán 12 • Nguyên hàm & Tích phân',



      desc: 'Định nghĩa, tính chất, đổi biến số và từng phần',



      data: {



        id: 'root',



        text: 'Nguyên hàm & Tích phân',



        color: '#0284c7',



        expanded: true,



        children: [



          {



            id: 'tp_1',



            text: '1. Định nghĩa & Tính chất cơ bản',



            color: '#0d9488',



            expanded: true,



            children: [



              { id: 'tp_1_1', text: '$\\int f(x)dx = F(x) + C$ với $F\'(x) = f(x)$' },



              { id: 'tp_1_2', text: '$\\int_a^b f(x)dx = F(b) - F(a) = [F(x)]_a^b$' },



              { id: 'tp_1_3', text: '$\\int [k f(x) \\pm g(x)]dx = k\\int f(x)dx \\pm \\int g(x)dx$' }



            ]



          },



          {



            id: 'tp_2',



            text: '2. Phương pháp đổi biến số',



            color: '#7c3aed',



            expanded: true,



            children: [



              { id: 'tp_2_1', text: 'Đổi biến loại 1: Đặt $t = u(x) \\Rightarrow dt = u\'(x)dx$' },



              { id: 'tp_2_2', text: 'Công thức: $\\int f(u(x)) u\'(x)dx = \\int f(t)dt$' },



              { id: 'tp_2_3', text: 'Lưu ý tích phân xác định: Bắt buộc đổi cận' }



            ]



          },



          {



            id: 'tp_3',



            text: '3. Phương pháp tích phân từng phần',



            color: '#d97706',



            expanded: true,



            children: [



              { id: 'tp_3_1', text: 'Công thức: $\\int u \\, dv = uv - \\int v \\, du$' },



              { id: 'tp_3_2', text: 'Xác định: $\\int_a^b u \\, dv = [uv]_a^b - \\int_a^b v \\, du$' },



              { id: 'tp_3_3', text: 'Thứ tự ưu tiên đặt $u$: Nhất log, nhì đa, tam lượng, tứ mũ' }



            ]



          },



          {



            id: 'tp_4',



            text: '4. Ứng dụng hình học',



            color: '#e11d48',



            expanded: true,



            children: [



              { id: 'tp_4_1', text: 'Diện tích hình phẳng: $S = \\int_a^b |f(x) - g(x)| dx$' },



              { id: 'tp_4_2', text: 'Thể tích khối tròn xoay quanh $Ox$: $V = \\pi \\int_a^b f^2(x) dx$' }



            ]



          }



        ]



      }



    },



    hinh_oxyz_12: {



      name: 'Toán 12 • Hình học giải tích Oxyz',



      desc: 'Tọa độ vectơ, phương trình mặt phẳng, đường thẳng và mặt cầu',



      data: {



        id: 'root',



        text: 'Hệ tọa độ trong không gian $Oxyz$',



        color: '#7c3aed',



        expanded: true,



        children: [



          {



            id: 'ox_1',



            text: '1. Vectơ trong không gian',



            color: '#0d9488',



            expanded: true,



            children: [



              { id: 'ox_1_1', text: 'Tích vô hướng: $\\vec{u} \\cdot \\vec{v} = u_1 v_1 + u_2 v_2 + u_3 v_3$' },



              { id: 'ox_1_2', text: 'Độ dài vectơ: $|\\vec{u}| = \\sqrt{u_1^2 + u_2^2 + u_3^2}$' },



              { id: 'ox_1_3', text: 'Tích có hướng: $[\\vec{u}, \\vec{v}] \\perp \\vec{u}$ và $[\\vec{u}, \\vec{v}] \\perp \\vec{v}$' }



            ]



          },



          {



            id: 'ox_2',



            text: '2. Phương trình Mặt cầu $(S)$',



            color: '#0284c7',



            expanded: true,



            children: [



              { id: 'ox_2_1', text: 'Tâm $I(a; b; c)$, bán kính $R$: $(x-a)^2 + (y-b)^2 + (z-c)^2 = R^2$' },



              { id: 'ox_2_2', text: 'Khai triển: $x^2 + y^2 + z^2 - 2ax - 2by - 2cz + d = 0$' },



              { id: 'ox_2_3', text: 'ĐK là mặt cầu: $a^2 + b^2 + c^2 - d > 0 \\Rightarrow R = \\sqrt{a^2+b^2+c^2-d}$' }



            ]



          },



          {



            id: 'ox_3',



            text: '3. Phương trình Mặt phẳng $(\\alpha)$',



            color: '#d97706',



            expanded: true,



            children: [



              { id: 'ox_3_1', text: 'VTPT $\\vec{n}=(A; B; C) \\ne \\vec{0}$: $Ax + By + Cz + D = 0$' },



              { id: 'ox_3_2', text: 'Khoảng cách: $d(M_0, (\\alpha)) = \\frac{|Ax_0 + By_0 + Cz_0 + D|}{\\sqrt{A^2+B^2+C^2}}$' }



            ]



          },



          {



            id: 'ox_4',



            text: '4. Phương trình Đường thẳng $(d)$',



            color: '#059669',



            expanded: true,



            children: [



              { id: 'ox_4_1', text: 'Tham số qua $M_0(x_0; y_0; z_0)$, VTCP $\\vec{u}=(a; b; c)$:' },



              { id: 'ox_4_2', text: '$\\begin{cases} x = x_0 + at \\\\ y = y_0 + bt \\\\ z = z_0 + ct \\end{cases} (t \\in \\mathbb{R})$' },



              { id: 'ox_4_3', text: 'Chính tắc: $\\frac{x - x_0}{a} = \\frac{y - y_0}{b} = \\frac{z - z_0}{c}$' }



            ]



          }



        ]



      }



    },



    xac_suat_12: {



      name: 'Toán 12 • Xác suất có điều kiện & Bayes',



      desc: 'Công thức xác suất toàn phần và công thức Bayes chương trình mới 2025',



      data: {



        id: 'root',



        text: 'Xác suất có điều kiện & Định lý Bayes',



        color: '#d97706',



        expanded: true,



        children: [



          {



            id: 'xs_1',



            text: '1. Xác suất có điều kiện',



            color: '#0d9488',



            expanded: true,



            children: [



              { id: 'xs_1_1', text: 'Định nghĩa: $P(A|B) = \\frac{P(A \\cap B)}{P(B)}$ với $P(B) > 0$' },



              { id: 'xs_1_2', text: 'Quy tắc nhân: $P(A \\cap B) = P(B) \\cdot P(A|B) = P(A) \\cdot P(B|A)$' },



              { id: 'xs_1_3', text: '$A, B$ độc lập $\\Leftrightarrow P(A \\cap B) = P(A) \\cdot P(B)$' }



            ]



          },



          {



            id: 'xs_2',



            text: '2. Công thức xác suất toàn phần',



            color: '#0284c7',



            expanded: true,



            children: [



              { id: 'xs_2_1', text: 'Hệ biến cố đầy đủ: $A_1, A_2, ..., A_n$ xung khắc từng đôi và $\\bigcup A_i = \\Omega$' },



              { id: 'xs_2_2', text: 'Công thức: $P(B) = \\sum_{i=1}^n P(A_i) \\cdot P(B|A_i)$' }



            ]



          },



          {



            id: 'xs_3',



            text: '3. Công thức Bayes',



            color: '#7c3aed',



            expanded: true,



            children: [



              { id: 'xs_3_1', text: 'Công thức tổng quát: $P(A_k|B) = \\frac{P(A_k) \\cdot P(B|A_k)}{\\sum_{i=1}^n P(A_i) \\cdot P(B|A_i)}$' },



              { id: 'xs_3_2', text: 'Trường hợp 2 biến cố $A$ và $\\bar{A}$: $P(A|B) = \\frac{P(A)P(B|A)}{P(A)P(B|A) + P(\\bar{A})P(B|\\bar{A})}$' }



            ]



          }



        ]



      }



    },



    luong_giac_11: {



      name: 'Toán 11 • Lượng giác & Phương trình lượng giác',



      desc: 'Công thức cộng, nhân đôi, biến đổi và nghiệm cơ bản',



      data: {



        id: 'root',



        text: 'Lượng giác & Phương trình lượng giác',



        color: '#059669',



        expanded: true,



        children: [



          {



            id: 'lg_1',



            text: '1. Công thức biến đổi cơ bản',



            color: '#0d9488',



            expanded: true,



            children: [



              { id: 'lg_1_1', text: '$\\sin^2 x + \\cos^2 x = 1$' },



              { id: 'lg_1_2', text: '$1 + \\tan^2 x = \\frac{1}{\\cos^2 x} \\ (x \\ne \\frac{\\pi}{2} + k\\pi)$' },



              { id: 'lg_1_3', text: '$\\tan x \\cdot \\cot x = 1$' }



            ]



          },



          {



            id: 'lg_2',



            text: '2. Công thức cộng & Nhân đôi',



            color: '#0284c7',



            expanded: true,



            children: [



              { id: 'lg_2_1', text: '$\\sin(a \\pm b) = \\sin a \\cos b \\pm \\cos a \\sin b$' },



              { id: 'lg_2_2', text: '$\\cos(a \\pm b) = \\cos a \\cos b \\mp \\sin a \\sin b$' },



              { id: 'lg_2_3', text: '$\\sin 2a = 2\\sin a \\cos a$' },



              { id: 'lg_2_4', text: '$\\cos 2a = \\cos^2 a - \\sin^2 a = 2\\cos^2 a - 1 = 1 - 2\\sin^2 a$' }



            ]



          },



          {



            id: 'lg_3',



            text: '3. Phương trình lượng giác cơ bản',



            color: '#7c3aed',



            expanded: true,



            children: [



              { id: 'lg_3_1', text: '$\\sin x = \\sin \\alpha \\Leftrightarrow \\begin{cases} x = \\alpha + k2\\pi \\\\ x = \\pi - \\alpha + k2\\pi \\end{cases} (k \\in \\mathbb{Z})$' },



              { id: 'lg_3_2', text: '$\\cos x = \\cos \\alpha \\Leftrightarrow x = \\pm \\alpha + k2\\pi \\ (k \\in \\mathbb{Z})$' },



              { id: 'lg_3_3', text: '$\\tan x = \\tan \\alpha \\Leftrightarrow x = \\alpha + k\\pi \\ (k \\in \\mathbb{Z})$' }



            ]



          }



        ]



      }



    },



    mu_logarit_11: {



      name: 'Toán 11 • Hàm số Mũ & Logarit',



      desc: 'Lũy thừa, logarit, tính chất và phương trình mũ - logarit',



      data: {



        id: 'root',



        text: 'Hàm số Mũ & Logarit',



        color: '#2563eb',



        expanded: true,



        children: [



          {



            id: 'ml_1',



            text: '1. Quy tắc Lũy thừa',



            color: '#0d9488',



            expanded: true,



            children: [



              { id: 'ml_1_1', text: '$a^m \\cdot a^n = a^{m+n}$ và $\\frac{a^m}{a^n} = a^{m-n}$' },



              { id: 'ml_1_2', text: '$(a^m)^n = a^{m \\cdot n}$' },



              { id: 'ml_1_3', text: '$a^{-n} = \\frac{1}{a^n}$ và $a^{\\frac{m}{n}} = \\sqrt[n]{a^m} \\ (a > 0)$' }



            ]



          },



          {



            id: 'ml_2',



            text: '2. Quy tắc Logarit ($0 < a \\ne 1$)',



            color: '#0284c7',



            expanded: true,



            children: [



              { id: 'ml_2_1', text: '$\\log_a(x \\cdot y) = \\log_a x + \\log_a y \\ (x, y > 0)$' },



              { id: 'ml_2_2', text: '$\\log_a(\\frac{x}{y}) = \\log_a x - \\log_a y$' },



              { id: 'ml_2_3', text: '$\\log_a x^\\alpha = \\alpha \\log_a x$' },



              { id: 'ml_2_4', text: 'Đổi cơ số: $\\log_a b = \\frac{\\log_c b}{\\log_c a}$' }



            ]



          },



          {



            id: 'ml_3',



            text: '3. Đạo hàm',



            color: '#7c3aed',



            expanded: true,



            children: [



              { id: 'ml_3_1', text: '$(a^x)\' = a^x \\ln a$ và $(e^x)\' = e^x$' },



              { id: 'ml_3_2', text: '$(\\log_a x)\' = \\frac{1}{x \\ln a}$ và $(\\ln x)\' = \\frac{1}{x}$' }



            ]



          }



        ]



      }



    }



  };







  // 3. ENGINE STATE



  let state = {



    mode: 'closed', // 'closed', 'split', 'full'



    view: 'visual', // 'visual', 'markdown'



    tree: JSON.parse(JSON.stringify(MATH_TEMPLATES.dao_ham_12.data)),



    selectedId: 'root',



    zoom: 1.0,



    pan: { x: 40, y: 120 },



    isDragging: false,



    dragStart: { x: 0, y: 0 },



    editingNodeId: null,



    bounds: null



  };







  // Helper to safely escape HTML



  function escapeHtml(str) {



    if (!str) return '';



    return str



      .replace(/&/g, '&amp;')



      .replace(/</g, '&lt;')



      .replace(/>/g, '&gt;')



      .replace(/"/g, '&quot;');



  }







  // 4. RICH TEXT & KATEX MATH RENDERING



  function renderMathInText(rawText) {



    if (!rawText) return '';







    // If KaTeX is not loaded, return escaped text



    const hasKatex = typeof window.katex !== 'undefined' && typeof window.katex.renderToString === 'function';







    function renderKatexMath(math, isDisplay) {



      if (hasKatex) {



        try {



          return window.katex.renderToString(math.trim(), { displayMode: isDisplay, throwOnError: false });



        } catch (e) {



          return `<code class="math-err">${escapeHtml(math)}</code>`;



        }



      }



      return `<code>${escapeHtml(math)}</code>`;



    }







    let out = '';



    let i = 0;



    const len = rawText.length;







    while (i < len) {



      // 1. Escaped dollar: \$ -> literal $



      if (rawText[i] === '\\' && i + 1 < len && rawText[i + 1] === '$') {



        out += '$';



        i += 2;



        continue;



      }







      // 2. Display math: $$ ... $$ or \[ ... \]



      if (rawText.substr(i, 2) === '$$') {



        const end = rawText.indexOf('$$', i + 2);



        if (end !== -1) {



          const math = rawText.substring(i + 2, end);



          out += renderKatexMath(math, true);



          i = end + 2;



          continue;



        }



      }



      if (rawText.substr(i, 2) === '\\[') {



        const end = rawText.indexOf('\\]', i + 2);



        if (end !== -1) {



          const math = rawText.substring(i + 2, end);



          out += renderKatexMath(math, true);



          i = end + 2;



          continue;



        }



      }







      // 3. Inline math: $ ... $ or \( ... \)



      if (rawText.substr(i, 2) === '\\(') {



        const end = rawText.indexOf('\\)', i + 2);



        if (end !== -1 && !rawText.substring(i + 2, end).includes('\n')) {



          const math = rawText.substring(i + 2, end);



          out += renderKatexMath(math, false);



          i = end + 2;



          continue;



        }



      }



      if (rawText[i] === '$') {



        const end = rawText.indexOf('$', i + 1);



        if (end !== -1 && !rawText.substring(i + 1, end).includes('\n')) {



          const math = rawText.substring(i + 1, end);



          out += renderKatexMath(math, false);



          i = end + 1;



          continue;



        }



      }







      // 4. Markdown Bold: **text**



      if (rawText.substr(i, 2) === '**') {



        const end = rawText.indexOf('**', i + 2);



        if (end !== -1 && !rawText.substring(i + 2, end).includes('\n')) {



          const boldText = rawText.substring(i + 2, end);



          out += `<strong>${renderMathInText(boldText)}</strong>`;



          i = end + 2;



          continue;



        }



      }







      // 5. Markdown Italic: *text* (when not preceded or followed by space)



      if (rawText[i] === '*' && (i === 0 || rawText[i - 1] !== '*') && (i + 1 < len && rawText[i + 1] !== ' ' && rawText[i + 1] !== '*')) {



        const end = rawText.indexOf('*', i + 1);



        if (end !== -1 && !rawText.substring(i + 1, end).includes('\n') && rawText[end - 1] !== ' ') {



          const italicText = rawText.substring(i + 1, end);



          out += `<em>${renderMathInText(italicText)}</em>`;



          i = end + 1;



          continue;



        }



      }







      // 6. Normal character



      if (rawText[i] === '\n') {



        out += '<br>';



      } else if (rawText[i] === '<') {



        out += '&lt;';



      } else if (rawText[i] === '>') {



        out += '&gt;';



      } else if (rawText[i] === '&') {



        out += '&amp;';



      } else {



        out += rawText[i];



      }



      i++;



    }







    return out;



  }







  // 5. TREE RECURSIVE UTILITIES



  function findNode(node, id) {



    if (node.id === id) return node;



    if (node.children) {



      for (let child of node.children) {



        const res = findNode(child, id);



        if (res) return res;



      }



    }



    return null;



  }







  function findParentNode(root, childId) {



    if (!root.children) return null;



    for (let child of root.children) {



      if (child.id === childId) return root;



      const res = findParentNode(child, childId);



      if (res) return res;



    }



    return null;



  }







  function generateUniqueId() {



    return 'node_' + Math.random().toString(36).substring(2, 9);



  }







  // 6. TREE LAYOUT COMPUTATION



  function calculateLayout(rootNode) {



    const H_GAP = 75; // Horizontal gap between levels



    const V_GAP = 26; // Vertical minimum gap between sibling branches







    // Step 1: Measure dimensions of each node element using live DOM KaTeX measurement



    let measureBox = document.getElementById('mm-measure-box');



    if (!measureBox && typeof document !== 'undefined') {



      measureBox = document.createElement('div');



      measureBox.id = 'mm-measure-box';



      measureBox.style.cssText = 'position:fixed; visibility:hidden; pointer-events:none; left:-9999px; top:-9999px; width:max-content; max-width:640px; z-index:-1;';



      document.body.appendChild(measureBox);



    }







    function measureNode(node, level = 0) {



      node.level = level;



      let w = 0, h = 0;







      if (measureBox) {



        const renderedText = renderMathInText(node.text || '');



        const card = document.createElement('div');



        card.className = `mm-node-card level-${level}`;



        card.style.cssText = 'display:inline-block; position:static; width:max-content; max-width:620px; min-width:90px; box-sizing:border-box; visibility:hidden; padding:7px 14px;';



        card.innerHTML = `<div class="mm-node-text">${renderedText}</div>`;



        measureBox.appendChild(card);



        const rect = card.getBoundingClientRect();



        if (rect && rect.width > 20) {



          w = Math.ceil(rect.width) + 12; // Room for collapse badge and borders



          h = Math.ceil(rect.height) + 4;



        }



        measureBox.removeChild(card);



      }







      if (!w) {



        // Fallback if measurement is unavailable (e.g. testing environment without layout)



        const rawText = node.text || '';



        const mathBlocks = rawText.match(/\$\$[\s\S]*?\$\$|\$[^$]*\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\)/g) || [];



        let formulaChars = 0;



        mathBlocks.forEach(b => { formulaChars += Math.max(25, b.length * 0.75); });



        const plainText = rawText.replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\)/g, '');



        const totalEst = plainText.length * 8.5 + formulaChars * 8 + 44;



        w = Math.min(600, Math.max(120, totalEst));



        h = 44 + (rawText.includes('\n') || rawText.includes('\\begin') || rawText.includes('\\frac') ? 34 : 0);



      }







      node.w = Math.max(level === 0 ? 175 : 100, w);



      node.h = Math.max(level === 0 ? 46 : 38, h);







      if (node.children && node.children.length > 0 && node.expanded !== false) {



        let totalChildHeight = 0;



        node.children.forEach((c) => {



          measureNode(c, level + 1);



          totalChildHeight += c.subtreeHeight || c.h;



        });



        totalChildHeight += (node.children.length - 1) * V_GAP;



        node.subtreeHeight = Math.max(node.h, totalChildHeight);



      } else {



        node.subtreeHeight = node.h;



      }



    }







    measureNode(rootNode, 0);







    // Step 2: Assign relative coordinates



    function positionNode(node, x, y) {



      node.x = x;



      node.y = y;







      if (node.children && node.children.length > 0 && node.expanded !== false) {



        let startY = y + node.h / 2 - node.subtreeHeight / 2;



        node.children.forEach((child) => {



          const childH = child.subtreeHeight || child.h;



          const childY = startY + childH / 2 - child.h / 2;



          positionNode(child, x + node.w + H_GAP, childY);



          startY += childH + V_GAP;



        });



      }



    }







    positionNode(rootNode, 60, 0);







    // Step 3: Find bounding box of ALL nodes



    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;



    function findBounds(node) {



      if (node.x < minX) minX = node.x;



      if (node.y < minY) minY = node.y;



      if (node.x + node.w > maxX) maxX = node.x + node.w;



      if (node.y + node.h > maxY) maxY = node.y + node.h;







      if (node.children && node.children.length > 0 && node.expanded !== false) {



        node.children.forEach(findBounds);



      }



    }



    findBounds(rootNode);







    // Step 4: Normalize all coordinates so minY is at least 60px (preventing branch 1 from hiding above)



    const shiftY = 60 - minY;



    const shiftX = 60 - minX;







    function applyShift(node) {



      node.x += shiftX;



      node.y += shiftY;



      if (node.children && node.children.length > 0 && node.expanded !== false) {



        node.children.forEach(applyShift);



      }



    }



    applyShift(rootNode);







    state.bounds = {



      minX: 60,



      minY: 60,



      maxX: maxX + shiftX,



      maxY: maxY + shiftY,



      width: Math.max(100, maxX - minX),



      height: Math.max(100, maxY - minY)



    };



  }







  // 7. RENDER VISUAL SVG & HTML CARDS



  function renderMindMap() {



    const svgWrap = document.getElementById('mindmap-svg-wrap');



    if (!svgWrap) return;







    calculateLayout(state.tree);







    // Build SVG curves and nodes



    let pathsHtml = '';



    let nodesHtml = '';







    function traverse(node) {



      // Color fallback



      const nodeColor = node.color || (node.level === 1 ? THEME_COLORS[Math.abs(node.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % THEME_COLORS.length] : '#0d9488');







      // Draw branch curve to each visible child



      if (node.children && node.children.length > 0 && node.expanded !== false) {



        node.children.forEach((child) => {



          const startX = node.x + node.w;



          const startY = node.y + node.h / 2;



          const endX = child.x;



          const endY = child.y + child.h / 2;



          const ctrlX1 = startX + (endX - startX) * 0.45;



          const ctrlX2 = endX - (endX - startX) * 0.45;







          const childColor = child.color || nodeColor;



          pathsHtml += `



            <path d="M ${startX} ${startY} C ${ctrlX1} ${startY}, ${ctrlX2} ${endY}, ${endX} ${endY}"



                  fill="none" stroke="${childColor}" stroke-width="2.2" stroke-linecap="round" opacity="0.85" />



          `;



          traverse(child);



        });



      }







      // Render node card



      const isSelected = state.selectedId === node.id;



      const hasChildren = node.children && node.children.length > 0;



      const isCollapsed = hasChildren && node.expanded === false;



      const childCount = hasChildren ? node.children.length : 0;







      const renderedText = renderMathInText(node.text);







      nodesHtml += `



        <div class="mm-node-card level-${node.level} ${isSelected ? 'selected' : ''}"



             id="mm-card-${node.id}"



             style="position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${node.w}px; min-height: ${node.h}px; box-sizing: border-box; --node-color: ${nodeColor};"



             onclick="window.selectMindMapNode('${node.id}', event)"



             ondblclick="window.openMathEditor('${node.id}', event)">



          



          <div class="mm-node-actions">



            <button class="mm-action-btn" onclick="window.addChildNode('${node.id}', event)" title="Thêm nhánh con (Tab)">+ Con</button>



            <button class="mm-action-btn" onclick="window.addSiblingNode('${node.id}', event)" title="Thêm cùng cấp (Enter)">+ Cùng cấp</button>



            <button class="mm-action-btn" onclick="window.openMathEditor('${node.id}', event)" title="Sửa nội dung &amp; công thức">✏ Sửa</button>



            <button class="mm-action-btn" onclick="window.toggleColorPalette('${node.id}', event)" title="Đổi màu nhánh">🎨 Màu</button>



            ${node.id !== 'root' ? `<button class="mm-action-btn btn-del" onclick="window.deleteNode('${node.id}', event)" title="Xóa nhánh">🗑 Xóa</button>` : ''}



          </div>







          <div class="mm-color-palette" id="mm-palette-${node.id}">



            ${THEME_COLORS.map(c => `<div class="mm-color-dot" style="background:${c};" onclick="window.setNodeColor('${node.id}', '${c}', event)"></div>`).join('')}



          </div>







          <div class="mm-node-text">${renderedText}</div>







          ${hasChildren ? `



            <div class="mm-collapse-badge" onclick="window.toggleNodeExpand('${node.id}', event)" title="${isCollapsed ? 'Mở rộng nhánh' : 'Thu gọn nhánh'}">



              ${isCollapsed ? `+${childCount}` : '−'}



            </div>



          ` : ''}



        </div>



      `;



    }







    traverse(state.tree);







    svgWrap.innerHTML = `



      <div id="mindmap-viewport" style="transform: translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom}); transform-origin: 0 0; width: 100%; height: 100%; position: absolute; top:0; left:0;">



        <svg style="position: absolute; top:0; left:0; width: 4000px; height: 4000px; pointer-events: none;">



          ${pathsHtml}



        </svg>



        <div style="position: absolute; top:0; left:0; width: 4000px; height: 4000px;">



          ${nodesHtml}



        </div>



      </div>



    `;







    // Update zoom label



    const zoomLabel = document.getElementById('mindmap-zoom-label');



    if (zoomLabel) {



      zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;



    }



  }







  // 8. INTERACTIVE NODE OPERATIONS



  window.selectMindMapNode = function (id, e) {



    if (e) e.stopPropagation();



    state.selectedId = id;



    renderMindMap();



  };







  window.addChildNode = function (parentId, e) {



    if (e) e.stopPropagation();



    const parent = findNode(state.tree, parentId || state.selectedId || 'root');



    if (!parent) return;







    if (!parent.children) parent.children = [];



    parent.expanded = true;







    const newId = generateUniqueId();



    parent.children.push({



      id: newId,



      text: 'Nhánh con mới: $f(x)$',



      color: parent.color,



      expanded: true



    });







    state.selectedId = newId;



    renderMindMap();



    window.openMathEditor(newId);



  };







  window.addSiblingNode = function (siblingId, e) {



    if (e) e.stopPropagation();



    const targetId = siblingId || state.selectedId;



    if (targetId === 'root') {



      window.addChildNode('root');



      return;



    }







    const parent = findParentNode(state.tree, targetId);



    if (!parent) return;







    const newId = generateUniqueId();



    const idx = parent.children.findIndex(c => c.id === targetId);



    const siblingColor = parent.children[idx]?.color || parent.color;







    parent.children.splice(idx + 1, 0, {



      id: newId,



      text: 'Ý kiến thức mới',



      color: siblingColor,



      expanded: true



    });







    state.selectedId = newId;



    renderMindMap();



    window.openMathEditor(newId);



  };







  window.deleteNode = function (id, e) {



    if (e) e.stopPropagation();



    const targetId = id || state.selectedId;



    if (targetId === 'root' || !targetId) {



      window.showToast('Không thể xóa nút gốc trung tâm! Hãy chọn nhánh con để xóa.', 'warning');



      return;



    }







    const parent = findParentNode(state.tree, targetId);



    if (!parent) return;







    parent.children = parent.children.filter(c => c.id !== targetId);



    state.selectedId = parent.id;



    renderMindMap();



    window.showToast('Đã xóa nhánh thành công!', 'info');



  };







  window.toggleNodeExpand = function (id, e) {



    if (e) e.stopPropagation();



    const node = findNode(state.tree, id);



    if (!node) return;



    node.expanded = !node.expanded;



    renderMindMap();



  };







  window.toggleColorPalette = function (id, e) {



    if (e) e.stopPropagation();



    const palette = document.getElementById(`mm-palette-${id}`);



    if (palette) {



      palette.classList.toggle('open');



    }



  };







  window.setNodeColor = function (id, color, e) {



    if (e) e.stopPropagation();



    const node = findNode(state.tree, id);



    if (!node) return;



    node.color = color;



    // Propagate color to children that don't have individual colors



    if (node.children) {



      node.children.forEach(c => c.color = color);



    }



    renderMindMap();



  };







  // 9. MATH FORMULA EDITOR MODAL



  window.openMathEditor = function (id, e) {



    if (e) e.stopPropagation();



    const targetId = id || state.selectedId || 'root';



    const node = findNode(state.tree, targetId);



    if (!node) return;







    state.editingNodeId = targetId;







    const modal = document.getElementById('mindmap-math-modal');



    const textarea = document.getElementById('mm-math-input');



    const preview = document.getElementById('mm-math-preview-box');







    if (modal && textarea) {



      textarea.value = node.text || '';



      updateMathEditorPreview(node.text || '');



      modal.style.display = 'flex';



      setTimeout(() => {



        textarea.focus();



        textarea.select();



      }, 50);



    }



  };







  window.closeMathEditor = function () {



    const modal = document.getElementById('mindmap-math-modal');



    if (modal) modal.style.display = 'none';



    state.editingNodeId = null;



  };







  window.saveMathEditor = function () {



    const textarea = document.getElementById('mm-math-input');



    if (textarea && state.editingNodeId) {



      const node = findNode(state.tree, state.editingNodeId);



      if (node) {



        node.text = textarea.value.trim() || 'Nội dung';



        renderMindMap();



      }



    }



    window.closeMathEditor();



  };







  function updateMathEditorPreview(text) {



    const preview = document.getElementById('mm-math-preview-box');



    if (preview) {



      preview.innerHTML = renderMathInText(text || '(Chưa có nội dung)');



    }



  }







  window.insertFormulaToEditor = function (latexSnippet) {



    const textarea = document.getElementById('mm-math-input');



    if (!textarea) return;







    const start = textarea.selectionStart;



    const end = textarea.selectionEnd;



    const oldVal = textarea.value;







    const wrappedSnippet = latexSnippet.startsWith('$') ? latexSnippet : `$${latexSnippet}$`;



    textarea.value = oldVal.substring(0, start) + wrappedSnippet + oldVal.substring(end);







    textarea.focus();



    textarea.selectionStart = textarea.selectionEnd = start + wrappedSnippet.length;



    updateMathEditorPreview(textarea.value);



  };







  // 10. MARKDOWN DUAL-SYNC UTILITIES



  function treeToMarkdown(node, level = 0) {



    let md = '';



    const indent = '  '.repeat(level);



    if (level === 0) {



      md += `# ${node.text}\n\n`;



    } else if (level === 1) {



      md += `## ${node.text}\n`;



    } else {



      md += `${indent}- ${node.text}\n`;



    }







    if (node.children) {



      node.children.forEach(c => {



        md += treeToMarkdown(c, level + 1);



      });



    }



    return md;



  }







  function markdownToTree(mdText) {



    const lines = mdText.split('\n');



    let root = null;



    let stack = [];







    lines.forEach(line => {



      const trimmed = line.trim();



      if (!trimmed) return;







      let level = 0;



      let text = '';







      if (trimmed.startsWith('# ')) {



        level = 0;



        text = trimmed.substring(2).trim();



      } else if (trimmed.startsWith('## ')) {



        level = 1;



        text = trimmed.substring(3).trim();



      } else if (trimmed.startsWith('### ')) {



        level = 2;



        text = trimmed.substring(4).trim();



      } else if (line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/)) {



        const m = line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/);



        const spaces = m[1].replace(/\t/g, '  ').length;



        level = 2 + Math.floor(spaces / 2);



        text = m[2].trim();



      } else {



        return;



      }







      const newNode = {



        id: generateUniqueId(),



        text: text,



        color: level === 1 ? THEME_COLORS[stack.length % THEME_COLORS.length] : undefined,



        expanded: true,



        children: []



      };







      if (!root || level === 0) {



        root = newNode;



        root.id = 'root';



        root.color = '#0d9488';



        stack = [root];



      } else {



        while (stack.length > level) {



          stack.pop();



        }



        const parent = stack[stack.length - 1];



        if (parent) {



          if (!parent.children) parent.children = [];



          if (!newNode.color) newNode.color = parent.color;



          parent.children.push(newNode);



          stack.push(newNode);



        }



      }



    });







    return root || state.tree;



  }







  window.toggleMarkdownView = function () {



    const canvasArea = document.getElementById('mindmap-canvas-area');



    const mdArea = document.getElementById('mindmap-markdown-area');



    const btnToggle = document.getElementById('btn-toggle-md');







    if (state.view === 'visual') {



      state.view = 'markdown';



      const mdEditor = document.getElementById('mm-markdown-input');



      if (mdEditor) {



        mdEditor.value = treeToMarkdown(state.tree);



      }



      if (canvasArea) canvasArea.style.display = 'none';



      if (mdArea) mdArea.classList.add('active');



      if (btnToggle) btnToggle.textContent = '🖼 Xem Đồ Họa';



    } else {



      state.view = 'visual';



      const mdEditor = document.getElementById('mm-markdown-input');



      if (mdEditor && mdEditor.value.trim()) {



        state.tree = markdownToTree(mdEditor.value);



        state.selectedId = 'root';



      }



      if (canvasArea) canvasArea.style.display = 'block';



      if (mdArea) mdArea.classList.remove('active');



      if (btnToggle) btnToggle.textContent = '📝 Dàn ý Markdown';



      renderMindMap();



    }



  };







  window.applyMarkdownToTree = function () {



    const mdEditor = document.getElementById('mm-markdown-input');



    if (mdEditor && mdEditor.value.trim()) {



      state.tree = markdownToTree(mdEditor.value);



      state.selectedId = 'root';



      window.toggleMarkdownView();



    }



  };







  // 11. AI MINDMAP ASSISTANT



  window.updateAiProviderBadge = function (info) {



    const badge = document.getElementById('mm-ai-provider-text');



    if (badge && info) {



      badge.textContent = `Provider hiện tại: ${info}`;



    }



  };







  window.openAiMindmapModal = function () {



    const modal = document.getElementById('mindmap-ai-modal');



    if (modal) modal.style.display = 'flex';



    if (window.__meaAiProviderInfo) {



      window.updateAiProviderBadge(window.__meaAiProviderInfo);



    }



  };







  window.closeAiMindmapModal = function () {



    const modal = document.getElementById('mindmap-ai-modal');



    if (modal) modal.style.display = 'none';



  };







  window.generateAiMindmap = async function () {



    const input = document.getElementById('mm-ai-topic-input');



    const topic = input ? input.value.trim() : '';



    if (!topic) {



      if (window.meaAlert) window.meaAlert('Vui lòng nhập chủ đề hoặc bài học cần tạo sơ đồ tư duy!'); else window.showToast('Vui lòng nhập chủ đề hoặc bài học cần tạo sơ đồ tư duy!', 'warning');



      return;



    }







    const btnGen = document.getElementById('btn-exec-ai-gen');



    if (btnGen) {



      btnGen.disabled = true;



      btnGen.innerHTML = `<span>⏳ AI đang tư duy &amp; phân nhánh...</span>`;



    }







    // 1. Nếu đang chạy trong Desktop C# WebView2, điều phối qua DesktopGeminiFactory



    if (window.chrome && window.chrome.webview) {



      window.chrome.webview.postMessage({



        type: 'GENERATE_AI_MINDMAP',



        topic: topic



      });



      return;



    }







    // 2. Chế độ Standalone trên web (Fallback)



    try {



      let generatedMd = null;



      try {



        const res = await fetch('http://127.0.0.1:20128/v1/chat/completions', {



          method: 'POST',



          headers: { 'Content-Type': 'application/json' },



          body: JSON.stringify({



            model: 'ag/gemini-3.8-flash-high',



            messages: [



              {



                role: 'system',



                content: 'Bạn là chuyên gia sư phạm Toán học THPT. Hãy tạo dàn ý sơ đồ tư duy (Mindmap) chuẩn khoa học, ngắn gọn, súc tích cho bài học được yêu cầu. BẮT BUỘC sử dụng công thức toán học LaTeX kẹp trong dấu $...$ cho các công thức, định lý, điều kiện. Định dạng thuần Markdown: Tiêu đề gốc #, nhánh chính ##, nhánh con -.'



              },



              {



                role: 'user',



                content: `Hãy lập sơ đồ tư duy toán học cho chủ đề: ${topic}`



              }



            ],



            temperature: 0.3



          })



        });



        if (res.ok) {



          const json = await res.json();



          generatedMd = json.choices?.[0]?.message?.content;



        }



      } catch (err) {



        console.log('[Mindmap] Local AI fallback:', err);



      }







      if (!generatedMd) {



        generatedMd = buildSmartCurriculumFallback(topic);



      }







      window.onAiMindmapGenerated(generatedMd);



    } catch (ex) {



      window.onAiMindmapError(ex.message);



    }



  };







  window.onAiMindmapGenerated = function (markdownText) {



    const btnGen = document.getElementById('btn-exec-ai-gen');



    if (btnGen) {



      btnGen.disabled = false;



      btnGen.innerHTML = `✨ Tạo sơ đồ ngay`;



    }



    if (!markdownText || !markdownText.trim()) {



      window.showToast('AI không trả về nội dung sơ đồ tư duy hợp lệ!', 'warning');



      return;



    }



    state.tree = markdownToTree(markdownText.trim());



    state.selectedId = 'root';



    renderMindMap();



    window.fitMindMapView();



    window.closeAiMindmapModal();



    window.showToast('Đã tạo sơ đồ tư duy bằng AI thành công!', 'success');



  };







  window.onAiMindmapError = function (errorMessage) {



    const btnGen = document.getElementById('btn-exec-ai-gen');



    if (btnGen) {



      btnGen.disabled = false;



      btnGen.innerHTML = `✨ Tạo sơ đồ ngay`;



    }



    const cleanMsg = errorMessage || 'Lỗi khi gọi AI tạo sơ đồ.';



    window.showToast(cleanMsg, 'error');



    if (window.meaAlert) window.meaAlert(cleanMsg);



  };







  function buildSmartCurriculumFallback(topic) {



    const lower = topic.toLowerCase();



    if (lower.includes('hàm') || lower.includes('đạo hàm')) {



      return treeToMarkdown(MATH_TEMPLATES.dao_ham_12.data);



    } else if (lower.includes('tích phân') || lower.includes('nguyên hàm')) {



      return treeToMarkdown(MATH_TEMPLATES.tich_phan_12.data);



    } else if (lower.includes('oxyz') || lower.includes('không gian') || lower.includes('tọa độ')) {



      return treeToMarkdown(MATH_TEMPLATES.hinh_oxyz_12.data);



    } else if (lower.includes('xác suất') || lower.includes('bayes')) {



      return treeToMarkdown(MATH_TEMPLATES.xac_suat_12.data);



    } else if (lower.includes('lượng giác') || lower.includes('sin') || lower.includes('cos')) {



      return treeToMarkdown(MATH_TEMPLATES.luong_giac_11.data);



    } else if (lower.includes('mũ') || lower.includes('log')) {



      return treeToMarkdown(MATH_TEMPLATES.mu_logarit_11.data);



    } else {



      return `# ${topic}



## 1. Khái niệm & Định nghĩa



- Khái niệm cơ bản: $x \\in \\mathbb{R}$



- Điều kiện xác định: $D = \\mathbb{R} \\setminus \\{0\\}$



## 2. Công thức & Tính chất cốt lõi



- Công thức trọng tâm: $f(x) = ax^2 + bx + c$



- Mối liên hệ: $a^2 + b^2 = c^2$



## 3. Các dạng toán thường gặp



- Dạng 1: Nhận biết & Thông hiểu



- Dạng 2: Vận dụng giải phương trình $f(x) = 0$



- Dạng 3: Bài toán thực tế liên môn



## 4. Lưu ý & Sai lầm cần tránh



- Đặt điều kiện có nghĩa trước khi giải



- Kiểm tra lại nghiệm thỏa mãn điều kiện`;



    }



  }







  // 12. TEMPLATE GALLERY MODAL



  window.openTemplatesModal = function () {



    const modal = document.getElementById('mindmap-templates-modal');



    if (modal) modal.style.display = 'flex';



  };







  window.closeTemplatesModal = function () {



    const modal = document.getElementById('mindmap-templates-modal');



    if (modal) modal.style.display = 'none';



  };







  window.loadMathTemplate = function (key) {



    if (MATH_TEMPLATES[key]) {



      state.tree = JSON.parse(JSON.stringify(MATH_TEMPLATES[key].data));



      state.selectedId = 'root';



      renderMindMap();



      window.fitMindMapView();



      window.closeTemplatesModal();



    }



  };







  // 13. EXPORT & INTEGRATION WITH WHITEBOARD / WORD



  window.generateMindmapSvg = function () {



    const viewport = document.getElementById('mindmap-viewport');



    if (!viewport) return null;







    calculateLayout(state.tree);







    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;



    function getBounds(node) {



      if (!node) return;



      if (typeof node.x === 'number' && node.x < minX) minX = node.x;



      if (typeof node.y === 'number' && node.y < minY) minY = node.y;



      if (typeof node.x === 'number' && node.x + (node.w || 120) > maxX) maxX = node.x + (node.w || 120);



      if (typeof node.y === 'number' && node.y + (node.h || 40) > maxY) maxY = node.y + (node.h || 40);



      if (node.children && node.expanded !== false) {



        node.children.forEach(getBounds);



      }



    }



    getBounds(state.tree);







    if (!isFinite(minX) || !isFinite(minY)) {



      minX = 0; minY = 0; maxX = 800; maxY = 600;



    }







    const pad = 40;



    const width = Math.max(400, (maxX - minX) + pad * 2);



    const height = Math.max(300, (maxY - minY) + pad * 2);







    const svgClone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');



    svgClone.setAttribute('width', width);



    svgClone.setAttribute('height', height);



    svgClone.setAttribute('viewBox', `${minX - pad} ${minY - pad} ${width} ${height}`);



    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');







    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');



    bgRect.setAttribute('x', minX - pad);



    bgRect.setAttribute('y', minY - pad);



    bgRect.setAttribute('width', width);



    bgRect.setAttribute('height', height);



    bgRect.setAttribute('fill', 'none');



    svgClone.appendChild(bgRect);







    const svgPaths = viewport.querySelector('svg')?.cloneNode(true);



    if (svgPaths) {



      while (svgPaths.firstChild) {



        svgClone.appendChild(svgPaths.firstChild);



      }



    }







    // Native vector fallback for SVG viewers / Office converters that ignore <foreignObject>



    const cards = viewport.querySelectorAll('.mm-node-card');



    const nativeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');



    nativeGroup.setAttribute('class', 'mm-native-fallback');



    cards.forEach(c => {



      const curLeft = parseFloat(c.style.left || '0');



      const curTop = parseFloat(c.style.top || '0');



      const curW = c.offsetWidth || 140;



      const curH = c.offsetHeight || 42;



      const isRoot = c.classList.contains('root-node');



      const textElem = c.querySelector('.mm-node-title') || c.querySelector('.mm-node-content') || c;



      const rawText = (textElem.innerText || textElem.textContent || '').trim();







      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');



      rect.setAttribute('x', curLeft);



      rect.setAttribute('y', curTop);



      rect.setAttribute('width', curW);



      rect.setAttribute('height', curH);



      rect.setAttribute('rx', isRoot ? '12' : '8');



      rect.setAttribute('ry', isRoot ? '12' : '8');



      rect.setAttribute('fill', isRoot ? '#0d9488' : '#ffffff');



      rect.setAttribute('stroke', isRoot ? '#0f766e' : '#cbd5e1');



      rect.setAttribute('stroke-width', isRoot ? '2.5' : '1.5');



      nativeGroup.appendChild(rect);







      if (rawText) {



        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');



        text.setAttribute('x', curLeft + curW / 2);



        text.setAttribute('y', curTop + curH / 2 + 5);



        text.setAttribute('text-anchor', 'middle');



        text.setAttribute('fill', isRoot ? '#ffffff' : '#1e293b');



        text.setAttribute('font-size', isRoot ? '14' : '12');



        text.setAttribute('font-weight', isRoot ? 'bold' : 'normal');



        text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');



        text.textContent = rawText.length > 40 ? rawText.substring(0, 37) + '...' : rawText;



        nativeGroup.appendChild(text);



      }



    });



    svgClone.appendChild(nativeGroup);







    const foreign = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');



    foreign.setAttribute('x', minX - pad);



    foreign.setAttribute('y', minY - pad);



    foreign.setAttribute('width', width);



    foreign.setAttribute('height', height);







    const container = document.createElement('div');



    container.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');



    container.style.position = 'relative';



    container.style.width = width + 'px';



    container.style.height = height + 'px';







    cards.forEach(c => {



      const clone = c.cloneNode(true);



      clone.querySelector('.mm-node-actions')?.remove();



      clone.querySelector('.mm-color-palette')?.remove();



      clone.classList.remove('selected');



      const curLeft = parseFloat(clone.style.left || '0');



      const curTop = parseFloat(clone.style.top || '0');



      clone.style.left = (curLeft - (minX - pad)) + 'px';



      clone.style.top = (curTop - (minY - pad)) + 'px';



      container.appendChild(clone);



    });







    const styleElem = document.createElementNS('http://www.w3.org/2000/svg', 'style');



    let collectedCss = `



      .katex-mathml { display: none !important; }



      .mm-node-card {



        box-sizing: border-box !important;



        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;



      }



    `;



    try {



      for (let s = 0; s < document.styleSheets.length; s++) {



        const sheet = document.styleSheets[s];



        try {



          const rules = sheet.cssRules || sheet.rules;



          if (rules) {



            for (let r = 0; r < rules.length; r++) {



              collectedCss += rules[r].cssText + '\n';



            }



          }



        } catch (_) {}



      }



    } catch (_) {}



    styleElem.textContent = collectedCss;



    svgClone.appendChild(styleElem);







    foreign.appendChild(container);



    svgClone.appendChild(foreign);







    return new XMLSerializer().serializeToString(svgClone);



  };







  window.exportMindmapAsPng = async function (callback) {

    const svgString = window.generateMindmapSvg();

    if (!svgString) {

      if (callback) callback(null, null);

      return;

    }



    const parser = new DOMParser();

    const doc = parser.parseFromString(svgString, 'image/svg+xml');

    const svgEl = doc.querySelector('svg');

    const svgW = parseInt(svgEl ? svgEl.getAttribute('width') : '800', 10) || 800;

    const svgH = parseInt(svgEl ? svgEl.getAttribute('height') : '600', 10) || 600;



    const scale = 2;

    const canvas = document.createElement('canvas');

    canvas.width = Math.round(svgW * scale);

    canvas.height = Math.round(svgH * scale);



    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

    const URL = window.URL || window.webkitURL || window;

    const blobURL = URL.createObjectURL(svgBlob);



    const img = new Image();

    img.onload = function () {

      try {

        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';

        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        URL.revokeObjectURL(blobURL);

        const pngData = canvas.toDataURL('image/png');

        if (callback) callback(pngData, svgString);

      } catch (e) {

        console.warn('[Mindmap] Canvas export error:', e);

        URL.revokeObjectURL(blobURL);

        if (callback) callback(null, svgString);

      }

    };

    img.onerror = function (err) {

      console.warn('[Mindmap] SVG image render error:', err);

      URL.revokeObjectURL(blobURL);

      if (callback) callback(null, svgString);

    };

    img.src = blobURL;

  };







  window.showToast = function (message, type = 'info') {



    let container = document.getElementById('mea-toast-container');



    if (!container) {



      container = document.createElement('div');



      container.id = 'mea-toast-container';



      container.className = 'mea-toast-container';



      document.body.appendChild(container);



    }



    container.innerHTML = ''; // Prevent stacked duplicate toasts



    const toast = document.createElement('div');



    toast.className = `mea-toast ${type}`;



    toast.innerHTML = message;



    container.appendChild(toast);



    setTimeout(() => {



      toast.classList.add('hide');



      setTimeout(() => toast.remove(), 300);



    }, 3200);



  };







  function getMindmapScreenRect() {



    const canvasArea = document.getElementById('mindmap-canvas-area');



    if (!canvasArea) {



      return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight, viewWidth: window.innerWidth, viewHeight: window.innerHeight };



    }







    const cards = canvasArea.querySelectorAll('.mm-node-card');



    if (!cards || cards.length === 0) {



      return {



        x: 0,



        y: 0,



        width: window.innerWidth,



        height: window.innerHeight,



        viewWidth: window.innerWidth,



        viewHeight: window.innerHeight



      };



    }







    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;



    cards.forEach(card => {



      const r = card.getBoundingClientRect();



      if (r.left < minX) minX = r.left;



      if (r.top < minY) minY = r.top;



      if (r.right > maxX) maxX = r.right;



      if (r.bottom > maxY) maxY = r.bottom;



    });







    const svgElem = canvasArea.querySelector('svg');



    if (svgElem) {



      const paths = svgElem.querySelectorAll('path');



      paths.forEach(p => {



        try {



          const r = p.getBoundingClientRect();



          if (r.width > 0 && r.height > 0) {



            if (r.left < minX) minX = r.left;



            if (r.top < minY) minY = r.top;



            if (r.right > maxX) maxX = r.right;



            if (r.bottom > maxY) maxY = r.bottom;



          }



        } catch (_) {}



      });



    }







    const pad = 24;



    const cropLeft = Math.max(0, Math.floor(minX - pad));



    const cropTop = Math.max(0, Math.floor(minY - pad));



    const cropRight = Math.ceil(maxX + pad);



    const cropBottom = Math.ceil(maxY + pad);







    return {



      x: cropLeft,



      y: cropTop,



      width: Math.max(120, cropRight - cropLeft),



      height: Math.max(80, cropBottom - cropTop),



      viewWidth: window.innerWidth,



      viewHeight: window.innerHeight



    };



  }







  let _isCapturingMindmap = false;

  window.__capturingPrevSelected = null;



  window.restoreAfterMindmapCapture = function () {

    document.documentElement.classList.remove('mindmap-capturing');

    document.body.classList.remove('mindmap-capturing');

    const container = document.getElementById('mea-mindmap-container');

    if (container) {

      container.classList.remove('mindmap-clean-export', 'mindmap-capturing');

    }

    if (window.__capturingPrevSelected !== null) {

      state.selectedId = window.__capturingPrevSelected;

      window.__capturingPrevSelected = null;

    }

    renderMindMap();

  };



  window.captureAndHandleMindmap = function (action) {
    if (_isCapturingMindmap) return;
    if (state.mode === 'closed') {
      window.showToast('Vui lòng mở Sơ đồ tư duy trước khi thực hiện!', 'warning');
      return;
    }
    _isCapturingMindmap = true;
    setTimeout(() => { _isCapturingMindmap = false; }, 3000);

    window.scrollTo(0, 0);
    if (document.documentElement) { document.documentElement.scrollLeft = 0; document.documentElement.scrollTop = 0; }
    if (document.body) { document.body.scrollLeft = 0; document.body.scrollTop = 0; }

    window.__capturingPrevSelected = state.selectedId;
    state.selectedId = null;
    renderMindMap();

    const container = document.getElementById('mea-mindmap-container');
    if (container) {
      container.classList.add('mindmap-clean-export', 'mindmap-capturing');
    }
    document.documentElement.classList.add('mindmap-capturing');
    document.body.classList.add('mindmap-capturing');

    setTimeout(() => {
      const rectData = getMindmapScreenRect();
      let captured = false;
      window.__onMindmapCapturedSuccess = function() {
        captured = true;
      };

      if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage({
          type: 'CAPTURE_MINDMAP',
          action: action,
          rect: {
            x: rectData.x,
            y: rectData.y,
            width: rectData.width,
            height: rectData.height
          },
          treeData: JSON.stringify(state.tree),
          viewWidth: rectData.viewWidth,
          viewHeight: rectData.viewHeight
        });

        setTimeout(() => {
          if (!captured && document.documentElement.classList.contains('mindmap-capturing')) {
            window.exportMindmapAsPng(async (pngData) => {
              window.restoreAfterMindmapCapture();
              if (!pngData) {
                window.showToast('Không thể kết xuất ảnh sơ đồ tư duy!', 'error');
                return;
              }
              if (action === 'insert_board' || !action) {
                await window.finishInsertMindmapToBoard(pngData);
              } else if (action === 'copy_word') {
                window.copyImageToClipboard(pngData);
              }
            });
          }
        }, 400);
      } else {
        window.exportMindmapAsPng(async (pngData) => {
          window.restoreAfterMindmapCapture();
          if (!pngData) {
            window.showToast('Không thể kết xuất ảnh sơ đồ tư duy!', 'error');
            return;
          }
          if (action === 'insert_board' || !action) {
            await window.finishInsertMindmapToBoard(pngData);
          } else if (action === 'copy_word') {
            window.copyImageToClipboard(pngData);
          }
        });
      }
    }, 80);
  };

  window.setMindmapTree = function (treeData, editingContext = null) {



    if (!treeData) return;



    try {



      state.tree = typeof treeData === 'string' ? JSON.parse(treeData) : JSON.parse(JSON.stringify(treeData));



      state.selectedId = 'root';



      if (editingContext) {



        state.editingBoardItem = editingContext;



      }



      renderMindMap();



      window.fitMindMapView();



    } catch (e) {



      console.warn('[Mindmap] Error setting tree:', e);



    }



  };







  window.openMindMapStudioWithTree = function (treeData, editingContext = null) {



    window.setMindmapTree(treeData, editingContext);



    window.setMindMapMode('full');



    window.showToast('Đã tải Sơ đồ tư duy để chỉnh sửa! Sau khi chỉnh sửa, bấm "Chèn Bảng vẽ" để cập nhật trực tiếp.', 'success');



  };







  window.editActiveMindmap = function () {



    const board = (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard;



    if (board && board.sel && board.sel.items && board.sel.items.size > 0) {



      const page = board.doc.pages[board.sel.page];



      const item = page && page.items ? page.items.find(x => board.sel.items.has(x.id)) : null;



      if (item && item.meaMindmap) {



        window.openMindMapStudioWithTree(item.meaMindmap, { id: item.id, page: board.sel.page });



        return;



      }



    }



    if (window.__lastInsertedMindmapTree) {



      window.openMindMapStudioWithTree(window.__lastInsertedMindmapTree);



    } else {

      window.setMindMapMode('full');

    }



  };







  window.__meaInsertImage = async function (dataUri, meta) {



    const board = (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard;



    if (!board) return false;



    try {



      const img = new Image();



      img.src = dataUri;



      await img.decode();



      const pageIdx = (board.sel && board.sel.page >= 0) ? board.sel.page : 0;



      const pw = board.doc ? (board.doc.landscape ? 1754 : 1240) : 1240;



      const ph = typeof board.phOf === 'function' ? board.phOf(pageIdx) : 1754;



      const maxW = Math.min(760, pw - 80);



      const maxH = Math.min(840, ph - 80);



      const r = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);



      const curW = Math.max(120, Math.round(img.naturalWidth * r));



      const curH = Math.max(80, Math.round(img.naturalHeight * r));



      const newX = Math.round(Math.max(40, (pw - curW) / 2));



      const newY = Math.round(Math.max(40, (ph - curH) / 2));



      const newItem = {



        id: 'mm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),



        type: 'image',



        src: dataUri,



        x: newX,



        y: newY,



        w: curW,



        h: curH,



        meaMindmap: meta



      };



      if (typeof board.insertItem === 'function') {

        board.insertItem(newItem);

        if (typeof board.redraw === 'function') board.redraw();

      } else if (typeof board.insertImage === 'function') {

        await board.insertImage(dataUri, { w: curW, h: curH });

      } else if (board.doc && board.doc.pages && board.doc.pages[pageIdx]) {

        board.commit(board.updatePage(pageIdx, p => ({

          ...p,

          items: [...(p.items || []), newItem]

        })));

        board.sel = { page: pageIdx, strokes: new Set(), items: new Set([newItem.id]) };

        if (typeof board.redraw === 'function') board.redraw();

      }



      return true;



    } catch (e) {



      console.warn('[Mindmap] __meaInsertImage error:', e);



      return false;



    }



  };







      const onCapturedMessage = function (e) {
    try {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (data && data.type === 'MINDMAP_CAPTURED' && data.dataUri) {
        if (typeof window.__onMindmapCapturedSuccess === 'function') {
          window.__onMindmapCapturedSuccess();
        }
        window.restoreAfterMindmapCapture();
        if (data.action === 'insert_board' || !data.action) {
          window.finishInsertMindmapToBoard(data.dataUri);
        } else if (data.action === 'copy_word') {
          window.copyImageToClipboard(data.dataUri);
        }
      }
    } catch (_) {}
  };
  if (window.chrome && window.chrome.webview && window.chrome.webview.addEventListener) {
    window.chrome.webview.addEventListener('message', onCapturedMessage);
  }
  window.addEventListener('message', onCapturedMessage);

  window.finishInsertMindmapToBoard = async function (dataUri) {



    // 1. Reset any window/document scroll offset first



    window.scrollTo(0, 0);



    if (document.documentElement) { document.documentElement.scrollLeft = 0; document.documentElement.scrollTop = 0; }



    if (document.body) { document.body.scrollLeft = 0; document.body.scrollTop = 0; }







    const currentTree = JSON.parse(JSON.stringify(state.tree));



    window.__lastInsertedMindmapTree = currentTree;







    // 2. Automatically close Mindmap Studio FIRST so 100% full screen canvas is restored



    if (typeof window.setMindMapMode === 'function') {



      window.setMindMapMode('closed');



    }







    // 3. Wait for DOM reflow so NoteRenderer scroller clientWidth updates to full width



    await new Promise(r => setTimeout(r, 60));



    window.dispatchEvent(new Event('resize'));







    let inserted = false;



    const board = (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard;







    // Check if we are updating an existing mindmap item on the board



    if (state.editingBoardItem && board && board.doc && board.doc.pages && board.doc.pages[state.editingBoardItem.page]) {



      const pageIdx = state.editingBoardItem.page;



      const itemId = state.editingBoardItem.id;



      const page = board.doc.pages[pageIdx];



      const existing = page && page.items ? page.items.find(x => x.id === itemId) : null;



      if (existing) {



        try {



          const img = new Image();



          img.src = dataUri;



          await img.decode();



          const pw = board.doc ? (board.doc.landscape ? 1754 : 1240) : 1240;



          const ph = typeof board.phOf === 'function' ? board.phOf(pageIdx) : 1754;



          const maxW = Math.min(680, pw - 80);



          const maxH = Math.min(760, ph - 80);



          const curW = (existing.w > 80 && existing.w <= maxW) ? existing.w : Math.min(maxW, Math.round(img.naturalWidth * Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight)));



          const curH = Math.round(curW * (img.naturalHeight / img.naturalWidth));



          const newX = Math.max(40, Math.min(pw - curW - 40, existing.x));



          const newY = Math.max(40, Math.min(ph - curH - 40, existing.y));



          board.commit(board.updatePage(pageIdx, p => ({



            ...p,



            items: p.items.map(it => it.id === itemId ? {



              ...it,



              src: dataUri,



              x: newX,



              y: newY,



              w: curW,



              h: curH,



              meaMindmap: currentTree



            } : it)



          })));



          inserted = true;



          state.editingBoardItem = null;



        } catch (err) {



          console.warn('[Mindmap] Error updating existing item:', err);



        }



      }



    }







    if (!inserted && typeof window.__meaInsertImage === 'function') {



      try {



        inserted = await window.__meaInsertImage(dataUri, currentTree);



      } catch (err) {



        console.warn('[Mindmap] Native canvas insert error:', err);



      }



    }







    // Auto-switch to pen tool and clear selection so bounding box doesn't obstruct drawing



    if (board) {



      try {



        board.sel = null;



        board.setTool({ k: 'pen' });



        board.redraw();



      } catch (_) {}



    }







    window.scrollTo(0, 0);



    if (document.documentElement) { document.documentElement.scrollLeft = 0; document.documentElement.scrollTop = 0; }



    if (document.body) { document.body.scrollLeft = 0; document.body.scrollTop = 0; }



    const rootEl = document.getElementById('root');



    if (rootEl) {



      rootEl.scrollLeft = 0;



      rootEl.scrollTop = 0;



    }







    if (inserted) {



      window.showToast('Đã chèn sơ đồ tư duy vào Bảng viết! Bạn có thể dùng bút viết bài hoặc nháy đúp vào sơ đồ để sửa.', 'success');



    } else {



      window.showToast('Đã sao chép ảnh sơ đồ! Bạn có thể nhấn Ctrl+V để dán vào bảng vẽ.', 'info');



    }



  };








  // =========================================================================
  // NATIVE VECTOR MINDMAP CARD ENGINE (TRỰC TIẾP TRÊN BẢNG VIẾT NHƯ THẺ CÂU HỎI)
  // =========================================================================
  function isSelectionToolActive() {
    try {
      const board = (window.getBoard && window.getBoard()) || (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard;
      if (board && board.tool) {
        const k = board.tool.k;
        if (k === 'select' || (k === 'geo' && board.tool.t === 'move')) return true;
      }
      const selectBtn = document.querySelector('.tb[title*="Chọn"], .tb[title*="Select"], .tb[data-tool="select"]');
      if (selectBtn && (selectBtn.classList.contains('active') || selectBtn.classList.contains('on'))) return true;
    } catch (_) {}
    return false;
  }
  window.isSelectionToolActive = isSelectionToolActive;

  // Clean initialization: purge legacy test cards from localStorage
  try {
    localStorage.removeItem('mea_mindmap_cards');
  } catch (_) {}
  window.__meaMindmapCards = {};

  function saveStoredMindmapCards() {
    try {
      if (Object.keys(window.__meaMindmapCards || {}).length > 0) {
        sessionStorage.setItem('mea_mindmap_cards', JSON.stringify(window.__meaMindmapCards));
      } else {
        sessionStorage.removeItem('mea_mindmap_cards');
        localStorage.removeItem('mea_mindmap_cards');
      }
    } catch (_) {}
  }

  window.generateBoardMindmapContent = function (tree) {
    if (!tree) return { width: 400, height: 200, html: '' };
    calculateLayout(tree);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    function calcBounds(node) {
      if (!node) return;
      if (typeof node.x === 'number') {
        if (node.x < minX) minX = node.x;
        if (node.y < minY) minY = node.y;
        if (node.x + (node.w || 120) > maxX) maxX = node.x + (node.w || 120);
        if (node.y + (node.h || 40) > maxY) maxY = node.y + (node.h || 40);
      }
      if (node.children && node.expanded !== false) {
        node.children.forEach(calcBounds);
      }
    }
    calcBounds(tree);
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 600; maxY = 400; }

    const pad = 20;
    const ox = minX - pad;
    const oy = minY - pad;
    const totalW = Math.max(160, Math.ceil((maxX - minX) + pad * 2));
    const totalH = Math.max(100, Math.ceil((maxY - minY) + pad * 2));

    let pathsHtml = '';
    let nodesHtml = '';

    function traverseTree(node) {
      const nodeColor = node.color || (node.level === 1 ? THEME_COLORS[Math.abs(node.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % THEME_COLORS.length] : '#0d9488');
      if (node.children && node.children.length > 0 && node.expanded !== false) {
        node.children.forEach(child => {
          const sx = (node.x + node.w) - ox;
          const sy = (node.y + node.h / 2) - oy;
          const ex = child.x - ox;
          const ey = (child.y + child.h / 2) - oy;
          const c1 = sx + (ex - sx) * 0.45;
          const c2 = ex - (ex - sx) * 0.45;
          const childColor = child.color || nodeColor;
          pathsHtml += `<path d="M ${sx} ${sy} C ${c1} ${sy}, ${c2} ${ey}, ${ex} ${ey}" fill="none" stroke="${childColor}" stroke-width="2.2" stroke-linecap="round" opacity="0.9" />`;
          traverseTree(child);
        });
      }

      const renderedText = renderMathInText(node.text);
      const nx = node.x - ox;
      const ny = node.y - oy;
      nodesHtml += `
        <div class="mm-node-card level-${node.level}"
             style="position: absolute; left: ${nx}px; top: ${ny}px; width: ${node.w}px; min-height: ${node.h}px; box-sizing: border-box; --node-color: ${nodeColor};">
          <div class="mm-node-text">${renderedText}</div>
        </div>
      `;
    }

    traverseTree(tree);

    return {
      width: totalW,
      height: totalH,
      html: `
        <div style="position: relative; width: ${totalW}px; height: ${totalH}px; background: transparent;">
          <svg style="position: absolute; top:0; left:0; width: ${totalW}px; height: ${totalH}px; pointer-events: none;">
            ${pathsHtml}
          </svg>
          <div style="position: absolute; top:0; left:0; width: ${totalW}px; height: ${totalH}px; background: transparent;">
            ${nodesHtml}
          </div>
        </div>
      `
    };
  };

  function renderBoardMindmapElement(pageIdx, card) {
    const el = document.createElement('div');
    el.id = `mea-mm-card-${pageIdx}`;
    el.className = 'mea-mm-board-card';

    const content = window.generateBoardMindmapContent(card.tree);
    card.w = content.width;
    card.h = content.height;

    // Pointerdown inside card when in select-mode immediately marks it selected
    el.addEventListener('pointerdown', function (e) {
      if (isSelectionToolActive()) {
        window.__activeMindmapPage = pageIdx;
        document.querySelectorAll('.mea-mm-board-card').forEach(c => c.classList.remove('is-selected'));
        el.classList.add('is-selected');
      }
    });

    el.innerHTML = `
      <div class="mea-mm-card-body"
           onpointerdown="window.startDragBoardMindmap(event, ${pageIdx})"
           ondblclick="window.editBoardMindmap(${pageIdx})">
        ${content.html}
      </div>
      <button class="mea-mm-delete-btn"
              onclick="event.stopPropagation(); window.deleteBoardMindmap(${pageIdx})"
              onpointerdown="event.stopPropagation()"
              title="Xóa Sơ đồ tư duy">✕</button>
      <div class="mea-mm-resize-handle"
           onpointerdown="window.startResizeBoardMindmap(event, ${pageIdx})"
           title="Kéo góc để thu phóng kích thước"></div>
    `;

    return el;
  }

  window.updateAllMindmapCardPositions = function () {
    if (!window.__meaMindmapCards || Object.keys(window.__meaMindmapCards).length === 0) {
      const oldCards = document.querySelectorAll('.mea-mm-board-card');
      if (oldCards.length > 0) oldCards.forEach(c => c.remove());
      return;
    }
    const board = (window.getBoard && window.getBoard()) || (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard;
    if (!board) return;

    const layer = (window.ensureQuestionCardsLayer && window.ensureQuestionCardsLayer()) || document.getElementById('mea-question-cards-layer');
    if (!layer) return;

    const isSelecting = isSelectionToolActive();

    if (isSelecting) {
      layer.classList.add('select-mode-active');
      layer.classList.remove('drawing-mode-active');
    } else {
      layer.classList.add('drawing-mode-active');
      layer.classList.remove('select-mode-active');
    }

    // Clean up DOM elements for deleted cards
    const existingEls = layer.querySelectorAll('.mea-mm-board-card');
    existingEls.forEach(el => {
      const pIdx = el.id.replace('mea-mm-card-', '');
      if (!window.__meaMindmapCards[pIdx]) {
        el.remove();
      }
    });

    for (const pageIdxStr in window.__meaMindmapCards) {
      const pageIdx = parseInt(pageIdxStr, 10);
      const card = window.__meaMindmapCards[pageIdx];
      if (!card) continue;

      let cardEl = document.getElementById(`mea-mm-card-${pageIdx}`);
      if (!cardEl) {
        cardEl = renderBoardMindmapElement(pageIdx, card);
        layer.appendChild(cardEl);
      }

      if (isSelecting) {
        cardEl.classList.remove('drawing-mode');
        cardEl.classList.add('select-mode');
      } else {
        cardEl.classList.add('drawing-mode');
        cardEl.classList.remove('select-mode');
        cardEl.classList.remove('is-selected');
      }

      const getRect = window.getCardScreenRect || function (b, pIdx, c) {
        const zoom = (b && b.zoom) || 1;
        const pageTop = (b && typeof b.pageTop === 'function') ? b.pageTop(pIdx) : (pIdx * 1754);
        const scrollLeft = (b && b.scroller) ? b.scroller.scrollLeft : 0;
        const scrollTop = (b && b.scroller) ? b.scroller.scrollTop : 0;
        const offsetX = (b && b.offsetX) || 0;
        return {
          left: c.x * zoom + offsetX - scrollLeft,
          top: (pageTop + c.y) * zoom - scrollTop,
          zoom: zoom
        };
      };

      const rect = getRect(board, pageIdx, {
        x: card.x,
        y: card.y,
        w: card.w || 600,
        h: card.h || 400
      });

      const zoom = rect.zoom || board.zoom || 1;
      const totalScale = zoom * (card.scale || 1.0);

      cardEl.style.display = 'flex';
      cardEl.style.left = '0px';
      cardEl.style.top = '0px';
      cardEl.style.transform = `translate3d(${Math.round(rect.left)}px, ${Math.round(rect.top)}px, 0) scale(${totalScale})`;
      cardEl.style.transformOrigin = '0 0';
      cardEl.style.willChange = 'transform';
    }
  };

  window.scheduleUpdateAllMindmapCards = function () {
    requestAnimationFrame(() => {
      window.updateAllMindmapCardPositions();
    });
  };

  window.insertNativeMindmapToBoard = function () {
    window.captureAndHandleMindmap('insert_board');
  };

  window.startDragBoardMindmap = function (e, pageIdx) {
    if (e.button !== 0) return;
    if (!isSelectionToolActive()) return;

    window.__activeMindmapPage = pageIdx;
    document.querySelectorAll('.mea-mm-board-card').forEach(c => c.classList.remove('is-selected'));
    const currentCardEl = document.getElementById(`mea-mm-card-${pageIdx}`);
    if (currentCardEl) currentCardEl.classList.add('is-selected');

    const card = window.__meaMindmapCards[pageIdx];
    if (!card) return;
    e.stopPropagation();

    const board = (window.getBoard && window.getBoard()) || (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard;
    const zoom = (board && board.zoom) || 1;
    const totalScale = zoom * (card.scale || 1.0);
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = card.x;
    const initY = card.y;
    let moved = false;

    const cardEl = document.getElementById(`mea-mm-card-${pageIdx}`);

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      if (!moved) {
        moved = true;
        if (cardEl) cardEl.classList.add('is-dragging');
      }
      card.x = Math.round(initX + dx / totalScale);
      card.y = Math.round(initY + dy / totalScale);
      window.updateAllMindmapCardPositions();
    }

    function onUp() {
      if (cardEl) cardEl.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved) saveStoredMindmapCards();
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  window.editBoardMindmap = function (pageIdx) {
    const card = window.__meaMindmapCards[pageIdx];
    if (!card || !card.tree) return;
    window.openMindMapStudioWithTree(card.tree);
  };

  window.__activeMindmapPage = null;

  window.deleteBoardMindmap = function (pageIdx) {
    delete window.__meaMindmapCards[pageIdx];
    saveStoredMindmapCards();
    const el = document.getElementById(`mea-mm-card-${pageIdx}`);
    if (el) el.remove();
    window.__activeMindmapPage = null;
    if (typeof window.showToast === 'function') {
      window.showToast('Đã xóa sơ đồ tư duy khỏi trang.', 'info');
    }
  };

  // Keyboard Delete / Backspace listener for selected mindmap
  window.addEventListener('keydown', function (e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && window.__activeMindmapPage !== null) {
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      window.deleteBoardMindmap(window.__activeMindmapPage);
    }
  });

  // Clear selection when clicking outside mindmap
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest('.mea-mm-board-card')) {
      window.__activeMindmapPage = null;
      document.querySelectorAll('.mea-mm-board-card.is-selected').forEach(c => c.classList.remove('is-selected'));
    }
  });

  // Resize by dragging bottom-right corner handle (like native elements)
  window.startResizeBoardMindmap = function (e, pageIdx) {
    if (e.button !== 0) return;
    if (!isSelectionToolActive()) return;
    const card = window.__meaMindmapCards[pageIdx];
    if (!card) return;
    e.stopPropagation();
    e.preventDefault();

    const board = (window.getBoard && window.getBoard()) || (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard;
    const zoom = (board && board.zoom) || 1;
    const startX = e.clientX;
    const startScale = card.scale || 1.0;
    const baseW = card.w || 600;

    const cardEl = document.getElementById(`mea-mm-card-${pageIdx}`);
    if (cardEl) cardEl.classList.add('is-resizing');

    function onMove(ev) {
      const dx = (ev.clientX - startX) / zoom;
      const newScale = Math.max(0.2, Math.min(3.0, startScale + dx / baseW));
      card.scale = Math.round(newScale * 100) / 100;
      window.updateAllMindmapCardPositions();
    }

    function onUp() {
      if (cardEl) cardEl.classList.remove('is-resizing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      saveStoredMindmapCards();
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Refresh selection mode on pointerup (e.g. after clicking toolbar) and tool keys
  document.addEventListener('pointerup', function () {
    setTimeout(window.updateAllMindmapCardPositions, 15);
  }, { passive: true });

  window.addEventListener('keydown', function (e) {
    if (['s', 'S', 'p', 'P', 'e', 'E', 'h', 'H', 'v', 'V'].includes(e.key)) {
      setTimeout(window.updateAllMindmapCardPositions, 20);
    }
  }, { passive: true });

  window.insertMindmapToWhiteboard = function () {
    window.captureAndHandleMindmap('insert_board');
  };








  window.insertMindmapToWord = function () {



    window.captureAndHandleMindmap('copy_word');



  };







  window.downloadMindmapPng = function () {



    window.captureAndHandleMindmap('save_png');



  };







  window.downloadMindmapSvg = function () {



    try {



      const svgString = window.generateMindmapSvg();



      if (!svgString) {



        window.showToast('Không thể kết xuất mã vector SVG!', 'error');



        return;



      }



      if (window.chrome && window.chrome.webview) {



        window.chrome.webview.postMessage({



          type: 'DOWNLOAD_MINDMAP_SVG',



          svg: svgString



        });



      } else {



        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });



        const url = URL.createObjectURL(blob);



        const a = document.createElement('a');



        a.href = url;



        a.download = `SoDoTuDuy_${Date.now()}.svg`;



        a.click();



        URL.revokeObjectURL(url);



      }



      window.showToast('Đã xuất vector SVG và sao chép vào bộ nhớ tạm!', 'success');



    } catch (err) {



      console.warn('[Mindmap] Error exporting SVG:', err);



      window.showToast('Lỗi xuất SVG: ' + err.message, 'error');



    }



  };







  // 14. PAN & ZOOM CONTROLS (Phóng to / thu nhỏ tại tâm điểm trỏ chuột hoặc tâm khung nhìn)



  function zoomAtPoint(targetZoom, cx, cy) {



    const oldZoom = state.zoom;



    const newZoom = Number(Math.min(3.0, Math.max(0.2, targetZoom)).toFixed(2));



    if (newZoom === oldZoom) return;







    // Giữ nguyên tọa độ thực tế tại điểm (cx, cy)



    state.pan.x = Math.round(cx - (cx - state.pan.x) * (newZoom / oldZoom));



    state.pan.y = Math.round(cy - (cy - state.pan.y) * (newZoom / oldZoom));



    state.zoom = newZoom;







    const viewport = document.getElementById('mindmap-viewport');



    if (viewport) {



      viewport.style.transform = "translate(" + state.pan.x + "px, " + state.pan.y + "px) scale(" + state.zoom + ")";



    }



    const zoomLabel = document.getElementById('mindmap-zoom-label');



    if (zoomLabel) {



      zoomLabel.textContent = Math.round(state.zoom * 100) + "%";



    }



  }







  window.zoomMindMap = function (delta) {



    const canvas = document.getElementById('mindmap-canvas-area');



    const cx = (canvas?.clientWidth || 800) / 2;



    const cy = (canvas?.clientHeight || 600) / 2;



    zoomAtPoint(state.zoom + delta, cx, cy);



  };







  window.resetMindMapZoom = function () {



    state.zoom = 1.0;



    calculateLayout(state.tree);



    const canvas = document.getElementById('mindmap-canvas-area');



    const cw = canvas?.clientWidth || 800;



    const ch = canvas?.clientHeight || 600;



    const root = state.tree;



    if (root) {



      state.pan = {



        x: Math.round(Math.max(40, cw * 0.12) - root.x),



        y: Math.round(ch / 2 - (root.y + root.h / 2))



      };



    } else {



      state.pan = { x: 50, y: 50 };



    }



    renderMindMap();



  };







  window.fitMindMapView = function () {



    calculateLayout(state.tree);



    const canvas = document.getElementById('mindmap-canvas-area');



    if (!canvas || !state.bounds) {



      state.zoom = 0.95;



      state.pan = { x: 50, y: 50 };



      renderMindMap();



      return;



    }







    const cw = canvas.clientWidth || 800;



    const ch = canvas.clientHeight || 600;







    const treeW = state.bounds.width || 800;



    const treeH = state.bounds.height || 600;







    const padX = 50;



    const padY = 50;



    const availW = Math.max(100, cw - padX * 2);



    const availH = Math.max(100, ch - padY * 2);







    const scaleX = availW / treeW;



    const scaleY = availH / treeH;



    let fitZoom = Math.min(scaleX, scaleY);







    // Limit zoom to fit cleanly: allow down to 0.25 for large trees, max 1.0



    fitZoom = Math.max(0.25, Math.min(1.0, fitZoom));







    const renderedW = treeW * fitZoom;



    const renderedH = treeH * fitZoom;







    // Center in visible canvas



    const panX = Math.round((cw - renderedW) / 2 - state.bounds.minX * fitZoom);



    const panY = Math.round((ch - renderedH) / 2 - state.bounds.minY * fitZoom);







    state.zoom = Number(fitZoom.toFixed(2));



    state.pan = { x: panX, y: panY };







    renderMindMap();



  };







  // Helper to re-measure and reflow Note Whiteboard without horizontal push or cutoff

  function reflowNoteWhiteboard(targetMode, prevMode) {

    // Giu nguyen trang thai cuon, zoom va trang hien tai cua NoteRenderer ma khong ep co canvas

  }



  // 15. WORKSPACE MODE CONTROLLER (Closed, Split, Full)

  window.setMindMapMode = function (newMode) {

    const prevMode = state.mode;

    state.mode = newMode;

    const container = document.getElementById('mea-mindmap-container');

    const btnBadge = document.getElementById('btn-toggle-mindmap');

    const rootEl = document.getElementById('root');



    if (!container) return;



    container.className = `mode-${newMode}`;



    if (btnBadge) {

      if (newMode !== 'closed') {

        btnBadge.classList.add('active');

        btnBadge.innerHTML = `

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">

            <polyline points="20 6 9 17 4 12"></polyline>

          </svg>

          Sơ đồ tư duy (${newMode === 'split' ? 'Chia đôi' : 'Toàn màn hình'})

        `;

      } else {

        btnBadge.classList.remove('active');

        btnBadge.innerHTML = `

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">

            <circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle>

            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>

          </svg>

          Sơ đồ tư duy

        `;

      }

    }



    if (newMode === 'split') {

      document.body.classList.add('mindmap-split');

      document.body.classList.remove('mindmap-full');

    } else if (newMode === 'full') {

      document.body.classList.add('mindmap-full');

      document.body.classList.remove('mindmap-split');

    } else {

      document.body.classList.remove('mindmap-split', 'mindmap-full');

    }



    if (rootEl) {

      if (newMode === 'full') {

        rootEl.style.display = 'none';

      } else {

        rootEl.style.display = '';

      }

    }



    // Force synchronous layout recalculation

    void document.body.offsetWidth;



    // Reflow whiteboard layout to match container

    reflowNoteWhiteboard(newMode, prevMode);

    window.dispatchEvent(new Event('resize'));



    if (newMode !== 'closed') {

      window.fitMindMapView();

    }



    // Two-pass frame sync for WebView2 rendering

    requestAnimationFrame(() => {

      reflowNoteWhiteboard(newMode, prevMode);

      window.dispatchEvent(new Event('resize'));

      if (newMode !== 'closed') {

        window.fitMindMapView();

      }

    });



    setTimeout(() => {

      reflowNoteWhiteboard(newMode, prevMode);

      window.dispatchEvent(new Event('resize'));

    }, 40);

  };







  window.toggleMindMapStudio = function () {

    if (state.mode === 'closed') {

      window.setMindMapMode('full');

    } else {

      window.setMindMapMode('closed');

    }

  };







  // 16. EVENT LISTENERS SETUP



  function setupEventListeners() {



    const canvas = document.getElementById('mindmap-canvas-area');



    if (!canvas) return;







    // Pan canvas with mouse drag



    canvas.addEventListener('mousedown', (e) => {



      if (e.target.closest('.mm-node-card') || e.target.closest('.mm-btn') || e.target.closest('.mindmap-floating-controls')) {



        return;



      }



      state.isDragging = true;



      state.dragStart = { x: e.clientX - state.pan.x, y: e.clientY - state.pan.y };



      canvas.classList.add('panning');



    });







    window.addEventListener('mousemove', (e) => {



      if (!state.isDragging) return;



      state.pan.x = e.clientX - state.dragStart.x;



      state.pan.y = e.clientY - state.dragStart.y;



      const viewport = document.getElementById('mindmap-viewport');



      if (viewport) {



        viewport.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;



      }



    });







    window.addEventListener('mouseup', () => {



      if (state.isDragging) {



        state.isDragging = false;



        canvas.classList.remove('panning');



      }



    });







    // Zoom with wheel (Phóng to / thu nhỏ tức thời tại đúng vị trí trỏ chuột)



    canvas.addEventListener('wheel', (e) => {



      e.preventDefault();



      const rect = canvas.getBoundingClientRect();



      const cx = e.clientX - rect.left;



      const cy = e.clientY - rect.top;



      const factor = e.deltaY < 0 ? 1.12 : 0.88;



      zoomAtPoint(state.zoom * factor, cx, cy);



    }, { passive: false });







    // Global keyboard shortcuts



    window.addEventListener('keydown', (e) => {



      // 1. If focus is inside an input, textarea, or contentEditable, prevent mindmap shortcuts



      const activeEl = document.activeElement;



      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);



      if (isInputFocused) {



        if (e.key === 'Escape') {



          window.closeMathEditor();



          window.closeAiMindmapModal();



          window.closeTemplatesModal();



        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && state.editingNodeId) {



          e.preventDefault();



          window.saveMathEditor();



        }



        return;



      }







      // 2. Check if any modal is currently visible



      const mathModal = document.getElementById('mindmap-math-modal');



      const aiModal = document.getElementById('mindmap-ai-modal');



      const tplModal = document.getElementById('mindmap-templates-modal');



      const isAnyModalOpen = (mathModal && mathModal.style.display !== 'none') ||



                             (aiModal && aiModal.style.display !== 'none') ||



                             (tplModal && tplModal.style.display !== 'none');



      if (isAnyModalOpen) {



        if (e.key === 'Escape') {



          window.closeMathEditor();



          window.closeAiMindmapModal();



          window.closeTemplatesModal();



        }



        return;



      }







      if (state.mode === 'closed') return;







      if (e.key === 'Tab') {



        e.preventDefault();



        window.addChildNode(state.selectedId);



      } else if (e.key === 'Enter') {



        e.preventDefault();



        window.addSiblingNode(state.selectedId);



      } else if (e.key === 'F2') {



        e.preventDefault();



        window.openMathEditor(state.selectedId);



      } else if (e.key === 'Delete' || e.key === 'Backspace') {



        if (state.selectedId && state.selectedId !== 'root') {



          e.preventDefault();



          window.deleteNode(state.selectedId);



        }



      }



    });







    // Realtime preview typing in modal textarea



    const textarea = document.getElementById('mm-math-input');



    if (textarea) {



      textarea.addEventListener('input', () => {



        updateMathEditorPreview(textarea.value);



      });



    }



  }







  // 17. INITIALIZE ON DOM LOADED



  window.addEventListener('DOMContentLoaded', () => {



    setupEventListeners();



    const container = document.getElementById('mea-mindmap-container');



    if (container && container.classList.contains('mode-full')) {



      state.mode = 'full';



    }



    // Default initial template with auto-fit to viewport



    window.fitMindMapView();



  });







})();



