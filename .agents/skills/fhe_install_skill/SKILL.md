---
name: fhenix-setup
description: >
  Complete, battle-tested guide for setting up a Fhenix / CoFHE development environment from scratch,
  writing encrypted smart contracts, and deploying them to the Sepolia testnet. This skill scaffolds
  a complete, runnable Hardhat TypeScript project with all configurations pre-fixed to avoid common
  errors. Use this whenever the user asks to: create a Fhenix project, set up CoFHE, write FHE contracts,
  deploy to Sepolia, or mentions any issue with Fhenix/CoFHE installation or deployment.
  
  KEY: This skill creates an entire, working project in the repository root. User only needs to update `.env`.
---

# Fhenix / CoFHE — Complete, Error-Free Workflow

This skill scaffolds and explains the complete Fhenix development lifecycle:
1. **Environment setup** — creates a runnable Node.js project with all dependencies
2. **Writing encrypted smart contracts** — examples and patterns using CoFHE primitives
3. **Deploying to Sepolia testnet** — tested deploy script and configuration

## What Claude Will Create For You

When you ask to create a Fhenix project, Claude will:
- ✅ Scaffold `package.json` with all correct dependencies (Hardhat 2.22.3+, CoFHE 0.4.0, ethers v6)
- ✅ Generate `tsconfig.json` with TypeScript 6.0 fixes (`ignoreDeprecations`, `rootDir`)
- ✅ Create `hardhat.config.ts` with dotenv integration and Sepolia network config
- ✅ Add an example `ConfidentialVault.sol` contract with working FHE operations
- ✅ Generate `scripts/deploy.ts` using ethers v6 API (`waitForDeployment()`, `getAddress()`)
- ✅ Create `.env.example` template
- ✅ Run `npm install` and `npx hardhat compile` automatically

**You only need to:**
1. Create `.env` from `.env.example` and fill in your `PRIVATE_KEY` and `SEPOLIA_RPC_URL`
2. Run: `npm run deploy`

---

## Prerequisites

- **Node.js LTS v22 or higher** (MUST be v22+, NOT v16/v18)
  - Check: `node --version`
  - Download from: https://nodejs.org/

---

## Full Project Files (Pre-Created By Claude)

### package.json (AUTO-CREATED)

```json
{
  "name": "fhenix-skill-template",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "compile": "npx hardhat compile",
    "deploy": "npx hardhat run scripts/deploy.ts --network sepolia",
    "test": "npx hardhat test"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^6.1.2",
    "hardhat": "^2.22.3",
    "ts-node": "^10.9.2",
    "typescript": "^6.0.2"
  },
  "dependencies": {
    "@cofhe/hardhat-plugin": "^0.4.0",
    "@cofhe/sdk": "0.4.0",
    "@fhenixprotocol/cofhe-contracts": "0.1.0",
    "dotenv": "^17.3.1"
  }
}
```

---

### tsconfig.json (AUTO-CREATED — INCLUDES ALL FIXES)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "rootDir": ".",
    "outDir": "dist",
    "moduleResolution": "node",
    "skipLibCheck": true,
    "ignoreDeprecations": "6.0"
  },
  "include": ["./scripts", "./test", "./typechain-types"],
  "files": ["./hardhat.config.ts"]
}
```

**Why these fixes matter:**
- `"rootDir": "."` — fixes TS5011 error (required by TypeScript 6.0)
- `"ignoreDeprecations": "6.0"` — silences moduleResolution warnings

---

### hardhat.config.ts (AUTO-CREATED)

```typescript
import "@cofhe/hardhat-plugin";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: any = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
```

---

### contracts/ConfidentialVault.sol (AUTO-CREATED)

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';

contract ConfidentialVault {
    mapping(address => euint64) private _balances;

    function deposit(InEuint64 calldata encryptedAmount) external {
        euint64 amount = FHE.asEuint64(encryptedAmount);
        _balances[msg.sender] = FHE.add(_balances[msg.sender], amount);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allowSender(_balances[msg.sender]);
    }

    function getBalance() public view returns (euint64) {
        return _balances[msg.sender];
    }

    function publishBalance(
        euint64 ctHash,
        uint64 plaintext,
        bytes calldata signature
    ) external {
        FHE.publishDecryptResult(ctHash, plaintext, signature);
    }
}
```

---

### scripts/deploy.ts (AUTO-CREATED — ETHERS V6 API)

