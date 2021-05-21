var Ledger = require('../models/ledger')
var Balance = require('../models/balances')
var AdminAddress = require('../models/adminaddresses')
var Coin = require('../models/coins')
var BlockTracker = require('../models/block_tracker')
var NonceTracker = require('../models/nonce_traker')
var Address = require('../models/addresses')
var Portfolio = require('../models/portifolio_ledgers')
var PortfolioBackup = require('../models/portifolio_ledgers_backup')
var Transfers = require('../models/transfers')
var config = require('../config/index')
var crypto = require('crypto')
var axios = require('axios');

const key = crypto.createHash('sha256').update(String(config.ENCRYPT_PASS)).digest('base64').substr(0, 32);
// Defining iv
const iv = config.ENCRYPT_PASS.toString('hex').slice(0, 16);
// Defining algorithm 
const algorithm = 'aes-256-cbc'; 
function encryptdata(plainText){
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = cipher.update(String(plainText), 'utf8', 'hex') + cipher.final('hex');
    return encrypted;
}
function decryptdata(text){
    const decipher = crypto.createDecipheriv(algorithm,key,iv)
    const decrypted = decipher.update(text,'hex','utf8') + decipher.final('utf8');
    return decrypted;
}

function sortData(wallets){
    return wallets.map(wallet=>{
        return {
            user_id: wallet.user_id,
            eth_address: wallet.eth_address.address ? decryptdata(wallet.eth_address.address): '',
            btc_address: wallet.btc_address.address ? decryptdata(wallet.btc_address.address): '',
            wallet_type: wallet.wallet_type
        }
    })
}
const getLedgerTransactions = (walletType)=>{
    return new Promise((resolve, reject)=>{
        Ledger.find({wallet_type: walletType, activity_type: 'Deposit'}).exec(function(err, result){
            if(err)
                resolve(null)
            if(result.length > 0)
                resolve(result)
            else
                resolve(null)
        })
    })
}

/*const findBTCWalletByAddress = (address)=>{
    return new Promise((resolve, reject)=>{
        Address.findOne({address: address, wallet_type:'BTC'}).exec(function(err, result){
            if(err){
                resolve(null)
            }
            if(!result){
                resolve(null)
            }
            resolve(result)
        })
    })
}

//insert new deposit transaction into ledger
const addBTCDeposit = function(transaction){
    return new Promise((resolve, reject)=>{
        Ledger.findOne({to_address: transaction.to_address, transaction_hash: transaction.transaction_hash, user_id: transaction.user_id, activity_type: 'Deposit'}).exec(function(err, result){
            if(err){
                console.log('uable to add deposit...')
                resolve(null)
            }
            if(result){
                console.log('Oops... Transaction already added to account: ', transaction.transaction_hash)
                resolve(null)
            }else{
                //prepare ledger instance
                var obj = new Ledger(transaction)
                obj.save(function(err, saved){
                    if(err){
                        console.log(err)
                        resolve(null)
                    }else{
                        Address.findOne({user_id: transaction.user_id, wallet_type: transaction.wallet_type},async (er,addrFound)=>{
                            if(addrFound){
                                var updObj;
                                updObj = {
                                    confirmed_balance : (addrFound['confirmed_balance'])? addrFound.confirmed_balance + transaction.value  : transaction.value
                                }
                                Address.updateOne({_id:addrFound._id}, {$set: updObj }, (err, result) =>{
                                    if(err) {resolve(null)}
                                })
                            }else{             
                                resolve(null)}
                
                            if(er){resolve(null)}
                        })
                        console.log("***** New deposit added to user account with txid:",transaction.transaction_hash )
                        resolve(transaction)
                    }
                })
            }
        })
    })
}*/
//insert new deposit transaction into ledger
const addDeposit = function(transaction){
    return new Promise((resolve, reject)=>{
        Ledger.findOne({to_address: transaction.to_address, transaction_hash: transaction.transaction_hash, user_id: transaction.user_id, activity_type: 'Deposit'}).exec(function(err, result){
            if(err){
                console.log('uable to add deposit...')
                resolve(null)
            }
            if(result){
                console.log('Oops... Transaction already added to account: ', transaction.transaction_hash)
                resolve(null)
            }else{
                //prepare ledger instance
                var obj = new Ledger(transaction)
                obj.save(function(err, saved){
                    if(err){
                        console.log(err)
                        resolve(null)
                    }else{
                        console.log("***** New deposit added to user account with txid:",transaction.transaction_hash )
                        resolve(transaction)
                    }
                })
            }
        })
    })
}
//get last updated block
const getLastUpdatedBlock = function(coinType){
    return new Promise((resolve, reject)=>{
        BlockTracker.findOne({coin_type: coinType}).exec(function(err, result){
            if(err){
                resolve(null)
            }else{
                resolve(result)
            }
        })
    })
}


