console.log('loading remote execute plugin...')
module.exports = class RemoteExecture {

    valid(command) {
        return command.indexOf("execute") > -1;
    }

    execute(command) {
        command = command.replace('execute ', '')
        const process = require('child_process');   // The power of Node.JS
        var ls = process.exec(command);

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