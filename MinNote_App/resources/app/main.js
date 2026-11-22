const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let logFile = null;
function log(msg) {
  try {
    if (!logFile && app) {
      logFile = path.join(app.getPath('userData'), 'electron.log');
    }
    if (logFile) {
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
    }
  } catch (_) {}
}

log('=== MinNote Electron starting ===');

process.on('uncaughtException', (err) => {
  log('UNCAUGHT: ' + (err ? err.stack || err : 'unknown'));
});

Menu.setApplicationMenu(null);

let mainWindow = null;

function createWindow() {
  log('createWindow invoked');
  try {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: '#18181b',
      title: 'MinNote • Bảng Viết & Vẽ Hình Toán Học',
      icon: path.join(__dirname, 'dist', 'favicon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        sandbox: false,
        preload: path.join(__dirname, 'preload.js')
      },
      frame: true,
      show: true
    });

    const indexHtml = path.join(__dirname, 'dist', 'index.html');
    log('Loading: ' + indexHtml);
    mainWindow.loadFile(indexHtml);

    mainWindow.webContents.on('did-finish-load', () => {
      log('did-finish-load SUCCESS');
    });

    mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
      log(`CONSOLE [${level}] ${sourceId}:${line} -> ${message}`);
    });

    mainWindow.webContents.on('did-fail-load', (e, errCode, errDesc) => {
      log(`did-fail-load: ${errCode} ${errDesc}`);
    });

    mainWindow.webContents.on('render-process-gone', (e, details) => {
      log(`render-process-gone: ${JSON.stringify(details)}`);
    });

    mainWindow.on('closed', () => {
      log('mainWindow closed');
      mainWindow = null;
    });
  } catch (err) {
    log('createWindow error: ' + err.stack);
  }
}

app.whenReady().then(() => {
  log('app.whenReady');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(err => {
  log('whenReady error: ' + err.stack);
});

app.on('window-all-closed', () => {
  log('window-all-closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC cho Web UI
ipcMain.on('WINDOW_MINIMIZE', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('WINDOW_MAXIMIZE', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.on('WINDOW_CLOSE', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('TOGGLE_FULLSCREEN', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

// Upstream 1.0.7 features: TikZ, Typst, Formula (MHChem), Word, Google Drive
const tikz = require('./tikz.js');
const typst = require('./typst.js');
const formula = require('./formula.js');
const word = require('./word.js');
const drive = require('./drive.js');

ipcMain.handle('license-status', async () => ({ status: 'active', daysLeft: 9999, plan: 'ultra', owner: 'admin_matrixexamAI' }));
ipcMain.handle('license-activate', async () => ({ ok: true }));
ipcMain.handle('license-trial', async () => ({ ok: true }));

ipcMain.handle('render-formula', async (event, formulaStr, color, display) => {
  try {
    return formula.renderFormula(formulaStr, color, display);
  } catch (err) {
    log('render-formula error: ' + err.message);
    throw err;
  }
});

let pendingWordPath = null;

ipcMain.handle('pick-word', async () => {
  const { dialog } = require('electron');
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn tài liệu Word',
    properties: ['openFile'],
    filters: [
      { name: 'Tài liệu Word (*.docx, *.doc)', extensions: ['docx', 'doc'] },
      { name: 'Tất cả file', extensions: ['*'] }
    ]
  });
  if (res.canceled || !res.filePaths.length) {
    pendingWordPath = null;
    return false;
  }
  pendingWordPath = res.filePaths[0];
  return true;
});

ipcMain.handle('convert-word', async (event, explicitPath) => {
  try {
    const target = explicitPath || pendingWordPath;
    if (!target) return { error: 'noConverter' };
    const outPdf = word.convertWordToPdf(target);
    const buf = fs.readFileSync(outPdf);
    return { pdf: new Uint8Array(buf) };
  } catch (err) {
    log('convert-word error: ' + err.message);
    return { error: 'noConverter' };
  } finally {
    pendingWordPath = null;
  }
});

ipcMain.handle('drive-state', async () => drive.state(app.getPath('userData')));
ipcMain.handle('drive-sign-in', async () => drive.signIn(app.getPath('userData')));
ipcMain.handle('drive-sign-out', async () => drive.signOut(app.getPath('userData')));
ipcMain.handle('drive-request', async (event, req) => drive.request(app.getPath('userData'), req));


ipcMain.handle('open-file', async () => {
  const { dialog } = require('electron');
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Tài liệu (PDF, Word, Note)', extensions: ['pdf', 'docx', 'doc', 'nrn', 'json'] },
      { name: 'Tài liệu Word (*.docx, *.doc)', extensions: ['docx', 'doc'] },
      { name: 'Tài liệu PDF (*.pdf)', extensions: ['pdf'] },
      { name: 'Tất cả file', extensions: ['*'] }
    ]
  });
  if (res.canceled || !res.filePaths.length) return null;
  const picked = res.filePaths[0];
  const ext = path.extname(picked).toLowerCase();
  let finalPath = picked;
  if (ext === '.docx' || ext === '.doc') {
    finalPath = word.convertWordToPdf(picked);
  }
  const buf = fs.readFileSync(finalPath);
  return {
    doc: buf,
    name: path.basename(picked),
    path: finalPath,
    originalPath: picked
  };
});

ipcMain.handle('render-tikz', async (event, source, defs) => {
  try {
    return await tikz.renderTikz(source, defs);
  } catch (err) {
    log('render-tikz error: ' + err.message);
    throw err;
  }
});

ipcMain.handle('trace-tikz', async (event, source, defs) => {
  try {
    return await tikz.traceTikz(source, defs);
  } catch (err) {
    log('trace-tikz error: ' + err.message);
    throw err;
  }
});

ipcMain.handle('render-typst', async (event, source) => {
  try {
    return await typst.renderTypst(source);
  } catch (err) {
    log('render-typst error: ' + err.message);
    throw err;
  }
});

ipcMain.on('renderer-ready', () => {
  log('renderer-ready received');
});

ipcMain.on('CAPTURE_MINDMAP', async (event, data) => {
  try {
    if (!mainWindow) return;
    const { rect, action, treeData } = data || {};
    if (!rect) return;
    const r = {
      x: Math.max(0, Math.round(rect.x)),
      y: Math.max(0, Math.round(rect.y)),
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height))
    };
    const image = await mainWindow.webContents.capturePage(r);
    const dataUri = image.toDataURL();
    const payload = {
      type: 'MINDMAP_CAPTURED',
      action: action,
      dataUri: dataUri,
      treeData: treeData
    };
    mainWindow.webContents.send('MINDMAP_CAPTURED', payload);
  } catch (err) {
    log('CAPTURE_MINDMAP error: ' + (err ? err.stack || err : ''));
  }
});
