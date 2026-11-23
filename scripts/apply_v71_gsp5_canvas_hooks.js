// Idempotent patch script: v0.0.7.1 Bottom Toolbar Tham số Button + GSP5 Direct-Tool Hooks
const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "..", "Resources", "Whiteboard", "assets", "index-CTbULhps.js");
let src = fs.readFileSync(targetPath, "utf8");

const MARKER = "/*__MN_GEO_PARAMS_V71_TOOLS__*/";
if (src.includes(MARKER)) {
  console.log("[v71] Patch already applied to index-CTbULhps.js — skipping.");
  process.exit(0);
}

function replaceOnce(str, search, replacement, label) {
  const idx = str.indexOf(search);
  if (idx === -1) throw new Error(`[v71] Could not find anchor for: ${label}`);
  const second = str.indexOf(search, idx + search.length);
  if (second !== -1) throw new Error(`[v71] Anchor not unique for: ${label}`);
  return str.slice(0, idx) + replacement + str.slice(idx + search.length);
}

// 1. Add native Tham số (GSP5) button right next to geo button inside aside.tools-bar (bottom toolbar)
const geoBarOld = `geo:()=>Pt("geo")&&h.jsx(si,{align:"right",open:_t==="geo",setOpen:ne=>xt(ne?"geo":""),columns:5,bySection:!0,button:h.jsxs(zt,{title:n.geoTip,on:on("geo"),onClick:()=>Zf("geo","geo"),children:[h.jsx(oe.geometry,{}),h.jsx(oe.chevron,{})]}),children:l2.filter(([ne])=>ne!=="marks").map(([ne,de],Ke)=>{const lt=(ze,Ft)=>h.jsxs("div",{className:"menu-section",children:[h.jsx("div",{className:"menu-heading",children:n.geoSections[ze]}),Ft.map(Wt=>h.jsxs("button",{className:l.k==="geo"&&l.t===Wt?"checked":"",title:n.geoHints[Wt],onClick:()=>mn({k:"geo",t:Wt}),children:[h.jsxs("span",{className:"tool-label",children:[x9[Wt](),n.geoTools[Wt]]}),!e.mobile&&Rt(Wt==="move"?"geoMove":\`geo:\${Wt}\`)&&h.jsx("kbd",{children:Rt(Wt==="move"?"geoMove":\`geo:\${Wt}\`)})]},Wt))]},ze),Ie=l2.find(([ze])=>ze==="marks");return Ke===0?h.jsxs(D.Fragment,{children:[h.jsxs("div",{className:"menu-stack",children:[ec,lt(...Ie)]}),lt(ne,de)]},"first"):lt(ne,de)})})`;

const geoBarNew = `${MARKER}geo:()=>Pt("geo")&&h.jsxs(D.Fragment,{children:[h.jsx(si,{align:"right",open:_t==="geo",setOpen:ne=>xt(ne?"geo":""),columns:5,bySection:!0,button:h.jsxs(zt,{title:n.geoTip,on:on("geo"),onClick:()=>Zf("geo","geo"),children:[h.jsx(oe.geometry,{}),h.jsx(oe.chevron,{})]}),children:l2.filter(([ne])=>ne!=="marks").map(([ne,de],Ke)=>{const lt=(ze,Ft)=>h.jsxs("div",{className:"menu-section",children:[h.jsx("div",{className:"menu-heading",children:n.geoSections[ze]}),Ft.map(Wt=>h.jsxs("button",{className:l.k==="geo"&&l.t===Wt?"checked":"",title:n.geoHints[Wt],onClick:()=>mn({k:"geo",t:Wt}),children:[h.jsxs("span",{className:"tool-label",children:[x9[Wt](),n.geoTools[Wt]]}),!e.mobile&&Rt(Wt==="move"?"geoMove":\`geo:\${Wt}\`)&&h.jsx("kbd",{children:Rt(Wt==="move"?"geoMove":\`geo:\${Wt}\`)})]},Wt))]},ze),Ie=l2.find(([ze])=>ze==="marks");return Ke===0?h.jsxs(D.Fragment,{children:[h.jsxs("div",{className:"menu-stack",children:[ec,lt(...Ie)]}),lt(ne,de)]},"first"):lt(ne,de)})}),h.jsx(zt,{title:"Tham số hình học (GSP5) — Tạo tham số a = 2 cm, α = 60° (Alt+P)",onClick:()=>window.MinNoteGeoParams&&window.MinNoteGeoParams.onToolbarClick(),children:h.jsxs("svg",{width:19,height:19,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round",children:[h.jsx("path",{d:"M5 17c1.2 0 2-.9 2.4-2.5L9.2 7h3.3"}),h.jsx("path",{d:"M6.4 10.5h4.2"}),h.jsx("path",{d:"M14.5 11.5h5.5"}),h.jsx("path",{d:"M14.5 15.5h5.5"})]})})]})`;

