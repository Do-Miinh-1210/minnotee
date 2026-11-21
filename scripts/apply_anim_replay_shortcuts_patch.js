const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let code = fs.readFileSync(targetFile, 'utf8');

function replaceOnce(label, target, replacement) {
  const idx = code.indexOf(target);
  if (idx === -1) throw new Error(`Anchor not found for [${label}]`);
  if (code.indexOf(target, idx + 1) !== -1) throw new Error(`Anchor not unique for [${label}]`);
  code = code.slice(0, idx) + replacement + code.slice(idx + target.length);
  console.log(`✓ Patched [${label}] at ${idx}`);
}

// Helper for progressive partial shape drawing + replay rendering (placed right after sAD)
const replayHelperCode = `
function _lerpPt(a,b,t){return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}}
function _drawTip(e,p){if(!p)return;e.save(),e.setLineDash([]),e.beginPath(),e.arc(p.x,p.y,5.5,0,Math.PI*2),e.fillStyle="rgba(13,148,136,0.28)",e.fill(),e.beginPath(),e.arc(p.x,p.y,2.8,0,Math.PI*2),e.fillStyle="#0d9488",e.fill(),e.restore()}
function _drawPolylinesPartial(e,paths,p,rev){
  const list=rev?[...paths].reverse().map(x=>({...x,pts:[...x.pts].reverse()})):paths;
  const segs=[];let tot=0;
  for(const l of list){
    const pts=l.closed&&l.pts.length>1?[...l.pts,l.pts[0]]:l.pts;
    for(let i=1;i<pts.length;i++){
      const d=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
      if(d>1e-6){segs.push({a:pts[i-1],b:pts[i],d,dashed:!!l.dashed});tot+=d}
    }
  }
  if(tot<1e-6)return null;
  let rem=tot*Math.max(0,Math.min(1,p)),tip=null;
  for(const sg of segs){
    if(rem<=0)break;
    const f=Math.min(1,rem/sg.d),end=f>=1?sg.b:_lerpPt(sg.a,sg.b,f);
    e.save(),sg.dashed&&e.setLineDash([9,7]),e.beginPath(),e.moveTo(sg.a.x,sg.a.y),e.lineTo(end.x,end.y),e.stroke(),e.restore();
    tip=end,rem-=sg.d;
  }
  return tip;
}
function _teePartial(e,t,n,p,rev){
  if(p>=.999){tee(e,t,n);return null}
  if(p<=0||t.kind==="solid")return null;
  const o=t.pts.map(l=>n.get(l));if(o.some(l=>!l))return null;
  let s=o,tip=null;
  e.save();
  if(t.rot&&!t.look3){const l=s[0];s=s.map(c=>Qh(c,l,-t.rot)),e.translate(l.x,l.y),e.rotate(t.rot),e.translate(-l.x,-l.y)}
  e.strokeStyle=t.color,e.lineWidth=t.width,e.lineCap="round",e.lineJoin="round",t.dashed&&e.setLineDash([9,7]);
  const i=t.look3?D7(t,s[0]):$S(t.kind,s);
  if(i){
    const strokes=i.filter(c=>!c.shade&&!c.text);
    if(t.kind==="plane"){
      if(p>.65){
        e.save(),e.beginPath(),s.forEach((u,k)=>k?e.lineTo(u.x,u.y):e.moveTo(u.x,u.y)),e.closePath(),e.fillStyle=t.fill??t.color,e.globalAlpha=(t.fill?1:.1)*((p-.65)/.35),e.fill(),e.restore();
      }
      e.globalAlpha=.6,e.lineWidth*=.7;
    }
    tip=_drawPolylinesPartial(e,strokes.map(l=>({...l,dashed:!!(l.dashed||t.dashed)})),p,rev);
    if(p>.75){
      const fa=(p-.75)/.25;
      for(const l of i.filter(c=>c.shade))e.save(),e.beginPath(),l.pts.forEach((c,u)=>u?e.lineTo(c.x,c.y):e.moveTo(c.x,c.y)),e.closePath(),e.fillStyle=t.color,e.globalAlpha=l.shade*fa,e.fill(),e.restore();
      if(t.kind==="plane"){const nm=t.name??"P",c=SR(t,s);nm&&(e.save(),e.fillStyle=t.color,e.globalAlpha=fa,e.font="italic 24px 'Times New Roman', serif",e.textAlign="center",e.textBaseline="middle",e.fillText("("+nm+")",c.x,c.y),e.restore())}
    }
    _drawTip(e,tip),e.restore();return tip;
  }
  switch(t.kind){
    case"segment":{
      const a=rev?s[1]:s[0],b=rev?s[0]:s[1],cur=_lerpPt(a,b,p);
      e.beginPath(),e.moveTo(a.x,a.y),e.lineTo(cur.x,cur.y),e.stroke(),tip=cur;
      if(t.arrow&&p>.82){
        const l=Math.hypot(b.x-a.x,b.y-a.y)||1,c={x:(b.x-a.x)/l,y:(b.y-a.y)/l},u=Math.min(l,12+2.5*t.width)*((p-.82)/.18);
        e.setLineDash([]),e.beginPath(),e.moveTo(cur.x,cur.y),e.lineTo(cur.x-c.x*u-c.y*u*.42,cur.y-c.y*u+c.x*u*.42),e.lineTo(cur.x-c.x*u+c.y*u*.42,cur.y-c.y*u-c.x*u*.42),e.closePath(),e.fillStyle=t.color,e.fill();
      }
      break;
    }
    case"line":case"ray":{
      let e0,e1;
      const l=z7(t,s[0],s[1]);
      if(l){e0=l[0],e1=l[1]}else{const c={x:s[1].x-s[0].x,y:s[1].y-s[0].y},u=Math.hypot(c.x,c.y)||1,v={x:c.x/u*eL,y:c.y/u*eL};e0=t.kind==="line"?{x:s[0].x-v.x,y:s[0].y-v.y}:s[0],e1={x:s[0].x+v.x,y:s[0].y+v.y}}
      const a=rev?e1:e0,b=rev?e0:e1,cur=_lerpPt(a,b,p);
      e.beginPath(),e.moveTo(a.x,a.y),e.lineTo(cur.x,cur.y),e.stroke(),tip=cur;
      break;
    }
    case"extend":{
      const[l,c,u]=s,v={x:u.x-c.x,y:u.y-c.y},d=v.x*v.x+v.y*v.y,m=d?((l.x-c.x)*v.x+(l.y-c.y)*v.y)/d:0;
      let e0=m<0?c:m>1?u:null,e1=l;
      if(e0){const a=rev?e1:e0,b=rev?e0:e1,cur=_lerpPt(a,b,p);e.beginPath(),e.moveTo(a.x,a.y),e.lineTo(cur.x,cur.y),e.stroke(),tip=cur}
      break;
    }
    case"circle":{
      const O=s[0],R=s[1],r=Math.hypot(R.x-O.x,R.y-O.y),a0=Math.atan2(R.y-O.y,R.x-O.x),dir=rev?-1:1,a1=a0+dir*Math.PI*2*p;
      e.beginPath(),e.arc(O.x,O.y,r,a0,a1,!!rev),e.stroke();
      tip={x:O.x+r*Math.cos(a1),y:O.y+r*Math.sin(a1)};
      break;
    }
    case"polygon":{
      const skip=new Set([...t.gaps??[],...t.hiddenSides??[]]);
      const paths=[];
      for(let k=0;k<s.length;k++){if(!skip.has(k))paths.push({pts:[s[k],s[(k+1)%s.length]],dashed:!!t.dashed})}
      if(t.fill&&p>.65){
        e.save(),e.beginPath(),s.forEach((u,k)=>k?e.lineTo(u.x,u.y):e.moveTo(u.x,u.y)),e.closePath(),e.fillStyle=t.fill,e.globalAlpha=(p-.65)/.35,e.fill(),e.restore();
      }
      tip=_drawPolylinesPartial(e,paths,p,rev);
      break;
    }
    case"angle":{
      if(I7(t,s)){e.globalAlpha=Math.min(1,p*1.3),e.beginPath(),tL(e,t,s),e.stroke();break}
      const l=s[1],c=Math.atan2(s[0].y-l.y,s[0].x-l.x);let sp=Math.atan2(s[2].y-l.y,s[2].x-l.x)-c;
      for(;sp<=-Math.PI;)sp+=2*Math.PI;for(;sp>Math.PI;)sp-=2*Math.PI;
      e.lineWidth=Math.max(1.2,t.width*.6);const d=O7(t),spNow=sp*p;
      e.beginPath(),e.arc(l.x,l.y,d,c,c+spNow,sp<0),e.stroke();
      for(let g=1;g<Math.min(3,t.n??1);g++)e.beginPath(),e.arc(l.x,l.y,d-g*5,c,c+spNow,sp<0),e.stroke();
      tip={x:l.x+d*Math.cos(c+spNow),y:l.y+d*Math.sin(c+spNow)};
      if(!t.plain&&p>.7){const m=F7(t,s);e.save(),e.globalAlpha=(p-.7)/.3,e.fillStyle=t.color,e.font="17px 'Times New Roman', serif",e.textAlign="center",e.textBaseline="middle",e.fillText(wI(s[0],l,s[2]).toFixed(1).replace(/\\.0$/,"")+"°",m.x,m.y),e.restore()}
      break;
    }
    default:{
      e.globalAlpha=Math.min(1,p*1.25),e.restore(),e.save(),e.globalAlpha=Math.min(1,p*1.25),tee(e,t,n),e.restore();
      return null;
    }
  }
  _drawTip(e,tip),e.restore();
  return tip;
}
function _drawInterGuideLine(e,a,b,I,t,fade){
  if(t<=0||fade<=0)return;
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<1e-6)return;
  const ux=dx/len,uy=dy/len;
  const proj=q=>(q.x-a.x)*ux+(q.y-a.y)*uy;
  const pA=0,pB=len,pI=proj(I);
  const mn=Math.min(pA,pB,pI)-18,mx=Math.max(pA,pB,pI)+18;
  const s0={x:a.x+ux*mn,y:a.y+uy*mn},s1={x:a.x+ux*mx,y:a.y+uy*mx};
  const end=t>=1?s1:_lerpPt(s0,s1,t);
  e.save();
  e.globalAlpha=.85*fade;
  e.strokeStyle="#0284c7";
  e.lineWidth=1.8;
  e.lineCap="round";
  e.setLineDash([7,5]);
  e.beginPath();e.moveTo(s0.x,s0.y);e.lineTo(end.x,end.y);e.stroke();
  if(t<1&&fade>.5)_drawTip(e,end);
  e.restore();
}
function _drawInterGuideCircle(e,O,R,t,fade){
  if(t<=0||fade<=0)return;
  const r=Math.hypot(R.x-O.x,R.y-O.y);if(r<1e-6)return;
  const a0=Math.atan2(R.y-O.y,R.x-O.x),a1=a0+Math.PI*2*t;
  e.save();
  e.globalAlpha=.85*fade;
  e.strokeStyle="#0284c7";
  e.lineWidth=1.8;
  e.setLineDash([7,5]);
  e.beginPath();e.arc(O.x,O.y,r,a0,a1,!1);e.stroke();
  if(t<1&&fade>.5)_drawTip(e,{x:O.x+r*Math.cos(a1),y:O.y+r*Math.sin(a1)});
  e.restore();
}
function _drawInterGuides(e,pt,coords,rawP){
  if(!pt||!pt.def||pt.def.t!=="inter")return rawP;
  const I=coords.get(pt.id);if(!I)return rawP;
  const d=pt.def;
  const a1=coords.get(d.l1[0]),b1=coords.get(d.l1[1]),a2=coords.get(d.l2[0]),b2=coords.get(d.l2[1]);
  const clamp=v=>Math.max(0,Math.min(1,v));
  const t1=clamp(rawP/.36),t2=clamp((rawP-.2)/.36),tp=clamp((rawP-.52)/.24),fade=rawP<.74?1:clamp(1-(rawP-.74)/.26);
  if(a1&&b1){d.c1?_drawInterGuideCircle(e,a1,b1,t1,fade):_drawInterGuideLine(e,a1,b1,I,t1,fade)}
  if(a2&&b2){d.c2?_drawInterGuideCircle(e,a2,b2,t2,fade):_drawInterGuideLine(e,a2,b2,I,t2,fade)}
  return tp;
}
`.replace(/\n\s*/g, '');

