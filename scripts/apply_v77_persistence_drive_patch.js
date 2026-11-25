#!/usr/bin/env node
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
 * Apply v0.0.7.7 Crash-Safe Persistence, Multi-Sheet Update Preservation,
 * & Real Google Drive Bridge Patch to Resources/Whiteboard/assets/index-CTbULhps.js
 */
const fs = require('fs');
const path = require('path');

const TARGET = path.resolve(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(TARGET, 'utf8');

if (src.includes('__MINNOTE_V77_PERSISTENCE_PATCH__')) {
  console.log('[v77 patch] Already applied to index-CTbULhps.js; skipping.');
  process.exit(0);
}

function replaceUnique(label, target, replacement) {
  const first = src.indexOf(target);
  if (first < 0) {
    throw new Error(`[v77 patch] Anchor NOT FOUND for "${label}":\n${target}`);
  }
  const second = src.indexOf(target, first + 1);
  if (second >= 0) {
    throw new Error(`[v77 patch] Anchor NOT UNIQUE for "${label}" (found at ${first} and ${second})`);
  }
  src = src.slice(0, first) + replacement + src.slice(first + target.length);
  console.log(`[v77 patch] Applied: ${label} (@ ${first})`);
}

// 1. Hook IndexedDB store `mc` to mirror every write/mkdir/delete to NTFS via __minnotePersistence
replaceUnique(
  'mc IndexedDB mirror hooks',
  'mc={list:async()=>({dirs:(await Ch("dirs","readonly",e=>e.getAllKeys())).map(String),files:(await X8()).map(({dir:e,name:t,modified:n})=>({dir:e,name:t,modified:n}))}),read:async(e,t)=>{const n=await Ch("files","readonly",o=>o.get(Y4(e,t)));if(!n)throw new Error("Not found.");return n.bytes},write:async(e,t,n)=>{await Ch("files","readwrite",o=>o.put({dir:e,name:t,bytes:n,modified:Date.now()},Y4(e,t)))},exists:async(e,t)=>await Ch("files","readonly",n=>n.count(Y4(e,t)))>0,makeDir:async e=>{const t=e.split("/");for(let n=1;n<=t.length;n++)await Ch("dirs","readwrite",o=>o.put(!0,t.slice(0,n).join("/")))},moveDir:async(e,t)=>{for(const n of await X8())Kh(n.dir,e)&&await mc.moveFile(n.dir,n.name,t+n.dir.slice(e.length),n.name);for(const n of(await mc.list()).dirs.filter(o=>Kh(o,e)))await Ch("dirs","readwrite",o=>o.delete(n)),await mc.makeDir(t+n.slice(e.length));await mc.makeDir(t)},removeDir:async e=>{for(const t of await X8())Kh(t.dir,e)&&await mc.removeFile(t.dir,t.name);for(const t of(await mc.list()).dirs.filter(n=>Kh(n,e)))await Ch("dirs","readwrite",n=>n.delete(t))},moveFile:async(e,t,n,o)=>{const s=await mc.read(e,t);await mc.write(n,o,s),await mc.removeFile(e,t)},removeFile:async(e,t)=>{await Ch("files","readwrite",n=>n.delete(Y4(e,t)))}};',
  'mc={_rawWrite:async(e,t,n,s)=>{await Ch("files","readwrite",o=>o.put({dir:e,name:t,bytes:n,modified:Number(s)||Date.now()},Y4(e,t)))},_rawMakeDir:async e=>{const t=e.split("/");for(let n=1;n<=t.length;n++)await Ch("dirs","readwrite",o=>o.put(!0,t.slice(0,n).join("/")))},list:async()=>({dirs:(await Ch("dirs","readonly",e=>e.getAllKeys())).map(String),files:(await X8()).map(({dir:e,name:t,modified:n})=>({dir:e,name:t,modified:n}))}),read:async(e,t)=>{const n=await Ch("files","readonly",o=>o.get(Y4(e,t)));if(!n)throw new Error("Not found.");return n.bytes},write:async(e,t,n)=>{const s=Date.now();await Ch("files","readwrite",o=>o.put({dir:e,name:t,bytes:n,modified:s},Y4(e,t)));globalThis.__minnotePersistence&&globalThis.__minnotePersistence.onLibraryWrite&&globalThis.__minnotePersistence.onLibraryWrite(e,t,n,s)},exists:async(e,t)=>await Ch("files","readonly",n=>n.count(Y4(e,t)))>0,makeDir:async e=>{const t=e.split("/");for(let n=1;n<=t.length;n++)await Ch("dirs","readwrite",o=>o.put(!0,t.slice(0,n).join("/")));globalThis.__minnotePersistence&&globalThis.__minnotePersistence.onLibraryMakeDir&&globalThis.__minnotePersistence.onLibraryMakeDir(e)},moveDir:async(e,t)=>{for(const n of await X8())Kh(n.dir,e)&&await mc.moveFile(n.dir,n.name,t+n.dir.slice(e.length),n.name);for(const n of(await mc.list()).dirs.filter(o=>Kh(o,e)))await Ch("dirs","readwrite",o=>o.delete(n)),await mc.makeDir(t+n.slice(e.length));await mc.makeDir(t);globalThis.__minnotePersistence&&globalThis.__minnotePersistence.onLibraryRemoveDir&&globalThis.__minnotePersistence.onLibraryRemoveDir(e)},removeDir:async e=>{for(const t of await X8())Kh(t.dir,e)&&await mc.removeFile(t.dir,t.name);for(const t of(await mc.list()).dirs.filter(n=>Kh(n,e)))await Ch("dirs","readwrite",n=>n.delete(t));globalThis.__minnotePersistence&&globalThis.__minnotePersistence.onLibraryRemoveDir&&globalThis.__minnotePersistence.onLibraryRemoveDir(e)},moveFile:async(e,t,n,o)=>{const s=await mc.read(e,t);await mc.write(n,o,s),await mc.removeFile(e,t)},removeFile:async(e,t)=>{await Ch("files","readwrite",n=>n.delete(Y4(e,t)));globalThis.__minnotePersistence&&globalThis.__minnotePersistence.onLibraryRemove&&globalThis.__minnotePersistence.onLibraryRemove(e,t)}};globalThis.__minnoteIdbStore=mc;'
);

// 2. Enhance Hpe() platform adapter with autosaveCapable, dirty reporting, save-on-close, and real Google Drive bridge
replaceUnique(
  'Hpe platform adapter persistence & drive',
  'function Hpe(){const _nr=window.noteRenderer;return{os:"web",webPanel:!0,mobile:matchMedia("(pointer: coarse)").matches,licensing:null,ready:()=>{},renderFormula:pQ,...(_nr&&typeof _nr.renderTikz==="function"?{renderTikz:(a,b)=>_nr.renderTikz(a,b)}:{}),...(_nr&&typeof _nr.traceTikz==="function"?{traceTikz:(a,b)=>_nr.traceTikz(a,b)}:{}),...(_nr&&typeof _nr.renderTypst==="function"?{renderTypst:(a,b,c)=>_nr.renderTypst(a,b,c)}:{}),library:Voe(mc,{autoName:Rpe,encode:c$,decode:h$,error:t=>new Bc(t)}),openFile:async()=>{const t=await f5(".nrn,application/octet-stream,application/gzip,application/json");return t?{doc:await h$(new Uint8Array(await t.arrayBuffer())),name:hQ(t.name),ref:null}:null},saveElsewhere:async(t,n)=>(Z4(new Blob([await c$(t)]),`${n}.nrn`),{ref:null,name:n}),setDirty:()=>{},',
  'function Hpe(){const _nr=window.noteRenderer;return{os:"web",webPanel:!0,autosaveCapable:!0,mobile:matchMedia("(pointer: coarse)").matches,licensing:null,ready:()=>{},renderFormula:pQ,...(_nr&&typeof _nr.renderTikz==="function"?{renderTikz:(a,b)=>_nr.renderTikz(a,b)}:{}),...(_nr&&typeof _nr.traceTikz==="function"?{traceTikz:(a,b)=>_nr.traceTikz(a,b)}:{}),...(_nr&&typeof _nr.renderTypst==="function"?{renderTypst:(a,b,c)=>_nr.renderTypst(a,b,c)}:{}),library:Voe(mc,{autoName:Rpe,encode:c$,decode:h$,error:t=>new Bc(t)}),...(globalThis.__minnoteDriveBridge?{drive:globalThis.__minnoteDriveBridge}:{}),openFile:async()=>{const t=await f5(".nrn,application/octet-stream,application/gzip,application/json");return t?{doc:await h$(new Uint8Array(await t.arrayBuffer())),name:hQ(t.name),ref:null}:null},saveElsewhere:async(t,n)=>(Z4(new Blob([await c$(t)]),`${n}.nrn`),{ref:null,name:n}),setDirty:t=>{globalThis.__minnotePersistence&&globalThis.__minnotePersistence.onDirtyChange&&globalThis.__minnotePersistence.onDirtyChange(!!t)},'
);

replaceUnique(
  'Hpe onSaveAndClose and closeReady',
  'copyText:t=>navigator.clipboard.writeText(t),copyImage:lQ,appVersion:async()=>"web",onOpenDoc:()=>()=>{},onSaveAndClose:()=>()=>{},onUpdateStatus:()=>()=>{}}}',
  'copyText:t=>navigator.clipboard.writeText(t),copyImage:lQ,appVersion:async()=>"web",onOpenDoc:()=>()=>{},onSaveAndClose:t=>globalThis.__minnotePersistence&&globalThis.__minnotePersistence.registerSaveHandler?globalThis.__minnotePersistence.registerSaveHandler(t):()=>{},closeReady:t=>{globalThis.__minnotePersistence&&globalThis.__minnotePersistence.notifyCloseReady&&globalThis.__minnotePersistence.notifyCloseReady(!!t)},onUpdateStatus:()=>()=>{}}}'
);

// 3. Hydrate IndexedDB + localStorage (tabs & places) from NTFS disk mirror BEFORE React mounts
replaceUnique(
  'Promise.all hydrateBeforeMount',
  'Promise.all([qpe(),Kpe]).then(([e])=>{document.documentElement.dataset.os=e.os,',
  'Promise.all([qpe(),Kpe]).then(async([e])=>{if(globalThis.__minnotePersistence&&typeof globalThis.__minnotePersistence.hydrateBeforeMount==="function"){try{await globalThis.__minnotePersistence.hydrateBeforeMount(mc)}catch(_eh){}}document.documentElement.dataset.os=e.os,'
);

// 4. Enable autosave via autosaveCapable, tighten interval to 1.5s-5s, trigger on sheet changes, and expose __minnoteAppBridge
replaceUnique(
  'autosave sl & Fi & throttle',
  'Ri.saved(),!0}catch(de){return Fo(de),!1}},Jo=D.useCallback((A,W=!1)=>Le(()=>Bf(A,W)),[e,Ln,Fo,kn,Jn]),Fi=()=>Le(async()=>{if((s.current.snapshot().dirty||Hs(tl()))&&!await Bf(!1,Fn&&sl))return!1;for(const A of ie.current)if(!(!A.book||!Hs(A.book)))try{const W=await Ef(A);_e(ie.current.map(te=>te.id===A.id?W:te))}catch(W){return Fo(W),!1}return!0}),[Fn,Ir]=D.useState(u.autosave??e.os!=="web"),sl=e.os!=="web",',
  'Ri.saved(),!0}catch(de){return Fo(de),!1}},Jo=D.useCallback((A,W=!1)=>Le(()=>Bf(A,W)),[e,Ln,Fo,kn,Jn]),_mnSyncSess=()=>{try{const A=ie.current.filter(W=>W.ref).map(({ref:W,name:te,project:ne})=>({ref:W,name:te,project:ne})),_cur=ie.current[xe.current],_shown=(_cur&&_cur.ref)||null;localStorage.setItem("tabs",JSON.stringify({tabs:A,shown:_shown}));const _act=Rs.current.active;if(_shown&&s.current&&typeof s.current.place==="function"){mne(_shown,{...s.current.place(),...(_act>0?{sheet:_act}:{})})}globalThis.__minnotePersistence&&globalThis.__minnotePersistence.onSessionSaved&&globalThis.__minnotePersistence.onSessionSaved("sync_now",{tabCount:ie.current.length,sheetCount:Rs.current.sheets.length,activeTabName:(_cur&&_cur.name)||ud})}catch(_e){}},Fi=()=>Le(async()=>{const _cur=$e(),_dirty=!!(s.current&&s.current.snapshot().dirty)||Hs(tl()),_untitle=(!(_cur&&_cur.ref))&&(!yv()||Rs.current.sheets.length>1);if((_dirty||_untitle)&&!await Bf(!1,!0))return!1;for(const A of ie.current){if(!A.book)continue;const _bg=Hs(A.book)||(!A.ref&&A.book.sheets&&A.book.sheets.length>1);if(!_bg)continue;try{const W=await Ef(A);_e(ie.current.map(te=>te.id===A.id?W:te))}catch(W){return Fo(W),!1}}_mnSyncSess();return!0}),[Fn,Ir]=D.useState(u.autosave??(e.os!=="web"||!!e.autosaveCapable)),sl=e.os!=="web"||!!e.autosaveCapable,'
);

replaceUnique(
  'If autosave tighten to 1.5s-5s and re-trigger on sheet changes',
  'const A=Math.max(3e3,zf.current+wpe-Date.now());Df.current=window.setTimeout(function W(){var ne;const te=il.current;!te.on||!te.dirty||((ne=s.current)!=null&&ne.busy()||Js.current?Df.current=window.setTimeout(W,1500):(zf.current=Date.now(),te.save(!1,!0)))},A)};D.useEffect(()=>{Gn&&If()},[Gn]),',
  'const A=Math.max(1500,zf.current+5e3-Date.now());Df.current=window.setTimeout(function W(){var ne;const te=il.current;!te.on||!te.dirty||((ne=s.current)!=null&&ne.busy()||Js.current?Df.current=window.setTimeout(W,1500):(zf.current=Date.now(),te.save(!1,!0)))},A)};D.useEffect(()=>{Gn&&If()},[Gn,i,kn.length,Jn]),D.useEffect(()=>{const _run=async()=>Fi();globalThis.__minnoteAppBridge={getState:()=>{const _cur=$e();return{isDirty:jp,hasContent:!yv()||ie.current.length>1||Rs.current.sheets.length>1,activeTabName:(_cur&&_cur.name)||ud,activeTabRef:(_cur&&_cur.ref)||null,tabCount:ie.current.length,sheetCount:Rs.current.sheets.length,activeSheet:Rs.current.active,sheetNames:Rs.current.sheets.map(x=>x.name),autosaveOn:!!(Fn&&sl)}},saveAllNow:async reason=>{const _ok=await _run(),_after=$e();return{ok:!!_ok,tabCount:ie.current.length,sheetCount:Rs.current.sheets.length,activeSheet:Rs.current.active,activeTabName:(_after&&_after.name)||ud,activeTabRef:(_after&&_after.ref)||null}},syncSessionStorageNow:_mnSyncSess,dismissStartupLibrary:()=>Be(!1),openLibrary:()=>Be(!0),reloadAfterExternalRestore:()=>Le(async()=>{const _cur=$e();if(_cur&&_cur.ref){try{const _d=await e.library.read(_cur.ref);Qo(_d,_cur.ref);return!0}catch(_){}}try{const _z=JSON.parse(localStorage.getItem("tabs")||"null"),_arr=(Array.isArray(_z&&_z.tabs)?_z.tabs:[]).filter(w=>w&&typeof w.ref==="string"&&typeof w.name==="string").map(w=>({id:nt("t"),name:w.name,ref:w.ref,project:typeof w.project==="string"?w.project:"",book:null}));if(_arr.length&&yv()){let _wi=Math.max(0,_arr.findIndex(x=>x.ref===(_z&&_z.shown))),_td=null;for(;_arr.length&&!_td;)try{_td=await e.library.read(_arr[_wi].ref)}catch{_arr.splice(_wi,1);_wi=Math.min(_wi,_arr.length-1)}if(_td){_e(_arr);ve(_wi);Qo(_td,_arr[_wi].ref);Be(!1);return!0}}}catch(_){}Be(!1);setTimeout(()=>Be(!0),60);return!0})}}),'
);

// 5. Sync session metadata on tab switches, sheet switches, and restore notification after startup
replaceUnique(
  'tabs save & restore notice & sheet place sync',
  'D.useEffect(()=>{var A;if(!Rf.current)try{const W=ye.filter(te=>te.ref).map(({ref:te,name:ne,project:de})=>({ref:te,name:ne,project:de}));localStorage.setItem("tabs",JSON.stringify({tabs:W,shown:((A=ye[qe])==null?void 0:A.ref)??null}))}catch{}},[ye,qe]),D.useEffect(()=>{const A=(Array.isArray(Zl==null?void 0:Zl.tabs)?Zl.tabs:[]).filter(W=>typeof(W==null?void 0:W.ref)=="string"&&typeof W.name=="string").map(W=>({id:nt("t"),name:W.name,ref:W.ref,project:typeof W.project=="string"?W.project:"",book:null}));Le(async()=>{let W=Math.max(0,A.findIndex(ne=>ne.ref===(Zl==null?void 0:Zl.shown))),te=null;for(;A.length&&!te;)try{te=await e.library.read(A[W].ref)}catch{A.splice(W,1),W=Math.min(W,A.length-1)}Rf.current=!1,!(!te||!yv())&&(_e(A),ve(W),Qo(te,A[W].ref))})},[e]);const th=D.useRef(0);D.useEffect(()=>{clearTimeout(th.current),th.current=window.setTimeout(()=>{var te;const A=(te=$e())==null?void 0:te.ref,W=Rs.current.active;A&&!Rf.current&&s.current&&mne(A,{...s.current.place(),...W>0?{sheet:W}:{}})},500)},[i]);',
  'D.useEffect(()=>{var A;if(!Rf.current)try{const W=ye.filter(te=>te.ref).map(({ref:te,name:ne,project:de})=>({ref:te,name:ne,project:de}));localStorage.setItem("tabs",JSON.stringify({tabs:W,shown:((A=ye[qe])==null?void 0:A.ref)??null}));globalThis.__minnotePersistence&&globalThis.__minnotePersistence.scheduleSessionSave&&globalThis.__minnotePersistence.scheduleSessionSave("tabs")}catch{}},[ye,qe]),D.useEffect(()=>{const A=(Array.isArray(Zl==null?void 0:Zl.tabs)?Zl.tabs:[]).filter(W=>typeof(W==null?void 0:W.ref)=="string"&&typeof W.name=="string").map(W=>({id:nt("t"),name:W.name,ref:W.ref,project:typeof W.project=="string"?W.project:"",book:null}));Le(async()=>{let W=Math.max(0,A.findIndex(ne=>ne.ref===(Zl==null?void 0:Zl.shown))),te=null;for(;A.length&&!te;)try{te=await e.library.read(A[W].ref)}catch{A.splice(W,1),W=Math.min(W,A.length-1)}Rf.current=!1;if(te&&yv()){_e(A);ve(W);Qo(te,A[W].ref);if(globalThis.__minnoteRestoreNotice){Be(!1);try{Ln(globalThis.__minnoteRestoreNotice)}catch{}delete globalThis.__minnoteRestoreNotice}}else if(globalThis.__minnoteRestoreNotice){delete globalThis.__minnoteRestoreNotice}globalThis.__minnotePersistence&&globalThis.__minnotePersistence.runBackgroundInitialMirror&&globalThis.__minnotePersistence.runBackgroundInitialMirror(globalThis.__minnoteIdbStore)})},[e]);const th=D.useRef(0);D.useEffect(()=>{clearTimeout(th.current),th.current=window.setTimeout(()=>{var te;const A=(te=$e())==null?void 0:te.ref,W=Rs.current.active;A&&!Rf.current&&s.current&&(mne(A,{...s.current.place(),...W>0?{sheet:W}:{}}),globalThis.__minnotePersistence&&globalThis.__minnotePersistence.scheduleSessionSave&&globalThis.__minnotePersistence.scheduleSessionSave("place"))},500)},[i,Jn,kn.length]);'
);

src += '\n/* __MINNOTE_V77_PERSISTENCE_PATCH__ */\n';
fs.writeFileSync(TARGET, src, 'utf8');
console.log('[v77 patch] Successfully patched Resources/Whiteboard/assets/index-CTbULhps.js');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
