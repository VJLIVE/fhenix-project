# Phase 1 — Environment Setup

## Prerequisites

| Requirement | Minimum | Notes |
|------------|---------|-------|
| Node.js | v22 LTS | v16 and v18 are **incompatible**. Use only stable LTS builds. |
| npm | Bundled with Node v22 | No separate install needed |
| Internet | Required | npm downloads packages from registry |
| Empty folder | Required | Always initialize inside a clean directory |

**Check your Node version before anything else:**
```bash
node --version   # Must be v22.x.x or higher
```

If wrong version: install [nvm](https://github.com/nvm-sh/nvm) and run `nvm install 22 && nvm use 22`.

---

## Package Manifest

All packages must be pinned to these exact versions. Do not use `latest` — FHE execution is version-sensitive.

### Dev Dependencies (Hardhat + TypeScript toolchain)

| Package | Version | Purpose |
|---------|---------|---------|
| `hardhat` | `^2.22.3` | Core Ethereum development environment |
| `@nomicfoundation/hardhat-toolbox` | `^6.1.2` | Bundles ethers v6, chai, Mocha, TypeChain |
| `typescript` | `^6.0.2` | Typed scripting environment |
| `ts-node` | `^10.9.2` | Runs TypeScript without manual compilation step |

### Runtime Dependencies (CoFHE + Fhenix contracts)

| Package | Version | Purpose |
|---------|---------|---------|
| `@cofhe/hardhat-plugin` | `^0.4.0` | Injects FHE into Hardhat compile/deploy/test pipeline; provides mock FHE runtime locally |
| `@cofhe/sdk` | `0.4.0` | Client-side bridge: encrypts inputs, manages permits, handles decryption |
| `@fhenixprotocol/cofhe-contracts` | `0.1.0` | Solidity primitives: `FHE.sol`, `euint64`, `euint32`, `ebool`, `InEuint64` types |

---

## Setup Methods

### Method A — Single Command (Recommended)

Run inside a **clean, empty folder**. Do not run inside an existing project.

```bash
npm init -y && \
npm install --save-dev hardhat@^2.22.3 @nomicfoundation/hardhat-toolbox@^6.1.2 typescript@^6.0.2 ts-node@^10.9.2 && \
npm install @cofhe/hardhat-plugin@^0.4.0 @cofhe/sdk@0.4.0 @fhenixprotocol/cofhe-contracts@0.1.0 && \
npx hardhat
```

When Hardhat prompts:
1. Select **"Create a TypeScript project"**
2. Accept the project root (press Enter)
3. Accept adding `.gitignore` (press Enter)
4. Accept installing sample project dependencies (press Enter)

### Method B — Step by Step

```bash
# 1. Initialize Node project
npm init -y

# 2. Install Hardhat + TypeScript toolchain (dev dependencies)
npm install --save-dev \
  hardhat@^2.22.3 \
  @nomicfoundation/hardhat-toolbox@^6.1.2 \
  typescript@^6.0.2 \
  ts-node@^10.9.2

# 3. Install CoFHE + Fhenix packages (runtime dependencies)
npm install \
  @cofhe/hardhat-plugin@^0.4.0 \
  @cofhe/sdk@0.4.0 \
  @fhenixprotocol/cofhe-contracts@0.1.0

# 4. Initialize Hardhat (interactive — select TypeScript project)
npx hardhat
```

### Method C — PowerShell Script (Windows, Reusable)

Save as `setup.ps1` and run with `.\setup.ps1` inside an empty folder:

```powershell
npm init -y

npm install --save-dev `
  hardhat@^2.22.3 `
  @nomicfoundation/hardhat-toolbox@^6.1.2 `
  typescript@^6.0.2 `
  ts-node@^10.9.2

npm install `
  @cofhe/hardhat-plugin@^0.4.0 `
  @cofhe/sdk@0.4.0 `
  @fhenixprotocol/cofhe-contracts@0.1.0

npx hardhat
```

---

## Hardhat Configuration

After init, **replace** the generated `hardhat.config.ts` with this exact configuration:

```typescript
// hardhat.config.ts
// CRITICAL: @cofhe/hardhat-plugin MUST be imported before hardhat-toolbox
import "@cofhe/hardhat-plugin";
import "@nomicfoundation/hardhat-toolbox";

const config = {
  solidity: {
    version: "0.8.28",       // Also valid: "0.8.25"
    settings: {
      evmVersion: "cancun",  // REQUIRED — FHE opcodes depend on Cancun EVM
    },
  },
};

export default config;
```

**Common config mistakes:**

```typescript
// ❌ WRONG — import order reversed
import "@nomicfoundation/hardhat-toolbox";
import "@cofhe/hardhat-plugin";  // Too late — toolbox initializes first

// ❌ WRONG — missing evmVersion
const config = {
  solidity: "0.8.28",  // No settings block — silently uses default EVM, breaks FHE

// ❌ WRONG — wrong EVM version
settings: { evmVersion: "london" }  // Must be "cancun"
```

---

## Expected Project Structure After Setup

```
project-root/
├── contracts/
│   └── Lock.sol              ← Delete this (Hardhat default, not FHE-compatible)
├── ignition/
│   └── modules/
│       └── Lock.ts           ← Delete this
├── scripts/                  ← Your deploy scripts go here
├── test/
│   └── Lock.ts               ← Delete this (optional but recommended)
├── hardhat.config.ts         ← Replace with CoFHE config (see above)
├── tsconfig.json             ← Keep as-is
├── package.json
├── package-lock.json
└── node_modules/
```

**After cleanup, your contracts directory should be empty and ready for your FHE contract.**

---

## Common Setup Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module '@cofhe/hardhat-plugin'` | Plugin not installed | Run `npm install @cofhe/hardhat-plugin@^0.4.0` |
| `HardhatError: Cannot find module` on compile | Wrong import order in config | Put `@cofhe/hardhat-plugin` import first |
| `Error: Invalid EVM version` | Wrong `evmVersion` value | Set `evmVersion: "cancun"` exactly |
| `TypeError: Cannot read properties of undefined` | Node version < 22 | Upgrade to Node.js v22 LTS |
| `Error: EACCES permission denied` | Running inside a non-empty folder | Use a fresh empty directory |
| `Error: TS compilation failed` | ts-node version mismatch | Pin to `ts-node@^10.9.2` exactly |
| FHE operations silently return zero | Mock runtime not loaded | Verify `@cofhe/hardhat-plugin` is installed and imported first |

---

## Verifying the Setup

After setup completes, run:

```bash
npx hardhat compile
```

Expected output (no FHE contracts yet, just checking toolchain):
```
Compiling 1 Solidity file
Successfully compiled 1 Solidity file
```

If compilation succeeds, your environment is correctly configured.
