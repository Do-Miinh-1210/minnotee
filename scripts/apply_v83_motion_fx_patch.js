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
// Idempotent patch script: v0.0.8.3 Direct Native Motion FX Engine Integration (GĐ 1)
// Hooks window.MinNoteMotionFX directly into index-CTbULhps.js:
//  - _mnEvalEase delegates to MinNoteMotionFX.evalEase (9 smooth easings)
//  - _teePartial delegates non-legacy / overlay-end shape effects to MinNoteMotionFX.paintShapeFX
//  - Exposes pb, z2, vk, z5, xr on window.__mnGeoKernel
//  - _mnStepFocusPt supports items & strokes
//  - saveBuildScript persists itemIds, strokeIds, stylePreset, springCamera
//  - replayHiddenPage hides scoped & enabled non-cue items/strokes during active replay
//  - tick loop computes smart durations for items, strokes, cues, Fourier, morph, typewriter
//  - _paintReplayGeo supports kind='item', kind='stroke', mode='cue', morphFromId & rich point FX
//  - _stepAutoFollow uses damped spring camera (w = 2*pi*0.9, zeta = 0.95)
//  - Selection-bar replay button enabled for item & stroke selections too
const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(targetPath, 'utf8');

const MARKER = '/*__MN_V83_MOTION_FX__*/';
if (src.includes(MARKER)) {
  console.log('[v83] Motion FX patch already applied — skipping.');
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
  if (idx === -1) throw new Error(`[v83] Anchor not found: ${label}`);
  const second = str.indexOf(target, idx + target.length);
  if (second !== -1) throw new Error(`[v83] Anchor not unique: ${label}`);
  return str.slice(0, idx) + repl + str.slice(idx + target.length);
}

// 1. _mnEvalEase delegation
src = replaceOnce(
  src,
  `function _mnEvalEase(t,easing){\n  const u=Math.max(0,Math.min(1,Number(t)||0));`,
  `${MARKER}function _mnEvalEase(t,easing){\n  if(typeof window!=="undefined"&&window.MinNoteMotionFX&&typeof window.MinNoteMotionFX.evalEase==="function")return window.MinNoteMotionFX.evalEase(t,easing);\n  const u=Math.max(0,Math.min(1,Number(t)||0));`,
  '_mnEvalEase delegation'
);

// 2. _mnStepFocusPt support for items & strokes
src = replaceOnce(
  src,
  `function _mnStepFocusPt(geo,coords,st){\n  if(!geo||!coords||!st)return null;\n  const items=st.items&&st.items.length?st.items:[{kind:st.kind,refId:st.refId}];\n  let sx=0,sy=0,cnt=0;\n  for(const it of items){\n    if(it.kind==="point"){\n      const p=coords.get(it.refId);\n      if(p){sx+=p.x;sy+=p.y;cnt++;}\n    }else if(it.kind==="shape"){\n      const sh=geo.shapes.find(s=>s.id===it.refId);\n      const bb=sh?_mnShapeBBox(sh,coords):null;\n      if(bb){sx+=bb.cx;sy+=bb.cy;cnt++;}\n    }\n  }\n  return cnt?{x:sx/cnt,y:sy/cnt}:null;\n}`,
  `function _mnStepFocusPt(geo,coords,st,page){\n  if(!geo||!coords||!st)return null;\n  const items=st.items&&st.items.length?st.items:[{kind:st.kind,refId:st.refId}];\n  let sx=0,sy=0,cnt=0;\n  for(const it of items){\n    if(it.kind==="point"){\n      const p=coords.get(it.refId);\n      if(p){sx+=p.x;sy+=p.y;cnt++;}\n    }else if(it.kind==="shape"){\n      const sh=geo.shapes.find(s=>s.id===it.refId);\n      const bb=sh?_mnShapeBBox(sh,coords):null;\n      if(bb){sx+=bb.cx;sy+=bb.cy;cnt++;}\n    }else if(it.kind==="item"&&page&&Array.isArray(page.items)){\n      const obj=page.items.find(x=>x.id===it.refId);\n      if(obj){const bb=z2(obj);sx+=(bb.x0+bb.x1)*.5;sy+=(bb.y0+bb.y1)*.5;cnt++;}\n    }else if(it.kind==="stroke"&&page&&Array.isArray(page.strokes)){\n      const sk=page.strokes.find(x=>x.id===it.refId);\n      if(sk&&Array.isArray(sk.pts)&&sk.pts.length>=3){\n        let x0=1/0,y0=1/0,x1=-1/0,y1=-1/0;\n        for(let k=0;k<sk.pts.length;k+=3){const px=sk.pts[k],py=sk.pts[k+1];if(px<x0)x0=px;if(py<y0)y0=py;if(px>x1)x1=px;if(py>y1)y1=py;}\n        if(Number.isFinite(x0)){sx+=(x0+x1)*.5;sy+=(y0+y1)*.5;cnt++;}\n      }\n    }\n  }\n  return cnt?{x:sx/cnt,y:sy/cnt}:null;\n}`,
  '_mnStepFocusPt items & strokes'
);

