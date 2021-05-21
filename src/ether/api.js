var Web3=require('web3');
const utils =  require('ethereumjs-util')
const Tx = require('ethereumjs-tx')

const {ABI, SINGLECALL_ABI} = require('../util/abi')
var db = require('../db/database')
var config = require('../config/index')
var util = require('../util/web3')
// var xrp = require('../xrp/webSocket')

global.LOCKNONCE = false;
global.lastUpdatedAt = new Date()

getWeb3 = function(){
    return new Web3(new Web3.providers.HttpProvider(config.INFURA_URL));
}

getContractAddress = function(wallet_type){
    if(wallet_type == 'USDT')
        return config.TOKENS.USDT.CONTRACT_ADDRESS;
    //if(wallet_type == 'PDT')
      //  return config.TOKENS.PDT.CONTRACT_ADDRESS;
}
//send token transaction
exports.transferToken = async function(req, res){
    let to = req.body.to;
    //let from = config.PDT_WALLET
    var web3 = getWeb3()
    var gasPrice = await web3.eth.getGasPrice();
    var gasLimit = 90000;
    var wallet_type = req.params.coin;
    let private = config.PDT_SECRETE;
    var contractAddress = getContractAddress(wallet_type)
    var decimals = wallet_type == 'USDT' ? 6: 18;
    var contractInstance = new web3.eth.Contract(ABI, contractAddress);
    contractInstance.methods.balanceOf(from).call()
    .then( async result=>{
        var tokenBal = result / (10 ** decimals)
        if(req.body.amount <= tokenBal){
            var amount = parseInt(req.body.amount)
            var txCount = await web3.eth.getTransactionCount(from,'pending');
            let data = contractInstance.methods.transfer(to, util.noExponents(amount * (10 ** decimals))).encodeABI();
            var rawTransaction = {
                nonce: web3.utils.toHex(txCount),
                gasPrice: web3.utils.toHex(parseInt(gasPrice * 1.05)),
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
                return res.status(200).json({status: true, data:receipt.transactionHash, message:'transaction sent successfully'})  
            })
            .catch(e=>{
                return res.status(200).json({status: false, data:e, message:'error while sending transaction, please try again after sometime! '})  
            })
        }else{
            return res.status(200).json({status: false, data:tokenBal, message:'insufficient funds in sender wallet'})  
        }
    })
}

module.exports.getAdminBalance = function(req, res){
    var address = req.params.address;
    var web3 = getWeb3()
    if(!web3.utils.isAddress(address)){
        return res.status(200).json({status: false, data:0, message: 'invalid address, please provide valid ether address'})
    }
    rpc.requestNode('getwalletinfo',[])
    .then(wallet=>{
        var btc =0;
        if(wallet){
            btc = wallet.balance;
        }    
        web3.eth.getBalance(address)
        .then(bal=>{
            var balanceInEth = web3.utils.fromWei(bal, 'ether')
            var singleBal = new web3.eth.Contract(SINGLECALL_ABI, config.SINGLE_CALL_BALANCES_ADDRESS);
            singleBal.methods.balances([address],[config.TOKENS.USDT.CONTRACT_ADDRESS,
            config.TOKENS.SML.CONTRACT_ADDRESS]).call()
            .then(resp=>{
                res.status(200).json({status: true, data:{BTC: btc,ETH: parseFloat(balanceInEth).toFixed(8), USDT: parseFloat(resp[0]/1e6).toFixed(8), SML: parseFloat(resp[1]/1e18).toFixed(8)} , message: 'success'})
                // xrp.getBalance(config.RIPPLE_WALLET)
                // .then(xrp=>{
                // })
            })
            .catch(e=>{
                res.status(200).json({status:false, data:{}, message:'unable to get balance, please try again!'})
            })
        })
        .catch(r=>{
            res.status(200).json({status:false, data:{}, message:'unable to get balance, please try again!'})
        })
        // }else{
        //     res.status(200).json({status:false, data:{}, message:'unable to get balance, please try again!'})
        // }
    })
}

