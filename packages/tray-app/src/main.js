const { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const { deskManager, deskConfig } = require('idasen-controller');

const ICON_PATH = path.join(__dirname, '..', 'assets', 'icon.png');

let tray = null;
let window = null;

const createWindow = () => {
  window = new BrowserWindow({
    width: 320,
    height: 420,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Collapse back into the tray instead of quitting when the window loses focus.
  window.on('blur', () => {
    if (window && !window.webContents.isDevToolsOpened()) {
      window.hide();
    }
  });

  window.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });
};

const toggleWindowFromTray = () => {
  if (!window) return;

  if (window.isVisible()) {
    window.hide();
    return;
  }

  const trayBounds = tray.getBounds();
  const windowBounds = window.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
  let y = process.platform === 'darwin'
    ? Math.round(trayBounds.y + trayBounds.height)
    : Math.round(trayBounds.y - windowBounds.height);

  x = Math.min(Math.max(x, display.workArea.x), display.workArea.x + display.workArea.width - windowBounds.width);
  y = Math.min(Math.max(y, display.workArea.y), display.workArea.y + display.workArea.height - windowBounds.height);

  window.setPosition(x, y, false);
  window.show();
  window.focus();
};

const createTray = () => {
  const icon = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Idasen desk height controller');

  tray.on('click', toggleWindowFromTray);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show controller', click: toggleWindowFromTray },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
};

const registerIpcHandlers = () => {
  ipcMain.handle('idasen:get-saved-config', async () => {
    const config = deskConfig.loadConfig();
    return {
      deskId: config.deskId || null,
      presets: config.presets || {},
      connected: !!deskManager.desk
    };
  });

  ipcMain.handle('idasen:scan', async () => {
    const devices = await deskManager.getAvailableDevices();
    return devices.map((device) => ({
      name: device?.advertisement?.localName || device?.name || 'Unnamed device',
      id: device?.id || device?.uuid || device?.address
    }));
  });

  ipcMain.handle('idasen:connect', async (_event, deskId) => {
    const result = await deskManager.connectAsync(deskId);
    if (result === 'success') {
      const config = deskConfig.loadConfig();
      config.deskId = deskId;
      deskConfig.saveConfig(config);
    }
    return result;
  });

  ipcMain.handle('idasen:status', async () => {
    if (!deskManager.deskController) {
      throw new Error('Not connected to a desk yet.');
    }
    return await deskManager.deskController.desk.getCurrentHeightAndSpeedAsync();
  });

  ipcMain.handle('idasen:move-to', async (_event, heightCm) => {
    if (!deskManager.deskController) {
      throw new Error('Not connected to a desk yet.');
    }
    await deskManager.deskController.moveToAsync(heightCm / 100);
    return 'ok';
  });

  ipcMain.handle('idasen:move-up', async () => {
    if (!deskManager.deskController) {
      throw new Error('Not connected to a desk yet.');
    }
    await deskManager.deskController.moveUpAsync();
    return 'ok';
  });

  ipcMain.handle('idasen:move-down', async () => {
    if (!deskManager.deskController) {
      throw new Error('Not connected to a desk yet.');
    }
    await deskManager.deskController.moveDownAsync();
    return 'ok';
  });

  ipcMain.handle('idasen:stop', async () => {
    if (!deskManager.deskController) {
      throw new Error('Not connected to a desk yet.');
    }
    await deskManager.deskController.stopAsync();
    return 'ok';
  });

  ipcMain.handle('idasen:preset-add', async (_event, { name, heightCm }) => {
    const config = deskConfig.loadConfig();
    config.presets = config.presets || {};
    config.presets[name] = heightCm;
    deskConfig.saveConfig(config);
    return config.presets;
  });

  ipcMain.handle('idasen:preset-remove', async (_event, name) => {
    const config = deskConfig.loadConfig();
    config.presets = config.presets || {};
    delete config.presets[name];
    deskConfig.saveConfig(config);
    return config.presets;
  });

  ipcMain.handle('idasen:preset-goto', async (_event, name) => {
    const config = deskConfig.loadConfig();
    const heightCm = config.presets && config.presets[name];
    if (heightCm === undefined) {
      throw new Error(`Preset "${name}" not found.`);
    }
    if (!deskManager.deskController) {
      throw new Error('Not connected to a desk yet.');
    }
    await deskManager.deskController.moveToAsync(heightCm / 100);
    return 'ok';
  });
};

app.whenReady().then(() => {
  if (app.dock) {
    app.dock.hide();
  }
  app.isQuitting = false;

  registerIpcHandlers();
  createWindow();
  createTray();
});

app.on('window-all-closed', (event) => {
  // Keep living in the tray instead of quitting when the window is closed.
  event.preventDefault();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
