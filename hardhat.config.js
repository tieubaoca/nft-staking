require("@nomicfoundation/hardhat-toolbox");

require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  defaultNetwork: "hardhat",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    local: {
      url: "HTTP://127.0.0.1:8545",
      accounts: "remote",
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s2.binance.org:8545/",
      chainId: 97,
      accounts: [process.env.PRI_KEY],
    },
    mainnet: {
      url: "https://rpc.ankr.com/bsc",
      chainId: 56,
      accounts: [process.env.PRI_KEY],
    },
  },
};
