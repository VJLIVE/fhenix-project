import { createCofheConfig, createCofheClient } from "@cofhe/sdk/web";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { chains } from "@cofhe/sdk/chains";
import { createPublicClient, createWalletClient, http, custom } from "viem";
import { hardhat } from "viem/chains";
import { CONTRACT_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from "../config/contract";
import ABI_JSON from "../config/abi.json";
import FHERC20_ABI_JSON from "../config/fherc20_abi.json";

const ABI = ABI_JSON.abi;
const FHERC20_ABI = FHERC20_ABI_JSON.abi;

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Global State
let client: any;
let publicClient: any;
let walletClient: any;
let account: any;

export function getAccount(): string | null {
  return account || null;
}

export function isInitialized(): boolean {
  return !!client && !!publicClient && !!walletClient && !!account;
}

export async function initCofhe() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No ethereum provider found. Please install MetaMask.");
  }

  // Switch to Hardhat local network
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x7a69" }], // Hardhat network ID (31337)
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x7a69",
            chainName: "Hardhat Local",
            rpcUrls: ["http://127.0.0.1:8545"],
            nativeCurrency: {
              name: "ETH",
              symbol: "ETH",
              decimals: 18,
            },
          },
        ],
      });
    } else {
      throw new Error("Failed to switch network. Please switch to Hardhat Local manually.");
    }
  }

  const config = createCofheConfig({
    supportedChains: [chains.hardhat],
  });

  client = createCofheClient(config);

  publicClient = createPublicClient({
    chain: hardhat,
    transport: http(),
  });

  walletClient = createWalletClient({
    chain: hardhat,
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

  return { account };
}

// ─── Token Operations ────────────────────────────────────────

/**
 * Mint test tokens to the connected wallet (uses MockFHERC20.mint)
 */
export async function mintTokens(token: "WETH" | "USDC", amount: number) {
  if (!walletClient || !publicClient) throw new Error("CoFHE not initialized");

  const tokenAddress = token === "WETH" ? WETH_ADDRESS : USDC_ADDRESS;

  const txHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: FHERC20_ABI,
    functionName: "mint",
    args: [account, BigInt(amount)],
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/**
 * Get the encrypted balance handle for a token (returns the ct hash, not plaintext)
 */
export async function getEncryptedBalance(token: "WETH" | "USDC"): Promise<string> {
  if (!publicClient) throw new Error("CoFHE not initialized");

  const tokenAddress = token === "WETH" ? WETH_ADDRESS : USDC_ADDRESS;

  try {
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: FHERC20_ABI,
      functionName: "balanceOf",
      args: [account],
    });

    // balance is a euint64 handle (bigint). If 0, no balance set.
    if (balance === 0n) return "0";
    return "0xEnc..." + balance.toString(16).slice(-6);
  } catch {
    return "—";
  }
}

// ─── Order Operations ────────────────────────────────────────

