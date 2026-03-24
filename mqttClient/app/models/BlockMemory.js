'use strict';

var Chat = require('./Chat.model');
var Comment = require('./Comment.model');
var SensorData = require('./SensorData.model');

class BlockMemory {
    constructor() {
        this.status = 'available';
        this.memory = [];
        this.valuesSetup =[];
    }

    setup(value){
        this.valuesSetup =value;
    }

    add(record) {
        this.memory.push(record);
    }

    isFull() {
        return this.memory.length === 1000;
    }

    isAvailable() {
        return !(this.isFull() || this.status == 'pending');
    }

    clearMemory() {
        this.memory = []
    }

    saveAll() {
        var self = this;
        this.status = 'pending';
        var chat=[];
        //console.log("Save alll...............");
        var comment=[];
        var sensor=[];
        this.memory.forEach(element => {
            var jsonData={data:element.content};
            try{
                jsonData =JSON.parse(element.content);
            }
            catch(ie){

            }
            var record  = {    topic:element.topic,
                            content:jsonData,
                            time:element.time
                        };
            if(element.topic.includes("/chat/")){
                chat.push(record);
            }
            else if(element.topic.includes("/comment/")){
                comment.push(record);
            }
            else{
                sensor.push(record);
            }   
        });
        
        //console.log("Save chat.", chat);
        if(this.memory.length>0){
            if(chat.length>0){
                //console.log("Save chat detail",chat);
                Chat.insertMany(chat, function (err, data) {
                    if (err) {
                      //console.log("err" ,err);
                    }
                    self.status= 'idle';
                    self.clearMemory();
                    //console.log("laptop" ,data);
                });
            }
            if(comment.length>0){
                //console.log("Save 2");
                Comment.insertMany(comment, function (err, data) {
                    if (err) {
                        //console.log("err",err);
                    }
                    else{
                        comment=[];
                        self.status= 'idle';
                        self.clearMemory();
                    }
                });
            }
            if(sensor.length>0){
                //console.log("Save 3");
                SensorData.insertMany(sensor, function (err, data) {
                    if (err) {
                        //console.log("err",err);
                    }
                    else{
                        sensor=[];
                        self.status= 'idle';
                        self.clearMemory();
                    }
                });
            }
            
        }
        else
        {
            self.status= 'idle';
            self.clearMemory();
        }
        
    }
}

module.exports = BlockMemory;