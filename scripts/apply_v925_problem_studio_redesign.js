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
/**
 * Idempotent patch for MinNote v0.0.9.25 (V2 Studio Polish):
 *  - Brand-new 100% original Vietnamese & English Toán THPT sample questions
 *    (TN, ĐS, TLN, TL + LaTeX/Typst placeholders).
 *  - Completely refined 6 MinNote Signature problem frame formats (classic, boxed,
 *    bar, dashed, shadow, exam) + unified Đúng/Sai table (no noisy side wire),
 *    crisp circular A/B/C/D badges, sleek short-answer bar, and Cobalt academic palette.
 *  - Tactile sliding ON/OFF rocker switches for [Đề bài <-> Hình TikZ],
 *    [LaTeX <-> Typst], and [Hình sửa được <-> Ảnh TeX], plus crisp 2-tier settings bar.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TARGET = path.resolve(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
const MARKER = '/*__MN_V925_PROBLEM_STUDIO_REDESIGN_V2__*/';

let src = fs.readFileSync(TARGET, 'utf8');
if (src.includes(MARKER)) {
  console.log('[v925-v2] Patch already applied — skipping.');
  process.exit(0);
}

function replaceExact(str, find, repl, label) {
  const idx = str.indexOf(find);
  if (idx < 0) throw new Error(`[v925-v2] Anchor NOT FOUND: ${label}`);
  if (str.indexOf(find, idx + 1) >= 0) throw new Error(`[v925-v2] Anchor NOT UNIQUE: ${label}`);
  return str.slice(0, idx) + repl + str.slice(idx + find.length);
}

function replaceRange(str, startAnchor, endAnchor, repl, label) {
  const sIdx = str.indexOf(startAnchor);
  if (sIdx < 0) throw new Error(`[v925-v2] Start anchor NOT FOUND: ${label}`);
  const eIdx = str.indexOf(endAnchor, sIdx);
  if (eIdx < 0) throw new Error(`[v925-v2] End anchor NOT FOUND: ${label}`);
  return str.slice(0, sIdx) + repl + str.slice(eIdx + endAnchor.length);
}

// 1. Modern MinNote signature academic palette
src = replaceExact(
  src,
  'const ZF=["classic","boxed","bar","dashed","shadow","exam"],n4=["#650f12","#1e63d6","#2e7d32","#e65100","#6a1b9a","#37474f"]',
  MARKER + 'const ZF=["classic","boxed","bar","dashed","shadow","exam"],n4=["#2563eb","#0f766e","#4f46e5","#e11d48","#d97706","#334155"]',
  'ZF + n4 palette'
);

// 2. Brand-new Vietnamese sample questions + placeholder (SGK Toán THPT Mới)
src = replaceRange(
  src,
  'problemPlaceholder:`Dán đề vào đây',
  '\\end{ex}`}},problemHelp:"Nhận đoạn văn',
  'problemPlaceholder:`Dán đề vào đây, ví dụ:\n\\\\begin{ex}\nTập nghiệm của bất phương trình $\\\\log_2(x-1)<3$ là\n\\\\choice{$(-\\\\infty;9)$}{\\\\True $(1;9)$}{$(1;7)$}{$(9;+\\\\infty)$}\n\\\\end{ex}`,problemSampleHead:"Chèn mẫu câu hỏi:",problemSampleReplace:"Thay nội dung đang có trong ô đề bằng câu mẫu này?",problemSamples:{choice:{label:"Trắc nghiệm (TN)",tex:`\\\\begin{ex}%Trắc nghiệm nhiều lựa chọn — đặt \\\\True trước đáp án đúng\nTập nghiệm của bất phương trình $\\\\log_2(x - 1) < 3$ là\n\\\\choice\n{$(-\\\\infty; 9)$}\n{\\\\True $(1; 9)$}\n{$(1; 7)$}\n{$(9; +\\\\infty)$}\n\\\\loigiai{Điều kiện $x > 1$. Bất phương trình tương đương $x - 1 < 2^3 \\\\Leftrightarrow x < 9$. Vậy $S = (1; 9)$.}\n\\\\end{ex}`},tf:{label:"Đúng / sai (ĐS)",tex:`\\\\begin{ex}%Trắc nghiệm Đúng / Sai — đặt \\\\True trước mệnh đề đúng\nCho hàm số $y = \\\\dfrac{x^2 - 2x + 2}{x - 1}$ có đồ thị $(C)$.\n\\\\choiceTF\n{\\\\True Tập xác định của hàm số là $D = \\\\mathbb{R} \\\\setminus \\\\{1\\\\}$}\n{\\\\True Tiệm cận xiên của $(C)$ là đường thẳng $y = x - 1$}\n{Hàm số đồng biến trên khoảng $(0; 2)$}\n{\\\\True Tâm đối xứng của $(C)$ là điểm $I(1; 0)$}\n\\\\loigiai{Ta có $y = x - 1 + \\\\dfrac{1}{x - 1}$, $y\' = 1 - \\\\dfrac{1}{(x-1)^2} = 0 \\\\Leftrightarrow x = 0$ hoặc $x = 2$. Do đó a), b), d) đúng; c) sai vì hàm nghịch biến trên $(0;1)$ và $(1;2)$.}\n\\\\end{ex}`},short:{label:"Trả lời ngắn (TLN)",tex:`\\\\begin{ex}%Trả lời ngắn — ghi đáp số vào trong \\\\shortans{...}\nTính diện tích hình phẳng giới hạn bởi đồ thị hàm số $y = 4 - x^2$ và trục hoành (làm tròn đến hàng phần mười).\n\\\\shortans{10,7}\n\\\\loigiai{Hoành độ giao điểm $4 - x^2 = 0 \\\\Leftrightarrow x = \\\\pm 2$. Diện tích $S = \\\\int_{-2}^{2}(4 - x^2)\\\\,\\\\mathrm{d}x = \\\\dfrac{32}{3} \\\\approx 10{,}7$.}\n\\\\end{ex}`},essay:{label:"Tự luận (TL)",tex:`\\\\begin{ex}%Tự luận — nhập đề bài và lời giải trong \\\\loigiai{...}\nTrong không gian $Oxyz$, viết phương trình mặt phẳng $(P)$ đi qua $M(1; -2; 3)$ và vuông góc với đường thẳng $d:\\\\ \\\\dfrac{x-1}{2}=\\\\dfrac{y+1}{-1}=\\\\dfrac{z}{2}$.\n\\\\loigiai{Mặt phẳng $(P)$ nhận $\\\\vec{u}_d = (2; -1; 2)$ làm vectơ pháp tuyến nên có phương trình $2(x-1)-(y+2)+2(z-3)=0 \\\\Leftrightarrow 2x - y + 2z - 10 = 0$.}\n\\\\end{ex}`}},problemHelp:"Nhận đoạn văn',
  'VN problemPlaceholder & problemSamples'
);

