const fs = require('fs');

const filePath = 'Resources/Whiteboard/assets/index-CTbULhps.js';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update hideSelBox(d) to also hide box on multi-click selections (d.multi)
const t1 = `hideSelBox(d){if(!d||d.strokes.size||d.items.size)return!1;if(d.points.size+d.shapes.size===1)return!0;`;
const r1 = `hideSelBox(d){if(!d)return!1;if(d.multi)return!0;if(d.strokes.size||d.items.size)return!1;if(d.points.size+d.shapes.size===1)return!0;`;

// 2. Highlight selected strokes & multi-selected items directly in teal, and remove translucent blue background fillRect from selection box
const t2 = `const m=this.hideSelBox(d);if(this.sel&&this.sel.page===n&&!m){const w=this.selectionBox();if(w){const x=wm(this.doc);t.save(),t.fillStyle=x?i.wash:"rgba(0, 128, 255, 0.135)",t.fillRect(w.x0,w.y0,w.x1-w.x0,w.y1-w.y0),t.strokeStyle=x?i.mark:"#f7bc4c",`;
const r2 = `if(d&&(d.strokes.size||d.items.size&&d.multi)){const pg=this.view.pages[n];if(pg){if(d.strokes.size)for(const st of pg.strokes)d.strokes.has(st.id)&&(t.save(),t.globalAlpha=.45,Na(t,{...st,color:"#0d9488",width:(st.width||2)+6}),t.restore());if(d.items.size&&d.multi){t.save(),t.strokeStyle="#0d9488",t.lineWidth=2/s,t.setLineDash([6/s,4/s]);for(const it of pg.items)if(d.items.has(it.id)){const bb=z2(it);t.strokeRect(bb.x0-2/s,bb.y0-2/s,bb.x1-bb.x0+4/s,bb.y1-bb.y0+4/s)}t.restore()}}}const m=this.hideSelBox(d);if(this.sel&&this.sel.page===n&&!m){const w=this.selectionBox();if(w){const x=wm(this.doc);t.save(),t.strokeStyle=x?i.mark:"#f7bc4c",`;

// 3. Don't swallow Shift/Ctrl+Click on turnHandle
const t3 = `const T=!this.hideSelBox(this.sel)&&this.selectionBox();if(T&&Je(s,this.turnHandle(T))<18/this.zoom){`;
const r3 = `const T=!(ev&&(ev.shiftKey||ev.ctrlKey))&&!this.hideSelBox(this.sel)&&this.selectionBox();if(T&&Je(s,this.turnHandle(T))<18/this.zoom){`;

// 4. Clean point Shift/Ctrl+Click (mark multi, remove carried, clear sel if empty) & don't swallow Shift/Ctrl+Click on existing selection box
const t4 = `if(p){if(ev&&(ev.shiftKey||ev.ctrlKey)){const d=(this.sel&&this.sel.page===t)?this.sel:{page:t,strokes:new Set,items:new Set,points:new Set,shapes:new Set};d.points.has(p)?d.points.delete(p):d.points.add(p);this.sel=d,this.redraw(),this.emit();return}if(!(this.sel&&this.sel.page===t&&!this.hideSelBox(this.sel)&&this.sel.points.has(p)&&this.sel.points.size>1)){this.drag={k:"point",page:t,id:p,from:s,moved:!1,pick:!1};return}}if(this.sel&&this.sel.page===t&&!this.hideSelBox(this.sel)){`;
const r4 = `if(p){if(ev&&(ev.shiftKey||ev.ctrlKey)){const d=(this.sel&&this.sel.page===t)?this.sel:{page:t,strokes:new Set,items:new Set,points:new Set,shapes:new Set};d.carried&&d.carried.delete(p),d.points.has(p)?d.points.delete(p):d.points.add(p),d.multi=!0,this.sel=(d.points.size||d.shapes.size||d.strokes.size||d.items.size)?{...d}:null,this.redraw(),this.emit();return}if(!(this.sel&&this.sel.page===t&&!this.hideSelBox(this.sel)&&this.sel.points.has(p)&&this.sel.points.size>1)){this.drag={k:"point",page:t,id:p,from:s,moved:!1,pick:!1};return}}if(this.sel&&this.sel.page===t&&!(ev&&(ev.shiftKey||ev.ctrlKey))&&!this.hideSelBox(this.sel)){`;

// 5. Fix Shift/Ctrl+Click on strokes, shapes, items (no expandGeo pulling in endpoints/edges, set multi, clean deselect)
//    AND separate direct click on a shape v from its endpoints (select only v.id, drag uses whole:d)
const t5 = `if(g){if(isM){d.strokes.has(g.id)?d.strokes.delete(g.id):d.strokes.add(g.id);this.sel=d,this.redraw(),this.emit();return}d.strokes.add(g.id)}else if(v||k){const shId=(v??k).id;if(isM){d.shapes.has(shId)?d.shapes.delete(shId):d.shapes.add(shId);this.expandGeo(n,d);this.sel=d,this.redraw(),this.emit();return}d.shapes.add(shId)}else if(y&&!w){if(isM){d.items.has(y.id)?d.items.delete(y.id):d.items.add(y.id);this.sel=d,this.redraw(),this.emit();return}d.items.add(y.id)}else{this.sel=null,this.drag={k:"lasso",page:t,path:[s],free:this.selectMode!=="rect",touch:this.selectMode==="object",...w?{item:w.id}:{}},this.emit();return}if(this.expandGeo(n,d),(this.selectMode==="object"||(v==null?void 0:v.kind)==="angle"||(v==null?void 0:v.kind)==="right")&&v){`;
const r5 = `if(g){if(isM){d.strokes.has(g.id)?d.strokes.delete(g.id):d.strokes.add(g.id),d.multi=!0,this.sel=(d.points.size||d.shapes.size||d.strokes.size||d.items.size)?{...d}:null,this.redraw(),this.emit();return}d.strokes.add(g.id)}else if(v||k){const shId=(v??k).id;if(isM){if(d.shapes.has(shId)){d.shapes.delete(shId),d.side&&d.side.shape===shId&&(d.side=void 0)}else d.shapes.add(shId);d.multi=!0,this.sel=(d.points.size||d.shapes.size||d.strokes.size||d.items.size)?{...d}:null,this.redraw(),this.emit();return}d.shapes.add(shId)}else if(y&&!w){if(isM){d.items.has(y.id)?d.items.delete(y.id):d.items.add(y.id),d.multi=!0,this.sel=(d.points.size||d.shapes.size||d.strokes.size||d.items.size)?{...d}:null,this.redraw(),this.emit();return}d.items.add(y.id)}else{if(isM)return;this.sel=null,this.drag={k:"lasso",page:t,path:[s],free:this.selectMode!=="rect",touch:this.selectMode==="object",...w?{item:w.id}:{}},this.emit();return}if(this.expandGeo(n,d),v){`;

const checks = [
  ['t1', t1, r1],
  ['t2', t2, r2],
  ['t3', t3, r3],
  ['t4', t4, r4],
  ['t5', t5, r5],
];

for (const [name, target] of checks) {
  const count = code.split(target).length - 1;
  console.log(`- ${name}: count = ${count}`);
  if (count !== 1) {
    throw new Error(`Target ${name} count is ${count}, expected 1! Aborting.`);
  }
}

for (const [, target, rep] of checks) {
  code = code.replace(target, rep);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully applied separate object & multi-select clean highlight patch!');
