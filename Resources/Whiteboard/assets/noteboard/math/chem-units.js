/* Hóa học và đơn vị đo cho Khoanh thông minh. Chạy hoàn toàn trên máy, không mạng.
   - Cân bằng phương trình phản ứng (đại số tuyến tính, hệ số nguyên nhỏ nhất), khối lượng mol theo nguyên tử khối SGK.
   - Đổi đơn vị về SI và kiểm tra hai vế công thức Vật lí cùng đơn vị. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NBChemUnits=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
/* Nguyên tử khối dùng trong SGK phổ thông */
const MASS={H:1,He:4,Li:7,Be:9,B:11,C:12,N:14,O:16,F:19,Ne:20,Na:23,Mg:24,Al:27,Si:28,P:31,S:32,Cl:35.5,Ar:40,K:39,Ca:40,Sc:45,Ti:48,V:51,Cr:52,Mn:55,Fe:56,Co:59,Ni:59,Cu:64,Zn:65,Ga:70,Ge:73,As:75,Se:79,Br:80,Kr:84,Rb:85.5,Sr:88,Mo:96,Ag:108,Cd:112,Sn:119,Sb:122,I:127,Xe:131,Cs:133,Ba:137,W:184,Pt:195,Au:197,Hg:201,Pb:207,Bi:209,U:238};
const SUB='₀₁₂₃₄₅₆₇₈₉';
const sub=s=>String(s).replace(/\d/g,d=>SUB[d]);

