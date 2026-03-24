const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let VotePage = new Schema({
    link_pages: {
        type: String
    },
    number_read: {
        type: Number,
        default: 1
    },
    value_vote: {
        type: Number,
        default: 0
    },
    id_read: {
        type: Number,
        default: 0
    },
    note: {
        type: String
    },
    time: {
        type: Number,
        default: Date.now()
    }
});

// Export the model
module.exports = mongoose.model('vote_page', VotePage);