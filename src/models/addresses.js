'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var AddressSchema = new Schema({
  user_id:{
  	type: Schema.Types.ObjectId,
  	ref: 'User'
  },
  coin_type:String,
  wallet_type: String,
  address: String,
  public: String,
  private: String,
  wif: String,
  w_pass: String,
  destination_tag: String,
  confirmed_balance:{
    type:Number,
    default:0
  },
  onhold_balance:{
    type:Number,
    default:0
  },
  created_at: {
  	type: Date,
  	default: new Date()
  }
});
module.exports = mongoose.model('Address', AddressSchema);