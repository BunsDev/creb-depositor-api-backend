const Web3 = require('web3');

const db = require('../db/database')
var config = require('../config/index');
var deposit = require('./process_deposits')

var tokens = process.env.TOKENS  || config.TOKENS;
var tokenLength = tokens.length ;
var interval = 60000 //initial interval 2 sec
var count = 0;

//start deamon
startDeamon()

exports.updateToken = function(req,res){
    tokens = process.env.TOKENS || tokens;
    interval = process.env.INTERVAL || interval;
    console.log('------------------------------------------')
    console.log('Updated token listener interval to ', interval, '& added Token :', tokens[tokens.length-1]);
    console.log('------------------------------------------')

    res.send({status: true, message: 'token information updated!'})
}

function startDeamon() {
    // if(count > tokenLength){
    //     count = 0;
    // }
    // if(config.TOKEN_LISTERS[count] == 'undefined' || config.TOKEN_LISTERS[count] == null){
    //     count = 0;
    // }
    // // console.log(config.TOKENS[config.TOKEN_LISTERS[count]])/
    // count++;
    deposit.ercTokenListener(config.TOKENS['USDT'])
    setTimeout(startDeamon, interval)
}


 

//

// getWeb3 = function(){
//     return new Web3(new Web3.providers.HttpProvider(config.INFURA_URL));
// }
// var web3 = getWeb3();

// setInterval(async function(){
//     //get last updated block
//     db.getLastUpdatedBlock('ETH')
//     .then(async lastUpdatedBlock=>{
//         var latestBlock = await web3.eth.getBlockNumber();
//         if(lastUpdatedBlock && latestBlock){   
//             latestBlock -= 2; 
//             console.log("ETH",latestBlock, lastUpdatedBlock.block_number)
//             if(latestBlock  > lastUpdatedBlock.block_number){
//                 var blockInfo = await web3.eth.getBlock(lastUpdatedBlock.block_number + 1, true)
//                 if(blockInfo){ 
//                     //update last updated block
//                     // console.log(blockInfo)
//                     var updated = await db.updateBlock('ETH', blockInfo.number);
//                     if(updated){ 
//                         //process deposits
//                         deposit.processEtherTransactions(blockInfo.transactions)
//                     }
//                 }
//             }
//         }
//     })
// },10000)
