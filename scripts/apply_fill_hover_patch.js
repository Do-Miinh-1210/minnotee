const fs = require('fs');

const filePath = 'Resources/Whiteboard/assets/index-CTbULhps.js';
let code = fs.readFileSync(filePath, 'utf8');

const t1 = `if(this.gridHoverAt(n,o),this.tool.k==="geo"||this.tool.k==="select"||this.tool.k==="shape"&&Up.includes(this.tool.t)){const a=this.doc.pages[n],l=Tt(a.geo),c=this.tool.k==="geo"&&this.tool.t!=="move",u=this.tool.k==="shape"?this.pointTouched(a,l,o):c?this.pointNear(a,l,o,!0):this.pointNear(a,l,o,this.tool.k==="select"),sh=(!u&&(this.tool.k==="select"||this.tool.k==="geo"||(this.tool.k==="shape"&&Up.includes(this.tool.t))))?$0(a.geo.shapes,l,o,this.tol(),this.revealHidden()):null,shId=sh?sh.id:null;if(this.lineStart&&this.lineStart.page===n&&this.tool.k==="shape"&&(this.lineHover=u&&u!==this.lineStart.id?{at:l.get(u),id:u}:{at:((s=this.gridHover)==null?void 0:s.p)??o},this.redraw()),u!==(((i=this.hover)==null?void 0:i.point)??null)||shId!==(((s=this.hover)==null?void 0:s.shape)??null)||((r=this.hover)==null?void 0:r.page)!==n){this.hover={page:n,point:u,shape:shId};const p=this.tool.k==="select"||this.tool.k==="geo";this.scroller.style.cursor=(u||shId)&&p?"pointer":"",this.redraw()}}}`;

const r1 = `if(this.gridHoverAt(n,o),this.tool.k==="geo"||this.tool.k==="select"||this.tool.k==="fill"||this.tool.k==="shape"&&Up.includes(this.tool.t)){const a=this.doc.pages[n],l=Tt(a.geo),c=(this.tool.k==="geo"&&this.tool.t!=="move")||this.tool.k==="fill",u=this.tool.k==="shape"?this.pointTouched(a,l,o):c?this.pointNear(a,l,o,!0):this.pointNear(a,l,o,this.tool.k==="select"),sh=(!u&&(this.tool.k==="select"||this.tool.k==="geo"||(this.tool.k==="shape"&&Up.includes(this.tool.t))))?$0(a.geo.shapes,l,o,this.tol(),this.revealHidden()):null,shId=sh?sh.id:null;if(this.lineStart&&this.lineStart.page===n&&this.tool.k==="shape"&&(this.lineHover=u&&u!==this.lineStart.id?{at:l.get(u),id:u}:{at:((s=this.gridHover)==null?void 0:s.p)??o},this.redraw()),u!==(((i=this.hover)==null?void 0:i.point)??null)||shId!==(((s=this.hover)==null?void 0:s.shape)??null)||((r=this.hover)==null?void 0:r.page)!==n){this.hover={page:n,point:u,shape:shId};const p=this.tool.k==="select"||this.tool.k==="geo"||this.tool.k==="fill";this.scroller.style.cursor=(u||shId)&&p?"pointer":"",this.redraw()}}}`;

const count = code.split(t1).length - 1;
console.log('Target t1 count:', count);
if (count !== 1) {
  console.error('Cannot find t1!');
  process.exit(1);
}

code = code.replace(t1, r1);
fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully patched hoverAt for fill tool!');
