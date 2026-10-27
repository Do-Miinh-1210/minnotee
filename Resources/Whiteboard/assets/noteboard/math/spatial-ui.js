/* Native 3D editor on the lesson board. Loaded after the board bootstrap. */
(()=>{
'use strict';
const G=window.NBSpatial;if(!G)return;
const style=document.createElement('style');style.textContent=`
body.spatial-live #ink,body.spatial-live #liveInk{pointer-events:none!important}
.txt.pic.spatial-object{background:transparent!important}
.spatial-live-object{pointer-events:auto!important;z-index:6!important;outline:2px solid #24847b;outline-offset:4px}
.spatial-live-object img{opacity:0}.spatial-live-object canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;pointer-events:auto;cursor:grab}
#spatialBar{position:fixed;z-index:67;left:50%;transform:translateX(-50%);bottom:calc(var(--nb-footer-height,34px) + 12px);width:fit-content;max-width:min(860px,calc(100vw - 16px));background:#fff;color:#163f42;border:1px solid #b7d6ce;border-radius:10px;box-shadow:0 6px 26px rgba(18,53,60,0.18);padding:5px 8px;font:13px/1.3 'Segoe UI',system-ui,sans-serif;user-select:none}
#spatialBar[hidden],#spatialCreate[hidden]{display:none}
#spatialBar .sp-row{display:flex;gap:4px;flex-wrap:wrap;align-items:center}
.sp-drag-handle{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;background:#eef6f3;border:1px solid #c5ded8;border-radius:6px;cursor:grab;touch-action:none;font-weight:600;font-size:12px;color:#163f42;user-select:none;flex-shrink:0}
.sp-drag-handle:active{cursor:grabbing;background:#d8ece5}
#spatialBar button{min-height:32px;padding:3px 9px;border:1px solid #c9dcd7;border-radius:6px;background:#f6faf8;color:#163f42;font:inherit;font-size:12.5px;font-weight:500;cursor:pointer;user-select:none;white-space:nowrap;line-height:1;transition:background .12s,border-color .12s}
#spatialBar button:hover{background:#e7f3ef;border-color:#9dc7bf}
#spatialBar button:active{background:#d5ebe3}
#spatialBar button[aria-pressed=true]{background:#1e7e72;border-color:#17685e;color:#fff;font-weight:600}
#spatialBar button.sp-done-btn{background:#e5f5f0;border-color:#93c9bd;color:#0e584f;font-weight:600}
#spatialBar button.sp-done-btn:hover{background:#d2eee5}
#spatialHint{margin:3px 2px 0;font-size:11.5px;color:#496863;line-height:1.25;max-width:100%}
#spatialHint:empty{display:none}
#spatialFaces{display:flex;align-items:center;gap:7px;flex-wrap:wrap;border-top:1px solid #e3edea;margin-top:5px;padding:6px 2px}
#spatialFaces[hidden]{display:none}
#spatialFaceName{flex:1 1 180px;font-size:12px;overflow-wrap:anywhere}
#spatialFaces label{display:inline-flex;align-items:center;gap:5px;font-size:12px;white-space:nowrap}
#spatialFaces input[type=color]{width:36px;height:32px;padding:2px;border:1px solid #bdd1cc;border-radius:5px;background:#fff;cursor:pointer}
#spatialFaces input[type=range]{width:90px}
#spatialFaceOpacityValue{min-width:32px}
#spatialFacePalette{display:flex;gap:4px}
#spatialBar #spatialFacePalette button{width:28px;min-height:28px;padding:0;background:var(--face-swatch);border:2px solid #fff;outline:1px solid #b6c9c5;border-radius:50%}
#spatialFacePalette button[aria-pressed=true]{outline:2px solid #174f48;box-shadow:inset 0 0 0 2px #fff}
#spatialFaces button:disabled{opacity:.45;cursor:default}
#spatialBar details{margin-top:3px;border-top:1px solid #e3edea;padding-top:2px}
#spatialBar summary{font-size:11px;color:#1d6f64;cursor:pointer;padding:2px 3px;user-select:none;outline:none}
#spatialBar details>div{display:flex;gap:10px;flex-wrap:wrap;padding:5px 2px;font-size:11.5px}
#spatialBar input[type=range]{width:110px}
#spatialBar input[type=text]{width:200px;max-width:80vw;padding:4px 6px;font-size:12px}
#spatialCreate{width:min(480px,calc(100vw - 24px));border:1px solid #c3d8d2;border-radius:14px;padding:22px;color:#163f42;max-height:85vh;overflow:auto;background:#fff}
#spatialCreate::backdrop{background:#122e3966}#spatialCreate label{display:block;margin:12px 0}#spatialCreate select,#spatialCreate input[type=number]{width:100%;padding:10px;font:inherit;border:1px solid #bdd1cc;border-radius:6px}#spatialCreate .sp-dims{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}#spatialCreate button{min-height:44px;padding:8px 16px;border:1px solid #bdcec8;border-radius:7px;margin:4px;background:#e4f1eb;color:#163f42;font:inherit}
#spatialCreate p{font-size:13px;line-height:1.6}.spatial-entry{width:100%;padding:12px;border:1px solid #a9cfc4;border-radius:8px;color:#174d43;background:#eaf5ef;font:600 14px 'Segoe UI',sans-serif;min-height:44px;cursor:pointer}
@media(max-width:768px){
  #spatialBar{bottom:calc(var(--nb-footer-height,104px) + env(safe-area-inset-bottom,0px) + 6px);width:calc(100vw - 12px);max-width:calc(100vw - 12px);box-sizing:border-box;padding:4px 6px}
  #spatialBar .sp-row{gap:3px;flex-wrap:wrap;justify-content:center}
  #spatialBar button{font-size:11.5px;padding:3px 7px;min-height:32px}
  .sp-drag-handle{font-size:11.5px;padding:2px 6px}
  #spatialFaceName{flex-basis:100%}
  #spatialBar #spatialFacePalette button{width:32px;min-height:32px}
}
`;document.head.appendChild(style);
const dialog=document.createElement('dialog');dialog.id='spatialCreate';dialog.innerHTML=`<h2>Hình không gian 3D</h2><p>Dựng ngay trên bảng. Nét thấy/khuất được tính theo góc nhìn; đoạn thêm và thiết diện cùng xoay với khối.</p><label>Loại khối<select id="spatialKind"></select></label><div class="sp-dims"><label>Rộng<input id="spatialW" type="number" min="0.3" max="5" step="0.1" value="2"></label><label>Cao<input id="spatialH" type="number" min="0.3" max="5" step="0.1" value="2"></label><label>Sâu<input id="spatialD" type="number" min="0.3" max="5" step="0.1" value="2"></label></div><p>Kích thước theo tỉ lệ mô hình, không phải số đo trên giấy. Hình trụ, hình nón và mặt cầu dùng đường kính ở ô Rộng.</p><button type="button" id="spatialPlace">Đặt lên bảng</button><button type="button" id="spatialCancel">Hủy</button>`;
document.body.appendChild(dialog);Object.entries(G.kinds).forEach(([key,name])=>dialog.querySelector('select').add(new Option(name,key)));
const bar=document.createElement('section');bar.id='spatialBar';bar.hidden=true;bar.setAttribute('aria-label','Chỉnh hình không gian 3D');bar.innerHTML=`<div class="sp-row"><div class="sp-drag-handle" title="Kéo để di chuyển thanh công cụ 3D"><svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" style="opacity:.65;flex-shrink:0"><circle cx="4" cy="3" r="1.4"/><circle cx="12" cy="3" r="1.4"/><circle cx="4" cy="8" r="1.4"/><circle cx="12" cy="8" r="1.4"/><circle cx="4" cy="13" r="1.4"/><circle cx="12" cy="13" r="1.4"/></svg><strong>Hình 3D</strong></div><button data-sp="rotate" aria-pressed="true" title="Xoay khối 3D trực tiếp bằng bút hoặc chuột">↻ Xoay</button><button data-sp="segment" aria-pressed="false" title="Vẽ đoạn thẳng nối đỉnh, cạnh hoặc mặt">Đoạn 3D</button><button data-sp="section" aria-pressed="false" title="Dựng mặt phẳng cắt từ 3 điểm">Thiết diện</button><button data-sp="reset" title="Đặt lại góc nhìn chuẩn phía trên đáy">↺ Đặt lại</button><button data-sp="remove" title="Xóa đoạn hoặc thiết diện vừa thêm">⌫ Xóa nét</button><button data-sp="cancel" title="Bỏ các điểm đang chọn">Bỏ chọn</button><button data-sp="done" class="sp-done-btn" title="Hoàn tất và quay về bảng">✓ Xong</button></div><p id="spatialHint" role="status"></p><details><summary>⚙ Tuỳ chọn: góc nhìn, nét khuất, tên đỉnh</summary><div><label>Góc ngang <input id="spatialYaw" aria-label="Góc xoay ngang" type="range" min="-180" max="180" step="1"></label><label>Góc cao <input id="spatialPitch" aria-label="Góc nhìn cao" type="range" min="-80" max="80" step="1"></label><label><input id="spatialTopView" type="checkbox" checked> Giữ góc nhìn phía trên đáy</label><span id="spatialAngles"></span><label><input id="spatialHidden" type="checkbox" checked> Hiện nét khuất</label><label><input id="spatialLabels" type="checkbox" checked> Tên đỉnh</label><label>Màu nét <input id="spatialColor" type="color" value="#111111"></label><label>Tên đỉnh, cách bằng dấu phẩy <input id="spatialNames" type="text" maxlength="300"></label></div></details>`;
document.body.appendChild(bar);
const faceTool=document.createElement('button');faceTool.type='button';faceTool.dataset.sp='face';faceTool.setAttribute('aria-pressed','false');faceTool.title='Chọn mặt đang thấy trên khối và tô màu';faceTool.textContent='▧ Bắt mặt';bar.querySelector('[data-sp=section]').after(faceTool);
const faceControls=document.createElement('div');faceControls.id='spatialFaces';faceControls.hidden=true;
faceControls.innerHTML=`<strong id="spatialFaceName" role="status">Chạm vào mặt khối cần tô màu.</strong><div id="spatialFacePalette" role="group" aria-label="Màu mặt gợi ý"></div><label>Màu <input id="spatialFaceColor" type="color" value="#f0b429" aria-label="Màu mặt"></label><label>Độ đậm <input id="spatialFaceOpacity" type="range" min="5" max="100" step="5" value="30" aria-label="Độ đậm màu mặt"><output id="spatialFaceOpacityValue">30%</output></label><button type="button" id="spatialFaceApply" disabled>Tô màu</button><button type="button" id="spatialFaceClear" disabled>Bỏ màu</button>`;
bar.querySelector('#spatialHint').before(faceControls);
const faceName=faceControls.querySelector('#spatialFaceName'),faceColor=faceControls.querySelector('#spatialFaceColor'),faceOpacity=faceControls.querySelector('#spatialFaceOpacity'),faceOpacityValue=faceControls.querySelector('output'),faceApply=faceControls.querySelector('#spatialFaceApply'),faceClear=faceControls.querySelector('#spatialFaceClear');
for(const [color,name] of [['#f0b429','Vàng'],['#eb5757','Đỏ'],['#2f80ed','Xanh dương'],['#27ae60','Xanh lá'],['#9b51e0','Tím'],['#111111','Đen']]){
 const b=document.createElement('button');b.type='button';b.dataset.faceColor=color;b.style.setProperty('--face-swatch',color);b.title=name;b.setAttribute('aria-label','Màu '+name.toLowerCase());b.setAttribute('aria-pressed',String(color===faceColor.value));faceControls.querySelector('#spatialFacePalette').appendChild(b);
}
let active=null,mode='rotate',pending=[],pointer=null,raf=0,lastFrame=null,selectedFace=null,hoverFace=null;
const hint=text=>{bar.querySelector('#spatialHint').textContent=text;};
let spatialPos=null,isDraggingBar=false,barDragStart=null;
const clampVal=(x,a,b)=>Math.max(a,Math.min(b,x));
const elYaw=bar.querySelector('#spatialYaw'),elPitch=bar.querySelector('#spatialPitch');
const elTopView=bar.querySelector('#spatialTopView'),elAngles=bar.querySelector('#spatialAngles');
const elHidden=bar.querySelector('#spatialHidden'),elLabels=bar.querySelector('#spatialLabels');
const elColor=bar.querySelector('#spatialColor'),elNames=bar.querySelector('#spatialNames');
const elDetails=bar.querySelector('details'),dragHandle=bar.querySelector('.sp-drag-handle');

function startBarDrag(e){
 if(e.button!==0||e.target.closest('button,input,select,summary,label,a'))return;
 e.preventDefault();e.stopPropagation();
 bar.setPointerCapture(e.pointerId);
 const r=bar.getBoundingClientRect();
 isDraggingBar=true;barDragStart={id:e.pointerId,offX:e.clientX-r.left,offY:e.clientY-r.top};
 bar.style.cursor='grabbing';
}
function moveBarDrag(e){
 if(!isDraggingBar||barDragStart?.id!==e.pointerId)return;
 e.preventDefault();e.stopPropagation();
 const w=bar.offsetWidth||400,h=bar.offsetHeight||120;
 const x=clampVal(e.clientX-barDragStart.offX,10,window.innerWidth-w-10);
 const y=clampVal(e.clientY-barDragStart.offY,10,window.innerHeight-h-10);
 bar.style.left=x+'px';bar.style.top=y+'px';bar.style.bottom='auto';bar.style.transform='none';
 spatialPos={x,y};
}
function endBarDrag(e){
 if(isDraggingBar&&barDragStart?.id===e.pointerId){
  isDraggingBar=false;barDragStart=null;bar.style.cursor='';
 }
}
bar.addEventListener('pointerdown',startBarDrag);
bar.addEventListener('pointermove',moveBarDrag);
bar.addEventListener('pointerup',endBarDrag);
bar.addEventListener('pointercancel',endBarDrag);

function render(){
 if(!active)return;const m=active.target?objectMirror(active.target):{x:1,y:1};lastFrame=G.draw(active.canvas,active.scene,{pending,selectedFace:mode==='face'?selectedFace:null,hoverFace:mode==='face'?hoverFace:null,mirror:m});updateFaceInfo();
}
function queue(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;render();});}
function commit(){
 if(!active||!active.target.el.isConnected)return;
 const m=active.target?objectMirror(active.target):{x:1,y:1};
 const s=G.clean(active.scene),preview=document.createElement('canvas');preview.width=960;preview.height=720;G.draw(preview,s,{mirror:m});
 active.target.pic={...active.target.pic,spatial:s,src:preview.toDataURL('image/png')};
 active.target.el.querySelector('img').src=active.target.pic.src;
 markPages();historyCommit();
}
function finish(){
 if(!active)return;if(raf){cancelAnimationFrame(raf);raf=0;}
 if(active.wheelTimer){clearTimeout(active.wheelTimer);active.wheelTimer=0;commit();}
 const t=active.target;active.canvas.remove();t.el.classList.remove('spatial-live-object');active=null;pending=[];pointer=null;lastFrame=null;selectedFace=null;hoverFace=null;
 document.body.classList.remove('spatial-live');bar.hidden=true;
 if(t.el.isConnected){setMode('sel');selected=[t];apply();}
}
function setTool(tool){mode=tool;pending=[];hoverFace=null;bar.querySelectorAll('[data-sp]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sp===tool)));
 faceControls.hidden=tool!=='face';if(active)active.canvas.style.cursor=tool==='rotate'?'grab':'crosshair';
 hint(tool==='rotate'?'':tool==='face'?'Chạm vào mặt đang thấy, chọn màu và độ đậm rồi bấm Tô màu. Xoay khối để chọn mặt phía sau.':tool==='segment'?'Chọn 2 điểm hoặc kéo trên khối để vẽ đoạn 3D.':'Chọn 3 điểm trên đỉnh/cạnh/mặt để xác định thiết diện.');render();fitBar();}
function fitBar(){
 if(!spatialPos||bar.hidden)return;const r=bar.getBoundingClientRect(),x=clampVal(r.left,6,Math.max(6,innerWidth-r.width-6)),y=clampVal(r.top,6,Math.max(6,innerHeight-r.height-6));
 bar.style.left=x+'px';bar.style.top=y+'px';spatialPos={x,y};
}
function updateFaceInfo(){
 if(!active||mode!=='face')return;
 const visible=selectedFace&&lastFrame.facePolygons(selectedFace).length>0,fill=active.scene.faceFills.find(f=>f.id===selectedFace);
 faceName.textContent=selectedFace?lastFrame.faceName(selectedFace)+(visible?'':' · đang khuất'):'Chạm vào mặt khối cần tô màu.';
 faceApply.disabled=!visible;faceClear.disabled=!fill;
}
function syncFaceColor(){faceOpacityValue.value=faceOpacity.value+'%';faceControls.querySelectorAll('[data-face-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.faceColor===faceColor.value)));}
function selectFace(hit){
 selectedFace=hit?.id||null;hoverFace=null;
 const fill=active.scene.faceFills.find(f=>f.id===selectedFace);if(fill){faceColor.value=fill.color;faceOpacity.value=Math.max(5,Math.round(fill.opacity*100));}
 syncFaceColor();render();hint(hit?'Đã chọn '+hit.name+'. Màu bám theo mặt khi xoay khối.':'Chưa bắt được mặt. Chạm bên trong vùng khối, hoặc xoay để thấy mặt cần chọn.');
}
faceColor.addEventListener('input',syncFaceColor);faceOpacity.addEventListener('input',syncFaceColor);
faceControls.querySelector('#spatialFacePalette').addEventListener('click',e=>{const color=e.target.closest('[data-face-color]')?.dataset.faceColor;if(color){faceColor.value=color;syncFaceColor();}});
faceApply.addEventListener('click',()=>{
 if(!active||!selectedFace||!lastFrame.facePolygons(selectedFace).length)return;
 const fill={id:selectedFace,color:faceColor.value,opacity:+faceOpacity.value/100},old=active.scene.faceFills.find(f=>f.id===selectedFace);
 if(old?.color===fill.color&&old.opacity===fill.opacity)return;
 active.scene.faceFills=active.scene.faceFills.filter(f=>f.id!==selectedFace);active.scene.faceFills.push(fill);commit();render();hint('Đã tô '+lastFrame.faceName(selectedFace)+'. Chọn mặt khác để tô tiếp.');
});
faceClear.addEventListener('click',()=>{if(!active||!active.scene.faceFills.some(f=>f.id===selectedFace))return;active.scene.faceFills=active.scene.faceFills.filter(f=>f.id!==selectedFace);commit();render();hint('Đã bỏ màu mặt đang chọn.');});
function fastSync(){
 if(!active)return;const s=active.scene;
 elAngles.textContent=(s.camera.pitch>=0?'Nhìn từ trên · ':'Nhìn từ dưới · ')+Math.round(s.camera.pitch)+'°';
 if(elDetails.open){elYaw.value=s.camera.yaw;elPitch.value=s.camera.pitch;}
}
function sync(){
 if(!active)return;const s=active.scene;
 elYaw.value=s.camera.yaw;elPitch.min=s.topView?8:-80;elPitch.value=s.camera.pitch;elTopView.checked=s.topView;
 elAngles.textContent=(s.camera.pitch>=0?'Nhìn từ trên · ':'Nhìn từ dưới · ')+Math.round(s.camera.pitch)+'°';
 elHidden.checked=s.hidden;elLabels.checked=s.labels;elColor.value=s.color;
 elNames.value=(s.names.length?s.names:G.model(s).names).join(', ');
}
function screenSize(){const r=active.canvas.getBoundingClientRect(),a=active.target.rot||0,w=r.width/(Math.abs(Math.cos(a))+.75*Math.abs(Math.sin(a)));return {r,w,h:w*.75,a};}
function position(e){const {r,w,h,a}=screenSize(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,c=Math.cos(a),s=Math.sin(a),m=objectMirror(active.target);return [960*(.5+m.x*(c*dx+s*dy)/w),720*(.5+m.y*(-s*dx+c*dy)/h)];}
function pick(e){return lastFrame?.pick(...position(e),Math.max(12,16*960/screenSize().w));}
function accept(hit){
 if(!active||!hit){hint('Chọn điểm trên đỉnh, cạnh hoặc mặt khối.');return;}
 if(pending.some(p=>G.norm(G.sub(p,hit.p))<1e-5)){hint('Điểm này đã chọn, hãy chọn điểm khác.');return;}
 pending.push(hit.p);hint('Đã chọn '+['P','Q','R'][pending.length-1]+' · '+hit.name);
 if(mode==='segment'&&pending.length===2){
  if(active.scene.segments.length>=80){pending=[];hint('Tối đa 80 đoạn thêm.');return;}
  const seq=Math.max(0,...active.scene.segments.map(e=>e.seq||0),...active.scene.sections.map(e=>e.seq||0))+1;
  active.scene.segments.push({a:pending[0],b:pending[1],seq});pending=[];commit();hint('Đã thêm đoạn 3D.');
 }else if(mode==='section'&&pending.length===3){
  try{if(active.scene.sections.length>=12)throw Error('Tối đa 12 thiết diện.');const polygon=G.section(active.scene,pending),seq=Math.max(0,...active.scene.segments.map(e=>e.seq||0),...active.scene.sections.map(e=>e.seq||0))+1;active.scene.sections.push({points:pending.map(p=>p.slice()),seq});pending=[];commit();hint(G.model(active.scene).curved?'Đã dựng đường thiết diện.':'Đã dựng thiết diện '+polygon.length+' đỉnh.');}
  catch(e){pending=[];hint(e.message);}
 }
 render();
}
function enter(t){
 if(!t?.pic?.spatial)return;window.NBPhysicsBoard?.finish();finish();window.nbHtmlLive?.exit();commitEdit();
 const scene=G.clean(t.pic.spatial);if(!scene)return;
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=720;canvas.setAttribute('aria-label','Khối 3D tương tác trên bảng');canvas.tabIndex=0;
 t.el.appendChild(canvas);t.el.classList.add('spatial-live-object');document.body.classList.add('spatial-live');
 active={target:t,canvas,scene};selected=[];apply();bar.hidden=false;elDetails.open=false;sync();setTool('rotate');
 if(spatialPos){
  const w=bar.offsetWidth||400,h=bar.offsetHeight||120;
  const x=clampVal(spatialPos.x,10,window.innerWidth-w-10);
  const y=clampVal(spatialPos.y,10,window.innerHeight-h-10);
  bar.style.left=x+'px';bar.style.top=y+'px';bar.style.bottom='auto';bar.style.transform='none';
 }else{
  bar.style.left='50%';bar.style.top='';
  bar.style.bottom=innerWidth<700?'calc(var(--nb-footer-height,104px) + env(safe-area-inset-bottom,0px) + 6px)':'calc(var(--nb-footer-height,34px) + 14px)';
  bar.style.transform='translateX(-50%)';
 }
 if(t.pic.spatial.camera?.pitch!==scene.camera.pitch)commit();
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();if(pointer)return;canvas.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:scene.camera.yaw,pitch:scene.camera.pitch,start:mode==='segment'?pick(e):null,moved:false};});
 canvas.addEventListener('pointermove',e=>{
  if(!pointer){if(mode==='face'&&e.pointerType!=='touch'){const hit=lastFrame?.pickFace(...position(e)),id=hit?.id||null;if(id!==hoverFace){hoverFace=id;queue();}}return;}
  if(pointer.id!==e.pointerId)return;e.preventDefault();
  const ev=(e.getCoalescedEvents&&e.getCoalescedEvents().length)?e.getCoalescedEvents().at(-1):e;
  const dx=ev.clientX-pointer.x,dy=ev.clientY-pointer.y;
  if(Math.hypot(dx,dy)>3)pointer.moved=true;
  if(mode==='rotate'){
   const a=active.target.rot||0,m=objectMirror(active.target),localX=m.x*(Math.cos(a)*dx+Math.sin(a)*dy),localY=m.y*(-Math.sin(a)*dx+Math.cos(a)*dy);
   scene.camera.yaw=((pointer.yaw-localX*.45+540)%360)-180;
   scene.camera.pitch=Math.max(scene.topView?8:-80,Math.min(80,pointer.pitch+localY*.35));
   fastSync();
   render();
  }
 });
 canvas.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();const start=pointer.start,moved=pointer.moved;pointer=null;
  if(mode==='rotate'){render();if(moved)commit();}
  else if(mode==='face'){if(!moved)selectFace(lastFrame?.pickFace(...position(e)));}
  else if(mode==='segment'&&moved&&start){pending=[];const end=pick(e);if(end){accept(start);accept(end);}else hint('Thả bút lên đỉnh, cạnh hoặc mặt của khối.');}
  else accept(pick(e));
 });
 canvas.addEventListener('pointercancel',()=>{if(pointer&&mode==='rotate'){scene.camera.yaw=pointer.yaw;scene.camera.pitch=pointer.pitch;render();sync();}pointer=null;});
 canvas.addEventListener('lostpointercapture',()=>{if(pointer){if(mode==='rotate'){scene.camera.yaw=pointer.yaw;scene.camera.pitch=pointer.pitch;render();sync();}pointer=null;}});
 canvas.addEventListener('pointerleave',()=>{if(hoverFace){hoverFace=null;queue();}});
 canvas.addEventListener('wheel',e=>{e.preventDefault();scene.camera.zoom=Math.max(.55,Math.min(2,scene.camera.zoom*(e.deltaY>0?.93:1.07)));render();clearTimeout(active.wheelTimer);const context=active;active.wheelTimer=setTimeout(()=>{if(active===context){context.wheelTimer=0;commit();}},250);},{passive:false});
 canvas.focus({preventScroll:true});
}
function insert(scene,pos){
 finish();const preview=document.createElement('canvas');preview.width=960;preview.height=720;G.draw(preview,scene);
 const size=innerWidth<700?1360:720,p=pos||placeCentered(size,size*.75),t=addPic(preview.toDataURL('image/png'),p);t.pic={...t.pic,spatial:G.clean(scene)};t.el.classList.add('spatial-object');t.el.querySelector('img').alt='Hình không gian 3D';
 // Keep metadata in the very first insertion history entry, not a separate edit.
 historyStates[historyIndex]=snapshot();scheduleSave();enter(t);return t;
}
function open(kind){finish();if(kindsMap[kind])kind=kindsMap[kind];dialog.querySelector('#spatialKind').value=G.kinds[kind]?kind:'cube';dimensions();dialog.showModal();}
function dimensions(){const kind=dialog.querySelector('#spatialKind').value;dialog.querySelector('#spatialH').disabled=['cube','sphere'].includes(kind);dialog.querySelector('#spatialD').disabled=['cube','sphere','cylinder','cone'].includes(kind);}
dialog.querySelector('#spatialKind').addEventListener('change',dimensions);
dialog.querySelector('#spatialCancel').onclick=()=>dialog.close();
dialog.querySelector('#spatialPlace').onclick=()=>{
 if(!$('#start').classList.contains('off'))start([]);
 const scene=G.create(dialog.querySelector('#spatialKind').value);
 scene.w=Math.max(.3,Math.min(5,+dialog.querySelector('#spatialW').value||2));scene.h=Math.max(.3,Math.min(5,+dialog.querySelector('#spatialH').value||2));scene.d=Math.max(.3,Math.min(5,+dialog.querySelector('#spatialD').value||2));
 dialog.close();insert(scene);
};
bar.addEventListener('click',e=>{const tool=e.target.closest('[data-sp]')?.dataset.sp;if(!tool||!active)return;
 if(['rotate','segment','section','face'].includes(tool))setTool(tool);
 else if(tool==='reset'){active.scene.topView=true;active.scene.camera=G.create(active.scene.kind).camera;pending=[];sync();render();commit();hint('Đã đặt lại góc nhìn phía trên đáy.');}
 else if(tool==='done')finish();else if(tool==='cancel'){pending=[];selectedFace=null;hoverFace=null;render();hint('Đã bỏ chọn.');}
 else if(tool==='remove'){pending=[];if((active.scene.sections.at(-1)?.seq||0)>(active.scene.segments.at(-1)?.seq||0))active.scene.sections.pop();else active.scene.segments.pop();commit();render();hint('Đã xóa nét thêm gần nhất.');}
});
for(const [id,key] of [['spatialTopView','topView'],['spatialHidden','hidden'],['spatialLabels','labels'],['spatialColor','color']])bar.querySelector('#'+id).addEventListener('change',e=>{if(!active)return;active.scene[key]=e.target.type==='checkbox'?e.target.checked:e.target.value;if(key==='topView'){active.scene.camera.pitch=Math.max(active.scene.topView?8:-80,active.scene.camera.pitch);sync();}render();commit();});
for(const [id,key] of [['spatialYaw','yaw'],['spatialPitch','pitch']]){
 bar.querySelector('#'+id).addEventListener('input',e=>{if(active){active.scene.camera[key]=+e.target.value;sync();queue();}});
 bar.querySelector('#'+id).addEventListener('change',()=>{if(active){render();commit();}});
}
bar.querySelector('#spatialNames').addEventListener('change',e=>{if(!active)return;active.scene.names=e.target.value.split(',');active.scene.names=G.clean(active.scene).names;sync();render();commit();});
document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}else if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase()))finish();},true);
/* Bam ra ngoai: ket thuc sua 3D. Neu bam vao nut/thanh ben thi doi luot bam xong moi ket thuc,
   vi finish() ve lai bang hinh va se thay nut dang bam, lam mat luot bam dau tien. */
