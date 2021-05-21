var cron = require('node-cron')
var db = require('../db/database')
var config = require('../config/index')
const { GoogleSpreadsheet } = require('google-spreadsheet');

var creds = require('./creds.json')
const doc = new GoogleSpreadsheet('1gcNLlBqtJXmlD04tcdvIipbdO0GgpsVpwKUXklzUigA');

var Web3=require('web3');
const utils =  require('ethereumjs-util')
const Tx = require('ethereumjs-tx')
var {ABI} = require('../util/abi');
var util = require('../util/web3')
getWeb3 = function(){
    return new Web3(new Web3.providers.HttpProvider(config.INFURA_URL));
}

// 
// cron.schedule('59 */4 * * *', function() {
//     console.log('---------------------');
//     console.log('Running Cron Job');
// });
// 
function transferToAddress(to_address, value, phase){
    return new Promise((resolve, reject)=>{
        rpc.requestNode('walletpassphrase', [config.WALLET_PASSWORD, 15])
        .then(d=>{
            rpc.requestNode('sendtoaddress', [to_address, value])
            .then(txn_id=>{
                if(txn_id){
                    // update phase
                    var doc = {
                        transaction_hash: txn_id, transfer_status: 'Success'
                    }
                    db.updatePhaseStatus(phase, doc, 'BTC')
                    resolve(txn_id)
                }
                else
                    resolve(null)
            })
        })  
    })            
}
function sendEtherTransaction(from, to, amount, private, phase){
    return new Promise(async (resolve, reject)=>{
        var web3 = getWeb3()
        var gasPrice = await web3.eth.getGasPrice();
        var gasLimit = 23000;
        var txCount = await web3.eth.getTransactionCount(from,'pending');
        var rawTransaction = {
            nonce: web3.utils.toHex(txCount),
            gasPrice: web3.utils.toHex(parseInt(gasPrice * 1)),
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
            console.log('Ether transfer to Paradise exchange : ', receipt.transactionHash)
            var doc = {
                transaction_hash: receipt.transactionHash, transfer_status: 'Success'
            }
            db.updatePhaseStatus(phase, doc, 'ETH')
        })
        .catch(e=>{
            console.log(e)
        })
    })
}
function sendUSDTTransaction (from, to, amount, private, phase){
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
            // if(tokenBal < amount ** decimals) 
            //     return;
            amount = util.noExponents(amount*  (10** decimals));
            var txCount = await web3.eth.getTransactionCount(from,'pending');
            let data = contractInstance.methods.transfer(to, amount).encodeABI();
            var rawTransaction = {
                nonce: web3.utils.toHex(txCount),
                gasPrice: web3.utils.toHex(parseInt(gasPrice)),
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
                console.log('Tokens transfer to Paradise exchange : ', receipt.transactionHash)
                var doc = {
                    transaction_hash: receipt.transactionHash, transfer_status: 'Success'
                }
                db.updatePhaseStatus(phase, doc, 'USDT')
                resolve(receipt.transactionHash)
            })
            .catch(e=>{
                resolve(null)
            })
        })
    })
}

//function trasferBitcoin(amount, phase){
  //  console.log('Sending bitcoin transaction-------------------------------')
    //transferToAddress(config.BTC_ADDRESS, amount, phase)
