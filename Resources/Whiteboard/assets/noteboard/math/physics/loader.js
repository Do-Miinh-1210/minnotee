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
(()=>{'use strict';const q=new URLSearchParams(location.hash.slice(1)),id=q.get('id'),token=q.get('token');if(!/^[a-z0-9-]+$/.test(id||'')||!/^[a-f0-9]{32}$/.test(token||'')){document.getElementById('playerStatus').textContent='Dữ liệu mở mô phỏng không hợp lệ.';return;}const s=document.createElement('script');s.src=["projectile","free-fall","circuit","magnetic-field","magnetic-force","em-induction","ac-generator","nucleus"].includes(id)?'space.js':'flat.js';s.onerror=()=>{document.getElementById('playerStatus').textContent='Chưa có thành phần mô phỏng. Hãy kết nối mạng và thử lại.';parent.postMessage({nbPhysics:1,token,type:'error',message:'Không tải được thành phần mô phỏng.'},'*');};document.body.append(s);})();
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