document.addEventListener('pointerdown',e=>{if(!active||active.target.el.contains(e.target)||bar.contains(e.target))return;
 if(e.target.closest?.('button,a,input,select,label,#studioPanel,#bar,#rail'))addEventListener('pointerup',()=>setTimeout(finish,0),{once:true,capture:true});else finish();},true);
new MutationObserver(()=>{if(active&&!active.target.el.isConnected)finish();}).observe(board,{childList:true});
const edit=document.createElement('button');edit.type='button';edit.id='spatialEdit';edit.hidden=true;edit.textContent='↻ Chỉnh 3D';edit.title='Xoay, thêm đoạn và dựng thiết diện ngay trên bảng';edit.onclick=()=>enter(selected[0]);selBar.prepend(edit);
const paint=document.createElement('button');paint.type='button';paint.id='spatialPaint';paint.hidden=true;paint.textContent='▧ Tô mặt';paint.title='Bắt mặt hình không gian và tô màu';paint.onclick=()=>{enter(selected[0]);setTool('face');};edit.after(paint);
const oldPlace=placeSelBar;placeSelBar=function(){edit.hidden=paint.hidden=!(selected.length===1&&selected[0].pic?.spatial);oldPlace();};
const kindsMap={mCube:'cube',mPrism4:'box',mPyramid:'pyramid',mTetra:'tetra',mPrism:'prism3',mCylinder:'cylinder',mCone:'cone',mSphere:'sphere'};
function getKind(k){
 if(!k)return null;
 if(kindsMap[k])return kindsMap[k];
 if(G.kinds[k])return k;
 if(typeof k==='string'&&k.startsWith('spatial_')){
  const sub=k.slice(8);
  if(kindsMap[sub])return kindsMap[sub];
  if(G.kinds[sub])return sub;
 }
 return null;
}
const launcher=document.createElement('button');launcher.id='spatialOpen';launcher.type='button';launcher.className='spatial-entry';launcher.textContent='✎ Kéo trên bảng để vẽ hình 3D';
launcher.onclick=()=>{
 shape='mCube';if($('#shape'))$('#shape').value='mCube';setMode('shape');
 if(innerWidth<1000&&$('#panelClose'))$('#panelClose').click();
 if(typeof toast==='function')toast('Kéo trên bảng để vẽ hình 3D');
};
const oldGallery=renderShapeGallery;renderShapeGallery=function(){oldGallery();if(activeCategory==='mSpace')$('#shapeGallery').prepend(launcher);};
const rail=document.createElement('button');rail.type='button';rail.id='spatialRail';rail.className='rail-btn';rail.dataset.panel='physics';rail.title='Công cụ vẽ: thước, com-pa, hình học, hình 3D và hình các môn';rail.setAttribute('aria-label','Công cụ vẽ');rail.innerHTML='<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17.5 17.5 3l3.5 3.5L6.5 21H3z"/><path d="m6.5 14 1.6 1.6M9.5 11l1.6 1.6M12.5 8l1.6 1.6"/><path d="M14 21h7M17.5 17.5V21"/></svg><span>Công cụ</span>';
/* Cột trái "Công cụ": mở bảng công cụ (thanh cá nhân và thư viện hình theo môn, có Hình 3D) */
rail.onclick=()=>{const b=document.getElementById('mShape');if(b)b.click();else draw3D();};
function draw3D(){
 const panel=document.getElementById('studioPanel');
 if(panel&&!panel.classList.contains('closed')&&typeof activePanel!=='undefined'&&activePanel==='physics'){
  if(typeof showPanel==='function')showPanel('physics',true);
  return;
 }
 if(typeof pickCategory==='function')pickCategory('mSpace');
 if(typeof showPanel==='function')showPanel('physics',false);
 shape=kindsMap[shape]?shape:'mCube';if($('#shape'))$('#shape').value=shape;setMode('shape');
 if(innerWidth<1000&&$('#panelClose'))$('#panelClose').click();
 if(typeof toast==='function')toast('Kéo trên bảng để vẽ hình 3D');
}
$('#rail').prepend(rail);
window.NBSpatialBoard={open,insert,enter,finish,draw:draw3D,getKind,kindsMap,get active(){return active;},get view(){return lastFrame;},get mode(){return mode;}};
renderShapeGallery();
})();
