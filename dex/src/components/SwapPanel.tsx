import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { parseEther, parseEventLogs, type Address } from "viem";
import type { PoolKey } from "@klamp/sdk/poolKey";
import { tokenAbi } from "../lib/abis";
import { ensureSepolia, errorText, sendTx, short, walletClient, type TxState } from "../lib/chain";
import { CONTRACTS, type KnownToken } from "../lib/config";
import { discoverPools, feeLabel, fmt, kindOf, planRoute, swapCalldata, tokenInfo, type RoutePlan } from "../lib/pools";
import type { Wallet } from "../lib/wallet";
import { RouteView } from "./RouteView";
import { TokenPicker } from "./TokenPicker";
import { TxStatus } from "./TxStatus";

type Result = { received: bigint; quoted: bigint; symbol: string; klamp: boolean };

export function SwapPanel({ wallet, token, setToken, tokens, addToken, fromBlock }: {
  wallet: Wallet;
  token: Address;
  setToken: (token: Address) => void;
  tokens: KnownToken[];
  addToken: (token: KnownToken) => void;
  fromBlock?: bigint;
}) {
  const [amount, setAmount] = useState("0.0005");
  const [slippage, setSlippage] = useState("5");
  const [klampOn, setKlampOn] = useState(true);
  const [pools, setPools] = useState<PoolKey[] | null>(null);
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [symbol, setSymbol] = useState("");
  const [balance, setBalance] = useState(0n);
  const [tx, setTx] = useState<TxState>({ status: "idle" });
  const [result, setResult] = useState<Result | null>(null);
  const [reload, setReload] = useState(0);

  const amountIn = useMemo(() => {
    try {
      const value = parseEther(amount || "0");
      return value > 0n ? value : null;
    } catch {
      return null;
    }
  }, [amount]);

  // Candidate pools: every ETH/token pool PoolManager has initialized.
  useEffect(() => {
    let live = true;
    setPools(null);
    setPlan(null);
    setResult(null);
    setError("");
    discoverPools(token, fromBlock)
      .then((keys) => live && setPools(keys))
      .catch((e) => live && setError(errorText(e)));
    return () => { live = false; };
  }, [token, fromBlock, reload]);

  useEffect(() => {
    let live = true;
    tokenInfo(token, wallet.account)
      .then((info) => { if (live) { setSymbol(info.symbol); setBalance(info.balance); } })
      .catch(() => undefined);
    return () => { live = false; };
  }, [token, wallet.account, reload]);

  // Quote (and judge) whenever the input, pools or mode change.
  useEffect(() => {
    if (!pools || !amountIn) return;
    let live = true;
    setLoading(true);
    const timer = setTimeout(() => {
      planRoute(token, pools, amountIn, klampOn)
        .then((next) => live && setPlan(next))
        .catch((e) => live && setError(errorText(e)))
        .finally(() => live && setLoading(false));
    }, 350);
    return () => { live = false; clearTimeout(timer); };
  }, [token, pools, amountIn, klampOn]);

  const chosen = plan?.chosen ?? null;
  const slippageBps = BigInt(Math.round(Math.min(Math.max(Number(slippage) || 0, 0.1), 50) * 100));
  const swap = chosen && amountIn ? swapCalldata(chosen, amountIn, slippageBps) : null;
  const blocked = klampOn && plan?.klamp && !chosen;

  const onSwap = async () => {
    if (!wallet.account || !swap || !amountIn || !chosen?.out || !swap.check.ok) return;
    const account = wallet.account;
    setResult(null);
    const receipt = await sendTx(klampOn ? "Klamp swap" : "Swap", async () => {
      const client = walletClient(account);
      await ensureSepolia(client);
      return client.sendTransaction({ account, chain: client.chain, to: CONTRACTS.universalRouter, data: swap.data, value: amountIn });
    }, setTx);
    if (receipt) {
      const received = parseEventLogs({ abi: tokenAbi, eventName: "Transfer", logs: receipt.logs })
        .filter((log) => log.address.toLowerCase() === token.toLowerCase() && log.args.to.toLowerCase() === account.toLowerCase())
        .at(-1)?.args.value ?? 0n; // Universal Router's TAKE_ALL is the last transfer to the trader
      setResult({ received, quoted: chosen.out, symbol, klamp: klampOn });
    }
    wallet.refresh();
    setReload((value) => value + 1);
  };

  const canonical = plan?.klamp?.canonical;
  const kind = chosen ? kindOf(chosen.poolId, chosen.key, canonical) : null;

  return (
    <div className="panel-grid">
      <section className="card">
        <label className="field">
          <span className="field-label">You pay</span>
          <div className="amount">
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="ETH amount" />
            <span className="unit">ETH</span>
          </div>
          {wallet.eth !== null && <span className="hint">Balance {fmt(wallet.eth, 4)} ETH</span>}
        </label>

        <div className="field">
          <span className="field-label">You receive</span>
          <div className="amount">
            <motion.strong key={`${chosen?.poolId}-${chosen?.out}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="out">
              {chosen?.out ? fmt(chosen.out) : loading ? "…" : "–"}
            </motion.strong>
            <span className="unit">{symbol}</span>
          </div>
          <TokenPicker tokens={tokens} value={token} onChange={setToken} onAdd={addToken} />
          {wallet.account && <span className="hint">Balance {fmt(balance)} {symbol}</span>}
        </div>

        <button className={`toggle ${klampOn ? "on" : ""}`} onClick={() => setKlampOn((value) => !value)} aria-pressed={klampOn}>
          <span className="knob" />
          <span>Klamp routing</span>
          <em>{klampOn ? "ENS check on" : "best quote only"}</em>
        </button>

        <dl className="details">
          <div><dt>Pool</dt><dd>{chosen ? `${short(chosen.poolId)} · ${feeLabel(chosen.key.fee)}${kind ? ` · ${kind === "hooked" ? "undeclared hook" : kind}` : ""}` : "–"}</dd></div>
          {plan?.klamp && plan.best && (
            <div><dt>ENS</dt><dd className={`ens-${plan.klamp.canonical.status}`}>{plan.klamp.canonical.status}{plan.klamp.canonical.status === "lookup_failed" ? ` (${plan.klamp.canonical.reason})` : ""} · {plan.klamp.verdict} · route {plan.klamp.comparison.status}</dd></div>
          )}
          <div><dt>Min received</dt><dd>{swap ? `${fmt(swap.minOut)} ${symbol}` : "–"}</dd></div>
          <div>
            <dt>Slippage</dt>
            <dd><input className="inline" value={slippage} onChange={(event) => setSlippage(event.target.value)} aria-label="Slippage percent" />%</dd>
          </div>
          <div><dt>Calldata</dt><dd className={swap?.check.ok ? "ok" : ""}>{swap ? (swap.check.ok ? "matches judged PoolKey" : "mismatch") : "–"}</dd></div>
        </dl>

        {!wallet.account ? (
          <button className="primary" onClick={wallet.connect} disabled={!wallet.available}>{wallet.available ? "Connect wallet" : "Install a wallet"}</button>
        ) : (
          <button className="primary" onClick={onSwap} disabled={!swap?.check.ok || loading || tx.status === "wallet" || tx.status === "pending"}>
            {blocked ? "No allowed pool" : klampOn ? "Swap with Klamp" : "Swap"}
          </button>
        )}
        <TxStatus state={tx} />
        {error && <p className="field-error">{error}</p>}

        <AnimatePresence>
          {result && (
            <motion.div className="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <strong>+{fmt(result.received)} {result.symbol}</strong>
              <span>quoted {fmt(result.quoted)} · {((Number(result.received) / Number(result.quoted) - 1) * 100).toFixed(2)}%</span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="stage">
        <RouteView plan={plan} klampOn={klampOn} symbol={symbol} loading={loading || !pools} />
        <p className="caption">
          {!pools ? "Finding pools…" : pools.length === 0 ? "No ETH pool for this token" : plan && !plan.best ? "No pool can fill this amount." : klampOn
            ? plan?.klamp?.verdict === "requote_canonical" ? "Best quote is an undeclared hook pool. Klamp requotes on the declared one."
              : plan?.klamp?.verdict === "allow" ? "Best quote is declared or static. Klamp lets it through."
              : plan?.klamp?.verdict === "requote_static" ? "Nothing declared in ENS. Only static pools are allowed."
              : plan?.klamp?.verdict === "hold" ? "ENS lookup failed. Holding: static pools only." : ""
            : "A normal router takes the largest quote."}
        </p>
      </section>
    </div>
  );
}
