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
// Idempotent patch script: v0.0.8.5 Seamless Replay FX & Zero-Stall Step Transitions
// Fixes every visual discontinuity in replay playback:
//  1. _drawPolylinesPartial batches consecutive polyline segments into ONE continuous path (continuous dash phase + smooth round joins)
//  2. _drawTip supports smooth alpha feather-out over end of stroke (no abrupt pop-off)
//  3. _teePartial:
//     - Monotonic progressive stroke progress (overshooting easings like spring never shrink a drawn stroke backwards!)
//     - Seamless pulse ('Nhịp nhấn'): smooth draw [0..0.70] -> luminous pulse along stroke + centered ripple [0.68..0.995] (zero tip-to-center teleport, zero stuck ring at pause!)
//     - Seamless glow ('Phát sáng'): feathers shadowBlur smoothly to 0 over [0.76..1.0] (zero snap into tee())
//     - Seamless spring & zoom: damped landing envelope lands smoothly on exact scale 1.000 at rawP=1
//  4. _ensureReplayLoop carries fractional leftover dt smoothly across step boundaries (zero 1-frame dead stall between steps!)
//  5. tempHide ('Vẽ rồi ẩn'): smooth draw [0..0.66] -> brief hold [0.66..0.76] -> silky smootherstep fade-out [0.76..1.0]
const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(targetPath, 'utf8');

const MARKER = '/*__MN_V85_SEAMLESS_FX__*/';
if (src.includes(MARKER)) {
  console.log('[v85-fx] Seamless FX patch already applied — skipping.');
  process.exit(0);
}

function replaceOnce(str, search, replacement, label) {
  let target = search;
  let repl = replacement;
  let idx = str.indexOf(target);
  if (idx === -1) {
    target = search.replace(/\r?\n/g, '\r\n');
    repl = replacement.replace(/\r?\n/g, '\r\n');
    idx = str.indexOf(target);
  }
  if (idx === -1) throw new Error(`[v85-fx] Anchor not found: ${label}`);
  const second = str.indexOf(target, idx + target.length);
  if (second !== -1) throw new Error(`[v85-fx] Anchor not unique: ${label}`);
  return str.slice(0, idx) + repl + str.slice(idx + target.length);
}

