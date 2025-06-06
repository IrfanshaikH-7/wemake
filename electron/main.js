const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const { mouse, keyboard } = require('@nut-tree-fork/nut-js');
const isDev = process.env.NODE_ENV === 'development';

// Configure mouse movement speed
mouse.config.autoDelayMs = 0;
mouse.config.mouseSpeed = 1000;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Set CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' ws: wss:;",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
          "style-src 'self' 'unsafe-inline';",
          "img-src 'self' data:;",
          "connect-src 'self' ws: wss: http: https:;"
        ].join(' ')
      }
    })
  });

  // Load the Vite dev server URL in development
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle window state
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when app is ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle IPC events
ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 0, height: 0 }
    });
    console.log('Available sources:', sources.map(s => ({ id: s.id, name: s.name })));
    return sources;
  } catch (error) {
    console.error('Error getting sources:', error);
    throw error;
  }
});

// Remote control handlers
ipcMain.handle('move-mouse', async (event, x, y) => {
  try {
    console.log('Moving mouse to:', x, y);
    await mouse.setPosition({ x, y });
  } catch (error) {
    console.error('Error moving mouse:', error);
    throw error;
  }
});

ipcMain.handle('mouse-click', async () => {
  try {
    console.log('Performing mouse click');
    await mouse.leftClick();
  } catch (error) {
    console.error('Error performing mouse click:', error);
    throw error;
  }
});

ipcMain.handle('mouse-right-click', async () => {
  try {
    console.log('Performing right click');
    await mouse.rightClick();
  } catch (error) {
    console.error('Error performing right click:', error);
    throw error;
  }
});

ipcMain.handle('mouse-double-click', async () => {
  try {
    console.log('Performing double click');
    await mouse.doubleClick();
  } catch (error) {
    console.error('Error performing double click:', error);
    throw error;
  }
});

ipcMain.handle('type-key', async (event, key) => {
  try {
    console.log('Typing key:', key);
    await keyboard.type(key);
  } catch (error) {
    console.error('Error typing key:', error);
    throw error;
  }
});

ipcMain.handle('press-key-combo', async (event, keys) => {
  try {
    console.log('Pressing key combo:', keys);
    await keyboard.pressKey(...keys);
  } catch (error) {
    console.error('Error pressing key combo:', error);
    throw error;
  }
});

ipcMain.on('app-quit', () => {
  app.quit();
}); 