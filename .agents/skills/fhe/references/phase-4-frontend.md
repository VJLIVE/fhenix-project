# Phase 4 — Frontend Integration (React + CoFHE SDK)

## Architecture Overview

The frontend participates in the FHE encryption lifecycle — it is not a passive viewer. The CoFHE SDK handles: wallet connection, input encryption, permit management, and decryption. The smart contract never sees plaintext.

```
User Input
    │
    ▼ client.encryptInputs()
Ciphertext (InEuint64)
    │
    ▼ walletClient.writeContract()
Fhenix Contract
    │ (stores euint64 on-chain)
    ▼ publicClient.readContract()
Ciphertext Handle (euint64 ctHash)
    │
    ▼ client.decryptForView() + permit
Plaintext (displayed in UI only, not on-chain)
```

---

## Project Structure

```
src/
├── config/
│   ├── abi.json           ← Copy from artifacts/contracts/ConfidentialVault.sol/
│   └── contract.js        ← Exports CONTRACT_ADDRESS constant
├── services/
│   └── cofheService.js    ← All FHE operations live here — import from this file only
├── App.jsx                ← React root — calls init() on load
└── main.jsx
```

---

## Required Packages

```bash
npm install @cofhe/sdk viem react react-dom
```

| Package | Version | Purpose |
|---------|---------|---------|
| `@cofhe/sdk` | `0.4.0` | Encryption, permits, decryption |
| `@cofhe/sdk/web` | (same) | Web-specific client factory functions |
| `@cofhe/sdk/chains` | (same) | Supported chain configurations |
| `viem` | latest | Ethereum wallet + public client |

---

## Configuration Files

### src/config/contract.js

```javascript
// Update this every time you redeploy the contract
export const CONTRACT_ADDRESS = "0xYOUR_DEPLOYED_CONTRACT_ADDRESS_HERE";
```

### src/config/abi.json

Copy the ABI array from `artifacts/contracts/ConfidentialVault.sol/ConfidentialVault.json`.

Minimal ABI for ConfidentialVault:
```json
[
  {
    "inputs": [
      {
        "components": [
          { "internalType": "bytes", "name": "data", "type": "bytes" },
          { "internalType": "bytes32", "name": "hash", "type": "bytes32" }
        ],
        "internalType": "struct InEuint64",
        "name": "encryptedAmount",
        "type": "tuple"
      }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "euint64", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "euint64", "name": "ctHash", "type": "uint256" },
      { "internalType": "uint64", "name": "plaintext", "type": "uint64" },
      { "internalType": "bytes", "name": "signature", "type": "bytes" }
    ],
    "name": "publishBalance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

**Best practice:** Always copy the full ABI from the compiled artifact rather than writing it manually.

---

## cofheService.js — Complete Reference Implementation

This is the single source of truth for all FHE operations in the frontend.

```javascript
// src/services/cofheService.js
import { createCofheConfig, createCofheClient } from "@cofhe/sdk/web";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { chains } from "@cofhe/sdk/chains";
import { createPublicClient, createWalletClient, http, custom } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACT_ADDRESS } from "../config/contract";
import ABI from "../config/abi.json";

// ─── Module-level singletons ─────────────────────────────────────────────────
// These are initialized once in init() and reused across all subsequent calls.
let client;        // CoFHE client — handles encryption/decryption/permits
let publicClient;  // viem read client — for calling view functions (readContract)
let walletClient;  // viem write client — for sending transactions (writeContract)
let account;       // Connected wallet address string

// ─── init() ──────────────────────────────────────────────────────────────────
/**
 * Initialize the CoFHE SDK, connect wallet, and create an authorization permit.
 * MUST be called before any other function. Call once on app load.
 *
 * What it does:
 *   1. Switches MetaMask to Sepolia network
 *   2. Creates the CoFHE client with Sepolia chain config
 *   3. Creates read and write viem clients
 *   4. Requests wallet account from MetaMask
 *   5. Connects CoFHE client to both viem clients
 *   6. Creates (or retrieves) the self-permit for decryption
 */
export async function init() {
  // 1. Ensure wallet is on Sepolia (chainId: 0xaa36a7 = 11155111)
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0xaa36a7" }],
  });

  // 2. Configure and instantiate CoFHE client
  const config = createCofheConfig({
    supportedChains: [chains.sepolia],
  });
  client = createCofheClient(config);

  // 3. Create viem clients
  publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),           // Public RPC — no private key needed for reads
  });
  walletClient = createWalletClient({
    chain: sepolia,
    transport: custom(window.ethereum),  // MetaMask as transport for writes
  });

  // 4. Get connected account
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  account = accounts[0];
  walletClient.account = account;

  // 5. Connect CoFHE client (registers the viem clients internally)
  await client.connect(publicClient, walletClient);

  // 6. Create permit — grants this wallet authority to decrypt its own data
  //    getOrCreateSelfPermit: fetches existing permit or creates and signs a new one
  await client.permits.getOrCreateSelfPermit();
}

// ─── deposit(amount) ─────────────────────────────────────────────────────────
/**
 * Encrypt a uint64 amount client-side and deposit it into the contract.
 *
 * Flow:
 *   1. Encrypt the number locally using the CoFHE SDK
 *   2. Send the ciphertext as an InEuint64 to the contract's deposit() function
 *   3. Contract performs FHE.add() on encrypted state — no plaintext ever on-chain
 *
 * @param {number|string} amount  The plaintext deposit amount (will be encrypted)
 */
export async function deposit(amount) {
  // Encrypt the input — produces InEuint64 (encrypted calldata-compatible struct)
  const [encryptedAmount] = await client
    .encryptInputs([Encryptable.uint64(BigInt(amount))])
    .execute();

  // Send encrypted value to contract — no plaintext in the transaction
  await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "deposit",
    args: [encryptedAmount],
    account,
  });
}

