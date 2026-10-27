/* Personal native drawing shelf. No network, no change to document contents. */
(async()=>{
'use strict';
const box=document.querySelector('#commonTools'),tabs=document.querySelector('#subjectTabs');if(!box||!tabs)return;
const DEFAULT=['gPoint','gSegment','gLine','arrow','axes','axesFull','mAngle','mRuler','mCompass','mSetSquare','mProtractor'];
const LABELS={gPoint:'Điểm',gSegment:'Đoạn thẳng',gLine:'Đường thẳng',arrow:'Véc tơ',axes:'Oxy: miền dương',axesFull:'Oxy: âm và dương',mAngle:'Góc',mRuler:'Thước thẳng',mCompass:'Com-pa',mSetSquare:'Ê ke',mProtractor:'Đo góc'};
const registry=new Map();
for(const [id,label,category] of PHYSICS_SHAPES){const existing=registry.get(id);if(existing)existing.aliases.push(label);else registry.set(id,{id,label:LABELS[id]||label,category,aliases:[label]});}
const originalButtons=new Map([...box.querySelectorAll('[data-gtool]')].map(b=>[b.dataset.gtool,b]));
for(const [id,b] of originalButtons)if(!registry.has(id))registry.set(id,{id,label:LABELS[id]||b.textContent.trim(),category:'basic'});
const shapeSelect=document.querySelector('#shape'),knownOptions=new Set([...shapeSelect.options].map(o=>o.value));
for(const entry of registry.values())if(!knownOptions.has(entry.id)){shapeSelect.add(new Option(entry.label,entry.id));knownOptions.add(entry.id);}
let account=document.querySelector('meta[name="noteboard-account"]')?.content||'';
if(!account&&window.nbToolPrefs?.account){try{account=await nbToolPrefs.account()||'';}catch{}}
const key='noteboard.tool-shelf.v1:'+(/^[a-f0-9]{24}$/.test(account)?account:'local');
function clean(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.items)||raw.items.length>24)return null;
 return [...new Set(raw.items.filter(id=>typeof id==='string'&&registry.has(id)))];
}
function load(){try{return clean(JSON.parse(localStorage.getItem(key)))??DEFAULT.slice();}catch{return DEFAULT.slice();}}
let items=load(),draft=null;
const css=document.createElement('style');css.textContent=`
#commonTools.tool-shelf{padding:12px;background:#f8fbfa;border-color:#d7e8e2;margin-bottom:14px}
.tool-shelf .ct-head{letter-spacing:0;text-transform:none;font-size:13px;color:#284e4b;gap:5px;flex-wrap:wrap}
.tool-shelf .shelf-customize{font:600 11px 'Segoe UI',sans-serif;border:1px solid #bad8cc;border-radius:6px;padding:7px 9px;background:#fff;color:#176f63;min-height:34px;cursor:pointer}
.tool-shelf .shelf-customize:hover{background:#f0f8f5;border-color:#168b82}
.tool-shelf .ct-tools{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:10px 0}
.tool-shelf .ct-tools.shelf-default{grid-template-columns:repeat(6,minmax(0,1fr))}.shelf-default>.ct-tool{grid-column:span 2}.shelf-default>.shelf-measure{grid-column:span 3}.shelf-divider{grid-column:1/-1;font-size:10px;font-weight:600;color:#778a83;margin:6px 0 1px}
.tool-shelf .ct-tool{min-width:0;min-height:66px;justify-content:center;padding:7px 3px;font-size:10.5px;line-height:1.3;cursor:pointer}
.tool-shelf .ct-tool span{text-align:center;overflow-wrap:anywhere}.tool-shelf .ct-tool:focus-visible{outline:2px solid #168b82;outline-offset:2px}
.tool-shelf .ct-tool svg{width:45px;height:28px}.tool-shelf .shelf-note{font-size:10px;line-height:1.5;color:#748780;margin:5px 0}
.tool-shelf .ct-style{border-top:1px solid #dfeae5;padding-top:8px}.tool-shelf .ct-snap-btn{font-size:10px;min-height:30px;order:5;margin-top:6px}
#toolLibrary{margin-top:12px;border-top:1px solid #e2e9e6;padding-top:12px}#toolLibrary>summary{cursor:pointer;color:#4a6665;font:600 12px 'Segoe UI',sans-serif;padding:7px 0 13px}
#toolLibrary>summary small{display:block;color:#85958e;font-size:10px;font-weight:400;margin:5px 0 0 15px}

#toolShelfSettings{width:min(920px,calc(100vw - 20px));max-height:88dvh;box-sizing:border-box;overflow:auto;border:1px solid #b7d1c7;border-radius:14px;padding:20px 22px;background:#fff;color:#284b4b;font:14px/1.5 'Segoe UI',sans-serif;box-shadow:0 20px 50px rgba(22,60,56,.25)}
#toolShelfSettings::backdrop{background:#173c4566}
#toolShelfSettings h2{font-size:19px;margin:0 0 4px;color:#184a44;display:flex;align-items:center;gap:8px}
#toolShelfSettings p.shelf-desc{font-size:12px;color:#6b827b;margin:0 0 14px;line-height:1.45}

.shelf-two-panels{display:grid;grid-template-columns:1.2fr 46px 1fr;gap:12px;align-items:stretch;min-height:430px}
@media(max-width:768px){.shelf-two-panels{grid-template-columns:1fr;gap:10px}}

.shelf-region{display:flex;flex-direction:column;border:1px solid #d8e8e1;border-radius:10px;background:#f9fbfb;padding:12px;min-width:0}
.shelf-region-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-weight:600;font-size:13px;color:#204e49}
.shelf-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;background:#e2f0eb;color:#186f63}

.shelf-search-wrap{position:relative;margin-bottom:8px}
#shelfSearch{width:100%;box-sizing:border-box;border:1px solid #c2dbd1;border-radius:6px;padding:7px 10px;font-size:12.5px;color:#284b4b;background:#fff}
#shelfSearch:focus{outline:none;border-color:#168b82;box-shadow:0 0 0 2px #168b8222}

.shelf-cat-chips{display:flex;gap:4px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px}
.shelf-chip{border:1px solid #cce0d8;background:#fff;color:#356059;padding:4px 9px;border-radius:14px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;user-select:none;transition:all .15s}
.shelf-chip:hover{background:#eef6f3;border-color:#168b82}
.shelf-chip.active{background:#168b82;color:#fff;border-color:#168b82}

#shelfCardPool{flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(122px,1fr));grid-auto-rows:minmax(92px,auto);align-content:start;gap:8px;min-height:190px;max-height:clamp(190px,calc(100vh - 510px),480px);overflow-y:auto;padding:3px;border:1px solid #e1ede8;border-radius:8px;background:#fff}
.shelf-card{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:3px;padding:9px 6px 7px;border:1px solid #e2ebe7;border-radius:7px;background:#fff;cursor:grab;user-select:none;transition:all .12s;text-align:center;min-height:92px;box-sizing:border-box;position:relative}
.shelf-card:hover{border-color:#168b82;background:#f5faf8;transform:translateY(-1px);box-shadow:0 3px 8px rgba(22,139,130,.12)}
.shelf-card.is-selected{border-color:#168b82;background:#ebf7f4;box-shadow:0 0 0 1.5px #168b82}
.shelf-card.is-dragging{opacity:.35;transform:scale(.95)}
.shelf-card-icon{width:52px;height:30px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.shelf-card-icon svg{width:100%;height:100%;stroke:#1c5a52;fill:none}
.shelf-card-title{font-size:12.5px;font-weight:600;color:#17423d;margin-top:2px;line-height:1.3;flex-shrink:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.shelf-card-sub{font-size:10.5px;color:#5f7a72;margin-top:auto;flex-shrink:0}

.shelf-select-box{margin-top:8px}
.shelf-select-box label{display:block;font-size:11px;font-weight:600;color:#6b827b;margin-bottom:3px}
#shelfAvailable{display:block;width:100%;box-sizing:border-box;border:1px solid #c2dbd1;border-radius:6px;padding:4px;font-size:11.5px;color:#284b4b;background:#fff;max-height:65px}

.shelf-mid-controls{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px}
@media(max-width:768px){.shelf-mid-controls{flex-direction:row;justify-content:center;padding:4px 0}}
.shelf-mid-btn{width:42px;height:40px;border-radius:8px;border:1px solid #c6dcd2;background:#fff;color:#1c5d54;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.shelf-mid-btn:hover:not(:disabled){background:#eaf4f0;border-color:#168b82;color:#168b82}
.shelf-mid-btn:disabled{opacity:.35;cursor:default}
#shelfAdd{background:#168b82;color:#fff;border-color:#168b82}
#shelfAdd:hover:not(:disabled){background:#12746c}

.shelf-hint{font-size:11px;color:#7e948c;margin-bottom:6px;line-height:1.35}
#shelfSelected{flex:1;padding:0;list-style:none;margin:0;display:flex;flex-direction:column;gap:5px;max-height:300px;overflow-y:auto;border:1px solid #e1ede8;border-radius:8px;background:#fff;padding:4px}
#shelfSelected.is-drag-over{border-color:#168b82;background:#f3faf8}
.shelf-chosen-item{display:flex;align-items:center;gap:6px;padding:5px 7px;border:1px solid #e2ece7;border-radius:6px;background:#fafcfb;cursor:grab;user-select:none;transition:all .12s}
.shelf-chosen-item:hover{border-color:#bad6cb;background:#f4f9f7}
.shelf-chosen-item.is-selected{border-color:#168b82;background:#ecf6f4}
.shelf-chosen-item.is-dragging{opacity:.3;background:#e0ede8}
.shelf-chosen-item.drop-before{border-top:2.5px solid #168b82}
.shelf-chosen-item.drop-after{border-bottom:2.5px solid #168b82}
.shelf-grip{color:#9cb0a8;font-size:13px;cursor:grab;padding:0 2px}
.shelf-num{font-size:11px;color:#859a92;min-width:18px}
.shelf-chosen-icon{width:32px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.shelf-chosen-icon svg{width:100%;height:100%;stroke:#1c5a52;fill:none}
.shelf-chosen-label{flex:1;min-width:0;font-size:12px;font-weight:600;color:#284b4b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.shelf-order{min-width:28px;height:28px;padding:0 4px;font-size:12px;border:1px solid #cce0d7;background:#fff;color:#284b4b;border-radius:5px;cursor:pointer}
.shelf-order:hover:not(:disabled){background:#eef6f3;border-color:#168b82}
.shelf-order:disabled{opacity:.3;cursor:default}
.shelf-empty-hint{padding:24px 12px;text-align:center;font-size:12px;color:#8ba098;font-style:italic}

.shelf-region-available.is-drag-target{border-color:#c8564a;background:#fdf5f4}
#shelfSettingsError{font-size:12px;font-weight:600;color:#204e49;margin:8px 0 0;min-height:18px}
.shelf-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid #e4ede9}
.shelf-actions-right{display:flex;gap:8px}
#toolShelfSettings button.shelf-btn{border:1px solid #c6dcd2;background:#f1f7f4;color:#235d54;border-radius:6px;min-height:36px;padding:6px 14px;cursor:pointer;font:600 12.5px 'Segoe UI',sans-serif}
#toolShelfSettings button.shelf-btn:hover{background:#e3f0ea}
#toolShelfSettings button.shelf-primary{background:#168b82;color:#fff;border-color:#168b82}
#toolShelfSettings button.shelf-primary:hover{background:#12746c}
@media(max-width:600px){#toolShelfSettings{padding:14px}#toolShelfSettings .shelf-order{min-height:36px;min-width:36px}}
`;document.head.append(css);