// 3. Brand-new English sample questions + placeholder
src = replaceRange(
  src,
  'problemPlaceholder:`Paste the problem here',
  '\\end{ex}`}},problemHelp:"Takes text with',
  'problemPlaceholder:`Paste the problem here, for example:\n\\\\begin{ex}\nThe solution set of $\\\\log_2(x-1)<3$ is\n\\\\choice{$(-\\\\infty,9)$}{\\\\True $(1,9)$}{$(1,7)$}{$(9,+\\\\infty)$}\n\\\\end{ex}`,problemSampleHead:"Insert an example:",problemSampleReplace:"Replace what is in the box with this example?",problemSamples:{choice:{label:"Multiple choice",tex:`\\\\begin{ex}%Multiple choice — put \\\\True before the right option\nThe solution set of $\\\\log_2(x - 1) < 3$ is\n\\\\choice\n{$(-\\\\infty, 9)$}\n{\\\\True $(1, 9)$}\n{$(1, 7)$}\n{$(9, +\\\\infty)$}\n\\\\loigiai{Domain $x > 1$. Since $x - 1 < 2^3 = 8$, we get $1 < x < 9$.}\n\\\\end{ex}`},tf:{label:"True / false",tex:`\\\\begin{ex}%True or false — put \\\\True before each true statement\nConsider $y = \\\\dfrac{x^2 - 2x + 2}{x - 1}$ with graph $(C)$.\n\\\\choiceTF\n{\\\\True The domain is $D = \\\\mathbb{R} \\\\setminus \\\\{1\\\\}$}\n{\\\\True The slant asymptote of $(C)$ is $y = x - 1$}\n{The function is increasing on $(0, 2)$}\n{\\\\True The center of symmetry of $(C)$ is $I(1, 0)$}\n\\\\loigiai{$y = x - 1 + \\\\dfrac{1}{x - 1}$ and $y\' = 1 - \\\\dfrac{1}{(x-1)^2}$, so a), b), d) are true while c) is false.}\n\\\\end{ex}`},short:{label:"Short answer",tex:`\\\\begin{ex}%Short answer — put the answer inside \\\\shortans{...}\nFind the area enclosed by $y = 4 - x^2$ and the $x$-axis (rounded to one decimal place).\n\\\\shortans{10.7}\n\\\\loigiai{$S = \\\\int_{-2}^{2}(4 - x^2)\\\\,\\\\mathrm{d}x = \\\\dfrac{32}{3} \\\\approx 10.7$.}\n\\\\end{ex}`},essay:{label:"Essay",tex:`\\\\begin{ex}%Essay — problem statement and solution inside \\\\loigiai{...}\nFind the equation of plane $(P)$ passing through $M(1, -2, 3)$ and perpendicular to $\\\\vec{n} = (2, -1, 2)$.\n\\\\loigiai{$2(x-1) - (y+2) + 2(z-3) = 0 \\\\Leftrightarrow 2x - y + 2z - 10 = 0$.}\n\\\\end{ex}`}},problemHelp:"Takes text with',
  'EN problemPlaceholder & problemSamples'
);

