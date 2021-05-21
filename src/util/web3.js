var Web3 = require('web3')
var config = require('../config/index')

exports.noExponents= function(val){
    var data= String(val).split(/[eE]/);
    if(data.length== 1) return data[0]; 

    var  z= '', sign= this<0? '-':'',
    str= data[0].replace('.', ''),
    mag= Number(data[1])+ 1;

    if(mag<0){
        z= sign + '0.';
        while(mag++) z += '0';
        return z + str.replace(/^\-/,'');
    }
    mag -= str.length;  
    while(mag--) z += '0';
    return str + z;
}

//get web3 httpProvider
exports.getWeb3 = ()=>{
    return new Web3(new Web3.providers.HttpProvider(config.INFURA_URL));
}

//get web3 httpProvider
exports.getLocalWeb3 = ()=>{
    return new Web3(new Web3.providers.HttpProvider(config.HttpProvider));
}
