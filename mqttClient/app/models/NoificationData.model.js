const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let NoificationData = new Schema({
    id_user: {
        type: Number
    },
    title: {
        type: String
    },
    content: {
        type: String
    },
    type_noification:{
        type:Number
    },
    read:{
        type:Boolean
    },
    time: {
        type: Number,
        default: Date.now()
    }
});

// Export the model
module.exports = mongoose.model('noification_data', NoificationData);