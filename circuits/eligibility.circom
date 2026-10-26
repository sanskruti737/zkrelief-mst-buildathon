pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

// Verifies that `leaf` is part of a Merkle tree with the given `root`.
// The hash function is Poseidon(2), matching utils/merkle.js.
template MerkleTreeMembership(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hashers[levels];

    signal hashes[levels + 1];
    signal left[levels];
    signal right[levels];

    hashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // pathIndices must be strictly binary.
        pathIndices[i] * (pathIndices[i] - 1) === 0;

        // If pathIndices[i] == 0 the current hash is the left child,
        // otherwise it is the right child.
        left[i] <== hashes[i] + pathIndices[i] * (pathElements[i] - hashes[i]);
        right[i] <== pathElements[i] + pathIndices[i] * (hashes[i] - pathElements[i]);

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];
        hashes[i + 1] <== hashers[i].out;
    }

    root === hashes[levels];
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

    // Credential commitment: Poseidon(secret)
    component commitmentHasher = Poseidon(1);
    commitmentHasher.inputs[0] <== secret;
    signal commitment <== commitmentHasher.out;

    // Campaign-specific nullifier: Poseidon(secret, campaignId)
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== campaignId;
    signal computedNullifier <== nullifierHasher.out;

    computedNullifier === nullifier;

    // Prove the commitment is a member of the campaign Merkle tree.
    component merkle = MerkleTreeMembership(levels);
    merkle.leaf <== commitment;
    merkle.root <== root;
    for (var i = 0; i < levels; i++) {
        merkle.pathElements[i] <== pathElements[i];
        merkle.pathIndices[i] <== pathIndices[i];
    }
}

component main {public [root, nullifier, campaignId]} = Eligibility(3);
