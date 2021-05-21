const addressValidator = require('wallet-address-validator')

const config = require('../config/index');
const db = require('../db/database')

var Web3=require('web3');
const utils =  require('ethereumjs-util')
const Tx = require('ethereumjs-tx')
var {ABI} = require('../util/abi');
var util = require('../util/web3')
getWeb3 = function(){
    return new Web3(new Web3.providers.HttpProvider(config.INFURA_URL));
}

//verify withdraw requests
function verifyTransactions(requests){
    return new Promise(async function(resolve, reject){
        for(i = 0;i < requests.length; i++){
            var request = requests[i];
            //validate sender address
            var validAddress = addressValidator.validate(request.to_address, 'BTC', config.NETWORK)
            if(!validAddress){
                //if not valid address update transaction as faild
                var updated = await db.updateFailedTransactionStatus(request);
                if(updated){
                    //delete request from requests
                    var removeIndex = requests.map(function(item) { return item._id; }).indexOf(request._id);
                    // remove object
                    requests.splice(removeIndex, 1);
                    i--;
                }
            }
        }
        setTimeout(function(){
            resolve(requests);
        },200)
    })
} 
function transferToAddress(record){
    return new Promise((resolve, reject)=>{
        rpc.requestNode('walletpassphrase', [config.WALLET_PASSWORD, 15])
        .then(d=>{
            rpc.requestNode('sendtoaddress', [record.to_address, record.value])
            .then(txn_id=>{
                if(txn_id)
                    resolve(txn_id)
                else
                    resolve(null)
            })
        })  
    })            
}
//transfer to many addresses
function tranferToMany(records, coin_type){
    return new Promise((resolve, reject)=>{
        var temp = {};
        var obj = null;
        for(var i=0; i < records.length; i++) {
            obj=records[i];
            if(!temp[obj.to_address]) {
                temp[obj.to_address] = obj;
            } else {
                temp[obj.to_address].value += obj.value;
            }
        }
        var result = [];
        for (var prop in temp)
        result.push(temp[prop]);
        var temp1 ={}
        var pars = [""]
        result.forEach(element => {
            temp1[element.to_address] = parseFloat(element.value.toFixed(8));
        });
        pars.push(temp1)
        rpc.requestNode('walletpassphrase', [config.WALLET_PASSWORD, 15]);                
        setTimeout(async function(){
            //send transaction
            var txn_id = await rpc.requestNode('sendmany', pars);
            if(txn_id){
                resolve(txn_id);
            }else{
                resolve(null)
            }
        },200)
    })
};
//updateTransactions status with hash
function updateTransactions(records, txn_id){
    return new Promise(async (resolve, reject)=>{
        for(i=0;i<records.length;i++){
            db.updateWithdrawStatus(records[i], txn_id);
        }
        setTimeout(function(){
            resolve(true);
        },2000)
    })
}
//process withdrawls
function processPendingWithdrawls(){
    //get pending withdrawls
    var currentTime = new Date();
    var lastTime = currentTime.setHours(currentTime.getHours() - 6*24);
    db.getPendingWithdrawRequests(config.WALLET_TYPE.BTC, lastTime)
    .then(pendingRequests=>{
        if(pendingRequests.length > 0){
            //verify transactions
            verifyTransactions(pendingRequests)
            .then(async verifiedTransactions=>{
                if(verifiedTransactions && verifiedTransactions.length === 1){
                    //send to address
                    transferToAddress(verifiedTransactions[0])
                    .then(txn_id=>{
                        if(txn_id){
                            db.updateWithdrawStatus(verifiedTransactions[0], txn_id)
                        }
                    })
                }
                if(verifiedTransactions && verifiedTransactions.length > 1){
                    //send many
                    var txn_id = await tranferToMany(verifiedTransactions)
                    if(txn_id){
                        await updateTransactions(verifiedTransactions, txn_id);
                    }
                }
            })
        }else{
            console.log('No pending withdrawls---------------------')
        }
    })
}


