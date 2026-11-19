const fs = require('fs');

const filePath = 'Resources/Whiteboard/assets/index-CTbULhps.js';
let code = fs.readFileSync(filePath, 'utf8');

// Target 1: Add hideSelBox helper right before selectionBox()
const t1 = `selectionBox(){if(!this.sel)return null;`;
const r1 = `hideSelBox(d){if(!d||d.strokes.size||d.items.size)return!1;if(d.points.size+d.shapes.size===1)return!0;const pg=(this.view&&this.view.pages[d.page])||this.doc.pages[d.page];if(!pg||!d.shapes.size)return!1;const shs=pg.geo.shapes.filter(q=>d.shapes.has(q.id)),isL=q=>q.kind==="segment"||q.kind==="line"||q.kind==="ray"||q.kind==="extend";if(shs.length===1&&isL(shs[0])&&[...d.points].every(pt=>shs[0].pts.includes(pt)))return!0;if(shs.length===d.shapes.size&&shs.every(q=>isL(q)&&!q.group)&&d.carried&&[...d.points].every(pt=>d.carried.has(pt)))return!0;return!1}selectionBox(){if(!this.sel)return null;`;

// Target 2: Use hideSelBox(d) when deciding whether to draw the shaded selection box & handles
const t2 = `const m=d&&!d.strokes.size&&!d.items.size&&d.points.size+d.shapes.size===1;if(this.sel&&this.sel.page===n&&!m){`;
const r2 = `const m=this.hideSelBox(d);if(this.sel&&this.sel.page===n&&!m){`;

// Target 3: Don't draw glowing selection rings on auto-carried endpoints when only the segment/line was selected
const t3 = `if(d&&d.points.forEach(w=>p.add(w))){}`;
const r3 = `if(d){const hs=this.hideSelBox(d);d.points.forEach(w=>{(!hs||!d.carried||!d.carried.has(w))&&p.add(w)})}`;

// Target 4: Don't hit-test invisible rotate handle when selection box is hidden
const t4 = `const T=this.selectionBox();if(T&&Je(s,this.turnHandle(T))<18/this.zoom){`;
const r4 = `const T=!this.hideSelBox(this.sel)&&this.selectionBox();if(T&&Je(s,this.turnHandle(T))<18/this.zoom){`;

// Target 5: Allow dragging endpoints and avoid hitting invisible box handles/interior when selection box is hidden
const t5 = `if(!(this.sel&&this.sel.page===t&&this.sel.points.has(p)&&this.sel.points.size>1)){this.drag={k:"point",page:t,id:p,from:s,moved:!1,pick:!1};return}}if(this.sel&&this.sel.page===t){const x=this.selectionBox();`;
const r5 = `if(!(this.sel&&this.sel.page===t&&!this.hideSelBox(this.sel)&&this.sel.points.has(p)&&this.sel.points.size>1)){this.drag={k:"point",page:t,id:p,from:s,moved:!1,pick:!1};return}}if(this.sel&&this.sel.page===t&&!this.hideSelBox(this.sel)){const x=this.selectionBox();`;

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
console.log('Successfully applied segment no-selection-box patch!');