// 1. Upgrade _drawTip, _drawPolylinesPartial, and _teePartial header/effects
const oldHead = `function _drawTip(e,p,glow){
  if(!p)return;
  e.save(),e.setLineDash([]);
  if(glow){
    e.shadowColor="#38bdf8";e.shadowBlur=16;
    e.beginPath(),e.arc(p.x,p.y,8.5,0,Math.PI*2),e.fillStyle="rgba(56,189,248,0.28)",e.fill();
    e.beginPath(),e.arc(p.x,p.y,4.6,0,Math.PI*2),e.fillStyle="#38bdf8",e.fill();
    e.shadowBlur=0;
    e.beginPath(),e.arc(p.x,p.y,2.2,0,Math.PI*2),e.fillStyle="#ffffff",e.fill();
  }else{
    e.beginPath(),e.arc(p.x,p.y,5.5,0,Math.PI*2),e.fillStyle=(globalThis.__mnHi?globalThis.__mnHi(.28):"rgba(37,99,235,0.28)"),e.fill();
    e.beginPath(),e.arc(p.x,p.y,2.8,0,Math.PI*2),e.fillStyle=(globalThis.__mnHi?globalThis.__mnHi():"#2563eb"),e.fill();
  }
  e.restore();
}
function _drawPolylinesPartial(e,paths,p,rev){
  const list=rev?[...paths].reverse().map(x=>({...x,pts:[...x.pts].reverse()})):paths;
  const segs=[];let tot=0;
  for(const l of list){
    const pts=l.closed&&l.pts.length>1?[...l.pts,l.pts[0]]:l.pts;
    for(let i=1;i<pts.length;i++){
      const dx=pts[i].x-pts[i-1].x,dy=pts[i].y-pts[i-1].y,d=Math.hypot(dx,dy);
      if(d>1e-6){segs.push({a:pts[i-1],b:pts[i],dx,dy,d,dashed:!!l.dashed});tot+=d;}
    }
  }
  if(tot<1e-6)return null;
  let rem=tot*Math.max(0,Math.min(1,p)),tip=null;
  for(const sg of segs){
    if(rem<=0)break;
    const f=Math.min(1,rem/sg.d),end=f>=1?sg.b:_lerpPt(sg.a,sg.b,f);
    e.save(),sg.dashed&&e.setLineDash([9,7]),e.beginPath(),e.moveTo(sg.a.x,sg.a.y),e.lineTo(end.x,end.y),e.stroke(),e.restore();
    tip={x:end.x,y:end.y,dx:sg.dx/sg.d,dy:sg.dy/sg.d};
    rem-=sg.d;
  }
  return tip;
}
function _teePartial(e,t,n,p,rev,fxOpts){
  const fx=(fxOpts&&fxOpts.effect)||"draw";
  const rawP=(fxOpts&&typeof fxOpts.rawP==="number")?fxOpts.rawP:p;
  const _mfx=typeof window!=="undefined"?window.MinNoteMotionFX:null;
  const _isOvEnd=fx==="pulse"||!!(_mfx&&_mfx.OVERLAY_END_EFFECTS&&_mfx.OVERLAY_END_EFFECTS.has(fx));
  if(_mfx&&typeof _mfx.paintShapeFX==="function"&&!(_mfx.LEGACY_EFFECTS&&_mfx.LEGACY_EFFECTS.has(fx))){
    const _fxRes=_mfx.paintShapeFX(e,t,n,p,rev,fxOpts,{tee,_mnShapeBBox,_drawPolylinesPartial,_drawTip,_lerpPt,_mnShapeStrokes,_mnLocusStrokes,z7,D7,$S,Qh,SR,I7,tL,O7,F7,wI,eL});
    if(_fxRes&&_fxRes.handled)return _fxRes.tip||null;
  }
  if(rawP>=.999&&!_isOvEnd){tee(e,t,n);return null}
  if(rawP<=0||t.kind==="solid"||t.kind==="flatLink")return null;
  const bb=_mnShapeBBox(t,n);
  // Transform/Reveal Effects: spring, fade, zoom, slide, wipe
  if(fx==="fade"){
    e.save();e.globalAlpha*=Math.max(0,Math.min(1,p));tee(e,t,n);e.restore();
    return bb?{x:bb.cx,y:bb.cy,dx:1,dy:0}:null;
  }
  if(fx==="zoom"&&bb){
    const sc=Math.max(.12,.15+.85*Math.max(0,Math.min(1.15,p)));
    e.save();e.globalAlpha*=Math.min(1,.22+.78*rawP);
    e.translate(bb.cx,bb.cy);e.scale(sc,sc);e.translate(-bb.cx,-bb.cy);
    tee(e,t,n);e.restore();
    return{x:bb.cx,y:bb.cy,dx:1,dy:0};
  }
  if(fx==="spring"&&bb){
    const sc=rawP>=.999?1:Math.max(.08,1+.22*Math.sin(rawP*Math.PI*2.5)*Math.exp(-3.1*rawP)-Math.exp(-6.5*rawP));
    e.save();e.globalAlpha*=Math.min(1,rawP*2.6);
    e.translate(bb.cx,bb.cy);e.scale(sc,sc);e.translate(-bb.cx,-bb.cy);
    tee(e,t,n);e.restore();
    return{x:bb.cx,y:bb.cy,dx:1,dy:0};
  }
  if(fx==="slide"&&bb){
    const dir=rev?-1:1,offY=dir*28*(1-Math.max(0,Math.min(1,p)));
    e.save();e.globalAlpha*=Math.min(1,rawP*1.35);
    e.translate(0,offY);tee(e,t,n);e.restore();
    return{x:bb.cx,y:bb.cy+offY,dx:0,dy:-dir};
  }
  if(fx==="wipe"&&bb){
    const pad=Math.max(12,(t.width||2.5)*3),wTot=bb.w+pad*2,hTot=bb.h+pad*2;
    const clP=Math.max(0,Math.min(1,p));
    const rx=rev?(bb.x1+pad-wTot*clP):(bb.x0-pad);
    const edgeX=rev?rx:(rx+wTot*clP);
    e.save();e.beginPath();e.rect(rx,bb.y0-pad,wTot*clP,hTot);e.clip();
    tee(e,t,n);e.restore();
    if(clP>0.02&&clP<0.98){
      e.save();e.strokeStyle="#38bdf8";e.globalAlpha=.55;e.lineWidth=1.8;e.beginPath();e.moveTo(edgeX,bb.y0-pad*.4);e.lineTo(edgeX,bb.y1+pad*.4);e.stroke();e.restore();
    }
    return{x:edgeX,y:bb.cy,dx:rev?-1:1,dy:0};
  }
  // Progressive stroke effects: draw, glow, pulse
  const pDraw=Math.max(0,Math.min(1,fx==="pulse"?Math.min(1,p/.84):p));
  const isGlow=fx==="glow";
  const drawPulseRing=pt=>{
    if(fx!=="pulse"||rawP<.62||!pt)return;
    const u=(rawP-.62)/.38;
    e.save();e.setLineDash([]);
    for(const ph of [u,Math.max(0,u-.28)]){
      if(ph<=0||ph>=1)continue;
      e.beginPath();e.arc(pt.x,pt.y,6+26*ph,0,Math.PI*2);
      e.strokeStyle="rgba(37,99,235,"+((1-ph)*.68).toFixed(3)+")";
      e.lineWidth=2.2*(1-ph*.5);e.stroke();
    }
    e.restore();
  };
  if(pDraw>=.999){
    tee(e,t,n);
    drawPulseRing(bb?{x:bb.cx,y:bb.cy}:null);
    return bb?{x:bb.cx,y:bb.cy,dx:1,dy:0}:null;
  }`;

