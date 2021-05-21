'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var BalanceSchema = new Schema({
  user_id:{
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  legacy_user_id: Number,
  eth_address:{
    address:String,
    public:String,
    private:String,
    wif:String,
    w_pass:String,
    destination_tag:String
  },
  btc_address:{
    address:String,
    public:String,
    private:String,
    wif:String,
    w_pass:String,
    destination_tag:String
  },
  e_bal:{
    type: Number
  },
  b_bal:{
    type: Number
  },
  p_bal:{
    type: Number
  },
  pz_bal:{
    type:Number
  },
  u_bal:{
   type:Number
  },
  pb_bal:{
    type:Number
  },
  total_coupons:{
    type:Number,
    default:0
  },
  last_updated:{
  	type: Date,
    default: new Date()
  }
});

module.exports = mongoose.model('Balance', BalanceSchema);