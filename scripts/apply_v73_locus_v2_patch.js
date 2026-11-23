// Idempotent patch script: v0.0.7.3 Dynamic Locus V2 & Locus Intersection Engine
// - Upgrades v72 locus engine in index-CTbULhps.js to v73
// - Adds full intersection support for Locus (Locus ∩ Line/Segment/Ray/Polygon, Locus ∩ Circle/Arc, Locus ∩ Locus)
// - Adds point-on-locus (onLocus) & 1-click/2-click intersection picking
// - Fixes point picking in locus tool (pointNear priority, no accidental drag)
// - Supports circle circumference points (circle.pts[1]) and free points on curves as drivers
// - Fixes expandGeo so selecting a locus curve only selects the locus curve itself
// - Context-only "Quỹ tích" button in .selection-bar (only shown when selection can form a locus)

const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "..", "Resources", "Whiteboard", "assets", "index-CTbULhps.js");
let src = fs.readFileSync(targetPath, "utf8");

const MARKER_V73 = "/*__MN_GEO_LOCUS_V73__*/";
if (src.includes(MARKER_V73)) {
  console.log("[v73] Locus V2 patch already applied to index-CTbULhps.js — skipping.");
  process.exit(0);
}

function replaceOnce(str, search, replacement, label) {
  const idx = str.indexOf(search);
  if (idx === -1) throw new Error(`[v73] Could not find anchor for: ${label}`);
  const second = str.indexOf(search, idx + search.length);
  if (second !== -1) throw new Error(`[v73] Anchor not unique for: ${label}`);
  return str.slice(0, idx) + replacement + str.slice(idx + search.length);
}

// 1. Replace EY tail + v72 locus block through function Om(e)
const v72Start = src.indexOf('case"bis":{');
const v72End = src.indexOf('function Om(e){');
const v72KernelExport = `window.__mnGeoKernel={Tt,EY,Om,EN,BY,BN,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,mee,AR,Je,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv,_mnLocusStrokes,_mnIsDriverDef};`;
if (v72Start === -1 || v72End === -1) {
  throw new Error(`[v73] Could not locate v72 locus block (start=${v72Start}, end=${v72End})`);
}

