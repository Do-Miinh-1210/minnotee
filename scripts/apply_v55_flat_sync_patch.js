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

// 1. Skip flatLink in hit-test d5(), renderer tee(), and replay _teePartial()
replaceOnce(
  'Skip flatLink in d5() hit-test',
  'if(e.hidden&&!o||e.kind==="solid")return 1/0;',
  'if(e.hidden&&!o||e.kind==="solid"||e.kind==="flatLink")return 1/0;'
);

replaceOnce(
  'Skip flatLink in tee() renderer',
  'function tee(e,t,n){var r,a;if(t.kind==="solid")return;',
  'function tee(e,t,n){var r,a;if(t.kind==="solid"||t.kind==="flatLink")return;'
);

replaceOnce(
  'Skip flatLink in _teePartial() renderer',
  'if(p<=0||t.kind==="solid")return null;',
  'if(p<=0||t.kind==="solid"||t.kind==="flatLink")return null;'
);

// 2. Tag source shape IDs & return srcIds + group from zM()
replaceOnce(
  'Tag source shape IDs in zM()',
  'const{dashed:ee,group:ce,...he}=Y;q.push({...he,id:o(),pts:Y.pts.map(Q=>H.get(Q)),group:K})}for(const[Y,ee]of n.entries()){const ce=H.get(ee),he=H.get(n[(Y+1)%n.length]);U(ce,he)||q.push({id:o(),kind:"segment",pts:[ce,he],color:i.color,width:i.width,group:K})}return{points:R,shapes:q,w:Math.max(...$.map(Y=>Y.x))-B,h:Math.max(...$.map(Y=>Y.y))-F}}',
  'const{dashed:ee,group:ce,...he}=Y;q.push({...he,id:o(),pts:Y.pts.map(Q=>H.get(Q)),group:K,_srcSh:Y.id})}for(const[Y,ee]of n.entries()){const ce=H.get(ee),he=H.get(n[(Y+1)%n.length]);U(ce,he)||q.push({id:o(),kind:"segment",pts:[ce,he],color:i.color,width:i.width,group:K,_srcSh:"edge_"+ee+"_"+n[(Y+1)%n.length]})}return{points:R,shapes:q,w:Math.max(...$.map(Y=>Y.x))-B,h:Math.max(...$.map(Y=>Y.y))-F,srcIds:E,group:K}}'
);

