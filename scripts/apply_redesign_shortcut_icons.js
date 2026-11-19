const fs = require('fs');

const filePath = 'Resources/Whiteboard/assets/index-CTbULhps.js';
let code = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // Slightly crisper default strokeWidth on Te (1.6 -> 1.75)
  [
    'const Te=({children:e,size:t=24,className:n})=>h.jsx("svg",{className:n,width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.6,strokeLinecap:"round",strokeLinejoin:"round",children:e})',
    'const Te=({children:e,size:t=24,className:n})=>h.jsx("svg",{className:n,width:t,height:t,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.75,strokeLinecap:"round",strokeLinejoin:"round",children:e})'
  ],
  // 1. dashed (Nét đứt)
  [
    'dashed:()=>h.jsx(Te,{children:h.jsx("path",{d:"M3 19 6 16M9 13l3-3M15 7l3-3",strokeWidth:2.2})})',
    'dashed:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M4.5 19.5l3.2-3.2M10.4 13.6l3.2-3.2M16.3 7.7l3.2-3.2",strokeWidth:2.2}),h.jsx("circle",{cx:"4.5",cy:"19.5",r:"1.3",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"19.5",cy:"4.5",r:"1.3",fill:"currentColor",stroke:"none"})]})'
  ],
  // 2. shapes (Hình mẫu)
  [
    'shapes:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M4 20 10 9l6 11z"}),h.jsx("rect",{x:"13",y:"3",width:"8",height:"8"})]})',
    'shapes:()=>h.jsxs(Te,{children:[h.jsx("rect",{x:"12.5",y:"3.8",width:"7.8",height:"7.8",rx:"2",fill:"currentColor",fillOpacity:"0.14"}),h.jsx("path",{d:"M9.2 9.2L15.2 19.8H3.2L9.2 9.2Z",fill:"currentColor",fillOpacity:"0.14"})]})'
  ],
  // 3. geometry (Hình học phẳng)
  [
    'geometry:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M4 19 12 5l8 14z"}),h.jsx("path",{d:"M12 5v14",strokeDasharray:"2 2"}),h.jsx("path",{d:"M12 16h3v3"}),h.jsx("circle",{cx:"4",cy:"19",r:"1.4",fill:"currentColor"}),h.jsx("circle",{cx:"12",cy:"5",r:"1.4",fill:"currentColor"}),h.jsx("circle",{cx:"20",cy:"19",r:"1.4",fill:"currentColor"})]})',
    'geometry:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M12 4.8L4.5 19h15L12 4.8z",fill:"currentColor",fillOpacity:"0.1"}),h.jsx("path",{d:"M12 5.5V19",strokeDasharray:"2.2 2.2",strokeWidth:1.45}),h.jsx("path",{d:"M12 15.8h3.2V19",strokeWidth:1.45}),h.jsx("circle",{cx:"12",cy:"4.8",r:"1.8",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"4.5",cy:"19",r:"1.8",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"19.5",cy:"19",r:"1.8",fill:"currentColor",stroke:"none"})]})'
  ],
  // 4. graph (Đồ thị hàm số)
  [
    'graph:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M3 20h18M5 22V3"}),h.jsx("path",{d:"M6 18c3-12 6-12 8-6s4 4 6-4"})]})',
    'graph:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M4.8 3.5V19.2H20.5",strokeWidth:1.65}),h.jsx("path",{d:"M3.2 5.2L4.8 3.5l1.6 1.7M18.8 17.6l1.7 1.6-1.7 1.6",strokeWidth:1.45}),h.jsx("path",{d:"M6.8 17.2C8.8 7.5 11.2 7.5 13 13s4.2 4.5 6.3-5.8",strokeWidth:2})]})'
  ],
  // 5. vartable (Bảng biến thiên)
  [
    'vartable:()=>h.jsxs(Te,{children:[h.jsx("rect",{x:"3",y:"4",width:"18",height:"16",rx:"1.5"}),h.jsx("path",{d:"M3 8.5h18M3 12h18M7.5 4v16"}),h.jsx("path",{d:"M9.5 18.5 13 14.5l3.5 4"})]})',
    'vartable:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M3.5 6.2A2.2 2.2 0 0 1 5.7 4h12.6a2.2 2.2 0 0 1 2.2 2.2V8.8h-17z",fill:"currentColor",fillOpacity:"0.14",stroke:"none"}),h.jsx("rect",{x:"3.5",y:"4",width:"17",height:"16",rx:"2.2"}),h.jsx("path",{d:"M3.5 8.8h17M8 4v16",strokeWidth:1.5}),h.jsx("path",{d:"M10 17.2l3.4-5.2 4.4 5.2",strokeWidth:1.7}),h.jsx("path",{d:"M11.6 12h1.8v1.8M16 17.2h1.8v-1.8",strokeWidth:1.45})]})'
  ],
  // 6. oxyz (Hệ trục tọa độ Oxyz 3D)
  [
    'oxyz:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M8 16V3.5M8 16h12.5M8 16l-5 5"}),h.jsx("path",{d:"M6 5.5 8 3.5l2 2M18.5 14l2 2-2 2M3 18.5V21h2.5"}),h.jsx("circle",{cx:"15",cy:"9",r:"1.6",fill:"currentColor"})]})',
    'oxyz:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M9 14.5V3.5M9 14.5h11.5M9 14.5L3.8 19.7"}),h.jsx("path",{d:"M7.2 5.3L9 3.5l1.8 1.8M18.7 12.7l1.8 1.8-1.8 1.8M3.8 17.2v2.5h2.5",strokeWidth:1.5}),h.jsx("path",{d:"M16 8.5v6",strokeDasharray:"1.8 1.8",strokeWidth:1.3}),h.jsx("circle",{cx:"16",cy:"8.5",r:"2.1",fill:"currentColor",stroke:"none"})]})'
  ],
  // 7. probTool (Sơ đồ cây xác suất)
  [
    'probTool:()=>h.jsxs(Te,{children:[h.jsx("circle",{cx:"4.5",cy:"12",r:"1.8",fill:"currentColor"}),h.jsx("path",{d:"M6 11 13 5.5M6 13l7 5.5"}),h.jsx("path",{d:"M15 5.5 20.5 3M15 5.5 20.5 8M15 18.5 20.5 16M15 18.5 20.5 21",strokeWidth:1.4})]})',
    'probTool:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M6.2 11L11.2 7.2M6.2 13l5 3.8M14.4 6.5l4.4-2.2M14.4 7.5l4.4 2M14.4 16.5l4.4-2M14.4 17.5l4.4 2.2",strokeWidth:1.5}),h.jsx("circle",{cx:"4.5",cy:"12",r:"2",fill:"currentColor",fillOpacity:"0.22"}),h.jsx("circle",{cx:"12.8",cy:"7",r:"1.8",fill:"currentColor",fillOpacity:"0.22"}),h.jsx("circle",{cx:"12.8",cy:"17",r:"1.8",fill:"currentColor",fillOpacity:"0.22"}),h.jsx("circle",{cx:"19.5",cy:"4.2",r:"1.2",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"19.5",cy:"9.5",r:"1.2",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"19.5",cy:"14.5",r:"1.2",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"19.5",cy:"19.8",r:"1.2",fill:"currentColor",stroke:"none"})]})'
  ],
  // 8. trigTool (Đường tròn lượng giác)
  [
    'trigTool:()=>h.jsxs(Te,{children:[h.jsx("circle",{cx:"12",cy:"12",r:"8.5"}),h.jsx("path",{d:"M2 12h20M12 2v20",strokeWidth:1.1}),h.jsx("path",{d:"M12 12 17.5 5.5"}),h.jsx("path",{d:"M17.5 5.5V12",strokeDasharray:"1.8 1.8",strokeWidth:1.4}),h.jsx("circle",{cx:"17.5",cy:"5.5",r:"1.6",fill:"currentColor"})]})',
    'trigTool:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M12 12h4.4A4.4 4.4 0 0 0 15 8.6Z",fill:"currentColor",fillOpacity:"0.22",stroke:"none"}),h.jsx("circle",{cx:"12",cy:"12",r:"8.2"}),h.jsx("path",{d:"M2.8 12h18.4M12 2.8v18.4",strokeWidth:1.2,opacity:"0.45"}),h.jsx("path",{d:"M12 12l5.4-6",strokeWidth:1.9}),h.jsx("path",{d:"M17.4 6v6",strokeDasharray:"1.8 1.8",strokeWidth:1.35}),h.jsx("circle",{cx:"17.4",cy:"6",r:"1.9",fill:"currentColor",stroke:"none"})]})'
  ],
  // 9. statTool (Biểu đồ thống kê / Boxplot)
  [
    'statTool:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M3 21h18"}),h.jsx("path",{d:"M5 21v-5h3.5v5M8.5 21v-9H12v9M12 21v-12h3.5v12M15.5 21v-7H19v7",strokeWidth:1.4}),h.jsx("path",{d:"M4 5h4M16 5h4M4 3.2v3.6M20 3.2v3.6",strokeWidth:1.3}),h.jsx("rect",{x:"8",y:"3",width:"8",height:"4",strokeWidth:1.4}),h.jsx("path",{d:"M11.5 3v4",strokeWidth:1.4})]})',
    'statTool:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M3.5 20.5h17",strokeWidth:1.6}),h.jsx("rect",{x:"5",y:"14.5",width:"3.6",height:"6",rx:"0.9",fill:"currentColor",fillOpacity:"0.14",strokeWidth:1.55}),h.jsx("rect",{x:"10.2",y:"10",width:"3.6",height:"10.5",rx:"0.9",fill:"currentColor",fillOpacity:"0.26",strokeWidth:1.55}),h.jsx("rect",{x:"15.4",y:"12.5",width:"3.6",height:"8",rx:"0.9",fill:"currentColor",fillOpacity:"0.14",strokeWidth:1.55}),h.jsx("path",{d:"M4.5 5.5h3.5M16 5.5h3.5M4.5 3.8v3.4M19.5 3.8v3.4",strokeWidth:1.4}),h.jsx("rect",{x:"8",y:"3.5",width:"8",height:"4",rx:"1",fill:"currentColor",fillOpacity:"0.14",strokeWidth:1.5}),h.jsx("path",{d:"M12 3.5v4",strokeWidth:1.5})]})'
  ],
  // 10. formula (Công thức toán Σ)
  [
    'formula:()=>h.jsx(Te,{children:h.jsx("path",{d:"M18 5H7l6 7-6 7h11"})})',
    'formula:()=>h.jsx(Te,{children:h.jsx("path",{d:"M18.2 7V4.8H6.2l6.2 7.2-6.2 7.2h12V17",strokeWidth:2})})'
  ],
  // 11. problem (Khung đề bài)
  [
    'problem:()=>h.jsxs(Te,{children:[h.jsx("rect",{x:"3",y:"4",width:"18",height:"16",rx:"2"}),h.jsx("path",{d:"M3 8.5h18M7 12.5h10M7 16h6"})]})',
    'problem:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M3.5 6.5A2.5 2.5 0 0 1 6 4h12a2.5 2.5 0 0 1 2.5 2.5V9h-17z",fill:"currentColor",fillOpacity:"0.14",stroke:"none"}),h.jsx("rect",{x:"3.5",y:"4",width:"17",height:"16",rx:"2.5"}),h.jsx("path",{d:"M3.5 9h17M7.5 13h9M7.5 16.5h6",strokeWidth:1.65})]})'
  ],
  // 12. sticker (Nhãn dán / Ghi chú)
  [
    'sticker:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7l-7 7H6a2 2 0 0 1-2-2z"}),h.jsx("path",{d:"M20 13h-5a2 2 0 0 0-2 2v5"}),h.jsx("path",{d:"M9 10h.01M15 10h.01",strokeWidth:2.4})]})',
    'sticker:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M5.5 4h13A1.5 1.5 0 0 1 20 5.5V14l-6 6H5.5A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4z",fill:"currentColor",fillOpacity:"0.1"}),h.jsx("path",{d:"M20 14h-4.5a1.5 1.5 0 0 0-1.5 1.5V20"}),h.jsx("circle",{cx:"9.2",cy:"9.8",r:"1.05",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"14.8",cy:"9.8",r:"1.05",fill:"currentColor",stroke:"none"}),h.jsx("path",{d:"M9.6 13.2c.7.9 1.6 1.3 2.4 1.3s1.7-.4 2.4-1.3",strokeWidth:1.5})]})'
  ],
  // 13. timer (Đồng hồ bấm giờ)
  [
    'timer:()=>h.jsxs(Te,{children:[h.jsx("circle",{cx:"12",cy:"13.5",r:"7.5"}),h.jsx("path",{d:"M12 9.5v4l2.5 2M10 3h4M12 3v3M18.5 6.5l1.5-1.5"})]})',
    'timer:()=>h.jsxs(Te,{children:[h.jsx("circle",{cx:"12",cy:"13.5",r:"7.2",fill:"currentColor",fillOpacity:"0.1"}),h.jsx("path",{d:"M12 9.8v3.7l2.6 1.8M9.5 3h5M12 3v3.3M17.6 7.4l1.6-1.6"})]})'
  ],
  // 14. dice (Xúc xắc / Chọn ngẫu nhiên)
  [
    'dice:()=>h.jsxs(Te,{children:[h.jsx("rect",{x:"3.5",y:"3.5",width:"17",height:"17",rx:"3.5"}),h.jsx("path",{d:"M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01",strokeWidth:2.6})]})',
    'dice:()=>h.jsxs(Te,{children:[h.jsx("rect",{x:"3.5",y:"3.5",width:"17",height:"17",rx:"4",fill:"currentColor",fillOpacity:"0.1"}),h.jsx("circle",{cx:"8.2",cy:"8.2",r:"1.35",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"15.8",cy:"8.2",r:"1.35",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"12",cy:"12",r:"1.35",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"8.2",cy:"15.8",r:"1.35",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"15.8",cy:"15.8",r:"1.35",fill:"currentColor",stroke:"none"})]})'
  ],
  // 15. globe (Trình duyệt web)
  [
    'globe:()=>h.jsxs(Te,{children:[h.jsx("circle",{cx:"12",cy:"12",r:"9"}),h.jsx("path",{d:"M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"})]})',
    'globe:()=>h.jsxs(Te,{children:[h.jsx("circle",{cx:"12",cy:"12",r:"8.5",fill:"currentColor",fillOpacity:"0.1"}),h.jsx("path",{d:"M3.8 12h16.4M12 3.5a12.5 12.5 0 0 1 0 17M12 3.5a12.5 12.5 0 0 0 0 17",strokeWidth:1.55})]})'
  ],
  // 16. calc (Máy tính khoa học Casio / Vinacal)
  [
    'calc:()=>h.jsx(zt,{title:"Máy tính khoa học (Casio)",on:__casioOpen,onClick:()=>__toggleCasio(!__casioOpen),children:h.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("rect",{x:"4",y:"2",width:"16",height:"20",rx:"2"}),h.jsx("line",{x1:"8",y1:"6",x2:"16",y2:"6"}),h.jsx("line",{x1:"16",y1:"14",x2:"16",y2:"14.01"}),h.jsx("line",{x1:"8",y1:"10",x2:"8",y2:"10.01"}),h.jsx("line",{x1:"12",y1:"10",x2:"12",y2:"10.01"}),h.jsx("line",{x1:"16",y1:"10",x2:"16",y2:"10.01"}),h.jsx("line",{x1:"8",y1:"14",x2:"8",y2:"14.01"}),h.jsx("line",{x1:"12",y1:"14",x2:"12",y2:"14.01"}),h.jsx("line",{x1:"8",y1:"18",x2:"8",y2:"18.01"}),h.jsx("line",{x1:"12",y1:"18",x2:"12",y2:"18.01"}),h.jsx("line",{x1:"16",y1:"18",x2:"16",y2:"18.01"})]})})',
    'calc:()=>h.jsx(zt,{title:"Máy tính khoa học (Casio / Vinacal)",on:__casioOpen,onClick:()=>__toggleCasio(!__casioOpen),children:h.jsxs(Te,{children:[h.jsx("rect",{x:"4.5",y:"2.8",width:"15",height:"18.4",rx:"2.6",fill:"currentColor",fillOpacity:"0.08"}),h.jsx("rect",{x:"7.5",y:"5.6",width:"9",height:"4.2",rx:"1.1",fill:"currentColor",fillOpacity:"0.2",strokeWidth:1.4}),h.jsx("circle",{cx:"8.6",cy:"13.2",r:"1.05",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"12",cy:"13.2",r:"1.05",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"15.4",cy:"13.2",r:"1.05",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"8.6",cy:"16.2",r:"1.05",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"12",cy:"16.2",r:"1.05",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"8.6",cy:"18.9",r:"1.05",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"12",cy:"18.9",r:"1.05",fill:"currentColor",stroke:"none"}),h.jsx("rect",{x:"14.3",y:"15.2",width:"2.2",height:"4.7",rx:"1",fill:"currentColor",stroke:"none"})]})})'
  ],
  // 17. text (Văn bản T)
  [
    'text:()=>h.jsx(Te,{children:h.jsx("path",{d:"M5 7V5h14v2M12 5v14M9 19h6"})})',
    'text:()=>h.jsx(Te,{children:h.jsx("path",{d:"M5.5 7.2V5h13v2.2M12 5v14M8.8 19h6.4",strokeWidth:1.95})})'
  ],
  // 18. fill (Tô miền)
  [
    'fill:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"m11 3 8 8-7 7a2 2 0 0 1-2.8 0L4 12.8a2 2 0 0 1 0-2.8z"}),h.jsx("path",{d:"M4.5 11h13"}),h.jsx("path",{d:"M20 15s-1.5 2-1.5 3a1.5 1.5 0 0 0 3 0c0-1-1.5-3-1.5-3z"})]})',
    'fill:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M4.3 11.5h14.2l-5.7 5.7a2.2 2.2 0 0 1-3.1 0z",fill:"currentColor",fillOpacity:"0.2",stroke:"none"}),h.jsx("path",{d:"M11.2 3.8l7.6 7.6-6 6a2.2 2.2 0 0 1-3.1 0l-5.2-5.2a2.2 2.2 0 0 1 0-3.1z"}),h.jsx("path",{d:"M4.5 11.5h14",strokeWidth:1.5}),h.jsx("path",{d:"M19.5 14.8s-1.7 2.1-1.7 3.3a1.7 1.7 0 0 0 3.4 0c0-1.2-1.7-3.3-1.7-3.3z",fill:"currentColor",fillOpacity:"0.28",strokeWidth:1.5})]})'
  ],
  // 19. ruler (Thước kẻ / Dụng cụ đo)
  [
    'ruler:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"m3 16 13-13 5 5-13 13z"}),h.jsx("path",{d:"m7 12 2 2M10 9l2 2M13 6l2 2"})]})',
    'ruler:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M16.2 3.4l4.4 4.4a1.2 1.2 0 0 1 0 1.7L9.5 20.6a1.2 1.2 0 0 1-1.7 0l-4.4-4.4a1.2 1.2 0 0 1 0-1.7L14.5 3.4a1.2 1.2 0 0 1 1.7 0z",fill:"currentColor",fillOpacity:"0.1"}),h.jsx("path",{d:"M12.2 5.9l2.1 2.1M9.5 8.6l1.5 1.5M6.8 11.3l2.1 2.1",strokeWidth:1.55})]})'
  ],
  // 20. select (Chọn đối tượng)
  [
    'select:()=>h.jsx(Te,{children:h.jsx("path",{d:"M4 7V4h3M10 4h4M17 4h3v3M20 10v4M20 17v3h-3M14 20h-4M7 20H4v-3M4 14v-4"})})',
    'select:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M4.5 8V6A1.5 1.5 0 0 1 6 4.5h2M11 4.5h2M16 4.5h2A1.5 1.5 0 0 1 19.5 6v2M19.5 11v1.2M4.5 11v2M4.5 16v2A1.5 1.5 0 0 0 6 19.5h2M11 19.5h1.2"}),h.jsx("path",{d:"M14 13.8l6.2 2.4-2.6 1-1 2.6z",fill:"currentColor",fillOpacity:"0.25",strokeWidth:1.6})]})'
  ],
  // 21. hand (Bàn tay di chuyển bảng)
  [
    'hand:()=>h.jsx(Te,{children:h.jsx("path",{d:"M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 8-7 8-3 0-4.5-2-6-5l-1.5-3a1.5 1.5 0 0 1 2.6-1.5L8 14"})})',
    'hand:()=>h.jsx(Te,{children:h.jsx("path",{d:"M18.2 11.2V6.2a1.45 1.45 0 0 0-2.9 0v4.3M15.3 10.5V4.8a1.45 1.45 0 0 0-2.9 0v5.7M12.4 10.5V5.8a1.45 1.45 0 0 0-2.9 0v6.5M9.5 12.8V8.8a1.45 1.45 0 0 0-2.9 0v5.5c0 3.9 2.7 6.8 6.6 6.8 3.7 0 6.1-2.6 6.1-6.4v-3.5a1.45 1.45 0 0 0-2.9 0",fill:"currentColor",fillOpacity:"0.08"})})'
  ],
  // 22. finger (Bật/Tắt vẽ bằng ngón tay)
  [
    'finger:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M9 11V5a1.5 1.5 0 0 1 3 0v6M12 10V9a1.5 1.5 0 0 1 3 0v3M15 11a1.5 1.5 0 0 1 3 0v3c0 4-2.5 7-6.5 7-2.5 0-4-1.5-5.5-4l-2-3.5a1.5 1.5 0 0 1 2.6-1.5L9 14"}),h.jsx("path",{d:"M17 3l3 3M20 3l-3 3",strokeWidth:1.4})]})',
    'finger:()=>h.jsxs(Te,{children:[h.jsx("path",{d:"M9.8 11.5V5.2a1.55 1.55 0 0 1 3.1 0v5.8M12.9 10.6a1.45 1.45 0 0 1 2.9 0v2.4M15.8 12a1.45 1.45 0 0 1 2.9 0v2.4c0 3.7-2.5 6.4-6.2 6.4-2.5 0-4.2-1.4-5.6-3.9l-1.8-3.1a1.4 1.4 0 0 1 2.4-1.4l2.3 2.6",fill:"currentColor",fillOpacity:"0.08"}),h.jsx("path",{d:"M17.4 3.8l3.1 3.1M20.5 3.8l-3.1 3.1",strokeWidth:1.65})]})'
  ]
];

for (let i = 0; i < replacements.length; i++) {
  const [target] = replacements[i];
  const count = code.split(target).length - 1;
  if (count !== 1) {
    throw new Error(`Replacement #${i} (${target.slice(0, 35)}) matched ${count} times, expected 1!`);
  }
}

for (const [target, rep] of replacements) {
  code = code.replace(target, rep);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log(`Successfully redesigned all ${replacements.length - 1} shortcut icons!`);