// 4. Fresh Typst placeholder (VN)
src = replaceRange(
  src,
  'problemTypstPlaceholder:`Dán đề vào đây, ví dụ:',
  '[*D.* $3$])`',
  'problemTypstPlaceholder:`Dán đề vào đây, ví dụ:\n*Câu 1.* Tập nghiệm của bất phương trình $log_2(x - 1) < 3$ là\n\n#grid(columns: 4, gutter: 1em,\n  [*A.* $(-infinity; 9)$], [*B.* $(1; 9)$], [*C.* $(1; 7)$], [*D.* $(9; +infinity)$])`',
  'VN Typst placeholder'
);

// 5. Fresh Vietnamese & English frame names
src = replaceExact(
  src,
  'problemFrameNames:{classic:"Thanh tiêu đề",boxed:"Tiêu đề trên viền",bar:"Vạch bên trái",dashed:"Viền nét đứt",shadow:"Đổ bóng",exam:"Kiểu đề thi"}',
  'problemFrameNames:{classic:"Thẻ tiêu đề mềm",boxed:"Nhãn nổi trên viền",bar:"Vạch nhấn tối giản",dashed:"Khung góc sắc nét",shadow:"Thẻ nổi hiện đại",exam:"Đề thi chuẩn"}',
  'VN problemFrameNames'
);
src = replaceExact(
  src,
  'problemFrameNames:{classic:"Title bar",boxed:"Title on the edge",bar:"Bar on the left",dashed:"Dashed edge",shadow:"Shadow",exam:"Exam paper"}',
  'problemFrameNames:{classic:"Soft header",boxed:"Floating badge",bar:"Minimal stripe",dashed:"Corner plaque",shadow:"Elevated card",exam:"Clean exam"}',
  'EN problemFrameNames'
);

// 6. Replace Vw(e, t, n=!0) with ultra-polished, harmonious 6 MinNote Signature frames + unified TF table + refined A/B/C/D + sleek short-answer bar
const vwStartAnchor = 'function Vw(e,t,n=!0){';
const vwEndAnchor = 'return e.restore(),n?T:j}function xR(';
const vwStart = src.indexOf(vwStartAnchor);
const vwEnd = src.indexOf(vwEndAnchor);
if (vwStart < 0 || vwEnd < 0 || vwEnd <= vwStart) {
  throw new Error('[v925-v2] Failed to locate Vw function bounds');
}

