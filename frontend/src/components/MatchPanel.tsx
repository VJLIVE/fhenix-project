import React, { useState } from "react";
import { matchOrders, getAllOrders, Order } from "../services/cofheService";

interface MatchPanelProps {
  account: string | null;
}

export default function MatchPanel({ account }: MatchPanelProps) {
  const [bidId, setBidId] = useState("");
  const [askId, setAskId] = useState("");
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleMatch = async () => {
    if (!bidId || !askId) {
      setError("Enter both a Bid ID and an Ask ID.");
      return;
    }

    try {
      setMatching(true);
      setError(null);
      setSuccess(null);
      await matchOrders(bidId, askId);
      setSuccess(`Match #${bidId} × #${askId} submitted and confirmed.`);
      setBidId("");
      setAskId("");
    } catch (err: any) {
      if (err.message?.includes("User denied") || err.message?.includes("User rejected")) {
        setError("Transaction rejected in wallet.");
      } else {
        setError(err.message || "Match failed.");
      }
    } finally {
      setMatching(false);
    }
  };

  if (!account) return null;

  return (
    <div className="border border-rule rounded-[10px] overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-rule bg-[#fafafa] flex items-center justify-between">
        <span className="text-xs font-mono font-semibold tracking-wider text-ink">MATCH ENGINE</span>
        <span className="text-[10px] font-mono text-ink-muted">FHE Comparison</span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <p className="text-xs text-ink-muted leading-relaxed">
          Trigger an on-chain match between a buy and sell order. The comparison runs entirely on ciphertext via <span className="font-mono text-accent">FHE.gte()</span> — no price is ever decrypted.
        </p>

        <div className="flex gap-3 items-end">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[10px] font-mono text-ink-muted uppercase tracking-wider">Bid ID</label>
            <input
              type="number"
              value={bidId}
              onChange={(e) => setBidId(e.target.value)}
              placeholder="0"
              className="w-full p-2 bg-white border border-rule rounded-[6px] text-sm font-mono text-ink focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <span className="text-ink-muted text-lg pb-2">×</span>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[10px] font-mono text-ink-muted uppercase tracking-wider">Ask ID</label>
            <input
              type="number"
              value={askId}
              onChange={(e) => setAskId(e.target.value)}
              placeholder="1"
              className="w-full p-2 bg-white border border-rule rounded-[6px] text-sm font-mono text-ink focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        <button
          onClick={handleMatch}
          disabled={matching || !bidId || !askId}
          className="btn--primary w-full py-2.5 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {matching ? (
            <>
              <span className="animate-spin">●</span>
              <span>Matching on ciphertext...</span>
            </>
          ) : (
            "Trigger FHE Match"
          )}
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-4 text-xs text-red-500 font-mono p-2 bg-red-500/10 border border-red-500/20 rounded-[4px]">
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="mx-4 mb-4 text-xs text-accent font-mono p-2 bg-accent/10 border border-accent/20 rounded-[4px]">
          ✓ {success}
        </div>
      )}
    </div>
  );
}