// Put the frequent tools before the subject library, preserving every existing node/listener.
const section=tabs.parentElement;section.insertBefore(box,tabs);box.classList.add('tool-shelf');
const library=document.createElement('details');library.id='toolLibrary';
const summary=document.createElement('summary');summary.textContent='Thư viện hình theo môn học';
const libraryNote=document.createElement('small');libraryNote.textContent='Toán · Vật lí · Hóa học · Sinh học · Tiếng Anh';summary.append(libraryNote);library.append(summary);
box.insertAdjacentElement('afterend',library);
try{library.open=localStorage.getItem(key+':library')==='1';}catch{}
library.addEventListener('toggle',()=>{try{localStorage.setItem(key+':library',library.open?'1':'0');}catch{}});
for(const selector of ['#shapeIntro','#subjectTabs','#categoryTabs','label[for="shape"]','#shape','#shapeHint','#shapeGallery','.physics-tip']){
 const node=section.querySelector(selector);if(node&&!box.contains(node))library.append(node);
}
const title=box.querySelector('.ct-head>span');title.textContent='Công cụ của tôi';
const customize=document.createElement('button');customize.type='button';customize.className='shelf-customize';customize.id='customizeTools';customize.textContent='Tùy biến';customize.setAttribute('aria-haspopup','dialog');
const snap=box.querySelector('#ctSnapBtn');box.querySelector('.ct-head').append(customize);box.querySelector('.ct-style').append(snap);
const note=document.createElement('p');note.className='shelf-note';note.textContent='Chọn công cụ rồi thao tác trực tiếp trên bảng.';box.querySelector('.ct-tools').insertAdjacentElement('afterend',note);