const newHead = `${MARKER}function _mnSmooth(u){const x=Math.max(0,Math.min(1,u));return x*x*(3-2*x);}
function _mnSmoother(u){const x=Math.max(0,Math.min(1,u));return x*x*x*(x*(x*6-15)+10);}
function _drawTip(e,p,glow,alpha=1){
  if(!p||alpha<=.01)return;
  e.save(),e.setLineDash([]),e.globalAlpha*=Math.max(0,Math.min(1,alpha));
  if(glow){
    e.shadowColor="#38bdf8";e.shadowBlur=14*alpha;
    e.beginPath(),e.arc(p.x,p.y,8.2,0,Math.PI*2),e.fillStyle="rgba(56,189,248,0.26)",e.fill();
    e.beginPath(),e.arc(p.x,p.y,4.4,0,Math.PI*2),e.fillStyle="#38bdf8",e.fill();
    e.shadowBlur=0;
    e.beginPath(),e.arc(p.x,p.y,2.1,0,Math.PI*2),e.fillStyle="#ffffff",e.fill();
  }else{
    e.beginPath(),e.arc(p.x,p.y,5.2,0,Math.PI*2),e.fillStyle=(globalThis.__mnHi?globalThis.__mnHi(.26):"rgba(37,99,235,0.26)"),e.fill();
    e.beginPath(),e.arc(p.x,p.y,2.6,0,Math.PI*2),e.fillStyle=(globalThis.__mnHi?globalThis.__mnHi():"#2563eb"),e.fill();
  }
  e.restore();
}
function _drawPolylinesPartial(e,paths,p,rev){
  const list=rev?[...paths].reverse().map(x=>({...x,pts:[...x.pts].reverse()})):paths;
  const runs=[];let tot=0;
  for(const l of list){
    const pts=l.closed&&l.pts.length>1?[...l.pts,l.pts[0]]:l.pts;
    const segs=[];
    for(let i=1;i<pts.length;i++){
      const dx=pts[i].x-pts[i-1].x,dy=pts[i].y-pts[i-1].y,d=Math.hypot(dx,dy);
      if(d>1e-6){segs.push({a:pts[i-1],b:pts[i],dx,dy,d});tot+=d;}
    }
    if(segs.length)runs.push({dashed:!!l.dashed,segs});
  }
  if(tot<1e-6)return null;
  let rem=tot*Math.max(0,Math.min(1,p)),tip=null;
  for(const run of runs){
    if(rem<=0)break;
    e.save();
    if(run.dashed)e.setLineDash([9,7]);
    e.beginPath();
    e.moveTo(run.segs[0].a.x,run.segs[0].a.y);
    for(const sg of run.segs){
      if(rem<=0)break;
      const f=Math.min(1,rem/sg.d),end=f>=1?sg.b:_lerpPt(sg.a,sg.b,f);
      e.lineTo(end.x,end.y);
      tip={x:end.x,y:end.y,dx:sg.dx/sg.d,dy:sg.dy/sg.d};
      rem-=sg.d;
    }
    e.stroke();
    e.restore();
  }
  return tip;
}
function _teePartial(e,t,n,p,rev,fxOpts){
  const fx=(fxOpts&&fxOpts.effect)||"draw";
  const rawP=Math.max(0,Math.min(1,(fxOpts&&typeof fxOpts.rawP==="number")?fxOpts.rawP:p));
  const _mfx=typeof window!=="undefined"?window.MinNoteMotionFX:null;
  const _isOvEnd=fx==="pulse"||!!(_mfx&&_mfx.OVERLAY_END_EFFECTS&&_mfx.OVERLAY_END_EFFECTS.has(fx));
  if(_mfx&&typeof _mfx.paintShapeFX==="function"&&!(_mfx.LEGACY_EFFECTS&&_mfx.LEGACY_EFFECTS.has(fx))){
    const _fxRes=_mfx.paintShapeFX(e,t,n,p,rev,fxOpts,{tee,_mnShapeBBox,_drawPolylinesPartial,_drawTip,_lerpPt,_mnShapeStrokes,_mnLocusStrokes,z7,D7,$S,Qh,SR,I7,tL,O7,F7,wI,eL});
    if(_fxRes&&_fxRes.handled)return _fxRes.tip||null;
  }
  if(rawP>=.999){tee(e,t,n);return null}
  if(rawP<=0||t.kind==="solid"||t.kind==="flatLink")return null;
  const bb=_mnShapeBBox(t,n);
  // Monotonic eased progress for directional reveals so overshooting easings never pull strokes backwards
  const pMono=(p>=0&&p<=1)?p:_mnSmooth(rawP);
  const landDamp=1-_mnSmooth((rawP-.72)/.28);
  // Transform/Reveal Effects: spring, fade, zoom, slide, wipe
  if(fx==="fade"){
    e.save();e.globalAlpha*=_mnSmoother(rawP);tee(e,t,n);e.restore();
    return bb?{x:bb.cx,y:bb.cy,dx:1,dy:0}:null;
  }
  if(fx==="zoom"&&bb){
    const rawSc=.15+.85*Math.max(0,Math.min(1.14,p));
    const sc=Math.max(.12,1+(rawSc-1)*Math.max(landDamp,1-rawP));
    e.save();e.globalAlpha*=Math.min(1,_mnSmooth(rawP/.45));
    e.translate(bb.cx,bb.cy);e.scale(sc,sc);e.translate(-bb.cx,-bb.cy);
    tee(e,t,n);e.restore();
    return{x:bb.cx,y:bb.cy,dx:1,dy:0};
  }
  if(fx==="spring"&&bb){
    const osc=.22*Math.sin(rawP*Math.PI*2.4)*Math.exp(-3.2*rawP)*landDamp;
    const grow=Math.exp(-6.5*rawP)*(1-rawP);
    const sc=Math.max(.08,1+osc-grow);
    e.save();e.globalAlpha*=Math.min(1,_mnSmooth(rawP/.32));
    e.translate(bb.cx,bb.cy);e.scale(sc,sc);e.translate(-bb.cx,-bb.cy);
    tee(e,t,n);e.restore();
    return{x:bb.cx,y:bb.cy,dx:1,dy:0};
  }
  if(fx==="slide"&&bb){
    const dir=rev?-1:1,offY=dir*26*(1-pMono);
    e.save();e.globalAlpha*=Math.min(1,_mnSmooth(rawP/.55));
    e.translate(0,offY);tee(e,t,n);e.restore();
    return{x:bb.cx,y:bb.cy+offY,dx:0,dy:-dir};
  }
  if(fx==="wipe"&&bb){
    const pad=Math.max(12,(t.width||2.5)*3),wTot=bb.w+pad*2,hTot=bb.h+pad*2;
    const clP=pMono;
    const rx=rev?(bb.x1+pad-wTot*clP):(bb.x0-pad);
    const edgeX=rev?rx:(rx+wTot*clP);
    e.save();e.beginPath();e.rect(rx,bb.y0-pad,wTot*clP,hTot);e.clip();
    tee(e,t,n);e.restore();
    const edgeFade=Math.sin(Math.PI*clP);
    if(edgeFade>0.03){
      e.save();e.strokeStyle="#38bdf8";e.globalAlpha=.55*edgeFade;e.lineWidth=1.8;e.beginPath();e.moveTo(edgeX,bb.y0-pad*.4);e.lineTo(edgeX,bb.y1+pad*.4);e.stroke();e.restore();
    }
    return{x:edgeX,y:bb.cy,dx:rev?-1:1,dy:0};
  }
  // Progressive stroke effects: draw, glow, pulse
  const pDraw=fx==="pulse"?_mnSmooth(Math.min(1,rawP/.70)):pMono;
  const isGlow=fx==="glow";
  const glowFade=isGlow?(1-_mnSmooth((rawP-.76)/.24)):0;
  const tipAlpha=1-_mnSmooth((rawP-.86)/.14);
  const drawPulseOverlay=()=>{
    if(fx!=="pulse"||rawP<=.68||rawP>=.995)return;
    const u=(rawP-.68)/.315;
    const env=Math.sin(Math.PI*u);
    if(env<=.01)return;
    // 1. Seamless luminous pulse along the entire completed stroke
    e.save();
    e.shadowColor="rgba(37,99,235,"+(env*.85).toFixed(3)+")";
    e.shadowBlur=14*env;
    e.globalAlpha*=(.55*env);
    tee(e,t,n);
    e.restore();
    // 2. Subtle centered ripple (never teleports from tip; fades smoothly to 0 at end)
    if(bb){
      e.save();e.setLineDash([]);
      const maxR=Math.max(14,Math.min(34,Math.hypot(bb.w,bb.h)*.24+10));
      for(const ph of [u,u-.24]){
        if(ph<=0||ph>=1)continue;
        const ra=Math.sin(Math.PI*ph)*.52;
        e.beginPath();e.arc(bb.cx,bb.cy,5+maxR*_mnSmooth(ph),0,Math.PI*2);
        e.strokeStyle="rgba(37,99,235,"+ra.toFixed(3)+")";
        e.lineWidth=1.9*(1-ph*.45);e.stroke();
      }
      e.restore();
    }
  };
  if(pDraw>=.999){
    if(isGlow&&glowFade>.02){
      e.save();e.shadowColor="#38bdf8";e.shadowBlur=13*glowFade;tee(e,t,n);e.restore();
    }else{
      tee(e,t,n);
    }
    drawPulseOverlay();
    return bb?{x:bb.cx,y:bb.cy,dx:1,dy:0}:null;
  }`;

