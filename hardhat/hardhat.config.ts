import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatKeystore from "@nomicfoundation/hardhat-keystore";
import { defineConfig, configVariable } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatKeystore],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    },
  },
  networks: {
    forkedArbitrum: {
      type: "edr-simulated",
      chainType: "generic",
      chainId: 31337,
      hardfork: "cancun",
      forking: {
        url: configVariable("ARBITRUM_RPC_URL"),
        blockNumber: 406900000,
      },
    },
    forkedEthereum: {
      type: "edr-simulated",
      chainType: "generic",
      chainId: 31338,
      hardfork: "cancun",
      forking: {
        url: configVariable("ETHEREUM_RPC_URL"),
      },
    },
    localArbitrum: {
      type: "http",
      chainType: "generic",
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    localEthereum: {
      type: "http",
      chainType: "generic",
      url: "http://127.0.0.1:8546",
      chainId: 31338,
    },
    arbitrum: {
      type: "http",
      chainType: "generic",
      url: configVariable("ARBITRUM_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
      chainId: 42161,
    },
    arbitrumSepolia: {
      type: "http",
      chainType: "generic",
      url: configVariable("ARBITRUM_SEPOLIA_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
      chainId: 421614,
    },
  },
});
