const {
    app,
    BrowserWindow,
    ipcMain
} = require('electron')

function createWindow() {
    let win = new BrowserWindow({
        width: 240,
        height: 320,
        // autoHideMenuBar: true, //remove menubar but save minimize maxmize controls
        // frame: false, //remove menubar and control
        webPreferences: {
            nodeIntegration: true
        }
    })
    win.loadURL(`file://${__dirname}/index.html`)
}

app.on('ready', () => {
    createWindow()
})