const newKernelBlock = `case"bis":{const n=t(e.a),o=t(e.o),s=t(e.b);if(!n||!o||!s)return null;const i=Je(n,o),r=Je(s,o);if(i<1e-9||r<1e-9)return null;const a=an(cn(n,o),1/i);let l=Cn(a,an(cn(s,o),1/r));return Math.hypot(l.x,l.y)<1e-9&&(l=Hg(a)),Cn(o,an(l,i/Math.hypot(l.x,l.y)))}
  case"onLocus":{const kk=(e.kParamId||e.kExpr)?_mnGeoVal(g,e.kParamId,e.kExpr,e.k):e.k;return _mnPointAtLocusK(g,e.locusId,kk,t)}
  case"interLocus":{const pts=_mnComputeLocusIntersections(g,e.c1,e.c2,t);if(!pts.length)return null;const idx=e.which??0;return pts[idx]??null}
}}
${MARKER_V73}
const _mnLocusCache=new WeakMap();
function _mnBaseGet(coords){
  if(typeof coords==="function")return coords;
  if(coords&&typeof coords.get==="function")return id=>coords.get(id);
  return ()=>null;
}
function _mnIsDriverDef(d){
  if(!d)return!1;
  if(d.t==="path"||d.t==="on"||d.t==="onLocus")return!(d.kParamId||d.kExpr);
  if(d.t==="vec")return!(d.kParamId||d.kExpr||d.distParamId||d.distExpr||d.distVal!=null);
  if(d.t==="len")return!d.lockedAng&&!d.angParamId&&!d.angExpr;
  if(d.t==="polar")return(!!d.fixedDist&&!d.fixedAng)||(!!d.fixedAng&&!d.fixedDist);
  return!1;
}
function _mnResolveDriver(geo,driverId,baseCoords){
  if(!geo||!geo.points||!driverId)return null;
  const dPt=geo.points[driverId];
  if(!dPt||!dPt.def||!dPt.show||dPt.hidden)return null;
  const d=dPt.def,get=_mnBaseGet(baseCoords||Tt(geo));
  if(d.t==="path"&&!(d.kParamId||d.kExpr)){
    const periodic=d.kind==="circle"||d.kind==="ellipse"||d.kind==="polygon";
    return{tMin:0,tMax:1,periodic,kind:d.kind,pts:d.pts,applyDriver:v=>({...d,k:v,kParamId:void 0,kExpr:void 0})};
  }
  if(d.t==="onLocus"&&!(d.kParamId||d.kExpr)){
    return{tMin:0,tMax:1,periodic:!1,kind:"locus",locusId:d.locusId,applyDriver:v=>({...d,k:v,kParamId:void 0,kExpr:void 0})};
  }
  if(d.t==="on"&&!(d.kParamId||d.kExpr)){
    if(d.seg)return{tMin:0,tMax:1,periodic:!1,kind:"segment",pts:[d.a,d.b],applyDriver:v=>({...d,k:v,kParamId:void 0,kExpr:void 0})};
    const pA=get(d.a),pB=get(d.b);
    const span=pA&&pB?Math.min(14,Math.max(2.5,900/Math.max(25,Je(pA,pB)))):3.5;
    const shapes=Array.isArray(geo.shapes)?geo.shapes:[];
    const isRay=shapes.some(s=>s.kind==="ray"&&s.pts&&s.pts[0]===d.a&&s.pts[1]===d.b)&&!shapes.some(s=>s.kind==="line"&&s.pts&&s.pts.includes(d.a)&&s.pts.includes(d.b));
    return{tMin:isRay?0:-span,tMax:1+span,periodic:!1,kind:isRay?"ray":"line",pts:[d.a,d.b],applyDriver:v=>({...d,k:v,kParamId:void 0,kExpr:void 0})};
  }
  if(d.t==="vec"&&!(d.kParamId||d.kExpr||d.distParamId||d.distExpr||d.distVal!=null)){
    const pA=get(d.a),pB=get(d.b);
    const span=pA&&pB?Math.min(14,Math.max(2.5,900/Math.max(25,Je(pA,pB)))):3.5;
    return{tMin:-span,tMax:1+span,periodic:!1,kind:"vec",pts:[d.a,d.b],applyDriver:v=>({...d,k:v,kParamId:void 0,kExpr:void 0,distParamId:void 0,distExpr:void 0,distVal:void 0})};
  }
  if(d.t==="len"&&!d.lockedAng&&!d.angParamId&&!d.angExpr){
    return{tMin:0,tMax:Math.PI*2,periodic:!0,kind:"circle",pts:[d.a],applyDriver:v=>({...d,ang:v,lockedAng:!1,angParamId:void 0,angExpr:void 0})};
  }
  if(d.t==="polar"){
    if(d.fixedDist&&!d.fixedAng)return{tMin:0,tMax:360,periodic:!0,kind:"circle",pts:[d.o],applyDriver:v=>({...d,curAngDeg:v})};
    if(d.fixedAng&&!d.fixedDist)return{tMin:10,tMax:600,periodic:!1,kind:"ray",pts:[d.o,d.ref],applyDriver:v=>({...d,curDistPx:v})};
    return null;
  }
  if(d.t==="free"&&Array.isArray(geo.shapes)){
    const circSh=geo.shapes.find(s=>!s.hidden&&s.kind==="circle"&&s.pts&&s.pts[1]===driverId&&s.pts[0]!==driverId&&!xI(geo,s.pts[0],driverId));
    if(circSh){
      const cId=circSh.pts[0],pO=get(cId),pM=get(driverId);
      if(pO&&pM&&Je(pO,pM)>1e-3){
        const rad=Je(pO,pM);
        return{tMin:0,tMax:Math.PI*2,periodic:!0,kind:"circle",shapeId:circSh.id,pts:[cId,driverId],applyDriver:v=>({t:"free",x:pO.x+rad*Math.cos(v),y:pO.y+rad*Math.sin(v)})};
      }
    }
    const pM=get(driverId);
    if(pM){
      for(const sh of geo.shapes){
        if(sh.hidden||!Array.isArray(sh.pts)||sh.pts.some(pid=>pid===driverId||xI(geo,pid,driverId)))continue;
        if(sh.kind==="circle"){
          const pO=get(sh.pts[0]),pR=get(sh.pts[1]);
          if(pO&&pR&&Math.abs(Je(pM,pO)-Je(pO,pR))<6){
            return{tMin:0,tMax:1,periodic:!0,kind:"circle",shapeId:sh.id,pts:sh.pts,applyDriver:v=>({t:"path",kind:"circle",pts:sh.pts,k:v})};
          }
        }else if(sh.kind==="segment"||sh.kind==="line"||sh.kind==="ray"){
          const pA=get(sh.pts[0]),pB=get(sh.pts[1]);
          const mode=sh.kind==="segment"?"seg":sh.kind;
          if(pA&&pB&&Ea(pM,pA,pB,mode)<6){
            const span=Math.min(14,Math.max(2.5,900/Math.max(25,Je(pA,pB))));
            return{tMin:mode==="seg"||mode==="ray"?0:-span,tMax:mode==="seg"?1:1+span,periodic:!1,kind:sh.kind,shapeId:sh.id,pts:sh.pts,applyDriver:v=>({t:"on",a:sh.pts[0],b:sh.pts[1],k:v,seg:mode==="seg"})};
          }
        }else if(sh.kind==="polygon"&&sh.pts.length>=3){
          for(let i=0;i<sh.pts.length;i++){
            const pA=get(sh.pts[i]),pB=get(sh.pts[(i+1)%sh.pts.length]);
            if(pA&&pB&&Ea(pM,pA,pB,"seg")<6){
              return{tMin:0,tMax:1,periodic:!0,kind:"polygon",shapeId:sh.id,pts:sh.pts,applyDriver:v=>({t:"path",kind:"polygon",pts:sh.pts,k:v})};
            }
          }
        }
      }
    }
  }
  return null;
}
function _mnIsDriverPoint(geo,ptId,baseCoords){
  return!!_mnResolveDriver(geo,ptId,baseCoords);
}
function _mnLocusStrokes(geo,sh,baseCoords){
  if(!geo||!sh||!sh.locus||!geo.points)return[];
  const getBase=_mnBaseGet(baseCoords||Tt(geo));
  let gMap=_mnLocusCache.get(geo);
  if(!gMap){gMap=new Map();_mnLocusCache.set(geo,gMap);}
  const L=sh.locus;
  const cacheKey=sh.id+"|"+(sh.pts?sh.pts.join(","):"")+"|"+(L.mode||"point")+"|"+(L.driverType||"point")+"|"+(L.paramId||"")+"|"+(L.samples||"")+"|"+(L.min??"")+"|"+(L.max??"");
  if(gMap.has(cacheKey))return gMap.get(cacheKey);
  if(gMap.has("busy:"+cacheKey))return[];
  gMap.set("busy:"+cacheKey,!0);

  const mode=L.mode==="shape"?"shape":"point";
  const driverType=L.driverType==="param"?"param":"point";
  const ptsArr=Array.isArray(sh.pts)?sh.pts:[];
  let tracedPts,driverId=null,tMin=0,tMax=1,periodic=!1,applyDriver=null,sampleGeo=geo,sampleParams=null,pIdx=-1;
  const affected=new Set();

  if(driverType==="point"){
    if(ptsArr.length<2){gMap.delete("busy:"+cacheKey);gMap.set(cacheKey,[]);return[];}
    driverId=ptsArr[ptsArr.length-1];
    tracedPts=mode==="point"?[ptsArr[0]]:ptsArr.slice(0,-1);
    const drv=_mnResolveDriver(geo,driverId,getBase);
    if(!drv){gMap.delete("busy:"+cacheKey);gMap.set(cacheKey,[]);return[];}
    tMin=Number.isFinite(L.min)?L.min:drv.tMin;
    tMax=Number.isFinite(L.max)?L.max:drv.tMax;
    periodic=drv.periodic&&L.min==null&&L.max==null;
    applyDriver=drv.applyDriver;
    affected.add(driverId);
  }else{
    if(!ptsArr.length){gMap.delete("busy:"+cacheKey);gMap.set(cacheKey,[]);return[];}
    tracedPts=mode==="point"?[ptsArr[0]]:ptsArr.slice();
    const pList=Array.isArray(geo.params)?geo.params:[];
    pIdx=pList.findIndex(x=>x&&x.id===L.paramId);
    if(pIdx<0){gMap.delete("busy:"+cacheKey);gMap.set(cacheKey,[]);return[];}
    const pm=pList[pIdx];
    tMin=Number.isFinite(L.min)?L.min:(Number.isFinite(pm.min)?pm.min:0);
    tMax=Number.isFinite(L.max)?L.max:(Number.isFinite(pm.max)?pm.max:10);
    periodic=pm.unit==="angle"&&Math.abs(Math.abs(tMax-tMin)-360)<1e-2;
    sampleParams=pList.map(x=>({...x}));
    sampleGeo={...geo,params:sampleParams};
    const pIds=new Set([pm.id]),pNames=new Set([pm.name]);
    let pCh=!0;
    while(pCh){
      pCh=!1;
      for(const x of pList){
        if(!x||pIds.has(x.id)||!x.expr)continue;
        for(const nm of pNames){
          if(String(x.expr).includes(nm)){pIds.add(x.id);pNames.add(x.name);pCh=!0;break;}
        }
      }
    }
    for(const [id,pt] of Object.entries(geo.points)){
      const d=pt&&pt.def;if(!d)continue;
      if(pIds.has(d.paramId)||pIds.has(d.distParamId)||pIds.has(d.angParamId)||pIds.has(d.kParamId)||pIds.has(d.xParamId)||pIds.has(d.yParamId)||pIds.has(d.zParamId)){affected.add(id);continue;}
      const exs=[d.expr,d.distExpr,d.angExpr,d.kExpr,d.vx,d.vy,d.vz].filter(Boolean);
      if(exs.length){
        for(const nm of pNames){if(exs.some(s=>String(s).includes(nm))){affected.add(id);break;}}
      }
    }
  }

  let ch=!0;
  while(ch){
    ch=!1;
    for(const [id,pt] of Object.entries(geo.points)){
      if(affected.has(id)||!pt||!pt.def)continue;
      if(Om(pt.def).some(dep=>affected.has(dep))){affected.add(id);ch=!0;}
    }
  }

  const needed=new Set(),evalOrder=[],vis=new Set();
  const collect=id=>{
    if(!id||needed.has(id)||!affected.has(id))return;
    const pt=geo.points[id];if(!pt||!pt.def)return;
    needed.add(id);
    for(const dep of Om(pt.def))collect(dep);
  };
  for(const tid of tracedPts)collect(tid);
  if(!needed.size){gMap.delete("busy:"+cacheKey);gMap.set(cacheKey,[]);return[];}
  const topo=id=>{
    if(vis.has(id)||!needed.has(id))return;
    vis.add(id);
    const pt=geo.points[id];
    if(pt&&pt.def)for(const dep of Om(pt.def))topo(dep);
    evalOrder.push(id);
  };
  for(const id of needed)topo(id);

  const BOUND=14000;
  const evalAt=t=>{
    if(driverType==="param")sampleParams[pIdx].value=t;
    const loc=new Map();
    const get=id=>loc.has(id)?loc.get(id):getBase(id);
    for(const id of evalOrder){
      const def=(driverType==="point"&&id===driverId)?applyDriver(t,get):geo.points[id].def;
      const r=EY(def,get,sampleGeo);
      const ok=r&&Number.isFinite(r.x)&&Number.isFinite(r.y)&&Math.abs(r.x)<BOUND&&Math.abs(r.y)<BOUND;
      loc.set(id,ok?r:null);
    }
    if(mode==="point")return get(tracedPts[0])||null;
    const arr=tracedPts.map(get);
    return arr.some(p=>!p)?null:arr;
  };

  let out=[];
  if(mode==="shape"){
    const N=Math.max(6,Math.min(120,Number(L.samples)||28));
    const sk=L.shapeKind||"segment";
    const steps=periodic?N:N+1;
    for(let i=0;i<steps;i++){
      const t=tMin+(tMax-tMin)*(i/N);
      const pts=evalAt(t);if(!pts)continue;
      if(sk==="segment"&&pts.length>=2){
        out.push({pts:[pts[0],pts[1]],envelope:!0});
      }else if((sk==="line"||sk==="ray")&&pts.length>=2){
        const dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y,len=Math.hypot(dx,dy);
        if(len<1e-6)continue;
        const ux=dx/len,uy=dy/len,ext=420;
        const a=sk==="line"?{x:pts[0].x-ux*ext,y:pts[0].y-uy*ext}:pts[0];
        const b={x:pts[1].x+ux*ext,y:pts[1].y+uy*ext};
        out.push({pts:[a,b],envelope:!0});
      }else if(sk==="circle"&&pts.length>=2){
        const rad=Je(pts[0],pts[1]);
        if(rad>0.5&&rad<BOUND)out.push({pts:Ml(pts[0],rad,rad,0,Math.PI*2,0,48),closed:!0,envelope:!0});
      }else if(sk==="polygon"&&pts.length>=3){
        out.push({pts,closed:!0,envelope:!0});
      }
    }
  }else{
    const N=Math.max(24,Math.min(720,Number(L.samples)||240));
    const raw=[];
    const count=periodic?N:N+1;
    for(let i=0;i<count;i++){
      const t=tMin+(tMax-tMin)*(i/N);
      raw.push({t,p:evalAt(t)});
    }
    const dists=[];
    for(let i=1;i<raw.length;i++){
      if(raw[i-1].p&&raw[i].p){
        const d=Je(raw[i-1].p,raw[i].p);
        if(d>1e-4)dists.push(d);
      }
    }
    dists.sort((a,b)=>a-b);
    const med=dists.length?dists[Math.floor(dists.length*0.5)]:12;
    const smoothLim=Math.max(20,med*4.5);
    const jumpLim=Math.max(220,med*20);

    let cur=[];
    const flush=()=>{if(cur.length>=2)out.push({pts:cur});cur=[];};
    const appendSeg=(t0,p0,t1,p1,depth)=>{
      const d=Je(p0,p1);
      if(d<=smoothLim){cur.push(p1);return;}
      const tm=(t0+t1)*0.5,pm=evalAt(tm);
      if(!pm){flush();cur=[p1];return;}
      const d0=Je(p0,pm),d1=Je(pm,p1);
      if((d0>d*1.12||d1>d*1.12)&&Math.max(d0,d1)>Math.max(60,med*9)){flush();cur=[p1];return;}
      if(depth<3&&(d>smoothLim*1.4||Math.abs(d0+d1-d)>2.2)){
        appendSeg(t0,p0,tm,pm,depth+1);
        appendSeg(tm,pm,t1,p1,depth+1);
        return;
      }
      if(d>jumpLim){flush();cur=[p1];return;}
      cur.push(p1);
    };

    let prev=null;
    for(const item of raw){
      if(!item.p){flush();prev=null;continue;}
      if(!prev){cur=[item.p];prev=item;}
      else{appendSeg(prev.t,prev.p,item.t,item.p,0);prev=item;}
    }
    flush();

    if(periodic&&out.length&&raw[0].p&&raw[raw.length-1].p){
      const firstPoly=out[0].pts,lastPoly=out[out.length-1].pts;
      const pEnd=lastPoly[lastPoly.length-1],pStart=firstPoly[0];
      const dClose=Je(pEnd,pStart);
      if(dClose<=jumpLim){
        const pm=evalAt(tMin+(tMax-tMin)*((N-0.5)/N));
        const okClose=pm&&(Je(pEnd,pm)<=dClose*1.15&&Je(pm,pStart)<=dClose*1.15||dClose<=smoothLim);
        if(okClose){
          if(out.length===1)out[0].closed=!0;
          else{out[0].pts=[...lastPoly,...firstPoly];out.pop();}
        }
      }
    }
    if(!out.length){
      const valid=raw.find(r=>r.p);
      if(valid)out.push({pts:[valid.p,{x:valid.p.x+0.5,y:valid.p.y+0.5}]});
    }
  }
  gMap.delete("busy:"+cacheKey);
  gMap.set(cacheKey,out);
  return out;
}
function _mnLocusPolys(geo,locusId,baseCoords){
  if(!geo||!Array.isArray(geo.shapes))return null;
  const sh=geo.shapes.find(s=>s.id===locusId&&s.kind==="locus");
  if(!sh)return null;
  const strokes=_mnLocusStrokes(geo,sh,baseCoords).filter(s=>s.pts&&s.pts.length>=2);
  if(!strokes.length)return null;
  return strokes.map(s=>s.closed?[...s.pts,s.pts[0]]:s.pts);
}
function _mnPointAtLocusK(geo,locusId,k,baseCoords){
  const polys=_mnLocusPolys(geo,locusId,baseCoords);
  if(!polys)return null;
  const tot=mI(polys);
  if(tot<1e-9)return polys[0]&&polys[0][0]||null;
  let rem=Math.min(1,Math.max(0,Number(k)||0))*tot;
  for(const poly of polys){
    for(let r=1;r<poly.length;r++){
      const a=Je(poly[r-1],poly[r]);
      if(rem<=a)return a<1e-12?poly[r]:Cn(poly[r-1],an(cn(poly[r],poly[r-1]),rem/a));
      rem-=a;
    }
  }
  const last=polys[polys.length-1];
  return last[last.length-1]??null;
}
function _mnProjectOnLocus(geo,locusId,pt,baseCoords){
  const polys=_mnLocusPolys(geo,locusId,baseCoords);
  if(!polys||!pt)return null;
  const tot=mI(polys);
  if(tot<1e-9)return null;
  let acc=0,bestD=1/0,bestLen=0;
  for(const poly of polys){
    for(let c=1;c<poly.length;c++){
      const u=poly[c-1],p=cn(poly[c],u),d=Ar(p,p),len=Math.sqrt(d);
      const m=d<1e-12?0:Math.min(1,Math.max(0,Ar(cn(pt,u),p)/d));
      const g=Je(pt,Cn(u,an(p,m)));
      if(g<bestD){bestD=g;bestLen=acc+m*len;}
      acc+=len;
    }
  }
  return bestLen/tot;
}
function _mnCurveToDesc(c){
  if(!c)return null;
  if(c.kind==="locus")return{kind:"locus",id:c.id||(c.shape&&c.shape.id)};
  if(c.kind==="line")return{kind:"line",a:c.a,b:c.b,mode:c.mode||(c.seg?"seg":(c.shape&&c.shape.kind==="ray"?"ray":"line")),shapeId:c.shape&&c.shape.id};
  if(c.kind==="circle")return{kind:"circle",o:c.o,p:c.p,...(c.arcEnd?{arcEnd:c.arcEnd}:(c.shape&&c.shape.kind==="arc"&&c.shape.pts&&c.shape.pts[2]?{arcEnd:c.shape.pts[2]}:{})),shapeId:c.shape&&c.shape.id};
  return null;
}
function _mnCurveDeps(geo,c){
  if(!c)return[];
  if(c.kind==="line")return[c.a,c.b].filter(Boolean);
  if(c.kind==="circle")return[c.o,c.p,c.arcEnd].filter(Boolean);
  if(c.kind==="locus"){
    const sh=geo&&Array.isArray(geo.shapes)&&geo.shapes.find(s=>s.id===c.id);
    return sh&&Array.isArray(sh.pts)?sh.pts.slice():[];
  }
  return[];
}
function _mnSameCurve(a,b){
  if(!a||!b||a.kind!==b.kind)return!1;
  if(a.kind==="locus")return(a.id||(a.shape&&a.shape.id))===(b.id||(b.shape&&b.shape.id));
  if(a.kind==="circle")return(a.shape&&b.shape&&a.shape.id===b.shape.id)||(a.o===b.o&&a.p===b.p);
  if(a.kind==="line")return(a.a===b.a&&a.b===b.b)||(a.a===b.b&&a.b===b.a);
  return!1;
}
function _mnComputeLocusIntersections(geo,rawC1,rawC2,baseCoords){
  if(!geo||!rawC1||!rawC2)return[];
  const c1=_mnCurveToDesc(rawC1)||rawC1,c2=_mnCurveToDesc(rawC2)||rawC2;
  const getPt=_mnBaseGet(baseCoords||Tt(geo));
  const getSegs=loc=>{
    const polys=_mnLocusPolys(geo,loc.id,getPt);
    if(!polys)return[];
    const segs=[];
    for(const poly of polys){
      for(let i=1;i<poly.length;i++)segs.push({p0:poly[i-1],p1:poly[i],idx:segs.length});
    }
    return segs;
  };
  const locFirst=c1.kind==="locus";
  const locC=locFirst?c1:(c2.kind==="locus"?c2:null);
  const otherC=locFirst?c2:c1;
  if(!locC)return[];
  let rawHits=[];
  if(otherC.kind==="line"){
    const A=getPt(otherC.a),B=getPt(otherC.b);
    if(!A||!B)return[];
    const dLx=B.x-A.x,dLy=B.y-A.y;
    if(dLx*dLx+dLy*dLy<1e-12)return[];
    const segs=getSegs(locC);
    const strict=[],ext=[];
    const mode=otherC.mode||"line";
    for(const seg of segs){
      const dSx=seg.p1.x-seg.p0.x,dSy=seg.p1.y-seg.p0.y;
      const denom=dSx*dLy-dSy*dLx;
      if(Math.abs(denom)<1e-10)continue;
      const dx=A.x-seg.p0.x,dy=A.y-seg.p0.y;
      const s=(dx*dLy-dy*dLx)/denom;
      if(s<-1e-6||s>1+1e-6)continue;
      const u=(dx*dSy-dy*dSx)/denom;
      const sc=Math.min(1,Math.max(0,s));
      const pt={x:seg.p0.x+sc*dSx,y:seg.p0.y+sc*dSy,order:seg.idx+sc};
      ext.push(pt);
      const okU=mode==="seg"?(u>=-1e-4&&u<=1+1e-4):(mode==="ray"?u>=-1e-4:!0);
      if(okU)strict.push(pt);
    }
    rawHits=strict.length?strict:ext;
  }else if(otherC.kind==="circle"){
    const O=getPt(otherC.o),P=getPt(otherC.p);
    if(!O||!P)return[];
    const R=Je(O,P);
    if(R<1e-6)return[];
    const E=otherC.arcEnd?getPt(otherC.arcEnd):null;
    const segs=getSegs(locC);
    const strict=[],ext=[];
    for(const seg of segs){
      const dSx=seg.p1.x-seg.p0.x,dSy=seg.p1.y-seg.p0.y;
      const fx=seg.p0.x-O.x,fy=seg.p0.y-O.y;
      const a=dSx*dSx+dSy*dSy;
      if(a<1e-12)continue;
      const b=2*(fx*dSx+fy*dSy),c=fx*fx+fy*fy-R*R;
      const disc=b*b-4*a*c;
      if(disc<0)continue;
      const sq=Math.sqrt(disc);
      for(const s of[(-b-sq)/(2*a),(-b+sq)/(2*a)]){
        if(s<-1e-6||s>1+1e-6)continue;
        const sc=Math.min(1,Math.max(0,s));
        const pt={x:seg.p0.x+sc*dSx,y:seg.p0.y+sc*dSy,order:seg.idx+sc};
        ext.push(pt);
        if(!E||vI(O,P,E,pt,.02))strict.push(pt);
      }
    }
    rawHits=strict.length?strict:ext;
  }else if(otherC.kind==="locus"){
    const segs1=getSegs(locC),segs2=getSegs(otherC);
    for(const s1 of segs1){
      const minX1=Math.min(s1.p0.x,s1.p1.x)-1e-3,maxX1=Math.max(s1.p0.x,s1.p1.x)+1e-3;
      const minY1=Math.min(s1.p0.y,s1.p1.y)-1e-3,maxY1=Math.max(s1.p0.y,s1.p1.y)+1e-3;
      const d1x=s1.p1.x-s1.p0.x,d1y=s1.p1.y-s1.p0.y;
      for(const s2 of segs2){
        if(Math.max(s2.p0.x,s2.p1.x)<minX1||Math.min(s2.p0.x,s2.p1.x)>maxX1||Math.max(s2.p0.y,s2.p1.y)<minY1||Math.min(s2.p0.y,s2.p1.y)>maxY1)continue;
        const d2x=s2.p1.x-s2.p0.x,d2y=s2.p1.y-s2.p0.y;
        const denom=d1x*d2y-d1y*d2x;
        if(Math.abs(denom)<1e-10)continue;
        const dx=s2.p0.x-s1.p0.x,dy=s2.p0.y-s1.p0.y;
        const s=(dx*d2y-dy*d2x)/denom;
        if(s<-1e-6||s>1+1e-6)continue;
        const u=(dx*d1y-dy*d1x)/denom;
        if(u<-1e-6||u>1+1e-6)continue;
        const sc=Math.min(1,Math.max(0,s));
        rawHits.push({x:s1.p0.x+sc*d1x,y:s1.p0.y+sc*d1y,order:s1.idx+sc});
      }
    }
  }
  rawHits.sort((a,b)=>a.order-b.order);
  const dedup=[];
  for(const h of rawHits){
    if(!dedup.some(p=>Je(p,h)<2.5))dedup.push({x:h.x,y:h.y});
  }
  return dedup;
}
function _mnCurvesAt(e,t,n,o){
  const list=[];
  const r=(a,l,c,u)=>{
    const p=t.get(a),d=t.get(l);
    if(!p||!d)return;
    const m=z7(u,p,d),g=m?Ea(n,m[0],m[1],"seg"):Ea(n,p,d,c);
    if(g<o)list.push({kind:"line",a,b:l,seg:c==="seg",mode:c,shape:u,dist:g});
  };
  for(const a of e.shapes)if(!a.hidden){
    if(a.kind==="segment")r(a.pts[0],a.pts[1],"seg",a);
    else if(a.kind==="line")r(a.pts[0],a.pts[1],"line",a);
    else if(a.kind==="ray")r(a.pts[0],a.pts[1],"ray",a);
    else if(a.kind==="polygon")a.pts.forEach((l,c)=>{var u;return!((u=a.hiddenSides)!=null&&u.includes(c))&&r(l,a.pts[(c+1)%a.pts.length],"seg",a)});
    else if(a.kind==="circle"||a.kind==="arc"){
      const l=t.get(a.pts[0]),c=t.get(a.pts[1]);if(!l||!c)continue;
      if(a.kind==="arc"){const p=t.get(a.pts[2]);if(!p||!vI(l,c,p,n))continue}
      const u=Math.abs(Je(n,l)-Je(l,c));
      if(u<o)list.push({kind:"circle",o:a.pts[0],p:a.pts[1],shape:a,dist:u});
    }else if(a.kind==="locus"){
      const u=IN(_mnLocusStrokes(e,a,t),n);
      if(u<o)list.push({kind:"locus",id:a.id,shape:a,dist:u});
    }
  }
  list.sort((a,b)=>a.dist-b.dist);
  return list;
}
function Tt(e){const t=new Map,n=new Set,o=s=>{if(t.has(s))return t.get(s);const i=e.points[s];if(!i||n.has(s))return null;n.add(s);const r=EY(i.def,o,e);n.delete(s);const a=r&&Number.isFinite(r.x)&&Number.isFinite(r.y)?r:null;return t.set(s,a),a};for(const s of Object.keys(e.points))o(s);t._geo=e;return t}\n`;

