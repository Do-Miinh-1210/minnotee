/* Tự chỉnh hình trên bảng: bật trong Bút → "Tự chỉnh hình", hoặc lúc nào cũng được: vẽ xong giữ bút yên ~0,55 giây.
   Vectơ: vẽ đoạn thẳng, rồi vẽ chữ V nhỏ ở đầu cần mũi tên. Hoàn tác (Ctrl+Z) trả lại nét vẽ tay. */
(()=>{
'use strict';
const A=window.NBShapeAssist;if(!A||typeof strokes==='undefined'||typeof makeShape!=='function'||typeof ink==='undefined')return;
const KEY='noteboard.shapeAssist',HOLD_MS=550;
let auto=false;try{auto=localStorage.getItem(KEY)==='1';}catch{}
const sec=document.querySelector('[data-section="pen"]');
if(sec){
 const row=document.createElement('label');row.className='toggle-row';
 row.innerHTML='<span>Tự chỉnh hình<small>Nét vẽ đoạn thẳng, đường tròn, elip, tam giác, tứ giác tự thành hình chuẩn. Khi tắt: vẽ xong giữ bút yên nửa giây. Vectơ: vẽ đoạn thẳng rồi vẽ chữ V ở đầu mũi tên. Ctrl+Z để lấy lại nét tay.</small></span><input type="checkbox" id="shapeAssistEnabled">';
 const anchor=sec.querySelector('#nibEnabled')?.closest('label');if(anchor)anchor.before(row);else sec.append(row);
 const cb=row.querySelector('input');cb.checked=auto;
 cb.onchange=()=>{auto=cb.checked;try{localStorage.setItem(KEY,auto?'1':'0');}catch{}toast(auto?'Đã bật Tự chỉnh hình':'Đã tắt Tự chỉnh hình — vẫn có thể giữ bút yên để chỉnh');};
}
const track=new Map();let lastLine=null;
ink.addEventListener('pointerdown',e=>{const s=typeof live!=='undefined'?live.get(e.pointerId):null;if(mode==='pen'&&s&&!s.flat&&!s.erase&&!s.hl)track.set(e.pointerId,{s,t:performance.now(),x:e.clientX,y:e.clientY});});
ink.addEventListener('pointermove',e=>{const r=track.get(e.pointerId);if(r&&Math.hypot(e.clientX-r.x,e.clientY-r.y)>4){r.t=performance.now();r.x=e.clientX;r.y=e.clientY;}});
ink.addEventListener('pointercancel',e=>track.delete(e.pointerId));
ink.addEventListener('pointerup',e=>{
 const r=track.get(e.pointerId);track.delete(e.pointerId);if(!r)return;
 const s=r.s,held=performance.now()-r.t>=HOLD_MS;
 if(!strokes.includes(s)||s.flat||s.erase||s.hl||!s.pts?.length)return;
 if(!auto&&!held)return;
 try{convert(s,held);}catch(err){console.warn('shape assist',err);}
});
function build(kind,a,b,src){
 const old=shape;shape=kind;let n;try{n=makeShape(a,b,false);}finally{shape=old;}
 n.color=src.color;n.w=src.w;return n;
}
const P=p=>({x:p.x,y:p.y,p:0.62});
function setPts(n,list){n.pts=list.map(P);n.y0=Math.min(...n.pts.map(p=>p.y));n.y1=Math.max(...n.pts.map(p=>p.y));}
function replace(old,n,remove){
 const i=strokes.indexOf(old);if(i<0)return false;strokes[i]=n;
 if(remove){const j=strokes.indexOf(remove);if(j>=0)strokes.splice(j,1);}
 markPages();apply();historyCommit();return true;
}
function convert(s,held){
 /* Chữ V vừa vẽ ở đầu đoạn thẳng trước đó -> vectơ */
 if(lastLine&&performance.now()-lastLine.time<6000&&strokes.includes(lastLine.s)){
  const h=A.arrowHead(s.pts,lastLine);
  if(h){const n=build('arrow',h.tail,h.tip,lastLine.s);if(replace(lastLine.s,n,s)){lastLine=null;toast('Đã thành vectơ');}return;}
 }
 const res=A.recognize(s.pts,{minSize:held?24:60});
 if(!res){if(held)toast('Chưa nhận ra hình — nét được giữ nguyên');return;}
 let n;
 if(res.kind==='line')n=build('line',res.a,res.b,s);
 else if(res.kind==='circle')n=build('ellipse',{x:res.c.x-res.r,y:res.c.y-res.r},{x:res.c.x+res.r,y:res.c.y+res.r},s);
 else if(res.kind==='ellipse')n=build('ellipse',{x:res.c.x-res.rx,y:res.c.y-res.ry},{x:res.c.x+res.rx,y:res.c.y+res.ry},s);
 else if(res.kind==='tri'){const v=res.v;n=build('tri',{x:Math.min(...v.map(p=>p.x)),y:Math.min(...v.map(p=>p.y))},{x:Math.max(...v.map(p=>p.x)),y:Math.max(...v.map(p=>p.y))},s);setPts(n,[...v,v[0]]);n.freeVertices=true;}
 else if(res.kind==='rect'){const v=res.v;n=build('rect',v[0],v[2],s);if(!res.axis){setPts(n,[...v,v[0]]);n.freeVertices=true;}}
 if(!n)return;
 if(replace(s,n)){lastLine=res.kind==='line'?{s:n,a:res.a,b:res.b,time:performance.now()}:null;}
}
window.NBShapeAssistUI={get enabled(){return auto;},set enabled(v){auto=!!v;const cb=document.getElementById('shapeAssistEnabled');if(cb)cb.checked=auto;},convert};
})();
