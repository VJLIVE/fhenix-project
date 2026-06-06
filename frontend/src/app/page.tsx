import Link from "next/link";
import Nav from "@/components/Nav";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Nav />

      <main className="flex-1 flex flex-col w-full">
        {/* HERO SECTION */}
        <section className="px-6 lg:px-12 py-24 lg:py-32 w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-16 lg:gap-24 items-center">

          <div className="flex-1 flex flex-col gap-6 reveal is-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              <span className="text-xs font-mono tracking-wider text-ink uppercase">Fhenix Network</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-semibold text-display tracking-tight leading-[1.1]">
              Match orders on ciphertext.
            </h1>
            <p className="text-lg lg:text-xl text-ink-muted max-w-[480px] leading-relaxed">
              ShieldDEX is a sovereign orderbook built on Fully Homomorphic Encryption. Secure your trades with mathematical pre-trade privacy and absolute zero MEV.
            </p>
            <div className="pt-4">
              <Link href="/dex" className="btn--primary px-6 py-3 font-medium inline-flex items-center gap-2">
                Launch DEX
              </Link>
            </div>
          </div>

          <div className="flex-1 w-full max-w-[540px] reveal is-in" style={{ transitionDelay: '100ms' }}>
            <div className="code-card w-full text-sm">
              <div className="px-4 py-3 border-b border-rule-dark flex items-center justify-between">
                <div className="text-xs font-mono text-rule">match_payload.json</div>
              </div>
              <div className="p-4 lg:p-6 font-mono leading-relaxed whitespace-pre overflow-x-auto text-[#ccc]">
                <div><span className="tok-key">&quot;id&quot;</span>: <span className="text-accent">&quot;0x1&quot;</span>,</div>
                <div><span className="tok-key">&quot;status&quot;</span>: <span className="text-accent">&quot;ENCRYPTED_MEMPOOL&quot;</span>,</div>
                <div><span className="tok-key">&quot;order_type&quot;</span>: <span className="text-accent">&quot;LIMIT_BUY&quot;</span>,</div>
                <div><span className="tok-key">&quot;payload&quot;</span>: {"{"}</div>
                <div>  <span className="tok-key">&quot;price&quot;</span>: <span className="text-white bg-rule-dark/50 px-1 py-0.5 rounded">euint64(0x38b2...a9f1)</span>,</div>
                <div>  <span className="tok-key">&quot;amount&quot;</span>: <span className="text-white bg-rule-dark/50 px-1 py-0.5 rounded">euint64(0x71c4...e3b8)</span></div>
                <div>{"}"}</div>
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                  <span className="text-accent">AWAITING FHE EVALUATION</span>
                </div>
              </div>
            </div>
          </div>

        </section>

        {/* DARK BAND SECTION */}
        <section className="w-full bg-graphite border-y border-rule-dark py-24 text-white">
          <div className="px-6 lg:px-12 w-full max-w-[1400px] mx-auto flex flex-col gap-16 reveal is-in">

            <div className="max-w-[600px] flex flex-col gap-4">
              <h2 className="text-3xl font-semibold text-display">Why FHE matters for liquidity.</h2>
              <p className="text-[#888] leading-relaxed">
                Public AMMs expose your slippage tolerance to the mempool, leading to billions lost to sandwich attacks.
                ShieldDEX encrypts your limit orders at the client side, and processes the matching algorithm directly on the encrypted states.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">

              <div className="flex flex-col gap-3 pt-6 border-t border-rule-dark">
                <h3 className="font-mono text-sm tracking-wider text-accent uppercase">1. Zero Front-running</h3>
                <p className="text-[#ccc] text-sm leading-relaxed">
                  Searchers cannot read your trade size or limit price. If they don&apos;t know the parameters, they cannot calculate a profitable sandwich attack.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-6 border-t border-rule-dark">
                <h3 className="font-mono text-sm tracking-wider text-accent uppercase">2. Mathematical Enforcement</h3>
                <p className="text-[#ccc] text-sm leading-relaxed">
                  Instead of relying on trusted off-chain sequencers or flashbots, privacy is enforced mathematically on the Fhenix Layer 2. The contract never sees the plaintext.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-6 border-t border-rule-dark">
                <h3 className="font-mono text-sm tracking-wider text-accent uppercase">3. Permissionless Matching</h3>
                <p className="text-[#ccc] text-sm leading-relaxed">
                  Anyone can trigger a match between two orders. The FHE comparison runs on ciphertext — even the matcher cannot extract any price information from the operation.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-6 border-t border-rule-dark">
                <h3 className="font-mono text-sm tracking-wider text-accent uppercase">4. Selective Disclosure</h3>
                <p className="text-[#ccc] text-sm leading-relaxed">
                  Only matched traders can decrypt their clearing price via a permit. Unmatched orders remain encrypted permanently. No validator, indexer, or third party ever sees your strategy.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="px-6 lg:px-12 py-24 w-full max-w-[800px] mx-auto text-center flex flex-col items-center gap-8 reveal is-in">
          <h2 className="text-3xl lg:text-4xl font-semibold text-display tracking-tight">
            Stop bleeding value to searchers.
          </h2>
          <Link href="/dex" className="btn--primary px-8 py-3.5 font-medium text-lg">
            Enter the DEX
          </Link>
        </section>

      </main>

      <footer className="w-full border-t border-rule py-8 px-6 lg:px-12 flex items-center justify-between text-xs font-mono text-ink-muted">
        <span>© 2026 ShieldDEX Protocol</span>
        <div className="flex gap-4">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">GitHub</a>
          <a href="https://fhenix-documentation.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">Fhenix</a>
        </div>
      </footer>

    </div>
  );
}
