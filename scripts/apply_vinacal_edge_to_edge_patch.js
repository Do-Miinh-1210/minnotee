const fs = require('fs');

// 2. Update Resources/Whiteboard/assets/casio-calc.css
const cssPath = 'Resources/Whiteboard/assets/casio-calc.css';
let cssCode = fs.readFileSync(cssPath, 'utf8');

const regexCss = /\.calc-vinacal-iframe\s*\{[^}]*\}/;
const replaceCss = `.calc.calc-vinacal-model {
  padding: 6px 0 0 0 !important;
  gap: 0 !important;
  width: 312px !important;
  background: linear-gradient(#3b3b3f,#2a2a2d) !important;
  border-radius: 18px !important;
  overflow: hidden !important;
}
.calc.calc-vinacal-model .calc-title {
  padding: 0 10px 4px 10px !important;
}
.calc-vinacal-iframe {
  width: 100% !important;
  height: 632px !important;
  border: none !important;
  border-radius: 0 0 18px 18px !important;
  display: block !important;
  background: transparent !important;
  overflow: hidden !important;
}`;

if (!regexCss.test(cssCode)) {
  console.error('Regex for calc-vinacal-iframe not matched!');
  process.exit(1);
}
cssCode = cssCode.replace(regexCss, replaceCss);
fs.writeFileSync(cssPath, cssCode, 'utf8');
console.log('casio-calc.css updated successfully!');

// 3. Update Resources/Whiteboard/assets/vinacal/index.html
const htmlPath = 'Resources/Whiteboard/assets/vinacal/index.html';
let htmlCode = fs.readFileSync(htmlPath, 'utf8');
const customStyle = `<style>
html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  overflow: hidden !important;
  width: 100% !important;
}
#stage {
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  overflow: hidden !important;
}
.calc-wrap {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  overflow: hidden !important;
}
.calc {
  width: 100% !important;
  overflow: hidden !important;
}
.shell {
  border-radius: 0 0 18px 18px !important;
  box-shadow: none !important;
}
.lcd-frame {
  left: calc(var(--px) * 18) !important;
  width: calc(var(--px) * 684) !important;
  border-radius: calc(var(--px) * 8) !important;
}
.lcd-frame::before {
  inset: calc(var(--px) * -5) calc(var(--px) * -6) calc(var(--px) * -10) !important;
  border-radius: calc(var(--px) * 12) !important;
}
.lcd-status {
  left: calc(var(--dot) * 2.2) !important;
  width: calc(100% - var(--dot) * 4.4) !important;
}
.lcd-body {
  left: calc(var(--dot) * 2.2) !important;
  width: calc(100% - var(--dot) * 4.4) !important;
}
</style>
</head>`;

if (!htmlCode.includes('</head>')) {
  console.error('</head> in vinacal/index.html not found!');
  process.exit(1);
}
htmlCode = htmlCode.replace('</head>', customStyle);
fs.writeFileSync(htmlPath, htmlCode, 'utf8');
console.log('vinacal/index.html updated successfully!');
