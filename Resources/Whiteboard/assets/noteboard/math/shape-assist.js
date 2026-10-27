/* Tự chỉnh nét vẽ tay thành hình chuẩn: đoạn thẳng, đường tròn, elip, tam giác, tứ giác/chữ nhật, và đầu mũi tên (vectơ).
   Thuần hình học trên các điểm nét, chạy tức thì trên máy. Trả null khi không chắc chắn để giữ nguyên nét viết. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NBShapeAssist=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function box(pts){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const p of pts){if(p.x<x0)x0=p.x;if(p.x>x1)x1=p.x;if(p.y<y0)y0=p.y;if(p.y>y1)y1=p.y;}return {x0,y0,x1,y1,w:x1-x0,h:y1-y0,d:Math.hypot(x1-x0,y1-y0)};}
function segDist(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;if(!l)return dist(p,a);let t=((p.x-a.x)*dx+(p.y-a.y)*dy)/l;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
function pathLen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=dist(pts[i-1],pts[i]);return s;}
function rdp(pts,eps){if(pts.length<3)return pts.slice();let m=0,k=0;for(let i=1;i<pts.length-1;i++){const d=segDist(pts[i],pts[0],pts[pts.length-1]);if(d>m){m=d;k=i;}}
 if(m<=eps)return [pts[0],pts[pts.length-1]];const l=rdp(pts.slice(0,k+1),eps),r=rdp(pts.slice(k),eps);return l.slice(0,-1).concat(r);}
/* Đơn giản hóa một vòng kín: tách tại điểm xa điểm đầu nhất */
function ringCorners(pts,eps){let far=0,k=0;for(let i=1;i<pts.length;i++){const d=dist(pts[0],pts[i]);if(d>far){far=d;k=i;}}
 const a=rdp(pts.slice(0,k+1),eps),b=rdp(pts.slice(k).concat([pts[0]]),eps);let v=a.slice(0,-1).concat(b.slice(0,-1));
 /* gộp các đỉnh quá gần nhau và đỉnh gần như thẳng hàng */
 for(let changed=true;changed&&v.length>2;){changed=false;
  for(let i=0;i<v.length&&v.length>2;i++){const p=v[(i+v.length-1)%v.length],c=v[i],n=v[(i+1)%v.length];
   const ang=Math.abs(Math.atan2((n.y-c.y)*(p.x-c.x)-(n.x-c.x)*(p.y-c.y),(n.x-c.x)*(p.x-c.x)+(n.y-c.y)*(p.y-c.y)));
   if(dist(p,c)<eps*1.6||ang>Math.PI*0.86){v.splice(i,1);changed=true;break;}}}
 return v;}
function polyErr(pts,v){let s=0;for(const p of pts){let m=1e9;for(let i=0;i<v.length;i++)m=Math.min(m,segDist(p,v[i],v[(i+1)%v.length]));s+=m;}return s/pts.length;}
function angleAt(p,c,n){const a=Math.atan2(p.y-c.y,p.x-c.x),b=Math.atan2(n.y-c.y,n.x-c.x);let d=Math.abs(a-b);if(d>Math.PI)d=2*Math.PI-d;return d;}
const DEG=Math.PI/180;
/* Nắn đầu mút gần phương ngang/dọc (lệch dưới 4°) */
function straighten(a,b){const ang=Math.atan2(b.y-a.y,b.x-a.x),L=dist(a,b);for(const t of [0,90,180,-90,-180]){if(Math.abs(ang-t*DEG)<4*DEG){const r=t*DEG;return [a,{x:a.x+L*Math.cos(r),y:a.y+L*Math.sin(r)}];}}return [a,b];}
function recognize(raw,opts={}){
 const pts=(raw||[]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));if(pts.length<4)return null;
 const b=box(pts),minSize=opts.minSize||40;if(b.d<minSize)return null;
 const first=pts[0],last=pts[pts.length-1],L=dist(first,last),len=pathLen(pts);
 /* Đoạn thẳng */
 if(L>=minSize&&len/L<1.15){let m=0;for(const p of pts)m=Math.max(m,segDist(p,first,last));if(m/L<0.08){const [a,c]=straighten(first,last);return {kind:'line',a,b:c};}}
 /* Hình kín */
 if(dist(first,last)>Math.max(22,0.28*b.d)||len<1.9*Math.max(b.w,b.h))return null;
 const cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,rx=b.w/2,ry=b.h/2;if(rx<8||ry<8)return null;
 let ell=0;for(const p of pts)ell+=Math.abs(Math.hypot((p.x-cx)/rx,(p.y-cy)/ry)-1);ell/=pts.length;
 const v=ringCorners(pts,0.06*b.d),pe=v.length>=3?polyErr(pts,v)/b.d:1;
 if((v.length===3||v.length===4)&&pe<0.035&&pe<ell*0.55){
  if(v.length===3){const angs=v.map((c,i)=>angleAt(v[(i+2)%3],c,v[(i+1)%3]));if(Math.min(...angs)<12*DEG)return null;return {kind:'tri',v};}
  const angs=v.map((c,i)=>angleAt(v[(i+3)%4],c,v[(i+1)%4]));
  if(angs.every(a=>Math.abs(a-90*DEG)<16*DEG)){
   const e=Math.atan2(v[1].y-v[0].y,v[1].x-v[0].x),off=Math.abs(((e/DEG)%90+90)%90);
   if(off<9||off>81)return {kind:'rect',v:[{x:b.x0,y:b.y0},{x:b.x1,y:b.y0},{x:b.x1,y:b.y1},{x:b.x0,y:b.y1}],axis:true};
  }
  return {kind:'rect',v,axis:false};
 }
 if(ell<0.1){if(Math.abs(rx-ry)/Math.max(rx,ry)<0.2){const r=(rx+ry)/2;return {kind:'circle',c:{x:cx,y:cy},r};}return {kind:'ellipse',c:{x:cx,y:cy},rx,ry};}
 return null;
}
/* Nét nhỏ hình chữ V có đỉnh ở một đầu đoạn thẳng -> đầu mũi tên. Trả {tip, tail} hoặc null */
function arrowHead(raw,line){
 const pts=(raw||[]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));if(pts.length<3||!line)return null;
 const b=box(pts),Lline=dist(line.a,line.b);if(b.d>Math.max(90,0.5*Lline)||b.d<8)return null;
 const v=rdp(pts,Math.max(3,0.12*b.d));if(v.length!==3)return null;
 const apex=v[1],ang=angleAt(v[0],apex,v[2]);if(ang<15*DEG||ang>130*DEG)return null;
 const tol=Math.max(18,0.18*Lline);let tip=null,tail=null;
 if(dist(apex,line.b)<=tol){tip=line.b;tail=line.a;}else if(dist(apex,line.a)<=tol){tip=line.a;tail=line.b;}else return null;
 /* hai cánh của chữ V phải hướng ngược về phía đuôi */
 const dir={x:tail.x-tip.x,y:tail.y-tip.y},n=Math.hypot(dir.x,dir.y)||1,bis={x:(v[0].x+v[2].x)/2-apex.x,y:(v[0].y+v[2].y)/2-apex.y};
 if((bis.x*dir.x+bis.y*dir.y)/(n*(Math.hypot(bis.x,bis.y)||1))<0.5)return null;
 return {tip,tail};
}
return {recognize,arrowHead,rdp,box};
});