function preview(id){
 const keep=shapeLW;let points;try{shapeLW=.9;points=shapePts(id,{x:8,y:6},{x:82,y:48},false);}catch{points=[];}finally{shapeLW=keep;}
 let line='',fill='',f=false;
 for(let i=0;i<points.length;i++){const p=points[i];if(!i||p.break)f=!!p.f;const part=(!i||p.break?'M':'L')+p.x.toFixed(2)+' '+p.y.toFixed(2)+' ';if(f)fill+=part;else line+=part;}
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 90 56');svg.setAttribute('aria-hidden','true');
 for(const [d,isFill] of [[line,false],[fill,true]]){if(!d)continue;const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',isFill?d.replace(/ M/g,' Z M')+'Z':d);path.setAttribute('fill',isFill?'currentColor':'none');path.setAttribute('stroke',isFill?'none':'currentColor');path.setAttribute('stroke-width','1.7');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);}
 return svg;
}
function button(id){
 let b=originalButtons.get(id);const entry=registry.get(id);
 if(!b){b=document.createElement('button');b.type='button';b.className='ct-tool';b.dataset.gtool=id;b.append(preview(id),document.createElement('span'));b.title=entry.label+' — kéo trên bảng để vẽ';b.onclick=()=>{shape=id;document.querySelector('#shape').value=id;setMode('shape');};originalButtons.set(id,b);}
 if(!b.dataset.shelfWired){const choose=b.onclick;b.onclick=e=>{document.querySelector('#shape').value=id;choose?.call(b,e);if(innerWidth<1000)document.querySelector('#panelClose').click();};b.dataset.shelfWired='1';}
 b.classList.toggle('shelf-measure',['mRuler','mCompass','mSetSquare','mProtractor'].includes(id));b.querySelector('span').textContent=entry.label;b.setAttribute('aria-label',entry.label);return b;
}
function refresh(){box.hidden=false;if(activePanel==='physics')document.querySelector('#panelTitle').textContent='Công cụ & hình vẽ';for(const b of box.querySelectorAll('[data-gtool]')){const on=mode==='shape'&&shape===b.dataset.gtool;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}}
function render(){const host=box.querySelector('.ct-tools'),isDefault=items.length===DEFAULT.length&&items.every((id,i)=>id===DEFAULT[i]),nodes=items.map(button);host.classList.toggle('shelf-default',isDefault);if(isDefault){const divider=document.createElement('div');divider.className='shelf-divider';divider.textContent='Dụng cụ đo và vẽ';nodes.splice(6,0,divider);}host.replaceChildren(...nodes);note.textContent=items.length?'Chọn công cụ rồi thao tác trực tiếp trên bảng.':'Chưa ghim công cụ. Chọn “Tùy biến” để thêm.';refresh();}
const previousGallery=renderShapeGallery;renderShapeGallery=function(){previousGallery();refresh();};render();

const dialog=document.createElement('dialog');dialog.id='toolShelfSettings';dialog.setAttribute('aria-labelledby','shelfSettingsTitle');
dialog.innerHTML=`
<div class="shelf-modal-head">
 <h2 id="shelfSettingsTitle">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
  Tùy biến thanh công cụ cá nhân
 </h2>
 <p class="shelf-desc">Kéo thả công cụ từ bên trái sang bên phải để thêm vào thanh công cụ, hoặc kéo thả để sắp xếp thứ tự giống Word và GeoGebra. Thiết lập lưu riêng trên thiết bị này.</p>
</div>
<div class="shelf-two-panels">
 <section class="shelf-region shelf-region-available" aria-label="Các công cụ có sẵn">
  <div class="shelf-region-header">
   <span>Kho công cụ</span>
   <span class="shelf-badge" id="shelfAvailableBadge">0 công cụ</span>
  </div>
  <div class="shelf-search-wrap">
   <input id="shelfSearch" type="search" placeholder="Tìm công cụ trong thư viện (thước, elip, thấu kính...)" maxlength="80" aria-label="Tìm kiếm công cụ">
  </div>
  <div class="shelf-cat-chips" role="tablist" aria-label="Lọc theo nhóm môn học">
   <button type="button" class="shelf-chip active" data-cat="all">Tất cả</button>
   <button type="button" class="shelf-chip" data-cat="math">Toán & Đo</button>
   <button type="button" class="shelf-chip" data-cat="space">Hình 3D</button>
   <button type="button" class="shelf-chip" data-cat="physics">Vật lí</button>
   <button type="button" class="shelf-chip" data-cat="chem">Hóa học</button>
   <button type="button" class="shelf-chip" data-cat="bio">Sinh học</button>
  </div>
  <div id="shelfCardPool" aria-label="Danh sách công cụ có thể kéo thả"></div>
  <div class="shelf-select-box">
   <label for="shelfAvailable">Hoặc chọn từ danh sách văn bản:</label>
   <select id="shelfAvailable" size="3" aria-label="Công cụ có thể thêm"></select>
  </div>
 </section>
 <div class="shelf-mid-controls" aria-label="Thao tác chuyển công cụ">
  <button type="button" id="shelfAdd" class="shelf-mid-btn" title="Thêm công cụ đã chọn sang thanh cá nhân (hoặc kéo thả / nhấp đúp)">➔</button>
  <button type="button" id="shelfRemoveSelected" class="shelf-mid-btn" title="Bỏ công cụ khỏi thanh cá nhân">←</button>
 </div>
 <section class="shelf-region shelf-region-chosen" aria-label="Công cụ hay dùng">
  <div class="shelf-region-header">
   <span>Công cụ hay dùng</span>
   <span class="shelf-badge" id="shelfChosenBadge">10/24</span>
  </div>
  <p class="shelf-hint">Kéo thả từ bên trái vào đây để thêm; kéo để đổi thứ tự; kéo sang trái để bỏ.</p>
  <ol id="shelfSelected" aria-label="Thứ tự công cụ"></ol>
  <p id="shelfSettingsError" role="status" aria-live="polite"></p>
 </section>
</div>
<div class="shelf-actions">
 <button type="button" id="shelfReset" class="shelf-btn">Khôi phục mặc định</button>
 <div class="shelf-actions-right">
  <button type="button" id="shelfCancel" class="shelf-btn">Hủy</button>
  <button type="button" id="shelfSave" class="shelf-btn shelf-primary">Lưu thay đổi</button>
 </div>
</div>
`;
document.body.append(dialog);

const q=id=>dialog.querySelector('#'+id),fold=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9]/g,'');
function category(entry){return entry.category==='basic'?'Cơ bản':Object.values(SUBJECTS).flatMap(s=>s.cats.map(([id,label])=>({id,label:s.l+' · '+label}))).find(c=>c.id===entry.category)?.label||'Công cụ chung';}
let activeCat='all',selectedCardId=null,selectedChosenId=null;