export async function submitOrder(price: string, amount: string, isBuy: boolean) {
  if (!client) throw new Error("CoFHE not initialized");

  const priceBigInt = BigInt(price);
  const amountBigInt = BigInt(amount);

  if (priceBigInt <= 0n) throw new Error("Price must be greater than 0");
  if (amountBigInt <= 0n) throw new Error("Amount must be greater than 0");

  // 1. Token Approval
  const tokenToApprove = isBuy ? USDC_ADDRESS : WETH_ADDRESS;
  const approvalAmount = isBuy ? priceBigInt * amountBigInt : amountBigInt;

  const [encryptedApproval] = await client
    .encryptInputs([Encryptable.uint64(approvalAmount)])
    .execute();

  const approveTx = await walletClient.writeContract({
    address: tokenToApprove,
    abi: FHERC20_ABI,
    functionName: "approve",
    args: [CONTRACT_ADDRESS, encryptedApproval],
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  // 2. Submit Order
  const [encryptedPrice, encryptedAmount] = await client
    .encryptInputs([
      Encryptable.uint64(priceBigInt),
      Encryptable.uint64(amountBigInt),
    ])
    .execute();

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "submitOrder",
    args: [encryptedPrice, encryptedAmount, isBuy],
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function cancelOrder(orderId: string) {
  if (!walletClient) throw new Error("CoFHE not initialized");

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "cancelOrder",
    args: [BigInt(orderId)],
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function matchOrders(bidId: string, askId: string) {
  if (!walletClient) throw new Error("CoFHE not initialized");

  // Pre-flight validation
  const bidOrder = await getOrderById(Number(bidId));
  const askOrder = await getOrderById(Number(askId));

  if (!bidOrder) throw new Error(`Bid order #${bidId} does not exist`);
  if (!askOrder) throw new Error(`Ask order #${askId} does not exist`);
  if (!bidOrder.isBuy) throw new Error(`Order #${bidId} is not a buy order`);
  if (askOrder.isBuy) throw new Error(`Order #${askId} is not a sell order`);

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "matchOrders",
    args: [BigInt(bidId), BigInt(askId)],
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

// ─── Decryption Operations ────────────────────────────────────

export async function getClearingPrice(matchId: string) {
  if (!client) throw new Error("CoFHE not initialized");

  const permit = await client.permits.getOrCreateSelfPermit();

  const ctHash = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getClearingPrice",
    args: [BigInt(matchId)],
    account,
  });

  if (ctHash === 0n) {
    throw new Error("No clearing price found for this match. The match may not have succeeded.");
  }

  try {
    return await client
      .decryptForView(ctHash, FheTypes.Uint64)
      .withPermit(permit)
      .execute();
  } catch (err: any) {
    if (err.message?.includes("NotAllowed")) {
      throw new Error("Permission denied. Only matched traders can decrypt clearing prices.");
    }
    throw err;
  }
}

export async function publishClearingPrice(matchId: string) {
  if (!client) throw new Error("CoFHE not initialized");

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

  const txHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "publishClearingPrice",
    args: [ctHash, decryptedValue, signature],
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

// ─── Query Operations ────────────────────────────────────────

export interface Order {
  id: number;
  trader: string;
  traderFull: string;
  encryptedPrice: string;
  encryptedAmount: string;
  isBuy: boolean;
  active: string;
}

async function getOrderById(id: number): Promise<Order | null> {
  if (!publicClient) return null;

  try {
    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "orderCount",
    });

    if (BigInt(id) >= count) return null;

    const order: any = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "orders",
      args: [BigInt(id)],
    });

    return {
      id,
      trader: order[0].slice(0, 6) + "..." + order[0].slice(-4),
      traderFull: order[0],
      encryptedPrice: "0x" + order[1].toString(16).slice(-8),
      encryptedAmount: "0x" + order[2].toString(16).slice(-8),
      isBuy: order[3],
      active: "0x" + order[4].toString(16).slice(-8),
    };
  } catch {
    return null;
  }
}

export async function getAllOrders(): Promise<Order[]> {
  if (!publicClient) return [];

  try {
    const countBigInt = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "orderCount",
    });

    const count = Number(countBigInt);
    const orders: Order[] = [];

    for (let i = 0; i < count; i++) {
      const order: any = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "orders",
        args: [BigInt(i)],
      });

      orders.push({
        id: i,
        trader: order[0].slice(0, 6) + "..." + order[0].slice(-4),
        traderFull: order[0],
        encryptedPrice: "0x" + order[1].toString(16).slice(-8),
        encryptedAmount: "0x" + order[2].toString(16).slice(-8),
        isBuy: order[3],
        active: "0x" + order[4].toString(16).slice(-8),
      });
    }

    return orders;
  } catch (err) {
    console.error("Failed to fetch orders", err);
    return [];
  }
}

export async function getMatchCount(): Promise<number> {
  if (!publicClient) return 0;

  try {
    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "matchCount",
    });
    return Number(count);
  } catch {
    return 0;
  }
}
