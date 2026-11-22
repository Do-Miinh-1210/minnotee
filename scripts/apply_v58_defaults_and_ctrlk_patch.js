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

// 1. Parse geoLine* & geoDot* defaults in eu() prefs loader so they persist across app restarts!
replaceOnce(
  'Parse geoLine & geoDot defaults in eu()',
  'const F=o.paper,K=mo(["ruled","grid","dots","blank"],F==null?void 0:F.paper);return F&&K&&Tn(F.spacing)&&(',
  'lc(o.geoLineColor)&&(s.geoLineColor=o.geoLineColor),Tn(o.geoLineWidth)&&o.geoLineWidth>=.5&&o.geoLineWidth<=12&&(s.geoLineWidth=o.geoLineWidth),typeof o.geoLineDashed=="boolean"&&(s.geoLineDashed=o.geoLineDashed),Tn(o.geoDotSize)&&o.geoDotSize>=e1.min&&o.geoDotSize<=e1.max&&(s.geoDotSize=o.geoDotSize),lc(o.geoDotColor)&&(s.geoDotColor=o.geoDotColor),Tn(o.geoLabelSize)&&o.geoLabelSize>=12&&o.geoLabelSize<=72&&(s.geoLabelSize=o.geoLabelSize),lc(o.geoLabelColor)&&(s.geoLabelColor=o.geoLabelColor),typeof o.geoDots=="boolean"&&(s.geoDots=o.geoDots),typeof o.geoNames=="boolean"&&(s.geoNames=o.geoNames);const F=o.paper,K=mo(["ruled","grid","dots","blank"],F==null?void 0:F.paper);return F&&K&&Tn(F.spacing)&&('
);

// 2. Apply saved dot/label defaults in board.load(t) when opening notebooks that lack explicit point settings
replaceOnce(
  'Apply saved geo dot/label defaults in board.load(t)',
  'load(t){this.doc=t,this.live=null,',
  'load(t){try{const _pr=JSON.parse(localStorage.getItem("prefs")??"{}"),_pp=_pr&&_pr.paper||{};const _ds=_pr.geoDotSize??_pp.dotSize,_dc=_pr.geoDotColor??_pp.dotColor,_ls=_pr.geoLabelSize??_pp.labelSize,_lc=_pr.geoLabelColor??_pp.labelColor;if(t){const _patch={};if(t.dotSize==null&&typeof _ds=="number")_patch.dotSize=_ds;if(!t.dotColor&&_dc)_patch.dotColor=_dc;if(t.labelSize==null&&typeof _ls=="number")_patch.labelSize=_ls;if(!t.labelColor&&_lc)_patch.labelColor=_lc;if(Object.keys(_patch).length)t={...t,..._patch}}}catch{}this.doc=t,this.live=null,'
);

// 3. In uoe() Settings modal: initialize dotSize/dotColor/labelSize/labelColor from saved prefs fallback & save explicit defaults on Apply
replaceOnce(
  'Initialize uoe() point defaults with saved prefs fallback',
  '[Mn,Vn]=D.useState(e.labelSize??Ll),[$n,Is]=D.useState(e.labelColor??""),[xo,Hl]=D.useState(e.dotColor??""),[Oe,Qe]=D.useState(e.dotSize),',
  '[Mn,Vn]=D.useState(()=>{if(e.labelSize!=null)return e.labelSize;try{const _p=JSON.parse(localStorage.getItem(wC)??"{}");return Number(_p.geoLabelSize??(_p.paper&&_p.paper.labelSize))||Ll}catch{return Ll}}),[$n,Is]=D.useState(()=>{if(e.labelColor)return e.labelColor;try{const _p=JSON.parse(localStorage.getItem(wC)??"{}");return _p.geoLabelColor||(_p.paper&&_p.paper.labelColor)||""}catch{return""}}),[xo,Hl]=D.useState(()=>{if(e.dotColor)return e.dotColor;try{const _p=JSON.parse(localStorage.getItem(wC)??"{}");return _p.geoDotColor||(_p.paper&&_p.paper.dotColor)||""}catch{return""}}),[Oe,Qe]=D.useState(()=>{if(e.dotSize!=null)return e.dotSize;try{const _p=JSON.parse(localStorage.getItem(wC)??"{}");const _v=_p.geoDotSize??(_p.paper&&_p.paper.dotSize);return typeof _v=="number"?_v:void 0}catch{return void 0}}),'
);