// 1. Add _teePartial helper right after sAD
replaceOnce(
  'Add _teePartial progressive shape renderer',
  'function sAD(e,t){const n=e.shapes.filter(r=>r.kind==="solid"&&r.solid);if(!n.length)return e;const o=Tt(e);let s=e;for(const i of n){const r=Fc(s,i,o);let a=!1;for(const l of t)if(r.has(l)||i.pts.includes(l)){a=!0;break}a&&(s=mee(s,i))}return s}',
  'function sAD(e,t){const n=e.shapes.filter(r=>r.kind==="solid"&&r.solid);if(!n.length)return e;const o=Tt(e);let s=e;for(const i of n){const r=Fc(s,i,o);let a=!1;for(const l of t)if(r.has(l)||i.pts.includes(l)){a=!0;break}a&&(s=mee(s,i))}return s}' + replayHelperCode
);

// 2. Add fields ptAnims, ptAnimRaf, replay, replayRaf on board controller
replaceOnce(
  'Board controller animation & replay fields',
  'We(this,"autoDash3d",!0);',
  'We(this,"autoDash3d",!0);We(this,"ptAnims",new Map);We(this,"ptAnimRaf",0);We(this,"ptAnimLast",0);We(this,"replay",null);We(this,"replayRaf",0);We(this,"replayLast",0);We(this,"_replayHiddenCache",null);'
);

