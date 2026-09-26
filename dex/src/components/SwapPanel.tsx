import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseEther, parseEventLogs, type Address, type Hex } from "viem";
import type { PoolKey } from "@klamp/sdk/poolKey";
import { tokenAbi } from "../lib/abis";
import { ensureSepolia, errorText, sendTx, short, walletClient, type TxState } from "../lib/chain";
import { ATTACK_TEST_URL, CONTRACTS, ETH, NETWORK, type KnownToken } from "../lib/config";
import { discoverPools, feeLabel, fmt, kindOf, planRoute, preflightSwap, swapCalldata, tokenInfo, type RoutePlan } from "../lib/pools";
import { useSwapHistory } from "../lib/history";
import type { Wallet } from "../lib/wallet";
import { Ext, txUrl } from "./Ext";
import { RouteView } from "./RouteView";
import { SwapReceipts } from "./SwapReceipts";
import { Contracts } from "./Contracts";
import { TokenIcon, TokenPicker } from "./TokenPicker";
import { TxStatus } from "./TxStatus";

type Result = { received: bigint; quoted: bigint; symbol: string; klamp: boolean; hash: Hex; pool: string };

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
  const [createdIn, setCreatedIn] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [symbol, setSymbol] = useState("");
  const [balance, setBalance] = useState(0n);
  const [tx, setTx] = useState<TxState>({ status: "idle" });
  const [result, setResult] = useState<Result | null>(null);
  const history = useSwapHistory();
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
      .then((found) => { if (live) { setPools(found.keys); setCreatedIn(found.createdIn); } })
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

  const canonical = plan?.klamp?.canonical;
  const kind = chosen ? kindOf(chosen.poolId, chosen.key, canonical) : null;

  const onSwap = async () => {
    if (!wallet.account || !swap || !amountIn || !chosen?.out || !swap.check.ok) return;
    const account = wallet.account;
    setResult(null);
    const label = klampOn ? "Klamp swap" : "Swap";
    const pool = klampOn ? (kind === "hooked" ? "undeclared hook" : kind ?? "") : kind === "static" ? "no hook" : "hook pool";
    // Simulate first: a swap that would revert is reported with numbers instead of a wallet's "internal error".
    const check = await preflightSwap(account, swap.data, amountIn);
    if (!check.ok) {
      const message = check.wouldReceive !== undefined && check.minOut !== undefined
        ? `Would revert: the pool pays ${fmt(check.wouldReceive)} ${symbol}, below your minimum ${fmt(check.minOut)} (${slippage}% slippage). Nothing was sent.`
        : `Would revert: ${check.reason}. Nothing was sent.`;
      setTx({ status: "error", label, message });
      history.add({
        token, symbol, klamp: klampOn, poolId: chosen.poolId, fee: chosen.key.fee, pool,
        amountIn: amountIn.toString(), quoted: chosen.out.toString(), minOut: swap.minOut.toString(), received: "0",
        hash: null, wouldReceive: check.wouldReceive?.toString(), at: Date.now(),
      });
      return;
    }
    const receipt = await sendTx(label, async () => {
      const client = walletClient(account);
      await ensureSepolia(client);
      return client.sendTransaction({ account, chain: client.chain, to: CONTRACTS.universalRouter, data: swap.data, value: amountIn });
    }, setTx);
    if (receipt) {
      const received = parseEventLogs({ abi: tokenAbi, eventName: "Transfer", logs: receipt.logs })
        .filter((log) => log.address.toLowerCase() === token.toLowerCase() && log.args.to.toLowerCase() === account.toLowerCase())
        .at(-1)?.args.value ?? 0n; // Universal Router's TAKE_ALL is the last transfer to the trader
      setResult({ received, quoted: chosen.out, symbol, klamp: klampOn, hash: receipt.transactionHash, pool });
      history.add({
        token, symbol, klamp: klampOn, poolId: chosen.poolId, fee: chosen.key.fee, pool,
        amountIn: amountIn.toString(), quoted: chosen.out.toString(), minOut: swap.minOut.toString(), received: received.toString(),
        hash: receipt.transactionHash, at: Date.now(),
      });
    }
    wallet.refresh();
    setReload((value) => value + 1);
  };


  return (
    <div className="panel-grid">
      <section className="card">
        <div className="card-head">
          <h2>Swap</h2>
          <SlippageSettings value={slippage} onChange={setSlippage} />
        </div>

        <label className="box">
          <span className="box-label">You pay</span>
          <span className="box-row">
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="ETH amount" />
            <span className="token-pill static"><TokenIcon symbol="ETH" /><span>ETH</span></span>
          </span>
          {wallet.eth !== null && <span className="hint">Balance {fmt(wallet.eth, 4)} ETH</span>}
        </label>

        <div className="box">
          <span className="box-label">You receive</span>
          <span className="box-row">
            <motion.strong key={`${chosen?.poolId}-${chosen?.out}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="out">
              {chosen?.out ? fmt(chosen.out) : loading ? "…" : "–"}
            </motion.strong>
            <TokenPicker tokens={tokens} value={token} onChange={setToken} onAdd={addToken} />
          </span>
          {wallet.account && <span className="hint">Balance {fmt(balance)} {symbol}</span>}
        </div>

        <button className={`toggle ${klampOn ? "on" : ""}`} onClick={() => setKlampOn((value) => !value)} aria-pressed={klampOn}>
          <span className="knob" />
          <span>Klamp routing</span>
          <em>{klampOn ? "ENS check on" : "best quote only"}</em>
        </button>

        <dl className="details">
          <div>
            <dt>Pool</dt>
            <dd>
              {chosen ? <><Ext tx={createdIn[chosen.poolId]} title="Transaction that created this pool">{short(chosen.poolId)}</Ext>{` · ${feeLabel(chosen.key.fee)}${kind ? ` · ${kind === "hooked" ? "undeclared hook" : kind}` : ""}`}</> : "–"}
            </dd>
          </div>
          {chosen && chosen.key.hooks !== ETH && <div><dt>Hook</dt><dd><Ext address={chosen.key.hooks} /></dd></div>}
          {plan?.klamp && plan.best && (
            <div><dt>ENS</dt><dd className={`ens-${plan.klamp.canonical.status}`}>{plan.klamp.canonical.status}{plan.klamp.canonical.status === "lookup_failed" ? ` (${plan.klamp.canonical.reason})` : ""} · {plan.klamp.verdict} · route {plan.klamp.comparison.status}</dd></div>
          )}
          <div><dt>Min received</dt><dd>{swap ? `${fmt(swap.minOut)} ${symbol}` : "–"} <span className="muted">({slippage}% slippage)</span></dd></div>
          {klampOn && <div><dt>Calldata</dt><dd className={swap?.check.ok ? "ok" : ""}>{swap ? (swap.check.ok ? "matches judged PoolKey" : "mismatch") : "–"}</dd></div>}
        </dl>

        {!wallet.account ? (
          <button className="primary" onClick={wallet.connect} disabled={!wallet.available}>{wallet.available ? "Connect wallet" : "Install a wallet"}</button>
        ) : (
          <button className="primary" onClick={onSwap} disabled={!swap?.check.ok || loading || tx.status === "wallet" || tx.status === "pending"}>
            {blocked ? "No allowed pool" : klampOn ? "Swap with Klamp" : "Swap"}
          </button>
        )}
        <TxStatus state={tx} to={{ name: "Universal Router", address: CONTRACTS.universalRouter }} />
        {error && <p className="field-error">{error}</p>}

        <AnimatePresence>
          {result && (
            <motion.div className="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <span className="result-label">{result.klamp ? "Klamp swap" : "Swap"} received</span>
              <strong>+{fmt(result.received)} {result.symbol}</strong>
              <span>quoted {fmt(result.quoted)} · {((Number(result.received) / Number(result.quoted) - 1) * 100).toFixed(2)}% · {result.pool}</span>
              <a href={txUrl(result.hash)} target="_blank" rel="noreferrer">View on Etherscan ↗</a>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="stage">
        <RouteView plan={plan} klampOn={klampOn} symbol={symbol} loading={loading || !pools} createdIn={createdIn} />
        <p className="caption">
          {!pools ? "Finding pools…" : pools.length === 0 ? "No ETH pool for this token" : plan && !plan.best ? "No pool can fill this amount." : klampOn
            ? plan?.klamp?.verdict === "requote_canonical" ? "Best quote is an undeclared hook pool. Klamp requotes on the declared one."
              : plan?.klamp?.verdict === "allow" ? "Best quote is declared or static. Klamp lets it through."
              : plan?.klamp?.verdict === "requote_static" ? "Nothing declared in ENS. Only static pools are allowed."
              : plan?.klamp?.verdict === "hold" ? "ENS lookup failed. Holding: static pools only." : ""
            : "A normal router takes the largest quote."}
        </p>
        <SwapReceipts swaps={history.swaps} token={token} />
        <RiskNote plan={plan} klampOn={klampOn} minOut={swap?.minOut ?? null} slippage={slippage} symbol={symbol} />
        <Contracts items={[
          { name: "PoolManager", address: NETWORK.poolManager, use: "Initialize events: every ETH pool of this token", kind: "read", protocol: "uniswap" },
          { name: "V4Quoter", address: CONTRACTS.quoter, use: "quoteExactInputSingle for each pool", kind: "sim", protocol: "uniswap" },
          ...(klampOn ? [
            { name: "UniversalResolverV2", address: NETWORK.universalResolver, use: "<token>.tokens.klamp.eth pool record", kind: "read" as const, protocol: "ens" as const },
            { name: "tokens.klamp.eth resolver", address: NETWORK.resolver, use: "must be the resolver that answered", kind: "read" as const, protocol: "ens" as const },
          ] : []),
          { name: "Universal Router", address: CONTRACTS.universalRouter, use: "execute(V4_SWAP) with the chosen PoolKey", kind: "tx", protocol: "uniswap" },
        ]} />
      </section>
    </div>
  );
}

/**
 * Why the larger quote is not the better trade. The look-alike here is honest, so without this the demo
 * only shows Klamp paying less; the attack itself is reproduced on v4-core in the linked test.
 */
function RiskNote({ plan, klampOn, minOut, slippage, symbol }: { plan: RoutePlan | null; klampOn: boolean; minOut: bigint | null; slippage: string; symbol: string }) {
  const best = plan?.best;
  if (!plan || !best?.out) return null;
  const canonical = plan.klamp?.canonical;
  const risky = kindOf(best.poolId, best.key, canonical) === "hooked";
  if (!klampOn && risky && plan.chosen?.poolId === best.poolId) {
    return (
      <div className="risk risk-danger">
        <strong>This number is a quote, not a promise.</strong>
        <span>
          Nobody declared this hook pool, and a hook can charge one fee when V4Quoter asks and another when you swap.
          If it does, the swap reverts or pays as little as {minOut !== null ? `${fmt(minOut)} ${symbol}` : "your minimum"}: everything your {slippage}% slippage allows.
        </span>
        <a href={ATTACK_TEST_URL} target="_blank" rel="noreferrer">Reproduced on v4-core: quote 0.05%, swap 10% →</a>
      </div>
    );
  }
  const chosen = plan.chosen;
  if (klampOn && plan.klamp?.verdict === "requote_canonical" && chosen?.out && chosen.poolId !== best.poolId) {
    const gap = best.out - chosen.out;
    const pct = (Number(gap) / Number(best.out)) * 100;
    return (
      <div className="risk risk-klamp">
        <strong>{fmt(gap)} {symbol} ({pct.toFixed(2)}%) below the best quote, on purpose.</strong>
        <span>
          The best quote came from a hook pool nobody declared, so it can change at swap time and cost up to your full {slippage}% slippage.
          Klamp pays the issuer's declared pool instead.
        </span>
        <a href={ATTACK_TEST_URL} target="_blank" rel="noreferrer">See the attack reproduced on v4-core →</a>
      </div>
    );
  }
  return null;
}

const SLIPPAGE_PRESETS = ["0.5", "1", "5"];

/** Max slippage behind a settings button, as swap widgets do. */
function SlippageSettings({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div className="settings" ref={ref}>
      <button type="button" className="icon-button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label="Swap settings" title="Swap settings">
        <span className="slip-now">{value}%</span>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 0 0 1.7 1L11 21h4l.4-2.9a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" /></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="settings-menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <strong>Max slippage</strong>
            <span className="hint">The swap reverts if it would pay less than the quote minus this.</span>
            <div className="chips">
              {SLIPPAGE_PRESETS.map((preset) => (
                <button key={preset} type="button" className={`chip ${preset === value ? "chip-on" : ""}`} onClick={() => onChange(preset)}>{preset}%</button>
              ))}
              <label className="chip custom"><input value={value} onChange={(event) => onChange(event.target.value)} aria-label="Slippage percent" />%</label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
