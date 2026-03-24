const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let CommentBlog = new Schema({
    comment_id: {
        type: Number
    },
    topic: {
        type: String
    },
    content:{
        type: Object
    },
    time: {
        type: Number,
        default: Date.now()
    },
    delete:{
        type: Boolean,
        default: false
    }
});

// Export the model
module.exports = mongoose.model('commentblogs', CommentBlog);