// ─── getBalance() ────────────────────────────────────────────────────────────
/**
 * Read and decrypt the caller's balance for UI display.
 *
 * Flow:
 *   1. Fetch the ciphertext handle (euint64) from the contract view function
 *   2. Decrypt locally using decryptForView — result never goes on-chain
 *   3. Return the plaintext number
 *
 * @returns {Promise<bigint>}  The decrypted balance
 */
export async function getBalance() {
  const permit = await client.permits.getOrCreateSelfPermit();

  // Read the ciphertext handle — not a number, just a reference to encrypted state
  const ctHash = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getBalance",
    account,
  });

  // Decrypt locally — authorized by permit, result stays client-side
  return await client
    .decryptForView(ctHash, FheTypes.Uint64)
    .withPermit(permit)
    .execute();
}

// ─── publishBalance() ────────────────────────────────────────────────────────
/**
 * Decrypt the balance offchain and publish the result on-chain with a proof.
 * Use this when the user wants their balance verifiably visible to others.
 *
 * Flow:
 *   1. Fetch the ciphertext handle from the contract
 *   2. Decrypt using decryptForTx — returns value + cryptographic signature
 *   3. Submit both to the contract's publishBalance() — contract verifies signature
 *
 * IMPORTANT: Use decryptForTx here, NOT decryptForView.
 *   decryptForView → UI only, no on-chain proof
 *   decryptForTx   → on-chain verifiable, includes signature
 */
export async function publishBalance() {
  const permit = await client.permits.getOrCreateSelfPermit();

  const ctHash = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getBalance",
    account,
  });

  // decryptForTx produces both the plaintext and a signature for on-chain verification
  const { decryptedValue, signature } = await client
    .decryptForTx(ctHash)
    .withPermit(permit)
    .execute();

  // Contract verifies the signature before accepting the published value
  await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "publishBalance",
    args: [ctHash, decryptedValue, signature],
    account,
  });
}
```

---

## React App Integration

### App.jsx

```jsx
import { useState, useEffect } from "react";
import { init, deposit, getBalance, publishBalance } from "./services/cofheService";

export default function App() {
  const [balance, setBalance] = useState(null);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("Not connected");
  const [ready, setReady] = useState(false);

  // Initialize CoFHE on mount — must happen before any SDK calls
  useEffect(() => {
    async function initSDK() {
      try {
        setStatus("Connecting wallet...");
        await init();
        setStatus("Connected");
        setReady(true);
      } catch (err) {
        setStatus("Error: " + err.message);
      }
    }
    initSDK();
  }, []);

  const handleDeposit = async () => {
    if (!amount || !ready) return;
    setStatus("Encrypting and depositing...");
    await deposit(amount);
    setStatus("Deposited");
  };

  const handleGetBalance = async () => {
    if (!ready) return;
    setStatus("Fetching and decrypting balance...");
    const bal = await getBalance();
    setBalance(bal.toString());
    setStatus("Balance retrieved");
  };

  const handlePublish = async () => {
    if (!ready) return;
    setStatus("Publishing balance on-chain...");
    await publishBalance();
    setStatus("Balance published");
  };

  return (
    <div>
      <h1>Confidential Vault</h1>
      <p>Status: {status}</p>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount to deposit"
        disabled={!ready}
      />
      <button onClick={handleDeposit} disabled={!ready}>Deposit</button>
      <button onClick={handleGetBalance} disabled={!ready}>Get Balance</button>
      <button onClick={handlePublish} disabled={!ready}>Publish Balance</button>
      {balance !== null && <p>Your balance: {balance}</p>}
    </div>
  );
}
```

---

## Decrypt Method Decision Matrix

| Scenario | Method | Returns | On-chain? |
|----------|--------|---------|-----------|
| Show balance in UI | `decryptForView(ctHash, FheTypes.Uint64)` | `bigint` | No |
| Publish balance to contract | `decryptForTx(ctHash)` | `{ decryptedValue, signature }` | Yes (via writeContract) |

**Never use `decryptForView` when you need to publish on-chain.** It does not produce a signature, so `FHE.publishDecryptResult` will reject the call.

---

## Permit System

Permits are signed authorizations that allow a wallet to decrypt specific encrypted values. Without a valid permit, all decrypt calls fail.

```javascript
// Always fetch permit before any decrypt operation
const permit = await client.permits.getOrCreateSelfPermit();
// → Fetches from local cache if already created
// → Creates and signs a new one via MetaMask if none exists

// Attach permit to every decrypt call
.withPermit(permit).execute()
```

**Permit scope:** `getOrCreateSelfPermit()` creates a permit that grants the calling wallet access to its own encrypted values. To grant another address access, use `FHE.allow(value, address)` on the contract side and a counterparty permit on the frontend.

---

## Common Frontend Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `client is not defined` | Calling SDK function before `init()` | Ensure `init()` completes (await it) before other calls |
| `wallet_switchEthereumChain` fails | MetaMask not installed or locked | User must have MetaMask installed and unlocked |
| `Error: invalid permit` | No permit created | Call `getOrCreateSelfPermit()` before decrypt |
| `decryptedValue is undefined` | Used `decryptForView` instead of `decryptForTx` | Use `decryptForTx` for on-chain publishing |
| `0x0` or wrong contract address | Stale CONTRACT_ADDRESS | Update `src/config/contract.js` after each deploy |
| ABI mismatch error | Outdated `abi.json` | Re-copy from `artifacts/` after recompiling |
| Decryption returns wrong value | Permission not set on contract | Add `FHE.allowSender()` after state mutation |
| Transaction reverts silently | Missing `FHE.allowThis()` | Add `FHE.allowThis()` after every state mutation |
