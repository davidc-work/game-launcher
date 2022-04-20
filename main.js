const electron = require('electron');
const { app, BrowserWindow } = electron;
const path = require('path');
const { parentPort } = require('worker_threads');

const contextMenu = require('electron-context-menu');
contextMenu({
    showInspectElement: true
});

require('electron-reload')(__dirname);

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
    win.setMenu(null);

    return win;
}

app.whenReady().then(() => {
    const win = createWindow();

    app.on('activate', () => {
        if (!BrowserWindow.getAllWindows().length) createWindow();
    });

    const globalShortcut = electron.globalShortcut;

    globalShortcut.register('CommandOrControl+R', function () {
        win.reload();
    });

    globalShortcut.register('CommandOrControl+Shift+I', () => {
        win.webContents.isDevToolsOpened() ? win.webContents.closeDevTools() : win.webContents.openDevTools();
    });
});

app.on('window-all-closed', () => {
    if (process.platform != 'darwin') app.quit();
});