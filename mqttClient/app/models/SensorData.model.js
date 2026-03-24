const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let SensorData = new Schema({
    topic: {
        type: String
    },
    content:{
        type: Object
    },
    time: {
        type: Number,
        default: Date.now()
    }
});

// Export the model
module.exports = mongoose.model('sensor_data', SensorData);