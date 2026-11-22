// Thu nhỏ hiệu ứng chọn/hover trong hình học:
//  - viền sáng của đường được chọn: +4 → +2.5 (alpha .6 → .5)
//  - viền sáng nét bút được chọn:   +6 → +4
//  - điểm: vòng 1.8×dotR → 1.35×dotR (nét 2.5 → 1.8), chấm đặc 0.8×dotR → 0.75×dotR
// Chạy lại nhiều lần vẫn an toàn.
const fs = require('fs');
const file = 'Resources/Whiteboard/assets/index-CTbULhps.js';
let s = fs.readFileSync(file, 'utf8');
const pairs = [
  ['t.arc(T.x,T.y,Math.max(5,this.dotR()*1.8),0,Math.PI*2),t.strokeStyle="#0d9488",t.lineWidth=2.5/s,t.stroke(),t.beginPath(),t.arc(T.x,T.y,Math.max(2.5,this.dotR()*.8),0,Math.PI*2)',
   't.arc(T.x,T.y,this.dotR()*1.35+1/s,0,Math.PI*2),t.strokeStyle="#0d9488",t.lineWidth=1.8/s,t.stroke(),t.beginPath(),t.arc(T.x,T.y,Math.max(2,this.dotR()*.75),0,Math.PI*2)'],
  ['t.globalAlpha=.6,gd(t,{points:w.geo.points,shapes:[{...j,color:"#0d9488",width:(j.width||2)+4}]},x,{hidePoints:!0})',
   't.globalAlpha=.5,gd(t,{points:w.geo.points,shapes:[{...j,color:"#0d9488",width:(j.width||2)+2.5}]},x,{hidePoints:!0})'],
  ['t.globalAlpha=.45,Na(t,{...st,color:"#0d9488",width:(st.width||2)+6})',
   't.globalAlpha=.45,Na(t,{...st,color:"#0d9488",width:(st.width||2)+4})'],
];
let changed = 0;
for (const [a, b] of pairs) {
  if (s.includes(b)) continue;
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error('Expected exactly 1 match, got ' + n + ' for: ' + a.slice(0, 70));
  s = s.replace(a, b); changed++;
}
fs.writeFileSync(file, s);
console.log('Applied ' + changed + ' change(s)');
