/* Imports stay in the teacher tab. Only reviewed question fields are uploaded.
   Dung chung: trang Ngan hang de (web/server/live-assets/import.js) va bang Live Quiz trong app (math/live-import.js) — giu hai ban giong nhau. */
(()=>{'use strict';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let loaded;
function script(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(Error('Không tải được bộ đọc Word.'));document.head.append(s);});}
async function wordReader(){if(window.NBWordImport&&window.NBWordCore)return;if(!loaded)loaded=(async()=>{for(const f of ['wmf','emf','word-core','word-import'])await script('/app/math/'+f+'.js');})();return loaded;}
/* origin/headers: bang trong app goi may chu NoteBoard bang token; trang web dung cookie + CSRF */
const cfg={origin:'',headers:async()=>({'X-NB-CSRF':window.NBLiveAuth?.csrf||''})};
function configure(o){Object.assign(cfg,o||{});}
function plain(html){const t=document.createElement('template');t.innerHTML=html;return t.content.textContent.replace(/\s+/g,' ').trim();}
function neutral(html){
 const cleaned=(html||'').replace(/\[(?:00)?[Aa]0\]/g,' ').replace(/\[EF[0-9A-Fa-f]{2}\]/g,' ').replace(/(\d+),\s+(\d+)/g,'$1,$2');
 const t=document.createElement('template');t.innerHTML=NBWordCore.cleanMarkup(cleaned);
 for(const e of t.content.querySelectorAll('*')){
  // Option decoration in Word often encodes its key. Do not project it.
  e.style.removeProperty('color');e.style.removeProperty('background-color');e.style.removeProperty('font-weight');e.style.removeProperty('text-decoration');
  e.removeAttribute('title');e.removeAttribute('class');
  if(['U','B','STRONG','EM','I'].includes(e.tagName))e.replaceWith(...e.childNodes);
  if(e.tagName==='IMG')e.alt='Hình minh họa';
 }
 return t.innerHTML.trim();
}
function marked(html){const t=document.createElement('template');t.innerHTML=html;return !!t.content.querySelector('u,[style*="text-decoration:underline"],[style*="text-decoration: underline"]');}
/* Hình neo (anchor) của Word nằm trước chữ đầu đoạn, vd hình đặt cạnh "Câu 1. …": đọc ra hình đứng trước "Câu 1."
   nên bị tính vào phần trước câu hỏi và mất. Đưa hình lớn (ảnh, hình vector EMF) xuống cuối chính đoạn đó;
   công thức nhỏ trong dòng (WMF/MathType) giữ nguyên vị trí. */
function hoistFigures(block){
 const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('svg')||!n.textContent.trim()?NodeFilter.FILTER_SKIP:NodeFilter.FILTER_ACCEPT});
 const first=walker.nextNode();if(!first)return;
 const big=m=>m.tagName==='IMG'?(parseFloat(m.style.width)||m.width||0)>=120:/EMF/.test(m.getAttribute('aria-label')||'');
 const lead=[...block.querySelectorAll('img,svg')].filter(m=>!m.parentElement.closest('svg')&&big(m)&&(m.compareDocumentPosition(first)&Node.DOCUMENT_POSITION_FOLLOWING));
 if(!lead.length)return;
 const p=document.createElement('p');p.append(...lead);block.append(p);
}
function parseBlocks(blocks){
 const root=document.createElement('div');for(const b of blocks){const d=document.createElement('div');d.innerHTML=b.html||'';hoistFigures(d);root.append(d,document.createTextNode('\n'));}
 for(const br of root.querySelectorAll('br'))br.replaceWith(document.createTextNode('\n'));
 const nodes=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('svg')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});let all='',n;
 while(n=walker.nextNode()){nodes.push({node:n,start:all.length,end:all.length+n.textContent.length});all+=n.textContent;}
 function point(i,end=false){const a=nodes.find(n=>end?i>n.start&&i<=n.end:i>=n.start&&i<n.end)||nodes.at(-1);return [a.node,Math.max(0,Math.min(a.node.length,i-a.start))];}
 function html(a,b){if(b<=a)return '';const range=document.createRange();range.setStart(...point(a));range.setEnd(...point(b,true));const wrap=document.createElement('div');wrap.append(range.cloneContents());return wrap.innerHTML;}
 const heads=[...all.matchAll(/(?:^|\n)\s*((?:Câu|Bài)\s*\d+\s*[.:)]?)/gi)];
 if(!heads.length)throw Error('Chưa thấy câu hỏi dạng “Câu 1.” hoặc “Bài 1.” trong Word. Hãy dùng mẫu JSON hoặc thêm câu hỏi thủ công.');
 const result=[],warnings=[];
 for(let i=0;i<heads.length;i++){
  const start=heads[i].index+heads[i][0].length,end=i+1<heads.length?heads[i+1].index:all.length;
  let raw=all.slice(start,end),stop=raw.search(/(?:^|\n)\s*(?:Hướng\s*dẫn(?:\s*giải)?|Lời\s*giải|Đáp\s*án|Đáp\s*số|Lời\s*giải\s*chi\s*tiết|PHẦN\s+[IVX\d]+|BẢNG\s*ĐÁP\s*ÁN)\s*[:.\n]/i);
  // Keep explanations exclusively in the local import source, never a public field.
  if(stop<0)stop=raw.length;
  const answerText=raw.slice(stop),content=raw.slice(0,stop);
  const options=[...content.matchAll(/(?:^|[\s\u2003])([A-Ha-d])[.)]\s*/g)].filter(m=>!nodes.find(n=>start+m.index>=n.start&&start+m.index<n.end)?.node.parentElement?.closest('svg'));
  const lower=options.length>=2&&options.every(m=>/[a-d]/.test(m[1]));
  const q={type:options.length>=2?'mcq':'short_answer',html:neutral(html(start,start+(options[0]?.index??stop))),options:[],multi:false,correct:[]};
  if(lower){
   const intro=q.html;
   for(let k=0;k<options.length;k++){
    const from=start+options[k].index+options[k][0].length,to=start+(options[k+1]?.index??stop);
    result.push({type:'mcq',html:intro+'<p>'+escape(options[k][1]+') ')+neutral(html(from,to))+'</p>',options:['Đúng','Sai'],multi:false,correct:[],source:'Câu '+(i+1)+options[k][1]});
   }
   warnings.push('Câu '+(i+1)+': đã tách từng ý Đúng/Sai; thầy/cô chọn đáp án cho từng ý.');
   continue;
  }
  if(options.length>=2){
   for(let k=0;k<options.length;k++){
    const from=start+options[k].index,to=start+(options[k+1]?.index??stop),value=html(from,to),body=html(from+options[k][0].length,to);
    q.options.push(neutral(body));if(marked(value))q.correct.push(k);
   }
   const explicit=/(?:Đáp\s*án|Chọn)\s*[:.]?\s*([A-H])\b/i.exec(answerText);
   if(explicit)q.correct=[explicit[1].toUpperCase().charCodeAt(0)-65];
   q.multi=q.correct.length>1;
  }else{
   const answer=/(?:Đáp\s*án|Đáp\s*số)\s*[:.]\s*([^\n]+)/i.exec(answerText);if(answer)q.correct=[answer[1].trim()];
  }
  q.source='Câu '+(i+1);result.push(q);
  if(!q.correct.length)warnings.push(q.source+': chưa xác định đáp án; cần thầy/cô rà soát.');
 }
 return {questions:result,warnings};
}
/* Ảnh chụp trong Word thường rất lớn; học sinh chỉ xem ở cỡ nhỏ. Thu ảnh trên 25 KB về tối đa 720×560 px (JPEG)
   để gói câu hỏi gửi nhanh cho cả lớp và không vượt giới hạn máy chủ. */
