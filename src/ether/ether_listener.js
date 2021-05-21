const Web3 = require('web3');

const config = require('../config/index')
const db = require('../db/database')
const deposit = require('./process_deposits')


getWeb3 = function(){
    return new Web3(new Web3.providers.HttpProvider(config.INFURA_URL));
}
var web3 = getWeb3();

setInterval(async function(){
    //get last updated block
    db.getLastUpdatedBlock('ETH')
    .then(async lastUpdatedBlock=>{
        var latestBlock = await web3.eth.getBlockNumber();
        if(lastUpdatedBlock && latestBlock){   
            latestBlock -= 2; 
            console.log("ETH",latestBlock, lastUpdatedBlock.block_number)
            if(latestBlock  > lastUpdatedBlock.block_number){
                var blockInfo = await web3.eth.getBlock(lastUpdatedBlock.block_number + 1, true)
                if(blockInfo){ 
                    //update last updated block
                    // console.log(blockInfo)
                    var updated = await db.updateBlock('ETH', blockInfo.number);
                    if(updated){ 
                        //process deposits
                        if(blockInfo.transactions.length > 0)
                            deposit.processEtherTransactions(blockInfo.transactions)
                    }
                }
            }
        }
    })
},10000)
