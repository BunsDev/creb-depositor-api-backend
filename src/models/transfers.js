'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Transfers = new Schema({

  USDT:{
    total_added_usd: Number,
    total_added_crypto: Number,
    fee_in_usd: Number,
    fee_in_crypto: Number,
    final_transfer_amount: Number,
    to_address: String,
    transaction_hash:String,
    transfer_status: String
  },
  ETH:{
    total_added_usd: Number,
    total_added_crypto: Number,
    fee_in_usd: Number,
    fee_in_crypto: Number,
    final_transfer_amount: Number,
    to_address: String,
    transaction_hash:String,
    transfer_status: String
  },
  BTC:{
    total_added_usd: Number,
    total_added_crypto: Number,
    fee_in_usd: Number,
    fee_in_crypto: Number,
    final_transfer_amount: Number,
    to_address: String,
    transaction_hash:String,
    transfer_status: String

  },

  created_at: {
  	type: Date,
  	default: Date.now()
  },
  status: {type: Boolean, default: false},
  confirmed: {type: Boolean, default: false},
  counter: Number,
  start_time: Date,
  active_phase: {type: Boolean, default: false},
  end_time: Date,
  updated_at:Date
});

module.exports = mongoose.model('Transfer', Transfers);