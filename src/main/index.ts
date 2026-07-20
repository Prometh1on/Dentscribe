import { app, BrowserWindow, dialog, session } from 'electron';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { getDatabase } from './db';
import { registerAllIpcHandlers } from './ipc';
import { startStaticServer } from './staticServer';

const isDev = process.env.NODE_ENV === 'development';

async function createMainWindow(): Promise<void> {
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
    // Serving over a local HTTP server rather than win.loadFile()'s file:// protocol: Next's
    // root-absolute asset paths (`/_next/static/...`) resolve to the filesystem root under
    // file://, breaking every script/css load (confirmed via CDP network capture). An HTTP
    // origin resolves those same root-absolute paths correctly.
    const rootDir = join(__dirname, '../../src/renderer/out');
    const { port } = await startStaticServer(rootDir);
    win.loadURL(`http://127.0.0.1:${port}/index.html`);
  }
}

function reportStartupFailure(error: unknown): void {
  // Without this, a startup failure (missing native module, corrupted DB key, disk full,
  // static server failing to bind, ...) surfaces only as a silent unhandled-rejection
  // warning — no window, no explanation, the user just sees nothing happen. Verified
  // this exact gap twice by actually launching the packaged app: once against a missing
  // native binary, and again when `createMainWindow` became async and a bare `void` call
  // let its rejection bypass this handler entirely (fixed by awaiting it below).
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  writeFileSync(join(tmpdir(), 'dentiscribe-startup-error.log'), message);
  dialog.showErrorBox('DentiScribe AI failed to start', message);
  app.quit();
}

app
  .whenReady()
  .then(async () => {
    const db = getDatabase();
    registerAllIpcHandlers(db);

    // Electron grants every permission request by default (mic, camera, geolocation,
    // notifications, ...) unless a handler says otherwise. Only the recording feature
    // needs anything here, so only 'media' is allowed — everything else is denied.
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(permission === 'media');
    });

    await createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow().catch(reportStartupFailure);
    });
  })
  .catch(reportStartupFailure);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