function matchesCategory(entry,cat){
 if(cat==='all')return true;
 if(cat==='math')return ['basic','mPlane','mGraph','mStat','mTools'].includes(entry.category);
 if(cat==='space')return entry.category==='mSpace';
 if(cat==='physics')return ['mechanics','electric','magnet','optics'].includes(entry.category);
 if(cat==='chem')return ['cWare','cSetup','cStruct'].includes(entry.category);
 if(cat==='bio')return ['bCell','bGene','bLife','bBody'].includes(entry.category);
 return true;
}

function renderCardPool(list){
 const pool=q('shelfCardPool');if(!pool)return;
 pool.replaceChildren();
 if(!list.length){
  const empty=document.createElement('div');
  empty.className='shelf-empty-hint';
  empty.textContent='Không tìm thấy công cụ phù hợp.';
  pool.append(empty);
  return;
 }
 const currentVal=q('shelfAvailable').value;
 if(!list.some(e=>e.id===selectedCardId))selectedCardId=currentVal||list[0].id;
 for(const e of list){
  const card=document.createElement('div');
  card.className='shelf-card'+(e.id===selectedCardId?' is-selected':'');
  card.dataset.id=e.id;
  card.draggable=true;
  card.title=e.label+' — Kéo sang bên phải hoặc nhấp đúp để thêm';
  card.setAttribute('role','button');
  card.setAttribute('tabindex','0');
  card.setAttribute('aria-label',e.label);
  
  const iconWrap=document.createElement('div');
  iconWrap.className='shelf-card-icon';
  try{iconWrap.append(preview(e.id));}catch{}
  
  const title=document.createElement('div');
  title.className='shelf-card-title';
  title.textContent=e.label;
  
  const sub=document.createElement('div');
  sub.className='shelf-card-sub';
  sub.textContent=category(e).split(' · ')[0];
  
  card.append(iconWrap,title,sub);
  
  card.onclick=()=>{
   selectedCardId=e.id;
   for(const c of pool.querySelectorAll('.shelf-card'))c.classList.toggle('is-selected',c.dataset.id===e.id);
   if(q('shelfAvailable').value!==e.id)q('shelfAvailable').value=e.id;
   q('shelfAdd').disabled=draft.length>=24;
  };
  card.ondblclick=()=>addTool(e.id);
  card.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();addTool(e.id);}};
  
  card.addEventListener('dragstart',ev=>{
   ev.dataTransfer.setData('text/plain',e.id);
   ev.dataTransfer.setData('application/x-shelf-source','available');
   ev.dataTransfer.effectAllowed='copyMove';
   card.classList.add('is-dragging');
  });
  card.addEventListener('dragend',()=>card.classList.remove('is-dragging'));
  
  pool.append(card);
 }
}

