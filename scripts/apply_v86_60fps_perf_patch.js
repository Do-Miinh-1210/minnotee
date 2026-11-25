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
// Idempotent patch script: v0.0.8.6 Locked 60fps Performance Engine
// Eliminates ALL frame-drop bottlenecks during 360° Auto-Orbit, Replay, Spring Camera, 3D Turn & Point Motion:
//  1. Zero-miss static pageCanvas separation (_isLiveGeoOverlay + _liveStaticPageCache + replayHiddenPage cache fix):
//     Stops 44MB (2809x3973) full-page re-rasterization on every single frame of 360° auto-orbit, 3D turn & point motion!
//  2. Fixes Camera lo xo (_stepAutoFollow) async DOM scroll race:
//     Eliminates false _userScrollUntil 2.5s camera freezes AND stops 60fps React emit() re-render storms!
//  3. WeakMap memoization of Tt(geo) & xk(geo, coords, opts): O(1) lookup across 60fps replay & overlay passes.
//  4. Replaces expensive per-frame high-DPI ctx.shadowBlur passes in _drawTip & _teePartial with crisp halo strokes/circles.
//  5. Syncs body.mn-animating on state transitions so CSS suspends costly backdrop-filter & DOM observers during 60fps motion.
const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(targetPath, 'utf8');

const MARKER = '/*__MN_V86_60FPS_PERF__*/';
if (src.includes(MARKER)) {
  console.log('[v86-perf] 60fps performance patch already applied — skipping.');
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
  if (idx === -1) throw new Error(`[v86-perf] Anchor not found: ${label}`);
  const second = str.indexOf(target, idx + target.length);
  if (second !== -1) throw new Error(`[v86-perf] Anchor not unique: ${label}`);
  return str.slice(0, idx) + repl + str.slice(idx + target.length);
}

// 1. WeakMap memoization for Tt(geo)
src = replaceOnce(
  src,
  `function Tt(e){const t=new Map,n=new Set,o=s=>{if(t.has(s))return t.get(s);const i=e.points[s];if(!i||n.has(s))return null;n.add(s);const r=EY(i.def,o,e);n.delete(s);const a=r&&Number.isFinite(r.x)&&Number.isFinite(r.y)?r:null;return t.set(s,a),a};for(const s of Object.keys(e.points))o(s);t._geo=e;return t}`,
  `${MARKER}const _mnTtCache=new WeakMap;function Tt(e){if(!e||!e.points)return new Map;const _c=_mnTtCache.get(e);if(_c&&_c.pts===e.points&&_c.shs===e.shapes&&_c.par===e.params)return _c.map;const t=new Map,n=new Set,o=s=>{if(t.has(s))return t.get(s);const i=e.points[s];if(!i||n.has(s))return null;n.add(s);const r=EY(i.def,o,e);n.delete(s);const a=r&&Number.isFinite(r.x)&&Number.isFinite(r.y)?r:null;return t.set(s,a),a};for(const s of Object.keys(e.points))o(s);t._geo=e;_mnTtCache.set(e,{pts:e.points,shs:e.shapes,par:e.params,map:t});return t}`,
  'Tt WeakMap memoization'
);

