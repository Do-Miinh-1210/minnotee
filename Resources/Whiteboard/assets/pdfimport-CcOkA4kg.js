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
import{l as f,A as w}from"./index--cPWPmO5.js";const g=1240,r=()=>new Promise(s=>setTimeout(s,0));async function m(s,l){const d=await f();let e;try{e=await d.getDocument({data:s,isEvalSupported:!1}).promise}catch{throw new w("pdfFailed")}const i=[];try{for(let a=1;a<=e.numPages;a++){l(a,e.numPages),await r();const o=await e.getPage(a),c=o.getViewport({scale:1}),h=o.getViewport({scale:g/c.width}),t=document.createElement("canvas");t.width=Math.ceil(h.width),t.height=Math.ceil(h.height);const n=t.getContext("2d");if(!n)throw new w("pdfFailed");n.fillStyle="#ffffff",n.fillRect(0,0,t.width,t.height),await o.render({canvasContext:n,viewport:h}).promise,i.push({src:t.toDataURL("image/jpeg",.9),width:c.width,height:c.height,page:a}),o.cleanup(),t.width=t.height=0,await r()}}finally{await e.destroy()}return l(i.length,i.length),await r(),i}export{m as pdfPictures};
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
