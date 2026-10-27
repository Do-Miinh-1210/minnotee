/* Interactive ink formulas. Bounded parser and evaluator: no eval/Function. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NBSmartMath=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const FUNCTIONS={sin:Math.sin,cos:Math.cos,tan:Math.tan,sqrt:Math.sqrt,abs:Math.abs,ln:Math.log,log:Math.log10,exp:Math.exp};
const GREEK={alpha:'α',beta:'β',gamma:'γ',delta:'δ',theta:'θ',lambda:'λ',mu:'μ',nu:'ν',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',phi:'φ',varphi:'φ',omega:'ω',Delta:'Δ',Omega:'Ω'};
const own=(o,k)=>Object.hasOwn(o,k),finite=x=>Number.isFinite(x)&&Math.abs(x)<=1e6;
function normalise(text){
 let s=String(text||'').trim();if(!s||s.length>512)throw Error('Công thức cần từ 1 đến 512 ký tự.');
 s=s.replace(/\\(?:begin|end)\{[a-zA-Z*]+\}/g,'');
 s=s.replace(/\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle|limits|nolimits)\b/g,'');
 for(let count=0;count<10&&/\\(?:mathrm|mathbf|mathit|textbf|text|operatorname|mathbb|mathcal)\{([^{}]+)\}/.test(s);count++){
   s=s.replace(/\\(?:mathrm|mathbf|mathit|textbf|text|operatorname|mathbb|mathcal)\{([^{}]+)\}/g,(_,m)=>m);
 }
 s=s.replace(/\\(?:dfrac|tfrac)\b/g,'\\frac');
 s=s.replace(/\\[,;:! ]/g,' ').replace(/\\(?:quad|qquad)\b/g,' ');
 s=s.replace(/\\[()[\]]|\$/g,'').replace(/\\(?:left|right)\b/g,'');
 s=s.replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/²/g,'^2').replace(/³/g,'^3').replace(/\*\*/g,'^');
 s=s.replace(/\\(?:lvert|rvert)\b/g,'|');
 s=s.replace(/\|([^|]+)\|/g,'abs($1)');
 function group(at){if(s[at]!=='{')throw Error('Thiếu nhóm {...} trong công thức LaTeX.');let depth=1,j=at+1;for(;j<s.length&&depth;j++){if(s[j]==='{')depth++;if(s[j]==='}')depth--;}if(depth)throw Error('Thiếu dấu đóng nhóm.');return [s.slice(at+1,j-1),j];}
 for(let count=0;s.includes('\\frac')&&count<24;count++){const i=s.indexOf('\\frac'),[a,j]=group(i+5),[b,k]=group(j);s=s.slice(0,i)+'(('+a+')/('+b+'))'+s.slice(k);}
 s=s.replace(/\\sqrt(?:\[[^\]]*\])?\{([^{}]+)\}/g,'sqrt($1)');
 s=s.replace(/(^|[+\-*/= (\^])\\?(sin|cos|tan|sqrt|ln|log|exp)\s*([a-zA-Z0-9α-ωΑ-Ωπ]+)/g,'$1$2($3)');
 s=s.replace(/\\([A-Za-z]+)/g,(_,name)=>{
   if(own(GREEK,name))return GREEK[name];
   if(own(FUNCTIONS,name))return name;
   if(name==='cdot'||name==='times')return '*';
   if(name==='div')return '/';
   if(name==='pi')return 'π';
   return name;
 });
 s=s.replace(/[{}]/g,c=>c==='{'?'(':')');
 s=s.replace(/[.,;]+$/,'').trim();
 if(s.length>1024)throw Error('Công thức quá dài.');return s;
}
function parse(text){
 const source=normalise(text),tokens=[];let i=0;
 while(i<source.length){if(/\s/.test(source[i])){i++;continue;}const rest=source.slice(i),num=rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
  if(num){const value=Number(num[0]);if(!finite(value))throw Error('Số vượt giới hạn ±1.000.000.');tokens.push({type:'num',value,text:num[0],id:tokens.length});i+=num[0].length;continue;}
  const word=rest.match(/^(?:sqrt|sin|cos|tan|abs|exp|log|ln|pi)/);if(word){tokens.push({type:word[0]==='pi'?'const':'fn',name:word[0],text:word[0],id:tokens.length});i+=word[0].length;continue;}
  const c=source[i++];if(/[A-Za-zα-ωΑ-Ω]/u.test(c)){tokens.push({type:c==='π'?'const':'var',name:c,text:c,id:tokens.length});continue;}
  if('+-*/^()='.includes(c)){tokens.push({type:c,text:c,id:tokens.length});continue;}throw Error('Ký tự chưa hỗ trợ: '+c);
 }
 if(tokens.length>160)throw Error('Công thức có quá nhiều ký hiệu.');let at=0,depth=0;
 function atom(){if(++depth>24)throw Error('Công thức lồng quá sâu.');let a,t=tokens[at++];if(!t)throw Error('Công thức chưa đầy đủ.');
  if(t.type==='num'||t.type==='var'||t.type==='const')a={...t};
  else if(t.type==='('){a=expr(0);if(tokens[at++]?.type!==')')throw Error('Thiếu dấu ngoặc đóng.');}
  else if(t.type==='+'||t.type==='-')a={type:'unary',op:t.type,a:expr(25)};
  else if(t.type==='fn'){if(tokens[at++]?.type!=='(')throw Error('Hàm '+t.name+' cần ngoặc, ví dụ '+t.name+'(x).');a={type:'fn',name:t.name,a:expr(0)};if(tokens[at++]?.type!==')')throw Error('Thiếu ngoặc đóng của hàm.');}
  else throw Error('Không thể đặt '+t.text+' ở vị trí này.');depth--;return a;
 }
 function expr(min){let a=atom();for(;;){const t=tokens[at],implicit=t&&['num','var','const','fn','('].includes(t.type),op=implicit?'*':t?.type,p=({'=':1,'+':10,'-':10,'*':20,'/':20,'^':30})[op];if(op==='='||p===undefined||p<min)break;if(!implicit)at++;const b=expr(op==='^'?p:p+1);a={type:'binary',op,a,b};}return a;}
 const lhs=expr(0);let rhs=null;if(tokens[at]?.type==='='){at++;rhs=expr(0);}if(at!==tokens.length)throw Error('Có ký hiệu thừa hoặc nhiều dấu bằng.');
 const vars=[...new Set(tokens.filter(t=>t.type==='var').map(t=>t.name))];return {source,tokens,lhs,rhs,vars};
}
const keyOf=n=>n.type==='num'?'n:'+n.id:n.type==='var'?'v:'+n.name:null;
function evaluate(ast,params=[],scope={}){
 const bindings=new Map(params.map(p=>[p.key,p]));
 function run(n){const p=bindings.get(keyOf(n));if(p)return own(scope,p.name)?scope[p.name]:p.value;
  if(n.type==='num')return n.value;if(n.type==='const')return Math.PI;if(n.type==='var'){if(!own(scope,n.name))throw Error('Chưa đặt giá trị cho '+n.name);return scope[n.name];}
  if(n.type==='unary')return n.op==='-'?-run(n.a):run(n.a);if(n.type==='fn')return FUNCTIONS[n.name](run(n.a));
  const a=run(n.a),b=run(n.b);return n.op==='+'?a+b:n.op==='-'?a-b:n.op==='*'?a*b:n.op==='/'?a/b:Math.abs(b)>1000?NaN:Math.pow(a,b);
 }return run(ast);
}
function available(parsed,params=[]){const bound=new Set(params.map(p=>p.key));return parsed.vars.filter(v=>!bound.has('v:'+v)).concat(params.map(p=>p.name));}
function graphSpec(scene){const p=parse(scene.expression),params=scene.params||[],g=scene.graph||{},output=p.rhs&&p.lhs.type==='var'?p.lhs.name:null;
 const vars=available(p,params).filter(v=>v!==output),variable=g.variable||(['x','t'].find(v=>vars.includes(v))||vars[0]);
 if(!variable)throw Error('Chọn một biến độc lập để vẽ.');const missing=vars.filter(v=>v!==variable&&!params.some(p=>p.name===v));if(missing.length)throw Error('Đặt giá trị cho '+missing.join(', ')+' trước khi vẽ.');
 const fn=x=>{const scope={[variable]:x};if(!p.rhs)return evaluate(p.lhs,params,scope);if(output)return evaluate(p.rhs,params,scope);return evaluate(p.lhs,params,scope)-evaluate(p.rhs,params,scope);};
 return {variable,output:output||(!p.rhs?'f':'F'),implicit:!!p.rhs&&!output,fn};
}
function clean(raw){try{
 if(!raw||raw.version!==1||typeof raw.expression!=='string')return null;const parsed=parse(raw.expression),params=[],keys=new Set(),names=new Set();
 if(!Array.isArray(raw.params)||raw.params.length>16)return null;
 for(const p of raw.params){if(!p||typeof p.key!=='string'||keys.has(p.key)||!/^[A-Za-zα-ωΑ-Ω]$/u.test(p.name)||names.has(p.name))return null;
  const token=parsed.tokens.find(t=>keyOf(t)===p.key);if(!token||token.type==='var'&&p.name!==token.name||token.type==='num'&&parsed.vars.includes(p.name))return null;
  if(![p.value,p.min,p.max,p.step].every(finite)||p.min>=p.max||p.step<=0||p.step>p.max-p.min||p.value<p.min||p.value>p.max)return null;
  params.push({key:p.key,name:p.name,value:p.value,min:p.min,max:p.max,step:p.step,unit:String(p.unit||'').slice(0,24)});keys.add(p.key);names.add(p.name);
 }
 let source=null;if(raw.source){if(typeof raw.source.src!=='string'||raw.source.src.length>3e6||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(raw.source.src))return null;
  const ink=raw.source.ink;if(!Array.isArray(ink)||ink.length>300)return null;let count=0;const safeInk=ink.map(s=>{if(!Array.isArray(s.pts)||s.pts.length>5000||!finite(s.w)||s.w<=0||s.w>120||!/^#[a-f0-9]{3,8}$/i.test(s.color))throw Error('ink');count+=s.pts.length;if(count>30000)throw Error('ink');return {color:s.color,w:s.w,pts:s.pts.map(p=>{if(!finite(p.x)||!finite(p.y)||Math.abs(p.x)>3000||Math.abs(p.y)>3000)throw Error('point');return {x:p.x,y:p.y,p:finite(p.p)?Math.max(0,Math.min(1,p.p)):.55};})};});
  const w=raw.source.w,h=raw.source.h;if(!finite(w)||!finite(h)||w<=0||h<=0||w>3000||h>3000)return null;source={src:raw.source.src,ink:safeInk,w,h};
 }
 const g=raw.graph||{},lo=finite(g.min)?g.min:-10,hi=finite(g.max)?g.max:10;if(hi<=lo||hi-lo<1e-6)return null;
 const finiteY=x=>Number.isFinite(x)&&Math.abs(x)<=1e8;
 if((g.ymin!=null&&!finiteY(g.ymin))||(g.ymax!=null&&!finiteY(g.ymax))||(finiteY(g.ymin)&&finiteY(g.ymax)&&g.ymax-g.ymin<1e-6))return null;
 return {version:1,expression:parsed.source.replace(/\^\((\d+)\)/g,'^$1'),params,graph:{enabled:g.enabled===true,autoFit:g.autoFit===true,variable:typeof g.variable==='string'&&/^[A-Za-zα-ωΑ-Ω]$/u.test(g.variable)?g.variable:'',min:lo,max:hi,ymin:finiteY(g.ymin)?g.ymin:null,ymax:finiteY(g.ymax)?g.ymax:null},source};
 }catch{return null;}}
function latex(parsed,params=[]){const bindings=new Map(params.map(p=>[p.key,p]));const symbol=n=>Object.entries(GREEK).find(([,v])=>v===n)?.[0];
 function tex(n){const b=bindings.get(keyOf(n));if(b)return symbol(b.name)?'\\'+symbol(b.name):b.name;
  if(n.type==='num')return n.text;if(n.type==='var')return symbol(n.name)?'\\'+symbol(n.name):n.name;if(n.type==='const')return '\\pi';
  if(n.type==='unary')return n.op+tex(n.a);if(n.type==='fn')return '\\'+n.name+'{'+(n.name==='sqrt'?tex(n.a):'('+tex(n.a)+')')+'}';
  if(n.op==='/')return '\\frac{'+tex(n.a)+'}{'+tex(n.b)+'}';if(n.op==='^')return '{'+tex(n.a)+'}^{'+tex(n.b)+'}';return '('+tex(n.a)+(n.op==='*'?'\\cdot ':n.op)+tex(n.b)+')';
 }return tex(parsed.lhs)+(parsed.rhs?'='+tex(parsed.rhs):'');}
return {normalise,parse,evaluate,keyOf,available,graphSpec,clean,latex,FUNCTIONS,GREEK};
});
