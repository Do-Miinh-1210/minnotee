/**
 * MinNote Mindmap Studio (Cobalt & Nordic Slate)
 * Supports: Rich Text + LaTeX/KaTeX Math Formulas ($..$, $$..$$),
 * 3 Auto-Layouts (Cây ngang / Tỏa 2 bên / Cây dọc),
 * 40-Step Undo/Redo (Ctrl+Z / Ctrl+Y), Quick Search (Ctrl+F),
 * Quick Node Style Picker (Colors, Shapes, Math Badges),
 * Collapse/Expand Descendant Count Badges, Light & Dark Mode,
 * Markdown Bidirectional Sync, AI Mindmap Generation, Curated THPT Templates,
 * Split/Full Workspace & Ultra-Crisp Vector/4K Integration with Whiteboard / Word / PNG / SVG.
 */
(function () {
  'use strict';

  // 1. MINNOTE COBALT & NORDIC MATH STUDIO PALETTE
  const THEME_COLORS = [
    '#2563eb', // MinNote Cobalt (Primary)
    '#0284c7', // Sky Blue
    '#0891b2', // Cyan Slate
    '#4f46e5', // Indigo
    '#059669', // Emerald
    '#d97706', // Amber Gold
    '#e11d48', // Rose Red
    '#475569'  // Nordic Slate
  ];

  const NODE_SHAPES = [
    { id: 'card', label: 'Thẻ' },
    { id: 'pill', label: 'Viên' },
    { id: 'underline', label: 'Gạch chân' }
  ];

  const NODE_BADGES = [
    { id: '', label: 'Không nhãn', icon: '✕' },
    { id: '📌', label: 'Trọng tâm', icon: '📌' },
    { id: '⚡', label: 'Công thức nhanh', icon: '⚡' },
    { id: '💡', label: 'Mẹo / Ý tưởng', icon: '💡' },
    { id: '⚠️', label: 'Lưu ý / Sai lầm', icon: '⚠️' }
  ];

  const LAYOUT_MODES = [
    {
      id: 'right',
      label: 'Cây ngang',
      title: 'Bố cục Cây ngang (Trái → Phải)',
      svg: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="9" width="6" height="6" rx="1.5"/><rect x="16" y="3" width="6" height="5" rx="1.5"/><rect x="16" y="16" width="6" height="5" rx="1.5"/><path d="M8 12h4m0 0V5.5h4M12 12v6.5h4"/></svg>'
    },
    {
      id: 'mindmap',
      label: 'Tỏa 2 bên',
      title: 'Bố cục Tỏa 2 bên cân đối quanh nút gốc',
      svg: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="6" height="6" rx="1.5"/><rect x="1" y="4" width="5" height="4" rx="1"/><rect x="1" y="16" width="5" height="4" rx="1"/><rect x="18" y="4" width="5" height="4" rx="1"/><rect x="18" y="16" width="5" height="4" rx="1"/><path d="M9 12H6m0-6h3m-3 12h3M15 12h3m0-6h-3m3 12h-3"/></svg>'
    },
    {
      id: 'down',
      label: 'Cây dọc',
      title: 'Bố cục Cây dọc (Trên → Dưới)',
      svg: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="5" rx="1.5"/><rect x="2" y="17" width="6" height="5" rx="1.5"/><rect x="16" y="17" width="6" height="5" rx="1.5"/><path d="M12 7v5m0 0H5v5m7-5h7v5"/></svg>'
    }
  ];

  const MAX_HISTORY = 40;

  // 2. CURATED THPT MATH MINDMAP TEMPLATES
  const MATH_TEMPLATES = {
    dao_ham_12: {
      name: 'Toán 12 • Đạo hàm & Khảo sát hàm số',
      desc: 'Tính đơn điệu, cực trị, GTLN-GTNN và các đường tiệm cận',
      data: {
        id: 'root',
        text: 'Khảo sát hàm số $y=f(x)$',
        color: '#2563eb',
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
            color: '#4f46e5',
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
        color: '#2563eb',
        expanded: true,
        children: [
          {
            id: 'tp_1',
            text: '1. Định nghĩa & Tính chất cơ bản',
            color: '#0284c7',
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
            color: '#4f46e5',
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
        color: '#2563eb',
        expanded: true,
        children: [
          {
            id: 'ox_1',
            text: '1. Vectơ trong không gian',
            color: '#0891b2',
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
        color: '#2563eb',
        expanded: true,
        children: [
          {
            id: 'xs_1',
            text: '1. Xác suất có điều kiện',
            color: '#0891b2',
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
            color: '#4f46e5',
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
        color: '#2563eb',
        expanded: true,
        children: [
          {
            id: 'lg_1',
            text: '1. Công thức biến đổi cơ bản',
            color: '#059669',
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
            color: '#4f46e5',
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
            color: '#0891b2',
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
            color: '#4f46e5',
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
    mode: 'closed',       // 'closed' | 'split' | 'full'
    view: 'visual',       // 'visual' | 'markdown'
    layout: 'right',      // 'right' | 'mindmap' | 'down'
    tree: JSON.parse(JSON.stringify(MATH_TEMPLATES.dao_ham_12.data)),
    selectedId: 'root',
    openStyleNodeId: null,
    zoom: 1.0,
    pan: { x: 40, y: 120 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    editingNodeId: null,
    editingBoardItem: null,
    bounds: null,
    history: [],          // 40-step Undo stack
    future: [],           // Redo stack
    searchQuery: '',
    searchMatches: [],
    searchIndex: -1
  };

  let _smoothTimer = null;

  // Helper to safely escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeSearchText(str) {
    if (!str) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  function cloneTree(tree) {
    return JSON.parse(JSON.stringify(tree));
  }

  function getNodeColor(node, fallbackColor) {
    if (node && node.color) return node.color;
    if (node && node.level === 1 && node.id) {
      const hash = Math.abs(node.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
      return THEME_COLORS[hash % THEME_COLORS.length];
    }
    return fallbackColor || '#2563eb';
  }

  // 3B. INJECT MINNOTE MINDMAP STUDIO STYLES (Cobalt & Nordic Slate • Light & Dark)
  function injectStudioStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('mn-mindmap-studio-css')) return;
    const style = document.createElement('style');
    style.id = 'mn-mindmap-studio-css';
    style.textContent = `
      /* =====================================================================
         MinNote Mindmap Studio — Cobalt & Nordic Slate (Light & Dark Mode)
         ===================================================================== */
      #mea-mindmap-container {
        background: #f8fafc !important;
        color: #0f172a !important;
        border-left-color: #cbd5e1 !important;
        font-family: "Be Vietnam Pro", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif !important;
      }
      html.dark #mea-mindmap-container {
        background: #0b1120 !important;
        color: #f1f5f9 !important;
        border-left-color: #1e293b !important;
      }

      /* Top Studio Toolbar */
      #mea-mindmap-container .mindmap-toolbar {
        background: #ffffff !important;
        border-bottom: 1px solid #e2e8f0 !important;
        box-shadow: 0 2px 10px -4px rgba(15, 23, 42, 0.08) !important;
        padding: 7px 14px !important;
        gap: 7px !important;
      }
      html.dark #mea-mindmap-container .mindmap-toolbar {
        background: #0f172a !important;
        border-bottom-color: #1e293b !important;
        box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.5) !important;
      }

      #mea-mindmap-container .mindmap-toolbar-row-top {
        gap: 10px !important;
        flex-wrap: wrap !important;
      }

      #mea-mindmap-container .mindmap-title-badge {
        font-size: 13px !important;
        font-weight: 800 !important;
        color: #0f172a !important;
        letter-spacing: -0.015em !important;
        gap: 7px !important;
      }
      html.dark #mea-mindmap-container .mindmap-title-badge {
        color: #f8fafc !important;
      }

      #mea-mindmap-container .mindmap-tag {
        background: #eff6ff !important;
        color: #1d4ed8 !important;
        border: 1px solid #bfdbfe !important;
        border-radius: 999px !important;
        font-size: 10.5px !important;
        font-weight: 700 !important;
        padding: 2px 8px !important;
      }
      html.dark #mea-mindmap-container .mindmap-tag {
        background: rgba(37, 99, 235, 0.2) !important;
        color: #93c5fd !important;
        border-color: rgba(59, 130, 246, 0.35) !important;
      }

      /* Quick Search Pill (Ctrl+F) */
      .mm-search-box {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 29px;
        padding: 0 7px 0 9px;
        border-radius: 999px;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        margin-left: auto;
        transition: border-color 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
      }
      .mm-search-box:focus-within {
        background: #ffffff;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
      }
      .mm-search-box svg {
        color: #64748b;
        flex-shrink: 0;
      }
      .mm-search-input {
        width: 158px;
        border: 0;
        outline: none;
        background: transparent;
        color: #0f172a;
        font-size: 12px;
        font-weight: 500;
        font-family: inherit;
      }
      .mm-search-input::placeholder {
        color: #94a3b8;
      }
      .mm-search-count {
        font-size: 11px;
        font-weight: 700;
        color: #2563eb;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .mm-search-count.no-match {
        color: #dc2626;
      }
      .mm-search-nav,
      .mm-search-clear {
        display: none;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: #475569;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.12s, color 0.12s;
      }
      .mm-search-box.has-query .mm-search-nav,
      .mm-search-box.has-query .mm-search-clear {
        display: inline-flex;
      }
      .mm-search-nav:hover,
      .mm-search-clear:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      html.dark .mm-search-box {
        background: #162033;
        border-color: #334155;
      }
      html.dark .mm-search-box:focus-within {
        background: #1e293b;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.24);
      }
      html.dark .mm-search-input {
        color: #f1f5f9;
      }
      html.dark .mm-search-count {
        color: #60a5fa;
      }
      html.dark .mm-search-count.no-match {
        color: #f87171;
      }
      html.dark .mm-search-nav,
      html.dark .mm-search-clear {
        color: #cbd5e1;
      }
      html.dark .mm-search-nav:hover,
      html.dark .mm-search-clear:hover {
        background: #334155;
        color: #ffffff;
      }

      /* Segmented Button Groups & Unified Cobalt/Slate Buttons */
      #mea-mindmap-container .mindmap-btn-group {
        background: #f1f5f9 !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 10px !important;
        padding: 2.5px !important;
        gap: 2px !important;
      }
      #mea-mindmap-container .mindmap-btn-group.window-controls {
        margin-left: 0 !important;
      }
      html.dark #mea-mindmap-container .mindmap-btn-group {
        background: #162033 !important;
        border-color: #263248 !important;
      }

      #mea-mindmap-container .mm-btn,
      .mm-modal-overlay .mm-btn {
        background: transparent !important;
        color: #334155 !important;
        border: 1px solid transparent !important;
        border-radius: 7.5px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        padding: 5px 9px !important;
        box-shadow: none !important;
        transition: background 0.13s ease, color 0.13s ease, border-color 0.13s ease, box-shadow 0.13s ease !important;
      }
      #mea-mindmap-container .mm-btn:hover:not(:disabled),
      .mm-modal-overlay .mm-btn:hover:not(:disabled) {
        background: #ffffff !important;
        color: #0f172a !important;
        border-color: #dbe3ee !important;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08) !important;
      }
      #mea-mindmap-container .mm-btn:disabled {
        opacity: 0.4 !important;
        cursor: not-allowed !important;
        pointer-events: none !important;
      }
      html.dark #mea-mindmap-container .mm-btn,
      html.dark .mm-modal-overlay .mm-btn {
        color: #cbd5e1 !important;
      }
      html.dark #mea-mindmap-container .mm-btn:hover:not(:disabled),
      html.dark .mm-modal-overlay .mm-btn:hover:not(:disabled) {
        background: #243249 !important;
        color: #ffffff !important;
        border-color: #334155 !important;
      }

      /* Calm Cobalt Soft Accent for "+ Con (Tab)" and "AI Tạo sơ đồ" (kills old rainbow buttons!) */
      #mea-mindmap-container .mindmap-toolbar .mm-btn.primary {
        background: #eff6ff !important;
        color: #1d4ed8 !important;
        border-color: #bfdbfe !important;
      }
      #mea-mindmap-container .mindmap-toolbar .mm-btn.primary:hover:not(:disabled) {
        background: #dbeafe !important;
        color: #1e40af !important;
        border-color: #93c5fd !important;
      }
      html.dark #mea-mindmap-container .mindmap-toolbar .mm-btn.primary {
        background: rgba(37, 99, 235, 0.22) !important;
        color: #93c5fd !important;
        border-color: rgba(59, 130, 246, 0.38) !important;
      }
      html.dark #mea-mindmap-container .mindmap-toolbar .mm-btn.primary:hover:not(:disabled) {
        background: rgba(37, 99, 235, 0.34) !important;
        color: #ffffff !important;
      }

      #mea-mindmap-container .mm-btn.accent-purple,
      .mm-modal-overlay .mm-btn.accent-purple {
        background: #eff6ff !important;
        color: #1d4ed8 !important;
        border: 1px solid #93c5fd !important;
        box-shadow: none !important;
      }
      #mea-mindmap-container .mm-btn.accent-purple:hover:not(:disabled),
      .mm-modal-overlay .mm-btn.accent-purple:hover:not(:disabled) {
        background: #2563eb !important;
        color: #ffffff !important;
        border-color: #2563eb !important;
        box-shadow: 0 4px 12px -3px rgba(37, 99, 235, 0.45) !important;
      }
      html.dark #mea-mindmap-container .mm-btn.accent-purple,
      html.dark .mm-modal-overlay .mm-btn.accent-purple {
        background: rgba(37, 99, 235, 0.22) !important;
        color: #93c5fd !important;
        border-color: rgba(59, 130, 246, 0.42) !important;
      }
      html.dark #mea-mindmap-container .mm-btn.accent-purple:hover:not(:disabled),
      html.dark .mm-modal-overlay .mm-btn.accent-purple:hover:not(:disabled) {
        background: #2563eb !important;
        color: #ffffff !important;
      }

      /* Calm Nordic Slate for "Mẫu SGK" (kills old gaudy orange gradient!) */
      #mea-mindmap-container .mm-btn.accent-amber {
        background: transparent !important;
        color: #334155 !important;
        border-color: transparent !important;
        box-shadow: none !important;
      }
      #mea-mindmap-container .mm-btn.accent-amber:hover:not(:disabled) {
        background: #ffffff !important;
        color: #1d4ed8 !important;
        border-color: #bfdbfe !important;
      }
      html.dark #mea-mindmap-container .mm-btn.accent-amber {
        color: #cbd5e1 !important;
      }
      html.dark #mea-mindmap-container .mm-btn.accent-amber:hover:not(:disabled) {
        background: #243249 !important;
        color: #93c5fd !important;
        border-color: #334155 !important;
      }

      /* Solid MinNote Cobalt Primary CTA: "Chèn Bảng vẽ", Layout Active, Modal Save, Markdown Apply */
      #mea-mindmap-container .mm-btn.btn-insert-board,
      #mea-mindmap-container .mindmap-markdown-area .mm-btn.primary,
      .mm-modal-overlay .mm-btn.primary,
      .mm-modal-overlay #btn-exec-ai-gen {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
        color: #ffffff !important;
        border: 1px solid #1d4ed8 !important;
        font-weight: 700 !important;
        box-shadow: 0 4px 12px -3px rgba(37, 99, 235, 0.5) !important;
      }
      #mea-mindmap-container .mm-btn.btn-insert-board:hover:not(:disabled),
      #mea-mindmap-container .mindmap-markdown-area .mm-btn.primary:hover:not(:disabled),
      .mm-modal-overlay .mm-btn.primary:hover:not(:disabled),
      .mm-modal-overlay #btn-exec-ai-gen:hover:not(:disabled) {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
        color: #ffffff !important;
        border-color: #1d4ed8 !important;
        box-shadow: 0 6px 16px -3px rgba(37, 99, 235, 0.6) !important;
        transform: translateY(-0.5px) !important;
      }

      /* Active Layout Segmented Pill */
      #mea-mindmap-container .mm-btn.mm-layout-btn.active,
      html.dark #mea-mindmap-container .mm-btn.mm-layout-btn.active {
        background: #2563eb !important;
        color: #ffffff !important;
        border-color: #2563eb !important;
        box-shadow: 0 3px 10px -2px rgba(37, 99, 235, 0.45) !important;
      }

      #mea-mindmap-container .mm-btn.danger {
        color: #dc2626 !important;
      }
      #mea-mindmap-container .mm-btn.danger:hover:not(:disabled) {
        background: #fef2f2 !important;
        color: #b91c1c !important;
        border-color: #fecaca !important;
      }
      html.dark #mea-mindmap-container .mm-btn.danger {
        color: #f87171 !important;
      }
      html.dark #mea-mindmap-container .mm-btn.danger:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.18) !important;
        color: #fca5a5 !important;
        border-color: rgba(239, 68, 68, 0.35) !important;
      }

      #mea-mindmap-container .mm-btn-icon-only {
        width: 28px !important;
        height: 28px !important;
        padding: 0 !important;
        justify-content: center !important;
      }

      /* Canvas Area (Light & Dark Nordic Dot Grid) */
      #mea-mindmap-container .mindmap-canvas-area {
        background-color: #f8fafc !important;
        background-image: radial-gradient(#cbd5e1 1.15px, transparent 1.15px) !important;
        background-size: 24px 24px !important;
      }
      html.dark #mea-mindmap-container .mindmap-canvas-area {
        background-color: #0b1120 !important;
        background-image: radial-gradient(#1e293b 1.25px, transparent 1.25px) !important;
      }

      /* Smooth Fit / Search Panning */
      #mindmap-viewport.mm-smooth-pan {
        transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1) !important;
      }

      /* Floating Zoom & Fit Bar */
      #mea-mindmap-container .mindmap-floating-controls {
        background: rgba(255, 255, 255, 0.94) !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 12px !important;
        padding: 4px !important;
        gap: 3px !important;
        box-shadow: 0 10px 26px -8px rgba(15, 23, 42, 0.18) !important;
      }
      html.dark #mea-mindmap-container .mindmap-floating-controls {
        background: rgba(15, 23, 42, 0.94) !important;
        border-color: #334155 !important;
        box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.65) !important;
      }
      #mea-mindmap-container .mindmap-zoom-text {
        color: #334155 !important;
        font-variant-numeric: tabular-nums !important;
      }
      html.dark #mea-mindmap-container .mindmap-zoom-text {
        color: #e2e8f0 !important;
      }

      /* Upgraded Node Cards (Crisp Typography, Larger KaTeX, Subtle Hover & Cobalt Ring) */
      #mea-mindmap-container .mm-node-card {
        padding: 9px 16px !important;
        border-radius: 12px !important;
        background: #ffffff !important;
        border: 1.75px solid var(--node-color, #2563eb) !important;
        box-shadow: 0 2px 10px -2px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04) !important;
        color: #0f172a !important;
        transition: box-shadow 0.16s ease, border-color 0.16s ease, transform 0.14s ease !important;
      }
      html.dark #mea-mindmap-container .mm-node-card {
        background: #162033 !important;
        color: #f1f5f9 !important;
        box-shadow: 0 6px 18px -6px rgba(0, 0, 0, 0.55) !important;
      }

      #mea-mindmap-container .mm-node-card:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.22), 0 8px 20px -6px rgba(15, 23, 42, 0.16) !important;
      }
      html.dark #mea-mindmap-container .mm-node-card:hover {
        box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.35), 0 10px 24px -6px rgba(0, 0, 0, 0.7) !important;
      }

      #mea-mindmap-container .mm-node-card.selected {
        outline: none !important;
        box-shadow: 0 0 0 2.5px #2563eb, 0 0 0 6px rgba(37, 99, 235, 0.20), 0 10px 24px -6px rgba(37, 99, 235, 0.24) !important;
      }
      html.dark #mea-mindmap-container .mm-node-card.selected {
        box-shadow: 0 0 0 2.5px #3b82f6, 0 0 0 6px rgba(59, 130, 246, 0.28), 0 12px 26px -6px rgba(0, 0, 0, 0.75) !important;
      }

      /* Search Match Highlight Rings */
      #mea-mindmap-container .mm-node-card.mm-search-match {
        box-shadow: 0 0 0 2.5px #f59e0b, 0 0 0 6px rgba(245, 158, 11, 0.24) !important;
      }
      #mea-mindmap-container .mm-node-card.mm-search-current {
        box-shadow: 0 0 0 3px #2563eb, 0 0 0 8px rgba(37, 99, 235, 0.32), 0 12px 28px -6px rgba(37, 99, 235, 0.4) !important;
        z-index: 15 !important;
      }

      /* Root Node (MinNote Cobalt Hero Card) */
      #mea-mindmap-container .mm-node-card.level-0 {
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%) !important;
        color: #ffffff !important;
        border: 2px solid #60a5fa !important;
        box-shadow: 0 10px 26px -8px rgba(37, 99, 235, 0.55) !important;
        padding: 12px 22px !important;
        border-radius: 14px !important;
        font-size: 15.5px !important;
        font-weight: 700 !important;
        text-align: center !important;
      }
      #mea-mindmap-container .mm-node-card.level-0 .mm-node-text,
      #mea-mindmap-container .mm-node-card.level-0 .katex,
      #mea-mindmap-container .mm-node-card.level-0 .katex * {
        color: #ffffff !important;
      }

      #mea-mindmap-container .mm-node-card.level-1 {
        border-width: 2px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
      }

      #mea-mindmap-container .mm-node-card.level-2,
      #mea-mindmap-container .mm-node-card.level-3,
      #mea-mindmap-container .mm-node-card.level-4,
      #mea-mindmap-container .mm-node-card.level-5 {
        border-left-width: 4px !important;
        font-size: 13px !important;
        line-height: 1.5 !important;
      }
      #mea-mindmap-container .mm-node-card.side-left.level-2,
      #mea-mindmap-container .mm-node-card.side-left.level-3,
      #mea-mindmap-container .mm-node-card.side-left.level-4 {
        border-left-width: 1.75px !important;
        border-right-width: 4px !important;
      }

      /* Node Shapes: Pill & Underline */
      #mea-mindmap-container .mm-node-card.shape-pill {
        border-radius: 999px !important;
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
      #mea-mindmap-container .mm-node-card.shape-underline {
        background: transparent !important;
        border: 0 !important;
        border-bottom: 3px solid var(--node-color, #2563eb) !important;
        border-radius: 6px 6px 0 0 !important;
        box-shadow: none !important;
        padding: 6px 12px 6px !important;
      }
      #mea-mindmap-container .mm-node-card.level-0.shape-underline {
        background: transparent !important;
        color: #1e3a8a !important;
        border-bottom: 3.5px solid #2563eb !important;
      }
      #mea-mindmap-container .mm-node-card.level-0.shape-underline .mm-node-text,
      #mea-mindmap-container .mm-node-card.level-0.shape-underline .katex,
      #mea-mindmap-container .mm-node-card.level-0.shape-underline .katex * {
        color: #1e3a8a !important;
      }
      html.dark #mea-mindmap-container .mm-node-card.level-0.shape-underline,
      html.dark #mea-mindmap-container .mm-node-card.level-0.shape-underline .mm-node-text,
      html.dark #mea-mindmap-container .mm-node-card.level-0.shape-underline .katex,
      html.dark #mea-mindmap-container .mm-node-card.level-0.shape-underline .katex * {
        color: #93c5fd !important;
      }

      /* Larger Crisp KaTeX Math inside Nodes */
      #mea-mindmap-container .mm-node-text {
        display: flex;
        align-items: center;
        gap: 6px;
        line-height: 1.5 !important;
      }
      #mea-mindmap-container .mm-node-card.level-0 .mm-node-text {
        justify-content: center;
      }
      #mea-mindmap-container .mm-node-badge {
        font-size: 1.05em;
        line-height: 1;
        flex-shrink: 0;
      }
      #mea-mindmap-container .mm-node-body {
        min-width: 0;
      }
      #mea-mindmap-container .mm-node-text .katex {
        font-size: 1.14em !important;
        color: #0f172a !important;
      }
      html.dark #mea-mindmap-container .mm-node-text .katex {
        color: #f8fafc !important;
      }

      /* Collapse/Expand Pill Badge with Hidden Descendant Count */
      #mea-mindmap-container .mm-collapse-badge {
        min-width: 22px !important;
        width: auto !important;
        height: 20px !important;
        padding: 0 6px !important;
        border-radius: 999px !important;
        background: var(--node-color, #2563eb) !important;
        color: #ffffff !important;
        border: 2px solid #ffffff !important;
        font-size: 10.5px !important;
        font-weight: 700 !important;
        font-variant-numeric: tabular-nums !important;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.24) !important;
        right: -13px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
      }
      html.dark #mea-mindmap-container .mm-collapse-badge {
        border-color: #0b1120 !important;
      }
      #mea-mindmap-container .mm-collapse-badge:hover {
        transform: translateY(-50%) scale(1.12) !important;
      }
      #mea-mindmap-container .mm-collapse-badge.side-left {
        left: -13px !important;
        right: auto !important;
      }
      #mea-mindmap-container .mm-collapse-badge.side-down,
      #mea-mindmap-container .mm-collapse-badge.side-center {
        left: 50% !important;
        right: auto !important;
        top: auto !important;
        bottom: -11px !important;
        transform: translateX(-50%) !important;
      }
      #mea-mindmap-container .mm-collapse-badge.side-down:hover,
      #mea-mindmap-container .mm-collapse-badge.side-center:hover {
        transform: translateX(-50%) scale(1.12) !important;
      }

      /* Floating Node Hover Action Bar */
      #mea-mindmap-container .mm-node-actions {
        top: -31px !important;
        background: rgba(15, 23, 42, 0.96) !important;
        border: 1px solid rgba(148, 163, 184, 0.25) !important;
        border-radius: 9px !important;
        padding: 3px 5px !important;
        gap: 3px !important;
        box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.4) !important;
      }
      #mea-mindmap-container .mm-action-btn {
        font-size: 11px !important;
        padding: 3px 6px !important;
        border-radius: 6px !important;
        color: #f1f5f9 !important;
      }
      #mea-mindmap-container .mm-action-btn:hover {
        background: rgba(59, 130, 246, 0.35) !important;
        color: #ffffff !important;
      }
      #mea-mindmap-container .mm-action-btn.btn-del:hover {
        background: #dc2626 !important;
        color: #ffffff !important;
      }

      /* Quick Node Style Picker Popover (Colors + Shapes + Math Badges) */
      #mea-mindmap-container .mm-style-popover {
        display: none;
        position: absolute;
        top: calc(100% + 7px);
        left: 50%;
        transform: translateX(-50%);
        width: 260px;
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 12px !important;
        padding: 10px 11px !important;
        box-shadow: 0 14px 32px -8px rgba(15, 23, 42, 0.26) !important;
        z-index: 60 !important;
        flex-direction: column;
        gap: 8px;
        cursor: default;
        text-align: left;
      }
      #mea-mindmap-container .mm-style-popover.open {
        display: flex !important;
      }
      html.dark #mea-mindmap-container .mm-style-popover {
        background: #111827 !important;
        border-color: #334155 !important;
        box-shadow: 0 18px 40px -8px rgba(0, 0, 0, 0.72) !important;
      }
      .mm-sp-sec {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .mm-sp-lbl {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #64748b;
      }
      html.dark .mm-sp-lbl {
        color: #94a3b8;
      }
      .mm-sp-colors {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 5px;
      }
      #mea-mindmap-container .mm-color-dot {
        width: 20px !important;
        height: 20px !important;
        border-radius: 50% !important;
        border: 1.5px solid rgba(15, 23, 42, 0.16) !important;
        box-sizing: border-box;
      }
      #mea-mindmap-container .mm-color-dot.on {
        box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #2563eb !important;
        transform: scale(1.1);
      }
      html.dark #mea-mindmap-container .mm-color-dot.on {
        box-shadow: 0 0 0 2px #111827, 0 0 0 4px #60a5fa !important;
      }
      .mm-sp-row {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .mm-sp-chip {
        flex: 1 0 auto;
        height: 28px;
        padding: 0 9px;
        border-radius: 7px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        color: #334155;
        font-size: 11.5px;
        font-weight: 600;
        line-height: 1;
        white-space: nowrap;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: background 0.12s, border-color 0.12s, color 0.12s;
      }
      .mm-sp-chip:hover {
        background: #eff6ff;
        border-color: #93c5fd;
        color: #1d4ed8;
      }
      .mm-sp-chip.on {
        background: #2563eb;
        border-color: #2563eb;
        color: #ffffff;
      }
      html.dark .mm-sp-chip {
        background: #1e293b;
        border-color: #334155;
        color: #cbd5e1;
      }
      html.dark .mm-sp-chip:hover {
        background: rgba(59, 130, 246, 0.22);
        border-color: #3b82f6;
        color: #93c5fd;
      }
      html.dark .mm-sp-chip.on {
        background: #2563eb;
        border-color: #3b82f6;
        color: #ffffff;
      }

      /* Markdown Area Dark & Cobalt Polish */
      html.dark #mea-mindmap-container .mindmap-markdown-area {
        background: #0f172a !important;
        color: #f1f5f9 !important;
      }
      html.dark #mea-mindmap-container .mindmap-markdown-area span {
        color: #f1f5f9 !important;
      }
      #mea-mindmap-container .mm-markdown-editor:focus {
        border-color: #2563eb !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16) !important;
      }
      html.dark #mea-mindmap-container .mm-markdown-editor {
        background: #162033 !important;
        border-color: #334155 !important;
        color: #f1f5f9 !important;
      }

      /* Modals (Math Editor, AI Modal, Templates Gallery) — Cobalt & Full Dark Mode */
      .mm-modal-overlay {
        z-index: 10050 !important;
      }
      .mm-modal-card {
        border-radius: 16px !important;
        border: 1px solid #cbd5e1 !important;
      }
      .mm-math-btn:hover {
        background: #eff6ff !important;
        border-color: #2563eb !important;
        color: #1d4ed8 !important;
      }
      .mm-textarea:focus {
        border-color: #2563eb !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2) !important;
      }
      .mm-template-card:hover {
        background: #eff6ff !important;
        border-color: #2563eb !important;
        box-shadow: 0 6px 16px -4px rgba(37, 99, 235, 0.2) !important;
      }
      #mm-ai-provider-badge {
        color: #2563eb !important;
      }

      html.dark .mm-modal-card {
        background: #0f172a !important;
        border-color: #334155 !important;
        color: #f1f5f9 !important;
      }
      html.dark .mm-modal-header,
      html.dark .mm-modal-footer {
        background: #111827 !important;
        border-color: #1e293b !important;
      }
      html.dark .mm-modal-title {
        color: #f8fafc !important;
      }
      html.dark .mm-modal-body,
      html.dark .mm-modal-body div[style*="color:#475569"],
      html.dark .mm-modal-body div[style*="color:#64748b"] {
        color: #cbd5e1 !important;
      }
      html.dark #mm-ai-provider-badge {
        color: #60a5fa !important;
      }
      html.dark .mm-quick-math-bar {
        background: #111827 !important;
        border-color: #1e293b !important;
      }
      html.dark .mm-math-btn {
        background: #1e293b !important;
        border-color: #334155 !important;
        color: #e2e8f0 !important;
      }
      html.dark .mm-math-btn:hover {
        background: rgba(59, 130, 246, 0.22) !important;
        border-color: #3b82f6 !important;
        color: #93c5fd !important;
      }
      html.dark .mm-textarea {
        background: #162033 !important;
        border-color: #334155 !important;
        color: #f8fafc !important;
      }
      html.dark .mm-preview-box {
        background: #162033 !important;
        border-color: #334155 !important;
        color: #f8fafc !important;
      }
      html.dark .mm-preview-box .katex {
        color: #f8fafc !important;
      }
      html.dark .mm-preview-label {
        color: #94a3b8 !important;
      }
      html.dark .mm-template-card {
        background: #162033 !important;
        border-color: #263248 !important;
      }
      html.dark .mm-template-card:hover {
        background: rgba(37, 99, 235, 0.18) !important;
        border-color: #3b82f6 !important;
      }
      html.dark .mm-template-title {
        color: #f8fafc !important;
      }
      html.dark .mm-template-desc {
        color: #cbd5e1 !important;
      }
      html.dark .mm-template-desc .katex {
        color: #e2e8f0 !important;
      }

      /* Clean Export / Capturing Hides Popovers */
      #mea-mindmap-container.mindmap-clean-export .mm-style-popover,
      #mea-mindmap-container.mindmap-capturing .mm-style-popover {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 3C. ENHANCE TOOLBAR, SEARCH, UNDO/REDO, LAYOUT SWITCHER & MODALS NON-DESTRUCTIVELY
  function enhanceStudioChrome() {
    if (typeof document === 'undefined') return;
    injectStudioStyles();

    const container = document.getElementById('mea-mindmap-container');
    if (!container) return;

    // 1. Update brand title & cobalt icon stroke
    const titleBadge = container.querySelector('.mindmap-title-badge');
    if (titleBadge && !titleBadge.dataset.mnUpgraded) {
      titleBadge.dataset.mnUpgraded = '1';
      titleBadge.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
        MinNote Mindmap Studio
      `;
    }

    // 2. Inject Quick Search (Ctrl+F) into top toolbar row
    const topRow = container.querySelector('.mindmap-toolbar-row-top');
    const winControls = topRow ? topRow.querySelector('.window-controls') : null;
    if (topRow && !document.getElementById('mm-search-box')) {
      const searchBox = document.createElement('div');
      searchBox.className = 'mm-search-box';
      searchBox.id = 'mm-search-box';
      searchBox.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" id="mm-search-input" class="mm-search-input" placeholder="Tìm nhánh... (Ctrl+F)" autocomplete="off" />
        <span class="mm-search-count" id="mm-search-count"></span>
        <button type="button" class="mm-search-nav" id="mm-search-prev" title="Kết quả trước (Shift+Enter)">↑</button>
        <button type="button" class="mm-search-nav" id="mm-search-next" title="Kết quả sau (Enter)">↓</button>
        <button type="button" class="mm-search-clear" id="mm-search-clear" title="Xóa tìm kiếm (Esc)">✕</button>
      `;
      if (winControls) topRow.insertBefore(searchBox, winControls);
      else topRow.appendChild(searchBox);

      const input = searchBox.querySelector('#mm-search-input');
      const btnPrev = searchBox.querySelector('#mm-search-prev');
      const btnNext = searchBox.querySelector('#mm-search-next');
      const btnClear = searchBox.querySelector('#mm-search-clear');

      if (input) {
        input.addEventListener('input', () => window.searchMindMap(input.value));
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            window.stepMindMapSearch(e.shiftKey ? -1 : 1);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            window.clearMindMapSearch();
            input.blur();
          }
        });
      }
      if (btnPrev) btnPrev.addEventListener('click', () => window.stepMindMapSearch(-1));
      if (btnNext) btnNext.addEventListener('click', () => window.stepMindMapSearch(1));
      if (btnClear) btnClear.addEventListener('click', () => window.clearMindMapSearch());
    }

    // 3. Inject Undo/Redo + 3 Auto-Layout Switcher into actions toolbar row
    const actionsRow = container.querySelector('.mindmap-toolbar-row-actions');
    if (actionsRow) {
      const firstGroup = actionsRow.querySelector('.mindmap-btn-group');
      if (!document.getElementById('mm-history-group')) {
        const histGroup = document.createElement('div');
        histGroup.className = 'mindmap-btn-group';
        histGroup.id = 'mm-history-group';
        histGroup.innerHTML = `
          <button type="button" class="mm-btn mm-btn-icon-only" id="mm-btn-undo" onclick="window.undoMindMap()" title="Hoàn tác (Ctrl+Z)" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </button>
          <button type="button" class="mm-btn mm-btn-icon-only" id="mm-btn-redo" onclick="window.redoMindMap()" title="Làm lại (Ctrl+Y)" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
          </button>
        `;
        if (firstGroup && firstGroup.nextSibling) {
          actionsRow.insertBefore(histGroup, firstGroup.nextSibling);
        } else {
          actionsRow.appendChild(histGroup);
        }
      }

      if (!document.getElementById('mm-layout-group')) {
        const layoutGroup = document.createElement('div');
        layoutGroup.className = 'mindmap-btn-group';
        layoutGroup.id = 'mm-layout-group';
        layoutGroup.innerHTML = LAYOUT_MODES.map(m => `
          <button type="button" class="mm-btn mm-layout-btn${state.layout === m.id ? ' active' : ''}"
                  data-mm-layout="${m.id}"
                  onclick="window.setMindMapLayout('${m.id}')"
                  title="${m.title}">
            ${m.svg}<span>${m.label}</span>
          </button>
        `).join('');
        const histGroup = document.getElementById('mm-history-group');
        if (histGroup && histGroup.nextSibling) {
          actionsRow.insertBefore(layoutGroup, histGroup.nextSibling);
        } else {
          actionsRow.appendChild(layoutGroup);
        }
      }
    }

    // 4. Rename floating "Căn giữa" button to crisp "Căn vừa"
    const floatBar = container.querySelector('.mindmap-floating-controls');
    if (floatBar) {
      floatBar.querySelectorAll('button').forEach(btn => {
        const txt = (btn.textContent || '').trim();
        if (txt === 'Căn giữa') {
          btn.textContent = 'Căn vừa';
          btn.title = 'Căn vừa toàn bộ sơ đồ vào khung nhìn';
        }
      });
    }

    // 5. Align Modal Header SVG strokes to Cobalt & render KaTeX inside template cards
    ['#mindmap-math-modal', '#mindmap-ai-modal', '#mindmap-templates-modal'].forEach(sel => {
      const m = document.querySelector(sel);
      if (!m) return;
      m.querySelectorAll('.mm-modal-title svg').forEach(svg => {
        svg.setAttribute('stroke', '#2563eb');
      });
    });

    const tplModal = document.getElementById('mindmap-templates-modal');
    if (tplModal && !tplModal.dataset.mnKatexReady) {
      tplModal.dataset.mnKatexReady = '1';
      tplModal.querySelectorAll('.mm-template-desc').forEach(el => {
        const raw = el.textContent || '';
        if (raw.includes('$')) {
          el.innerHTML = renderMathInText(raw);
        }
      });
    }

    updateHistoryButtons();
    updateLayoutButtons();
  }

  // 3D. UNDO / REDO HISTORY STACK (40 STEPS)
  function updateHistoryButtons() {
    const btnUndo = document.getElementById('mm-btn-undo');
    const btnRedo = document.getElementById('mm-btn-redo');
    if (btnUndo) {
      btnUndo.disabled = state.history.length === 0;
      btnUndo.title = state.history.length > 0
        ? `Hoàn tác (Ctrl+Z) • ${state.history.length} bước`
        : 'Hoàn tác (Ctrl+Z)';
    }
    if (btnRedo) {
      btnRedo.disabled = state.future.length === 0;
      btnRedo.title = state.future.length > 0
        ? `Làm lại (Ctrl+Y) • ${state.future.length} bước`
        : 'Làm lại (Ctrl+Y)';
    }
  }

  function updateLayoutButtons() {
    const group = document.getElementById('mm-layout-group');
    if (!group) return;
    group.querySelectorAll('[data-mm-layout]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mm-layout') === state.layout);
    });
  }

  function pushHistory() {
    state.history.push({
      tree: cloneTree(state.tree),
      selectedId: state.selectedId,
      layout: state.layout
    });
    if (state.history.length > MAX_HISTORY) {
      state.history.shift();
    }
    state.future = [];
    updateHistoryButtons();
  }

  window.undoMindMap = function () {
    if (state.history.length === 0) return;
    state.future.push({
      tree: cloneTree(state.tree),
      selectedId: state.selectedId,
      layout: state.layout
    });
    if (state.future.length > MAX_HISTORY) {
      state.future.shift();
    }
    const prev = state.history.pop();
    state.tree = prev.tree;
    state.selectedId = prev.selectedId || 'root';
    state.layout = prev.layout || state.layout;
    state.openStyleNodeId = null;
    updateHistoryButtons();
    updateLayoutButtons();
    refreshSearchMatches(false);
    renderMindMap();
  };

  window.redoMindMap = function () {
    if (state.future.length === 0) return;
    state.history.push({
      tree: cloneTree(state.tree),
      selectedId: state.selectedId,
      layout: state.layout
    });
    if (state.history.length > MAX_HISTORY) {
      state.history.shift();
    }
    const next = state.future.pop();
    state.tree = next.tree;
    state.selectedId = next.selectedId || 'root';
    state.layout = next.layout || state.layout;
    state.openStyleNodeId = null;
    updateHistoryButtons();
    updateLayoutButtons();
    refreshSearchMatches(false);
    renderMindMap();
  };

  // 4. RICH TEXT & KATEX MATH RENDERING
  function renderMathInText(rawText) {
    if (!rawText) return '';
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
      if (rawText[i] === '\\' && i + 1 < len && rawText[i + 1] === '$') {
        out += '$';
        i += 2;
        continue;
      }
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
      if (rawText.substr(i, 2) === '**') {
        const end = rawText.indexOf('**', i + 2);
        if (end !== -1 && !rawText.substring(i + 2, end).includes('\n')) {
          const boldText = rawText.substring(i + 2, end);
          out += `<strong>${renderMathInText(boldText)}</strong>`;
          i = end + 2;
          continue;
        }
      }
      if (rawText[i] === '*' && (i === 0 || rawText[i - 1] !== '*') && (i + 1 < len && rawText[i + 1] !== ' ' && rawText[i + 1] !== '*')) {
        const end = rawText.indexOf('*', i + 1);
        if (end !== -1 && !rawText.substring(i + 1, end).includes('\n') && rawText[end - 1] !== ' ') {
          const italicText = rawText.substring(i + 1, end);
          out += `<em>${renderMathInText(italicText)}</em>`;
          i = end + 1;
          continue;
        }
      }
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

  function renderNodeInnerHtml(node) {
    const badgeHtml = node.badge
      ? `<span class="mm-node-badge">${escapeHtml(node.badge)}</span>`
      : '';
    return `${badgeHtml}<span class="mm-node-body">${renderMathInText(node.text || '')}</span>`;
  }

  // 5. TREE RECURSIVE UTILITIES
  function findNode(node, id) {
    if (!node) return null;
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
    if (!root || !root.children) return null;
    for (let child of root.children) {
      if (child.id === childId) return root;
      const res = findParentNode(child, childId);
      if (res) return res;
    }
    return null;
  }

  function countDescendants(node) {
    if (!node || !node.children || node.children.length === 0) return 0;
    let total = 0;
    for (let child of node.children) {
      total += 1 + countDescendants(child);
    }
    return total;
  }

  function expandAncestorsOf(root, targetId) {
    if (!root) return false;
    if (root.id === targetId) return true;
    if (!root.children) return false;
    for (let child of root.children) {
      if (expandAncestorsOf(child, targetId)) {
        root.expanded = true;
        return true;
      }
    }
    return false;
  }

  function generateUniqueId() {
    return 'node_' + Math.random().toString(36).substring(2, 9);
  }

  // 6. MULTI-LAYOUT TREE COMPUTATION ('right' | 'mindmap' | 'down')
  function calculateLayout(rootNode, layoutOverride) {
    const layout = layoutOverride || state.layout || 'right';
    const H_GAP = 76;        // Horizontal gap between levels in right/mindmap layouts
    const V_GAP = 24;        // Vertical gap between sibling branches in right/mindmap layouts
    const V_LEVEL_GAP = 68;  // Vertical gap between levels in top-down layout
    const H_SIB_GAP = 26;    // Horizontal gap between siblings in top-down layout

    let measureBox = document.getElementById('mm-measure-box');
    if (!measureBox && typeof document !== 'undefined') {
      measureBox = document.createElement('div');
      measureBox.id = 'mm-measure-box';
      measureBox.style.cssText = 'position:fixed; visibility:hidden; pointer-events:none; left:-9999px; top:-9999px; width:max-content; max-width:660px; z-index:-1;';
      document.body.appendChild(measureBox);
    }

    function measureNode(node, level = 0) {
      node.level = level;
      const shape = node.shape || 'card';
      const maxW = (layout === 'down' && level > 0) ? 340 : 580;
      let w = 0, h = 0;

      if (measureBox) {
        const card = document.createElement('div');
        card.className = `mm-node-card level-${level} shape-${shape}`;
        const fontSize = level === 0 ? '15.5px' : (level === 1 ? '13.5px' : '13px');
        const fontWeight = level === 0 ? '700' : (level === 1 ? '600' : '400');
        const pad = level === 0
          ? (shape === 'pill' ? '12px 26px' : '12px 22px')
          : (shape === 'pill' ? '9px 20px' : (shape === 'underline' ? '6px 12px' : '9px 16px'));
        card.style.cssText = `display:inline-block; position:static; width:max-content; max-width:${maxW}px; min-width:96px; box-sizing:border-box; visibility:hidden; padding:${pad}; font-size:${fontSize}; font-weight:${fontWeight}; line-height:1.5; font-family:"Be Vietnam Pro","Segoe UI",system-ui,sans-serif;`;
        card.innerHTML = `<div class="mm-node-text" style="display:flex;align-items:center;gap:6px;">${renderNodeInnerHtml(node)}</div>`;
        // Match enlarged KaTeX font size during measurement
        card.querySelectorAll('.katex').forEach(k => { k.style.fontSize = '1.14em'; });
        measureBox.appendChild(card);
        const rect = card.getBoundingClientRect();
        if (rect && rect.width > 20) {
          w = Math.ceil(rect.width) + 20;
          h = Math.ceil(rect.height) + 6;
        }
        measureBox.removeChild(card);
      }

      if (!w) {
        const rawText = node.text || '';
        const mathBlocks = rawText.match(/\$\$[\s\S]*?\$\$|\$[^$]*\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\)/g) || [];
        let formulaChars = 0;
        mathBlocks.forEach(b => { formulaChars += Math.max(26, b.length * 0.8); });
        const plainText = rawText.replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\)/g, '');
        const badgeExtra = node.badge ? 24 : 0;
        const totalEst = plainText.length * 9 + formulaChars * 8.5 + 52 + badgeExtra;
        w = Math.min(maxW, Math.max(120, totalEst));
        h = 46 + (rawText.includes('\n') || rawText.includes('\\begin') || rawText.includes('\\frac') ? 36 : 0);
      }

      node.w = Math.max(level === 0 ? 190 : 108, w);
      node.h = Math.max(level === 0 ? 52 : 42, h);

      if (node.children && node.children.length > 0 && node.expanded !== false) {
        let totalChildHeight = 0;
        let totalChildWidth = 0;
        node.children.forEach((c) => {
          measureNode(c, level + 1);
          totalChildHeight += c.subtreeHeight || c.h;
          totalChildWidth += c.subtreeWidth || c.w;
        });
        totalChildHeight += (node.children.length - 1) * V_GAP;
        totalChildWidth += (node.children.length - 1) * H_SIB_GAP;
        node.subtreeHeight = Math.max(node.h, totalChildHeight);
        node.subtreeWidth = Math.max(node.w, totalChildWidth);
      } else {
        node.subtreeHeight = node.h;
        node.subtreeWidth = node.w;
      }
    }

    measureNode(rootNode, 0);

    // Step 2: Position nodes according to selected auto-layout
    function positionHorizontalBranch(node, x, y, dir) {
      node.x = x;
      node.y = y;
      node._side = dir === -1 ? 'left' : 'right';
      if (node.children && node.children.length > 0 && node.expanded !== false) {
        let startY = y + node.h / 2 - node.subtreeHeight / 2;
        node.children.forEach((child) => {
          const childH = child.subtreeHeight || child.h;
          const childY = startY + childH / 2 - child.h / 2;
          const childX = dir === -1
            ? (x - H_GAP - child.w)
            : (x + node.w + H_GAP);
          positionHorizontalBranch(child, childX, childY, dir);
          startY += childH + V_GAP;
        });
      }
    }

    function positionDownBranch(node, x, y) {
      node.x = x;
      node.y = y;
      node._side = 'down';
      if (node.children && node.children.length > 0 && node.expanded !== false) {
        let startX = x + node.w / 2 - node.subtreeWidth / 2;
        node.children.forEach((child) => {
          const childW = child.subtreeWidth || child.w;
          const childX = startX + childW / 2 - child.w / 2;
          const childY = y + node.h + V_LEVEL_GAP;
          positionDownBranch(child, childX, childY);
          startX += childW + H_SIB_GAP;
        });
      }
    }

    if (layout === 'down') {
      positionDownBranch(rootNode, 0, 0);
    } else if (layout === 'mindmap') {
      rootNode.x = 0;
      rootNode.y = 0;
      rootNode._side = 'center';
      if (rootNode.children && rootNode.children.length > 0 && rootNode.expanded !== false) {
        const kids = rootNode.children;
        let rightKids = [];
        let leftKids = [];
        if (kids.length === 1) {
          rightKids = [kids[0]];
        } else {
          // Balanced contiguous height partition so reading order stays intuitive & both sides balance!
          const heights = kids.map(c => c.subtreeHeight || c.h);
          let bestK = Math.ceil(kids.length / 2);
          let bestDiff = Infinity;
          for (let k = 1; k < kids.length; k++) {
            const rh = heights.slice(0, k).reduce((a, b) => a + b, 0) + Math.max(0, k - 1) * V_GAP;
            const lh = heights.slice(k).reduce((a, b) => a + b, 0) + Math.max(0, kids.length - k - 1) * V_GAP;
            const diff = Math.abs(rh - lh);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestK = k;
            }
          }
          rightKids = kids.slice(0, bestK);
          leftKids = kids.slice(bestK);
        }

        const rootCenterY = rootNode.y + rootNode.h / 2;
        const rightTotalH = rightKids.reduce((s, c) => s + (c.subtreeHeight || c.h), 0) + Math.max(0, rightKids.length - 1) * V_GAP;
        let ry = rootCenterY - rightTotalH / 2;
        rightKids.forEach(child => {
          const ch = child.subtreeHeight || child.h;
          positionHorizontalBranch(child, rootNode.x + rootNode.w + H_GAP, ry + ch / 2 - child.h / 2, 1);
          ry += ch + V_GAP;
        });

        const leftTotalH = leftKids.reduce((s, c) => s + (c.subtreeHeight || c.h), 0) + Math.max(0, leftKids.length - 1) * V_GAP;
        let ly = rootCenterY - leftTotalH / 2;
        leftKids.forEach(child => {
          const ch = child.subtreeHeight || child.h;
          positionHorizontalBranch(child, rootNode.x - H_GAP - child.w, ly + ch / 2 - child.h / 2, -1);
          ly += ch + V_GAP;
        });
      }
    } else {
      // Default: 'right' (Cây ngang)
      positionHorizontalBranch(rootNode, 60, 0, 1);
    }

    // Step 3: Find bounding box of ALL visible nodes
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

    // Step 4: Normalize coordinates to start cleanly at (80, 80)
    const shiftX = 80 - minX;
    const shiftY = 80 - minY;
    function applyShift(node) {
      node.x += shiftX;
      node.y += shiftY;
      if (node.children && node.children.length > 0 && node.expanded !== false) {
        node.children.forEach(applyShift);
      }
    }
    applyShift(rootNode);

    state.bounds = {
      minX: 80,
      minY: 80,
      maxX: maxX + shiftX,
      maxY: maxY + shiftY,
      width: Math.max(100, maxX - minX),
      height: Math.max(100, maxY - minY)
    };
  }

  function buildConnectorPath(parent, child, ox, oy, layout) {
    if (layout === 'down') {
      const sx = (parent.x + parent.w / 2) - ox;
      const sy = (parent.y + parent.h) - oy;
      const ex = (child.x + child.w / 2) - ox;
      const ey = child.y - oy;
      const cy1 = sy + (ey - sy) * 0.5;
      const cy2 = ey - (ey - sy) * 0.5;
      return `M ${sx} ${sy} C ${sx} ${cy1}, ${ex} ${cy2}, ${ex} ${ey}`;
    }
    if (child._side === 'left') {
      const sx = parent.x - ox;
      const sy = (parent.y + parent.h / 2) - oy;
      const ex = (child.x + child.w) - ox;
      const ey = (child.y + child.h / 2) - oy;
      const dx = Math.abs(sx - ex) * 0.45;
      return `M ${sx} ${sy} C ${sx - dx} ${sy}, ${ex + dx} ${ey}, ${ex} ${ey}`;
    }
    const sx = (parent.x + parent.w) - ox;
    const sy = (parent.y + parent.h / 2) - oy;
    const ex = child.x - ox;
    const ey = (child.y + child.h / 2) - oy;
    const dx = Math.abs(ex - sx) * 0.45;
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${ex - dx} ${ey}, ${ex} ${ey}`;
  }

  // 7. RENDER VISUAL SVG & HTML CARDS
  function renderMindMap(opts = {}) {
    const svgWrap = document.getElementById('mindmap-svg-wrap');
    if (!svgWrap) return;

    const layout = state.layout || 'right';
    calculateLayout(state.tree, layout);

    const activeMatchId = (state.searchMatches.length > 0 && state.searchIndex >= 0)
      ? state.searchMatches[state.searchIndex]
      : null;
    const matchSet = state.searchMatches.length > 0 ? new Set(state.searchMatches) : null;

    let pathsHtml = '';
    let nodesHtml = '';

    function traverse(node, inheritedColor) {
      const nodeColor = getNodeColor(node, inheritedColor);
      if (node.children && node.children.length > 0 && node.expanded !== false) {
        node.children.forEach((child) => {
          const childColor = getNodeColor(child, nodeColor);
          const d = buildConnectorPath(node, child, 0, 0, layout);
          pathsHtml += `
            <path d="${d}" fill="none" stroke="${childColor}" stroke-width="2.4" stroke-linecap="round" opacity="0.88" />
          `;
          traverse(child, nodeColor);
        });
      }

      const isSelected = state.selectedId === node.id;
      const isStyleOpen = state.openStyleNodeId === node.id;
      const hasChildren = node.children && node.children.length > 0;
      const isCollapsed = hasChildren && node.expanded === false;
      const hiddenDesc = isCollapsed ? countDescendants(node) : 0;
      const shape = node.shape || 'card';
      const badge = node.badge || '';
      const side = node._side || 'right';
      const isMatch = matchSet && matchSet.has(node.id);
      const isCurrentMatch = activeMatchId === node.id;

      const cardClasses = [
        'mm-node-card',
        `level-${node.level}`,
        `shape-${shape}`,
        `side-${side}`,
        isSelected ? 'selected' : '',
        isMatch ? 'mm-search-match' : '',
        isCurrentMatch ? 'mm-search-current' : ''
      ].filter(Boolean).join(' ');

      nodesHtml += `
        <div class="${cardClasses}"
             id="mm-card-${node.id}"
             style="position: absolute; left: ${node.x}px; top: ${node.y}px; width: ${node.w}px; min-height: ${node.h}px; box-sizing: border-box; --node-color: ${nodeColor};"
             onclick="window.selectMindMapNode('${node.id}', event)"
             ondblclick="window.openMathEditor('${node.id}', event)">
          <div class="mm-node-actions">
            <button class="mm-action-btn" onclick="window.addChildNode('${node.id}', event)" title="Thêm nhánh con (Tab)">+ Con</button>
            <button class="mm-action-btn" onclick="window.addSiblingNode('${node.id}', event)" title="Thêm cùng cấp (Enter)">+ Cùng cấp</button>
            <button class="mm-action-btn" onclick="window.openMathEditor('${node.id}', event)" title="Sửa nội dung &amp; công thức (F2)">✏ Sửa</button>
            <button class="mm-action-btn" onclick="window.toggleColorPalette('${node.id}', event)" title="Màu, hình dáng &amp; nhãn Toán">🎨 Kiểu</button>
            ${node.id !== 'root' ? `<button class="mm-action-btn btn-del" onclick="window.deleteNode('${node.id}', event)" title="Xóa nhánh (Del)">🗑</button>` : ''}
          </div>
          <div class="mm-style-popover mm-color-palette ${isStyleOpen ? 'open' : ''}" id="mm-palette-${node.id}" onclick="event.stopPropagation()">
            <div class="mm-sp-sec">
              <span class="mm-sp-lbl">Màu nhánh</span>
              <div class="mm-sp-colors">
                ${THEME_COLORS.map(c => `<div class="mm-color-dot ${nodeColor.toLowerCase() === c.toLowerCase() ? 'on' : ''}" style="background:${c};" onclick="window.setNodeColor('${node.id}', '${c}', event)" title="${c}"></div>`).join('')}
              </div>
            </div>
            <div class="mm-sp-sec">
              <span class="mm-sp-lbl">Hình dáng</span>
              <div class="mm-sp-row">
                ${NODE_SHAPES.map(s => `<button type="button" class="mm-sp-chip ${shape === s.id ? 'on' : ''}" onclick="window.setNodeShape('${node.id}', '${s.id}', event)">${s.label}</button>`).join('')}
              </div>
            </div>
            <div class="mm-sp-sec">
              <span class="mm-sp-lbl">Nhãn Toán học</span>
              <div class="mm-sp-row">
                ${NODE_BADGES.map(b => `<button type="button" class="mm-sp-chip ${badge === b.id ? 'on' : ''}" onclick="window.setNodeBadge('${node.id}', '${b.id}', event)" title="${b.label}">${b.icon}</button>`).join('')}
              </div>
            </div>
          </div>
          <div class="mm-node-text">${renderNodeInnerHtml(node)}</div>
          ${hasChildren ? `
            <div class="mm-collapse-badge side-${side} ${isCollapsed ? 'is-collapsed' : ''}"
                 onclick="window.toggleNodeExpand('${node.id}', event)"
                 title="${isCollapsed ? `Mở rộng ${hiddenDesc} nhánh ẩn` : 'Thu gọn nhánh'}">
              ${isCollapsed ? `+${hiddenDesc}` : '−'}
            </div>
          ` : ''}
        </div>
      `;
    }

    traverse(state.tree, '#2563eb');

    const svgW = Math.max(1200, Math.ceil((state.bounds ? state.bounds.maxX : 1200) + 180));
    const svgH = Math.max(800, Math.ceil((state.bounds ? state.bounds.maxY : 800) + 180));

    let viewport = document.getElementById('mindmap-viewport');
    let zoomLayer = document.getElementById('mindmap-zoom-layer');
    let edgesSvg = document.getElementById('mm-edges-svg');
    let nodesLayer = document.getElementById('mm-nodes-layer');

    if (!viewport || !zoomLayer || !edgesSvg || !nodesLayer) {
      svgWrap.innerHTML = `
        <div id="mindmap-viewport" style="transform: translate(${Math.round(state.pan.x)}px, ${Math.round(state.pan.y)}px); transform-origin: 0 0; position: absolute; top:0; left:0; width: ${svgW}px; height: ${svgH}px;">
          <div id="mindmap-zoom-layer" style="zoom: ${state.zoom}; position: relative; width: ${svgW}px; height: ${svgH}px;">
            <svg id="mm-edges-svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" shape-rendering="geometricPrecision" style="position: absolute; top:0; left:0; width: ${svgW}px; height: ${svgH}px; pointer-events: none; overflow: visible;"></svg>
            <div id="mm-nodes-layer" style="position: absolute; top:0; left:0; width: ${svgW}px; height: ${svgH}px;"></div>
          </div>
        </div>
      `;
      viewport = document.getElementById('mindmap-viewport');
      zoomLayer = document.getElementById('mindmap-zoom-layer');
      edgesSvg = document.getElementById('mm-edges-svg');
      nodesLayer = document.getElementById('mm-nodes-layer');
    }

    if (opts.smooth) {
      viewport.classList.add('mm-smooth-pan');
      if (_smoothTimer) clearTimeout(_smoothTimer);
      _smoothTimer = setTimeout(() => {
        if (viewport) viewport.classList.remove('mm-smooth-pan');
      }, 300);
    } else {
      viewport.classList.remove('mm-smooth-pan');
    }

    viewport.style.width = `${svgW}px`;
    viewport.style.height = `${svgH}px`;
    viewport.style.transform = `translate(${Math.round(state.pan.x)}px, ${Math.round(state.pan.y)}px)`;

    zoomLayer.style.width = `${svgW}px`;
    zoomLayer.style.height = `${svgH}px`;
    zoomLayer.style.zoom = String(state.zoom);

    edgesSvg.setAttribute('width', String(svgW));
    edgesSvg.setAttribute('height', String(svgH));
    edgesSvg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    edgesSvg.style.width = `${svgW}px`;
    edgesSvg.style.height = `${svgH}px`;
    edgesSvg.innerHTML = pathsHtml;

    nodesLayer.style.width = `${svgW}px`;
    nodesLayer.style.height = `${svgH}px`;
    nodesLayer.innerHTML = nodesHtml;

    const zoomLabel = document.getElementById('mindmap-zoom-label');
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
    }
  }

  function applyMindmapViewportTransform(smooth = false) {
    const viewport = document.getElementById('mindmap-viewport');
    if (viewport) {
      if (smooth) {
        viewport.classList.add('mm-smooth-pan');
        if (_smoothTimer) clearTimeout(_smoothTimer);
        _smoothTimer = setTimeout(() => viewport.classList.remove('mm-smooth-pan'), 300);
      } else {
        viewport.classList.remove('mm-smooth-pan');
      }
      viewport.style.transform = `translate(${Math.round(state.pan.x)}px, ${Math.round(state.pan.y)}px)`;
    }
    const zoomLayer = document.getElementById('mindmap-zoom-layer');
    if (zoomLayer) {
      zoomLayer.style.zoom = String(state.zoom);
    }
    const zoomLabel = document.getElementById('mindmap-zoom-label');
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
    }
  }

  function focusNodeInView(nodeId, smooth = true) {
    const node = findNode(state.tree, nodeId);
    const canvas = document.getElementById('mindmap-canvas-area');
    if (!node || !canvas) return;
    if (state.zoom < 0.75) {
      state.zoom = 0.9;
    }
    const cw = canvas.clientWidth || 800;
    const ch = canvas.clientHeight || 600;
    const cx = node.x + (node.w || 140) / 2;
    const cy = node.y + (node.h || 44) / 2;
    state.pan.x = Math.round(cw / 2 - cx * state.zoom);
    state.pan.y = Math.round(ch / 2 - cy * state.zoom);
    applyMindmapViewportTransform(smooth);
  }

  // 7B. AUTO-LAYOUT SWITCHER & QUICK SEARCH (Ctrl+F)
  window.setMindMapLayout = function (layout) {
    if (!['right', 'mindmap', 'down'].includes(layout)) return;
    if (state.layout === layout) {
      window.fitMindMapView(true);
      return;
    }
    pushHistory();
    state.layout = layout;
    state.openStyleNodeId = null;
    updateLayoutButtons();
    window.fitMindMapView(true);
  };

  function collectSearchMatches(query) {
    const qRaw = (query || '').trim().toLowerCase();
    if (!qRaw) return [];
    const qNorm = normalizeSearchText(qRaw);
    const matches = [];
    function walk(node) {
      if (!node) return;
      const text = node.text || '';
      if (text.toLowerCase().includes(qRaw) || normalizeSearchText(text).includes(qNorm)) {
        matches.push(node.id);
      }
      if (node.children) {
        node.children.forEach(walk);
      }
    }
    walk(state.tree);
    return matches;
  }

  function updateSearchUi() {
    const box = document.getElementById('mm-search-box');
    const countEl = document.getElementById('mm-search-count');
    const hasQuery = !!(state.searchQuery && state.searchQuery.trim());
    if (box) box.classList.toggle('has-query', hasQuery);
    if (countEl) {
      if (!hasQuery) {
        countEl.textContent = '';
        countEl.classList.remove('no-match');
      } else if (state.searchMatches.length === 0) {
        countEl.textContent = '0/0';
        countEl.classList.add('no-match');
      } else {
        countEl.textContent = `${state.searchIndex + 1}/${state.searchMatches.length}`;
        countEl.classList.remove('no-match');
      }
    }
  }

  function refreshSearchMatches(jumpToFirst) {
    state.searchMatches = collectSearchMatches(state.searchQuery);
    if (state.searchMatches.length === 0) {
      state.searchIndex = -1;
    } else if (jumpToFirst || state.searchIndex < 0 || state.searchIndex >= state.searchMatches.length) {
      state.searchIndex = 0;
    }
    updateSearchUi();
  }

  window.searchMindMap = function (query) {
    state.searchQuery = query || '';
    refreshSearchMatches(true);
    if (state.searchMatches.length > 0 && state.searchIndex >= 0) {
      const targetId = state.searchMatches[state.searchIndex];
      expandAncestorsOf(state.tree, targetId);
      state.selectedId = targetId;
      renderMindMap({ smooth: true });
      focusNodeInView(targetId, true);
    } else {
      renderMindMap();
    }
  };

  window.stepMindMapSearch = function (delta) {
    if (state.searchMatches.length === 0) return;
    const len = state.searchMatches.length;
    state.searchIndex = (state.searchIndex + (delta || 1) + len) % len;
    const targetId = state.searchMatches[state.searchIndex];
    expandAncestorsOf(state.tree, targetId);
    state.selectedId = targetId;
    updateSearchUi();
    renderMindMap({ smooth: true });
    focusNodeInView(targetId, true);
  };

  window.clearMindMapSearch = function () {
    state.searchQuery = '';
    state.searchMatches = [];
    state.searchIndex = -1;
    const input = document.getElementById('mm-search-input');
    if (input) input.value = '';
    updateSearchUi();
    renderMindMap();
  };

  window.focusMindMapSearch = function () {
    if (state.view !== 'visual') {
      window.toggleMarkdownView();
    }
    const input = document.getElementById('mm-search-input');
    if (input) {
      input.focus();
      input.select();
    }
  };

  // 8. INTERACTIVE NODE OPERATIONS
  window.selectMindMapNode = function (id, e) {
    if (e) e.stopPropagation();
    if (state.openStyleNodeId && state.openStyleNodeId !== id) {
      state.openStyleNodeId = null;
    }
    state.selectedId = id;
    renderMindMap();
  };

  window.addChildNode = function (parentId, e) {
    if (e) e.stopPropagation();
    const parent = findNode(state.tree, parentId || state.selectedId || 'root');
    if (!parent) return;
    pushHistory();
    if (!parent.children) parent.children = [];
    parent.expanded = true;
    const newId = generateUniqueId();
    const color = parent.id === 'root'
      ? THEME_COLORS[(parent.children.length + 1) % THEME_COLORS.length]
      : (parent.color || '#2563eb');
    parent.children.push({
      id: newId,
      text: 'Nhánh con mới: $f(x)$',
      color: color,
      expanded: true
    });
    state.selectedId = newId;
    state.openStyleNodeId = null;
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
    pushHistory();
    const newId = generateUniqueId();
    const idx = parent.children.findIndex(c => c.id === targetId);
    const siblingColor = parent.id === 'root'
      ? THEME_COLORS[(parent.children.length + 1) % THEME_COLORS.length]
      : (parent.children[idx]?.color || parent.color || '#2563eb');
    parent.children.splice(idx + 1, 0, {
      id: newId,
      text: 'Ý kiến thức mới',
      color: siblingColor,
      expanded: true
    });
    state.selectedId = newId;
    state.openStyleNodeId = null;
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
    pushHistory();
    parent.children = parent.children.filter(c => c.id !== targetId);
    state.selectedId = parent.id;
    if (state.openStyleNodeId === targetId) state.openStyleNodeId = null;
    refreshSearchMatches(false);
    renderMindMap();
    window.showToast('Đã xóa nhánh (Ctrl+Z để hoàn tác).', 'info');
  };

  window.toggleNodeExpand = function (id, e) {
    if (e) e.stopPropagation();
    const node = findNode(state.tree, id);
    if (!node) return;
    node.expanded = node.expanded === false ? true : false;
    renderMindMap();
  };

  window.toggleAllMindMapNodes = function (expand) {
    function walk(node) {
      if (!node) return;
      if (node.id !== 'root' && node.children && node.children.length > 0) {
        node.expanded = !!expand;
      }
      if (node.children) node.children.forEach(walk);
    }
    walk(state.tree);
    renderMindMap();
    window.fitMindMapView(true);
  };

  window.toggleColorPalette = function (id, e) {
    if (e) e.stopPropagation();
    const targetId = id || state.selectedId;
    state.selectedId = targetId;
    state.openStyleNodeId = (state.openStyleNodeId === targetId) ? null : targetId;
    renderMindMap();
  };

  window.setNodeColor = function (id, color, e) {
    if (e) e.stopPropagation();
    const node = findNode(state.tree, id);
    if (!node) return;
    pushHistory();
    node.color = color;
    if (node.children) {
      node.children.forEach(c => { c.color = color; });
    }
    renderMindMap();
  };

  window.setNodeShape = function (id, shape, e) {
    if (e) e.stopPropagation();
    const node = findNode(state.tree, id);
    if (!node || !['card', 'pill', 'underline'].includes(shape)) return;
    pushHistory();
    node.shape = shape;
    renderMindMap();
  };

  window.setNodeBadge = function (id, badge, e) {
    if (e) e.stopPropagation();
    const node = findNode(state.tree, id);
    if (!node) return;
    pushHistory();
    if (badge) node.badge = badge;
    else delete node.badge;
    renderMindMap();
  };

  // 9. MATH FORMULA EDITOR MODAL
  window.openMathEditor = function (id, e) {
    if (e) e.stopPropagation();
    const targetId = id || state.selectedId || 'root';
    const node = findNode(state.tree, targetId);
    if (!node) return;
    state.editingNodeId = targetId;
    state.openStyleNodeId = null;
    const modal = document.getElementById('mindmap-math-modal');
    const textarea = document.getElementById('mm-math-input');
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
        const nextText = textarea.value.trim() || 'Nội dung';
        if (nextText !== node.text) {
          pushHistory();
          node.text = nextText;
          refreshSearchMatches(false);
          renderMindMap();
        }
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
    const prefix = node.badge ? `${node.badge} ` : '';
    if (level === 0) {
      md += `# ${prefix}${node.text}\n\n`;
    } else if (level === 1) {
      md += `## ${prefix}${node.text}\n`;
    } else {
      md += `${indent}- ${prefix}${node.text}\n`;
    }
    if (node.children) {
      node.children.forEach(c => {
        md += treeToMarkdown(c, level + 1);
      });
    }
    return md;
  }

  function extractLeadingBadge(text) {
    for (const b of NODE_BADGES) {
      if (b.id && text.startsWith(b.id + ' ')) {
        return { badge: b.id, text: text.slice(b.id.length + 1).trim() };
      }
    }
    return { badge: '', text };
  }

  function markdownToTree(mdText) {
    const lines = mdText.split('\n');
    let root = null;
    let stack = [];
    let branchCount = 0;
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let level = 0;
      let rawText = '';
      if (trimmed.startsWith('# ')) {
        level = 0;
        rawText = trimmed.substring(2).trim();
      } else if (trimmed.startsWith('## ')) {
        level = 1;
        rawText = trimmed.substring(3).trim();
      } else if (trimmed.startsWith('### ')) {
        level = 2;
        rawText = trimmed.substring(4).trim();
      } else if (line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/)) {
        const m = line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/);
        const spaces = m[1].replace(/\t/g, '  ').length;
        level = 2 + Math.floor(spaces / 2);
        rawText = m[2].trim();
      } else {
        return;
      }
      const parsed = extractLeadingBadge(rawText);
      const newNode = {
        id: generateUniqueId(),
        text: parsed.text || rawText,
        color: level === 1 ? THEME_COLORS[(branchCount++ % (THEME_COLORS.length - 1)) + 1] : undefined,
        expanded: true,
        children: []
      };
      if (parsed.badge) newNode.badge = parsed.badge;

      if (!root || level === 0) {
        root = newNode;
        root.id = 'root';
        root.color = '#2563eb';
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
        mdEditor.dataset.origMd = mdEditor.value;
      }
      if (canvasArea) canvasArea.style.display = 'none';
      if (mdArea) mdArea.classList.add('active');
      if (btnToggle) btnToggle.textContent = '🖼 Xem Đồ Họa';
    } else {
      state.view = 'visual';
      const mdEditor = document.getElementById('mm-markdown-input');
      if (mdEditor && mdEditor.value.trim() && mdEditor.value !== mdEditor.dataset.origMd) {
        pushHistory();
        state.tree = markdownToTree(mdEditor.value);
        state.selectedId = 'root';
      }
      if (canvasArea) canvasArea.style.display = 'block';
      if (mdArea) mdArea.classList.remove('active');
      if (btnToggle) btnToggle.textContent = '📝 Dàn ý';
      refreshSearchMatches(false);
      renderMindMap();
      window.fitMindMapView(true);
    }
  };

  window.applyMarkdownToTree = function () {
    const mdEditor = document.getElementById('mm-markdown-input');
    if (mdEditor && mdEditor.value.trim()) {
      pushHistory();
      state.tree = markdownToTree(mdEditor.value);
      state.selectedId = 'root';
      mdEditor.dataset.origMd = mdEditor.value;
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
    setTimeout(() => {
      const inp = document.getElementById('mm-ai-topic-input');
      if (inp) inp.focus();
    }, 40);
  };

  window.closeAiMindmapModal = function () {
    const modal = document.getElementById('mindmap-ai-modal');
    if (modal) modal.style.display = 'none';
  };

  window.generateAiMindmap = async function () {
    const input = document.getElementById('mm-ai-topic-input');
    const topic = input ? input.value.trim() : '';
    if (!topic) {
      if (window.meaAlert) window.meaAlert('Vui lòng nhập chủ đề hoặc bài học cần tạo sơ đồ tư duy!');
      else window.showToast('Vui lòng nhập chủ đề hoặc bài học cần tạo sơ đồ tư duy!', 'warning');
      return;
    }
    const btnGen = document.getElementById('btn-exec-ai-gen');
    if (btnGen) {
      btnGen.disabled = true;
      btnGen.innerHTML = '<span>⏳ AI đang tư duy &amp; phân nhánh...</span>';
    }
    // 1. Desktop C# WebView2 bridge
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage({
        type: 'GENERATE_AI_MINDMAP',
        topic: topic
      });
      return;
    }
    // 2. Standalone Web Fallback
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
      btnGen.innerHTML = '✨ Tạo sơ đồ ngay';
    }
    if (!markdownText || !markdownText.trim()) {
      window.showToast('AI không trả về nội dung sơ đồ tư duy hợp lệ!', 'warning');
      return;
    }
    pushHistory();
    state.tree = markdownToTree(markdownText.trim());
    state.selectedId = 'root';
    state.openStyleNodeId = null;
    refreshSearchMatches(false);
    renderMindMap();
    window.fitMindMapView(true);
    window.closeAiMindmapModal();
    window.showToast('Đã tạo sơ đồ tư duy bằng AI thành công!', 'success');
  };

  window.onAiMindmapError = function (errorMessage) {
    const btnGen = document.getElementById('btn-exec-ai-gen');
    if (btnGen) {
      btnGen.disabled = false;
      btnGen.innerHTML = '✨ Tạo sơ đồ ngay';
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
      pushHistory();
      state.tree = cloneTree(MATH_TEMPLATES[key].data);
      state.selectedId = 'root';
      state.openStyleNodeId = null;
      refreshSearchMatches(false);
      renderMindMap();
      window.fitMindMapView(true);
      window.closeTemplatesModal();
    }
  };

  // 13. EXPORT & INTEGRATION WITH WHITEBOARD / WORD / PNG / SVG
  let _cachedEmbeddedKatexCss = null;
  let _embeddingKatexPromise = null;

  async function ensureEmbeddedKatexCss() {
    if (_cachedEmbeddedKatexCss !== null) return _cachedEmbeddedKatexCss;
    if (_embeddingKatexPromise) return _embeddingKatexPromise;
    _embeddingKatexPromise = (async () => {
      try {
        const cssResp = await fetch('./katex.min.css');
        if (!cssResp.ok) throw new Error('katex.min.css HTTP ' + cssResp.status);
        let cssText = await cssResp.text();
        const urlRegex = /url\(["']?([^"')]+\.woff2)["']?\)/g;
        const seen = new Map();
        const matches = [...cssText.matchAll(urlRegex)];
        await Promise.all(matches.map(async (m) => {
          const rel = m[1];
          if (seen.has(rel)) return;
          seen.set(rel, null);
          try {
            const fr = await fetch(rel);
            if (!fr.ok) return;
            const buf = await fr.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let bin = '';
            const chunk = 0x8000;
            for (let i = 0; i < bytes.length; i += chunk) {
              bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
            }
            seen.set(rel, 'data:font/woff2;base64,' + btoa(bin));
          } catch (_) {}
        }));
        cssText = cssText.replace(
          /url\(["']?([^"')]+\.woff2)["']?\)\s*format\(["']woff2["']\)(?:,\s*url\([^)]+\)\s*format\([^)]+\))*/g,
          (_, rel) => {
            const dataUrl = seen.get(rel);
            return dataUrl ? `url("${dataUrl}") format("woff2")` : `url("${rel}") format("woff2")`;
          }
        );
        _cachedEmbeddedKatexCss = cssText;
      } catch (err) {
        console.warn('[Mindmap] ensureEmbeddedKatexCss fallback:', err);
        _cachedEmbeddedKatexCss = '';
      } finally {
        _embeddingKatexPromise = null;
      }
      return _cachedEmbeddedKatexCss;
    })();
    return _embeddingKatexPromise;
  }

  window.ensureEmbeddedKatexCss = ensureEmbeddedKatexCss;
  setTimeout(() => { ensureEmbeddedKatexCss(); }, 400);

  function buildMindmapExportCss() {
    const katexCss = _cachedEmbeddedKatexCss || '';
    return `
      ${katexCss}
      * { box-sizing: border-box; }
      .katex-mathml { display: none !important; }
      .katex-html { display: inline-block; }
      .mm-node-card {
        position: absolute;
        padding: 9px 16px;
        border-radius: 12px;
        background: #ffffff;
        border: 1.75px solid var(--node-color, #2563eb);
        box-shadow: 0 3px 10px -2px rgba(15, 23, 42, 0.09);
        display: inline-block;
        max-width: 580px;
        min-width: 96px;
        box-sizing: border-box;
        font-family: "Be Vietnam Pro", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        overflow: visible;
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
      }
      .mm-node-card.level-0 {
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
        color: #ffffff;
        border: 2px solid #60a5fa;
        box-shadow: 0 8px 22px -6px rgba(37, 99, 235, 0.45);
        padding: 12px 22px;
        border-radius: 14px;
        font-size: 15.5px;
        font-weight: 700;
        text-align: center;
      }
      .mm-node-card.level-0 .katex,
      .mm-node-card.level-0 .katex * {
        color: #ffffff !important;
      }
      .mm-node-card.level-1 {
        background: #ffffff;
        border-width: 2px;
        font-size: 13.5px;
        font-weight: 600;
        color: #0f172a;
      }
      .mm-node-card.level-2,
      .mm-node-card.level-3,
      .mm-node-card.level-4 {
        background: #ffffff;
        border-left-width: 4px;
        font-size: 13px;
        line-height: 1.5;
        color: #1e293b;
      }
      .mm-node-card.side-left.level-2,
      .mm-node-card.side-left.level-3,
      .mm-node-card.side-left.level-4 {
        border-left-width: 1.75px;
        border-right-width: 4px;
      }
      .mm-node-card.shape-pill {
        border-radius: 999px;
        padding-left: 20px;
        padding-right: 20px;
      }
      .mm-node-card.shape-underline {
        background: transparent;
        border: 0;
        border-bottom: 3px solid var(--node-color, #2563eb);
        border-radius: 6px 6px 0 0;
        box-shadow: none;
        padding: 6px 12px;
      }
      .mm-node-card.level-0.shape-underline {
        background: transparent;
        color: #1e3a8a;
        border-bottom: 3.5px solid #2563eb;
      }
      .mm-node-card.level-0.shape-underline .katex,
      .mm-node-card.level-0.shape-underline .katex * {
        color: #1e3a8a !important;
      }
      .mm-node-text {
        display: flex;
        align-items: center;
        gap: 6px;
        word-break: normal;
        overflow-wrap: break-word;
        white-space: normal;
        line-height: 1.5;
        color: inherit;
      }
      .mm-node-card.level-0 .mm-node-text {
        justify-content: center;
      }
      .mm-node-badge {
        font-size: 1.05em;
        line-height: 1;
        flex-shrink: 0;
      }
      .mm-node-text .katex {
        font-size: 1.14em;
        color: #0f172a;
      }
      .mm-node-card.level-0 .mm-node-text .katex {
        color: #ffffff !important;
      }
      .mm-node-text .katex-display {
        margin: 4px 0 !important;
      }
      .mm-node-actions,
      .mm-color-palette,
      .mm-style-popover,
      .mm-collapse-badge {
        display: none !important;
      }
    `;
  }

  window.generateMindmapSvg = function () {
    const layout = state.layout || 'right';
    calculateLayout(state.tree, layout);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    function getBounds(node) {
      if (!node) return;
      if (typeof node.x === 'number' && node.x < minX) minX = node.x;
      if (typeof node.y === 'number' && node.y < minY) minY = node.y;
      if (typeof node.x === 'number' && node.x + (node.w || 120) > maxX) maxX = node.x + (node.w || 120);
      if (typeof node.y === 'number' && node.y + (node.h || 42) > maxY) maxY = node.y + (node.h || 42);
      if (node.children && node.expanded !== false) {
        node.children.forEach(getBounds);
      }
    }
    getBounds(state.tree);
    if (!isFinite(minX) || !isFinite(minY)) {
      minX = 0; minY = 0; maxX = 800; maxY = 600;
    }
    const pad = 36;
    const ox = minX - pad;
    const oy = minY - pad;
    const width = Math.max(320, Math.ceil((maxX - minX) + pad * 2));
    const height = Math.max(200, Math.ceil((maxY - minY) + pad * 2));

    const svgNS = 'http://www.w3.org/2000/svg';
    const xhtmlNS = 'http://www.w3.org/1999/xhtml';
    const svgEl = document.createElementNS(svgNS, 'svg');
    svgEl.setAttribute('xmlns', svgNS);
    svgEl.setAttribute('width', String(width));
    svgEl.setAttribute('height', String(height));
    svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgEl.setAttribute('shape-rendering', 'geometricPrecision');

    const styleEl = document.createElementNS(svgNS, 'style');
    styleEl.textContent = buildMindmapExportCss();
    svgEl.appendChild(styleEl);

    const pathGroup = document.createElementNS(svgNS, 'g');
    pathGroup.setAttribute('fill', 'none');
    pathGroup.setAttribute('stroke-linecap', 'round');

    const foreign = document.createElementNS(svgNS, 'foreignObject');
    foreign.setAttribute('x', '0');
    foreign.setAttribute('y', '0');
    foreign.setAttribute('width', String(width));
    foreign.setAttribute('height', String(height));

    const container = document.createElementNS(xhtmlNS, 'div');
    container.setAttribute('xmlns', xhtmlNS);
    container.style.cssText = `position: relative; width: ${width}px; height: ${height}px; background: transparent;`;

    function buildNodeElements(node, inheritedColor) {
      const nodeColor = getNodeColor(node, inheritedColor);
      if (node.children && node.children.length > 0 && node.expanded !== false) {
        node.children.forEach((child) => {
          const childColor = getNodeColor(child, nodeColor);
          const pathEl = document.createElementNS(svgNS, 'path');
          pathEl.setAttribute('d', buildConnectorPath(node, child, ox, oy, layout));
          pathEl.setAttribute('fill', 'none');
          pathEl.setAttribute('stroke', childColor);
          pathEl.setAttribute('stroke-width', '2.4');
          pathEl.setAttribute('stroke-linecap', 'round');
          pathEl.setAttribute('opacity', '0.9');
          pathGroup.appendChild(pathEl);
          buildNodeElements(child, nodeColor);
        });
      }
      const shape = node.shape || 'card';
      const side = node._side || 'right';
      const card = document.createElementNS(xhtmlNS, 'div');
      card.setAttribute('class', `mm-node-card level-${node.level} shape-${shape} side-${side}`);
      const borderStyle = shape === 'underline'
        ? `border-bottom-color: ${node.level === 0 ? '#2563eb' : nodeColor};`
        : `border-color: ${node.level === 0 ? '#60a5fa' : nodeColor};`;
      card.style.cssText = `position: absolute; left: ${node.x - ox}px; top: ${node.y - oy}px; width: ${node.w}px; min-height: ${node.h}px; box-sizing: border-box; --node-color: ${nodeColor}; ${borderStyle}`;
      const textDiv = document.createElementNS(xhtmlNS, 'div');
      textDiv.setAttribute('class', 'mm-node-text');
      textDiv.innerHTML = renderNodeInnerHtml(node);
      card.appendChild(textDiv);
      container.appendChild(card);
    }

    buildNodeElements(state.tree, '#2563eb');
    svgEl.appendChild(pathGroup);
    foreign.appendChild(container);
    svgEl.appendChild(foreign);
    return new XMLSerializer().serializeToString(svgEl);
  };

  window.exportMindmapAsPng = async function (callback, scale = 4) {
    await ensureEmbeddedKatexCss();
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
    const effScale = Math.min(scale, 8192 / Math.max(svgW, svgH, 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(svgW * effScale));
    canvas.height = Math.max(1, Math.round(svgH * effScale));
    const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    const img = new Image();
    img.onload = function () {
      try {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngData = canvas.toDataURL('image/png');
        if (callback) callback(pngData, svgString);
      } catch (e) {
        console.warn('[Mindmap] Canvas export error:', e);
        if (callback) callback(null, svgString);
      }
    };
    img.onerror = function (err) {
      console.warn('[Mindmap] SVG image render error:', err);
      if (callback) callback(null, svgString);
    };
    img.src = dataUri;
  };

  window.showToast = function (message, type = 'info') {
    let container = document.getElementById('mea-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mea-toast-container';
      container.className = 'mea-toast-container';
      document.body.appendChild(container);
    }
    container.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = `mea-toast ${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  };

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

  window.captureAndHandleMindmap = async function (action) {
    if (_isCapturingMindmap) return;
    if (state.mode === 'closed') {
      window.showToast('Vui lòng mở Sơ đồ tư duy trước khi thực hiện!', 'warning');
      return;
    }
    _isCapturingMindmap = true;
    try {
      await ensureEmbeddedKatexCss();
      const svgString = window.generateMindmapSvg();
      if (!svgString) {
        window.showToast('Không thể kết xuất Sơ đồ tư duy!', 'error');
        return;
      }
      if (action === 'insert_board' || !action) {
        const svgDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        await window.finishInsertMindmapToBoard(svgDataUri);
        return;
      }
      await new Promise((resolve) => {
        window.exportMindmapAsPng(async (pngData) => {
          if (pngData) {
            if (action === 'copy_word') {
              await window.copyImageToClipboard(pngData);
            } else if (action === 'save_png') {
              const a = document.createElement('a');
              a.href = pngData;
              a.download = `SoDoTuDuy_${Date.now()}.png`;
              a.click();
              window.showToast('Đã tải ảnh PNG siêu nét (4K nền trong suốt)!', 'success');
            }
          } else {
            window.showToast('Không thể xuất ảnh PNG từ sơ đồ!', 'error');
          }
          resolve();
        }, 4);
      });
    } finally {
      _isCapturingMindmap = false;
    }
  };

  window.setMindmapTree = function (treeData, editingContext = null) {
    if (!treeData) return;
    try {
      const parsed = typeof treeData === 'string' ? JSON.parse(treeData) : cloneTree(treeData);
      if (parsed && parsed._layout && ['right', 'mindmap', 'down'].includes(parsed._layout)) {
        state.layout = parsed._layout;
        updateLayoutButtons();
      }
      state.tree = parsed;
      state.selectedId = 'root';
      state.openStyleNodeId = null;
      state.history = [];
      state.future = [];
      updateHistoryButtons();
      if (editingContext) {
        state.editingBoardItem = editingContext;
      }
      renderMindMap();
      window.fitMindMapView(false);
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
    const board = (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard || window.__minnoteBoard;
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
    const board = (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard || window.__minnoteBoard;
    if (!board) return false;
    try {
      const img = new Image();
      img.src = dataUri;
      await img.decode();
      const natW = img.naturalWidth || 900;
      const natH = img.naturalHeight || 560;
      const pageIdx = (board.sel && board.sel.page >= 0) ? board.sel.page : 0;
      const pw = board.doc ? (board.doc.landscape ? 1754 : 1240) : 1240;
      const ph = typeof board.phOf === 'function' ? board.phOf(pageIdx) : 1754;
      const maxW = Math.min(1060, pw - 60);
      const maxH = Math.min(1200, ph - 60);
      const r = Math.min(1, maxW / natW, maxH / natH);
      const curW = Math.max(180, Math.round(natW * r));
      const curH = Math.max(100, Math.round(natH * r));
      const newX = Math.round(Math.max(30, (pw - curW) / 2));
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

  window.removeMindmapBackground = function (dataUrl) {
    return new Promise((resolve) => {
      if (!dataUrl || typeof dataUrl !== 'string') return resolve(dataUrl);
      if (dataUrl.startsWith('data:image/svg+xml') || !dataUrl.startsWith('data:image')) {
        return resolve(dataUrl);
      }
      const img = new Image();
      img.onload = function () {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          const w = canvas.width;
          const h = canvas.height;
          const corners = [0, (w - 1) * 4, ((h - 1) * w) * 4, ((h - 1) * w + (w - 1)) * 4];
          if (corners.some(idx => d[idx + 3] < 32)) {
            return resolve(dataUrl);
          }
          resolve(dataUrl);
        } catch (err) {
          resolve(dataUrl);
        }
      };
      img.onerror = function () { resolve(dataUrl); };
      img.src = dataUrl;
    });
  };

  window.copyImageToClipboard = async function (dataUrl) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        if (typeof window.showToast === 'function') {
          window.showToast('Đã sao chép ảnh sơ đồ 4K (nền trong suốt, đầy đủ công thức Toán) vào Clipboard!', 'success');
        }
      }
    } catch (err) {
      console.warn('[Mindmap] copyImageToClipboard error:', err);
    }
  };

  const onCapturedMessage = async function (e) {
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
    window.scrollTo(0, 0);
    if (document.documentElement) { document.documentElement.scrollLeft = 0; document.documentElement.scrollTop = 0; }
    if (document.body) { document.body.scrollLeft = 0; document.body.scrollTop = 0; }
    const currentTree = cloneTree(state.tree);
    currentTree._layout = state.layout || 'right';
    window.__lastInsertedMindmapTree = currentTree;
    if (typeof window.setMindMapMode === 'function') {
      window.setMindMapMode('closed');
    }
    await new Promise(r => setTimeout(r, 60));
    window.dispatchEvent(new Event('resize'));
    let inserted = false;
    const board = (window.__meaBoardRef && window.__meaBoardRef.current) || window.__meaBoard || window.__minnoteBoard;
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
          const natW = img.naturalWidth || 900;
          const natH = img.naturalHeight || 560;
          const pw = board.doc ? (board.doc.landscape ? 1754 : 1240) : 1240;
          const ph = typeof board.phOf === 'function' ? board.phOf(pageIdx) : 1754;
          const maxW = Math.min(1060, pw - 60);
          const maxH = Math.min(1200, ph - 60);
          const curW = (existing.w > 80 && existing.w <= maxW) ? existing.w : Math.min(maxW, Math.round(natW * Math.min(1, maxW / natW, maxH / natH)));
          const curH = Math.round(curW * (natH / natW));
          const newX = Math.max(30, Math.min(pw - curW - 30, existing.x));
          const newY = Math.max(30, Math.min(ph - curH - 30, existing.y));
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
      window.showToast('Đã chèn Sơ đồ tư duy Vector siêu nét (không vỡ nét khi zoom) vào Bảng viết!', 'success');
    } else {
      window.showToast('Đã sao chép ảnh sơ đồ! Bạn có thể nhấn Ctrl+V để dán vào bảng vẽ.', 'info');
    }
  };

  // NATIVE VECTOR MINDMAP CARD ENGINE
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
    const layout = (tree && tree._layout) || state.layout || 'right';
    calculateLayout(tree, layout);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    function calcBounds(node) {
      if (!node) return;
      if (typeof node.x === 'number') {
        if (node.x < minX) minX = node.x;
        if (node.y < minY) minY = node.y;
        if (node.x + (node.w || 120) > maxX) maxX = node.x + (node.w || 120);
        if (node.y + (node.h || 42) > maxY) maxY = node.y + (node.h || 42);
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
    function traverseTree(node, inheritedColor) {
      const nodeColor = getNodeColor(node, inheritedColor);
      if (node.children && node.children.length > 0 && node.expanded !== false) {
        node.children.forEach(child => {
          const childColor = getNodeColor(child, nodeColor);
          const d = buildConnectorPath(node, child, ox, oy, layout);
          pathsHtml += `<path d="${d}" fill="none" stroke="${childColor}" stroke-width="2.4" stroke-linecap="round" opacity="0.9" />`;
          traverseTree(child, nodeColor);
        });
      }
      const shape = node.shape || 'card';
      const side = node._side || 'right';
      const nx = node.x - ox;
      const ny = node.y - oy;
      nodesHtml += `
        <div class="mm-node-card level-${node.level} shape-${shape} side-${side}"
             style="position: absolute; left: ${nx}px; top: ${ny}px; width: ${node.w}px; min-height: ${node.h}px; box-sizing: border-box; --node-color: ${nodeColor};">
          <div class="mm-node-text">${renderNodeInnerHtml(node)}</div>
        </div>
      `;
    }
    traverseTree(tree, '#2563eb');
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
    el.addEventListener('pointerdown', function () {
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

  window.addEventListener('keydown', function (e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && window.__activeMindmapPage !== null) {
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      window.deleteBoardMindmap(window.__activeMindmapPage);
    }
  });

  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest('.mea-mm-board-card')) {
      window.__activeMindmapPage = null;
      document.querySelectorAll('.mea-mm-board-card.is-selected').forEach(c => c.classList.remove('is-selected'));
    }
  });

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

  window.downloadMindmapSvg = async function () {
    try {
      await ensureEmbeddedKatexCss();
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
      window.showToast('Đã xuất vector SVG (nhúng sẵn font công thức Toán) và sao chép vào bộ nhớ tạm!', 'success');
    } catch (err) {
      console.warn('[Mindmap] Error exporting SVG:', err);
      window.showToast('Lỗi xuất SVG: ' + err.message, 'error');
    }
  };

  // 14. PAN & ZOOM CONTROLS
  function zoomAtPoint(targetZoom, cx, cy) {
    const oldZoom = state.zoom;
    const newZoom = Number(Math.min(4.0, Math.max(0.2, targetZoom)).toFixed(2));
    if (newZoom === oldZoom) return;
    state.pan.x = Math.round(cx - (cx - state.pan.x) * (newZoom / oldZoom));
    state.pan.y = Math.round(cy - (cy - state.pan.y) * (newZoom / oldZoom));
    state.zoom = newZoom;
    applyMindmapViewportTransform(false);
  }

  window.zoomMindMap = function (delta) {
    const canvas = document.getElementById('mindmap-canvas-area');
    const cx = (canvas?.clientWidth || 800) / 2;
    const cy = (canvas?.clientHeight || 600) / 2;
    zoomAtPoint(state.zoom + delta, cx, cy);
  };

  window.resetMindMapZoom = function () {
    state.zoom = 1.0;
    calculateLayout(state.tree, state.layout);
    const canvas = document.getElementById('mindmap-canvas-area');
    const cw = canvas?.clientWidth || 800;
    const ch = canvas?.clientHeight || 600;
    const root = state.tree;
    if (root) {
      if (state.layout === 'mindmap') {
        state.pan = {
          x: Math.round(cw / 2 - (root.x + root.w / 2)),
          y: Math.round(ch / 2 - (root.y + root.h / 2))
        };
      } else if (state.layout === 'down') {
        state.pan = {
          x: Math.round(cw / 2 - (root.x + root.w / 2)),
          y: Math.round(48 - root.y)
        };
      } else {
        state.pan = {
          x: Math.round(Math.max(40, cw * 0.12) - root.x),
          y: Math.round(ch / 2 - (root.y + root.h / 2))
        };
      }
    } else {
      state.pan = { x: 50, y: 50 };
    }
    renderMindMap({ smooth: true });
  };

  window.fitMindMapView = function (smooth) {
    const shouldSmooth = smooth !== false && !!document.getElementById('mindmap-viewport');
    calculateLayout(state.tree, state.layout);
    const canvas = document.getElementById('mindmap-canvas-area');
    if (!canvas || !state.bounds) {
      state.zoom = 0.95;
      state.pan = { x: 50, y: 50 };
      renderMindMap({ smooth: shouldSmooth });
      return;
    }
    const cw = canvas.clientWidth || 800;
    const ch = canvas.clientHeight || 600;
    const treeW = state.bounds.width || 800;
    const treeH = state.bounds.height || 600;
    const padX = 56;
    const padY = 56;
    const availW = Math.max(100, cw - padX * 2);
    const availH = Math.max(100, ch - padY * 2);
    const scaleX = availW / treeW;
    const scaleY = availH / treeH;
    let fitZoom = Math.min(scaleX, scaleY);
    fitZoom = Math.max(0.25, Math.min(1.05, fitZoom));
    const renderedW = treeW * fitZoom;
    const renderedH = treeH * fitZoom;
    const panX = Math.round((cw - renderedW) / 2 - state.bounds.minX * fitZoom);
    const panY = Math.round((ch - renderedH) / 2 - state.bounds.minY * fitZoom);
    state.zoom = Number(fitZoom.toFixed(2));
    state.pan = { x: panX, y: panY };
    renderMindMap({ smooth: shouldSmooth });
  };

  function reflowNoteWhiteboard() {
    // Preserve NoteRenderer scroll/zoom/page state without shrinking canvas
  }

  // 15. WORKSPACE MODE CONTROLLER (Closed, Split, Full)
  window.setMindMapMode = function (newMode) {
    const prevMode = state.mode;
    state.mode = newMode;
    const container = document.getElementById('mea-mindmap-container');
    const btnBadge = document.getElementById('btn-toggle-mindmap');
    const rootEl = document.getElementById('root');
    if (!container) return;

    enhanceStudioChrome();
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
      state.openStyleNodeId = null;
    }

    if (rootEl) {
      rootEl.style.display = newMode === 'full' ? 'none' : '';
    }

    void document.body.offsetWidth;
    reflowNoteWhiteboard(newMode, prevMode);
    window.dispatchEvent(new Event('resize'));
    if (newMode !== 'closed') {
      window.fitMindMapView(false);
    }
    requestAnimationFrame(() => {
      reflowNoteWhiteboard(newMode, prevMode);
      window.dispatchEvent(new Event('resize'));
      if (newMode !== 'closed') {
        window.fitMindMapView(false);
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
  let _listenersBound = false;
  function setupEventListeners() {
    if (_listenersBound) return;
    const canvas = document.getElementById('mindmap-canvas-area');
    if (!canvas) return;
    _listenersBound = true;

    // Pan canvas & close style popover when clicking canvas background
    canvas.addEventListener('mousedown', (e) => {
      if (e.target.closest('.mm-node-card') || e.target.closest('.mm-btn') || e.target.closest('.mindmap-floating-controls')) {
        return;
      }
      if (state.openStyleNodeId) {
        state.openStyleNodeId = null;
        renderMindMap();
      }
      state.isDragging = true;
      state.dragStart = { x: e.clientX - state.pan.x, y: e.clientY - state.pan.y };
      canvas.classList.add('panning');
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.isDragging) return;
      state.pan.x = e.clientX - state.dragStart.x;
      state.pan.y = e.clientY - state.dragStart.y;
      applyMindmapViewportTransform(false);
    });

    window.addEventListener('mouseup', () => {
      if (state.isDragging) {
        state.isDragging = false;
        canvas.classList.remove('panning');
      }
    });

    // Zoom with wheel around cursor
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.88;
      zoomAtPoint(state.zoom * factor, cx, cy);
    }, { passive: false });

    // Global keyboard shortcuts (Ctrl+F, Ctrl+Z, Ctrl+Y, Tab, Enter, F2, Delete)
    window.addEventListener('keydown', (e) => {
      if (state.mode === 'closed') return;

      const mathModal = document.getElementById('mindmap-math-modal');
      const aiModal = document.getElementById('mindmap-ai-modal');
      const tplModal = document.getElementById('mindmap-templates-modal');
      const isAnyModalOpen = (mathModal && mathModal.style.display !== 'none') ||
                             (aiModal && aiModal.style.display !== 'none') ||
                             (tplModal && tplModal.style.display !== 'none');

      // Quick Search shortcut (Ctrl+F / Cmd+F)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && !isAnyModalOpen) {
        e.preventDefault();
        window.focusMindMapSearch();
        return;
      }

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

      if (isAnyModalOpen) {
        if (e.key === 'Escape') {
          window.closeMathEditor();
          window.closeAiMindmapModal();
          window.closeTemplatesModal();
        }
        return;
      }

      // Undo / Redo (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) {
          e.preventDefault();
          window.undoMindMap();
          return;
        }
        if (k === 'y' || (k === 'z' && e.shiftKey)) {
          e.preventDefault();
          window.redoMindMap();
          return;
        }
      }

      if (e.key === 'Escape' && state.openStyleNodeId) {
        state.openStyleNodeId = null;
        renderMindMap();
      } else if (e.key === 'Tab') {
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

  // 17. INITIALIZE
  function bootMindmapStudio() {
    enhanceStudioChrome();
    setupEventListeners();
    const container = document.getElementById('mea-mindmap-container');
    if (container && container.classList.contains('mode-full')) {
      state.mode = 'full';
    }
    window.fitMindMapView(false);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootMindmapStudio);
  } else {
    bootMindmapStudio();
  }
})();
