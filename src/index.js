const { app, Tray, Menu, BrowserWindow, Notification, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const io = require('socket.io-client');
const axios = require('axios');

const plugins = require('./plugins');

const Store = require('electron-store');
const store = new Store();

const backendUrl = "https://alexaremotedesktop.com/";

const iconPath = path.join(__dirname, 'icon.png');
let appIcon = null;
let win = null;
let modules = [];
let initialized = false;

const electronOauth2 = require('electron-oauth2');
//https://developer.amazon.com/blogs/post/Tx3CX1ETRZZ2NPC/Alexa-Account-Linking-5-Steps-to-Seamlessly-Link-Your-Alexa-Skill-with-Login-wit
var config = {
  clientId: 'amzn1.application-oa2-client.841837b2f5e744cc817bc5a8355dd2d4',
  clientSecret: '8286b7fa7ce54008e31b6a27e816a9d28c41c04c96ebf999cf97475212e7a26c',
  authorizationUrl: 'https://www.amazon.com/ap/oa',
  tokenUrl: 'https://api.amazon.com/auth/o2/token',
  useBasicAuthorizationHeader: false,
  redirectUri: 'http://localhost'
};

function getUser(accessToken) {
  return axios.get('https://api.amazon.com/user/profile?access_token=' + accessToken);
}

function createWindow() {
  win = new BrowserWindow({
    width: 800, height: 600/*frame: false*/, webPreferences: {
      webSecurity: false
    }
  })
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  //    win.loadURL('https://alexa.amazon.com');
  win.setMenu(null);
}

function setupSocketListener(socket, userid) {
  if (initialized){
    return;
  }
  if (userid != null) {
    initialized = true;
    socket.on('connect', function() {
      socket.emit('userid', userid);
    })    
    socket.on(userid, function (data) {
      console.log(data);

      if (typeof (data['cmd']) !== 'undefined') {
        modules.forEach(function (m) {
          if (m.valid(data.cmd)) {
            m.execute(data.cmd);
          }
        });
      }

    });
  }
  else {
    console.log('couldnt setup socket listener, no user');
  }
}

app.on('ready', function () {
  win = new BrowserWindow({ show: false });

  var userid = store.get('user', {}).user_id;

  var socket = io.connect(backendUrl);
  
  setupSocketListener(socket, userid);


  appIcon = new Tray(iconPath);
  var contextMenu = Menu.buildFromTemplate([
    {
      label: 'Toggle DevTools',
      accelerator: 'Alt+Command+I',
      click: function () {
        win.show();
        win.toggleDevTools();
      }
    },
    {
      label: 'Open',
      accelerator: 'Alt+Command+O',
      click: function () {
        createWindow();
        win.show();
        //win.toggleDevTools();
      }
    },
    {
      label: 'Quit',
      accelerator: 'Command+Q',
      selector: 'terminate:',
      click: function() {
        app.quit();
      }
    }
  ]);
  appIcon.setToolTip('Alexa Remote Desktop');
  appIcon.setContextMenu(contextMenu);


  const windowParams = {
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false
    }
  }

  const options = {
    scope: 'profile',
    // accessType: 'ACCESS_TYPE'
  };

  const myApiOauth = electronOauth2(config, windowParams);

  function loadAndSetUser(token, refresh) {
    console.log('token', token);
    // use your token.access_token
    return getUser(token.access_token).then(function (user) {
      store.set('user', user.data);
      store.set('token', token);
      setupSocketListener(socket, user.data);      
    }).catch(function (err) {

      console.log(err);
      if (!refresh) {
        myApiOauth.refreshToken(token.refresh_token)
          .then(newToken => {
            //use your new token
            loadAndSetUser(newToken, true);
          });
      }
    })
  }

  ipcMain.on('installplugin', (event, arg)=> {
    plugins.install(arg.name, (err) => {
      if (err)
      {
        let msg = 'unable to install plugin ' + arg.name + ': ' + err;
        console.log(msg);   
        event.sender.send('error', msg);     
      }
      else {
        var installedplugins = store.get('plugins', {});
        installedplugins[arg.name] = arg.version 
        store.set('plugins', installedplugins);
        loadPlugins(() => {
          event.sender.send('refreshplugin');
        });
      }
    });
  });

  ipcMain.on('uninstallplugin', (event, arg)=> {
    plugins.uninstall(arg.name, (err) => {
      if (err)
      {
        console.log('unable to uninstall plugin ' + arg.name);
        return;
      }
      var installedplugins = store.get('plugins', {});
      delete installedplugins[arg.name];
      store.set('plugins', installedplugins);
      loadPlugins(() => {
        event.sender.send('refreshplugin');
      });
    });
  });

  ipcMain.on('getaccesstoken', (event, arg) => {
    var token = store.get('token')
    if (token === undefined) {
      myApiOauth.getAccessToken(options)
        .then(token => {
          loadAndSetUser(token).then(() => {
            event.sender.send('access-token-reply', token.access_token);
          });
        });

    }
    else {
      myApiOauth.refreshToken(token.refresh_token)
        .then(newToken => {
          //use your new token
          loadAndSetUser(newToken, true).then(() => {
            event.sender.send('access-token-reply', token.access_token);
          });
        });
    }

  });

  function loadPlugins(callback) {

    plugins.load({ context: this }, store.get('plugins', {}), function (err, dependecies, m) {
      console.log('plugin load complete', dependecies, m);
      modules = m;
      if (callback)
        callback();
    });
  }
  loadPlugins();
});