const newVw = `function Vw(e,t,n=!0){var C;const o=t.typst?QJ:JJ(t.tex),s=t.size,i=t.color,r=s*.9,a=t.frame;e.save(),e.textBaseline="alphabetic",e.textAlign="left";const rr=(q,U,Y,ee,ce)=>{e.beginPath(),e.roundRect?e.roundRect(q,U,Y,ee,ce):e.rect(q,U,Y,ee)},l=a==="classic"&&t.title?s*1.95:0,c=a==="boxed"&&t.title?s*1.58:0,plaqueH=a==="dashed"&&t.title?s*1.85:0,u=a==="bar"?s*.42:0,padX=a==="exam"?0:a==="shadow"?r*1.12:r,p=t.x+padX+u,d=t.w-(a==="exam"?0:2*padX+u),m=t.y+(a==="exam"?s*.2:l?l+s*.72:c?c+s*.52:plaqueH?plaqueH+s*.65:a==="shadow"?r*1.08:r),g=\`700 \${s}px \${Xg.serif}\`,gUi=\`700 \${s*.86}px \${D2}\`,v=!!(t.title&&(a==="bar"||a==="shadow"||a==="exam")),y=o.side!==void 0?i4(e,(C=t.figs)==null?void 0:C[o.side],0,0,d*.45,s,!1):null,k=y?d-y.w-s:d,w=(_,E,P)=>{const colTF=s*3.1,colM=k-2*colTF,hdrH=s*1.7,rad=s*.48,pad=s*.48,lblCol=s*1.65;const rows=[];let curY=E+hdrH;_.items.forEach(q=>{const yEnd=Xu(dc(e,q,s),p+lblCol+pad*.5,curY+pad,colM-lblCol-pad*1.5,s,!1),rh=Math.max(s*1.95,yEnd-curY+pad);rows.push({y:curY,h:rh,textH:yEnd-curY-pad,runs:q}),curY+=rh});const totalH=curY-E;if(P){const q=tt();e.save(),rr(p,E,k,totalH,rad),e.fillStyle="#ffffff",e.fill(),e.clip(),e.fillStyle=EM(i,.11),e.fillRect(p,E,k,hdrH),e.font=gUi,e.textAlign="center",e.fillStyle=i,e.fillText(q.problemStatement,p+colM/2,E+hdrH/2+s*.3,colM-s*.6),e.fillText(q.problemTrue,p+colM+colTF/2,E+hdrH/2+s*.3,colTF-s*.3),e.fillText(q.problemFalse,p+colM+colTF*1.5,E+hdrH/2+s*.3,colTF-s*.3),e.textAlign="left",rows.forEach((rw,U)=>{U%2===1&&(e.fillStyle=EM(i,.03),e.fillRect(p,rw.y,k,rw.h)),e.strokeStyle=EM(i,.14),e.lineWidth=Math.max(.9,s*.05),e.beginPath(),e.moveTo(p,rw.y),e.lineTo(p+k,rw.y),e.stroke();const cy=rw.y+rw.h/2,lx=p+lblCol*.56;e.beginPath(),e.arc(lx,cy,s*.52,0,Math.PI*2),e.fillStyle=EM(i,.12),e.fill(),e.font=\`700 \${s*.74}px \${D2}\`,e.textAlign="center",e.fillStyle=i,e.fillText(String.fromCharCode(97+U),lx,cy+s*.25),e.textAlign="left",Xu(dc(e,rw.runs,s),p+lblCol+pad*.5,rw.y+(rw.h-rw.textH)/2,colM-lblCol-pad*1.5,s,!0);const he=_.right.includes(U);[0,1].forEach(re=>{const cx=p+colM+re*colTF+colTF/2,on=t.answers&&re===0===he;e.beginPath(),e.arc(cx,cy,s*.48,0,Math.PI*2),e.fillStyle=on?i:"#ffffff",e.fill(),e.lineWidth=Math.max(1.1,s*.07),e.strokeStyle=on?i:EM(i,.38),e.stroke(),on&&(e.save(),e.strokeStyle="#ffffff",e.lineWidth=Math.max(1.4,s*.11),e.lineCap="round",e.lineJoin="round",e.beginPath(),e.moveTo(cx-s*.2,cy+s*.02),e.lineTo(cx-s*.04,cy+s*.19),e.lineTo(cx+s*.23,cy-s*.16),e.stroke(),e.restore())})}),e.strokeStyle=EM(i,.14),e.lineWidth=Math.max(.9,s*.05),[p+colM,p+colM+colTF].forEach(vx=>{e.beginPath(),e.moveTo(vx,E),e.lineTo(vx,curY),e.stroke()}),e.restore(),rr(p,E,k,totalH,rad),e.lineWidth=Math.max(1,s*.065),e.strokeStyle=EM(i,.28),e.stroke()}return curY},x=(_,E=0)=>{var X,z;let P=m,L=0,O;if(v){if(a==="shadow"){e.font=gUi;const lbl=t.title.trim(),tw=e.measureText(lbl).width,pw=tw+s*1.05,ph=s*1.32;L=pw+s*.6,O=B=>{const ty=B-s*.98;rr(p,ty,pw,ph,ph/2),e.fillStyle=i,e.fill(),e.font=gUi,e.fillStyle="#ffffff",e.fillText(lbl,p+s*.52,ty+ph/2+s*.28)}}else if(a==="bar"){e.font=g;const lbl=\`\${t.title.replace(/[.:]\\s*$/,"")}.\`,tw=e.measureText(lbl).width;L=tw+s*.48,O=B=>{e.font=g,e.fillStyle=i,e.fillText(lbl,p,B)}}else{e.font=g;const lbl=\`\${t.title.replace(/[.:]\\s*$/,"")}.\`,tw=e.measureText(lbl).width,barW=s*.22,gap=s*.42;L=barW+gap+tw+s*.48,O=B=>{rr(p,B-s*.86,barW,s*1.04,barW/2),e.fillStyle=i,e.fill(),e.font=g,e.fillStyle=i,e.fillText(lbl,p+barW+gap,B)}}((X=o.blocks[0])==null?void 0:X.k)!=="para"&&(_&&O(P+s*.85),P+=s*1.45,L=0)}const G=($,B,F)=>$.forEach((K,H)=>{var R,q;if(H>0&&(P+=s*.36),K.k==="math")P=Xu(dc(e,[{t:"math",tex:\`\\\\displaystyle \${K.tex}\`}],s),p,P,B,s,_,0,!0);else if(K.k==="fig"){const U=i4(e,(R=t.figs)==null?void 0:R[K.i],0,0,B,s,!1);i4(e,(q=t.figs)==null?void 0:q[K.i],p+(B-U.w)/2,P,B,s,_),Lh==null||Lh.set(K.i,{x:p+(B-U.w)/2,y:P,...U}),P+=U.h}else if(K.k==="item"){const U=s*1.6;P=Xu(dc(e,K.runs,s),p+U,P,B-U,s,_,0,!1,Y=>{e.font=\`\${s}px \${Xg.serif}\`,e.fillStyle=wR,e.fillText(K.label,p+s*.3,Y)})}else{const U=F&&H===0;P=Xu(dc(e,K.runs,s),p,P,B,s,_,U?L:0,!1,U?O:void 0)}F&&H===0&&(L=0)});G(o.blocks,k,!0);const Z=o.choices;if((Z==null?void 0:Z.kind)==="tf"&&t.examLook!==!1)P=w(Z,P+s*.55,_);else if(Z){P+=s*.55;const $=Z.items.map((ee,ce)=>Z.kind==="tf"?\`\${String.fromCharCode(97+ce)})\`:\`\${String.fromCharCode(65+ce)}.\`),B=Z.kind==="choice"&&t.examLook!==!1,F=s*1.22;e.font=g;const K=B?F+s*.48:Math.max(...$.map(ee=>e.measureText(ee).width))+s*.45,H=ee=>t.answers&&Z.kind==="tf"?[{t:"text",s:\` — \${Z.right.includes(ee)?tt().problemTrue:tt().problemFalse}\`,b:!0}]:[],R=Z.items.map((ee,ce)=>[...dc(e,ee,s),...dc(e,H(ce),s,i)]),q=Math.max(...R.map(ee=>ee.reduce((ce,he)=>ce+he.w,0))),U=Z.kind==="tf"?1:[4,2,1].find(ee=>K+q+s<=k/ee)??1,Y=k/U;for(let ee=0;ee<Math.ceil(R.length/U);ee++){let ce=P;const he=U>1?Math.max(0,...R.slice(ee*U,ee*U+U).flatMap(Q=>Q.map(re=>re.up))):0;for(let Q=0;Q<U;Q++){const re=ee*U+Q;if(re>=R.length)break;const be=p+Q*Y,Ee=Ae=>{if(B){const isRight=Z.right.includes(re),showAns=!!t.answers,cx=be+F/2,cy=Ae-s*.33,rad=F/2;if(showAns&&isRight){e.beginPath(),e.arc(cx,cy,rad+s*.15,0,Math.PI*2),e.fillStyle=EM(i,.2),e.fill(),e.beginPath(),e.arc(cx,cy,rad,0,Math.PI*2),e.fillStyle=i,e.fill(),e.font=\`700 \${s*.72}px \${D2}\`,e.textAlign="center",e.fillStyle="#ffffff",e.fillText(String.fromCharCode(65+re),cx,cy+s*.25),e.textAlign="left"}else{e.beginPath(),e.arc(cx,cy,rad,0,Math.PI*2),e.fillStyle=showAns?EM(i,.03):EM(i,.08),e.fill(),e.lineWidth=Math.max(1.2,s*.08),e.strokeStyle=showAns?EM(i,.28):i,e.stroke(),e.font=\`700 \${s*.72}px \${D2}\`,e.textAlign="center",e.fillStyle=showAns?EM(i,.45):i,e.fillText(String.fromCharCode(65+re),cx,cy+s*.25),e.textAlign="left"}return}if(e.font=g,t.answers&&Z.kind==="choice"&&Z.right.includes(re)){const ye=e.measureText($[re]).width;e.fillStyle=i,e.beginPath(),e.arc(be+ye/2,Ae-s*.3,s*.62,0,Math.PI*2),e.fill(),e.fillStyle="#fff"}else e.fillStyle=i;e.fillText($[re],be,Ae)};ce=Math.max(ce,Xu(R[re],be+K,P,Y-K-(U>1?s*.5:0),s,_,0,!1,Ee,he))}P=ce+s*.36}P-=s*.36}if(o.short&&t.examLook===!1){P+=s*.48,e.font=g;const $=\`\${tt().problemAnswer} \`,B=e.measureText($).width;_&&(e.fillStyle=i,e.fillText($,p,P+s*.8)),t.answers?P=Xu(dc(e,o.short,s,i),p+B,P,k-B,s,_):(_&&(e.save(),e.strokeStyle="#94a3b8",e.lineWidth=Math.max(1,s*.055),e.setLineDash([s*.12,s*.22]),e.beginPath(),e.moveTo(p+B,P+s*.9),e.lineTo(p+Math.min(k,B+s*12),P+s*.9),e.stroke(),e.restore()),P+=s*1.1)}if(y&&(_&&i4(e,(z=t.figs)==null?void 0:z[o.side],p+d-y.w,m,d*.45,s,!0),Lh==null||Lh.set(o.side,{x:p+d-y.w,y:m,...y}),P=Math.max(P,m+y.h)),o.short&&t.examLook!==!1){P+=s*.58+E;const totalW=Math.min(d,s*12.4),lblW=s*4.4,boxH=s*2.0,bx=p+d-totalW;if(_){rr(bx,P,totalW,boxH,s*.48),e.fillStyle=EM(i,.07),e.fill(),e.lineWidth=Math.max(1.1,s*.07),e.strokeStyle=EM(i,.32),e.stroke(),rr(bx+s*.18,P+s*.18,lblW-s*.18,boxH-s*.36,s*.34),e.fillStyle=i,e.fill(),e.font=\`700 \${s*.68}px \${D2}\`,e.textAlign="center",e.fillStyle="#ffffff",e.fillText(tt().problemResult,bx+s*.18+(lblW-s*.18)/2,P+boxH/2+s*.23);const sx=bx+lblW+s*.26,sw=totalW-lblW-s*.46;rr(sx,P+s*.2,sw,boxH-s*.4,s*.3),e.fillStyle="#ffffff",e.fill(),e.lineWidth=Math.max(1,s*.06),e.strokeStyle=EM(i,.26),e.stroke(),e.textAlign="left";if(t.answers){const U=dc(e,o.short,s,i),Y=U.reduce((ce,he)=>ce+he.w,0);Xu(U,sx+Math.max(s*.3,(sw-Y)/2),P+s*.2+(boxH-s*.4-s*1.05)/2,sw-s*.6,s,!0)}}P+=boxH}return t.solution&&o.solution&&(P+=s*.62,e.font=g,_&&(e.fillStyle=i,e.fillText(tt().problemSolution,p,P+s*.8)),P+=s*1.35,G(o.solution,d,!1)),P},j=x(!1)+(a==="exam"?s*.4:r)-t.y,T=Math.max(j,t.h);if(n){const{x:_,y:E,w:P}=t;if(a==="classic"){const rad=s*.62;e.save(),e.shadowColor="rgba(15, 23, 42, 0.065)",e.shadowBlur=s*.5,e.shadowOffsetY=s*.15,rr(_,E,P,T,rad),e.fillStyle="#ffffff",e.fill(),e.restore();if(l){e.save(),rr(_,E,P,T,rad),e.clip(),e.fillStyle=EM(i,.09),e.fillRect(_,E,P,l),e.fillStyle=i,e.fillRect(_,E,s*.24,l),e.strokeStyle=EM(i,.18),e.lineWidth=Math.max(1,s*.055),e.beginPath(),e.moveTo(_,E+l),e.lineTo(_+P,E+l),e.stroke(),e.font=gUi,e.fillStyle=i,e.fillText(t.title.trim(),_+r,E+l/2+s*.3),e.restore()}rr(_,E,P,T,rad),e.lineWidth=Math.max(1.15,s*.075),e.strokeStyle=EM(i,.3),e.stroke()}else if(a==="boxed"){const rad=s*.6,topOff=c?c/2:0;rr(_,E+topOff,P,T-topOff,rad),e.fillStyle="#ffffff",e.fill(),e.fillStyle=EM(i,.02),e.fill(),e.lineWidth=Math.max(1.35,s*.085),e.strokeStyle=EM(i,.52),e.stroke();if(c){e.font=gUi;const lbl=t.title.trim(),tw=e.measureText(lbl).width,pw=tw+s*1.5,px=_+r;e.save(),rr(px-s*.2,E-s*.06,pw+s*.4,c+s*.12,(c+s*.12)/2),e.fillStyle="#ffffff",e.fill(),e.shadowColor=EM(i,.28),e.shadowBlur=s*.4,e.shadowOffsetY=s*.12,rr(px,E,pw,c,c/2),e.fillStyle=i,e.fill(),e.restore(),e.font=gUi,e.fillStyle="#ffffff",e.fillText(lbl,px+s*.75,E+c/2+s*.3)}}else if(a==="bar"){const rad=s*.55;e.save(),rr(_,E,P,T,rad),e.clip();const gr=e.createLinearGradient(_,E,_+P,E);gr.addColorStop(0,EM(i,.07)),gr.addColorStop(1,EM(i,.012)),e.fillStyle="#ffffff",e.fillRect(_,E,P,T),e.fillStyle=gr,e.fillRect(_,E,P,T),e.fillStyle=i,e.fillRect(_,E,s*.28,T),e.restore(),rr(_,E,P,T,rad),e.lineWidth=Math.max(.9,s*.05),e.strokeStyle=EM(i,.15),e.stroke()}else if(a==="dashed"){const rad=s*.48;rr(_,E,P,T,rad),e.fillStyle="#ffffff",e.fill(),e.lineWidth=Math.max(1.3,s*.08),e.strokeStyle=EM(i,.5),e.stroke(),rr(_+s*.2,E+s*.2,P-s*.4,T-s*.4,Math.max(0,rad-s*.16)),e.lineWidth=Math.max(.8,s*.04),e.strokeStyle=EM(i,.14),e.stroke();if(plaqueH){e.save(),rr(_,E,P,T,rad),e.clip(),e.font=gUi;const lbl=t.title.trim(),tw=e.measureText(lbl).width,pw=tw+s*1.65;e.beginPath(),e.roundRect?e.roundRect(_,E,pw,plaqueH,[0,0,s*.55,0]):e.rect(_,E,pw,plaqueH),e.fillStyle=i,e.fill(),e.fillStyle="#ffffff",e.fillText(lbl,_+s*.78,E+plaqueH/2+s*.3),e.restore()}}else if(a==="shadow"){const rad=s*.78;e.save(),e.shadowColor="rgba(15, 23, 42, 0.095)",e.shadowBlur=s*1.15,e.shadowOffsetX=0,e.shadowOffsetY=s*.32,rr(_,E,P,T,rad),e.fillStyle="#ffffff",e.fill(),e.restore(),rr(_,E,P,T,rad),e.lineWidth=Math.max(1,s*.06),e.strokeStyle="#e2e8f0",e.stroke()}else if(a==="exam"){e.save(),e.strokeStyle=EM(i,.2),e.lineWidth=Math.max(1,s*.055),e.beginPath(),e.moveTo(_,E+T-s*.06),e.lineTo(_+P,E+T-s*.06),e.stroke(),e.restore()}x(!0,T-j)}return e.restore(),n?T:j}function xR(`;

