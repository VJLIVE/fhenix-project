import React, { useState } from "react";
import { getClearingPrice, publishClearingPrice } from "../services/cofheService";

interface DecryptModalProps {
  matchId: number;
  onClose: () => void;
}

type Step = "idle" | "decrypting" | "decrypted" | "publishing" | "published" | "error";

export default function DecryptModal({ matchId, onClose }: DecryptModalProps) {
  const [step, setStep] = useState<Step>("idle");
  const [clearingPrice, setClearingPrice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDecrypt = async () => {
    try {
      setStep("decrypting");
      setError(null);
      const price = await getClearingPrice(matchId.toString());
      setClearingPrice(price.toString());
      setStep("decrypted");
    } catch (err: any) {
      setError(err.message || "Decryption failed.");
      setStep("error");
    }
  };

  const handlePublish = async () => {
    try {
      setStep("publishing");
      setError(null);
      await publishClearingPrice(matchId.toString());
      setStep("published");
    } catch (err: any) {
      setError(err.message || "Publish failed.");
      setStep("error");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content w-full max-w-[420px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-rule">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <h3 className="text-sm font-mono font-semibold tracking-wider text-ink uppercase">
              Decrypt Match #{matchId}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="py-6 flex flex-col gap-5">
          {/* Explanation */}
          <p className="text-sm text-ink-muted leading-relaxed">
            Sign a permit to decrypt your clearing price. Only your wallet can
            see this value — all other traders receive nothing.
          </p>

          {/* Step: Idle — prompt to decrypt */}
          {step === "idle" && (
            <button
              onClick={handleDecrypt}
              className="btn--primary w-full py-3 font-medium flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </svg>
              Sign Permit in Wallet
            </button>
          )}

          {/* Step: Decrypting */}
          {step === "decrypting" && (
            <div className="flex items-center justify-center gap-3 py-4 text-sm font-mono text-ink-muted">
              <span className="animate-spin">●</span>
              <span>Decrypting via CoFHE...</span>
            </div>
          )}

          {/* Step: Decrypted — show price */}
          {step === "decrypted" && clearingPrice && (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-[8px] flex flex-col gap-2">
                <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider">
                  Your Clearing Price
                </span>
                <span className="text-2xl font-mono font-semibold text-accent">
                  {clearingPrice} <span className="text-sm text-ink-muted">USDC</span>
                </span>
              </div>

              <button
                onClick={handlePublish}
                className="w-full py-2.5 border border-rule rounded-[6px] text-sm font-medium hover:bg-rule/50 transition-colors flex items-center justify-center gap-2"
              >
                Publish On-Chain
              </button>
            </div>
          )}

          {/* Step: Publishing */}
          {step === "publishing" && (
            <div className="flex items-center justify-center gap-3 py-4 text-sm font-mono text-ink-muted">
              <span className="animate-spin">●</span>
              <span>Publishing to chain...</span>
            </div>
          )}

          {/* Step: Published */}
          {step === "published" && (
            <div className="p-4 bg-accent/5 border border-accent/20 rounded-[8px] flex flex-col gap-2">
              <span className="text-sm font-mono text-accent">
                ✓ Clearing price published on-chain.
              </span>
              <span className="text-xs font-mono text-ink-muted">
                Price: {clearingPrice} USDC — now visible to all.
              </span>
            </div>
          )}

          {/* Error */}
          {step === "error" && error && (
            <div className="flex flex-col gap-3">
              <div className="text-sm text-red-500 font-mono p-3 bg-red-500/10 border border-red-500/20 rounded-[6px]">
                ⚠ {error}
              </div>
              <button
                onClick={() => setStep("idle")}
                className="text-sm font-mono text-accent hover:text-accent/80 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-rule flex justify-end">
          <button
            onClick={onClose}
            className="text-sm font-mono text-ink-muted hover:text-ink transition-colors px-4 py-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