src = replaceOnce(src, oldHead, newHead, '_drawTip + _drawPolylinesPartial + _teePartial seamless');

// 2. Update shadowBlur feathering & smooth tipAlpha inside remaining _teePartial branches
src = replaceOnce(
  src,
  `if(isGlow){e.shadowColor="#38bdf8";e.shadowBlur=12;}\n    if(_ls[0]&&_ls[0].envelope){e.globalAlpha=.42;e.lineWidth=Math.max(1,t.width*.65);}\n    const tip=_drawPolylinesPartial(e,_ls.map(l=>({...l,dashed:!!t.dashed})),pDraw,rev);\n    _drawTip(e,tip,isGlow),e.restore();drawPulseRing(tip);return tip;`,
  `if(isGlow&&glowFade>.01){e.shadowColor="#38bdf8";e.shadowBlur=12*glowFade;}\n    if(_ls[0]&&_ls[0].envelope){e.globalAlpha=.42;e.lineWidth=Math.max(1,t.width*.65);}\n    const tip=_drawPolylinesPartial(e,_ls.map(l=>({...l,dashed:!!t.dashed})),pDraw,rev);\n    _drawTip(e,tip,isGlow,tipAlpha),e.restore();drawPulseOverlay();return tip;`,
  '_teePartial locus glow/tip'
);

