import { motion } from "motion/react";
import { useState } from "react";
import type { Address } from "viem";
import { LaunchPanel } from "./components/LaunchPanel";
import { LookAlikePanel } from "./components/LookAlikePanel";
import { SealBadge } from "./components/SealBadge";
import { SwapPanel } from "./components/SwapPanel";
import { short } from "./lib/chain";
import { CONTRACTS, EXPLORER, KNOWN_TOKENS, NETWORK } from "./lib/config";
import { fmt } from "./lib/pools";
import { useTokens } from "./lib/tokens";
import { useWallet } from "./lib/wallet";

type Tab = "swap" | "launch" | "lookalike";
const tabs: { id: Tab; label: string; role: string }[] = [
  { id: "launch", label: "Launch", role: "issuer" },
  { id: "lookalike", label: "Look-alike pool", role: "third party" },
  { id: "swap", label: "Swap", role: "trader" },
];

export function App() {
  const wallet = useWallet();
  const { tokens, add, find } = useTokens();
  const [tab, setTab] = useState<Tab>("swap");
  const [token, setToken] = useState<Address>(KNOWN_TOKENS[0].address);
  const fromBlock = find(token)?.fromBlock;

  const open = (next: Tab) => (address: Address) => { setToken(address); setTab(next); };

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><span className="mark" />Klamp <em>DEX · Sepolia</em><SealBadge /></div>
        <nav className="tabs" aria-label="Sections">
          {tabs.map((item) => (
            <button key={item.id} className={`tab ${tab === item.id ? "tab-on" : ""}`} onClick={() => setTab(item.id)}>
              {tab === item.id && <motion.span layoutId="tab" className="tab-bg" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="tab-label">{item.label}</span>
              <span className="tab-role">{item.role}</span>
            </button>
          ))}
        </nav>
        <div className="account">
          {wallet.account ? (
            <>
              {!wallet.onSepolia && <button className="ghost small warn" onClick={wallet.connect}>Switch to Sepolia</button>}
              <span className="balance">{wallet.eth !== null ? `${fmt(wallet.eth, 4)} ETH` : ""}</span>
              <a className="address" href={`${EXPLORER}/address/${wallet.account}`} target="_blank" rel="noreferrer">{short(wallet.account)}</a>
            </>
          ) : (
            <button className="primary small" onClick={wallet.connect} disabled={!wallet.available}>{wallet.available ? "Connect" : "No wallet"}</button>
          )}
        </div>
      </header>

      <main>
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {tab === "swap" && (
            <SwapPanel wallet={wallet} token={token} setToken={setToken} tokens={tokens} addToken={add} fromBlock={fromBlock ? BigInt(fromBlock) : undefined} />
          )}
          {tab === "launch" && <LaunchPanel wallet={wallet} onLaunched={add} goSwap={open("swap")} goLookAlike={open("lookalike")} />}
          {tab === "lookalike" && (
            <LookAlikePanel wallet={wallet} token={token} setToken={setToken} tokens={tokens} addToken={add} goSwap={open("swap")} />
          )}
        </motion.div>
      </main>

      <footer className="foot">
        <span>Real Sepolia transactions from your wallet. No Uniswap contract changed.</span>
        <span className="links">
          {[
            ["Registrar", CONTRACTS.registrar],
            ["DemoLaunchpad", CONTRACTS.launchpad],
            ["PoolManager", NETWORK.poolManager],
            ["Universal Router", CONTRACTS.universalRouter],
          ].map(([label, address]) => (
            <a key={label} href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer">{label}</a>
          ))}
        </span>
      </footer>
    </div>
  );
}
