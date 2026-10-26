# ZKRelief Setup Guide

## Prerequisites

1. Install Node.js (v18 or higher)
2. Install Circom compiler
   ```bash
   npm install -g circom@2.1.6
   ```
3. Install snarkjs globally (or use local)
   ```bash
   npm install -g snarkjs
   ```

## Installation

```bash
# Clone or navigate to project
cd "/mnt/c/Users/sansk/OneDrive/Desktop/zk relief"

# Install root dependencies
npm install

# Install frontend dependencies  
cd frontend && npm install && cd ..
```

## Development Flow

### 1. Compile Circuit
```bash
npm run circuits:compile
```

### 2. Generate ZK Artifacts (Development Setup)
```bash
npm run circuits:setup
```
This downloads powers of tau, runs trusted setup, and generates Verifier.sol.

### 3. Compile Contracts
```bash
npm run contracts:compile
```

### 4. Test Contracts
```bash
npm run contracts:test
```

### 5. Run Local Node
```bash
npx hardhat node
```

### 6. Deploy Contracts
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 7. Start Frontend
```bash
cd frontend && npm run dev
```

## MST Blockchain Deployment

1. Get verified MST testnet details from official docs
2. Configure .env:
   ```env
   MST_RPC_URL=<verified>
   MST_CHAIN_ID=<verified>
   MST_EXPLORER_URL=<verified>
   DEPLOYER_PRIVATE_KEY=<deployer-key>
   ```
3. Fund deployer wallet with MST testnet tokens
4. Deploy: `npx hardhat run scripts/deploy.js --network mstTestnet`
5. Update frontend .env with contract address

## Troubleshooting

- If circom not found: ensure it's installed globally
- If proof generation slow: normal for browser/local dev
- Large files (ptau, zkey) are in .gitignore