async function shrink(html,{w=720,h=560,quality=.75,min=25000}={}){
 if(!/<img/i.test(html||''))return html;
 const t=document.createElement('template');t.innerHTML=html;
 for(const im of t.content.querySelectorAll('img[src^="data:image/"]')){
  const src=im.getAttribute('src');if(src.length<min)continue;
  try{
   const img=new Image();img.src=src;await img.decode();
   const k=Math.min(1,w/Math.max(1,img.naturalWidth),h/Math.max(1,img.naturalHeight)),c=document.createElement('canvas');
   c.width=Math.max(1,Math.round(img.naturalWidth*k));c.height=Math.max(1,Math.round(img.naturalHeight*k));
   const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);
   const out=c.toDataURL('image/jpeg',quality);if(out.length<src.length)im.setAttribute('src',out);
  }catch(_){}
 }
 return t.innerHTML;
}
/* Thu gọn một câu cho vừa giới hạn gói dữ liệu của máy chủ (vd Nginx 32 KB): nén ảnh thêm từng bậc */
async function fit(q,max=29000){
 const out={...q,options:[...(q.options||[])]},size=()=>JSON.stringify(out).length;
 for(const [w,h,quality] of [[720,560,.74],[600,460,.66],[480,380,.6],[400,320,.55],[320,260,.5]]){
  if(size()<=max)break;
  const o={w,h,quality,min:5000};out.html=await shrink(out.html,o);out.options=await Promise.all(out.options.map(x=>shrink(x,o)));
 }
 return out;
}
async function read(file){
 if(file.size>30*1024*1024)throw Error('Hãy chọn file Word dưới 30 MB.');
 await wordReader();
 if(/\.docx$/i.test(file.name)){
  let fileToRead=file;
  try{
   const r=await fetch(cfg.origin+'/api/live/convert-word',{method:'POST',credentials:'include',headers:{'Content-Type':'application/octet-stream',...await cfg.headers()},body:file});
   if(r.ok){const blob=await r.blob();if(blob.size>500)fileToRead=new File([blob],file.name,{type:file.type});}
  }catch(e){}
  const blocks=await NBWordImport.read(fileToRead,{...NBWordCore}),result=parseBlocks(blocks),report=blocks.wordOriginal?.report;
  for(const q of result.questions){q.html=await shrink(q.html);q.options=await Promise.all((q.options||[]).map(shrink));}
  if(report?.unsupported?.length)result.warnings.unshift('Một số đối tượng Word chưa đọc được: '+report.unsupported.slice(0,5).join('; '));
  return result;
 }
 if(/\.json$/i.test(file.name)){
  const raw=JSON.parse(await file.text()),bank=Array.isArray(raw)?raw:raw.questions;
  if(!Array.isArray(bank)||!bank.length||bank.length>150)throw Error('JSON cần danh sách questions gồm 1–150 câu.');
  return {questions:bank.map(q=>({type:q.type||'mcq',html:neutral(q.html||escape(q.text||'')),options:(q.options||[]).map(neutral),multi:!!q.multi,correct:Array.isArray(q.correct)?q.correct:[]})),warnings:['Hãy kiểm tra nội dung chiếu và đáp án trước khi tạo phiên.']};
 }
 throw Error('Hỗ trợ file .docx và .json. PDF cần chuyển thành câu hỏi trước khi nhập.');
}
window.NBLiveImport={read,parseBlocks,neutral,plain,configure,fit};
})();
