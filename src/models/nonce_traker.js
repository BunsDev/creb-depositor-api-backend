'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema;

const nonce_tracker = new Schema({
    nonce:{
        type: Number
    },
    created_at: {
        type: Date,
        default: new Date()
    }
})

module.exports = mongoose.model('Nonce_tracker', nonce_tracker);