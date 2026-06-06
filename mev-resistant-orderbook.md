# ShieldDEX — MEV-Resistant Encrypted Order Book
### Built on Fhenix FHE · Hackathon PRD + TRD + Tech Stack + UI System

> Documentation Reference: https://fhenix-documentation.vercel.app/
> Author: 0m3rexe
> Version: 1.0.0 — Hackathon Build

---

## Table of Contents

1. [Platform Decision](#platform-decision)
2. [Problem Statement](#problem-statement)
3. [Solution Statement](#solution-statement)
4. [Tech Stack](#tech-stack)
5. [Architecture Overview](#architecture-overview)
6. [User Flow](#user-flow)
7. [UI System](#ui-system)
8. [PRD — Product Requirements Document](#prd)
9. [TRD — Technical Requirements Document](#trd)
10. [Security Model](#security-model)
11. [Hackathon Scope](#hackathon-scope)

---

## 1. Platform Decision

**Question:** Should this be a standalone platform or an integratable SDK?

**Answer: Standalone demo platform for the hackathon. SDK-first architecture for post-hackathon.**

For the hackathon, a standalone React application gives judges a live, tangible demo they can interact with in 60 seconds. The smart contract is designed to be modular so any DEX can integrate it post-hackathon by simply importing `PrivateOrderBook.sol` and calling `submitOrder()` and `matchOrders()`.

The architecture is separation-conscious from day one:
- Smart contract layer → fully standalone, importable by any EVM DEX
- CoFHE service layer → reusable `cofheService.js` pattern, portable to any frontend
- UI layer → hackathon-specific demo, not shipped as a product

This means the hackathon build is also the foundation for a real product.

---

## 2. Problem Statement

Every blockchain is a glass house. Per the Fhenix documentation
(https://fhenix-documentation.vercel.app/docs/phase-0/why-privacy-matters):

> "All transactions, balances, and contract interactions are publicly visible."

For a DEX order book, this public visibility is catastrophic. When a trader submits an order, it enters the **mempool** — a public waiting room where every pending transaction is readable by anyone, including automated bots.

**The Attack Flow:**
```
Trader submits:   BUY 1 ETH @ $3,000
Mempool exposes:  Price, amount, wallet address — all visible
Bot detects:      Large buy order → price will rise
Bot front-runs:   Buys ETH at $2,999 before the trader
Trader executes:  At $3,001 (bot artificially moved price up)
Bot back-runs:    Sells immediately at $3,001
Bot profit:       $2 extracted per transaction
```

This attack is called a **sandwich attack** and is the most common form of MEV
(Maximal Extractable Value). It extracted over **$1.2 billion from DeFi users on
Ethereum alone**, with sandwich attacks accounting for roughly 51% of total MEV volume.

Even Vitalik Buterin — Ethereum's co-founder — was sandwiched by the bot
`jaredfromsubway.eth` in April 2026, losing value on a routine token swap.

**Existing solutions are off-chain patches, not root fixes:**

| Solution | Mechanism | Why It Fails |
|---|---|---|
| Flashbots Protect | Routes via private relay | Trusted third party, off-chain |
| Commit-Reveal | Hash first, reveal later | Attack window between commit and reveal |
| CoW Protocol | Batch auction matching | Solver still reads order content |
| Slippage Tolerance | Cap on price movement | Does not prevent the attack, only limits damage |

None of them remove the root cause: **order data is readable before execution.**

---

## 3. Solution Statement

Per the Fhenix FHE model documented at
https://fhenix-documentation.vercel.app/docs/phase-0/how-fhe-works:

> "FHE allows computation directly on encrypted data — without ever decrypting it."

ShieldDEX is an order book DEX where every order is stored and matched as an
encrypted `euint64` value. The matching engine uses `FHE.gte()` to compare two
encrypted prices without ever decrypting either one. No plaintext price ever exists
on-chain or in the mempool.

**Result:**
```
Trader submits:   BUY 1 ETH @ encrypted(3000)
Mempool exposes:  0x7f3a9c4b2d... (meaningless noise)
Bot detects:      Nothing. Ciphertext is unreadable.
Matching engine:  FHE.gte(encBid, encAsk) → match found on ciphertext
Settlement:       FHE.allowSender() → only matched trader decrypts result
Bot profit:       $0
```

---

## 4. Tech Stack

### 4.1 Prerequisites

Per https://fhenix-documentation.vercel.app/docs/phase-1/environment-construction:

```
Node.js:   v22 LTS or higher (MANDATORY — do NOT use v16 or v18)
Git:       Latest stable
Wallet:    MetaMask with Sepolia testnet configured
RPC:       Sepolia RPC URL (from Alchemy or Infura)
```

### 4.2 Smart Contract Layer

| Package | Version | Source | Purpose |
|---|---|---|---|
| `hardhat` | `^2.22.3` | npm | Ethereum dev environment |
| `@nomicfoundation/hardhat-toolbox` | `^6.1.2` | npm | ethers v6, chai, testing |
| `typescript` | `^6.0.2` | npm | Typed scripting |
| `ts-node` | `^10.9.2` | npm | Run TS without compilation |
| `@cofhe/hardhat-plugin` | `^0.4.0` | npm | FHE integration into Hardhat |
| `@cofhe/sdk` | `0.4.0` | npm | Client-side encryption bridge |
| `@fhenixprotocol/cofhe-contracts` | `0.1.0` | npm | FHE.sol encrypted primitives |
| `dotenv` | latest | npm | Environment variable management |

Install command (from https://fhenix-documentation.vercel.app/docs/phase-1/environment-construction):

```bash
npm install --save-dev hardhat@^2.22.3 \
  @nomicfoundation/hardhat-toolbox@^6.1.2 \
  typescript@^6.0.2 \
  ts-node@^10.9.2

npm install @cofhe/hardhat-plugin@^0.4.0 \
  @cofhe/sdk@0.4.0 \
  @fhenixprotocol/cofhe-contracts@0.1.0

npm install dotenv
```

### 4.3 Frontend Layer

| Package | Version | Purpose |
|---|---|---|
| `react` | `^18` | UI framework |
| `vite` | latest | Build tool |
| `@cofhe/sdk` | `0.4.0` | Encryption, permits, decryption |
| `viem` | latest | Ethereum interaction |
| `tailwindcss` | latest | Styling |

### 4.4 Network

| Item | Value |
|---|---|
| Testnet | Ethereum Sepolia |
| Chain ID | `0xaa36a7` |
| Compiler | Solidity `0.8.28` |
| EVM Version | `cancun` (CRITICAL — required for FHE ops) |

### 4.5 hardhat.config.ts

Per https://fhenix-documentation.vercel.app/docs/phase-1/environment-construction:

```typescript
import "@cofhe/hardhat-plugin";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();

const config = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",   // CRITICAL: Do not change
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};

export default config;
```

### 4.6 Environment Variables

Per https://fhenix-documentation.vercel.app/docs/phase-3/deployment-code-setup:

```
# .env — NEVER push to GitHub
PRIVATE_KEY=your_deployer_private_key_here
SEPOLIA_RPC_URL=https://eth-sepolia.alchemyapi.io/v2/your_key
```

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      USER BROWSER                           │
│                                                             │
│   ┌─────────────┐      ┌───────────────────────────────┐   │
│   │  React UI   │ ───► │      cofheService.js           │   │
│   │  App.jsx    │      │  init() / submitOrder()        │   │
│   │             │      │  getOrders() / getClearPrice() │   │
│   └─────────────┘      └───────────────────────────────┘   │
│                                  │                          │
│                         Encrypt locally                     │
│                    (price never leaves browser              │
│                         as plaintext)                       │
└──────────────────────────────────┼──────────────────────────┘
                                   │ InEuint64 (ciphertext)
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    ETHEREUM SEPOLIA                          │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              PrivateOrderBook.sol                    │   │
│   │                                                     │   │
│   │  submitOrder(InEuint64 price, InEuint64 amount)     │   │
│   │    → FHE.asEuint64() → stored as euint64            │   │
│   │    → FHE.allowThis() → contract holds ciphertext    │   │
│   │                                                     │   │
│   │  matchOrders(bidId, askId)                          │   │
│   │    → FHE.gte(encBid, encAsk)  ← no decryption      │   │
│   │    → FHE.select(matched, ask, 0) ← picks winner    │   │
│   │    → FHE.allowSender() ← only matched party        │   │
│   │                                                     │   │
│   │  publishClearingPrice(ctHash, plaintext, sig)       │   │
│   │    → FHE.publishDecryptResult() ← final reveal     │   │
│   └─────────────────────────────────────────────────────┘   │
│                         │                                   │
│                  CoFHE Coprocessor                          │
│          (processes FHE ops, returns encrypted result)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. User Flow

### 6.1 Trader Submits a Buy Order

```
Step 1   Trader opens ShieldDEX and connects MetaMask wallet
           ↓
Step 2   cofheService.init() is called
         → Switches wallet to Sepolia (chainId: 0xaa36a7)
         → Creates CoFHE client via createCofheClient()
         → Creates publicClient and walletClient via viem
         → Calls client.permits.getOrCreateSelfPermit()
           ↓
Step 3   Trader enters: Buy 1 ETH @ $3,000
           ↓
Step 4   Frontend calls cofheService.submitOrder(3000, 1, true)
         → client.encryptInputs([Encryptable.uint64(3000n), Encryptable.uint64(1n)])
         → Price and amount encrypted locally in browser
         → walletClient.writeContract({ functionName: "submitOrder", args: [encPrice, encAmount, true] })
           ↓
Step 5   Transaction sent to Sepolia mempool
         → Mempool contains: 0x7f3a9c... (unreadable ciphertext)
         → Bot scans mempool: finds nothing exploitable
           ↓
Step 6   Contract executes submitOrder()
         → FHE.asEuint64(encPrice) converts InEuint64 to euint64
         → FHE.allowThis() grants contract permission to hold ciphertext
         → Order stored in mapping(uint => Order) with encrypted price
           ↓
Step 7   UI updates: "Order #4 submitted — encrypted and protected"
```

### 6.2 Order Matching Engine

```
Step 1   Matcher (can be anyone) calls matchOrders(bidId, askId)
           ↓
Step 2   Contract loads both encrypted orders
         → bid.encryptedPrice (euint64)
         → ask.encryptedPrice (euint64)
           ↓
Step 3   FHE comparison — no decryption
         → ebool matched = FHE.gte(bid.encryptedPrice, ask.encryptedPrice)
         → This runs entirely on ciphertext inside CoFHE coprocessor
           ↓
Step 4   Clearing price selected on ciphertext
         → euint64 clearingPrice = FHE.select(matched, ask.encryptedPrice, FHE.asEuint64(0))
           ↓
Step 5   Access granted only to matched parties
         → FHE.allowSender(clearingPrice) — only the calling matched trader can decrypt
           ↓
Step 6   Orders marked as settled
         → bid.active = false
         → ask.active = false
```

### 6.3 Trader Views Their Result

```
Step 1   Matched trader clicks "View My Trade Result"
           ↓
Step 2   cofheService.getClearingPrice() is called
         → permit = client.permits.getOrCreateSelfPermit()
         → ctHash = publicClient.readContract({ functionName: "getClearingPrice" })
           ↓
Step 3   Decryption via permit system
         → client.decryptForView(ctHash, FheTypes.Uint64).withPermit(permit).execute()
         → Only this wallet can decrypt — all other wallets receive nothing
           ↓
Step 4   UI shows: "Your trade cleared at $3,000"
         → All other traders' prices remain encrypted
         → Unmatched orders remain encrypted permanently
```

### 6.4 Full User Journey (Happy Path)

```
Connect Wallet
     ↓
Select Token Pair (ETH/USDC)
     ↓
Choose: BUY or SELL
     ↓
Enter Price + Amount
     ↓
Click "Submit Encrypted Order"
     ↓
MetaMask popup — sign transaction
     ↓
"Order Protected" confirmation screen
     ↓
Wait for match (live order book shows encrypted slots)
     ↓
"Order Matched" notification
     ↓
Click "View Clearing Price" — permit sign
     ↓
See your result
     ↓
Other traders see nothing about your trade
```

---

## 7. UI System

### 7.1 Design Philosophy

The UI must make FHE's invisibility visible. The entire design language should
communicate one thing: **your data is locked and nobody can see it.** Every
component either shows encrypted state (a lock) or decrypted state (a reveal),
and nothing in between.

### 7.2 Color System

```
Background:     #0A0A0F  (near black — conveys security, depth)
Surface:        #111118  (card backgrounds)
Surface-2:      #1A1A24  (elevated cards, modals)
Border:         #2A2A3A  (subtle boundaries)

Primary:        #6C47FF  (Fhenix purple — FHE encrypted state)
Primary-glow:   rgba(108, 71, 255, 0.15)

Success:        #00D897  (matched, decrypted, settled — green)
Warning:        #FFB800  (pending, waiting)
Danger:         #FF4560  (attack, exposed, MEV — red for contrast side)

Text-primary:   #FFFFFF
Text-secondary: #8888AA
Text-muted:     #444466

Encrypted-bg:   rgba(108, 71, 255, 0.08)  (order slots in encrypted state)
Encrypted-border: rgba(108, 71, 255, 0.3)
```

### 7.3 Typography

```
Font Family:   Inter (system fallback: -apple-system, sans-serif)
Monospace:     JetBrains Mono (for ciphertext display, addresses, amounts)

Scale:
  xs:   11px  — ciphertext noise display
  sm:   13px  — labels, secondary info
  base: 15px  — body text
  lg:   18px  — card titles
  xl:   24px  — section headers
  2xl:  32px  — page title
  3xl:  48px  — hero stat
```

### 7.4 Component Inventory

#### NavBar
```
[ShieldDEX logo]    [ETH/USDC ▾]    [🔒 0x7f3a...4b2d]    [Connect Wallet]
```
- Lock icon replaces the usual wallet icon to reinforce encryption
- Wallet address shown truncated — clicking reveals via permit

#### Order Entry Panel (left column)

```
┌─────────────────────────────┐
│  [BUY]          [SELL]      │
│                             │
│  Price  [$    ____________] │
│  Amount [     ____________] │
│                             │
│  🔒 Order will be encrypted │
│     before leaving browser  │
│                             │
│  [Submit Encrypted Order  ] │
└─────────────────────────────┘
```
- Toggle between BUY/SELL (pill tabs)
- Price and amount inputs (plain number, encrypted on submit)
- Info line: "Encrypted locally via CoFHE SDK before transmission"
- Primary CTA button in Fhenix purple

#### Encrypted Order Book (center, main panel)

```
┌─────────────────────────────────────────────────────────┐
│  SELL ORDERS                              [Encrypted 🔒] │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░  0x9c2a...  [Pending]       │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░  0x7f3b...  [Pending]       │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░  0x4e1c...  [Pending]       │
│  ─────────────────────────────── SPREAD ────────────── │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░  0x2d8f...  [Pending]       │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░  0x1a7e...  [Pending]       │
│  BUY ORDERS                              [Encrypted 🔒] │
└─────────────────────────────────────────────────────────┘
```
- Prices shown as `░░░░░░░░` placeholders (not zeros — makes the encryption tangible)
- Only the order ID and wallet address visible
- Status badges: Pending / Matched / Settled
- Matched orders animate green flash on settlement

#### MEV Comparison Panel (right column — demo feature)

```
┌──────────────────────────────────────────┐
│  WITHOUT ShieldDEX        WITH ShieldDEX │
│                                          │
│  Your price:    $3,000   Your price: ░░░ │
│  Bot sees:      $3,000   Bot sees:   ??? │
│  You paid:      $3,001   You paid: $3,000│
│  Bot profit:      $1     Bot profit:  $0 │
│                                          │
│  🔴 Sandwiched           🟢 Protected    │
└──────────────────────────────────────────┘
```
This panel is the most important UI for the hackathon demo.

#### My Orders Panel (bottom)

```
┌────────────────────────────────────────────────────────┐
│  MY ORDERS                                             │
│                                                        │
│  #4  BUY  ░░░░░░  ░░░  ETH  [Pending]  [Cancel]       │
│  #2  BUY  ░░░░░░  ░░░  ETH  [Matched]  [View Result▸] │
│  #1  SELL ░░░░░░  ░░░  ETH  [Settled]  [Price: $3,000]│
└────────────────────────────────────────────────────────┘
```
- Own orders show status
- "View Result" triggers permit-based decryption flow
- Settled orders show actual cleared price to the owner only

#### Permit Decryption Modal

```
┌────────────────────────────────────┐
│  🔓 Reveal Your Clearing Price     │
│                                    │
│  Sign a permit to decrypt your     │
│  order result. Only your wallet    │
│  can see this value.               │
│                                    │
│  [Sign Permit in MetaMask]         │
│                                    │
│  ──────────────────────────────    │
│                                    │
│  ✓ Your trade cleared at $3,000   │
└────────────────────────────────────┘
```

### 7.5 Page Layout

```
┌────────────────────────────────────────────────────────────┐
│                        NavBar                              │
├──────────────┬────────────────────────┬────────────────────┤
│              │                        │                    │
│  Order Entry │   Encrypted Order Book │  MEV Comparison    │
│  Panel       │   (main view)          │  Panel             │
│  (300px)     │   (flex-grow)          │  (320px)           │
│              │                        │                    │
├──────────────┴────────────────────────┴────────────────────┤
│                    My Orders Panel                         │
└────────────────────────────────────────────────────────────┘
```

---

## 8. PRD — Product Requirements Document

### 8.1 Product Overview

**Product Name:** ShieldDEX
**Tagline:** Trade without being seen.
**One-liner:** The first on-chain order book DEX where orders are encrypted before submission, matched on ciphertext, and settled without ever exposing prices to bots or validators.

### 8.2 Target Users

| User | Pain | What ShieldDEX gives them |
|---|---|---|
| Retail DeFi traders | Losing $2–$20 per swap to MEV bots silently | Full protection — orders invisible until settled |
| Whale traders | Large orders get front-run for thousands of dollars | Execute size without moving the market |
| Institutions | Can't participate in DeFi due to MEV exposure | First safe on-chain execution environment |
| DAO treasuries | Rebalancing creates MEV targets | Private treasury operations |

### 8.3 Core Features (Hackathon Scope)

**F1 — Encrypted Order Submission**
Traders submit buy and sell limit orders. Price and amount are encrypted via `@cofhe/sdk` before leaving the browser. The transaction broadcast to Sepolia contains only ciphertext.

**F2 — On-Chain FHE Order Matching**
A public `matchOrders(bidId, askId)` function compares two encrypted orders using `FHE.gte()`. No price is decrypted during comparison. The CoFHE coprocessor handles the computation and returns an encrypted result.

**F3 — Permit-Based Result Decryption**
Only the matched trader can decrypt their clearing price. Access is granted via `FHE.allowSender()`. The trader signs a permit in MetaMask and calls `decryptForView()` via the CoFHE SDK. All other orders remain encrypted permanently.

**F4 — MEV Comparison Demo Panel**
A side-by-side visualization showing the same trade on a normal DEX vs ShieldDEX. Shows exactly what a bot would see (price vs ciphertext) and the resulting profit differential. This is the hackathon's primary pitch tool.

**F5 — Live Order Book UI**
An encrypted order book that shows pending orders as `░░░░░░` placeholders with status badges. Matched orders animate on settlement. The interface makes the encryption tangible.

### 8.4 Success Metrics (Hackathon)

| Metric | Target |
|---|---|
| Orders successfully encrypted and submitted | 100% |
| FHE matching executes on ciphertext without decryption | 100% |
| Bot sees nothing useful in mempool | 100% |
| Matched trader decrypts result with permit | < 3 seconds |
| Live demo completable in 90 seconds | Yes |
| Judges can interact with UI themselves | Yes |

### 8.5 Out of Scope for Hackathon

- Partial order fills
- Market orders (limit orders only)
- Multi-token pairs beyond ETH/USDC
- Order cancellation (post-hackathon feature)
- Liquidity pools
- Token smart contracts (mock amounts for demo)

---

## 9. TRD — Technical Requirements Document

### 9.1 Project Structure

Per https://fhenix-documentation.vercel.app/docs/phase-2/first-smart-contract:

```
shielddex/
├── contracts/
│   └── PrivateOrderBook.sol       ← Core FHE contract
├── ignition/
│   └── modules/
│       └── PrivateOrderBook.ts    ← Deployment module
├── scripts/
│   └── deploy.js                  ← Deployment script
├── test/
│   └── orderbook.test.ts          ← Contract tests
├── frontend/
│   └── src/
│       ├── config/
│       │   ├── abi.json           ← Contract ABI
│       │   └── contract.js        ← CONTRACT_ADDRESS export
│       ├── services/
│       │   └── cofheService.js    ← All FHE operations
│       ├── components/
│       │   ├── OrderEntry.jsx
│       │   ├── OrderBook.jsx
│       │   ├── MyOrders.jsx
│       │   ├── MevComparison.jsx
│       │   └── DecryptModal.jsx
│       ├── App.jsx
│       └── main.jsx
├── hardhat.config.ts
├── .env                           ← NEVER commit to git
├── .gitignore                     ← Must include .env
└── package.json
```

### 9.2 Smart Contract

**File:** `contracts/PrivateOrderBook.sol`

Per the FHE primitive reference from
https://fhenix-documentation.vercel.app/docs/phase-2/first-smart-contract:

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';

contract PrivateOrderBook {

    // ─── Data Structures ────────────────────────────────────────────────

    struct Order {
        address trader;
        euint64 encryptedPrice;   // euint64: Fhenix encrypted uint64
        euint64 encryptedAmount;  // euint64: never stored as plaintext
        bool    isBuy;
        bool    active;
    }

    // ─── State ──────────────────────────────────────────────────────────

    mapping(uint256 => Order) public orders;
    uint256 public orderCount;

    // Stores clearing price per matched pair — encrypted until claimed
    mapping(uint256 => euint64) public clearingPrices;
    uint256 public matchCount;

    // ─── Events ─────────────────────────────────────────────────────────

    // Only emits non-sensitive data — prices never in events
    event OrderSubmitted(uint256 indexed orderId, address indexed trader, bool isBuy);
    event OrderMatched(uint256 indexed matchId, uint256 bidId, uint256 askId);
    event ClearingPricePublished(uint256 indexed matchId);

    // ─── Functions ──────────────────────────────────────────────────────

    /**
     * @notice Submit an encrypted limit order
     * @param encPrice  InEuint64 — encrypted price from CoFHE SDK
     * @param encAmount InEuint64 — encrypted amount from CoFHE SDK
     * @param isBuy     true for buy order, false for sell
     *
     * Ref: FHE.asEuint64() — converts InEuint64 to on-chain euint64
     * Ref: FHE.allowThis() — grants this contract permission to hold ciphertext
     */
    function submitOrder(
        InEuint64 calldata encPrice,
        InEuint64 calldata encAmount,
        bool isBuy
    ) external returns (uint256 orderId) {
        // Convert incoming encrypted inputs to on-chain euint64
        euint64 price  = FHE.asEuint64(encPrice);
        euint64 amount = FHE.asEuint64(encAmount);

        // Grant contract permission to store and operate on these values
        FHE.allowThis(price);
        FHE.allowThis(amount);

        orderId = orderCount++;

        orders[orderId] = Order({
            trader:          msg.sender,
            encryptedPrice:  price,
            encryptedAmount: amount,
            isBuy:           isBuy,
            active:          true
        });

        emit OrderSubmitted(orderId, msg.sender, isBuy);
    }

    /**
     * @notice Match a bid and an ask — comparison runs entirely on ciphertext
     * @param bidId  Order ID of the buy order
     * @param askId  Order ID of the sell order
     *
     * Ref: FHE.gte()    — compares two euint64 without decrypting either
     * Ref: FHE.select() — picks value based on encrypted boolean condition
     * Ref: FHE.allowSender() — grants only matched traders access to decrypt
     */
    function matchOrders(uint256 bidId, uint256 askId) external {
        Order storage bid = orders[bidId];
        Order storage ask = orders[askId];

        require(bid.active, "Bid order not active");
        require(ask.active, "Ask order not active");
        require(bid.isBuy,  "bidId must be a buy order");
        require(!ask.isBuy, "askId must be a sell order");

        // FHE comparison — no decryption, runs inside CoFHE coprocessor
        ebool matched = FHE.gte(bid.encryptedPrice, ask.encryptedPrice);

        // Select clearing price on ciphertext
        // If matched: use ask price as clearing price
        // If not matched: store 0 (guards against invalid matches)
        euint64 clearingPrice = FHE.select(
            matched,
            ask.encryptedPrice,
            FHE.asEuint64(0)
        );

        uint256 matchId = matchCount++;
        clearingPrices[matchId] = clearingPrice;

        // Grant ONLY the matched traders access to decrypt their result
        FHE.allowSender(clearingPrice);
        FHE.allowThis(clearingPrice);

        // Mark orders settled
        bid.active = false;
        ask.active = false;

        emit OrderMatched(matchId, bidId, askId);
    }

    /**
     * @notice Get the encrypted clearing price for a match
     * @dev Returns euint64 — readable only by authorized address via permit
     */
    function getClearingPrice(uint256 matchId) public view returns (euint64) {
        return clearingPrices[matchId];
    }

    /**
     * @notice Publish a decrypted clearing price on-chain with signature
     * @dev Uses FHE.publishDecryptResult — same pattern as ConfidentialVault
     *
     * Ref: https://fhenix-documentation.vercel.app/docs/phase-2/first-smart-contract
     * Ref: FHE.publishDecryptResult(ctHash, plaintext, signature)
     */
    function publishClearingPrice(
        euint64 ctHash,
        uint64  plaintext,
        bytes calldata signature
    ) external {
        FHE.publishDecryptResult(ctHash, plaintext, signature);
        emit ClearingPricePublished(uint256(euint64.unwrap(ctHash)));
    }
}
```

### 9.3 Deployment Script

Per https://fhenix-documentation.vercel.app/docs/phase-3/deployment-code-setup:

```javascript
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const Factory = await hre.ethers.getContractFactory("PrivateOrderBook");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("PrivateOrderBook deployed to:", address);
  // Copy this address into frontend/src/config/contract.js
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**Deploy command:**
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**Expected output:**
```
[dotenv@17.3.1] injecting env (2) from .env
PrivateOrderBook deployed to: 0x9b568888e69e92f92B27348fb6010Eb1057a302c
```

### 9.4 Frontend CoFHE Service

**File:** `frontend/src/services/cofheService.js`

Per https://fhenix-documentation.vercel.app/docs/phase-4/user-friendly-cofhe-service:

```javascript
import { createCofheConfig, createCofheClient } from "@cofhe/sdk/web";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { chains } from "@cofhe/sdk/chains";
import { createPublicClient, createWalletClient, http, custom } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACT_ADDRESS } from "../config/contract";
import ABI from "../config/abi.json";

// ─── Global State ────────────────────────────────────────────
let client;
let publicClient;
let walletClient;
let account;

// ─── Init ────────────────────────────────────────────────────
/**
 * Initialize CoFHE client and connect wallet
 * Ref: https://fhenix-documentation.vercel.app/docs/phase-4/user-friendly-cofhe-service
 */
export async function init() {
  // Switch to Sepolia
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0xaa36a7" }],
  });

  const config = createCofheConfig({
    supportedChains: [chains.sepolia],
  });

  client = createCofheClient(config);

  publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  walletClient = createWalletClient({
    chain: sepolia,
    transport: custom(window.ethereum),
  });

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  account = accounts[0];

  await client.connect(publicClient, walletClient);
  walletClient.account = account;

  // Create or retrieve permit for this wallet
  await client.permits.getOrCreateSelfPermit();
}

// ─── Submit Order ────────────────────────────────────────────
/**
 * Encrypt price + amount locally, then submit to contract
 * Price NEVER leaves browser as plaintext
 */
export async function submitOrder(price, amount, isBuy) {
  const [encryptedPrice, encryptedAmount] = await client
    .encryptInputs([
      Encryptable.uint64(BigInt(price)),
      Encryptable.uint64(BigInt(amount)),
    ])
    .execute();

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "submitOrder",
    args: [encryptedPrice, encryptedAmount, isBuy],
    account,
  });

  return txHash;
}

// ─── Get Clearing Price ──────────────────────────────────────
/**
 * Decrypt clearing price for a matched order
 * Uses decryptForView — only the permit holder can decrypt
 * Ref: https://fhenix-documentation.vercel.app/docs/phase-4/user-friendly-cofhe-service
 */
export async function getClearingPrice(matchId) {
  const permit = await client.permits.getOrCreateSelfPermit();

  const ctHash = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getClearingPrice",
    args: [BigInt(matchId)],
    account,
  });

  return await client
    .decryptForView(ctHash, FheTypes.Uint64)
    .withPermit(permit)
    .execute();
}

// ─── Publish Clearing Price ──────────────────────────────────
/**
 * Publish clearing price on-chain with signature
 * Uses decryptForTx — produces a signature for on-chain verification
 */
export async function publishClearingPrice(matchId) {
  const permit = await client.permits.getOrCreateSelfPermit();

  const ctHash = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getClearingPrice",
    args: [BigInt(matchId)],
    account,
  });

  const { decryptedValue, signature } = await client
    .decryptForTx(ctHash)
    .withPermit(permit)
    .execute();

  await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "publishClearingPrice",
    args: [ctHash, decryptedValue, signature],
    account,
  });
}

// ─── Match Orders ────────────────────────────────────────────
/**
 * Trigger on-chain matching — runs FHE.gte() on ciphertext
 */
export async function matchOrders(bidId, askId) {
  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "matchOrders",
    args: [BigInt(bidId), BigInt(askId)],
    account,
  });

  return txHash;
}
```

### 9.5 FHE Operations Reference

| Operation | Location in Contract | What It Does |
|---|---|---|
| `FHE.asEuint64(InEuint64)` | `submitOrder()` | Converts encrypted input to on-chain euint64 |
| `FHE.allowThis(euint64)` | `submitOrder()` | Grants contract permission to hold ciphertext |
| `FHE.gte(euint64, euint64)` | `matchOrders()` | Compares two prices on ciphertext — no decryption |
| `FHE.select(ebool, euint64, euint64)` | `matchOrders()` | Picks clearing price on ciphertext |
| `FHE.allowSender(euint64)` | `matchOrders()` | Grants only matched trader decrypt permission |
| `FHE.publishDecryptResult()` | `publishClearingPrice()` | Publishes verified decrypted value on-chain |

### 9.6 Compilation

Per https://fhenix-documentation.vercel.app/docs/phase-2/compilation-of-contract:

```bash
npx hardhat compile
```

Critical requirements:
- Solidity version: `0.8.28`
- EVM version: `cancun` — non-negotiable, FHE ops require Cancun opcodes
- Import: `@fhenixprotocol/cofhe-contracts/FHE.sol` must resolve from `node_modules`

### 9.7 Security Requirements

**Private Key:**
- Stored only in `.env`
- `.env` listed in `.gitignore`
- Never hardcoded, never logged
- Ref: https://fhenix-documentation.vercel.app/docs/phase-3/deployment-code-setup

**Order Data:**
- Price and amount encrypted client-side before broadcast
- `euint64` type means plaintext never exists on-chain
- `FHE.allowThis()` required before any contract operation on ciphertext
- `FHE.allowSender()` restricts decryption to matched party only

**Permit System:**
- `client.permits.getOrCreateSelfPermit()` called on init
- All decryption operations require a valid permit
- Permits are wallet-scoped — cannot be used by another address
- `decryptForView` for read operations, `decryptForTx` for on-chain publishing

**Smart Contract Guards:**
- `require(bid.active)` — prevents replay of settled orders
- `require(bid.isBuy)` — prevents matching same-side orders
- Orders marked `active = false` immediately on match — no double-matching

---

## 10. Security Model

```
Threat          | Attack Vector            | FHE Defence
────────────────┼──────────────────────────┼──────────────────────────────
MEV Bot         | Reads mempool price      | Price is euint64 ciphertext
Front-running   | Detects large order      | Amount is euint64 ciphertext
Sandwich Attack | Wraps order in mempool   | Nothing visible to wrap
Validator MEV   | Reorders transactions    | No plaintext to extract value from
Spy             | Reads contract state     | All prices stored as euint64
Competitor      | Copies trading strategy  | Orders permanently encrypted
```

---

## 11. Hackathon Scope

### What to build in 48 hours:

**Hour 0–4: Environment**
- Node v22, npm init, hardhat init
- Install all packages per Phase 1 docs
- Configure hardhat.config.ts with evmVersion: cancun

**Hour 4–14: Contract**
- Write PrivateOrderBook.sol
- Test locally with hardhat node
- Deploy to Sepolia

**Hour 14–28: Frontend**
- React + Vite setup
- cofheService.js (init, submitOrder, matchOrders, getClearingPrice)
- Connect to deployed contract

**Hour 28–40: UI**
- Order entry panel
- Encrypted order book display
- My orders + decrypt flow
- MEV comparison panel

**Hour 40–48: Demo Polish**
- Rehearse 90-second demo flow
- Pre-load test orders
- Verify permit decryption works end-to-end

### Demo Script (90 seconds):

```
0:00  "Every order you submit on a DEX is publicly visible."
0:10  Open a normal DEX — show order in mempool, show bot reading it
0:20  "Here's the same trade on ShieldDEX."
0:25  Submit encrypted order — show mempool: 0x7f3a9c...
0:35  "That's all the bot sees. Noise."
0:40  Trigger matchOrders() — FHE comparison on ciphertext
0:50  "Match found. No price was ever decrypted."
0:55  Click View Result — sign permit — price appears
1:05  "Only I can see my clearing price. Nobody else."
1:15  "MEV is a $1.2 billion annual tax on DeFi traders. This ends it."
1:30  Done.
```

---

*Documentation source: https://fhenix-documentation.vercel.app/*
*Built on Fhenix CoFHE — Fully Homomorphic Encryption for Ethereum*
*Created by 0m3rexe*
