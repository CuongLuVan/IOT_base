const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let VoteProduct = new Schema({
    id_product: {
        type: String
    },
    number_vote: {
        type: Number,
        default: 1
    },
    value_vote: {
        type: Number,
        default: 1
    },
    avarge_vote: {
        type: Number,
        default: 1
    },
    id_vote: {
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
module.exports = mongoose.model('vote_product', VoteProduct);