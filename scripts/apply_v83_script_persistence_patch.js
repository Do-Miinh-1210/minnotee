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
// Idempotent patch script: v0.0.8.3 Bulletproof Replay Script Persistence Guard
// Fixes EVERY root cause of forgotten / wiped construction replay scripts in index-CTbULhps.js:
//  1. undo() & redo() preserve pg.geo.scripts & _deletedScripts across history jumps (Ctrl+Z/Y can NEVER wipe scripts!)
//  2. Board.load(t) two-way hydrates pg.geo.scripts <-> localStorage (respecting tombstones) and stops stale replays on sheet/tab switch
//  3. saveBuildScript() merges pg.geo.scripts + localStorage (never clobbers sibling scripts), refuses empty overwrites,
//     pushes rolling pre-overwrite backups (mn_geo_scripts_bak_<pg.id>), syncs undo/redo stacks, and triggers session mirror
//  4. deleteBuildScript() merges before deleting only target key, backs up deleted script, and writes deletion tombstone
//  5. crossPage, flowForSpace, splitForSpace, and duplicatePage preserve pg.geo.scripts metadata instead of wiping geo to {points:{},shapes:[]}
const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(targetPath, 'utf8');

const MARKER = '/*__MN_V83_SCRIPT_GUARD__*/';
if (src.includes(MARKER)) {
  console.log('[v83-persist] Script persistence guard already applied — skipping.');
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
  if (idx === -1) throw new Error(`[v83-persist] Anchor not found: ${label}`);
  const second = str.indexOf(target, idx + target.length);
  if (second !== -1) throw new Error(`[v83-persist] Anchor not unique: ${label}`);
  return str.slice(0, idx) + repl + str.slice(idx + target.length);
}

// 1. Protect undo(), redo(), and Board.load(t)
const oldUndoRedoLoad = `undo(){const t=this.undoStack.pop();t&&(this.redoStack.push(this.doc),this.doc=t,this.afterHistory())}redo(){const t=this.redoStack.pop();t&&(this.undoStack.push(this.doc),this.doc=t,this.afterHistory())}afterHistory(){var t,n;(n=(t=this.cb).changed)==null||n.call(t),this.live=null,this.sel=null,this.picks=null,this.dirty=!0,this.layout()}load(t){try{const _pr=JSON.parse(localStorage.getItem("prefs")??"{}"),_pp=_pr&&_pr.paper||{};const _ds=_pr.geoDotSize??_pp.dotSize,_dc=_pr.geoDotColor??_pp.dotColor,_ls=_pr.geoLabelSize??_pp.labelSize,_lc=_pr.geoLabelColor??_pp.labelColor;if(t){const _patch={};if(t.dotSize==null&&typeof _ds=="number")_patch.dotSize=_ds;if(!t.dotColor&&_dc)_patch.dotColor=_dc;if(t.labelSize==null&&typeof _ls=="number")_patch.labelSize=_ls;if(!t.labelColor&&_lc)_patch.labelColor=_lc;if(Object.keys(_patch).length)t={...t,..._patch}}}catch{}this.doc=t,this.live=null,this.undoStack=[],this.redoStack=[],this.sel=null,this.picks=null,this.scratch=[],this.traces.clear(),this.laser=[],this.dirty=!1,this.cache.clear(),this.scroller.scrollTop=0,this.layout()}`;

