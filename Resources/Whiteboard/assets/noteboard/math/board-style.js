/* Giấy, màu nền bảng và giao diện sáng/tối.
   - Kiểu giấy thêm: ô nhỏ, ô lớn, giấy kẻ ô toán (đường đậm mỗi 5 ô), giấy ô li (vở học sinh).
   - Độ đậm đường kẻ Nhạt/Vừa/Đậm: màu đường kẻ trộn từ màu chữ và màu nền nên rõ trên mọi nền.
   - Màu nền: bảng màu có sẵn + chọn màu tùy ý; nền tối tự đổi chữ/nét sang sáng.
   - Giao diện (thanh công cụ, cột trái, bảng bên, hộp thoại): Sáng / Tối / Theo Windows. Không đổi màu bảng viết. */
(()=>{
'use strict';
const root=document.documentElement,$=s=>document.querySelector(s);
const css=document.createElement('style');css.id='boardStyleCss';css.textContent=`
:root{--grid-bold:color-mix(in srgb,var(--grid) 45%,var(--ink))}
:root[data-gridline="light"]{--grid:color-mix(in srgb,var(--ink) 9%,var(--paper));--grid-bold:color-mix(in srgb,var(--ink) 20%,var(--paper))}
:root[data-gridline="mid"]{--grid:color-mix(in srgb,var(--ink) 17%,var(--paper));--grid-bold:color-mix(in srgb,var(--ink) 32%,var(--paper));--guide:color-mix(in srgb,var(--ink) 30%,var(--paper))}
:root[data-gridline="strong"]{--grid:color-mix(in srgb,var(--ink) 28%,var(--paper));--grid-bold:color-mix(in srgb,var(--ink) 48%,var(--paper));--guide:color-mix(in srgb,var(--ink) 45%,var(--paper))}
:root[data-paper=grid-small] :is(#board,#scratchGrid){background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:20px 20px,20px 20px}
:root[data-paper=grid-large] :is(#board,#scratchGrid){background-image:linear-gradient(var(--grid) 1.5px,transparent 1.5px),linear-gradient(90deg,var(--grid) 1.5px,transparent 1.5px);background-size:80px 80px,80px 80px}
:root[data-paper=grid-math] :is(#board,#scratchGrid){background-image:linear-gradient(var(--grid-bold) 1.6px,transparent 1.6px),linear-gradient(90deg,var(--grid-bold) 1.6px,transparent 1.6px),linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:100px 100px,100px 100px,20px 20px,20px 20px}
:root[data-paper=oli] :is(#board,#scratchGrid){background-image:linear-gradient(var(--grid-bold) 1.4px,transparent 1.4px),linear-gradient(90deg,var(--grid-bold) 1px,transparent 1px),linear-gradient(var(--grid) 1px,transparent 1px);background-size:100% 40px,40px 40px,100% 10px}
.paper-preview.grid-small{background-image:linear-gradient(#d4dde6 1px,transparent 1px),linear-gradient(90deg,#d4dde6 1px,transparent 1px);background-size:6px 6px}
.paper-preview.grid-large{background-image:linear-gradient(#c9d4df 1px,transparent 1px),linear-gradient(90deg,#c9d4df 1px,transparent 1px);background-size:22px 22px}
.paper-preview.grid-math{background-image:linear-gradient(#9fb2c4 1px,transparent 1px),linear-gradient(90deg,#9fb2c4 1px,transparent 1px),linear-gradient(#e0e7ee 1px,transparent 1px),linear-gradient(90deg,#e0e7ee 1px,transparent 1px);background-size:30px 30px,30px 30px,6px 6px,6px 6px}
.paper-preview.oli{background-image:linear-gradient(#a9b9c9 1px,transparent 1px),linear-gradient(90deg,#c3cfdb 1px,transparent 1px),linear-gradient(#e3e9ef 1px,transparent 1px);background-size:100% 16px,16px 16px,100% 4px}
.bs-group{margin:12px 0 4px}.bs-group>b{display:block;font-size:12px;color:var(--shell-dim,#758396);margin-bottom:6px;font-weight:600}
.bs-seg{display:flex;gap:4px}.bs-seg button{flex:1;min-height:32px;border:1px solid #d6dfe6;border-radius:7px;background:#fff;color:#4d5f72;font-size:12px;cursor:pointer}
.bs-seg button.active{border-color:#64b3a5;color:#0f7268;background:#eaf7f3;font-weight:600}
.bs-swatches{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.bs-swatches button{width:30px;height:30px;border-radius:50%;border:2px solid #d6dfe6;cursor:pointer;padding:0}
.bs-swatches button.active{border-color:#168b82;box-shadow:0 0 0 2px #fff,0 0 0 4px #168b82}
.bs-swatches label{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:#4d5f72;cursor:pointer}
.bs-swatches input[type=color]{width:30px;height:30px;border:0;padding:0;background:none;cursor:pointer}
/* Giao diện tối: đảo màu khung ứng dụng (giữ sắc màu), ảnh và bảng viết giữ nguyên */
:root[data-ui=dark]{--shell:#151b22;--shell-2:#1d252f;--shell-line:#2c3846;--shell-text:#dde6ef;--shell-dim:#93a3b5}
:root[data-ui=dark] body,:root[data-ui=dark] #wrap{background:#10161c}
:root[data-ui=dark] :is(#bar,#rail,#statusbar,#studioPanel,#selBar,#smartPanel,#help,#recPanel,.toast,dialog[open]:not(#calculator):not(#ggbWin)){filter:invert(.92) hue-rotate(180deg)}
:root[data-ui=dark] :is(#bar,#rail,#statusbar,#studioPanel,#selBar,#smartPanel,#help,dialog[open]) :is(img,video,canvas:not(#smartFormulaPreview),.swatch,.paper-preview,.bs-swatches button,input[type=color]){filter:invert(1) hue-rotate(180deg)}
`;document.head.append(css);

/* ---- Màu nền ---- */
const SWATCHES=[['Trắng','#FFFFFF'],['Kem','#FFF8E7'],['Xanh nhạt','#EEF5FB'],['Xanh lá nhạt','#EEF7EE'],['Hồng nhạt','#FDF0F2'],['Bảng xanh','#10393A'],['Bảng đen','#1F2626'],['Tối','#141922']];
const lum=hex=>{const n=parseInt(hex.slice(1),16),c=[n>>16&255,n>>8&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
function setPaperColor(hex,quiet){
 hex=/^#[0-9a-f]{6}$/i.test(hex||'')?hex.toUpperCase():'';
 if(!hex||hex==='#FFFFFF'){root.style.removeProperty('--paper');if(root.dataset.theme!=='giay'&&root.dataset.paperColor)root.dataset.theme='giay';delete root.dataset.paperColor;}
 else{const dark=lum(hex)<.2;root.dataset.theme=dark?(hex==='#10393A'?'bang':'dem'):'giay';root.style.setProperty('--paper',hex);root.dataset.paperColor=hex;if(!root.dataset.gridline)root.dataset.gridline='light';}
 sync();if(!quiet)save();
}
function setGridline(v,quiet){if(['light','mid','strong'].includes(v))root.dataset.gridline=v;else delete root.dataset.gridline;sync();if(!quiet)save();}
/* ---- Giao diện sáng/tối ---- */
const UI_KEY='noteboard.ui',mq=matchMedia('(prefers-color-scheme: dark)');
let uiPref='light';try{uiPref=localStorage.getItem(UI_KEY)||'light';}catch{}
function applyUi(){const dark=uiPref==='dark'||(uiPref==='system'&&mq.matches);if(dark)root.dataset.ui='dark';else delete root.dataset.ui;sync();}
function setUi(v){uiPref=['light','dark','system'].includes(v)?v:'light';try{localStorage.setItem(UI_KEY,uiPref);}catch{}applyUi();}
mq.addEventListener?.('change',()=>{if(uiPref==='system')applyUi();});
function save(){try{if(typeof scheduleSave==='function')scheduleSave();localStorage.setItem('noteboard.boardStyle',JSON.stringify(state()));}catch{}}
const state=()=>({paperColor:root.dataset.paperColor||'',gridline:root.dataset.gridline||''});

/* ---- Bảng Giấy ---- */
const sec=document.querySelector('[data-section="paper"]');
if(sec){
 const grid=sec.querySelector('.paper-grid');
 if(grid)for(const [k,l] of [['grid-small','Ô nhỏ'],['grid-large','Ô lớn'],['grid-math','Giấy kẻ ô toán'],['oli','Giấy ô li']]){
  if(grid.querySelector(`[data-paper="${k}"]`))continue;
  const b=document.createElement('button');b.dataset.paper=k;b.innerHTML=`<i class="paper-preview ${k}"></i>${l}`;
  b.onclick=()=>{root.dataset.paper=k;document.querySelectorAll('[data-paper]').forEach(el=>el.classList.toggle('active',el===b));save();};grid.append(b);
 }
 const box=document.createElement('div');
 box.innerHTML=`<div class="bs-group"><b>Độ đậm đường kẻ</b><div class="bs-seg" id="bsGrid"><button data-g="">Như cũ</button><button data-g="light">Nhạt</button><button data-g="mid">Vừa</button><button data-g="strong">Đậm</button></div></div>
<div class="bs-group"><b>Màu nền bảng</b><div class="bs-swatches" id="bsColors"></div></div>
<div class="bs-group"><b>Giao diện ứng dụng</b><div class="bs-seg" id="bsUi"><button data-u="light">☀ Sáng</button><button data-u="dark">☾ Tối</button><button data-u="system">Theo Windows</button></div></div>`;
 (grid||sec.firstElementChild).after(box);
 const sw=box.querySelector('#bsColors');
 for(const [name,hex] of SWATCHES){const b=document.createElement('button');b.type='button';b.title=name;b.dataset.c=hex;b.style.background=hex;b.onclick=()=>setPaperColor(hex);sw.append(b);}
 const pick=document.createElement('label');pick.title='Chọn màu khác';pick.innerHTML='<input type="color" id="bsCustom" value="#ffffff"> Màu khác';sw.append(pick);
 pick.querySelector('input').oninput=e=>setPaperColor(e.target.value);
 box.querySelector('#bsGrid').onclick=e=>{const b=e.target.closest('[data-g]');if(b)setGridline(b.dataset.g);};
 box.querySelector('#bsUi').onclick=e=>{const b=e.target.closest('[data-u]');if(b)setUi(b.dataset.u);};
 /* Nút đổi nền cũ (giấy / bảng xanh / tối) bỏ màu tùy chỉnh để thấy đúng nền của chế độ */
 $('#theme')?.addEventListener('click',()=>{root.style.removeProperty('--paper');delete root.dataset.paperColor;sync();save();});
}
function sync(){
 const c=root.dataset.paperColor||'',g=root.dataset.gridline||'';
 document.querySelectorAll('#bsColors [data-c]').forEach(b=>b.classList.toggle('active',b.dataset.c===(c||'#FFFFFF')&&(c||root.dataset.theme==='giay'||!root.dataset.theme)));
 document.querySelectorAll('#bsGrid [data-g]').forEach(b=>b.classList.toggle('active',b.dataset.g===g));
 document.querySelectorAll('#bsUi [data-u]').forEach(b=>b.classList.toggle('active',b.dataset.u===uiPref));
 const ci=document.getElementById('bsCustom');if(ci&&c)ci.value=c.toLowerCase();
}
/* Mặc định của máy (bài mới); bài .nbink mang thiết lập riêng qua apply() */
try{const s=JSON.parse(localStorage.getItem('noteboard.boardStyle')||'null');if(s){if(s.gridline)setGridline(s.gridline,true);if(s.paperColor)setPaperColor(s.paperColor,true);}}catch{}
applyUi();
window.NBBoardStyle={state,apply(s){s=s||{};setGridline(s.gridline||'',true);setPaperColor(s.paperColor||'',true);},setPaperColor,setGridline,setUi,get ui(){return uiPref;}};
})();
