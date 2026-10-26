const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');

async function generateProof(input) {
  const buildDir = path.join(__dirname, '..', 'circuits', 'build');
  const wasmPath = path.join(buildDir, 'eligibility_js', 'eligibility.wasm');
  const zkeyPath = path.join(buildDir, 'eligibility_final.zkey');
  
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
  return { proof, publicSignals };
}

async function verifyProof(proof, publicSignals) {
  const buildDir = path.join(__dirname, '..', 'circuits', 'build');
  const vkeyPath = path.join(buildDir, 'verification_key.json');
  const vKey = JSON.parse(fs.readFileSync(vkeyPath));
  const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
  return res;
}

module.exports = { generateProof, verifyProof };

if (require.main === module) {
  console.log('Proof generation utilities ready');
}
