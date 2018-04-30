const axios = require('axios');
const Store = require('electron-store');
const store = new Store();
const backendUrl = "https://alexaremotedesktop.com/";
const ipcRenderer = require('electron').ipcRenderer;
function install(packagename, version) {
    ipcRenderer.send('installplugin', { name: packagename, version: version });
}

function uninstall(packagename, version) {
    ipcRenderer.send('uninstallplugin', { name: packagename, version: version });
}

ipcRenderer.on('refreshplugin', function (event, token) {
    loadData('');
    var errElm = document.getElementById('error');
    errElm.className = errElm.className + ' is-hidden';
});

ipcRenderer.on('error', function (event, err) {
    var errElm = document.getElementById('error');
    errElm.className = errElm.className.replace(/\bis-hidden\b/,'');
    document.getElementById('errorbody').innerHTML = err;

});

function makeButton(plugins, pkg) {

    if (plugins[pkg.name] === undefined) {
        return `<button class="button is-pulled-right is-primary is-small" onclick="install('${pkg.name}','${pkg.version}')">Install</button>`;
    }
    else {
        var r = '';
        if (plugins[pkg.name] !== pkg.version) {
            r += `<button class="button is-pulled-right is-primary is-small" onclick="install('${pkg.name}','${pkg.version}')">Update</button>`;
        }
        else {
            r += `<button disabled class="button is-pulled-right is-success is-small" onclick="install('${pkg.name}','${pkg.version}')">Installed</button>`;
        }

        r += `<button class="button is-pulled-right is-danger is-small" onclick="uninstall('${pkg.name}','${plugins[pkg.name]}')">Uninstall</button>`;
        return r;
    }
}
function loadData(text) {
    axios.get(backendUrl+'api/plugins?q=' + text || '').then(res => {
        const plugins = store.get('plugins', {})
        var elm = document.getElementById('pluginlist');
        var html = "";
        res.data.objects.forEach(element => {
            html += `<tr><td>${element.package.name}</td><td>${element.package.description || ''}</td><td> ${makeButton(plugins, element.package)}</td></tr>`;
        });
        elm.innerHTML = html;
    })
}

document.addEventListener('DOMContentLoaded', function () {
    loadData('');
    var s = document.getElementById('search');
    s.onclick = () => {
        loadData(document.getElementById('searchinput').value);
    }


    var shell = require('electron').shell;
    //open links externally 
   var a = document.getElementById('link');
        a.addEventListener('click', (event) => {
            event.preventDefault();
            shell.openExternal(a.href);
        }) 
    var shell = require('electron').shell;
    //open links externally 
   var a = document.getElementById('link');
        a.addEventListener('click', (event) => {
            event.preventDefault();
            shell.openExternal(a.href);
        }) 
    
});