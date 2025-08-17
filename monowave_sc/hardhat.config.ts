import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load environment variables from root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: resolve(__dirname, "../.env") });

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthers],
  paths: {
    sources: resolve(__dirname, "./contracts"),
    tests: resolve(__dirname, "./test"),
    cache: resolve(__dirname, "./cache"),
    artifacts: resolve(__dirname, "./artifacts")
  },
  typechain: {
    outDir: resolve(__dirname, "./types"),
    target: "ethers-v6"
  },
  solidity: {
    version: "0.8.25",
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
      type: "edr-simulated",
      chainId: 1337,
      allowUnlimitedContractSize: true
    },
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8546",
      chainId: 1337,
      allowUnlimitedContractSize: true
    },
    baseSepolia: {
      type: "http",
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532
    },
    base: {
      type: "http",
      url: process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453
    },
    arbitrum: {
      type: "http",
      url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42161
    },
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 10
    },
    goerli: {
      type: "http",
      url: process.env.GOERLI_RPC_URL || "https://goerli.infura.io/v3/YOUR-PROJECT-ID",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 5
    },
    // Plasma testnet
    plasmaTestnet: {
      type: "http",
      url: "https://testnet-rpc.plasma.to",
      chainId: 9746,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || "",
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api.etherscan.io",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.etherscan.io",
          browserURL: "https://basescan.org",
        },
      },
    ],
  }
};

export default config;
