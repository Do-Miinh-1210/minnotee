/* DOCX objects stay vector where possible; original DOCX/OLE bytes are retained
 * verbatim in the lesson. No macro, embedded program or external relationship runs. */
(()=>{'use strict';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',M='http://schemas.openxmlformats.org/officeDocument/2006/math',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',V='urn:schemas-microsoft-com:vml';let original=null,button;
const children=e=>Array.from(e?.children||[]),find=(e,n)=>Array.from(e.getElementsByTagName('*')).find(x=>x.localName===n),all=(e,n)=>Array.from(e.getElementsByTagName('*')).filter(x=>x.localName===n),attr=(e,n,ns=W)=>e?.getAttributeNS(ns,n)||e?.getAttribute(n)||'',escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digest=async b=>crypto.subtle?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(x=>x.toString(16).padStart(2,'0')).join(''):'';
/* Ký hiệu font Symbol / Wingdings (w:sym, hoặc chữ gõ bằng font Symbol: Δ, •, ✍…) → Unicode */
const WINGDINGS={0x21:'✏',0x22:'✂',0x28:'☎',0x2a:'✉',0x36:'⌛',0x3f:'✍',0x40:'✍',0x41:'✌',0x43:'👍',0x44:'👎',0x45:'☜',0x46:'☞',0x47:'☝',0x48:'☟',0x4a:'☺',0x4c:'☹',0x4e:'☠',0x52:'☼',0x54:'❄',0x6c:'●',0x6d:'❍',0x6e:'■',0x6f:'□',0x70:'◻',0x71:'❑',0x72:'❒',0x73:'⬧',0x74:'⧫',0x75:'◆',0x76:'❖',0x77:'⬥',0x78:'⌧',0x9f:'•',0xa1:'○',0xa7:'▪',0xa8:'◻',0xab:'★',0xd8:'➢',0xe0:'➔',0xe8:'➔',0xef:'⇦',0xf0:'⇨',0xf1:'⇧',0xf2:'⇩',0xfb:'✗',0xfc:'✓',0xfd:'☒',0xfe:'☑'};
const kid=(e,n)=>children(e).find(x=>x.localName===n);
function fontOf(pr){const f=pr&&kid(pr,'rFonts'),n=attr(f,'ascii')||attr(f,'hAnsi');return /^(symbol|wingdings)/i.test(n)?n:'';}
function symChar(font,hex){let code=parseInt(hex,16);if(!Number.isFinite(code))return '';if(code>=0xF000&&code<=0xF0FF)code-=0xF000;else if(code>0xFF)return String.fromCodePoint(code);
 if(/^symbol/i.test(font))return window.NBWmf?.symbolChar?.(code)||String.fromCharCode(code);if(/^wingdings/i.test(font))return WINGDINGS[code]||'•';return String.fromCharCode(code);}
const on=(pr,n)=>{const e=pr&&kid(pr,n);return !!e&&!/^(0|false|none)$/i.test(attr(e,'val'));};
const HIGHLIGHT={yellow:'#ffff00',green:'#00ff00',cyan:'#00ffff',magenta:'#ff00ff',blue:'#0000ff',red:'#ff0000',darkBlue:'#000080',darkCyan:'#008080',darkGreen:'#008000',darkMagenta:'#800080',darkRed:'#800000',darkYellow:'#808000',darkGray:'#808080',lightGray:'#c0c0c0',black:'#000000'};
/* Một đoạn chữ: đậm, nghiêng, gạch chân, gạch ngang, chỉ số dưới/trên, màu, tô sáng; trong hộp chữ giữ cả cỡ chữ */
function runHtml(s,pr,box,onColor){
 if(!s)return '';
 if(on(pr,'b'))s='<strong>'+s+'</strong>';if(on(pr,'i'))s='<em>'+s+'</em>';if(on(pr,'u'))s='<u>'+s+'</u>';if(on(pr,'strike')||on(pr,'dstrike'))s='<s>'+s+'</s>';
 const va=attr(pr&&kid(pr,'vertAlign'),'val');if(va==='subscript')s='<sub>'+s+'</sub>';else if(va==='superscript')s='<sup>'+s+'</sup>';
 const color=attr(pr&&kid(pr,'color'),'val'),hl=HIGHLIGHT[attr(pr&&kid(pr,'highlight'),'val')],sz=Number(attr(pr&&kid(pr,'sz'),'val'));
 const st=[];if(/^[a-f0-9]{6}$/i.test(color)){onColor?.(color);st.push('color:#'+color);}if(hl)st.push('background-color:'+hl);if(box&&sz)st.push('font-size:'+(sz/2*96/72*box.K).toFixed(1)+'px');
 return st.length?'<span style="'+st.join(';')+'">'+s+'</span>':s;
}
/* ---------- Hình vẽ DrawingML: nhóm hình, hộp chữ, đường nối có mũi tên, cung, hình tự do (custGeom) ----------
   Vẽ lại thành SVG (hình) + lớp chữ HTML (hộp chữ, có cả công thức MathType) theo đúng tọa độ trong Word. */
const PRESET_CLR={black:'000000',white:'FFFFFF',red:'FF0000',green:'008000',blue:'0000FF',yellow:'FFFF00',gray:'808080',grey:'808080',orange:'FFA500',purple:'800080',navy:'000080',darkBlue:'00008B',darkRed:'8B0000',darkGreen:'006400',lightGray:'D3D3D3',cyan:'00FFFF',magenta:'FF00FF',brown:'A52A2A'};
function themeColors(xml){const out={};if(!xml)return out;const d=new DOMParser().parseFromString(xml,'application/xml'),s=find(d,'clrScheme');for(const c of children(s)){const v=children(c)[0];if(v)out[c.localName]=v.localName==='sysClr'?(attr(v,'lastClr')||(attr(v,'val')==='window'?'FFFFFF':'000000')):attr(v,'val');}return out;}
function hsl([r,g,b]){const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;if(mx===mn)return [0,0,l];const d=mx-mn,s=l>.5?d/(2-mx-mn):d/(mx+mn),h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;return [h/6,s,l];}
function rgb([h,s,l]){if(!s)return [l,l,l];const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q,f=t=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p;};return [f(h+1/3),f(h),f(h-1/3)];}
function colorOf(el,theme){
 const c=children(el).find(x=>/^(srgbClr|schemeClr|prstClr|sysClr|scrgbClr)$/.test(x.localName));if(!c)return null;
 const v=attr(c,'val'),hex=c.localName==='srgbClr'?v:c.localName==='sysClr'?(attr(c,'lastClr')||'000000'):c.localName==='prstClr'?(PRESET_CLR[v]||'000000'):c.localName==='schemeClr'?(theme[{tx1:'dk1',bg1:'lt1',tx2:'dk2',bg2:'lt2'}[v]||v]||'000000'):'000000';
 let px=[0,2,4].map(i=>parseInt(hex.substr(i,2),16)/255);if(px.some(Number.isNaN))px=[0,0,0];let a=1;
 for(const m of children(c)){const k=Number(attr(m,'val'))/100000;if(!Number.isFinite(k))continue;
  if(m.localName==='lumMod'||m.localName==='lumOff'){const t=hsl(px);t[2]=m.localName==='lumMod'?t[2]*k:Math.min(1,t[2]+k);px=rgb(t);}
  else if(m.localName==='shade')px=px.map(x=>x*k);else if(m.localName==='tint')px=px.map(x=>1-(1-x)*k);else if(m.localName==='alpha')a=k;}
 return {hex:'#'+px.map(x=>Math.round(Math.max(0,Math.min(1,x))*255).toString(16).padStart(2,'0')).join(''),a};
}
/* Công thức hình dạng (gdLst) theo chuẩn DrawingML */
function guides(list,w,h,vars){
 const v={w,h,l:0,t:0,r:w,b:h,wd2:w/2,hd2:h/2,wd4:w/4,hd4:h/4,wd8:w/8,hd8:h/8,hc:w/2,vc:h/2,ss:Math.min(w,h),ls:Math.max(w,h),cd2:10800000,cd4:5400000,cd8:2700000,'3cd4':16200000,'3cd8':8100000,'5cd8':13500000,'7cd8':18900000,...vars};
 v.ssd2=v.ss/2;v.ssd4=v.ss/4;v.ssd6=v.ss/6;v.ssd8=v.ss/8;v.ssd16=v.ss/16;v.ssd32=v.ss/32;
 const val=x=>x in v?v[x]:Number(x)||0,rad=x=>x/60000*Math.PI/180;
 for(const g of list){const [op,...a]=(attr(g,'fmla')||'').trim().split(/\s+/),[x,y,z]=a.map(val);let r=0;
  switch(op){case '*/':r=z?x*y/z:0;break;case '+-':r=x+y-z;break;case '+/':r=z?(x+y)/z:0;break;case '?:':r=x>0?y:z;break;case 'abs':r=Math.abs(x);break;case 'at2':r=Math.atan2(y,x)*180/Math.PI*60000;break;
   case 'cat2':r=x*Math.cos(Math.atan2(z,y));break;case 'sat2':r=x*Math.sin(Math.atan2(z,y));break;case 'cos':r=x*Math.cos(rad(y));break;case 'sin':r=x*Math.sin(rad(y));break;case 'tan':r=x*Math.tan(rad(y));break;
   case 'max':r=Math.max(x,y);break;case 'min':r=Math.min(x,y);break;case 'mod':r=Math.hypot(x,y,z);break;case 'pin':r=y<x?x:y>z?z:y;break;case 'sqrt':r=Math.sqrt(Math.max(0,x));break;case 'val':r=x;break;}
  v[attr(g,'name')]=r;}
 return val;
}
const ADJ_DEFAULT={roundRect:{adj:16667},arc:{adj1:16200000,adj2:0},bentConnector3:{adj1:50000},triangle:{adj:50000},parallelogram:{adj:25000},trapezoid:{adj:25000},rightArrow:{adj1:50000,adj2:50000},leftArrow:{adj1:50000,adj2:50000},upArrow:{adj1:50000,adj2:50000},downArrow:{adj1:50000,adj2:50000},chevron:{adj:50000},homePlate:{adj:50000},plus:{adj:25000},hexagon:{adj:25000},can:{adj:25000}};
/* Đường viền hình mẫu trong hộp w×h (px). open: đường hở (đường thẳng, cung) — trả cả điểm đầu/cuối để vẽ mũi tên */
function presetPath(kind,w,h,adj){
 const a=k=>adj[k]/100000,f=n=>n.toFixed(2),P=pts=>'M'+pts.map(p=>f(p[0])+' '+f(p[1])).join(' L')+' Z';
 switch(kind){
  case 'line':case 'straightConnector1':return {d:`M0 0 L${f(w)} ${f(h)}`,open:true,ends:[[0,0],[w,h]],dirs:[[w,h],[w,h]]};
  case 'bentConnector2':return {d:`M0 0 L${f(w)} 0 L${f(w)} ${f(h)}`,open:true,ends:[[0,0],[w,h]],dirs:[[w,0],[0,h]]};
  case 'bentConnector3':{const x=w*a('adj1');return {d:`M0 0 L${f(x)} 0 L${f(x)} ${f(h)} L${f(w)} ${f(h)}`,open:true,ends:[[0,0],[w,h]],dirs:[[1,0],[1,0]]};}
  case 'curvedConnector3':return {d:`M0 0 C${f(w/2)} 0 ${f(w/2)} ${f(h)} ${f(w)} ${f(h)}`,open:true,ends:[[0,0],[w,h]],dirs:[[1,0],[1,0]]};
  case 'arc':{const rx=w/2,ry=h/2,st=adj.adj1/60000*Math.PI/180,en=adj.adj2/60000*Math.PI/180;let sw=en-st;while(sw<=0)sw+=2*Math.PI;const p=t=>[rx+rx*Math.cos(t),ry+ry*Math.sin(t)],s=p(st),e=p(st+sw);
   return {d:`M${f(s[0])} ${f(s[1])} A${f(rx)} ${f(ry)} 0 ${sw>Math.PI?1:0} 1 ${f(e[0])} ${f(e[1])}`,open:true,ends:[s,e],dirs:[[-Math.sin(st)*rx,Math.cos(st)*ry],[-Math.sin(st+sw)*rx,Math.cos(st+sw)*ry]]};}
  case 'ellipse':case 'flowChartConnector':return {d:`M0 ${f(h/2)} A${f(w/2)} ${f(h/2)} 0 1 1 ${f(w)} ${f(h/2)} A${f(w/2)} ${f(h/2)} 0 1 1 0 ${f(h/2)} Z`};
  case 'roundRect':case 'flowChartAlternateProcess':{const r=Math.min(w,h)*a('adj');return {d:`M${f(r)} 0 H${f(w-r)} A${f(r)} ${f(r)} 0 0 1 ${f(w)} ${f(r)} V${f(h-r)} A${f(r)} ${f(r)} 0 0 1 ${f(w-r)} ${f(h)} H${f(r)} A${f(r)} ${f(r)} 0 0 1 0 ${f(h-r)} V${f(r)} A${f(r)} ${f(r)} 0 0 1 ${f(r)} 0 Z`};}
  case 'triangle':case 'flowChartExtract':return {d:P([[w*a('adj'),0],[w,h],[0,h]])};
  case 'rtTriangle':return {d:P([[0,0],[w,h],[0,h]])};
  case 'diamond':case 'flowChartDecision':return {d:P([[w/2,0],[w,h/2],[w/2,h],[0,h/2]])};
  case 'parallelogram':case 'flowChartInputOutput':{const x=Math.min(w,h)*a('adj');return {d:P([[x,0],[w,0],[w-x,h],[0,h]])};}
  case 'trapezoid':{const x=Math.min(w,h)*a('adj');return {d:P([[x,0],[w-x,0],[w,h],[0,h]])};}
  case 'pentagon':return {d:P([[w/2,0],[w,h*.38],[w*.81,h],[w*.19,h],[0,h*.38]])};
  case 'hexagon':{const x=Math.min(w,h)*a('adj');return {d:P([[x,0],[w-x,0],[w,h/2],[w-x,h],[x,h],[0,h/2]])};}
  case 'homePlate':{const x=Math.min(w,h)*a('adj');return {d:P([[0,0],[w-x,0],[w,h/2],[w-x,h],[0,h]])};}
  case 'chevron':{const x=Math.min(w,h)*a('adj');return {d:P([[0,0],[w-x,0],[w,h/2],[w-x,h],[0,h],[x,h/2]])};}
  case 'plus':{const x=Math.min(w,h)*a('adj');return {d:P([[x,0],[w-x,0],[w-x,x],[w,x],[w,h-x],[w-x,h-x],[w-x,h],[x,h],[x,h-x],[0,h-x],[0,x],[x,x]])};}
  case 'rightArrow':{const t=h*a('adj1')/2,x=w-Math.min(w,h)*a('adj2');return {d:P([[0,h/2-t],[x,h/2-t],[x,0],[w,h/2],[x,h],[x,h/2+t],[0,h/2+t]])};}
  case 'leftArrow':{const t=h*a('adj1')/2,x=Math.min(w,h)*a('adj2');return {d:P([[w,h/2-t],[x,h/2-t],[x,0],[0,h/2],[x,h],[x,h/2+t],[w,h/2+t]])};}
  case 'upArrow':{const t=w*a('adj1')/2,y=Math.min(w,h)*a('adj2');return {d:P([[w/2-t,h],[w/2-t,y],[0,y],[w/2,0],[w,y],[w/2+t,y],[w/2+t,h]])};}
  case 'downArrow':{const t=w*a('adj1')/2,y=h-Math.min(w,h)*a('adj2');return {d:P([[w/2-t,0],[w/2-t,y],[0,y],[w/2,h],[w,y],[w/2+t,y],[w/2+t,0]])};}
  case 'can':{const r=Math.min(w,h)*a('adj')/2;return {d:`M0 ${f(r)} A${f(w/2)} ${f(r)} 0 0 1 ${f(w)} ${f(r)} V${f(h-r)} A${f(w/2)} ${f(r)} 0 0 1 0 ${f(h-r)} Z M0 ${f(r)} A${f(w/2)} ${f(r)} 0 0 0 ${f(w)} ${f(r)}`};}
  default:return {d:`M0 0 H${f(w)} V${f(h)} H0 Z`};
 }
}
/* Hình tự do: pathLst với tọa độ là số hoặc tên công thức */
function customPath(geom,wE,hE,w,h){
 const val=guides([...children(kid(geom,'avLst')),...children(kid(geom,'gdLst'))],wE,hE,{}),out=[],f=n=>n.toFixed(2);let first=null,last=null,open=true;
 for(const p of all(geom,'path')){const pw=Number(attr(p,'w'))||wE,ph=Number(attr(p,'h'))||hE,sx=w/(pw||1),sy=h/(ph||1),pt=e=>[val(attr(e,'x'))*sx,val(attr(e,'y'))*sy];let d='',cur=[0,0];const noFill=attr(p,'fill')==='none';
  for(const c of children(p)){const ps=children(c).filter(x=>x.localName==='pt').map(pt);
   if(c.localName==='moveTo'){cur=ps[0];d+=`M${f(cur[0])} ${f(cur[1])} `;first||=cur;}
   else if(c.localName==='lnTo'){cur=ps[0];d+=`L${f(cur[0])} ${f(cur[1])} `;}
   else if(c.localName==='cubicBezTo'&&ps.length===3){d+=`C${ps.map(q=>f(q[0])+' '+f(q[1])).join(' ')} `;cur=ps[2];}
   else if(c.localName==='quadBezTo'&&ps.length===2){d+=`Q${ps.map(q=>f(q[0])+' '+f(q[1])).join(' ')} `;cur=ps[1];}
   else if(c.localName==='arcTo'){const rx=val(attr(c,'wR'))*sx,ry=val(attr(c,'hR'))*sy,st=val(attr(c,'stAng'))/60000*Math.PI/180,sw=val(attr(c,'swAng'))/60000*Math.PI/180,cx=cur[0]-rx*Math.cos(st),cy=cur[1]-ry*Math.sin(st),e=[cx+rx*Math.cos(st+sw),cy+ry*Math.sin(st+sw)];
    d+=`A${f(Math.abs(rx))} ${f(Math.abs(ry))} 0 ${Math.abs(sw)>Math.PI?1:0} ${sw>0?1:0} ${f(e[0])} ${f(e[1])} `;cur=e;}
   else if(c.localName==='close'){d+='Z ';open=false;}
   last=cur;}
  if(d)out.push({d,noFill});}
 return {d:out.map(x=>x.d).join(''),noFill:out.length>0&&out.every(x=>x.noFill),open:open&&!!first,ends:first&&last?[first,last]:null};
}
function clean(value){if(!value)return null;if(typeof value.data!=='string'||value.data.length>42*1024*1024||!/^UEsDB[A-Za-z0-9+/]*=*$/.test(value.data)||typeof value.name!=='string')return null;return {name:value.name.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,120).replace(/(?:\.docx)?$/i,'.docx'),data:value.data,sha256:/^[a-f0-9]{64}$/.test(value.sha256)?value.sha256:'',report:value.report&&typeof value.report==='object'?JSON.parse(JSON.stringify(value.report)):null};}
function set(value){original=clean(value);if(button)button.hidden=!original;}
async function download(){if(!original)return;const b=Uint8Array.from(atob(original.data),x=>x.charCodeAt(0));if(original.sha256&&crypto.subtle&&await digest(b)!==original.sha256)throw Error('Bản Word gốc trong bài không khớp kiểm tra toàn vẹn.');const url=URL.createObjectURL(new Blob([b],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})),a=document.createElement('a');a.href=url;a.download=original.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function drawing(node){
 const shape=find(node,'wsp')||find(node,'sp')||find(node,'shape')||find(node,'line');if(!shape)return null;
 const ext=find(node,'extent')||find(shape,'ext'),cx=Number(attr(ext,'cx'))||2500000,cy=Number(attr(ext,'cy'))||19050,w=Math.max(2,cx/9525),h=Math.max(2,cy/9525),geom=find(shape,'prstGeom'),kind=attr(geom,'prst')||shape.localName,props=find(shape,'spPr')||shape,ln=children(props).find(x=>x.localName==='ln'),solid=children(props).find(x=>x.localName==='solidFill'),fill=solid?(attr(find(solid,'srgbClr'),'val')||'FFFFFF'):'none',lineColor=attr(ln&&find(ln,'srgbClr'),'val')||'000000',stroke=ln&&find(ln,'noFill')?'none':'#'+lineColor,width=Math.max(.7,(Number(attr(ln,'w'))||12700)/9525),textBox=find(shape,'txbxContent');
 let body='';if(['line','straightConnector1','bentConnector2'].includes(kind))body=`<path d="M1 1 L${w-1} ${h-1}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`;
 else if(['rect','roundRect','ellipse'].includes(kind)||textBox){body=kind==='ellipse'?`<ellipse cx="${w/2}" cy="${h/2}" rx="${Math.max(1,w/2-1)}" ry="${Math.max(1,h/2-1)}"`:`<rect x="1" y="1" width="${Math.max(1,w-2)}" height="${Math.max(1,h-2)}"${kind==='roundRect'?' rx="8"':''}`;body+=` fill="${fill==='none'?'none':'#'+fill}" stroke="${stroke}" stroke-width="${width}"/>`;}
 else return null;
 if(textBox){const paragraphs=all(textBox,'p');let y=0;for(const p of paragraphs){const r=all(p,'r'),txt=r.map(x=>all(x,'t').map(t=>t.textContent).join('')).join(''),font=Number(attr(find(p,'sz'),'val'))/2*96/72||16,color=attr(find(p,'color'),'val')||'000000',bold=!!find(p,'b');y+=font*1.2;body+=`<text x="${w/2}" y="${Math.min(h-3,y)}" text-anchor="middle" font-family="Times New Roman" font-size="${font}" fill="#${color}"${bold?' font-weight="bold"':''}>${escape(txt)}</text>`;}}
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" style="width:${w}px;height:${h}px;max-width:100%;display:inline-block" role="img" aria-label="Hình vẽ Word">${body}</svg>`;
}
async function read(file,H){
 const cleanMarkup=H.cleanMarkup||window.cleanMarkup;
 if(file.size>30*1024*1024)throw Error('Word lớn hơn 30 MB. Hãy chia nhỏ tài liệu.');
 const buffer=await file.arrayBuffer(),zip=await H.unzip(buffer),dec=new TextDecoder(),xml=dec.decode(await H.inflate(zip['word/document.xml'])),doc=new DOMParser().parseFromString(xml,'application/xml'),body=doc.getElementsByTagNameNS(W,'body')[0];if(!body||doc.querySelector('parsererror'))throw Error('Cấu trúc Word bị lỗi.');
 const report={ole:all(body,'OLEObject').length,wmf:0,emf:0,images:0,shapes:0,unsupported:[]},media={},rel={};
 if(zip['word/_rels/document.xml.rels']){const d=new DOMParser().parseFromString(dec.decode(await H.inflate(zip['word/_rels/document.xml.rels'])),'application/xml');for(const r of all(d,'Relationship'))if(r.getAttribute('TargetMode')!=='External'){const raw=r.getAttribute('Target')||'',name=raw.replace(/^\/?word\//,'');if(!name.includes('..')&&!/^[a-z]+:/i.test(name))rel[r.getAttribute('Id')]=name;}}
 for(const name of Object.keys(zip).filter(n=>/^word\/media\//.test(n))){const b=await H.inflate(zip[name]),ext=name.split('.').pop().toLowerCase();let src='';
  if(ext==='wmf'){src=window.NBWmf?.toSvg(b)||'';if(src)report.wmf++;}
  else if(ext==='emf'){try{const r=NBEmf.render(b);src=r.svg;report.emf++;if(r.unsupported.length)report.unsupported.push(name+': EMF '+r.unsupported.join(','));}catch{}}
  else if(ext==='svg'){src=cleanMarkup(dec.decode(b));report.images++;}
  else if(['png','jpg','jpeg','gif','bmp','webp','tif','tiff'].includes(ext)){src=await new Promise((ok,er)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=er;r.readAsDataURL(new Blob([b],{type:{jpg:'image/jpeg',jpeg:'image/jpeg',tif:'image/tiff',tiff:'image/tiff'}[ext]||'image/'+ext}));});report.images++;}
  if(!src&&ext!=='wdp')report.unsupported.push(name);media[name.replace(/^word\//,'')]=src;
 }
 const xmlOf=async n=>zip[n]?dec.decode(await H.inflate(zip[n])):'',theme=themeColors(await xmlOf('word/theme/theme1.xml'));let basePt=11;
 {const st=await xmlOf('word/styles.xml');if(st){const sd=new DOMParser().parseFromString(st,'application/xml'),dd=find(sd,'docDefaults'),normal=all(sd,'style').find(x=>attr(x,'styleId')==='Normal'),sz=(normal&&find(normal,'sz'))||(dd&&find(dd,'sz'));if(sz)basePt=Number(attr(sz,'val'))/2||basePt;}}
 let colPx=624;const sect=find(body,'sectPr'),sz=sect&&find(sect,'pgSz'),mg=sect&&find(sect,'pgMar'),tw=Number(attr(sz,'w')),ml=Number(attr(mg,'left')),mr=Number(attr(mg,'right'));if(tw>ml+mr)colPx=(tw-ml-mr)/15;const imgK=Math.max(1,Math.min(3,1424/colPx));
 function object(el,rPr){if(find(el,'wgp')||find(el,'wsp')){const g=dml(el);if(g){report.shapes++;return g;}}
 const im=find(el,'imagedata')||find(el,'blip'),id=im&&(attr(im,'id',R)||attr(im,'embed',R)),src=id&&media[rel[id]];
  if(src){
   if(src.startsWith('<span')||src.startsWith('$'))return src;if(src.startsWith('<svg')&&src.includes('aria-label="Hình vector EMF"')){const ext=find(el,'extent'),st=attr(find(el,'shape'),'style'),wm=/width:\s*([\d.]+)pt/i.exec(st),w=ext?Number(attr(ext,'cx'))/9525*imgK:wm?Number(wm[1])*96/72*imgK:0;return w?src.replace('style="max-width:100%;height:auto"','style="width:'+Math.min(1424,w).toFixed(1)+'px;max-width:100%;height:auto"'):src;}
  if(src.startsWith('<svg')){let value=src;const shape=find(el,'shape'),style=attr(shape,'style'),hm=/height:\s*([\d.]+)pt/i.exec(style),font=Number(attr(rPr&&find(rPr,'sz'),'val'))||24,pos=attr(rPr&&find(rPr,'position'),'val');if(hm)value=value.replace(/height:\s*[^;]+;/,'height:'+(Number(hm[1])/(font/2)).toFixed(3)+'em;');if(pos)value=value.replace(/vertical-align:\s*[^;]+;/,'vertical-align:'+(Number(pos)/font).toFixed(3)+'em;');return value;}
   const ext=find(el,'extent'),style=ext?`width:${Math.min(1424,Number(attr(ext,'cx'))/9525*imgK)}px;max-height:760px;object-fit:contain`:'';return `<img src="${src}" style="${style}" alt="Hình trong Word">`;
  }
  const figure=drawing(el);if(figure){report.shapes++;return figure;}
  const label=el.localName==='object'?'Đối tượng OLE chưa có ảnh xem trước':'Hình Word chưa hỗ trợ';report.unsupported.push(label);return '<span class="eqmiss">'+label+' — được giữ trong file Word gốc</span>';
 }
 /* box: chữ trong hộp chữ / hình vẽ — giữ cỡ chữ từng đoạn (px trên bảng) */
 function paragraph(p,box){let text='',html='',firstColor='';function walk(el){for(const c of children(el)){
  if(c.localName==='AlternateContent'){const choice=children(c).find(x=>x.localName==='Choice')||children(c).find(x=>x.localName==='Fallback');if(choice)walk(choice);}
  else if(c.namespaceURI===M&&c.localName==='oMath'){const tex=H.omml2tex(c);if(tex){html+='$'+tex+'$';text+='[Công thức]';}}
  else if(c.namespaceURI===W&&c.localName==='r'){const pr=children(c).find(x=>x.localName==='rPr'),font=fontOf(pr);for(const d of children(c)){if(d.localName==='rPr')continue;if(d.localName==='t'||d.localName==='sym'){const raw=d.localName==='sym'?symChar(attr(d,'font'),attr(d,'char')):font?[...d.textContent].map(ch=>symChar(font,ch.codePointAt(0).toString(16))).join(''):d.textContent;text+=raw;html+=runHtml(escape(raw),pr,box,color=>{firstColor||=color;});}else if(d.localName==='br'||d.localName==='cr'){html+='<br>';text+='\n';}else if(d.localName==='tab'){html+='\u2003';text+='\t';}else if(['object','pict','drawing'].includes(d.localName)){html+=object(d,pr);text+='[Đối tượng]';}else if(d.localName==='AlternateContent')walk(c);}}
  else if(['drawing','pict','object'].includes(c.localName)){html+=object(c,null);text+='[Đối tượng]';}
  else if(['hyperlink','sdt','sdtContent','smartTag','ins','oMathPara','Choice','Fallback'].includes(c.localName))walk(c);
 }}walk(p);return {html,text,color:firstColor};}
 function table(t){const rows=children(t).filter(x=>x.localName==='tr'),out=[];const vertical=new Map();for(let ri=0;ri<rows.length;ri++){let col=0,cells=[];for(const tc of children(rows[ri]).filter(x=>x.localName==='tc')){const pr=children(tc).find(x=>x.localName==='tcPr'),span=Number(attr(pr&&find(pr,'gridSpan'),'val'))||1,merge=pr&&find(pr,'vMerge');if(merge&&attr(merge,'val')!=='restart'&&vertical.has(col)){vertical.get(col).rows++;col+=span;continue;}const cell={html:children(tc).map(x=>x.localName==='p'?paragraph(x).html:x.localName==='tbl'?table(x):'').join('<br>'),span,rows:1,fill:attr(pr&&find(pr,'shd'),'fill')};cells.push(cell);if(merge)vertical.set(col,cell);else vertical.delete(col);col+=span;}out.push(cells);}return '<table><tbody>'+out.map(row=>'<tr>'+row.map(c=>'<td'+(c.span>1?' colspan="'+c.span+'"':'')+(c.rows>1?' rowspan="'+c.rows+'"':'')+(/^[a-f0-9]{6}$/i.test(c.fill)?' style="background-color:#'+c.fill+'"':'')+'>'+c.html+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
 /* Hình vẽ Word (nhóm hình, hình đơn, hộp chữ) → khối HTML: một SVG chứa các hình + lớp chữ đặt đúng chỗ */
 function dml(el){
  const holder=find(el,'inline')||find(el,'anchor'),gd=holder&&find(holder,'graphicData'),root=gd&&children(gd)[0];
  if(!root||!['wgp','wsp'].includes(root.localName))return null;
  const ext=kid(holder,'extent'),EW=Number(attr(ext,'cx'))||0,EH=Number(attr(ext,'cy'))||0;if(!EW||!EH)return null;
  const K=Math.min(imgK,1424/Math.max(1,EW/9525)),px=e=>e/9525*K,W=px(EW),HH=px(EH),f=n=>n.toFixed(2),pct=(a,b)=>(a/b*100).toFixed(3)+'%';
  const shapes=[],layers=[],num=(e,n)=>Number(attr(e,n))||0;
  const nest=(map,xf)=>{const off=kid(xf,'off'),ex=kid(xf,'ext'),co=kid(xf,'chOff'),ce=kid(xf,'chExt'),kx=num(ce,'cx')?num(ex,'cx')/num(ce,'cx'):1,ky=num(ce,'cy')?num(ex,'cy')/num(ce,'cy'):1;
   return {ox:map.ox+map.sx*(num(off,'x')-num(co,'x')*kx),oy:map.oy+map.sy*(num(off,'y')-num(co,'y')*ky),sx:map.sx*kx,sy:map.sy*ky};};
  const box=(map,xf)=>{const off=kid(xf,'off'),ex=kid(xf,'ext');return {x:px(map.ox+num(off,'x')*map.sx),y:px(map.oy+num(off,'y')*map.sy),w:px(num(ex,'cx')*map.sx),h:px(num(ex,'cy')*map.sy)};};
  function arrow(end,p,dir,sw){const type=attr(end,'type');if(!end||!type||type==='none')return '';const k={sm:2,med:3,lg:5},L=Math.max(5,sw*(k[attr(end,'len')]||3)),B=Math.max(3,sw*(k[attr(end,'w')]||3))/2,n=Math.hypot(dir[0],dir[1])||1,u=[dir[0]/n,dir[1]/n],b=[p[0]-u[0]*L,p[1]-u[1]*L];
   return `<polygon points="${f(p[0])},${f(p[1])} ${f(b[0]-u[1]*B)},${f(b[1]+u[0]*B)} ${f(b[0]+u[1]*B)},${f(b[1]-u[0]*B)}"`;}
  function shape(sp,map){
   const pr=kid(sp,'spPr'),xf=kid(pr,'xfrm');if(!xf)return;const b=box(map,xf),rot=num(xf,'rot')/60000,fh=attr(xf,'flipH')==='1',fv=attr(xf,'flipV')==='1',style=kid(sp,'style');
   const prst=kid(pr,'prstGeom'),cust=kid(pr,'custGeom');let g;
   if(cust)g=customPath(cust,num(kid(xf,'ext'),'cx')||1,num(kid(xf,'ext'),'cy')||1,b.w,b.h);
   else{const kind=attr(prst,'prst')||'rect',adj={...(ADJ_DEFAULT[kind]||{})};for(const a of children(kid(prst,'avLst')))adj[attr(a,'name')]=Number(String(attr(a,'fmla')).replace(/^val\s+/,''))||0;g=presetPath(kind,b.w,b.h,adj);}
   let fill=null;const fe=children(pr).find(x=>/^(noFill|solidFill|gradFill|pattFill|blipFill)$/.test(x.localName));
   if(fe)fill=fe.localName==='solidFill'?colorOf(fe,theme):fe.localName==='gradFill'?colorOf(find(fe,'gs')||fe,theme):fe.localName==='pattFill'?colorOf(kid(fe,'fgClr')||fe,theme):null;
   else if(style&&num(kid(style,'fillRef'),'idx')>0)fill=colorOf(kid(style,'fillRef'),theme);
   if(g.open||g.noFill)fill=null;
   const ln=kid(pr,'ln'),lf=ln&&children(ln).find(x=>/^(noFill|solidFill|gradFill)$/.test(x.localName)),sw=Math.max(.75,px(num(ln,'w')||9525));let stroke=null;
   if(lf)stroke=lf.localName==='solidFill'?colorOf(lf,theme):lf.localName==='gradFill'?colorOf(find(lf,'gs')||lf,theme):null;
   else if(style&&num(kid(style,'lnRef'),'idx')>0)stroke=colorOf(kid(style,'lnRef'),theme);
   const dash=attr(ln&&kid(ln,'prstDash'),'val'),dashes={dash:[4,3],sysDash:[3,1],dot:[1,2],sysDot:[1,1],lgDash:[8,3],dashDot:[4,3,1,3],lgDashDot:[8,3,1,3],sysDashDot:[3,1,1,1]}[dash];
   let body='';
   if(g.d&&(fill||stroke))body+=`<path d="${g.d}" fill="${fill?fill.hex:'none'}" stroke="${stroke?stroke.hex:'none'}" stroke-width="${f(sw)}" stroke-linejoin="round" stroke-linecap="round"${dashes&&stroke?` stroke-dasharray="${dashes.map(d=>f(d*sw)).join(' ')}"`:''}/>`;
   if(stroke&&g.ends&&g.dirs){const c=stroke.hex;const h=arrow(kid(ln,'headEnd'),g.ends[0],[-g.dirs[0][0],-g.dirs[0][1]],sw),t=arrow(kid(ln,'tailEnd'),g.ends[1],g.dirs[1],sw);for(const a of [h,t])if(a)body+=a+` fill="${c}" stroke="${c}" stroke-width="${f(sw/2)}"/>`;}
   if(body)shapes.push(`<g transform="translate(${f(b.x)} ${f(b.y)})${rot?` rotate(${f(rot)} ${f(b.w/2)} ${f(b.h/2)})`:''}${fh?` translate(${f(b.w)} 0) scale(-1 1)`:''}${fv?` translate(0 ${f(b.h)}) scale(1 -1)`:''}">${body}</g>`);
   const tx=find(sp,'txbxContent');
   if(tx){const bp=kid(sp,'bodyPr'),ins=(n,d)=>px(bp&&bp.hasAttribute(n)?num(bp,n):d),anchor={ctr:'center',b:'flex-end'}[attr(bp,'anchor')]||'flex-start';
    const paras=children(tx).map(p=>{if(p.localName==='tbl')return table(p);if(p.localName!=='p')return '';const pp=kid(p,'pPr'),jc=attr(kid(pp,'jc'),'val'),r=paragraph(p,{K}),psz=num(kid(kid(pp,'rPr'),'sz'),'val');
     return `<div style="margin:0;text-align:${{center:'center',right:'right',end:'right',both:'justify'}[jc]||'left'}${psz?';font-size:'+f(psz/2*96/72*K)+'px':''}">${r.html||'&nbsp;'}</div>`;}).join('');
    if(paras)layers.push(`<div style="position:absolute;left:${pct(b.x,W)};top:${pct(b.y,HH)};width:${pct(b.w,W)};height:${pct(b.h,HH)};box-sizing:border-box;padding:${f(ins('tIns',45720))}px ${f(ins('rIns',91440))}px ${f(ins('bIns',45720))}px ${f(ins('lIns',91440))}px;display:flex;flex-direction:column;justify-content:${anchor};overflow:visible;line-height:1.15;color:#000000;font-size:${f(basePt*96/72*K)}px;white-space:${attr(bp,'wrap')==='none'?'pre':'pre-wrap'}">${paras}</div>`);}
  }
  function picture(pc,map){
   const xf=find(pc,'xfrm'),blip=find(pc,'blip'),src=blip&&media[rel[attr(blip,'embed',R)]];if(!xf||!src)return;const b=box(map,xf),pos=`position:absolute;left:${pct(b.x,W)};top:${pct(b.y,HH)};width:${pct(b.w,W)};height:${pct(b.h,HH)}`;
   layers.unshift((src.startsWith('<svg')||src.startsWith('<span')||src.startsWith('$'))?`<div style="${pos}">${src.replace(/style="[^"]*"/,'style="width:100%;height:100%"')}</div>`:`<img src="${src}" style="${pos};object-fit:fill" alt="Hình trong Word">`);
  }
  function walk(node,map){for(const c of children(node)){if(c.localName==='wsp')shape(c,map);else if(c.localName==='grpSp')walk(c,nest(map,kid(kid(c,'grpSpPr'),'xfrm')));else if(c.localName==='pic')picture(c,map);else if(c.localName==='AlternateContent'){const ch=kid(c,'Choice')||kid(c,'Fallback');if(ch)walk(ch,map);}}}
  if(root.localName==='wgp'){const xf=kid(kid(root,'grpSpPr'),'xfrm'),co=kid(xf,'chOff'),ce=kid(xf,'chExt'),sx=num(ce,'cx')?EW/num(ce,'cx'):1,sy=num(ce,'cy')?EH/num(ce,'cy'):1;walk(root,{ox:-num(co,'x')*sx,oy:-num(co,'y')*sy,sx,sy});}
  else{const xf=kid(kid(root,'spPr'),'xfrm'),off=kid(xf,'off'),ex=kid(xf,'ext'),sx=num(ex,'cx')?EW/num(ex,'cx'):1,sy=num(ex,'cy')?EH/num(ex,'cy'):1;shape(root,{ox:-num(off,'x')*sx,oy:-num(off,'y')*sy,sx,sy});}
  if(!shapes.length&&!layers.length)return null;
  return `<div class="docx-drawing" style="position:relative;display:inline-block;vertical-align:middle;width:${f(W)}px;height:${f(HH)}px;max-width:100%;line-height:1.15">`
   +`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} ${f(HH)}" style="position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible" role="img" aria-label="Hình vẽ Word">${shapes.join('')}</svg>${layers.join('')}</div>`;
 }
 const fmtQ=H.formatQuestionBlock||window.NBWordCore?.formatQuestionBlock;
 const out=[];let noteMode=false;const push=(tag,cls,html,attrs='')=>{
  const formatted = fmtQ ? fmtQ(html, cls==='qs') : html;
  out.push({tag,cls,html:cleanMarkup(formatted),attrs,notes:''});
 };
 function block(el){if(el.localName==='tbl'){push('div','',table(el));return;}if(el.localName!=='p'){if(['sdt','sdtContent','AlternateContent'].includes(el.localName))children(el).forEach(block);return;}const r=paragraph(el),t=r.text.trim();if(!t&&!r.html.trim())return;if(t==='???'){noteMode=true;return;}if(noteMode&&t&&!t.includes('[Đối tượng]')){if(out.length)out.at(-1).notes+=(out.at(-1).notes?'\n':'')+t;return;}noteMode=false;const pr=children(el).find(x=>x.localName==='pPr'),style=attr(pr&&find(pr,'pStyle'),'val'),cls=H.markBlock(t,r.color);if(/Title|Heading1/i.test(style))push('h1','',r.html);else if(/Heading2/i.test(style))push('h2','sec',r.html);else if(/Heading[3-9]/i.test(style))push('h3',cls,r.html);else if(cls)push('div',cls,r.html);else if(pr&&find(pr,'numPr'))push('div','li',r.html);else if(t==='[Đối tượng]')push('figure','',r.html);else push('p','',r.html);}
 children(body).forEach(block);if(!out.length)throw Error('Word không có nội dung để hiển thị.');
 const data=await new Promise((ok,er)=>{const r=new FileReader();r.onload=()=>ok(r.result.split(',')[1]);r.onerror=er;r.readAsDataURL(new Blob([buffer]));});out.wordOriginal={name:file.name,data,sha256:await digest(buffer),report};return out;
}
addEventListener('DOMContentLoaded',()=>{const menu=document.querySelector('#insertMenu');if(!menu)return;button=document.createElement('button');button.type='button';button.role='menuitem';button.textContent='Tải lại file Word gốc';button.hidden=!original;button.onclick=()=>download().catch(e=>toast(e.message));menu.append(button);});
window.NBWordImport={read,clean,set,data:()=>original?{...original}:null,download};
})();