src = src.slice(0, v72Start) + newKernelBlock + src.slice(v72End);

// 2. Update window.__mnGeoKernel exports
src = replaceOnce(
  src,
  v72KernelExport,
  `window.__mnGeoKernel={Tt,EY,Om,EN,BY,BN,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,mee,AR,Je,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv,_mnLocusStrokes,_mnIsDriverDef,_mnIsDriverPoint,_mnResolveDriver,_mnComputeLocusIntersections,_mnCurvesAt,_mnCurveToDesc,_mnCurveDeps};`,
  "update __mnGeoKernel exports"
);

// 3. Update Om(e) to include onLocus and interLocus
src = replaceOnce(
  src,
  `case"ctan":return[...e.c1,...e.c2];default:return[]}`,
  `case"ctan":return[...e.c1,...e.c2];case"onLocus":case"interLocus":return e.deps||[];default:return[]}`,
  "Om onLocus and interLocus"
);

// 4. Update EN(e) to allow moving onLocus points
src = replaceOnce(
  src,
  `if(d.t==="on"||d.t==="path")return!(d.kParamId||d.kExpr);`,
  `if(d.t==="on"||d.t==="path"||d.t==="onLocus")return!(d.kParamId||d.kExpr);`,
  "EN onLocus"
);

// 5. Update BY(e, t, n, o) to project dragged onLocus points
src = replaceOnce(
  src,
  `if(i.t==="path"){const r=i.pts.map(l=>t.get(l));if(r.some(l=>!l))return null;const a=fI(i,r,o);return a===null?null:{...i,k:a}}return null}`,
  `if(i.t==="path"){const r=i.pts.map(l=>t.get(l));if(r.some(l=>!l))return null;const a=fI(i,r,o);return a===null?null:{...i,k:a}}if(i.t==="onLocus"){const a=_mnProjectOnLocus(e,i.locusId,o,t);return a===null?null:{...i,k:a}}return null}`,
  "BY onLocus"
);

