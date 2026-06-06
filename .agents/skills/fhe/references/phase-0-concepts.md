# Phase 0 — Conceptual Foundations

## The Core Problem: Blockchain as a Glass House

Standard blockchains are fully transparent by design. Every wallet balance, every transaction, every contract state is globally readable — permanently, by anyone. This creates systemic risks:

- **Surveillance** — any address can be profiled: income, spending, counterparties
- **Front-running** — pending transactions are visible in the mempool before confirmation
- **Targeting** — large balances are publicly visible, making holders targets
- **No trade secrets** — businesses cannot execute confidential strategies on-chain

Being open is a feature. Being surveilled is a vulnerability. The root cause is that blockchain transparency is **all-or-nothing** — traditional blockchains have no way to compute on hidden data.

## The FHE Breakthrough: Prove Without Revealing

**Fully Homomorphic Encryption (FHE)** allows a computer to perform arbitrary mathematical operations on encrypted data — and produce an encrypted result — without ever decrypting anything in the middle.

```
User input (plaintext)
      │
      ▼
  [Encrypt]
      │
      ▼
Ciphertext (looks like random noise)
      │
      ▼  ← network operates here, sees only noise
  [FHE arithmetic: add, multiply, compare]
      │
      ▼
Encrypted result (still ciphertext)
      │
      ▼
  [Decrypt] ← only the authorized key holder does this
      │
      ▼
Correct plaintext result
```

The server processing the data has **zero knowledge** of the values it computed on. This is not an approximation or a compromise — the result is mathematically identical to computing on plaintext.

## The 5-Step FHE Pipeline

| Step | Action | Who Has Access |
|------|--------|---------------|
| 1. Encrypt | User transforms plaintext into ciphertext locally | User only |
| 2. Math rules | Ciphertext obeys arithmetic: `enc(a) + enc(b) = enc(a+b)` | Nobody (opaque) |
| 3. Blind compute | Network runs contract logic entirely on ciphertext | Nobody (blind) |
| 4. Encrypted result | Output remains ciphertext post-computation | Nobody |
| 5. Authorized decrypt | Key holder translates result back to plaintext | Key holder only |

**Key property:** Adding two ciphertexts yields the encryption of their sum. Multiplying two ciphertexts yields the encryption of their product. Logic (conditionals, comparisons) also works. All without seeing the numbers.

## From FHE Theory to Fhenix

Fhenix packages FHE into a Solidity-compatible developer experience. You do not implement cryptography. You write Solidity using FHE-native types and the `FHE.sol` library does the rest.

### The Blindfolded Smart Contract Model

```
User Wallet                Fhenix Network              Key Holder
────────────               ──────────────              ──────────
Encrypt input  ──────────► Contract receives           Receives
(client-side)              encrypted InEuint64         ctHash
                           Executes FHE.add()
                           Stores euint64              Calls
                           (never plaintext)           decryptForView()
                           Returns ctHash  ──────────► Gets plaintext
```

The contract receives, stores, and computes on ciphertexts. It is permanently blind to values.

## What You Can Build

| Use Case | What It Enables |
|----------|----------------|
| **Confidential DeFi** | Private balances, hidden trade sizes, front-running resistance |
| **Private Voting** | Encrypted ballots; results only revealed after close |
| **Healthcare on-chain** | Patient data encrypted at rest; accessible only by authorized wallets |
| **Data Marketplaces** | Sell access to data without exposing the data itself |
| **Sealed-bid Auctions** | Bids remain hidden until reveal phase |
| **Private Gaming** | Hidden game state, provably fair without revealing hands |

## The Trade-off Fhenix Eliminates

| Traditional Blockchain | With Fhenix |
|-----------------------|-------------|
| Transparency OR privacy | Transparency AND privacy |
| Public logic, public data | Public logic, private data |
| Trust requires exposure | Trust without exposure |

Fhenix removes the binary: you get verifiable computation (blockchain) and data confidentiality (FHE) simultaneously.
