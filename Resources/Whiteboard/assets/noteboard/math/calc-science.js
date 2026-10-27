/* NoteBoard Calc: independent numerical routines, no eval, network or Casio firmware. */
(function(root){'use strict';
const fail=m=>{throw Error(m);},finite=x=>{if(!Number.isFinite(x))fail('Kết quả không xác định hoặc quá lớn');return Object.is(x,-0)?0:x;};
const integer=(x,min,max)=>{if(!Number.isSafeInteger(x)||x<min||x>max)fail('Cần số nguyên từ '+min+' đến '+max);return x;};
const C=(re,im=0)=>({kind:'complex',re:finite(re),im:finite(im)}),isC=x=>x?.kind==='complex';
const M=rows=>{if(!Array.isArray(rows)||rows.length<1||rows.length>4||!rows.every(r=>Array.isArray(r)&&r.length===rows[0].length&&r.length>=1&&r.length<=4&&r.every(Number.isFinite)))fail('Ma trận cần 1–4 hàng, 1–4 cột, các ô là số thực');return {kind:'matrix',rows:rows.map(r=>r.slice())};};
const V=values=>{if(!Array.isArray(values)||![2,3].includes(values.length)||!values.every(Number.isFinite))fail('Véc-tơ cần 2 hoặc 3 thành phần thực');return {kind:'vector',values:values.slice()};};
const isM=x=>x?.kind==='matrix',isV=x=>x?.kind==='vector',scalar=x=>{if(typeof x!=='number')fail('Phép tính cần số thực');return finite(x);};
const identity=n=>M(Array.from({length:integer(n,1,4)},(_,i)=>Array.from({length:n},(_,j)=>+(i===j))));
function determinant(a){
 if(!isM(a)||a.rows.length!==a.rows[0].length)fail('Cần ma trận vuông');
 const b=a.rows.map(r=>r.slice()),n=b.length;let d=1;
 for(let j=0;j<n;j++){
  let p=j;for(let i=j+1;i<n;i++)if(Math.abs(b[i][j])>Math.abs(b[p][j]))p=i;
  if(b[p][j]===0)return 0;
  if(p!==j){[b[p],b[j]]=[b[j],b[p]];d=-d;}const pivot=b[j][j];d*=pivot;
  for(let i=j+1;i<n;i++){const q=b[i][j]/pivot;for(let k=j+1;k<n;k++)b[i][k]-=q*b[j][k];}
 }return finite(d);
}
function inverse(a){
 if(!isM(a)||a.rows.length!==a.rows[0].length)fail('Cần ma trận vuông');
 const n=a.rows.length,b=a.rows.map((r,i)=>r.concat(identity(n).rows[i]));
 for(let j=0;j<n;j++){
  let p=j;for(let i=j+1;i<n;i++)if(Math.abs(b[i][j])>Math.abs(b[p][j]))p=i;
  if(b[p][j]===0)fail('Ma trận suy biến, không có nghịch đảo');
  [b[p],b[j]]=[b[j],b[p]];const q=b[j][j];for(let k=0;k<2*n;k++)b[j][k]/=q;
  for(let i=0;i<n;i++)if(i!==j){const f=b[i][j];for(let k=0;k<2*n;k++)b[i][k]-=f*b[j][k];}
 }return M(b.map(r=>r.slice(n)));
}
function mapValue(a,f){if(isM(a))return M(a.rows.map(r=>r.map(f)));if(isV(a))return V(a.values.map(f));if(isC(a))return C(f(a.re),f(a.im));return finite(f(scalar(a)));}
function binary(op,a,b){
 if(isC(a)||isC(b)){
  a=isC(a)?a:C(scalar(a));b=isC(b)?b:C(scalar(b));
  if(op==='+')return C(a.re+b.re,a.im+b.im);if(op==='-')return C(a.re-b.re,a.im-b.im);
  if(op==='*')return C(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re);
  if(op==='/'){
   if(b.re===0&&b.im===0)fail('Chia cho 0');
   if(Math.abs(b.re)>=Math.abs(b.im)){const r=b.im/b.re,d=b.re+b.im*r;return C((a.re+a.im*r)/d,(a.im-a.re*r)/d);}
   const r=b.re/b.im,d=b.im+b.re*r;return C((a.re*r+a.im)/d,(a.im*r-a.re)/d);
  }
  if(op==='^'){
   if(a.re===0&&a.im===0){if(b.im===0&&b.re>0)return C(0);fail('Lũy thừa của 0 không xác định');}
   if(b.im===0&&Number.isInteger(b.re)&&Math.abs(b.re)<1e10){let r=C(1),v=a,n=Math.abs(b.re);while(n){if(n%2)r=binary('*',r,v);n=Math.floor(n/2);if(n)v=binary('*',v,v);}return b.re<0?binary('/',C(1),r):r;}
   const l=Math.log(Math.hypot(a.re,a.im)),arg=Math.atan2(a.im,a.re),m=Math.exp(b.re*l-b.im*arg),t=b.im*l+b.re*arg;return C(m*Math.cos(t),m*Math.sin(t));
  }
 }
 if(isM(a)||isM(b)){
  if(op==='*'&&typeof a==='number')return mapValue(b,x=>x*a);
  if(op==='*'&&typeof b==='number')return mapValue(a,x=>x*b);
  if(op==='/'&&isM(a)&&typeof b==='number'&&b!==0)return mapValue(a,x=>x/b);
  if(op==='^'&&isM(a)&&typeof b==='number'){
   integer(b,-100,100);if(a.rows.length!==a.rows[0].length)fail('Lũy thừa cần ma trận vuông');
   let r=identity(a.rows.length),v=b<0?inverse(a):a;for(let i=0;i<Math.abs(b);i++)r=binary('*',r,v);return r;
  }
  if(!isM(a)||!isM(b))fail('Phép tính ma trận không hợp lệ');
  if(op==='*'){if(a.rows[0].length!==b.rows.length)fail('Số cột ma trận trái phải bằng số hàng ma trận phải');return M(a.rows.map(r=>b.rows[0].map((_,j)=>r.reduce((s,v,k)=>s+v*b.rows[k][j],0))));}
  if(['+','-'].includes(op)){if(a.rows.length!==b.rows.length||a.rows[0].length!==b.rows[0].length)fail('Hai ma trận phải cùng kích thước');return M(a.rows.map((r,i)=>r.map((v,j)=>v+(op==='+'?1:-1)*b.rows[i][j])));}
  fail('Phép tính ma trận không hỗ trợ');
 }
 if(isV(a)||isV(b)){
  if(op==='*'&&typeof a==='number')return mapValue(b,x=>x*a);
  if(op==='*'&&typeof b==='number')return mapValue(a,x=>x*b);
  if(op==='/'&&isV(a)&&typeof b==='number'&&b!==0)return mapValue(a,x=>x/b);
  if(!isV(a)||!isV(b)||a.values.length!==b.values.length)fail('Hai véc-tơ phải cùng số chiều');
  if(['+','-'].includes(op))return V(a.values.map((v,i)=>v+(op==='+'?1:-1)*b.values[i]));
  if(op==='*'){if(a.values.length!==3)fail('Tích có hướng cần véc-tơ 3 chiều');const [x,y,z]=a.values,[u,v,w]=b.values;return V([y*w-z*v,z*u-x*w,x*v-y*u]);}
  fail('Phép tính véc-tơ không hỗ trợ');
 }
 a=scalar(a);b=scalar(b);
 if(op==='+')return finite(a+b);if(op==='-')return finite(a-b);if(op==='*')return finite(a*b);if(op==='/'){if(!b)fail('Chia cho 0');return finite(a/b);}if(op==='^')return finite(a**b);
 fail('Phép tính không hỗ trợ');
}
function expression(src,{vars={},angle='DEG',real=Math.log}={}){
 src=String(src).replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/[−–]/g,'-').replace(/√/g,'sqrt');
 if(src.length>2000)fail('Biểu thức quá dài');
 const tokens=[];let pos=0;
 while(pos<src.length){const s=src.slice(pos),m=/^(\s+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|π|[()+\-*/^,!∠])/u.exec(s);if(!m)fail('Kí hiệu không hợp lệ: '+s[0]);pos+=m[0].length;if(!/^\s/.test(m[0]))tokens.push(m[0]);}
 let i=0,depth=0;const take=()=>tokens[i++],peek=()=>tokens[i],unit=angle==='DEG'?Math.PI/180:angle==='GRAD'?Math.PI/200:1;
 function call(name,args){
  name=name.toLowerCase();const a=args[0];
  const arity=n=>{if(args.length!==n)fail(name+' cần '+n+' đối số');};
  if(['dot','angle','cross'].includes(name)){arity(2);const b=args[1];if(!isV(a)||!isV(b)||a.values.length!==b.values.length)fail('Cần hai véc-tơ cùng chiều');const d=a.values.reduce((s,v,j)=>s+v*b.values[j],0);if(name==='dot')return finite(d);if(name==='cross')return binary('*',a,b);const n=Math.hypot(...a.values)*Math.hypot(...b.values);if(!n)fail('Véc-tơ không có hướng');return Math.acos(Math.max(-1,Math.min(1,d/n)))/unit;}
  arity(1);
  if(name==='det')return determinant(a);if(name==='identity')return identity(scalar(a));if(name==='inverse')return inverse(a);
  if(name==='trn'){if(!isM(a))fail('Trn cần ma trận');return M(a.rows[0].map((_,j)=>a.rows.map(r=>r[j])));}
  if(name==='abs'){if(isC(a))return Math.hypot(a.re,a.im);if(isV(a))return Math.hypot(...a.values);return mapValue(a,Math.abs);}
  if(name==='unitv'){if(!isV(a))fail('UnitV cần véc-tơ');const n=Math.hypot(...a.values);if(!n)fail('Véc-tơ 0 không có véc-tơ đơn vị');return mapValue(a,x=>x/n);}
  if(['conjg','arg','rep','imp'].includes(name)){const z=isC(a)?a:C(scalar(a));if(name==='conjg')return C(z.re,-z.im);if(name==='rep')return z.re;if(name==='imp')return z.im;if(!z.re&&!z.im)fail('Arg(0) không xác định');return Math.atan2(z.im,z.re)/unit;}
  if(name==='sqrt'){if(isC(a)||a<0)return binary('^',isC(a)?a:C(a),.5);return Math.sqrt(scalar(a));}
  if(isC(a))fail('Hàm này chỉ nhận số thực');
  return finite(real(name+'('+scalar(a)+')'));
 }
 function parse(min=0){
  if(++depth>64)fail('Biểu thức lồng quá sâu');let a,t=take();
  if(t==='+'||t==='-'){a=parse(25);if(t==='-')a=mapValue(a,x=>-x);}
  else if(t==='('){a=parse();if(take()!==')')fail('Thiếu dấu )');}
  else if(t!==undefined&&/^(?:\d|\.)/.test(t))a=finite(Number(t));
  else if(t==='i')a=C(0,1);
  else if(t==='π'||t==='pi')a=Math.PI;
  else if(t==='e')a=Math.E;
  else if(t&&Object.hasOwn(vars,t))a=vars[t];
  else if(t&&peek()==='('){take();const args=[];if(peek()!==')'){do{args.push(parse());if(peek()!==',')break;take();}while(true);}if(take()!==')')fail('Thiếu dấu )');a=call(t,args);}
  else fail('Chưa định nghĩa '+(t||'giá trị'));
  while(i<tokens.length){
   if(peek()==='!'){take();let n=integer(scalar(a),0,170);a=1;for(let j=2;j<=n;j++)a*=j;continue;}
   let op=peek(),implicit=false;if(op===')'||op===',')break;
   if(!['+','-','*','/','^','∠'].includes(op)){op='*';implicit=true;}
   const prec=op==='^'?30:op==='∠'?15:op==='*'||op==='/'?20:10;if(prec<min)break;if(!implicit)take();
   const b=parse(op==='^'?prec:prec+1);a=op==='∠'?C(scalar(a)*Math.cos(scalar(b)*unit),scalar(a)*Math.sin(b*unit)):binary(op,a,b);
  }depth--;return a;
 }
 if(!tokens.length)fail('Nhập biểu thức');const out=parse();if(i!==tokens.length)fail('Thừa kí hiệu');return out;
}
/* BASE-N: signed 32-bit integers in all four bases, per fx-580VN X handbook. */
function baseN(src,base=10){
 if(![2,8,10,16].includes(base))fail('Cơ số không hợp lệ');
 const bit=32,limit=1n<<BigInt(bit-1),mask=(1n<<BigInt(bit))-1n;
 src=String(src).trim();if(src.length>1000)fail('Biểu thức quá dài');const ts=src.match(/(?:\band\b|\bor\b|\bxor\b|\bxnor\b|\bnot\b|\bneg\b)|h[0-9A-Fa-f]+|d[0-9]+|b[01]+|o[0-7]+|[0-9A-Fa-f]+|[()+\-*/]/g)||[];
 if(ts.join('').toLowerCase()!==src.replace(/\s/g,'').toLowerCase())fail('Chỉ nhập số nguyên và phép toán BASE-N');let i=0,depth=0;
 const checked=x=>{if(x< -limit||x>=limit)fail('Tràn phạm vi số nguyên '+bit+' bit');return x;},signed=x=>BigInt.asIntN(bit,x);
 function parse(min=0){if(++depth>64)fail('Biểu thức quá sâu');let t=ts[i++],a;
  if(['-','+','not','neg'].includes((t||'').toLowerCase())){a=parse(40);a=t.toLowerCase()==='not'?signed(~a):t==='+'?a:checked(-a);}
  else if(t==='('){a=parse();if(ts[i++]!==')')fail('Thiếu dấu )');}
  else {if(!t)fail('Thiếu số');let radix=base;if(/^[dhbo]/.test(t)){radix={d:10,h:16,b:2,o:8}[t[0]];t=t.slice(1);}const chars='0123456789ABCDEF';a=0n;for(const c of t.toUpperCase()){const d=chars.indexOf(c);if(d<0||d>=radix)fail('Chữ số không hợp lệ trong cơ số '+radix);a=a*BigInt(radix)+BigInt(d);}if(radix!==10){if(a>mask)fail('Tràn phạm vi');a=signed(a);}else checked(a);}
  for(;;){const op=(ts[i]||'').toLowerCase(),p={or:5,xor:6,xnor:6,and:7,'+':10,'-':10,'*':20,'/':20}[op];if(!p||p<min)break;i++;const b=parse(p+1);
   if(op==='+')a=checked(a+b);else if(op==='-')a=checked(a-b);else if(op==='*')a=checked(a*b);else if(op==='/'){if(!b)fail('Chia cho 0');a=checked(a/b);}else if(op==='and')a=signed(a&b);else if(op==='or')a=signed(a|b);else if(op==='xor')a=signed(a^b);else a=signed(~(a^b));
  }depth--;return a;
 }const value=parse();if(i!==ts.length)fail('Lỗi cú pháp BASE-N');return {value,dec:value.toString(),hex:BigInt.asUintN(32,value).toString(16).toUpperCase(),bin:BigInt.asUintN(32,value).toString(2),oct:BigInt.asUintN(32,value).toString(8)};
}
function statistics(rows,model='single'){
 if(!rows.length||rows.length>1000)fail('Nhập 1–1000 dòng dữ liệu');const paired=model!=='single';
 const data=rows.map(r=>{const x=finite(r[0]),y=paired?finite(r[1]):0,w=r[paired?2:1]??1;integer(w,1,1000000);return {x,y,w};}),n=data.reduce((s,r)=>s+r.w,0);
 const sum=f=>finite(data.reduce((s,r)=>s+r.w*f(r),0));
 const mx=sum(r=>r.x)/n,my=sum(r=>r.y)/n,vx=sum(r=>(r.x-mx)**2),vy=sum(r=>(r.y-my)**2);
 const sorted=data.slice().sort((a,b)=>a.x-b.x),at=k=>{let j=0;for(const r of sorted){j+=r.w;if(k<j)return r.x;}return sorted.at(-1).x;},median=(lo,hi)=>(at(Math.floor((lo+hi)/2))+at(Math.ceil((lo+hi)/2)))/2;
 const out={n,sumX:sum(r=>r.x),sumX2:sum(r=>r.x*r.x),meanX:mx,varianceX:vx/n,sigmaX:Math.sqrt(vx/n),sX:n>1?Math.sqrt(vx/(n-1)):null,minX:sorted[0].x,Q1:n===1?at(0):median(0,Math.floor(n/2)-1),median:median(0,n-1),Q3:n===1?at(0):median(Math.ceil(n/2),n-1),maxX:sorted.at(-1).x};
 if(!paired)return out;
 Object.assign(out,{meanY:my,sumY:sum(r=>r.y),sumY2:sum(r=>r.y*r.y),sumXY:sum(r=>r.x*r.y),sigmaY:Math.sqrt(vy/n),sY:n>1?Math.sqrt(vy/(n-1)):null});
 const transformed=data.map(({x,y,w})=>{if(['log','power'].includes(model)&&x<=0)fail('Hồi quy này cần x > 0');if(['exp','ab','power'].includes(model)&&y<=0)fail('Hồi quy này cần y > 0');if(model==='inverse'&&x===0)fail('Hồi quy nghịch đảo cần x khác 0');return {x:['log','power'].includes(model)?Math.log(x):model==='inverse'?1/x:x,y:['exp','ab','power'].includes(model)?Math.log(y):y,w};});
 if(model==='quadratic'){
  // Weighted modified Gram–Schmidt on centered/scaled x avoids squaring the condition number.
  const scale=Math.max(...data.map(r=>Math.abs(r.x-mx)));if(!scale)fail('Dữ liệu không đủ để hồi quy');
  const cols=[0,1,2].map(p=>data.map(r=>Math.sqrt(r.w)*((r.x-mx)/scale)**p)),target=data.map(r=>Math.sqrt(r.w)*r.y),q=[],R=Array.from({length:3},()=>[0,0,0]);
  for(let j=0;j<3;j++){const v=cols[j].slice();for(let k=0;k<j;k++){R[k][j]=v.reduce((s,x,i)=>s+x*q[k][i],0);v.forEach((x,i)=>v[i]-=R[k][j]*q[k][i]);}R[j][j]=Math.hypot(...v);if(R[j][j]<1e-12*Math.sqrt(n))fail('Cần ít nhất 3 giá trị x độc lập');q.push(v.map(x=>x/R[j][j]));}
  const t=q.map(c=>c.reduce((s,x,i)=>s+x*target[i],0)),c=[0,0,0];for(let j=2;j>=0;j--)c[j]=(t[j]-c.slice(j+1).reduce((s,v,k)=>s+R[j][j+k+1]*v,0))/R[j][j];
  out.a=c[0]-c[1]*mx/scale+c[2]*(mx/scale)**2;out.b=c[1]/scale-2*c[2]*mx/scale**2;out.c=c[2]/scale**2;
 }else{
  if(!['linear','log','exp','ab','power','inverse'].includes(model))fail('Kiểu hồi quy không hợp lệ');
  const tx=transformed.reduce((s,r)=>s+r.w*r.x,0)/n,ty=transformed.reduce((s,r)=>s+r.w*r.y,0)/n;
  let xx=0,xy=0,yy=0;for(const r of transformed){xx+=r.w*(r.x-tx)**2;xy+=r.w*(r.x-tx)*(r.y-ty);yy+=r.w*(r.y-ty)**2;}if(!xx)fail('Các giá trị x không được trùng hết');
  out.b=xy/xx;out.a=ty-out.b*tx;out.r=yy?Math.max(-1,Math.min(1,xy/Math.sqrt(xx*yy))):null;
  if(['exp','ab','power'].includes(model))out.a=Math.exp(out.a);if(model==='ab')out.b=Math.exp(out.b);
 }for(const v of Object.values(out))if(v!==null)finite(v);return out;
}
/* Lanczos log-gamma; convergent incomplete gamma/beta for tails without factorial overflow. */
function logGamma(z){const p=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);z--;let x=.99999999999980993;for(let i=0;i<p.length;i++)x+=p[i]/(z+i+1);const t=z+7.5;return .9189385332046727+(z+.5)*Math.log(t)-t+Math.log(x);}
const prob=x=>Math.max(0,Math.min(1,x));
function gammaQ(a,x){
 if(x===0)return 1;if(!Number.isFinite(x))return 0;const factor=Math.exp(a*Math.log(x)-x-logGamma(a));
 if(x<a+1){let t=1/a,s=t;for(let n=1;n<10000;n++){t*=x/(a+n);s+=t;if(Math.abs(t)<Math.abs(s)*2e-15)return prob(1-s*factor);}fail('Phân phối chưa hội tụ');}
 let b=x+1-a,c=1e300,d=1/b,h=d;for(let n=1;n<10000;n++){const an=-n*(n-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const delta=d*c;h*=delta;if(Math.abs(delta-1)<2e-15)return prob(h*factor);}fail('Phân phối chưa hội tụ');
}
function betaI(a,b,x){
 if(x<=0)return 0;if(x>=1)return 1;
 const cf=(a,b,x)=>{let c=1,d=1-(a+b)*x/(a+1);if(Math.abs(d)<1e-300)d=1e-300;d=1/d;let h=d;for(let m=1;m<10000;m++){let delta;for(const aa of [m*(b-m)*x/((a+2*m-1)*(a+2*m)),-(a+m)*(a+b+m)*x/((a+2*m)*(a+2*m+1))]){d=1+aa*d;if(Math.abs(d)<1e-300)d=1e-300;c=1+aa/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;delta=d*c;h*=delta;}if(Math.abs(delta-1)<3e-15)return h;}fail('Phân phối chưa hội tụ');};
 const bt=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log1p(-x));
 return prob(x<(a+1)/(a+b+2)?bt*cf(a,b,x)/a:1-bt*cf(b,a,1-x)/b);
}
function normalCDF(z){if(z===0)return .5;const tail=.5*gammaQ(.5,z*z/2);return z<0?tail:1-tail;}
function distribution(type,p){
 const n=p.n,k=p.x,mu=p.mu??0,sigma=p.sigma??1;
 if(type.startsWith('normal')||type==='inverseNormal'){
  finite(mu);finite(sigma);if(sigma<=0)fail('σ phải lớn hơn 0');
  if(type==='normalPD'){finite(k);const z=(k-mu)/sigma;return Math.exp(-z*z/2)/(sigma*Math.sqrt(2*Math.PI));}
  if(type==='normalCD'){const l=finite(p.lower),u=finite(p.upper);if(l>u)fail('Cận dưới phải ≤ cận trên');const a=(l-mu)/sigma,b=(u-mu)/sigma;return prob(a>=0?normalCDF(-a)-normalCDF(-b):normalCDF(b)-normalCDF(a));}
  const area=finite(p.area);if(area<=0||area>=1)fail('Xác suất cần trong (0; 1); hai đầu cho nghiệm vô hạn');let lo=-40,hi=40;for(let i=0;i<140;i++){const mid=(lo+hi)/2;if(normalCDF(mid)<area)lo=mid;else hi=mid;}return finite(mu+sigma*((lo+hi)/2));
 }
 integer(k,0,1000000);
 if(type==='binomialPD'||type==='binomialCD'){
  integer(n,0,1000000);const pr=finite(p.p);if(pr<0||pr>1)fail('p cần từ 0 đến 1');
  if(type==='binomialPD'){if(k>n)return 0;if(pr===0)return +(k===0);if(pr===1)return +(k===n);return prob(Math.exp(logGamma(n+1)-logGamma(k+1)-logGamma(n-k+1)+k*Math.log(pr)+(n-k)*Math.log1p(-pr)));}
  if(k>=n)return 1;if(pr===0)return 1;if(pr===1)return 0;return betaI(n-k,k+1,1-pr);
 }
 const l=finite(p.lambda);if(l<0||l>1000000)fail('λ cần từ 0 đến 1 000 000');if(l===0)return type==='poissonPD'?+(k===0):1;
 if(type==='poissonPD')return prob(Math.exp(-l+k*Math.log(l)-logGamma(k+1)));if(type==='poissonCD')return gammaQ(k+1,l);fail('Phân phối không hợp lệ');
}
function inequality(coeff,op,roots){
 if(coeff.length<3||coeff.length>5||!coeff.every(Number.isFinite)||!coeff[0])fail('Cần hệ số bậc 2–4, hệ số đầu khác 0');if(!['<','<=','>','>='].includes(op))fail('Dấu bất phương trình không hợp lệ');
 const rr=roots(coeff).filter(r=>Math.abs(r[1])<1e-12).map(r=>r[0]).sort((a,b)=>a-b),points=rr.filter((x,i)=>!i||Math.abs(x-rr[i-1])>1e-10*Math.max(1,Math.abs(x))),bound=[-Infinity,...points,Infinity],included=op.includes('='),positive=op.startsWith('>'),pieces=[];
 for(let i=0;i<bound.length-1;i++){const l=bound[i],u=bound[i+1],x=!Number.isFinite(l)?u-Math.max(1,Math.abs(u)):!Number.isFinite(u)?l+Math.max(1,Math.abs(l)):(l+u)/2;const test=Number.isFinite(x)?x:0,v=coeff.reduce((s,c)=>s*test+c,0);if((v>0)===positive&&v!==0)pieces.push({l,u,lc:included&&Number.isFinite(l),uc:included&&Number.isFinite(u)});}
 if(included)for(const x of points)if(!pieces.some(p=>p.l===x||p.u===x))pieces.push({l:x,u:x,lc:true,uc:true});
 pieces.sort((a,b)=>a.l-b.l);const out=[];for(const p of pieces){const last=out.at(-1);if(last&&last.u===p.l&&(last.uc||p.lc)){last.u=p.u;last.uc=p.uc;}else out.push({...p});}return out;
}
function ratio(values){if(values.length!==4||values.filter(x=>x===null).length!==1)fail('Nhập đúng một ẩn x trong a:b = c:d');values.filter(x=>x!==null).forEach(finite);const i=values.indexOf(null),[a,b,c,d]=values;let x;if(i===0){if(!d)fail('Mẫu tỉ lệ không được bằng 0');x=b*c/d;}else if(i===1){if(!c)fail('Tỉ lệ không có nghiệm duy nhất');x=a*d/c;}else if(i===2){if(!b)fail('Mẫu tỉ lệ không được bằng 0');x=a*d/b;}else{if(!a)fail('Tỉ lệ không có nghiệm duy nhất');x=b*c/a;}const full=values.map(v=>v===null?x:v);if(!full[1]||!full[3])fail('Mẫu tỉ lệ không được bằng 0');return finite(x);}
function verify(src,evaluate){const parts=String(src).split(/(<=|>=|!=|≤|≥|≠|=|<|>)/);if(parts.length<3||parts.length%2===0)fail('Nhập phép so sánh, ví dụ 1/2 < 2/3 ≤ 1');const numbers=parts.filter((_,i)=>i%2===0).map(evaluate);return numbers.slice(1).every((b,i)=>{const a=numbers[i],tol=8*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b)),equal=Math.abs(a-b)<=tol;return {'=':equal,'!=':!equal,'≠':!equal,'<':a<b&&!equal,'>':a>b&&!equal,'<=':a<b||equal,'≤':a<b||equal,'>=':a>b||equal,'≥':a>b||equal}[parts[2*i+1]];});}
function dms(deg,min=0,sec=0){finite(deg);finite(min);finite(sec);if(min<0||min>=60||sec<0||sec>=60)fail('Phút và giây cần trong [0; 60)');return (deg<0||Object.is(deg,-0)?-1:1)*(Math.abs(deg)+min/60+sec/3600);}
function toDMS(x){finite(x);let total=Math.round(Math.abs(x)*3600*1e6)/1e6,d=Math.floor(total/3600);total-=d*3600;const m=Math.floor(total/60),s=+(total-m*60).toFixed(6);return (x<0?'−':'')+d+'° '+m+'′ '+s+'″';}
function factors(x){integer(x,2,9999999999);const out=[];for(let p=2;p*p<=x;p+=p===2?1:2){let n=0;while(x%p===0){x/=p;n++;}if(n)out.push([p,n]);}if(x>1)out.push([x,1]);return out;}
const units={
 length:{m:1,cm:.01,mm:.001,km:1000,in:.0254,ft:.3048,yd:.9144,mile:1609.344,nmile:1852},
 area:{'m²':1,'cm²':.0001,ha:10000,'ft²':.09290304,acre:4046.8564224},
 volume:{'m³':1,L:.001,mL:.000001,'gal(US)':.003785411784,'gal(UK)':.00454609,'in³':.000016387064,'ft³':.028316846592},
 mass:{kg:1,g:.001,mg:.000001,lb:.45359237,oz:.028349523125},
 speed:{'m/s':1,'km/h':1/3.6,mph:.44704,knot:1852/3600},
 pressure:{Pa:1,kPa:1000,bar:100000,atm:101325,mmHg:133.322387415,psi:6894.757293168},
 energy:{J:1,kJ:1000,'cal(IT)':4.1868,'cal(th)':4.184,kWh:3600000,eV:1.602176634e-19},
 power:{W:1,kW:1000,'hp(UK)':745.699871582},
 temperature:{'°C':1,'°F':1,K:1},angle:{'°':Math.PI/180,rad:1,grad:Math.PI/200}
};
function convert(x,group,from,to){finite(x);const g=units[group];if(!g||!Object.hasOwn(g,from)||!Object.hasOwn(g,to))fail('Đơn vị không cùng nhóm');if(group==='temperature'){const c=from==='K'?x-273.15:from==='°F'?(x-32)*5/9:x;return finite(to==='K'?c+273.15:to==='°F'?c*9/5+32:c);}return finite(x*g[from]/g[to]);}
const api={C,M,V,expression,binary,determinant,inverse,identity,baseN,statistics,distribution,inequality,ratio,verify,dms,toDMS,factors,units,convert};
if(typeof module==='object'&&module.exports)module.exports=api;else root.NBCalcScience=api;
})(typeof globalThis!=='undefined'?globalThis:this);
