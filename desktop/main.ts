import { app, BrowserWindow, dialog, Menu, session } from 'electron';
import path from 'node:path';
import { desktopConfig, desktopUrl } from './config';
import { handleDesktopResources, registerDesktopScheme } from './protocol';

app.setName(desktopConfig.title);
app.setPath('userData', path.join(app.getPath('appData'), desktopConfig.packageName));
registerDesktopScheme();

async function createWindow() {
  const window = new BrowserWindow({
    ...desktopConfig.window,
    title: desktopConfig.title,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.once('ready-to-show', () => window.show());
  await window.loadURL(desktopUrl);
}

function reportStartupError(error: unknown) {
  console.error(error);
  dialog.showErrorBox(desktopConfig.title, '無法載入遊戲資源，請重新打包或確認應用程式檔案完整。');
  app.quit();
}

app.whenReady().then(async () => {
  handleDesktopResources();
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { role: 'togglefullscreen' }],
    },
    { role: 'windowMenu' },
  ]));
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch(reportStartupError);
    }
  });
}).catch(reportStartupError);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