const newUndoRedoLoad = `${MARKER}undo(){const t=this.undoStack.pop();if(t){const _prev=this.doc;this.redoStack.push(_prev);this.doc=this._preserveScriptsOnDoc(t,_prev);this.afterHistory()}}redo(){const t=this.redoStack.pop();if(t){const _prev=this.doc;this.undoStack.push(_prev);this.doc=this._preserveScriptsOnDoc(t,_prev);this.afterHistory()}}afterHistory(){var t,n;(n=(t=this.cb).changed)==null||n.call(t),this.live=null,this.sel=null,this.picks=null,this.dirty=!0,this.layout()}load(t){try{const _pr=JSON.parse(localStorage.getItem("prefs")??"{}"),_pp=_pr&&_pr.paper||{};const _ds=_pr.geoDotSize??_pp.dotSize,_dc=_pr.geoDotColor??_pp.dotColor,_ls=_pr.geoLabelSize??_pp.labelSize,_lc=_pr.geoLabelColor??_pp.labelColor;if(t){const _patch={};if(t.dotSize==null&&typeof _ds=="number")_patch.dotSize=_ds;if(!t.dotColor&&_dc)_patch.dotColor=_dc;if(t.labelSize==null&&typeof _ls=="number")_patch.labelSize=_ls;if(!t.labelColor&&_lc)_patch.labelColor=_lc;if(Object.keys(_patch).length)t={...t,..._patch}}}catch{}try{if(t&&typeof this._hydrateScriptsOnLoad==="function")t=this._hydrateScriptsOnLoad(t);}catch{}try{if(this.doc!==t&&(this.replay||(Array.isArray(this.replays)&&this.replays.length))&&typeof this.stopReplay==="function")this.stopReplay();}catch{}this.doc=t,this.live=null,this.undoStack=[],this.redoStack=[],this.sel=null,this.picks=null,this.scratch=[],this.traces.clear(),this.laser=[],this.dirty=!1,this.cache.clear(),this.scroller.scrollTop=0,this.layout()}`;

src = replaceOnce(src, oldUndoRedoLoad, newUndoRedoLoad, 'undo/redo/load script preservation');

// 2. Upgrade saveBuildScript & deleteBuildScript + add merge/backup/history-sync helpers
const oldSaveDelete = `saveBuildScript(pageIdx,script,meta){var _n;const pg=this.doc.pages[pageIdx];if(!pg)return!1;const clean=JSON.parse(JSON.stringify(script));const key=(meta&&meta.key)?String(meta.key):"all";const prevMap=(pg.geo&&pg.geo.scripts&&typeof pg.geo.scripts==="object")?pg.geo.scripts:{};const nextMap={...prevMap,[key]:{key,title:(meta&&meta.title)||"",shapeIds:Array.isArray(meta&&meta.shapeIds)?[...meta.shapeIds]:null,pointIds:Array.isArray(meta&&meta.pointIds)?[...meta.pointIds]:null,solidGroups:Array.isArray(meta&&meta.solidGroups)?[...meta.solidGroups]:[],speed:(meta&&typeof meta.speed==="number")?meta.speed:1,pauseBetween:!!(meta&&meta.pauseBetween),followCamera:meta&&typeof meta.followCamera==="boolean"?meta.followCamera:!0,springCamera:meta&&typeof meta.springCamera==="boolean"?meta.springCamera:!0,autoOrbitAfter:!!(meta&&meta.autoOrbitAfter),stylePreset:(meta&&meta.stylePreset)||"",itemIds:Array.isArray(meta&&meta.itemIds)?[...meta.itemIds]:null,strokeIds:Array.isArray(meta&&meta.strokeIds)?[...meta.strokeIds]:null,steps:clean,updatedAt:Date.now()}};this.doc=this.updatePage(pageIdx,s=>({...s,geo:{...s.geo,scripts:nextMap,...(key==="all"?{script:clean}:{})}}));this.dirty=!0;this.emit();(_n=this.cb.changed)==null||_n.call(this.cb);try{localStorage.setItem("mn_geo_scripts_"+pg.id,JSON.stringify(nextMap));if(key==="all")localStorage.setItem("mn_geo_script_"+pg.id,JSON.stringify(clean));}catch{}return!0;}deleteBuildScript(pageIdx,key){var _n;const pg=this.doc.pages[pageIdx];if(!pg||!key)return!1;const prevMap=(pg.geo&&pg.geo.scripts&&typeof pg.geo.scripts==="object")?{...pg.geo.scripts}:{};delete prevMap[key];this.doc=this.updatePage(pageIdx,s=>({...s,geo:{...s.geo,scripts:prevMap}}));this.dirty=!0;this.emit();(_n=this.cb.changed)==null||_n.call(this.cb);try{localStorage.setItem("mn_geo_scripts_"+pg.id,JSON.stringify(prevMap));}catch{}return!0;}`;

