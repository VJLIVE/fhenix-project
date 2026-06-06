import { Terminal } from "lucide-react";
import Link from "next/link";

interface NavProps {
  account?: string | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export default function Nav({ account, onConnect, onDisconnect }: NavProps) {
  return (
    <nav className="nav w-full h-16 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50 bg-paper/80">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Terminal size={18} className="text-accent" />
          <span className="font-semibold text-display tracking-tight">ShieldDEX</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-ink-muted">
          <Link href="/dex" className="hover:text-ink transition-colors">DEX</Link>
          <span className="text-rule">|</span>
          <span className="font-mono text-[11px] text-ink-muted tracking-wider">ETH / USDC</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Network indicator */}
        {account && (
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-ink-muted">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Hardhat Local</span>
          </div>
        )}

        {account ? (
          <div className="flex items-center gap-3">
            <div className="text-sm font-mono bg-rule px-3 py-1.5 rounded-[6px] border border-rule-dark text-ink-muted flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              {account.slice(0, 6)}...{account.slice(-4)}
            </div>
            {onDisconnect && (
              <button
                onClick={onDisconnect}
                className="text-xs font-mono text-ink-muted hover:text-ink transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        ) : onConnect ? (
          <button
            onClick={onConnect}
            className="btn--primary px-4 py-1.5 text-sm font-medium"
          >
            Connect Wallet
          </button>
        ) : null}
      </div>
    </nav>
  );
}