src = replaceOnce(
  src,
  `if(isGlow){e.shadowColor="#38bdf8";e.shadowBlur=13;}`,
  `if(isGlow&&glowFade>.01){e.shadowColor="#38bdf8";e.shadowBlur=13*glowFade;}`,
  '_teePartial main glow feather'
);

src = replaceOnce(
  src,
  `_drawTip(e,tip,isGlow),e.restore();\n    if(tip&&t.rot&&!t.look3){const rp=Qh(tip,o[0],t.rot);tip={x:rp.x,y:rp.y,dx:tip.dx,dy:tip.dy};}\n    drawPulseRing(tip);return tip;`,
  `_drawTip(e,tip,isGlow,tipAlpha),e.restore();\n    if(tip&&t.rot&&!t.look3){const rp=Qh(tip,o[0],t.rot);tip={x:rp.x,y:rp.y,dx:tip.dx,dy:tip.dy};}\n    drawPulseOverlay();return tip;`,
  '_teePartial complex shape tip/pulse'
);

// Replace final drawPulseRing(tip) at end of _teePartial switch
const tailOld = `_drawTip(e,tip,isGlow),e.restore();\n  if(tip&&t.rot&&!t.look3){const rp=Qh(tip,o[0],t.rot);tip={x:rp.x,y:rp.y,dx:tip.dx,dy:tip.dy};}\n  drawPulseRing(tip);\n  return tip;`;
const tailNew = `_drawTip(e,tip,isGlow,tipAlpha),e.restore();\n  if(tip&&t.rot&&!t.look3){const rp=Qh(tip,o[0],t.rot);tip={x:rp.x,y:rp.y,dx:tip.dx,dy:tip.dy};}\n  drawPulseOverlay();\n  return tip;`;
if (src.includes(tailOld) || src.includes(tailOld.replace(/\n/g, '\r\n'))) {
  src = replaceOnce(src, tailOld, tailNew, '_teePartial switch tail');
} else {
  // Fallback exact search for remaining drawPulseRing
  src = replaceOnce(src, `drawPulseRing(tip)`, `drawPulseOverlay()`, '_teePartial remaining drawPulseRing');
}

