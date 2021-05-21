var express = require('express');
var router = express.Router();
var mainController = require('../controller/wallet')

var {verifyToken} = require('./authentocator')
var funding =require('../ether/auto_token_transfers')

// create wallet
router.get('/addr/:coin', mainController.createWallet);
router.post('/transfer/:coin', mainController.sendTransaction);
router.post('/admin/transfer/:coin', mainController.transferFromAdmin)
router.get('/admin/txs/:coin', mainController.getTransactions)
//get balance 
router.get('/balance/:coin/:address', mainController.getWalletBalances)
router.get('/balances/admin/:address', mainController.getAdminBalances)

//funding
router.get('/admin/fund-users', funding.fundether);
router.get('/admin/transfer-tokens/:coin', mainController.transferDepositsToAdmin)
router.get('/admin/withdraw-eth',funding.checkAndTransferEth)

module.exports = router;
// curl http://localhost:5600/api/wallet/admin/transfer-tokens/USDT?token=EK9xYdkTobq2Ty9ycwFR1vqgDPzpdxNRMPcwwK3AaCr2t6O0sxRQSIepgi3l