// 3. Add board controller methods: hideSelectionNow, showAllHidden, quickMidpoint, Point Animation API, Construction Replay API
const boardMethods = `
hideSelectionNow(){
  const t=this.sel;if(!t)return!1;
  const o=t.side,pg=this.doc.pages[t.page];if(!pg)return!1;
  const hasGeo=t.shapes.size>0||t.points.size>0||!!o;
  if(!hasGeo)return!1;
  this.commit(this.updatePage(t.page,s=>{
    const mPt=pId=>t.points.has(pId)&&(!t.carried||!t.carried.has(pId)||t.shapes.size===0);
    const i=s.geo.shapes.map(a=>{
      if(o){if(a.id!==o.shape)return a;const l=(a.hiddenSides??[]).filter(u=>u!==o.i);return{...a,hiddenSides:[...l,o.i].sort((u,p)=>u-p)}}
      return t.shapes.has(a.id)?{...a,hidden:!0}:a;
    });
    const r=o?s.geo.points:Object.fromEntries(Object.entries(s.geo.points).map(([a,l])=>[a,l.show&&mPt(a)?{...l,hidden:!0}:l]));
    return{...s,geo:{...s.geo,points:r,shapes:i}};
  }));
  this.sel=null,this.redraw(),this.emit();
  return!0;
}
showAllHidden(){
  const pIdx=this.sel?this.sel.page:this.currentPage(),pg=this.doc.pages[pIdx];
  if(!pg)return 0;
  let cnt=0;
  const sel=this.sel&&this.sel.page===pIdx?this.sel:null;
  let selHasHidden=!1;
  if(sel){
    for(const sh of pg.geo.shapes)if(sel.shapes.has(sh.id)&&(sh.hidden||sh.hiddenSides&&sh.hiddenSides.length))selHasHidden=!0;
    for(const pt of Object.values(pg.geo.points))if(sel.points.has(pt.id)&&pt.hidden)selHasHidden=!0;
  }
  this.commit(this.updatePage(pIdx,s=>{
    const shapes=s.geo.shapes.map(a=>{
      if(selHasHidden&&!sel.shapes.has(a.id))return a;
      let ch=!1,na=a;
      if(a.hidden){cnt++,ch=!0;const{hidden:_,...rest}=na;na=rest}
      if(a.hiddenSides&&a.hiddenSides.length){cnt+=a.hiddenSides.length,ch=!0;const{hiddenSides:_,...rest}=na;na=rest}
      return ch?na:a;
    });
    const points=Object.fromEntries(Object.entries(s.geo.points).map(([id,pt])=>{
      if(selHasHidden&&!sel.points.has(id))return[id,pt];
      if(pt.hidden){cnt++;const{hidden:_,...rest}=pt;return[id,rest]}
      return[id,pt];
    }));
    return{...s,geo:{...s.geo,points,shapes}};
  }));
  this.redraw(),this.emit();
  return cnt;
}
quickMidpoint(){
  const t=this.sel;if(!t)return!1;
  const pg=this.doc.pages[t.page];if(!pg)return!1;
  let a=null,b=null;
  const pts=[...t.points].filter(id=>pg.geo.points[id]&&pg.geo.points[id].show);
  if(pts.length===2&&t.shapes.size===0){a=pts[0],b=pts[1]}
  else if(t.shapes.size===1){
    const sid=[...t.shapes][0],sh=pg.geo.shapes.find(s=>s.id===sid);
    if(sh&&sh.kind==="segment"&&sh.pts.length>=2){a=sh.pts[0],b=sh.pts[1]}
  }
  if(!a||!b||a===b)return!1;
  const c=yc(pg.geo),midId=nt();
  this.commit(this.updatePage(t.page,s=>({...s,geo:{...s.geo,points:{...s.geo.points,[midId]:{id:midId,def:{t:"mid",a,b},label:c(),show:!0}}}})));
  this.selectGeo(t.page,[midId],[]);
  return!0;
}
selectionMovablePoints(){
  const t=this.sel;if(!t)return[];
  const pg=this.doc.pages[t.page];if(!pg)return[];
  return[...t.points].filter(id=>{const pt=pg.geo.points[id];return pt&&pt.show&&EN(pt)});
}
selectionHasAnimatingPoint(){
  const ids=this.selectionMovablePoints();
  return ids.some(id=>this.ptAnims.has(id));
}
selectionHasGeo(){
  const t=this.sel;if(!t)return!1;
  return t.shapes.size>0||t.points.size>0;
}
startPointAnim(pageIdx,ids,opts={}){
  const pg=this.doc.pages[pageIdx];if(!pg)return!1;
  const list=Array.isArray(ids)?ids:[ids];
  if(!this.ptAnims.size){
    this.undoStack.push(this.doc);
    this.undoStack.length>hte&&this.undoStack.shift();
    this.redoStack=[];
  }
  let added=!1;
  for(const id of list){
    const pt=pg.geo.points[id];if(!pt||!EN(pt))continue;
    if(this.ptAnims.has(id)){const ex=this.ptAnims.get(id);ex.paused=!1;if(opts.speed!=null)ex.speed=opts.speed;if(opts.mode)ex.mode=opts.mode;added=!0;continue}
    const def=pt.def;
    const isClosedPath=def.t==="path"&&(def.kind==="circle"||def.kind==="ellipse"||def.kind==="polygon");
    const defMode=opts.mode||(def.t==="free"||isClosedPath?"loop":"bounce");
    this.ptAnims.set(id,{
      id,page:pageIdx,label:pt.label||"P",
      speed:opts.speed??1,mode:defMode,dir:1,paused:!1,first:!0,
      origin:def.t==="free"?{x:def.x,y:def.y}:null,
      k0:def.t==="vec"?def.k:0,
      radius:opts.radius??56,theta:0
    });
    added=!0;
  }
  if(added){this._ensurePtAnimLoop(),this._notifyAuxUI(),this.emit()}
  return added;
}
stopPointAnim(id){
  if(!this.ptAnims.has(id))return;
  this.ptAnims.delete(id);
  if(!this.ptAnims.size&&this.ptAnimRaf){cancelAnimationFrame(this.ptAnimRaf),this.ptAnimRaf=0}
  this.dirty=!0,this._notifyAuxUI(),this.emit();
}
stopAllPointAnims(){
  if(!this.ptAnims.size)return;
  this.ptAnims.clear();
  if(this.ptAnimRaf){cancelAnimationFrame(this.ptAnimRaf),this.ptAnimRaf=0}
  this.dirty=!0,this._notifyAuxUI(),this.emit();
}
setPointAnimConfig(id,cfg){
  const a=this.ptAnims.get(id);if(!a)return;
  if(cfg.speed!=null)a.speed=Math.max(.1,Math.min(5,Number(cfg.speed)||1));
  if(cfg.mode)a.mode=cfg.mode;
  if(cfg.paused!=null)a.paused=!!cfg.paused;
  if(cfg.radius!=null)a.radius=Math.max(15,Math.min(200,Number(cfg.radius)||56));
  this._ensurePtAnimLoop(),this._notifyAuxUI(),this.emit();
}
togglePointAnimPause(id){
  if(id){const a=this.ptAnims.get(id);if(a)a.paused=!a.paused}
  else{const anyRun=[...this.ptAnims.values()].some(a=>!a.paused);for(const a of this.ptAnims.values())a.paused=anyRun}
  this._ensurePtAnimLoop(),this._notifyAuxUI(),this.emit();
}
_ensurePtAnimLoop(){
  if(this.ptAnimRaf||!this.ptAnims.size)return;
  this.ptAnimLast=performance.now();
  const step=now=>{
    this.ptAnimRaf=0;
    if(!this.ptAnims.size)return;
    const dt=Math.min(.05,Math.max(.001,(now-this.ptAnimLast)/1000));
    this.ptAnimLast=now;
    const byPage=new Map;
    for(const a of this.ptAnims.values()){
      if(a.paused)continue;
      if(!byPage.has(a.page))byPage.set(a.page,[]);
      byPage.get(a.page).push(a);
    }
    if(byPage.size){
      let nextDoc=this.doc;
      const tracedPages=[];
      for(const[pIdx,anims]of byPage.entries()){
        const pg=nextDoc.pages[pIdx];if(!pg)continue;
        let pts=pg.geo.points,changed=!1;
        const movedIds=[];let anyFirst=!1;
        for(const a of anims){
          const pt=pts[a.id];if(!pt||!EN(pt)){this.ptAnims.delete(a.id);continue}
          let nd=null;const d=pt.def;
          if(d.t==="on"){
            const mn=d.seg?0:-.25,mx=d.seg?1:1.25,span=mx-mn,rate=.28*a.speed*dt;
            let k=d.k;
            if(a.mode==="loop"){k=mn+((k-mn+rate)%span+span)%span}
            else{k+=a.dir*rate;if(k>=mx){k=mx,a.dir=-1}else if(k<=mn){k=mn,a.dir=1}}
            nd={...d,k};
          }else if(d.t==="path"){
            const rate=.22*a.speed*dt;let k=d.k;
            if(a.mode==="loop"){k=((k+rate)%1+1)%1}
            else{k+=a.dir*rate;if(k>=1){k=1,a.dir=-1}else if(k<=0){k=0,a.dir=1}}
            nd={...d,k};
          }else if(d.t==="vec"){
            const mn=a.k0-.8,mx=a.k0+.8,span=mx-mn,rate=.4*a.speed*dt;let k=d.k;
            if(a.mode==="loop"){k=mn+((k-mn+rate)%span+span)%span}
            else{k+=a.dir*rate;if(k>=mx){k=mx,a.dir=-1}else if(k<=mn){k=mn,a.dir=1}}
            nd={...d,k};
          }else if(d.t==="free"&&a.origin){
            a.theta+=1.35*a.speed*dt;
            if(a.mode==="bounce"){
              nd={t:"free",x:a.origin.x+a.radius*1.35*Math.sin(a.theta),y:a.origin.y};
            }else{
              nd={t:"free",x:a.origin.x+a.radius*Math.cos(a.theta),y:a.origin.y+a.radius*Math.sin(a.theta)};
            }
          }
          if(nd){
            if(!changed){pts={...pts};changed=!0}
            pts[a.id]={...pt,def:nd};
            movedIds.push(a.id);
            if(a.first){anyFirst=!0,a.first=!1}
          }
        }
        if(changed){
          nextDoc=this.updatePage(pIdx,old=>{
            let g={...old.geo,points:pts};
            this.autoDash3d&&(g=sAD(g,movedIds));
            return{...old,geo:g};
          },nextDoc);
          tracedPages.push([pIdx,anyFirst]);
        }
      }
      if(nextDoc!==this.doc){
        this.doc=nextDoc;
        for(const[pIdx,f]of tracedPages)this.recordTraces(pIdx,f);
        this.redraw();
      }
    }
    if(this.ptAnims.size)this.ptAnimRaf=requestAnimationFrame(step);
  };
  this.ptAnimRaf=requestAnimationFrame(step);
}
_notifyAuxUI(){
  try{window.dispatchEvent(new CustomEvent("minnote:aux-update"))}catch{}
}
saveBuildScript(pageIdx,script){
  var _n;
  const pg=this.doc.pages[pageIdx];if(!pg)return!1;
  const clean=JSON.parse(JSON.stringify(script));
  this.doc=this.updatePage(pageIdx,s=>({...s,geo:{...s.geo,script:clean}}));
  this.dirty=!0;
  this.emit();
  (_n=this.cb.changed)==null||_n.call(this.cb);
  try{localStorage.setItem("mn_geo_script_"+pg.id,JSON.stringify(clean))}catch{}
  return!0;
}
replayHiddenPage(t){
  const r=this.replay;if(!r||!r.active)return t;
  const c=this._replayHiddenCache;
  if(c&&c.page===t&&c.key===r.scopeKey)return c.shown;
  const shSet=r.scopeShapes,ptSet=r.scopePoints;
  const shown={
    ...t,
    geo:{
      ...t.geo,
      shapes:shSet?t.geo.shapes.filter(s=>!shSet.has(s.id)):[],
      points:ptSet?Object.fromEntries(Object.entries(t.geo.points).filter(([id])=>!ptSet.has(id))):{}
    }
  };
  this._replayHiddenCache={page:t,key:r.scopeKey,shown};
  return shown;
}
setReplay(r){
  this.replay=r,this._replayHiddenCache=null;
  if(r&&r.active&&r.playing)this._ensureReplayLoop();
  else if(this.replayRaf){cancelAnimationFrame(this.replayRaf),this.replayRaf=0}
  this.redraw(),this._notifyAuxUI();
}
stopReplay(){
  if(this.replayRaf){cancelAnimationFrame(this.replayRaf),this.replayRaf=0}
  this.replay=null,this._replayHiddenCache=null,this.redraw(),this._notifyAuxUI();
}
_ensureReplayLoop(){
  if(this.replayRaf||!this.replay||!this.replay.active||!this.replay.playing)return;
  this.replayLast=performance.now();
  const tick=now=>{
    this.replayRaf=0;
    const r=this.replay;
    if(!r||!r.active||!r.playing)return;
    const dt=Math.min(.06,Math.max(.001,(now-this.replayLast)/1000));
    this.replayLast=now;
    const activeSteps=r.steps.filter(s=>s.enabled!==!1);
    if(!activeSteps.length){r.playing=!1,this._notifyAuxUI(),this.redraw();return}
    if(r.stepIdx>=activeSteps.length){r.playing=!1,r.stepProgress=1,this._notifyAuxUI(),this.redraw();return}
    const cur=activeSteps[r.stepIdx];
    const pg0=this.doc.pages[r.page];
    const isInterGuide=cur.kind==="point"&&cur.showGuides!==!1&&pg0&&pg0.geo.points[cur.refId]&&pg0.geo.points[cur.refId].def.t==="inter";
    const dur=(isInterGuide?1.65:cur.tempHide?1.25:cur.kind==="point"?.48:.95)/Math.max(.15,r.speed||1);
    r.stepProgress=Math.min(1,r.stepProgress+dt/dur);
    if(r.stepProgress>=1){
      if(r.stepIdx>=activeSteps.length-1){
        r.stepProgress=1,r.playing=!1,this._notifyAuxUI(),this.redraw();
        return;
      }
      if(r.pauseBetween||r.stopAfterStep){
        r.stopAfterStep=!1,r.stepProgress=1,r.playing=!1,this._notifyAuxUI(),this.redraw();
        return;
      }
      r.stepIdx++,r.stepProgress=0,this._notifyAuxUI();
    }
    this.redraw();
    if(r.playing)this.replayRaf=requestAnimationFrame(tick);
  };
  this.replayRaf=requestAnimationFrame(tick);
}
paintReplay(ctx,pageIdx){
  const r=this.replay;if(!r||!r.active||r.page!==pageIdx)return;
  const pg=this.view.pages[pageIdx];if(!pg)return;
  const geo=pg.geo,coords=Tt(geo);
  const activeSteps=r.steps.filter(s=>s.enabled!==!1);
  const shMap=new Map(geo.shapes.map(s=>[s.id,s]));
  const donePts=new Set,animPts=new Map;
  const markPts=(sh,prog)=>{
    for(const pid of sh.pts){
      if(prog>=1)donePts.add(pid);
      else animPts.set(pid,Math.max(animPts.get(pid)??0,prog));
    }
  };
  const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  for(let i=0;i<activeSteps.length;i++){
    if(i>r.stepIdx)break;
    const st=activeSteps[i];
    const rawP=i<r.stepIdx?1:Math.max(0,Math.min(1,r.stepProgress));
    const prog=i<r.stepIdx?1:ease(rawP);
    const items=st.items&&st.items.length?st.items:[{kind:st.kind,refId:st.refId,rev:!!st.rev}];
    for(const it of items){
      if(it.kind==="shape"){
        const sh=shMap.get(it.refId);
        if(!sh||(sh.hidden&&!st.tempHide&&!st.includeHidden))continue;
        if(st.tempHide){
          if(i<r.stepIdx)continue;
          const dp=Math.min(1,rawP/.72),fa=rawP<.72?1:Math.max(0,1-(rawP-.72)/.28);
          if(dp>0&&fa>0){ctx.save(),ctx.globalAlpha*=fa,_teePartial(ctx,sh,coords,ease(dp),!!(it.rev??st.rev)),ctx.restore()}
        }else if(prog>=1){tee(ctx,sh,coords);markPts(sh,1)}
        else if(prog>0){_teePartial(ctx,sh,coords,prog,!!(it.rev??st.rev));markPts(sh,Math.min(1,prog*2.5))}
      }else if(it.kind==="point"){
        const pt=geo.points[it.refId];
        if(i<r.stepIdx){donePts.add(it.refId)}
        else if(rawP>0){
          if(pt&&pt.def&&pt.def.t==="inter"&&st.showGuides!==!1){
            const tp=_drawInterGuides(ctx,pt,coords,rawP);
            if(tp>0)animPts.set(it.refId,Math.max(animPts.get(it.refId)??0,tp));
          }else{
            animPts.set(it.refId,Math.max(animPts.get(it.refId)??0,prog));
          }
        }
      }
    }
  }
  const opts={names:this.doc.names!==!1,labelSize:this.doc.labelSize,dots:this.doc.dots,labelColor:this.doc.labelColor,dotColor:this.doc.dotColor,dotSize:this.doc.dotSize};
  const lblPos=xk(geo,coords,opts);
  const fsz=opts.labelSize??Ll,dotR=Pm(opts);
  ctx.save();
  ctx.font="italic "+fsz+"px 'Times New Roman', serif",ctx.textAlign="center",ctx.textBaseline="middle";
  for(const pt of Object.values(geo.points)){
    if(!pt.show||pt.hidden)continue;
    if(r.scopePoints&&!r.scopePoints.has(pt.id))continue;
    const isDone=donePts.has(pt.id),ap=isDone?1:(animPts.get(pt.id)??0);
    if(ap<=0)continue;
    const c=coords.get(pt.id);if(!c)continue;
    ctx.save();
    ctx.globalAlpha=Math.min(1,ap*1.2);
    if(opts.dots!==!1&&!pt.noDot){
      const d=(pt.size??dotR)*Math.min(1,.35+.65*ap),m=MR(pt,opts.dotColor);
      ctx.beginPath();
      if(pt.dotStyle==="cross"){const g=d*1.1;ctx.moveTo(c.x-g,c.y-g),ctx.lineTo(c.x+g,c.y+g),ctx.moveTo(c.x-g,c.y+g),ctx.lineTo(c.x+g,c.y-g),ctx.strokeStyle=m,ctx.lineWidth=Math.max(1.5,d*.45),ctx.stroke()}
      else if(pt.dotStyle==="ring"){ctx.arc(c.x,c.y,d,0,Math.PI*2),ctx.strokeStyle=m,ctx.lineWidth=Math.max(1.2,d*.4),ctx.stroke()}
      else{ctx.arc(c.x,c.y,d,0,Math.PI*2),ctx.fillStyle=m,ctx.fill()}
      if(!isDone&&ap<.95){ctx.beginPath(),ctx.arc(c.x,c.y,d+10*ap,0,Math.PI*2),ctx.strokeStyle="rgba(13,148,136,"+((1-ap)*.7)+")",ctx.lineWidth=1.8,ctx.stroke()}
    }
    const lp=lblPos.get(pt.id);
    lp&&(ctx.fillStyle=pt.color??opts.labelColor??kk,ctx.fillText(pt.label,lp.x,lp.y));
    ctx.restore();
  }
  ctx.restore();
}
`.replace(/\n\s*/g, '');