// 3. Zero-stall fractional-dt carryover in _ensureReplayLoop()
const oldLoop = `    for(const r of playingList){
      const activeSteps=r.steps.filter(s=>s.enabled!==!1);
      if(!activeSteps.length){r.playing=!1;r._pauseTimer=0;uiDirty=!0;continue;}
      if(r.stepIdx>=activeSteps.length){r.playing=!1;r.stepProgress=1;r._pauseTimer=0;uiDirty=!0;continue;}
      const cur=activeSteps[r.stepIdx];
      const pg0=this.doc.pages[r.page];
      const isInterGuide=cur.kind==="point"&&cur.showGuides!==!1&&pg0&&pg0.geo.points[cur.refId]&&pg0.geo.points[cur.refId].def.t==="inter";
      const durMul=Math.max(.25,Math.min(4,Number(cur.durationMul)||1));
      const baseDur=cur.mode==="cue"?.9:cur.effect==="fourier_epicycles"?1.65:cur.effect==="morph_bezier"?1.35:cur.effect==="typewriter"?1.15:isInterGuide?1.65:cur.tempHide?1.25:cur.kind==="point"?.52:.95;
      const dur=(baseDur*durMul)/Math.max(.15,r.speed||1);
      if(r.stepProgress<1){
        r.stepProgress=Math.min(1,r.stepProgress+dt/dur);
        r._pauseTimer=0;
      }
      if(r.stepProgress>=1){
        if(r.stepIdx>=activeSteps.length-1){
          r.stepProgress=1;r.playing=!1;r._pauseTimer=0;uiDirty=!0;
          if(r.autoOrbitAfter&&!r.stopAfterStep)autoOrbitTrigger=r;
          continue;
        }
        if(r.pauseBetween||r.stopAfterStep){
          r.stopAfterStep=!1;r.stepProgress=1;r.playing=!1;r._pauseTimer=0;uiDirty=!0;continue;
        }
        const pa=Math.max(0,Number(cur.pauseAfter)||0);
        if(pa>0&&(r._pauseTimer||0)<pa){
          r._pauseTimer=(r._pauseTimer||0)+dt;
          continue;
        }
        r._pauseTimer=0;r.stepIdx++;r.stepProgress=0;uiDirty=!0;
      }
    }`;

