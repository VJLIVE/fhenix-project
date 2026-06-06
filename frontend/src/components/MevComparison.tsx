export default function MevComparison() {
  return (
    <div className="flex flex-col gap-4 border border-rule rounded-[10px] overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-rule bg-[#fafafa]">
        <span className="text-xs font-mono font-semibold tracking-wider text-ink">THE FHE DIFFERENCE</span>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-3 text-sm">
        {/* Standard DEX */}
        <div className="flex flex-col gap-2 p-3 rounded-[6px] border border-red-500/20 bg-red-500/5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">Standard DEX</span>
            <span className="text-red-500 font-mono text-[10px] tracking-wider font-semibold">EXPOSED</span>
          </div>
          <div className="font-mono text-xs text-ink-muted flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Bot sees:</span>
              <span className="text-ink">BUY 1 ETH @ $3,000</span>
            </div>
            <div className="flex justify-between">
              <span>Result:</span>
              <span className="text-red-500">Sandwiched → paid $3,001</span>
            </div>
          </div>
        </div>

        {/* ShieldDEX */}
        <div className="flex flex-col gap-2 p-3 rounded-[6px] border border-accent/20 bg-graphite text-white">
          <div className="flex items-center justify-between">
            <span className="font-medium">ShieldDEX</span>
            <span className="text-accent font-mono text-[10px] tracking-wider font-semibold">PROTECTED</span>
          </div>
          <div className="font-mono text-xs text-[#888] flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-[#aaa]">Bot sees:</span>
              <span className="encrypted-value text-accent/80">0x8f2a...c4b1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#aaa]">Result:</span>
              <span className="text-accent">Matched cleanly @ $3,000</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="flex justify-between items-center pt-2 border-t border-rule text-xs font-mono">
          <span className="text-ink-muted">MEV extracted:</span>
          <div className="flex gap-4">
            <span className="text-red-500">Standard: $1+</span>
            <span className="text-accent">Shield: $0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
