/* ClassIn-inspired Lesson Studio cho NoteBoard Ink:
   1. Quản lý Trang & Phần bài giảng (#pageStudio): đặt tên phần/trang, chèn trang giữa bài, nhân bản, đổi thứ tự, xóa trang.
   2. Chế độ "Soạn bài trước – Dạy lại nhiều lớp": Ghim khóa bài soạn (pinned) bảo vệ khỏi tẩy/xóa/di chuyển & nút Xóa nét viết giảng bài.
   3. Tấm che đáp án & Rèm kéo từng phần (Cover Card & Curtain): che/mở 1 chạm hoặc kéo rèm hé lộ dần, đồng bộ sang Màn chiếu học sinh.
   4. Hộp công cụ giảng bài trực quan: Bút Laser tự tan (#laserBtn), Đèn rọi tiêu điểm (#spotlightBtn), Đồng hồ đếm ngược trên bảng (#classTimerBtn). */
(()=>{'use strict';
 if(typeof window==='undefined'||typeof document==='undefined')return;
 const $=s=>document.querySelector(s);
 const isProjector=new URLSearchParams(location.search).get('projector')==='1';

 let pageMeta=[];
 let coverCards=[];
 let coverSeq=1;

 /* ==================== CSS ==================== */
 const css=document.createElement('style');
 css.textContent=`
#pageStatus{cursor:pointer;padding:2px 8px;border-radius:6px;transition:background .15s,color .15s}
#pageStatus:hover{background:#ffffff1f;color:#fff}
.txt.nb-pinned.sel::after{content:"📌";position:absolute;top:-14px;right:-14px;font-size:13px;background:#0f766e;color:#fff;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;box-shadow:0 2px 6px #0004;pointer-events:none}

/* Khung Quản lý Trang & Phần bài giảng dạng hàng ngang ở cuối cùng bên dưới (Giao diện Sáng, Siêu nhỏ gọn) */
/* Khung Quản lý Trang dạng hàng ngang ở hàng dưới cùng duy nhất (bottom: 0, height: 34px) */
#pageStudio{position:fixed;left:0;right:0;bottom:0;background:#ffffff;color:#1e293b;border-top:1px solid #dce3e9;box-shadow:0 -2px 10px rgba(0,0,0,0.06);z-index:55;display:flex;flex-direction:column;font:12px/1.4 "Segoe UI",system-ui,sans-serif;user-select:none;transition:height .15s cubic-bezier(0.16,1,0.3,1)}
#pageStudio[hidden]{display:none!important}
body.zen #pageStudio{display:none!important}

/* Thanh kéo resizer ở cạnh trên */
.ps-resizer{height:6px;cursor:ns-resize;background:transparent;display:flex;align-items:center;justify-content:center;margin-top:-3px;touch-action:none;position:relative;z-index:3}
.ps-resizer:hover,.ps-resizer:active{background:rgba(22,139,130,0.15)}
.ps-resizer-handle{width:36px;height:2px;border-radius:1px;background:#cbd5e1;transition:background .15s,width .15s}
.ps-resizer:hover .ps-resizer-handle{background:#168b82;width:52px}

/* 1. Chế độ thanh nhỏ gọn ở hàng dưới cùng (34px, gom trọn quản lý trang, trạng thái & zoom) */
#pageStudio.ps-compact{height:34px!important;max-height:34px;overflow:hidden;background:#f8fafc;border-top:1px solid #dce3e9}
#pageStudio.ps-compact .ps-expanded-view{display:none!important}
.ps-mini-bar{display:flex;align-items:center;height:34px;padding:0 12px;gap:8px}
.ps-mini-label{display:flex;align-items:center;gap:4px;font-weight:600;font-size:11.5px;color:#64748b;white-space:nowrap;flex-shrink:0}
.ps-mini-strip{display:flex;align-items:center;gap:5px;overflow-x:auto;flex:1;min-width:0;scrollbar-width:none}
.ps-mini-strip::-webkit-scrollbar{display:none}
.ps-tab{display:inline-flex;align-items:center;gap:4px;height:24px;line-height:22px;padding:0 8px;background:#ffffff;color:#475569;border:1px solid #cbd5e1;border-radius:5px;font-size:11.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s;flex-shrink:0}
.ps-tab:hover{background:#f1f5f9;color:#0f172a;border-color:#94a3b8}
.ps-tab.active{background:#168b82;color:#ffffff;border-color:#0f766e;box-shadow:0 1px 3px rgba(22,139,130,0.25);font-weight:600}
.ps-tab-title{max-width:120px;overflow:hidden;text-overflow:ellipsis;font-weight:normal;opacity:0.9}
.ps-mini-add{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;background:#ffffff;color:#168b82;border:1px dashed #94a3b8;border-radius:5px;cursor:pointer;font-weight:700;font-size:12px;flex-shrink:0}
.ps-mini-add:hover{background:#e4efec;border-color:#168b82;color:#0f766e}
.ps-mini-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
.ps-mini-btn{border:1px solid #cbd5e1;background:#ffffff;color:#475569;border-radius:5px;height:24px;padding:0 9px;font:600 11px "Segoe UI",system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
.ps-mini-btn:hover{background:#f1f5f9;color:#168b82;border-color:#168b82}
.ps-mini-status{display:flex;align-items:center;gap:6px;font-size:11px;color:#64748b;padding:0 10px;border-left:1px solid #e2e8f0;white-space:nowrap;flex-shrink:0}
.ps-mini-status i{width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block}
.ps-mini-zoom{display:flex;align-items:center;gap:4px;border-left:1px solid #e2e8f0;padding-left:8px;flex-shrink:0}
.ps-mini-zoom button{display:flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 6px;border-radius:4px;border:1px solid #cbd5e1;background:#ffffff;color:#475569;font-size:11px;font-weight:600;cursor:pointer}
.ps-mini-zoom button:hover{background:#e4efec;color:#168b82;border-color:#168b82}

/* 2. Chế độ mở to (Expanded Light) */
#pageStudio.ps-expanded{min-height:160px;max-height:75vh;background:#ffffff}
#pageStudio.ps-expanded .ps-mini-bar{display:none!important}
.ps-expanded-view{display:flex;flex-direction:column;height:calc(100% - 6px);overflow:hidden}
.ps-head{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;flex-shrink:0}
.ps-head b{font-size:13px;color:#1e293b;display:flex;align-items:center;gap:6px}
.ps-head-acts{display:flex;align-items:center;gap:5px}
.ps-collapse-btn{border:1px solid #cbd5e1;background:#ffffff;color:#475569;border-radius:5px;height:22px;padding:0 8px;font:500 11px "Segoe UI",system-ui,sans-serif;cursor:pointer}
.ps-collapse-btn:hover{background:#f1f5f9;color:#168b82;border-color:#168b82}
.ps-close{border:0;background:transparent;color:#64748b;width:22px;height:22px;border-radius:4px;cursor:pointer;font-size:12px;display:grid;place-items:center}
.ps-close:hover{background:#e2e8f0;color:#1e293b}
.ps-toolbar{display:flex;align-items:center;gap:6px;padding:5px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;overflow-x:auto;flex-shrink:0;scrollbar-width:none}
.ps-toolbar button{border:1px solid #cbd5e1;background:#ffffff;color:#334155;border-radius:6px;padding:3px 9px;font:600 11.5px "Segoe UI",system-ui,sans-serif;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;flex-shrink:0}
.ps-toolbar button:hover{background:#f1f5f9;border-color:#168b82;color:#168b82}
.ps-toolbar button.ps-clean{border-color:#fcd34d;background:#fefce8;color:#b45309}
.ps-toolbar button.ps-clean:hover{background:#fef9c3;border-color:#f59e0b}

/* Danh sách slide dạng thẻ hàng ngang (Light Cards) */
.ps-list{display:flex;flex-direction:row;gap:10px;padding:10px 12px;overflow-x:auto;overflow-y:hidden;flex:1;align-items:stretch;background:#ffffff;scrollbar-width:thin}
.ps-list::-webkit-scrollbar{height:5px}
.ps-list::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
.ps-item{flex:0 0 240px;width:240px;display:flex;flex-direction:column;justify-content:flex-start;gap:7px;padding:8px 10px;border-radius:8px;background:#ffffff;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.04);transition:border-color .15s,box-shadow .15s;user-select:none;cursor:pointer}
.ps-item:hover{border-color:#168b82;box-shadow:0 2px 8px rgba(22,139,130,0.12);background:#fafdfc}
.ps-item.active{border-color:#168b82;background:#f0fdfa;box-shadow:0 0 0 2px #168b82}
.ps-row1{display:flex;align-items:center;gap:6px}
.ps-Jump{border:0;background:#e2e8f0;color:#1e293b;font:700 11px "Segoe UI",system-ui,sans-serif;padding:3px 7px;border-radius:4px;cursor:pointer;white-space:nowrap}
.ps-item.active .ps-Jump{background:#168b82;color:#ffffff}
.ps-title{flex:1;min-width:0;border:1px solid #cbd5e1;background:#ffffff;color:#1e293b;border-radius:4px;padding:2px 6px;font:12px "Segoe UI",system-ui,sans-serif}
.ps-title:focus{outline:none;border-color:#168b82;box-shadow:0 0 0 2px rgba(22,139,130,0.18)}
.ps-row2{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;color:#64748b}
.ps-acts{display:flex;align-items:center;gap:3px;margin-top:2px}
.ps-acts button{border:1px solid #cbd5e1;background:#f8fafc;color:#475569;border-radius:4px;padding:2px 6px;font:600 11px "Segoe UI",system-ui,sans-serif;cursor:pointer}
.ps-acts button:hover:not(:disabled){background:#e2e8f0;color:#0f172a;border-color:#94a3b8}
.ps-acts button:disabled{opacity:.35;cursor:default}
.ps-acts button[data-act="del"]:hover:not(:disabled){background:#fee2e2;border-color:#ef4444;color:#b91c1c}

/* Lớp chứa Tấm che đáp án / Rèm kéo (nằm trên cả #board và #ink trong #stage để che được cả chữ lẫn nét viết tay) */
#nbCoverLayerWrap{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:18}
#nbMainCoverWrap{position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none}
#nbCoverLayer{position:absolute;left:0;top:0;width:1600px;height:100%;transform-origin:0 0;pointer-events:none}
#nbScratchCoverWrap{position:absolute;top:0;bottom:0;right:0;overflow:hidden;pointer-events:none;z-index:19}
#nbScratchCoverLayer{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none}
.nb-cover{position:absolute;background:linear-gradient(160deg,#1e293b 0%,#0f172a 100%);border:2px solid #3fa9c9;border-radius:14px;box-shadow:0 12px 32px #0913224d;color:#f1f5f9;display:flex;flex-direction:column;justify-content:space-between;user-select:none;touch-action:none;overflow:hidden;box-sizing:border-box;font:14px/1.4 "Segoe UI",system-ui,sans-serif;pointer-events:auto}
.nb-cover.scratch-cover{border-color:#14b8a6;box-shadow:0 12px 32px #0f766e4d}
.nb-cover.scratch-cover .nb-cover-bar{background:rgba(15,23,42,.92);border-bottom:1px solid rgba(20,184,166,.3)}
.nb-cover.scratch-cover .nb-cover-btn{background:#14b8a6;color:#042f2e}
.nb-cover.revealed{background:rgba(15,118,110,.08);border:2px dashed #0f766e;box-shadow:none;color:#0f766e;pointer-events:none}
.nb-cover-bar{display:flex;align-items:center;gap:6px;padding:6px 10px;background:rgba(15,23,42,.88);border-bottom:1px solid rgba(148,163,184,.22);cursor:grab;pointer-events:auto}
.nb-cover.revealed .nb-cover-bar{background:rgba(15,118,110,.92);color:#fff;border-radius:10px;margin:4px;border-bottom:0}
.nb-cover-title{flex:1;min-width:0;font-weight:700;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:text}
.nb-cover-btn{border:0;border-radius:7px;padding:4px 9px;font:700 12px/1.2 "Segoe UI",system-ui,sans-serif;cursor:pointer;background:#3fa9c9;color:#06202b;white-space:nowrap}
.nb-cover-btn:hover{filter:brightness(1.08)}
.nb-cover-btn.curtain-handle{background:#334155;color:#e2e8f0;cursor:ns-resize}
.nb-cover-btn.del{background:transparent;color:#94a3b8;padding:4px 6px;font-size:14px}
.nb-cover-btn.del:hover{color:#fca5a5;background:#7f1d1d66}
.nb-cover-body{flex:1;display:grid;place-items:center;padding:12px;text-align:center;font-weight:600;font-size:16px;color:#cbd5e1;letter-spacing:.2px;pointer-events:auto;cursor:pointer}
.nb-cover.revealed .nb-cover-body,.nb-cover.revealed .nb-cover-rsz{display:none}
.nb-cover-rsz{position:absolute;right:0;bottom:0;width:22px;height:22px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 50%,#3fa9c9 50%);border-bottom-right-radius:11px;pointer-events:auto}
html.nb-projector .nb-cover{pointer-events:none!important}
html.nb-projector .nb-cover.revealed{opacity:0!important;pointer-events:none!important}
html.nb-projector .nb-cover-bar .nb-cover-btn{display:none!important}

/* Bút Laser, Đèn rọi & Đồng hồ đếm ngược trên bảng */
body.nb-laser-mode .nb-cover,body.nb-laser-mode .nb-cover *{pointer-events:none!important}
#nbLaserCanvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:26}
#nbSpotlight{position:absolute;inset:0;pointer-events:none;z-index:25;overflow:hidden}
#nbSpotlight[hidden]{display:none!important}
.nb-spot-hole{position:absolute;border-radius:50%;box-shadow:0 0 0 9999px rgba(8,15,28,.76);border:2.5px solid #38bdf8;pointer-events:auto;cursor:move;touch-action:none}
.nb-spot-ctrl{position:absolute;left:50%;bottom:-38px;transform:translateX(-50%);display:flex;align-items:center;gap:4px;background:#0f172a;color:#f8fafc;padding:4px 8px;border-radius:999px;border:1px solid #38bdf8;font:600 11.5px/1 "Segoe UI",system-ui,sans-serif;white-space:nowrap;box-shadow:0 4px 14px #0008}
.nb-spot-ctrl button{border:0;background:#1e293b;color:#e2e8f0;border-radius:999px;padding:3px 7px;font:700 11.5px "Segoe UI",system-ui,sans-serif;cursor:pointer}
.nb-spot-ctrl button:hover{background:#38bdf8;color:#082030}
html.nb-projector .nb-spot-ctrl{display:none!important}
html.nb-projector .nb-spot-hole{border-color:rgba(255,255,255,.35);pointer-events:none}

#nbClassTimer{position:fixed;top:76px;right:26px;z-index:48;background:#111b27;color:#f8fafc;border:2px solid #3fa9c9;border-radius:16px;padding:10px 14px;min-width:228px;box-shadow:0 16px 42px #050c1480;font:13px/1.35 "Segoe UI",system-ui,sans-serif;user-select:none;touch-action:none}
#nbClassTimer[hidden]{display:none!important}
#nbClassTimer.warn{border-color:#ef4444;background:#2a1215;animation:nbTimerPulse .8s infinite alternate}
@keyframes nbTimerPulse{from{box-shadow:0 0 0 0 rgba(239,68,68,.55)}to{box-shadow:0 0 0 12px rgba(239,68,68,0)}}
.nbt-head{display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:#94a3b8;cursor:grab;margin-bottom:4px}
.nbt-digits{font:800 34px/1.08 "Consolas","Segoe UI",monospace;text-align:center;letter-spacing:1.5px;color:#fff;font-variant-numeric:tabular-nums;margin:2px 0 6px}
#nbClassTimer.warn .nbt-digits{color:#fca5a5}
.nbt-bar{height:5px;background:#1e293b;border-radius:999px;overflow:hidden;margin-bottom:8px}
.nbt-fill{height:100%;background:linear-gradient(90deg,#22c55e,#3fa9c9);width:100%;transition:width .25s linear}
#nbClassTimer.warn .nbt-fill{background:#ef4444}
.nbt-presets,.nbt-actions{display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap}
.nbt-presets{margin-bottom:6px}
.nbt-presets button,.nbt-actions button{border:1px solid #2e4358;background:#1b2a3b;color:#e2e8f0;border-radius:7px;padding:4px 8px;font:600 11.5px "Segoe UI",system-ui,sans-serif;cursor:pointer}
.nbt-presets button:hover,.nbt-actions button:hover{background:#294057;border-color:#3fa9c9;color:#fff}
.nbt-actions button.primary{background:#0f6e8c;border-color:#3fa9c9;color:#fff;font-weight:700}
html.nb-projector #nbClassTimer .nbt-presets,html.nb-projector #nbClassTimer .nbt-actions,html.nb-projector #nbClassTimer .nbt-close{display:none!important}
`;
 document.head.appendChild(css);

 const viewEl=$('#stage')||$('#view');
 const coverLayerWrap=document.createElement('div');
 coverLayerWrap.id='nbCoverLayerWrap';

 const mainCoverWrap=document.createElement('div');
 mainCoverWrap.id='nbMainCoverWrap';
 const coverLayer=document.createElement('div');
 coverLayer.id='nbCoverLayer';
 mainCoverWrap.appendChild(coverLayer);
 coverLayerWrap.appendChild(mainCoverWrap);

 const scratchCoverWrap=document.createElement('div');
 scratchCoverWrap.id='nbScratchCoverWrap';
 const scratchCoverLayer=document.createElement('div');
 scratchCoverLayer.id='nbScratchCoverLayer';
 scratchCoverWrap.appendChild(scratchCoverLayer);
 coverLayerWrap.appendChild(scratchCoverWrap);

 viewEl?.appendChild(coverLayerWrap);

 function syncCoverLayerTransform(){
  if(typeof board!=='undefined'&&board&&coverLayer){
   coverLayer.style.transform=board.style.transform;
  }
  if(typeof splitK!=='undefined' && splitK<1){
   mainCoverWrap.style.width=(1600*splitK)+'px';
   scratchCoverWrap.hidden=false;
   scratchCoverWrap.style.left=(1600*splitK)+'px';
   scratchCoverWrap.style.width=(1600*(1-splitK))+'px';
   if(scratchCoverLayer){
    scratchCoverLayer.style.width=(1600*(1-splitK))+'px';
    scratchCoverLayer.style.transform=`scale(${scratchZoom}) translateY(${-scratchScrollY}px)`;
   }
  } else {
   mainCoverWrap.style.width='100%';
   scratchCoverWrap.hidden=true;
  }
 }

 /* ==================== HELPER & STATE ACCESS ==================== */
 function cleanPageMeta(arr){
  if(!Array.isArray(arr))return [];
  return arr.slice(0,400).map(s=>typeof s==='string'?s.trim().slice(0,120):'');
 }
 function cleanCovers(arr){
  if(!Array.isArray(arr))return [];
  return arr.slice(0,200).map((c,idx)=>{
   if(!c||typeof c!=='object')return null;
   const w=Math.max(120,Math.min(1600,Math.round(Number(c.w)||480)));
   const h=Math.max(70,Math.min(2400,Math.round(Number(c.h)||220)));
   const x=Math.max(-200,Math.min(2200,Math.round(Number(c.x)||180)));
   const y=Math.max(0,Math.min(1e7,Math.round(Number(c.y)||120)));
   const curtain=Math.max(0,Math.min(h-44,Math.round(Number(c.curtain)||0)));
   return {
    id:String(c.id||('cov_'+(idx+1))).slice(0,40),
    x,y,w,h,
    label:String(c.label||'Đáp án / Gợi ý').trim().slice(0,120)||'Đáp án / Gợi ý',
    revealed:!!c.revealed,
    curtain,
    scratch:Boolean(c.scratch)
   };
  }).filter(Boolean);
 }
 function getPageMeta(){return pageMeta.slice();}
 function getCovers(){return coverCards.map(c=>({...c}));}
 function maxCoverY(){
  let m=0;
  for(const c of coverCards)if(!c.scratch)m=Math.max(m,c.y+c.h+40);
  return m;
 }
 function formatPageStatus(i,total){
  if(studioEl&&!studioEl.hidden)renderPageStudio(i,total);
  const title=(pageMeta[i]||'').trim();
  return 'Trang '+(i+1)+' / '+total+(title?' · '+title:'');
 }

 /* ==================== 1. TẤM CHE ĐÁP ÁN / RÈM KÉO ==================== */
 function renderCovers(){
  if(!coverLayer)return;
  syncCoverLayerTransform();
  coverLayer.replaceChildren();
  if(scratchCoverLayer)scratchCoverLayer.replaceChildren();
  for(const c of coverCards){
   const isScratchCard=Boolean(c.scratch);
   if(isScratchCard&&(!scratchCoverLayer||splitK===1))continue;
   const targetParent=isScratchCard?scratchCoverLayer:coverLayer;
   const el=document.createElement('div');
   el.className='nb-cover'+(c.revealed?' revealed':'')+(isScratchCard?' scratch-cover':'');
   el.dataset.coverId=c.id;
   const cur=c.revealed?0:Math.max(0,Math.min(c.h-44,c.curtain||0));
   el.style.left=c.x+'px';
   el.style.top=(c.y+cur)+'px';
   el.style.width=c.w+'px';
   el.style.height=Math.max(44,c.h-cur)+'px';

   const bar=document.createElement('div');
   bar.className='nb-cover-bar';
   const title=document.createElement('span');
   title.className='nb-cover-title';
   title.textContent=(isScratchCard?'📝 ':'🃏 ')+c.label+(cur>0&&!c.revealed?' ('+Math.round(cur/c.h*100)+'%)':'');
   title.title='Nhấp đúp để đổi tên tấm che';
   title.ondblclick=e=>{
    if(isProjector)return;
    e.stopPropagation();
    const next=prompt('Tên hiển thị trên tấm che:',c.label);
    if(next!==null){c.label=next.trim().slice(0,120)||'Đáp án / Gợi ý';renderCovers();syncCovers(true);}
   };

   const curtainBtn=document.createElement('button');
   curtainBtn.type='button';
   curtainBtn.className='nb-cover-btn curtain-handle';
   curtainBtn.textContent=cur>0?'↕ Rèm':'↕ Kéo rèm';
   curtainBtn.title='Giữ chuột và kéo xuống/lên để hé lộ dần từng dòng đáp án; bấm để đóng kín rèm';

   const toggleBtn=document.createElement('button');
   toggleBtn.type='button';
   toggleBtn.className='nb-cover-btn toggle';
   toggleBtn.textContent=c.revealed?'🙈 Che lại':'👁 Mở đáp án';
   toggleBtn.onclick=e=>{
    e.stopPropagation();
    c.revealed=!c.revealed;
    if(!c.revealed)c.curtain=0;
    renderCovers();
    syncCovers(true);
   };

   const delBtn=document.createElement('button');
   delBtn.type='button';
   delBtn.className='nb-cover-btn del';
   delBtn.textContent='✕';
   delBtn.title='Xóa tấm che này';
   delBtn.onclick=e=>{
    e.stopPropagation();
    coverCards=coverCards.filter(x=>x.id!==c.id);
    renderCovers();
    markPages();apply();
    syncCovers(true);
   };

   bar.append(title,curtainBtn,toggleBtn,delBtn);
   const body=document.createElement('div');
   body.className='nb-cover-body';
   body.textContent=c.label+' — Bấm “👁 Mở đáp án” hoặc kéo “↕ Kéo rèm”';
   body.onclick=e=>{
    if(isProjector)return;
    e.stopPropagation();
    c.revealed=true;
    renderCovers();
    syncCovers(true);
   };

   const rsz=document.createElement('div');
   rsz.className='nb-cover-rsz';
   rsz.title='Kéo để đổi kích thước tấm che';

   el.append(bar,body,rsz);
   coverLayer.appendChild(el);
   if(targetParent!==coverLayer){
    coverLayer.removeChild(el);
    targetParent.appendChild(el);
   }

   if(!isProjector){
    /* Kéo di chuyển tấm che */
    bar.addEventListener('pointerdown',e=>{
     if(e.target.closest('button'))return;
     e.stopPropagation();e.preventDefault();
     const q0=toBoard(e,null,isScratchCard),x0=c.x,y0=c.y;
     let moved=false;
     try{bar.setPointerCapture(e.pointerId);}catch(_){}
     const move=ev=>{
      if(ev.pointerId!==e.pointerId)return;
      const q=toBoard(ev,null,isScratchCard);
      if(Math.hypot(q.x-q0.x,q.y-q0.y)>2)moved=true;
      if(isScratchCard){
       const maxW=1600*(1-splitK);
       c.x=Math.round(Math.max(0,Math.min(maxW-40,x0+(q.x-q0.x))));
       c.y=Math.round(Math.max(0,y0+(q.y-q0.y)));
      } else {
       const maxW=splitK<1?(1600*splitK):1600;
       c.x=Math.round(Math.max(-100,Math.min(maxW-40,x0+(q.x-q0.x))));
       c.y=Math.round(Math.max(0,y0+(q.y-q0.y)));
      }
      const curNow=c.revealed?0:Math.max(0,Math.min(c.h-44,c.curtain||0));
      el.style.left=c.x+'px';
      el.style.top=(c.y+curNow)+'px';
      syncCovers(false);
     };
     const up=ev=>{
      if(ev.pointerId!==e.pointerId)return;
      bar.removeEventListener('pointermove',move);
      bar.removeEventListener('pointerup',up);
      bar.removeEventListener('pointercancel',up);
      if(moved){markPages();apply();syncCovers(true);}
     };
     bar.addEventListener('pointermove',move);
     bar.addEventListener('pointerup',up);
     bar.addEventListener('pointercancel',up);
    });

    /* Kéo rèm từng phần */
    curtainBtn.addEventListener('pointerdown',e=>{
     e.stopPropagation();e.preventDefault();
     c.revealed=false;
     const q0=toBoard(e,null,isScratchCard),cur0=c.curtain||0;
     let moved=false;
     try{curtainBtn.setPointerCapture(e.pointerId);}catch(_){}
     const move=ev=>{
      if(ev.pointerId!==e.pointerId)return;
      const q=toBoard(ev,null,isScratchCard);
      if(Math.abs(q.y-q0.y)>2)moved=true;
      c.curtain=Math.round(Math.max(0,Math.min(c.h-44,cur0+(q.y-q0.y))));
      el.style.top=(c.y+c.curtain)+'px';
      el.style.height=Math.max(44,c.h-c.curtain)+'px';
      title.textContent=(isScratchCard?'📝 ':'🃏 ')+c.label+(c.curtain>0?' ('+Math.round(c.curtain/c.h*100)+'%)':'');
      syncCovers(false);
     };
     const up=ev=>{
      if(ev.pointerId!==e.pointerId)return;
      curtainBtn.removeEventListener('pointermove',move);
      curtainBtn.removeEventListener('pointerup',up);
      curtainBtn.removeEventListener('pointercancel',up);
      if(!moved&&c.curtain>0){c.curtain=0;renderCovers();}
      syncCovers(true);
     };
     curtainBtn.addEventListener('pointermove',move);
     curtainBtn.addEventListener('pointerup',up);
     curtainBtn.addEventListener('pointercancel',up);
    });

    /* Đổi kích thước tấm che */
    rsz.addEventListener('pointerdown',e=>{
     e.stopPropagation();e.preventDefault();
     const q0=toBoard(e,null,isScratchCard),w0=c.w,h0=c.h;
     let moved=false;
     try{rsz.setPointerCapture(e.pointerId);}catch(_){}
     const move=ev=>{
      if(ev.pointerId!==e.pointerId)return;
      const q=toBoard(ev,null,isScratchCard);
      if(Math.hypot(q.x-q0.x,q.y-q0.y)>2)moved=true;
      const availW=isScratchCard?(1600*(1-splitK)):(splitK<1?1600*splitK:1600);
      c.w=Math.round(Math.max(140,Math.min(availW-c.x,w0+(q.x-q0.x))));
      c.h=Math.round(Math.max(70,Math.min(2400,h0+(q.y-q0.y))));
      c.curtain=Math.min(c.curtain||0,c.h-44);
      el.style.width=c.w+'px';
      el.style.height=Math.max(44,c.h-(c.curtain||0))+'px';
      syncCovers(false);
     };
     const up=ev=>{
      if(ev.pointerId!==e.pointerId)return;
      rsz.removeEventListener('pointermove',move);
      rsz.removeEventListener('pointerup',up);
      rsz.removeEventListener('pointercancel',up);
      if(moved){markPages();apply();syncCovers(true);}
     };
     rsz.addEventListener('pointermove',move);
     rsz.addEventListener('pointerup',up);
     rsz.addEventListener('pointercancel',up);
    });
   }
  }
 }

 function syncCovers(commit){
  window.NBProjector?.send?.({kind:'covers',covers:getCovers()});
  if(commit)historyCommit();
 }

 function addCoverCard(opts={}){
  commitEdit();
  let x=opts.x,y=opts.y,w=opts.w,h=opts.h;
  let isScratch=opts.scratch;
  if(isScratch===undefined&&selected.length){
   isScratch=Boolean(selected[0]?.scratch);
  }
  if(x===undefined&&selected.length){
   const b=selBox();
   x=Math.max(10,Math.round(b.x0-18));
   y=Math.max(10,Math.round(b.y0-18));
   const maxW=isScratch&&splitK<1?(1600*(1-splitK)):1600;
   w=Math.max(180,Math.min(maxW-20,Math.round(b.x1-b.x0+36)));
   h=Math.max(90,Math.min(1800,Math.round(b.y1-b.y0+36)));
  }
  if(x===undefined){
   if(isScratch&&splitK<1){
    const availW=1600*(1-splitK);
    w=opts.w||Math.min(480,Math.max(220,Math.round(availW-40)));
    h=opts.h||200;
    x=Math.max(10,Math.round((availW-w)/2));
    y=Math.round(scratchScrollY+Math.max(60,(VH/scratchZoom-h)/2));
   } else {
    isScratch=false;
    const availW=splitK<1?(1600*splitK):1600;
    w=opts.w||Math.min(680,Math.max(260,Math.round(availW-60)));
    h=opts.h||220;
    x=Math.max(10,Math.round((availW-w)/2));
    y=Math.round(scrollY+Math.max(80,(VH/zoom-h)/2));
   }
  }
  const card={
   id:'cov_'+Date.now()+'_'+(coverSeq++),
   x,y,w,h,
   label:String(opts.label||('Đáp án / Gợi ý #'+(coverCards.length+1))),
   revealed:false,
   curtain:0,
   scratch:Boolean(isScratch)
  };
  coverCards.push(card);
  renderCovers();
  markPages();apply();
  syncCovers(true);
  typeof toast==='function'&&toast('Đã thêm tấm che '+(card.scratch?'trên Bảng nháp':'bài giảng'));
  return card;
 }

 function clearScratchCovers(){
  coverCards=coverCards.filter(c=>!c.scratch);
  renderCovers();
  syncCovers(true);
 }

 /* ==================== 2. GHIM BÀI SOẠN & XÓA NÉT GIẢNG ==================== */
 function togglePinSelected(){
  if(!selected.length)return;
  commitEdit();
  const allPinned=selected.every(o=>!!o.pinned);
  const next=!allPinned;
  if(typeof detachSelected==='function')detachSelected();
  for(const o of selected){
   o.pinned=next;
   if(o.el)o.el.classList.toggle('nb-pinned',next);
  }
  placeSelBar();
  apply();
  historyCommit();
  typeof toast==='function'&&toast(next?'📌 Đã ghim khóa vào bài soạn (không bị tẩy/xóa nhầm khi giảng)':'🔓 Đã mở khóa đối tượng');
 }

 function pinAllAsTemplate(forcePin){
  commitEdit();
  const items=[...strokes.filter(s=>!s.erase),...texts.filter(t=>!t.line)];
  if(!items.length){typeof toast==='function'&&toast('Chưa có nét viết hay hộp chữ/hình nào trên bảng để ghim');return 0;}
  const allPinned=items.every(o=>!!o.pinned);
  const next=forcePin!==undefined?!!forcePin:!allPinned;
  strokes=strokes.map(s=>s.erase?s:{...s,pinned:next});
  for(const t of texts){if(!t.line){t.pinned=next;t.el?.classList.toggle('nb-pinned',next);}}
  updatePinAllButton();
  placeSelBar();
  apply();
  historyCommit();
  typeof toast==='function'&&toast(next?'📌 Đã ghim khóa toàn bộ '+items.length+' đối tượng làm bài soạn gốc':'🔓 Đã mở khóa toàn bộ nội dung bài soạn');
  return items.length;
 }

 function clearTeachingInk(){
  commitEdit();
  const unpinnedStrokes=strokes.filter(s=>!s.pinned).length;
  const unpinnedTexts=texts.filter(t=>!t.pinned&&!t.line).length;
  const openedCovers=coverCards.filter(c=>c.revealed||c.curtain>0).length;
  if(!unpinnedStrokes&&!unpinnedTexts&&!openedCovers){
   typeof toast==='function'&&toast('Bảng đã sạch nét viết giảng bài (nội dung ghim bài soạn vẫn giữ nguyên)');
   return 0;
  }
  strokes=strokes.filter(s=>!!s.pinned);
  for(const t of [...texts]){
   if(!t.pinned&&!t.line){
    t.el.remove();
    texts=texts.filter(x=>x!==t);
   }
  }
  for(const c of coverCards){c.revealed=false;c.curtain=0;}
  selected=[];
  renderCovers();
  markPages();
  apply();
  syncCovers(true);
  typeof toast==='function'&&toast('🧹 Đã xóa nét giảng bài & đóng lại các tấm che — sẵn sàng dạy lớp tiếp theo!');
  return unpinnedStrokes+unpinnedTexts+openedCovers;
 }

 /* Thêm nút Ghim khóa & Che vùng chọn vào #selBar */
 if(!isProjector&&typeof selBar!=='undefined'&&selBar){
  const pinBtn=document.createElement('button');
  pinBtn.type='button';
  pinBtn.dataset.act='pin';
  pinBtn.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z"/></svg><span>Ghim</span>';
  pinBtn.title='Ghim khóa làm bài soạn gốc (không bị tẩy/xóa nhầm khi giảng bài)';
  pinBtn.onclick=togglePinSelected;

  const covBtn=document.createElement('button');
  covBtn.type='button';
  covBtn.dataset.act='cover';
  covBtn.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg><span>Che đáp án</span>';
  covBtn.title='Đặt tấm che đáp án vừa khít vùng đang chọn';
  covBtn.onclick=()=>addCoverCard();

  const delRef=selBar.querySelector('[data-act="del"]');
  if(delRef){delRef.before(pinBtn);delRef.before(covBtn);}
  else selBar.append(pinBtn,covBtn);

  const origPlaceSelBar=placeSelBar;
  placeSelBar=function(...args){
   const r=origPlaceSelBar.apply(this,args);
   if(selected.length){
    const allPinned=selected.every(o=>!!o.pinned);
    pinBtn.classList.toggle('active',allPinned);
    pinBtn.setAttribute('aria-pressed',String(allPinned));
    pinBtn.querySelector('span').textContent=allPinned?'Mở khóa':'Ghim';
    pinBtn.title=allPinned?'Mở khóa để cho phép di chuyển / xóa đối tượng này':'Ghim khóa đối tượng vào bài soạn (không bị tẩy/xóa khi giảng)';
   }
   return r;
  };
 }

 /* ==================== 3. QUẢN LÝ TRANG & PHẦN BÀI GIẢNG ==================== */
 let studioEl=null, studioMode='compact', studioHeight=255;
 function strokeMidY(s){return ((s.y0??0)+(s.y1??0))/2;}
 function shiftStrokeY(s,dy){
  for(const p of s.pts)p.y+=dy;
  s.y0+=dy;s.y1+=dy;
  if(s.a)s.a.y+=dy;
  if(s.b)s.b.y+=dy;
  delete s.rect;delete s.rendered;delete s.predicted;
 }
 function textTopY(t){return parseFloat(t.el?.style?.top)||t.el?.offsetTop||0;}
 function shiftTextY(t,dy){
  if(!t?.el||t.line)return;
  t.el.style.top=(textTopY(t)+dy)+'px';
 }

 function insertPageAfter(idx){
  commitEdit();
  const tops=pages(),total=tops.length;
  const i=Math.max(0,Math.min(total-1,idx??pageNowIndex()));
  const cut=(i+1)*VH;
  strokes=strokes.map(s=>{
   const copy={...s,pts:s.pts.map(p=>({...p})),a:s.a?{...s.a}:null,b:s.b?{...s.b}:null};
   if(strokeMidY(copy)>=cut)shiftStrokeY(copy,VH);
   return copy;
  });
  for(const t of texts)if(!t.line&&textTopY(t)>=cut)shiftTextY(t,VH);
  for(const c of coverCards)if(c.y+c.h/2>=cut)c.y+=VH;
  while(pageMeta.length<total)pageMeta.push('');
  pageMeta.splice(i+1,0,'');
  extraHeight=Math.max(extraHeight+VH,(total+1)*VH);
  renderCovers();
  markPages();
  scrollTo((i+1)*VH,false);
  historyCommit();
  renderPageStudio();
  typeof toast==='function'&&toast('Đã chèn trang trắng mới (Trang '+(i+2)+')');
 }

 function duplicatePage(idx){
  commitEdit();
  const tops=pages(),total=tops.length;
  const i=Math.max(0,Math.min(total-1,idx??pageNowIndex()));
  const y0=i*VH,y1=(i+1)*VH;
  const newStrokes=[];
  const clones=[];
  for(const s of strokes){
   const copy={...s,pts:s.pts.map(p=>({...p})),a:s.a?{...s.a}:null,b:s.b?{...s.b}:null};
   const cy=strokeMidY(copy);
   if(cy>=y0&&cy<y1){
    const dup={...s,pts:s.pts.map(p=>({...p})),a:s.a?{...s.a}:null,b:s.b?{...s.b}:null};
    shiftStrokeY(dup,VH);
    clones.push(dup);
   }else if(cy>=y1){
    shiftStrokeY(copy,VH);
   }
   newStrokes.push(copy);
  }
  strokes=newStrokes.concat(clones);

  const textClones=[];
  for(const t of texts){
   if(t.line)continue;
   const ty=textTopY(t);
   if(ty>=y0&&ty<y1){
    const st=t.el.getAttribute('style')||'';
    let el;
    if(t.pic){
     el=picEl(t.pic.src,st,t.pic);
     if(t.pic.word)el.querySelector('img').alt=t.pic.word;
    }else{
     el=document.createElement('div');
     el.className='txt';
     el.setAttribute('style',st);
     el.textContent=t.el.textContent;
     el.contentEditable='false';
     board.appendChild(el);
    }
    el.style.top=(ty+VH)+'px';
    el.classList.toggle('nb-pinned',!!t.pinned);
    const nt={el,rot:t.rot||0,t1:performance.now(),pinned:!!t.pinned,done:true};
    if(t.pic)nt.pic={...t.pic};else wireEdit(el,nt);
    textClones.push(nt);
   }else if(ty>=y1){
    shiftTextY(t,VH);
   }
  }
  texts.push(...textClones);

  const covClones=[];
  for(const c of coverCards){
   const cy=c.y+c.h/2;
   if(cy>=y0&&cy<y1){
    covClones.push({...c,id:'cov_'+Date.now()+'_'+(coverSeq++),y:c.y+VH});
   }else if(cy>=y1){
    c.y+=VH;
   }
  }
  coverCards.push(...covClones);

  while(pageMeta.length<total)pageMeta.push('');
  const baseTitle=pageMeta[i]||'';
  pageMeta.splice(i+1,0,baseTitle?baseTitle+' (bản sao)':'');
  extraHeight=Math.max(extraHeight+VH,(total+1)*VH);
  renderCovers();
  markPages();
  scrollTo((i+1)*VH,false);
  historyCommit();
  renderPageStudio();
  typeof toast==='function'&&toast('Đã nhân bản Trang '+(i+1)+' thành Trang '+(i+2));
 }

 function swapPages(i,j){
  commitEdit();
  const tops=pages(),total=tops.length;
  if(i<0||j<0||i>=total||j>=total||i===j)return;
  const dy=(j-i)*VH;
  const yi0=i*VH,yi1=(i+1)*VH,yj0=j*VH,yj1=(j+1)*VH;
  strokes=strokes.map(s=>{
   const copy={...s,pts:s.pts.map(p=>({...p})),a:s.a?{...s.a}:null,b:s.b?{...s.b}:null};
   const cy=strokeMidY(copy);
   if(cy>=yi0&&cy<yi1)shiftStrokeY(copy,dy);
   else if(cy>=yj0&&cy<yj1)shiftStrokeY(copy,-dy);
   return copy;
  });
  for(const t of texts){
   if(t.line)continue;
   const ty=textTopY(t);
   if(ty>=yi0&&ty<yi1)shiftTextY(t,dy);
   else if(ty>=yj0&&ty<yj1)shiftTextY(t,-dy);
  }
  for(const c of coverCards){
   const cy=c.y+c.h/2;
   if(cy>=yi0&&cy<yi1)c.y+=dy;
   else if(cy>=yj0&&cy<yj1)c.y-=dy;
  }
  while(pageMeta.length<total)pageMeta.push('');
  const tmp=pageMeta[i];pageMeta[i]=pageMeta[j];pageMeta[j]=tmp;
  renderCovers();
  markPages();
  scrollTo(j*VH,false);
  historyCommit();
  renderPageStudio();
  typeof toast==='function'&&toast('Đã đổi chỗ Trang '+(i+1)+' và Trang '+(j+1));
 }

 function deletePage(idx){
  commitEdit();
  const tops=pages(),total=tops.length;
  const i=Math.max(0,Math.min(total-1,idx??pageNowIndex()));
  const y0=i*VH,y1=(i+1)*VH;
  if(total<=1){
   strokes=[];
   for(const t of [...texts])if(!t.line){t.el.remove();texts=texts.filter(x=>x!==t);}
   coverCards=[];
   pageMeta=[''];
   renderCovers();markPages();apply();historyCommit();renderPageStudio();
   typeof toast==='function'&&toast('Đã làm sạch Trang 1');
   return;
  }
  strokes=strokes.filter(s=>{const cy=strokeMidY(s);return cy<y0||cy>=y1;}).map(s=>{
   const copy={...s,pts:s.pts.map(p=>({...p})),a:s.a?{...s.a}:null,b:s.b?{...s.b}:null};
   if(strokeMidY(copy)>=y1)shiftStrokeY(copy,-VH);
   return copy;
  });
  for(const t of [...texts]){
   if(t.line)continue;
   const ty=textTopY(t);
   if(ty>=y0&&ty<y1){t.el.remove();texts=texts.filter(x=>x!==t);}
   else if(ty>=y1)shiftTextY(t,-VH);
  }
  coverCards=coverCards.filter(c=>{const cy=c.y+c.h/2;return cy<y0||cy>=y1;});
  for(const c of coverCards)if(c.y+c.h/2>=y1)c.y-=VH;
  if(i<pageMeta.length)pageMeta.splice(i,1);
  extraHeight=Math.max(VH,extraHeight-VH);
  renderCovers();
  markPages();
  scrollTo(Math.max(0,Math.min(i,total-2))*VH,false);
  historyCommit();
  renderPageStudio();
  typeof toast==='function'&&toast('Đã xóa Trang '+(i+1));
 }

 function pageNowIndex(){
  const tops=pages();let i=0;
  for(let n=1;n<tops.length;n++)if(scrollY>=tops[n]-30)i=n;
  return i;
 }

 function updatePinAllButton(){
  const items=[...strokes.filter(s=>!s.erase),...texts.filter(t=>!t.line)];
  const allPinned=items.length>0&&items.every(o=>!!o.pinned);
  for(const btn of document.querySelectorAll('.js-pin-all-btn')){
   btn.textContent=allPinned?'🔓 Mở khóa toàn bộ bài soạn':'📌 Ghim khóa toàn bộ làm bài soạn';
  }
 }

 function setStudioMode(m,h){
  if(!studioEl)return;
  studioMode=m;
  studioEl.classList.toggle('ps-compact',m==='compact');
  studioEl.classList.toggle('ps-expanded',m==='expanded');
  if(m==='compact'){
   studioEl.style.height='';
  }else{
   if(h)studioHeight=Math.max(140,Math.min(window.innerHeight*0.75,h));
   studioEl.style.height=studioHeight+'px';
  }
  renderPageStudio();
 }

 function renderPageStudio(curIdx,totalOverride){
  if(!studioEl||studioEl.hidden)return;
  const tops=pages(),total=totalOverride||tops.length,cur=curIdx!==undefined?curIdx:pageNowIndex();
  updatePinAllButton();

  // 1. Dải trượt slide nhỏ bên dưới (Compact Mini Strip)
  const miniStrip=studioEl.querySelector('.ps-mini-strip');
  if(miniStrip){
   miniStrip.replaceChildren();
   for(let i=0;i<total;i++){
    const tab=document.createElement('button');
    tab.type='button';
    tab.className='ps-tab'+(i===cur?' active':'');
    const title=(pageMeta[i]||'').trim();
    tab.title='Chuyển tới Trang '+(i+1)+(title?' ('+title+')':'');
    const lab=document.createElement('span');
    lab.textContent='Trang '+(i+1);
    tab.appendChild(lab);
    if(title){
     const tsub=document.createElement('span');
     tsub.className='ps-tab-title';
     tsub.textContent=' · '+title;
     tab.appendChild(tsub);
    }
    tab.onclick=()=>{scrollTo(tops[i],false);renderPageStudio();};
    miniStrip.appendChild(tab);
   }
   const addBtn=document.createElement('button');
   addBtn.type='button';
   addBtn.className='ps-mini-add';
   addBtn.title='Thêm trang mới vào cuối bài';
   addBtn.textContent='➕';
   addBtn.onclick=()=>insertPageAfter(total-1);
   miniStrip.appendChild(addBtn);

   const activeTab=miniStrip.children[cur];
   if(activeTab)activeTab.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});
  }

  // 2. Danh sách slide mở rộng dạng thẻ hàng ngang (Expanded Cards)
  const list=studioEl.querySelector('.ps-list');
  if(!list)return;
  const activeInputIdx=document.activeElement?.classList?.contains('ps-title')?Number(document.activeElement.dataset.idx):-1;
  if(activeInputIdx>=0&&list.children.length===total){
   [...list.children].forEach((row,idx)=>row.classList.toggle('active',idx===cur));
   return;
  }
  list.replaceChildren();
  for(let i=0;i<total;i++){
   const y0=i*VH,y1=(i+1)*VH;
   const nS=strokes.filter(s=>!s.erase&&strokeMidY(s)>=y0&&strokeMidY(s)<y1).length;
   const nT=texts.filter(t=>!t.line&&textTopY(t)>=y0&&textTopY(t)<y1).length;
   const nC=coverCards.filter(c=>(c.y+c.h/2)>=y0&&(c.y+c.h/2)<y1).length;
   const pinnedCount=strokes.filter(s=>!s.erase&&s.pinned&&strokeMidY(s)>=y0&&strokeMidY(s)<y1).length+texts.filter(t=>!t.line&&t.pinned&&textTopY(t)>=y0&&textTopY(t)<y1).length;

   const item=document.createElement('div');
   item.className='ps-item'+(i===cur?' active':'');
   item.title='Bấm để chuyển tới Trang '+(i+1)+(pageMeta[i]?' ('+pageMeta[i]+')':'');
   item.onclick=(e)=>{
    if(e.target.closest('input, .ps-acts button'))return;
    scrollTo(tops[i],false);
    renderPageStudio();
   };
   const r1=document.createElement('div');
   r1.className='ps-row1';
   const jump=document.createElement('button');
   jump.type='button';
   jump.className='ps-Jump';
   jump.textContent='Trang '+(i+1);
   jump.title='Chuyển tới Trang '+(i+1);
   jump.onclick=(e)=>{e.stopPropagation();scrollTo(tops[i],false);renderPageStudio();};

   const inp=document.createElement('input');
   inp.type='text';
   inp.className='ps-title';
   inp.dataset.idx=String(i);
   inp.placeholder='Đặt tên phần (VD: I. Khởi động...)';
   inp.value=pageMeta[i]||'';
   inp.oninput=()=>{
    while(pageMeta.length<=i)pageMeta.push('');
    pageMeta[i]=inp.value.slice(0,120);
    updatePageStatus();
    scheduleSave();
    const mTab=miniStrip?.children[i];
    if(mTab){
     const val=inp.value.trim();
     let sub=mTab.querySelector('.ps-tab-title');
     if(val){
      if(!sub){sub=document.createElement('span');sub.className='ps-tab-title';mTab.appendChild(sub);}
      sub.textContent=' · '+val;
     }else if(sub){sub.remove();}
    }
   };
   inp.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')inp.blur();};
   inp.onchange=()=>historyCommit();

   r1.append(jump,inp);

   const r2=document.createElement('div');
   r2.className='ps-row2';
   const stat=document.createElement('span');
   stat.textContent=`${nS} nét · ${nT} chữ/hình${nC?' · '+nC+' tấm che':''}${pinnedCount?' · 📌 '+pinnedCount:''}`;
   const acts=document.createElement('div');
   acts.className='ps-acts';

   const mkBtn=(act,label,title,disabled,fn)=>{
    const b=document.createElement('button');
    b.type='button';b.dataset.act=act;b.textContent=label;b.title=title;b.disabled=!!disabled;
    b.onclick=fn;
    return b;
   };
   acts.append(
    mkBtn('insert','➕ Chèn sau','Chèn trang trắng mới ngay sau trang này',false,()=>insertPageAfter(i)),
    mkBtn('dup','⧉ Nhân bản','Nhân bản toàn bộ nội dung trang này sang trang kế tiếp',false,()=>duplicatePage(i)),
    mkBtn('up','←','Đổi thứ tự sang trước',i===0,()=>swapPages(i,i-1)),
    mkBtn('down','→','Đổi thứ tự sang sau',i>=total-1,()=>swapPages(i,i+1)),
    mkBtn('del','🗑','Xóa trang này',false,()=>deletePage(i))
   );
   r2.append(stat);
   item.append(r1,r2,acts);
   list.appendChild(item);
  }

  const curItem=list.children[cur];
  if(curItem&&studioMode==='expanded')curItem.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});
 }

 function togglePageStudio(force){
  if(!studioEl)return;
  if(force===true){
   studioEl.hidden=false;
   setStudioMode('expanded');
  }else if(force===false){
   studioEl.hidden=true;
  }else{
   if(studioEl.hidden){
    studioEl.hidden=false;
    setStudioMode('compact');
   }else if(studioMode==='compact'){
    setStudioMode('expanded');
   }else{
    setStudioMode('compact');
   }
  }
  if(!studioEl.hidden)renderPageStudio();
 }

 /* ==================== 4. LASER, ĐÈN RỌI & ĐỒNG HỒ ĐẾM NGƯỢC ==================== */
 const laserCanvas=document.createElement('canvas');
 laserCanvas.id='nbLaserCanvas';
 laserCanvas.width=1600;laserCanvas.height=900;
 viewEl?.appendChild(laserCanvas);
 const laserCtx=laserCanvas.getContext('2d');
 let laserPts=[];
 let laserRaf=0;
 let laserDown=false;

 function pushLaserPt(pt,broadcast){
  const nowMs=performance.now();
  laserPts.push({
   x:pt.x,
   y:pt.y,
   scratch:Boolean(pt.scratch),
   t:nowMs,
   brk:!!pt.brk
  });
  if(broadcast)window.NBProjector?.send?.({
   kind:'laser',
   pt:{
    x:pt.x,
    y:pt.y,
    scratch:Boolean(pt.scratch),
    brk:!!pt.brk
   }
  });
  if(laserRaf){cancelAnimationFrame(laserRaf);laserRaf=0;}
  drawLaserFrame();
 }

 function getLaserStagePos(p){
  if(p.scratch && typeof splitK!=='undefined' && splitK < 1){
   const sz = typeof scratchZoom==='number'?scratchZoom:1;
   const sy = typeof scratchScrollY==='number'?scratchScrollY:0;
   return {
    x: 1600 * splitK + p.x * sz,
    y: (p.y - sy) * sz
   };
  }
  const z = typeof zoom==='number'?zoom:1;
  const sx = typeof scrollX==='number'?scrollX:0;
  const sy = typeof scrollY==='number'?scrollY:0;
  return {
   x: (p.x - sx) * z,
   y: (p.y - sy) * z
  };
 }

 function drawLaserFrame(){
  laserRaf=0;
  const nowMs=performance.now();
  laserPts=laserPts.filter(p=>nowMs-p.t<1350);
  const curVH=typeof VH==='number'?VH:900;
  if(laserCanvas.width!==1600||laserCanvas.height!==curVH){
   laserCanvas.width=1600;laserCanvas.height=curVH;
  }
  laserCtx.setTransform(1,0,0,1,0,0);
  laserCtx.clearRect(0,0,laserCanvas.width,laserCanvas.height);
  if(!laserPts.length)return;
  laserCtx.save();
  laserCtx.setTransform(1,0,0,1,0,0);
  laserCtx.lineCap='round';
  laserCtx.lineJoin='round';
  for(let i=1;i<laserPts.length;i++){
   const aPt=laserPts[i-1],bPt=laserPts[i];
   if(bPt.brk)continue;
   const a=getLaserStagePos(aPt),b=getLaserStagePos(bPt);
   const age=nowMs-bPt.t;
   const alpha=Math.max(0,1-age/1350);
   laserCtx.strokeStyle=`rgba(239,68,68,${(alpha*0.45).toFixed(3)})`;
   laserCtx.lineWidth=11;
   laserCtx.beginPath();laserCtx.moveTo(a.x,a.y);laserCtx.lineTo(b.x,b.y);laserCtx.stroke();

   laserCtx.strokeStyle=`rgba(255,255,255,${(alpha*0.95).toFixed(3)})`;
   laserCtx.lineWidth=3.2;
   laserCtx.beginPath();laserCtx.moveTo(a.x,a.y);laserCtx.lineTo(b.x,b.y);laserCtx.stroke();
  }
  const tipPt=laserPts[laserPts.length-1];
  const tip=getLaserStagePos(tipPt);
  const tipAlpha=Math.max(0,1-(nowMs-tipPt.t)/1350);
  laserCtx.fillStyle=`rgba(239,68,68,${(tipAlpha*0.9).toFixed(3)})`;
  laserCtx.beginPath();laserCtx.arc(tip.x,tip.y,8,0,Math.PI*2);laserCtx.fill();
  laserCtx.fillStyle=`rgba(255,255,255,${tipAlpha.toFixed(3)})`;
  laserCtx.beginPath();laserCtx.arc(tip.x,tip.y,3.5,0,Math.PI*2);laserCtx.fill();
  laserCtx.restore();
  laserRaf=requestAnimationFrame(drawLaserFrame);
 }

 /* Đèn rọi tiêu điểm (Spotlight) */
 const spotWrap=document.createElement('div');
 spotWrap.id='nbSpotlight';
 spotWrap.hidden=true;
 const spotHole=document.createElement('div');
 spotHole.className='nb-spot-hole';
 const spotCtrl=document.createElement('div');
 spotCtrl.className='nb-spot-ctrl';
 spotCtrl.innerHTML='<span>🎯 Đèn rọi</span><button type="button" data-s="-">−</button><button type="button" data-s="+">+</button><button type="button" data-s="x">✕ Tắt</button>';
 spotHole.appendChild(spotCtrl);
 spotWrap.appendChild(spotHole);
 viewEl?.appendChild(spotWrap);

 let spotState={on:false,x:800,y:450,r:210,scratch:false};
 function renderSpotlight(broadcast){
  spotWrap.hidden=!spotState.on;
  const btn=$('#spotlightBtn');
  if(btn)btn.setAttribute('aria-pressed',String(spotState.on));
  if(spotState.on){
   const isScratch=Boolean(spotState.scratch)&&typeof splitK!=='undefined'&&splitK<1;
   let cx,cy,d;
   if(isScratch){
    const sz=typeof scratchZoom==='number'?scratchZoom:1;
    const sy=typeof scratchScrollY==='number'?scratchScrollY:0;
    d=spotState.r*2*sz;
    cx=1600*splitK + spotState.x*sz;
    cy=(spotState.y - sy)*sz;
   } else {
    const z=typeof zoom==='number'?zoom:1;
    const sx=typeof scrollX==='number'?scrollX:0;
    const sy=typeof scrollY==='number'?scrollY:0;
    d=spotState.r*2*z;
    cx=(spotState.x - sx)*z;
    cy=(spotState.y - sy)*z;
   }
   const left=cx - d/2;
   const top=cy - d/2;
   spotHole.style.width=d+'px';
   spotHole.style.height=d+'px';
   spotHole.style.left=left+'px';
   spotHole.style.top=top+'px';
  }
  if(broadcast)window.NBProjector?.send?.({kind:'spotlight',spot:{...spotState}});
 }

 if(!isProjector){
  spotCtrl.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   e.stopPropagation();
   const act=b.dataset.s;
   if(act==='-'){spotState.r=Math.max(80,spotState.r-30);renderSpotlight(true);}
   else if(act==='+'){spotState.r=Math.min(550,spotState.r+30);renderSpotlight(true);}
   else if(act==='x'){spotState.on=false;renderSpotlight(true);}
  });
  spotHole.addEventListener('pointerdown',e=>{
   if(e.target.closest('button'))return;
   e.stopPropagation();e.preventDefault();
   const r=(viewEl||ink).getBoundingClientRect();
   const stageX0=(e.clientX-r.left)*1600/r.width;
   const curVH=typeof VH==='number'?VH:900;
   const stageY0=(e.clientY-r.top)*curVH/r.height;

   let initCenterX,initCenterY;
   const isScratchInit=Boolean(spotState.scratch)&&typeof splitK!=='undefined'&&splitK<1;
   if(isScratchInit){
    const sz=typeof scratchZoom==='number'?scratchZoom:1;
    const sy=typeof scratchScrollY==='number'?scratchScrollY:0;
    initCenterX=1600*splitK + spotState.x*sz;
    initCenterY=(spotState.y - sy)*sz;
   } else {
    const z=typeof zoom==='number'?zoom:1;
    const sx=typeof scrollX==='number'?scrollX:0;
    const sy=typeof scrollY==='number'?scrollY:0;
    initCenterX=(spotState.x - sx)*z;
    initCenterY=(spotState.y - sy)*z;
   }

   try{spotHole.setPointerCapture(e.pointerId);}catch(_){}
   const move=ev=>{
    if(ev.pointerId!==e.pointerId)return;
    const curStageX=(ev.clientX-r.left)*1600/r.width;
    const curStageY=(ev.clientY-r.top)*curVH/r.height;
    const newStageX=initCenterX + (curStageX - stageX0);
    const newStageY=initCenterY + (curStageY - stageY0);

    const isScratchNow=typeof splitK!=='undefined'&&splitK<1&&newStageX>=1600*splitK;
    spotState.scratch=isScratchNow;
    if(isScratchNow){
     const sz=typeof scratchZoom==='number'?scratchZoom:1;
     const sy=typeof scratchScrollY==='number'?scratchScrollY:0;
     spotState.x=Math.round((newStageX - 1600*splitK)/sz);
     spotState.y=Math.round(newStageY/sz + sy);
    } else {
     const z=typeof zoom==='number'?zoom:1;
     const sx=typeof scrollX==='number'?scrollX:0;
     const sy=typeof scrollY==='number'?scrollY:0;
     spotState.x=Math.round(newStageX/z + sx);
     spotState.y=Math.round(newStageY/z + sy);
    }
    renderSpotlight(true);
   };
   const up=ev=>{
    if(ev.pointerId!==e.pointerId)return;
    spotHole.removeEventListener('pointermove',move);
    spotHole.removeEventListener('pointerup',up);
    spotHole.removeEventListener('pointercancel',up);
   };
   spotHole.addEventListener('pointermove',move);
   spotHole.addEventListener('pointerup',up);
   spotHole.addEventListener('pointercancel',up);
  });
  spotHole.addEventListener('wheel',e=>{
   e.preventDefault();e.stopPropagation();
   spotState.r=Math.max(80,Math.min(550,spotState.r+(e.deltaY<0?20:-20)));
   renderSpotlight(true);
  },{passive:false});
 }

 function toggleSpotlight(force,opts){
  spotState.on=force!==undefined?!!force:!spotState.on;
  if(spotState.on){
   const curVH=typeof VH==='number'?VH:900;
   const wantScratch=opts?.scratch!==undefined?Boolean(opts.scratch):(selected.length?Boolean(selected[0]?.scratch):false);
   if(wantScratch&&typeof splitK!=='undefined'&&splitK<1){
    spotState.scratch=true;
    const sz=typeof scratchZoom==='number'?scratchZoom:1;
    const sy=typeof scratchScrollY==='number'?scratchScrollY:0;
    const availW=1600*(1-splitK);
    spotState.x=Math.round(availW/2);
    spotState.y=Math.round(sy+curVH/(2*sz));
   } else {
    spotState.scratch=false;
    const z=typeof zoom==='number'?zoom:1;
    const sx=typeof scrollX==='number'?scrollX:0;
    const sy=typeof scrollY==='number'?scrollY:0;
    const availW=typeof splitK!=='undefined'&&splitK<1?1600*splitK:1600;
    spotState.x=Math.round(sx+availW/(2*z));
    spotState.y=Math.round(sy+curVH/(2*z));
   }
  }
  renderSpotlight(true);
 }

 /* Đồng hồ đếm ngược trên bảng (Classroom Timer) */
 const timerEl=document.createElement('div');
 timerEl.id='nbClassTimer';
 timerEl.hidden=true;
 timerEl.innerHTML=`
  <div class="nbt-head"><span>⏱ ĐỒNG HỒ LỚP HỌC</span><button type="button" class="ps-close nbt-close" title="Ẩn đồng hồ">✕</button></div>
  <div class="nbt-digits">02:00</div>
  <div class="nbt-bar"><div class="nbt-fill"></div></div>
  <div class="nbt-presets">
   <button type="button" data-sec="60">1p</button>
   <button type="button" data-sec="120">2p</button>
   <button type="button" data-sec="180">3p</button>
   <button type="button" data-sec="300">5p</button>
   <button type="button" data-add="30">+30s</button>
  </div>
  <div class="nbt-actions">
   <button type="button" class="primary" data-tact="toggle">▶ Bắt đầu</button>
   <button type="button" data-tact="reset">↺ Đặt lại</button>
  </div>`;
 document.body.appendChild(timerEl);

 let timerState={on:false,running:false,totalMs:120000,remainMs:120000,endAt:0};
 let timerTickId=0;

 function playTimerChime(){
  try{
   const AC=window.AudioContext||window.webkitAudioContext;
   if(!AC)return;
   const ac=new AC();
   [523.25,659.25,783.99,1046.5].forEach((freq,idx)=>{
    const osc=ac.createOscillator(),g=ac.createGain();
    osc.type='sine';osc.frequency.value=freq;
    const t=ac.currentTime+idx*0.14;
    g.gain.setValueAtTime(0.001,t);
    g.gain.exponentialRampToValueAtTime(0.18,t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.38);
    osc.connect(g);g.connect(ac.destination);
    osc.start(t);osc.stop(t+0.4);
   });
  }catch(_){}
 }

 function renderTimerUI(broadcast){
  timerEl.hidden=!timerState.on;
  const btn=$('#classTimerBtn');
  if(btn)btn.setAttribute('aria-pressed',String(timerState.on));
  const sec=Math.max(0,Math.ceil(timerState.remainMs/1000));
  const m=String(Math.floor(sec/60)).padStart(2,'0');
  const s=String(sec%60).padStart(2,'0');
  timerEl.querySelector('.nbt-digits').textContent=m+':'+s;
  const pct=timerState.totalMs>0?Math.max(0,Math.min(100,timerState.remainMs/timerState.totalMs*100)):0;
  timerEl.querySelector('.nbt-fill').style.width=pct.toFixed(1)+'%';
  timerEl.classList.toggle('warn',timerState.on&&sec<=5&&sec>0);
  const tg=timerEl.querySelector('[data-tact="toggle"]');
  if(tg)tg.textContent=timerState.running?'⏸ Tạm dừng':'▶ Bắt đầu';
  if(broadcast)window.NBProjector?.send?.({kind:'timer',timer:{...timerState}});
 }

 function stepTimer(){
  if(!timerState.running)return;
  timerState.remainMs=Math.max(0,timerState.endAt-Date.now());
  if(timerState.remainMs<=0){
   timerState.running=false;
   clearInterval(timerTickId);timerTickId=0;
   renderTimerUI(true);
   playTimerChime();
   typeof toast==='function'&&toast('⏰ Đã hết thời gian!');
   return;
  }
  renderTimerUI(true);
 }

 function setTimerDuration(sec){
  timerState.running=false;
  clearInterval(timerTickId);timerTickId=0;
  timerState.totalMs=sec*1000;
  timerState.remainMs=sec*1000;
  renderTimerUI(true);
 }

 function toggleTimerRun(force){
  const want=force!==undefined?!!force:!timerState.running;
  if(want){
   if(timerState.remainMs<=0)timerState.remainMs=timerState.totalMs||120000;
   timerState.running=true;
   timerState.endAt=Date.now()+timerState.remainMs;
   if(!timerTickId)timerTickId=setInterval(stepTimer,200);
  }else{
   if(timerState.running)timerState.remainMs=Math.max(0,timerState.endAt-Date.now());
   timerState.running=false;
   clearInterval(timerTickId);timerTickId=0;
  }
  renderTimerUI(true);
 }

 function toggleClassTimer(force){
  timerState.on=force!==undefined?!!force:!timerState.on;
  if(!timerState.on&&timerState.running)toggleTimerRun(false);
  renderTimerUI(true);
 }

 if(!isProjector){
  timerEl.querySelector('.nbt-close').onclick=()=>toggleClassTimer(false);
  timerEl.querySelectorAll('[data-sec]').forEach(b=>b.onclick=()=>setTimerDuration(Number(b.dataset.sec)));
  timerEl.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{
   const addMs=Number(b.dataset.add)*1000;
   timerState.totalMs+=addMs;
   timerState.remainMs+=addMs;
   if(timerState.running)timerState.endAt+=addMs;
   renderTimerUI(true);
  });
  timerEl.querySelector('[data-tact="toggle"]').onclick=()=>toggleTimerRun();
  timerEl.querySelector('[data-tact="reset"]').onclick=()=>setTimerDuration(Math.round((timerState.totalMs||120000)/1000));

  /* Kéo di chuyển đồng hồ trên màn hình */
  const head=timerEl.querySelector('.nbt-head');
  head.addEventListener('pointerdown',e=>{
   if(e.target.closest('button'))return;
   e.preventDefault();
   const rc=timerEl.getBoundingClientRect(),x0=e.clientX,y0=e.clientY;
   try{head.setPointerCapture(e.pointerId);}catch(_){}
   const move=ev=>{
    if(ev.pointerId!==e.pointerId)return;
    timerEl.style.right='auto';
    timerEl.style.left=Math.max(8,Math.min(innerWidth-rc.width-8,rc.left+(ev.clientX-x0)))+'px';
    timerEl.style.top=Math.max(8,Math.min(innerHeight-rc.height-8,rc.top+(ev.clientY-y0)))+'px';
   };
   const up=ev=>{
    if(ev.pointerId!==e.pointerId)return;
    head.removeEventListener('pointermove',move);
    head.removeEventListener('pointerup',up);
    head.removeEventListener('pointercancel',up);
   };
   head.addEventListener('pointermove',move);
   head.addEventListener('pointerup',up);
   head.addEventListener('pointercancel',up);
  });
 }

 /* ==================== GIAO DIỆN NÚT TRÊN THANH CÔNG CỤ & BẢNG GIẢNG BÀI ==================== */
 if(!isProjector){
  studioEl=document.createElement('div');
  studioEl.id='pageStudio';
  studioEl.className='ps-compact';
  studioEl.hidden=false;
  studioMode='compact';
  studioHeight=255;
  studioEl.innerHTML=`
   <div class="ps-resizer" title="Kéo lên để mở to, kéo xuống để thu nhỏ">
    <div class="ps-resizer-handle"></div>
   </div>
   <div class="ps-mini-bar">
    <div class="ps-mini-label">📑 <span>Trang:</span></div>
    <div class="ps-mini-strip"></div>
    <div class="ps-mini-actions">
     <button type="button" class="ps-mini-btn ps-expand-btn" title="Kéo to / Mở rộng bảng quản lý trang">▲ Quản lý</button>
    </div>
    <div class="ps-mini-status" id="psInputStatus">
     <i></i> Sẵn sàng · Bút cảm ứng
    </div>
    <div class="ps-mini-zoom">
     <button type="button" class="ps-mini-zoom-btn" id="psZoomOut" title="Thu nhỏ">−</button>
     <button type="button" class="ps-mini-zoom-btn" id="psZoomReset" title="Vừa khung" style="min-width:38px;">100%</button>
     <button type="button" class="ps-mini-zoom-btn" id="psZoomIn" title="Phóng to">+</button>
    </div>
   </div>
   <div class="ps-expanded-view">
    <div class="ps-head">
     <b>📑 Quản lý Trang & Phần bài giảng</b>
     <div class="ps-head-acts">
      <button type="button" class="ps-collapse-btn" title="Thu nhỏ về thanh ngang bên dưới">▼ Thu nhỏ</button>
      <button type="button" class="ps-close" title="Thu nhỏ thanh">▼</button>
     </div>
    </div>
    <div class="ps-toolbar">
     <button type="button" class="js-pin-all-btn" id="pinAllTemplateBtn" title="Khóa toàn bộ nét viết, hình vẽ, hộp chữ hiện có làm bài soạn gốc để không bị tẩy xóa nhầm">📌 Ghim khóa toàn bộ làm bài soạn</button>
     <button type="button" class="ps-clean" id="clearTeachingInkBtn" title="Xóa các nét viết giảng bài phát sinh trong tiết học, giữ nguyên bài soạn đã ghim và đóng lại các tấm che">🧹 Xóa nét giảng (Dạy lớp kế)</button>
     <button type="button" id="studioAddCoverBtn" title="Thêm tấm che đáp án / rèm kéo lên trang hiện tại">🃏 Thêm tấm che đáp án</button>
     <button type="button" id="studioInsertPageBtn" title="Chèn một trang trắng ngay sau trang đang đứng">➕ Chèn trang sau trang này</button>
    </div>
    <div class="ps-list"></div>
   </div>`;
  document.body.appendChild(studioEl);

  const resizer=studioEl.querySelector('.ps-resizer');
  let dragStartY=0,dragStartH=0,isResizing=false;
  resizer.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;
   e.preventDefault();
   isResizing=true;
   dragStartY=e.clientY;
   dragStartH=studioEl.getBoundingClientRect().height;
   try{resizer.setPointerCapture(e.pointerId);}catch(_){}
   document.body.style.userSelect='none';
  });
  resizer.addEventListener('pointermove',e=>{
   if(!isResizing)return;
   const dy=dragStartY-e.clientY;
   const newH=Math.max(26,Math.min(window.innerHeight*0.75,dragStartH+dy));
   if(newH<55){
    setStudioMode('compact');
   }else{
    setStudioMode('expanded',Math.round(newH));
   }
  });
  const endResize=e=>{
   if(!isResizing)return;
   isResizing=false;
   try{resizer.releasePointerCapture(e.pointerId);}catch(_){}
   document.body.style.userSelect='';
  };
  resizer.addEventListener('pointerup',endResize);
  resizer.addEventListener('pointercancel',endResize);

  studioEl.querySelector('.ps-expand-btn').onclick=()=>setStudioMode('expanded');
  studioEl.querySelector('.ps-collapse-btn').onclick=()=>setStudioMode('compact');
  const miniCloseBtn=studioEl.querySelector('.ps-mini-close');if(miniCloseBtn)miniCloseBtn.onclick=()=>setStudioMode('compact');
  const expCloseBtn=studioEl.querySelector('.ps-close');if(expCloseBtn)expCloseBtn.onclick=()=>setStudioMode('compact');

  const origZoomIn = document.getElementById('zoomIn');
  const origZoomOut = document.getElementById('zoomOut');
  const origZoomReset = document.getElementById('zoomReset');
  const psZoomIn = studioEl.querySelector('#psZoomIn');
  const psZoomOut = studioEl.querySelector('#psZoomOut');
  const psZoomReset = studioEl.querySelector('#psZoomReset');

  if(psZoomIn)psZoomIn.onclick=()=>origZoomIn?origZoomIn.click():(typeof zoomBy==='function'&&zoomBy(1.2));
  if(psZoomOut)psZoomOut.onclick=()=>origZoomOut?origZoomOut.click():(typeof zoomBy==='function'&&zoomBy(1/1.2));
  if(psZoomReset)psZoomReset.onclick=()=>origZoomReset?origZoomReset.click():(typeof resetView==='function'&&resetView());

  if(origZoomReset&&psZoomReset){
    const syncZ=()=>{psZoomReset.textContent=origZoomReset.textContent||'100%';};
    const obsZ=new MutationObserver(syncZ);
    obsZ.observe(origZoomReset,{childList:true,characterData:true,subtree:true});
  }
  const origInputStatus=document.getElementById('inputStatus');
  const psInputStatus=studioEl.querySelector('#psInputStatus');
  if(origInputStatus&&psInputStatus){
    const syncS=()=>{psInputStatus.innerHTML=origInputStatus.innerHTML;};
    const obsS=new MutationObserver(syncS);
    obsS.observe(origInputStatus,{childList:true,characterData:true,subtree:true});
  }
  studioEl.querySelector('#pinAllTemplateBtn').onclick=()=>pinAllAsTemplate();
  studioEl.querySelector('#clearTeachingInkBtn').onclick=()=>clearTeachingInk();
  studioEl.querySelector('#studioAddCoverBtn').onclick=()=>addCoverCard();
  studioEl.querySelector('#studioInsertPageBtn').onclick=()=>insertPageAfter(pageNowIndex());

  const pageStatusEl=$('#pageStatus');
  if(pageStatusEl){
   pageStatusEl.title='Bấm để chuyển chế độ Quản lý Trang (Thanh nhỏ / Mở to / Ẩn)';
   pageStatusEl.onclick=()=>togglePageStudio();
  }
  renderPageStudio();

  /* Thêm nút Laser, Đèn rọi, Tấm che, Đồng hồ vào thanh công cụ trên #bar (ngay sau nút Chữ #mText) */
  const mTextBtn=$('#mText');
  if(mTextBtn&&mTextBtn.parentElement){
   const mkToolBtn=(id,label,title,svgInner)=>{
    const b=document.createElement('button');
    b.type='button';b.id=id;b.className='tb tool';b.setAttribute('aria-pressed','false');b.title=title;
    b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+svgInner+'</svg><span>'+label+'</span>';
    mTextBtn.parentElement.insertBefore(b,mTextBtn.nextSibling);
    return b;
   };
   const timerBtn=mkToolBtn('classTimerBtn','Hẹn giờ','Đồng hồ đếm ngược trên bảng (đồng bộ sang màn chiếu học sinh)',
    '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 3h6M12 3v2"/>');
   timerBtn.onclick=()=>toggleClassTimer();

   const spotBtn=mkToolBtn('spotlightBtn','Đèn rọi','Đèn rọi tiêu điểm tập trung sự chú ý của học sinh',
    '<circle cx="12" cy="12" r="9" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="4"/>');
   spotBtn.onclick=()=>toggleSpotlight();

   const covBtn=mkToolBtn('addCoverBtn','Tấm che','Thêm tấm che đáp án / rèm kéo từng phần lên bảng',
    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>');
   covBtn.onclick=()=>addCoverCard();

   const laserBtn=mkToolBtn('laserBtn','Laser','Bút chỉ Laser đỏ phát sáng tự tan sau 1.4 giây',
    '<circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M19.07 4.93l-2.83 2.83M7.76 16.24l-2.83 2.83"/>');
   laserBtn.onclick=()=>setMode(mode==='laser'?'pen':'laser');
  }

  /* Bổ sung các nút vào bảng Giảng bài bên phải ([data-section="lesson"]) */
  const lessonSec=document.querySelector('[data-section="lesson"]');
  if(lessonSec){
   const box=document.createElement('div');
   box.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px';
   box.innerHTML=`
    <button type="button" class="setting-btn" id="pageStudioBtn" style="grid-column:1/-1">📑 Quản lý Trang & Phần bài giảng (ClassIn Studio)</button>
    <button type="button" class="setting-btn js-pin-all-btn" id="lessonPinAllBtn">📌 Ghim khóa toàn bộ làm bài soạn</button>
    <button type="button" class="setting-btn" id="lessonClearTeachingBtn">🧹 Xóa nét giảng (Giữ bài soạn)</button>
    <button type="button" class="setting-btn" id="lessonAddCoverBtn">🃏 Thêm tấm che đáp án</button>
    <button type="button" class="setting-btn" id="lessonTimerBtn">⏱ Đồng hồ đếm ngược</button>`;
   lessonSec.appendChild(box);
   box.querySelector('#pageStudioBtn').onclick=()=>togglePageStudio(true);
   box.querySelector('#lessonPinAllBtn').onclick=()=>pinAllAsTemplate();
   box.querySelector('#lessonClearTeachingBtn').onclick=()=>clearTeachingInk();
   box.querySelector('#lessonAddCoverBtn').onclick=()=>addCoverCard();
   box.querySelector('#lessonTimerBtn').onclick=()=>toggleClassTimer();
  }

  /* Móc chế độ Bút Laser vào setMode & sự kiện vẽ trên #ink */
  const prevSetMode=setMode;
  setMode=function(m){
   prevSetMode(m);
   const lb=$('#laserBtn');
   if(lb)lb.setAttribute('aria-pressed',String(m==='laser'));
   document.body.classList.toggle('nb-laser-mode',m==='laser');
   if(m==='laser'){ink.style.cursor='crosshair';togglePageStudio(false);}
  };

  ink.addEventListener('pointerdown',e=>{
   if(mode!=='laser')return;
   if(e.pointerType==='touch'&&(typeof touchPans==='function'&&touchPans()||penOnly||touches.size))return;
   if(e.pointerType==='mouse'&&e.button!==0)return;
   e.stopImmediatePropagation();e.preventDefault();
   try{ink.setPointerCapture(e.pointerId);}catch(_){}
   laserDown=e.pointerId;
   const q=toBoard(e);
   pushLaserPt({x:q.x,y:q.y,scratch:!!q.scratch,brk:true},true);
  },true);

  ink.addEventListener('pointermove',e=>{
   if(mode!=='laser'||laserDown!==e.pointerId)return;
   e.stopImmediatePropagation();e.preventDefault();
   const q=toBoard(e);
   pushLaserPt({x:q.x,y:q.y,scratch:!!q.scratch,brk:false},true);
  },true);

  const endLaser=e=>{
   if(laserDown!==e.pointerId)return;
   laserDown=false;
  };
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>ink.addEventListener(t,endLaser,true));
 }

 /* Cập nhật vị trí lớp tấm che & đèn rọi khi cuộn/phóng bảng (cả máy thầy và màn chiếu) */
 if(typeof apply==='function'){
  const prevApply=apply;
  apply=function(...args){
   const r=prevApply.apply(this,args);
   syncCoverLayerTransform();
   if(spotState.on)renderSpotlight(false);
   return r;
  };
 }
 if(typeof placeScratch==='function'){
  const prevPlaceScratch=placeScratch;
  placeScratch=function(...args){
   const r=prevPlaceScratch.apply(this,args);
   syncCoverLayerTransform();
   if(spotState.on)renderSpotlight(false);
   return r;
  };
 }

 /* ==================== ĐỒNG BỘ MÀN CHIẾU HỌC SINH ==================== */
 function onProjectorMsg(m){
  if(!m)return;
  if(m.kind==='covers'){
   coverCards=cleanCovers(m.covers);
   renderCovers();
  }else if(m.kind==='laser'&&m.pt){
   pushLaserPt(m.pt,false);
  }else if(m.kind==='spotlight'&&m.spot){
   spotState={...spotState,...m.spot};
   renderSpotlight(false);
  }else if(m.kind==='timer'&&m.timer){
   timerState={...timerState,...m.timer};
   renderTimerUI(false);
  }
 }

 function syncProjectorAll(){
  window.NBProjector?.send?.({kind:'covers',covers:getCovers()});
  window.NBProjector?.send?.({kind:'spotlight',spot:{...spotState}});
  window.NBProjector?.send?.({kind:'timer',timer:{...timerState}});
 }

 function cleanState(st){
  if(!st||typeof st!=='object')return;
  st.pageMeta=cleanPageMeta(st.pageMeta);
  st.covers=cleanCovers(st.covers);
 }

 function restoreState(data){
  if(!data||typeof data!=='object')return;
  if(data.pageMeta!==undefined)pageMeta=cleanPageMeta(data.pageMeta);
  if(data.covers!==undefined){
   coverCards=cleanCovers(data.covers);
   renderCovers();
  }
  updatePinAllButton();
  if(studioEl&&!studioEl.hidden)renderPageStudio();
 }

 function reset(){
  pageMeta=[];
  coverCards=[];
  renderCovers();
  updatePinAllButton();
  if(studioEl&&!studioEl.hidden)renderPageStudio();
 }

 window.NBLessonStudio={
  getPageMeta,
  getCovers,
  maxCoverY,
  formatPageStatus,
  cleanState,
  restoreState,
  reset,
  openPageStudio:()=>togglePageStudio(true),
  closePageStudio:()=>togglePageStudio(false),
  setPageTitle:(i,title)=>{while(pageMeta.length<=i)pageMeta.push('');pageMeta[i]=String(title||'').slice(0,120);updatePageStatus();scheduleSave();if(studioEl&&!studioEl.hidden)renderPageStudio();},
  insertPageAfter,
  duplicatePage,
  swapPages,
  deletePage,
  togglePinSelected,
  pinAllAsTemplate,
  clearTeachingInk,
  addCoverCard,
  clearScratchCovers,
  renderCovers,
  syncCoverLayerTransform,
  toggleSpotlight,
  getSpotState:()=>({...spotState}),
  setSpotState:st=>{spotState={...spotState,...st};renderSpotlight(true);},
  renderSpotlight:()=>renderSpotlight(true),
  toggleClassTimer,
  setTimerDuration,
  toggleTimerRun,
  getLaserPts:()=>laserPts.slice(),
  pushLaserPt,
  onProjectorMsg,
  syncProjectorAll
 };
})();