//}
function trasferEther(amount, phase){
    console.log('Sending Ether transaction-------------------------------')
    sendEtherTransaction(config.ADMIN_ETH_ADDRESS, config.ETH_ADDRESS, amount.toFixed(4), config.ADMIN_ETH_KEY, phase)
}
function trasferUSDT(amount, phase){
    console.log('Sending USDT transaction-------------------------------')
    setTimeout(function(){
        sendUSDTTransaction(config.ADMIN_ETH_ADDRESS, config.ETH_ADDRESS, amount.toFixed(4), config.ADMIN_ETH_KEY, phase)
    }, 5*60*1000)
}
function prepareStats(stats){
    return new Promise((resolve, reject)=>{
        let final_obj={
            /*BTC:{
                crypto_amount:0,
                portifolio_amount:0,
                portifolio_fee:0
            },*/
            ETH:{
                crypto_amount:0,
                portifolio_amount:0,
                portifolio_fee:0
            },
            USDT:{
                crypto_amount:0,
                portifolio_amount:0,
                portifolio_fee:0
            },
            total:{
                total_portifolio_amount:0,
                total_portifolio_fee:0
            }
        };
        if(stats['coin_wise'].length>0){
            stats.coin_wise.forEach(coin=>{
                final_obj[coin['coin_type']]['crypto_amount']=(coin['crypto_amount'])?coin['crypto_amount']:0;
                final_obj[coin['coin_type']]['portifolio_amount']=(coin['portifolio_amount'])?coin['portifolio_amount']:0;
                final_obj[coin['coin_type']]['portifolio_fee']=(coin['portifolio_fee'])?coin['portifolio_fee']:0;
            })
        }
        if(stats['total'].length>0){
            stats.total.forEach(doc=>{
                final_obj['total']['total_portifolio_amount']=(doc['portifolio_amount'])?doc['portifolio_amount']:0;
                final_obj['total']['total_portifolio_fee']=(doc['portifolio_fee'])?doc['portifolio_fee']:0;
            })
        }

        setTimeout(()=>{
           resolve(final_obj)
        },1000)
        
    })
}
function initTransfer(){
    console.log('---------------------');
    console.log('Running Cron Job');
    //get transfer requests
    db.getTransferData()
    .then(currentPhase=>{
        if(currentPhase){
            //get stats for current phase
            db.getStats(currentPhase.start_time, currentPhase.end_time)
            .then(result=>{
                if(result){

                    prepareStats(result).then( async stats=>{
                        if(stats){

                              var dbstats = {
                                  USDT:{
                                    total_added_usd: stats.USDT.portifolio_amount,
                                    total_added_crypto:stats.USDT.crypto_amount,
                                    fee_in_usd: stats.USDT.portifolio_fee,
                                    fee_in_crypto: stats.USDT.crypto_amount/10,
                                    final_transfer_amount: stats.USDT.crypto_amount-(stats.USDT.crypto_amount/10),
                                    to_address: config.USDT_ADDRESS,
                                    transaction_hash:'',
                                    transfer_status: 'Pending'
                                  },
                                  /*BTC:{
                                    total_added_usd: stats.BTC.portifolio_amount,
                                    total_added_crypto:stats.BTC.crypto_amount,
                                    fee_in_usd: stats.BTC.portifolio_fee,
                                    fee_in_crypto: stats.BTC.crypto_amount/10,
                                    final_transfer_amount: stats.BTC.crypto_amount-(stats.BTC.crypto_amount/10),
                                    to_address: config.BTC_ADDRESS,
                                    transaction_hash:'',
                                    transfer_status: 'Pending'
                                  },*/
                                  ETH:{
                                    total_added_usd: stats.ETH.portifolio_amount,
                                    total_added_crypto:stats.ETH.crypto_amount,
                                    fee_in_usd: stats.ETH.portifolio_fee,
                                    fee_in_crypto: stats.ETH.crypto_amount/10,
                                    final_transfer_amount: stats.ETH.crypto_amount-(stats.ETH.crypto_amount/10),
                                    to_address: config.ETH_ADDRESS,
                                    transaction_hash:'',
                                    transfer_status: 'Pending'
                                  }
                              }
                              //update phase info
                                //update sheet 
                                var row = {
                                    DATE: currentPhase.start_time+'-'+ currentPhase.end_time,
                                    ETH_inusd: stats.ETH.portifolio_amount,
                                    ETH: stats.ETH.crypto_amount,
                                    ETH_fee: stats.ETH.crypto_amount/10,
                                    ETH_transferamount: stats.ETH.crypto_amount-(stats.ETH.crypto_amount/10),
                                    //BTC_inusd: stats.BTC.portifolio_amount,
                                    //BTC: stats.BTC.crypto_amount,
                                    //BTC_fee: stats.BTC.crypto_amount/10,
                                    //BTC_transferamount: stats.BTC.crypto_amount-(stats.BTC.crypto_amount/10),
                                    USDT: stats.USDT.portifolio_amount,
                                    USDT_fee: stats.USDT.crypto_amount/10,
                                    USDT_transferamount: stats.USDT.crypto_amount-(stats.USDT.crypto_amount/10)

                                }
                                await doc.useServiceAccountAuth(creds);
                                await doc.loadInfo();
                                const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id] or doc.sheetsByTitle[title]
                                const larryRow = await sheet.addRow(row);

                                var end_time = new Date(currentPhase.end_time);
                                end_time.setHours( end_time.getHours() + 6);
                                console.log(end_time)
                                db.updatePhase(dbstats, currentPhase)
                                .then(updated=>{
                                    if(updated){
                                        //add new phase
                                        db.addPhase(currentPhase.end_time, end_time, currentPhase.count).then(d=>{
                                            console.log('==================> new phase added')
                                        })
                                        //send BTC transaction
                                        //if(dbstats.BTC.final_transfer_amount > 0.001){
                                          //  trasferBitcoin(dbstats.BTC.final_transfer_amount, currentPhase)
                                        //}
                                        if(dbstats.ETH.final_transfer_amount > 0.01){
                                            trasferEther(dbstats.ETH.final_transfer_amount, currentPhase)
                                        }
                                        if(dbstats.USDT.final_transfer_amount > 50){
                                            trasferUSDT(dbstats.USDT.final_transfer_amount, currentPhase)
                                        }
                                    }
                                })

                        }
                    })
                }
                // console.log(result)
            })
        }
    })

}
cron.schedule('5 6 * * *', function() {
    initTransfer()
});

cron.schedule('5 12 * * *', function() {
    initTransfer();
});

cron.schedule('5 18 * * *', function() {
    initTransfer()
});

cron.schedule('5 1 * * *', function() {
    initTransfer()
});