replaceOnce(
  'Add board controller animation, replay, and shortcut methods',
  'setAutoDash3d(t){this.autoDash3d=t}',
  'setAutoDash3d(t){this.autoDash3d=t}' + boardMethods
);

// 4. Clean up RAF loops in dispose()
replaceOnce(
  'Cleanup animation/replay RAF in dispose()',
  'cancelAnimationFrame(this.frame),clearTimeout(this.wheelTimer)',
  'cancelAnimationFrame(this.frame),this.ptAnimRaf&&cancelAnimationFrame(this.ptAnimRaf),this.replayRaf&&cancelAnimationFrame(this.replayRaf),clearTimeout(this.wheelTimer)'
);

// 5. Hook replayHiddenPage in shownPage()
replaceOnce(
  'Hook shownPage for replay cache suppression',
  'shownPage(t,n){const o=this.turning,',
  'shownPage(t,n){if(this.replay&&this.replay.active&&this.replay.page===n)return this.replayHiddenPage(t);const o=this.turning,'
);

// 6. Hook paintReplay in paintOverlay()
replaceOnce(
  'Hook paintOverlay for replay rendering',
  'paintOverlay(t,n){var v,y,k;const o=this.drag,s=this.zoom;this.paintNet(t,n),',
  'paintOverlay(t,n){var v,y,k;const o=this.drag,s=this.zoom;this.paintReplay(t,n),this.paintNet(t,n),'
);

