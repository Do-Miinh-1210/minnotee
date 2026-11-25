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

const filePath = path.resolve(__dirname, '../Resources/Whiteboard/assets/index-CTbULhps.js');
let code = fs.readFileSync(filePath, 'utf8');

const MARKER = '__MINNOTE_V67_MULTI_REPLAY_PATCH__';
if (code.includes(MARKER)) {
  console.log('Patch v0.0.6.7 Multi-Replay + Per-Figure Persistence already applied.');
  process.exit(0);
}

// 1. Add this.replays = [] and this.activeReplayId = null in board constructor
const ctorTarget = 'We(this,"replay",null);We(this,"replayRaf",0);';
if (!code.includes(ctorTarget)) {
  throw new Error('Could not find replay constructor fields target!');
}
code = code.replace(
  ctorTarget,
  'We(this,"replay",null);We(this,"replays",[]);We(this,"activeReplayId",null);We(this,"replayRaf",0);'
);

// 2. Replace saveBuildScript..paintReplay block with full multi-script concurrent engine + per-figure script map
const startNeedle = 'saveBuildScript(pageIdx,script){';
const endNeedle = 'ctx.fillText(pt.label,lp.x,lp.y));ctx.restore();}ctx.restore();}setPageBreaks(t)';
const startIdx = code.indexOf(startNeedle);
const endIdx = code.indexOf(endNeedle, startIdx);
if (startIdx < 0 || endIdx < 0) {
  throw new Error(`Could not locate replay methods block! start=${startIdx}, end=${endIdx}`);
}

