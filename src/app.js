const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

require('dotenv').config();

const middlewares = require('./middlewares');
const mongoose = require('./db/mongoose')
const api = require('./api/index')
const config = require('./config/index')
const transfer = require('./transfers/transfer')
//const deamon = require('./bitcoin/bitcoin_deamon')
const token_listener = require('./ether/token_listener')
const eth_listener = require('./ether/ether_listener')

const btc_withdraw = require('./withdrawl/btc_withdraw')

var PORT = config.PORT
var HOST = config.HOST

const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(function(req, res, next){
  var token = req.query.token || req.body.token;
  if(token == config.AUTH_KEY){
    next()
  }else{
    return res.status(401).json({message:'invalid request'})
  }
})
app.use('/api/wallet', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

app.listen(PORT, HOST, () => {
  /* eslint-disable no-console */
  console.log(`Listening: http://${HOST}:${PORT}`);
  /* eslint-enable no-console */
});