// 3. Add syncFlatLinks(geo) helper and call it at the end of AR(e)
const syncFlatLinksFn = `
function syncFlatLinks(e){
  const fls=e.shapes.filter(r=>r.kind==="flatLink"&&r.flatLink);
  if(!fls.length)return e;
  let pts=e.points,shs=e.shapes,changed=!1;
  const rmLinkIds=new Set;
  for(const fl of fls){
    const lk=fl.flatLink;
    const mappedVals=Object.values(lk.map||{});
    if(mappedVals.length&&!mappedVals.some(id=>pts[id])){rmLinkIds.add(fl.id),changed=!0;continue}
    if(!lk.sync)continue;
    if(!Yi({points:pts,shapes:shs},lk.solid))continue;
    const o=zM({points:pts,shapes:shs},lk.solid,lk.ids,()=>nt(),!0);
    if(!o||!o.srcIds)continue;
    const ax=lk.anchor.x,ay=lk.anchor.yBottom-o.h;
    let newMap=lk.map,newShMap=lk.shapeMap||{},lkChanged=!1;
    const srcToClone=new Map;
    for(let k=0;k<o.srcIds.length;k++){
      const sid=o.srcIds[k],np=o.points[k];
      const tx=np.def.x+ax,ty=np.def.y+ay;
      const cid=newMap[sid];
      if(cid&&pts[cid]){
        srcToClone.set(sid,cid);
        const cur=pts[cid];
        const moved=cur.def.t!=="free"||Math.abs(cur.def.x-tx)>1e-3||Math.abs(cur.def.y-ty)>1e-3;
        const metaCh=cur.label!==np.label||cur.show!==np.show;
        if(moved||metaCh){
          if(pts===e.points)pts={...pts};
          pts[cid]={...cur,def:{t:"free",x:tx,y:ty},label:np.label,show:np.show};
          changed=!0;
        }
      }else{
        const nid=np.id;
        srcToClone.set(sid,nid);
        if(pts===e.points)pts={...pts};
        pts[nid]={...np,group:fl.group,def:{t:"free",x:tx,y:ty}};
        if(newMap===lk.map)newMap={...newMap};
        newMap[sid]=nid;
        lkChanged=!0,changed=!0;
      }
    }
    const tempToReal=new Map;
    for(let k=0;k<o.srcIds.length;k++)tempToReal.set(o.points[k].id,srcToClone.get(o.srcIds[k]));
    const shIdxMap=new Map;
    for(let k=0;k<shs.length;k++)shIdxMap.set(shs[k].id,k);
    const seenSk=new Set;
    for(const ns of o.shapes){
      const sk=ns._srcSh;if(!sk)continue;
      seenSk.add(sk);
      const mappedPts=ns.pts.map(pid=>tempToReal.get(pid));
      if(mappedPts.some(pid=>!pid))continue;
      const exId=newShMap[sk];
      if(exId&&shIdxMap.has(exId)){
        const idx=shIdxMap.get(exId),curSh=shs[idx];
        const ptsSame=curSh.pts.length===mappedPts.length&&curSh.pts.every((v,j)=>v===mappedPts[j]);
        if(!ptsSame||curSh.color!==ns.color||curSh.width!==ns.width||curSh.fill!==ns.fill){
          if(shs===e.shapes)shs=shs.slice();
          shs[idx]={...curSh,pts:mappedPts,color:ns.color,width:ns.width,...ns.fill?{fill:ns.fill}:{}};
          changed=!0;
        }
      }else{
        const{_srcSh:_,...cleanNs}=ns;
        const nSh={...cleanNs,pts:mappedPts,group:fl.group};
        if(shs===e.shapes)shs=shs.slice();
        shs.push(nSh);
        shIdxMap.set(nSh.id,shs.length-1);
        if(newShMap===lk.shapeMap||!lk.shapeMap)newShMap={...newShMap};
        newShMap[sk]=nSh.id;
        lkChanged=!0,changed=!0;
      }
    }
    const rmShIds=new Set;
    for(const[sk,exId]of Object.entries(newShMap)){
      if(!seenSk.has(sk)){
        rmShIds.add(exId);
        if(newShMap===lk.shapeMap||!lk.shapeMap)newShMap={...newShMap};
        delete newShMap[sk];
        lkChanged=!0,changed=!0;
      }
    }
    if(rmShIds.size){
      shs=shs.filter(r=>!rmShIds.has(r.id));
    }
    const usedClonePts=new Set;
    for(const r of shs)if(r.group===fl.group&&r.pts)for(const pid of r.pts)usedClonePts.add(pid);
    for(const[sid,cid]of Object.entries(newMap)){
      if(!srcToClone.has(sid)&&!lk.ids.includes(sid)&&!usedClonePts.has(cid)){
        if(pts===e.points)pts={...pts};
        delete pts[cid];
        if(newMap===lk.map)newMap={...newMap};
        delete newMap[sid];
        lkChanged=!0,changed=!0;
      }
    }
    if(lkChanged){
      if(shs===e.shapes)shs=shs.slice();
      const fi=shs.findIndex(r=>r.id===fl.id);
      if(fi>=0)shs[fi]={...shs[fi],flatLink:{...lk,map:newMap,shapeMap:newShMap}};
    }
  }
  if(rmLinkIds.size){
    shs=shs.filter(r=>!rmLinkIds.has(r.id));
  }
  return changed?{...e,points:pts,shapes:shs}:e;
}
`.replace(/\n\s*/g, '');

replaceOnce(
  'Add syncFlatLinks() and invoke from AR()',
  'return s?{...e,shapes:i}:e}',
  'const _res=s?{...e,shapes:i}:e;return syncFlatLinks(_res)}' + syncFlatLinksFn
);

// 4. Add flatSync field on board controller (default false: unchecked = keep original; checked = live sync!)
replaceOnce(
  'Add flatSync field on board controller',
  'We(this,"autoDash3d",!0);',
  'We(this,"autoDash3d",!0);We(this,"flatSync",!1);'
);

// 5. Emit flatSync state in emit()
replaceOnce(
  'Include flatSync in emit() state',
  'flattening:this.flat?this.flat.ids.length:null,',
  'flattening:this.flat?this.flat.ids.length:null,flatSync:!!this.flatSync,'
);

