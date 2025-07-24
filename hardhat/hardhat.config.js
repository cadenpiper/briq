require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const privateKey = process.env.PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        chainId: 1,
      },
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [privateKey],
      chainId: 11155111,
    },
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
    currencyDisplayPrecision: 5,
    token: 'ETH',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    gasPriceApi: `https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=${process.env.ETHERSCAN_API_KEY}`
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
