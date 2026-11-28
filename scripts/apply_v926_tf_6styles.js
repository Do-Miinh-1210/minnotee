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
 * Idempotent patch for MinNote v0.0.9.26 (Part 2):
 *  - Gives EVERY ONE of the 6 problem frames (classic, boxed, bar, dashed, shadow, exam)
 *    its own unique, matching True/False (\choiceTF) table layout, multiple-choice
 *    (A/B/C/D) badge style, and short-answer (\shortans) card style!
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TARGET = path.resolve(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
const MARKER = '/*__MN_V926_SIX_UNIQUE_TF_MC_SHORT_STYLES__*/';

let src = fs.readFileSync(TARGET, 'utf8');
if (src.includes(MARKER)) {
  console.log('[v926-tf6] Patch already applied — skipping.');
  process.exit(0);
}

const vwStartAnchor = 'function Vw(e,t,n=!0){';
const vwEndAnchor = 'return e.restore(),n?T:j}function xR(';
const vwStart = src.indexOf(vwStartAnchor);
const vwEnd = src.indexOf(vwEndAnchor);
if (vwStart < 0 || vwEnd < 0 || vwEnd <= vwStart) {
  throw new Error('[v926-tf6] Failed to locate Vw function bounds');
}

const newVw = MARKER + `function Vw(e,t,n=!0){var C;const o=t.typst?QJ:JJ(t.tex),s=t.size,i=t.color,r=s*.9,a=t.frame;e.save(),e.textBaseline="alphabetic",e.textAlign="left";const rr=(q,U,Y,ee,ce)=>{e.beginPath(),e.roundRect?e.roundRect(q,U,Y,ee,ce):e.rect(q,U,Y,ee)},drawChk=(cx,cy,sz,col)=>{e.save(),e.strokeStyle=col,e.lineWidth=Math.max(1.4,sz*.22),e.lineCap="round",e.lineJoin="round",e.beginPath(),e.moveTo(cx-sz*.42,cy+sz*.04),e.lineTo(cx-sz*.08,cy+sz*.38),e.lineTo(cx+sz*.48,cy-sz*.32),e.stroke(),e.restore()},l=a==="classic"&&t.title?s*1.95:0,c=a==="boxed"&&t.title?s*1.58:0,plaqueH=a==="dashed"&&t.title?s*1.85:0,u=a==="bar"?s*.42:0,padX=a==="exam"?0:a==="shadow"?r*1.12:r,p=t.x+padX+u,d=t.w-(a==="exam"?0:2*padX+u),m=t.y+(a==="exam"?s*.2:l?l+s*.72:c?c+s*.52:plaqueH?plaqueH+s*.65:a==="shadow"?r*1.08:r),g=\`700 \${s}px \${Xg.serif}\`,gUi=\`700 \${s*.86}px \${D2}\`,v=!!(t.title&&(a==="bar"||a==="shadow"||a==="exam")),y=o.side!==void 0?i4(e,(C=t.figs)==null?void 0:C[o.side],0,0,d*.45,s,!1):null,k=y?d-y.w-s:d,w=(_,E,P)=>{const qT=tt(),lblT=qT.problemTrue,lblF=qT.problemFalse,chT=(lblT||"Đ")[0],chF=(lblF||"S")[0];
if(a==="bar"){
  // Style 3 (Vạch nhấn tối giản): 4 floating left-accent statement cards + inline segmented [ Đúng | Sai ] toggle pill (no boxy table!)
  const segW=s*5.5,segH=s*1.36,lblCol=s*1.45,pad=s*.46,gap=s*.34,textW=Math.max(s*6,k-lblCol-segW-s*1.05);
  let curY=E;
  _.items.forEach((q,U)=>{
    const yEnd=Xu(dc(e,q,s),p+lblCol+pad*.3,curY+pad,textW,s,!1),textH=yEnd-curY-pad,rh=Math.max(s*2.05,textH+2*pad),cy=curY+rh/2;
    if(P){
      const rad=s*.44;
      e.save(),rr(p,curY,k,rh,rad),e.clip(),e.fillStyle="#ffffff",e.fillRect(p,curY,k,rh),e.fillStyle=EM(i,.045),e.fillRect(p,curY,k,rh),e.fillStyle=i,e.fillRect(p,curY,s*.2,rh),e.restore();
      rr(p,curY,k,rh,rad),e.lineWidth=Math.max(.9,s*.055),e.strokeStyle=EM(i,.18),e.stroke();
      e.font=g,e.fillStyle=i,e.fillText(\`\${String.fromCharCode(97+U)})\`,p+s*.48,cy+s*.32);
      Xu(dc(e,q,s),p+lblCol+pad*.3,curY+(rh-textH)/2,textW,s,!0);
      const sx=p+k-segW-s*.42,sy=cy-segH/2,hw=segW/2,he=_.right.includes(U);
      e.save(),rr(sx,sy,segW,segH,s*.34),e.clip(),e.fillStyle="#ffffff",e.fillRect(sx,sy,segW,segH);
      if(t.answers){e.fillStyle=he?"#059669":"#e11d48",e.fillRect(he?sx:sx+hw,sy,hw,segH)}
      e.strokeStyle=EM(i,.22),e.lineWidth=Math.max(.9,s*.05),e.beginPath(),e.moveTo(sx+hw,sy),e.lineTo(sx+hw,sy+segH),e.stroke(),e.restore();
      rr(sx,sy,segW,segH,s*.34),e.lineWidth=Math.max(1,s*.06),e.strokeStyle=EM(i,.28),e.stroke();
      e.font=\`700 \${s*.7}px \${D2}\`,e.textAlign="center";
      e.fillStyle=t.answers&&he?"#ffffff":"#475569",e.fillText(lblT,sx+hw/2,cy+s*.24,hw-s*.2);
      e.fillStyle=t.answers&&!he?"#ffffff":"#475569",e.fillText(lblF,sx+hw*1.5,cy+s*.24,hw-s*.2);
      e.textAlign="left";
    }
    curY+=rh+gap;
  });
  return _.items.length?curY-gap:E;
}
if(a==="shadow"){
  // Style 5 (Thẻ nổi hiện đại): 4 elevated white pill cards with soft drop shadow + solid circle a-b-c-d + vibrant circular Đ / S emblem buttons
  const btnZone=s*3.45,lblCol=s*1.75,pad=s*.48,gap=s*.38,textW=Math.max(s*6,k-lblCol-btnZone-s*.75);
  let curY=E;
  _.items.forEach((q,U)=>{
    const yEnd=Xu(dc(e,q,s),p+lblCol+pad*.35,curY+pad,textW,s,!1),textH=yEnd-curY-pad,rh=Math.max(s*2.15,textH+2*pad),cy=curY+rh/2;
    if(P){
      const rad=s*.56;
      e.save(),e.shadowColor="rgba(15, 23, 42, 0.08)",e.shadowBlur=s*.52,e.shadowOffsetY=s*.16,rr(p,curY,k,rh,rad),e.fillStyle="#ffffff",e.fill(),e.restore();
      rr(p,curY,k,rh,rad),e.lineWidth=Math.max(.95,s*.055),e.strokeStyle="#e2e8f0",e.stroke();
      const lx=p+s*.92;
      e.beginPath(),e.arc(lx,cy,s*.52,0,Math.PI*2),e.fillStyle=i,e.fill();
      e.font=\`700 \${s*.74}px \${D2}\`,e.textAlign="center",e.fillStyle="#ffffff",e.fillText(String.fromCharCode(97+U),lx,cy+s*.25),e.textAlign="left";
      Xu(dc(e,q,s),p+lblCol+pad*.35,curY+(rh-textH)/2,textW,s,!0);
      const he=_.right.includes(U),bRad=s*.56,cxF=p+k-s*.95,cxT=cxF-s*1.48;
      [[cxT,!0,chT,"#059669","#ecfdf5","#6ee7b7","#047857"],[cxF,!1,chF,"#e11d48","#fff1f2","#fda4af","#be123c"]].forEach(([cx,isT,ch,sol,bgSoft,bdSoft,fgSoft])=>{
        const on=t.answers&&isT===he,dim=t.answers&&!on;
        if(on){e.beginPath(),e.arc(cx,cy,bRad+s*.13,0,Math.PI*2),e.fillStyle=isT?"rgba(5,150,105,0.2)":"rgba(225,29,72,0.2)",e.fill()}
        e.beginPath(),e.arc(cx,cy,bRad,0,Math.PI*2),e.fillStyle=on?sol:dim?"#f8fafc":bgSoft,e.fill();
        e.lineWidth=Math.max(1.1,s*.07),e.strokeStyle=on?sol:dim?"#cbd5e1":bdSoft,e.stroke();
        e.font=\`700 \${s*.72}px \${D2}\`,e.textAlign="center",e.fillStyle=on?"#ffffff":dim?"#94a3b8":fgSoft,e.fillText(ch,cx,cy+s*.25),e.textAlign="left";
      });
    }
    curY+=rh+gap;
  });
  return _.items.length?curY-gap:E;
}
if(a==="dashed"){
  // Style 4 (Khung góc sắc nét): Academic Olympiad double-rule ledger table (Ý | Mệnh đề | Đ | S) + bullseye target circles
  const colL=s*1.85,colTF=s*2.25,colM=Math.max(s*6,k-colL-2*colTF),hdrH=s*1.65,pad=s*.46;
  const rows=[];let curY=E+hdrH;
  _.items.forEach(q=>{const yEnd=Xu(dc(e,q,s),p+colL+pad*.85,curY+pad,colM-pad*1.7,s,!1),textH=yEnd-curY-pad,rh=Math.max(s*1.92,textH+2*pad);rows.push({y:curY,h:rh,textH,runs:q}),curY+=rh});
  if(P){
    e.fillStyle=EM(i,.06),e.fillRect(p,E,k,hdrH);
    e.font=\`700 \${s*.8}px \${D2}\`,e.textAlign="center",e.fillStyle=i;
    e.fillText(qT.problemTrue==="Đúng"?"Ý":"#",p+colL/2,E+hdrH/2+s*.28);
    e.fillText(qT.problemStatement,p+colL+colM/2,E+hdrH/2+s*.28,colM-s*.5);
    e.fillText(chT,p+colL+colM+colTF/2,E+hdrH/2+s*.28);
    e.fillText(chF,p+colL+colM+colTF*1.5,E+hdrH/2+s*.28);
    e.textAlign="left";
    rows.forEach((rw,U)=>{
      e.strokeStyle=EM(i,.2),e.lineWidth=Math.max(.85,s*.048),e.beginPath(),e.moveTo(p,rw.y),e.lineTo(p+k,rw.y),e.stroke();
      const cy=rw.y+rw.h/2;
      e.font=g,e.textAlign="center",e.fillStyle=i,e.fillText(\`\${String.fromCharCode(97+U)})\`,p+colL/2,cy+s*.32),e.textAlign="left";
      Xu(dc(e,rw.runs,s),p+colL+pad*.85,rw.y+(rw.h-rw.textH)/2,colM-pad*1.7,s,!0);
      const he=_.right.includes(U);
      [0,1].forEach(re=>{
        const cx=p+colL+colM+re*colTF+colTF/2,on=t.answers&&re===0===he;
        e.beginPath(),e.arc(cx,cy,s*.46,0,Math.PI*2),e.fillStyle="#ffffff",e.fill(),e.lineWidth=Math.max(1.15,s*.07),e.strokeStyle=on?i:EM(i,.48),e.stroke();
        if(on){e.beginPath(),e.arc(cx,cy,s*.27,0,Math.PI*2),e.fillStyle=i,e.fill()}
        else{e.beginPath(),e.arc(cx,cy,s*.22,0,Math.PI*2),e.lineWidth=Math.max(.7,s*.04),e.strokeStyle=EM(i,.22),e.stroke()}
      });
    });
    e.strokeStyle=EM(i,.28),e.lineWidth=Math.max(.9,s*.05);
    [p+colL,p+colL+colM,p+colL+colM+colTF].forEach(vx=>{e.beginPath(),e.moveTo(vx,E),e.lineTo(vx,curY),e.stroke()});
    // Double top & bottom academic rules
    e.strokeStyle=i,e.lineWidth=Math.max(1.6,s*.1),e.beginPath(),e.moveTo(p,E),e.lineTo(p+k,E),e.moveTo(p,curY),e.lineTo(p+k,curY),e.stroke();
    e.strokeStyle=EM(i,.45),e.lineWidth=Math.max(.75,s*.045),e.beginPath(),e.moveTo(p,E+s*.16),e.lineTo(p+k,E+s*.16),e.moveTo(p,curY-s*.16),e.lineTo(p+k,curY-s*.16),e.stroke();
  }
  return curY;
}
if(a==="exam"){
  // Style 6 (Đề thi chuẩn): Borderless official Vietnamese exam paper style — hairline rules + serif a) + minimalist [  ] / [ ✓ ] check slots
  const colTF=s*2.75,colM=Math.max(s*6,k-2*colTF),hdrH=s*1.28,lblCol=s*1.35,pad=s*.42;
  const rows=[];let curY=E+hdrH;
  _.items.forEach(q=>{const yEnd=Xu(dc(e,q,s),p+lblCol,curY+pad,colM-lblCol-s*.4,s,!1),textH=yEnd-curY-pad,rh=Math.max(s*1.82,textH+2*pad);rows.push({y:curY,h:rh,textH,runs:q}),curY+=rh});
  if(P){
    e.font=\`700 \${s*.76}px \${D2}\`,e.textAlign="center",e.fillStyle=EM(i,.82);
    e.fillText(lblT,p+colM+colTF/2,E+hdrH-s*.36);
    e.fillText(lblF,p+colM+colTF*1.5,E+hdrH-s*.36);
    e.textAlign="left";
    e.strokeStyle=EM(i,.38),e.lineWidth=Math.max(1,s*.06),e.beginPath(),e.moveTo(p,E+hdrH),e.lineTo(p+k,E+hdrH),e.stroke();
    rows.forEach((rw,U)=>{
      if(U>0){e.save(),e.strokeStyle=EM(i,.22),e.lineWidth=Math.max(.85,s*.048),e.setLineDash([s*.14,s*.18]),e.beginPath(),e.moveTo(p,rw.y),e.lineTo(p+k,rw.y),e.stroke(),e.restore()}
      const cy=rw.y+rw.h/2;
      e.font=g,e.fillStyle=i,e.fillText(\`\${String.fromCharCode(97+U)})\`,p,cy+s*.32);
      Xu(dc(e,rw.runs,s),p+lblCol,rw.y+(rw.h-rw.textH)/2,colM-lblCol-s*.4,s,!0);
      const he=_.right.includes(U),bw=s*1.12,bh=s*.92,hook=s*.22;
      [0,1].forEach(re=>{
        const cx=p+colM+re*colTF+colTF/2,on=t.answers&&re===0===he,x0=cx-bw/2,x1=cx+bw/2,y0=cy-bh/2,y1=cy+bh/2;
        e.save(),e.strokeStyle=on?i:EM(i,.48),e.lineWidth=Math.max(1.1,s*.07),e.lineCap="round",e.beginPath();
        e.moveTo(x0+hook,y0),e.lineTo(x0,y0),e.lineTo(x0,y1),e.lineTo(x0+hook,y1);
        e.moveTo(x1-hook,y0),e.lineTo(x1,y0),e.lineTo(x1,y1),e.lineTo(x1-hook,y1);
        e.stroke(),e.restore();
        if(on)drawChk(cx,cy,s*.55,i);
      });
    });
  }
  return curY;
}
if(a==="boxed"){
  // Style 2 (Nhãn nổi trên viền): Bold solid accent header grid + rounded-square [a][b][c][d] badges + crisp square checkboxes [✓]
  const colTF=s*3.05,colM=Math.max(s*6,k-2*colTF),hdrH=s*1.75,rad=s*.4,pad=s*.46,lblCol=s*1.68;
  const rows=[];let curY=E+hdrH;
  _.items.forEach(q=>{const yEnd=Xu(dc(e,q,s),p+lblCol+pad*.45,curY+pad,colM-lblCol-pad*1.4,s,!1),textH=yEnd-curY-pad,rh=Math.max(s*1.95,textH+2*pad);rows.push({y:curY,h:rh,textH,runs:q}),curY+=rh});
  const totalH=curY-E;
  if(P){
    e.save(),rr(p,E,k,totalH,rad),e.fillStyle="#ffffff",e.fill(),e.clip();
    e.fillStyle=i,e.fillRect(p,E,k,hdrH);
    e.font=gUi,e.textAlign="center",e.fillStyle="#ffffff";
    e.fillText(qT.problemStatement,p+colM/2,E+hdrH/2+s*.3,colM-s*.6);
    e.fillText(lblT,p+colM+colTF/2,E+hdrH/2+s*.3,colTF-s*.3);
    e.fillText(lblF,p+colM+colTF*1.5,E+hdrH/2+s*.3,colTF-s*.3);
    e.textAlign="left";
    e.strokeStyle="rgba(255,255,255,0.28)",e.lineWidth=Math.max(.9,s*.05),[p+colM,p+colM+colTF].forEach(vx=>{e.beginPath(),e.moveTo(vx,E),e.lineTo(vx,E+hdrH),e.stroke()});
    rows.forEach((rw,U)=>{
      e.strokeStyle=EM(i,.2),e.lineWidth=Math.max(.9,s*.05),e.beginPath(),e.moveTo(p,rw.y),e.lineTo(p+k,rw.y),e.stroke();
      const cy=rw.y+rw.h/2,sqS=s*1.04,sx=p+s*.42;
      rr(sx,cy-sqS/2,sqS,sqS,s*.24),e.fillStyle=EM(i,.13),e.fill(),e.lineWidth=Math.max(.9,s*.05),e.strokeStyle=EM(i,.34),e.stroke();
      e.font=\`700 \${s*.74}px \${D2}\`,e.textAlign="center",e.fillStyle=i,e.fillText(String.fromCharCode(97+U),sx+sqS/2,cy+s*.25),e.textAlign="left";
      Xu(dc(e,rw.runs,s),p+lblCol+pad*.45,rw.y+(rw.h-rw.textH)/2,colM-lblCol-pad*1.4,s,!0);
      const he=_.right.includes(U),cb=s*.96;
      [0,1].forEach(re=>{
        const cx=p+colM+re*colTF+colTF/2,on=t.answers&&re===0===he;
        rr(cx-cb/2,cy-cb/2,cb,cb,s*.22),e.fillStyle=on?i:"#ffffff",e.fill(),e.lineWidth=Math.max(1.2,s*.075),e.strokeStyle=on?i:EM(i,.46),e.stroke();
        if(on)drawChk(cx,cy,s*.52,"#ffffff");
      });
    });
    e.strokeStyle=EM(i,.2),e.lineWidth=Math.max(.9,s*.05),[p+colM,p+colM+colTF].forEach(vx=>{e.beginPath(),e.moveTo(vx,E+hdrH),e.lineTo(vx,curY),e.stroke()});
    e.restore(),rr(p,E,k,totalH,rad),e.lineWidth=Math.max(1.2,s*.075),e.strokeStyle=EM(i,.42),e.stroke();
  }
  return curY;
}
// Style 1 (classic — Thẻ tiêu đề mềm): Soft banded rounded table + Đ / S capsule pill badges (color-coded green/rose on answer reveal!)
const colTF=s*2.95,colM=Math.max(s*6,k-2*colTF),hdrH=s*1.65,rad=s*.48,pad=s*.46,lblCol=s*1.62;
const rows=[];let curY=E+hdrH;
_.items.forEach(q=>{const yEnd=Xu(dc(e,q,s),p+lblCol+pad*.45,curY+pad,colM-lblCol-pad*1.4,s,!1),textH=yEnd-curY-pad,rh=Math.max(s*1.95,textH+2*pad);rows.push({y:curY,h:rh,textH,runs:q}),curY+=rh});
const totalH=curY-E;
if(P){
  e.save(),rr(p,E,k,totalH,rad),e.fillStyle="#ffffff",e.fill(),e.clip();
  e.fillStyle=EM(i,.11),e.fillRect(p,E,k,hdrH);
  e.font=gUi,e.textAlign="center",e.fillStyle=i;
  e.fillText(qT.problemStatement,p+colM/2,E+hdrH/2+s*.3,colM-s*.6);
  e.fillText(lblT,p+colM+colTF/2,E+hdrH/2+s*.3,colTF-s*.3);
  e.fillText(lblF,p+colM+colTF*1.5,E+hdrH/2+s*.3,colTF-s*.3);
  e.textAlign="left";
  rows.forEach((rw,U)=>{
    U%2===1&&(e.fillStyle=EM(i,.035),e.fillRect(p,rw.y,k,rw.h));
    e.strokeStyle=EM(i,.14),e.lineWidth=Math.max(.9,s*.05),e.beginPath(),e.moveTo(p,rw.y),e.lineTo(p+k,rw.y),e.stroke();
    const cy=rw.y+rw.h/2,lx=p+lblCol*.55;
    e.beginPath(),e.arc(lx,cy,s*.5,0,Math.PI*2),e.fillStyle=EM(i,.12),e.fill();
    e.font=\`700 \${s*.74}px \${D2}\`,e.textAlign="center",e.fillStyle=i,e.fillText(String.fromCharCode(97+U),lx,cy+s*.25),e.textAlign="left";
    Xu(dc(e,rw.runs,s),p+lblCol+pad*.45,rw.y+(rw.h-rw.textH)/2,colM-lblCol-pad*1.4,s,!0);
    const he=_.right.includes(U),pw=s*1.62,ph=s*1.12;
    [0,1].forEach(re=>{
      const cx=p+colM+re*colTF+colTF/2,isT=re===0,on=t.answers&&isT===he,sol=isT?"#059669":"#e11d48";
      rr(cx-pw/2,cy-ph/2,pw,ph,ph/2),e.fillStyle=on?sol:"#ffffff",e.fill(),e.lineWidth=Math.max(1,s*.065),e.strokeStyle=on?sol:EM(i,.3),e.stroke();
      e.font=\`700 \${s*.7}px \${D2}\`,e.textAlign="center",e.fillStyle=on?"#ffffff":EM(i,.72),e.fillText(isT?chT:chF,cx,cy+s*.24),e.textAlign="left";
    });
  });
  e.strokeStyle=EM(i,.14),e.lineWidth=Math.max(.9,s*.05),[p+colM,p+colM+colTF].forEach(vx=>{e.beginPath(),e.moveTo(vx,E),e.lineTo(vx,curY),e.stroke()});
  e.restore(),rr(p,E,k,totalH,rad),e.lineWidth=Math.max(1,s*.065),e.strokeStyle=EM(i,.28),e.stroke();
}
return curY},x=(_,E=0)=>{var X,z;let P=m,L=0,O;if(v){if(a==="shadow"){e.font=gUi;const lbl=t.title.trim(),tw=e.measureText(lbl).width,pw=tw+s*1.05,ph=s*1.32;L=pw+s*.6,O=B=>{const ty=B-s*.98;rr(p,ty,pw,ph,ph/2),e.fillStyle=i,e.fill(),e.font=gUi,e.fillStyle="#ffffff",e.fillText(lbl,p+s*.52,ty+ph/2+s*.28)}}else if(a==="bar"){e.font=g;const lbl=\`\${t.title.replace(/[.:]\\s*$/,"")}.\`,tw=e.measureText(lbl).width;L=tw+s*.48,O=B=>{e.font=g,e.fillStyle=i,e.fillText(lbl,p,B)}}else{e.font=g;const lbl=\`\${t.title.replace(/[.:]\\s*$/,"")}.\`,tw=e.measureText(lbl).width,barW=s*.22,gap=s*.42;L=barW+gap+tw+s*.48,O=B=>{rr(p,B-s*.86,barW,s*1.04,barW/2),e.fillStyle=i,e.fill(),e.font=g,e.fillStyle=i,e.fillText(lbl,p+barW+gap,B)}}((X=o.blocks[0])==null?void 0:X.k)!=="para"&&(_&&O(P+s*.85),P+=s*1.45,L=0)}const G=($,B,F)=>$.forEach((K,H)=>{var R,q;if(H>0&&(P+=s*.36),K.k==="math")P=Xu(dc(e,[{t:"math",tex:\`\\\\displaystyle \${K.tex}\`}],s),p,P,B,s,_,0,!0);else if(K.k==="fig"){const U=i4(e,(R=t.figs)==null?void 0:R[K.i],0,0,B,s,!1);i4(e,(q=t.figs)==null?void 0:q[K.i],p+(B-U.w)/2,P,B,s,_),Lh==null||Lh.set(K.i,{x:p+(B-U.w)/2,y:P,...U}),P+=U.h}else if(K.k==="item"){const U=s*1.6;P=Xu(dc(e,K.runs,s),p+U,P,B-U,s,_,0,!1,Y=>{e.font=\`\${s}px \${Xg.serif}\`,e.fillStyle=wR,e.fillText(K.label,p+s*.3,Y)})}else{const U=F&&H===0;P=Xu(dc(e,K.runs,s),p,P,B,s,_,U?L:0,!1,U?O:void 0)}F&&H===0&&(L=0)});G(o.blocks,k,!0);const Z=o.choices;if((Z==null?void 0:Z.kind)==="tf"&&t.examLook!==!1)P=w(Z,P+s*.55,_);else if(Z){P+=s*.55;const $=Z.items.map((ee,ce)=>Z.kind==="tf"?\`\${String.fromCharCode(97+ce)})\`:\`\${String.fromCharCode(65+ce)}.\`),B=Z.kind==="choice"&&t.examLook!==!1,F=a==="bar"?s*1.4:s*1.22;e.font=g;const K=B?F+s*.48:Math.max(...$.map(ee=>e.measureText(ee).width))+s*.45,H=ee=>t.answers&&Z.kind==="tf"?[{t:"text",s:\` — \${Z.right.includes(ee)?tt().problemTrue:tt().problemFalse}\`,b:!0}]:[],R=Z.items.map((ee,ce)=>[...dc(e,ee,s),...dc(e,H(ce),s,i)]),q=Math.max(...R.map(ee=>ee.reduce((ce,he)=>ce+he.w,0))),U=Z.kind==="tf"?1:[4,2,1].find(ee=>K+q+s<=k/ee)??1,Y=k/U;for(let ee=0;ee<Math.ceil(R.length/U);ee++){let ce=P;const he=U>1?Math.max(0,...R.slice(ee*U,ee*U+U).flatMap(Q=>Q.map(re=>re.up))):0;for(let Q=0;Q<U;Q++){const re=ee*U+Q;if(re>=R.length)break;const be=p+Q*Y,Ee=Ae=>{if(B){const isRight=Z.right.includes(re),showAns=!!t.answers,ch=String.fromCharCode(65+re),cx=be+F/2,cy=Ae-s*.33,rad=s*.6;
  if(a==="boxed"){const sq=s*1.16;rr(cx-sq/2,cy-sq/2,sq,sq,s*.24),e.fillStyle=showAns&&!isRight?EM(i,.18):i,e.fill(),e.font=\`700 \${s*.72}px \${D2}\`,e.textAlign="center",e.fillStyle="#ffffff",e.fillText(ch,cx,cy+s*.25),e.textAlign="left";return}
  if(a==="bar"){const pw=F,ph=s*1.12;rr(be,cy-ph/2,pw,ph,ph/2),e.fillStyle=showAns&&isRight?i:showAns?EM(i,.04):EM(i,.12),e.fill(),e.lineWidth=Math.max(1,s*.065),e.strokeStyle=showAns&&!isRight?EM(i,.22):EM(i,.38),e.stroke(),e.font=\`700 \${s*.7}px \${D2}\`,e.textAlign="center",e.fillStyle=showAns&&isRight?"#ffffff":showAns?EM(i,.45):i,e.fillText(ch,be+pw/2,cy+s*.24),e.textAlign="left";return}
  if(a==="dashed"){e.beginPath(),e.arc(cx,cy,rad,0,Math.PI*2),e.fillStyle=showAns&&isRight?i:"#ffffff",e.fill(),e.lineWidth=Math.max(1.2,s*.075),e.strokeStyle=showAns&&!isRight?EM(i,.3):i,e.stroke(),!(showAns&&isRight)&&(e.beginPath(),e.arc(cx,cy,rad-s*.14,0,Math.PI*2),e.lineWidth=Math.max(.7,s*.04),e.strokeStyle=EM(i,.28),e.stroke()),e.font=\`700 \${s*.74}px \${Xg.serif}\`,e.textAlign="center",e.fillStyle=showAns&&isRight?"#ffffff":showAns?EM(i,.42):i,e.fillText(ch,cx,cy+s*.26),e.textAlign="left";return}
  if(a==="shadow"){e.save(),e.shadowColor="rgba(15, 23, 42, 0.14)",e.shadowBlur=s*.32,e.shadowOffsetY=s*.1,e.beginPath(),e.arc(cx,cy,rad,0,Math.PI*2),e.fillStyle=showAns&&isRight?i:"#ffffff",e.fill(),e.restore(),e.beginPath(),e.arc(cx,cy,rad,0,Math.PI*2),e.lineWidth=Math.max(1,s*.06),e.strokeStyle=showAns&&isRight?i:"#cbd5e1",e.stroke(),e.font=\`700 \${s*.72}px \${D2}\`,e.textAlign="center",e.fillStyle=showAns&&isRight?"#ffffff":showAns?EM(i,.42):i,e.fillText(ch,cx,cy+s*.25),e.textAlign="left";return}
  if(a==="exam"){e.font=g;const lbl=\`\${ch}.\`,tw=e.measureText(lbl).width;if(showAns&&isRight){e.beginPath(),e.arc(be+tw/2,Ae-s*.3,s*.62,0,Math.PI*2),e.fillStyle=i,e.fill(),e.fillStyle="#ffffff",e.fillText(lbl,be,Ae)}else{e.fillStyle=showAns?EM(i,.42):i,e.fillText(lbl,be,Ae),!showAns&&(e.fillStyle=EM(i,.32),e.fillRect(be,Ae+s*.14,tw,Math.max(1.3,s*.08)))}return}
  if(showAns&&isRight){e.beginPath(),e.arc(cx,cy,rad+s*.15,0,Math.PI*2),e.fillStyle=EM(i,.2),e.fill(),e.beginPath(),e.arc(cx,cy,rad,0,Math.PI*2),e.fillStyle=i,e.fill(),e.font=\`700 \${s*.72}px \${D2}\`,e.textAlign="center",e.fillStyle="#ffffff",e.fillText(ch,cx,cy+s*.25),e.textAlign="left"}else{e.beginPath(),e.arc(cx,cy,rad,0,Math.PI*2),e.fillStyle=showAns?EM(i,.03):EM(i,.09),e.fill(),e.lineWidth=Math.max(1.2,s*.08),e.strokeStyle=showAns?EM(i,.28):i,e.stroke(),e.font=\`700 \${s*.72}px \${D2}\`,e.textAlign="center",e.fillStyle=showAns?EM(i,.45):i,e.fillText(ch,cx,cy+s*.25),e.textAlign="left"}return}if(e.font=g,t.answers&&Z.kind==="choice"&&Z.right.includes(re)){const ye=e.measureText($[re]).width;e.fillStyle=i,e.beginPath(),e.arc(be+ye/2,Ae-s*.3,s*.62,0,Math.PI*2),e.fill(),e.fillStyle="#fff"}else e.fillStyle=i;e.fillText($[re],be,Ae)};ce=Math.max(ce,Xu(R[re],be+K,P,Y-K-(U>1?s*.5:0),s,_,0,!1,Ee,he))}P=ce+s*.36}P-=s*.36}if(o.short&&t.examLook===!1){P+=s*.48,e.font=g;const $=\`\${tt().problemAnswer} \`,B=e.measureText($).width;_&&(e.fillStyle=i,e.fillText($,p,P+s*.8)),t.answers?P=Xu(dc(e,o.short,s,i),p+B,P,k-B,s,_):(_&&(e.save(),e.strokeStyle="#94a3b8",e.lineWidth=Math.max(1,s*.055),e.setLineDash([s*.12,s*.22]),e.beginPath(),e.moveTo(p+B,P+s*.9),e.lineTo(p+Math.min(k,B+s*12),P+s*.9),e.stroke(),e.restore()),P+=s*1.1)}if(y&&(_&&i4(e,(z=t.figs)==null?void 0:z[o.side],p+d-y.w,m,d*.45,s,!0),Lh==null||Lh.set(o.side,{x:p+d-y.w,y:m,...y}),P=Math.max(P,m+y.h)),o.short&&t.examLook!==!1){P+=s*.58+E;
  if(a==="exam"){
    const boxH=s*1.5;
    if(_){e.font=g;const lbl=\`\${tt().problemAnswer} \`,lw=e.measureText(lbl).width;e.fillStyle=i,e.fillText(lbl,p,P+s*.95);const x0=p+lw+s*.2,x1=p+Math.min(d,lw+s*11);e.save(),e.strokeStyle=EM(i,.45),e.lineWidth=Math.max(1,s*.06),e.setLineDash([s*.12,s*.2]),e.beginPath(),e.moveTo(x0,P+s*1.08),e.lineTo(x1,P+s*1.08),e.stroke(),e.restore();if(t.answers){const U=dc(e,o.short,s,i);Xu(U,x0+s*.3,P+s*.12,x1-x0-s*.5,s,!0)}}
    P+=boxH;
  }else if(a==="boxed"){
    const totalW=Math.min(d,s*12),boxH=s*2.25,bx=p+d-totalW,cellN=4,lblW=s*4.2,gridW=totalW-lblW-s*.5,cw=(gridW-s*.36)/cellN;
    if(_){e.font=\`700 \${s*.7}px \${D2}\`,e.fillStyle=i,e.fillText(tt().problemResult,bx,P+boxH/2+s*.24);const gx=bx+lblW,plain=o.short.length===1&&o.short[0].t==="text"?o.short[0].s.trim():"";if(t.answers&&plain&&plain.length<=cellN){const padL=Math.floor((cellN-plain.length)/2);for(let ci=0;ci<cellN;ci++){const ch=plain[ci-padL]||"",cx0=gx+ci*(cw+s*.12);rr(cx0,P+s*.18,cw,boxH-s*.36,s*.24),e.fillStyle=ch?EM(i,.1):"#ffffff",e.fill(),e.lineWidth=Math.max(1.2,s*.075),e.strokeStyle=i,e.stroke(),ch&&(e.font=\`700 \${s*.95}px \${D2}\`,e.textAlign="center",e.fillStyle=i,e.fillText(ch,cx0+cw/2,P+boxH/2+s*.32),e.textAlign="left")}}else if(t.answers){const U=dc(e,o.short,s,i),Y=U.reduce((ce,he)=>ce+he.w,0);rr(gx,P+s*.18,gridW,boxH-s*.36,s*.24),e.fillStyle="#ffffff",e.fill(),e.fillStyle=EM(i,.09),e.fill(),e.lineWidth=Math.max(1.2,s*.075),e.strokeStyle=i,e.stroke(),Xu(U,gx+Math.max(s*.3,(gridW-Y)/2),P+s*.18+(boxH-s*.36-s*1.05)/2,gridW-s*.6,s,!0)}else{for(let ci=0;ci<cellN;ci++){rr(gx+ci*(cw+s*.12),P+s*.18,cw,boxH-s*.36,s*.24),e.fillStyle="#ffffff",e.fill(),e.lineWidth=Math.max(1.2,s*.075),e.strokeStyle=i,e.stroke()}}}
    P+=boxH;
  }else if(a==="bar"){
    // Style 3 (Vạch nhấn tối giản): Full-width left-accent answer callout strip
    const boxH=s*1.95;
    if(_){const rad=s*.42;e.save(),rr(p,P,d,boxH,rad),e.clip();const gr=e.createLinearGradient(p,P,p+d,P);gr.addColorStop(0,EM(i,.08)),gr.addColorStop(1,EM(i,.015)),e.fillStyle="#ffffff",e.fillRect(p,P,d,boxH),e.fillStyle=gr,e.fillRect(p,P,d,boxH),e.fillStyle=i,e.fillRect(p,P,s*.24,boxH),e.restore(),rr(p,P,d,boxH,rad),e.lineWidth=Math.max(.9,s*.055),e.strokeStyle=EM(i,.2),e.stroke();e.font=\`700 \${s*.76}px \${D2}\`;const lbl=tt().problemResult,lw=e.measureText(lbl).width;e.fillStyle=i,e.fillText(lbl,p+s*.62,P+boxH/2+s*.27);const x0=p+s*.95+lw,x1=p+d-s*.55;if(t.answers){const U=dc(e,o.short,s,i),Y=U.reduce((ce,he)=>ce+he.w,0),pw=Math.min(x1-x0,Math.max(s*3.2,Y+s*1.1)),ph=s*1.28;rr(x0,P+(boxH-ph)/2,pw,ph,ph/2),e.fillStyle=i,e.fill(),Xu(dc(e,o.short,s,"#ffffff"),x0+(pw-Y)/2,P+(boxH-s*1.05)/2,pw-s*.6,s,!0)}else{e.save(),e.strokeStyle=EM(i,.38),e.lineWidth=Math.max(1,s*.055),e.setLineDash([s*.14,s*.2]),e.beginPath(),e.moveTo(x0,P+boxH*.66),e.lineTo(x1,P+boxH*.66),e.stroke(),e.restore()}}
    P+=boxH;
  }else if(a==="dashed"){
    // Style 4 (Khung góc sắc nét): Double-bordered academic ledger box
    const totalW=Math.min(d,s*12.2),lblW=s*4.3,boxH=s*2.05,bx=p+d-totalW;
    if(_){rr(bx,P,totalW,boxH,s*.2),e.fillStyle="#ffffff",e.fill(),e.lineWidth=Math.max(1.3,s*.08),e.strokeStyle=i,e.stroke(),rr(bx+s*.16,P+s*.16,totalW-s*.32,boxH-s*.32,s*.12),e.lineWidth=Math.max(.75,s*.042),e.strokeStyle=EM(i,.28),e.stroke(),e.fillStyle=EM(i,.09),e.fillRect(bx+s*.16,P+s*.16,lblW,boxH-s*.32),e.strokeStyle=EM(i,.35),e.lineWidth=Math.max(.9,s*.05),e.beginPath(),e.moveTo(bx+s*.16+lblW,P+s*.16),e.lineTo(bx+s*.16+lblW,P+boxH-s*.16),e.stroke(),e.font=\`700 \${s*.68}px \${D2}\`,e.textAlign="center",e.fillStyle=i,e.fillText(tt().problemResult,bx+s*.16+lblW/2,P+boxH/2+s*.24),e.textAlign="left";if(t.answers){const sx=bx+lblW+s*.3,sw=totalW-lblW-s*.55,U=dc(e,o.short,s,i),Y=U.reduce((ce,he)=>ce+he.w,0);Xu(U,sx+Math.max(s*.2,(sw-Y)/2),P+(boxH-s*1.05)/2,sw-s*.4,s,!0)}}
    P+=boxH;
  }else if(a==="shadow"){
    // Style 5 (Thẻ nổi hiện đại): Floating elevated white capsule card with solid accent pill badge
    const totalW=Math.min(d,s*12.6),lblW=s*4.5,boxH=s*2.1,bx=p+d-totalW;
    if(_){e.save(),e.shadowColor="rgba(15, 23, 42, 0.12)",e.shadowBlur=s*.62,e.shadowOffsetY=s*.22,rr(bx,P,totalW,boxH,boxH/2),e.fillStyle="#ffffff",e.fill(),e.restore(),rr(bx,P,totalW,boxH,boxH/2),e.lineWidth=Math.max(1,s*.06),e.strokeStyle="#e2e8f0",e.stroke(),rr(bx+s*.22,P+s*.22,lblW-s*.22,boxH-s*.44,(boxH-s*.44)/2),e.fillStyle=i,e.fill(),e.font=\`700 \${s*.68}px \${D2}\`,e.textAlign="center",e.fillStyle="#ffffff",e.fillText(tt().problemResult,bx+s*.22+(lblW-s*.22)/2,P+boxH/2+s*.23),e.textAlign="left";const sx=bx+lblW+s*.28,sw=totalW-lblW-s*.55;if(t.answers){const U=dc(e,o.short,s,i),Y=U.reduce((ce,he)=>ce+he.w,0);Xu(U,sx+Math.max(s*.25,(sw-Y)/2),P+(boxH-s*1.05)/2,sw-s*.5,s,!0)}else{e.save(),e.strokeStyle="#cbd5e1",e.lineWidth=Math.max(1.1,s*.06),e.setLineDash([s*.14,s*.18]),e.beginPath(),e.moveTo(sx+s*.25,P+boxH*.62),e.lineTo(sx+sw-s*.25,P+boxH*.62),e.stroke(),e.restore()}}
    P+=boxH;
  }else{
    // Style 1 (classic — Thẻ tiêu đề mềm): Soft pastel ribbon box (tinted label + crisp white bordered slot)
    const totalW=Math.min(d,s*12.4),lblW=s*4.4,boxH=s*1.95,bx=p+d-totalW,rad=s*.46;
    if(_){e.save(),rr(bx,P,totalW,boxH,rad),e.fillStyle="#ffffff",e.fill(),e.clip(),e.fillStyle=EM(i,.13),e.fillRect(bx,P,lblW,boxH),e.fillStyle=i,e.fillRect(bx,P,s*.2,boxH),e.strokeStyle=EM(i,.24),e.lineWidth=Math.max(.9,s*.05),e.beginPath(),e.moveTo(bx+lblW,P),e.lineTo(bx+lblW,P+boxH),e.stroke(),e.restore(),rr(bx,P,totalW,boxH,rad),e.lineWidth=Math.max(1.1,s*.068),e.strokeStyle=EM(i,.34),e.stroke(),e.font=\`700 \${s*.68}px \${D2}\`,e.textAlign="center",e.fillStyle=i,e.fillText(tt().problemResult,bx+s*.12+lblW/2,P+boxH/2+s*.23),e.textAlign="left";const sx=bx+lblW+s*.24,sw=totalW-lblW-s*.48;if(t.answers){const U=dc(e,o.short,s,i),Y=U.reduce((ce,he)=>ce+he.w,0);Xu(U,sx+Math.max(s*.2,(sw-Y)/2),P+(boxH-s*1.05)/2,sw-s*.4,s,!0)}}
    P+=boxH;
  }}return t.solution&&o.solution&&(P+=s*.72,_&&(e.save(),e.strokeStyle=EM(i,.18),e.lineWidth=Math.max(.9,s*.05),e.setLineDash([s*.18,s*.16]),e.beginPath(),e.moveTo(p,P-s*.22),e.lineTo(p+d,P-s*.22),e.stroke(),e.restore(),e.font=gUi,e.fillStyle=i,e.fillText(tt().problemSolution,p,P+s*.78)),P+=s*1.32,G(o.solution,d,!1)),P},j=x(!1)+(a==="exam"?s*.4:r)-t.y,T=Math.max(j,t.h);if(n){const{x:_,y:E,w:P}=t;if(a==="classic"){const rad=s*.62;e.save(),e.shadowColor="rgba(15, 23, 42, 0.065)",e.shadowBlur=s*.5,e.shadowOffsetY=s*.15,rr(_,E,P,T,rad),e.fillStyle="#ffffff",e.fill(),e.restore();if(l){e.save(),rr(_,E,P,T,rad),e.clip(),e.fillStyle=EM(i,.09),e.fillRect(_,E,P,l),e.fillStyle=i,e.fillRect(_,E,s*.24,l),e.strokeStyle=EM(i,.18),e.lineWidth=Math.max(1,s*.055),e.beginPath(),e.moveTo(_,E+l),e.lineTo(_+P,E+l),e.stroke(),e.font=gUi,e.fillStyle=i,e.fillText(t.title.trim(),_+r,E+l/2+s*.3),e.restore()}rr(_,E,P,T,rad),e.lineWidth=Math.max(1.15,s*.075),e.strokeStyle=EM(i,.3),e.stroke()}else if(a==="boxed"){const rad=s*.6,topOff=c?c/2:0;rr(_,E+topOff,P,T-topOff,rad),e.fillStyle="#ffffff",e.fill(),e.fillStyle=EM(i,.02),e.fill(),e.lineWidth=Math.max(1.35,s*.085),e.strokeStyle=EM(i,.52),e.stroke();if(c){e.font=gUi;const lbl=t.title.trim(),tw=e.measureText(lbl).width,pw=tw+s*1.5,px=_+r;e.save(),rr(px-s*.2,E-s*.06,pw+s*.4,c+s*.12,(c+s*.12)/2),e.fillStyle="#ffffff",e.fill(),e.shadowColor=EM(i,.28),e.shadowBlur=s*.4,e.shadowOffsetY=s*.12,rr(px,E,pw,c,c/2),e.fillStyle=i,e.fill(),e.restore(),e.font=gUi,e.fillStyle="#ffffff",e.fillText(lbl,px+s*.75,E+c/2+s*.3)}}else if(a==="bar"){const rad=s*.55;e.save(),rr(_,E,P,T,rad),e.clip();const gr=e.createLinearGradient(_,E,_+P,E);gr.addColorStop(0,EM(i,.07)),gr.addColorStop(1,EM(i,.012)),e.fillStyle="#ffffff",e.fillRect(_,E,P,T),e.fillStyle=gr,e.fillRect(_,E,P,T),e.fillStyle=i,e.fillRect(_,E,s*.28,T),e.restore(),rr(_,E,P,T,rad),e.lineWidth=Math.max(.9,s*.05),e.strokeStyle=EM(i,.15),e.stroke()}else if(a==="dashed"){const rad=s*.48;rr(_,E,P,T,rad),e.fillStyle="#ffffff",e.fill(),e.lineWidth=Math.max(1.3,s*.08),e.strokeStyle=EM(i,.5),e.stroke(),rr(_+s*.2,E+s*.2,P-s*.4,T-s*.4,Math.max(0,rad-s*.16)),e.lineWidth=Math.max(.8,s*.04),e.strokeStyle=EM(i,.14),e.stroke();if(plaqueH){e.save(),rr(_,E,P,T,rad),e.clip(),e.font=gUi;const lbl=t.title.trim(),tw=e.measureText(lbl).width,pw=tw+s*1.65;e.beginPath(),e.roundRect?e.roundRect(_,E,pw,plaqueH,[0,0,s*.55,0]):e.rect(_,E,pw,plaqueH),e.fillStyle=i,e.fill(),e.fillStyle="#ffffff",e.fillText(lbl,_+s*.78,E+plaqueH/2+s*.3),e.restore()}}else if(a==="shadow"){const rad=s*.78;e.save(),e.shadowColor="rgba(15, 23, 42, 0.095)",e.shadowBlur=s*1.15,e.shadowOffsetX=0,e.shadowOffsetY=s*.32,rr(_,E,P,T,rad),e.fillStyle="#ffffff",e.fill(),e.restore(),rr(_,E,P,T,rad),e.lineWidth=Math.max(1,s*.06),e.strokeStyle="#e2e8f0",e.stroke()}else if(a==="exam"){e.save(),e.strokeStyle=EM(i,.2),e.lineWidth=Math.max(1,s*.055),e.beginPath(),e.moveTo(_,E+T-s*.06),e.lineTo(_+P,E+T-s*.06),e.stroke(),e.restore()}x(!0,T-j)}return e.restore(),n?T:j}function xR(`;

src = src.slice(0, vwStart) + newVw + src.slice(vwEnd + vwEndAnchor.length);

fs.writeFileSync(TARGET, src, 'utf8');
console.log('[v926-tf6] Successfully applied 6 distinct True/False, MC, and Short-Answer styles!');

/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
