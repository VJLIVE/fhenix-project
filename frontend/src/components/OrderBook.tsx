import React, { useState, useEffect } from "react";
import { getAllOrders, Order } from "../services/cofheService";

export default function OrderBook() {
  const [bids, setBids] = useState<Order[]>([]);
  const [asks, setAsks] = useState<Order[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchOrders = async () => {
      const allOrders = await getAllOrders();
      setBids(allOrders.filter((o) => o.isBuy));
      setAsks(allOrders.filter((o) => !o.isBuy));
    };

    fetchOrders();
    interval = setInterval(fetchOrders, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-medium text-display">Encrypted Order Book</h2>
        <p className="text-sm text-ink-muted">
          All values are <span className="font-mono text-accent">euint64</span> ciphertexts — unreadable on-chain.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Bids */}
        <div className="flex-1 border border-rule rounded-[10px] overflow-hidden flex flex-col bg-white min-w-0">
          <div className="px-4 py-3 border-b border-rule bg-[#fafafa] flex items-center justify-between">
            <span className="text-xs font-mono font-semibold tracking-wider text-ink">BIDS</span>
            <span className="text-[10px] font-mono text-accent tracking-wider">ENCRYPTED</span>
          </div>
          <div className="p-4 flex flex-col gap-2 overflow-y-auto flex-1">
            {bids.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-ink-muted font-mono py-8">
                No buy orders yet
              </div>
            ) : (
              bids.map((b) => (
                <div key={b.id} className="flex flex-col gap-1.5 p-3 border border-rule rounded-[6px] bg-white hover:border-accent/30 transition-colors">
                  <div className="flex justify-between text-[11px] font-mono text-ink-muted">
                    <span>#{b.id}</span>
                    <span>{b.trader}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink-muted uppercase">Price</span>
                      <span className="encrypted-value">{b.encryptedPrice}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink-muted uppercase">Amt</span>
                      <span className="encrypted-value">{b.encryptedAmount}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Asks */}
        <div className="flex-1 border border-rule rounded-[10px] overflow-hidden flex flex-col bg-white min-w-0">
          <div className="px-4 py-3 border-b border-rule bg-[#fafafa] flex items-center justify-between">
            <span className="text-xs font-mono font-semibold tracking-wider text-ink">ASKS</span>
            <span className="text-[10px] font-mono text-accent tracking-wider">ENCRYPTED</span>
          </div>
          <div className="p-4 flex flex-col gap-2 overflow-y-auto flex-1">
            {asks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-ink-muted font-mono py-8">
                No sell orders yet
              </div>
            ) : (
              asks.map((a) => (
                <div key={a.id} className="flex flex-col gap-1.5 p-3 border border-rule rounded-[6px] bg-white hover:border-accent/30 transition-colors">
                  <div className="flex justify-between text-[11px] font-mono text-ink-muted">
                    <span>#{a.id}</span>
                    <span>{a.trader}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink-muted uppercase">Price</span>
                      <span className="encrypted-value">{a.encryptedPrice}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink-muted uppercase">Amt</span>
                      <span className="encrypted-value">{a.encryptedAmount}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
