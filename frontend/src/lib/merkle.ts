import { buildPoseidon } from 'circomlibjs'

const ZERO = 0n

export interface MerkleProof {
  pathElements: string[]
  pathIndices: string[]
}

export class MerkleTree {
  levels: number
  capacity: number
  leaves: bigint[]
  private poseidon: any
  private F: any
  private tree: string[][] = []

  constructor(leaves: Array<string | bigint>, levels = 3) {
    if (leaves.length > 2 ** levels) {
      throw new Error(`Too many leaves (${leaves.length}) for ${levels} levels`)
    }
    this.levels = levels
    this.capacity = 2 ** levels
    this.leaves = leaves.map((leaf) => BigInt(leaf))
  }

  async init(): Promise<this> {
    this.poseidon = await buildPoseidon()
    this.F = this.poseidon.F
    this.tree = this.buildTree()
    return this
  }

  private hash(left: string | bigint, right: string | bigint): string {
    return this.F.toString(this.poseidon([BigInt(left), BigInt(right)]))
  }

  private buildTree(): string[][] {
    const tree: string[][] = Array.from({ length: this.levels + 1 }, () => [])
    tree[0] = Array.from({ length: this.capacity }, (_, i) =>
      i < this.leaves.length ? this.leaves[i].toString() : ZERO.toString()
    )

    for (let level = 0; level < this.levels; level++) {
      const width = 2 ** (this.levels - level)
      for (let i = 0; i < width; i += 2) {
        tree[level + 1][i / 2] = this.hash(tree[level][i], tree[level][i + 1])
      }
    }
    return tree
  }

  getRoot(): string {
    return this.tree[this.levels][0]
  }

  getProof(leafIndex: number): MerkleProof {
    if (leafIndex < 0 || leafIndex >= this.capacity) {
      throw new Error(`Leaf index out of range: ${leafIndex}`)
    }
    const pathElements: string[] = []
    const pathIndices: string[] = []
    let index = leafIndex

    for (let level = 0; level < this.levels; level++) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1
      pathElements.push(this.tree[level][siblingIndex])
      pathIndices.push(String(index % 2))
      index = Math.floor(index / 2)
    }

    return { pathElements, pathIndices }
  }
}

export interface Credential extends MerkleProof {
  id: number
  secret: string
  commitment: string
  campaignId: number | null
  merkleRoot: string
}

export async function createCredentials(
  count: number,
  levels = 3
): Promise<{ credentials: Credential[]; root: string; commitments: string[] }> {
  const poseidon = await buildPoseidon()
  const F = poseidon.F
  const secrets: string[] = []
  const commitments: string[] = []

  for (let i = 0; i < count; i++) {
    const random = new Uint8Array(32)
    crypto.getRandomValues(random)
    const secret = BigInt(
      '0x' +
        Array.from(random)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
    )
    const secretStr = secret.toString()
    secrets.push(secretStr)
    commitments.push(F.toString(poseidon([secret])))
  }

  const tree = new MerkleTree(commitments, levels)
  await tree.init()
  const root = tree.getRoot()

  const credentials: Credential[] = secrets.map((secret, index) => {
    const proof = tree.getProof(index)
    return {
      id: index + 1,
      secret,
      commitment: commitments[index],
      campaignId: null,
      merkleRoot: root,
      pathElements: proof.pathElements,
      pathIndices: proof.pathIndices,
    }
  })

  return { credentials, root, commitments }
}
