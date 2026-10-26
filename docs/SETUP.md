# ZKRelief Setup Guide

## Prerequisites

1. Node.js v18 or higher (tested with Node 24)
2. Circom **2.1.6** compiler
   - Official releases: https://github.com/iden3/circom/releases
   - The legacy npm `circom` package (0.5.x) cannot compile this circuit.
   - If the binary is not named `circom` or is not on `PATH`, set `CIRCOM_BIN`.
3. The local `snarkjs` dependency is used automatically.

## Installation

```bash
npm install
cd frontend && npm install && cd ..
```

## Build ZK Artifacts + Contracts

```bash
npm run setup:zk
```

This performs a reproducible **development-only** trusted setup:

- Generates a local 2^12 Powers-of-Tau file with deterministic entropy
- Runs `snarkjs groth16 setup`
- Applies a deterministic phase-2 contribution
- Verifies the final zkey
- Exports `circuits/build/verification_key.json`
- Exports the real Solidity verifier to `contracts/Verifier.sol`
- Compiles the contracts

This is not a production ceremony. Production requires an MPC ceremony and an
independent security audit.

## Tests

```bash
npm test
```

The tests generate real proofs with synthetic credentials and verify on-chain
acceptance, invalid-proof rejection, duplicate-nullifier rejection, campaign
scoping, and campaign/root validation.

## Local Demo

In-process Hardhat network:

```bash
npm run demo:local
```

Separate JSON-RPC node:

```bash
# Terminal 1
npx hardhat node

# Terminal 2
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/demo-local.js --network localhost
```

## Frontend

```bash
cd frontend
npm run dev
npm run build
```

Local `.env` values:

```env
VITE_CONTRACT_ADDRESS=<deployed ZKRelief address>
VITE_CHAIN_ID=31337
VITE_RPC_URL=http://127.0.0.1:8545
```

Browser diagnostic:

- `/zk-selftest.html` — generate and verify a proof in the browser
- `/zk-selftest.html?e2e=1` — deploy, create campaign, claim, reject duplicate
  (requires a local Hardhat node; Vite proxies `/rpc` to port 8545)

## MST Testnet

Verified configuration from
https://docs.mstblockchain.com/developer-docs/foundation/development-networks-mst-testnet.md

```env
MST_RPC_URL=https://testnetrpc.mstblockchain.com
MST_CHAIN_ID=91562037
MST_EXPLORER_URL=https://testnet.mstscan.com
MST_FAUCET_URL=https://faucet.mstblockchain.com
```

Check connectivity:

```bash
node scripts/check-mst.js
```

To deploy, fund a deployer wallet from the official faucet and set:

```bash
export DEPLOYER_PRIVATE_KEY=0x...
npx hardhat run scripts/deploy.js --network mstTestnet
```

Never commit `.env` or a private key.

## Troubleshooting

- **`circom compiler 2.x` error**: install Circom 2.1.6 and point `CIRCOM_BIN`
  at the binary.
- **Missing zkey/wasm**: run `npm run setup:zk`.
- **Proof generation slow**: expected in the browser; the circuit has ~1,182
  constraints.
- **Frontend cannot reach local node**: ensure `npx hardhat node` is running and
  the Vite `/rpc` proxy is active.
- **MST deployment fails**: verify the chain ID with `node scripts/check-mst.js`
  and ensure the deployer has tMSTC.
