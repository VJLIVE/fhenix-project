# Phase 2 — Confidential Contract Development

## Encrypted Type System

Fhenix introduces a parallel type system in Solidity. Every plaintext type has an encrypted equivalent. These types are **not interchangeable** — you cannot assign a `uint64` to a `euint64` directly.

### Type Reference

| Plaintext Type | Encrypted Storage Type | Encrypted Input Type | SDK Encrypt Method |
|---------------|----------------------|---------------------|-------------------|
| `uint64` | `euint64` | `InEuint64` | `Encryptable.uint64(BigInt(n))` |
| `uint32` | `euint32` | `InEuint32` | `Encryptable.uint32(n)` |
| `uint16` | `euint16` | `InEuint16` | `Encryptable.uint16(n)` |
| `uint8` | `euint8` | `InEuint8` | `Encryptable.uint8(n)` |
| `bool` | `ebool` | `InEbool` | `Encryptable.bool(b)` |

**The two categories:**
- `euint64` / `ebool` — stored in contract state; the result of on-chain FHE computation
- `InEuint64` / `InEbool` — calldata only; how encrypted user inputs arrive from the frontend

**Convert between them using `FHE.asEuint64()`:**
```solidity
function deposit(InEuint64 calldata encryptedAmount) external {
    euint64 amount = FHE.asEuint64(encryptedAmount); // calldata → storable
    _balances[msg.sender] = FHE.add(_balances[msg.sender], amount);
}
```

---

## FHE.sol Operation Reference

All operations work on ciphertext. Results are also ciphertext. No plaintext is ever produced on-chain.

### Arithmetic

```solidity
euint64 result = FHE.add(a, b);   // encrypted(a + b)
euint64 result = FHE.sub(a, b);   // encrypted(a - b)
euint64 result = FHE.mul(a, b);   // encrypted(a * b)
euint64 result = FHE.div(a, b);   // encrypted(a / b)  — use carefully (gas-heavy)
```

### Comparison (returns ebool)

```solidity
ebool result = FHE.eq(a, b);    // encrypted(a == b)
ebool result = FHE.ne(a, b);    // encrypted(a != b)
ebool result = FHE.gt(a, b);    // encrypted(a > b)
ebool result = FHE.gte(a, b);   // encrypted(a >= b)
ebool result = FHE.lt(a, b);    // encrypted(a < b)
ebool result = FHE.lte(a, b);   // encrypted(a <= b)
```

### Selection (conditional on ciphertext)

```solidity
// FHE.select(condition, ifTrue, ifFalse) — encrypted ternary
euint64 result = FHE.select(condition, valueIfTrue, valueIfFalse);
```

### Type Conversion

```solidity
euint64 val = FHE.asEuint64(inEuint64Input);   // InEuint64 → euint64
euint32 val = FHE.asEuint32(inEuint32Input);   // InEuint32 → euint32
ebool   val = FHE.asEbool(inEboolInput);       // InEbool   → ebool
```

### Permissions (Critical — Always Set After Mutation)

```solidity
FHE.allowThis(value);       // The contract itself can operate on this ciphertext
FHE.allowSender(value);     // msg.sender's wallet can read/decrypt this ciphertext
FHE.allow(value, address);  // Grant a specific address decrypt access
```

**Rule:** Call `allowThis` and `allowSender` **immediately** after every state mutation involving an encrypted value. Forgetting causes permission errors that appear only at decrypt time, not at write time — hard to debug.

### On-Chain Decryption Publishing

```solidity
// Used when a user decrypts offchain and wants to prove the result on-chain
FHE.publishDecryptResult(ctHash, plaintext, signature);
// ctHash   — the euint64 ciphertext handle
// plaintext — the decrypted value (from SDK decryptForTx)
// signature — the SDK-generated proof of correct decryption
```

---

## Canonical Implementation: ConfidentialVault

The ConfidentialVault is the reference pattern for encrypted balances. Study every line — each has a deliberate reason.

### File location
```
contracts/ConfidentialVault.sol
```

### Full Contract

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';

/**
 * @title ConfidentialVault
 * @notice Demonstrates encrypted balance storage and operations using Fhenix FHE.
 *         All balances are stored as ciphertext — no node or observer ever sees plaintext values.
 */