function available(){
 const query=fold(q('shelfSearch').value.trim()),select=q('shelfAvailable'),selected=select.value;
 select.replaceChildren();
 const list=[...registry.values()].filter(e=>!draft.includes(e.id)&&matchesCategory(e,activeCat)&&fold(e.label+' '+(e.aliases||[]).join(' ')+' '+category(e)).includes(query));
 list.sort((a,b)=>{const ai=DEFAULT.indexOf(a.id),bi=DEFAULT.indexOf(b.id);return (ai<0?99:ai)-(bi<0?99:bi)||a.label.localeCompare(b.label,'vi');});
 for(const e of list)select.add(new Option(e.label+' — '+category(e),e.id));
 if(list.some(e=>e.id===selected))select.value=selected;else if(list.length)select.selectedIndex=0;
 q('shelfAdd').disabled=!list.length||draft.length>=24;
 const badge=q('shelfAvailableBadge');if(badge)badge.textContent=list.length+' công cụ';
 renderCardPool(list);
}

function addTool(id,targetIndex){
 if(!id||!registry.has(id)||draft.includes(id))return;
 if(draft.length>=24){
  q('shelfSettingsError').textContent=draft.length+'/24 công cụ (Đã đạt giới hạn tối đa)';
  return;
 }
 if(typeof targetIndex==='number'&&targetIndex>=0&&targetIndex<=draft.length){
  draft.splice(targetIndex,0,id);
 }else{
  draft.push(id);
 }
 editList({id,action:'add'});
}

