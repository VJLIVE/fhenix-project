"use client";

import { useState } from "react";
import { initCofhe } from "@/services/cofheService";
import Nav from "@/components/Nav";
import OrderEntry from "@/components/OrderEntry";
import OrderBook from "@/components/OrderBook";
import MyOrders from "@/components/MyOrders";
import MatchPanel from "@/components/MatchPanel";
import MevComparison from "@/components/MevComparison";
import TokenFaucet from "@/components/TokenFaucet";
import DecryptModal from "@/components/DecryptModal";

export default function DexPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Decrypt modal state
  const [decryptMatchId, setDecryptMatchId] = useState<number | null>(null);

  const connectWallet = async () => {
    try {
      setConnecting(true);
      setError(null);
      const res = await initCofhe();
      setAccount(res.account);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <Nav account={account} onConnect={connectWallet} onDisconnect={disconnectWallet} />

      <main className="flex-1 flex flex-col lg:flex-row gap-8 p-6 lg:p-12 max-w-[1600px] mx-auto w-full">

        {/* Left Column: Order Entry + Faucet + MEV Comparison */}
        <div className="flex flex-col gap-6 lg:w-[380px] shrink-0">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-display tracking-tight">ShieldDEX</h1>
            <p className="text-ink-muted leading-relaxed text-sm">
              Fully Homomorphic Encryption orderbook.
              Orders are matched entirely on ciphertext. No MEV, no front-running.
            </p>
          </div>

          {/* Wallet connection prompt */}
          {!account && (
            <div className="border border-accent/20 bg-accent/5 rounded-[10px] p-6 flex flex-col items-center gap-4 text-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Connect your wallet</span>
                <span className="text-xs text-ink-muted">MetaMask required. You&apos;ll be switched to Hardhat Local.</span>
              </div>
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="btn--primary px-6 py-2.5 font-medium text-sm w-full disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connecting ? (
                  <>
                    <span className="animate-spin">●</span>
                    Connecting...
                  </>
                ) : (
                  "Connect Wallet"
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 font-mono p-4 bg-red-500/10 border border-red-500/20 rounded-[6px]">
              ⚠ {error}
            </div>
          )}

          {account && <TokenFaucet account={account} />}
          <OrderEntry account={account} />
          <MevComparison />
        </div>

        {/* Right Column: Order Book + Match Panel + My Orders */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <OrderBook />
          {account && <MatchPanel account={account} />}
          <MyOrders account={account} onDecryptRequest={(id) => setDecryptMatchId(id)} />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-rule py-8 px-6 lg:px-12 flex items-center justify-between text-xs font-mono text-ink-muted">
        <span>© 2026 ShieldDEX Protocol</span>
        <div className="flex gap-4">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">GitHub</a>
          <a href="https://fhenix-documentation.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">Fhenix</a>
        </div>
      </footer>

      {/* Decrypt Modal */}
      {decryptMatchId !== null && (
        <DecryptModal
          matchId={decryptMatchId}
          onClose={() => setDecryptMatchId(null)}
        />
      )}
    </div>
  );
}