//get wallet balance
exports.getBalance = function(req, res){
    var address = req.params.address;
    var web3 = getWeb3()
    if(!web3.utils.isAddress(address)){
        return res.status(200).json({status: false, data:0, message: 'invalid address, please provide valid ether address'})
    }
    web3.eth.getBalance(address)
    .then((bal)=>{
        var balanceInEth = web3.utils.fromWei(bal, 'ether')
        //var smlInstance = new web3.eth.Contract(ABI, config.TOKENS.SML.CONTRACT_ADDRESS);
        var usdtInstance = new web3.eth.Contract(ABI, config.TOKENS.USDT.CONTRACT_ADDRESS);
        usdtInstance.methods.balanceOf(address).call()
        .then(usdtBal=>{
            smlInstance.methods.balanceOf(address).call()
            .then(amuBal=>{
                res.status(200).json({status: true, data:{ETH: parseFloat(balanceInEth).toFixed(8), SML: parseFloat(amuBal/1e18).toFixed(8), USDT: parseFloat(usdtBal/1e6).toFixed(8)}, message: 'success'})
            })
            .catch(er=>{
                res.status(200).json({status: true, data:{ETH: parseFloat(balanceInEth).toFixed(8), SML: 0, USDT: parseFloat(usdtBal/1e6).toFixed(8)}, message: 'success'})
            })
        })
        .catch(er=>{
            console.log(er)
            res.status(200).json({status: true, data:{ETH: parseFloat(balanceInEth).toFixed(8), SML: 0,USDT:0}, message: 'success'})
        })
    })
    .catch(reason=>{
        return res.status(200).json({status: false, data:{address: address, balance:0}, message: 'something went wrong, please try again'})
    })

}

//get usdt token getWallet Balances
exports.getUSDTBalance = function(req, res){
    var address = req.params.address
    var web3 = getWeb3()
    if(web3.utils.isAddress(address)){
        var contractInstance = new web3.eth.Contract(ABI, config.USDT_CONTRACT_ADDR);
        contractInstance.methods.balanceOf(address).call()
        .then(result=>{
            res.status(200).json({status: true, data:{USDT: (result/1e6).toFixed(8)}, message: 'success'})
        })
        .catch(er=>{
            res.status(200).json({status: true, data:{USDT: 0}, message: 'success'})
        })
    }else{
        res.status(200).json({status: false, data:{USDT: 0}, message: 'invalid address'})
    }
}

//get usdt token getWallet Balances
/*exports.getSMLBalance = function(req, res){
    var address = req.params.address
    var web3 = getWeb3()
    if(web3.utils.isAddress(address)){
        var contractInstance = new web3.eth.Contract(ABI, config.TOKENS.SML.CONTRACT_ADDRESS);
        contractInstance.methods.balanceOf(address).call()
        .then(result=>{
            res.status(200).json({status: true, data:{SML: (result/1e18).toFixed(8)}, message: 'success'})
        })
        .catch(er=>{
            res.status(200).json({status: true, data:{SML: 0}, message: 'success'})
        })
    }else{
        res.status(200).json({status: false, data:{SML: 0}, message: 'invalid address'})
    }
}*/