// 2. WeakMap memoization for xk(geo, coords, opts)
src = replaceOnce(
  src,
  `function xk(e,t,n={}){const o=new Map,s=(l,c)=>{const u=t.get(l),p=t.get(c);if(!(!u||!p||u.x===p.x&&u.y===p.y))for(const[d,m,g]of[[l,p.x-u.x,p.y-u.y],[c,u.x-p.x,u.y-p.y]])o.set(d,[...o.get(d)??[],Math.atan2(g,m)])},i=l=>{const c=(o.get(l)??[]).sort((d,m)=>d-m);if(!c.length)return{x:.7,y:-.7};let u=-1,p=0;return c.forEach((d,m)=>{const g=m+1<c.length?c[m+1]:c[0]+2*Math.PI;g-d>u&&(u=g-d,p=(d+g)/2)}),{x:Math.cos(p),y:Math.sin(p)}};for(const l of e.shapes)l.kind==="segment"||l.kind==="line"||l.kind==="ray"?s(l.pts[0],l.pts[1]):l.kind==="polygon"&&l.pts.forEach((c,u)=>s(c,l.pts[(u+1)%l.pts.length]));const r=22*Math.max(1,(n.labelSize??Ll)/Ll),a=new Map;for(const l of Object.values(e.points)){const c=t.get(l.id);if(!l.show||l.hidden||!c||!l.label||n.names===!1&&!l.named||l.noName)continue;const u=l.labelAt??{x:i(l.id).x*r,y:i(l.id).y*r};a.set(l.id,{x:c.x+u.x,y:c.y+u.y})}return a}`,
  `const _mnXkCache=new WeakMap;function xk(e,t,n={}){const _k=(n.labelSize??Ll)+"|"+(n.names===!1?0:1);if(e){const _c=_mnXkCache.get(e);if(_c&&_c.coords===t&&_c.key===_k&&_c.pts===e.points&&_c.shs===e.shapes)return _c.val;}const o=new Map,s=(l,c)=>{const u=t.get(l),p=t.get(c);if(!(!u||!p||u.x===p.x&&u.y===p.y)){let a1=o.get(l);if(!a1){a1=[];o.set(l,a1);}a1.push(Math.atan2(p.y-u.y,p.x-u.x));let a2=o.get(c);if(!a2){a2=[];o.set(c,a2);}a2.push(Math.atan2(u.y-p.y,u.x-p.x));}},i=l=>{const c=o.get(l);if(!c||!c.length)return{x:.7,y:-.7};c.sort((d,m)=>d-m);let u=-1,p=0;for(let m=0;m<c.length;m++){const g=m+1<c.length?c[m+1]:c[0]+2*Math.PI;if(g-c[m]>u){u=g-c[m];p=(c[m]+g)/2;}}return{x:Math.cos(p),y:Math.sin(p)}};for(const l of e.shapes)l.kind==="segment"||l.kind==="line"||l.kind==="ray"?s(l.pts[0],l.pts[1]):l.kind==="polygon"&&l.pts.forEach((c,u)=>s(c,l.pts[(u+1)%l.pts.length]));const r=22*Math.max(1,(n.labelSize??Ll)/Ll),a=new Map;for(const l of Object.values(e.points)){const c=t.get(l.id);if(!l.show||l.hidden||!c||!l.label||n.names===!1&&!l.named||l.noName)continue;const u=l.labelAt??{x:i(l.id).x*r,y:i(l.id).y*r};a.set(l.id,{x:c.x+u.x,y:c.y+u.y})}if(e)_mnXkCache.set(e,{coords:t,key:_k,pts:e.points,shs:e.shapes,val:a});return a}`,
  'xk WeakMap memoization'
);

// 3. Replace expensive high-DPI shadowBlur in _drawTip & _teePartial glow/pulse with fast halo passes
src = replaceOnce(
  src,
  `  if(glow){
    e.shadowColor="#38bdf8";e.shadowBlur=14*alpha;
    e.beginPath(),e.arc(p.x,p.y,8.2,0,Math.PI*2),e.fillStyle="rgba(56,189,248,0.26)",e.fill();
    e.beginPath(),e.arc(p.x,p.y,4.4,0,Math.PI*2),e.fillStyle="#38bdf8",e.fill();
    e.shadowBlur=0;
    e.beginPath(),e.arc(p.x,p.y,2.1,0,Math.PI*2),e.fillStyle="#ffffff",e.fill();
  }`,
  `  if(glow){
    e.beginPath(),e.arc(p.x,p.y,11.5,0,Math.PI*2),e.fillStyle="rgba(56,189,248,0.13)",e.fill();
    e.beginPath(),e.arc(p.x,p.y,7.8,0,Math.PI*2),e.fillStyle="rgba(56,189,248,0.30)",e.fill();
    e.beginPath(),e.arc(p.x,p.y,4.3,0,Math.PI*2),e.fillStyle="#38bdf8",e.fill();
    e.beginPath(),e.arc(p.x,p.y,2.1,0,Math.PI*2),e.fillStyle="#ffffff",e.fill();
  }`,
  '_drawTip zero-shadowBlur glow'
);

src = replaceOnce(
  src,
  `    // 1. Seamless luminous pulse along the entire completed stroke
    e.save();
    e.shadowColor="rgba(37,99,235,"+(env*.85).toFixed(3)+")";
    e.shadowBlur=14*env;
    e.globalAlpha*=(.55*env);
    tee(e,t,n);
    e.restore();`,
  `    // 1. Seamless luminous pulse along the entire completed stroke (zero-shadowBlur fast halo)
    e.save();
    e.globalAlpha*=(.32*env);
    tee(e,{...t,color:"#3b82f6",width:(t.width||2.5)+6},n);
    e.restore();`,
  '_teePartial pulse zero-shadowBlur halo'
);

