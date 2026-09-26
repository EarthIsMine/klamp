import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, keccak256, parseUnits, toHex, zeroHash, type Address, type Hex } from "viem";
import { hashPoolKey, type PoolKey } from "@klamp/sdk/poolKey";
import { registrarAbi, seederAbi, stateViewAbi, tokenAbi } from "../lib/abis";
import { ensureSepolia, errorText, publicClient, sendTx, short, walletClient, type TxState } from "../lib/chain";
import { CONTRACTS, ETH, NETWORK, type KnownToken } from "../lib/config";
import { feeLabel, fmt, poolExists, tokenInfo } from "../lib/pools";
import type { Wallet } from "../lib/wallet";
import { TokenPicker } from "./TokenPicker";
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

const reasons: Record<string, string> = {
  NotIssuer: "Only the contract that deployed the token can declare its pool.",
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
  const [withHook, setWithHook] = useState(true);
  const [exists, setExists] = useState<boolean | null>(null);
  const [symbol, setSymbol] = useState("");
  const [balance, setBalance] = useState(0n);
  const [allowance, setAllowance] = useState(0n);
  const [amount, setAmount] = useState("");
  const [tx, setTx] = useState<TxState>({ status: "idle" });
  const [declare, setDeclare] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [declared, setDeclared] = useState<{ poolId: Hex; tick: number } | null | undefined>(undefined);

  const key: PoolKey = useMemo(() => ({
    currency0: ETH,
    currency1: token,
    fee: tier.fee,
    tickSpacing: tier.tickSpacing,
    hooks: withHook ? CONTRACTS.hook : ETH,
  }), [token, tier, withHook]);
  const poolId = hashPoolKey(key);
  const tickUpper = Math.floor(((declared?.tick ?? LAUNCH_TICK) + PRICE_EDGE) / tier.tickSpacing) * tier.tickSpacing;
  const tickLower = tickUpper - RANGE;

  // The declared pool, straight from the registrar, and its live price.
  useEffect(() => {
    let live = true;
    setDeclared(undefined);
    (async () => {
      const id = await publicClient.readContract({ address: CONTRACTS.registrar, abi: registrarAbi, functionName: "canonicalPoolOf", args: [token] });
      if (/^0x0+$/.test(id)) return live && setDeclared(null);
      const [, tick] = await publicClient.readContract({ address: NETWORK.stateView, abi: stateViewAbi, functionName: "getSlot0", args: [id] });
      if (live) setDeclared({ poolId: id, tick });
    })().catch(() => live && setDeclared(null));
    return () => { live = false; };
  }, [token, reload]);

  useEffect(() => {
    let live = true;
    setExists(null);
    setDeclare(null);
    poolExists(key).then((value) => live && setExists(value)).catch(() => undefined);
    return () => { live = false; };
  }, [key, reload]);

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
    if (!wallet.account) return;
    try {
      await publicClient.simulateContract({
        account: wallet.account,
        address: CONTRACTS.registrar,
        abi: registrarAbi,
        functionName: "recordByCreate2",
        args: [token, key, keccak256(toHex("look-alike")), zeroHash, wallet.account],
      });
      setDeclare("Accepted?");
    } catch (error) {
      setDeclare(errorText(error));
    }
  };

  return (
    <div className="panel-grid">
      <section className="card">
        <div className="field">
          <span className="field-label">Token</span>
          <TokenPicker tokens={tokens} value={token} onChange={setToken} onAdd={addToken} />
          {wallet.account && <span className="hint">You hold {fmt(balance)} {symbol} · the pool must hold more than one trade pays out</span>}
        </div>

        <div className="field">
          <span className="field-label">LP fee</span>
          <div className="chips">
            {TIERS.map((option) => (
              <button key={option.fee} className={`chip ${option.fee === tier.fee ? "chip-on" : ""}`} onClick={() => setTier(option)}>{feeLabel(option.fee)}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Hook</span>
          <div className="chips">
            <button className={`chip ${withHook ? "chip-on" : ""}`} onClick={() => setWithHook(true)}>DeltaFeeHook 1%</button>
            <button className={`chip ${!withHook ? "chip-on" : ""}`} onClick={() => setWithHook(false)}>none (static)</button>
          </div>
        </div>
        <label className="field">
          <span className="field-label">Liquidity</span>
          <div className="amount">
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Token amount" />
            <span className="unit">{symbol}</span>
          </div>
        </label>
        <dl className="details">
          <div><dt>Pool</dt><dd className={exists ? "warn" : ""}>{short(poolId)}{exists === null ? "" : exists ? " · exists" : " · new"}</dd></div>
          <div><dt>Price</dt><dd>{declared === null ? "no declared pool" : "+3% vs declared pool"} · tick {tickLower}→{tickUpper}</dd></div>
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
        <TxStatus state={tx} />
      </section>

      <section className="stage">
        <div className="lookalike">
          <div className="pair">
            <motion.div className="pool-card declared" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <span className="badge ok">declared</span>
              <strong>{declared ? short(declared.poolId) : declared === null ? "none" : "…"}</strong>
              <span>{declared ? `tick ${declared.tick} · from ENS registrar` : declared === null ? "this token has no declared pool" : "reading registrar"}</span>
            </motion.div>
            <motion.div key={poolId} className={`pool-card ${exists ? "live" : "draft"}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <span className={`badge ${withHook ? "bad" : ""}`}>{withHook ? "undeclared hook" : "static"}</span>
              <strong>{feeLabel(tier.fee)} · {withHook ? "DeltaFeeHook" : "no hook"}</strong>
              <span>{exists ? "live on PoolManager" : "by you, anyone can"}</span>
            </motion.div>
          </div>
          <div className="declare">
            <button className="ghost" onClick={onDeclare} disabled={!wallet.account}>Try to declare it as canonical</button>
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
          <p className="caption">
            {withHook
              ? "A hook pool nobody declared. A normal router may pick it; Klamp requotes on the declared pool."
              : "A pool with no hook has a fixed fee. Klamp lets it through."}
          </p>
        </div>
      </section>
    </div>
  );
}