//update block_number
const updateBlock = (coinType, latestBlock)=>{
    return new Promise((resolve, reject)=>{
        BlockTracker.updateOne({coin_type:coinType}, {$set:{block_number:latestBlock}}).exec(function(err, result){
            if(err){resolve(null)}
            else{resolve(result)}
        })
    })
}
//get pending transactions
const getPendingTransactions = function(coinType){
    return new Promise((resolve, reject)=>{
        Ledger.find({status:0, confirmed: false, wallet_type:coinType, activity_type:'Deposit'}).exec(function(err, data){
            if(err){
                resolve(null)
            }else{
                resolve(data)
            }
        })
    })
}

//update transaction as success
const updateTransactionStatus = function(transaction, confirmations){
    return new Promise(async (resolve, reject)=>{
          //update balance and decrease unconfirmed balance
        Address.findOne({user_id: transaction.user_id, wallet_type: transaction.wallet_type},async (er,addrFound)=>{
            if(addrFound){
                var updObj;
                updObj = {
                    confirmed_balance : (addrFound['confirmed_balance'])? addrFound.confirmed_balance + transaction.value  : transaction.value
                }
                Address.updateOne({_id:addrFound._id}, {$set: updObj }, (err, result) =>{
                    if(err) {resolve(null)}
                    //update to deposit table
                    Ledger.updateOne({uniq_id:transaction.uniq_id,transaction_hash:transaction.transaction_hash, wallet_type:transaction.wallet_type},{$set:{status:1, confirmed: true, block_confirmations: confirmations,request_status:'Success'}},(er, updated)=>{
                        if(er) {resolve(null)}
                        else{
                            var url = config.DEPOSIT_NOTIFY;
                            var body = {
                                user_id: transaction.user_id,
                                wallet_type: transaction.wallet_type,
                                amount: transaction.value
                            }
                            axios.post(url, body)
                            .then(resp=>{
                                console.log('-------------- Deposit notification sent-------------')
                            })
                            .catch(r=>{
                                console.log('----------- Got error from deposit notification ---------')
                            })  
                            resolve('updated tranaction status')
                        }
                    })
                })
            }else{             
                resolve(null)}

            if(er){resolve(null)}
        })
    })
}

//get pending withdraw requests
const getPendingWithdrawRequests = function(walletType, lastTime){
    return new Promise((resolve, reject)=>{
        Ledger.find({wallet_type:walletType, activity_type:'Withdrawl', status:0, confirmed: false, created_at:{$lte: new Date(lastTime)}, transaction_hash : { $exists: false }}).limit(25).exec(function(err, requests){
            if(err){  resolve([])}
            else if(requests && requests.length < 1) {
                resolve([])
            }else{
                resolve(requests)
            }
        })
    }) 
}
const updateFailedTransactionStatus = function(transaction){
    return new Promise((resolve, reject)=>{
        Ledger.updateOne({_id:transaction._id, activity_type:'Withdrawl', uniq_id:transaction.uniq_id},{$set:{status:2}},(err, updated)=>{
            if(err){resolve(null)}
            if(updated)(resolve(true))
        })
    })
}   
const updateWithdrawStatus= function(record, hash) { 
    return new Promise((resolve, reject)=>{
        //update status of the transaction in ledger
        var updObj = {
            confirmed: true,
            status:1,
            transaction_hash: hash,
            block_confirmations:0
        };
        Ledger.updateOne({_id:record._id, uniq_id:record.uniq_id, wallet_type: record.wallet_type}, {$set: updObj }, (err, result)=>{
            if(err){ resolve(null)}
            else {resolve(result)}
        })
    })
}

