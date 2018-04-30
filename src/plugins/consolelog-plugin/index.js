console.log('loading console log plugin...')

module.exports = class consolelog {
    //Do something
    
    constructor(context){

    }

    valid(response) {
        return true;
    }

    execute(response) {
        console.log(response);
    }
}