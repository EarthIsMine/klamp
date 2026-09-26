import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, keccak256, parseUnits, toHex, zeroHash, type Address, type Hex } from "viem";
import { getCanonicalPool } from "@klamp/sdk/canonicalPool";
import { hashPoolKey, type PoolKey } from "@klamp/sdk/poolKey";
import { registrarAbi, seederAbi, stateViewAbi, tokenAbi } from "../lib/abis";
import { ensureSepolia, errorText, publicClient, sendTx, short, walletClient, type TxState } from "../lib/chain";
import { CONTRACTS, ETH, NETWORK, type KnownToken } from "../lib/config";
import { declarationTx, feeLabel, fmt, poolCreationTx, poolExists, tokenInfo } from "../lib/pools";
import { Ext } from "./Ext";
import type { Wallet } from "../lib/wallet";
import { Contracts } from "./Contracts";
import { TokenIcon, TokenPicker } from "./TokenPicker";
import { TxStatus } from "./TxStatus";

const TIERS = [
  { fee: 100, tickSpacing: 1 },
  { fee: 500, tickSpacing: 10 },
  { fee: 1000, tickSpacing: 20 },
];
// The look-alike starts about 3% above the declared pool's current price (more tokens per ETH) and spans
// 600 ticks, so a naive router sees the better quote. DemoLaunchpad pools start at tick 198060.
const LAUNCH_TICK = 198060;
const PRICE_EDGE = 300;
const RANGE = 600;
const DYNAMIC_FEE_FLAG = 0x800000;

type HookChoice = "delta" | "quoteAware" | "none";
const HOOKS: Record<HookChoice, { label: string; name: string; note: string }> = {
  delta: { label: "DeltaFeeHook 1%", name: "DeltaFeeHook", note: "Honest: takes 1% of each swap, the same when quoting." },
  quoteAware: { label: "Quote-aware · 0.05% → 10%", name: "QuoteAwareFeeHook", note: "Quotes 0.05% when V4Quoter asks, charges 10% on a real swap. Dynamic fee." },
  none: { label: "No hook", name: "no hook", note: "Fixed fee in the PoolKey: quoted = paid." },
};

const reasons: Record<string, string> = {
  NotIssuer: "Only the contract that deployed the token can declare its pool.",
  TokenNotDeployed: "There is no token at this address.",
  AlreadyRecorded: "This token already has a canonical pool.",
  TokenNotInPool: "The pool does not contain the token.",
  PoolNotInitialized: "The pool does not exist.",
};

/**
 * Anyone can open another ETH/token pool on the same PoolManager (PoolSeeder: initialize + one-sided liquidity).
 * What they cannot do is declare it: the registrar call is simulated and reverts.
 */
