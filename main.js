const {app, BrowserWindow, ipcMain, Notification } = require("electron");
const  path  = require("path");
const  fs = require("fs");
const convert = require("xml-js");
const child = require('child_process');
const log = require('electron-log');
const { dialog } = require('electron');

let mainWindow;

function loadMainWindow(){
     mainWindow = new BrowserWindow({
        width : 600,
        height: 400,
        webPreferences: {            
            contextIsolation: false,
            javascript: true,
            nodeIntegration: true
          },
    });
    if(process.platform === "win32"){
        app.setAppUserModelId(app.name);
    }
    log.transports.file.level = true;
    log.debug("########--------Application Initialised--------########");    
    log.info("Dir path: "+__dirname);
    log.info("Log path: "+app.getPath('logs'));
    mainWindow.removeMenu();        
    log.debug("Application Menu removed");
    mainWindow.resizable = false;
    mainWindow.loadFile(path.join(__dirname, "index.html"));
    log.debug("Application started successfully.");
    const notify = new Notification();
    notify.title = "Connect Started";
    notify.body = "Connect App has been started";
    notify.show();
}
app.whenReady().then(loadMainWindow);
app.on("window-all-closed", () => {  
    log.debug("######--------Application closed--------#######");
    log.debug("-----------------------------------------------");
    app.quit();
});
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        loadMainWindow();
    }
 });

ipcMain.handle('show-notification', (event, args) => {
    const notify = new Notification();
    notify.title = args[0];
    notify.body = args[1];
    notify.show();
    log.debug("Notification: "+args[0]+"|"+args[1]);
});

ipcMain.handle('show-dialog', (event, args) => {
    const propOptions = {
        type: args[0],
        title: args[1],
        message: args[2]
    };
    dialog.showMessageBoxSync(null, propOptions);
    log.debug("Dialog displayed: "+args[0]+"|"+args[1]+"|"+args[2]);
});