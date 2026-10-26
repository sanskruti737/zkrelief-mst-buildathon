import { ethers } from 'ethers'
import * as snarkjs from 'snarkjs'
import { buildPoseidon } from 'circomlibjs'
import type { Credential } from './merkle'

export const ZKRELIEF_ABI = [
  'function campaignCount() view returns (uint256)',
  'function createCampaign(string name, string description, uint256 allocation, bytes32 merkleRoot) returns (uint256)',
  'function getCampaign(uint256 campaignId) view returns (tuple(string name, string description, uint256 allocation, uint256 claimed, bytes32 merkleRoot, uint256 campaignId, bool active, address creator))',
  'function submitClaim(uint256 campaignId, uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[3] input)',
  'function isNullifierUsed(uint256 campaignId, bytes32 nullifier) view returns (bool)',
  'function verifier() view returns (address)',
  'event CampaignCreated(uint256 indexed campaignId, string name, bytes32 merkleRoot, uint256 allocation)',
  'event ClaimSubmitted(uint256 indexed campaignId, bytes32 nullifier, uint256 claimedCount, uint256 remaining)',
]

export interface CampaignInfo {
  name: string
  description: string
  allocation: bigint
  claimed: bigint
  merkleRoot: string
  campaignId: bigint
  active: boolean
  creator: string
}

export interface GeneratedProof {
  proof: Groth16Proof
  publicSignals: string[]
  nullifier: string
  calldata: {
    a: string[]
    b: string[][]
    c: string[]
    input: string[]
  }
}

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined) || ''
export const RPC_URL = (import.meta.env.VITE_RPC_URL as string | undefined) || 'http://127.0.0.1:8545'
export const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337)

export function hasConfiguredContract(): boolean {
  return ethers.isAddress(CONTRACT_ADDRESS)
}

export function getReadProvider(): ethers.Provider {
  return new ethers.JsonRpcProvider(RPC_URL)
}

export function getContract(
  runner: ethers.ContractRunner
): ethers.Contract {
  if (!hasConfiguredContract()) {
    throw new Error(
      'VITE_CONTRACT_ADDRESS is not configured. Set it to the deployed ZKRelief address.'
    )
  }
  return new ethers.Contract(CONTRACT_ADDRESS, ZKRELIEF_ABI, runner)
}

export async function computeNullifier(secret: string, campaignId: string): Promise<string> {
  const poseidon = await buildPoseidon()
  return poseidon.F.toString(poseidon([BigInt(secret), BigInt(campaignId)]))
}

export function proofToSolidity(proof: Groth16Proof, publicSignals: string[]) {
  return {
    a: [String(proof.pi_a[0]), String(proof.pi_a[1])],
    b: [
      [String(proof.pi_b[0][1]), String(proof.pi_b[0][0])],
      [String(proof.pi_b[1][1]), String(proof.pi_b[1][0])],
    ],
    c: [String(proof.pi_c[0]), String(proof.pi_c[1])],
    input: publicSignals.map(String),
  }
}

export async function generateEligibilityProof(
  credential: Credential,
  campaignId: string,
  onStatus?: (status: string) => void
): Promise<GeneratedProof> {
  onStatus?.('Computing campaign-specific nullifier...')
  const nullifier = await computeNullifier(credential.secret, campaignId)

  const input = {
    secret: String(credential.secret),
    pathElements: credential.pathElements.map(String),
    pathIndices: credential.pathIndices.map(String),
    root: String(credential.merkleRoot),
    nullifier,
    campaignId: String(campaignId),
  }

  onStatus?.('Generating Groth16 proof in the browser...')
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    '/zk/eligibility.wasm',
    '/zk/eligibility_final.zkey'
  )

  onStatus?.('Verifying proof against the verification key...')
  const vkeyResponse = await fetch('/zk/verification_key.json')
  if (!vkeyResponse.ok) {
    throw new Error('Could not load /zk/verification_key.json')
  }
  const vkey = await vkeyResponse.json()
  const normalizedSignals = publicSignals.map(String)
  const valid = await snarkjs.groth16.verify(vkey, normalizedSignals, proof)
  if (!valid) {
    throw new Error('Generated proof did not verify against the verification key')
  }

  return {
    proof,
    publicSignals: normalizedSignals,
    nullifier,
    calldata: proofToSolidity(proof, normalizedSignals),
  }
}

export async function readCampaign(
  provider: ethers.ContractRunner,
  campaignId: number
): Promise<CampaignInfo> {
  const contract = getContract(provider)
  const campaign = await contract.getCampaign(campaignId)
  return campaign as CampaignInfo
}

export async function readCampaignCount(provider: ethers.ContractRunner): Promise<number> {
  const contract = getContract(provider)
  const count = await contract.campaignCount()
  return Number(count)
}
