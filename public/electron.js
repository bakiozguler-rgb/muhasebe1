const path = require('path');
const fs = require('fs');

const { app, BrowserWindow } = require('electron');
const isDev = !app.isPackaged;

// Donanımsal hızlandırmayı kapat - Windows'ta imleç kilitlenmesi/ui donması sorununu çözer
app.disableHardwareAcceleration();

const { Menu, ipcMain, dialog } = require('electron');

function createWindow() {
    console.log("Pencere oluşturuluyor...");
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'ikon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false,
        },
    });

    win.on('ready-to-show', () => {
        console.log("Pencere hazır, gösteriliyor.");
        win.show();
    });

    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error("Yükleme hatası:", errorCode, errorDescription);
    });

    win.maximize(); // Ekranın tam kaplanmasını sağlar
    win.removeMenu();

    win.webContents.on('context-menu', (event, params) => {
        const menu = Menu.buildFromTemplate([
            { role: 'cut', label: 'Kes' },
            { role: 'copy', label: 'Kopyala' },
            { role: 'paste', label: 'Yapıştır' },
            { type: 'separator' },
            { role: 'selectAll', label: 'Tümünü Seç' }
        ]);
        menu.popup(win, params.x, params.y);
    });

    // and load the index.html of the app.
    // In development, it loads from the local server
    // In production, it loads the built index.html
    win.loadURL(
        isDev
            ? 'http://localhost:3000'
            : `file://${path.join(__dirname, 'index.html')}`
    );

    // Open the DevTools only in development.
    if (isDev) {
        win.webContents.openDevTools();
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Klasör seçme handler'ı
ipcMain.handle('select-dirs', async (event, arg) => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (result.canceled) {
        return null;
    } else {
        return result.filePaths[0];
    }
});

// Yedek kaydetme handler'ı
ipcMain.handle('save-backup', async (event, folder, data) => {
    try {
        if (!fs.existsSync(folder)) return { success: false, error: 'Klasör bulunamadı' };
        const dosyaAdi = `otomatik_yedek_${new Date().toISOString().split("T")[0]}.json`;
        const tamYol = path.join(folder, dosyaAdi);
        fs.writeFileSync(tamYol, JSON.stringify(data, null, 2), 'utf8');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