function sendEtherTransaction(from, to, amount, private){
    return new Promise((resolve, reject)=>{
        var web3 = getWeb3()
        web3.eth.getBalance(from)
        .then(async (bal)=>{
            var balanceInEth = (parseFloat(web3.utils.fromWei(bal, 'ether')) - 0.012).toString();
            if(balanceInEth<0.015){
                return resolve(null)
            }
            var gasPrice = await web3.eth.getGasPrice();
            var gasLimit = 23000;
            var txCount = await web3.eth.getTransactionCount(from,'pending');
            var rawTransaction = {
                nonce: web3.utils.toHex(txCount),
                gasPrice: web3.utils.toHex(parseInt(gasPrice * 1)),
                gasLimit: web3.utils.toHex(gasLimit),
                to:to,
                value: web3.utils.toHex(web3.utils.toWei(balanceInEth)),
                chainId: config.CHAIN_ID
            }
            var privateKey = new Buffer.from(private, 'hex');
            var tx = new Tx(rawTransaction);
            tx.sign(privateKey);
            var serializedTx = tx.serialize();
            web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
            .then(receipt=>{
                console.log('Ether transfer to admin : ', receipt.transactionHash)
            })
            .catch(e=>{
                console.log(e)
            })
        })

    })
}
transferTokensToAdmin = function(from, to, private, wallet_type){
    return new Promise(async (resolve, reject) =>{
        var web3 = getWeb3()
        var gasPrice = await web3.eth.getGasPrice();
        var gasLimit = 61000;
        var contractAddress = getContractAddress(wallet_type)
        var contractInstance = new web3.eth.Contract(ABI, contractAddress);
        contractInstance.methods.balanceOf(from).call()
        .then( async result=>{
            var tokenBal = result;
            var decimals = wallet_type == 'USDT' ? 6: 18;
            if(tokenBal < 10 ** decimals) 
                return;
            var txCount = await web3.eth.getTransactionCount(from,'pending');
            let data = contractInstance.methods.transfer(to, tokenBal).encodeABI();
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
                console.log('Tokens transfer to admin : ', receipt.transactionHash)
                //update transaction as transferred
                db.updateTranferStatus(from, wallet_type);
                resolve(receipt.transactionHash)
            })
            .catch(e=>{
                resolve(null)
            })
        })
    })
}

//transfer tokens from user to admin wallet
function withdrawTokensFromUser(adminWallet, wallet, wallet_type){
    db.getUserWallet(wallet,wallet_type)
    .then(userWallet=>{
        //send transaction from user to admin
        console.log('Sending USDT from user wallet to admin,', userWallet, adminWallet.address)
        if(userWallet)
            transferTokensToAdmin(userWallet.address, adminWallet.address, userWallet.private, wallet_type)
    })
}

module.exports.initTokenTransfers = function(wallet_type){
    db.getTokenDeposits(wallet_type)
    .then(deposits=>{
        db.getAdminWallet('ETH')
        .then(adminWallet=>{
            if(adminWallet){ 
                for (let i = 0; i < deposits.length; i++) {
                    const wallet = deposits[i];
                    //get user wallet info_
                    withdrawTokensFromUser(adminWallet, wallet, wallet_type)
                }
            }
        })
    })
}

module.exports.sendDepositToAdmin = function(user, wallet_type){
    db.getAdminWallet('ETH')
    .then(adminWallet=>{
        if(adminWallet){ 
            withdrawTokensFromUser(adminWallet, user, wallet_type)
        }
    })
}


//transfer ether from user to admin
exports.withdrawEtherFromUser = function(transaction){
    //get admin wallet
    db.getAdminWallet('ETH')
    .then(adminWallet => {
        if(adminWallet){ 
            //get user wallet info_
            db.getUserWallet(transaction.user_id, transaction.wallet_type)
            .then(userWallet=>{
                //send transaction from user to admin
                sendEtherTransaction(userWallet.address, adminWallet.address, transaction.value, userWallet.private)
            })
        }
    })
    
}