src = replaceOnce(
  src,
  `  if(pDraw>=.999){
    if(isGlow&&glowFade>.02){
      e.save();e.shadowColor="#38bdf8";e.shadowBlur=13*glowFade;tee(e,t,n);e.restore();
    }else{
      tee(e,t,n);
    }
    drawPulseOverlay();
    return bb?{x:bb.cx,y:bb.cy,dx:1,dy:0}:null;
  }`,
  `  if(pDraw>=.999){
    if(isGlow&&glowFade>.02){
      e.save();e.globalAlpha*=(.30*glowFade);tee(e,{...t,color:"#38bdf8",width:(t.width||2.5)+6.5},n);e.restore();
    }
    tee(e,t,n);
    drawPulseOverlay();
    return bb?{x:bb.cx,y:bb.cy,dx:1,dy:0}:null;
  }`,
  '_teePartial pDraw>=0.999 zero-shadowBlur glow'
);

src = replaceOnce(
  src,
  `if(isGlow&&glowFade>.01){e.shadowColor="#38bdf8";e.shadowBlur=12*glowFade;}\n    if(_ls[0]&&_ls[0].envelope){e.globalAlpha=.42;e.lineWidth=Math.max(1,t.width*.65);}\n    const tip=_drawPolylinesPartial(e,_ls.map(l=>({...l,dashed:!!t.dashed})),pDraw,rev);`,
  `if(_ls[0]&&_ls[0].envelope){e.globalAlpha=.42;e.lineWidth=Math.max(1,t.width*.65);}\n    const _lsMapped=_ls.map(l=>({...l,dashed:!!t.dashed}));\n    if(isGlow&&glowFade>.02){e.save();e.strokeStyle="rgba(56,189,248,"+(.30*glowFade).toFixed(3)+")";e.lineWidth=(t.width||2.5)+6.5;_drawPolylinesPartial(e,_lsMapped,pDraw,rev);e.restore();}\n    const tip=_drawPolylinesPartial(e,_lsMapped,pDraw,rev);`,
  '_teePartial locus zero-shadowBlur glow'
);

src = replaceOnce(
  src,
  `if(isGlow&&glowFade>.01){e.shadowColor="#38bdf8";e.shadowBlur=13*glowFade;}`,
  `const _glowHaloPass=(isGlow&&glowFade>.02);`,
  '_teePartial main glow flag'
);

// Add lightweight double-pass glow in _drawPolylinesPartial when _glowHaloPass is active? Even cleaner: keep _teePartial main glow fast by capping shadowBlur=0 and drawing glow halo inside _drawPolylinesPartial helper or directly around _drawPolylinesPartial calls! Let's check where _glowHaloPass sits:
// Actually let's inspect if there is a cleaner hook right after _glowHaloPass — we know _teePartial calls _drawPolylinesPartial for complex & switch cases; let's pass glowFade smoothly via e._mnGlowHalo!
src = replaceOnce(
  src,
  `const _glowHaloPass=(isGlow&&glowFade>.02);`,
  `if(isGlow&&glowFade>.02){e._mnGlowHalo=glowFade;}`,
  '_teePartial set _mnGlowHalo'
);

src = replaceOnce(
  src,
  `function _drawPolylinesPartial(e,paths,p,rev){
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
}`,
  `function _drawPolylinesPartial(e,paths,p,rev){
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
  const _gh=e._mnGlowHalo||0;
  if(_gh)e._mnGlowHalo=0;
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
    if(_gh>0.02){
      const _origW=e.lineWidth||2.5,_origS=e.strokeStyle;
      e.strokeStyle="rgba(56,189,248,"+(0.28*_gh).toFixed(3)+")";
      e.lineWidth=_origW+6.5;
      e.stroke();
      e.strokeStyle=_origS;
      e.lineWidth=_origW;
    }
    e.stroke();
    e.restore();
  }
  return tip;
}`,
  '_drawPolylinesPartial fast zero-shadowBlur halo'
);