// 3. _teePartial delegation to MinNoteMotionFX.paintShapeFX
src = replaceOnce(
  src,
  `function _teePartial(e,t,n,p,rev,fxOpts){\n  const fx=(fxOpts&&fxOpts.effect)||"draw";\n  const rawP=(fxOpts&&typeof fxOpts.rawP==="number")?fxOpts.rawP:p;\n  if(rawP>=.999&&fx!=="pulse"){tee(e,t,n);return null}\n  if(rawP<=0||t.kind==="solid"||t.kind==="flatLink")return null;`,
  `function _teePartial(e,t,n,p,rev,fxOpts){\n  const fx=(fxOpts&&fxOpts.effect)||"draw";\n  const rawP=(fxOpts&&typeof fxOpts.rawP==="number")?fxOpts.rawP:p;\n  const _mfx=typeof window!=="undefined"?window.MinNoteMotionFX:null;\n  const _isOvEnd=fx==="pulse"||!!(_mfx&&_mfx.OVERLAY_END_EFFECTS&&_mfx.OVERLAY_END_EFFECTS.has(fx));\n  if(_mfx&&typeof _mfx.paintShapeFX==="function"&&!(_mfx.LEGACY_EFFECTS&&_mfx.LEGACY_EFFECTS.has(fx))){\n    const _fxRes=_mfx.paintShapeFX(e,t,n,p,rev,fxOpts,{tee,_mnShapeBBox,_drawPolylinesPartial,_drawTip,_lerpPt,_mnShapeStrokes,_mnLocusStrokes,z7,D7,$S,Qh,SR,I7,tL,O7,F7,wI,eL});\n    if(_fxRes&&_fxRes.handled)return _fxRes.tip||null;\n  }\n  if(rawP>=.999&&!_isOvEnd){tee(e,t,n);return null}\n  if(rawP<=0||t.kind==="solid"||t.kind==="flatLink")return null;`,
  '_teePartial MinNoteMotionFX hook'
);

// 4. Expose pb, z2, vk, z5, xr on window.__mnGeoKernel
src = replaceOnce(
  src,
  `_mnCurvesAt,_mnCurveToDesc,_mnCurveDeps};`,
  `_mnCurvesAt,_mnCurveToDesc,_mnCurveDeps,pb,z2,vk,z5,xr};`,
  '__mnGeoKernel expose item/stroke helpers'
);

// 5. saveBuildScript metadata fields
src = replaceOnce(
  src,
  `followCamera:meta&&typeof meta.followCamera==="boolean"?meta.followCamera:!0,autoOrbitAfter:!!(meta&&meta.autoOrbitAfter),steps:clean,updatedAt:Date.now()`,
  `followCamera:meta&&typeof meta.followCamera==="boolean"?meta.followCamera:!0,springCamera:meta&&typeof meta.springCamera==="boolean"?meta.springCamera:!0,autoOrbitAfter:!!(meta&&meta.autoOrbitAfter),stylePreset:(meta&&meta.stylePreset)||"",itemIds:Array.isArray(meta&&meta.itemIds)?[...meta.itemIds]:null,strokeIds:Array.isArray(meta&&meta.strokeIds)?[...meta.strokeIds]:null,steps:clean,updatedAt:Date.now()`,
  'saveBuildScript extended meta'
);

// 6. replayHiddenPage hide non-cue items & strokes cleanly
src = replaceOnce(
  src,
  `replayHiddenPage(t,pageIdx){const actives=this._getActiveReplays(pageIdx);if(!actives.length)return t;const cacheKey=actives.map(r=>r.scopeKey||"all").join("||");const c=this._replayHiddenCache;if(c&&c.page===t&&c.key===cacheKey)return c.shown;const hideAll=actives.some(r=>!r.scopeShapes);let shown;if(hideAll){shown={...t,geo:{...t.geo,shapes:[],points:{}}};}else{const shSet=new Set,ptSet=new Set;for(const r of actives){if(r.scopeShapes)for(const id of r.scopeShapes)shSet.add(id);if(r.scopePoints)for(const id of r.scopePoints)ptSet.add(id);}shown={...t,geo:{...t.geo,shapes:t.geo.shapes.filter(s=>!shSet.has(s.id)),points:Object.fromEntries(Object.entries(t.geo.points).filter(([id])=>!ptSet.has(id)))}};}this._replayHiddenCache={page:t,key:cacheKey,shown};return shown;}`,
  `replayHiddenPage(t,pageIdx){const actives=this._getActiveReplays(pageIdx);if(!actives.length)return t;const itemSet=new Set,strokeSet=new Set;for(const r of actives){if(r.scopeItems)for(const id of r.scopeItems)itemSet.add(id);if(r.scopeStrokes)for(const id of r.scopeStrokes)strokeSet.add(id);for(const st of (r.steps||[])){if(st.enabled===!1||st.mode==="cue")continue;const its=st.items&&st.items.length?st.items:[st];for(const it of its){if(it.kind==="item"&&it.refId)itemSet.add(it.refId);else if(it.kind==="stroke"&&it.refId)strokeSet.add(it.refId);}}}const cacheKey=actives.map(r=>r.scopeKey||"all").join("||")+"|I:"+[...itemSet].sort().join(",")+"|S:"+[...strokeSet].sort().join(",");const c=this._replayHiddenCache;if(c&&c.page===t&&c.key===cacheKey)return c.shown;const hideAll=actives.some(r=>!r.scopeShapes);const nextItems=itemSet.size&&Array.isArray(t.items)?t.items.filter(x=>!itemSet.has(x.id)):t.items;const nextStrokes=strokeSet.size&&Array.isArray(t.strokes)?t.strokes.filter(x=>!strokeSet.has(x.id)):t.strokes;let shown;if(hideAll){shown={...t,items:nextItems,strokes:nextStrokes,geo:{...t.geo,shapes:[],points:{}}};}else{const shSet=new Set,ptSet=new Set;for(const r of actives){if(r.scopeShapes)for(const id of r.scopeShapes)shSet.add(id);if(r.scopePoints)for(const id of r.scopePoints)ptSet.add(id);}shown={...t,items:nextItems,strokes:nextStrokes,geo:{...t.geo,shapes:t.geo.shapes.filter(s=>!shSet.has(s.id)),points:Object.fromEntries(Object.entries(t.geo.points).filter(([id])=>!ptSet.has(id)))}};}this._replayHiddenCache={page:t,key:cacheKey,shown};return shown;}`,
  'replayHiddenPage item/stroke support'
);