// 7. Notify external UI panel on emit()
replaceOnce(
  'Notify aux UI on emit()',
  'this.emitted={state:t,doc:this.doc,sel:this.sel},this.cb.onState(t))}',
  'this.emitted={state:t,doc:this.doc,sel:this.sel},this.cb.onState(t),this._notifyAuxUI())}'
);

// 8. Expose window.__minnoteBoard on board initialization
replaceOnce(
  'Expose window.__minnoteBoard',
  'A.setAutoDash3d(aD3),',
  'A.setAutoDash3d(aD3),(window.__minnoteBoard=A),'
);

// 9. Add Ctrl+H (hide), Ctrl+Shift+H (show hidden), Ctrl+M (midpoint) in App keydown
replaceOnce(
  'Keyboard shortcuts Ctrl+H, Ctrl+Shift+H, Ctrl+M',
  'if(ze==="escape")return Ft(()=>{Ie.cancel(),xt(""),mn({k:"select"})});',
  'if(ze==="escape")return Ft(()=>{Ie.cancel(),xt(""),mn({k:"select"})});if(lt&&!te.altKey&&(ze==="h"||te.code==="KeyH")){return Ft(()=>{if(te.shiftKey){const _c=Ie.showAllHidden();Ln(_c>0?`Đã hiện lại ${_c} đối tượng bị ẩn`:"Không có đối tượng nào đang bị ẩn trên trang này")}else{Ie.hideSelectionNow()?Ln("Đã ẩn đối tượng (Ctrl+Shift+H để hiện lại)"):Ln("Hãy chọn đối tượng cần ẩn trước")}})}if(lt&&!te.altKey&&!te.shiftKey&&(ze==="m"||te.code==="KeyM")){return Ft(()=>{if(Ie.quickMidpoint())Ln("Đã dựng trung điểm");else{mn({k:"geo",t:"midpoint"}),Ln("Trung điểm (Ctrl+M): bấm 2 điểm hoặc 1 đoạn thẳng")}})}'
);