/* LaTeX hoặc chữ thường -> dạng "Fe + O2 -> Fe3O4" */
function chemText(input){
 let s=String(input||'');
 s=s.replace(/\\(?:xrightarrow|xlongrightarrow)\s*(?:\[[^\]]*\])?\s*\{[^{}]*\}/g,'->').replace(/\\(?:longrightarrow|rightarrow|to|Rightarrow|longmapsto)\b/g,'->').replace(/\\(?:rightleftharpoons|leftrightarrows|rightleftarrows|leftrightarrow)\b/g,'<=>');
 s=s.replace(/[→⟶⇒]/g,'->').replace(/[⇌⇄↔]/g,'<=>');
 s=s.replace(/\\(?:mathrm|mathbf|text|textrm|operatorname|mathit)\s*\{([^{}]*)\}/g,'$1').replace(/\\(?:cdot|bullet|times)\b/g,'·').replace(/\\[,;:! ]|~|\\quad|\\qquad/g,' ');
 s=s.replace(/\^\s*\{[^{}]*\}|\^\s*[+-−]|\^\s*\d*[+-]/g,'');      /* bỏ điện tích ion */
 s=s.replace(/_\s*\{\s*(\d+)\s*\}/g,'$1').replace(/_\s*(\d)/g,'$1').replace(/[{}]/g,'').replace(/\\left|\\right/g,'');
 s=s.replace(/\(\s*(?:k|l|r|dd|aq|g|s)\s*\)/g,'').replace(/\s+/g,' ').trim();
 return s;
}
/* Phân tích một công thức hóa học thành số nguyên tử mỗi nguyên tố */
function parseFormula(f){
 f=String(f).replace(/\s+/g,'');if(!f||f.length>60)return null;
 const parts=f.split(/[·.*]/);const total={};
 for(let part of parts){
  let mult=1;const lead=part.match(/^(\d+)(?=[A-Z(\[])/);if(lead&&parts.length>1){mult=+lead[1];part=part.slice(lead[1].length);}
  let i=0;
  const group=()=>{const out={};
   while(i<part.length&&part[i]!==')'&&part[i]!==']'){
    let g;
    if(part[i]==='('||part[i]==='['){const close=part[i]==='('?')':']';i++;g=group();if(part[i]!==close)throw 0;i++;}
    else{const m=part.slice(i).match(/^([A-Z][a-z]?)/);if(!m||!(m[1] in MASS))throw 0;g={[m[1]]:1};i+=m[1].length;}
    const n=part.slice(i).match(/^\d+/);const k=n?+n[0]:1;if(n)i+=n[0].length;
    for(const [e,c] of Object.entries(g))out[e]=(out[e]||0)+c*k;
   }
   return out;};
  try{const g=group();if(i!==part.length||!Object.keys(g).length)return null;for(const [e,c] of Object.entries(g))total[e]=(total[e]||0)+c*mult;}catch{return null;}
 }
 return total;
}
function molarMass(formula){const atoms=parseFormula(chemText(formula));if(!atoms)return null;let m=0;for(const [e,c] of Object.entries(atoms))m+=MASS[e]*c;return Math.round(m*100)/100;}
const pretty=f=>String(f).replace(/(\d+)(?=[A-Z(\[])/g,(m,d,o)=>o===0?m:m).replace(/([A-Za-z)\]])(\d+)/g,(_,a,d)=>a+sub(d));
/* Tách một vế: "2H2 + O2" -> [{coef:2,formula:'H2'},...] */
function side(text){
 const items=text.split(/\s*\+\s*/).filter(Boolean);if(!items.length)return null;
 return items.map(t=>{const m=t.trim().match(/^(\d*)\s*(.+)$/);return {given:m[1]?+m[1]:null,formula:m[2]};});
}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a;}
/* Phân số hữu tỉ đơn giản, đủ cho ma trận phản ứng nhỏ */
const fr=(n,d=1)=>{if(d<0){n=-n;d=-d;}const g=gcd(n,d)||1;return [n/g,d/g];};
const fsub=(a,b)=>fr(a[0]*b[1]-b[0]*a[1],a[1]*b[1]),fmul=(a,b)=>fr(a[0]*b[0],a[1]*b[1]),fdiv=(a,b)=>fr(a[0]*b[1],a[1]*b[0]);
function balance(input){
 const text=chemText(input);const arrow=text.match(/<=>|->|=/);if(!arrow)return null;
 const [l,r]=[text.slice(0,arrow.index),text.slice(arrow.index+arrow[0].length)];
 const L=side(l),R=side(r);if(!L||!R)return null;
 const species=[...L,...R];const atoms=species.map(s=>parseFormula(s.formula));if(atoms.some(a=>!a))return null;
 const elements=[...new Set(atoms.flatMap(a=>Object.keys(a)))];
 /* Mỗi nguyên tố có ở cả hai vế, nếu không thì không thể cân bằng */
 for(const e of elements)if(!atoms.slice(0,L.length).some(a=>a[e])||!atoms.slice(L.length).some(a=>a[e]))return {ok:false,error:'Nguyên tố '+e+' chỉ có ở một vế.'};
 const n=species.length;const M=elements.map(e=>atoms.map((a,j)=>fr((a[e]||0)*(j<L.length?1:-1))));
 /* Rút gọn bậc thang để tìm nghiệm không tầm thường */
 const pivots=[];let row=0;
 for(let c=0;c<n&&row<M.length;c++){
  const p=M.findIndex((r,i)=>i>=row&&r[c][0]!==0);if(p<0)continue;[M[row],M[p]]=[M[p],M[row]];
  const pv=M[row][c];M[row]=M[row].map(x=>fdiv(x,pv));
  for(let i=0;i<M.length;i++)if(i!==row&&M[i][c][0]!==0){const k=M[i][c];M[i]=M[i].map((x,j)=>fsub(x,fmul(k,M[row][j])));}
  pivots.push(c);row++;
 }
 const free=[...Array(n).keys()].filter(c=>!pivots.includes(c));
 if(free.length!==1)return {ok:false,error:free.length?'Phương trình có nhiều cách cân bằng; hãy tách thành các phản ứng riêng.':'Không cân bằng được, kiểm tra lại các chất.'};
 const f=free[0];const x=Array(n).fill(null);x[f]=fr(1);
 pivots.forEach((c,i)=>{x[c]=fmul(fr(-1),M[i][f]);});
 const lcm=x.reduce((m,v)=>m*v[1]/gcd(m,v[1]),1);let k=x.map(v=>v[0]*lcm/v[1]);
 const g=k.reduce((a,b)=>gcd(a,b));k=k.map(v=>v/g);if(k.every(v=>v<0))k=k.map(v=>-v);
 if(k.some(v=>v<=0))return {ok:false,error:'Không cân bằng được, kiểm tra lại các chất.'};
 const term=(s,c)=>(c===1?'':c)+pretty(s.formula);
 const arrowOut=arrow[0]==='<=>'?' ⇌ ':' → ';
 const out=L.map((s,i)=>term(s,k[i])).join(' + ')+arrowOut+R.map((s,i)=>term(s,k[L.length+i])).join(' + ');
 const masses=species.map(s=>({formula:pretty(s.formula),M:molarMass(s.formula)}));
 const given=species.every(s=>s.given!=null)?species.map(s=>s.given):null;
 const already=!!given&&given.every((v,i)=>v===k[i]);
 return {ok:true,text:out,coefficients:k,masses,already};
}
/* Một công thức đơn lẻ có phải chất hóa học? (ít nhất một nguyên tố 2 chữ cái hoặc có chỉ số, để tránh nhầm biến Toán) */
function looksLikeFormula(s){s=chemText(s);return /^[A-Z(\[][A-Za-z0-9()[\]·.]*$/.test(s)&&/[A-Z][a-z]|[A-Z)\]]\d/.test(s)&&!!parseFormula(s);}
function looksLikeEquation(s){const t=chemText(s);if(!/->|<=>/.test(t)&&!/=/.test(t))return false;const r=balance(t);if(!r)return false;
 /* Dùng "=" thì chỉ coi là phương trình hóa học nếu mọi chất đều là công thức hóa học rõ ràng */
 if(!/->|<=>/.test(t))return t.split(/=|\+/).every(x=>looksLikeFormula(x.trim().replace(/^\d+/,'')));return true;}

/* ---------- Đơn vị ---------- */
/* thứ nguyên: [kg, m, s, A, K] */
const D=(kg=0,m=0,s=0,A=0,K=0)=>[kg,m,s,A,K];
const BASE={m:[1,D(0,1)],g:[1e-3,D(1)],s:[1,D(0,0,1)],A:[1,D(0,0,0,1)],K:[1,D(0,0,0,0,1)],N:[1,D(1,1,-2)],J:[1,D(1,2,-2)],W:[1,D(1,2,-3)],Pa:[1,D(1,-1,-2)],V:[1,D(1,2,-3,-1)],'Ω':[1,D(1,2,-3,-2)],ohm:[1,D(1,2,-3,-2)],C:[1,D(0,0,1,1)],F:[1,D(-1,-2,4,2)],Hz:[1,D(0,0,-1)],T:[1,D(1,0,-2,-1)],L:[1e-3,D(0,3)],l:[1e-3,D(0,3)],eV:[1.602176634e-19,D(1,2,-2)],cal:[4.186,D(1,2,-2)],Wh:[3600,D(1,2,-2)],atm:[101325,D(1,-1,-2)],mmHg:[133.322,D(1,-1,-2)],bar:[1e5,D(1,-1,-2)]};
const EXTRA={h:[3600,D(0,0,1)],min:[60,D(0,0,1)],'phút':[60,D(0,0,1)],'giờ':[3600,D(0,0,1)],t:[1000,D(1)],'tấn':[1000,D(1)],'°C':[1,D(0,0,0,0,1)]};
const PREFIX={G:1e9,M:1e6,k:1e3,d:1e-1,c:1e-2,m:1e-3,'µ':1e-6,'μ':1e-6,u:1e-6,n:1e-9,p:1e-12};
const SUP={'²':2,'³':3,'¹':1,'⁻':'-'};
function unitToken(tok){
 let t=tok.replace(/\^?\(?(-?\d)\)?$/,'').replace(/[²³]$/,''),e=1;const m=tok.match(/\^?\(?(-?\d)\)?$/);if(m&&t!==tok)e=+m[1];else if(/[²³]$/.test(tok))e=SUP[tok.slice(-1)];
 if(!t)return null;
 const look=x=>BASE[x]||EXTRA[x];
 let u=look(t);if(!u&&t.length>1&&PREFIX[t[0]]&&BASE[t.slice(1)])u=[PREFIX[t[0]]*BASE[t.slice(1)][0],BASE[t.slice(1)][1]];
 if(!u&&t.startsWith('°')&&t!=='°C')return null;
 return u?[Math.pow(u[0],e),u[1].map(v=>v*e),t]:null;
}
function parseUnit(text){
 const s=String(text||'').replace(/\\mathrm\{([^{}]*)\}|\\text\{([^{}]*)\}/g,'$1$2').replace(/\\Omega/g,'Ω').replace(/\\mu/g,'µ').replace(/\^\{([^{}]*)\}/g,'^$1').replace(/\\cdot|·|\*/g,'.').replace(/\s+/g,'.').replace(/\\/g,'').trim();
 if(!s||s.length>30)return null;
 const groups=s.split('/');let f=1,d=D();
 for(let gi=0;gi<groups.length;gi++){
  const toks=groups[gi].split('.').filter(Boolean);if(!toks.length)return null;
  for(const tok of toks){const u=unitToken(tok);if(!u)return null;const sign=gi===0?1:-1;f*=Math.pow(u[0],sign);d=d.map((v,i)=>v+u[1][i]*sign);}
 }
 return {factor:f,dims:d,text:s.replace(/\./g,'·')};
}
const NAMED=[['m/s',D(0,1,-1)],['m/s²',D(0,1,-2)],['N',D(1,1,-2)],['J',D(1,2,-2)],['W',D(1,2,-3)],['Pa',D(1,-1,-2)],['V',D(1,2,-3,-1)],['Ω',D(1,2,-3,-2)],['C',D(0,0,1,1)],['F',D(-1,-2,4,2)],['Hz',D(0,0,-1)],['T',D(1,0,-2,-1)],['kg',D(1)],['m',D(0,1)],['s',D(0,0,1)],['A',D(0,0,0,1)],['K',D(0,0,0,0,1)],['m²',D(0,2)],['m³',D(0,3)],['kg·m/s',D(1,1,-1)],['kg/m³',D(1,-3)],['N/m',D(1,0,-2)],['rad/s',D(0,0,-1)]];
const same=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-9);
function siName(d){const n=NAMED.find(([,v])=>same(v,d));if(n)return n[0];const names=['kg','m','s','A','K'];const pos=[],neg=[];d.forEach((v,i)=>{if(v>0)pos.push(names[i]+(v===1?'':'^'+v));else if(v<0)neg.push(names[i]+(v===-1?'':'^'+(-v)));});return (pos.join('·')||'1')+(neg.length?'/'+neg.join('·'):'');}
const SUPD='⁰¹²³⁴⁵⁶⁷⁸⁹';
const fmt=v=>{if(!Number.isFinite(v))return '?';const a=Math.abs(v);let r;if(a!==0&&(a>=1e6||a<1e-3)){const [mant,ex]=v.toExponential(3).split('e');r=(+mant).toLocaleString('vi-VN',{maximumFractionDigits:3})+' × 10'+String(+ex).replace('-','⁻').replace(/\d/g,d=>SUPD[d]);}else r=(+v.toPrecision(6)).toLocaleString('vi-VN',{maximumFractionDigits:6});return r.replace('-','−');};
/* "v = 72 km/h" hoặc "72km/h" -> đổi về SI */
function convert(input){
 const s=String(input||'').replace(/\\,|\\ |~/g,' ').replace(/\\mathrm\{([^{}]*)\}|\\text\{([^{}]*)\}/g,'$1$2').trim();
 const m=s.match(/^(?:([A-Za-zα-ωΑ-Ω][A-Za-z0-9_{}]*)\s*=\s*)?(-?\d+(?:[.,]\d+)?(?:\s*(?:\\times|×|\.|\*)\s*10\^\{?-?\d+\}?)?)\s*(.+)$/u);if(!m)return null;
 let value=m[2].replace(',','.');const exp=value.match(/(?:\\times|×|\.|\*)\s*10\^\{?(-?\d+)\}?/);let v=parseFloat(value);if(exp)v*=Math.pow(10,+exp[1]);
 const raw=m[3].trim();
 if(/^°?C$/.test(raw.replace('^\\circ','°').replace('^{\\circ}','°'))&&/°|circ/.test(raw))return {name:m[1]||'',value:v,from:'°C',to:'K',result:v+273.15,text:(m[1]?m[1]+' = ':'')+fmt(v)+' °C = '+fmt(v+273.15)+' K'};
 const u=parseUnit(raw);if(!u)return null;
 const si=siName(u.dims),res=v*u.factor;
 if(Math.abs(u.factor-1)<1e-12&&NAMED.some(([n])=>n===u.text))return null;   /* đã là đơn vị SI */
 return {name:m[1]||'',value:v,from:u.text,to:si,result:res,text:(m[1]?m[1]+' = ':'')+fmt(v)+' '+u.text+' = '+fmt(res)+' '+si};
}
/* Thứ nguyên của các kí hiệu Vật lí không nhập nhằng trong SGK (bỏ P, p, Q, C, d, T, k vì có nhiều nghĩa) */
const VAR_DIMS={m:D(1),t:D(0,0,1),v:D(0,1,-1),a:D(0,1,-2),g:D(0,1,-2),F:D(1,1,-2),s:D(0,1),x:D(0,1),l:D(0,1),h:D(0,1),r:D(0,1),'λ':D(0,1),f:D(0,0,-1),'ω':D(0,0,-1),W:D(1,2,-2),E:D(1,2,-2),U:D(1,2,-3,-1),I:D(0,0,0,1),R:D(1,2,-3,-2),q:D(0,0,1,1)};
/* Kiểm tra hai vế cùng đơn vị. ast từ NBSmartMath.parse. Trả null khi không đủ thông tin để kết luận. */
function checkDimensions(parsed){
 if(!parsed||!parsed.rhs)return null;let numbers=false,unknown=false;
 function dim(n,inExp){
  if(n.type==='num'){if(!inExp)numbers=true;return D();}
  if(n.type==='const')return D();
  if(n.type==='var'){const d=VAR_DIMS[n.name];if(!d){unknown=true;return D();}return d;}
  if(n.type==='unary')return dim(n.a,inExp);
  if(n.type==='fn'){const a=dim(n.a,inExp);if(n.name==='sqrt')return a.map(v=>v/2);if(n.name==='abs')return a;if(!same(a,D()))throw {msg:'Biểu thức trong '+n.name+'(…) phải không có đơn vị.'};return D();}
  const a=dim(n.a,inExp);
  if(n.op==='^'){const e=n.b.type==='num'?n.b.value:n.b.type==='unary'&&n.b.a.type==='num'?-n.b.a.value:null;if(e==null){dim(n.b,true);return same(a,D())?a:(unknown=true,a);}return a.map(v=>v*e);}
  const b=dim(n.b,inExp);
  if(n.op==='+'||n.op==='-'){if(!same(a,b))throw {msg:'Cộng/trừ hai đại lượng khác đơn vị ('+siName(a)+' và '+siName(b)+').'};return a;}
  if(n.op==='*')return a.map((v,i)=>v+b[i]);if(n.op==='/')return a.map((v,i)=>v-b[i]);return a;
 }
 try{const l=dim(parsed.lhs),r=dim(parsed.rhs);if(unknown)return null;if(same(l,r))return {ok:true,unit:siName(l)};
  if(numbers)return null;                                          /* có số thay cho đại lượng (vd. F = 2a) thì không kết luận */
  return {ok:false,msg:'Hai vế khác đơn vị: vế trái '+siName(l)+', vế phải '+siName(r)+'.'};}
 catch(e){if(unknown||numbers)return null;return {ok:false,msg:e.msg||'Không kiểm tra được đơn vị.'};}
}
/* LaTeX -> chữ để đọc (câu tiếng Anh viết tay) */
function latexToText(latex){
 let s=String(latex||'');
 s=s.replace(/\\(?:mathrm|mathbf|text|textrm|textit|mathit|operatorname)\s*\{([^{}]*)\}/g,'$1').replace(/\\[,;:! ]|~|\\quad|\\qquad/g,' ').replace(/\\(?:left|right)/g,'');
 s=s.replace(/[_^]\s*\{([^{}]*)\}/g,'$1').replace(/[{}]/g,'').replace(/\\[a-zA-Z]+/g,' ').replace(/\s+/g,' ').trim();
 return s;
}
function looksLikeSentence(text){const t=String(text||'').trim();const words=t.split(/\s+/).filter(w=>/^[A-Za-z'’]+[.,!?]?$/.test(w));
 return words.length>=2&&words.length===t.split(/\s+/).length&&!/[=+^\/]/.test(t)&&t.replace(/[^A-Za-z]/g,'').length>=5;}
return {MASS,chemText,parseFormula,molarMass,balance,pretty,looksLikeFormula,looksLikeEquation,parseUnit,convert,checkDimensions,latexToText,looksLikeSentence,siName};
});