function sendEtherTransaction(from, to, amount, private){
    return new Promise(async (resolve, reject)=>{
        var web3 = getWeb3()
        var gasPrice = await web3.eth.getGasPrice();
        var gasLimit = 23000;
        var txCount = await web3.eth.getTransactionCount(from,'pending');
        var rawTransaction = {
            nonce: web3.utils.toHex(txCount),
            gasPrice: web3.utils.toHex(parseInt(gasPrice * 1.05)),
            gasLimit: web3.utils.toHex(gasLimit),
            to:to,
            value: web3.utils.toHex(web3.utils.toWei(amount)),
            chainId: config.CHAIN_ID
        }
        var privateKey = new Buffer.from(private, 'hex');
        var tx = new Tx(rawTransaction);
        tx.sign(privateKey);
        var serializedTx = tx.serialize();
        web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
        .then(receipt=>{
            console.log('Ether transfer to user wallet : ', receipt.transactionHash)
            resolve(receipt.transactionHash)
        })
        .catch(e=>{
            console.log(e)
        })
    })
}
function sendUSDTTransaction (from, to, amount, private){
    console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
    return new Promise(async (resolve, reject) =>{
        var web3 = getWeb3()
        var gasPrice = await web3.eth.getGasPrice();
        var gasLimit = 90000;
        var contractAddress = config.TOKENS.USDT.CONTRACT_ADDRESS
        var contractInstance = new web3.eth.Contract(ABI, contractAddress);
        contractInstance.methods.balanceOf(from).call()
        .then( async result=>{
            var tokenBal = result;
            var decimals = 6;
            if(tokenBal < amount *  (10** decimals)) 
                return;
            amount = util.noExponents(amount*  (10** decimals));
            var txCount = await web3.eth.getTransactionCount(from,'pending');
            let data = contractInstance.methods.transfer(to, amount).encodeABI();
            var rawTransaction = {
                nonce: web3.utils.toHex(txCount),
                gasPrice: web3.utils.toHex(parseInt(gasPrice*1.05)),
                gasLimit: web3.utils.toHex(gasLimit),
                to:contractAddress,
                data: data,
                value: "0x0",
                chainId: config.CHAIN_ID
            }
            var privateKey = new Buffer.from(private, 'hex');
            var tx = new Tx(rawTransaction);
            tx.sign(privateKey);
            var serializedTx = tx.serialize();
            web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
            .then(receipt=>{
                console.log('Tokens transfer to user wallet : ', receipt.transactionHash)
                resolve(receipt.transactionHash)
            })
            .catch(e=>{
                resolve(null)
            })
        })
    })
}

//process withdrawls
function processETHwithdrawl(){
    //get pending withdrawls
    var currentTime = new Date();
    var lastTime = currentTime.setHours(currentTime.getHours() - 6*24);
    db.getEthWithdrawls(lastTime)
    .then(async pendingRequests=>{
        if(pendingRequests){
            var validAddress = addressValidator.validate(pendingRequests.to_address, 'ETH', config.NETWORK)
            if(!validAddress){
                //if not valid address update transaction as faild
                var updated = await db.updateFailedTransactionStatus(pendingRequests);
                return;
            }else{
                await db.updateFailedTransactionStatus(pendingRequests);
                if(pendingRequests.wallet_type == 'ETH'){
                    sendEtherTransaction(config.ADMIN_ETH_ADDRESS, pendingRequests.to_address, pendingRequests.value.toFixed(4), config.ADMIN_ETH_KEY)
                    .then(txn_id=>{
                        if(txn_id){
                            db.updateWithdrawStatus(pendingRequests, txn_id)
                        }
                    })
                }
                if(pendingRequests.wallet_type == 'USDT'){
                    sendUSDTTransaction(config.ADMIN_ETH_ADDRESS, pendingRequests.to_address, pendingRequests.value.toFixed(4), config.ADMIN_ETH_KEY)
                    .then(txn_id=>{
                        if(txn_id){
                            db.updateWithdrawStatus(pendingRequests, txn_id)
                        }
                    })
                }
            }
        }else{
            console.log('No pending withdrawls---------------------')
        }
    })
}

processETHwithdrawl()
setInterval(function(){
    processETHwithdrawl()
}, config.WITHDRAW_RATE)

processPendingWithdrawls()
setInterval(function(){
    processPendingWithdrawls()
}, config.WITHDRAW_RATE)
