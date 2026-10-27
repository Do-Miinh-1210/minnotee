/* Phát lại quá trình viết: vẽ lại lần lượt từng nét theo thời điểm đã ghi (at, dur lưu cùng nét trong .nbink).
   Giữ nhịp viết thật nhưng rút gọn khoảng nghỉ dài (tối đa 1,5 giây); nét cũ chưa có thời điểm thì theo thứ tự vẽ.
   Vẽ trên một lớp riêng phủ lên bảng, không đổi nội dung bài; đóng lại là bảng trở về như cũ. */
(()=>{'use strict';
 const stage=document.getElementById('stage');if(!stage||typeof drawStroke!=='function')return;
 const css=document.createElement('style');css.textContent=`
#replayInk{position:absolute;inset:0;width:1600px;height:100%;cursor:default}
#replayBar{position:fixed;left:50%;bottom:104px;transform:translateX(-50%);z-index:58;display:flex;align-items:center;gap:8px;padding:8px 12px;background:#22323f;color:#fff;border-radius:14px;box-shadow:0 12px 34px #0b1d2a55;font:13px/1 "Segoe UI",system-ui,sans-serif}
#replayBar[hidden]{display:none}
#replayBar button{background:#ffffff1f;border:0;color:#fff;border-radius:9px;min-width:36px;height:34px;font-size:15px;cursor:pointer}
#replayBar button:hover{background:#ffffff33}
#replayBar select{background:#ffffff1f;color:#fff;border:0;border-radius:8px;height:32px;padding:0 6px}
#replayBar select option{color:#000}
#replayBar input[type=range]{width:min(42vw,420px);accent-color:#2dd4bf}
#replayBar .rp-time{min-width:92px;text-align:center;font-variant-numeric:tabular-nums}
`;document.head.append(css);
 const layer=document.createElement('canvas');layer.id='replayInk';layer.hidden=true;layer.setAttribute('aria-hidden','true');
 document.getElementById('ink').after(layer);
 const bar=document.createElement('div');bar.id='replayBar';bar.hidden=true;bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Phát lại quá trình viết');
 bar.innerHTML='<button type="button" data-r="restart" title="Về đầu">⏮</button><button type="button" data-r="play" title="Phát / Tạm dừng (Space)">⏸</button>'
  +'<select data-r="speed" title="Tốc độ"><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option><option value="8">8×</option></select>'
  +'<input type="range" data-r="seek" min="0" max="1000" value="0" aria-label="Thanh thời gian"><span class="rp-time" data-r="time">0:00 / 0:00</span>'
  +'<button type="button" data-r="close" title="Đóng phát lại (Esc)">✕</button>';
 document.body.append(bar);
 const $r=k=>bar.querySelector('[data-r="'+k+'"]');
 const done=document.createElement('canvas');            /* các nét đã viết xong (vẽ dồn) */
 let seq=[],total=0,t=0,playing=false,speed=1,raf=0,last=0,drawn=0,key='',saved=null;

 const fmt=ms=>{const s=Math.round(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
 function pathLen(s){let l=0;for(let i=1;i<s.pts.length;i++)l+=Math.hypot(s.pts[i].x-s.pts[i-1].x,s.pts[i].y-s.pts[i-1].y);return l;}
 function build(){
  seq=[];total=0;let prevEnd=null;
  for(const s of strokes){
   if(!s.pts||!s.pts.length)continue;
   const dur=Math.max(120,Math.min(4000,s.dur||(s.flat?400:150+pathLen(s)*2)));
   let gap=seq.length?250:0;
   if(s.at&&prevEnd)gap=Math.max(120,Math.min(1500,s.at-prevEnd));
   total+=gap;seq.push({s,start:total,dur});total+=dur;
   prevEnd=s.at?s.at+(s.dur||dur):null;
  }
 }
 const tf=c=>c.setTransform(zoom*S,0,0,zoom*S,0,-scrollY*zoom*S);
 function partial(s,f){
  const k=Math.max(1,Math.ceil(s.pts.length*f)),c={...s,pts:s.pts.slice(0,k)};
  delete c.rect;delete c.rendered;delete c.predicted;
  if(s.ink!=null&&c.pts[k-1].d!=null)c.len=c.pts[k-1].d;
  return c;
 }
 function frame(){
  const W=document.getElementById('ink').width,H=document.getElementById('ink').height;
  const k=[W,H,zoom,scrollY,S].join('/');
  if(layer.width!==W||layer.height!==H){layer.width=W;layer.height=H;}
  if(k!==key||t<(seq[drawn-1]?.start+seq[drawn-1]?.dur||0)){key=k;done.width=W;done.height=H;drawn=0;}
  const dc=done.getContext('2d');tf(dc);
  while(drawn<seq.length&&seq[drawn].start+seq[drawn].dur<=t){drawStroke(seq[drawn].s,dc);drawn++;}
  const c=layer.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);c.drawImage(done,0,0);
  const cur=seq[drawn];
  if(cur&&cur.start<=t){tf(c);drawStroke(partial(cur.s,Math.min(1,(t-cur.start)/cur.dur)),c);c.setTransform(1,0,0,1,0,0);}
  $r('seek').value=String(total?Math.round(t/total*1000):0);
  $r('time').textContent=fmt(t)+' / '+fmt(total);
  follow(cur&&cur.start<=t?cur.s:seq[drawn-1]?.s);
 }
 /* cuộn theo chỗ đang viết */
 function follow(s){
  if(!s)return;const view=VH/zoom,top=scrollY;
  if(s.y1<top+40||s.y0>top+view-40){scrollY=Math.max(0,s.y0-view*.25);apply();}
 }
 function loop(now){
  if(!playing)return;
  t=Math.min(total,t+(now-last)*speed);last=now;frame();
  if(t>=total){setPlaying(false);return;}
  raf=requestAnimationFrame(loop);
 }
 function setPlaying(on){
  playing=on;$r('play').textContent=on?'⏸':'▶';
  cancelAnimationFrame(raf);
  if(on){if(t>=total)t=0,drawn=0,key='';last=performance.now();raf=requestAnimationFrame(loop);}
 }
 function open(){
  if(!bar.hidden)return;
  typeof commitEdit==='function'&&commitEdit();
  build();
  if(!seq.length){typeof toast==='function'&&toast('Chưa có nét viết để phát lại');return;}
  saved={scrollY};
  if(typeof selected!=='undefined'){selected=[];placeSelBar();}
  document.getElementById('ink').style.visibility='hidden';document.getElementById('liveInk').style.visibility='hidden';
  layer.hidden=false;bar.hidden=false;t=0;drawn=0;key='';
  scrollY=Math.max(0,(seq[0].s.y0||0)-VH/zoom*.25);apply();
  frame();setPlaying(true);
  typeof toast==='function'&&toast('Đang phát lại quá trình viết — Space: dừng/tiếp, Esc: đóng');
 }
 function close(){
  if(bar.hidden)return;
  setPlaying(false);bar.hidden=true;layer.hidden=true;
  document.getElementById('ink').style.visibility='';document.getElementById('liveInk').style.visibility='';
  if(saved){scrollY=saved.scrollY;saved=null;}
  apply();
 }
 $r('play').onclick=()=>setPlaying(!playing);
 $r('restart').onclick=()=>{t=0;drawn=0;key='';frame();};
 $r('speed').onchange=e=>{speed=+e.target.value||1;};
 $r('seek').oninput=e=>{t=total*(+e.target.value)/1000;frame();};
 $r('close').onclick=close;
 layer.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();setPlaying(!playing);});   /* bấm lên bảng: dừng/tiếp, không vẽ nhầm */
 addEventListener('keydown',e=>{
  if(bar.hidden)return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
  else if(e.key===' '){e.preventDefault();e.stopPropagation();setPlaying(!playing);}
 },true);
 /* nút mở: bảng Giảng bài */
 const lesson=document.querySelector('[data-section="lesson"]');
 if(lesson){const b=document.createElement('button');b.type='button';b.className='setting-btn';b.id='inkReplayBtn';b.textContent='▶ Phát lại quá trình viết';b.title='Xem lại bài giảng được viết dần từng nét (lưu trong file .nbink)';b.onclick=open;lesson.append(b);}
 window.NBInkReplay={open,close,get playing(){return playing;},get total(){return total;}};
})();
