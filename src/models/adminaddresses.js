'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var AdminAddressSchema = new Schema({
  user_id:{
  	type: Schema.Types.ObjectId,
  	ref: 'User'
  },
  wallet_type: String,
  address: String,
  public: String,
  private: String,
  wif: String,
  w_pass: String,
  destination_tag: String,
  created_at: {
  	type: Date,
  	default: Date.now()
  }
});

module.exports = mongoose.model('AdminAddress', AdminAddressSchema);