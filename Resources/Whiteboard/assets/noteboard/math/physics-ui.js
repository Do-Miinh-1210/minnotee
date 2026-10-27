/* Local physics library; runtime lives in an opaque sandbox and is loaded only
   while editing one simulation. The board stores a PNG and data-only state. */
(()=>{'use strict';
const C=window.NBPhysics;if(!C)return;
const permitted=()=>window.NBModules?.has('physics')===true;
function deny(){toast('Gói hiện tại chưa có mô phỏng Vật lí. Liên hệ admin để nâng cấp.');}
const base=new URL('physics/',document.currentScript?.src||new URL('math/physics-ui.js',location.href)).href;
const style=document.createElement('style');style.textContent=`
#physicsLab[hidden],.physics-entry[hidden],[data-act=simulation][hidden]{display:none!important}
#physicsLibrary{width:min(1060px,calc(100vw - 24px));height:min(800px,90dvh);padding:0;border:1px solid #bad8cf;border-radius:15px;background:#f7faf9;color:#173f42;font:14px/1.5 system-ui,'Segoe UI',sans-serif}
#physicsLibrary::backdrop{background:#102c4266}#physicsLibrary header{display:flex;gap:12px;align-items:center;padding:16px 20px;background:#fff;border-bottom:1px solid #d9e7e2}#physicsLibrary h2{margin:0;font-size:23px;flex:1}#physicsLibrary header button{background:#e9f3ee;border:1px solid #bfd6cc;border-radius:7px;padding:8px 14px;min-height:40px}
#physicsSearch{width:calc(100% - 40px);margin:14px 20px 10px;padding:11px 14px;border:1px solid #b9d2c8;border-radius:8px;background:#fff;font:inherit;color:inherit;box-sizing:border-box}
#physicsGroups{display:flex;gap:6px;flex-wrap:wrap;padding:0 20px 12px}#physicsGroups button{padding:7px 11px;border:1px solid #c6d9d0;border-radius:18px;background:#fff;min-height:36px;color:#345c51;font:inherit;font-size:12px}#physicsGroups button[aria-pressed=true]{background:#176e60;border-color:#176e60;color:#fff}
#physicsCards{display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:12px;padding:0 20px 22px;overflow:auto;max-height:calc(90dvh - 220px)}.physics-card{display:flex;flex-direction:column;gap:7px;align-items:start;text-align:left;border:1px solid #c9ddd4;border-radius:11px;padding:15px;background:#fff;min-height:145px;color:#173f42;font:inherit;cursor:pointer}.physics-card:hover{border-color:#168b7c;box-shadow:0 3px 15px #173f4214}.physics-card strong{font-size:16px}.physics-card small{color:#658077}.physics-card .physics-badge{font-size:11px;background:#edf5f2;border-radius:5px;padding:2px 7px}.physics-card .physics-action{margin-top:auto;color:#168b7c;font-weight:600}
.txt.pic.simulation-object{background:#fff!important;aspect-ratio:1.45}.simulation-object>img{width:100%;height:100%;object-fit:contain}.simulation-object.physics-live-object{outline:2px solid #168b7c;outline-offset:4px;pointer-events:auto!important;z-index:6!important}.physics-live-object>img{opacity:0}.physics-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;pointer-events:auto}
body.physics-live #ink,body.physics-live #liveInk{pointer-events:none!important}#physicsLiveBar{position:fixed;z-index:68;left:50%;transform:translateX(-50%);bottom:calc(var(--nb-footer-height,34px) + 10px);display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:7px 10px;max-width:calc(100vw - 16px);box-sizing:border-box;border:1px solid #bad7ce;border-radius:10px;background:#fff;color:#173f42;box-shadow:0 4px 20px #173f4230;font:13px/1.4 system-ui}
#physicsLiveBar[hidden],#physicsLibrary[hidden],#physicsExpanded[hidden]{display:none!important}#physicsLiveBar button{padding:7px 10px;border:1px solid #bfd6cd;border-radius:6px;background:#eef7f2;color:#174c40;min-height:36px;font:inherit}#physicsLiveBar button:disabled{opacity:.45}#physicsLiveTitle{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#physicsLiveStatus{flex-basis:100%;font-size:11px;color:#627f74}
#physicsExpanded{position:fixed;z-index:65;inset:8px 8px calc(var(--nb-footer-height,34px) + 115px);background:#fff;border:1px solid #c4dbd1;border-radius:10px;box-shadow:0 4px 35px #102c4230}#physicsExpanded .physics-frame{border-radius:10px}
.physics-entry{width:100%;padding:12px;border:1px solid #a9cfc4;border-radius:8px;color:#174d43;background:#eaf5ef;font:600 14px system-ui;cursor:pointer;margin:0 0 10px;min-height:44px}
@media(max-width:700px){#physicsLibrary{height:92dvh;width:calc(100vw - 12px)}#physicsLibrary header{padding:10px 12px}#physicsLibrary h2{font-size:19px}#physicsGroups{flex-wrap:nowrap;overflow:auto;padding:0 12px 10px}#physicsGroups button{flex:none;min-height:40px}#physicsSearch{margin:10px 12px;width:calc(100% - 24px)}#physicsCards{padding:0 12px 12px;grid-template-columns:1fr;max-height:calc(92dvh - 190px)}.physics-card{min-height:125px}#physicsLiveBar{width:calc(100vw - 12px);bottom:calc(var(--nb-footer-height,34px) + env(safe-area-inset-bottom,0px) + 5px);gap:4px;padding:6px}#physicsLiveBar button{min-height:40px;font-size:12px}#physicsLiveTitle{max-width:100%;width:100%}#physicsExpanded{inset:5px 5px calc(var(--nb-footer-height,34px) + 160px)}}
#physicsLiveBar{top:calc(8px + env(safe-area-inset-top,0px));bottom:auto;width:calc(100vw - 16px);max-width:1280px;gap:7px;flex-wrap:nowrap;padding:8px 10px;z-index:72}
#physicsLiveTitle{flex:1;min-width:0;max-width:none;width:auto;font-size:14px}
#physicsLiveBar button,#physicsMore summary{flex:none;white-space:nowrap;min-height:38px;padding:7px 11px;cursor:pointer}
#physicsLiveBar [hidden]{display:none!important}
#physicsLiveStatus{position:absolute;left:10px;top:calc(100% + 3px);padding:4px 9px;border-radius:5px;background:#fff;font-size:12px;box-shadow:0 1px 5px #173f4220}
#physicsLiveStatus:empty{display:none}
#physicsExpanded{inset:var(--physics-toolbar-bottom,68px) 8px calc(8px + env(safe-area-inset-bottom,0px));z-index:69;overflow:hidden;border-radius:10px}
#physicsMore{position:relative;flex:none;font:inherit}
#physicsMore summary{list-style:none;border:1px solid #bfd6cd;border-radius:6px;background:#eef7f2;box-sizing:border-box}
#physicsMore summary::-webkit-details-marker{display:none}
#physicsMore>div{position:absolute;right:0;top:calc(100% + 8px);width:205px;padding:7px;background:#fff;border:1px solid #bfd6cd;border-radius:9px;box-shadow:0 8px 25px #173f4230;display:grid;gap:5px}
#physicsMore>div button{text-align:left;background:#fff;border:0}
#physicsLiveBar [data-physics=done]{background:#176e60;color:#fff;border-color:#176e60}
@media(max-width:600px){#physicsLiveBar{padding:6px;gap:4px;flex-wrap:wrap}#physicsLiveTitle{flex-basis:100%;font-size:13px}#physicsLiveBar button,#physicsMore summary{min-height:38px;padding:6px 10px;font-size:12px}#physicsLiveBar [data-physics=done]{margin-left:auto}#physicsExpanded{left:5px;right:5px}}
`;document.head.appendChild(style);
const dialog=document.createElement('dialog');dialog.id='physicsLibrary';dialog.innerHTML='<header><h2>Phòng thí nghiệm Vật lí</h2><button type="button" id="physicsLibraryClose" aria-label="Đóng thư viện">Đóng</button></header><input type="search" id="physicsSearch" placeholder="Tìm: lực, con lắc, điện, sóng…" aria-label="Tìm mô phỏng"><nav id="physicsGroups" aria-label="Chủ đề mô phỏng"></nav><div id="physicsCards"></div>';document.body.append(dialog);
const bar=document.createElement('section');bar.id='physicsLiveBar';bar.hidden=true;bar.setAttribute('aria-label','Điều khiển mô phỏng');bar.innerHTML='<strong id="physicsLiveTitle"></strong><button data-physics="play" hidden>▶ Chạy</button><button data-physics="pause" hidden>Ⅱ Dừng</button><button data-physics="expand">Trên bảng</button><details id="physicsMore"><summary>••• Thêm</summary><div><button data-physics="reset">↺ Đặt lại</button><button data-physics="capture">Chụp lên bảng</button><button data-physics="data">Xuất dữ liệu CSV</button><button data-physics="help">Hướng dẫn</button></div></details><button data-physics="done">✓ Xong</button><span id="physicsLiveStatus" role="status"></span>';document.body.append(bar);
const expanded=document.createElement('section');expanded.id='physicsExpanded';expanded.hidden=true;expanded.setAttribute('aria-label','Mô phỏng mở rộng');document.body.append(expanded);
let active=null,group='',request=0,lastCapture=null;
const runtimeCache=new Map();
async function runtimeDocument(id,token){
 if(!permitted())throw Error('Gói hiện tại chưa có mô phỏng Vật lí.');
 const item=C.get(id);
 if(item?.standalone){
  if(!runtimeCache.has(item.source))runtimeCache.set(item.source,fetch(base+item.source,{credentials:'same-origin',cache:'no-cache'}).then(async r=>{if(!r.ok||r.redirected||!/text\/html/.test(r.headers.get('content-type')||'text/html'))throw Error('Không tải được mô phỏng: '+item.title);return r.text();}));
  const raw=await runtimeCache.get(item.source),boot=JSON.stringify({id,token});
  return raw.replace(/<\/head>/i,()=>'<script>window.NBPhysicsBoot='+boot+';</'+'script></head>');   /* chuỗi đưa vào srcdoc: cần thẻ đóng </script> thật */
 }
 const engine=item.three?'space':'flat';
 if(!runtimeCache.has(engine))runtimeCache.set(engine,Promise.all([engine+'.js','player.css'].map(async file=>{const r=await fetch(base+file,{credentials:'same-origin',cache:'no-cache'});if(!r.ok||r.redirected||!/javascript|text\/css/.test(r.headers.get('content-type')||''))throw Error('Không tải được thành phần mô phỏng. Kiểm tra kết nối hoặc đăng nhập lại.');return r.text();})).catch(e=>{runtimeCache.delete(engine);throw e;}));
 const [js,css]=await runtimeCache.get(engine),boot=JSON.stringify({id,token});
 return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css.replace(/<\/style/gi,'<\\/style')+'</style></head><body><p id="playerStatus" role="status">Đang mở mô phỏng…</p><main id="simViewport"><div id="simulation"></div></main><script>window.NBPhysicsBoot='+boot+';<\/script><script>'+js.replace(/<\/script/gi,'<\\/script')+'<\/script></body></html>';
}
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const status=t=>{bar.querySelector('#physicsLiveStatus').textContent=t;};
function renderCards(){
 const search=norm(dialog.querySelector('#physicsSearch').value),cards=dialog.querySelector('#physicsCards');cards.replaceChildren();
 for(const item of C.items.filter(i=>(!group||i.group===group)&&norm(i.title+' '+i.description+' '+C.groups[i.group]).includes(search))){
  const b=document.createElement('button');b.type='button';b.className='physics-card';b.dataset.simulation=item.id;
  const tag=document.createElement('small');tag.textContent=C.groups[item.group];const title=document.createElement('strong');title.textContent=item.title;const desc=document.createElement('span');desc.textContent=item.description;const badge=document.createElement('span');badge.className='physics-badge';badge.textContent=item.three?'3D tương tác':'Tương tác trực tiếp';const action=document.createElement('span');action.className='physics-action';action.textContent='Đặt lên bảng →';b.append(tag,title,desc,badge,action);b.onclick=()=>choose(item);cards.append(b);
 }
 if(!cards.children.length){const p=document.createElement('p');p.textContent='Không có mô phỏng phù hợp. Thử từ khóa khác.';cards.append(p);}
 dialog.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===group)));
}
for(const [id,name] of [['','Tất cả'],...Object.entries(C.groups)]){const b=document.createElement('button');b.type='button';b.dataset.group=id;b.textContent=name;b.onclick=()=>{group=id;renderCards();};dialog.querySelector('#physicsGroups').append(b);}
dialog.querySelector('#physicsSearch').addEventListener('input',renderCards);dialog.querySelector('#physicsLibraryClose').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function openLibrary(){if(!permitted()){deny();return;}finish();window.NBSpatialBoard?.finish();window.NBSmartInk?.finish();window.nbHtmlLive?.exit();group='';dialog.querySelector('#physicsSearch').value='';renderCards();dialog.showModal();dialog.querySelector('#physicsSearch').focus();}
function choose(item){dialog.close();insert({id:item.id});}
function placeholder(item){const c=document.createElement('canvas');c.width=1100;c.height=760;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.fillStyle='#168b7c';g.fillRect(40,55,7,70);g.fillStyle='#173f42';g.font='bold 34px system-ui';g.fillText(item.title,70,100,960);g.font='22px system-ui';g.fillStyle='#627e74';g.fillText('Mô phỏng tương tác · Chọn hình rồi bấm Tương tác',70,160,960);g.fillText(C.groups[item.group],70,210);return c.toDataURL();}
function insert(value,pos){
 if(!permitted()){deny();return null;}
 const scene=C.clean(value);if(!scene)return null;finish();if(!$('#start').classList.contains('off'))start([]);
 const item=C.get(scene.id),w=innerWidth<700?1360:1100,p=pos||placeCentered(w,w/1.45),t=addPic(placeholder(item),p);t.pic={...t.pic,simulation:scene};t.el.classList.add('simulation-object');t.el.style.aspectRatio='1.45';t.el.querySelector('img').alt=item.title;
 historyStates[historyIndex]=snapshot();scheduleSave();enter(t);return t;
}
function send(type,extra={}){if(active)active.frame.contentWindow?.postMessage({nbPhysics:1,token:active.token,type,...extra},'*');}
function expand(on){
 if(!active)return;active.expanded=on;expanded.hidden=false;expanded.style.cssText='';
 const top=bar.getBoundingClientRect().bottom+8;expanded.style.setProperty('--physics-toolbar-bottom',top+'px');
 if(!on){const r=active.target.el.getBoundingClientRect(),w=Math.min(r.width,innerWidth-16),h=Math.min(Math.max(320,r.height),innerHeight-top-10),x=Math.max(8,Math.min(r.left,innerWidth-w-8)),y=Math.max(top,Math.min(r.top,innerHeight-h-8));expanded.style.cssText+='inset:auto;left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px;';}
 bar.querySelector('[data-physics=expand]').textContent=on?'Trên bảng':'Mở rộng';
}
function enter(t){
 if(!permitted()){deny();return;}
 if(!t?.pic?.simulation)return;finish();window.NBSpatialBoard?.finish();window.NBSmartInk?.finish();window.nbHtmlLive?.exit();commitEdit();
 const scene=C.clean(t.pic.simulation);if(!scene)return;const bytes=crypto.getRandomValues(new Uint8Array(16)),token=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join(''),frame=document.createElement('iframe');frame.className='physics-frame';frame.name='nbphysics-'+token;frame.title=C.get(scene.id).title;frame.setAttribute('sandbox','allow-scripts allow-downloads');frame.setAttribute('referrerpolicy','no-referrer');
 active={target:t,scene,frame,token,dirty:false,ready:false,expanded:false,initial:JSON.stringify(scene)};expanded.append(frame);t.el.classList.add('physics-live-object');document.body.classList.add('physics-live');selected=[];apply();bar.hidden=false;bar.querySelector('#physicsLiveTitle').textContent=C.get(scene.id).title;status('Đang mở mô phỏng…');
 bar.querySelector('[data-physics=play]').hidden=bar.querySelector('[data-physics=pause]').hidden=true;bar.querySelector('#physicsMore').open=false;
 const context=active,item=C.get(scene.id);
 if(item?.standalone)frame.src=base+item.source+'#token='+token+'&id='+scene.id;
 else runtimeDocument(scene.id,token).then(html=>{if(active===context)frame.srcdoc=html;}).catch(e=>{if(active===context)status(e.message);});
 const a=active;a.timeout=setTimeout(()=>{if(active===a&&!a.ready)status('Chưa mở được mô phỏng. Bấm Xong rồi mở lại; kiểm tra thành phần mô phỏng đã có trên máy.');},20000);
 expand(true);
}
function commit(){
 if(!active||!active.target.el.isConnected)return;const scene=C.clean(active.scene);if(!scene)return;
 active.target.pic={...active.target.pic,simulation:scene};if(active.dirty){markPages();historyCommit();active.dirty=false;}
}
function finish(){
 if(!active)return;const a=active;send('dispose');clearTimeout(a.timeout);commit();a.frame.remove();a.target.el.classList.remove('physics-live-object');active=null;lastCapture=null;bar.hidden=expanded.hidden=true;document.body.classList.remove('physics-live');if(a.target.el.isConnected){setMode('sel');selected=[a.target];apply();}
}
function requestCapture(action){if(!active||!active.ready)return;const id=String(++request);lastCapture={id,action};send('capture',{requestId:id});status('Đang chụp trạng thái mô phỏng…');}
function updateScene(value){
 const clean=C.clean(value);if(!clean||clean.id!==active.scene.id)return false;
 const changed=JSON.stringify(clean)!==JSON.stringify(active.scene);active.scene=clean;if(changed){active.target.pic={...active.target.pic,simulation:clean};active.dirty=true;markPages();scheduleSave();}return true;
}
addEventListener('message',e=>{
 const a=active,d=e.data;if(!a||e.source!==a.frame.contentWindow||!d||d.nbPhysics!==1||d.token!==a.token)return;
 if(d.type==='ready'){send('init',{scene:a.scene});return;}
 if(d.type==='mounted'){a.ready=true;clearTimeout(a.timeout);status(d.illustrative?'Mô hình minh họa · tham số theo thang đo của mô hình':'');return;}
 if(d.type==='state'&&!updateScene(d.scene))return;
 if(d.type==='state'||d.type==='playback'){bar.querySelector('[data-physics=play]').hidden=!d.canPlay||d.running;bar.querySelector('[data-physics=pause]').hidden=!d.canPlay||!d.running;}
 if(d.type==='preview'){
  if(typeof d.src!=='string'||d.src.length>15e6||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d.src))return;
  if(d.scene&&!updateScene(d.scene))return;
  a.target.pic={...a.target.pic,src:d.src};a.target.el.querySelector('img').src=d.src;
  if(lastCapture&&d.requestId===lastCapture.id){const action=lastCapture.action;lastCapture=null;if(action==='close')finish();else if(action==='insert'){const b=objBox(a.target),src=d.src;finish();const t=addPic(src,{x:b.x0+30,y:b.y0+30,w:b.x1-b.x0});selected=[t];apply();toast('Đã chèn ảnh trạng thái mô phỏng lên bảng.');}else{commit();if(action==='save')saveProject();status('Đã lưu trạng thái và ảnh mô phỏng.');}}
 }
 if(d.type==='capture-error'){status(d.message||'Không chụp được hình.');if(lastCapture?.action==='close')finish();lastCapture=null;}
 if(d.type==='error')status(String(d.message||'Không mở được mô phỏng.').slice(0,300));
 if(d.type==='close')requestCapture('close');
 if(d.type==='save')requestCapture('save');
 if(d.type==='history'){finish();if(d.redo)redoHistory();else undoHistory();}
});
function exportData(){
 if(!active)return;const data=active.scene,lines=['mo_phong,loai,dai_luong,chi_so,gia_tri'];const cell=C.csvCell;
 const walk=(value,key,kind)=>{if(value===null||['number','boolean','string'].includes(typeof value)){lines.push([data.id,kind,key,'',value].map(cell).join(','));return;}if(Array.isArray(value))value.forEach((v,i)=>{if(v&&typeof v==='object')for(const [k,x] of Object.entries(v))if(['number','string','boolean'].includes(typeof x))lines.push([data.id,kind,key+'.'+k,i,x].map(cell).join(','));});else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))walk(v,key?key+'.'+k:k,kind);};
 walk(data.states,'','tham_so');walk(data.refs,'','trang_thai');const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Vat-li-'+data.id+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
