import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { parseEventLogs, type Address, type Hex } from "viem";
import { getCanonicalPool, tokenName, type CanonicalPoolResult } from "@klamp/sdk/canonicalPool";
import { launchpadAbi, registrarAbi } from "../lib/abis";
import { ensureSepolia, errorText, publicClient, sendTx, short, walletClient, type TxState } from "../lib/chain";
import { CONTRACTS, NETWORK, type KnownToken } from "../lib/config";
import type { Wallet } from "../lib/wallet";
import { Ext } from "./Ext";
import { TxStatus } from "./TxStatus";

type Launch = { token: Address; poolId: Hex; issuer: Address; creator: Address; block: bigint; tx: Hex; canonical: CanonicalPoolResult | null };

const randomSymbol = () => `K${Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("")}`;

/**
 * Path A on the deployed DemoLaunchpad: one transaction deploys the token (CREATE2), initializes its
 * hooked ETH pool, locks the whole supply as liquidity and declares that pool through the registrar.
 */
export function LaunchPanel({ wallet, onLaunched, goSwap, goLookAlike }: {
  wallet: Wallet;
  onLaunched: (token: KnownToken) => void;
  goSwap: (token: Address) => void;
  goLookAlike: (token: Address) => void;
}) {
  const [name, setName] = useState("Klamp Demo");
  const [symbol, setSymbol] = useState(randomSymbol);
  const [predicted, setPredicted] = useState<{ address: Address; taken: boolean } | null>(null);
  const [tx, setTx] = useState<TxState>({ status: "idle" });
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [description, setDescription] = useState("");
  const [textTx, setTextTx] = useState<TxState>({ status: "idle" });
  const [savedText, setSavedText] = useState<string | null>(null);

  // The token address is fixed before launch: CREATE2(launchpad, salt(creator, name, symbol), init code).
  useEffect(() => {
    if (!wallet.account || !name || !symbol) return setPredicted(null);
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const address = await publicClient.readContract({ address: CONTRACTS.launchpad, abi: launchpadAbi, functionName: "predictToken", args: [wallet.account!, name, symbol] });
        const code = await publicClient.getCode({ address });
        if (live) setPredicted({ address, taken: Boolean(code && code !== "0x") });
      } catch {
        if (live) setPredicted(null);
      }
    }, 300);
    return () => { live = false; clearTimeout(timer); };
  }, [wallet.account, name, symbol]);

  const onLaunch = async () => {
    if (!wallet.account) return;
    const account = wallet.account;
    setLaunch(null);
    setSavedText(null);
    const receipt = await sendTx(`Launch ${symbol}`, async () => {
      const client = walletClient(account);
      await ensureSepolia(client);
      return client.writeContract({ account, chain: client.chain, address: CONTRACTS.launchpad, abi: launchpadAbi, functionName: "launch", args: [name, symbol] });
    }, setTx);
    if (!receipt) return;
    const launched = parseEventLogs({ abi: launchpadAbi, eventName: "Launched", logs: receipt.logs })[0];
    const recorded = parseEventLogs({ abi: registrarAbi, eventName: "CanonicalRecorded", logs: receipt.logs })[0];
    if (!launched || !recorded) return;
    const token = launched.args.token;
    const next: Launch = { token, poolId: recorded.args.poolId, issuer: recorded.args.issuer, creator: recorded.args.creator, block: receipt.blockNumber, tx: receipt.transactionHash, canonical: null };
    setLaunch(next);
    onLaunched({ address: token, symbol, fromBlock: receipt.blockNumber.toString(), mine: true });
    wallet.refresh();
    // Read it back the way any router would: ENSv2 through UniversalResolverV2, with the SDK checks.
    const canonical = await getCanonicalPool(publicClient, NETWORK, token);
    setLaunch({ ...next, canonical });
    setSymbol(randomSymbol());
  };

  const onDescribe = async () => {
    if (!wallet.account || !launch) return;
    const account = wallet.account;
    const receipt = await sendTx("Set description", async () => {
      const client = walletClient(account);
      await ensureSepolia(client);
      return client.writeContract({ account, chain: client.chain, address: CONTRACTS.registrar, abi: registrarAbi, functionName: "setTokenText", args: [launch.token, "description", description] });
    }, setTextTx);
    if (!receipt) return;
    try {
      setSavedText(await publicClient.getEnsText({ name: tokenName(launch.token), key: "description", universalResolverAddress: NETWORK.universalResolver }));
    } catch (error) {
      setSavedText(`read failed: ${errorText(error)}`);
    }
  };

  const busy = tx.status === "wallet" || tx.status === "pending";
  const registered = launch?.canonical?.status === "registered" && launch.canonical.poolId === launch.poolId.toLowerCase();
  const steps = launch ? [
    { label: "Token", value: <Ext address={launch.token} />, done: true },
    { label: "Pool", value: <><Ext tx={launch.tx} title="Launch transaction: token, pool, liquidity and declaration">{short(launch.poolId)}</Ext> · supply locked</>, done: true },
    {
      label: "Declared",
      value: <>issuer <Ext address={launch.issuer}>launchpad</Ext> · creator <Ext address={launch.creator}>{launch.creator.toLowerCase() === wallet.account?.toLowerCase() ? "you" : short(launch.creator)}</Ext></>,
      done: true,
    },
    {
      label: "ENS",
      value: launch.canonical ? `${short(launch.token.toLowerCase(), 6, 4)}.tokens.klamp.eth → ${launch.canonical.status}${registered ? "" : launch.canonical.status === "lookup_failed" ? ` (${launch.canonical.reason})` : ""}` : "resolving…",
      done: registered,
    },
  ] : [];

  return (
    <div className="panel-grid">
      <section className="card">
        <label className="field">
          <span className="field-label">Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={32} />
        </label>
        <label className="field">
          <span className="field-label">Symbol</span>
          <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} maxLength={8} />
        </label>
        <dl className="details">
          <div><dt>Pair</dt><dd>ETH / {symbol || "…"} · 0.3% + 1% hook</dd></div>
          <div><dt>Supply</dt><dd>1,000,000,000 · locked in the pool</dd></div>
          <div><dt>Address</dt><dd className={predicted?.taken ? "warn" : ""}>{predicted ? <><Ext address={predicted.address} />{predicted.taken ? " · already launched" : ""}</> : "–"}</dd></div>
        </dl>
        {!wallet.account ? (
          <button className="primary" onClick={wallet.connect} disabled={!wallet.available}>{wallet.available ? "Connect wallet" : "Install a wallet"}</button>
        ) : (
          <button className="primary" onClick={onLaunch} disabled={busy || !name || !symbol || predicted?.taken}>Launch token + pool</button>
        )}
        <TxStatus state={tx} />

        {launch && (
          <div className="creator">
            <span className="field-label">Creator only · description</span>
            <div className="row">
              <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this token?" maxLength={120} />
              <button className="ghost" onClick={onDescribe} disabled={!description || textTx.status === "wallet" || textTx.status === "pending"}>Set</button>
            </div>
            <TxStatus state={textTx} />
            {savedText !== null && <span className="hint">ENS description → “{savedText}”</span>}
          </div>
        )}
      </section>

      <section className="stage">
        {!launch ? (
          <div className="launch-idle">
            <div className="stack">
              {["Token", "Pool", "Liquidity", "ENS record"].map((label, index) => (
                <motion.div key={label} className="stack-item" initial={{ opacity: 0, x: -10 }} animate={{ opacity: busy ? 1 : 0.5, x: 0 }} transition={{ delay: index * 0.08 }}>
                  <span className={busy ? "spin" : ""}>{busy ? "◌" : index + 1}</span>{label}
                </motion.div>
              ))}
            </div>
            <p className="caption">One transaction. Only this launchpad can declare the pool, and only once.</p>
          </div>
        ) : (
          <div className="launch-done">
            {steps.map((step, index) => (
              <motion.div key={step.label} className={`step ${step.done ? "step-done" : ""}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.35 }}>
                <motion.span className="check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: index * 0.35 + 0.15 }}>{step.done ? "✓" : "◌"}</motion.span>
                <span className="step-label">{step.label}</span>
                <span>{step.value}</span>
              </motion.div>
            ))}
            <motion.div className="row actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
              <button className="primary" onClick={() => goSwap(launch.token)}>Buy it →</button>
              <button className="ghost" onClick={() => goLookAlike(launch.token)}>Add a look-alike pool</button>
            </motion.div>
          </div>
        )}
      </section>
    </div>
  );
}
