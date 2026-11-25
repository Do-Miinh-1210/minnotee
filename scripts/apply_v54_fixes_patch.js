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
const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let code = fs.readFileSync(targetFile, 'utf8');

function replaceOnce(label, target, replacement) {
  const idx = code.indexOf(target);
  if (idx === -1) throw new Error(`Anchor not found for [${label}]`);
  if (code.indexOf(target, idx + 1) !== -1) throw new Error(`Anchor not unique for [${label}]`);
  code = code.slice(0, idx) + replacement + code.slice(idx + target.length);
  console.log(`✓ Patched [${label}] at ${idx}`);
}

// 1. Fix white-screen crash in "Công cụ trên thanh..." (missing calc in lH & barTools + safe guard in coe)
replaceOnce(
  'Add calc icon to lH',
  'webPanel:oe.globe,timer:oe.timer,picker:oe.dice,text:oe.text,',
  'webPanel:oe.globe,timer:oe.timer,picker:oe.dice,calc:()=>h.jsxs(Te,{children:[h.jsx("rect",{x:"4.5",y:"2.8",width:"15",height:"18.4",rx:"2.6",fill:"currentColor",fillOpacity:"0.08"}),h.jsx("rect",{x:"7.5",y:"5.6",width:"9",height:"4.2",rx:"1.1",fill:"currentColor",fillOpacity:"0.2"}),h.jsx("circle",{cx:"8.6",cy:"13.3",r:"0.95",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"12",cy:"13.3",r:"0.95",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"15.4",cy:"13.3",r:"0.95",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"8.6",cy:"17.2",r:"0.95",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"12",cy:"17.2",r:"0.95",fill:"currentColor",stroke:"none"}),h.jsx("circle",{cx:"15.4",cy:"17.2",r:"0.95",fill:"currentColor",stroke:"none"})]}),text:oe.text,'
);

replaceOnce(
  'Safe fallback in coe()',
  'const t=lH[e];return h.jsx(t,{})};',
  'const t=lH[e];return t?h.jsx(t,{}):null};'
);

replaceOnce(
  'Add calc label to vi barTools',
  'sticker:"Sticker",text:"Chữ và đường kẻ",',
  'sticker:"Sticker",calc:"Máy tính",text:"Chữ và đường kẻ",'
);

replaceOnce(
  'Add calc label to en barTools',
  'sticker:"Sticker",text:"Text and lines",',
  'sticker:"Sticker",calc:"Calculator",text:"Text and lines",'
);

// 2. Soften overly saturated colors when splitting / unfolding / flattening 3D figures
replaceOnce(
  'Soften paintSplit cap & face alpha',
  't.globalAlpha=r.kind==="cap"?.8:.16,t.fill(),t.globalAlpha=1',
  't.globalAlpha=r.kind==="cap"?.32:.09,t.fill(),t.globalAlpha=1'
);

replaceOnce(
  'Soften paintNet face alpha',
  't.fillStyle=a[u.color%a.length],t.globalAlpha=.55,t.fill(),t.globalAlpha=1,t.stroke()',
  't.fillStyle=a[u.color%a.length],t.globalAlpha=.26,t.fill(),t.globalAlpha=1,t.stroke()'
);

replaceOnce(
  'Soften paintFlat highlight alpha',
  't.fillStyle="rgba(255, 152, 0, 0.25)",t.fill()',
  't.fillStyle="rgba(255, 152, 0, 0.16)",t.fill()'
);

// 3. Clearer default dot size & line formatting in Settings (Cài đặt -> HÌNH VẼ)
replaceOnce(
  'Clearer default dot size Pm()',
  'function Pm(e){return e.dotSize??5*(e.labelSize??Ll)/Ll}',
  'function Pm(e){return e.dotSize??5.5*(e.labelSize??Ll)/Ll}'
);

// 3a. Initialize board shapeStyle with saved geoLine defaults (clear default width 2.5, crisp black #111827)
replaceOnce(
  'Init shapeStyle from saved geoLine defaults',
  'A.pen=p,A.shapeStyle={color:p.color,width:Math.max(1.5,p.width*.8)},',
  'A.pen=p,A.shapeStyle={color:u.geoLineColor||p.color||"#111827",width:Number(u.geoLineWidth)||Math.max(2.2,p.width*.85)},u.geoLineDashed!==void 0&&(A.dashed=!!u.geoLineDashed),'
);

// 3b. Add state & UI controls for Default Line Style inside uoe() Settings dialog (right under Màu chấm tròn!)
replaceOnce(
  'Add geoLine state inside uoe()',
  '[xo,Hl]=D.useState(e.dotColor??""),[Oe,Qe]=D.useState(e.dotSize),',
  '[xo,Hl]=D.useState(e.dotColor??""),[Oe,Qe]=D.useState(e.dotSize),[gLC,sgLC]=D.useState(()=>{try{const _p=JSON.parse(localStorage.getItem(wC)??"{}");return _p.geoLineColor||""}catch{return""}}),[gLW,sgLW]=D.useState(()=>{try{const _p=JSON.parse(localStorage.getItem(wC)??"{}");return Number(_p.geoLineWidth)||2.5}catch{return 2.5}}),[gLD,sgLD]=D.useState(()=>{try{const _p=JSON.parse(localStorage.getItem(wC)??"{}");return!!_p.geoLineDashed}catch{return!1}}),'
);