export function LookAlikePanel({ wallet, token, setToken, tokens, addToken, goSwap }: {
  wallet: Wallet;
  token: Address;
  setToken: (token: Address) => void;
  tokens: KnownToken[];
  addToken: (token: KnownToken) => void;
  goSwap: (token: Address) => void;
}) {
  const [tier, setTier] = useState(TIERS[0]);
  const [hookChoice, setHookChoice] = useState<HookChoice>("delta");
  const [quoteAwareLive, setQuoteAwareLive] = useState<boolean | null>(null);
  const withHook = hookChoice !== "none";
  const quoteAware = hookChoice === "quoteAware";
  const hookAddress = hookChoice === "delta" ? CONTRACTS.hook : hookChoice === "quoteAware" ? CONTRACTS.quoteAwareHook : ETH;

  // The quote-aware hook's address is fixed in advance (CREATE2); it is only selectable once it has been deployed.
  useEffect(() => {
    publicClient.getCode({ address: CONTRACTS.quoteAwareHook }).then((code) => setQuoteAwareLive(Boolean(code && code !== "0x"))).catch(() => setQuoteAwareLive(false));
  }, []);
  const [exists, setExists] = useState<boolean | null>(null);
  const [symbol, setSymbol] = useState("");
  const [balance, setBalance] = useState(0n);
  const [allowance, setAllowance] = useState(0n);
  const [amount, setAmount] = useState("");
  const [tx, setTx] = useState<TxState>({ status: "idle" });
  const [declare, setDeclare] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [declared, setDeclared] = useState<{ poolId: Hex; tick: number } | null | undefined>(undefined);
  const [declaredIn, setDeclaredIn] = useState<Hex | null>(null);
  const [createdIn, setCreatedIn] = useState<Hex | null>(null);

  const key: PoolKey = useMemo(() => ({
    currency0: ETH,
    currency1: token,
    fee: quoteAware ? DYNAMIC_FEE_FLAG : tier.fee,
    tickSpacing: quoteAware ? 60 : tier.tickSpacing,
    hooks: hookAddress,
  }), [token, tier, quoteAware, hookAddress]);
  const poolId = hashPoolKey(key);
  // The quote-aware pool starts one spacing above the declared price: it wins the quote mostly by lying about its fee.
  const tickUpper = quoteAware
    ? Math.ceil((declared?.tick ?? LAUNCH_TICK) / 60) * 60 + 60
    : Math.floor(((declared?.tick ?? LAUNCH_TICK) + PRICE_EDGE) / tier.tickSpacing) * tier.tickSpacing;
  const tickLower = tickUpper - RANGE;

  // The declared pool, straight from the registrar, and its live price.
  useEffect(() => {
    let live = true;
    setDeclared(undefined);
    (async () => {
      // Read it the way a router would: ENSv2 through UniversalResolverV2, with the SDK checks.
      const canonical = await getCanonicalPool(publicClient, NETWORK, token);
      if (canonical.status !== "registered") return live && setDeclared(null);
      const id = canonical.poolId;
      const [, tick] = await publicClient.readContract({ address: NETWORK.stateView, abi: stateViewAbi, functionName: "getSlot0", args: [id] });
      if (live) setDeclared({ poolId: id, tick });
    })().catch(() => live && setDeclared(null));
    return () => { live = false; };
  }, [token, reload]);

  useEffect(() => {
    let live = true;
    setExists(null);
    setDeclare(null);
    setCreatedIn(null);
    poolExists(key)
      .then(async (value) => {
        if (!live) return;
        setExists(value);
        if (value) { const tx = await poolCreationTx(poolId); if (live) setCreatedIn(tx); }
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, [key, poolId, reload]);

  // Explorer link for the declared pool: the transaction in which the registrar recorded it.
  useEffect(() => {
    let live = true;
    setDeclaredIn(null);
    declarationTx(token).then((tx) => live && setDeclaredIn(tx)).catch(() => undefined);
    return () => { live = false; };
  }, [token]);

  useEffect(() => {
    let live = true;
    (async () => {
      const info = await tokenInfo(token, wallet.account);
      const approved = wallet.account
        ? await publicClient.readContract({ address: token, abi: tokenAbi, functionName: "allowance", args: [wallet.account, CONTRACTS.poolSeeder] })
        : 0n;
      if (!live) return;
      setSymbol(info.symbol);
      setBalance(info.balance);
      setAllowance(approved);
      setAmount((current) => current || (info.balance > 0n ? String(Math.floor(Number(formatUnits((info.balance * 9n) / 10n, 18)))) : ""));
    })().catch(() => undefined);
    return () => { live = false; };
  }, [token, wallet.account, reload]);

  const amountWei = useMemo(() => {
    try {
      const value = parseUnits(amount || "0", 18);
      return value > 0n ? value : null;
    } catch {
      return null;
    }
  }, [amount]);
  const needsApproval = amountWei !== null && allowance < amountWei;
  const busy = tx.status === "wallet" || tx.status === "pending";

  const run = async (label: string, write: (client: ReturnType<typeof walletClient>, account: Address) => Promise<`0x${string}`>) => {
    if (!wallet.account) return;
    const account = wallet.account;
    await sendTx(label, async () => {
      const client = walletClient(account);
      await ensureSepolia(client);
      return write(client, account);
    }, setTx);
    wallet.refresh();
    setReload((value) => value + 1);
  };

  const onApprove = () => run(`Approve ${symbol}`, (client, account) =>
    client.writeContract({ account, chain: client.chain, address: token, abi: tokenAbi, functionName: "approve", args: [CONTRACTS.poolSeeder, amountWei!] }));
  const onSeed = () => run("Create pool", (client, account) =>
    client.writeContract({ account, chain: client.chain, address: CONTRACTS.poolSeeder, abi: seederAbi, functionName: "seed", args: [key, tickLower, tickUpper, amountWei!] }));

  // eth_call only: a third party asking the registrar to declare this pool.
  const onDeclare = async () => {
    // Without a wallet, simulate from a stand-in address: any caller other than the token's launchpad gets the same answer.
    const caller = wallet.account ?? "0x000000000000000000000000000000000000dEaD";
    try {
      await publicClient.simulateContract({
        account: caller,
        address: CONTRACTS.registrar,
        abi: registrarAbi,
        functionName: "recordByCreate2",
        args: [token, key, keccak256(toHex("look-alike")), zeroHash, caller],
      });
      setDeclare("Accepted?");
    } catch (error) {
      setDeclare(errorText(error));
    }
  };

  return (
    <div className="panel-grid">
      <section className="card">
        <div className="card-head">
          <h2>Create a pool</h2>
          <span className="chain-chip">v4 · Sepolia</span>
        </div>
        <p className="card-sub">Any pair, any fee tier, any hook. Opening a pool needs no permission, so a token can have many.</p>

        <div className="field">
          <span className="field-label">Pair</span>
          <div className="pair-row">
            <span className="token-pill static"><TokenIcon symbol="ETH" /><span>ETH</span></span>
            <span className="pair-slash">/</span>
            <TokenPicker tokens={tokens} value={token} onChange={setToken} onAdd={addToken} />
          </div>
          {wallet.account && <span className="hint">You hold {fmt(balance)} {symbol} · the pool must hold more than one trade pays out</span>}
        </div>

        <div className="field">
          <span className="field-label">Fee tier</span>
          <div className="chips">
            {quoteAware ? <span className="hint">Dynamic: the hook sets the fee on every swap.</span> : TIERS.map((option) => (
              <button key={option.fee} className={`chip ${option.fee === tier.fee ? "chip-on" : ""}`} onClick={() => setTier(option)}>{feeLabel(option.fee)}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Hook</span>
          <div className="chips">
            {(Object.keys(HOOKS) as HookChoice[]).map((choice) => (
              <button
                key={choice}
                className={`chip ${hookChoice === choice ? "chip-on" : ""}`}
                onClick={() => setHookChoice(choice)}
                disabled={choice === "quoteAware" && quoteAwareLive === false}
                title={choice === "quoteAware" && quoteAwareLive === false ? "Not deployed yet: script/DeployQuoteAwareHook.s.sol" : undefined}
              >
                {HOOKS[choice].label}
              </button>
            ))}
          </div>
          <span className="hint">{HOOKS[hookChoice].note}</span>
          <span className="hook-address">{withHook ? <Ext address={hookAddress}>{hookAddress}</Ext> : "0x0000000000000000000000000000000000000000"}</span>
        </div>
        <label className="box">
          <span className="box-label">Liquidity</span>
          <span className="box-row">
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Token amount" />
            <span className="token-pill static"><TokenIcon symbol={symbol || "?"} /><span>{symbol}</span></span>
          </span>
        </label>
        <dl className="details">
          <div><dt>Pool</dt><dd className={exists ? "warn" : ""}><Ext tx={createdIn ?? undefined} title="Transaction that created this pool">{short(poolId)}</Ext>{exists === null ? "" : exists ? " · exists" : " · new"}</dd></div>
          <div><dt>Starting price</dt><dd>{declared === null ? "no declared pool" : quoteAware ? "~0.6% above declared pool" : "+3% vs declared pool"} · tick {tickLower}→{tickUpper}</dd></div>
        </dl>

        {!wallet.account ? (
          <button className="primary" onClick={wallet.connect} disabled={!wallet.available}>{wallet.available ? "Connect wallet" : "Install a wallet"}</button>
        ) : balance === 0n ? (
          <button className="primary" onClick={() => goSwap(token)}>Buy {symbol || "tokens"} first (0.002 ETH) →</button>
        ) : needsApproval ? (
          <button className="primary" onClick={onApprove} disabled={busy || !amountWei || exists !== false}>1 · Approve {symbol}</button>
        ) : (
          <button className="primary" onClick={onSeed} disabled={busy || !amountWei || exists !== false || amountWei > balance}>2 · Create pool</button>
        )}
        <TxStatus state={tx} to={"label" in tx && tx.label.startsWith("Approve") ? { name: symbol, address: token } : { name: "PoolSeeder", address: CONTRACTS.poolSeeder }} />
      </section>

      <section className="stage">
        <div className="lookalike">
          <h3 className="stage-title">What a Klamp router sees for {symbol || "this token"}</h3>
          <div className="pair">
            <motion.div className="pool-card declared" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <span className="badge ok">declared · in ENS</span>
              <strong>{declared ? <Ext tx={declaredIn ?? undefined} title="Transaction that declared this pool">{short(declared.poolId)}</Ext> : declared === null ? "none" : "…"}</strong>
              <span>{declared ? <>{short(token.toLowerCase(), 6, 4)}.tokens.klamp.eth → this pool. Chosen by the issuer at launch.</> : declared === null ? "This token has no declared pool." : "Reading the registrar…"}</span>
            </motion.div>
            <motion.div key={poolId} className={`pool-card ${exists ? "live" : "draft"}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <span className={`badge ${withHook ? "bad" : ""}`}>{withHook ? "your pool · not in ENS" : "your pool · static"}</span>
              <strong>{feeLabel(key.fee)} · {withHook ? <Ext address={hookAddress}>{HOOKS[hookChoice].name}</Ext> : "no hook"}</strong>
              <span>
                {exists ? "Live on PoolManager." : "Not created yet."}{" "}
                {quoteAware ? "It quotes 0.05% but takes 10% at swap time. A best-quote router picks it; Klamp requotes on the declared pool."
                  : withHook ? "A best-quote router may pick it; Klamp requotes on the declared pool." : "Fixed fee: quoted = paid, so Klamp lets it through."}
              </span>
            </motion.div>
          </div>
          <div className="declare-box">
            <strong>Could your pool become the declared one?</strong>
            <span>That record decides where Klamp routes, so a look-alike would want it. The registrar only accepts the launchpad that deployed the token, and only once.</span>
            <button className="ghost" onClick={onDeclare}>Try to declare it as canonical</button>
            {declare && (
              <motion.div className="stamp" initial={{ scale: 1.8, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: -6, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }}>
                <strong>{declare}</strong>
                {reasons[declare] && <span>{reasons[declare]}</span>}
              </motion.div>
            )}
          </div>
          {exists && (
            <motion.button className="primary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => goSwap(token)}>
              See how routers treat it →
            </motion.button>
          )}
        </div>
        <Contracts items={[
          ...(needsApproval || ("label" in tx && tx.label.startsWith("Approve")) ? [{ name: symbol || "Token", address: token, use: "approve PoolSeeder to take the liquidity", kind: "tx" as const, protocol: "token" as const }] : []),
          { name: "PoolSeeder", address: CONTRACTS.poolSeeder, use: "seed: initialize the pool and add one-sided liquidity", kind: "tx", protocol: "demo" },
          { name: "PoolManager", address: NETWORK.poolManager, use: "initialize, inside the seed transaction", kind: "inner", protocol: "uniswap" },
          ...(withHook ? [{ name: HOOKS[hookChoice].name, address: hookAddress, use: quoteAware ? "the hook in this PoolKey: 0.05% to the quoter, 10% on swaps" : "the hook in this PoolKey", kind: "inner" as const, protocol: "demo" as const }] : []),
          { name: "UniversalResolverV2", address: NETWORK.universalResolver, use: "reads the declared pool from ENS", kind: "read", protocol: "ens" },
          { name: "StateView", address: NETWORK.stateView, use: "declared pool's price, to set the starting price", kind: "read", protocol: "uniswap" },
          { name: "CanonicalPoolRegistrar", address: CONTRACTS.registrar, use: "recordByCreate2 simulated: who may declare", kind: "sim", protocol: "klamp" },
        ]} />
      </section>
    </div>
  );
}
