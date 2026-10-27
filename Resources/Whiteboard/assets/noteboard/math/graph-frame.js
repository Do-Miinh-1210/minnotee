/* Graph viewport geometry, independent of rendering. Edge crop keeps the same
   world-to-board scale and anchor, including on a rotated picture. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NBGraphFrame=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
function clean(v){
 if(!v||typeof v!=='object')return null;
 const keys=['xmin','xmax','ymin','ymax','width','height'],o={};
 for(const k of keys){if(typeof v[k]!=='number'||!Number.isFinite(v[k]))return null;o[k]=v[k];}
 if(o.width<32||o.height<32||o.width>4096||o.height>4096||o.xmin>=o.xmax||o.ymin>=o.ymax||Math.max(...keys.slice(0,4).map(k=>Math.abs(o[k])))>1e12)return null;
 if(o.xmax-o.xmin<1e-10||o.ymax-o.ymin<1e-10)return null;
 const a=v.aspect??o.width/o.height;if(typeof a!=='number'||!Number.isFinite(a)||a<.01||a>100)return null;o.aspect=a;return o;
}
function fromXML(xml){
 const views=String(xml).match(/<euclidianView\b[^>]*>[\s\S]*?<\/euclidianView>/g)||[],view=views.find(s=>!/<viewNumber\b/.test(s)||/<viewNumber\b[^>]*viewNo="1"/.test(s));if(!view)return null;
 const tag=n=>(view.match(new RegExp('<'+n+'\\b[^>]*>'))||[''])[0],attr=(s,k)=>{const m=s.match(new RegExp('\\b'+k+'="([^"]*)"'));return m?Number(m[1]):NaN;},size=tag('size'),cs=tag('coordSystem'),w=attr(size,'width'),h=attr(size,'height'),x=attr(cs,'xZero'),y=attr(cs,'yZero'),sx=attr(cs,'scale'),sy=attr(cs,'yscale')||sx;
 return clean({xmin:-x/sx,xmax:(w-x)/sx,ymin:(y-h)/sy,ymax:y/sy,width:w,height:h});
}
function read(api){
 try{const s=api.getViewProperties(1),v=typeof s==='string'?JSON.parse(s):s,o=clean({xmin:v.xMin,xmax:v.xMin+v.invXscale*v.width,ymin:v.yMin,ymax:v.yMin+v.invYscale*v.height,width:v.width,height:v.height});if(o)return o;}catch(_){}
 try{return fromXML(api.getXML());}catch(_){return null;}
}
const rotate=(x,y,a)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});
function handles(b){return [['left',-b.w/2,0],['right',b.w/2,0],['top',0,-b.h/2],['bottom',0,b.h/2]].map(([edge,x,y])=>{const p=rotate(x,y,b.rot||0);return {edge,x:b.x+b.w/2+p.x,y:b.y+b.h/2+p.y};});}
function resizeBox(b,edge,delta,view){
 if(!['left','right','top','bottom'].includes(edge)||![b.x,b.y,b.w,b.h,delta.x,delta.y].every(Number.isFinite))throw Error('Khung đồ thị không hợp lệ.');
 const d=rotate(delta.x,delta.y,-(b.rot||0)),maxW=Math.min(1500,4094*b.w/(view?.width||800)),maxH=Math.min(1800,4094*b.h/(view?.height||560));
 let l=0,t=0,w=b.w,h=b.h;const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 if(edge==='left'){w=clamp(b.w-d.x,Math.min(120,b.w),Math.max(b.w,maxW));l=b.w-w;}
 if(edge==='right')w=clamp(b.w+d.x,Math.min(120,b.w),Math.max(b.w,maxW));
 if(edge==='top'){h=clamp(b.h-d.y,Math.min(90,b.h),Math.max(b.h,maxH));t=b.h-h;}
 if(edge==='bottom')h=clamp(b.h+d.y,Math.min(90,b.h),Math.max(b.h,maxH));
 const offset=rotate(l+(w-b.w)/2,t+(h-b.h)/2,b.rot||0),box={x:b.x+b.w/2+offset.x-w/2,y:b.y+b.h/2+offset.y-h/2,w,h,rot:b.rot||0};
 return {box,l,t,changed:Math.abs(w-b.w)+Math.abs(h-b.h)>1};
}
function resize(view,b,edge,delta){
 const v=clean(view);if(!v)throw Error('Không đọc được vùng tọa độ đồ thị.');const result=resizeBox(b,edge,delta,v),{box,l,t}=result,sx=(v.xmax-v.xmin)/b.w,sy=(v.ymax-v.ymin)/b.h;
 const next=clean({xmin:v.xmin+l*sx,xmax:v.xmin+(l+box.w)*sx,ymax:v.ymax-t*sy,ymin:v.ymax-(t+box.h)*sy,width:Math.round(v.width*box.w/b.w),height:Math.round(v.height*box.h/b.h),aspect:box.w/box.h});
 if(!next)throw Error('Khung quá lớn hoặc quá nhỏ. Hãy kéo cạnh một khoảng ngắn hơn.');return {...result,view:next};
}
return {clean,fromXML,read,rotate,handles,resizeBox,resize};
});
