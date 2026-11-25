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
/* Feature visibility only; server/Electron independently enforce resource access. */
(()=>{'use strict';
let value={allowed:false,package:'basic',modules:[],moduleUntil:{}},timer;
const listeners=new Set(),web=!!document.querySelector('meta[name="noteboard-account"]'),desktop=!!window.nbEntitlements||location.protocol==='app:'||!!window.nbUpdater;
const localDev=!web&&!desktop&&(['localhost','127.0.0.1','[::1]'].includes(location.hostname)||location.protocol==='file:');
function has(id){if(!value.allowed||!value.modules.includes(id))return false;const until=value.moduleUntil[id];return until===null||Number.isSafeInteger(until)&&until>Date.now();}
function update(data){
 clearTimeout(timer);const allowed=data?.allowed===true,modules=data?.rightsVersion===1&&Array.isArray(data.modules)?data.modules.filter(m=>m==='physics'):[],ends={};
 for(const m of modules){const n=data.moduleUntil?.[m];if(n===null||Number.isSafeInteger(n)&&n>Date.now())ends[m]=n;}
 value={allowed,rightsVersion:1,package:allowed&&Object.keys(ends).length?'physics':'basic',modules:allowed?Object.keys(ends):[],moduleUntil:ends};
 for(const fn of listeners)try{fn();}catch{}
 const times=Object.values(ends).filter(Number.isSafeInteger);if(times.length)timer=setTimeout(()=>update(value),Math.max(1,Math.min(2147483000,Math.min(...times)-Date.now()+5)));
}
addEventListener('noteboard-access',e=>{if(web){const account=document.querySelector('meta[name="noteboard-account"]').content;update(e.detail?.account===account?e.detail:null);}});
let ready=Promise.resolve();
if(localDev)update({allowed:true,rightsVersion:1,modules:['physics'],moduleUntil:{physics:null}});
else if(window.nbEntitlements){ready=nbEntitlements.get().then(update).catch(()=>update(null));nbEntitlements.onChange(update);}
window.NBModules=Object.freeze({has,ready,onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},get state(){return {...value,modules:[...value.modules],moduleUntil:{...value.moduleUntil}};}});
})();
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
