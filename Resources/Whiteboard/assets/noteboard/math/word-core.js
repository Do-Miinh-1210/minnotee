/* Shared DOCX helpers for the board and Live import; source extracted without changing conversion. */
(()=>{
'use strict';
const W_NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const M_NS='http://schemas.openxmlformats.org/officeDocument/2006/math';
const V_NS='urn:schemas-microsoft-com:vml';
/* ---------- Cong thuc Office Math (Equation cua Word, MathType da doi sang Office Math) ---------- */
const MSYM={'π':'\\pi ','α':'\\alpha ','β':'\\beta ','γ':'\\gamma ','Γ':'\\Gamma ','δ':'\\delta ',
 'Δ':'\\Delta ','∆':'\\Delta ','ε':'\\varepsilon ','ϵ':'\\epsilon ','ζ':'\\zeta ','η':'\\eta ',
 'θ':'\\theta ','Θ':'\\Theta ','ι':'\\iota ','κ':'\\kappa ','λ':'\\lambda ','Λ':'\\Lambda ',
 'μ':'\\mu ','ν':'\\nu ','ξ':'\\xi ','ρ':'\\rho ','σ':'\\sigma ','Σ':'\\Sigma ','τ':'\\tau ',
 'υ':'\\upsilon ','φ':'\\varphi ','ϕ':'\\phi ','Φ':'\\Phi ','χ':'\\chi ','ψ':'\\psi ','Ψ':'\\Psi ',
 'ω':'\\omega ','Ω':'\\Omega ','Ω':'\\Omega ','×':'\\times ','÷':'\\div ','±':'\\pm ','∓':'\\mp ','⋅':'\\cdot ',
 '·':'\\cdot ','∙':'\\cdot ','≈':'\\approx ','≃':'\\simeq ','≡':'\\equiv ','≠':'\\ne ','≤':'\\le ',
 '≥':'\\ge ','≪':'\\ll ','≫':'\\gg ','∞':'\\infty ','→':'\\to ','←':'\\leftarrow ',
 '↔':'\\leftrightarrow ','⇒':'\\Rightarrow ','⇔':'\\Leftrightarrow ','↑':'\\uparrow ','↓':'\\downarrow ',
 '∑':'\\sum ','∏':'\\prod ','∫':'\\int ','∬':'\\iint ','∭':'\\iiint ','∮':'\\oint ','∂':'\\partial ',
 '∇':'\\nabla ','√':'\\sqrt ','∈':'\\in ','∉':'\\notin ','⊂':'\\subset ','∪':'\\cup ','∩':'\\cap ',
 '∅':'\\emptyset ','∀':'\\forall ','∃':'\\exists ','∴':'\\therefore ','∵':'\\because ','°':'^\\circ ',
 '‰':'\\permil ','′':"'",'″':"''",'−':'-','–':'-','—':'-','…':'\\dots ','⋯':'\\cdots ','∠':'\\angle ',
 '∥':'\\parallel ','⊥':'\\perp ','≅':'\\cong ','∆t':'\\Delta t','∆l':'\\Delta l',
 '\u00A0':' ','\u2002':' ','\u2003':' ','\u2004':' ','\u2005':' ','\u2006':' ','\u2007':' ','\u2008':' ','\u2009':' ','\u200A':' ','\u202F':' ','\u205F':' ','\u200B':'','\u2060':'','\uFEFF':'',
 '⇌':'\\rightleftharpoons ','⇄':'\\rightleftarrows ','⇆':'\\leftrightarrows ','⟶':'\\longrightarrow ','⟹':'\\Longrightarrow ','⟺':'\\Longleftrightarrow ',
 'ℓ':'\\ell ','Å':'\\mathring{A}','℃':'^{\\circ}\\mathrm{C}','℉':'^{\\circ}\\mathrm{F}','ħ':'\\hbar ','ℰ':'\\mathcal{E}','đ':'\\text{đ}','Đ':'Đ',
 'ℝ':'\\mathbb{R}','ℤ':'\\mathbb{Z}','ℕ':'\\mathbb{N}','ℚ':'\\mathbb{Q}','ℂ':'\\mathbb{C}',
 '⁰':'^{0}','¹':'^{1}','²':'^{2}','³':'^{3}','⁴':'^{4}','⁵':'^{5}','⁶':'^{6}','⁷':'^{7}','⁸':'^{8}','⁹':'^{9}','⁺':'^{+}','⁻':'^{-}',
 '₀':'_{0}','₁':'_{1}','₂':'_{2}','₃':'_{3}','₄':'_{4}','₅':'_{5}','₆':'_{6}','₇':'_{7}','₈':'_{8}','₉':'_{9}','₊':'_{+}','₋':'_{-}',
 'ₐ':'_{a}','ₑ':'_{e}','ₒ':'_{o}','ₓ':'_{x}','ₕ':'_{h}','ₖ':'_{k}','ₗ':'_{l}','ₘ':'_{m}','ₙ':'_{n}','ₚ':'_{p}','ₛ':'_{s}','ₜ':'_{t}',
 '∼':'\\sim ','≢':'\\not\\equiv ','≉':'\\not\\approx ','≳':'\\gtrsim ','≲':'\\lesssim ','≸':'\\lessgtr ','≹':'\\gtrless ','⊇':'\\supseteq ','⊆':'\\subseteq '};
function texEsc(t){
  let x=(t||'').replace(/\[(?:00)?[Aa]0\]/g,' ').replace(/\[EF[0-9A-Fa-f]{2}\]/g,'\\,')
               .replace(/(\d+),\s+(\d+)/g,'$1,$2')
               .replace(/[\\{}$&#%_]/g,c=>({'\\':'\\backslash ','{':'\\{','}':'\\}','$':'\\$',
        '&':'\\&','#':'\\#','%':'\\%','_':'\\_'}[c]));
  return x.replace(/[^\x00-\x7F]/g,c=>MSYM[c]||c);
}
function omml2tex(node){
  if(!node)return '';
  const ch=el=>Array.from(el.children||[]);
  const tagOf=el=>(el.localName||el.nodeName||'').replace(/^m:/i,'');
  const conv=el=>el?ch(el).map(one).join(''):'';
  const part=(el,nm)=>{ const c=ch(el).find(x=>tagOf(x).toLowerCase()===nm.toLowerCase()); return c?conv(c):''; };
  const prop=(el,base,nm)=>{
    const p=ch(el).find(x=>tagOf(x).toLowerCase()===(base+'Pr').toLowerCase()); if(!p) return null;
    const c=ch(p).find(x=>tagOf(x).toLowerCase()===nm.toLowerCase()); if(!c) return null;
    const v=c.getAttributeNS?c.getAttributeNS(M_NS,'val'):null;
    return v!=null?v:(c.getAttribute('val')||c.getAttribute('m:val')||'1');
  };
  const bare=x=>{ const m=/^\\mathrm\{([^{}]*)\}$/.exec(x.trim()); return m?m[1]:x.trim(); };
  const dl=c=>c===''?'.':(c==='{'?'\\{':c==='}'?'\\}':(c==='|'?'|':c));
  function one(el){
    const n=tagOf(el);
    const nl=n.toLowerCase();
    if(nl==='omath'||nl==='omathpara')return conv(el);
    switch(nl){
      case 'r': {
        const t=ch(el).filter(c=>tagOf(c).toLowerCase()==='t').map(c=>c.textContent).join('');
        const sty=prop(el,'r','sty'), nor=prop(el,'r','nor');
        const x=texEsc(t);
        if(nor||sty==='p') return `\\mathrm{${x}}`;
        if(sty==='b') return `\\mathbf{${x}}`;
        return x;
      }
      case 'f': {
        const ty=prop(el,'f','type'), a=part(el,'num'), b=part(el,'den');
        if(ty==='lin') return `${a}/${b}`;
        if(ty==='noBar') return `\\binom{${a}}{${b}}`;
        return `\\frac{${a}}{${b}}`;
      }
      case 'ssup':    return `{${part(el,'e')}}^{${part(el,'sup')}}`;
      case 'ssub':    return `{${part(el,'e')}}_{${part(el,'sub')}}`;
      case 'ssubsup': return `{${part(el,'e')}}_{${part(el,'sub')}}^{${part(el,'sup')}}`;
      case 'spre':    return `{}_{${part(el,'sub')}}^{${part(el,'sup')}}{${part(el,'e')}}`;
      case 'rad': {
        const hide=prop(el,'rad','degHide'), d=part(el,'deg');
        return (hide||!d)? `\\sqrt{${part(el,'e')}}` : `\\sqrt[${d}]{${part(el,'e')}}`;
      }
      case 'd': {
        const b=prop(el,'d','begChr'), e=prop(el,'d','endChr'), sp=prop(el,'d','sepChr');
        const es=ch(el).filter(x=>tagOf(x).toLowerCase()==='e').map(conv);
        const sep=(sp==null)?'|':sp;
        return `\\left${dl(b==null?'(':b)}${es.join(sep?` ${dl(sep)} `:'')}\\right${dl(e==null?')':e)}`;
      }
      case 'nary': {
        const chr=prop(el,'nary','chr')||'∫';
        let x=(MSYM[chr]||chr);
        if(!prop(el,'nary','subHide')){ const v=part(el,'sub'); if(v) x+=`_{${v}}`; }
        if(!prop(el,'nary','supHide')){ const v=part(el,'sup'); if(v) x+=`^{${v}}`; }
        return x+`{${part(el,'e')}}`;
      }
      case 'func': {
        const fn=bare(part(el,'fName')).replace(/^\\+/,'');
        const std=/^(sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|arcsin|arccos|arctan|log|ln|lg|exp|lim|max|min|det|gcd|deg|arg)$/i.test(fn);
        return `${std?'\\'+fn.toLowerCase():`\\operatorname{${fn}}`}{${part(el,'e')}}`;
      }
      case 'acc': {
        const chr=prop(el,'acc','chr')||'\u0302';
        const m={'\u20d7':'\\vec','\u0302':'\\hat','\u0304':'\\bar','\u203e':'\\overline',
                 '\u0307':'\\dot','\u0308':'\\ddot','\u0303':'\\tilde','~':'\\tilde'};
        return `${m[chr]||'\\hat'}{${part(el,'e')}}`;
      }
      case 'bar':     return prop(el,'bar','pos')==='bot'? `\\underline{${part(el,'e')}}` : `\\overline{${part(el,'e')}}`;
      case 'limlow':  return `\\underset{${part(el,'lim')}}{${part(el,'e')}}`;
      case 'limupp':  return `\\overset{${part(el,'lim')}}{${part(el,'e')}}`;
      case 'borderbox': return `\\boxed{${part(el,'e')}}`;
      case 'm': {
        const rows=ch(el).filter(x=>tagOf(x).toLowerCase()==='mr')
          .map(r=>ch(r).filter(x=>tagOf(x).toLowerCase()==='e').map(conv).join(' & '));
        return `\\begin{matrix}${rows.join('\\\\')}\\end{matrix}`;
      }
      case 'eqarr': {
        const rows=ch(el).filter(x=>tagOf(x).toLowerCase()==='e').map(conv);
        return `\\begin{aligned}${rows.join('\\\\')}\\end{aligned}`;
      }
      case 'groupchr': case 'box': case 'phant': return part(el,'e');
      default:
        if(/pr$/i.test(nl)) return '';
        return conv(el);
    }
  }
  return conv(node).replace(/\[(?:00)?[Aa]0\]/g,' ').replace(/\[EF[0-9A-Fa-f]{2}\]/g,'\\,').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
}
const R_NS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const kids=(el,name)=>Array.from(el.getElementsByTagNameNS(W_NS,name));

async function unzip(buf){
  const dv=new DataView(buf), u8=new Uint8Array(buf);
  let eo=-1;
  for(let i=buf.byteLength-22;i>=0 && i>buf.byteLength-66000;i--){ if(dv.getUint32(i,true)===0x06054b50){eo=i;break;} }
  if(eo<0) throw new Error('Không đọc được cấu trúc file Word.');
  const n=dv.getUint16(eo+10,true);if(n>12000)throw Error('File Word có quá nhiều thành phần.');let total=0; let p=dv.getUint32(eo+16,true);
  const out={}, dec=new TextDecoder();
  for(let i=0;i<n;i++){
    if(dv.getUint32(p,true)!==0x02014b50) break;
    const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true);
    const usize=dv.getUint32(p+24,true);total+=usize;if(usize>64*1024*1024||total>160*1024*1024)throw Error('Nội dung Word giải nén quá lớn.');
    const nl=dv.getUint16(p+28,true), el=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true);
    const lho=dv.getUint32(p+42,true);
    const name=dec.decode(u8.subarray(p+46,p+46+nl));
    const start=lho+30+dv.getUint16(lho+26,true)+dv.getUint16(lho+28,true);
    out[name]={method,bytes:u8.subarray(start,start+csize)};
    p+=46+nl+el+cl;
  }
  return out;
}
async function inflate(e){
  if(!e) return new Uint8Array();
  if(e.method===0) return e.bytes;
  if(typeof DecompressionStream==='undefined') throw new Error('Trình duyệt quá cũ, hãy dùng Chrome hoặc Edge bản mới.');
  const s=new Blob([e.bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const reader=s.getReader(),parts=[];let length=0;try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>64*1024*1024)throw Error('Thành phần tài liệu quá lớn.');parts.push(value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}const out=new Uint8Array(length);let at=0;for(const b of parts){out.set(b,at);at+=b.length;}return out;
}
const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',bmp:'image/bmp',svg:'image/svg+xml',emf:'image/emf',wmf:'image/wmf'};


function cleanMarkup(html){
 const template=document.createElement('template');template.innerHTML=String(html||'');
 const allowed=new Set(['DIV','P','SPAN','B','STRONG','I','EM','U','S','SUB','SUP','BR','H1','H2','H3','H4','UL','OL','LI','BLOCKQUOTE','TABLE','THEAD','TBODY','TR','TD','TH','COL','COLGROUP','FIGURE','FIGCAPTION','IMG','HR','CODE','PRE','SVG','LINE','POLYLINE','POLYGON','RECT','TEXT','PATH','G','ELLIPSE','TSPAN']);
 const safeStyle=new Set(['color','background-color','font-size','font-weight','font-style','text-decoration','text-align','text-indent','vertical-align','width','height','max-width','max-height','object-fit','display','margin','margin-left','margin-right','margin-top','margin-bottom','line-height','white-space','overflow','border-radius','box-sizing','flex-direction','justify-content','position','left','top','right','bottom','padding','padding-left','padding-right','padding-top','padding-bottom','border','border-left','border-right','border-top','border-bottom','border-left-color','border-left-style','border-left-width','border-right-color','border-right-style','border-right-width','border-top-color','border-top-style','border-top-width','border-bottom-color','border-bottom-style','border-bottom-width','border-color','border-style','border-width','border-collapse','table-layout','box-shadow','pointer-events','aspect-ratio','-webkit-text-stroke','text-shadow','opacity','transform','clip-path','z-index']);
 const safeAttrs=new Set(['alt','title','colspan','rowspan','data-n','data-slide','data-spid','data-ppt-step','data-tex','data-type','data-q','viewbox','role','aria-label','x1','y1','x2','y2','stroke','stroke-width','stroke-linecap','stroke-linejoin','points','fill','x','y','width','height','font-family','font-size','font-weight','d','stroke-dasharray','transform','text-anchor','font-style','dominant-baseline','rx','ry','cx','cy','xmlns']);
 for(const el of [...template.content.querySelectorAll('*')]){
  if(!allowed.has(el.tagName.toUpperCase())){el.remove();continue;}
  // Xóa bỏ hoàn toàn định vị nhảy dòng position:relative/top từ Word trên các thẻ nội dòng
  if(['SPAN','B','I','U','EM','STRONG','IMG','SUB','SUP'].includes(el.tagName.toUpperCase())){
    if(el.style.position==='relative'||el.style.position==='absolute') el.style.position='';
    if(el.style.top) el.style.top='';
    if(el.style.bottom) el.style.bottom='';
  }
  for(const attr of [...el.attributes]){
   if(attr.name==='style'){
    const styles=[...el.style].filter(k=>safeStyle.has(k)).map(k=>k+':'+el.style.getPropertyValue(k)).filter(v=>!/(url\s*\(|expression|javascript|@import)/i.test(v));el.setAttribute('style',styles.join(';'));
   }else if(attr.name==='class'){el.setAttribute('class',attr.value.split(/\s+/).filter(c=>['eq-img','eqimg','eqmiss','eq-mathtype','eq-tex','qwt-math','katex','katex-inline','katex-display','nb-word-blk','nb-qs-badge','nb-qs-colon','nb-opt-badge','nb-opt-wrap','nb-hint-box','nb-hint-badge','nb-stem-wrap','nb-opt-grid','cols-2','cols-3','cols-4','nb-opt-col','nb-ans-badge','nb-ans-choice','nb-true-badge','nb-false-badge','docx-svg-fig','docx-drawing','ppt-slide','ppt-shape','ppt-p','ppt-anim','ppt-fx-fade','ppt-fx-fly','ppt-fx-zoom','ppt-fx-wipe','ppt-fx-appear','ppt-show','ppt-math','ppt-pic','ppt-tbl-wrap','ppt-group','ppt-bg','ppt-bullet'].includes(c)).join(' '));
   }else if(attr.name==='src'&&el.tagName==='IMG'){
    if(!/^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);base64,/i.test(attr.value))el.removeAttribute('src');
   }else if(!safeAttrs.has(attr.name.toLowerCase()))el.removeAttribute(attr.name);
  }
 }
 return template.innerHTML;
}
function markBlock(text,color){
  const t=(text||'').replace(/\s+/g,' ').trim();
  if(!t) return '';
  if(/^(phần|chủ đề)\s+([ivx\d]+|[a-z])\b/i.test(t)) return 'sec top';
  if(/^(hướng dẫn|lời giải|đáp án|gợi ý|đáp số)\b/i.test(t)) return 'hint';
  if(/^(mức|cấp độ|level)\s*\d+/i.test(t)) return 'lv';
  if(/^(câu|bài|ví dụ|vd|bài tập)\s*\d+/i.test(t)) return 'qs';
  if(/^M\d+(\.\d+)*[.)\s]/.test(t) && t.length<=90) return 'sec top';
  if(/^\d+(\.\d+)*[.)]\s+\S/.test(t) && t.length<=52 && !/[.!?]$/.test(t)) return 'sec';
  if(/^(ghi nhớ|lưu ý|chú ý|kết luận|mục tiêu|tổng kết|ôn tập|nhắc lại|phương pháp)\b/i.test(t) && t.length<=52) return 'sec';
  const c=(color||'').toUpperCase();
  if(/^[0-9A-F]{6}$/.test(c)){
    const R=parseInt(c.slice(0,2),16), G=parseInt(c.slice(2,4),16), B=parseInt(c.slice(4,6),16);
    if(G>R+30 && G>B+30) return 'ans';              /* chu xanh la trong Word: phan dap an */
  }
  return '';
}
/* bo dau gach hoac so thu tu o dau dong, ke ca khi no nam trong the dinh dang */
function stripLead(html,re){
  return html.replace(/^((?:<[^>]+>\s*)*)([\s\S]*)$/, (m,tags,rest)=>tags+rest.replace(re,''));
}
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));