// 7. Replay tick baseDur smart timing
src = replaceOnce(
  src,
  `const baseDur=isInterGuide?1.65:cur.tempHide?1.25:cur.kind==="point"?.52:.95;`,
  `const baseDur=cur.mode==="cue"?.9:cur.effect==="fourier_epicycles"?1.65:cur.effect==="morph_bezier"?1.35:cur.effect==="typewriter"?1.15:isInterGuide?1.65:cur.tempHide?1.25:cur.kind==="point"?.52:.95;`,
  'tick baseDur'
);

// 8. _paintReplayGeo + paintReplay upgrade
const oldPaintReplayBlock = `_paintReplayGeo(ctx,geo,actives,extraOpts={}){
  if(!ctx||!geo||!actives||!actives.length)return{tip:null};
  const pageIdx=extraOpts.pageIdx??0;
  const coords=Tt(geo);
  const shMap=new Map(geo.shapes.map(s=>[s.id,s]));
  const opts={names:this.doc.names!==!1,labelSize:this.doc.labelSize,dots:this.doc.dots,labelColor:this.doc.labelColor,dotColor:this.doc.dotColor,dotSize:this.doc.dotSize,...(extraOpts.renderOpts||{})};
  const lblPos=xk(geo,coords,opts);
  const fsz=opts.labelSize??Ll,dotR=Pm(opts);
  const donePts=new Set,animPts=new Map,ptEffectMap=new Map,scopedPts=new Set;
  let anyWholePage=!1,activeTip=null;
  const markPts=(sh,prog,fx)=>{
    for(const pid of sh.pts){
      if(prog>=1)donePts.add(pid);
      else{
        animPts.set(pid,Math.max(animPts.get(pid)??0,prog));
        if(fx&&!ptEffectMap.has(pid))ptEffectMap.set(pid,fx);
      }
    }
  };
  for(const r of actives){
    if(!r.scopePoints)anyWholePage=!0;else for(const pid of r.scopePoints)scopedPts.add(pid);
    const activeSteps=r.steps.filter(s=>s.enabled!==!1);
    for(let i=0;i<activeSteps.length;i++){
      if(i>r.stepIdx)break;
      const st=activeSteps[i];
      const isCurStep=i===r.stepIdx;
      const rawP=i<r.stepIdx?1:Math.max(0,Math.min(1,r.stepProgress));
      const fx=st.effect||"draw";
      const easing=st.easing||"easeInOut";
      const prog=i<r.stepIdx?1:_mnEvalEase(rawP,easing);
      const items=st.items&&st.items.length?st.items:[{kind:st.kind,refId:st.refId,rev:!!st.rev}];
      for(const it of items){
        if(it.kind==="shape"){
          const sh=shMap.get(it.refId);
          if(!sh||(sh.hidden&&!st.tempHide&&!st.includeHidden))continue;
          if(st.tempHide){
            if(i<r.stepIdx)continue;
            const dp=Math.min(1,rawP/.72),fa=rawP<.72?1:Math.max(0,1-(rawP-.72)/.28);
            if(dp>0&&fa>0){
              ctx.save();ctx.globalAlpha*=fa;
              const tp=_teePartial(ctx,sh,coords,_mnEvalEase(dp,easing),!!(it.rev??st.rev),{effect:fx,rawP:dp,isExport:!!extraOpts.isExport});
              ctx.restore();
              if(isCurStep&&tp&&rawP<.72)activeTip={pageIdx,x:tp.x,y:tp.y,dx:tp.dx??1,dy:tp.dy??0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
            }
          }else if(rawP>=.999&&(!isCurStep||fx!=="pulse")){
            tee(ctx,sh,coords);markPts(sh,1,fx);
          }else if(rawP>0){
            const tp=_teePartial(ctx,sh,coords,prog,!!(it.rev??st.rev),{effect:fx,rawP,isExport:!!extraOpts.isExport});
            markPts(sh,Math.min(1,rawP*2.4),fx);
            if(isCurStep&&tp&&rawP<.995)activeTip={pageIdx,x:tp.x,y:tp.y,dx:tp.dx??1,dy:tp.dy??0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
          }
        }else if(it.kind==="point"){
          const pt=geo.points[it.refId];
          if(i<r.stepIdx){donePts.add(it.refId);}
          else if(rawP>0){
            ptEffectMap.set(it.refId,fx);
            if(pt&&pt.def&&pt.def.t==="inter"&&st.showGuides!==!1){
              const tp=_drawInterGuides(ctx,pt,coords,rawP);
              if(tp>0)animPts.set(it.refId,Math.max(animPts.get(it.refId)??0,tp));
            }else{
              animPts.set(it.refId,Math.max(animPts.get(it.refId)??0,rawP));
            }
            const c=coords.get(it.refId);
            if(isCurStep&&c&&rawP<.995)activeTip={pageIdx,x:c.x,y:c.y,dx:1,dy:0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
          }
        }
      }
    }
  }
  ctx.save();
  ctx.font="italic "+fsz+"px 'Times New Roman', serif",ctx.textAlign="center",ctx.textBaseline="middle";
  for(const pt of Object.values(geo.points)){
    if(!pt.show||pt.hidden)continue;
    if(!anyWholePage&&!scopedPts.has(pt.id))continue;
    const isDone=donePts.has(pt.id),ap=isDone?1:(animPts.get(pt.id)??0);
    if(ap<=0)continue;
    const c=coords.get(pt.id);if(!c)continue;
    const pFx=ptEffectMap.get(pt.id)||"draw";
    ctx.save();
    let ox=0,oy=0,sc=1,alpha=Math.min(1,ap*1.2);
    if(!isDone){
      if(pFx==="spring")sc=Math.max(.15,1+.24*Math.sin(ap*Math.PI*2.5)*Math.exp(-3*ap)-Math.exp(-6*ap));
      else if(pFx==="zoom")sc=.15+.85*ap;
      else if(pFx==="slide"){oy=22*(1-ap);alpha=Math.min(1,ap*1.4);}
      else if(pFx==="fade")alpha=ap;
      else if(pFx==="glow"){ctx.shadowColor="#38bdf8";ctx.shadowBlur=14;}
    }
    ctx.globalAlpha*=alpha;
    if(opts.dots!==!1&&!pt.noDot){
      const baseD=(pt.size??dotR)*(isDone?1:Math.min(1.35,(.38+.62*ap)*sc));
      const m=MR(pt,opts.dotColor);
      ctx.beginPath();
      if(pt.dotStyle==="cross"){
        const g=baseD*1.1;ctx.moveTo(c.x+ox-g,c.y+oy-g),ctx.lineTo(c.x+ox+g,c.y+oy+g),ctx.moveTo(c.x+ox-g,c.y+oy+g),ctx.lineTo(c.x+ox+g,c.y+oy-g),ctx.strokeStyle=m,ctx.lineWidth=Math.max(1.5,baseD*.45),ctx.stroke();
      }else if(pt.dotStyle==="ring"){
        ctx.arc(c.x+ox,c.y+oy,baseD,0,Math.PI*2),ctx.strokeStyle=m,ctx.lineWidth=Math.max(1.2,baseD*.4),ctx.stroke();
      }else{
        ctx.arc(c.x+ox,c.y+oy,baseD,0,Math.PI*2),ctx.fillStyle=m,ctx.fill();
      }
      if(!isDone&&ap<.96){
        ctx.beginPath(),ctx.arc(c.x+ox,c.y+oy,baseD+12*ap,0,Math.PI*2),ctx.strokeStyle=pFx==="glow"?"rgba(56,189,248,"+((1-ap)*.85)+")":"rgba(37,99,235,"+((1-ap)*.7)+")",ctx.lineWidth=1.8,ctx.stroke();
        if(pFx==="pulse"&&ap>.25){
          ctx.beginPath(),ctx.arc(c.x+ox,c.y+oy,baseD+22*(ap-.25),0,Math.PI*2),ctx.strokeStyle="rgba(37,99,235,"+((1-ap)*.5)+")",ctx.lineWidth=1.4,ctx.stroke();
        }
      }
    }
    const lp=lblPos.get(pt.id);
    if(lp){ctx.fillStyle=pt.color??opts.labelColor??kk;ctx.fillText(pt.label,lp.x+ox,lp.y+oy);}
    ctx.restore();
  }
  ctx.restore();
  return{tip:activeTip};
}
paintReplay(ctx,pageIdx){
  const actives=this._getActiveReplays(pageIdx);
  if(!actives.length)return;
  const pg=this.view.pages[pageIdx];if(!pg)return;
  const res=this._paintReplayGeo(ctx,pg.geo,actives,{pageIdx,isExport:!1});
  const tip=res&&res.tip?res.tip:{pageIdx,x:0,y:0,dx:1,dy:0,active:!1,drawing:!1};
  this._replayTip=tip;
  if(tip.active&&typeof window!=="undefined"&&window.MinNoteHandCursor&&typeof window.MinNoteHandCursor.paintReplayTip==="function"){
    try{window.MinNoteHandCursor.paintReplayTip(ctx,tip,this);}catch(_e){}
  }
}`;

