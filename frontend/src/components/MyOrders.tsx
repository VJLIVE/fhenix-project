import React, { useState, useEffect } from "react";
import { getAllOrders, cancelOrder, getMatchCount, Order } from "../services/cofheService";

interface MyOrdersProps {
  account: string | null;
  onDecryptRequest: (matchId: number) => void;
}

export default function MyOrders({ account, onDecryptRequest }: MyOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetch = async () => {
      if (!account) return;

      const allOrders = await getAllOrders();
      // Filter to the connected user's orders
      const mine = allOrders.filter(
        (o) => o.traderFull.toLowerCase() === account.toLowerCase()
      );
      setOrders(mine);

      const mc = await getMatchCount();
      setMatchCount(mc);
    };

    fetch();
    interval = setInterval(fetch, 3000);

    return () => clearInterval(interval);
  }, [account]);

  const handleCancel = async (orderId: number) => {
    try {
      setCancellingId(orderId);
      setError(null);
      setSuccess(null);
      await cancelOrder(orderId.toString());
      setSuccess(`Order #${orderId} cancelled successfully.`);
    } catch (err: any) {
      if (err.message?.includes("User denied") || err.message?.includes("User rejected")) {
        setError("Transaction rejected.");
      } else {
        setError("Cancel failed: " + (err.message || "Unknown error"));
      }
    } finally {
      setCancellingId(null);
    }
  };

  if (!account) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 border border-rule rounded-[10px] overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-rule bg-[#fafafa] flex items-center justify-between">
        <span className="text-xs font-mono font-semibold tracking-wider text-ink">MY ORDERS</span>
        <span className="text-[10px] font-mono text-ink-muted">{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-2">
        {orders.length === 0 ? (
          <div className="text-sm text-ink-muted font-mono py-4 text-center">
            You haven&apos;t submitted any orders yet.
          </div>
        ) : (
          orders.map((o) => (
            <div
              key={o.id}
              className="flex items-center gap-4 p-3 border border-rule rounded-[6px] bg-white hover:border-accent/30 transition-colors"
            >
              {/* Order ID + Side */}
              <div className="flex items-center gap-2 min-w-[80px]">
                <span className="text-xs font-mono text-ink-muted">#{o.id}</span>
                <span
                  className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    o.isBuy
                      ? "bg-accent/10 text-accent"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {o.isBuy ? "BUY" : "SELL"}
                </span>
              </div>

              {/* Encrypted values */}
              <div className="flex-1 flex items-center gap-4 font-mono text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-ink-muted">Price</span>
                  <span className="encrypted-value text-xs">{o.encryptedPrice}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-ink-muted">Amt</span>
                  <span className="encrypted-value text-xs">{o.encryptedAmount}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCancel(o.id)}
                  disabled={cancellingId === o.id}
                  className="text-xs font-mono text-ink-muted hover:text-red-500 transition-colors disabled:opacity-50 px-2 py-1 border border-rule rounded-[4px] hover:border-red-500/30"
                >
                  {cancellingId === o.id ? "..." : "Cancel"}
                </button>
              </div>
            </div>
          ))
        )}

        {/* Match Actions — only show if there are matches */}
        {matchCount > 0 && (
          <div className="border-t border-rule pt-3 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-ink-muted">
                {matchCount} match{matchCount !== 1 ? "es" : ""} recorded
              </span>
              <button
                onClick={() => onDecryptRequest(matchCount - 1)}
                className="text-xs font-mono text-accent hover:text-accent/80 transition-colors px-3 py-1.5 border border-accent/30 rounded-[4px] hover:bg-accent/5"
              >
                View Latest Match →
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-4 text-sm text-red-500 font-mono p-3 bg-red-500/10 border border-red-500/20 rounded-[6px]">
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="mx-4 mb-4 text-sm text-accent font-mono p-3 bg-accent/10 border border-accent/20 rounded-[6px]">
          ✓ {success}
        </div>
      )}
    </div>
  );
}
