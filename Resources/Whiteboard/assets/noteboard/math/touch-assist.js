/* Bút viết, ngón tay điều hướng và chọn.
   Sau khi ngón tay chạm chọn một đối tượng (ứng dụng chuyển sang chế độ Chọn để hiện khung và thanh nút):
   - Đặt bút xuống ngoài vùng chọn: bỏ chọn, quay lại công cụ trước đó và viết ngay.
   - Kéo một ngón tay ở chỗ trống: bỏ chọn và trượt bảng như trước.
   - Kéo ngón tay trên đối tượng đang chọn hoặc núm của nó: di chuyển / co giãn / xoay như bình thường. */
(()=>{
'use strict';
if(typeof ink==='undefined'||typeof setMode!=='function'||typeof selBox!=='function')return;
let from=null,fingerSel=null;
const near=(q,h,r)=>h&&Math.hypot(q.x-h.x,q.y-h.y)<=r;
function onSelection(q){
 if(!selected.length)return false;
 try{
  const b=selBox(),pad=30;
  if(q.x>=b.x0-pad&&q.x<=b.x1+pad&&q.y>=b.y0-pad&&q.y<=b.y1+pad)return true;
  if(near(q,typeof rotHandle==='function'&&rotHandle(),40))return true;
  const sh=typeof scaleHandle==='function'&&scaleHandle(),eh=typeof scaleEdgeHandles==='function'&&scaleEdgeHandles();
  if(near(q,sh,40)||near(q,eh?.hx,40)||near(q,eh?.hy,40))return true;
 }catch{}
 return false;
}
/* Ghi nhận công cụ trước khi ngón tay chạm (pha bắt sự kiện, chạy trước xử lý chính của bảng) */
ink.addEventListener('pointerdown',e=>{
 if(fingerSel&&mode!=='sel')fingerSel=null;                      /* người dùng đã tự đổi công cụ */
 if(fingerSel&&mode==='sel'){
  const q=toBoard(e),hitSel=onSelection(q);
  if(e.pointerType==='pen'&&!hitSel){selected=[];setMode(fingerSel.from);fingerSel=null;apply();return;}
  if(e.pointerType==='touch'&&!hitSel&&!(typeof pickAt==='function'&&pickAt(q,true))){selected=[];setMode(fingerSel.from);fingerSel=null;apply();return;}
 }
 from=e.pointerType==='touch'&&mode!=='sel'?mode:null;
},true);
/* Sau khi nhấc ngón tay: nếu vừa chuyển sang Chọn do chạm vào đối tượng thì nhớ công cụ để quay lại */
const after=e=>{if(e.pointerType!=='touch'||!from)return;if(mode==='sel'&&selected.length)fingerSel={from};from=null;};
ink.addEventListener('pointerup',after);
window.NBTouchAssist={get fingerSelection(){return fingerSel;}};
})();