//send ether transaction 
exports.transferEther = function(req, res){
    if(typeof req.body.from == 'undefined')
        return res.status(200).json({status: false, data:null, message:'Invalid sender wallet address, please provide sender wallet address'})
    if(typeof req.body.to == 'undefined')
        return res.status(200).json({status: false, data:null, message:'Invalid receiver wallet address, please provide receiver wallet address'})
    if(typeof req.body.amount == 'undefined')
        return res.status(200).json({status: false, data:null, message:'Invalid amount, please provide valid amount'})
    if(typeof req.body.private == 'undefined')
        return res.status(200).json({status: false, data:null, message:'Invalid key, please provide valid key'})
    if(req.body.amount < 0.001)
        return res.status(200).json({status: false, data:null, message:'Transfer amount should > 0.001'})
    else{
        var private = req.body.private.startsWith('0x') ? req.body.private.substr(2): req.body.private
        var privateKey = new Buffer(private, 'hex');
        if(!utils.isValidPrivate(privateKey)){
            return res.status(200).json({status: false, data:null, message:'Invalid private key, please provide valid private key associated with wallet'})
        }
        if(!(req.body.from.toLowerCase() == ('0x' + utils.privateToAddress(privateKey).toString('hex')).toLowerCase())){
            return res.status(200).json({status: false, data:null, message:'Provided private key is not associated with sender wallet'})
        }
        var web3 = getWeb3()
        //validate receiver address
        if(web3.utils.isAddress(req.body.to)){
            web3.eth.getBalance(req.body.from)
            .then(async (bal)=>{
                var balanceInEth = parseFloat(web3.utils.fromWei(bal, 'ether'))
                var gasPrice = await web3.eth.getGasPrice();
                var gasLimit = 23000;
                var tx_fees= parseFloat(web3.utils.fromWei((gasLimit * gasPrice * 1.3).toString(),'ether'))
                if(balanceInEth >= req.body.amount + tx_fees){
                    var from = req.body.from
                    var to = req.body.to
                    var amount = (req.body.amount).toString()
                    var txCount = await web3.eth.getTransactionCount(from,'pending');
                    var rawTransaction = {
                        nonce: web3.utils.toHex(txCount),
                        gasPrice: web3.utils.toHex(parseInt(gasPrice * 1.1)),
                        gasLimit: web3.utils.toHex(gasLimit),
                        to:to,
                        value: web3.utils.toHex(web3.utils.toWei(amount)),
                        chainId: config.CHAIN_ID
                    }
                    var privateKey = new Buffer(private, 'hex');
                    var tx = new Tx(rawTransaction);
                    tx.sign(privateKey);
                    var serializedTx = tx.serialize();
                    web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
                    .then(receipt=>{
                        return res.status(200).json({status: true, data:receipt.transactionHash, message:'transaction sent successfully'})  
                    })
                    .catch(e=>{
                        return res.status(200).json({status: false, data:e, message:'error while sending transaction'})  
                    })
                }else{
                    return res.status(200).json({status: false, data:balanceInEth, message:'insufficient ether balance in your wallet!'})
                }
            })
            .catch(r=>{
                return res.status(200).json({status: false, data:r, message:'error while initiating transaction'})  
            })
        }else{
            return res.status(200).json({status: false, data:null, message:'invalid receiver address, please provide valid address '})
        }
    }
}