// 4. Fix async DOM scroll race & eliminate 60fps React emit() storm during Camera lo xo auto-follow
src = replaceOnce(
  src,
  `r("scroll",()=>{if(!this._autoFollowing)this._userScrollUntil=performance.now()+2500;this.growAtEnd(),this.growAtRight(),this.dropSelectionOutOfView(),this.redraw(),this.emit()})`,
  `r("scroll",()=>{const _now=performance.now();const _sc=this.scroller;const _tg=this._autoFollowTarget;const _isAuto=this._autoFollowing||(_now<(this._autoFollowScrollUntil||0)&&_tg&&Math.abs(_sc.scrollLeft-_tg.l)<=6&&Math.abs(_sc.scrollTop-_tg.t)<=6);if(!_isAuto){this._userScrollUntil=_now+2500;this.growAtEnd(),this.growAtRight(),this.dropSelectionOutOfView(),this.redraw(),this.emit();}else{const _cp=this.currentPage();if(!this.replayRaf)this.redraw();if(_cp!==this._lastAutoFollowPage){this._lastAutoFollowPage=_cp;this.emit();}}})`,
  'scroll listener async programmatic guard'
);

src = replaceOnce(
  src,
  `const nextCam=mfx.stepSpringCamera(this._camSpring,tx,ty,dt);this._autoFollowing=!0;try{if(maxL>2)sc.scrollLeft=nextCam.x;if(maxT>2)sc.scrollTop=nextCam.y;}finally{this._autoFollowing=!1;}return;}if(!outX&&!outY)return;const factor=1-Math.exp(-7*dt);this._autoFollowing=!0;try{if(outX&&maxL>2)sc.scrollLeft=sl+(targetL-sl)*factor;if(outY&&maxT>2)sc.scrollTop=stTop+(targetT-stTop)*factor;}finally{this._autoFollowing=!1;}`,
  `const nextCam=mfx.stepSpringCamera(this._camSpring,tx,ty,dt);this._autoFollowing=!0;try{if(maxL>2)sc.scrollLeft=nextCam.x;if(maxT>2)sc.scrollTop=nextCam.y;this._autoFollowTarget={l:sc.scrollLeft,t:sc.scrollTop};this._autoFollowScrollUntil=performance.now()+200;}finally{this._autoFollowing=!1;}return;}if(!outX&&!outY)return;const factor=1-Math.exp(-7*dt);this._autoFollowing=!0;try{if(outX&&maxL>2)sc.scrollLeft=sl+(targetL-sl)*factor;if(outY&&maxT>2)sc.scrollTop=stTop+(targetT-stTop)*factor;this._autoFollowTarget={l:sc.scrollLeft,t:sc.scrollTop};this._autoFollowScrollUntil=performance.now()+200;}finally{this._autoFollowing=!1;}`,
  '_stepAutoFollow programmatic scroll timestamp window'
);

