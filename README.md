# ZKRelief

**Private Aid. Public Accountability.**

ZKRelief is a privacy-preserving aid eligibility and claims-verification dApp built on MST Blockchain. It uses zero-knowledge proofs to verify beneficiary eligibility without disclosing sensitive personal information on-chain.

## Problem Statement

Relief programs need to verify that beneficiaries are eligible and prevent duplicate claims. At the same time, beneficiaries should not have to publish their identities or sensitive eligibility documents on a public blockchain.

## Solution

ZKRelief uses Groth16 zero-knowledge proofs (via Circom and snarkjs) to demonstrate Merkle-tree membership for eligibility without revealing the beneficiary's secret or identity. Campaign-specific nullifiers prevent duplicate claims. All campaign allocation and claim totals are publicly auditable on-chain.

## Key Features

1. **Private Eligibility Verification** - Real Groth16 ZK proofs verify eligibility without revealing private credentials
2. **Duplicate-Claim Prevention** - Campaign-specific nullifiers ensure each eligible beneficiary can claim only once per campaign  
3. **Public Accountability** - Campaign allocation, claim counts, and remaining funds are publicly visible on-chain
4. **No On-Chain Aid Payments** - This MVP tracks verified claims for accounting; physical/financial delivery is handled off-chain
5. **Privacy-Conscious Design** - Wallet addresses and transaction timing may be visible; complete anonymity is not guaranteed

## Architecture

```
zkrelief/
├── circuits/          # Circom circuits for ZK eligibility proofs
├── contracts/         # Solidity smart contracts (ZKRelief + Verifier)
├── scripts/           # Deployment and ZK setup scripts
├── test/              # Smart contract tests
├── frontend/          # React + Vite + TypeScript frontend
├── utils/             # Merkle tree and cryptography utilities
└── docs/              # Additional documentation
```

## How It Works

### 1. Merkle Membership Proof
- An authorized issuer creates a campaign and generates credentials for eligible beneficiaries
- Credentials contain a private secret; commitments `Poseidon(secret)` are added to a campaign-specific Merkle tree
- The Merkle root is published on-chain
- Beneficiaries prove membership using a ZK circuit that verifies their secret generates a leaf in the tree without revealing the secret or path

### 2. Nullifier Prevention
- For each claim, a campaign-specific nullifier is computed as `Poseidon(secret, campaignId)`
- The nullifier is made public as part of the proof's public inputs
- The contract tracks used nullifiers per campaign to prevent duplicates

### 3. On-Chain Verification
- The Groth16 proof is verified on-chain using the auto-generated Solidity verifier
- The contract checks campaign status, allocation limits, nullifier uniqueness, and proof validity
- Only verified claims update public accounting counters

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, ethers.js v6
- **Smart Contracts**: Solidity ^0.8.20, Hardhat, OpenZeppelin
- **Zero-Knowledge**: Circom 2.1.6, circomlib (Poseidon), snarkjs, Groth16
- **Blockchain**: MST Blockchain (EVM-compatible)

## Setup and Installation

### Prerequisites

- Node.js v18+ and npm (tested with Node 24)
- Circom **2.1.6** (the real Rust compiler, not the legacy npm 0.5.x package)
  - Set `CIRCOM_BIN=/path/to/circom` if it is not on `PATH`.
- snarkjs is installed locally via npm

### Installation

```bash
npm install
cd frontend && npm install && cd ..
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration (never commit .env)
```

## Development Workflow

### 1. Build all ZK artifacts and contracts

```bash
npm run setup:zk
```

This runs, in order:

1. `circom circuits/eligibility.circom --r1cs --wasm --sym`
2. A **development-only** Powers-of-Tau + Groth16 setup
   (`circuits/pot12_final.ptau`, `eligibility_final.zkey`)
