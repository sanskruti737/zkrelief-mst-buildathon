const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("Deploying ZKRelief...");
  console.log("Network:", hre.network.name, "chainId:", network.chainId.toString());
  console.log("Deployer:", deployer.address);

  if (network.chainId !== 31337n) {
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", hre.ethers.formatEther(balance));
    if (balance === 0n) {
      throw new Error("Deployer has no native tokens; fund the wallet before deploying.");
    }
  }

  const ZKRelief = await hre.ethers.getContractFactory("ZKRelief");
  const zkRelief = await ZKRelief.deploy();
  await zkRelief.waitForDeployment();

  const contractAddress = await zkRelief.getAddress();
  const verifierAddress = await zkRelief.verifier();
  const deployment = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    zkRelief: contractAddress,
    verifier: verifierAddress,
    deployedAt: new Date().toISOString(),
  };

  console.log("ZKRelief deployed to:", contractAddress);
  console.log("Generated Groth16 verifier deployed to:", verifierAddress);

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const deploymentPath = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("Deployment written to:", deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
