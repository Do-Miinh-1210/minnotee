/* NoteBoard Ink: native orthographic 3D, convex solids, occlusion and sections.
   No GeoGebra, network, eval or external geometry service. World coordinates
   are retained; the PNG is a portable preview for export and older readers. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NBSpatial=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const kinds={cube:'Lập phương',box:'Hình hộp chữ nhật',pyramid:'Chóp tứ giác',tetra:'Chóp tam giác',prism3:'Lăng trụ tam giác',prism6:'Lăng trụ lục giác',cylinder:'Hình trụ',cone:'Hình nón',sphere:'Mặt cầu'};
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,k)=>a.map(v=>v*k),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a),unit=a=>mul(a,1/(norm(a)||1)),mix=(a,b,t)=>add(a,mul(sub(b,a),t));
const clamp=(x,a,b,d)=>Number.isFinite(x)?Math.max(a,Math.min(b,x)):d;
const point=p=>Array.isArray(p)&&p.length===3&&p.every(x=>Number.isFinite(x)&&Math.abs(x)<=30);
const label=s=>String(s||'').replace(/[^\p{L}\p{N}'′″_.-]/gu,'').slice(0,8);
// Face identifiers belong to the solid, never to its current screen projection.
function faceIds(kind){
 if(kind==='sphere')return ['surface'];
 if(kind==='cone')return ['bottom','side'];
 if(kind==='cylinder')return ['bottom','top','side'];
 return Array.from({length:({cube:6,box:6,pyramid:5,tetra:4,prism3:5,prism6:8})[kind]||0},(_,i)=>'face:'+i);
}
function clean(input){
 if(!input||!Object.hasOwn(kinds,input.kind))return null;
 const topView=input.topView!==false,c=input.camera||{},s={version:1,topView,kind:input.kind,w:clamp(input.w,.3,5,2),h:clamp(input.h,.3,5,2),d:clamp(input.d,.3,5,2),
 camera:{yaw:clamp(c.yaw,-180,180,input.kind==='pyramid'?45:35),pitch:clamp(c.pitch,topView?8:-80,80,24),zoom:clamp(c.zoom,.55,2,1)},
 hidden:input.hidden!==false,labels:input.labels!==false,color:/^#[0-9a-f]{6}$/i.test(input.color)?input.color:'#111111',
 width:clamp(input.width,1,5,3),names:Array.isArray(input.names)?input.names.slice(0,70).map(label):[],segments:[],sections:[],faceFills:[]};
 const ids=faceIds(s.kind);
 if(Array.isArray(input.faceFills))for(const fill of input.faceFills.slice(0,16)){
  if(!fill||!ids.includes(fill.id)||typeof fill.color!=='string'||!/^#[0-9a-f]{6}$/i.test(fill.color))continue;
  const value={id:fill.id,color:fill.color,opacity:clamp(fill.opacity,0,1,.3)},at=s.faceFills.findIndex(f=>f.id===fill.id);
  if(at<0)s.faceFills.push(value);else s.faceFills[at]=value;
 }
 if(Array.isArray(input.segments))for(const e of input.segments.slice(0,80)){
  if(!e||!point(e.a)||!point(e.b))return null;s.segments.push({a:e.a.slice(),b:e.b.slice(),seq:clamp(e.seq,0,1e6,s.segments.length+1)});
 }
 if(Array.isArray(input.sections))for(const cut of input.sections.slice(0,12)){
  if(!cut||!Array.isArray(cut.points)||cut.points.length!==3||!cut.points.every(point))return null;
  s.sections.push({points:cut.points.map(p=>p.slice()),seq:clamp(cut.seq,0,1e6,s.segments.length+s.sections.length+1)});
 }
 return s;
}
function create(kind='cube'){return clean({kind});}
function model(scene){
 const s=clean(scene);if(!s)throw Error('Mô hình 3D không hợp lệ.');
 const V=[],F=[],names=[];let curved=false;
 const W=s.w/2,H=s.h/2,D=s.d/2;
 if(s.kind==='sphere')return {scene:s,vertices:[[W,0,0],[-W,0,0],[0,W,0],[0,-W,0],[0,0,W],[0,0,-W]],faces:[],edges:[],names:[],curved:true,sphere:true};
 if(s.kind==='cube'||s.kind==='box'){
  const hh=s.kind==='cube'?W:H,dd=s.kind==='cube'?W:D;
  V.push([-W,-hh,-dd],[W,-hh,-dd],[W,-hh,dd],[-W,-hh,dd],[-W,hh,-dd],[W,hh,-dd],[W,hh,dd],[-W,hh,dd]);
  F.push([0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]);names.push('A','B','C','D',"A'","B'","C'","D'");
 }else{
  const n=s.kind==='tetra'||s.kind==='prism3'?3:s.kind==='prism6'?6:s.kind==='pyramid'?4:64;
  curved=n===64;
  for(let i=0;i<n;i++){const t=2*Math.PI*i/n-Math.PI/2;V.push([W*Math.cos(t),-H,(curved?W:D)*Math.sin(t)]);names.push(String.fromCharCode(65+i));}
  F.push(Array.from({length:n},(_,i)=>i));
  if(['pyramid','tetra','cone'].includes(s.kind)){
   V.push([0,H,0]);names.push('S');for(let i=0;i<n;i++)F.push([i,(i+1)%n,n]);
  }else{
   for(let i=0;i<n;i++){V.push(add(V[i],[0,s.h,0]));names.push(String.fromCharCode(65+i)+"'");}
   F.push(Array.from({length:n},(_,i)=>i+n));for(let i=0;i<n;i++)F.push([i,(i+1)%n,(i+1)%n+n,i+n]);
  }
 }
 const center=mul(V.reduce(add,[0,0,0]),1/V.length);
 const faces=F.map((indices,i)=>{
  let normal=unit(cross(sub(V[indices[1]],V[indices[0]]),sub(V[indices[2]],V[indices[0]])));
  const fc=mul(indices.map(i=>V[i]).reduce(add,[0,0,0]),1/indices.length);
  if(dot(normal,sub(fc,center))<0){indices=indices.slice().reverse();normal=mul(normal,-1);}
  const id=curved?(i===0?'bottom':s.kind==='cylinder'&&i===1?'top':'side'):'face:'+i;
  return {id,indices,normal,d:dot(normal,V[indices[0]])};
 });
 const map=new Map();faces.forEach((face,fi)=>face.indices.forEach((a,i)=>{
  const b=face.indices[(i+1)%face.indices.length],key=[a,b].sort((a,b)=>a-b).join(':');
  if(!map.has(key))map.set(key,{a:Math.min(a,b),b:Math.max(a,b),faces:[]});map.get(key).faces.push(fi);
 }));
 return {scene:s,vertices:V,faces,edges:[...map.values()],names:names.map((v,i)=>s.names[i]||v),curved};
}
function camera(scene){
 const y=scene.camera.yaw*Math.PI/180,p=scene.camera.pitch*Math.PI/180;
 return {right:[Math.cos(y),0,-Math.sin(y)],up:[-Math.sin(y)*Math.sin(p),Math.cos(p),-Math.cos(y)*Math.sin(p)],view:[Math.sin(y)*Math.cos(p),Math.sin(p),Math.cos(y)*Math.cos(p)]};
}
function prepare(scene,width=960,height=720){
 const m=model(scene),cam=camera(m.scene),xy=p=>[dot(p,cam.right),-dot(p,cam.up)],raw=m.vertices.map(xy);
 const xs=raw.map(p=>p[0]),ys=raw.map(p=>p[1]),min=m.sphere?[-m.scene.w/2,-m.scene.w/2]:[Math.min(...xs),Math.min(...ys)],max=m.sphere?[m.scene.w/2,m.scene.w/2]:[Math.max(...xs),Math.max(...ys)];
 const scale=Math.min((width-110)/(max[0]-min[0]||1),(height-110)/(max[1]-min[1]||1))*m.scene.camera.zoom;
 const cx=(max[0]+min[0])/2,cy=(max[1]+min[1])/2;
 const project=p=>{const q=xy(p);return [width/2+(q[0]-cx)*scale,height/2+(q[1]-cy)*scale];};
 const unproject=(x,y)=>add(mul(cam.right,(x-width/2)/scale+cx),mul(cam.up,-((y-height/2)/scale+cy)));
 const front=m.faces.filter(f=>dot(f.normal,cam.view)>1e-8);
 function inside(p,f){return f.indices.every((a,i)=>dot(cross(sub(m.vertices[f.indices[(i+1)%f.indices.length]],m.vertices[a]),sub(p,m.vertices[a])),f.normal)>=-1e-6);}
 function surface(x,y){
  const base=unproject(x,y);let best=null;
  if(m.sphere){const square=(m.scene.w/2)**2-dot(base,base);return square>=-1e-8?{p:add(base,mul(cam.view,Math.sqrt(Math.max(0,square)))),depth:Math.sqrt(Math.max(0,square)),faceId:'surface'}:null;}
  if(m.curved){
   const radius=m.scene.w/2,H=m.scene.h/2,v=cam.view,k=radius/m.scene.h;
   const put=(t,faceId='side')=>{const p=add(base,mul(v,t));if(p[1]>=-H-1e-7&&p[1]<=H+1e-7&&(!best||t>best.depth))best={p,depth:t,faceId};};
   let A=v[0]*v[0]+v[2]*v[2],B=2*(base[0]*v[0]+base[2]*v[2]),C=base[0]*base[0]+base[2]*base[2]-radius*radius;
   if(m.scene.kind==='cone'){A-=k*k*v[1]*v[1];B+=2*k*k*(H-base[1])*v[1];C=base[0]*base[0]+base[2]*base[2]-k*k*(H-base[1])**2;}
   if(Math.abs(A)<1e-10){if(Math.abs(B)>1e-10)put(-C/B);}else{const D=B*B-4*A*C;if(D>=-1e-8){const d=Math.sqrt(Math.max(0,D));put((-B-d)/(2*A));put((-B+d)/(2*A));}}
   if(Math.abs(v[1])>1e-9)for(const y of (m.scene.kind==='cone'?[-H]:[-H,H])){const t=(y-base[1])/v[1],q=add(base,mul(v,t));if(q[0]*q[0]+q[2]*q[2]<=radius*radius+1e-7)put(t,y<0?'bottom':'top');}
   return best;
  }
  for(const f of front){const t=(f.d-dot(f.normal,base))/dot(f.normal,cam.view),p=add(base,mul(cam.view,t));if(inside(p,f)&&(!best||t>best.depth))best={p,depth:t,face:f,faceId:f.id};}
  return best;
 }
 function hidden(p){const q=project(p),hit=surface(...q);return !!hit&&hit.depth-dot(p,cam.view)>1e-5;}
 if(m.sphere){
  for(const [u,v] of [[[1,0,0],[0,0,1]],[[1,0,0],[0,1,0]],[cam.right,cam.up]]){
   const start=m.vertices.length;
   for(let i=0;i<96;i++){const t=i/96*2*Math.PI;m.vertices.push(mul(add(mul(u,Math.cos(t)),mul(v,Math.sin(t))),m.scene.w/2));}
   for(let i=0;i<96;i++)m.edges.push({a:start+i,b:start+(i+1)%96,faces:[],silhouette:u===cam.right});
  }
 }
 if(m.curved&&!m.sphere){
  const phi=Math.atan2(cam.view[2],cam.view[0]),radius=m.scene.w/2,H=m.scene.h/2;
  const q=m.scene.kind==='cone'?-radius*cam.view[1]/(m.scene.h*Math.hypot(cam.view[0],cam.view[2])):0;
  if(Math.abs(q)<=1)for(const t of [phi+Math.acos(q),phi-Math.acos(q)]){
   const start=m.vertices.length;m.vertices.push([radius*Math.cos(t),-H,radius*Math.sin(t)],m.scene.kind==='cone'?[0,H,0]:[radius*Math.cos(t),H,radius*Math.sin(t)]);
   m.edges.push({a:start,b:start+1,faces:[],silhouette:true});
  }
 }
 const projected=m.vertices.map(project);
 const regions=new Map();
 for(const f of front){if(!regions.has(f.id))regions.set(f.id,[]);regions.get(f.id).push(f.indices.map(i=>projected[i]));}
 if(m.sphere)regions.set('surface',[Array.from({length:128},(_,i)=>project(add(mul(cam.right,Math.cos(i*Math.PI/64)*m.scene.w/2),mul(cam.up,Math.sin(i*Math.PI/64)*m.scene.w/2))))]);
 function faceName(id){
  const names={bottom:'Đáy dưới',top:'Đáy trên',side:'Mặt xung quanh',surface:'Mặt cầu'};
  if(Object.hasOwn(names,id))return names[id];
  const f=m.faces.find(f=>f.id===id);if(!f)return '';
  const a=f.indices,at=a.indexOf(Math.min(...a)),forward=a.map((_,i)=>a[(at+i)%a.length]),backward=a.map((_,i)=>a[(at-i+a.length)%a.length]);
  return 'Mặt '+(forward[1]<backward[1]?forward:backward).map(i=>m.names[i]).join('–');
 }
 // Unlike construction-point snapping, a face pick always hits the nearest
 // visible surface, even when the pointer is close to an edge or vertex.
 function pickFace(x,y){const hit=surface(x,y);return hit?{...hit,id:hit.faceId,kind:'face',name:faceName(hit.faceId)}:null;}
 // For curved objects, draw cap rims and silhouette generators, not mesh facets.
 const edges=m.edges.filter(e=>e.silhouette||m.sphere||!m.curved||e.faces.some(i=>Math.abs(m.faces[i].normal[1])>.99));
 function pick(x,y,tolerance=16){
  let vertex=-1,dist=tolerance;
  projected.forEach((q,i)=>{const d=Math.hypot(q[0]-x,q[1]-y);if(d<dist){dist=d;vertex=i;}});
  if(vertex>=0)return {p:m.vertices[vertex].slice(),kind:'vertex',name:m.curved?'Điểm trên khối':m.names[vertex]};
  let nearest=null;
  for(const e of edges){const a=projected[e.a],b=projected[e.b],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1,0),d=Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
   if(d<tolerance&&(!nearest||d<nearest.dist)){const p=mix(m.vertices[e.a],m.vertices[e.b],t);nearest={p,kind:'edge',name:'Điểm trên cạnh',dist:d};}
  }
  return nearest||((surface(x,y)||{}).p?{p:surface(x,y).p,kind:'face',name:'Điểm trên mặt'}:null);
 }
 return {...m,...cam,project,projected,scale,surface,hidden,pick,pickFace,faceName,facePolygons:id=>regions.get(id)||[],edges,width,height};
}
function section(scene,points){
 const m=model(scene),normal=unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));
 if(norm(cross(sub(points[1],points[0]),sub(points[2],points[0])))<1e-7)throw Error('Ba điểm đang thẳng hàng. Chọn lại mặt phẳng cắt.');
 const d=dot(normal,points[0]),found=[];
 if(m.sphere){
  const r=m.scene.w/2;if(Math.abs(d)>=r-1e-7)throw Error('Mặt phẳng này không tạo thiết diện có diện tích trong khối.');
  const center=mul(normal,d),radius=Math.sqrt(r*r-d*d),u=unit(cross(normal,Math.abs(normal[0])<.9?[1,0,0]:[0,1,0])),v=cross(normal,u);
  return Array.from({length:96},(_,i)=>add(center,mul(add(mul(u,Math.cos(i/96*2*Math.PI)),mul(v,Math.sin(i/96*2*Math.PI))),radius)));
 }
 const push=p=>{if(!found.some(q=>norm(sub(p,q))<1e-6))found.push(p);};
 if(m.curved){
  const radius=m.scene.w/2,H=m.scene.h/2,amp=Math.hypot(normal[0],normal[2]),phi=Math.atan2(normal[2],normal[0]),angles=Array.from({length:128},(_,i)=>i/128*2*Math.PI);
  if(amp>1e-9)for(const y of (m.scene.kind==='cone'?[-H]:[-H,H])){const q=(d-normal[1]*y)/(radius*amp);if(Math.abs(q)<=1){angles.push(phi+Math.acos(q),phi-Math.acos(q));}}
  for(const t of angles){
   const x=radius*Math.cos(t),z=radius*Math.sin(t);
   if(m.scene.kind==='cylinder'){
    if(Math.abs(normal[1])>1e-9){const y=(d-normal[0]*x-normal[2]*z)/normal[1];if(y>=-H-1e-7&&y<=H+1e-7)push([x,Math.max(-H,Math.min(H,y)),z]);}
    else if(Math.abs(normal[0]*x+normal[2]*z-d)<1e-7){push([x,-H,z]);push([x,H,z]);}
   }else{
    const numerator=d-normal[1]*H,denominator=normal[0]*x+normal[2]*z-normal[1]*m.scene.h;
    if(Math.abs(denominator)>1e-9){const k=numerator/denominator;if(k>=-1e-7&&k<=1+1e-7)push([x*k,H-m.scene.h*k,z*k]);}
    else if(Math.abs(numerator)<1e-7){push([x,-H,z]);push([0,H,0]);}
   }
  }
 }else for(const e of m.edges){const a=m.vertices[e.a],b=m.vertices[e.b],da=dot(normal,a)-d,db=dot(normal,b)-d;
  if(Math.abs(da)<1e-7)push(a);if(Math.abs(db)<1e-7)push(b);if(da*db<-1e-12)push(mix(a,b,da/(da-db)));
 }
 if(found.length<3)throw Error('Mặt phẳng này không tạo thiết diện có diện tích trong khối.');
 const center=mul(found.reduce(add,[0,0,0]),1/found.length),u=unit(sub(found[0],center)),v=cross(normal,u);
 return found.sort((a,b)=>Math.atan2(dot(sub(a,center),v),dot(sub(a,center),u))-Math.atan2(dot(sub(b,center),v),dot(sub(b,center),u)));
}
function pieces(view,a,b){
 const aa=view.project(a),bb=view.project(b),n=Math.max(2,Math.min(240,Math.ceil(Math.hypot(bb[0]-aa[0],bb[1]-aa[1])/5))),out=[];
 let start=0,hidden=view.hidden(mix(a,b,.5/n));
 for(let i=1;i<n;i++){const next=view.hidden(mix(a,b,(i+.5)/n));if(next!==hidden){out.push({a:mix(a,b,start/n),b:mix(a,b,i/n),hidden});start=i;hidden=next;}}
 out.push({a:mix(a,b,start/n),b:b.slice(),hidden});return out;
}
function draw(canvas,scene,options={}){
 const w=canvas.width,h=canvas.height,view=prepare(scene,w,h),c=canvas.getContext('2d'),s=view.scene;
 c.clearRect(0,0,w,h);c.lineCap='round';c.lineJoin='round';c.lineWidth=s.width*w/720;
 if(options.background){c.fillStyle=options.background;c.fillRect(0,0,w,h);}
 const fillFace=(id,color,opacity)=>{
  const polygons=view.facePolygons(id);if(!polygons.length||opacity<=0)return;
  c.beginPath();for(const poly of polygons){poly.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();}
  c.fillStyle=`rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},${opacity})`;c.fill();
 };
 for(const f of s.faceFills)fillFace(f.id,f.color,f.opacity);
 // A boundary highlight preserves the actual paint color. Shared mesh edges
 // cancel, so selecting a curved side never reveals its rendering triangles.
 const highlight=id=>{
  const boundary=new Map();for(const poly of view.facePolygons(id))poly.forEach((a,i)=>{
   const b=poly[(i+1)%poly.length],key=[a.join(','),b.join(',')].sort().join('|');
   if(boundary.has(key))boundary.delete(key);else boundary.set(key,[a,b]);
  });
  if(!boundary.size)return;c.beginPath();for(const [a,b] of boundary.values()){c.moveTo(...a);c.lineTo(...b);}
  c.setLineDash([]);c.strokeStyle='#168dcb';c.lineWidth=(s.width+4)*w/720;c.stroke();
 };
 // Selection feedback is live only; exported PNGs contain the actual colors.
 if(options.selectedFace)highlight(options.selectedFace);
 if(options.hoverFace&&options.hoverFace!==options.selectedFace)highlight(options.hoverFace);
 // All constructions are world-space and share the same visibility calculation.
 const segments=view.edges.map(e=>({a:view.vertices[e.a],b:view.vertices[e.b],color:s.color,original:true,hidden:e.silhouette?false:e.faces.length?!e.faces.some(i=>dot(view.faces[i].normal,view.view)>=-1e-8):view.hidden(mul(unit(mix(view.vertices[e.a],view.vertices[e.b],.5)),s.w/2))}));
 for(const seg of s.segments)segments.push({...seg,color:'#145da0'});
 for(const cut of s.sections){
  let polygon;try{polygon=section(s,cut.points);}catch(_){continue;}
  const visible=polygon.map(view.project);c.beginPath();visible.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle='rgba(208,95,30,.13)';c.fill();
  polygon.forEach((a,i)=>segments.push({a,b:polygon[(i+1)%polygon.length],color:'#b44b13',section:true}));
 }
 const lines=segments.flatMap(seg=>seg.original?[seg]:pieces(view,seg.a,seg.b).map(p=>({...p,color:seg.color,section:seg.section})));
 for(const isHidden of [true,false])for(const line of lines){
  if(line.hidden!==isHidden||line.hidden&&!s.hidden)continue;
  c.strokeStyle=line.color;c.lineWidth=(line.section?s.width*1.3:s.width)*w/720;c.setLineDash(line.hidden?[9*w/720,6*w/720]:[]);
  c.beginPath();c.moveTo(...view.project(line.a));c.lineTo(...view.project(line.b));c.stroke();
 }
 c.setLineDash([]);c.font=`italic ${Math.round(28*w/720)}px Georgia,serif`;c.textAlign='center';c.textBaseline='middle';
 const mx=options.mirror?.x??1,my=options.mirror?.y??1;
 const needsCounter=(mx!==1||my!==1)&&typeof c.save==='function'&&typeof c.scale==='function';
 if(s.labels&&!view.curved)view.projected.forEach((p,i)=>{
  const dx=p[0]-w/2,dy=p[1]-h/2,n=Math.hypot(dx,dy)||1,x=p[0]+dx/n*18*w/720,y=p[1]+dy/n*18*w/720;
  c.lineWidth=5*w/720;c.strokeStyle=options.background||'#ffffff';
  if(needsCounter){
   c.save();c.translate(x,y);c.scale(mx,my);
   c.strokeText(view.names[i],0,0);c.fillStyle=s.color;c.fillText(view.names[i],0,0);
   c.restore();
  }else{
   c.strokeText(view.names[i],x,y);c.fillStyle=s.color;c.fillText(view.names[i],x,y);
  }
 });
 for(const [i,p] of (options.pending||[]).entries()){
  const q=view.project(p);c.fillStyle='#c34f16';c.beginPath();c.arc(...q,6*w/720,0,Math.PI*2);c.fill();
  const qx=q[0]+15*mx,qy=q[1]-15*my;
  if(needsCounter){
   c.save();c.translate(qx,qy);c.scale(mx,my);
   c.fillText(['P','Q','R'][i],0,0);
   c.restore();
  }else{
   c.fillText(['P','Q','R'][i],q[0]+15,q[1]-15);
  }
 }
 return view;
}
return {kinds,create,clean,faceIds,model,camera,prepare,section,pieces,draw,add,sub,mul,dot,cross,norm,mix};
});