3. `snarkjs zkey verify`
4. Export of `circuits/build/verification_key.json`
5. Export of the real Solidity verifier to `contracts/Verifier.sol`
6. Hardhat compilation
7. Synchronization of the browser WASM, zkey, verification key, and contract artifact into `frontend/public/zk/`

The setup is for local development only and is **not** a production trusted
setup. snarkjs mixes fresh randomness during setup, so regenerating the keys
changes the verification key and Solidity verifier. Commit the zkey and verifier
together; production requires a multi-party ceremony and an audit.

You can also run the steps individually:

```bash
npm run circuits:compile
npm run circuits:setup
npm run contracts:compile
```

### 2. Run tests

```bash
npm test
```

The suite generates real Groth16 proofs with synthetic credentials and checks:

- valid proofs are accepted on-chain
- tampered proofs are rejected
- duplicate campaign nullifiers are rejected
- nullifiers are campaign-scoped
- wrong Merkle roots / campaign IDs / inactive campaigns are rejected

### 3. Run the local demo

Against Hardhat's in-process network:

```bash
npm run demo:local
```

Against a real local JSON-RPC node:

```bash
# Terminal 1
npx hardhat node

# Terminal 2
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/demo-local.js --network localhost
```

The demo deploys ZKRelief + the generated verifier, creates a campaign,
generates a real proof for a synthetic beneficiary, submits a valid claim,
prints updated totals, and confirms the duplicate claim is rejected.

### 4. Frontend

```bash
cd frontend
npm run dev
npm run build
```

For a local deployment set:

```env
VITE_CONTRACT_ADDRESS=<deployed-address>
VITE_CHAIN_ID=31337
VITE_RPC_URL=http://127.0.0.1:8545
```

The frontend generates Groth16 proofs in the browser from
`frontend/public/zk/eligibility.wasm` and `eligibility_final.zkey`.

A browser diagnostic page is available at `/zk-selftest.html`. With a local
Hardhat node running (the Vite dev server proxies `/rpc` to port 8545), open
`/zk-selftest.html?e2e=1` to deploy a contract, create a campaign, generate a
browser proof, submit a claim, and confirm the duplicate is rejected.

## MST Blockchain Configuration

Configuration verified against the official MST documentation:
https://docs.mstblockchain.com/developer-docs/foundation/development-networks-mst-testnet.md

| Setting | Value |
| --- | --- |
| Network | MST Testnet |
| Chain ID | `91562037` |
| RPC URL | `https://testnetrpc.mstblockchain.com` |
| Explorer | `https://testnet.mstscan.com` |
| Faucet | `https://faucet.mstblockchain.com` |
| Currency | `tMSTC` |

Check live connectivity:

```bash
node scripts/check-mst.js
```

Deployment requires a funded deployer key:

```bash
# Never commit this key
export DEPLOYER_PRIVATE_KEY=0x...
npx hardhat run scripts/deploy.js --network mstTestnet
```

The deploy script refuses to proceed when the deployer has no native balance.
MST deployment was not performed in this repository because no funded deployer
key was available. The local implementation and proof-verification suite pass.

## Privacy Limitations

- **Wallet visibility**: Beneficiary's wallet address is visible in transactions
- **Timing analysis**: Transaction timing may reveal information
- **Metadata**: Network observers can see transactions
- **Issuer trust**: In this MVP, the organizer acts as issuer; production requires authorized issuer with secure credential distribution
- **On-chain payments**: This system does not process payments on-chain

## Security Considerations

- Development uses trusted setup - production needs MPC ceremony
- Private secrets must never be shared or committed
- Nullifiers are public but cannot be linked to identities without the secret
- Merkle paths and secrets are private inputs to the circuit
- Smart contract enforces all checks on-chain
- Access control protects campaign management

## Current MVP Limitations

- Development trusted setup only
- No on-chain payment mechanism
- Demo uses synthetic beneficiaries
- Local/Hardhat focus; MST deployment requires verified config
- Limited to 8 demo beneficiaries (tree depth 3)

## License

MIT
