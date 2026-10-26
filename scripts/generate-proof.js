const fs = require("fs");
const path = require("path");
const {
  BUILD_DIR,
  createDemoCampaign,
  generateProof,
  verifyProof,
  toSolidityCalldata,
} = require("./lib/zk");

function stringify(value) {
  return JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

function parseArgs(argv) {
  const args = { campaignId: 1, index: 0, outDir: path.join(BUILD_DIR, "demo") };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--campaign-id") args.campaignId = Number(argv[++i]);
    else if (arg === "--index") args.index = Number(argv[++i]);
    else if (arg === "--out") args.outDir = path.resolve(argv[++i]);
  }
  return args;
}

async function main() {
  const { campaignId, index, outDir } = parseArgs(process.argv.slice(2));
  const campaign = await createDemoCampaign({ campaignId });
  const credential = campaign.credentials[index];

  if (!credential) {
    throw new Error(`No demo credential at index ${index}`);
  }

  console.log(`Generating Groth16 proof for synthetic credential #${credential.id}...`);
  const result = await generateProof(credential, campaignId);

  const valid = await verifyProof(result.proof, result.publicSignals);
  if (!valid) {
    throw new Error("Off-chain proof verification failed");
  }

  const { a, b, c, input } = toSolidityCalldata(result.proof, result.publicSignals);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "credential.json"), JSON.stringify(credential, null, 2));
  fs.writeFileSync(path.join(outDir, "proof.json"), stringify(result.proof));
  fs.writeFileSync(
    path.join(outDir, "public.json"),
    stringify(result.publicSignals)
  );
  fs.writeFileSync(
    path.join(outDir, "calldata.json"),
    stringify({ a, b, c, input })
  );

  console.log("Proof generated and verified off-chain.");
  console.log("Public signals:", result.publicSignals);
  console.log("Expected order: [root, nullifier, campaignId]");
  console.log("Nullifier:", result.nullifier);
  console.log("Artifacts written to:", outDir);
}

module.exports = { generateProof, verifyProof };

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
