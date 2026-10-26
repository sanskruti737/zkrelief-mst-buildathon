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
- Node.js v18+ and npm
- Circom compiler (https://docs.circom.io/getting-started/installation/)
- snarkjs (installed via npm)

### Installation

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration (never commit .env)
```

## Development Workflow

### 1. Compile Circom Circuit
```bash
npm run circuits:compile
```

### 2. Trusted Setup and Generate Verifier
```bash
npm run circuits:setup
```
**Note**: This uses a development-only trusted setup. Production deployments require proper MPC ceremony and security audit.

### 3. Compile Smart Contracts
```bash
npm run contracts:compile
```

### 4. Run Tests
```bash
npm run contracts:test
npx hardhat test
```

### 5. Run Local Demo
```bash
# Terminal 1: Start local Hardhat node
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Terminal 3: Run frontend
cd frontend && npm run dev
```

## Reproducing the Demo

1. Start local blockchain and deploy contracts
2. Use Organizer dashboard to create a campaign and generate 8 demo credentials
3. Download one credential JSON
4. Use Beneficiary dashboard to upload credential, generate ZK proof, submit claim
5. Verify public totals increase in Audit dashboard
6. Attempt to submit same claim again - should be rejected as duplicate nullifier

## MST Blockchain Configuration

Configure MST testnet in `.env`:
```env
MST_RPC_URL=<verified-rpc-url>
MST_CHAIN_ID=<verified-chain-id>
MST_EXPLORER_URL=<verified-explorer-url>
DEPLOYER_PRIVATE_KEY=<your-deployer-key>  # Never put in frontend
```

**Important**: Always verify RPC URL, chain ID, and explorer from official MST Blockchain documentation. Deploy to MST testnet only when properly configured and funded.

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
