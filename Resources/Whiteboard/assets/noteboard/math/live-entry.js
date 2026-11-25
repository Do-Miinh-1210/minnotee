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
/* Opens the independently authenticated Live console; never sends a Windows key. */
(()=>{'use strict';
 const menu=document.querySelector('#insertMenu');if(!menu)return;
 const button=document.createElement('button');button.type='button';button.role='menuitem';button.id='openLiveSession';
 button.innerHTML='<b>Phiên trực tiếp · cả lớp</b><small>Nhập đề Word, phát câu hỏi và nhận trả lời</small>';
 const open=()=>{
  menu.hidden=true;document.querySelector('#insertBtn')?.setAttribute('aria-expanded','false');
  const origin=document.querySelector('meta[name="noteboard-account"]')?location.origin:'https://app.noteboardink.com';
  window.open(origin+'/teacher/live','_blank','noopener,noreferrer');
 };
 button.onclick=open;
 menu.append(button);
 const lesson=document.querySelector('[data-section="lesson"]');if(lesson){const quick=document.createElement('button');quick.type='button';quick.className='setting-btn';quick.id='lessonLiveSession';quick.textContent='Phiên trực tiếp · câu hỏi cả lớp';quick.onclick=open;lesson.append(quick);}
})();
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
