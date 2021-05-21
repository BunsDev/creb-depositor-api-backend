'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var CoinSchema = new Schema({
  user_id:{
  	type: Schema.Types.ObjectId,
  	ref: 'User'
  },
  coin_name: String,
  description: String,
  coin_type: String,
  short_name: String,
  logo: String,
  purchaseURI: String,
  transferURI: String,
  isWallet:{
    type: Boolean,
    default: false
  },
  decimal_limit: Number,
  icon: String,
  status: {
  	type: Boolean,
  	default: true
  },
  is_token:{
    type:Boolean,
    default:false
  },
  platform:String,
  abi:[],
  contract_address:String,
  created_date:{
  	type: Date,
  	default: Date.now()
  }
});

module.exports = mongoose.model('Coin', CoinSchema);