// 6. Add setFlatSync, selectionFlatLink, toggleSelectionFlatSync + upgrade flattenDone to create kind:"flatLink"
replaceOnce(
  'Upgrade flattenDone() to store flatLink metadata and add toggle methods',
  'flattenDone(){var d;const t=this.flat;if(!t)return!1;const n=this.doc.pages[t.page].geo,o=zM(n,t.solid,t.ids,()=>nt(),!0);if(!o)return!1;this.flat=null;const s=Tt(n),i=(d=Yi(n,t.solid))==null?void 0:d.group,r={x0:1/0,y0:1/0,x1:-1/0,y1:-1/0};for(const m of Object.values(n.points)){const g=s.get(m.id);!g||m.group!==i&&!t.ids.includes(m.id)||(r.x0=Math.min(r.x0,g.x),r.y0=Math.min(r.y0,g.y),r.x1=Math.max(r.x1,g.x),r.y1=Math.max(r.y1,g.y))}const a=60,l=r.x1+a+o.w<=Kt(this.doc)-20,c=l?r.x1+a:r.x0,u=l?r.y0:r.y1+a,p=o.points.map(m=>m.def.t==="free"?{...m,def:{...m.def,x:m.def.x+c,y:m.def.y+u}}:m);return this.commit(this.addGeo(t.page,p,o.shapes)),this.tool.k!=="select"&&this.setTool({k:"select"}),this.selectGeo(t.page,p.map(m=>m.id),o.shapes.map(m=>m.id)),!0}',
  'setFlatSync(v){this.flatSync=!!v,this.emit()}selectionFlatLink(){const t=this.sel;if(!t)return null;const n=this.doc.pages[t.page];if(!n)return null;const grps=new Set;for(const s of n.geo.shapes)if(t.shapes.has(s.id)&&s.group)grps.add(s.group);for(const id of t.points){const p=n.geo.points[id];if(p&&p.group)grps.add(p.group)}if(!grps.size)return null;const fl=n.geo.shapes.find(s=>s.kind==="flatLink"&&s.flatLink&&grps.has(s.group));return fl?{page:t.page,id:fl.id,sync:!!fl.flatLink.sync}:null}toggleSelectionFlatSync(){const f=this.selectionFlatLink();if(!f)return;const nv=!f.sync;this.commit(this.updatePage(f.page,pg=>({...pg,geo:{...pg.geo,shapes:pg.geo.shapes.map(s=>s.id===f.id?{...s,flatLink:{...s.flatLink,sync:nv}}:s)}}))),this.redraw(),this.emit()}flattenDone(){var d;const t=this.flat;if(!t)return!1;const n=this.doc.pages[t.page].geo,o=zM(n,t.solid,t.ids,()=>nt(),!0);if(!o)return!1;this.flat=null;const s=Tt(n),i=(d=Yi(n,t.solid))==null?void 0:d.group,r={x0:1/0,y0:1/0,x1:-1/0,y1:-1/0};for(const m of Object.values(n.points)){const g=s.get(m.id);!g||m.group!==i&&!t.ids.includes(m.id)||(r.x0=Math.min(r.x0,g.x),r.y0=Math.min(r.y0,g.y),r.x1=Math.max(r.x1,g.x),r.y1=Math.max(r.y1,g.y))}const a=60,l=r.x1+a+o.w<=Kt(this.doc)-20,c=l?r.x1+a:r.x0,u=l?r.y0:r.y1+a,p=o.points.map(m=>m.def.t==="free"?{...m,def:{...m.def,x:m.def.x+c,y:m.def.y+u}}:m);const _map={},_shMap={};(o.srcIds||[]).forEach((sid,idx)=>{if(p[idx])_map[sid]=p[idx].id});const cleanSh=o.shapes.map(sh=>{const{_srcSh:sk,...rest}=sh;if(sk)_shMap[sk]=rest.id;return rest});const flShape={id:nt(),kind:"flatLink",pts:[],group:o.group,color:"#000",width:1,flatLink:{solid:t.solid,ids:[...t.ids],map:_map,shapeMap:_shMap,anchor:{x:c,yBottom:u+o.h},sync:!!this.flatSync}};return this.commit(this.addGeo(t.page,p,[...cleanSh,flShape])),this.tool.k!=="select"&&this.setTool({k:"select"}),this.selectGeo(t.page,p.map(m=>m.id),cleanSh.map(m=>m.id)),!0}'
);

