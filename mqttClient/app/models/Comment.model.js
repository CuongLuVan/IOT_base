const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let Comment = new Schema({
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
module.exports = mongoose.model('comment', Comment);