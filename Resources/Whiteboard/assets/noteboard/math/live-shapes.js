/* Editable geometry is derived from the rendered points, so old projects and
   rotated/scaled/cloned shapes keep working without a second coordinate model. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NBLiveShapes=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const xy=p=>({x:p.x,y:p.y}),valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<1e7&&Math.abs(p.y)<1e7;
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y}),sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y}),mul=(a,k)=>({x:a.x*k,y:a.y*k}),mid=(a,b)=>mul(add(a,b),.5);
function controls(s){
 if(!s?.flat||s.erase||s.hl||!s.pts?.length)return [];
 const p=s.pts,k=s.kind;let points=[];
 if(k==='rect'&&p.length===5)points=p.slice(0,4);
 else if(k==='tri'&&p.length===4)points=p.slice(0,3);
 else if(['line','gSegment'].includes(k)&&p.length>=2)points=valid(s.a)&&valid(s.b)?[s.a,s.b]:p.slice(0,2);
 else if(k==='ray')points=valid(s.a)&&valid(s.b)?[s.a,s.b]:p.slice(0,2);
 else if(k==='arrow'&&p.length>=7)points=valid(s.a)&&valid(s.b)?[s.a,s.b]:[p[0],p[2]];
 else if(k==='doubleArrow'&&p.length>=12)points=valid(s.a)&&valid(s.b)?[s.a,s.b]:[p[7],p[2]];
 else if(k==='load2d'||k==='load3d')points=valid(s.a)&&valid(s.b)?[s.a,s.b]:[p[0],p[p.length-1]];
 else if(k==='gLine'&&valid(s.a)&&valid(s.b))points=[s.a,s.b];
 else if(k==='gLine'&&p.length===36)points=[mid(p[2],p[10]),mid(p[19],p[27])];
 else if(k==='gPoint'&&valid(s.a))points=[s.a];
 else if(k==='gPoint'&&p.length===17)points=[mid(p[0],p[8])];
 else if(k==='gPoint'&&p.length>0)points=[p[0]];
 else if(['ellipse','circ'].includes(k)&&p.length===57){
  const c=mid(p[0],p[28]);points=[c,p[0],p[14]];
 }
 else if(valid(s.a)&&valid(s.b))points=[s.a,s.b];
 return points.filter(valid).map((p,index)=>({...xy(p),index}));
}
function bounds(s){let lo=Infinity,hi=-Infinity;for(const p of s.pts){lo=Math.min(lo,p.y);hi=Math.max(hi,p.y);}s.y0=lo;s.y1=hi;}
function move(s,index,q,generate,opts){
 const h=controls(s);if(!valid(q)||!h[index])return false;
 const k=s.kind;
 if(k==='rect'||k==='tri'){
  const n=k==='rect'?4:3,v=s.pts.slice(0,n).map(xy);
  const free=s.freeVertices||opts?.free;
  if(k==='rect'&&!free){
   // Fix the opposite corner and one edge direction; constrain the other perpendicular.
   const opposite=(index+2)%4,next=(index+1)%4,prev=(index+3)%4,o=v[opposite];
   const u=sub(v[next],o),w={x:-u.y,y:u.x},d=sub(q,o),det=u.x*w.y-u.y*w.x;
   if(Math.abs(det)<1e-6)return false;
   const a=(d.x*w.y-d.y*w.x)/det,b=(u.x*d.y-u.y*d.x)/det;
   if(Math.abs(a)<.005||Math.abs(b)<.005)return false;
   v[next]=add(o,mul(u,a));v[prev]=add(o,mul(w,b));v[index]=xy(q);
  }else{v[index]=xy(q);if(opts?.free)s.freeVertices=true;}
  s.pts=v.concat([v[0]]).map(p=>({...p,p:.62}));
 }else if(k==='ellipse'||k==='circ'){
  const c=h[0],u=sub(h[1],c),v=sub(h[2],c),d=sub(q,c);let center=c,a=u,b=v;
  if(index===0)center=xy(q);
  else if(index===1){if(Math.hypot(d.x,d.y)<2)return false;a=d;const len=Math.hypot(v.x,v.y),side=Math.sign(u.x*v.y-u.y*v.x)||1,l=Math.hypot(a.x,a.y);b={x:-a.y/l*len*side,y:a.x/l*len*side};}
  else{const len=Math.hypot(u.x,u.y),side=Math.sign(u.x*d.y-u.y*d.x)||1,r=Math.abs((u.x*d.y-u.y*d.x)/len);if(r<2)return false;b={x:-u.y/len*r*side,y:u.x/len*r*side};}
  s.pts=Array.from({length:57},(_,i)=>{const t=i/56*Math.PI*2;return {x:center.x+a.x*Math.cos(t)+b.x*Math.sin(t),y:center.y+a.y*Math.cos(t)+b.y*Math.sin(t),p:.62};});
 }else{
  if(typeof generate!=='function')return false;
  const a=index===0?xy(q):xy(h[0]),b=h.length===1?xy(q):index===1?xy(q):xy(h[1]);
  if(h.length>1&&Math.hypot(b.x-a.x,b.y-a.y)<2)return false;
  s.a=a;s.b=b;s.pts=generate(k,a,b,s);
 }
 bounds(s);return true;
}
function lockRectangle(s){
 const h=controls(s);if(s.kind!=='rect'||h.length!==4)return false;
 const u=sub(h[1],h[0]),v=sub(h[3],h[0]),length=Math.hypot(u.x,u.y);if(length<2)return false;
 const height=(u.x*v.y-u.y*v.x)/length;if(Math.abs(height)<2)return false;
 const side={x:-u.y/length*height,y:u.x/length*height};
 s.pts=[h[0],h[1],add(h[1],side),add(h[0],side),h[0]].map(p=>({...xy(p),p:.62}));s.freeVertices=false;bounds(s);return true;
}
return {controls,move,lockRectangle};
});