src = replaceOnce(src, geoBarOld, geoBarNew, "bottom toolbar Tham số button");

// 2. Hook geoPick(t, n) for direct GSP5 parameter construction with Circle / Segment / Angle / Rotate / Dilate / Translate
src = replaceOnce(
  src,
  `geoPick(t,n){if(this.tool.k!=="geo")return;`,
  `geoPick(t,n){if(this.tool.k!=="geo")return;if(typeof window!=="undefined"&&window.MinNoteGeoParams&&typeof window.MinNoteGeoParams.handleGeoPick==="function"&&window.MinNoteGeoParams.handleGeoPick(this,t,n))return;`,
  "geoPick GSP5 hook"
);

// 3. Hook shape tool completion (before kM) so Shape -> Circle / Segment / Square / Triangle / 3D also respects selected KaTeX parameter
src = replaceOnce(
  src,
  `const g=kM(o.t,a,l,d,{...this.shapeStyle,dashed:this.dashed},()=>nt(),c,this.regularSides);this.commit(this.addGeo(o.page,[...m,...g.points],g.shapes));return}`,
  `if(typeof window!=="undefined"&&window.MinNoteGeoParams&&typeof window.MinNoteGeoParams.handleShapeCreate==="function"&&window.MinNoteGeoParams.handleShapeCreate(this,o,a,l,c,m))return;const g=kM(o.t,a,l,d,{...this.shapeStyle,dashed:this.dashed},()=>nt(),c,this.regularSides);this.commit(this.addGeo(o.page,[...m,...g.points],g.shapes));return}`,
  "shape creation GSP5 hook"
);

// 4. Hook setTool(t) so pre-selected point O + selected param a=2cm + clicking Circle tool can act immediately, AND keep KaTeX overlay synced
src = replaceOnce(
  src,
  `this.scroller.dataset.tool=t.k==="geo"?"geo":t.k,this.redraw(),this.emit()}`,
  `this.scroller.dataset.tool=t.k==="geo"?"geo":t.k,this.redraw(),this.emit();if(typeof window!=="undefined"&&window.MinNoteGeoParams&&typeof window.MinNoteGeoParams.onToolChange==="function"){try{window.MinNoteGeoParams.onToolChange(this,t)}catch(_e){}}}`,
  "setTool GSP5 hook"
);

// 5. Expose BN (transform builder) on window.__mnGeoKernel so Rotate/Dilate/Translate can reuse exact MinNote transforms
src = replaceOnce(
  src,
  `window.__mnGeoKernel={Tt,EY,Om,EN,BY,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,mee,AR,Je,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv};`,
  `window.__mnGeoKernel={Tt,EY,Om,EN,BY,BN,c5,yc,get nt(){return nt},wr,NS,Hd,vM,DN,Nr,rb,Iw,a9,mee,AR,Je,_mnGeoVal,_mnGeoCm,_mnEvalExpr,_mnBuildParamEnv};`,
  "expose BN on __mnGeoKernel"
);

fs.writeFileSync(targetPath, src, "utf8");
console.log("[v71] Successfully applied bottom toolbar + GSP5 direct-tool hooks!");