src = src.slice(0, vwStart) + newVw + src.slice(vwEnd + vwEndAnchor.length);

// 7. Replace dual mode-switch tabs in Bo with tactile Sliding Rocker Switches (clicking anywhere flips both modes smoothly!)
src = replaceExact(
  src,
  'Bo=!e&&v===void 0&&l===void 0&&h.jsxs("div",{className:"problem-modes",children:[h.jsx("div",{className:"mode-switch",role:"group",children:["problem","tikz"].map(Ze=>h.jsx("button",{className:T===Ze?"on":"","aria-pressed":T===Ze,onClick:()=>C(Ze),children:Ze==="problem"?j.problemModeText:L?j.problemModeTypstFig:j.problemModeTikz},Ze))}),h.jsx("div",{className:"mode-switch",role:"group","aria-label":j.problemLang,children:["latex","typst"].map(Ze=>h.jsx("button",{className:_===Ze?"on":"","aria-pressed":_===Ze,onClick:()=>P(Ze),children:Ze==="latex"?"LaTeX":"Typst"},Ze))})]})',
  'Bo=!e&&v===void 0&&l===void 0&&h.jsxs("div",{className:"problem-modes mn-prob-topbar",children:[h.jsxs("button",{type:"button",className:`mn-rocker${T==="tikz"?" is-right":""}`,role:"switch","aria-checked":T==="tikz",title:"Bấm để chuyển đổi Đề bài ↔ Hình vẽ",onClick:()=>C(T==="problem"?"tikz":"problem"),children:[h.jsx("span",{className:"mn-rocker-thumb","aria-hidden":!0}),h.jsx("span",{className:`mn-rocker-opt${T==="problem"?" on":""}`,children:j.problemModeText}),h.jsx("span",{className:`mn-rocker-opt${T==="tikz"?" on":""}`,children:L?j.problemModeTypstFig:j.problemModeTikz})]}),h.jsxs("button",{type:"button",className:`mn-rocker is-lang${_==="typst"?" is-right":""}`,role:"switch","aria-checked":_==="typst","aria-label":j.problemLang,title:"Bấm để chuyển đổi LaTeX ↔ Typst",onClick:()=>P(_==="latex"?"typst":"latex"),children:[h.jsx("span",{className:"mn-rocker-thumb","aria-hidden":!0}),h.jsx("span",{className:`mn-rocker-opt${_==="latex"?" on":""}`,children:"LaTeX"}),h.jsx("span",{className:`mn-rocker-opt${_==="typst"?" on":""}`,children:"Typst"})]})]})',
  'Bo tactile sliding rockers'
);

