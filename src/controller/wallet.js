const etherWallet = require('ethereumjs-wallet')

const ether = require('../ether/api')
// const xrp = require('../xrp/webSocket')

function generateEtherAddress(req, res){
    const myWallet = etherWallet.generate()
    const ethAddress = myWallet.getAddressString().toLowerCase()
    const privateKey = myWallet.getPrivateKeyString()
    const publicKey = myWallet.getPublicKeyString();
    var pk = privateKey.startsWith("0x") ? privateKey.substr(2) : privateKey;
    if(ethAddress && pk){
        return res.status(200).json({status: true, data:{address: ethAddress, private: pk, public: publicKey}, message: 'wallet created successfully'})
    }else{
        return res.status(200).json({status: false, data:null, message: 'unable to create wallet,'})
    }
}

//handle wallet creation route
exports.createWallet = function(req, res){
    let wallet_type  = req.params.coin;
    
    switch (wallet_type) {
        //case 'BTC': bitcoin.generateBitcoinAddress(req, res);
          //  break;
        case 'ETH': generateEtherAddress(req, res);
            break;
        //case 'SML': generateEtherAddress(req, res);
          //  break;
        case 'USDT': generateEtherAddress(req, res);
            break;
        default:
            res.status(200).json({status: false, data: null, message: 'invalid coin type selected!'})
            break;
    }
}

//handle transfer router
exports.sendTransaction = function(req, res){
    let wallet_type = req.params.coin;
    switch (wallet_type) {
        //case 'BTC': bitcoin.sendTransaction(req, res);
          //  break;
        case 'ETH': ether.transferEther(req, res);
            break;
        case 'USDT': ether.transferToken(req, res)
          break;
        //case 'PDT': ether.transferToken(req,res)
          //  break;
        default:            
            res.status(200).json({status: false, data: null, message: 'invalid coin type selected!'})
            break;
    }
}
module.exports.transferFromAdmin = function(req, res){
    let wallet_type = req.params.coin;
    switch (wallet_type) {
        //case 'BTC': bitcoin.sendTransaction(req, res);
          //  break;
        case 'ETH': ether.transferEtherFromAdmin(req, res);
            break;
        case 'USDT': ether.transferTokenFromAdmin(req, res)
            break;
        //case 'PDT': ether.transferToken(req,res)
          //  break;
        //case 'XRP': xrp.transferXRP(req, res);
          //  break;
        default:            
            res.status(200).json({status: false, data: null, message: 'invalid coin type selected!'})
            break;
    }
}

//get wallet balance
exports.getWalletBalances = function(req, res){
    let wallet_type = req.params.coin;

    switch (wallet_type) {
        
        case 'ETH': ether.getBalance(req, res)
            break;
        case 'USDT': ether.getUSDTBalance(req, res);
            break;
        
        default: 
            res.status(200).json({status: false, data: null, message: 'invalid coin type selected!'})
            break;
    }
}

module.exports.transferDepositsToAdmin = function(req, res){
    let wallet_type = req.params.coin;
    if(wallet_type == 'USDT' ){
        res.status(200).json({status: true, data: null, message: 'processing token transfers!'})
        ether.initTokenTransfers(wallet_type)
    }else{
        res.status(200).json({status: false, data: null, message: 'invalid coin type selected!'})
    }
    
}
module.exports.getTransactions = function(req, res){
    let wallet_type = req.params.coin;
    if(wallet_type == 'XRP'){
        xrp.getTransactions(req, res)
    }else{
        res.status(200).json({status: false, data: null, message: 'invalid coin type selected!'})
    } 
}
module.exports.getAdminBalances = function(req, res){
    return ether.getAdminBalance(req, res)
}
