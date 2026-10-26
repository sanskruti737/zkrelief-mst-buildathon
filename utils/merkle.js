const { buildPoseidon } = require("circomlibjs");

const ZERO = 0n;

class MerkleTree {
  constructor(leaves, levels = 3) {
    if (leaves.length > 2 ** levels) {
      throw new Error(`Too many leaves (${leaves.length}) for ${levels} levels`);
    }
    this.levels = levels;
    this.capacity = 2 ** levels;
    this.leaves = leaves.map((leaf) => BigInt(leaf));
    this.poseidon = null;
    this.F = null;
    this.tree = null;
  }

  async init() {
    this.poseidon = await buildPoseidon();
    this.F = this.poseidon.F;
    this.tree = this.buildTree();
    return this;
  }

  _hash(left, right) {
    return this.F.toString(this.poseidon([BigInt(left), BigInt(right)]));
  }

  buildTree() {
    const tree = Array.from({ length: this.levels + 1 }, () => []);
    tree[0] = Array.from({ length: this.capacity }, (_, i) =>
      i < this.leaves.length ? this.leaves[i] : ZERO
    );

    for (let level = 0; level < this.levels; level++) {
      const width = 2 ** (this.levels - level);
      for (let i = 0; i < width; i += 2) {
        tree[level + 1][i / 2] = this._hash(tree[level][i], tree[level][i + 1]);
      }
    }

    return tree;
  }

  getRoot() {
    return this.tree[this.levels][0];
  }

  getProof(leafIndex) {
    if (leafIndex < 0 || leafIndex >= this.capacity) {
      throw new Error(`Leaf index out of range: ${leafIndex}`);
    }
    const pathElements = [];
    const pathIndices = [];
    let index = leafIndex;

    for (let level = 0; level < this.levels; level++) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      pathElements.push(String(this.tree[level][siblingIndex]));
      pathIndices.push(String(index % 2));
      index = Math.floor(index / 2);
    }

    return { pathElements, pathIndices };
  }
}

async function buildTreeFromSecrets(secrets, levels = 3) {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const commitments = secrets.map((secret) =>
    F.toString(poseidon([BigInt(secret)]))
  );
  const tree = new MerkleTree(commitments, levels);
  await tree.init();
  return { tree, commitments };
}

module.exports = { MerkleTree, buildTreeFromSecrets };
