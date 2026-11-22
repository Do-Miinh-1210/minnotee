const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../Resources/Whiteboard/assets/index-CTbULhps.js');
let code = fs.readFileSync(filePath, 'utf8');

const MARKER = '__MINNOTE_V66_RECORDER_STUDIO_PATCH__';
if (code.includes(MARKER)) {
  console.log('Patch v0.0.6.6 Screen Recorder Studio already applied.');
  process.exit(0);
}

// 1. Hook jne() to delegate to Pro Screen Recorder Studio (window.__MinNoteRecStudio)
const jneTarget = 'function jne({platform:e,name:t,saved:n,pageRect:o,onClose:s,notify:i,stopRef:r,remember:a}){';
if (!code.includes(jneTarget)) {
  throw new Error('Could not find jne() target in index-CTbULhps.js');
}

const jneReplacement = [
  'function __MinNoteRecHost(_p){',
  'const _ref=D.useRef(null),_pr=D.useRef(_p);_pr.current=_p;',
  'D.useEffect(()=>{',
  'const _el=_ref.current;if(!_el||!window.__MinNoteRecStudio)return;',
  'const _inst=window.__MinNoteRecStudio.mount(_el,{..._pr.current,fixMp4:yne});',
  'return()=>{_inst&&typeof _inst.unmount==="function"&&_inst.unmount();};',
  '},[]);',
  'return h.jsx("div",{ref:_ref});}',
  'function jne(_props){if(window.__MinNoteRecStudio&&typeof window.__MinNoteRecStudio.mount==="function")return h.jsx(__MinNoteRecHost,_props);return __jneOrig(_props);}',
  'function __jneOrig({platform:e,name:t,saved:n,pageRect:o,onClose:s,notify:i,stopRef:r,remember:a}){'
].join('');

code = code.replace(jneTarget, jneReplacement);

// 2. Hook Hpe() so videoFolder & saveVideo use our native WPF WebView2 bridge (no browser download UI!)
const hpeTarget = '...navigator.mediaDevices&&"getDisplayMedia"in navigator.mediaDevices?{saveVideo:async(t,n,o)=>(Z4(t,`${o}.${n}`),`${o}.${n}`)}:{},';
if (!code.includes(hpeTarget)) {
  throw new Error('Could not find Hpe() saveVideo target in index-CTbULhps.js');
}

const hpeReplacement = [
  '...navigator.mediaDevices&&"getDisplayMedia"in navigator.mediaDevices?{',
  'saveVideo:async(t,n,o)=>window.__MinNoteRecStudio?window.__MinNoteRecStudio.saveVideoDirect(t,n,o):(Z4(t,`${o}.${n}`),`${o}.${n}`),',
  '...(window.__MinNoteRecStudio&&window.__MinNoteRecStudio.videoFolderAdapter?{videoFolder:window.__MinNoteRecStudio.videoFolderAdapter}:{})',
  '}:{},'
].join('');

code = code.replace(hpeTarget, hpeReplacement);

// 3. Add "Cài đặt quay & lưu trữ..." button inside MinNote's main Settings modal videoFolder section
const settingsTarget = 'w&&h.jsxs(h.Fragment,{children:[h.jsx("h4",{children:kt.videoFolder}),h.jsx("div",{className:"folder-path",children:at}),h.jsxs("div",{className:"row",children:[w.choose&&h.jsx("button",{onClick:()=>w.choose().then(Ne=>Ne&&le(Ne)),children:kt.changeFolder}),h.jsx("button",{onClick:()=>w.open(),children:kt.openFolder})]})]})';
if (!code.includes(settingsTarget)) {
  throw new Error('Could not find Settings videoFolder target in index-CTbULhps.js');
}

const settingsReplacement = 'w&&h.jsxs(h.Fragment,{children:[h.jsx("h4",{children:kt.videoFolder}),h.jsx("div",{className:"folder-path",children:at}),h.jsxs("div",{className:"row",children:[w.choose&&h.jsx("button",{onClick:()=>w.choose().then(Ne=>Ne&&le(Ne)),children:kt.changeFolder}),h.jsx("button",{onClick:()=>w.open(),children:kt.openFolder}),window.__MinNoteRecStudio&&h.jsx("button",{onClick:()=>window.__MinNoteRecStudio.openSettings("storage",_s=>_s&&_s.folder&&le(_s.folder)),children:"Cài đặt quay & lưu trữ..."})]})]})';

code = code.replace(settingsTarget, settingsReplacement);

code += `\n/* ${MARKER} */\n`;
fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully applied v0.0.6.6 Screen Recorder Studio patch to index-CTbULhps.js!');
