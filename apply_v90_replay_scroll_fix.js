const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'Resources', 'Whiteboard', 'assets', 'index-CTbULhps.js');
let src = fs.readFileSync(targetPath, 'utf8');

const fromStr = 'const playing=this._getActiveReplays().filter(r=>r.playing&&r.followCamera!==!1);';
const toStr = 'const playing=this._getActiveReplays().filter(r=>r.playing&&!r._editPreview&&!r.stopAfterStep&&r.followCamera!==!1);';

if (src.includes(toStr)) {
  console.log('Already patched _stepAutoFollow in index-CTbULhps.js');
} else {
  const idx = src.indexOf(fromStr);
  if (idx < 0) {
    throw new Error('Target _stepAutoFollow filter string not found in index-CTbULhps.js');
  }
  const second = src.indexOf(fromStr, idx + 1);
  if (second >= 0) {
    throw new Error('Multiple matches for _stepAutoFollow filter string in index-CTbULhps.js');
  }
  src = src.slice(0, idx) + toStr + src.slice(idx + fromStr.length);
  fs.writeFileSync(targetPath, src, 'utf8');
  console.log('Patched _stepAutoFollow in index-CTbULhps.js cleanly');
}
