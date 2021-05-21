
'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema;

var PoritifolioLedgerSchema = new Schema({
    user_id:{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    activity_type:String, //Deposit, Withdraw
    coin_type:String,
    coin_amount:Number,
    pricing:{},
    portifolio_amount:Number,
    fee_percent:Number,
    fee_amount:Number,
    final_amount:Number,
    moved_to_portifolio:{
      type:Boolean,
      default:false
    },
    moved_at:Date,
    created_at:{
        type:Date,
        default:new Date()
    }
})

module.exports = mongoose.model('Portifolio_Ledgers_Backup', PoritifolioLedgerSchema); 