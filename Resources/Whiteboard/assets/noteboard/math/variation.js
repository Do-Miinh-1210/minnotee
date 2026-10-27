/* NoteBoard variation tables: symbolic rational arithmetic, finite real-domain partitions.
   No eval, remote service, sampling-based claims of completeness, or implicit parameter values. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NBVariation=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const notation=typeof module==='object'&&module.exports?require('./notation.js'):window.NBVariationNotation;
const bad=m=>{throw Error(m);}, MAX=16;
function parse(text){
 let s=String(text).trim().replace(/^\s*(?:[a-zA-Z]\s*\(\s*x\s*\)|y)\s*=\s*/, '').replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/²/g,'^2').replace(/³/g,'^3').replace(/⁴/g,'^4').replace(/π/g,'pi').replace(/√/g,'sqrt');
 if(!s||s.length>1000)bad('Nhập một hàm số theo x (tối đa 1000 kí tự).');
 const raw=[];while(s){const m=s.match(/^\s*(?:(\d*\.?\d+(?:[eE][+-]?\d+)?)|([A-Za-z]+)|([+*/^(),-]))/);if(!m)bad('Kí hiệu chưa hỗ trợ trong hàm số.');s=s.slice(m[0].length);if(m[1])raw.push({t:'num',v:+m[1],literal:m[1]});else if(m[2]){const n=m[2].toLowerCase();if(n==='pi'||n==='e')raw.push({t:'num',v:n==='pi'?Math.PI:Math.E,constant:n});else if(n==='x')raw.push({t:'x'});else if(['sqrt','abs','ln','log','exp','sin','cos','tan'].includes(n))raw.push({t:'fn',v:n});else bad('Hãy thay tham số bằng số. Hàm hỗ trợ: sqrt, abs, ln, log, exp, sin, cos, tan.');}else raw.push({t:m[3]});}
 const ts=[];for(const t of raw){const p=ts.at(-1);if(p&&['num','x',')'].includes(p.t)&&['num','x','fn','('].includes(t.t))ts.push({t:'*'});ts.push(t);}
 let i=0,depth=0;const bp={'+':10,'-':10,'*':20,'/':20,'^':30};
 function expr(min=0){if(++depth>50)bad('Biểu thức lồng quá sâu.');const t=ts[i++];if(!t)bad('Biểu thức chưa hoàn chỉnh.');let a;
  if(t.t==='num')a={...t};else if(t.t==='x')a={t:'x'};else if(t.t==='+'||t.t==='-'){a=expr(25);if(t.t==='-')a={t:'neg',a};}
  else if(t.t==='('){a=expr();if(ts[i++]?.t!==')')bad('Thiếu dấu đóng ngoặc.');}
  else if(t.t==='fn'){if(ts[i++]?.t!=='(')bad('Viết hàm dưới dạng '+t.v+'(…).');a={t:'fn',f:t.v,a:expr()};if(ts[i++]?.t!==')')bad('Thiếu dấu đóng ngoặc.');}
  else bad('Biểu thức không hợp lệ.');
  while(ts[i]&&bp[ts[i].t]>=min){const op=ts[i++].t;a={t:op,a,b:expr(op==='^'?bp[op]:bp[op]+1)};}depth--;return a;
 }
 const a=expr();if(i!==ts.length)bad('Chỉ nhập một biểu thức hàm số theo x.');return a;
}
const trim=a=>{while(a.length>1&&a.at(-1)===0)a.pop();if(a.length>MAX+1||a.some(x=>!Number.isFinite(x)))bad('Bậc hoặc hệ số quá lớn để lập bảng tin cậy.');return a;};
const add=(a,b,k=1)=>trim(Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]||0)+k*(b[i]||0)));
function mul(a,b){const c=Array(a.length+b.length-1).fill(0);a.forEach((v,i)=>b.forEach((w,j)=>c[i+j]+=v*w));return trim(c);}
function pow(a,n){let p=[1];for(let i=0;i<n;i++)p=mul(p,a);return p;}
const der=a=>a.length===1?[0]:a.slice(1).map((v,i)=>v*(i+1));
const val=(a,x)=>a.reduceRight((s,v)=>s*x+v,0);
const scale=(a,x)=>a.reduceRight((s,v)=>s*Math.abs(x)+Math.abs(v),0);
const zero=(a,x)=>Math.abs(val(a,x))<=3e-12*Math.max(Number.MIN_VALUE,scale(a,x));
const unique=a=>a.sort((x,y)=>x-y).filter((x,i,b)=>!i||Math.abs(x-b[i-1])>2e-9*Math.max(1,Math.abs(x)));
function roots(a){
 a=trim(a.slice());const n=a.length-1;if(!n)return [];if(n===1)return [-a[0]/a[1]];
 const B=1+Math.max(...a.slice(0,-1).map(v=>Math.abs(v/a.at(-1))));if(!Number.isFinite(B)||B>1e10)bad('Hệ số quá chênh lệch; hãy đổi đơn vị hoặc rút gọn biểu thức.');
 const c=roots(der(a)).filter(x=>Math.abs(x)<B),ps=[-B,...c,B],out=c.filter(x=>zero(a,x));
 for(let i=0;i+1<ps.length;i++){let l=ps[i],r=ps[i+1],fl=val(a,l),fr=val(a,r);if(zero(a,l)||zero(a,r)||Math.sign(fl)===Math.sign(fr))continue;for(let k=0;k<160;k++){const m=l+(r-l)/2,f=val(a,m);if(m===l||m===r||f===0){l=r=m;break;}if(Math.sign(f)===Math.sign(fl)){l=m;fl=f;}else r=m;}out.push((l+r)/2);}
 return unique(out);
}
function rational(a){
 if(a.t==='num'){if(!Number.isFinite(a.v))bad('Hệ số quá lớn.');return {p:[a.v],q:[1],bans:[]};}if(a.t==='x')return {p:[0,1],q:[1],bans:[]};
 if(a.t==='neg'){const r=rational(a.a);r.p=r.p.map(v=>-v);return r;}
 if(a.t==='^'){
  if(a.b.t==='neg'&&a.b.a.t==='num')a={...a,b:{t:'num',v:-a.b.a.v}};
  if(a.b.t!=='num'||!Number.isInteger(a.b.v)||Math.abs(a.b.v)>12)bad('Dạng lũy thừa này chưa hỗ trợ lập bảng toàn miền.');
  const r=rational(a.a),n=a.b.v;if(n<0){if(r.p.every(v=>v===0))bad('Hàm không xác định.');return {p:pow(r.q,-n),q:pow(r.p,-n),bans:[...r.bans,r.p]};}return {p:pow(r.p,n),q:pow(r.q,n),bans:r.bans};
 }
 if(!['+','-','*','/'].includes(a.t))bad('Hiện hỗ trợ đa thức, phân thức; hoặc sqrt, abs, ln, log, exp của một phân thức; lượng giác của ax+b trên khoảng hữu hạn.');
 const u=rational(a.a),v=rational(a.b),bans=[...u.bans,...v.bans];
 if(a.t==='+'||a.t==='-')return {p:add(mul(u.p,v.q),mul(v.p,u.q),a.t==='-'?-1:1),q:mul(u.q,v.q),bans};
 if(a.t==='*')return {p:mul(u.p,v.p),q:mul(u.q,v.q),bans};
 if(v.p.every(x=>x===0))bad('Mẫu số bằng 0 trên toàn miền.');
 return {p:mul(u.p,v.q),q:mul(u.q,v.p),bans:[...bans,v.p]};
}
function fmt(x){if(x===Infinity)return '+∞';if(x===-Infinity)return '−∞';if(!Number.isFinite(x))return '∄';if(Math.abs(x-Math.round(x))<1e-10*Math.max(1,Math.abs(x)))return String(Math.round(x)).replace('-','−');return '≈'+Number(x.toPrecision(7)).toString().replace('-','−');}
function order(a,x){let k=0;while(a.length>1&&zero(a,x)){a=der(a);k++;}return {k,v:val(a,x)};}
function limit(r,x,side){
 if(!Number.isFinite(x)){const d=r.p.length-r.q.length,c=r.p.at(-1)/r.q.at(-1);if(r.p.every(v=>v===0)||d<0)return 0;if(d===0)return c;return Math.sign(c)*(x<0&&Math.abs(d)%2?-1:1)*Infinity;}
 if(r.p.every(v=>v===0))return 0;
 const p=order(r.p,x),q=order(r.q,x),d=p.k-q.k;
 // Equal orders cancel the same factorial; different orders only affect sign for infinite limits.
 if(d>0)return 0;if(d===0)return p.v/q.v;return Math.sign(p.v/q.v)*(Math.abs(d)%2?side:1)*Infinity;
}
function bound(s, fallback){if(s===undefined||s==='')return fallback;const t=String(s).replace(/\s/g,'').replace('−','-');if(/^-?(?:inf(?:inity)?|∞)$/i.test(t))return t[0]==='-'?-Infinity:Infinity;if(/^\+?(?:inf(?:inity)?|∞)$/i.test(t))return Infinity;const r=rational(parse(t));if(r.p.length!==1||r.q.length!==1)bad('Cận phải là số, biểu thức hằng hoặc ±∞.');return r.p[0]/r.q[0];}
function expression(a){return a.t==='x'?'x':a.t==='num'?(a.constant||a.literal||String(a.v)):a.t==='neg'?'(-'+expression(a.a)+')':a.t==='fn'?a.f+'('+expression(a.a)+')':'('+expression(a.a)+a.t+expression(a.b)+')';}
function outer(a){
 if(a.t==='fn'||a.t==='^'&&a.a.t==='num'&&a.a.v>0&&a.b.t!=='num')return {core:a,k:1,b:0};
 if(a.t==='neg'){const q=outer(a.a);return q?{...q,k:-q.k,b:-q.b}:null;}
 const constant=n=>{try{const r=rational(n);return r.p.length===1&&r.q.length===1?r.p[0]/r.q[0]:null;}catch(_){return null;}};
 if(!a.a||!a.b)return null;
 const q=outer(a.a),c=constant(a.b);
 if(q&&c!==null){if(a.t==='+'||a.t==='-')return {...q,b:q.b+(a.t==='+'?c:-c)};if(a.t==='*')return {...q,k:q.k*c,b:q.b*c};if(a.t==='/'&&c!==0)return {...q,k:q.k/c,b:q.b/c};}
 const p=outer(a.b),d=constant(a.a);
 if(p&&d!==null){if(a.t==='+')return {...p,b:p.b+d};if(a.t==='-')return {...p,k:-p.k,b:d-p.b};if(a.t==='*')return {...p,k:p.k*d,b:p.b*d};}
 return null;
}
function analyzeRaw(text,options={}){
 const ast=parse(text),o=outer(ast);
 if(o&&o.core!==ast){const m=analyzeRaw(expression(o.core),options),Y=v=>v===null?null:o.k===0?o.b:o.k*v+o.b;m.source=String(text).trim();m.marks=m.marks.map((p,i)=>({...p,value:Y(p.value),left:Y(p.left),right:Y(p.right),derivative:o.k===0&&p.defined&&m.intervals[i-1]?.sign!=null&&m.intervals[i]?.sign!=null?'0':p.derivative}));m.intervals=m.intervals.map(p=>({...p,sign:p.sign===null?null:p.sign*Math.sign(o.k)}));return m;}
 let kind='rational',base=null,r;
 if(ast.t==='fn'){kind=ast.f;r=rational(ast.a);}else if(ast.t==='^'&&ast.a.t==='num'&&ast.a.v>0&&!Number.isInteger(ast.b?.v)){kind='exp';base=ast.a.v;r=rational(ast.b);}else r=rational(ast);
 if(r.q.every(v=>v===0))bad('Hàm không xác định.');
 const trig=['sin','cos','tan'].includes(kind),lo=bound(options.lo,trig?-2*Math.PI:-Infinity),hi=bound(options.hi,trig?2*Math.PI:Infinity);
 if(!(lo<hi))bad('Cận trái phải nhỏ hơn cận phải.');
 const dq=add(mul(der(r.p),r.q),mul(r.p,der(r.q)),-1),excluded=unique([...roots(r.q),...r.bans.flatMap(roots)]);
 let cuts=[...excluded,...roots(dq)];if(['sqrt','abs','ln','log'].includes(kind))cuts.push(...roots(r.p));
 const raw=x=>val(r.p,x)/val(r.q,x),missing=x=>excluded.some(v=>Math.abs(v-x)<1e-8*Math.max(1,Math.abs(x)));
 const defined=x=>!missing(x)&&(['ln','log'].includes(kind)?raw(x)>0:kind==='sqrt'?raw(x)>=0||zero(r.p,x):true);
 const transform=x=>{if(kind==='sqrt')return Math.sqrt(Math.max(0,x));if(kind==='abs')return Math.abs(x);if(kind==='ln')return Math.log(x);if(kind==='log')return Math.log10(x);if(kind==='exp')return Math.pow(base??Math.E,x);return x;};
 let coefficient=1,offset=0;
 if(trig){if(!Number.isFinite(lo)||!Number.isFinite(hi))bad('Hàm lượng giác cần khoảng hữu hạn, ví dụ −2*pi đến 2*pi.');if(r.q.length!==1||r.p.length>2)bad('Hiện hỗ trợ sin(ax+b), cos(ax+b), tan(ax+b).');coefficient=(r.p[1]||0)/r.q[0];offset=r.p[0]/r.q[0];if(!coefficient)bad('Hãy nhập trực tiếp giá trị hằng thay cho hàm lượng giác hằng.');
  const t0=Math.min(coefficient*lo+offset,coefficient*hi+offset),t1=Math.max(coefficient*lo+offset,coefficient*hi+offset),start=kind==='cos'?0:Math.PI/2;
  if((t1-t0)/Math.PI>60)bad('Khoảng lượng giác quá rộng; chọn khoảng nhỏ hơn.');
  cuts=[];for(let k=Math.ceil((t0-start)/Math.PI);k<=(t1-start)/Math.PI;k++)cuts.push((start+k*Math.PI-offset)/coefficient);
 }
 const points=unique(cuts.filter(x=>Number.isFinite(x)&&x>lo&&x<hi)),xs=[lo,...points,hi];if(xs.length>34)bad('Bảng quá nhiều mốc; hãy chọn khoảng xét nhỏ hơn.');
 const isPole=x=>kind==='tan'&&Number.isFinite(x)&&Math.abs(Math.cos(coefficient*x+offset))<1e-9;
 const F=x=>trig?(isPole(x)?NaN:Math[kind](coefficient*x+offset)):defined(x)?transform(raw(x)):NaN;
 const signAt=x=>{if(trig)return Math.sign(kind==='sin'?coefficient*Math.cos(coefficient*x+offset):kind==='cos'?-coefficient*Math.sin(coefficient*x+offset):coefficient);if(!defined(x))return null;let s=Math.sign(val(dq,x));if(kind==='abs')s*=Math.sign(raw(x));if(kind==='exp'&&base!==null)s*=Math.sign(Math.log(base));return s;};
 const probe=(a,b)=>a===-Infinity&&b===Infinity?0:a===-Infinity?b-Math.max(1,Math.abs(b)+1):b===Infinity?a+Math.max(1,Math.abs(a)+1):a+(b-a)/2;
 const intervals=xs.slice(0,-1).map((x,i)=>{const t=probe(x,xs[i+1]);return {left:x,right:xs[i+1],sign:signAt(t)};});
 function L(x,side){if(trig){if(isPole(x))return -Math.sign(coefficient)*side*Infinity;return F(x);}let v=limit(r,x,side);if(['ln','log'].includes(kind)&&v===0)return -Infinity;return transform(v);}
 const marks=xs.map((x,i)=>{const finite=Number.isFinite(x),f=finite?F(x):NaN,inside=finite&&Number.isFinite(f),left=i>0&&intervals[i-1].sign!==null?L(x,-1):null,right=i<intervals.length&&intervals[i].sign!==null?L(x,1):null;let derivative='';if(inside&&i&&i<xs.length-1){const atZero=zero(r.p,x),cusp=kind==='abs'&&atZero&&!zero(dq,x)||kind==='sqrt'&&atZero&&(order(r.p,x).k-order(r.q,x).k<4||left===null||right===null);derivative=cusp?'∄':'0';}return {x,defined:inside,value:inside?f:null,left,right,derivative,excluded:finite&&(!inside||isPole(x))};});
 if(intervals.every(v=>v.sign===null)&&marks.every(v=>!v.defined))bad('Hàm không xác định trên khoảng đã chọn.');
 return {source:String(text).trim(),kind,lo,hi,marks,intervals,approximate:true,note:'Các giá trị có dấu ≈ được làm tròn. Góc lượng giác tính bằng radian.'};
}
function analyze(text,options={}){return notation.annotate(analyzeRaw(text,options),parse(text),options,parse);}
function svg(model){
 const n=model.marks.length,tex=(m,k)=>m.tex?.[k]??fmt(m[k]),label=notation.svgLabel;
 const widths=model.marks.map(m=>notation.layout(tex(m,'x'),22).w),side=Math.max(48,widths[0]/2+10,widths.at(-1)/2+10),slot=Math.max(180,...widths.map(v=>v+45));
 const w=Math.ceil(Math.max(700,64+side*2+(n-1)*slot)),h=344,left=64+side,right=w-side,step=(right-left)/(n-1);
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Bảng biến thiên"><rect width="100%" height="100%" fill="white"/><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#000000"/></marker><pattern id="invalid" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#000000" stroke-width="1"/></pattern></defs>';
 s+='<path d="M1 1H'+(w-1)+'V343H1ZM64 1V343M1 76H'+(w-1)+'M1 128H'+(w-1)+'" fill="none" stroke="#000000" stroke-width="2"/>';
 s+=label('x',32,38,24)+label('y′',32,102,24)+label('y',32,236,24);
 const finite=unique(model.marks.flatMap(m=>[m.value,m.left,m.right]).filter(v=>v!==null&&Number.isFinite(v)));
 const height=v=>v===Infinity?172:v===-Infinity?280:finite.length<2?232:272-80*(v-finite[0])/(finite.at(-1)-finite[0]);
 // Intervals draw only signs/arrows. Every ordinate label is owned by its mark.
 model.intervals.forEach((v,i)=>{const x0=left+i*step,x1=x0+step;if(v.sign===null){s+='<rect x="'+(x0+2)+'" y="78" width="'+(step-4)+'" height="263" fill="url(#invalid)"/>';return;}s+=label(v.sign>0?'+':v.sign<0?'−':'0',(x0+x1)/2,102,25);const a=model.marks[i],b=model.marks[i+1];s+='<path d="M'+(x0+30)+' '+height(a.right)+'L'+(x1-30)+' '+height(b.left)+'" fill="none" stroke="#000000" stroke-width="3" marker-end="url(#arrow)"/>';});
 model.marks.forEach((m,i)=>{const x=left+i*step;s+=label(tex(m,'x'),x,38,22,'middle','data-role="abscissa" data-mark="'+i+'"');
  if(m.excluded&&i>0&&i<n-1)s+='<path d="M'+(x-3)+' 76V343M'+(x+3)+' 76V343" stroke="#000000" stroke-width="2"/>';else s+=label(m.derivative,x,102,22);
  const valueLabel=(v,k,dx=0,anchor='middle')=>{if(v===null)return;const low=(k==='value'?model.intervals[i-1]?.sign<0&&model.intervals[i]?.sign>0:k==='left'?model.intervals[i-1]?.sign<0:model.intervals[i]?.sign>0),y=height(v)+(low?36:-34),maxWidth=i===0||i===n-1?2*side-12:anchor==='middle'?step-42:step/2-20;s+=label(tex(m,k),x+dx,y,22,anchor,'data-role="value" data-mark="'+i+'" data-side="'+k+'"',maxWidth);};
  if(m.defined)valueLabel(m.value,'value');
  else if(i===0)valueLabel(m.right,'right');else if(i===n-1)valueLabel(m.left,'left');
  else{valueLabel(m.left,'left',-12,'end');valueLabel(m.right,'right',12,'start');}
 });
 return s+'</svg>';
}
return {parse,analyze,svg,format:fmt,roots};
});