// 8. Replace TikZ mode-switch (Hình sửa được <-> Ảnh TeX) in Noe with the same Sliding Rocker Switch
src = replaceExact(
  src,
  'h.jsx("div",{className:"problem-modes",children:h.jsx("div",{className:"mode-switch",role:"group","aria-label":c.tikzModes,children:["edit","image"].map(z=>h.jsx("button",{className:d===z?"on":"","aria-pressed":d===z,onClick:()=>g(z),children:z==="edit"?c.tikzModeEdit:c.tikzModeImage},z))})})',
  'h.jsx("div",{className:"problem-modes mn-prob-topbar",children:h.jsxs("button",{type:"button",className:`mn-rocker${d==="image"?" is-right":""}`,role:"switch","aria-checked":d==="image","aria-label":c.tikzModes,title:"Bấm để chuyển đổi Hình sửa được ↔ Ảnh TeX",onClick:()=>g(d==="edit"?"image":"edit"),children:[h.jsx("span",{className:"mn-rocker-thumb","aria-hidden":!0}),h.jsx("span",{className:`mn-rocker-opt${d==="edit"?" on":""}`,children:c.tikzModeEdit}),h.jsx("span",{className:`mn-rocker-opt${d==="image"?" on":""}`,children:c.tikzModeImage})]})})',
  'Noe TikZ sliding rocker'
);