const newPaintReplayBlock = `_paintReplayGeo(ctx,geo,actives,extraOpts={}){
  if(!ctx||!geo||!actives||!actives.length)return{tip:null};
  const pageIdx=extraOpts.pageIdx??0;
  const pgObj=extraOpts.page||(this.view&&this.view.pages?this.view.pages[pageIdx]:null)||null;
  const coords=Tt(geo);
  const shMap=new Map(geo.shapes.map(s=>[s.id,s]));
  const itemMap=new Map((pgObj&&Array.isArray(pgObj.items)?pgObj.items:[]).map(x=>[x.id,x]));
  const strokeMap=new Map((pgObj&&Array.isArray(pgObj.strokes)?pgObj.strokes:[]).map(x=>[x.id,x]));
  const mfx=typeof window!=="undefined"?window.MinNoteMotionFX:null;
  const isOvEndFn=fx=>fx==="pulse"||!!(mfx&&mfx.OVERLAY_END_EFFECTS&&mfx.OVERLAY_END_EFFECTS.has(fx));
  const opts={names:this.doc.names!==!1,labelSize:this.doc.labelSize,dots:this.doc.dots,labelColor:this.doc.labelColor,dotColor:this.doc.dotColor,dotSize:this.doc.dotSize,...(extraOpts.renderOpts||{})};
  const lblPos=xk(geo,coords,opts);
  const fsz=opts.labelSize??Ll,dotR=Pm(opts);
  const donePts=new Set,animPts=new Map,ptEffectMap=new Map,scopedPts=new Set,drawnRefs=new Set;
  const cueOverlays=[];
  let anyWholePage=!1,activeTip=null;
  const markPts=(sh,prog,fx)=>{
    const ptFx=isOvEndFn(fx)?"fade":fx;
    for(const pid of sh.pts){
      if(prog>=1)donePts.add(pid);
      else{
        animPts.set(pid,Math.max(animPts.get(pid)??0,prog));
        if(ptFx&&!ptEffectMap.has(pid))ptEffectMap.set(pid,ptFx);
      }
    }
  };
  for(const r of actives){
    if(!r.scopePoints)anyWholePage=!0;else for(const pid of r.scopePoints)scopedPts.add(pid);
    const activeSteps=r.steps.filter(s=>s.enabled!==!1);
    for(let i=0;i<activeSteps.length;i++){
      if(i>r.stepIdx)break;
      const st=activeSteps[i];
      const isCurStep=i===r.stepIdx;
      const rawP=i<r.stepIdx?1:Math.max(0,Math.min(1,r.stepProgress));
      const fx=st.effect||"draw";
      const easing=st.easing||"easeInOut";
      const prog=i<r.stepIdx?1:_mnEvalEase(rawP,easing);
      const isCue=st.mode==="cue";
      const ovEnd=isOvEndFn(fx);
      const morphFromShape=st.morphFromId?shMap.get(st.morphFromId):null;
      const items=st.items&&st.items.length?st.items:[{kind:st.kind,refId:st.refId,rev:!!st.rev}];
      for(const it of items){
        if(isCue){
          if(!isCurStep||rawP<=0||rawP>=.998)continue;
          let bb=null,center=null;
          if(it.kind==="shape"){
            const sh=shMap.get(it.refId);
            if(sh){
              if(!drawnRefs.has("s:"+sh.id)&&!r.scopeShapes){tee(ctx,sh,coords);markPts(sh,1,"fade");drawnRefs.add("s:"+sh.id);}
              bb=_mnShapeBBox(sh,coords);if(bb)center={x:bb.cx,y:bb.cy};
            }
          }else if(it.kind==="point"){
            const c=coords.get(it.refId);
            if(c){
              if(!drawnRefs.has("p:"+it.refId)&&!r.scopePoints){donePts.add(it.refId);drawnRefs.add("p:"+it.refId);}
              const pr=(geo.points[it.refId]&&geo.points[it.refId].size)||dotR;
              bb={x0:c.x-pr-6,y0:c.y-pr-6,x1:c.x+pr+6,y1:c.y+pr+6,cx:c.x,cy:c.y,w:(pr+6)*2,h:(pr+6)*2};
              center={x:c.x,y:c.y};
            }
          }else if(it.kind==="item"){
            const obj=itemMap.get(it.refId);
            if(obj){const b0=z2(obj);bb={x0:b0.x0,y0:b0.y0,x1:b0.x1,y1:b0.y1,cx:(b0.x0+b0.x1)*.5,cy:(b0.y0+b0.y1)*.5,w:Math.max(4,b0.x1-b0.x0),h:Math.max(4,b0.y1-b0.y0)};center={x:bb.cx,y:bb.cy};}
          }else if(it.kind==="stroke"){
            const sk=strokeMap.get(it.refId);
            if(sk&&Array.isArray(sk.pts)&&sk.pts.length>=3){
              let x0=1/0,y0=1/0,x1=-1/0,y1=-1/0;
              for(let k=0;k<sk.pts.length;k+=3){const px=sk.pts[k],py=sk.pts[k+1];if(px<x0)x0=px;if(py<y0)y0=py;if(px>x1)x1=px;if(py>y1)y1=py;}
              if(Number.isFinite(x0)){bb={x0,y0,x1,y1,cx:(x0+x1)*.5,cy:(y0+y1)*.5,w:Math.max(4,x1-x0),h:Math.max(4,y1-y0)};center={x:bb.cx,y:bb.cy};}
            }
          }
          if(bb||center){
            cueOverlays.push({bb,center,rawP,fx});
            if(center)activeTip={pageIdx,x:center.x,y:center.y,dx:1,dy:0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
          }
          continue;
        }
        if(it.kind==="shape"){
          const sh=shMap.get(it.refId);
          if(!sh||(sh.hidden&&!st.tempHide&&!st.includeHidden))continue;
          drawnRefs.add("s:"+sh.id);
          if(st.tempHide){
            if(i<r.stepIdx)continue;
            const dp=Math.min(1,rawP/.72),fa=rawP<.72?1:Math.max(0,1-(rawP-.72)/.28);
            if(dp>0&&fa>0){
              ctx.save();ctx.globalAlpha*=fa;
              const tp=_teePartial(ctx,sh,coords,_mnEvalEase(dp,easing),!!(it.rev??st.rev),{effect:fx,rawP:dp,morphFromShape,isExport:!!extraOpts.isExport});
              ctx.restore();
              if(isCurStep&&tp&&rawP<.72)activeTip={pageIdx,x:tp.x,y:tp.y,dx:tp.dx??1,dy:tp.dy??0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
            }
          }else if(rawP>=.999&&(!isCurStep||!ovEnd)){
            tee(ctx,sh,coords);markPts(sh,1,fx);
          }else if(rawP>0){
            const tp=_teePartial(ctx,sh,coords,prog,!!(it.rev??st.rev),{effect:fx,rawP,morphFromShape,isExport:!!extraOpts.isExport});
            markPts(sh,Math.min(1,rawP*2.4),fx);
            if(isCurStep&&tp&&rawP<.995)activeTip={pageIdx,x:tp.x,y:tp.y,dx:tp.dx??1,dy:tp.dy??0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
          }
        }else if(it.kind==="point"){
          const pt=geo.points[it.refId];
          drawnRefs.add("p:"+it.refId);
          if(i<r.stepIdx){donePts.add(it.refId);}
          else if(rawP>0){
            ptEffectMap.set(it.refId,fx);
            if(pt&&pt.def&&pt.def.t==="inter"&&st.showGuides!==!1){
              const tp=_drawInterGuides(ctx,pt,coords,rawP);
              if(tp>0)animPts.set(it.refId,Math.max(animPts.get(it.refId)??0,tp));
            }else{
              animPts.set(it.refId,Math.max(animPts.get(it.refId)??0,rawP));
            }
            const c=coords.get(it.refId);
            if(isCurStep&&c&&rawP<.995)activeTip={pageIdx,x:c.x,y:c.y,dx:1,dy:0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
          }
        }else if(it.kind==="item"){
          const obj=itemMap.get(it.refId);
          if(!obj)continue;
          drawnRefs.add("i:"+obj.id);
          if(i<r.stepIdx||(rawP>=.999&&(!isCurStep||!ovEnd))){
            pb(ctx,obj);
          }else if(rawP>0){
            let tp=null;
            if(mfx&&typeof mfx.paintItemFX==="function"){
              tp=mfx.paintItemFX(ctx,obj,prog,rawP,fx,!!(it.rev??st.rev),pb,z2);
            }else{
              ctx.save();ctx.globalAlpha*=prog;pb(ctx,obj);ctx.restore();
            }
            if(isCurStep&&tp&&rawP<.995)activeTip={pageIdx,x:tp.x,y:tp.y,dx:tp.dx??1,dy:tp.dy??0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
          }
        }else if(it.kind==="stroke"){
          const sk=strokeMap.get(it.refId);
          if(!sk)continue;
          drawnRefs.add("k:"+sk.id);
          if(i<r.stepIdx||(rawP>=.999&&(!isCurStep||!ovEnd))){
            z5(ctx,[sk]);
          }else if(rawP>0){
            let tp=null;
            if(mfx&&typeof mfx.paintStrokeFX==="function"){
              tp=mfx.paintStrokeFX(ctx,sk,prog,rawP,fx,!!(it.rev??st.rev),(c2,s2)=>z5(c2,[s2]));
            }else{
              ctx.save();ctx.globalAlpha*=prog;z5(ctx,[sk]);ctx.restore();
            }
            if(isCurStep&&tp&&rawP<.995)activeTip={pageIdx,x:tp.x,y:tp.y,dx:tp.dx??1,dy:tp.dy??0,active:!0,drawing:!!r.playing&&!(r._pauseTimer>0)};
          }
        }
      }
    }
  }
  ctx.save();
  ctx.font="italic "+fsz+"px 'Times New Roman', serif",ctx.textAlign="center",ctx.textBaseline="middle";
  for(const pt of Object.values(geo.points)){
    if(!pt.show||pt.hidden)continue;
    if(!anyWholePage&&!scopedPts.has(pt.id))continue;
    const isDone=donePts.has(pt.id),ap=isDone?1:(animPts.get(pt.id)??0);
    if(ap<=0)continue;
    const c=coords.get(pt.id);if(!c)continue;
    const pFx=ptEffectMap.get(pt.id)||"draw";
    ctx.save();
    let ox=0,oy=0,sc=1,alpha=Math.min(1,ap*1.2);
    if(!isDone){
      if(pFx==="spring")sc=Math.max(.15,1+.24*Math.sin(ap*Math.PI*2.5)*Math.exp(-3*ap)-Math.exp(-6*ap));
      else if(pFx==="zoom")sc=.15+.85*ap;
      else if(pFx==="slide"){oy=22*(1-ap);alpha=Math.min(1,ap*1.4);}
      else if(pFx==="fade")alpha=ap;
      else if(pFx==="wiggle_alert"){ox=Math.sin(ap*Math.PI*6)*4*Math.sin(Math.PI*ap);}
      else if(pFx==="glow"||pFx==="laser_scan"){ctx.shadowColor=pFx==="laser_scan"?"#06b6d4":"#38bdf8";ctx.shadowBlur=14;}
    }
    ctx.globalAlpha*=alpha;
    if(opts.dots!==!1&&!pt.noDot){
      const baseD=(pt.size??dotR)*(isDone?1:Math.min(1.35,(.38+.62*ap)*sc));
      const m=MR(pt,opts.dotColor);
      ctx.beginPath();
      if(pt.dotStyle==="cross"){
        const g=baseD*1.1;ctx.moveTo(c.x+ox-g,c.y+oy-g),ctx.lineTo(c.x+ox+g,c.y+oy+g),ctx.moveTo(c.x+ox-g,c.y+oy+g),ctx.lineTo(c.x+ox+g,c.y+oy-g),ctx.strokeStyle=m,ctx.lineWidth=Math.max(1.5,baseD*.45),ctx.stroke();
      }else if(pt.dotStyle==="ring"){
        ctx.arc(c.x+ox,c.y+oy,baseD,0,Math.PI*2),ctx.strokeStyle=m,ctx.lineWidth=Math.max(1.2,baseD*.4),ctx.stroke();
      }else{
        ctx.arc(c.x+ox,c.y+oy,baseD,0,Math.PI*2),ctx.fillStyle=m,ctx.fill();
      }
      if(!isDone&&ap<.96){
        const handledFx=mfx&&typeof mfx.paintPointFX==="function"?mfx.paintPointFX(ctx,pt,{x:c.x+ox,y:c.y+oy},ap,isDone,pFx,opts):!1;
        if(!handledFx){
          ctx.beginPath(),ctx.arc(c.x+ox,c.y+oy,baseD+12*ap,0,Math.PI*2),ctx.strokeStyle=pFx==="glow"?"rgba(56,189,248,"+((1-ap)*.85)+")":"rgba(37,99,235,"+((1-ap)*.7)+")",ctx.lineWidth=1.8,ctx.stroke();
          if(pFx==="pulse"&&ap>.25){
            ctx.beginPath(),ctx.arc(c.x+ox,c.y+oy,baseD+22*(ap-.25),0,Math.PI*2),ctx.strokeStyle="rgba(37,99,235,"+((1-ap)*.5)+")",ctx.lineWidth=1.4,ctx.stroke();
          }
        }
      }
    }
    const lp=lblPos.get(pt.id);
    if(lp){ctx.fillStyle=pt.color??opts.labelColor??kk;ctx.fillText(pt.label,lp.x+ox,lp.y+oy);}
    ctx.restore();
  }
  ctx.restore();
  if(cueOverlays.length&&mfx&&typeof mfx.paintCueOnlyFX==="function"){
    for(const ov of cueOverlays){
      mfx.paintCueOnlyFX(ctx,ov.bb,ov.center,ov.rawP,ov.fx);
    }
  }
  return{tip:activeTip};
}
paintReplay(ctx,pageIdx){
  const actives=this._getActiveReplays(pageIdx);
  if(!actives.length)return;
  const pg=this.view.pages[pageIdx];if(!pg)return;
  const res=this._paintReplayGeo(ctx,pg.geo,actives,{pageIdx,page:pg,isExport:!1});
  const tip=res&&res.tip?res.tip:{pageIdx,x:0,y:0,dx:1,dy:0,active:!1,drawing:!1};
  this._replayTip=tip;
  if(tip.active&&typeof window!=="undefined"&&window.MinNoteHandCursor&&typeof window.MinNoteHandCursor.paintReplayTip==="function"){
    try{window.MinNoteHandCursor.paintReplayTip(ctx,tip,this);}catch(_e){}
  }
}`;

