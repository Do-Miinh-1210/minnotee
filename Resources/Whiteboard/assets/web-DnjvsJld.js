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
import{W as w}from"./index-CTbULhps.js";class y extends w{async getId(){return{identifier:this.getUid()}}async getInfo(){if(typeof navigator>"u"||!navigator.userAgent)throw this.unavailable("Device API not available in this browser");const e=navigator.userAgent,i=this.parseUa(e);return{model:i.model,platform:"web",operatingSystem:i.operatingSystem,osVersion:i.osVersion,manufacturer:navigator.vendor,isVirtual:!1,webViewVersion:i.browserVersion}}async getBatteryInfo(){if(typeof navigator>"u"||!navigator.getBattery)throw this.unavailable("Device API not available in this browser");let e={};try{e=await navigator.getBattery()}catch{}return{batteryLevel:e.level,isCharging:e.charging}}async getLanguageCode(){return{value:navigator.language.split("-")[0].toLowerCase()}}async getLanguageTag(){return{value:navigator.language}}parseUa(e){const i={},r=e.indexOf("(")+1;let a=e.indexOf(") AppleWebKit");e.indexOf(") Gecko")!==-1&&(a=e.indexOf(") Gecko"));const s=e.substring(r,a);if(e.indexOf("Android")!==-1){const t=s.replace("; wv","").split("; ").pop();t&&(i.model=t.split(" Build")[0]),i.osVersion=s.split("; ")[1]}else if(i.model=s.split("; ")[0],typeof navigator<"u"&&navigator.oscpu)i.osVersion=navigator.oscpu;else if(e.indexOf("Windows")!==-1)i.osVersion=s;else{const t=s.split("; ").pop();if(t){const n=t.replace(" like Mac OS X","").split(" ");i.osVersion=n[n.length-1].replace(/_/g,".")}}/android/i.test(e)?i.operatingSystem="android":/iPad|iPhone|iPod/.test(e)&&!window.MSStream?i.operatingSystem="ios":/Win/.test(e)?i.operatingSystem="windows":/Mac/i.test(e)?i.operatingSystem="mac":i.operatingSystem="unknown";const l=!!window.ApplePaySession,x=!!window.chrome,p=/Firefox/.test(e),d=/Edg/.test(e),g=/FxiOS/.test(e),c=/CriOS/.test(e),f=/EdgiOS/.test(e);if(l||x&&!d||g||c||f){let t;g?t="FxiOS":c?t="CriOS":f?t="EdgiOS":l?t="Version":t="Chrome";const n=e.split(" ");for(const o of n)if(o.includes(t)){const v=o.split("/")[1];i.browserVersion=v}}else if(p||d){const o=e.split("").reverse().join("").split("/")[0].split("").reverse().join("");i.browserVersion=o}return i}getUid(){if(typeof window<"u"&&window.localStorage){let e=window.localStorage.getItem("_capuid");return e||(e=this.uuid4(),window.localStorage.setItem("_capuid",e),e)}return this.uuid4()}uuid4(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){const i=Math.random()*16|0;return(e==="x"?i:i&3|8).toString(16)})}}export{y as DeviceWeb};
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