// 9. Cleanly split the properties bar into Tier 1 (Title + Colors) & Tier 2 (Clean ON/OFF Display Switches) so zero awkward half-wrapped lines!
src = replaceExact(
  src,
  'h.jsxs("div",{className:"row",children:[h.jsxs("label",{className:"problem-name",children:[j.problemName,h.jsx("input",{type:"text",value:ee,onChange:Ze=>ce(Ze.target.value)})]}),h.jsxs("span",{className:"problem-colors",role:"group","aria-label":j.problemColor,children:[n4.map(Ze=>h.jsx("button",{className:`problem-swatch${Ze===R?" on":""}`,style:{background:Ze},title:Ze,"aria-pressed":Ze===R,onClick:()=>q(Ze)},Ze)),h.jsx("label",{className:`problem-swatch problem-pick${n4.includes(R)?"":" on"}`,style:{background:n4.includes(R)?void 0:R},title:j.problemPickColor,children:h.jsx("input",{type:"color",value:R,onChange:Ze=>q(Ze.target.value),"aria-label":j.problemPickColor})}),h.jsx("input",{type:"text",className:`problem-code${i8(U)?"":" bad"}`,value:U,maxLength:7,spellCheck:!1,"aria-label":j.problemColorCode,placeholder:"#650f12",onChange:Ze=>{Y(Ze.target.value);const _t=i8(Ze.target.value);_t&&q(_t)}})]}),!L&&h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:he,onChange:Ze=>Q(Ze.target.checked)})," ",j.problemShowAnswers]}),h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:G,onChange:Ze=>Z(Ze.target.checked)})," ",j.problemFull]}),_e.some(Ze=>Ze.solution)&&h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:Ee,onChange:Ze=>Ae(Ze.target.checked)})," ",j.problemShowSolution]}),_e.some(Ze=>Ze.choices||Ze.short)&&h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:re,onChange:Ze=>be(Ze.target.checked)})," ",j.problemExamLook]})]})',
  'h.jsxs("div",{className:"mn-prob-settings",children:[h.jsxs("div",{className:"mn-prob-row-top",children:[h.jsxs("label",{className:"problem-name",children:[j.problemName,h.jsx("input",{type:"text",value:ee,onChange:Ze=>ce(Ze.target.value)})]}),h.jsxs("span",{className:"problem-colors",role:"group","aria-label":j.problemColor,children:[n4.map(Ze=>h.jsx("button",{className:`problem-swatch${Ze===R?" on":""}`,style:{background:Ze},title:Ze,"aria-pressed":Ze===R,onClick:()=>q(Ze)},Ze)),h.jsx("label",{className:`problem-swatch problem-pick${n4.includes(R)?"":" on"}`,style:{background:n4.includes(R)?void 0:R},title:j.problemPickColor,children:h.jsx("input",{type:"color",value:R,onChange:Ze=>q(Ze.target.value),"aria-label":j.problemPickColor})}),h.jsx("input",{type:"text",className:`problem-code${i8(U)?"":" bad"}`,value:U,maxLength:7,spellCheck:!1,"aria-label":j.problemColorCode,placeholder:"#2563eb",onChange:Ze=>{Y(Ze.target.value);const _t=i8(Ze.target.value);_t&&q(_t)}})]})]}),h.jsxs("div",{className:"mn-prob-toggles",children:[_e.some(Ze=>Ze.choices||Ze.short)&&h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:re,onChange:Ze=>be(Ze.target.checked)}),h.jsx("span",{children:j.problemExamLook})]}),!L&&h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:he,onChange:Ze=>Q(Ze.target.checked)}),h.jsx("span",{children:j.problemShowAnswers})]}),_e.some(Ze=>Ze.solution)&&h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:Ee,onChange:Ze=>Ae(Ze.target.checked)}),h.jsx("span",{children:j.problemShowSolution})]}),h.jsxs("label",{className:"check",children:[h.jsx("input",{type:"checkbox",checked:G,onChange:Ze=>Z(Ze.target.checked)}),h.jsx("span",{children:j.problemFull})]})]})]})',
  '2-tier settings bar'
);