// 6. Update c5(e, t, n, o=!1) to cascade-clean onLocus / interLocus points when a locus shape is deleted
src = replaceOnce(
  src,
  `const r=new Set(n);let a=e.shapes.filter(c=>!r.has(c.id)&&!c.pts.some(u=>s.has(u))),l={};`,
  `const r=new Set(n);let a=e.shapes.filter(c=>!r.has(c.id)&&!c.pts.some(u=>s.has(u))),_lCh=!0;while(_lCh){_lCh=!1;const _al=new Set(a.filter(c=>c.kind==="locus").map(c=>c.id));for(const c of Object.values(e.points)){if(s.has(c.id)||!c.def)continue;const d=c.def;if((d.t==="onLocus"&&!_al.has(d.locusId))||(d.t==="interLocus"&&((d.c1&&d.c1.kind==="locus"&&!_al.has(d.c1.id))||(d.c2&&d.c2.kind==="locus"&&!_al.has(d.c2.id))))||Om(d).some(u=>s.has(u))){s.add(c.id);_lCh=!0;}}if(_lCh)a=e.shapes.filter(c=>!r.has(c.id)&&!c.pts.some(u=>s.has(u)));}let l={};`,
  "c5 cascade clean onLocus and interLocus"
);

// 7. Update j0(e, t, n, o) to use _mnCurvesAt (supporting locus curves in j0)
src = replaceOnce(
  src,
  `function j0(e,t,n,o){let s=null,i=o;const r=(a,l,c,u)=>{const p=t.get(a),d=t.get(l);if(!p||!d)return;const m=z7(u,p,d),g=m?Ea(n,m[0],m[1],"seg"):Ea(n,p,d,c);g<i&&(i=g,s={kind:"line",a,b:l,seg:c==="seg",shape:u})};for(const a of e.shapes)if(!a.hidden){if(a.kind==="segment")r(a.pts[0],a.pts[1],"seg",a);else if(a.kind==="line")r(a.pts[0],a.pts[1],"line",a);else if(a.kind==="ray")r(a.pts[0],a.pts[1],"ray",a);else if(a.kind==="polygon")a.pts.forEach((l,c)=>{var u;return!((u=a.hiddenSides)!=null&&u.includes(c))&&r(l,a.pts[(c+1)%a.pts.length],"seg",a)});else if(a.kind==="circle"||a.kind==="arc"){const l=t.get(a.pts[0]),c=t.get(a.pts[1]);if(!l||!c)continue;if(a.kind==="arc"){const p=t.get(a.pts[2]);if(!p||!vI(l,c,p,n))continue}const u=Math.abs(Je(n,l)-Je(l,c));u<i&&(i=u,s={kind:"circle",o:a.pts[0],p:a.pts[1],shape:a})}}return s}`,
  `function j0(e,t,n,o){return _mnCurvesAt(e,t,n,o)[0]||null}`,
  "j0 delegate to _mnCurvesAt"
);