//transfer ether from admin wallet
transferEthFromAdmin = function(req, res){
    if(typeof req.body.to == 'undefined')
        return res.status(200).json({status: false, data:null, message:'Invalid receiver wallet address, please provide receiver wallet address'})
    if(typeof req.body.amount == 'undefined')
        return res.status(200).json({status: false, data:null, message:'Invalid amount, please provide valid amount'})
    if(req.body.amount < 0.001)
        return res.status(200).json({status: false, data:null, message:'Transfer amount should be > 0.001'})
    else{
        db.getAdminWallet('ETH')
        .then(wallet=>{
            if(wallet){
                var web3 = getWeb3()
                //validate receiver address
                if(web3.utils.isAddress(req.body.to)){
                    web3.eth.getBalance(wallet.address)
                    .then(async (bal)=>{
                        var balanceInEth = parseFloat(web3.utils.fromWei(bal, 'ether'))
                        if(balanceInEth < req.body.amount + 0.001){
                            return res.status(200).json({status: false, data:balanceInEth, message:'insufficient ether balance in your wallet!'})
                        }
                        var gasPrice = await web3.eth.getGasPrice();
                        var gasLimit = 23000;
                            var from = wallet.address
                            var to = req.body.to
                            var amount = (req.body.amount).toString()
                            var txCount = await web3.eth.getTransactionCount(from,'pending');

                            var rawTransaction = {
                                nonce: web3.utils.toHex(txCount),
                                gasPrice: web3.utils.toHex(parseInt(gasPrice * 1.1)),
                                gasLimit: web3.utils.toHex(gasLimit),
                                to:to,
                                value: web3.utils.toHex(web3.utils.toWei(amount)),
                                chainId: config.CHAIN_ID
                            }
                            var privateKey = new Buffer.from(wallet.private, 'hex');
                            var tx = new Tx(rawTransaction);
                            tx.sign(privateKey);
                            var serializedTx = tx.serialize();
                            web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
                            .then(receipt=>{
                                return res.status(200).json({status: true, data:receipt.transactionHash, message:'transaction sent successfully'})  
                            })
                            .catch(e=>{
                                return res.status(200).json({status: false, data:e, message:'error while sending transaction'})  
                            })
                    })
                    .catch(r=>{
                        return res.status(200).json({status: false, data:r, message:'error while initiating transaction!'})  
                    })
                }else{
                    return res.status(200).json({status: false, data:null, message:'invalid receiver address, please provide valid address '})
                }
            }else{
                return res.status(200).json({status: false, data:null, message:'unable to send transaction, please try again after sometime!'})
            }
        })
    }
}

transferERCToken = async function(req, res){
    let to = req.body.to;
    var web3 = getWeb3()
    var gasPrice = await web3.eth.getGasPrice();
    var gasLimit = 90000;
    var wallet_type = req.params.coin;
    let private = req.body.private
    var contractAddress = getContractAddress(wallet_type)
    var decimals = wallet_type == 'USDT' ? 6: 18;
    var contractInstance = new web3.eth.Contract(ABI, contractAddress);
    if(web3.utils.isAddress(req.body.to)){
        db.getAdminWallet('ETH')
        .then(wallet=>{
            if(wallet){
                contractInstance.methods.balanceOf(wallet.address).call()
                .then(async result=>{
                    var tokenBal = result / (10 ** decimals)
                    if(req.body.amount <= tokenBal){
                        var from = wallet.address;
                        var amount = (req.body.amount * (10 ** decimals)).toString()
                        amount = util.noExponents(amount)
                        var txCount = await web3.eth.getTransactionCount(from,'pending');

                        let data = contractInstance.methods.transfer(to, amount).encodeABI();
                        var rawTransaction = {
                            nonce: web3.utils.toHex(txCount),
                            gasPrice: web3.utils.toHex(parseInt(gasPrice * 1.1)),
                            gasLimit: web3.utils.toHex(gasLimit),
                            to:contractAddress,
                            data: data,
                            value: "0x0",
                            chainId: config.CHAIN_ID
                        }
                        var privateKey = new Buffer.from(wallet.private, 'hex');
                        var tx = new Tx(rawTransaction);
                        tx.sign(privateKey);
                        var serializedTx = tx.serialize();
                        web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
                        .then(receipt=>{
                            return res.status(200).json({status: true, data:receipt.transactionHash, message:'transaction sent successfully'})  
                        })
                        .catch(e=>{
                            return res.status(200).json({status: false, data:e, message:'error while sending transaction, please try again after sometime!'})  
                        })
                    }else{
                        return res.status(200).json({status: false, data:tokenBal, message:'insufficient funds in sender wallet'})  
                    }
                })
            }
            else{
                return res.status(200).json({status: false, data:null, message:'unable to send transaction, please try again after sometime!'})
            }
        })
    }else{
        return res.status(200).json({status: false, data:null, message:'invalid receiver address, please provide valid address '})
    }
}
module.exports.transferEtherFromAdmin = function(req, res){
    transferEthFromAdmin(req, res)
}

module.exports.transferTokenFromAdmin = function(req, res){
    transferERCToken(req, res)
}