bar.addEventListener('click',e=>{const action=e.target.closest('[data-physics]')?.dataset.physics;if(!active||!action)return;bar.querySelector('#physicsMore').open=false;if(action==='done'){if(active.ready){requestCapture('close');const a=active;setTimeout(()=>{if(active===a&&lastCapture?.action==='close')finish();},2500);}else finish();}else if(action==='expand')expand(!active.expanded);else if(action==='capture')requestCapture('insert');else if(action==='data')exportData();else send(action);});
document.addEventListener('pointerdown',e=>{if(active&&!active.target.el.contains(e.target)&&!bar.contains(e.target)&&!expanded.contains(e.target))finish();},true);
document.addEventListener('keydown',e=>{if(dialog.open){e.stopPropagation();return;}if(!active)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}else if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase()))finish();},true);
new MutationObserver(()=>{if(active&&!active.target.el.isConnected)finish();}).observe(board,{childList:true});
addEventListener('resize',()=>{if(active)expand(active.expanded||innerWidth<700);});
new ResizeObserver(()=>{if(active)expand(active.expanded);}).observe(bar);
document.addEventListener('dblclick',e=>{const el=e.target.closest?.('.simulation-object'),t=el&&texts.find(t=>t.el===el);if(t){e.preventDefault();e.stopPropagation();enter(t);}},true);
const edit=document.createElement('button');edit.type='button';edit.dataset.act='simulation';edit.hidden=true;edit.textContent='▶ Tương tác Vật lí';edit.onclick=()=>enter(selected[0]);selBar.prepend(edit);const oldPlace=placeSelBar;placeSelBar=function(){edit.hidden=!(permitted()&&selected.length===1&&selected[0].pic?.simulation);oldPlace();if(!edit.hidden&&!selBar.hidden){const r=selBar.getBoundingClientRect(),min=$('#bar').getBoundingClientRect().bottom+6;if(r.top<min)selBar.style.top=Math.min(min,innerHeight-r.height-40)+'px';}};
const rail=document.createElement('button');rail.id='physicsLab';rail.type='button';rail.className='rail-btn';rail.title='Thư viện mô phỏng Vật lí';rail.innerHTML='<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 3h6 M10 3v6l-6 10q-1 2 2 2h12q3 0 2-2L14 9V3 M7 15h10"/><circle cx="10" cy="17" r="1"/></svg><span>Thí nghiệm</span>';rail.onclick=openLibrary;$('#rail').prepend(rail);
const entry=document.createElement('button');entry.type='button';entry.className='physics-entry';entry.textContent='⚗ Phòng thí nghiệm Vật lí · '+C.items.length+' mô phỏng';entry.onclick=openLibrary;
function syncAccess(){const ok=permitted();rail.hidden=entry.hidden=!ok;if(!ok){edit.hidden=true;if(dialog.open)dialog.close();finish();runtimeCache.clear();}if(typeof apply==='function')apply();}
window.NBModules?.onChange(syncAccess);window.NBModules?.ready.then(syncAccess);syncAccess();
const oldGallery=renderShapeGallery;renderShapeGallery=function(){oldGallery();if(typeof activeCategory!=='undefined'&&['mechanics','electric','optics','waves','magnet','thermo','nuclear'].includes(activeCategory))$('#shapeGallery').prepend(entry);};
window.NBPhysicsBoard={open:openLibrary,insert,enter,finish,exportData,get active(){return active;},get catalog(){return C.items;}};
renderShapeGallery();
})();
