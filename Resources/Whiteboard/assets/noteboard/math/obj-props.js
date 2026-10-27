/* Thuộc tính đối tượng đang chọn (nút "Thuộc tính" trên thanh đối tượng):
   - nét viết, hình: màu, độ dày; hình: kiểu đường (liền, đứt, chấm, chấm-gạch);
   - đoạn thẳng / véc tơ: mũi tên (không, một đầu, hai đầu), đảo chiều — véc tơ là thuộc tính chung của mọi đoạn thẳng;
   - ô chữ: màu, cỡ chữ.
   Sửa trên bản sao nét (detachSelected) rồi ghi lịch sử, nên Hoàn tác/Làm lại và lưu .nbink giữ đúng. */
(()=>{'use strict';
 const bar=document.getElementById('selBar');if(!bar)return;
 const LINE_KINDS=new Set(['line','arrow','doubleArrow','gSegment','gLine','gPoint']);   /* hình xác định bởi 2 đầu mút: vẽ lại được sau khi xoay */
 const ARROW_KINDS=new Set(['line','arrow','doubleArrow','gSegment']);
 const SWATCHES=['#12233A','#1B4FD8','#D62828','#2A9D3F','#F59E0B','#7C3AED','#0E7490','#DB2777','#FFFFFF'];
 const STYLES=[['solid','Liền',''],['dash','Đứt','7 5'],['dot','Chấm','0.1 4.2'],['dashdot','Chấm-gạch','9 4 0.1 4']];
 const css=document.createElement('style');css.textContent=`
#propPop{position:fixed;z-index:60;width:272px;background:#fff;border:1px solid #d5e0e5;border-radius:14px;box-shadow:0 16px 44px #1e344a33;padding:10px 12px;font:13px/1.4 "Segoe UI",system-ui,sans-serif;color:#22323f}
#propPop[hidden]{display:none}
#propPop .pp-row{margin:6px 0}
#propPop .pp-row>b{display:block;font-size:11.5px;color:#64748b;font-weight:600;margin-bottom:4px}
#propPop .pp-sw{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#propPop .pp-sw button{width:24px;height:24px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #cbd5e1;cursor:pointer;padding:0}
#propPop .pp-sw button.on{box-shadow:0 0 0 2px #0f766e}
#propPop .pp-sw input{width:28px;height:28px;padding:0;border:0;background:none;cursor:pointer}
#propPop .pp-seg{display:flex;gap:4px}
#propPop .pp-seg button{flex:1;min-height:30px;border:1px solid #d6dfe6;border-radius:8px;background:#fff;cursor:pointer;font-size:12px;color:#334155;display:flex;align-items:center;justify-content:center;gap:4px}
#propPop .pp-seg button.on{border-color:#0f766e;background:#ecfdf5;color:#0f766e;font-weight:600}
#propPop .pp-w{display:flex;align-items:center;gap:8px}#propPop .pp-w input{flex:1;accent-color:#0f766e}
#propPop .pp-w span{min-width:34px;text-align:right;font-variant-numeric:tabular-nums}
`;document.head.append(css);

 const btn=document.createElement('button');btn.type='button';btn.dataset.act='props';btn.hidden=true;
 btn.title='Thuộc tính: màu, độ dày, kiểu đường, mũi tên (véc tơ), cỡ chữ';
 btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4-4-7.4-9-7.4z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.2" r="1"/><circle cx="15" cy="7.6" r="1"/></svg><span>Thuộc tính</span>';
 (bar.querySelector('[data-act="clone"]')||bar.lastElementChild)?.before(btn);
 const pop=document.createElement('div');pop.id='propPop';pop.hidden=true;pop.setAttribute('role','dialog');pop.setAttribute('aria-label','Thuộc tính đối tượng');
 document.body.append(pop);

 const strokesSel=()=>selected.filter(o=>o.pts&&!o.erase);
 const textsSel=()=>selected.filter(o=>o.el&&!o.pic&&!o.line);
 const lineLike=o=>o.flat&&o.a&&o.b&&ARROW_KINDS.has(o.kind);
 function bounds(o){let y0=1e9,y1=-1e9;for(const q of o.pts){if(q.y<y0)y0=q.y;if(q.y>y1)y1=q.y;}o.y0=y0;o.y1=y1;}
 function regen(o){
  if(!o.flat||!o.a||!o.b||!LINE_KINDS.has(o.kind))return;
  const keep=shapeLW;shapeLW=o.w*1.3;o.pts=shapePts(o.kind,o.a,o.b,false,o);shapeLW=keep;bounds(o);
 }
 /* sửa các nét đang chọn: commit=false khi kéo thanh độ dày (xem trước), true khi thả */
 function editStrokes(fn,commit=true){
  detachSelected();
  for(const o of strokesSel())fn(o);
  paint();if(commit)historyCommit();placeSelBar();
 }
 function editTexts(fn){for(const t of textsSel())fn(t);historyCommit();placeSelBar();}
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 function row(label){const r=el('div','pp-row');r.append(el('b','',label));pop.append(r);return r;}

 function render(){
  pop.replaceChildren();
  const ss=strokesSel(),ts=textsSel(),shapes=ss.filter(o=>o.flat);
  if(!ss.length&&!ts.length){pop.hidden=true;return;}
  /* màu */
  const cur=(ss[0]?.color||ts[0]?.el.style.color||'').toLowerCase();
  const sw=el('div','pp-sw');
  const setColor=c=>{if(ss.length)editStrokes(o=>{o.color=c;},!ts.length);if(ts.length)editTexts(t=>{t.el.style.color=c;});render();};
  for(const c of SWATCHES){const b=el('button');b.type='button';b.style.background=c;b.title=c;b.classList.toggle('on',cur===c.toLowerCase());b.onclick=()=>setColor(c);sw.append(b);}
  const pick=el('input');pick.type='color';pick.title='Màu tùy chọn';pick.value=/^#[\da-f]{6}$/i.test(cur)?cur:'#1b4fd8';pick.onchange=()=>setColor(pick.value);sw.append(pick);
  row('Màu').append(sw);
  /* độ dày nét */
  if(ss.length){
   const w=el('div','pp-w'),r=el('input'),v=el('span');r.type='range';r.min='0.5';r.max='20';r.step='0.5';r.value=String(ss[0].w);v.textContent=(+r.value).toFixed(1);
   r.oninput=()=>{v.textContent=(+r.value).toFixed(1);editStrokes(o=>{if(o.erase)return;o.w=+r.value;regen(o);},false);};
   r.onchange=()=>{historyCommit();};
   w.append(r,v);row('Độ dày').append(w);
  }
  /* kiểu đường (hình vẽ; nét viết tay giữ liền) */
  if(shapes.length){
   const seg=el('div','pp-seg'),now=shapes[0].dash||'solid';
   for(const [k,l,d] of STYLES){const b=el('button');b.type='button';b.title='Nét '+l.toLowerCase();b.classList.toggle('on',now===k);
    b.innerHTML='<svg viewBox="0 0 30 10" width="30" height="10" aria-hidden="true"><path d="M2 5H28" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"'+(d?' stroke-dasharray="'+d+'"':'')+'/></svg>';
    b.onclick=()=>{editStrokes(o=>{if(!o.flat)return;if(k==='solid')delete o.dash;else o.dash=k;});render();};seg.append(b);}
   row('Kiểu đường').append(seg);
  }
  /* mũi tên: đoạn thẳng <-> véc tơ */
  if(ss.length&&ss.every(lineLike)){
   const seg=el('div','pp-seg'),k0=ss[0].kind,now=k0==='arrow'?'end':k0==='doubleArrow'?'both':'none';
   for(const [k,l,t] of [['none','—','Đoạn thẳng (không mũi tên)'],['end','→','Véc tơ (mũi tên một đầu)'],['both','↔','Mũi tên hai đầu']]){
    const b=el('button','',l);b.type='button';b.title=t;b.classList.toggle('on',now===k);
    b.onclick=()=>{editStrokes(o=>{if(!lineLike(o))return;if(!o.baseKind)o.baseKind=['arrow','doubleArrow'].includes(o.kind)?'line':o.kind;o.kind=k==='end'?'arrow':k==='both'?'doubleArrow':o.baseKind;regen(o);});render();};
    seg.append(b);
   }
   const flip=el('button','','⇄');flip.type='button';flip.title='Đảo chiều véc tơ';
   flip.onclick=()=>{editStrokes(o=>{if(!lineLike(o))return;[o.a,o.b]=[o.b,o.a];regen(o);});};
   seg.append(flip);
   row('Mũi tên (véc tơ)').append(seg);
  }
  /* cỡ chữ */
  if(ts.length){
   const seg=el('div','pp-seg'),size=Math.round(parseFloat(getComputedStyle(ts[0].el).fontSize)||24),lab=el('button','',size+' px');lab.type='button';lab.disabled=true;
   const step=d=>{editTexts(t=>{const s=parseFloat(getComputedStyle(t.el).fontSize)||24;t.el.style.fontSize=Math.max(12,Math.min(96,Math.round(s+d)))+'px';});render();};
   const minus=el('button','','A−'),plus=el('button','','A+');minus.type=plus.type='button';minus.title='Chữ nhỏ hơn';plus.title='Chữ lớn hơn';
   minus.onclick=()=>step(-4);plus.onclick=()=>step(4);seg.append(minus,lab,plus);row('Cỡ chữ').append(seg);
  }
  place();
 }
 function place(){
  if(pop.hidden)return;
  const r=bar.getBoundingClientRect(),h=pop.offsetHeight||220;
  pop.style.left=Math.round(Math.max(8,Math.min(innerWidth-288,r.left)))+'px';
  pop.style.top=Math.round(r.bottom+6+h<innerHeight?r.bottom+6:Math.max(8,r.top-h-6))+'px';
 }
 btn.onclick=()=>{if(pop.hidden){pop.hidden=false;render();}else pop.hidden=true;};
 addEventListener('pointerdown',e=>{if(!pop.hidden&&!pop.contains(e.target)&&!btn.contains(e.target)&&!bar.contains(e.target))pop.hidden=true;},true);
 addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden){pop.hidden=true;e.stopPropagation();}},true);
 const basePlace=placeSelBar;
 placeSelBar=function(){
  basePlace();
  const any=!bar.hidden&&(strokesSel().length>0||textsSel().length>0);
  btn.hidden=!any;
  if(!any)pop.hidden=true;else place();
 };
 window.NBObjProps={open:()=>{if(!btn.hidden){pop.hidden=false;render();}},close:()=>{pop.hidden=true;}};
})();
