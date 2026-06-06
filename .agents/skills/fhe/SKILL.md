---
name: fhe
description: "Expert guide for building confidential smart contracts on Fhenix using Fully Homomorphic Encryption (FHE). Trigger this skill whenever the user mentions Fhenix, FHE, CoFHE, confidential blockchain, encrypted smart contracts, euint64, FHE.sol, @cofhe/sdk, @fhenixprotocol/cofhe-contracts, or any task involving privacy-preserving computation on Ethereum. Also trigger for: setting up Hardhat with CoFHE plugin, writing ConfidentialVault contracts, working with encrypted Solidity types (euint64, ebool, InEuint64), deploying to Sepolia testnet with FHE, connecting React frontends to encrypted on-chain state, or implementing the CoFHE permit/decryption system. Covers the complete 5-phase lifecycle: conceptual foundations → environment setup → contract development → deployment → frontend integration."
license: See LICENSE.txt for terms
---

# 0m3rexe — Fhenix FHE Confidential Smart Contract Skill

Fhenix enables **compute without revealing**: smart contracts perform arithmetic on encrypted ciphertext. No node ever sees plaintext values. Only the authorized key holder decrypts the final result.

## Quick Reference

| Task | Go To |
|------|-------|
| Understand FHE / why privacy matters | `references/phase-0-concepts.md` |
| Set up Hardhat + CoFHE dev environment | `references/phase-1-setup.md` |
| Write an encrypted Solidity contract | `references/phase-2-contracts.md` |
| Compile, test, and verify contracts | `references/phase-2-contracts.md` |
| Deploy to Sepolia testnet | `references/phase-3-deploy.md` |
| Connect React frontend to encrypted state | `references/phase-4-frontend.md` |
| Implement CoFHE SDK (encrypt / decrypt / permit) | `references/phase-4-frontend.md` |

## Development Lifecycle

```
Phase 0  →  Concepts: understand FHE encryption model
Phase 1  →  Setup: Node v22+, Hardhat, CoFHE packages
Phase 2  →  Contracts: euint64 types, FHE.sol operations
Phase 3  →  Deploy: .env → hardhat config → Sepolia
Phase 4  →  Frontend: CoFHE SDK, encrypt inputs, decrypt results
```

## Universal Rules (Apply Across All Phases)

These constraints are non-negotiable and override any assumption from general Solidity/Hardhat knowledge:

**Environment**
- Node.js LTS v22 or higher — **v16 and v18 are incompatible**, no exceptions
- EVM version must be `"cancun"` in hardhat config — omitting it silently breaks FHE compilation
- Import `@cofhe/hardhat-plugin` **before** `@nomicfoundation/hardhat-toolbox` in every hardhat config

**Contracts**
- Never store plaintext balances — always use `euint64`, `euint32`, or `ebool`
- Never accept plaintext in function parameters — use `InEuint64 calldata` not `uint64`
- Never use `+`, `-`, `*` operators on encrypted values — use `FHE.add()`, `FHE.sub()`, `FHE.mul()`
- Always call `FHE.allowThis()` and `FHE.allowSender()` **immediately** after any encrypted state mutation — skipping them causes silent permission failures at decrypt time

**Frontend**
- Always call `init()` before any other CoFHE SDK function
- Always encrypt user inputs via `client.encryptInputs()` — never send plaintext to an FHE contract
- Always fetch a permit via `client.permits.getOrCreateSelfPermit()` before any decrypt operation
- Use `decryptForView` for UI-only display; use `decryptForTx` when publishing values on-chain

## Encrypted Type Quick Reference

| Solidity Plaintext | FHE Storage Type | FHE Input Type (calldata) |
|--------------------|-----------------|--------------------------|
| `uint64` | `euint64` | `InEuint64` |
| `uint32` | `euint32` | `InEuint32` |
| `uint16` | `euint16` | `InEuint16` |
| `bool` | `ebool` | `InEbool` |

## FHE.sol Operations Quick Reference

```solidity
// Type conversion (calldata → storable)
euint64 val = FHE.asEuint64(inEuint64Input);

// Arithmetic (all operate on ciphertext, return ciphertext)
euint64 sum  = FHE.add(a, b);
euint64 diff = FHE.sub(a, b);
euint64 prod = FHE.mul(a, b);

// Comparison (returns ebool)
ebool eq  = FHE.eq(a, b);
ebool gt  = FHE.gt(a, b);
ebool gte = FHE.gte(a, b);

// Permissions (ALWAYS set after mutating state)
FHE.allowThis(value);     // contract can operate on value
FHE.allowSender(value);   // calling wallet can decrypt value

// Publish decrypted value on-chain with proof
FHE.publishDecryptResult(ctHash, plaintext, signature);
```

## Reference Files

Read these on demand — load only the section relevant to the current task:

- **`references/phase-0-concepts.md`** — FHE theory, the encryption pipeline, what Fhenix enables, use case taxonomy
- **`references/phase-1-setup.md`** — Full environment setup: Node version requirements, all package versions, Hardhat init, config files, common errors
- **`references/phase-2-contracts.md`** — Contract anatomy, full ConfidentialVault implementation, FHE.sol operation reference, correct/incorrect pattern matrix, compilation pipeline
- **`references/phase-3-deploy.md`** — Deployment architecture, dotenv setup, hardhat.config for testnets, deploy scripts, expected outputs, security checklist
- **`references/phase-4-frontend.md`** — CoFHE SDK integration, full cofheService.js, init/deposit/getBalance/publishBalance patterns, permit system, decrypt method selection, React wiring

---

*Source documentation: https://fhenix-documentation.vercel.app/*
