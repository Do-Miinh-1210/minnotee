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

const filePath = 'Resources/Whiteboard/assets/index-CTbULhps.js';
let code = fs.readFileSync(filePath, 'utf8');

const t1 = `if(this.gridHoverAt(n,o),this.tool.k==="geo"||this.tool.k==="select"||this.tool.k==="shape"&&Up.includes(this.tool.t)){const a=this.doc.pages[n],l=Tt(a.geo),c=this.tool.k==="geo"&&this.tool.t!=="move",u=this.tool.k==="shape"?this.pointTouched(a,l,o):c?this.pointNear(a,l,o,!0):this.pointNear(a,l,o,this.tool.k==="select"),sh=(!u&&(this.tool.k==="select"||this.tool.k==="geo"||(this.tool.k==="shape"&&Up.includes(this.tool.t))))?$0(a.geo.shapes,l,o,this.tol(),this.revealHidden()):null,shId=sh?sh.id:null;if(this.lineStart&&this.lineStart.page===n&&this.tool.k==="shape"&&(this.lineHover=u&&u!==this.lineStart.id?{at:l.get(u),id:u}:{at:((s=this.gridHover)==null?void 0:s.p)??o},this.redraw()),u!==(((i=this.hover)==null?void 0:i.point)??null)||shId!==(((s=this.hover)==null?void 0:s.shape)??null)||((r=this.hover)==null?void 0:r.page)!==n){this.hover={page:n,point:u,shape:shId};const p=this.tool.k==="select"||this.tool.k==="geo";this.scroller.style.cursor=(u||shId)&&p?"pointer":"",this.redraw()}}}`;

const r1 = `if(this.gridHoverAt(n,o),this.tool.k==="geo"||this.tool.k==="select"||this.tool.k==="fill"||this.tool.k==="shape"&&Up.includes(this.tool.t)){const a=this.doc.pages[n],l=Tt(a.geo),c=(this.tool.k==="geo"&&this.tool.t!=="move")||this.tool.k==="fill",u=this.tool.k==="shape"?this.pointTouched(a,l,o):c?this.pointNear(a,l,o,!0):this.pointNear(a,l,o,this.tool.k==="select"),sh=(!u&&(this.tool.k==="select"||this.tool.k==="geo"||(this.tool.k==="shape"&&Up.includes(this.tool.t))))?$0(a.geo.shapes,l,o,this.tol(),this.revealHidden()):null,shId=sh?sh.id:null;if(this.lineStart&&this.lineStart.page===n&&this.tool.k==="shape"&&(this.lineHover=u&&u!==this.lineStart.id?{at:l.get(u),id:u}:{at:((s=this.gridHover)==null?void 0:s.p)??o},this.redraw()),u!==(((i=this.hover)==null?void 0:i.point)??null)||shId!==(((s=this.hover)==null?void 0:s.shape)??null)||((r=this.hover)==null?void 0:r.page)!==n){this.hover={page:n,point:u,shape:shId};const p=this.tool.k==="select"||this.tool.k==="geo"||this.tool.k==="fill";this.scroller.style.cursor=(u||shId)&&p?"pointer":"",this.redraw()}}}`;

const count = code.split(t1).length - 1;
console.log('Target t1 count:', count);
if (count !== 1) {
  console.error('Cannot find t1!');
  process.exit(1);
}

code = code.replace(t1, r1);
fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully patched hoverAt for fill tool!');
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
