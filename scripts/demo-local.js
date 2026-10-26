const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const {
  createDemoCampaign,
  generateProof,
  verifyProof,
  toSolidityCalldata,
} = require("./lib/zk");

function bytes32(value) {
  return hre.ethers.toBeHex(BigInt(value), 32);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("=== ZKRelief Local Demo ===");
  console.log("Network:", hre.network.name, "chainId:", network.chainId.toString());
  console.log("Deployer:", deployer.address);

  const ZKRelief = await hre.ethers.getContractFactory("ZKRelief");
  const zkRelief = await ZKRelief.deploy();
  await zkRelief.waitForDeployment();
  const contractAddress = await zkRelief.getAddress();
  const verifierAddress = await zkRelief.verifier();
  console.log("ZKRelief deployed:", contractAddress);
  console.log("Groth16 verifier deployed:", verifierAddress);

  const campaign = await createDemoCampaign({ campaignId: 1 });
  const createTx = await zkRelief.createCampaign(
    "Synthetic Emergency Relief",
    "Local demo campaign with synthetic beneficiaries",
    8,
    bytes32(campaign.root)
  );
  await createTx.wait();
  console.log("\nCampaign created. Merkle root:", campaign.root);

  const credential = campaign.credentials[0];
  console.log(`Generating proof for synthetic beneficiary #${credential.id}...`);
  const result = await generateProof(credential, 1);
  const offChainValid = await verifyProof(result.proof, result.publicSignals);
  console.log("Off-chain proof verification:", offChainValid ? "PASS" : "FAIL");
  if (!offChainValid) throw new Error("Off-chain verification failed");

  const { a, b, c, input } = toSolidityCalldata(result.proof, result.publicSignals);

  const before = await zkRelief.getCampaign(1);
  console.log("\nBefore claim -> claimed:", before.claimed.toString(), "allocation:", before.allocation.toString());

  const claimTx = await zkRelief.submitClaim(1, a, b, c, input);
  const receipt = await claimTx.wait();
  console.log("Valid claim tx:", receipt.hash, "status:", receipt.status === 1 ? "SUCCESS" : "FAILED");

  const after = await zkRelief.getCampaign(1);
  const remaining = after.allocation - after.claimed;
  console.log("After claim  -> claimed:", after.claimed.toString(), "remaining:", remaining.toString());
  if (after.claimed !== 1n) throw new Error("Claim total did not update");

  const nullifierUsed = await zkRelief.isNullifierUsed(1, bytes32(result.nullifier));
  console.log("Nullifier recorded on-chain:", nullifierUsed);
  if (!nullifierUsed) throw new Error("Nullifier was not recorded");

  console.log("\nAttempting the same claim again (must be rejected)...");
  let duplicateRejected = false;
  let duplicateReason = "";
  try {
    const dupTx = await zkRelief.submitClaim(1, a, b, c, input);
    await dupTx.wait();
  } catch (error) {
    duplicateRejected = true;
    duplicateReason = error.shortMessage || error.message;
  }

  const finalCampaign = await zkRelief.getCampaign(1);
  console.log("Duplicate claim rejected:", duplicateRejected);
  console.log("Revert reason:", duplicateReason);
  console.log("Claimed after duplicate attempt:", finalCampaign.claimed.toString());

  if (!duplicateRejected) throw new Error("Duplicate claim was incorrectly accepted");
  if (finalCampaign.claimed !== 1n) throw new Error("Duplicate claim changed totals");

  const outDir = path.join(__dirname, "..", "demo-output");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "demo-result.json"),
    JSON.stringify(
      {
        network: hre.network.name,
        chainId: network.chainId.toString(),
        deployer: deployer.address,
        contractAddress,
        verifierAddress,
        campaignId: 1,
        merkleRoot: campaign.root,
        nullifier: result.nullifier,
        validClaimTx: receipt.hash,
        claimed: finalCampaign.claimed.toString(),
        remaining: (finalCampaign.allocation - finalCampaign.claimed).toString(),
        offChainValid,
        duplicateRejected,
        duplicateReason,
      },
      null,
      2
    )
  );

  console.log("\nDemo artifacts written to demo-output/demo-result.json");
  console.log("=== DEMO PASSED ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