const newSaveDelete = `_readMergedScriptsForPage(pg){
  const merged={},del={};
  const addDel=(obj)=>{
    if(!obj||typeof obj!=="object")return;
    for(const[k,ts]of Object.entries(obj)){
      const n=Number(ts)||0;
      if(n>(del[k]||0))del[k]=n;
    }
  };
  const addMap=(obj)=>{
    if(!obj||typeof obj!=="object")return;
    for(const[k,v]of Object.entries(obj)){
      if(!v||typeof v!=="object"||!Array.isArray(v.steps)||!v.steps.length)continue;
      const cur=merged[k];
      const vTs=Number(v.updatedAt)||0,cTs=cur?(Number(cur.updatedAt)||0):0;
      if(!cur||vTs>cTs||(vTs===cTs&&v.steps.length>cur.steps.length))merged[k]=v;
    }
  };
  if(pg&&pg.id){
    try{const rd=localStorage.getItem("mn_geo_scripts_del_"+pg.id);if(rd)addDel(JSON.parse(rd));}catch{}
    try{const rm=localStorage.getItem("mn_geo_scripts_"+pg.id);if(rm)addMap(JSON.parse(rm));}catch{}
  }
  if(pg&&pg.geo){
    addDel(pg.geo._deletedScripts);
    addMap(pg.geo.scripts);
  }
  if(!merged.all){
    let leg=(pg&&pg.geo&&Array.isArray(pg.geo.script)&&pg.geo.script.length)?pg.geo.script:null;
    if(!leg&&pg&&pg.id){
      try{const r=localStorage.getItem("mn_geo_script_"+pg.id);if(r){const p=JSON.parse(r);if(Array.isArray(p)&&p.length)leg=p;}}catch{}
    }
    if(leg&&!(del.all>0)){
      merged.all={key:"all",title:"Cả trang",shapeIds:null,pointIds:null,solidGroups:[],steps:leg,speed:1,pauseBetween:!1,updatedAt:0};
    }
  }
  for(const[k,dTs]of Object.entries(del)){
    if(merged[k]&&dTs>(Number(merged[k].updatedAt)||0))delete merged[k];
  }
  return{scripts:merged,deleted:del};
}
_pushScriptBackup(pageId,key,entry,reason){
  if(!pageId||!key||!entry||!Array.isArray(entry.steps)||!entry.steps.length)return;
  try{
    const lsKey="mn_geo_scripts_bak_"+pageId;
    let all={};
    try{const raw=localStorage.getItem(lsKey);if(raw){const p=JSON.parse(raw);if(p&&typeof p==="object")all=p;}}catch{}
    const arr=Array.isArray(all[key])?all[key]:[];
    const snapJson=JSON.stringify(entry.steps);
    if(arr.length&&JSON.stringify(arr[0].steps)===snapJson)return;
    const copy=JSON.parse(JSON.stringify(entry));
    copy._backedUpAt=Date.now();
    copy._backupReason=reason||"auto";
    arr.unshift(copy);
    if(arr.length>6)arr.length=6;
    all[key]=arr;
    localStorage.setItem(lsKey,JSON.stringify(all));
  }catch{}
}
getScriptBackups(pageIdx,key){
  const pg=this.doc&&this.doc.pages&&this.doc.pages[pageIdx];
  if(!pg||!pg.id)return[];
  try{
    const raw=localStorage.getItem("mn_geo_scripts_bak_"+pg.id);
    if(!raw)return[];
    const all=JSON.parse(raw);
    if(!all||typeof all!=="object")return[];
    if(key)return Array.isArray(all[key])?all[key]:[];
    const flat=[];
    for(const[k,list]of Object.entries(all)){
      if(Array.isArray(list))for(const item of list)flat.push({...item,key:item.key||k});
    }
    return flat.sort((a,b)=>(b._backedUpAt||0)-(a._backedUpAt||0));
  }catch{return[];}
}
restoreScriptBackup(pageIdx,key,backupIdx=0){
  const list=this.getScriptBackups(pageIdx,key);
  const target=list[backupIdx||0];
  if(!target||!Array.isArray(target.steps)||!target.steps.length)return null;
  const ok=this.saveBuildScript(pageIdx,target.steps,{...target,key:key||target.key||"all",_backupPrev:!0,_backupReason:"pre_restore"});
  return ok?target:null;
}
_syncScriptsToHistory(pageId,nextMap,legacyAll,delMap){
  if(!pageId)return;
  const patchDoc=d=>{
    if(!d||!Array.isArray(d.pages))return d;
    let ch=!1;
    const pages=d.pages.map(p=>{
      if(!p||p.id!==pageId||!p.geo)return p;
      ch=!0;
      const ng={...p.geo,scripts:nextMap,_deletedScripts:delMap};
      if(legacyAll)ng.script=legacyAll;
      else if(delMap&&delMap.all&&!nextMap.all)delete ng.script;
      return{...p,geo:ng};
    });
    return ch?{...d,pages}:d;
  };
  if(Array.isArray(this.undoStack))for(let i=0;i<this.undoStack.length;i++)this.undoStack[i]=patchDoc(this.undoStack[i]);
  if(Array.isArray(this.redoStack))for(let i=0;i<this.redoStack.length;i++)this.redoStack[i]=patchDoc(this.redoStack[i]);
}
_preserveScriptsOnDoc(targetDoc,prevDoc){
  if(!targetDoc||!Array.isArray(targetDoc.pages))return targetDoc;
  const prevById=new Map();
  if(prevDoc&&Array.isArray(prevDoc.pages)){
    for(const p of prevDoc.pages)if(p&&p.id)prevById.set(p.id,p);
  }
  let ch=!1;
  const pages=targetDoc.pages.map(p=>{
    if(!p||!p.id||!p.geo)return p;
    const prevP=prevById.get(p.id);
    const curM=this._readMergedScriptsForPage(p);
    const prevM=prevP?this._readMergedScriptsForPage(prevP):{scripts:{},deleted:{}};
    const del={...curM.deleted};
    for(const[k,ts]of Object.entries(prevM.deleted))if(ts>(del[k]||0))del[k]=ts;
    const merged={...curM.scripts};
    for(const[k,v]of Object.entries(prevM.scripts)){
      if(!v||!Array.isArray(v.steps)||!v.steps.length)continue;
      const e=merged[k];
      const vTs=Number(v.updatedAt)||0,eTs=e?(Number(e.updatedAt)||0):0;
      if(!e||vTs>eTs||(vTs===eTs&&v.steps.length>e.steps.length))merged[k]=v;
    }
    for(const[k,dTs]of Object.entries(del)){
      if(merged[k]&&dTs>(Number(merged[k].updatedAt)||0))delete merged[k];
    }
    const hasScripts=Object.keys(merged).length>0,hasDel=Object.keys(del).length>0;
    if(!hasScripts&&!hasDel)return p;
    ch=!0;
    const ng={...p.geo,scripts:merged};
    if(hasDel)ng._deletedScripts=del;
    if(merged.all&&Array.isArray(merged.all.steps))ng.script=merged.all.steps;
    else if(del.all&&!merged.all)delete ng.script;
    return{...p,geo:ng};
  });
  return ch?{...targetDoc,pages}:targetDoc;
}
_hydrateScriptsOnLoad(doc){
  if(!doc||!Array.isArray(doc.pages))return doc;
  let ch=!1;
  const pages=doc.pages.map(p=>{
    if(!p||!p.id||!p.geo)return p;
    const{scripts:merged,deleted:del}=this._readMergedScriptsForPage(p);
    const hasScripts=Object.keys(merged).length>0,hasDel=Object.keys(del).length>0;
    if(!hasScripts&&!hasDel)return p;
    try{
      if(hasScripts)localStorage.setItem("mn_geo_scripts_"+p.id,JSON.stringify(merged));
      if(hasDel)localStorage.setItem("mn_geo_scripts_del_"+p.id,JSON.stringify(del));
      if(merged.all&&Array.isArray(merged.all.steps))localStorage.setItem("mn_geo_script_"+p.id,JSON.stringify(merged.all.steps));
    }catch{}
    const docScripts=p.geo.scripts&&typeof p.geo.scripts==="object"?p.geo.scripts:{};
    const needUpdate=Object.keys(merged).length!==Object.keys(docScripts).length||Object.keys(merged).some(k=>!docScripts[k]||((merged[k].updatedAt||0)>(docScripts[k].updatedAt||0)));
    if(!needUpdate&&!hasDel)return p;
    ch=!0;
    const ng={...p.geo,scripts:merged};
    if(hasDel)ng._deletedScripts=del;
    if(merged.all&&Array.isArray(merged.all.steps))ng.script=merged.all.steps;
    return{...p,geo:ng};
  });
  return ch?{...doc,pages}:doc;
}
saveBuildScript(pageIdx,script,meta){
  var _n;
  const pg=this.doc.pages[pageIdx];
  if(!pg)return!1;
  const clean=Array.isArray(script)?JSON.parse(JSON.stringify(script)):[];
  const key=(meta&&meta.key)?String(meta.key):"all";
  const{scripts:prevMap,deleted:delMap}=this._readMergedScriptsForPage(pg);
  const prevEntry=prevMap[key]||null;
  if(!clean.length&&prevEntry&&Array.isArray(prevEntry.steps)&&prevEntry.steps.length){
    return!1;
  }
  if(prevEntry&&Array.isArray(prevEntry.steps)&&prevEntry.steps.length){
    const shrunk=clean.length<prevEntry.steps.length;
    const oldEnough=(Date.now()-(Number(prevEntry.updatedAt)||0))>15000;
    if((meta&&meta._backupPrev)||shrunk||oldEnough){
      this._pushScriptBackup(pg.id,key,prevEntry,(meta&&meta._backupReason)||(shrunk?"shrink":"edit"));
    }
  }
  const now=Date.now();
  const nextDel={...delMap};
  if(nextDel[key])delete nextDel[key];
  const nextEntry={
    key,
    title:(meta&&meta.title)||(prevEntry&&prevEntry.title)||"",
    shapeIds:Array.isArray(meta&&meta.shapeIds)?[...meta.shapeIds]:null,
    pointIds:Array.isArray(meta&&meta.pointIds)?[...meta.pointIds]:null,
    solidGroups:Array.isArray(meta&&meta.solidGroups)?[...meta.solidGroups]:[],
    speed:(meta&&typeof meta.speed==="number")?meta.speed:1,
    pauseBetween:!!(meta&&meta.pauseBetween),
    followCamera:meta&&typeof meta.followCamera==="boolean"?meta.followCamera:!0,
    springCamera:meta&&typeof meta.springCamera==="boolean"?meta.springCamera:!0,
    autoOrbitAfter:!!(meta&&meta.autoOrbitAfter),
    stylePreset:(meta&&meta.stylePreset)||"",
    itemIds:Array.isArray(meta&&meta.itemIds)?[...meta.itemIds]:null,
    strokeIds:Array.isArray(meta&&meta.strokeIds)?[...meta.strokeIds]:null,
    steps:clean,
    updatedAt:now
  };
  const nextMap={...prevMap,[key]:nextEntry};
  this.doc=this.updatePage(pageIdx,s=>({...s,geo:{...s.geo,scripts:nextMap,_deletedScripts:nextDel,...(key==="all"?{script:clean}:{})}}));
  this._syncScriptsToHistory(pg.id,nextMap,key==="all"?clean:null,nextDel);
  this.dirty=!0;
  this.emit();
  (_n=this.cb.changed)==null||_n.call(this.cb);
  try{
    localStorage.setItem("mn_geo_scripts_"+pg.id,JSON.stringify(nextMap));
    if(Object.keys(nextDel).length)localStorage.setItem("mn_geo_scripts_del_"+pg.id,JSON.stringify(nextDel));
    else localStorage.removeItem("mn_geo_scripts_del_"+pg.id);
    if(key==="all")localStorage.setItem("mn_geo_script_"+pg.id,JSON.stringify(clean));
  }catch{}
  try{globalThis.__minnotePersistence&&globalThis.__minnotePersistence.scheduleSessionSave&&globalThis.__minnotePersistence.scheduleSessionSave("replay_script");}catch{}
  return!0;
}
deleteBuildScript(pageIdx,key){
  var _n;
  const pg=this.doc.pages[pageIdx];
  if(!pg||!key)return!1;
  const{scripts:prevMap,deleted:delMap}=this._readMergedScriptsForPage(pg);
  if(prevMap[key])this._pushScriptBackup(pg.id,key,prevMap[key],"delete");
  const nextMap={...prevMap};
  delete nextMap[key];
  const nextDel={...delMap,[key]:Date.now()};
  this.doc=this.updatePage(pageIdx,s=>{
    const ng={...s.geo,scripts:nextMap,_deletedScripts:nextDel};
    if(key==="all")delete ng.script;
    return{...s,geo:ng};
  });
  this._syncScriptsToHistory(pg.id,nextMap,null,nextDel);
  this.dirty=!0;
  this.emit();
  (_n=this.cb.changed)==null||_n.call(this.cb);
  try{
    localStorage.setItem("mn_geo_scripts_"+pg.id,JSON.stringify(nextMap));
    localStorage.setItem("mn_geo_scripts_del_"+pg.id,JSON.stringify(nextDel));
    if(key==="all")localStorage.removeItem("mn_geo_script_"+pg.id);
  }catch{}
  try{globalThis.__minnotePersistence&&globalThis.__minnotePersistence.scheduleSessionSave&&globalThis.__minnotePersistence.scheduleSessionSave("replay_delete");}catch{}
  return!0;
}`;

