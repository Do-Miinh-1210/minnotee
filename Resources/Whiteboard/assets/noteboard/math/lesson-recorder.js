/* Ghi hình bài giảng: quay chính cửa sổ NoteBoard kèm giọng nói, lưu thành video MP4 (hoặc WebM nếu trình duyệt
   chưa ghi được MP4). Chạy hoàn toàn trên máy, không tải lên đâu. Dùng chung cho bản web và bản Windows (Electron
   cần bật quyền quay cửa sổ và micro trong main.js, xem desktop/lib/media-capture.js). */
(()=>{
'use strict';
const md=navigator.mediaDevices;
const css=document.createElement('style');css.textContent=`
#recPanel{position:fixed;left:50%;bottom:44px;transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:#fff;border:1px solid #d6dfe2;box-shadow:0 6px 24px #0002;font:600 14px system-ui,sans-serif;color:#22364a;user-select:none}
#recPanel[hidden]{display:none}#recPanel .dot{width:12px;height:12px;border-radius:50%;background:#d33}#recPanel.paused .dot{background:#e0a400}
#recPanel.live .dot{animation:recBlink 1.2s infinite}@keyframes recBlink{50%{opacity:.25}}
#recPanel button{min-height:32px;padding:4px 12px;border-radius:999px;border:1px solid #c9d6da;background:#f4f8f9;font:600 13px system-ui,sans-serif;color:#22364a;cursor:pointer}
#recPanel button.stop{background:#d33;border-color:#d33;color:#fff}#recPanel time{min-width:52px;font-variant-numeric:tabular-nums}
#recSetup{border:1px solid #d6dfe2;border-radius:14px;padding:18px 22px;max-width:420px;font:15px/1.5 system-ui,sans-serif;color:#22364a}
#recSetup h2{margin:0 0 8px;font-size:18px;color:#0e6b63}#recSetup label{display:flex;gap:8px;align-items:center;margin:6px 0}
#recSetup .row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}#recSetup button{min-height:36px;padding:6px 16px;border-radius:8px;border:1px solid #c9d6da;background:#f4f8f9;font-weight:600;cursor:pointer}
#recSetup button.go{background:#d33;border-color:#d33;color:#fff}#recSetup .note{font-size:12.5px;color:#5a6d76;margin:8px 0 0}#recSetup .err{color:#b3261e;font-size:13px;min-height:1em}
#recCount{position:fixed;inset:0;display:grid;place-items:center;z-index:2147483001;font:700 120px system-ui;color:#d33;text-shadow:0 2px 18px #fff;pointer-events:none}`;
document.head.append(css);

const setup=document.createElement('dialog');setup.id='recSetup';setup.innerHTML=`<h2>Ghi hình bài giảng</h2>
<label><input type="checkbox" id="recMic" checked> Thu giọng nói (micro)</label>
<label><input type="checkbox" id="recSys"> Thu cả âm thanh phát trong bài (video, mô phỏng)</label>
<p class="note" id="recWebNote">Trình duyệt sẽ hỏi chọn nội dung cần quay: chọn <b>thẻ này</b> (NoteBoard) rồi bấm Chia sẻ.</p>
<p class="note">Video lưu thẳng vào máy, không tải lên Internet. Nên lưu bài (.nbink) trước khi ghi hình dài.</p>
<p class="err" id="recErr" role="alert"></p>
<div class="row"><button type="button" id="recCancel">Hủy</button><button type="button" class="go" id="recGo">● Bắt đầu ghi</button></div>`;
const panel=document.createElement('div');panel.id='recPanel';panel.hidden=true;panel.innerHTML='<span class="dot"></span><time>00:00</time><button type="button" data-r="pause">Tạm dừng</button><button type="button" class="stop" data-r="stop">■ Dừng và lưu</button>';
document.body.append(setup,panel);
const $=s=>document.querySelector(s),isDesktop=!!window.nbDesktop||/Electron/.test(navigator.userAgent);
if(isDesktop)$('#recWebNote').textContent='Ứng dụng sẽ quay chính cửa sổ NoteBoard Ink.';

let rec=null,streams=[],chunks=[],mime='',startAt=0,paused=0,pauseAt=0,timer=0,audioCtx=null;
const say=t=>{try{toast(t);}catch{}};
function pickType(){const list=['video/mp4;codecs=avc1.42E01F,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
 return list.find(t=>window.MediaRecorder?.isTypeSupported?.(t))||'';}
function clock(){const ms=(rec?.state==='paused'?pauseAt:Date.now())-startAt-paused,s=Math.max(0,Math.floor(ms/1000));
 $('#recPanel time').textContent=(s>=3600?Math.floor(s/3600)+':':'')+String(Math.floor(s/60)%60).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function stopAll(){for(const s of streams)for(const t of s.getTracks())t.stop();streams=[];try{audioCtx?.close();}catch{}audioCtx=null;clearInterval(timer);panel.hidden=true;btn?.classList.remove('on');}

async function begin(){
 const err=$('#recErr');err.textContent='';
 if(!md?.getDisplayMedia||!window.MediaRecorder){err.textContent='Trình duyệt này chưa hỗ trợ ghi hình. Hãy dùng Edge hoặc Chrome bản mới, hoặc bản cài NoteBoard Ink.';return;}
 mime=pickType();
 let screen;
 try{screen=await md.getDisplayMedia({video:{frameRate:30,width:{ideal:1920},height:{ideal:1080}},audio:$('#recSys').checked,preferCurrentTab:true,selfBrowserSurface:'include',surfaceSwitching:'exclude',systemAudio:'include'});}
 catch(e){err.textContent=e.name==='NotAllowedError'?'Chưa được phép quay màn hình. Bấm Bắt đầu ghi và chọn thẻ NoteBoard.':'Không quay được màn hình: '+e.message;return;}
 streams.push(screen);
 let mic=null;
 if($('#recMic').checked){try{mic=await md.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});streams.push(mic);}
  catch(e){say('Không mở được micro, video sẽ không có giọng nói.');}}
 /* Gộp giọng nói và âm thanh trong bài thành một rãnh âm thanh */
 const audios=[screen,mic].filter(s=>s&&s.getAudioTracks().length);let audioTracks=[];
 if(audios.length===1)audioTracks=audios[0].getAudioTracks();
 else if(audios.length>1){audioCtx=new AudioContext();const dest=audioCtx.createMediaStreamDestination();for(const s of audios)audioCtx.createMediaStreamSource(s).connect(dest);audioTracks=dest.stream.getAudioTracks();}
 const out=new MediaStream([...screen.getVideoTracks(),...audioTracks]);
 setup.close();
 /* Đếm ngược 3 giây để giáo viên chuẩn bị */
 const cd=document.createElement('div');cd.id='recCount';document.body.append(cd);
 for(const n of [3,2,1]){cd.textContent=n;await new Promise(r=>setTimeout(r,700));}cd.remove();
 chunks=[];
 try{rec=new MediaRecorder(out,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:2500000,audioBitsPerSecond:128000});}
 catch(e){stopAll();say('Không khởi động được bộ ghi: '+e.message);return;}
 mime=rec.mimeType||mime||'video/webm';
 rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
 rec.onstop=save;
 screen.getVideoTracks()[0].addEventListener('ended',()=>{if(rec&&rec.state!=='inactive')rec.stop();});   /* người dùng bấm "Dừng chia sẻ" của trình duyệt */
 rec.start(1000);startAt=Date.now();paused=0;
 panel.hidden=false;panel.className='live';panel.querySelector('[data-r="pause"]').textContent='Tạm dừng';btn?.classList.add('on');
 clock();timer=setInterval(clock,500);
}
function save(){
 const r=rec;rec=null;stopAll();if(!chunks.length){say('Chưa ghi được hình nào.');return;}
 const ext=/mp4/.test(mime)?'mp4':'webm',blob=new Blob(chunks,{type:mime.split(';')[0]});chunks=[];
 const d=new Date(),p=n=>String(n).padStart(2,'0');
 const name=`Bai-giang-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),120000);
 say(`Đã ghi xong ${(blob.size/1048576).toFixed(1)} MB — lưu thành ${name}`+(ext==='webm'?' (mở được bằng Edge/Chrome, VLC, tải lên YouTube/Zalo được)':''));
 void r;
}
panel.addEventListener('click',e=>{const act=e.target.closest('[data-r]')?.dataset.r;if(!act||!rec)return;
 if(act==='stop'){if(rec.state==='paused')paused+=Date.now()-pauseAt;rec.stop();}
 else if(rec.state==='recording'){rec.pause();pauseAt=Date.now();panel.className='paused';e.target.textContent='Tiếp tục';}
 else if(rec.state==='paused'){rec.resume();paused+=Date.now()-pauseAt;panel.className='live';e.target.textContent='Tạm dừng';}
 clock();});
$('#recCancel').onclick=()=>setup.close();
$('#recGo').onclick=begin;
function open(){if(rec){say('Đang ghi hình. Bấm Dừng và lưu ở thanh đỏ dưới màn hình.');return;}$('#recErr').textContent='';setup.showModal();}

/* Nút ở cột trái, ngay sau Khoanh thông minh */
const btn=document.createElement('button');btn.id='recRail';btn.type='button';btn.className='rail-btn';btn.title='Ghi hình bài giảng thành video (kèm giọng nói)';
btn.innerHTML='<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5l6-3.5v10l-6-3.5z"/><circle cx="7" cy="10" r="1.6" fill="#d33" stroke="none"/></svg><span>Ghi hình</span>';
btn.onclick=open;
const rail=$('#rail');if(rail){const after=$('#smartInkRail');if(after&&after.parentNode===rail)after.after(btn);else rail.prepend(btn);}
const css2=document.createElement('style');css2.textContent='#recRail.on{color:#d33}';document.head.append(css2);
addEventListener('beforeunload',e=>{if(rec&&rec.state!=='inactive'){e.preventDefault();e.returnValue='';}});
window.NBRecorder={open,get recording(){return !!rec;},stop:()=>rec&&rec.state!=='inactive'&&rec.stop()};
})();
