const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const zipPath = path.join(distDir, 'MinNote_v0.8.1_PureJS_Desktop.zip');
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log('[MinNote] Dang dong goi MinNote_App thanh zip portable bang tar...');
const tarCmd = `tar -a -cf "${zipPath}" -C "MinNote_App" .`;
execSync(tarCmd, { stdio: 'inherit' });

console.log(`[MinNote] Da dong goi thanh cong: ${zipPath}`);
