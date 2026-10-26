import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Verified against https://docs.mstblockchain.com/developer-docs/foundation/development-networks-mst-testnet.md
const MST_TESTNET_RPC = "https://testnetrpc.mstblockchain.com";
const MST_TESTNET_CHAIN_ID = 91562037;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    mstTestnet: {
      url: process.env.MST_RPC_URL || MST_TESTNET_RPC,
      chainId: parseInt(process.env.MST_CHAIN_ID || String(MST_TESTNET_CHAIN_ID), 10),
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