function editList(focus){
 const host=q('shelfSelected');host.replaceChildren();
 if(!draft.length){
  const empty=document.createElement('div');
  empty.className='shelf-empty-hint';
  empty.textContent='Chưa có công cụ nào. Kéo công cụ từ bên trái sang đây hoặc nhấp đúp để thêm!';
  host.append(empty);
 }
 draft.forEach((id,index)=>{
  const entry=registry.get(id);if(!entry)return;
  const li=document.createElement('li');
  li.className='shelf-chosen-item'+(id===selectedChosenId?' is-selected':'');
  li.dataset.item=id;
  li.draggable=true;
  
  const grip=document.createElement('span');
  grip.className='shelf-grip';
  grip.textContent='⠿';
  grip.title='Kéo thả để sắp xếp thứ tự';
  
  const num=document.createElement('span');
  num.className='shelf-num';
  num.textContent=(index+1)+'.';
  
  const iconWrap=document.createElement('span');
  iconWrap.className='shelf-chosen-icon';
  try{iconWrap.append(preview(id));}catch{}
  
  const label=document.createElement('span');
  label.className='shelf-chosen-label';
  label.textContent=entry.label;
  
  li.append(grip,num,iconWrap,label);
  
  li.onclick=ev=>{
   if(ev.target.closest('button'))return;
   selectedChosenId=id;
   for(const el of host.querySelectorAll('.shelf-chosen-item'))el.classList.toggle('is-selected',el.dataset.item===id);
  };
  li.ondblclick=ev=>{
   if(ev.target.closest('button'))return;
   draft.splice(index,1);
   editList();
  };
  
  for(const [action,text,title] of [['up','↑','Đưa lên'],['down','↓','Đưa xuống'],['remove','×','Bỏ ghim']]){
   const b=document.createElement('button');
   b.type='button';
   b.className='shelf-order';
   b.dataset.item=id;
   b.dataset.action=action;
   b.textContent=text;
   b.setAttribute('aria-label',title+' '+entry.label);
   b.disabled=action==='up'&&index===0||action==='down'&&index===draft.length-1;
   b.onclick=ev=>{
    ev.stopPropagation();
    if(action==='remove')draft.splice(index,1);
    else{const to=index+(action==='up'?-1:1);[draft[index],draft[to]]=[draft[to],draft[index]];}
    editList({id,action});
   };
   li.append(b);
  }
  
  li.addEventListener('dragstart',ev=>{
   ev.dataTransfer.setData('text/plain',id);
   ev.dataTransfer.setData('application/x-shelf-source','selected');
   ev.dataTransfer.effectAllowed='move';
   li.classList.add('is-dragging');
  });
  li.addEventListener('dragend',()=>{
   li.classList.remove('is-dragging');
   for(const el of host.querySelectorAll('.drop-before,.drop-after'))el.classList.remove('drop-before','drop-after');
  });
  li.addEventListener('dragover',ev=>{
   ev.preventDefault();
   ev.stopPropagation();
   ev.dataTransfer.dropEffect='move';
   const rect=li.getBoundingClientRect(),before=ev.clientY<rect.top+rect.height/2;
   li.classList.toggle('drop-before',before);
   li.classList.toggle('drop-after',!before);
  });
  li.addEventListener('dragleave',()=>{
   li.classList.remove('drop-before','drop-after');
  });
  li.addEventListener('drop',ev=>{
   ev.preventDefault();
   ev.stopPropagation();
   li.classList.remove('drop-before','drop-after');
   const dropId=ev.dataTransfer.getData('text/plain');
   if(!dropId||!registry.has(dropId))return;
   const source=ev.dataTransfer.getData('application/x-shelf-source');
   const rect=li.getBoundingClientRect(),before=ev.clientY<rect.top+rect.height/2;
   const insertIdx=index+(before?0:1);
   if(source==='selected'||draft.includes(dropId)){
    const oldIdx=draft.indexOf(dropId);
    if(oldIdx!==-1){
     draft.splice(oldIdx,1);
     const targetIdx=oldIdx<insertIdx?insertIdx-1:insertIdx;
     draft.splice(Math.max(0,Math.min(draft.length,targetIdx)),0,dropId);
    }
   }else{
    if(draft.length>=24){
     q('shelfSettingsError').textContent=draft.length+'/24 công cụ (Đã đạt giới hạn tối đa)';
     return;
    }
    draft.splice(Math.max(0,Math.min(draft.length,insertIdx)),0,dropId);
   }
   editList({id:dropId,action:'drop'});
  });
  
  host.append(li);
 });
 
 available();
 q('shelfSettingsError').textContent=draft.length+'/24 công cụ';
 const chosenBadge=q('shelfChosenBadge');if(chosenBadge)chosenBadge.textContent=draft.length+'/24';
 if(focus){
  const target=[...host.querySelectorAll('button')].find(b=>b.dataset.item===focus.id&&b.dataset.action===focus.action&&!b.disabled);
  target?.focus();
 }
}

