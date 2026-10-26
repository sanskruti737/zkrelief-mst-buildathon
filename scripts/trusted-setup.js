const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const circuitsDir = path.join(rootDir, "circuits");
const buildDir = path.join(circuitsDir, "build");
const r1csPath = path.join(buildDir, "eligibility.r1cs");
const ptauPath = path.join(circuitsDir, "pot12_final.ptau");
const zkey0Path = path.join(buildDir, "eligibility_0000.zkey");
const zkeyFinalPath = path.join(buildDir, "eligibility_final.zkey");
const vkeyPath = path.join(buildDir, "verification_key.json");
const verifierPath = path.join(rootDir, "contracts", "Verifier.sol");

const PHASE1_ENTROPY =
  process.env.PHASE1_ENTROPY || "zkrelief-development-only-phase1-entropy";
const PHASE2_ENTROPY =
  process.env.PHASE2_ENTROPY || "zkrelief-development-only-phase2-entropy";
const FORCE = process.argv.includes("--force");

const snarkjsCli = path.join(rootDir, "node_modules", "snarkjs", "build", "cli.cjs");

function snarkjs(args) {
  execFileSync(process.execPath, [snarkjsCli, ...args], {
    stdio: "inherit",
    cwd: rootDir,
  });
}

function generateDevelopmentPtau() {
  console.log(
    "Generating a reproducible development-only Powers of Tau (2^12 constraints)."
  );
  const ptau0 = path.join(circuitsDir, "pot12_0000.ptau");
  const ptau1 = path.join(circuitsDir, "pot12_0001.ptau");

  snarkjs(["powersoftau", "new", "bn128", "12", ptau0, "-v"]);
  snarkjs([
    "powersoftau",
    "contribute",
    ptau0,
    ptau1,
    "--name=ZKRelief Dev Phase1",
    `-e=${PHASE1_ENTROPY}`,
    "-v",
  ]);
  snarkjs(["powersoftau", "prepare", "phase2", ptau1, ptauPath, "-v"]);

  for (const file of [ptau0, ptau1]) {
    if (fs.existsSync(file)) fs.rmSync(file);
  }
}

try {
  if (!fs.existsSync(r1csPath)) {
    throw new Error(
      `Missing ${r1csPath}. Run "npm run circuits:compile" first.`
    );
  }

  if (FORCE || !fs.existsSync(ptauPath)) {
    generateDevelopmentPtau();
  }

  console.log("Running Groth16 setup...");
  snarkjs(["groth16", "setup", r1csPath, ptauPath, zkey0Path]);

  console.log("Applying deterministic development phase-2 contribution...");
  snarkjs([
    "zkey",
    "contribute",
    zkey0Path,
    zkeyFinalPath,
    "--name=ZKRelief Dev Phase2",
    `-e=${PHASE2_ENTROPY}`,
  ]);

  console.log("Verifying final zkey against the circuit...");
  snarkjs(["zkey", "verify", r1csPath, ptauPath, zkeyFinalPath]);

  console.log("Exporting verification key...");
  snarkjs(["zkey", "export", "verificationkey", zkeyFinalPath, vkeyPath]);

  console.log("Generating Solidity verifier from the real circuit...");
  snarkjs(["zkey", "export", "solidityverifier", zkeyFinalPath, verifierPath]);

  console.log("Setup complete.");
  console.log("  zkey:      ", zkeyFinalPath);
  console.log("  vkey:      ", vkeyPath);
  console.log("  verifier:  ", verifierPath);
  console.log(
    "NOTE: This is a development-only trusted setup. Production requires a multi-party ceremony and an audit."
  );
} catch (error) {
  console.error("Setup failed:", error.message);
  process.exit(1);
}