src = replaceOnce(src, oldSaveDelete, newSaveDelete, 'saveBuildScript & deleteBuildScript upgrade');

// 3. Preserve geo metadata on crossPage drag
src = replaceOnce(
  src,
  `const k={points:{},shapes:[]};for(const C of Object.values(o.geo.points)){`,
  `const k={...o.geo,points:{},shapes:[]};for(const C of Object.values(o.geo.points)){`,
  'crossPage preserve geo metadata'
);

// 4. Preserve geo metadata on flowForSpace
src = replaceOnce(
  src,
  `O={points:{},shapes:[]},G={points:{},shapes:[]};`,
  `O={...i.geo,points:{},shapes:[]},G={...(i.geo&&i.geo.scripts?{scripts:JSON.parse(JSON.stringify(i.geo.scripts))}:{}),points:{},shapes:[]};`,
  'flowForSpace preserve geo metadata'
);

// 5. Preserve geo metadata on splitForSpace
src = replaceOnce(
  src,
  `E={points:{},shapes:[]},P={points:{},shapes:[]};`,
  `E={...i.geo,points:{},shapes:[]},P={...(i.geo&&i.geo.scripts?{scripts:JSON.parse(JSON.stringify(i.geo.scripts))}:{}),points:{},shapes:[]};`,
  'splitForSpace preserve geo metadata'
);

