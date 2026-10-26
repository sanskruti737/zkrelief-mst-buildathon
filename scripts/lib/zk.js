const fs = require("fs");
const path = require("path");
const snarkjs = require("snarkjs");
const { buildPoseidon } = require("circomlibjs");
const { MerkleTree } = require("../../utils/merkle");

const ROOT_DIR = path.join(__dirname, "..", "..");
const BUILD_DIR = path.join(ROOT_DIR, "circuits", "build");
const WASM_PATH = path.join(BUILD_DIR, "eligibility_js", "eligibility.wasm");
const ZKEY_PATH = path.join(BUILD_DIR, "eligibility_final.zkey");
const VKEY_PATH = path.join(BUILD_DIR, "verification_key.json");

const DEFAULT_LEVELS = 3;
const DEFAULT_CAMPAIGN_ID = 1;

// Synthetic demo secrets. These are NOT real credentials and must never be
// used for production beneficiaries.
const DEMO_SECRETS = [
  "737001", "737002", "737003", "737004",
  "737005", "737006", "737007", "737008",
];

function assertArtifacts() {
  for (const file of [WASM_PATH, ZKEY_PATH, VKEY_PATH]) {
    if (!fs.existsSync(file)) {
      throw new Error(
        `Missing ZK artifact: ${file}\nRun "npm run circuits:compile" and "npm run circuits:setup" first.`
      );
    }
  }
}

async function poseidonHash(inputs) {
  const poseidon = await buildPoseidon();
  return poseidon.F.toString(poseidon(inputs.map((x) => BigInt(x))));
}

async function createDemoCampaign({
  secrets = DEMO_SECRETS,
  levels = DEFAULT_LEVELS,
  campaignId = DEFAULT_CAMPAIGN_ID,
} = {}) {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const commitments = secrets.map((secret) =>
    F.toString(poseidon([BigInt(secret)]))
  );

  const tree = new MerkleTree(commitments, levels);
  await tree.init();
  const root = tree.getRoot();

  const credentials = secrets.map((secret, index) => {
    const proof = tree.getProof(index);
    return {
      id: index + 1,
      secret: String(secret),
      commitment: commitments[index],
      campaignId,
      merkleRoot: root,
      pathElements: proof.pathElements,
      pathIndices: proof.pathIndices,
    };
  });

  return { tree, root, credentials, commitments, campaignId, levels };
}

function credentialToCircuitInput(credential, campaignId) {
  const id = BigInt(campaignId ?? credential.campaignId);
  return {
    secret: String(credential.secret),
    pathElements: credential.pathElements.map(String),
    pathIndices: credential.pathIndices.map(String),
    root: String(credential.merkleRoot),
    // Filled in by generateProof after computing the nullifier.
    nullifier: "0",
    campaignId: id.toString(),
  };
}

async function computeNullifier(secret, campaignId) {
  return poseidonHash([secret, campaignId]);
}

async function generateProof(credential, campaignId = credential.campaignId) {
  assertArtifacts();
  const cid = BigInt(campaignId).toString();
  const nullifier = await computeNullifier(credential.secret, cid);
  const input = credentialToCircuitInput(credential, cid);
  input.nullifier = nullifier;

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    WASM_PATH,
    ZKEY_PATH
  );

  return { proof, publicSignals, input, nullifier, campaignId: cid };
}

async function verifyProof(proof, publicSignals, vkeyPath = VKEY_PATH) {
  const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf8"));
  return snarkjs.groth16.verify(vKey, publicSignals, proof);
}

function toSolidityCalldata(proof, publicSignals) {
  const a = [proof.pi_a[0], proof.pi_a[1]];
  const b = [
    [proof.pi_b[0][1], proof.pi_b[0][0]],
    [proof.pi_b[1][1], proof.pi_b[1][0]],
  ];
  const c = [proof.pi_c[0], proof.pi_c[1]];
  return { a, b, c, input: publicSignals };
}

module.exports = {
  ROOT_DIR,
  BUILD_DIR,
  WASM_PATH,
  ZKEY_PATH,
  VKEY_PATH,
  DEFAULT_LEVELS,
  DEFAULT_CAMPAIGN_ID,
  DEMO_SECRETS,
  assertArtifacts,
  poseidonHash,
  createDemoCampaign,
  credentialToCircuitInput,
  computeNullifier,
  generateProof,
  verifyProof,
  toSolidityCalldata,
};