// 10. Display Ctrl+M badge next to Trung điểm in YR default shortcuts
replaceOnce(
  'Add geo:midpoint Ctrl+M shortcut label in YR',
  'geoMove:["U"],',
  'geoMove:["U"],"geo:midpoint":["Ctrl+M"],'
);

// 11. Add "Chuyển động" button next to "Hiện vết" on floating selection bar (for movable points)
replaceOnce(
  'Selection bar Point Motion button',
  'J&&J.selectionTraceOn()!==null&&h.jsxs("button",{className:J.selectionTraceOn()?"on":"",onClick:()=>J.toggleTrace(),children:[h.jsx(oe.trace,{})," ",J.selectionTraceOn()?n.hideTrace:n.showTrace]}),',
  'J&&J.selectionTraceOn()!==null&&h.jsxs("button",{className:J.selectionTraceOn()?"on":"",onClick:()=>J.toggleTrace(),children:[h.jsx(oe.trace,{})," ",J.selectionTraceOn()?n.hideTrace:n.showTrace]}),J&&J.selectionMovablePoints().length>0&&h.jsxs("button",{className:J.selectionHasAnimatingPoint()?"on":"",title:"Chuyển động điểm (cài đặt tốc độ & chế độ)",onClick:()=>window.MinNoteGeoMotion&&window.MinNoteGeoMotion.toggleFromSelection(),children:[h.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.85,strokeLinecap:"round",strokeLinejoin:"round",children:J.selectionHasAnimatingPoint()?h.jsxs(h.Fragment,{children:[h.jsx("rect",{x:6,y:5,width:4,height:14,rx:1}),h.jsx("rect",{x:14,y:5,width:4,height:14,rx:1})]}):h.jsx("polygon",{points:"6 4 20 12 6 20 6 4",fill:"currentColor",fillOpacity:.18})})," ",J.selectionHasAnimatingPoint()?"Đang chạy":"Chuyển động"]}),'
);