// 6. Preserve & mirror geo.scripts on duplicatePage
src = replaceOnce(
  src,
  `duplicatePage(t){const n=this.doc.pages[t];if(!n)return;const o={...n,id:ji().id,strokes:n.strokes.map(i=>({...i,id:nt()})),items:n.items.map(i=>({...i,id:nt()}))},s=this.doc.pages.slice();`,
  `duplicatePage(t){const n=this.doc.pages[t];if(!n)return;const _dupId=ji().id,_mergedM=typeof this._readMergedScriptsForPage==="function"?this._readMergedScriptsForPage(n):null,_dupGeo=_mergedM&&Object.keys(_mergedM.scripts).length?{...n.geo,scripts:JSON.parse(JSON.stringify(_mergedM.scripts))}:n.geo;if(_dupGeo&&_dupGeo.scripts){try{localStorage.setItem("mn_geo_scripts_"+_dupId,JSON.stringify(_dupGeo.scripts));}catch{}}const o={...n,id:_dupId,geo:_dupGeo,strokes:n.strokes.map(i=>({...i,id:nt()})),items:n.items.map(i=>({...i,id:nt()}))},s=this.doc.pages.slice();`,
  'duplicatePage clone geo.scripts'
);

fs.writeFileSync(targetPath, src, 'utf8');
console.log('[v83-persist] Successfully patched Resources/Whiteboard/assets/index-CTbULhps.js!');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
