//handle setupevents as quickly as possible
const setupEvents = require('./installers/setupEvents')
if (setupEvents.handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}

// ----------- installer stuff above for windows

// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const Store = require('electron-store');



// some const
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36';
const defaultWidth = 1270;
const defaultHeight = 750;



// portable use
// when you can to persist the data inside the executable directory just use this store config, please change the encryptionKey
// then you could use the app as a portable app with saved config, size and position is only saved on non portable versions of this app
const portable = false;
const encryptionKey = '****';



// persistent store
const store = portable ? new Store({ name: 'storage', fileExtension: 'db', cwd: process.cwd() + '/store', encryptionKey: encryptionKey }) : new Store();



// cause self-signed certificate
app.commandLine.appendSwitch('ignore-certificate-errors', true);



// dev
try {
  require('electron-reloader')(module)
} catch (_) {}



// event handlers
function handleReset(event) {
  store.clear();
}

function handleRestart(event) {
  app.quit();
  app.relaunch();
}

async function handleConfigLoad(event) {
  return store.get('config');
}

function handleConfigSave(event, config) {
  store.set('config', config);
}

// window handler
function handleWindow(mainWindow) {
  mainWindow.loadFile('./src/html/index.html');

  if (store.has('config')) {
    mainWindow.loadURL(store.get('config').url, {
      userAgent: userAgent
    });
  } else {
    mainWindow.loadFile('./src/html/config.html');
  }

  if (!store.has('init')) {
    store.set('init', true);
  }
}



function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: store.get('bounds')?.width || defaultWidth,
    height: store.get('bounds')?.height || defaultHeight,
    x: store.get('bounds')?.x || undefined,
    y: store.get('bounds')?.y || undefined,
    webPreferences: {
      nodeIntegration: true,
      spellcheck: true,
      preload: path.join(__dirname, '/src/js/preload.js'),
      allowDisplayingInsecureContent: true,
      allowRunningInsecureContent: true
    },

    icon: path.join(__dirname, '/src/img/128.png'),

    frame: true,
    movable: true,
    resizable: true,
    closable: true,
    darkTheme: false,
    autoHideMenuBar: true,
  });

  // set the main window title
  mainWindow.setTitle('HNS Camera Control');

  // disable automatic app title updates
  mainWindow.on('page-title-updated', function(e) {
    e.preventDefault()
  });

  // save bounds to store on close
  mainWindow.on("close", function() {
    if (store.has('init') && !portable) {
      store.set('bounds', mainWindow.getBounds());
    }
  });

  // and load the index.html of the app.
  handleWindow(mainWindow);
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ipcMain.on('reset', handleReset);
  ipcMain.on('restart', handleRestart);
  ipcMain.on('configSave', handleConfigSave);

  ipcMain.handle('configLoad', handleConfigLoad)

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  });
});



// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})



// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


