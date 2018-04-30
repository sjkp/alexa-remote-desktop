const { app } = require('electron');
var path = require('path'),
    fs = require('fs'),
    async = require('async'),
    AppDirectory = require('appdirectory')

function getPlugins(plugins) {
    var mapped = []
    Object.getOwnPropertyNames(plugins).forEach(function (name) {
        mapped.push({
            name: name,
            version: plugins[name]
        })
    })
    console.log(mapped);
    return mapped
}

function getPluginPackage(plugin, callback) {
    var context = this
    var name = plugin.name
    var version = plugin.version
    // Load the package.json in either the linked dev directory or from the downloaded plugin
    async.map(
        [version],
        function (version, callback) {
            var packagePath = path.join(context.pluginsDir, name, 'package.json')
            console.log(packagePath);
            fs.readFile(packagePath, {encoding:'utf8'}, function (err, result) {
                if(err) return callback()
                callback(null, {
                    name: name,
                    version: version,
                    config: JSON.parse(result)
                })
            })
        },
        function (err, results) {
            // If neither file is found, or there was an unexpected error then fail
            var result = results[0] || results[1]
            if (err || !result) return callback(err || 'ENOENT')
            callback(null, result)
        })
}

function loadPlugin(context, results, callback) {
    var modules = []
    var dependencies = []
    try {
        for(var i = 0, n = results.length; i < n; i++) {
            var plugin = results[i]
            var main = plugin.config.main
            var name = plugin.name
            var version = plugin.version
            var depName = name.replace(/-/g, '.')
            var file = path.resolve(path.join(context.pluginsDir, name), main)
            var Plugin = require(file)
            var mod = new Plugin(context)
            modules.push(mod)
            dependencies.push(depName)
        }
    } catch (err) {
        console.log('error in loadPlugin ', err);
        return callback(err)
    }
    console.log('modules', modules);
    callback(null, dependencies, modules)
}

function pluginDir()
{
    var appDir = app.getPath('userData'); // path.dirname(process.mainModule.filename)
    console.log('appDir: ' + appDir);
    return path.join(appDir, 'plugins');
}

function load(appContext, plugins, callback) {
    
    

    var context = {
        plugins: plugins,
        pluginsDir: path.join(pluginDir(), 'node_modules'),
        appContext: appContext
    }
    console.log(context);
    async.map(
        getPlugins(context.plugins),
        getPluginPackage.bind(context),
        function (err, results) {
            if (err) return callback(err)
            loadPlugin(context, results, callback)
        })
}

function runnpm(cmd, name, callback)
{
    const process = require('child_process');   // The power of Node.JS
    var ls = process.exec('npm ' +cmd+ ' --prefix "' + pluginDir() + '" ' + name);

    ls.stdout.on('data', function (data) {
        console.log('stdout: <' + data + '> ');
    });

    ls.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
        callback(data);
    });

    ls.on('close', function (code) {
        console.log('child process exited with code ' + code);
        if (code==0)
            callback(null);
    });
}

function install(name, callback)
{
   runnpm('install', name, callback);
}

function uninstall(name, callback)
{
   runnpm('uninstall', name, callback);
}

module.exports = {
    load: load,
    install: install,
    uninstall: uninstall
}