// 8. Allow point animation (ptAnims) on onLocus points
src = replaceOnce(
  src,
  `}else if(d.t==="path"){const rate=.22*a.speed*dt;`,
  `}else if(d.t==="path"||d.t==="onLocus"){const rate=.22*a.speed*dt;`,
  "ptAnims support onLocus"
);

// 9. Fix expandGeo and hideSelBox and selectionHasLines/selectionHidden for locus shapes
src = replaceOnce(
  src,
  `for(const i of t.geo.shapes)if((i.group&&o.has(i.group)||i.pts.every(r=>n.points.has(r)))&&n.shapes.add(i.id),!!n.shapes.has(i.id))for(const r of i.pts)n.points.has(r)||(n.points.add(r),(n.carried??(n.carried=new Set)).add(r))`,
  `for(const i of t.geo.shapes){if(i.kind==="locus")continue;if((i.group&&o.has(i.group)||i.pts.every(r=>n.points.has(r)))&&n.shapes.add(i.id),!!n.shapes.has(i.id))for(const r of i.pts)n.points.has(r)||(n.points.add(r),(n.carried??(n.carried=new Set)).add(r))}`,
  "expandGeo skip locus generator points"
);

src = replaceOnce(
  src,
  `const shs=pg.geo.shapes.filter(q=>d.shapes.has(q.id)),isL=q=>q.kind==="segment"||q.kind==="line"||q.kind==="ray"||q.kind==="extend";`,
  `const shs=pg.geo.shapes.filter(q=>d.shapes.has(q.id)),isL=q=>q.kind==="segment"||q.kind==="line"||q.kind==="ray"||q.kind==="extend"||q.kind==="locus";`,
  "hideSelBox include locus"
);

