import React, { useState } from "react";
import { mintTokens, getEncryptedBalance } from "../services/cofheService";

export default function TokenFaucet({ account }: { account: string | null }) {
  const [minting, setMinting] = useState<"WETH" | "USDC" | null>(null);
  const [wethBalance, setWethBalance] = useState<string>("—");
  const [usdcBalance, setUsdcBalance] = useState<string>("—");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshBalances = async () => {
    const w = await getEncryptedBalance("WETH");
    const u = await getEncryptedBalance("USDC");
    setWethBalance(w);
    setUsdcBalance(u);
  };

  const handleMint = async (token: "WETH" | "USDC") => {
    try {
      setMinting(token);
      setError(null);
      setSuccess(null);

      const amount = token === "WETH" ? 100 : 10000;
      await mintTokens(token, amount);

      setSuccess(`Minted ${amount} ${token} to your wallet.`);
      await refreshBalances();
    } catch (err: any) {
      if (err.message?.includes("User denied") || err.message?.includes("User rejected")) {
        setError("Transaction rejected.");
      } else {
        setError("Mint failed: " + (err.message || "Unknown error"));
      }
    } finally {
      setMinting(null);
    }
  };

  // Refresh balances when account changes
  React.useEffect(() => {
    if (account) refreshBalances();
  }, [account]);

  if (!account) return null;

  return (
    <div className="border border-rule rounded-[10px] overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-rule bg-[#fafafa] flex items-center justify-between">
        <span className="text-xs font-mono font-semibold tracking-wider text-ink">TEST FAUCET</span>
        <span className="text-[10px] font-mono text-ink-muted">Hardhat Local</span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <p className="text-xs text-ink-muted leading-relaxed">
          Mint test tokens to trade on the encrypted order book. Balances are stored as FHE ciphertexts.
        </p>

        {/* WETH */}
        <div className="flex items-center justify-between p-3 border border-rule rounded-[6px]">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">FHE-WETH</span>
            <span className="text-[10px] font-mono text-ink-muted">
              Balance: <span className="encrypted-value">{wethBalance}</span>
            </span>
          </div>
          <button
            onClick={() => handleMint("WETH")}
            disabled={minting !== null}
            className="text-xs font-mono px-3 py-1.5 border border-accent/30 text-accent rounded-[4px] hover:bg-accent/5 transition-colors disabled:opacity-50"
          >
            {minting === "WETH" ? "Minting..." : "Mint 100"}
          </button>
        </div>

        {/* USDC */}
        <div className="flex items-center justify-between p-3 border border-rule rounded-[6px]">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">FHE-USDC</span>
            <span className="text-[10px] font-mono text-ink-muted">
              Balance: <span className="encrypted-value">{usdcBalance}</span>
            </span>
          </div>
          <button
            onClick={() => handleMint("USDC")}
            disabled={minting !== null}
            className="text-xs font-mono px-3 py-1.5 border border-accent/30 text-accent rounded-[4px] hover:bg-accent/5 transition-colors disabled:opacity-50"
          >
            {minting === "USDC" ? "Minting..." : "Mint 10,000"}
          </button>
        </div>
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