// 5. ZERO-MISS static pageCanvas separation during 360° Auto-Orbit, 3D Turn, Point Motion & Animated Params!
//    Upgrade replayHiddenPage() so static background page stays cached (even 0-miss on transition into 360° auto-orbit!)
src = replaceOnce(
  src,
  `const cacheKey=actives.map(r=>r.scopeKey||"all").join("||")+"|I:"+[...itemSet].sort().join(",")+"|S:"+[...strokeSet].sort().join(",");const c=this._replayHiddenCache;if(c&&c.page===t&&c.key===cacheKey)return c.shown;const hideAll=actives.some(r=>!r.scopeShapes);const nextItems=itemSet.size&&Array.isArray(t.items)?t.items.filter(x=>!itemSet.has(x.id)):t.items;const nextStrokes=strokeSet.size&&Array.isArray(t.strokes)?t.strokes.filter(x=>!strokeSet.has(x.id)):t.strokes;let shown;if(hideAll){shown={...t,items:nextItems,strokes:nextStrokes,geo:{...t.geo,shapes:[],points:{}}};}else{const shSet=new Set,ptSet=new Set;for(const r of actives){if(r.scopeShapes)for(const id of r.scopeShapes)shSet.add(id);if(r.scopePoints)for(const id of r.scopePoints)ptSet.add(id);}shown={...t,items:nextItems,strokes:nextStrokes,geo:{...t.geo,shapes:t.geo.shapes.filter(s=>!shSet.has(s.id)),points:Object.fromEntries(Object.entries(t.geo.points).filter(([id])=>!ptSet.has(id)))}};}this._replayHiddenCache={page:t,key:cacheKey,shown};return shown;`,
  `const liveGeo=this._isLiveGeoOverlay(pageIdx);const orbitInScope=this._isOrbitContainedInReplay(t,pageIdx,actives);const hideAll=(liveGeo&&!orbitInScope)||actives.some(r=>!r.scopeShapes);const cacheKey=((liveGeo&&!orbitInScope)?"L1|":"L0|")+actives.map(r=>r.scopeKey||"all").join("||")+"|I:"+[...itemSet].sort().join(",")+"|S:"+[...strokeSet].sort().join(",");const c=this._replayHiddenCache;if(c&&c.key===cacheKey&&c.id===t.id&&c.items===t.items&&c.strokes===t.strokes&&c.links===t.links&&(hideAll||orbitInScope||c.page===t))return c.shown;const nextItems=itemSet.size&&Array.isArray(t.items)?t.items.filter(x=>!itemSet.has(x.id)):t.items;const nextStrokes=strokeSet.size&&Array.isArray(t.strokes)?t.strokes.filter(x=>!strokeSet.has(x.id)):t.strokes;let shown;if(hideAll){shown={...t,items:nextItems,strokes:nextStrokes,geo:{...t.geo,shapes:[],points:{}}};}else{const shSet=new Set,ptSet=new Set;for(const r of actives){if(r.scopeShapes)for(const id of r.scopeShapes)shSet.add(id);if(r.scopePoints)for(const id of r.scopePoints)ptSet.add(id);}shown={...t,items:nextItems,strokes:nextStrokes,geo:{...t.geo,shapes:t.geo.shapes.filter(s=>!shSet.has(s.id)),points:Object.fromEntries(Object.entries(t.geo.points).filter(([id])=>!ptSet.has(id)))}};}this._replayHiddenCache={page:t,id:t.id,items:t.items,strokes:t.strokes,links:t.links,key:cacheKey,shown};return shown;`,
  'replayHiddenPage zero-miss cache during liveGeo/hideAll'
);