// 10. Crisp full-card width Loe preview thumbnail
src = replaceExact(
  src,
  'function Loe({item:e}){const t=D.useRef(null);return D.useEffect(()=>{const n=t.current,o=n==null?void 0:n.getContext("2d");if(!n||!o)return;const s=s8/(e.w+24),i=Math.min(260,(Pd(o,{...e,x:12,y:12})+24)*s),r=window.devicePixelRatio||1;n.width=Math.round(s8*r),n.height=Math.round(i*r),n.style.height=`${i}px`,o.setTransform(s*r,0,0,s*r,0,0),Vw(o,{...e,x:12,y:12})}),h.jsx("canvas",{ref:t,className:"problem-preview",style:{width:s8}})}',
  'function Loe({item:e}){const t=D.useRef(null);return D.useEffect(()=>{const n=t.current,o=n==null?void 0:n.getContext("2d");if(!n||!o)return;const pw=Math.max(340,Math.min(440,((n.parentElement&&n.parentElement.clientWidth-24)||420))),s=pw/(e.w+24),i=Math.min(270,(Pd(o,{...e,x:12,y:12})+24)*s),r=window.devicePixelRatio||1;n.width=Math.round(pw*r),n.height=Math.round(i*r),n.style.width=`${pw}px`,n.style.height=`${i}px`,o.setTransform(s*r,0,0,s*r,0,0),Vw(o,{...e,x:12,y:12})}),h.jsx("canvas",{ref:t,className:"problem-preview"})}',
  'Loe crisp responsive preview'
);

fs.writeFileSync(TARGET, src, 'utf8');
console.log('[v925-v2] Successfully applied V2 Problem Studio, new samples, 6 luxury frames & rocker switches!');

/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
