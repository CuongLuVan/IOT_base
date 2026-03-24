
const knex = require('../../config/knex.js');
var mySQLConfig = new MySQLConfig();
var squel = require("squel");

class AQIManager {
    constructor() {
        this.types = ['PM2p5', 'PM10'];
    }

    getCurrentAQIFromDb() {
        return new Promise((resolve,reject)=> {
            var query = "SELECT a.station_id as station_id, a.aqi as aqi, l.location_lat as lat, l.location_long as lon, l.content as content FROM sparc_aqi a "+
                        "JOIN sparc_location_sensor l "+
                        "WHERE a.station_id = l.station_id AND time = (SELECT time FROM sparc_aqi ORDER BY time DESC LIMIT 1) AND l.deleteflag !=1";
                        knex.raw(query.toString()).then((result)=> {
                resolve(result);
            })
        });
    }

    getCurrentAQI(){
        return new Promise((resolve,reject)=> {
            this.getStations().then((stations)=> {
                var promises = [];
                var time = this.getCurrentTime();
                stations.forEach(station=> {
                    promises.push(this.calculateAQI(time, station.stationId).then((aqi)=> {
                        station.aqi = aqi;
                    }));
                })
                Promise.all(promises).then(()=> {
                    resolve(stations);
                })
            })
        });
    }

    doJob() {
        var time = this.getCurrentTime();
        this.saveAQI(time);
    }

    saveAQI(time) {
        this.getCurrentAQI().then((stations)=> {
            var values = [];
            stations.forEach(station=> {
                values.push({time: time, station_id: station.stationId, aqi: station.aqi});
            })
            var query = squel.insert()
                        .into("sparc_aqi")
                        .setFieldsRows(values);
                        knex.raw(query.toString());
            
        });
    }

    getStations() {
        var query = squel.select().from("sparc_location_sensor")
        .field("station_id as stationId")
        .field("location_lat as lat")
        .field("location_long as lon")
        .field("content")
        .where("deleteflag != 1");
        return new Promise((resolve, reject)=> {
            knex.raw(query.toString()).then(function(stations) {
                resolve(stations);
            }).catch(function(err){ 
                return reject(err);
            })
        });
    }

    calculateAQI(time, stationId) {
        return new Promise((resolve, reject)=> {
            this.getAverageTwelve(time, stationId).then((averageValues)=>{
                var nowcast = this.getNowcast(averageValues);
                var aqi = 0;
                this.types.forEach(type => {
                    if(averageValues[0][type] == null || averageValues[1][type] == null || averageValues[2][type] == null) return;
                    var aqiTmp = 0; 
                    var BPAndI = this.getBPAndI(nowcast[type], type);
                    aqiTmp = (BPAndI[1].I - BPAndI[0].I) / (BPAndI[1][type] - BPAndI[0][type]) * (nowcast[type] - BPAndI[0][type]) + BPAndI[0].I;
                    aqi = Math.max(aqi, aqiTmp);
                });
                resolve(aqi);
            });
        });
    }

    getNowcast(averageValues) {
        var weight = this.getWeight(averageValues);
        var result = {};
        this.types.forEach(type=> {
            result[type] = this.getNowcastByWeight(weight[type], averageValues, type);
        });
        return result;
    }

    getNowcastByWeight(weight,averageValues, type) {
        var nowcast = 0;
        if(weight==0.5) {
            for(var i = 1; i<=12; i++) {
                nowcast += Math.pow(0.5, i) * averageValues[i-1][type];
            }
        } else {
            var numerator = 0;
            var denominator = 0;
            for(var i = 1; i<=12; i++) {
                numerator += Math.pow(weight, i-1) * averageValues[i-1][type];
                denominator +=Math.pow(weight, i-1);
            }
            nowcast = numerator/denominator;
        }
        return nowcast;
    }

