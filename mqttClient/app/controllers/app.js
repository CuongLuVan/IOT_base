var BlockMemory = require('../models/BlockMemory');

var memFirst = new BlockMemory();
var memSecond = new BlockMemory();
class App {
    constructor() {
        this.saveInterval =null;
    }

    onMessageData(topic, message,packet){
        var record ={topic:topic.toString('utf-8'),
                        content:message.toString('utf-8'),
                        time:new Date().getTime()
                    };
        //console.log("onMessageData",record);
        if (memFirst.isAvailable()) {
            memFirst.add(record);
        } else memSecond.add(record);
        if (memFirst.isAvailable()) {
            memSecond.status='available';
            memFirst.saveAll();
        } 
        else
        {
            memFirst.status='available';
            memSecond.saveAll();
        }
    }


    register(){
        let that = this;
        this.saveInterval = setInterval(function () {
            if (memFirst.isAvailable()) {
                memSecond.status='available';
                memFirst.saveAll();
            } 
            else
            {
                memFirst.status='available';
                memSecond.saveAll();
            }
        }, 4000)

    }
}

module.exports =  App;