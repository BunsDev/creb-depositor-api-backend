var production = process.env.NODE_ENV == 'production'
console.log('Using bitcoin api: ', production);
console.log('Do not forget to add wallet keys in production mode :')
module.exports = {
    PRODUCTION : production,
    PORT: process.env.PORT || 8080,
    HOST: production ? 'localhost':'localhost',
    MONGOURL : production ? 'mongodb://atsUSER:ATS49TVXT8wjFv5J@149.248.59.122:27017/atlantis': 'mongodb://ats:ats_user_db_2020@128.199.129.139/atlantis-dev',
    SECRET: 'dfdsgue@uhiue',
    API_KEY: 'E415BD9AFsklaDF1yF5BA271BC6FE5AFAHBJHGIKYHGG',
    AUTH_KEY: 'EK9xYdkTobq2Ty9ycwFR1vqgDPzpdxNRMPcwwK3AaCr2t6O0sxRQSIepgi3l',
    //BITCOIN_API: production ? 'http://144.202.13.138:3000': 'http://localhost:3000',
    WALLET_NAME: production ? 'creb': 'creb',
    NETWORK: production ? 'mainnet' :'testnet',
    UPDATE_RATE:4 * 60 * 1000, //one minute
    TRANSACTION_RATE: 40,
    BLOCK_UPDATE_RATE: 1.5 * 60 * 1000,
    CONFIRMATIONS:1,
    WITHDRAW_RATE: 15 * 60 * 1000, //every 10 minutes
    WALLET_PASSWORD: process.env.WALLET_PASSWORD || 'qwerty123',
    CHAIN_ID: production ? 1 : 4,
    ENCRYPT_PASS:'s1XrWeMEc2aJn1tu5HMpAtLs',
    TOKEN_TRANSER_RATE: 6*60*60*1000,
    FUNDING_WALLET: process.env.FUNDING_WALLET || "0xa09ce6406f34a0638791c5a4f8b7f55f7c1ded6c",
    FUNDING_KEY: process.env.FUNDING_KEY,
    RIPPLE_WALLET: production ? 'rNSKa64rZUdJAU4JtX42hbjKGByRrU6DEw':'rHot7TtvLXiyfuWGePhnJXKmZtEMxy1aZd', //snJC1dYcHMd8yspUTGpbzGg3nsj7v
    RIPPLE_SERVER: production ? 'wss://s2.ripple.com/':'wss://s.altnet.rippletest.net:51233',
    XRP_SECRETE: production? process.env.XRP_SECRETE : 'snJC1dYcHMd8yspUTGpbzGg3nsj7v',
    INFURA_URL : production ? 'https://mainnet.infura.io/v3/d24ade7356834495b1fd3e0e1e338147':'https://rinkeby.infura.io/v3/d24ade7356834495b1fd3e0e1e338147', //bitbaazi@gmail.com
    //user mail pocketaqua2020@gmail.com Qwerty@123
    MIN_TOKEN_TRANSFER: 200,
    NONCE:process.env.NONCE || 0,
    WALLET_TYPE:{
        ETH: 'ETH',
       // BTC: 'BTC',
        USDT:'USDT',
        //SML:'SML'
    },
    TOKENS:{
        USDT:{
            CONTRACT_ADDRESS: production ? '0xdAC17F958D2ee523a2206206994597C13D831ec7':'0xb4e077e0679a17497e700276bbe8e79a04c3ac30',
            DECIMALS: 6,
            SHORT_NAME:'USDT'
        },
       PDT:{
            CONTRACT_ADDRESS: production ? '0xcde07f2d976b2687944ad2c70e2cec9a7034b75b': '0x3c44d3093c8798c8d4737fc9a00897a3a3135cee',
            DECIMALS: 18,
            SHORT_NAME: 'PDT'
        }
    },
    TOKEN_LISTERS:['USDT'],
    SINGLE_CALL_BALANCES_ADDRESS: production ? '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39':'0x53e8979b4b47Ca7B7CAcbD2A1f14EfF021464b16',
    //PDT transfer wallets
   // BTC_ADDRESS: production ? '37h6hgDRo8AAH3BUXhAx9dgohcP8YSCEje':'tb1qmm9k6j4z420cs2wuv34erhcpyp67ew4t03s3pu',
    ETH_ADDRESS: '0x1d702D8e51a698eC7727F0B17000a3D6ca484462',
    USDT_ADDRESS: '0x1d702D8e51a698eC7727F0B17000a3D6ca484462',
    ADMIN_ETH_ADDRESS: '0x42285A28B4aeFE9289b346D7e322082D05A64aA3',
    ADMIN_ETH_KEY: process.env.ADMIN_ETH_KEY || '',
    //PDT_SECRETE:process.env.PDT_SECRETE,
    //PDT_WALLET:"0x17fe8454ADe36a6dEF39f9A7eEA9a71c8bCC1203"
}