const getUserWallets = function(wallet_type){
    return new Promise((resolve, reject)=>{
        Address.find({wallet_type: wallet_type, address: {$exists:true}}).exec(function(err, wallets){
            if(err)
                resolve(null)
            if(wallets.length < 0)
                resolve(null)
            else
                resolve(wallets)
        })
    })
}

//get user wallet
module.exports.getUserWallet = function(user_id, wallet_type){
    return new Promise((resolve, reject) => {
        Address.findOne({ user_id: user_id, wallet_type: wallet_type}).exec(function(err,result){
            if(err){ resolve(null)}
            if(!result){
                resolve(null)
            }
            else{ resolve({
                address: result.address,
                private: decryptdata(result.private)
            })}
        })
    })
}

module.exports.getETHDeposits= function(wallet_type){
    return new Promise((resolve, reject) =>{
        Ledger.find({status: 1, activity_type: 'Deposit', wallet_type:wallet_type}).limit(50).exec(function(er, result){
            if(er){ resolve(null)}
            else{ resolve(result)}
        }) 
    })
}
//get pending deposits
const getPendingDeposits = function(){
    return new Promise((resolve, reject) =>{
        Ledger.find({status: 0, confirmed: false,activity_type: 'Deposit', wallet_type:'USDT'}).limit(50).exec(function(er, result){
            if(er){ resolve(null)}
            else{ resolve(result)}
        }) 
    })
}


const getAdminWallet = function(walletType){
    return new Promise((resolve, reject)=>{
        AdminAddress.findOne({wallet_type: walletType}).exec(function(err, result){
            if(err)
                resolve(null)
            if(!result){
                resolve(null)
            }
            else    
                resolve({address: result.address,private: decryptdata(result.private)})
        })
    })
}

const getNonce = function(){
    return new Promise((resolve, reject)=>{
        NonceTracker.find().exec(function(err, result){
            if(err)
                resolve(null)
            if(!result){
                resolve(null)
            }
            else    
                resolve(result[0])
        })
    })
}

const updateNonce = function(nonce){
    return new Promise((resolve, reject)=>{
        NonceTracker.updateMany({$set:{nonce: nonce}}).exec(function(err,r){
            if(err){
                resolve(null)
            }
            else
                resolve(r)
        })
    })
}

const getWalletsByAddresses =  function(transactions){
    return new Promise((resolve, reject)=>{
        var addrs = transactions.map(function(t){return t.toLowerCase()})
        Address.find({address: {$in:addrs}}).exec(function(err, wallets){
            if(err)
                resolve(null)
            if(wallets.length < 0)
                resolve(null)
            else
                resolve(wallets)
        })
    })

}

const getOpenDeposits = function(){
    return new Promise((resolve, reject)=>{
        Ledger.distinct("to_address",{$or: [ { is_taken: { $exists: false } }, { is_taken: false } ], value:{$gt:100},activity_type: 'Deposit', wallet_type:{$in:['USDT', 'SML']}}).exec(function(err, result){
            if(err)
                resolve([])
            else
                resolve(result)
        })
    
    })
}

const getTokenDeposits = function(walletType){
    return new Promise((resolve, reject)=>{
        Ledger.distinct("user_id", {$or: [ { is_taken: { $exists: false } }, { is_taken: false } ], activity_type: 'Deposit', wallet_type:walletType}).exec(function(err, result){
            if(err)
                resolve([])
            else
                resolve(result)
        })
    
    })
}
const getUserWalletByAddress = function(address, wallet_type){
    return new Promise((resolve, reject)=>{
        Address.findOne({address: address, wallet_type: wallet_type}).exec(function(err, result){
            if(err){
                resolve(null)
            }
            if(!result){
                resolve(null)
            }
            console.log(result)
            resolve({address: result.address,
                private: decryptdata(result.private)})
        })
    })
}
const updateTranferStatus = function(address, walletType){
    console.log('Updating transfer status: ', address, walletType)
    return new Promise((resolve, reject)=>{
        Ledger.updateMany({activity_type:'Deposit', to_address: address, wallet_type: walletType}, {$set:{is_taken: true}}).exec(function(err, resp){
            if(err){
                console.log(err)
                resolve(null)
            }
            else{
                console.log(resp)
                resolve(resp)
            }
        })
    })
}
const findXRPDestinationTag = function(tag){
    return new Promise((resolve, reject)=>{
        Address.findOne({destination_tag: tag, wallet_type:'XRP'}).exec(function(err, result){
            if(err){
                resolve(null)
            }
            if(!result){
                resolve(null)
            }
            resolve(result)
        })
    })
}

