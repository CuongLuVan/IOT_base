const mongoose = require('mongoose');
const mongoConfig = require('../config/mongoConfig');
const Schema = mongoose.Schema;

// Connecting to the database
// mongoose.set('useCreateIndex', true);
// mongoose.connect(mongoConfig.dbConfig, {useNewUrlParser: true, useUnifiedTopology: true}).then(() => {
//     console.log("Successfully connected to the database cron");
// }).catch(err => {
//     console.log('Could not connect to the database. Exiting now...', err);
// });

let DataDelete = new Schema({
    table:{
        type: String
    },
    data: {
        type: Object
    },
    value: {
        type: Number
    },
    originId: {
        type: Number
    },
    time: {
        type: Number,
        default: Date.now()
    }
});
module.exports = mongoose.model('delete_data', DataDelete);