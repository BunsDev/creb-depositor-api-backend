const RippleAPI = require('ripple-lib').RippleAPI;

const config = require('../config/index');
const db = require('../db/database');

const api = new RippleAPI({
    server: config.RIPPLE_SERVER
});
 var account1 =  config.RIPPLE_WALLET // 'razhqrAFyGGGYNJtSRyjqo1tAajf3Fhsum';
 api.on('error', (errorCode, errorMessage) => {
    console.log(errorCode + ': ' + errorMessage);
  });
  api.on('connected', () => {
    console.log('connected');
  });
  api.on('disconnected', (code) => {
    console.log('disconnected, code:', code);
  });

function connect(){
  return new Promise((resolve, reject)=>{
      if(api.isConnected)
          resolve()
      api.connect()
      .then(()=>resolve())
      .catch(()=>resolve())
  })
}

function getnewaddress(){
  connect()
  .then(()=>{
      var keys = api.generateAddress()
      console.log(keys);
  })
  .catch(e=>{
    console.log(e)
  })
}
//get wallet balances 
module.exports.getXRPBalance = function(req, res){
  var address = req.params.address;
  connect()
  .then(()=>{
      api.getBalances(address)
      .then(balances=>{
        var balDoc = balances.filter(function (obj) { return  obj.currency == 'XRP' ; })[0];
        res.status(200).json({status: true, data:balDoc.value, message: 'success'})
      })
      .catch(e=>{
          res.status(200).json({status: false, data:0, message: 'failure'})
      })
  })
  .catch(e=>{
      res.status(200).json({status: false, data:0, message: 'failure'})
  })
}
module.exports.getBalance = function(address){
  return new Promise((resolve, reject)=>{
    connect()
    .then(()=>{
        api.getBalances(address)
        .then(balances=>{
          var balDoc = balances.filter(function (obj) { return  obj.currency == 'XRP' ; })[0];
          resolve(balDoc.value)
        })
        .catch(e=>{
          resolve(0)
        })
    })
    .catch(e=>{
      resolve(0)
    })
  })
}
//TODO 

//filter transactions
function filterTransactions(transactions, address){
  return transactions.filter(tx=>tx.outcome.result === 'tesSUCCESS').map(txn=>{
      return{
          txId: txn.id,
          from:txn.specification.source.address,
          to: txn.specification.destination.address,
          value:txn.outcome.deliveredAmount.value,
          time: txn.outcome.timestamp,
          tag: txn.specification.destination.tag? txn.specification.destination.tag:0,
          fees:txn.outcome.fee,
          txnType: txn.specification.source.address === address ? 'out':'in'
      }
  })
}
//get wallet transactions 
module.exports.getTransactions = function(req, res){
  var address = config.RIPPLE_WALLET;
  connect().then(async()=>{
    const serverInfo = await api.getServerInfo();
          const ledgers = serverInfo.completeLedgers.split('-');
          const minLedgerVersion = Number(ledgers[0]);
          const options = {
              limit: 8,
              minLedgerVersion: minLedgerVersion
            }
       api.getTransactions(address, options).then(transaction => {
          return res.status(200).json({status: true, data:filterTransactions(transaction, address), message:'success'})
       })
       .catch(e=>{
        return res.status(200).json({status: true, data:[], message:''})
    })
  })
  .catch(e=>{
    return res.status(200).json({status: false, data:[], message:'unable to get wallet transactions, please try again!'})
  })
}

transferXrp = function(data){
  return new Promise((resolve, reject)=>{
    const srcAddress = data.from;
    const dstAddress = data.to;
    const secret = data.secret;
    const amount = data.amount.toString();
    
    if(data.dstTag){
        var tag = data.dstTag;
        var destination = {
            address: dstAddress,
            tag: tag,
            amount: {
                value: amount,
                currency: 'XRP'
                }
            }
    }else{
        var destination = {
            address: dstAddress,
            amount: {
                value: amount,
                currency: 'XRP'
                }
            }
    }
    const payment = {
        source: {
        address: srcAddress,
        maxAmount: {
            value: amount,
            currency: 'XRP'
        }
        },
        destination: destination
    };
    function quit(message) {
        if(message.engine_result == 'tesSUCCESS'){
            resolve(message.tx_json.hash)
        }else{
            resolve(null)
        }
    }
    function fail(message) {
        resolve(null);
    }
    connect().then(() => {
        return api.preparePayment(srcAddress, payment).then(prepared => {
        const {signedTransaction} = api.sign(prepared.txJSON, secret);
        api.submit(signedTransaction).then(quit, fail);
        });
    })
    .catch(fail); 
  })
}