module.exports.getTransferData = function(){
    return new Promise((resolve, reject)=>{
        Transfers.findOne({status: false, confirmed: false, active_phase: true}).exec(function(err, result){
            if(err){
                resolve(null)
            }else{
                resolve(result)
            }
        })
    })
}
module.exports.getStats = function(from, to){
    return new Promise((resolve, reject)=>{
        let dailyStatsQry = Portfolio.aggregate([
            {
                '$facet': {
                    'coin_wise': [
                        {
                            '$match': {
                                'activity_type':'Deposit',
                                'coin_amount':{'$ne':NaN},
                                'portifolio_amount':{'$ne':NaN},
                                'fee_amount':{'$ne':NaN},
                                'created_at': {
                                    '$gte': new Date(from), 
                                    '$lte': new Date(to)
                                } 
                            }
                        }, {
                            '$group': {
                                '_id': {
                                    'coin_type': '$coin_type'
                                }, 
                                'crypto_amount': {
                                    '$sum': '$coin_amount'
                                }, 
                                'portifolio_amount': {
                                    '$sum': '$portifolio_amount'
                                }, 
                                'portifolio_fee': {
                                    '$sum': '$fee_amount'
                            }
                            }
                        }, {
                            '$project': {
                                '_id': 0, 
                                'coin_type': '$_id.coin_type', 
                                'crypto_amount': 1, 
                                'portifolio_amount': 1,
                                'portifolio_fee': 1
                            }
                        }
                    ], 
                    'total': [
                        {
                           '$match': {
                                'activity_type':'Deposit',
                                'coin_amount':{'$ne':NaN},
                                'portifolio_amount':{'$ne':NaN},
                                'fee_amount':{'$ne':NaN},
                                'created_at': {
                                    '$gte': new Date(from), 
                                    '$lte': new Date(to)
                                }
                            }
                        }, {
                            '$group': {
                                '_id':null,
                                'portifolio_amount': {
                                    '$sum': '$portifolio_amount'
                                }, 
                                'portifolio_fee': {
                                    '$sum': '$fee_amount'
                                }
                            }
                        }, {
                            '$project': {
                                '_id': 0, 
                                'portifolio_amount': 1, 
                                'portifolio_fee': 1
                            }
                        }
                    ]
                }
            }
        ]).allowDiskUse(true).cursor({batchSize: 50000});
        let execDailyStatsQry = dailyStatsQry.exec();
        let response ={};
        execDailyStatsQry.map(doc=>{
            return doc;
        })
        .on('data', stat=>{
           response = stat;
        })
        .on('end', nodata=>{
            resolve(response)
        })
    })
}
module.exports.updatePhase = function(stats, phase){
    return new Promise((resolve, reject)=>{
        Transfers.findOneAndUpdate({_id: phase._id, confirmed: false, active_phase: true}, {$set:{confirmed: true, active_phase: false, status: true, ETH: stats.ETH, BTC: stats.BTC, USDT: stats.USDT}}).exec(function(err, result){
            if(err){
                resolve(null)
            }else{
                resolve(result)
            }
        })
    })
}
module.exports.updatePhaseStatus = function(phase, doc,coin){
    return new Promise((resolve, reject)=>{
        //if(coin == 'BTC'){
          //  var updoc = {"BTC.transaction_hash":doc.transaction_hash,"BTC.transfer_status":doc.transfer_status }
       // }
        if(coin== 'ETH'){
            var updoc = {"ETH.transaction_hash":doc.transaction_hash,"ETH.transfer_status":doc.transfer_status }
        }
        if(coin== 'USDT'){
            var updoc = {"USDT.transaction_hash":doc.transaction_hash,"USDT.transfer_status":doc.transfer_status }
        }
        Transfers.findOneAndUpdate({_id: phase._id, confirmed: true, active_phase: false}, {$set:updoc}).exec(function(err, result){
            if(err){
                resolve(null)
            }else{
                resolve(result)
            }
        })
    })
}
module.exports.addPhase = function(from ,to, count){
    return new Promise((resolve, reject)=>{
        var p = new Transfers({
            counter: count,
            start_time: new Date(from),
            end_time: new  Date(to),
            created_at: new Date().toISOString(),
            active_phase: true
        })
        p.save(function(err, saved){
            resolve(saved)
        })
    })
}
//get pending withdraw requests
module.exports.getEthWithdrawls = function(lastTime){
    return new Promise((resolve, reject)=>{
        Ledger.findOne({wallet_type:{$in:['ETH', 'USDT']}, activity_type:'Withdrawl', status:0, confirmed: false, created_at:{$lte: new Date(lastTime)}, transaction_hash : { $exists: false }}).exec(function(err, requests){
            if(err){  resolve(null)}
            else if(!requests) {
                resolve(null)
            }else{
                resolve(requests)
            }
        })
    }) 
}
module.exports.getLedgerTransactions = getLedgerTransactions;
//module.exports.findBTCWalletByAddress = findBTCWalletByAddress;
module.exports.addDeposit = addDeposit;
module.exports.getLastUpdatedBlock = getLastUpdatedBlock;
module.exports.updateBlock = updateBlock;
module.exports.getPendingTransactions = getPendingTransactions;
module.exports.updateTransactionStatus = updateTransactionStatus;
module.exports.getPendingWithdrawRequests = getPendingWithdrawRequests;
module.exports.updateFailedTransactionStatus = updateFailedTransactionStatus;
module.exports.updateWithdrawStatus = updateWithdrawStatus;
module.exports.getUserWallets = getUserWallets;
module.exports.getPendingDeposits = getPendingDeposits;
module.exports.getAdminWallet = getAdminWallet;
module.exports.getNonce = getNonce;
module.exports.updateNonce = updateNonce;
module.exports.getWalletsByAddresses = getWalletsByAddresses;
module.exports.getOpenDeposits = getOpenDeposits;
module.exports.getUserWalletByAddress = getUserWalletByAddress;
module.exports.getTokenDeposits = getTokenDeposits;
module.exports.updateTranferStatus = updateTranferStatus;
//module.exports.addBTCDeposit = addBTCDeposit;
module.exports.findXRPDestinationTag = findXRPDestinationTag;