const newMethods = [
  'saveBuildScript(pageIdx,script,meta){',
  'var _n;const pg=this.doc.pages[pageIdx];if(!pg)return!1;',
  'const clean=JSON.parse(JSON.stringify(script));',
  'const key=(meta&&meta.key)?String(meta.key):"all";',
  'const prevMap=(pg.geo&&pg.geo.scripts&&typeof pg.geo.scripts==="object")?pg.geo.scripts:{};',
  'const nextMap={...prevMap,[key]:{',
  'key,title:(meta&&meta.title)||"",',
  'shapeIds:Array.isArray(meta&&meta.shapeIds)?[...meta.shapeIds]:null,',
  'pointIds:Array.isArray(meta&&meta.pointIds)?[...meta.pointIds]:null,',
  'solidGroups:Array.isArray(meta&&meta.solidGroups)?[...meta.solidGroups]:[],',
  'speed:(meta&&typeof meta.speed==="number")?meta.speed:1,',
  'pauseBetween:!!(meta&&meta.pauseBetween),',
  'steps:clean,updatedAt:Date.now()}};',
  'this.doc=this.updatePage(pageIdx,s=>({...s,geo:{...s.geo,scripts:nextMap,...(key==="all"?{script:clean}:{})}}));',
  'this.dirty=!0;this.emit();(_n=this.cb.changed)==null||_n.call(this.cb);',
  'try{localStorage.setItem("mn_geo_scripts_"+pg.id,JSON.stringify(nextMap));if(key==="all")localStorage.setItem("mn_geo_script_"+pg.id,JSON.stringify(clean));}catch{}',
  'return!0;}',

  'deleteBuildScript(pageIdx,key){',
  'var _n;const pg=this.doc.pages[pageIdx];if(!pg||!key)return!1;',
  'const prevMap=(pg.geo&&pg.geo.scripts&&typeof pg.geo.scripts==="object")?{...pg.geo.scripts}:{};',
  'delete prevMap[key];',
  'this.doc=this.updatePage(pageIdx,s=>({...s,geo:{...s.geo,scripts:prevMap}}));',
  'this.dirty=!0;this.emit();(_n=this.cb.changed)==null||_n.call(this.cb);',
  'try{localStorage.setItem("mn_geo_scripts_"+pg.id,JSON.stringify(prevMap));}catch{}',
  'return!0;}',

  '_getActiveReplays(pageIdx){',
  'const list=Array.isArray(this.replays)&&this.replays.length?this.replays:(this.replay?[this.replay]:[]);',
  'return list.filter(r=>r&&r.active&&(pageIdx===void 0||r.page===pageIdx));}',

  '_syncPrimaryReplay(){',
  'const list=Array.isArray(this.replays)?this.replays.filter(r=>r&&r.active):[];',
  'this.replays=list;',
  'if(!list.length){this.replay=null;this.activeReplayId=null;return;}',
  'const found=list.find(r=>r.id===this.activeReplayId)||list[0];',
  'this.activeReplayId=found.id;this.replay=found;}',

  'replayHiddenPage(t,pageIdx){',
  'const actives=this._getActiveReplays(pageIdx);',
  'if(!actives.length)return t;',
  'const cacheKey=actives.map(r=>r.scopeKey||"all").join("||");',
  'const c=this._replayHiddenCache;',
  'if(c&&c.page===t&&c.key===cacheKey)return c.shown;',
  'const hideAll=actives.some(r=>!r.scopeShapes);',
  'let shown;',
  'if(hideAll){shown={...t,geo:{...t.geo,shapes:[],points:{}}};}',
  'else{',
  'const shSet=new Set,ptSet=new Set;',
  'for(const r of actives){',
  'if(r.scopeShapes)for(const id of r.scopeShapes)shSet.add(id);',
  'if(r.scopePoints)for(const id of r.scopePoints)ptSet.add(id);}',
  'shown={...t,geo:{...t.geo,shapes:t.geo.shapes.filter(s=>!shSet.has(s.id)),points:Object.fromEntries(Object.entries(t.geo.points).filter(([id])=>!ptSet.has(id)))}};}',
  'this._replayHiddenCache={page:t,key:cacheKey,shown};return shown;}',

  'setReplays(list,activeId){',
  'this.replays=Array.isArray(list)?list.filter(r=>r&&r.active):[];',
  'if(activeId!==void 0)this.activeReplayId=activeId;',
  'this._syncPrimaryReplay();',
  'this._replayHiddenCache=null;',
  'if(this.replays.some(r=>r.active&&r.playing))this._ensureReplayLoop();',
  'else if(this.replayRaf){cancelAnimationFrame(this.replayRaf);this.replayRaf=0;}',
  'this.redraw();this._notifyAuxUI();}',

  'addOrUpdateReplay(r,focus=!0){',
  'if(!r)return;',
  'if(!r.id)r.id="rp_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,6);',
  'const list=Array.isArray(this.replays)?[...this.replays]:[];',
  'const idx=list.findIndex(x=>x.id===r.id);',
  'if(idx>=0)list[idx]=r;else list.push(r);',
  'this.setReplays(list,focus?r.id:this.activeReplayId);}',

  'setReplay(r){',
  'if(!r){this.stopReplay();return;}',
  'if(!r.id)r.id=(this.replay&&this.replay.id)||("rp_"+Date.now().toString(36));',
  'this.addOrUpdateReplay(r,!0);}',

  'stopReplay(id){',
  'if(id){',
  'const next=(Array.isArray(this.replays)?this.replays:[]).filter(r=>r&&r.id!==id);',
  'this.setReplays(next,this.activeReplayId===id?(next[0]?next[0].id:null):this.activeReplayId);',
  'return;}',
  'if(this.replayRaf){cancelAnimationFrame(this.replayRaf);this.replayRaf=0;}',
  'this.replays=[];this.activeReplayId=null;this.replay=null;this._replayHiddenCache=null;',
  'this.redraw();this._notifyAuxUI();}',

  '_ensureReplayLoop(){',
  'if(this.replayRaf)return;',
  'const hasPlaying=()=>this._getActiveReplays().some(r=>r.playing);',
  'if(!hasPlaying())return;',
  'this.replayLast=performance.now();',
  'const tick=now=>{',
  'this.replayRaf=0;',
  'const playingList=this._getActiveReplays().filter(r=>r.playing);',
  'if(!playingList.length)return;',
  'const dt=Math.min(.06,Math.max(.001,(now-this.replayLast)/1000));',
  'this.replayLast=now;',
  'let uiDirty=!1;',
  'for(const r of playingList){',
  'const activeSteps=r.steps.filter(s=>s.enabled!==!1);',
  'if(!activeSteps.length){r.playing=!1;uiDirty=!0;continue;}',
  'if(r.stepIdx>=activeSteps.length){r.playing=!1;r.stepProgress=1;uiDirty=!0;continue;}',
  'const cur=activeSteps[r.stepIdx];',
  'const pg0=this.doc.pages[r.page];',
  'const isInterGuide=cur.kind==="point"&&cur.showGuides!==!1&&pg0&&pg0.geo.points[cur.refId]&&pg0.geo.points[cur.refId].def.t==="inter";',
  'const dur=(isInterGuide?1.65:cur.tempHide?1.25:cur.kind==="point"?.48:.95)/Math.max(.15,r.speed||1);',
  'r.stepProgress=Math.min(1,r.stepProgress+dt/dur);',
  'if(r.stepProgress>=1){',
  'if(r.stepIdx>=activeSteps.length-1){r.stepProgress=1;r.playing=!1;uiDirty=!0;continue;}',
  'if(r.pauseBetween||r.stopAfterStep){r.stopAfterStep=!1;r.stepProgress=1;r.playing=!1;uiDirty=!0;continue;}',
  'r.stepIdx++;r.stepProgress=0;uiDirty=!0;}',
  '}',
  'if(uiDirty)this._notifyAuxUI();',
  'this.redraw();',
  'if(hasPlaying())this.replayRaf=requestAnimationFrame(tick);};',
  'this.replayRaf=requestAnimationFrame(tick);}',

  'paintReplay(ctx,pageIdx){',
  'const actives=this._getActiveReplays(pageIdx);',
  'if(!actives.length)return;',
  'const pg=this.view.pages[pageIdx];if(!pg)return;',
  'const geo=pg.geo,coords=Tt(geo);',
  'const shMap=new Map(geo.shapes.map(s=>[s.id,s]));',
  'const opts={names:this.doc.names!==!1,labelSize:this.doc.labelSize,dots:this.doc.dots,labelColor:this.doc.labelColor,dotColor:this.doc.dotColor,dotSize:this.doc.dotSize};',
  'const lblPos=xk(geo,coords,opts);',
  'const fsz=opts.labelSize??Ll,dotR=Pm(opts);',
  'const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;',
  'const donePts=new Set,animPts=new Map,scopedPts=new Set;',
  'let anyWholePage=!1;',
  'const markPts=(sh,prog)=>{for(const pid of sh.pts){if(prog>=1)donePts.add(pid);else animPts.set(pid,Math.max(animPts.get(pid)??0,prog));}};',
  'for(const r of actives){',
  'if(!r.scopePoints)anyWholePage=!0;else for(const pid of r.scopePoints)scopedPts.add(pid);',
  'const activeSteps=r.steps.filter(s=>s.enabled!==!1);',
  'for(let i=0;i<activeSteps.length;i++){',
  'if(i>r.stepIdx)break;',
  'const st=activeSteps[i];',
  'const rawP=i<r.stepIdx?1:Math.max(0,Math.min(1,r.stepProgress));',
  'const prog=i<r.stepIdx?1:ease(rawP);',
  'const items=st.items&&st.items.length?st.items:[{kind:st.kind,refId:st.refId,rev:!!st.rev}];',
  'for(const it of items){',
  'if(it.kind==="shape"){',
  'const sh=shMap.get(it.refId);',
  'if(!sh||(sh.hidden&&!st.tempHide&&!st.includeHidden))continue;',
  'if(st.tempHide){if(i<r.stepIdx)continue;const dp=Math.min(1,rawP/.72),fa=rawP<.72?1:Math.max(0,1-(rawP-.72)/.28);if(dp>0&&fa>0){ctx.save(),ctx.globalAlpha*=fa,_teePartial(ctx,sh,coords,ease(dp),!!(it.rev??st.rev)),ctx.restore()}}',
  'else if(prog>=1){tee(ctx,sh,coords);markPts(sh,1)}',
  'else if(prog>0){_teePartial(ctx,sh,coords,prog,!!(it.rev??st.rev));markPts(sh,Math.min(1,prog*2.5))}',
  '}else if(it.kind==="point"){',
  'const pt=geo.points[it.refId];',
  'if(i<r.stepIdx){donePts.add(it.refId)}',
  'else if(rawP>0){if(pt&&pt.def&&pt.def.t==="inter"&&st.showGuides!==!1){const tp=_drawInterGuides(ctx,pt,coords,rawP);if(tp>0)animPts.set(it.refId,Math.max(animPts.get(it.refId)??0,tp));}else{animPts.set(it.refId,Math.max(animPts.get(it.refId)??0,prog));}}',
  '}}}}',
  'ctx.save();ctx.font="italic "+fsz+"px \'Times New Roman\', serif",ctx.textAlign="center",ctx.textBaseline="middle";',
  'for(const pt of Object.values(geo.points)){',
  'if(!pt.show||pt.hidden)continue;',
  'if(!anyWholePage&&!scopedPts.has(pt.id))continue;',
  'const isDone=donePts.has(pt.id),ap=isDone?1:(animPts.get(pt.id)??0);',
  'if(ap<=0)continue;',
  'const c=coords.get(pt.id);if(!c)continue;',
  'ctx.save();ctx.globalAlpha=Math.min(1,ap*1.2);',
  'if(opts.dots!==!1&&!pt.noDot){',
  'const d=(pt.size??dotR)*Math.min(1,.35+.65*ap),m=MR(pt,opts.dotColor);ctx.beginPath();',
  'if(pt.dotStyle==="cross"){const g=d*1.1;ctx.moveTo(c.x-g,c.y-g),ctx.lineTo(c.x+g,c.y+g),ctx.moveTo(c.x-g,c.y+g),ctx.lineTo(c.x+g,c.y-g),ctx.strokeStyle=m,ctx.lineWidth=Math.max(1.5,d*.45),ctx.stroke()}',
  'else if(pt.dotStyle==="ring"){ctx.arc(c.x,c.y,d,0,Math.PI*2),ctx.strokeStyle=m,ctx.lineWidth=Math.max(1.2,d*.4),ctx.stroke()}',
  'else{ctx.arc(c.x,c.y,d,0,Math.PI*2),ctx.fillStyle=m,ctx.fill()}',
  'if(!isDone&&ap<.95){ctx.beginPath(),ctx.arc(c.x,c.y,d+10*ap,0,Math.PI*2),ctx.strokeStyle=(globalThis.__mnHi?globalThis.__mnHi((1-ap)*.7):"rgba(13,148,136,"+((1-ap)*.7)+")"),ctx.lineWidth=1.8,ctx.stroke()}}',
  'const lp=lblPos.get(pt.id);lp&&(ctx.fillStyle=pt.color??opts.labelColor??kk,ctx.fillText(pt.label,lp.x,lp.y));',
  'ctx.restore();}ctx.restore();}'
].join('');

const endOfPaintReplay = endIdx + endNeedle.length - 'setPageBreaks(t)'.length;
code = code.slice(0, startIdx) + newMethods + code.slice(endOfPaintReplay);

// 3. Update shownPage(t, n) to check multi-replay list on page n
const shownTarget = 'shownPage(t,n){if(this.replay&&this.replay.active&&this.replay.page===n)return this.replayHiddenPage(t);';
if (!code.includes(shownTarget)) {
  throw new Error('Could not find shownPage() replay hook target!');
}
code = code.replace(
  shownTarget,
  'shownPage(t,n){if(this._getActiveReplays(n).length)return this.replayHiddenPage(t,n);'
);

code += `\n/* ${MARKER} */\n`;
fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully applied v0.0.6.7 Multi-Replay & Per-Figure Script Persistence patch!');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