// 12. Add "Dựng lại hình" button on floating selection bar (when any geo is selected, right before turn3d)
replaceOnce(
  'Selection bar Construction Replay button',
  '(J==null?void 0:J.selectionSolid())&&h.jsxs("button",{onClick:()=>J.startTurning(),children:[h.jsx(oe.turn3d,{})," ",n.turn3d]}),',
  '(J==null?void 0:J.selectionHasGeo())&&h.jsxs("button",{title:"Dựng lại hình theo kịch bản thứ tự vẽ",onClick:()=>window.MinNoteGeoReplay&&window.MinNoteGeoReplay.open(true),children:[h.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.85,strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("path",{d:"M3 12a9 9 0 1 0 3-6.7L3 8"}),h.jsx("path",{d:"M3 3v5h5"}),h.jsx("polygon",{points:"10 8.5 16 12 10 15.5 10 8.5",fill:"currentColor",fillOpacity:.22})]})," ","Dựng lại hình"]}),(J==null?void 0:J.selectionSolid())&&h.jsxs("button",{onClick:()=>J.startTurning(),children:[h.jsx(oe.turn3d,{})," ",n.turn3d]}),'
);

// 13. Add "Kịch bản dựng hình" button in HÌNH VẼ menu (right below Tự động nét liền / đứt)
replaceOnce(
  'HÌNH VẼ menu Construction Script button',
  'h.jsxs("button",{className:aD3?"checked":"",title:n.autoDash3dHint,onClick:tAD3,children:[aD3?"✓ ":"",n.autoDash3d]})]}),',
  'h.jsxs("button",{className:aD3?"checked":"",title:n.autoDash3dHint,onClick:tAD3,children:[aD3?"✓ ":"",n.autoDash3d]}),h.jsxs("button",{title:"Mở bảng kịch bản thứ tự dựng lại hình từ đầu theo từng nét",onClick:()=>{xt(""),window.MinNoteGeoReplay&&window.MinNoteGeoReplay.open(false)},children:["▶ Kịch bản dựng hình"]})]}),'
);

// 14. Add Hide Sheet Bar button inside nav.sheet-bar + unobtrusive Restore Sheet Bar pill when hidden
replaceOnce(
  'Sheet bar hide/show toggle button',
  'h.jsx("button",{className:"sheet-add",title:n.addSheet,onClick:vi,children:"+"})]}),',
  'h.jsx("button",{className:"sheet-add",title:n.addSheet,onClick:vi,children:"+"}),h.jsxs("button",{className:"sheet-hide-btn",title:"Ẩn thanh Sheet",onClick:ev,children:[h.jsx("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2.2,strokeLinecap:"round",strokeLinejoin:"round",children:h.jsx("polyline",{points:"6 9 12 15 18 9"})})," Ẩn sheet"]})]}),Ua&&h.jsxs("button",{className:"sheet-restore-pill",title:"Hiện lại thanh Sheet",onClick:ev,children:[h.jsx("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2.2,strokeLinecap:"round",strokeLinejoin:"round",children:h.jsx("polyline",{points:"18 15 12 9 6 15"})})," Sheet"]}),'
);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully patched', targetFile);