// 7. Update flatLink anchor when user drags/moves the extracted 2D plane in transformedPage()
replaceOnce(
  'Update flatLink anchor when user moves extracted plane in transformedPage()',
  'let _g3={points:u,shapes:p};if(this.autoDash3d&&n.points.size){',
  'if(n.points.size&&p.some(k=>k.kind==="flatLink"&&k.flatLink)){p=p.map(k=>{if(k.kind!=="flatLink"||!k.flatLink)return k;const vals=Object.values(k.flatLink.map||{}).filter(id=>u[id]);if(!vals.length||!vals.every(id=>n.points.has(id)))return k;const np=o({x:k.flatLink.anchor.x,y:k.flatLink.anchor.yBottom});return{...k,flatLink:{...k.flatLink,anchor:{x:np.x,yBottom:np.y}}}})}let _g3={points:u,shapes:p};if(this.autoDash3d&&n.points.size){'
);

// 8. Add "Đồng bộ" checkbox on the Flattening bar (during plane point selection)
replaceOnce(
  'Add Đồng bộ checkbox to flattening turn-bar',
  '(i==null?void 0:i.flattening)!=null&&J&&h.jsxs("div",{className:"selection-bar turn-bar",children:[h.jsx("span",{className:"lift-say",children:n.flatPick(i.flattening)}),h.jsxs("button",{className:"turn-done",disabled:i.flattening<3,onClick:()=>J.flattenDone(),children:[h.jsx(oe.flatPlane,{})," ",n.flatDo]}),h.jsx("button",{onClick:()=>J.cancelFlatten(),children:n.cancel})]}),',
  '(i==null?void 0:i.flattening)!=null&&J&&h.jsxs("div",{className:"selection-bar turn-bar",children:[h.jsx("span",{className:"lift-say",children:n.flatPick(i.flattening)}),h.jsxs("label",{className:"flat-sync-check",title:"Nếu tích chọn, mặt phẳng tách ra sẽ tự động thay đổi theo hình chính 3D; không tích sẽ giữ nguyên mẫu ban đầu",children:[h.jsx("input",{type:"checkbox",checked:!!i.flatSync,onChange:te=>J.setFlatSync(te.target.checked)})," Đồng bộ"]}),h.jsxs("button",{className:"turn-done",disabled:i.flattening<3,onClick:()=>J.flattenDone(),children:[h.jsx(oe.flatPlane,{})," ",n.flatDo]}),h.jsx("button",{onClick:()=>J.cancelFlatten(),children:n.cancel})]}),'
);

// 9. Add "Đồng bộ" toggle checkbox button on the floating Selection Bar when an extracted plane is selected OR before one-click face extraction!
replaceOnce(
  'Add Đồng bộ toggle on selection bar for extracted flat planes',
  '(J==null?void 0:J.selectionCanFlatten())&&h.jsxs("button",{onClick:wf,children:[h.jsx(oe.flatPlane,{})," ",n.flatPlane]}),',
  '(J==null?void 0:J.selectionFlatLink())&&(()=>{const _fl=J.selectionFlatLink();return h.jsxs("button",{className:_fl.sync?"on":"",title:"Tích chọn Đồng bộ để hình tách ra tự thay đổi theo hình chính 3D; bỏ tích để giữ nguyên mẫu",onClick:()=>J.toggleSelectionFlatSync(),children:[h.jsx("input",{type:"checkbox",readOnly:!0,checked:!!_fl.sync,style:{pointerEvents:"none",accentColor:"#0d9488",margin:"0 4px 0 0"}}),"Đồng bộ"]})})(),(J==null?void 0:J.selectionCanFlatten())&&h.jsxs("button",{onClick:wf,children:[h.jsx(oe.flatPlane,{})," ",n.flatPlane]}),(J==null?void 0:J.selectedFlatPlane())&&!(J==null?void 0:J.selectionFlatLink())&&h.jsxs("label",{className:"flat-sync-check",title:"Nếu tích chọn, mặt phẳng tách ra sẽ tự động thay đổi theo hình chính 3D; không tích sẽ giữ nguyên mẫu ban đầu",children:[h.jsx("input",{type:"checkbox",checked:!!(i&&i.flatSync),onChange:te=>J.setFlatSync(te.target.checked)})," Đồng bộ"]}),'
);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully applied v0.0.5.5 flat plane sync patch to', targetFile);