replaceOnce(
  'Save explicit line & point defaults in uoe() Apply button',
  'onClick:()=>{ht({geoLineColor:gLC||"",geoLineWidth:gLW,geoLineDashed:!!gLD});const _b=window.__minnoteBoard;_b&&(_b.shapeStyle={color:gLC||"#111827",width:gLW},_b.dashed=!!gLD,_b.emit());T({paper:fe,spacing:Zo,titleBox:zs,infinite:rs,names:xt,labelSize:Mn===Ll?void 0:Mn,labelColor:$n||void 0,dotColor:xo||void 0,dotSize:Oe,dots:No,margins:Bo,color:Ue===F0[0]?void 0:Ue,image:st,lineColor:Se||void 0,lineWeight:Yt===1?void 0:Yt,landscape:Ts,size:Ze}',
  'onClick:()=>{const _dotSz=Oe??Math.round(Pm({labelSize:Mn}));ht({geoLineColor:gLC||"",geoLineWidth:gLW,geoLineDashed:!!gLD,geoDotSize:_dotSz,geoDotColor:xo||"",geoLabelSize:Mn,geoLabelColor:$n||"",geoDots:No,geoNames:xt});window.__mnGeoDefaults={lineColor:gLC||"",lineWidth:gLW,lineDashed:!!gLD,dotSize:_dotSz,dotColor:xo||"",labelSize:Mn,labelColor:$n||"",dots:No,names:xt};const _b=window.__minnoteBoard;_b&&(_b.shapeStyle={color:gLC||"#111827",width:gLW},_b.dashed=!!gLD,_b.emit());T({paper:fe,spacing:Zo,titleBox:zs,infinite:rs,names:xt,labelSize:Mn,labelColor:$n||void 0,dotColor:xo||void 0,dotSize:_dotSz,dots:No,margins:Bo,color:Ue===F0[0]?void 0:Ue,image:st,lineColor:Se||void 0,lineWeight:Yt===1?void 0:Yt,landscape:Ts,size:Ze}'
);

// 4. Hydrate window.__mnGeoDefaults on board init & ensure gu() uses saved point defaults
replaceOnce(
  'Use saved geoDot/geoLabel defaults in gu()',
  'const gu=()=>{var W;const A=u.paper??GD(((W=s.current)==null?void 0:W.doc)??$M());',
  'const gu=()=>{var W;const _gd=window.__mnGeoDefaults||{};const _base=u.paper??GD(((W=s.current)==null?void 0:W.doc)??$M());const A={..._base,...(_gd.dotSize!=null?{dotSize:_gd.dotSize}:u.geoDotSize!=null?{dotSize:u.geoDotSize}:{}),...(_gd.dotColor?{dotColor:_gd.dotColor}:u.geoDotColor?{dotColor:u.geoDotColor}:{}),...(_gd.labelSize!=null?{labelSize:_gd.labelSize}:u.geoLabelSize!=null?{labelSize:u.geoLabelSize}:{}),...(_gd.labelColor?{labelColor:_gd.labelColor}:u.geoLabelColor?{labelColor:u.geoLabelColor}:{})};'
);

replaceOnce(
  'Hydrate window.__mnGeoDefaults on board startup',
  'A.pen=p,A.shapeStyle={color:u.geoLineColor||p.color||"#111827",width:Number(u.geoLineWidth)||Math.max(2.2,p.width*.85)},u.geoLineDashed!==void 0&&(A.dashed=!!u.geoLineDashed),',
  'window.__mnGeoDefaults={lineColor:u.geoLineColor||"",lineWidth:Number(u.geoLineWidth)||0,lineDashed:u.geoLineDashed,dotSize:u.geoDotSize??(u.paper&&u.paper.dotSize),dotColor:u.geoDotColor||(u.paper&&u.paper.dotColor)||"",labelSize:u.geoLabelSize??(u.paper&&u.paper.labelSize),labelColor:u.geoLabelColor||(u.paper&&u.paper.labelColor)||""};A.pen=p,A.shapeStyle={color:u.geoLineColor||p.color||"#111827",width:Number(u.geoLineWidth)||Math.max(2.2,p.width*.85)},u.geoLineDashed!==void 0&&(A.dashed=!!u.geoLineDashed),'
);

// 5. Prevent pen-slot / pen-width changes from overwriting user's saved default geometry line width & color!
replaceOnce(
  'Preserve saved geoLine defaults in storage listener',
  'ne&&(ne.pen=te.pen,ne.shapeStyle={color:te.pen.color,width:Math.max(1.5,te.pen.width*.8)})',
  'ne&&(ne.pen=te.pen,ne.shapeStyle={color:te.geoLineColor||(window.__mnGeoDefaults&&window.__mnGeoDefaults.lineColor)||te.pen.color,width:Number(te.geoLineWidth||(window.__mnGeoDefaults&&window.__mnGeoDefaults.lineWidth))||Math.max(1.5,te.pen.width*.8)})'
);

