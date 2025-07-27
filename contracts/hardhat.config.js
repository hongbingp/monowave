require("@nomicfoundation/hardhat-toolbox");
// Load environment variables from root directory
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true
    },
    localhost: {
      url: "http://127.0.0.1:8546",
      chainId: 1337,
      allowUnlimitedContractSize: true
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42161
    },
    optimism: {
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 10
    },
    goerli: {
      url: process.env.GOERLI_RPC_URL || "https://goerli.infura.io/v3/YOUR-PROJECT-ID",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 5
    },
    // Plasma testnet
    plasmaTestnet: {
      url: "https://testnet-rpc.plasma.to",
      chainId: 9746,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      optimisticEthereum: process.env.OPTIMISTIC_ETHERSCAN_API_KEY || "",
      goerli: process.env.ETHERSCAN_API_KEY || ""
    }
  }
};