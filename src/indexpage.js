 
    document.addEventListener('DOMContentLoaded', function () {  


        var ipcRenderer = require('electron').ipcRenderer;
  
        ipcRenderer.send('getaccesstoken', 'getToken');
        ipcRenderer.on('access-token-reply', function(event, token) {
          console.log(arguments);
          window.location.href = "plugins.html"
        });
      })