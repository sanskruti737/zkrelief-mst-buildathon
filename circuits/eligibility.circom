pragma circom 2.1.6;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/mux1.circom";

// Merkle tree checker for membership proof
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    signal output rootOut;

    component hashers[levels];
    component mux[levels];

    signal levelHashes[levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        hashers[i] = Poseidon(2);
        mux[i] = Mux1();

        mux[i].c[0] <== levelHashes[i];
        mux[i].c[1] <== pathElements[i];
        mux[i].s <== pathIndices[i];

        hashers[i].inputs[0] <== mux[i].out;
        mux[i].c[0] <== pathElements[i];
        mux[i].c[1] <== levelHashes[i];
        mux[i].s <== 1 - pathIndices[i];

        hashers[i].inputs[1] <== mux[i].out;
        // Actually need to handle both orderings correctly
        // Simpler correct approach:
    }

    // Correct implementation
    component hasherLeft[levels];
    component hasherRight[levels];
    signal left[levels];
    signal right[levels];
    
    left[0] <== levelHashes[0];
    right[0] <== 0;
    
    // redo properly below - use cleaner approach
}

template Eligibility(levels) {
    // Private inputs
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    
    // Public inputs
    signal input root;
    signal input nullifier;
    signal input campaignId;
    
    // Compute credential commitment: Poseidon(secret)
    component commitmentHasher = Poseidon(1);
    commitmentHasher.inputs[0] <== secret;
    signal commitment <== commitmentHasher.out;
    
    // Compute nullifier: Poseidon(secret, campaignId) - domain separated
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== campaignId;
    signal computedNullifier <== nullifierHasher.out;
    
    // Enforce nullifier matches
    computedNullifier === nullifier;
    
    // Verify Merkle membership
    component merkle = MerkleTreeMembership(levels);
    merkle.leaf <== commitment;
    merkle.root <== root;
    for (var i = 0; i < levels; i++) {
        merkle.pathElements[i] <== pathElements[i];
        merkle.pathIndices[i] <== pathIndices[i];
    }
}

template MerkleTreeMembership(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    
    component selectors[levels];
    component hashers[levels];
    
    signal hashes[levels + 1];
    hashes[0] <== leaf;
    
    for (var i = 0; i < levels; i++) {
        pathIndices[i] * (1 - pathIndices[i]) === 0;
        selectors[i] = DualMux();
        selectors[i].in[0] <== hashes[i];
        selectors[i].in[1] <== pathElements[i];
        selectors[i].s <== pathIndices[i];
        
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== selectors[i].out[0];
        hashers[i].inputs[1] <== selectors[i].out[1];
        hashes[i + 1] <== hashers[i].out;
    }
    
    root === hashes[levels];
}

template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];
    
    s * (s - 1) === 0;
    out[0] <== (in[1] - in[0]) * s + in[0];
    out[1] <== (in[0] - in[1]) * s + in[1];
}

component main {public [root, nullifier, campaignId]} = Eligibility(3);
