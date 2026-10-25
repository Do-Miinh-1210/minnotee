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
