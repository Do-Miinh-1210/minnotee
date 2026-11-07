const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const src = path.join(__dirname, '..', 'Resources', 'Whiteboard');
const dest = path.join(__dirname, '..', 'MinNote_App', 'resources', 'app', 'dist');
const appFolder = path.join(__dirname, '..', 'MinNote_App', 'resources', 'app');
const asarFile = path.join(__dirname, '..', 'MinNote_App', 'resources', 'app.asar');

function copyRecursive(s, d) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
  const entries = fs.readdirSync(s, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(s, entry.name);
    const destPath = path.join(d, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('[MinNote] Syncing Resources/Whiteboard -> MinNote_App/resources/app/dist...');
copyRecursive(src, dest);
console.log('[MinNote] Sync finished successfully.');

try {
  console.log('[MinNote] Packing app.asar with @electron/asar...');
  execSync(`npx @electron/asar pack "${appFolder}" "${asarFile}"`, { stdio: 'inherit' });
  console.log('[MinNote] app.asar updated successfully!');
} catch (err) {
  console.warn('[MinNote] Could not pack app.asar (non-fatal):', err.message);
}
