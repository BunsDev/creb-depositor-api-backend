var util = require('../util/web3')
var db = require('../db/database')
var { ABI } = require('../util/abi')
var api = require('./api');
var config = require('../config/index')
var funding =require('./auto_token_transfers')

var walletObj;
// updateWallets()
async function updateWallets(){
    var wallets  = await db.getUserWallets()
    if(wallets.length>0)
        walletObj = wallets;
    
    console.log('Wallets updated: ', walletObj.length)
    setTimeout(updateWallets, 100 * 1000)
}




//process all events 
processTransactions = async function(transactions, coinData){
    var walletObj = await db.getUserWallets(coinData.SHORT_NAME)
    var wallets = walletObj.map(function(obj){return obj.address}).filter(function(element){return (element !== undefined && element !== '')})
    if(wallets.length>0){
        for (var i = 0; i < transactions.length; i++){
            var event = transactions[i]
            var receiver = event.returnValues.to.toLowerCase();
            var amount = parseFloat(event.returnValues.value)
            if(wallets.indexOf(receiver) > -1 && amount > 1){
                var user = walletObj.find(function(element){ return element.address == receiver})
                //insert into ledger
                var transaction = {
                    user_id: user.user_id,
                    wallet_type:coinData.SHORT_NAME,
                    from_address: event.returnValues.from.toLowerCase(),
                    to_address: receiver,
                    value: parseFloat(util.noExponents(event.returnValues.value / (10 ** coinData.DECIMALS))).toFixed(8),
                    transaction_fee : 0,
                    requested_value: parseFloat(util.noExponents(event.returnValues.value / (10 ** coinData.DECIMALS))).toFixed(8),
                    activity_type:'Deposit',
                    transaction_hash: event.transactionHash,
                    block_confirmations:0,
                    status:0,
                    created_at: new Date()
                }
                db.addDeposit(transaction)
                .then(d=>{
                    console.log('Deposit added to user account...');
                })
            }
        }
    }
}

//listen to the previous transactions for particular coin
exports.ercTokenListener = function(coinData){
    //get last block number and compare with lastest block
    var web3 = util.getWeb3()
    db.getLastUpdatedBlock(coinData.SHORT_NAME)
    .then(async lastUpdatedBlock=>{
        var latestBlock = await web3.eth.getBlockNumber();
        if(lastUpdatedBlock && latestBlock){
            latestBlock -= 2
            if(latestBlock - lastUpdatedBlock.block_number > 50) {
				latestBlock = lastUpdatedBlock.block_number + 50;
            }
            var lastBlock = lastUpdatedBlock.block_number + 1;
            console.log(coinData.SHORT_NAME, lastBlock, latestBlock);
            if(latestBlock > lastBlock){
                var contractInstance = new web3.eth.Contract(ABI, coinData.CONTRACT_ADDRESS);
                var pastTxs = contractInstance.getPastEvents('Transfer', {fromBlock:lastBlock , toBlock:latestBlock})
				pastTxs.then(events=>{
                    //update latestblock
					db.updateBlock(coinData.SHORT_NAME, latestBlock)
					.then(r=>{
						if(r){
                            if(events.length >0 )
                                processTransactions(events, coinData)
                        }
					})
				})
				.catch(r=>console.log(r))
            }
        }
    })
}


//process ether transactions
module.exports.processEtherTransactions = async function(transactions){
    // var addrs = transactions.filter(function(el){ return el.to !== null && el.to !== ''}).map(function(t){ return t.to.toLowerCase()})
    // var walletObj = await db.getWalletsByAddresses(addrs)
    var walletObj = await db.getUserWallets('ETH')
    var wallets = walletObj.map(function(obj){return obj.address}).filter(function(element){return (element !== undefined && element !== '')})
    if(wallets.length > 0){
        for (var i = 0; i < transactions.length; i++){
            var transaction = transactions[i];
            if(transaction.to && transaction.to !== null){
                let receiver = transaction.to.toLowerCase();
                var sender = transaction.from.toLowerCase();
                if(receiver !== null && wallets.indexOf(receiver) > -1 && sender != config.FUNDING_WALLET){
                    var user = walletObj.find(function(element){ return element.address == receiver})
                    if(user){ 
                        //add deposit to unconfirmed transcation
                        var transaction = {
                            user_id: user.user_id,
                            wallet_type:'ETH',
                            from_address: transaction.from,
                            to_address: receiver,
                            value:(transaction.value/1e18).toFixed(8),
                            transaction_fee : 0,
                            requested_value: (transaction.value/1e18).toFixed(8),
                            activity_type:'Deposit',
                            transaction_hash: transaction.hash,
                            block_confirmations:0,
                            status:0,
                            created_at: new Date()
                        }
                        db.addDeposit(transaction)
                        .then(d=>{
                            console.log('Deposit added to user account...');
                        })
                    }
                }
            }
        }
    }
}



function syncLoop(iterations, process, exit){
    var index = 0,
        done = false,
        shouldExit = false;
    var loop = {
        next:function(){
            if(done){
                if(shouldExit && exit){
                    return exit(); // Exit if we're done
                }
            }
            // If we're not finished
            if(index < iterations){
                index++; // Increment our index
                process(loop); // Run our process, pass in the loop
            // Otherwise we're done
            } else {
                done = true; // Make sure we say we're done
                if(exit) exit(); // Call the callback on exit
            }
        },
        iteration:function(){
            return index - 1; // Return the loop number we're on
        },
        break:function(end){
            done = true; // End the loop
            shouldExit = end; // Passing end as true means we still call the exit callback
        }
    };
    loop.next();
    return loop;
}

function updateTransactionStatus(transactions){
    var myLoop = syncLoop(transactions.length, function(loop){
        setTimeout(function(){
            var i = loop.iteration();
            var transaction = transactions[i]
            console.log('in intereation =========== ', i)
            db.updateTransactionStatus(transaction, transaction.confirmations)
            .then(d=>{
                // tranfer to admin wallet
                if(transaction.wallet_type == 'ETH'){
                    api.withdrawEtherFromUser(transaction)
                }
                // if(transaction.wallet_type == 'USDT' && transaction.value > config.MIN_TOKEN_TRANSFER){
                //     funding.fundUserWallet(transaction.to_address, transaction)
                // }
            })
    	    loop.next();
        }, 1500);
    }, function(){
        console.log('done');
    });
}
//process pending transactions
function processPendingTransactions(){
    console.log('================ Process pending ethereum pending transactions')
    db.getPendingDeposits()
    .then(async transactions=>{
        if(transactions){
            var web3 = util.getWeb3()
            var latest_block = await web3.eth.getBlockNumber();
            var tasks =[]
            for (let i = 0; i < transactions.length; i++) {
                var transaction = transactions[i];
                var receipt = await web3.eth.getTransaction(transaction.transaction_hash);
                if(latest_block - receipt.blockNumber > 5){
                    transaction['confirmations'] = latest_block - receipt.blockNumber
                    tasks.push(transaction)
                }
            }
            setTimeout(function(){
                if(tasks.length>0)
                    updateTransactionStatus(tasks)
            }, 1000)
        }
    })
}

setInterval(function(){
    processPendingTransactions()
},50  *1000)