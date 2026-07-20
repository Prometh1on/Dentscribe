import { app, BrowserWindow, dialog, session } from 'electron';
import { join } from 'node:path';
import { getDatabase } from './db';
import { registerAllIpcHandlers } from './ipc';

const isDev = process.env.NODE_ENV === 'development';

function createMainWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: 'DentiScribe AI',
    backgroundColor: '#0b1220',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Compiled main lives at dist/main; Next's static export (`output: 'export'`) writes to
    // src/renderer/out (relative to the Next project root), not dist/renderer/out — verified
    // by actually running the build, not assumed. Two levels up from dist/main is the repo root.
    win.loadFile(join(__dirname, '../../src/renderer/out/index.html'));
  }
}

app
  .whenReady()
  .then(() => {
    const db = getDatabase();
    registerAllIpcHandlers(db);

    // Electron grants every permission request by default (mic, camera, geolocation,
    // notifications, ...) unless a handler says otherwise. Only the recording feature
    // needs anything here, so only 'media' is allowed — everything else is denied.
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(permission === 'media');
    });

    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  })
  .catch((error: unknown) => {
    // Without this, a startup failure (missing native module, corrupted DB key, disk full,
    // ...) surfaced only as a silent unhandled-rejection warning — no window, no explanation,
    // the user just sees nothing happen. Verified this exact gap by actually launching the
    // packaged app against a missing native binary.
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('DentiScribe AI failed to start', message);
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
