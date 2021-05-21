'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var crypto = require('crypto');

var LedgerSchema = new Schema({
  user_id:{
  	type: Schema.Types.ObjectId,
  	ref: 'User'
  },
  uniq_id: String,
  wallet_type: String,
  coin_id:{
    type: Schema.Types.ObjectId,
    ref: 'Coin'
  },
  from_address: String,
  to_address: String,
  to_bank: {
    type: Schema.Types.ObjectId,
    ref: 'BankAccounts'
  },
  value: Number,   //Requested Amount + transaction_fee 
  requested_value: Number, //Requested Amount
  transaction_fee: Number, // deposit or withdrawl fee  
  activity_type: String,
  transaction_hash: {
    type:String
  },
  block_confirmations: Number,
  status:{type:Number, default:0},
  confirmed: {type:Boolean, default: false},
  email_verified:{type:Boolean, default: false},
  admin_approved:{type:Boolean, default: false},
  remarks:String,
  is_taken: {type: Boolean ,default: false},
  created_at: {
  	type: Date,
  	default: new Date()
  },
  updated_at:Date
});

LedgerSchema
  .pre('save', function(next) {
    if (this.uniq_id) {
      return next();
    }else{
      let randcode = "";
      let possible = `${this.activity_type}0123456789`;
      for (var i = 0; i < 16; i++) {
          randcode += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      this.uniq_id = randcode.toUpperCase();
      mongoose
        .model('Coin')
        .findOne({short_name:this.wallet_type})
        .exec()
        .then(coinDetails=>{
          this.coin_id = coinDetails._id;
          next();
        })
    }
  });


module.exports = mongoose.model('Ledger', LedgerSchema);