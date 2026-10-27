/* Video từ máy đặt thẳng lên bảng (Chèn → "Video từ máy…" hoặc kéo thả tệp video vào bảng).
   - Phát trực tiếp từ tệp trên máy qua blob: URL (trình duyệt đọc dần từ ổ đĩa, không nạp cả tệp vào bộ nhớ).
   - KHÔNG tải video lên máy chủ, KHÔNG lưu video trong bài .nbink: bài chỉ giữ một trang giữ chỗ nhỏ (tên, cỡ tệp).
     Mở lại bài sau khi đóng app → bấm "Chọn lại video" để phát tiếp. Đóng bảng thì các blob: URL được thu hồi.
   - Đối tượng là một trang HTML trên bảng (htmlobj) nên kéo, đổi cỡ, xóa, hoàn tác, Tương tác, Toàn màn hình như cũ;
     module chỉ phủ thẻ <video> lên trên và thêm nút Phát/Dừng trên thanh đối tượng.
   - Màn chiếu (projector=1) phát cùng tệp, tắt tiếng, bám theo máy giáo viên qua BroadcastChannel. */
(()=>{'use strict';
 if(typeof board==='undefined'||typeof addPic!=='function')return;
 const $=s=>document.querySelector(s);
 const isProjector=new URLSearchParams(location.search).get('projector')==='1';
 const ch=typeof BroadcastChannel==='function'?new BroadcastChannel('nb-video'):null;
 const META=/<meta name="nb-video" content="([^"]*)">/;
 const NO_PLAY=/\.(avi|wmv|flv|mpe?g|3gp|vob|rmvb?|asf)$/i, VIDEO_EXT=/\.(mp4|m4v|webm|ogv|ogg|mov|mkv)$/i;
 const isVideo=f=>!!f&&(/^video\//.test(f.type)||VIDEO_EXT.test(f.name)||NO_PLAY.test(f.name));
 const made=new Set(), state=new WeakMap();
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 const size=n=>n>=1073741824?(n/1073741824).toFixed(1)+' GB':(n/1048576).toFixed(n>=1048576*10?0:1)+' MB';
 const css=document.createElement('style');css.textContent=`
.txt.htmlobj.nbvideo video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;pointer-events:none;display:none}
.txt.htmlobj.nbvideo.ok video{display:block}
.txt.htmlobj.nbvideo.ok iframe{visibility:hidden}
.txt.htmlobj.nbvideo.live video,.txt.htmlobj.nbvideo:fullscreen video{pointer-events:auto}
.txt.htmlobj.nbvideo.playing .htmltag{display:none}
#selBar button[data-act="vplay"] span{white-space:nowrap}`;document.head.append(css);

 /* Trang giữ chỗ lưu trong bài: không chứa dữ liệu video */
 function placeholder(m){
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="nb-video" content="'+encodeURIComponent(JSON.stringify(m))+'">'
   +'<style>html,body{margin:0;height:100%}body{display:grid;place-items:center;background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#e2e8f0;font:15px/1.5 "Segoe UI",system-ui,sans-serif;text-align:center}'
   +'div{padding:16px 24px;max-width:90%}i{display:block;font-style:normal;font-size:44px}b{display:block;font-size:17px;word-break:break-word}small{display:block;color:#94a3b8;margin-top:6px}</style></head>'
   +'<body><div><i>🎬</i><b>'+esc(m.name)+'</b><small>'+esc(size(m.size))+' · Video phát trực tiếp từ máy giáo viên, không lưu trong bài và không tải lên máy chủ.<br>Trên máy giáo viên: chọn video → bấm "Chọn lại video" nếu chưa phát.</small></div></body></html>';
 }
 const metaOf=el=>{const m=META.exec(el.querySelector('iframe')?.srcdoc||'');if(!m)return null;try{const o=JSON.parse(decodeURIComponent(m[1]));return o&&typeof o.id==='string'?o:null;}catch(_){return null;}};
 const objOf=el=>texts.find(t=>t.el===el);

 /* Đọc thông tin video (kích thước khung, độ dài) ngay trên máy để kiểm tra có phát được không */
 function probe(url){
  return new Promise(res=>{const v=document.createElement('video');v.preload='metadata';v.muted=true;
   let done=false;const end=ok=>{if(done)return;done=true;const r=ok?{w:v.videoWidth,h:v.videoHeight,d:v.duration}:null;v.removeAttribute('src');v.load();res(r);};
   v.onloadedmetadata=()=>end(v.videoWidth>0||v.duration>0);v.onerror=()=>end(false);setTimeout(()=>end(false),15000);v.src=url;});
 }
 async function load(f){
  if(!isVideo(f)){toast('Tệp này không phải video');return null;}
  if(NO_PLAY.test(f.name)){toast('Định dạng '+f.name.split('.').pop().toUpperCase()+' không phát được trên bảng — hãy chuyển sang MP4 (H.264) hoặc WebM');return null;}
  const url=URL.createObjectURL(f),info=await probe(url);
  if(!info){URL.revokeObjectURL(url);toast('Không phát được video này — hãy chuyển sang MP4 (H.264) hoặc WebM');return null;}
  made.add(url);return {url,info};
 }
 async function insert(f){
  const got=await load(f);if(!got)return null;
  const ar=got.info.w&&got.info.h?Math.max(.2,Math.min(5,got.info.w/got.info.h)):16/9,w=ar>=1?640:Math.round(420*ar);
  const m={id:'v'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:String(f.name).slice(0,120),size:f.size||0,blob:got.url};
  const p=placeCentered(w,w/ar),t=addPic('',{x:p.x,y:p.y,w:p.w,html:placeholder(m),ar,title:m.name});
  if(!t){toast('Không đặt được video lên bảng');return null;}
  seen.add(t.el);attach(t.el);selected=[t];apply();toast('Đã đặt video lên bảng — chọn video, bấm ▶ để phát, Chụp khung hình để vẽ lên ảnh');return t;
 }
 async function relink(t){
  const f=await pick();if(!f)return;const got=await load(f);if(!got)return;
  const old=metaOf(t.el)||{},m={id:old.id||('v'+Date.now().toString(36)),name:String(f.name).slice(0,120),size:f.size||0,blob:got.url};
  t.pic.html=placeholder(m);t.pic.title=m.name;const fr=t.el.querySelector('iframe');if(fr)fr.srcdoc=t.pic.html;
  attach(t.el,true);historyCommit();
 }

 /* Phủ thẻ video lên đối tượng; gọi lại mỗi khi bảng dựng lại đối tượng (hoàn tác, mở bài, màn chiếu) */
 function attach(el,force){
  const m=metaOf(el);if(!m)return;
  let s=state.get(el);if(s&&!force&&s.id===m.id&&s.url===m.blob)return;
  el.classList.add('nbvideo');
  if(!s){
   const v=document.createElement('video');v.playsInline=true;v.controls=true;v.preload='metadata';v.disablePictureInPicture=true;
   v.setAttribute('controlslist','nodownload noremoteplayback');
   if(isProjector)v.muted=true;
   s={v,id:'',url:''};state.set(el,s);el.insertBefore(v,el.querySelector('.htmltag'));
   v.addEventListener('loadedmetadata',()=>{el.classList.add('ok');if(isProjector)ch?.postMessage({ask:s.id});else if(selected.some(t=>t.el===el))placeSelBar();});
   v.addEventListener('error',()=>{el.classList.remove('ok','playing');if(selected.some(t=>t.el===el))placeSelBar();});
   const sync=()=>{el.classList.toggle('playing',!v.paused);if(!isProjector){ch?.postMessage(stateMsg(s));if(selected.some(t=>t.el===el))placeSelBar();}};
   for(const ev of ['play','pause','seeked','ratechange','ended'])v.addEventListener(ev,sync);
   let last=0;v.addEventListener('timeupdate',()=>{if(!isProjector&&!v.paused&&performance.now()-last>2000){last=performance.now();ch?.postMessage(stateMsg(s));}});
  }
  const tag=el.querySelector('.htmltag');if(tag)tag.textContent='🎬 '+m.name;
  s.id=m.id;s.url=m.blob;el.classList.remove('ok','playing');
  if(m.blob&&/^blob:/.test(m.blob)){s.v.src=m.blob;s.v.load();}else s.v.removeAttribute('src');
  if(!isProjector&&selected.some(t=>t.el===el))placeSelBar();
 }
 const stateMsg=s=>({id:s.id,playing:!s.v.paused&&!s.v.ended,t:s.v.currentTime,rate:s.v.playbackRate});
 const videos=()=>[...board.querySelectorAll('.txt.htmlobj.nbvideo')].map(el=>({el,s:state.get(el)})).filter(x=>x.s);

 if(ch)ch.onmessage=e=>{
  const d=e.data||{};
  if(!isProjector){if(d.ask)for(const x of videos())if(x.s.id===d.ask)ch.postMessage(stateMsg(x.s));return;}
  for(const x of videos()){if(x.s.id!==d.id)continue;const v=x.s.v;
   if(Number.isFinite(d.rate)&&v.playbackRate!==d.rate)v.playbackRate=d.rate;
   if(Number.isFinite(d.t)&&Math.abs(v.currentTime-d.t)>.35)v.currentTime=d.t;
   if(d.playing&&v.paused)v.play().catch(()=>{});else if(!d.playing&&!v.paused)v.pause();}
 };

 const seen=new WeakSet();   /* mỗi đối tượng HTML chỉ kiểm tra một lần (trang 3D có thể nặng vài MB) */
 const scan=()=>{for(const el of board.querySelectorAll('.txt.htmlobj'))if(!seen.has(el)){seen.add(el);attach(el);}};
 new MutationObserver(recs=>{if(recs.some(r=>r.addedNodes.length))scan();}).observe(board,{childList:true});
 scan();
 if(isProjector)return;

 /* Chọn tệp: chỉ đọc trên máy này */
 const input=document.createElement('input');input.type='file';input.accept='video/*,.mp4,.m4v,.webm,.ogv,.mov,.mkv';input.hidden=true;input.id='insVideoIn';document.body.append(input);
 let picking=null;
 function pick(){return new Promise(res=>{picking=res;input.value='';input.click();});}
 input.addEventListener('change',()=>{const f=input.files[0];input.value='';const r=picking;picking=null;if(r)r(f||null);else if(f)insert(f);});
 input.addEventListener('cancel',()=>{const r=picking;picking=null;r?.(null);});

 const menu=$('#insertMenu');
 if(menu){const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.dataset.ins='video';b.textContent='Video từ máy…';b.title='Phát video trên máy ngay trên bảng (không tải lên máy chủ)';
  b.onclick=()=>{menu.hidden=true;$('#insertBtn')?.setAttribute('aria-expanded','false');pick().then(f=>{if(f)insert(f);});};
  const html=menu.querySelector('[data-ins="html"]');html?html.after(b):menu.append(b);}

 /* Kéo thả tệp video vào bảng: xử lý trước bộ mở tệp chung */
 addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(!isVideo(f))return;e.preventDefault();e.stopImmediatePropagation();insert(f);},true);

 /* Chụp khung hình đang xem thành ảnh trên bảng (kèm mốc thời gian) để vẽ, đo, phân tích ngay trên ảnh.
    Ảnh là đối tượng ảnh bình thường của bảng: được lưu trong bài như các ảnh khác, không lưu video. */
 const clock=x=>{const m=Math.floor(x/60),sec=x-m*60;return (m?m+':'+String(Math.floor(sec)).padStart(2,'0')+',':Math.floor(sec)+',')+String(Math.floor(sec%1*100)).padStart(2,'0');};
 function snap(t){
  const v=state.get(t.el)?.v;if(!v||!t.el.classList.contains('ok')||!v.videoWidth){toast('Video chưa sẵn sàng để chụp');return null;}
  v.pause();
  const k=Math.min(1,1920/v.videoWidth),c=document.createElement('canvas');c.width=Math.round(v.videoWidth*k);c.height=Math.round(v.videoHeight*k);
  const g=c.getContext('2d');g.drawImage(v,0,0,c.width,c.height);
  const label='t = '+clock(v.currentTime)+' s',fs=Math.max(14,Math.round(c.height/22));g.font='600 '+fs+'px "Segoe UI",system-ui,sans-serif';
  const tw=g.measureText(label).width;g.fillStyle='rgba(15,23,42,.72)';g.fillRect(8,c.height-fs*1.6-8,tw+fs,fs*1.6);g.fillStyle='#fff';g.textBaseline='middle';g.fillText(label,8+fs/2,c.height-fs*.8-8);
  let src;try{src=c.toDataURL('image/jpeg',.9);}catch(_){toast('Không chụp được khung hình này');return null;}
  const x=parseFloat(t.el.style.left)||0,y=parseFloat(t.el.style.top)||0,w=parseFloat(t.el.style.width)||t.el.offsetWidth,h=w*c.height/c.width;
  const right=x+w+24+w<=1600,p=right?{x:x+w+24,y,w}:{x,y:y+t.el.offsetHeight+24,w};
  const pic=addPic(src,p);if(!pic){toast('Không đặt được ảnh lên bảng');return null;}
  selected=[pic];apply();toast('Đã chụp khung hình lúc '+label+' — chọn bút để vẽ, đánh dấu lên ảnh');return pic;
 }

 /* Nút Phát/Dừng và Chụp khung hình trên thanh đối tượng khi chọn một video */
 const bar=$('#selBar');
 if(bar){
  const btn=document.createElement('button');btn.type='button';btn.dataset.act='vplay';btn.hidden=true;
  const ic={play:'M8 5l11 7-11 7z',pause:'M8 5v14 M16 5v14',file:'M4 6h11l5 5v7H4z M8 10l4 2.5L8 15z'};
  const draw=(k,label,title)=>{btn.title=title;btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="'+ic[k]+'"/></svg>'+(label?'<span>'+label+'</span>':'');btn.setAttribute('aria-label',title);};
  const shot=document.createElement('button');shot.type='button';shot.dataset.act='vsnap';shot.hidden=true;shot.title='Chụp khung hình đang xem thành ảnh trên bảng để vẽ, phân tích';
  shot.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg><span>Chụp khung hình</span>';
  bar.prepend(btn,shot);shot.onclick=()=>{const t=cur();if(t)snap(t);};
  const cur=()=>{const t=selected.length===1?selected[0]:null;return t&&t.el?.classList.contains('nbvideo')&&state.get(t.el)?t:null;};
  btn.onclick=()=>{const t=cur();if(!t)return;const v=state.get(t.el).v;
   if(!t.el.classList.contains('ok'))relink(t);else if(v.paused||v.ended)v.play().catch(err=>toast('Không phát được: '+err.message));else v.pause();};
  const base=placeSelBar;
  placeSelBar=function(){const t=cur();btn.hidden=!t;shot.hidden=!t||!t.el.classList.contains('ok');
   if(t){const v=state.get(t.el).v;if(!t.el.classList.contains('ok'))draw('file','Chọn lại video','Video không lưu trong bài — chọn lại tệp trên máy để phát');else if(v.paused||v.ended)draw('play','','Phát video');else draw('pause','','Tạm dừng video');}
   base();
   if(t){const sh=bar.querySelector('[data-act="share-student"]');if(sh)sh.hidden=true;}};   /* video chỉ phát trên máy giáo viên: không gửi sang điện thoại */
 }
 /* Đóng bảng: thu hồi mọi blob: URL đã tạo (tệp gốc trên máy không bị đụng tới) */
 addEventListener('pagehide',e=>{if(e.persisted)return;for(const u of made)URL.revokeObjectURL(u);made.clear();});
 window.NBVideoBoard={insert,snap,isVideo};
})();