const newLoop = `    for(const r of playingList){
      const activeSteps=r.steps.filter(s=>s.enabled!==!1);
      if(!activeSteps.length){r.playing=!1;r._pauseTimer=0;uiDirty=!0;continue;}
      if(r.stepIdx>=activeSteps.length){r.playing=!1;r.stepProgress=1;r._pauseTimer=0;uiDirty=!0;continue;}
      const pg0=this.doc.pages[r.page];
      let remDt=dt,guard=0;
      while(remDt>1e-6&&guard++<6){
        const cur=activeSteps[r.stepIdx];
        if(!cur){r.playing=!1;r._pauseTimer=0;uiDirty=!0;break;}
        const isInterGuide=cur.kind==="point"&&cur.showGuides!==!1&&pg0&&pg0.geo.points[cur.refId]&&pg0.geo.points[cur.refId].def.t==="inter";
        const durMul=Math.max(.25,Math.min(4,Number(cur.durationMul)||1));
        const baseDur=cur.mode==="cue"?.9:cur.effect==="fourier_epicycles"?1.65:cur.effect==="morph_bezier"?1.35:cur.effect==="typewriter"?1.15:isInterGuide?1.65:cur.tempHide?1.25:cur.kind==="point"?.52:.95;
        const dur=(baseDur*durMul)/Math.max(.15,r.speed||1);
        if(r.stepProgress<1){
          const need=(1-r.stepProgress)*dur;
          if(remDt<need){
            r.stepProgress=Math.min(1,r.stepProgress+remDt/dur);
            r._pauseTimer=0;
            remDt=0;
            break;
          }
          remDt-=need;
          r.stepProgress=1;
          r._pauseTimer=0;
        }
        if(r.stepProgress>=1){
          if(r.stepIdx>=activeSteps.length-1){
            r.stepProgress=1;r.playing=!1;r._pauseTimer=0;uiDirty=!0;remDt=0;
            if(r.autoOrbitAfter&&!r.stopAfterStep)autoOrbitTrigger=r;
            break;
          }
          if(r.pauseBetween||r.stopAfterStep){
            r.stopAfterStep=!1;r.stepProgress=1;r.playing=!1;r._pauseTimer=0;uiDirty=!0;remDt=0;break;
          }
          const pa=Math.max(0,Number(cur.pauseAfter)||0);
          if(pa>0&&(r._pauseTimer||0)<pa){
            const waitLeft=pa-(r._pauseTimer||0);
            if(remDt<waitLeft){
              r._pauseTimer=(r._pauseTimer||0)+remDt;
              remDt=0;
              break;
            }
            remDt-=waitLeft;
            r._pauseTimer=pa;
          }
          r._pauseTimer=0;r.stepIdx++;r.stepProgress=0;uiDirty=!0;
        }
      }
    }`;

src = replaceOnce(src, oldLoop, newLoop, '_ensureReplayLoop zero-stall dt carryover');

// 4. Smooth tempHide ('Vẽ rồi ẩn') 3-phase draw -> hold -> smootherstep fade-out
const oldTempHide = `if(st.tempHide){
            if(i<r.stepIdx)continue;
            const dp=Math.min(1,rawP/.72),fa=rawP<.72?1:Math.max(0,1-(rawP-.72)/.28);
            if(dp>0&&fa>0){
              ctx.save();ctx.globalAlpha*=fa;
              const tp=_teePartial(ctx,sh,coords,_mnEvalEase(dp,easing),!!(it.rev??st.rev),{effect:fx,rawP:dp,morphFromShape,isExport:!!extraOpts.isExport});
              ctx.restore();
              if(isCurStep&&tp&&rawP<.72)activeTip={pageIdx,x:tp.x,y:tp.y,dx:tp.dx??1,dy:tp.dy??0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
            }
          }`;

const newTempHide = `if(st.tempHide){
            if(i<r.stepIdx)continue;
            const dp=Math.min(1,rawP/.66),fa=rawP<.76?1:Math.max(0,1-_mnSmoother((rawP-.76)/.24));
            if(dp>0&&fa>.01){
              ctx.save();ctx.globalAlpha*=fa;
              const tp=_teePartial(ctx,sh,coords,_mnEvalEase(dp,easing),!!(it.rev??st.rev),{effect:fx,rawP:dp,morphFromShape,isExport:!!extraOpts.isExport});
              ctx.restore();
              if(isCurStep&&tp&&rawP<.66)activeTip={pageIdx,x:tp.x,y:tp.y,dx:tp.dx??1,dy:tp.dy??0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
            }
          }`;

src = replaceOnce(src, oldTempHide, newTempHide, '_paintReplayGeo smooth tempHide');

fs.writeFileSync(targetPath, src, 'utf8');
console.log('[v85-fx] Successfully patched Resources/Whiteboard/assets/index-CTbULhps.js!');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
