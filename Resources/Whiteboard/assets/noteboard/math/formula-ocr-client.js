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
/* Handwriting leaves the device only for the NoteBoard account service.
   Local recognition templates and third-party OCR are never used implicitly. */
(()=>{
'use strict';
let cachedSession=null,sessionTime=0;
async function getSession(signal){
 const now=Date.now();
 if(cachedSession&&now-sessionTime<180000)return cachedSession;
 const sessionResponse=await fetch('/api/session',{credentials:'same-origin',cache:'no-store',signal});
 if(!sessionResponse.ok)throw Error('Địa chỉ này chưa có máy chủ nhận diện NoteBoard.');
 cachedSession=await sessionResponse.json();
 sessionTime=now;
 return cachedSession;
}
async function recognize(image,signal){
 if(signal?.aborted)throw new DOMException('Canceled','AbortError');
 if(window.nbFormulaOCR?.recognize){const d=await window.nbFormulaOCR.recognize(image);if(d.error)throw Error(d.error);return d;}
 if(!['http:','https:'].includes(location.protocol))throw Error('Hãy mở bản Web hoặc bản cài mới có kết nối nhận diện NoteBoard.');
 const session=await getSession(signal);
 if(!session.signedIn)throw Error('Hãy đăng nhập Google trên NoteBoard trước khi nhận diện.');
 if(!session.allowed)throw Error('Tài khoản cần còn thời hạn dùng thử hoặc bản quyền.');
 const response=await fetch('/api/ocr/formula',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-NB-CSRF':session.csrf},body:JSON.stringify({image}),signal});
 const d=await response.json();if(!response.ok)throw Error(d.error||'Máy chủ nhận diện chưa sẵn sàng.');
 return d;
}
window.NBFormulaOCR={recognize};
})();
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
