console.log('loading alexa remote sleep...')
module.exports = class AlexaRemoteSleep {       
    constructor(context)
    {
        this.ctx = context;
    }    

    valid(command) {
        return command.indexOf("sleep") > -1;
    }

    execute(command) {
        const path = require('path');        
        const process = require('child_process');   // The power of Node.JS
        var cmd = path.join(this.ctx.pluginsDir, 'alexa-remote-sleep', 'bin','psshutdown.exe') + ' /accepteula -d -t 0';
        console.log(cmd);
        var ls = process.exec(cmd);

        ls.stdout.on('data', function (data) {
        console.log('stdout: <' + data + '> ');

        });

        ls.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
        });

        ls.on('close', function (code) {
        console.log('child process exited with code ' + code);
        });
    }
}