```typescript
import { ethers } from "hardhat";

async function main() {
  const Factory = await ethers.getContractFactory("ConfidentialVault");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  console.log("Contract deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**Why `waitForDeployment()` and `getAddress()`:**
- These are ethers v6 APIs; v5 methods (`deployed()`, `contract.address`) no longer work
- Claude always uses the correct API to avoid runtime errors

---

### .env (USER-CREATED — ONLY THIS FILE NEEDS YOUR INPUT)

Create a new file named `.env` (copy from `.env.example`):

```
PRIVATE_KEY=your_wallet_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

Where:
- `PRIVATE_KEY` — your Ethereum wallet private key (32-byte hex starting with `0x`)
- `SEPOLIA_RPC_URL` — Sepolia RPC endpoint
  - **Free**: Infura (https://infura.io), Alchemy (https://alchemy.com)
  - **Example**: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

> ⚠️ **NEVER push `.env` to GitHub.** Always in `.gitignore`.

---

## Step 1: Automatic Project Creation (Claude Does This)

When you ask Claude to "create a Fhenix project" or similar, Claude will:

```bash
# 1. Create all config files (package.json, tsconfig.json, hardhat.config.ts)
# 2. Create contracts/ and scripts/ directories
# 3. Add example ConfidentialVault.sol contract
# 4. Add working deploy.ts script
# 5. Run npm install
# 6. Run npx hardhat compile
```

✅ After this, your project is fully compiled and ready.

---

## Step 2: Configure .env (YOU DO THIS)

1. Rename or copy `.env.example` to `.env`
2. Fill in your wallet's private key and RPC URL
3. **Do NOT commit `.env` to GitHub**

---

## Step 3: Deploy Contract (ONE COMMAND)

```bash
npm run deploy
```

**Expected output:**
```
Contract deployed to: 0x9b568888e69e92f92B27348fb6010Eb1057a302c
```

Save this address — you'll need it to interact with the contract.

---

## Writing Your Own Smart Contract

### CoFHE Encrypted Types Reference

| Type | Use for |
|---|---|
| `euint8` / `euint16` / `euint32` / `euint64` | Encrypted unsigned integers |
| `ebool` | Encrypted boolean |
| `InEuint8` ... `InEuint64` | Encrypted input from user (calldata) |

### CoFHE Operations Reference

| Function | What it does |
|---|---|
| `FHE.asEuint64(inValue)` | Convert user input into an encrypted value |
| `FHE.add(a, b)` | Add two encrypted values |
| `FHE.sub(a, b)` | Subtract encrypted values |
| `FHE.mul(a, b)` | Multiply encrypted values |
| `FHE.eq(a, b)` | Encrypted equality check → returns `ebool` |
| `FHE.gt(a, b)` / `FHE.lt(a, b)` | Encrypted comparison → returns `ebool` |
| `FHE.select(cond, a, b)` | Encrypted conditional (like ternary) |
| `FHE.allowThis(val)` | Allow the contract itself to use the value |
| `FHE.allowSender(val)` | Allow the transaction sender to decrypt |
| `FHE.allow(val, address)` | Allow a specific address to decrypt |
| `FHE.publishDecryptResult(ctHash, plaintext, sig)` | Publish a verified decryption result on-chain |

### Example: Private Voting Contract

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';

contract ConfidentialVoting {
    mapping(address => euint32) private _votes;
    euint32 private _totalVotes;

    function castVote(InEuint32 calldata encryptedVote) external {
        euint32 vote = FHE.asEuint32(encryptedVote);
        _votes[msg.sender] = vote;
        _totalVotes = FHE.add(_totalVotes, vote);
        FHE.allowThis(_totalVotes);
    }

    function getTotalVotes() public view returns (euint32) {
        return _totalVotes;
    }
}
```

### Example: Private Auction Contract

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';

contract ConfidentialAuction {
    mapping(address => euint64) private _bids;
    address public highestBidder;
    euint64 private _highestBid;

    function placeBid(InEuint64 calldata encryptedBid) external {
        euint64 bid = FHE.asEuint64(encryptedBid);
        ebool isHigher = FHE.gt(bid, _highestBid);
        _highestBid = FHE.select(isHigher, bid, _highestBid);
        _bids[msg.sender] = bid;
        FHE.allowThis(_highestBid);
    }

    function getHighestBid() public view returns (euint64) {
        return _highestBid;
    }
}
```

---

## Complete Error Fixes & Troubleshooting

These errors and fixes are **already handled** by the pre-created project files:

### ✅ TypeScript 6.0 Deprecation Error (FIXED in tsconfig.json)

**Error:**
```
TS5107: Option 'moduleResolution=node10' is deprecated and will stop functioning in TypeScript 7.0.
```

**Fix:** Already in `tsconfig.json`:
```json
"ignoreDeprecations": "6.0"
```

---

### ✅ TypeScript rootDir Error (FIXED in tsconfig.json)

**Error:**
```
TS5011: The common source directory of 'tsconfig.json' is './scripts'. 
The 'rootDir' setting must be explicitly set to this or another path.
```

**Fix:** Already in `tsconfig.json`:
```json
"rootDir": "."
```

---

### ✅ Ethers v6 API Error (FIXED in deploy.ts)

**Old (BROKEN):**
```typescript
await contract.deployed();  // ❌ NOT in ethers v6
console.log(contract.address);  // ❌ NOT in ethers v6
```

**New (FIXED):**
```typescript
await contract.waitForDeployment();  // ✅ ethers v6
console.log(await contract.getAddress());  // ✅ ethers v6
```

---

### ✅ npm Install Peer Dependency Errors (AVOIDED)

**Prevention:** `package.json` has compatible versions tested together:
- Hardhat: 2.22.3
- Toolbox: 6.1.2
- TypeScript: 6.0.2
- ts-node: 10.9.2

If you get peer errors anyway, install separately:
```bash
npm install --save-dev hardhat@^2.22.3
npm install --save-dev @nomicfoundation/hardhat-toolbox@^6.1.2
npm install --save-dev typescript@^6.0.2
npm install --save-dev ts-node@^10.9.2
```

---

### ❌ Common Errors (Still Possible, Solutions Below)

| Error | Cause | Solution |
|---|---|---|
| `contract.deployed is not a function` | Using ethers v5 API with ethers v6 | Already fixed in deploy.ts; make sure you're using the provided script |
| `SEPOLIA_RPC_URL is undefined` | `.env` not created or not in project root | Create `.env` in project root (not a subfolder) |
| `insufficient funds` | Wallet has no Sepolia ETH | Get free ETH from faucet: https://sepoliafaucet.com |
| `TypeError: config.networks is undefined` | `hardhat.config.ts` doesn't export default config | Already fixed; use the provided config |
| `CoFHE types not found in Solidity` | Missing `@fhenixprotocol/cofhe-contracts` | Already in `package.json`; run `npm install` |

---

## Final Deployment Checklist

- [ ] **Node.js v22+** installed (`node --version`)
- [ ] **`.env` file created** in project root with `PRIVATE_KEY` and `SEPOLIA_RPC_URL`
- [ ] **`.env` in `.gitignore`** (never commit secrets)
- [ ] **`npm install` completed** (no errors)
- [ ] **`npx hardhat compile` succeeded** (all contracts compiled)
- [ ] **Wallet has Sepolia ETH** (for gas fees)
- [ ] **`npm run deploy` succeeded** (contract deployed to Sepolia)

---

## What Happens When You Run `npm run deploy`

```bash
$ npm run deploy

> fhenix-skill-template@0.1.0 deploy
> npx hardhat run scripts/deploy.ts --network sepolia

◇ injected env (2) from .env
Compiled 9 Solidity files successfully
Contract deployed to: 0xD78AfDee97D53FA3E60c363832A8be079Fc1C892
```

✅ **Success!** Your contract is now live on Sepolia testnet.

---

## Next Steps After Deployment

1. **View your contract on Sepolia explorer:**
   - Visit: https://sepolia.etherscan.io
   - Paste your contract address
   - Verify source code (optional)

2. **Interact with your contract:**
   - Use Ethers.js SDK to call functions
   - Use Hardhat console: `npx hardhat console --network sepolia`

3. **Write tests** (optional):
   - Add test files to `test/` folder
   - Run: `npm test`

---

## Summary

This skill creates a **complete, error-free Fhenix / CoFHE development environment** with:
- ✅ Pre-configured Hardhat TypeScript project
- ✅ All TypeScript 6.0 fixes built-in
- ✅ Ethers v6 deploy script ready to use
- ✅ Example `ConfidentialVault` contract
- ✅ One-command deployment to Sepolia

**Your only job:** Add `.env` with your keys, then deploy. Everything else is automated.