// 6. Add _isOrbitContainedInReplay, _isLiveGeoOverlay(n), _isAnyLiveAnim(), _paintLiveGeoOverlay(t,n) and hook shownPage(t,n)
src = replaceOnce(
  src,
  `/*__MN_V80_SPLIT_ITER_ANIM__*/shownPage(t,n){if(this._getActiveReplays(n).length)return this.replayHiddenPage(t,n);`,
  `_isOrbitContainedInReplay(pg,n,actives){if(!this.autoOrbit||this.autoOrbit.page!==n)return!1;if(this.drag&&this.drag.k==="turn"&&this.drag.page===n)return!1;if(this.ptAnims&&this.ptAnims.size>0){for(const a of this.ptAnims.values()){if(!a.paused&&a.page===n)return!1;}}if(pg&&pg.geo&&Array.isArray(pg.geo.params)&&pg.geo.params.some(p=>p&&p.animating))return!1;if(!actives||!actives.length||actives.some(r=>!r.scopeShapes))return!1;const sol=pg&&pg.geo&&Array.isArray(pg.geo.shapes)?pg.geo.shapes.find(s=>s.id===this.autoOrbit.id):null;if(!sol)return!1;const shSet=new Set;for(const r of actives){if(r.scopeShapes)for(const id of r.scopeShapes)shSet.add(id);}if(!shSet.has(sol.id))return!1;if(sol.group){for(const s of pg.geo.shapes){if(s.group===sol.group&&!shSet.has(s.id))return!1;}}return!0;}_isLiveGeoOverlay(n){const o=this.turning;if(o&&o.page===n&&(o.unfold>0||(o.split>0.001&&o.section)))return!1;if(this.autoOrbit&&this.autoOrbit.page===n)return!0;if(this.drag&&this.drag.k==="turn"&&this.drag.page===n)return!0;if(this.ptAnims&&this.ptAnims.size>0){for(const a of this.ptAnims.values()){if(!a.paused&&a.page===n)return!0;}}const pg=this.view&&this.view.pages?this.view.pages[n]:null;if(pg&&pg.geo&&Array.isArray(pg.geo.params)&&pg.geo.params.some(p=>p&&p.animating))return!0;return!1;}_isAnyLiveAnim(){if(this.autoOrbit)return!0;if(this.drag&&this.drag.k==="turn")return!0;if(this.replayRaf||this._getActiveReplays().some(r=>r.playing))return!0;if(this.ptAnims&&this.ptAnims.size>0){for(const a of this.ptAnims.values()){if(!a.paused)return!0;}}if(this.view&&this.view.pages){for(const pg of this.view.pages){if(pg&&pg.geo&&Array.isArray(pg.geo.params)&&pg.geo.params.some(p=>p&&p.animating))return!0;}}return!1;}_updateAnimPerfClass(){if(typeof document==="undefined"||!document.body)return;const on=this._isAnyLiveAnim();if(this._lastAnimPerf!==on){this._lastAnimPerf=on;document.body.classList.toggle("mn-animating",on);}}_paintLiveGeoOverlay(ctx,pageIdx){if(!this._isLiveGeoOverlay(pageIdx))return;const pg=this.view&&this.view.pages?this.view.pages[pageIdx]:null;if(!pg||!pg.geo)return;const actives=this._getActiveReplays(pageIdx);const opts={names:this.doc.names!==!1,labelSize:this.doc.labelSize,dots:this.doc.dots,labelColor:this.doc.labelColor,dotColor:this.doc.dotColor,dotSize:this.doc.dotSize};if(!actives.length){gd(ctx,pg.geo,Tt(pg.geo),opts);return;}if(this._isOrbitContainedInReplay(pg,pageIdx,actives))return;if(actives.some(r=>!r.scopeShapes))return;const shSet=new Set,ptSet=new Set;for(const r of actives){if(r.scopeShapes)for(const id of r.scopeShapes)shSet.add(id);if(r.scopePoints)for(const id of r.scopePoints)ptSet.add(id);}const restShapes=pg.geo.shapes.filter(s=>!shSet.has(s.id));const restPts={};let hasRestPt=!1;for(const [id,pt] of Object.entries(pg.geo.points)){if(!ptSet.has(id)){restPts[id]=pt;hasRestPt=!0;}}if(!restShapes.length&&!hasRestPt)return;gd(ctx,{...pg.geo,shapes:restShapes,points:restPts},Tt(pg.geo),opts);}/*__MN_V80_SPLIT_ITER_ANIM__*/shownPage(t,n){if(this._getActiveReplays(n).length)return this.replayHiddenPage(t,n);if(this._isLiveGeoOverlay(n)){const c=this._liveStaticPageCache;if(c&&c.pageIdx===n&&c.id===t.id&&c.items===t.items&&c.strokes===t.strokes&&c.links===t.links)return c.shown;const shown={...t,geo:{...t.geo,shapes:[],points:{}}};this._liveStaticPageCache={pageIdx:n,id:t.id,items:t.items,strokes:t.strokes,links:t.links,shown};return shown;}`,
  'shownPage + _isLiveGeoOverlay + _paintLiveGeoOverlay'
);

// 7. Call _updateAnimPerfClass() at start of paint() and _paintLiveGeoOverlay(t,n) in paintOverlay()
src = replaceOnce(
  src,
  `paint(){var y,k,w;this.lastPaint=performance.now(),this.drawnAnew=0,this.notePenPaint();`,
  `paint(){var y,k,w;this.lastPaint=performance.now(),this.drawnAnew=0,this.notePenPaint(),this._updateAnimPerfClass();`,
  'paint() sync body.mn-animating'
);

src = replaceOnce(
  src,
  `paintOverlay(t,n){var v,y,k;const o=this.drag,s=this.zoom;this.paintReplay(t,n),this.paintNet(t,n),`,
  `paintOverlay(t,n){var v,y,k;const o=this.drag,s=this.zoom;this._paintLiveGeoOverlay(t,n),this.paintReplay(t,n),this.paintNet(t,n),`,
  'paintOverlay calls _paintLiveGeoOverlay'
);

