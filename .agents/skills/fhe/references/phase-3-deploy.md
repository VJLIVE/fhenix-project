# Phase 3 — Deployment Pipeline

## Overview

Deployment connects your compiled FHE contract to a live network. The pipeline is: environment credentials → Hardhat network config → deploy script → testnet transaction.

**Target network:** Sepolia (Ethereum testnet). Get test ETH at https://sepoliafaucet.com.

---

## Project Structure for Deployment

```
project-root/
├── contracts/
│   └── ConfidentialVault.sol      ← Your FHE contract
├── scripts/
│   └── deploy.js                  ← Deployment script
├── test/
│   └── vault.test.js              ← (Optional) test suite
├── hardhat.config.js              ← Network + plugin config
├── .env                           ← Credentials — NEVER commit
├── .gitignore                     ← Must include .env
└── package.json
```

---

## Step 1 — Install dotenv

```bash
npm install dotenv
```

dotenv loads `.env` file variables into `process.env` at runtime. Required for any real network deployment.

---

## Step 2 — Create .env

```env
PRIVATE_KEY=your_deployer_wallet_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
```

**Getting these values:**

| Variable | How to Get |
|----------|-----------|
| `PRIVATE_KEY` | Export from MetaMask: Account → Export Private Key |
| `SEPOLIA_RPC_URL` | [Infura](https://infura.io) or [Alchemy](https://alchemy.com) → Create project → Sepolia endpoint |

**Security rules — non-negotiable:**

```bash
# .gitignore — must include this line before your first commit
.env
```

```solidity
// ❌ NEVER do this — private key embedded in source
const PRIVATE_KEY = "0x1234abc...";  // exposed in git history forever

// ✅ ALWAYS do this
const PRIVATE_KEY = process.env.PRIVATE_KEY;  // loaded from .env at runtime
```

---

## Step 3 — Hardhat Configuration for Deployment

Replace `hardhat.config.js` (or `hardhat.config.ts` if TypeScript):

```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("@cofhe/hardhat-plugin");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",  // Required for FHE
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
```

**TypeScript variant (if using .ts config):**

```typescript
// hardhat.config.ts
import "@cofhe/hardhat-plugin";
import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: { evmVersion: "cancun" },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL as string,
      accounts: [process.env.PRIVATE_KEY as string],
    },
  },
};

export default config;
```

---

## Step 4 — Deployment Script

Create `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  console.log("Deploying ConfidentialVault to Sepolia...");

  // Get contract factory (uses compiled bytecode from artifacts/)
  const Factory = await hre.ethers.getContractFactory("ConfidentialVault");

  // Deploy and wait for transaction to be mined
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("ConfidentialVault deployed to:", address);
  console.log("Save this address — you will need it in the frontend config.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

---

## Step 5 — Deploy Command

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Expected Output

```
[dotenv@x.x.x] injecting env (2) from .env
Deploying ConfidentialVault to Sepolia...
ConfidentialVault deployed to: 0x9b568888e69e92f92B27348fb6010Eb1057a302c
Save this address — you will need it in the frontend config.
```

**Save the deployed contract address.** You will set it as `CONTRACT_ADDRESS` in the frontend.

---

## Step 6 — Verify on Sepolia Etherscan (Optional)

```bash
npx hardhat verify --network sepolia 0xYOUR_CONTRACT_ADDRESS
```

Requires adding Etherscan API key to config:
```javascript
etherscan: {
  apiKey: process.env.ETHERSCAN_API_KEY,
},
```

---

## Deployment Checklist

Run through this before every mainnet or production deployment:

- [ ] `.env` is in `.gitignore` and not committed
- [ ] `PRIVATE_KEY` deployer wallet has sufficient Sepolia ETH for gas
- [ ] `evmVersion: "cancun"` is set in hardhat config
- [ ] `@cofhe/hardhat-plugin` imported before `@nomicfoundation/hardhat-toolbox`
- [ ] Contract compiled successfully (`npx hardhat compile`)
- [ ] Tests pass locally (`npx hardhat test`)
- [ ] Deployed contract address is saved for frontend config
- [ ] ABI from `artifacts/` copied to frontend's `src/config/abi.json`

---

## Common Deployment Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Error: invalid private key` | PRIVATE_KEY missing or malformed | Check `.env` — must be 64 hex chars, no `0x` prefix needed |
| `Error: could not detect network` | RPC URL wrong or unreachable | Verify Infura/Alchemy endpoint URL in `.env` |
| `Error: insufficient funds` | Deployer wallet has no Sepolia ETH | Get test ETH from https://sepoliafaucet.com |
| `Error: cannot find artifact` | Contract not compiled | Run `npx hardhat compile` first |
| `TransactionReceiptMissingField` | Network timeout | Re-run — Sepolia can be slow during congestion |
| dotenv not loaded | Missing `require("dotenv").config()` | Add to top of hardhat.config.js |
| `undefined` for process.env vars | .env not in project root | Move `.env` to same directory as `package.json` |
