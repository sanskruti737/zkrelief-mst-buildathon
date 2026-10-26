const hre = require("hardhat");

async function main() {
  console.log("Deploying ZKRelief...");
  
  // Note: Verifier must be generated first
  const ZKRelief = await hre.ethers.getContractFactory("ZKRelief");
  const zkRelief = await ZKRelief.deploy();
  
  await zkRelief.waitForDeployment();
  
  console.log("ZKRelief deployed to:", await zkRelief.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