src = replaceOnce(src, oldPaintReplayBlock, newPaintReplayBlock, '_paintReplayGeo & paintReplay upgrade');

// 9. renderReplayExportFrame pass page:pg too
src = replaceOnce(
  src,
  `const res=this._paintReplayGeo(ctx,geo,[snap],{...opts,pageIdx:replay.page,isExport:!0});`,
  `const res=this._paintReplayGeo(ctx,geo,[snap],{...opts,pageIdx:replay.page,page:pg,isExport:!0});`,
  'renderReplayExportFrame page arg'
);

// 10. _stepAutoFollow(dt) critically damped spring camera
const oldAutoFollow = `_stepAutoFollow(dt){if(performance.now()<(this._userScrollUntil||0))return;const playing=this._getActiveReplays().filter(r=>r.playing&&r.followCamera!==!1);if(!playing.length)return;const r=playing.find(x=>x.id===this.activeReplayId)||playing[0];const pg=this.view.pages[r.page];if(!pg||!pg.geo)return;let fx=null,fy=null;if(this._replayTip&&this._replayTip.active&&this._replayTip.pageIdx===r.page&&Number.isFinite(this._replayTip.x)){fx=this._replayTip.x;fy=this._replayTip.y;}else{const activeSteps=r.steps.filter(s=>s.enabled!==!1);const st=activeSteps[Math.min(r.stepIdx,activeSteps.length-1)];if(st){const fp=_mnStepFocusPt(pg.geo,Tt(pg.geo),st);if(fp){fx=fp.x;fy=fp.y;}}}if(fx===null||fy===null)return;const sc=this.scroller;if(!sc)return;const cw=sc.clientWidth,ch=sc.clientHeight;if(cw<=0||ch<=0)return;const docX=this.offsetX+fx*this.zoom,docY=(this.pageTop(r.page)+fy)*this.zoom;const sl=sc.scrollLeft,stTop=sc.scrollTop;const outX=docX<sl+cw*.25||docX>sl+cw*.75,outY=docY<stTop+ch*.25||docY>stTop+ch*.75;if(!outX&&!outY)return;const factor=1-Math.exp(-7*dt);const maxL=Math.max(0,sc.scrollWidth-cw),maxT=Math.max(0,sc.scrollHeight-ch);const targetL=Math.max(0,Math.min(maxL,docX-cw*.5)),targetT=Math.max(0,Math.min(maxT,docY-ch*.5));this._autoFollowing=!0;try{if(outX&&maxL>2)sc.scrollLeft=sl+(targetL-sl)*factor;if(outY&&maxT>2)sc.scrollTop=stTop+(targetT-stTop)*factor;}finally{this._autoFollowing=!1;}}`;