function formatQuestionBlock(html, isQs = false) {
  if (!html || typeof html !== 'string') return html;

  let res = html;
  // 1. Badge cho Câu / Bài / Ví dụ / VD (kể cả khi các chữ cái bị tách thẻ HTML hoặc mojibake)
  const qsRegex = /^((?:[\s\u2003\t]*<[^>]+>[\s\u2003\t]*)*)(?:C(?:[\s\u2003\t]*<\/[^>]+>[\s\u2003\t]*)*(?:[\s\u2003\t]*<[^>]+>[\s\u2003\t]*)*\s*(?:â|Ă¢|[aA]u)\s*|Câu|B(?:[\s\u2003\t]*<\/[^>]+>[\s\u2003\t]*)*(?:[\s\u2003\t]*<[^>]+>[\s\u2003\t]*)*\s*(?:à|Ă |[aA]i)\s*|Bài|Ví\s*dụ|VD)\s*(?:<\/[^>]+>[\s\u2003\t]*)*(?:[\s\u2003\t]*<[^>]+>[\s\u2003\t]*)*\s*(\d[\d\s]*[a-zA-Z]?)\s*(?:<\/[^>]+>[\s\u2003\t]*)*(?:<[^>]+>[\s\u2003\t]*)*\s*([.:])?\s*(?:<\/[^>]+>[\s\u2003\t]*)*/i;
  const qsMatch = res.match(qsRegex);
  if (qsMatch) {
    const rawMatch = qsMatch[0];
    const isCau = /c\s*(?:â|Ă¢|[aA]u)/i.test(rawMatch);
    const isBai = /b\s*(?:à|Ă |[aA]i)/i.test(rawMatch);
    const isViDu = /ví/i.test(rawMatch);
    const label = isCau ? 'Câu' : isBai ? 'Bài' : isViDu ? 'Ví dụ' : 'Câu';
    const num = (qsMatch[2] || '').replace(/\s+/g, '');
    const colon = qsMatch[3] ? `<span class="nb-qs-colon">${qsMatch[3]}</span>` : '';
    const badge = `<span class="nb-qs-badge">${label} ${num}</span>${colon} `;
    res = res.replace(qsRegex, badge);
    isQs = true;
  }

  // 2. Nhận diện Lời giải / Hướng dẫn giải
  if (/^[\s\u2003\t]*(?:<[^>]+>[\s\u2003\t]*)*(?:Lời\s*giải|Hướng\s*dẫn(?:\s*giải)?)\s*[:.]?\s*(?:<\/[^>]+>[\s\u2003\t]*)*$/i.test(res)) {
    return `<span class="nb-hint-badge">💡 LỜI GIẢI</span>`;
  }
  // Nếu có Lời giải ở đầu dòng kèm nội dung khác
  res = res.replace(/^([\s\u2003\t]*)(?:<[^>]+>[\s\u2003\t]*)*(?:Lời\s*giải|Hướng\s*dẫn(?:\s*giải)?)\s*[:.]\s*(?:<\/[^>]+>[\s\u2003\t]*)*/gi, '$1<span class="nb-hint-badge">💡 LỜI GIẢI</span> ');

  // 3. Nhận diện Đáp số / ĐS (trong câu trả lời ngắn)
  res = res.replace(/(^|[\s\u2003\t]+)(?:<[^>]+>[\s\u2003\t]*)*(ĐS|Đáp\s*số)\s*[:.]\s*([^\n<]+)(?:<\/[^>]+>[\s\u2003\t]*)*/gi, (m, prefix, label, ans) => {
    return `${prefix}<span class="nb-ans-badge">${label.toUpperCase()}: ${ans.trim()}</span>`;
  });

  // 4. Nhận diện Chọn A, Chọn B, Chọn C, Chọn D
  res = res.replace(/(^|[\s\u2003\t]+)(?:<[^>]+>[\s\u2003\t]*)*(Chọn)\s+([A-D])([.:])?(?:<\/[^>]+>[\s\u2003\t]*)*/gi, (m, prefix, ch, opt, colon) => {
    return `${prefix}<span class="nb-ans-choice">Chọn <b>${opt.toUpperCase()}</b></span>${colon || ''} `;
  });

  // 5. Trong phần đúng sai: làm nổi bật 'Đúng', 'Sai' (không dùng \b vì \b không khớp trước ký tự Đ)
  res = res.replace(/(^|[\s\u2003\t]+)(Đúng|Sai)([.:])(?![a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9])/gi, (m, prefix, val, punct) => {
    const isTrue = /^đúng/i.test(val);
    const cls = isTrue ? 'nb-true-badge' : 'nb-false-badge';
    return `${prefix}<span class="${cls}">${val.toUpperCase()}</span>${punct} `;
  });

  // 6. Badge cho các phương án trắc nghiệm A, B, C, D hoặc a), b), c), d)
  // Xóa tab/khoảng trắng thừa ở đầu nếu dòng bắt đầu bằng phương án
  res = res.replace(/^[\s\u2003\t]+(?=(?:<[^>]+>)*[A-Da-d][.):])/, '');

  // Hỗ trợ mọi thẻ bao bọc (b, u, strong, span, v.v.) và tab-stops từ Word
  const optRe = /(^|[\u2003\t]|\s{2,}|<span[^>]*style=['"][^'"]*mso-tab-count[^'"]*['"][^>]*>[\s\S]*?<\/span>)(?:<[^>]+>[\s\u2003\t]*)*([A-Da-d])(?![a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9])[\s\u2003\t]*(?:<[^>]+>[\s\u2003\t]*)*([.):])(?:\s*<\/[^>]+>)*[\s\u2003\t]*/gi;

  const textOnly = res.replace(/<[^>]+>/g, '');
  if (isQs || /[\u2003\t]/.test(res) || /(?:^|[\u2003\t\s])([A-Da-d])[.):\s]/.test(textOnly) || /mso-tab-count/i.test(res)) {
    res = res.replace(optRe, '\t<span class="nb-opt-badge">$2</span> ');
  }

  // 7. Canh tab tự động chia cột dạng Grid cho các phương án
  if (/(?:[\u2003\t]|\s{2,})<span class="nb-opt-badge">/i.test(res) || (res.match(/<span class="nb-opt-badge">/g) || []).length >= 2) {
    const rawParts = res.split(/(?:[\u2003\t]|\s{2,})(?=<span class="nb-opt-badge">)/);
    const parts = rawParts.map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const cols = parts.length >= 4 ? 4 : parts.length === 3 ? 3 : 2;
      res = `<div class="nb-opt-grid cols-${cols}">${parts.map(p => `<div class="nb-opt-col">${p}</div>`).join('')}</div>`;
    }
  }

  return res;
}

window.NBWordCore={W_NS,M_NS,V_NS,R_NS,kids,texEsc,omml2tex,unzip,inflate,MIME,cleanMarkup,markBlock,stripLead,esc,formatQuestionBlock};
})();
