/* Tách màn hình giáo viên và màn chiếu cho học sinh.
   - Máy giáo viên: đủ công cụ, khung Lời giảng kèm ý sắp giảng; nút "Giữ màn hình chiếu".
   - Màn chiếu (trinh-chieu.html?projector=1): chỉ hiện bài học — các ý đã chiếu, nét viết (cả nét đang viết), cuộn/phóng như máy thầy.
     Dạy trên lớp: mở trên TV/máy chiếu (app Windows tự đặt lên màn hình thứ hai, toàn màn hình).
     Dạy online: mở thành cửa sổ/thẻ riêng để chia sẻ trong Zoom/Meet/Teams — học sinh không thấy công cụ, ghi chú.
   Đồng bộ qua BroadcastChannel (cùng nguồn, cùng máy); màn chiếu chỉ đọc, không tự lưu bài. */
(()=>{'use strict';
 if(typeof BroadcastChannel!=='function')return;
 const ch=new BroadcastChannel('nb-projector');
 const isProjector=new URLSearchParams(location.search).get('projector')==='1';
 const $=s=>document.querySelector(s);
 const textsOf=()=>texts.map(t=>({line:!!t.line,index:t.line?els.indexOf(t.el):-1,text:t.el.textContent,style:t.el.getAttribute('style')||'',rot:t.rot||0,t1:t.t1||0,pinned:t.pinned?true:undefined,pic:t.pic?{...t.pic}:undefined}));
 const liteStroke=({rect,rendered,predicted,...s})=>s;   /* bỏ bộ nhớ đệm hiển thị của máy giáo viên */

 if(isProjector){
  /* ================= MÀN CHIẾU ================= */
  document.title='NoteBoard · Màn chiếu cho học sinh';
  document.documentElement.classList.add('nb-projector');
  const css=document.createElement('style');css.textContent=`
html.nb-projector #bar,html.nb-projector #rail,html.nb-projector #studioPanel,html.nb-projector #statusbar,html.nb-projector #selBar,html.nb-projector #notes,
html.nb-projector #peek,html.nb-projector #follow,html.nb-projector #scrub,html.nb-projector #start,html.nb-projector #toast,html.nb-projector #scratchSplit,
html.nb-projector #liveStage,html.nb-projector #replayBar,html.nb-projector #propPop,html.nb-projector #pageStudio{display:none!important}
html.nb-projector #wrap{pointer-events:none}
html.nb-projector body{cursor:none}
#projWait{position:fixed;inset:0;display:grid;place-items:center;background:#0f172a;color:#e2e8f0;font:600 22px/1.5 "Segoe UI",system-ui,sans-serif;z-index:100;text-align:center}
#projWait small{display:block;font-weight:400;font-size:15px;color:#94a3b8;margin-top:8px}
`;document.head.append(css);
  try{window.scheduleSave=()=>{};scheduleSave=()=>{};documentDirty=false;}catch(_){}   /* màn chiếu không lưu, không chặn đóng cửa sổ */
  $('#bar')?.classList.add('hidden');
  const wait=document.createElement('div');wait.id='projWait';wait.innerHTML='Đang kết nối với máy giáo viên…<small>Mở bài trên NoteBoard ở máy giáo viên. Nhấp đúp để bật/tắt toàn màn hình.</small>';document.body.append(wait);
  addEventListener('dblclick',()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>{});});
  const hello=()=>ch.postMessage({t:'hello'});
  hello();setInterval(()=>ch.postMessage({t:'ping'}),2000);
  addEventListener('beforeunload',()=>ch.postMessage({t:'bye'}));
  let lastTexts='';
  function setView(v){
   if(!v)return;
   if(typeof v.shown==='number'&&v.shown!==shown&&v.shown<=els.length){
    shown=v.shown;els.forEach((el,i)=>{el.classList.toggle('on',i<shown);el.classList.toggle('cur',i===shown-1);});markPages();
   }
   if(typeof v.splitK==='number')splitK=v.splitK;
   if(typeof v.zoom==='number')zoom=v.zoom;
   if(typeof v.scrollY==='number')scrollY=v.scrollY;
   if(typeof v.scrollX==='number')scrollX=v.scrollX;
   if(typeof v.scratchZoom==='number')scratchZoom=v.scratchZoom;
   if(typeof v.scratchScrollY==='number')scratchScrollY=v.scratchScrollY;
   apply();
   if(typeof placeScratch==='function')placeScratch();
  }
  ch.onmessage=e=>{
   const m=e.data||{};
   if(m.t==='doc'){
    applyProject(m.data);lastTexts=JSON.stringify(m.data.state.texts);wait.remove();
    $('#bar')?.classList.add('hidden');if(typeof fit==='function')fit();setView(m.view);
   }else if(m.t==='state'){
    if(m.texts!==undefined&&JSON.stringify(m.texts)!==lastTexts){
     lastTexts=JSON.stringify(m.texts);
     restoreSnapshot({strokes:m.strokes,blocks,shown:m.shown,extraHeight:m.extraHeight,texts:m.texts,pageMeta:m.pageMeta,covers:m.covers});
    }else{
     strokes=m.strokes;extraHeight=m.extraHeight||extraHeight;
     window.NBLessonStudio?.restoreState?.({pageMeta:m.pageMeta,covers:m.covers});
     markPages();
    }
    setView(m.view);
   }else if(m.t==='view')setView(m.view);
   else if(m.t==='live'){
    clearLiveLayer();
    if(m.strokes?.length){liveCtx.setTransform(zoom*S,0,0,zoom*S,0,-scrollY*zoom*S);for(const s of m.strokes)drawStroke(s,liveCtx);liveCtx.setTransform(1,0,0,1,0,0);}
   }else if(m.t==='studio'){
    window.NBLessonStudio?.onProjectorMsg?.(m);
   }
  };
  return;
 }

 /* ================= MÁY GIÁO VIÊN ================= */
 let connected=false,lastPing=0,held=false,docSig='',viewSig='',frame=0,liveWas=false,qrRoom=null,barDismissed=false,barCollapsed=false;
 const css=document.createElement('style');css.textContent=`
#projBar{position:fixed;top:122px;left:50%;transform:translateX(-50%);z-index:120;display:flex;align-items:center;gap:6px;padding:5px 6px 5px 10px;background:#22323f;color:#fff;border-radius:999px;box-shadow:0 8px 24px #0b1d2a40;font:600 12.5px/1 "Segoe UI",system-ui,sans-serif;user-select:none;touch-action:none;cursor:grab}
#projBar.dragging{cursor:grabbing;opacity:.92}
#projBar[hidden]{display:none}
#projBar .pj-grip{opacity:.55;font-size:13px;letter-spacing:-1px;padding:0 2px;cursor:grab}
#projBar .pj-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px #22c55e;flex-shrink:0}
#projBar.held .pj-dot{background:#f59e0b;box-shadow:0 0 6px #f59e0b}
#projBar button{border:0;border-radius:999px;padding:6px 11px;font:700 12px "Segoe UI",system-ui,sans-serif;cursor:pointer;background:#ffffff22;color:#fff;white-space:nowrap}
#projBar button:hover{background:#ffffff38}
#projBar button[hidden]{display:none}
#projBar button.hold{background:#f59e0b;color:#1f2937}
#projBar.held button.hold{background:#22c55e;color:#052e16}
#projBar button.min-btn,#projBar button.close-btn{padding:6px 8px;background:#ffffff18;font-weight:700}
#projBar.collapsed{padding:5px 8px;gap:5px}
#projBar.collapsed .pj-text,#projBar.collapsed .qr-btn,#projBar.collapsed .hold,#projBar.collapsed .sync,#projBar.collapsed .close-btn{display:none}
#notesNext{margin-top:10px;padding-top:8px;border-top:1px dashed #cbd5e1;font-size:13.5px;color:#64748b}
#notesNext b{display:block;font-size:11.5px;color:#0f766e;letter-spacing:.4px;margin-bottom:3px}
#projDialog{border:0;border-radius:16px;padding:20px 22px;max-width:580px;box-shadow:0 24px 70px #0f172a55;font:14px/1.5 "Segoe UI",system-ui,sans-serif;color:#1e293b}
#projDialog::backdrop{background:#0f172a66}
#projDialog h3{margin:0 0 6px;color:#0f766e}
#projDialog .pj-opt{display:block;width:100%;text-align:left;border:1px solid #d6e2dc;background:#f8fbfa;border-radius:12px;padding:12px 14px;margin:8px 0;cursor:pointer;font:inherit;color:inherit}
#projDialog .pj-opt:hover{border-color:#0f766e;background:#ecfdf5}
#projDialog .pj-opt b{display:block;font-size:15px;margin-bottom:2px}
#projDialog small{color:#64748b}
`;document.head.append(css);
 const bar=document.createElement('div');bar.id='projBar';bar.hidden=true;bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Màn chiếu cho học sinh');
 bar.title='Kéo để di chuyển thanh điều khiển đến vị trí bất kỳ';
 bar.innerHTML='<span class="pj-grip" aria-hidden="true">⋮⋮</span><span class="pj-dot"></span><span class="pj-text">Màn chiếu: đang chiếu</span><button type="button" class="qr-btn" hidden title="Hiện mã QR phiên chia sẻ bảng & Live Quiz">📱 Mã QR</button><button type="button" class="hold" title="Giữ nguyên màn chiếu cho học sinh quan sát trong lúc chuẩn bị phần tiếp theo">⏸ Giữ màn hình chiếu</button><button type="button" class="sync" title="Gửi lại toàn bộ bài sang màn chiếu & điện thoại học sinh">⟳</button><button type="button" class="min-btn" title="Thu gọn / Mở rộng thanh điều khiển">–</button><button type="button" class="close-btn" title="Ẩn thanh điều khiển khỏi màn hình (phiên chia sẻ vẫn chạy ngầm)">✕</button>';
 document.body.append(bar);
 /* Kéo di chuyển #projBar tự do trên màn hình */
 {
  let drag=null;
  bar.addEventListener('pointerdown',e=>{
   if(e.button&&e.button!==0)return;
   e.stopPropagation();
   const r=bar.getBoundingClientRect();
   drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,ox:r.left,oy:r.top,moved:false};
  });
  addEventListener('pointermove',e=>{
   if(!drag||e.pointerId!==drag.id)return;
   const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
   if(!drag.moved&&Math.hypot(dx,dy)>4){
    drag.moved=true;
    bar.classList.add('dragging');
   }
   if(drag.moved){
    const w=bar.offsetWidth||220,h=bar.offsetHeight||38;
    const nx=Math.max(6,Math.min((window.innerWidth||1280)-w-6,drag.ox+dx));
    const ny=Math.max(6,Math.min((window.innerHeight||720)-h-6,drag.oy+dy));
    bar.style.left=nx+'px';
    bar.style.top=ny+'px';
    bar.style.transform='none';
   }
  });
  const endDrag=e=>{
   if(!drag||(e&&e.pointerId!==undefined&&e.pointerId!==drag.id))return;
   const wasMoved=drag.moved;
   drag=null;
   bar.classList.remove('dragging');
   if(wasMoved){
    bar.dataset.justDragged='1';
    setTimeout(()=>{delete bar.dataset.justDragged;},0);
   }
  };
  addEventListener('pointerup',endDrag);
  addEventListener('pointercancel',endDrag);
  bar.addEventListener('click',e=>{
   if(bar.dataset.justDragged){delete bar.dataset.justDragged;e.stopImmediatePropagation();e.preventDefault();}
  },true);
 }
 const dlg=document.createElement('dialog');dlg.id='projDialog';
 dlg.innerHTML='<h3>🖥 Màn chiếu & Chia sẻ bảng cho học sinh</h3><div>Màn chiếu chỉ hiện bài học; máy thầy cô vẫn giữ công cụ, lời giảng và ý sắp giảng.</div>'
  +'<button type="button" class="pj-opt" data-mode="class"><b>🖥 Dạy trên lớp (TV / máy chiếu)</b><small>App Windows tự mở toàn màn hình trên màn hình thứ hai (TV). Bản web: kéo cửa sổ màn chiếu sang TV rồi nhấp đúp để toàn màn hình. Đặt Windows ở chế độ <b>Mở rộng (Extend)</b> — phím Windows + P.</small></button>'
  +'<button type="button" class="pj-opt" data-mode="online"><b>💻 Dạy online (Zoom, Google Meet, Teams)</b><small>Mở màn chiếu thành cửa sổ/thẻ riêng tên <b>"NoteBoard · Màn chiếu cho học sinh"</b>. Trong Zoom/Meet bấm Chia sẻ màn hình → chọn <b>cửa sổ</b> (app) hoặc <b>thẻ Chrome</b> (web) đó, không chia sẻ toàn màn hình.</small></button>'
  +'<button type="button" class="pj-opt" data-mode="qr"><b>📱 Chia sẻ bảng & học liệu qua QR (Điện thoại học sinh)</b><small>Học sinh quét 1 mã QR bằng điện thoại để xem bảng, <b>tự xoay Hình 3D, tự làm Thí nghiệm Vật lí, thao tác Học liệu PhET</b> độc lập trên máy mình. Dùng chung phiên với <b>Live Quiz</b> (phát câu hỏi tương tác không cần quét lại QR).</small></button>'
  +'<div style="text-align:right;margin-top:6px"><button type="button" class="setting-btn" data-close>Đóng</button></div>';
 document.body.append(dlg);
 dlg.querySelector('[data-close]').onclick=()=>dlg.close();
 dlg.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{dlg.close();openProjector(b.dataset.mode);});
 function showProjDialog(){barDismissed=false;render();dlg.showModal();}
 function openProjector(mode){
  barDismissed=false;barCollapsed=false;
  if(mode==='qr'){
   window.NBLiveSession?.shareBoard({enableAuto:true,showQR:true});
   return;
  }
  const url=location.href.split('#')[0].split('?')[0]+'?projector=1&mode='+mode;
  const w=mode==='class'?window.open(url,'nbProjector','popup,width=1280,height=720'):window.open(url,'_blank');
  if(!w&&!window.nbDesktop)typeof toast==='function'&&toast('Trình duyệt chặn cửa sổ mới — hãy cho phép cửa sổ bật lên (pop-up) cho trang này');
  typeof toast==='function'&&toast(mode==='online'?'Đã mở màn chiếu — trong Zoom/Meet hãy chia sẻ cửa sổ "NoteBoard · Màn chiếu cho học sinh"':'Đã mở màn chiếu cho học sinh');
 }
 const viewNow=()=>({
  scrollY,
  scrollX:typeof scrollX==='number'?scrollX:0,
  zoom,
  splitK,
  scratchZoom:typeof scratchZoom==='number'?scratchZoom:1,
  scratchScrollY:typeof scratchScrollY==='number'?scratchScrollY:0,
  shown
 });
 function sendDoc(){const d=projectData();docSig=sig();ch.postMessage({t:'doc',data:d,view:viewNow()});window.NBLessonStudio?.syncProjectorAll?.();}
 function sig(){let n=0;for(const b of blocks)n+=b.html.length;return blocks.length+':'+n+':'+pdfPages+':'+(document.documentElement.dataset.theme||'')+(document.documentElement.dataset.paper||'');}
 function sendState(){
  if(!connected||held)return;
  if(sig()!==docSig){sendDoc();return;}
  ch.postMessage({t:'state',strokes:strokes.map(liteStroke),texts:textsOf(),shown,extraHeight,pageMeta:window.NBLessonStudio?.getPageMeta?.(),covers:window.NBLessonStudio?.getCovers?.(),view:viewNow()});
 }
 function sendStudio(payload){
  if(!connected||held)return;
  ch.postMessage({t:'studio',...payload});
 }
 function tick(){
  frame=0;if(!connected||held)return;
  const v=JSON.stringify(viewNow());if(v!==viewSig){viewSig=v;if(sig()!==docSig)sendDoc();else ch.postMessage({t:'view',view:viewNow()});}
  const liveNow=live.size>0||!!shp;
  if(liveNow||liveWas){ch.postMessage({t:'live',strokes:[...live.values(),...(shp?[shp]:[])].filter(s=>s.pts&&s.pts.length).map(liteStroke)});liveWas=liveNow;}
  if(liveNow)frame=requestAnimationFrame(tick);
 }
 const kick=()=>{if(connected&&!held&&!frame)frame=requestAnimationFrame(tick);};
 /* móc vào bảng: vẽ nét, cuộn/phóng, thay đổi bài */
 const baseApply=apply;apply=function(...a){const r=baseApply.apply(this,a);kick();updateNext();return r;};
 const baseQueue=queueInk;queueInk=function(...a){const r=baseQueue.apply(this,a);kick();return r;};
 const baseCommit=historyCommit;historyCommit=function(...a){const r=baseCommit.apply(this,a);if(connected&&!held)setTimeout(sendState,0);return r;};
 ch.onmessage=e=>{
  const m=e.data||{};
  if(m.t==='hello'){connected=true;barDismissed=false;lastPing=Date.now();bar.hidden=false;showNotes(true);if(!held)sendDoc();render();}
  else if(m.t==='ping'){lastPing=Date.now();if(!connected){connected=true;bar.hidden=false;if(!held)sendDoc();render();}}
  else if(m.t==='bye'){connected=false;render();}
 };
 setInterval(()=>{if(connected&&Date.now()-lastPing>6000){connected=false;render();}},2000);
 function render(){
  const anyActive=connected||!!qrRoom;
  bar.hidden=!anyActive||barDismissed;
  bar.classList.toggle('held',connected&&held);
  bar.classList.toggle('collapsed',barCollapsed);
  const qrBtn=bar.querySelector('.qr-btn');
  if(qrBtn){
   qrBtn.hidden=!qrRoom;
   if(qrRoom)qrBtn.textContent='📱 Hiện QR ('+qrRoom.code+')';
  }
  const holdBtn=bar.querySelector('.hold');
  if(holdBtn)holdBtn.hidden=!connected;
  const syncBtn=bar.querySelector('.sync');
  if(syncBtn)syncBtn.textContent=connected?'⟳':'📤 Cập nhật sang ĐT';
  const minBtn=bar.querySelector('.min-btn');
  if(minBtn){
   minBtn.textContent=barCollapsed?(qrRoom&&!connected?'📱 '+(qrRoom.code||''):'🖥'):'–';
   minBtn.title=barCollapsed?'Mở rộng thanh điều khiển':'Thu gọn thanh điều khiển';
  }
  if(connected){
   const label=qrRoom?'Màn chiếu + ĐT':'Màn chiếu';
   bar.querySelector('.pj-text').textContent=held?(label+': đang giữ'):(label+': đang chiếu');
   bar.querySelector('.hold').textContent=held?'▶ Thả màn chiếu':'⏸ Giữ màn hình chiếu';
  }else if(qrRoom){
   bar.querySelector('.pj-text').textContent='📱 Đang chia sẻ ĐT';
  }
  if(!connected)showNotes(false);
 }
 function setHold(on){
  held=!!on;render();
  if(!held){
   if(connected)sendDoc();
   if(connected)typeof toast==='function'&&toast('Màn chiếu đã cập nhật theo bảng của thầy cô');
  }else if(held)typeof toast==='function'&&toast('Đang giữ màn chiếu — học sinh vẫn thấy nội dung cũ trong lúc thầy cô chuẩn bị');
 }
 bar.querySelector('.qr-btn').onclick=()=>window.NBLiveSession?.showQR();
 bar.querySelector('.hold').onclick=()=>setHold(!held);
 bar.querySelector('.sync').onclick=()=>{
  held=false;render();
  if(connected)sendDoc();
  if(qrRoom)window.NBLiveSession?.shareBoard({showQR:false});
 };
 bar.querySelector('.min-btn').onclick=()=>{barCollapsed=!barCollapsed;render();};
 bar.querySelector('.close-btn').onclick=()=>{
  barDismissed=true;render();
  typeof toast==='function'&&toast('Đã ẩn thanh điều khiển (phiên chia sẻ vẫn hoạt động — bấm Shift+P để hiện lại)');
 };
 /* khung Lời giảng: thêm ý sắp giảng (chỉ máy giáo viên thấy) */
 const next=document.createElement('div');next.id='notesNext';$('#notes')?.append(next);
 let notesWasOn=null;
 function showNotes(on){const n=$('#notes');if(!n)return;if(on){if(notesWasOn===null)notesWasOn=n.classList.contains('on');n.classList.add('on');}else if(notesWasOn!==null){n.classList.toggle('on',notesWasOn);notesWasOn=null;}updateNext();}
 function updateNext(){
  if(!connected){next.textContent='';return;}
  const b=blocks[shown];
  if(!b){next.textContent='';return;}
  const d=document.createElement('div');d.innerHTML=b.html;const txt=(d.textContent||'').replace(/\s+/g,' ').trim();
  next.replaceChildren();const h=document.createElement('b');h.textContent='TIẾP THEO (chưa chiếu)';next.append(h,document.createTextNode(txt.slice(0,240)+(txt.length>240?'…':'')||'(hình/bảng)'));
 }
 /* nút mở: bảng Giảng bài + phím tắt Shift+P */
 const lesson=$('[data-section="lesson"]');
 if(lesson){const b=document.createElement('button');b.type='button';b.className='setting-btn';b.id='projectorBtn';b.textContent='🖥 Màn chiếu cho học sinh (dạy trên lớp / online)';b.onclick=()=>showProjDialog();lesson.prepend(b);}
 addEventListener('keydown',e=>{if(e.shiftKey&&!e.ctrlKey&&!e.altKey&&(e.key==='P'||e.key==='p')&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'')&&!document.activeElement?.isContentEditable){e.preventDefault();showProjDialog();}});
 window.NBProjector={open:mode=>mode?openProjector(mode):showProjDialog(),hold:setHold,send:sendStudio,sendState,onQrShareUpdate:(room)=>{qrRoom=room||null;render();},get held(){return held;},get connected(){return connected;},get qrSharing(){return !!qrRoom;}};
})();