//send transaction
module.exports.transferXRP = (req,res)=>{
  if(typeof req.body.to == 'undefined')
    return res.status(200).json({status: false, data:null, message:'Invalid receiver wallet address, please provide receiver wallet address'})
  if(typeof req.body.amount == 'undefined')
    return res.status(200).json({status: false, data:null, message:'Invalid amount, please provide valid amount'})
  if(req.body.amount < 0.001)
    return res.status(200).json({status: false, data:null, message:'Transfer amount should be > 0.001'})
  else{
    if(!config.XRP_SECRETE)
      return res.status(200).json({status: false, data:null, message:'internal server error, please try again after sometime!'})
    var data = {}; 
    data.from = config.RIPPLE_WALLET;
    data.secret = config.XRP_SECRETE;
    data.to = req.body.to;
    data.amount = req.body.amount;
    if(req.body.destination_tag == null || typeof req.body.destination_tag == 'undefined'){
        data.dstTag = null;
    }else{
        data.dstTag = req.body.destination_tag;
    }
    transferXrp(data).then(hash=>{
      if(hash && hash != null){
          return res.status(200).type('application/json').json({status:true, data:hash, message:'transfer success'});
      }else{
          return res.status(300).type('application/json').json({status:false, data:null, message:'internal server error'});
      }
    })
  }
}



//add deposit to user account
function checkAndAddDeposit(data){
  return new Promise((resolve, reject)=>{
    var tag = data.tag.toString();
    if(tag){
      db.findXRPDestinationTag(tag)
      .then(user=>{
        if(!user){
          console.log('no user with destination tag : ', tag)
          resolve(null)
        }
        else{
          //add deposit
            var transaction = {
                user_id: user.user_id,
                wallet_type:'XRP',
                from_address: data.from,
                to_address: data.tag,
                value: data.deliveredAmount,
                transaction_fee : 0,
                requested_value:data.deliveredAmount,
                activity_type:'Deposit',
                transaction_hash: data.hash,
                block_confirmations:1,
                status:1,
                confirmed: true,
                created_at: new Date()
            }
            db.addBTCDeposit(transaction)
            .then(resp=>{
                resolve(resp)
            })
          }
      })
    }
  })
}

function transactionListener(address){}
  api.connect().then( () => {    
    var processedTrx =[]
    api.connection.on('transaction', (ev) => {
      console.log("New XRP transaction : ",ev.meta);
      if(ev.meta.TransactionResult === "tesSUCCESS" && ev.transaction.Destination === account1 && ev.transaction.TransactionType === 'Payment'){
        // checkAndAddDeposit(ev)
      }else{
        console.log("fake transaction")
      }
   }) 
   return api.connection.request({
    command: 'subscribe',
    accounts: [ account1 ]
  })
})

// transactionListener()
// setTimeout(transactionListener, 30*60*1000)

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
function processTransactions(){
  connect()
  .then(async()=>{
    const serverInfo = await api.getServerInfo();
        const ledgers = serverInfo.completeLedgers.split('-');
        const minLedgerVersion = Number(ledgers[0]);
        const options = {
            limit: 8,
            minLedgerVersion: minLedgerVersion
          }
     api.getTransactions(config.RIPPLE_WALLET, options).then(transaction => {
      /* ... */
      var myLoop = syncLoop(transaction.length, function(loop){
        setTimeout(function(){
            var i = loop.iteration();
            var element = transaction[i]
            if(element.type.toLocaleLowerCase() == 'payment'){
              let data = {
                 from : element.specification.source.address? element.specification.source.address:'',
                 to:element.specification.destination.address ?element.specification.destination.address :'',
                 tag :element.specification.destination.tag?element.specification.destination.tag:'',
                 result: element.outcome.result,
                 deliveredAmount: parseFloat(element.outcome.deliveredAmount.value),
                 hash: element.id
              }
              if(data.result == 'tesSUCCESS' && data.to == config.RIPPLE_WALLET && data.tag != '' ){
                  //add deposit
                  checkAndAddDeposit(data);
              }
           }
    	    loop.next();
        }, 1500);
    }, function(){
        console.log('done');
    });
    });
  })
  .catch(e=>{
    console.log(e)
  })
}

connect()
setInterval(processTransactions, 3*60*1000)