src = replaceOnce(
  src,
  `selectionHasLines(){const t=this.sel;if(!t)return!1;const n=this.doc.pages[t.page].geo;return n.shapes.some(r=>t.shapes.has(r.id)&&["segment","line","ray","extend"].includes(r.kind))}`,
  `selectionHasLines(){const t=this.sel;if(!t)return!1;const n=this.doc.pages[t.page].geo;return n.shapes.some(r=>t.shapes.has(r.id)&&["segment","line","ray","extend","locus"].includes(r.kind))}`,
  "selectionHasLines include locus"
);

src = replaceOnce(
  src,
  `const isL=r=>["segment","line","ray","extend"].includes(r.kind),isF=r=>["polygon","plane","circle","arc","sphere"].includes(r.kind);`,
  `const isL=r=>["segment","line","ray","extend","locus"].includes(r.kind),isF=r=>["polygon","plane","circle","arc","sphere"].includes(r.kind);`,
  "selectionHidden isL include locus"
);

// 10. Fix pointerdown in geo mode so tool === "locus" uses pointNear and never accidentally starts dragging a point
src = replaceOnce(
  src,
  `const g=this.tool.t==="move"?this.pointNear(p,d,r):this.endPointNear(p,d,r);if(l&&g&&this.tool.t==="move"){this.cb.renamePoint(i,g,p.geo.points[g].label);return}const v=this.tool.t==="move"?this.planeNameNear(p,d,r):null;if(v){this.drag={k:"planeName",page:i,id:v.id,from:r,off:v.nameAt??{x:0,y:0},moved:!1};return}const y=this.tool.t==="move"&&!g?this.labelNear(p,d,r):null;if(y){this.drag={k:"label",page:i,id:y,from:r,off:this.labelOffset(p,y),moved:!1};return}if(g&&EN(p.geo.points[g])){this.drag={k:"point",page:i,id:g,from:r,moved:!1,pick:this.tool.t!=="move"};return}`,
  `const g=(this.tool.t==="move"||this.tool.t==="locus")?this.pointNear(p,d,r):this.endPointNear(p,d,r);if(l&&g&&this.tool.t==="move"){this.cb.renamePoint(i,g,p.geo.points[g].label);return}const v=this.tool.t==="move"?this.planeNameNear(p,d,r):null;if(v){this.drag={k:"planeName",page:i,id:v.id,from:r,off:v.nameAt??{x:0,y:0},moved:!1};return}const y=this.tool.t==="move"&&!g?this.labelNear(p,d,r):null;if(y){this.drag={k:"label",page:i,id:y,from:r,off:this.labelOffset(p,y),moved:!1};return}if(g&&this.tool.t!=="locus"&&EN(p.geo.points[g])){this.drag={k:"point",page:i,id:g,from:r,moved:!1,pick:this.tool.t!=="move"};return}`,
  "pointerdown locus pointNear and immediate geoPick"
);