    getWeight(averageValues) {
        var weight = {
            PM2p5: 0,
            PM10:0
        };
        var cMin = {}, cMax = {};
        this.types.forEach(type=> {
            cMin[type] = null;
            cMax[type] = null;
        });
        averageValues.forEach(value => {
            this.types.forEach(type=> {
                cMin[type] = this.findMin(cMin[type], value[type]);
                cMax[type] = this.findMax(cMax[type], value[type]);
            })
        });
        this.types.forEach(type=> {
            weight[type] = cMin[type]/cMax[type] <= 0.5 ? 0.5 : cMin[type]/cMax[type];
        })
        return weight;
    }

    /* 
    get average values of 12 hours
    */
    getAverageTwelve(time, stationId){
        var promises = [];
        for(var i=0; i<12; i++) {
            promises.push(this.getHourAverageIndex(time-i*3600, stationId));
        }
        return new Promise((resolve, reject)=>{
            Promise.all(promises).then((result)=>{
                var data = [];
                result.forEach(hourValue => {
                    var tmp = {};
                    this.types.forEach(type => {
                        tmp[type] = hourValue[0][type];
                    });
                    data.push(tmp);
                });
                resolve(data);
            })
        });
    }

    /* 
    get average value of specific hour
    */
    getHourAverageIndex(time, stationId){
        var fromTime = time - 3600;
        var query = squel.select().from("sparc_sensor_data")
        .field("AVG(PM2p5) as PM2p5")
        .field("AVG(PM10) as PM10")
        // .field("AVG(Temperature) as Temperature")
        // .field("AVG(Humidity) as Humidity")
        .where("Time > ?", fromTime)
        .where("Time < ?", time)
        .where("station_id = ?", stationId);
        return new Promise( ( resolve, reject ) => {
            knex.raw(query.toString()).then(function(result) {  
                resolve( result);
            }).catch(function(err){ 
                return reject(err);
            } )
        } );
    }

    getCurrentTime() {
        var time = new Date();
        return time.getTime()/1000;
    }

    findMin(a,b) {
        if(a == null && b == null) return null;
        if(a == null || b == null) return a == null ? b : a;
        return a < b ? a : b;
    }

    findMax(a,b) {
        if(a == null && b == null) return null;
        if(a == null || b == null) return a == null ? b : a;
        return a > b ? a : b;
    }

    getBPAndI(value, type) {
        var config = this.getConfig();
        for(var i = 0; i < config.length; i++) {
            if(config[i][type]>value) {
                return [config[i-1], config[i]];
            }
        }
    }

    getConfig() {
        return [
            {
                I: 0,
                PM2p5: 0,
                PM10: 0
            },
            {
                I: 50,
                PM2p5: 25,
                PM10: 50
            },
            {
                I: 100,
                PM2p5: 50,
                PM10: 150
            },
            {
                I: 150,
                PM2p5: 80,
                PM10: 250
            },
            {
                I: 200,
                PM2p5: 150,
                PM10: 350
            },
            {
                I: 300,
                PM2p5: 250,
                PM10: 420
            },
            {
                I: 400,
                PM2p5: 350,
                PM10: 500
            },
            {
                I: 500,
                PM2p5: 1000,
                PM10: 1000
            }
        ]
    }

    getAqiData(stationId) {
        var currentTime = this.getCurrentTime();
        var fromTime = currentTime-24*3600;
        var query = squel.select().from("sparc_aqi")
        .where("Time > ?", fromTime)
        .where("Time < ?", currentTime)
        .where("station_id = ?", stationId);
        return new Promise( ( resolve, reject ) => {
            knex.raw(query.toString()).then(function(result) {  
                resolve( result);
            }).catch(function(err){ 
                return reject(err);
            } )
        });
    }

    getFielDataRecent(stationId) {
        var currentTime = this.getCurrentTime();
        var fromTime = currentTime-24*3600;
        var query = squel.select().from("sparc_sensor_data")
        .where("Time > ?", fromTime)
        .where("Time < ?", currentTime)
        .where("station_id = ?", stationId);
        return new Promise( ( resolve, reject ) => {
            knex.raw(query.toString()).then(function(result) {  
                resolve( result);
            }).catch(function(err){ 
                return reject(err);
            } )
        });
    }

}

module.exports = AQIManager;