replaceOnce(
  'Preserve saved geoLine defaults when switching pen color/width in zr()',
  'const ne=s.current;if(ne.pen=te,A.color&&(ne.shapeStyle={...ne.shapeStyle,color:A.color}),A.width&&(ne.shapeStyle={...ne.shapeStyle,width:Math.max(1.5,A.width*.8)}),A.color&&(i!=null&&i.selection))',
  'const ne=s.current,_gd=window.__mnGeoDefaults||{};if(ne.pen=te,A.color&&(!_gd.lineColor||l.k==="shape"||l.k==="geo")&&(ne.shapeStyle={...ne.shapeStyle,color:A.color}),A.width&&!_gd.lineWidth&&(ne.shapeStyle={...ne.shapeStyle,width:Math.max(1.5,A.width*.8)}),A.color&&(i!=null&&i.selection))'
);

// 6. Add quickToggleLabel() method on Nte (for Ctrl+K: show + auto-label selected objects)
const quickToggleLabelMethod =
  'quickToggleLabel(){const t=this.sel;if(!t)return null;const pg=this.doc.pages[t.page];if(!pg)return null;const ids=new Set;for(const id of t.points){const pt=pg.geo.points[id];if(pt&&!pt.hidden)ids.add(id)}for(const sid of t.shapes){const sh=pg.geo.shapes.find(s=>s.id===sid);if(!sh||sh.hidden||sh.kind==="flatLink")continue;if(sh.kind==="solid"&&sh.group){for(const pt of Object.values(pg.geo.points))if(pt.group===sh.group&&pt.show&&!pt.hidden)ids.add(pt.id)}else if(Array.isArray(sh.pts)){for(const pid of sh.pts){const pt=pg.geo.points[pid];if(pt&&!pt.hidden)ids.add(pid)}}}const list=[...ids];if(!list.length)return null;const isVis=pt=>!!(pt.show&&!pt.hidden&&pt.label&&!(this.doc.names===!1&&!pt.named)&&!pt.noName);if(list.every(id=>isVis(pg.geo.points[id]))){this.commit(this.updatePage(t.page,o=>{const pts={...o.geo.points};for(const id of list){const pt=pts[id];if(pt)pts[id]={...pt,noName:!0,named:!1}}return{...o,geo:{...o.geo,points:pts}}}));this.redraw(),this.emit();return{mode:"hide",labels:[]}}const alloc=yc(pg.geo),shown=[];this.commit(this.updatePage(t.page,o=>{const pts={...o.geo.points};for(const id of list){const pt=pts[id];if(!pt)continue;const lbl=pt.label&&pt.label.trim()?pt.label:alloc();pts[id]={...pt,show:!0,label:lbl,named:!0,noName:void 0};shown.push(lbl)}return{...o,geo:{...o.geo,points:pts}}}));this.redraw(),this.emit();return{mode:"show",labels:shown}}';

replaceOnce(
  'Add quickToggleLabel() on board controller',
  'quickMidpoint(){',
  quickToggleLabelMethod + 'quickMidpoint(){'
);

// 7. Bind Ctrl+K keyboard shortcut right next to Ctrl+M
replaceOnce(
  'Bind Ctrl+K shortcut for quickToggleLabel()',
  'if(lt&&!te.altKey&&!te.shiftKey&&(ze==="m"||te.code==="KeyM")){return Ft(()=>{if(Ie.quickMidpoint())Ln("Đã dựng trung điểm");else{mn({k:"geo",t:"midpoint"}),Ln("Trung điểm (Ctrl+M): bấm 2 điểm hoặc 1 đoạn thẳng")}})}',
  'if(lt&&!te.altKey&&!te.shiftKey&&(ze==="m"||te.code==="KeyM")){return Ft(()=>{if(Ie.quickMidpoint())Ln("Đã dựng trung điểm");else{mn({k:"geo",t:"midpoint"}),Ln("Trung điểm (Ctrl+M): bấm 2 điểm hoặc 1 đoạn thẳng")}})}if(lt&&!te.altKey&&!te.shiftKey&&(ze==="k"||te.code==="KeyK")){return Ft(()=>{const _r=Ie.quickToggleLabel();if(!_r)Ln("Chọn điểm hoặc hình rồi nhấn Ctrl+K để hiện và tự đánh nhãn");else if(_r.mode==="show")Ln("Đã hiện nhãn: "+_r.labels.join(", ")+" (Ctrl+K)");else Ln("Đã ẩn nhãn đối tượng chọn (Ctrl+K)")})}'
);

