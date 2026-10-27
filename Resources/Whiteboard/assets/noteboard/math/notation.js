/* Exact labels for variation tables. Rational/quadratic forms are checked with
   BigInt arithmetic; a numerical resemblance alone never removes the ≈ sign. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NBVariationNotation=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const abs=n=>n<0n?-n:n;
function gcd(a,b){a=abs(a);b=abs(b);while(b){const r=a%b;a=b;b=r;}return a||1n;}
function Q(n,d=1n){if(!d)throw Error('zero denominator');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);n/=g;d/=g;if(n.toString().length+d.toString().length>180)throw Error('exact label too large');return {n,d};}
const Z=Q(0n),ONE=Q(1n),qadd=(a,b)=>Q(a.n*b.d+b.n*a.d,a.d*b.d),qneg=a=>Q(-a.n,a.d),qsub=(a,b)=>qadd(a,qneg(b)),qmul=(a,b)=>Q(a.n*b.n,a.d*b.d),qdiv=(a,b)=>Q(a.n*b.d,a.d*b.n),qnum=a=>Number(a.n)/Number(a.d);
function decimal(s){const m=String(s).match(/^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);if(!m)throw Error('not decimal');const digits=(m[2]||'0')+(m[3]||''),e=+(m[4]||0)-(m[3]||'').length;if(Math.abs(e)>80||digits.length>80)throw Error('large decimal');return Q(BigInt((m[1]==='-'?'-':'')+digits)*(e>0?10n**BigInt(e):1n),e<0?10n**BigInt(-e):1n);}
const R=a=>({a,b:Z,d:0n}), isR=s=>!s.b.n, num=s=>qnum(s.a)+qnum(s.b)*Math.sqrt(Number(s.d));
function S(a,b=Z,d=0n){return !b.n||!d?R(a):{a,b,d};}
function common(u,v){if(!isR(u)&&!isR(v)&&u.d!==v.d)throw Error('different radicals');return u.d||v.d;}
const sadd=(u,v)=>S(qadd(u.a,v.a),qadd(u.b,v.b),common(u,v));
const sneg=u=>S(qneg(u.a),qneg(u.b),u.d), ssub=(u,v)=>sadd(u,sneg(v));
function smul(u,v){const d=common(u,v);return S(qadd(qmul(u.a,v.a),qmul(qmul(u.b,v.b),Q(d))),qadd(qmul(u.a,v.b),qmul(u.b,v.a)),d);}
function sdiv(u,v){const den=qsub(qmul(v.a,v.a),qmul(qmul(v.b,v.b),Q(v.d))),conj=S(v.a,qneg(v.b),v.d),p=smul(u,conj);return S(qdiv(p.a,den),qdiv(p.b,den),p.d);}
function spow(u,k){if(!Number.isInteger(k)||Math.abs(k)>16)throw Error('power');if(k<0)return spow(sdiv(R(ONE),u),-k);let v=R(ONE);while(k--)v=smul(v,u);return v;}
function sqrtQ(q){
 if(q.n<0n)throw Error('negative root');if(!q.n)return R(Z);
 let n=q.n*q.d,near=BigInt(Math.round(Math.sqrt(Number(n))));if(near*near===n)return R(Q(near,q.d));
 if(n>1000000n)throw Error('radicand too large');let factor=1n;
 for(let p=2n;p*p<=n;p++){while(n%(p*p)===0n){n/=p*p;factor*=p;}}
 return n===1n?R(Q(factor,q.d)):S(Z,Q(factor,q.d),n);
}
function ev(a,x,sub){
 if(sub?.has(a))return sub.get(a);
 if(a.t==='x')return x;if(a.t==='num'){if(a.constant)throw Error('transcendental');return R(decimal(a.literal??a.v));}
 if(a.t==='neg')return sneg(ev(a.a,x,sub));
 if(a.t==='fn'){
  const v=ev(a.a,x,sub);if(a.f==='abs')return num(v)<0?sneg(v):v;
  if(a.f==='sqrt'&&isR(v))return sqrtQ(v.a);
  if(isR(v)&&v.a.n===0n&&['sin','tan','exp','cos'].includes(a.f))return R(['exp','cos'].includes(a.f)?ONE:Z);
  if(isR(v)&&v.a.n===v.a.d&&['ln','log'].includes(a.f))return R(Z);
  throw Error('non-algebraic value');
 }
 const u=ev(a.a,x,sub),v=ev(a.b,x,sub);
 if(a.t==='+')return sadd(u,v);if(a.t==='-')return ssub(u,v);if(a.t==='*')return smul(u,v);if(a.t==='/')return sdiv(u,v);if(a.t==='^'&&isR(v))return spow(u,qnum(v.a));throw Error('unsupported exact value');
}
const trim=p=>{while(p.length>1&&!p.at(-1).n)p.pop();if(p.length>33)throw Error('degree');return p;};
const padd=(p,q,k=1)=>trim(Array.from({length:Math.max(p.length,q.length)},(_,i)=>qadd(p[i]||Z,k<0?qneg(q[i]||Z):q[i]||Z)));
function pmul(p,q){const r=Array(p.length+q.length-1).fill(Z);p.forEach((a,i)=>q.forEach((b,j)=>r[i+j]=qadd(r[i+j],qmul(a,b))));return trim(r);}
function ppow(p,k){let r=[ONE];while(k--)r=pmul(r,p);return r;}
const pd=p=>p.length===1?[Z]:p.slice(1).map((a,i)=>qmul(a,Q(BigInt(i+1))));
const peval=(p,x)=>p.reduceRight((s,a)=>sadd(smul(s,x),R(a)),R(Z));
function poly(a){
 if(a.t==='num')return {p:[ev(a,R(Z)).a],q:[ONE],bans:[]};if(a.t==='x')return {p:[Z,ONE],q:[ONE],bans:[]};
 if(a.t==='neg'){const r=poly(a.a);return {...r,p:r.p.map(qneg)};}
 if(a.t==='^'){const n=qnum(ev(a.b,R(Z)).a),r=poly(a.a);if(!Number.isInteger(n)||Math.abs(n)>12)throw Error('power');return n<0?{p:ppow(r.q,-n),q:ppow(r.p,-n),bans:[...r.bans,r.p]}:{p:ppow(r.p,n),q:ppow(r.q,n),bans:r.bans};}
 const u=poly(a.a),v=poly(a.b),bans=[...u.bans,...v.bans];
 if(a.t==='+'||a.t==='-')return {p:padd(pmul(u.p,v.q),pmul(v.p,u.q),a.t==='-'?-1:1),q:pmul(u.q,v.q),bans};
 if(a.t==='*')return {p:pmul(u.p,v.p),q:pmul(u.q,v.q),bans};if(a.t==='/')return {p:pmul(u.p,v.q),q:pmul(u.q,v.p),bans:[...bans,v.p]};throw Error('non rational');
}
const safe=fn=>{try{return fn();}catch(_){return null;}};
const close=(a,b)=>Math.abs(a-b)<=2e-10*Math.max(1,Math.abs(a),Math.abs(b));
function candidate(x){
 if(!Number.isFinite(x))return null;const sign=x<0?-1n:1n;let z=Math.abs(x),p0=0,p1=1,q0=1,q1=0;
 for(let i=0;i<24;i++){const a=Math.floor(z),p=a*p1+p0,q=a*q1+q0;if(q>10000||!Number.isSafeInteger(p))break;if(Math.abs(Math.abs(x)-p/q)<=3e-13*Math.max(1,Math.abs(x)))return Q(sign*BigInt(p),BigInt(q));const f=z-a;if(!f)break;[p0,p1,q0,q1]=[p1,p,q1,q];z=1/f;}return null;
}
const isZero=s=>!s.a.n&&!s.b.n;
function divideRoot(p,r){const out=Array(p.length-1);out[out.length-1]=p.at(-1);for(let i=out.length-2;i>=0;i--)out[i]=qadd(p[i+1],qmul(r,out[i+1]));return trim(out);}
function exactRoots(polys,xs){
 const found=new Map();
 for(const original of polys){
  let p=original.slice();if(p.length<2)continue;
  for(const x of xs){const q=candidate(x);if(!q||!isZero(peval(p,R(q))))continue;found.set(x,R(q));while(p.length>1&&isZero(peval(p,R(q))))p=divideRoot(p,q);}
  if(p.length===2){const s=R(qdiv(qneg(p[0]),p[1]));for(const x of xs)if(close(num(s),x))found.set(x,s);}
  if(p.length===3){const [c,b,a]=p,disc=qsub(qmul(b,b),qmul(Q(4n),qmul(a,c))),rt=safe(()=>sqrtQ(disc));if(!rt)continue;
   for(const signed of [rt,sneg(rt)]){const s=sdiv(sadd(R(qneg(b)),signed),R(qmul(Q(2n),a)));for(const x of xs)if(close(num(s),x)&&isZero(peval(original,s)))found.set(x,s);}
  }
 }
 return found;
}
function qtex(q){const sign=q.n<0n?'-':'',n=abs(q.n);return sign+(q.d===1n?String(n):'\\frac{'+n+'}{'+q.d+'}');}
function pairTex(c,r,symbol){
 if(!r.n)return qtex(c);
 const d=c.d*r.d/gcd(c.d,r.d),a=c.n*(d/c.d),b=r.n*(d/r.d),root=(abs(b)===1n?'':String(abs(b)))+symbol;
 let body=a?String(a)+(b<0n?'-':'+')+root:(b<0n?'-':'')+root;
 if(d===1n)return body;if(!a&&b<0n)return '-\\frac{'+body.slice(1)+'}{'+d+'}';return '\\frac{'+body+'}{'+d+'}';
}
const stex=s=>pairTex(s.a,s.b,'\\sqrt{'+s.d+'}');
// Linear expressions in pi are kept symbolic, including shifted trig arguments.
function piForm(a,x){
 if(a.t==='x'){if(!x)throw Error('variable');return x;}
 if(a.t==='num')return a.constant==='pi'?{c:Z,p:ONE}:{c:ev(a,R(Z)).a,p:Z};
 if(a.t==='neg'){const v=piForm(a.a,x);return {c:qneg(v.c),p:qneg(v.p)};}
 const u=piForm(a.a,x),v=piForm(a.b,x);
 if(a.t==='+'||a.t==='-')return {c:a.t==='+'?qadd(u.c,v.c):qsub(u.c,v.c),p:a.t==='+'?qadd(u.p,v.p):qsub(u.p,v.p)};
 if(a.t==='*'&&(!u.p.n||!v.p.n))return {c:qmul(u.c,v.c),p:qadd(qmul(u.p,v.c),qmul(u.c,v.p))};
 if(a.t==='/'&&!v.p.n)return {c:qdiv(u.c,v.c),p:qdiv(u.p,v.c)};throw Error('nonlinear pi');
}
function sinPi(q){
 const phase=qmul(q,Q(12n));if(phase.d!==1n)return null;const k=Number((phase.n%24n+24n)%24n);
 if(k===0||k===12)return R(Z);if(k===6||k===18)return R(Q(k===6?1n:-1n));
 if([2,10,14,22].includes(k))return R(Q(k<12?1n:-1n,2n));
 if([3,9,15,21,4,8,16,20].includes(k)){const d=[3,9,15,21].includes(k)?2n:3n;return S(Z,Q(k<12?1n:-1n,2n),d);}return null;
}
function trigAt(a,form){const p=piForm(a.a,form);if(p.c.n)return null;const sin=sinPi(p.p),cos=sinPi(qadd(p.p,Q(1n,2n)));return a.f==='sin'?sin:a.f==='cos'?cos:sin&&cos?sdiv(sin,cos):null;}
function fallback(x){if(x===null)return '';if(x===Infinity)return '+\\infty';if(x===-Infinity)return '-\\infty';if(!Number.isFinite(x))return '\\nexists';return '\\approx '+Number(x.toPrecision(7));}
function limitExact(r,x){
 if(r.p.every(a=>!a.n))return R(Z);
 if(x===Infinity||x===-Infinity)return r.p.length<r.q.length?R(Z):r.p.length===r.q.length?R(qdiv(r.p.at(-1),r.q.at(-1))):null;
 let p=r.p,q=r.q;while(p.length>1&&q.length>1&&isZero(peval(p,x))&&isZero(peval(q,x))){p=pd(p);q=pd(q);}return sdiv(peval(p,x),peval(q,x));
}
function annotate(model,ast,options,parse){
 const xs=model.marks.map(m=>m.x).filter(Number.isFinite),all=[];let trigNode;
 function collect(a){const r=safe(()=>poly(a));if(r){all.push(r.q,...r.bans,padd(pmul(pd(r.p),r.q),pmul(r.p,pd(r.q)),-1));return;}if(a.t==='fn'){const inner=safe(()=>poly(a.a));if(inner)all.push(inner.p,inner.q,...inner.bans,padd(pmul(pd(inner.p),inner.q),pmul(inner.p,pd(inner.q)),-1));}else{if(a.a)collect(a.a);if(a.b)collect(a.b);}}
 function findTrig(a){if(a.t==='fn'&&['sin','cos','tan'].includes(a.f))trigNode=a;else{if(a.a)findTrig(a.a);if(a.b)findTrig(a.b);}}findTrig(ast);
 const exact=safe(()=>{collect(ast);return exactRoots(all,xs);})||new Map(),rp=safe(()=>poly(ast));
 for(const [i,m] of model.marks.entries()){
  let x=exact.get(m.x),xtex,piX;
  if(i===0||i===model.marks.length-1){const bound=i===0?options.lo:options.hi;if(bound!==undefined&&String(bound).trim()){const c=safe(()=>ev(parse(bound),R(Z)));if(c&&close(num(c),m.x))x=c;}}
  if(trigNode&&Number.isFinite(m.x))piX=safe(()=>{
   if(i===0||i===model.marks.length-1){const b=i===0?options.lo:options.hi;return b!==undefined&&String(b).trim()?piForm(parse(b)):{c:Z,p:Q(i===0?-2n:2n)};}
   const r=poly(trigNode.a);if(r.p.length>2||r.q.length!==1)throw Error('nonlinear');const a=qdiv(r.p[1]||Z,r.q[0]),b=qdiv(r.p[0],r.q[0]),phase=qnum(a)*m.x+qnum(b),start=trigNode.f==='cos'?0:.5,k=Math.round(phase/Math.PI-start);return {c:qdiv(qneg(b),a),p:qdiv(Q(BigInt(2*k+(start===.5?1:0)),2n),a)};
  });
  if(x)xtex=stex(x);else if(piX)xtex=pairTex(piX.c,piX.p,'\\pi');
  const trigValue=piX?safe(()=>trigAt(trigNode,piX)):null;
  const valueTex=(value,limit=false)=>{if(value===null||!Number.isFinite(value))return fallback(value);let s=x?safe(()=>ev(ast,x)):null;if(!s&&trigValue)s=safe(()=>ev(ast,R(Z),new Map([[trigNode,trigValue]])));if(!s&&limit&&rp)s=safe(()=>limitExact(rp,Number.isFinite(m.x)?x:m.x));if(s&&close(num(s),value))return stex(s);return fallback(value);};
  m.tex={x:xtex||fallback(m.x),value:valueTex(m.value),left:valueTex(m.left,true),right:valueTex(m.right,true)};
 }
 return model;
}
/* A small SVG typesetter for the generated TeX subset. It uses native vector
   paths/text, so stacked fractions and radicals also survive canvas PNG export. */
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function layout(tex,size=22){
 let i=0;
 const plain=s=>({w:[...s].reduce((w,c)=>w+(c==='1'?.48:/[0-9]/.test(c)?.55:/[+−≈∞]/.test(c)?.72:c===' '? .2:.58)*size,0),h:size,svg:'<text x="0" y="'+(.77*size)+'" font-family="Cambria, Georgia, serif" font-size="'+size+'" font-weight="900">'+esc(s)+'</text>'});
 const join=parts=>{let w=0;const h=Math.max(size,...parts.map(p=>p.h)),svg=parts.map(p=>{const s='<g transform="translate('+w+','+((h-p.h)/2)+')">'+p.svg+'</g>';w+=p.w;return s;}).join('');return {w,h,svg};};
 function group(){if(tex[i]==='{'){i++;return seq('}');}return plain(tex[i++]||'');}
 function seq(stop){const parts=[];let run='';const flush=()=>{if(run){parts.push(plain(run));run='';}};while(i<tex.length){if(tex[i]===stop){i++;break;}if(tex[i]!=='\\'){run+=tex[i++]==='-'?'−':tex[i-1];continue;}flush();i++;const m=tex.slice(i).match(/^[a-z]+/),cmd=m?m[0]:tex[i++]||'';if(m)i+=cmd.length;
   if(cmd==='frac'){const a=group(),b=group(),w=Math.max(a.w,b.w)+10,h=a.h+b.h+10;parts.push({w,h,svg:'<g transform="translate('+((w-a.w)/2)+',0)">'+a.svg+'</g><path d="M1 '+(a.h+5)+'H'+(w-1)+'" fill="none" stroke="currentColor" stroke-width="2"/><g transform="translate('+((w-b.w)/2)+','+(a.h+10)+')">'+b.svg+'</g>'});}
   else if(cmd==='sqrt'){const a=group(),pad=size*.7,w=a.w+pad+3;parts.push({w,h:a.h+5,svg:'<path d="M1 '+(a.h*.58)+'L'+(pad*.3)+' '+(a.h*.48)+'L'+(pad*.55)+' '+(a.h+2)+'L'+pad+' 2H'+w+'" fill="none" stroke="currentColor" stroke-width="2"/><g transform="translate('+(pad+2)+',5)">'+a.svg+'</g>'});}
   else parts.push(plain(({pi:'π',infty:'∞',approx:'≈',nexists:'∄'})[cmd]||cmd));
  }flush();return join(parts);}
 return seq();
}
function svgLabel(tex,x,y,size=22,anchor='middle',attrs='',maxWidth=Infinity){
 const b=layout(tex,size),scale=Math.min(1,maxWidth/Math.max(1,b.w)),width=b.w*scale,height=b.h*scale,dx=anchor==='start'?0:anchor==='end'?-width:-width/2;
 return '<g '+attrs+' data-latex="'+esc(tex)+'" color="#000000" fill="currentColor" transform="translate('+(x+dx)+','+(y-height/2)+')"><g transform="scale('+scale+')">'+b.svg+'</g></g>';
}
return {annotate,svgLabel,layout};
});
