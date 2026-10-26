const { buildPoseidon } = require("circomlibjs");

class MerkleTree {
  constructor(leaves, levels = 3) {
    this.levels = levels;
    this.leaves = leaves;
    this.poseidon = null;
  }

  async init() {
    this.poseidon = await buildPoseidon();
    this.F = this.poseidon.F;
    this.tree = this.buildTree();
    return this;
  }

  hash(left, right) {
    const h = this.poseidon([BigInt(left), BigInt(right)]);
    return this.F.toString(h);
  }

  buildTree() {
    let nodes = this.leaves.map(l => this.F.toString(this.poseidon([BigInt(l)])));
    for (let level = 0; level < this.levels; level++) {
      let levelSize = Math.ceil(nodes.length / 2);
      let nextLevel = [];
      for (let i = 0; i < levelSize; i++) {
        const left = nodes[2 * i] || "0";
        const right = nodes[2 * i + 1] || "0";
        const h = this.poseidon([BigInt(left), BigInt(right)]);
        nextLevel.push(this.F.toString(h));
      }
      nodes = nextLevel;
      if (level === this.levels - 1) break;
    }
    // Build full tree
    let tree = Array(this.levels + 1).fill().map(() => []);
    tree[0] = this.leaves.map(l => this.F.toString(this.poseidon([BigInt(l)])));
    for (let level = 0; level < this.levels; level++) {
      for (let i = 0; i < Math.pow(2, this.levels - level); i += 2) {
        const left = tree[level][i] || "0";
        const right = tree[level][i + 1] || "0";
        if (!tree[level + 1]) tree[level + 1] = [];
        const h = this.poseidon([BigInt(left), BigInt(right)]);
        tree[level + 1][Math.floor(i / 2)] = this.F.toString(h);
      }
    }
    return tree;
  }

  getRoot() {
    return this.tree[this.levels][0];
  }

  getProof(leafIndex) {
    let pathElements = [];
    let pathIndices = [];
    let index = leafIndex;
    for (let level = 0; level < this.levels; level++) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      pathElements.push(this.tree[level][siblingIndex] || "0");
      pathIndices.push(index % 2);
      index = Math.floor(index / 2);
    }
    return { pathElements, pathIndices };
  }
}

module.exports = { MerkleTree };
