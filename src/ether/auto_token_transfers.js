const Web3 = require('web3');
const utils =  require('ethereumjs-util')
const Tx = require('ethereumjs-tx')

var config = require('../config/index')
var db = require('../db/database');
var api = require('./api')
var nonce = config.NONCE

getWeb3 = function(){
    return new Web3(new Web3.providers.HttpProvider(config.INFURA_URL));
}
// TODO 1. get all token deposits
// TODO 2. check user wallet ether balance
// TODO 3. if user wallet has sufficient ETH to pay transaction fee then transfer tokens to admin wallet immediately
// TODO 4. else Transfer ETH to user wallet
// TODO 5. once ETH transferred to user wallet goto step 3

var web3 = getWeb3()
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


async function fundUserWallet(from, to, amount, private){
    return new Promise(async(resolve, reject)=>{
        var web3 = getWeb3()
        var gasPrice = await web3.eth.getGasPrice();
        var gasLimit = 23000;
        var txCount = await web3.eth.getTransactionCount(from,'pending');
        var rawTransaction = {
            nonce: web3.utils.toHex(txCount),
            gasPrice: web3.utils.toHex(parseInt(gasPrice * 1.05)),
            gasLimit: web3.utils.toHex(gasLimit),
            to:to,
            value: web3.utils.toHex(web3.utils.toWei(amount.toString())),
            chainId: config.CHAIN_ID
        }
        var privateKey = new Buffer.from(private, 'hex');
        var tx = new Tx(rawTransaction);
        tx.sign(privateKey);
        var serializedTx = tx.serialize();
        web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
        .then(receipt=>{
            console.log('User wallet funded : ', receipt.transactionHash)
            //redirect token deposit to admin wallet 
            nonce +=1;
        })
        .catch(e=>{
            console.log(e)
        })
    })
}
function checkAndFundWallet(wallet, request){
    web3 = getWeb3()
    console.log('Checking user wallet: ', wallet)
    web3.eth.getBalance(wallet)
    .then(async (bal)=>{
        var balanceInEth = parseFloat(web3.utils.fromWei(bal, 'ether'))
        var gasPrice = await web3.eth.getGasPrice();
        gasPrice = parseInt(gasPrice);
        var gasLimit = 90000;
        var fees = parseInt(gasLimit * gasPrice * 1.2)
        var tx_fees= parseFloat(web3.utils.fromWei(fees.toString(),'ether'))
        //fund user wallet with some ether
        var maxFee = Math.max(tx_fees, 0.01)
        if(balanceInEth < tx_fees && maxFee-balanceInEth> 0.002)
            fundUserWallet(config.FUNDING_WALLET, wallet, (maxFee-balanceInEth).toFixed(6), config.FUNDING_KEY);
    })
}
async function checkEtherBalances(wallets, cb){
    var users=[];
    web3 = getWeb3()
    for(i=0; i<wallets.length;i++){
        var wallet = wallets[i]
        var bal = await web3.eth.getBalance(wallet)
        var balanceInEth = parseFloat(web3.utils.fromWei(bal, 'ether'))
        if(balanceInEth<0.009){
            users.push(wallet)
        }
    }
    setTimeout(function(){
        cb(null, users)
    },5000)
}
function fundether(req, res){
    // res.json({status: true, message:'initialized funding process!'})
    db.getOpenDeposits()
    .then(deposits=>{
        if(deposits.length>0){
            checkEtherBalances(deposits, function(err, wallets){
                console.log("----------> ", wallets)
                var myLoop = syncLoop(wallets.length, function(loop){
                setTimeout(function(){
                    var i = loop.iteration();
                    var wallet = wallets[i]
                    checkAndFundWallet(wallet)
                    loop.next();
                }, 5*60*1000);
            }, function(){
                console.log('-------------------------->done');
                api.initTokenTransfers('USDT')
            })
        });
        }
    })
}

module.exports.fundUserWallet = checkAndFundWallet;
module.exports.fundether = fundether
fundether();
setInterval(fundether, config.TOKEN_TRANSER_RATE)

module.exports.checkAndTransferEth = function(req, res){
    db.getETHDeposits('ETH').then(deposits=>{
        if(deposits){
            for (let i = 0; i < deposits.length; i++) {
                const transaction = deposits[i];
                api.withdrawEtherFromUser(transaction)
            }
        }
    })
    res.json({message:'sending ether to admin wallet '})
}