const lineFormatUI = `
h.jsx("h4",{style:{marginTop:"14px"},children:"Định dạng đường mặc định"}),
h.jsx("label",{children:\`Độ dày nét đường: \${Number(gLW).toFixed(1)} px\`}),
h.jsxs("div",{className:"label-size",children:[
  h.jsx("input",{type:"range",min:1,max:6,step:.5,value:gLW,onChange:Ne=>sgLW(Number(Ne.target.value))}),
  h.jsx("span",{style:{minWidth:"56px",display:"inline-flex",alignItems:"center",justifyContent:"center"},children:
    h.jsx("svg",{width:52,height:16,viewBox:"0 0 52 16",children:
      h.jsx("line",{x1:2,y1:8,x2:50,y2:8,stroke:gLC||"#111827",strokeWidth:gLW,strokeLinecap:"round",strokeDasharray:gLD?"7 5":void 0})
    })
  })
]}),
h.jsx("label",{children:"Màu đường mặc định"}),
h.jsxs("div",{className:"paper-colors",children:[
  R0.map(Ne=>h.jsx("button",{className:\`swatch\${gLC===Ne?" on":""}\`,"aria-label":Ne||"Đen (mặc định)",onClick:()=>sgLC(Ne),children:h.jsx("span",{style:{background:Ne||"#111827"}})},Ne||"auto")),
  h.jsxs("label",{className:\`swatch custom\${gLC&&!R0.includes(gLC)?" on":""}\`,"aria-label":kt.otherColor,children:[
    h.jsx("input",{type:"color",value:gLC||"#111827",onChange:Ne=>sgLC(Ne.target.value)}),
    h.jsx("span",{style:{background:gLC&&!R0.includes(gLC)?gLC:h2}})
  ]})
]}),
h.jsx("label",{children:"Kiểu nét đường mặc định"}),
h.jsxs("div",{className:"paper-choices",style:{gridTemplateColumns:"1fr 1fr",marginBottom:"6px"},children:[
  h.jsxs("button",{className:\`paper-choice\${!gLD?" on":""}\`,onClick:()=>sgLD(!1),children:[h.jsx("svg",{width:34,height:12,viewBox:"0 0 34 12",children:h.jsx("line",{x1:2,y1:6,x2:32,y2:6,stroke:"currentColor",strokeWidth:2.2,strokeLinecap:"round"})}),"Nét liền"]}),
  h.jsxs("button",{className:\`paper-choice\${gLD?" on":""}\`,onClick:()=>sgLD(!0),children:[h.jsx("svg",{width:34,height:12,viewBox:"0 0 34 12",children:h.jsx("line",{x1:2,y1:6,x2:32,y2:6,stroke:"currentColor",strokeWidth:2.2,strokeLinecap:"round",strokeDasharray:"6 4"})}),"Nét đứt"]})
]}),
`.replace(/\n\s*/g, '');

replaceOnce(
  'Insert Default Line Format controls into Settings -> HÌNH VẼ',
  'h.jsx("h4",{children:kt.spaceTool}),',
  lineFormatUI + 'h.jsx("h4",{children:kt.spaceTool}),'
);

replaceOnce(
  'Persist & apply Default Line Format on Settings Apply',
  'onClick:()=>T({paper:fe,spacing:Zo,titleBox:zs,infinite:rs,names:xt,labelSize:Mn===Ll?void 0:Mn,labelColor:$n||void 0,dotColor:xo||void 0,dotSize:Oe,dots:No,margins:Bo,color:Ue===F0[0]?void 0:Ue,image:st,lineColor:Se||void 0,lineWeight:Yt===1?void 0:Yt,landscape:Ts,size:Ze},_,O,he,re,Ee,ye,qe,Z,z,B,P,ie,U,R,K,ee)',
  'onClick:()=>{ht({geoLineColor:gLC||"",geoLineWidth:gLW,geoLineDashed:!!gLD});const _b=window.__minnoteBoard;_b&&(_b.shapeStyle={color:gLC||"#111827",width:gLW},_b.dashed=!!gLD,_b.emit());T({paper:fe,spacing:Zo,titleBox:zs,infinite:rs,names:xt,labelSize:Mn===Ll?void 0:Mn,labelColor:$n||void 0,dotColor:xo||void 0,dotSize:Oe,dots:No,margins:Bo,color:Ue===F0[0]?void 0:Ue,image:st,lineColor:Se||void 0,lineWeight:Yt===1?void 0:Yt,landscape:Ts,size:Ze},_,O,he,re,Ee,ye,qe,Z,z,B,P,ie,U,R,K,ee)}'
);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully applied v0.0.5.4 fixes to', targetFile);
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
