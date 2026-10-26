const { buildPoseidon } = require("circomlibjs");

let poseidon;
async function getPoseidon() {
  if (!poseidon) {
    poseidon = await buildPoseidon();
  }
  return poseidon;
}

function poseidonHash(inputs) {
  return getPoseidon().then(p => {
    const hash = p(inputs);
    return p.F.toString(hash);
  });
}

module.exports = { getPoseidon, poseidonHash };