/*var tx = new Ledger({
    user_id: "5f75a64358dbc6313ee6b644",
    wallet_type:'BTC',
    from_address: '',
    to_address: "tb1q78drusx77vaa3nex0xgqc9ujz6k7xt8ua2927x",
    value: 0.0001,
    transaction_fee : 0,
    requested_value: 0.0001,
    activity_type:'Withdraw',
    block_confirmations:0,
    status:0,
    created_at: new Date()
})*/
// tx.save()

// n.save()
// BlockTracker.find().exec(console.log)
// AdminAddress.find().exec(console.log)

// Address.find({}).exec(console.log)
// w.save()
// var l = new BlockTracker({coin_type:'USDT', block_number:8400819, short_name:'USDT'})
// l.save()
// var l1 = new BlockTracker({coin_type:'SML', block_number:7648689, short_name:'SML'})
// l1.save()
// var l2 = new BlockTracker({coin_type:'ETH', block_number:7997362, short_name:'ETH'})
// l2.save()
// var l3 = new BlockTracker({coin_type:'USDT', block_number:7997362, short_name:'USDT'})
// l3.save()
// var l4 = new BlockTracker({coin_type:'BTC', block_number:662494, short_name:'BTC'})
// l4.save()

var p = new Transfers({
    counter:1,
    start_time: new Date('2021-02-12T00:00:00.000Z'),
    end_time: new  Date('2021-02-15T12:00:00.000Z'),
    created_at: new Date().toISOString(),
    active_phase: true

})
// Transfers.deleteMany({}).exec()
// p.save()

/*var transaction = {
    user_id: '6024a97043003c65b68eabd8',
    wallet_type:'BTC',
    from_address: '',
    to_address: '3HMT9RS2c4RzfMxkTRrAmrFEqXkXQTcNSn',
    value: 0.0291046,
    transaction_fee : 0,
    requested_value: 0.02910466,
    activity_type:'Deposit',
    transaction_hash: '3a7c613d84caa720ce8cc5553751ce786b5cc4221fd14f12916cb232a3ba3703',
    block_confirmations:1,
    status:1,
    created_at: new Date()
}*/
// addBTCDeposit(transaction)