const newAutoFollow = `_stepAutoFollow(dt){if(performance.now()<(this._userScrollUntil||0)){this._camSpring=null;return;}const playing=this._getActiveReplays().filter(r=>r.playing&&r.followCamera!==!1);if(!playing.length){this._camSpring=null;return;}const r=playing.find(x=>x.id===this.activeReplayId)||playing[0];const pg=this.view.pages[r.page];if(!pg||!pg.geo)return;let fx=null,fy=null;if(this._replayTip&&this._replayTip.active&&this._replayTip.pageIdx===r.page&&Number.isFinite(this._replayTip.x)){fx=this._replayTip.x;fy=this._replayTip.y;}else{const activeSteps=r.steps.filter(s=>s.enabled!==!1);const st=activeSteps[Math.min(r.stepIdx,activeSteps.length-1)];if(st){const fp=_mnStepFocusPt(pg.geo,Tt(pg.geo),st,pg);if(fp){fx=fp.x;fy=fp.y;}}}if(fx===null||fy===null)return;const sc=this.scroller;if(!sc)return;const cw=sc.clientWidth,ch=sc.clientHeight;if(cw<=0||ch<=0)return;const docX=this.offsetX+fx*this.zoom,docY=(this.pageTop(r.page)+fy)*this.zoom;const sl=sc.scrollLeft,stTop=sc.scrollTop;const maxL=Math.max(0,sc.scrollWidth-cw),maxT=Math.max(0,sc.scrollHeight-ch);const targetL=Math.max(0,Math.min(maxL,docX-cw*.5)),targetT=Math.max(0,Math.min(maxT,docY-ch*.5));const outX=docX<sl+cw*.22||docX>sl+cw*.78,outY=docY<stTop+ch*.22||docY>stTop+ch*.78;const mfx=typeof window!=="undefined"?window.MinNoteMotionFX:null;if(r.springCamera!==!1&&mfx&&typeof mfx.stepSpringCamera==="function"){if(!this._camSpring||this._camSpring.page!==r.page||Math.hypot(this._camSpring.x-sl,this._camSpring.y-stTop)>48){this._camSpring={x:sl,y:stTop,vx:0,vy:0,page:r.page,tx:sl,ty:stTop};}if(outX&&maxL>2)this._camSpring.tx=targetL;if(outY&&maxT>2)this._camSpring.ty=targetT;const tx=maxL>2?this._camSpring.tx:sl,ty=maxT>2?this._camSpring.ty:stTop;if(!outX&&!outY&&Math.hypot(tx-sl,ty-stTop)<1.5&&Math.hypot(this._camSpring.vx,this._camSpring.vy)<2)return;const nextCam=mfx.stepSpringCamera(this._camSpring,tx,ty,dt);this._autoFollowing=!0;try{if(maxL>2)sc.scrollLeft=nextCam.x;if(maxT>2)sc.scrollTop=nextCam.y;}finally{this._autoFollowing=!1;}return;}if(!outX&&!outY)return;const factor=1-Math.exp(-7*dt);this._autoFollowing=!0;try{if(outX&&maxL>2)sc.scrollLeft=sl+(targetL-sl)*factor;if(outY&&maxT>2)sc.scrollTop=stTop+(targetT-stTop)*factor;}finally{this._autoFollowing=!1;}}`;

src = replaceOnce(src, oldAutoFollow, newAutoFollow, '_stepAutoFollow spring camera');

// 11. Enable selection-bar replay button for item & stroke selections too (ONLY the replay button!)
src = replaceOnce(
  src,
  `(J==null?void 0:J.selectionHasGeo())&&h.jsxs("button",{title:"Dựng lại hình theo kịch bản thứ tự vẽ"`,
  `(J!=null&&J.sel&&(J.sel.shapes.size||J.sel.points.size||J.sel.items.size||J.sel.strokes.size))&&h.jsxs("button",{title:"Dựng lại hình theo kịch bản thứ tự vẽ"`,
  'Selection bar replay button non-geo support'
);

fs.writeFileSync(targetPath, src, 'utf8');
console.log('[v83] Successfully patched index-CTbULhps.js with MinNoteMotionFX hooks!');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