contract ConfidentialVault {

    // ✅ euint64, not uint64 — balances are stored encrypted
    mapping(address => euint64) private _balances;

    /**
     * @notice Deposit an encrypted amount into the caller's balance.
     * @param encryptedAmount  Encrypted uint64, produced by the CoFHE SDK client-side.
     */
    function deposit(InEuint64 calldata encryptedAmount) external {
        // Convert InEuint64 (calldata type) to euint64 (storable type)
        euint64 amount = FHE.asEuint64(encryptedAmount);

        // FHE.add — encrypted addition; neither operand is ever decrypted
        _balances[msg.sender] = FHE.add(_balances[msg.sender], amount);

        // Permissions MUST be set after every mutation
        FHE.allowThis(_balances[msg.sender]);   // Contract can continue operating on this value
        FHE.allowSender(_balances[msg.sender]); // Depositor's wallet can decrypt their own balance
    }

    /**
     * @notice Return the caller's encrypted balance handle.
     * @return euint64 ciphertext handle — NOT a plaintext number.
     *         The frontend must decrypt this using the CoFHE SDK + a valid permit.
     */
    function getBalance() public view returns (euint64) {
        return _balances[msg.sender];
    }

    /**
     * @notice Publish an offchain-decrypted balance on-chain with cryptographic proof.
     *         Used when the user wants to make their balance verifiably visible.
     * @param ctHash    The euint64 ciphertext handle
     * @param plaintext The decrypted value (from SDK decryptForTx)
     * @param signature The SDK-generated signature proving correct decryption
     */
    function publishBalance(
        euint64 ctHash,
        uint64 plaintext,
        bytes calldata signature
    ) external {
        FHE.publishDecryptResult(ctHash, plaintext, signature);
    }
}
```

### What Each Part Does

| Component | Purpose |
|-----------|---------|
| `mapping(address => euint64)` | Stores ciphertext handles, not numbers. Observers see only opaque handles. |
| `InEuint64 calldata encryptedAmount` | Receives the encrypted value from the frontend. Never arrives as plaintext. |
| `FHE.asEuint64(encryptedAmount)` | Converts calldata input type to storable state type. Required before any FHE operation. |
| `FHE.add(_balances[...], amount)` | Adds two ciphertexts — produces encryption of their sum. |
| `FHE.allowThis(...)` | Ensures the contract can use the stored value in future computations. |
| `FHE.allowSender(...)` | Allows the depositing wallet to decrypt its own balance via SDK. |
| `getBalance() returns (euint64)` | Returns a ciphertext handle — the frontend decrypts it client-side. |
| `publishBalance(...)` | Records an offchain-verified plaintext on-chain with cryptographic proof. |

---

## Correct vs. Incorrect Patterns

### Storage

```solidity
// ✅ CORRECT — encrypted storage
mapping(address => euint64) private _balances;

// ❌ WRONG — plaintext storage defeats the entire purpose
mapping(address => uint64) private _balances;  // fully readable on-chain
```

### Function Parameters

```solidity
// ✅ CORRECT — accept encrypted input
function deposit(InEuint64 calldata encryptedAmount) external {
    euint64 amount = FHE.asEuint64(encryptedAmount);
    ...
}

// ❌ WRONG — accepting plaintext makes the value visible in the transaction
function deposit(uint64 amount) external {
    // 'amount' is visible in calldata — anyone can read it
}
```

### Arithmetic

```solidity
// ✅ CORRECT — FHE arithmetic on ciphertext
_balances[msg.sender] = FHE.add(_balances[msg.sender], amount);

// ❌ WRONG — standard operators do not work on euint64
_balances[msg.sender] = _balances[msg.sender] + amount;  // Compile error or incorrect behavior
```

### Permissions

```solidity
// ✅ CORRECT — always set permissions after mutation
_balances[msg.sender] = FHE.add(_balances[msg.sender], amount);
FHE.allowThis(_balances[msg.sender]);
FHE.allowSender(_balances[msg.sender]);

// ❌ WRONG — no permissions set
_balances[msg.sender] = FHE.add(_balances[msg.sender], amount);
// Result: decrypt calls silently fail or revert — no compile warning
```

### Events

```solidity
// ✅ CORRECT — emit only non-sensitive data
event Deposited(address indexed user, uint256 timestamp);

// ❌ WRONG — never emit encrypted values or sensitive derived data
event Deposited(address indexed user, uint64 amount);  // amount is now public
```

---

## Contract Setup Steps

**Always follow this order:**

1. Delete `contracts/Lock.sol` (Hardhat default — incompatible with FHE)
2. Optionally delete `test/Lock.ts` and `ignition/modules/Lock.ts`
3. Create `contracts/ConfidentialVault.sol`
4. Ensure the import path is exactly: `import '@fhenixprotocol/cofhe-contracts/FHE.sol';`
5. Compile before writing tests

---

## Compilation

```bash
npx hardhat compile
```

### What Happens Internally

```
contracts/*.sol
      │
      ▼ Resolve imports (FHE.sol, plugins, libraries)
      │
      ▼ Validate syntax and types
      │
      ▼ Build dependency graph
      │
      ▼ Generate Intermediate Representation (IR)
      │
      ▼ Optimize (gas and execution)
      │
      ▼ Convert IR → EVM Bytecode
      │
      ▼ Generate ABI
      │
      ▼
artifacts/contracts/ConfidentialVault.sol/ConfidentialVault.json
cache/  (incremental build cache)
```

### Output Artifacts

```
artifacts/
└── contracts/
    └── ConfidentialVault.sol/
        └── ConfidentialVault.json   ← Contains: ABI + Bytecode + Metadata

cache/                               ← Speeds up incremental rebuilds
```

| Artifact | Used By | Purpose |
|----------|---------|---------|
| ABI | Frontend, deploy scripts | Defines function signatures the SDK/ethers uses |
| Bytecode | Deploy script | The actual code deployed to blockchain |
| Metadata | Debuggers, block explorers | Compiler version, source info |

**Copy `ConfidentialVault.json` to your frontend's `src/config/abi.json` after each recompile.**

---

## Local Testing

Local tests use the CoFHE mock runtime — no testnet required.

```typescript
// test/vault.test.ts
import { ethers } from "hardhat";
import { expect } from "chai";

describe("ConfidentialVault", function () {
  it("should accept a deposit and return an encrypted balance", async function () {
    const [owner] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("ConfidentialVault");
    const vault = await Vault.deploy();
    await vault.waitForDeployment();

    // In test environment, CoFHE mock handles FHE operations
    // Use the cofhe plugin test helpers for encrypted inputs
    // Refer to @cofhe/hardhat-plugin test utilities for encryptInput helpers
    console.log("Vault deployed:", await vault.getAddress());
  });
});
```

Run tests:
```bash
npx hardhat test
```
