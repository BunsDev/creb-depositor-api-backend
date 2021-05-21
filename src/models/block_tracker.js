'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema;

const block_tracker = new Schema({
   block_number:{
       type: Number
   },
   coin_type: {
       type:String
   },
   short_name:{
       type: String
   }

})

module.exports = mongoose.model('Block_tracker', block_tracker);