const { ethers } = require("ethers");

const RPC_URL = process.env.MST_RPC_URL || "https://testnetrpc.mstblockchain.com";
const EXPECTED_CHAIN_ID = BigInt(process.env.MST_CHAIN_ID || "91562037");
const FAUCET_URL = process.env.MST_FAUCET_URL || "https://faucet.mstblockchain.com";
const EXPLORER_URL = process.env.MST_EXPLORER_URL || "https://testnet.mstscan.com";

async function main() {
  console.log("Checking MST Testnet:", RPC_URL);
  const provider = new ethers.JsonRpcProvider(RPC_URL, Number(EXPECTED_CHAIN_ID));
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();
  const feeData = await provider.getFeeData();

  console.log("chainId:", network.chainId.toString());
  console.log("latest block:", blockNumber);
  console.log("gas price:", feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, "gwei") + " gwei" : "unavailable");
  console.log("explorer:", EXPLORER_URL);

  if (network.chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(
      `Chain ID mismatch: RPC returned ${network.chainId}, expected ${EXPECTED_CHAIN_ID}`
    );
  }

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.log("\nDEPLOYER_PRIVATE_KEY is not set. Deployment cannot proceed.");
    console.log("Fund a deployer wallet from:", FAUCET_URL);
    console.log("Then run: DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.js --network mstTestnet");
    return;
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);
  console.log("\nDeployer address:", wallet.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "tMSTC");

  if (balance === 0n) {
    console.log("Deployer has no testnet funds. Request tMSTC from:", FAUCET_URL);
    return;
  }

  console.log("Deployer is funded. Deploy with:");
  console.log("  npx hardhat run scripts/deploy.js --network mstTestnet");
}

main().catch((error) => {
  console.error("MST check failed:", error.message);
  process.exitCode = 1;
});