// 11. Upgrade geoClick, pointOn, wantsCurve, and finishGeo case "intersect"
src = replaceOnce(
  src,
  `geoClick(t,n){var p;const o=this.tool.k==="geo"?this.tool.t:"move";if(o!=="move"&&this.inkToSegment(t,n))return this.geoClick(t,n);if((o==="intersect"||o==="tangent")&&this.inkToArc(t,n))return this.geoClick(t,n);const s=this.doc.pages[t],i=Tt(s.geo),r=j0(s.geo,i,n,this.tol());if(o==="equal"){if(r&&r.kind==="line"&&r.seg){const[d,m]=this.pieceAt(s,i,r.a,r.b,n);this.markEqual(t,d,m)}return}if(r&&this.wantsCurve(t,o,r)){this.geoPick(t,{kind:"curve",c:r});return}if(o==="locus"||o==="intersect"||o==="reflectLine"&&((p=this.picks)==null?void 0:p.page)===t&&this.picks.list.length)return;const a=nt(),l=this.onGrid(n)??n,c=this.pointOn(s,i,n,r)??{t:"free",x:l.x,y:l.y},u={id:a,def:c,label:yc(s.geo)(),show:!0};this.commit(this.addGeo(t,[u],[])),o!=="point"&&this.geoPick(t,{kind:"point",id:a})}`,
  `geoClick(t,n){var p;const o=this.tool.k==="geo"?this.tool.t:"move";if(o!=="move"&&this.inkToSegment(t,n))return this.geoClick(t,n);if(o!=="move"&&this.inkToArc(t,n))return this.geoClick(t,n);const s=this.doc.pages[t],i=Tt(s.geo),hits=_mnCurvesAt(s.geo,i,n,Math.max(this.tol(),12/this.zoom));let r=hits[0]||null;if(o==="intersect"){const hasFirst=((p=this.picks)==null?void 0:p.page)===t&&this.picks.list.length===1&&this.picks.list[0].kind==="curve";if(hasFirst){const prev=this.picks.list[0].c;r=hits.find(h=>!_mnSameCurve(h,prev))||null;}else if(hits.length>=2){for(let hi=1;hi<hits.length;hi++){if(!_mnSameCurve(hits[0],hits[hi])){this.finishGeo(t,"intersect",[{kind:"curve",c:hits[0]},{kind:"curve",c:hits[hi]}]);return}}}}if(o==="equal"){if(r&&r.kind==="line"&&r.seg){const[d,m]=this.pieceAt(s,i,r.a,r.b,n);this.markEqual(t,d,m)}return}if(r&&this.wantsCurve(t,o,r)){this.geoPick(t,{kind:"curve",c:r});return}if(o==="locus"||o==="intersect"||o==="reflectLine"&&((p=this.picks)==null?void 0:p.page)===t&&this.picks.list.length)return;const a=nt(),l=this.onGrid(n)??n,c=this.pointOn(s,i,n,r)??{t:"free",x:l.x,y:l.y},u={id:a,def:c,label:yc(s.geo)(),show:!0};this.commit(this.addGeo(t,[u],[])),o!=="point"&&this.geoPick(t,{kind:"point",id:a})}`,
  "geoClick 1-click and 2-click intersect + inkToArc"
);

src = replaceOnce(
  src,
  `pointOn(t,n,o,s,i=this.tol()){const r=s===void 0?j0(t.geo,n,o,i):s,a=r&&(r.kind==="circle"||r.shape.kind==="polygon")?r.shape:r?null:VY(t.geo,n,o,i),l=a?LY(a,n,o):null;if(l)return l;if(r&&r.kind==="line"){const c=n.get(r.a),u=n.get(r.b),p=(u.x-c.x)**2+(u.y-c.y)**2;if(p>1e-6)return{t:"on",a:r.a,b:r.b,k:((o.x-c.x)*(u.x-c.x)+(o.y-c.y)*(u.y-c.y))/p,seg:r.seg}}return null}`,
  `pointOn(t,n,o,s,i=this.tol()){const hits=_mnCurvesAt(t.geo,n,o,Math.max(i,10/this.zoom));if(hits.length>=2){for(let hi=1;hi<hits.length;hi++){const cA=hits[0],cB=hits[hi];if(_mnSameCurve(cA,cB))continue;if(cA.kind==="locus"||cB.kind==="locus"){const d1=_mnCurveToDesc(cA),d2=_mnCurveToDesc(cB),pts=_mnComputeLocusIntersections(t.geo,d1,d2,n);let bestI=-1,bestD=Math.max(i*1.5,14/this.zoom);pts.forEach((pt,idx)=>{const d=Je(pt,o);if(d<bestD){bestD=d;bestI=idx;}});if(bestI>=0){const deps=[...new Set([..._mnCurveDeps(t.geo,d1),..._mnCurveDeps(t.geo,d2)])];return{t:"interLocus",c1:d1,c2:d2,which:bestI,deps};}}}}const r=s===void 0?j0(t.geo,n,o,i):s;if(r&&r.kind==="locus"){const k=_mnProjectOnLocus(t.geo,r.id,o,n);if(k!==null)return{t:"onLocus",locusId:r.id,k,deps:[...(r.shape.pts||[])]};}const a=r&&(r.kind==="circle"||r.shape.kind==="polygon")?r.shape:r?null:VY(t.geo,n,o,i),l=a?LY(a,n,o):null;if(l)return l;if(r&&r.kind==="line"){const c=n.get(r.a),u=n.get(r.b),p=(u.x-c.x)**2+(u.y-c.y)**2;if(p>1e-6)return{t:"on",a:r.a,b:r.b,k:((o.x-c.x)*(u.x-c.x)+(o.y-c.y)*(u.y-c.y))/p,seg:r.seg}}return null}`,
  "pointOn locus intersection snap and onLocus"
);