// 8. Skip redundant drawInteractiveOverlay work while actively animating replay or 360° orbit
src = replaceOnce(
  src,
  `if(typeof window!=="undefined"&&window.MinNoteGeoParams&&typeof window.MinNoteGeoParams.drawInteractiveOverlay==="function"){const _rawPg=this.view.pages[n];const _pg=_rawPg?this.shownPage(_rawPg,n):null;if(_pg&&_pg.geo){try{window.MinNoteGeoParams.drawInteractiveOverlay(t,_pg.geo,Tt(_pg.geo),n)}catch(_e){}}}`,
  `if(!this._lastAnimPerf&&typeof window!=="undefined"&&window.MinNoteGeoParams&&typeof window.MinNoteGeoParams.drawInteractiveOverlay==="function"){const _rawPg=this.view.pages[n];const _pg=_rawPg?this.shownPage(_rawPg,n):null;if(_pg&&_pg.geo){try{window.MinNoteGeoParams.drawInteractiveOverlay(t,_pg.geo,Tt(_pg.geo),n)}catch(_e){}}}`,
  'paintOverlay skip drawInteractiveOverlay while animating'
);

// 9. Cleanly invalidate _liveStaticPageCache on stopAutoOrbit / stopPointAnim / stopAllPointAnims / togglePointAnimPause
src = replaceOnce(
  src,
  `stopAutoOrbit(commitChange=!0){const st=this.autoOrbit;if(!st)return;if(st.raf)cancelAnimationFrame(st.raf);this.autoOrbit=null;if(commitChange&&this.live){const fin=this.live;this.live=null;this.commit(fin);}else{this.live=null;this.redraw();}this.emit();}`,
  `stopAutoOrbit(commitChange=!0){const st=this.autoOrbit;if(!st)return;if(st.raf)cancelAnimationFrame(st.raf);this.autoOrbit=null;this._liveStaticPageCache=null;this._replayHiddenCache=null;this._updateAnimPerfClass();if(commitChange&&this.live){const fin=this.live;this.live=null;this.commit(fin);}else{this.live=null;this.redraw();}this.emit();}`,
  'stopAutoOrbit cache reset'
);

src = replaceOnce(
  src,
  `stopPointAnim(id){if(!this.ptAnims.has(id))return;this.ptAnims.delete(id);if(!this.ptAnims.size&&this.ptAnimRaf){cancelAnimationFrame(this.ptAnimRaf),this.ptAnimRaf=0}this.dirty=!0,this._notifyAuxUI(),this.emit();}stopAllPointAnims(){if(!this.ptAnims.size)return;this.ptAnims.clear();if(this.ptAnimRaf){cancelAnimationFrame(this.ptAnimRaf),this.ptAnimRaf=0}this.dirty=!0,this._notifyAuxUI(),this.emit();}`,
  `stopPointAnim(id){if(!this.ptAnims.has(id))return;this.ptAnims.delete(id);if(!this.ptAnims.size&&this.ptAnimRaf){cancelAnimationFrame(this.ptAnimRaf),this.ptAnimRaf=0}this._liveStaticPageCache=null,this._updateAnimPerfClass(),this.dirty=!0,this.redraw(),this._notifyAuxUI(),this.emit();}stopAllPointAnims(){if(!this.ptAnims.size)return;this.ptAnims.clear();if(this.ptAnimRaf){cancelAnimationFrame(this.ptAnimRaf),this.ptAnimRaf=0}this._liveStaticPageCache=null,this._updateAnimPerfClass(),this.dirty=!0,this.redraw(),this._notifyAuxUI(),this.emit();}`,
  'stopPointAnim/stopAllPointAnims cache reset & redraw'
);

src = replaceOnce(
  src,
  `togglePointAnimPause(id){if(id){const a=this.ptAnims.get(id);if(a)a.paused=!a.paused}else{const anyRun=[...this.ptAnims.values()].some(a=>!a.paused);for(const a of this.ptAnims.values())a.paused=anyRun}this._ensurePtAnimLoop(),this._notifyAuxUI(),this.emit();}`,
  `togglePointAnimPause(id){if(id){const a=this.ptAnims.get(id);if(a)a.paused=!a.paused}else{const anyRun=[...this.ptAnims.values()].some(a=>!a.paused);for(const a of this.ptAnims.values())a.paused=anyRun}this._liveStaticPageCache=null,this._updateAnimPerfClass(),this._ensurePtAnimLoop(),this.redraw(),this._notifyAuxUI(),this.emit();}`,
  'togglePointAnimPause cache reset & redraw'
);

fs.writeFileSync(targetPath, src, 'utf8');
console.log('[v86-perf] Successfully patched index-CTbULhps.js!');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