customize.onclick=()=>{
 draft=items.slice();
 q('shelfSearch').value='';
 activeCat='all';
 for(const c of dialog.querySelectorAll('.shelf-chip'))c.classList.toggle('active',c.dataset.cat==='all');
 editList();
 dialog.showModal();
};

q('shelfSearch').oninput=available;
q('shelfAvailable').ondblclick=()=>q('shelfAdd').click();
q('shelfAvailable').onchange=()=>{
 selectedCardId=q('shelfAvailable').value;
 const pool=q('shelfCardPool');
 if(pool){
  for(const c of pool.querySelectorAll('.shelf-card')){
   const isSel=c.dataset.id===selectedCardId;
   c.classList.toggle('is-selected',isSel);
   if(isSel)c.scrollIntoView({block:'nearest'});
  }
 }
 q('shelfAdd').disabled=!selectedCardId||draft.includes(selectedCardId)||draft.length>=24;
};

for(const chip of dialog.querySelectorAll('.shelf-chip')){
 chip.onclick=()=>{
  for(const c of dialog.querySelectorAll('.shelf-chip'))c.classList.remove('active');
  chip.classList.add('active');
  activeCat=chip.dataset.cat||'all';
  available();
 };
}

q('shelfAdd').onclick=()=>{
 const id=q('shelfAvailable').value||selectedCardId;
 addTool(id);
};