// 8. Synchronous zero-lag dropdown positioning in si() using outer toolbar edge (prevents bottom/side overflow & stretch)
replaceOnce(
  'Synchronous outer-bar dropdown positioning in si()',
  'const d=a.current.getBoundingClientRect();if(p==="bottom"){const y=window.innerHeight-d.top+6,k=Math.max(0,((v=document.querySelector("header.toolbar"))==null?void 0:v.getBoundingClientRect().bottom)??0),w=d.top-6-k-8;u(s==="right"?{bottom:y,maxHeight:w,right:Math.max(8,window.innerWidth-d.right)}:s==="center"?{bottom:y,maxHeight:w,left:d.left+d.width/2,transform:"translateX(-50%)"}:{bottom:y,maxHeight:w,left:Math.max(8,d.left)});return}if(p==="left"||p==="right"){const y=Math.max(8,d.top),k=window.innerHeight-16;u(p==="left"?{top:y,maxHeight:k,left:d.right+6}:{top:y,maxHeight:k,right:window.innerWidth-d.left+6});return}',
  'const d=a.current.getBoundingClientRect(),_bar=a.current.closest("aside.tools-bar"),_br=_bar?_bar.getBoundingClientRect():null;if(p==="bottom"){const _top=_br?Math.min(d.top,_br.top):d.top,y=window.innerHeight-_top+8,k=Math.max(38,((v=document.querySelector(".board-wrap"))==null?void 0:v.getBoundingClientRect().top)??38),w=Math.max(120,_top-8-k-8);u(s==="right"?{bottom:y,maxHeight:w,right:Math.max(8,window.innerWidth-d.right)}:s==="center"?{bottom:y,maxHeight:w,left:d.left+d.width/2,transform:"translateX(-50%)"}:{bottom:y,maxHeight:w,left:Math.max(8,d.left)});return}if(p==="left"||p==="right"){const y=Math.max(8,d.top),k=window.innerHeight-16,_rEdge=_br?Math.max(d.right,_br.right):d.right,_lEdge=_br?Math.min(d.left,_br.left):d.left;u(p==="left"?{top:y,maxHeight:k,left:_rEdge+8}:{top:y,maxHeight:k,right:window.innerWidth-_lEdge+8});return}'
);

// 9. Prevent crash when searching in Shortcuts modal (missing keyActions entry like "calc" caused _d(x) -> undefined -> W5(undefined).normalize TypeError)
replaceOnce(
  'Null-safe W5() search normalizer',
  'const W5=e=>e.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/đ/gi,"d").toLowerCase();',
  'const W5=e=>(e==null?"":String(e)).normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/đ/gi,"d").toLowerCase();'
);

replaceOnce(
  'Safe fallback in _d() shortcut label lookup',
  'if(n<0)return t.keyActions[e];',
  'if(n<0)return t.keyActions[e]??e;'
);

replaceOnce(
  'Add calc label to VI keyActions',
  'picker:"Gọi tên ngẫu nhiên (mở / đóng)",',
  'picker:"Gọi tên ngẫu nhiên (mở / đóng)",calc:"Máy tính bỏ túi (Vinacal)",'
);

replaceOnce(
  'Add calc label to EN keyActions',
  'picker:"Random student picker (open / close)",',
  'picker:"Random student picker (open / close)",calc:"Scientific calculator",'
);

// 10. Always include ALL visible point labels (including Ctrl+K / manually named points when doc.names === false) & dot radii in selectionImage() copy bounding box!
replaceOnce(
  'Include all visible labels & dots in selectionImage() copy bounds',
  'if(r.names){const a=r.labelSize??Ll;for(const l of xk(i,Tt(i),r).values())t.x0=Math.min(t.x0,l.x-a),t.y0=Math.min(t.y0,l.y-a),t.x1=Math.max(t.x1,l.x+a),t.y1=Math.max(t.y1,l.y+a)}return(async()=>{await bc([{...n,items:o.items}]);const a=12,l=2,',
  '{const a=r.labelSize??Ll,_coords=Tt(i),_dotR=Pm(r)+4;for(const _p of Object.values(i.points)){if(!_p.show||_p.hidden)continue;const _c=_coords.get(_p.id);if(_c)t.x0=Math.min(t.x0,_c.x-_dotR),t.y0=Math.min(t.y0,_c.y-_dotR),t.x1=Math.max(t.x1,_c.x+_dotR),t.y1=Math.max(t.y1,_c.y+_dotR)}for(const[_id,l]of xk(i,_coords,r)){const _pt=i.points[_id],_len=_pt&&_pt.label?_pt.label.length:1,_hw=Math.max(a*.75,a*.42*_len+8),_hh=a*.8+6;t.x0=Math.min(t.x0,l.x-_hw),t.y0=Math.min(t.y0,l.y-_hh),t.x1=Math.max(t.x1,l.x+_hw),t.y1=Math.max(t.y1,l.y+_hh)}}return(async()=>{await bc([{...n,items:o.items}]);const a=16,l=3,'
);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully applied v0.0.5.8 defaults persistence + Ctrl+K patch to', targetFile);
