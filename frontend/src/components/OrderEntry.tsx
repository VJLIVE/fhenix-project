import React, { useState } from "react";
import { submitOrder } from "../services/cofheService";

export default function OrderEntry({ account }: { account: string | null }) {
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [isBuy, setIsBuy] = useState(true);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setTxHash(null);

    if (!account) return setError("Please connect your wallet first.");
    if (!price || !amount) return setError("Price and amount are required.");

    try {
      setLoading(true);
      const hash = await submitOrder(price, amount, isBuy);
      setTxHash(hash);
      setSuccess(`Successfully submitted ${isBuy ? "bid" : "ask"} order.`);
      setPrice("");
      setAmount("");
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("User denied") || err.message?.includes("User rejected")) {
        setError("Transaction was rejected in your wallet.");
      } else {
        setError(err.message || "Transaction failed or was rejected.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="code-card p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-rule-dark pb-4">
        <h2 className="text-sm font-mono tracking-wider text-ink-muted uppercase">New Order</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
          <span className="status--ok">FHE ENCLAVE</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex bg-[#111] p-1 rounded-[6px] border border-rule-dark w-full text-sm font-medium">
          <button
            type="button"
            onClick={() => setIsBuy(true)}
            className={`flex-1 py-1.5 rounded-[4px] transition-colors ${
              isBuy ? "bg-rule-dark text-white" : "text-ink-muted hover:text-white"
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setIsBuy(false)}
            className={`flex-1 py-1.5 rounded-[4px] transition-colors ${
              !isBuy ? "bg-rule-dark text-white" : "text-ink-muted hover:text-white"
            }`}
          >
            Sell
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-ink-muted uppercase tracking-wider">Price (USDC)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-transparent border-b border-rule-dark px-0 py-2 focus:outline-none focus:border-accent font-mono text-lg transition-colors placeholder:text-rule-dark"
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-ink-muted uppercase tracking-wider">Amount (WETH)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent border-b border-rule-dark px-0 py-2 focus:outline-none focus:border-accent font-mono text-lg transition-colors placeholder:text-rule-dark"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !account}
          className="btn--primary w-full py-2.5 mt-2 font-medium disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">●</span>
              <span>Encrypting...</span>
            </>
          ) : (
            `Submit ${isBuy ? "Bid" : "Ask"} (FHE)`
          )}
        </button>
      </form>

      {error && (
        <div className="text-sm text-red-500 font-mono mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-[6px]">
          ⚠ {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-accent font-mono mt-2 p-3 bg-accent/10 border border-accent/20 rounded-[6px]">
          ✓ {success}
        </div>
      )}

      {txHash && (
        <div className="text-xs font-mono text-ink-muted mt-2 border-t border-rule-dark pt-4">
          <span className="tok-key">tx_hash:</span> {txHash.slice(0, 10)}...{txHash.slice(-8)}
        </div>
      )}
    </div>
  );
}