q('shelfRemoveSelected').onclick=()=>{
 if(selectedChosenId&&draft.includes(selectedChosenId)){
  const idx=draft.indexOf(selectedChosenId);
  draft.splice(idx,1);
  selectedChosenId=null;
  editList();
 }else if(draft.length){
  draft.pop();
  editList();
 }
};

const chosenList=q('shelfSelected');
chosenList.addEventListener('dragover',ev=>{
 ev.preventDefault();
 ev.dataTransfer.dropEffect='copy';
 chosenList.classList.add('is-drag-over');
});
chosenList.addEventListener('dragleave',ev=>{
 if(ev.relatedTarget&&chosenList.contains(ev.relatedTarget))return;
 chosenList.classList.remove('is-drag-over');
});
chosenList.addEventListener('drop',ev=>{
 if(ev.target===chosenList||!ev.target.closest('li')){
  ev.preventDefault();
  chosenList.classList.remove('is-drag-over');
  const dropId=ev.dataTransfer.getData('text/plain');
  if(!dropId||!registry.has(dropId))return;
  const source=ev.dataTransfer.getData('application/x-shelf-source');
  if(source==='selected'||draft.includes(dropId)){
   const oldIdx=draft.indexOf(dropId);
   if(oldIdx!==-1){draft.splice(oldIdx,1);draft.push(dropId);}
  }else{
   if(draft.length>=24){
    q('shelfSettingsError').textContent=draft.length+'/24 công cụ (Đã đạt giới hạn tối đa)';
    return;
   }
   draft.push(dropId);
  }
  editList({id:dropId,action:'drop'});
 }
});

const leftRegion=dialog.querySelector('.shelf-region-available');
leftRegion.addEventListener('dragover',ev=>{
 ev.preventDefault();
 ev.dataTransfer.dropEffect='move';
 leftRegion.classList.add('is-drag-target');
});
leftRegion.addEventListener('dragleave',ev=>{
 if(ev.relatedTarget&&leftRegion.contains(ev.relatedTarget))return;
 leftRegion.classList.remove('is-drag-target');
});
leftRegion.addEventListener('drop',ev=>{
 ev.preventDefault();
 leftRegion.classList.remove('is-drag-target');
 const dropId=ev.dataTransfer.getData('text/plain');
 const source=ev.dataTransfer.getData('application/x-shelf-source');
 if(source==='selected'&&draft.includes(dropId)){
  draft.splice(draft.indexOf(dropId),1);
  editList();
 }
});

q('shelfReset').onclick=()=>{
 draft=DEFAULT.slice();
 q('shelfSearch').value='';
 activeCat='all';
 for(const c of dialog.querySelectorAll('.shelf-chip'))c.classList.toggle('active',c.dataset.cat==='all');
 editList();
};
q('shelfCancel').onclick=()=>dialog.close();
q('shelfSave').onclick=()=>{
 try{localStorage.setItem(key,JSON.stringify({version:1,items:draft}));}catch{q('shelfSettingsError').textContent='Thiết bị chưa cho phép lưu thiết lập. Hãy kiểm tra quyền lưu trữ của trình duyệt.';return;}
 items=draft.slice();
 render();
 dialog.close();
 toast('Đã lưu thanh công cụ cá nhân');
};
dialog.addEventListener('close',()=>{draft=null;customize.focus();});
addEventListener('storage',e=>{if(e.key===key&&!dialog.open){items=load();render();}});
window.NBToolShelf={get items(){return items.slice();},get storageKey(){return key;},open:()=>customize.click()};
})();
