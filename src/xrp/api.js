const RippleAPI = require('ripple-lib').RippleAPI;

const config = require('../config/index');

const api = new RippleAPI({
    server: config.RIPPLE_SERVER
});
 var account1 = config.RIPPLE_WALLET // 'razhqrAFyGGGYNJtSRyjqo1tAajf3Fhsum';
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
connect()
function getnewaddress(){
  connect()
  .then(async()=>{
    const address = account1;
    const serverInfo = await api.getServerInfo();
        const ledgers = serverInfo.completeLedgers.split('-');
        const minLedgerVersion = Number(ledgers[0]);
        const options = {
            limit: 10,
            minLedgerVersion: minLedgerVersion
          }
     api.getTransactions(address, options).then(transaction => {
      /* ... */
      transaction.forEach(element => {
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
                 console.log(JSON.stringify(data, undefined, 3))
             }
          }
      });
    });
    //   var keys = api.generateAddress()
    //   console.log(keys);
  })
  .catch(e=>{
    console.log(e)
  })
}

// setInterval(getnewaddress,3000)