src = replaceOnce(
  src,
  `wantsCurve(t,n,o){var i,r,a;const s=!this.picks||this.picks.page!==t||!this.picks.list.length;if(n==="locus")return s&&o.shape&&["segment","line","ray","circle","polygon"].includes(o.shape.kind);return["perp","parallel","altitude","intersect"].includes(n)?!0:`,
  `wantsCurve(t,n,o){var i,r,a;const s=!this.picks||this.picks.page!==t||!this.picks.list.length;if(n==="locus")return!!(o.shape&&["segment","line","ray","circle","polygon","locus"].includes(o.shape.kind));if(o.kind==="locus")return n==="intersect";return["perp","parallel","altitude","intersect"].includes(n)?!0:`,
  "wantsCurve locus and intersect support"
);

src = replaceOnce(
  src,
  `case"intersect":{const[v,y]=a,k=T=>T.kind==="line"?[T.a,T.b]:[T.o,T.p],w=v.kind==="circle"||y.kind==="circle";if(!w&&hee(s.geo,k(v),k(y))){(m=(d=this.cb).geoRefused)==null||m.call(d,"apart");break}const x=(w?[0,1]:[0]).map(T=>({id:nt(),def:{t:"inter",l1:k(v),c1:v.kind==="circle",l2:k(y),c2:y.kind==="circle",which:T},label:"",show:!0})),S=Tt({...s.geo,points:{...s.geo.points,...Object.fromEntries(x.map(T=>[T.id,T]))}}),j=x.filter(T=>{const C=S.get(T.id);return!!C&&[v,y].every(_=>{if(_.shape.kind!=="arc")return!0;const[E,P,L]=_.shape.pts.map(O=>S.get(O));return!E||!P||!L||vI(E,P,L,C,.02)})});for(const T of OY(s.geo,j.length?j:x))u.push({...T,label:c()});break}`,
  `case"intersect":{const[v,y]=a;if(v.kind==="locus"||y.kind==="locus"){const c1=_mnCurveToDesc(v),c2=_mnCurveToDesc(y),deps=[...new Set([..._mnCurveDeps(s.geo,c1),..._mnCurveDeps(s.geo,c2)])],pts=_mnComputeLocusIntersections(s.geo,c1,c2,Tt(s.geo));if(!pts.length){(m=(d=this.cb).geoRefused)==null||m.call(d,"apart");break}const cand=pts.map((_,idx)=>({id:nt(),def:{t:"interLocus",c1,c2,which:idx,deps},label:"",show:!0})),onlyInterGeo={...s.geo,points:Object.fromEntries(Object.entries(s.geo.points).filter(([,pt])=>!pt.def||pt.def.t==="interLocus"||pt.def.t==="inter"))};for(const T of OY(onlyInterGeo,cand,2))u.push({...T,label:c()});break}const k=T=>T.kind==="line"?[T.a,T.b]:[T.o,T.p],w=v.kind==="circle"||y.kind==="circle";if(!w&&hee(s.geo,k(v),k(y))){(m=(d=this.cb).geoRefused)==null||m.call(d,"apart");break}const x=(w?[0,1]:[0]).map(T=>({id:nt(),def:{t:"inter",l1:k(v),c1:v.kind==="circle",l2:k(y),c2:y.kind==="circle",which:T},label:"",show:!0})),S=Tt({...s.geo,points:{...s.geo.points,...Object.fromEntries(x.map(T=>[T.id,T]))}}),j=x.filter(T=>{const C=S.get(T.id);return!!C&&[v,y].every(_=>{if(_.shape.kind!=="arc")return!0;const[E,P,L]=_.shape.pts.map(O=>S.get(O));return!E||!P||!L||vI(E,P,L,C,.02)})});for(const T of OY(s.geo,j.length?j:x))u.push({...T,label:c()});break}`,
  "finishGeo intersect locus support"
);

// 12. Make .selection-bar "Quỹ tích" button context-only (only show when selection can actually create or adjust a locus!)
const oldSelBtn = `(J==null?void 0:J.selectionHasGeo())&&h.jsxs("button",{title:"Tạo Quỹ tích động / Vết điểm",onClick:()=>window.MinNoteGeoParams&&window.MinNoteGeoParams.onLocusSelectionClick(),children:[h.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.85,strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("path",{d:"M3 17C6 7 11 5 15 11s5 6 6 2",strokeDasharray:"2.6 2.2"}),h.jsx("circle",{cx:"8",cy:"8.2",r:"2.2",fill:"currentColor"})]})," ","Quỹ tích"]})`;
const oldSelBtnGsp = `(J==null?void 0:J.selectionHasGeo())&&h.jsxs("button",{title:"Tạo Quỹ tích động / Vết điểm (GSP5)",onClick:()=>window.MinNoteGeoParams&&window.MinNoteGeoParams.onLocusSelectionClick(),children:[h.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.85,strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("path",{d:"M3 17C6 7 11 5 15 11s5 6 6 2",strokeDasharray:"2.6 2.2"}),h.jsx("circle",{cx:"8",cy:"8.2",r:"2.2",fill:"currentColor"})]})," ","Quỹ tích"]})`;

const newSelBtn = `(window.MinNoteGeoParams&&typeof window.MinNoteGeoParams.canShowLocusInSelBar==="function"&&window.MinNoteGeoParams.canShowLocusInSelBar())&&h.jsxs("button",{title:window.MinNoteGeoParams.getLocusSelBarTitle?window.MinNoteGeoParams.getLocusSelBarTitle():"Dựng quỹ tích hình học động",onClick:A=>window.MinNoteGeoParams&&window.MinNoteGeoParams.onLocusSelectionClick(A),children:[h.jsx("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.85,strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("path",{d:"M3 17C6 7 11 5 15 11s5 6 6 2",strokeDasharray:"2.6 2.2"}),h.jsx("circle",{cx:"8",cy:"8.2",r:"2.2",fill:"currentColor"})]})," ",window.MinNoteGeoParams.getLocusSelBarLabel?window.MinNoteGeoParams.getLocusSelBarLabel():"Quỹ tích"]})`;

if (src.includes(oldSelBtn)) {
  src = replaceOnce(src, oldSelBtn, newSelBtn, "context-only sel-bar locus button");
} else {
  src = replaceOnce(src, oldSelBtnGsp, newSelBtn, "context-only sel-bar locus button (gsp)");
}

const oldHintVi = `locus:"Bấm điểm (hoặc đường) cần vẽ quỹ tích rồi bấm điểm chuyển động (hoặc chọn sẵn tham số KaTeX rồi bấm 1 điểm)"`;
const newHintVi = `locus:"Bấm điểm cần tìm quỹ tích rồi bấm điểm chuyển động (hoặc bấm trực tiếp đường dẫn của điểm chuyển động)"`;
if (src.includes(oldHintVi)) {
  src = replaceOnce(src, oldHintVi, newHintVi, "locus hint VI");
}

fs.writeFileSync(targetPath, src, "utf8");
console.log("[v73] Successfully patched index-CTbULhps.js with Dynamic Locus V2 & Locus Intersection Engine!");
