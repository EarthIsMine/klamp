import { parseEther } from "viem";
import type {
  CandidatePool,
  CanonicalPoolRecord,
  CanonicalPoolResult,
  Evidence,
  HexAddress,
  LaunchReceipt,
  NaiveOutcome,
  NaiveSelection,
  PoolKey,
  PresentationSnapshot,
  QuoteBoard,
  Requote,
  ResolvedCanonicalPool,
  SealStatus,
  SwapExecution,
} from "@/domain/protocol";
import { getCanonicalPool, quoteExactIn, readLaunch, readSeal, readSwap, sepoliaClient, tokenName } from "@/data/protocol/sepolia";

/**
 * The UI only talks to this port. `sepoliaProtocolClient` reads Sepolia live; `mockProtocolClient`
 * replays the recorded snapshot and backs the presentation seek.
 */
export interface ProtocolClient {
  launchToken(): Promise<LaunchReceipt>;
  quoteCandidates(token: HexAddress): Promise<QuoteBoard>;
  naivePick(board: QuoteBoard): Promise<NaiveSelection>;
  resolveCanonicalPool(token: HexAddress): Promise<ResolvedCanonicalPool>;
  readSeal(): Promise<SealStatus>;
  requoteCanonical(key: PoolKey, poolId: HexAddress): Promise<Requote>;
  buildAndExecute(requote: Requote): Promise<SwapExecution>;
  executeNaive(selection: NaiveSelection): Promise<NaiveOutcome>;
  getPresentationSnapshot?(): PresentationSnapshot;
}

/*
 * Sepolia values: team deployment (contract/deployments/sepolia.phase1.json, demo-pathA.json), the
 * read-only demo CLI run for 0.0005 ETH (quotes, verdict, requote) and the team's Klamp-mode swap tx.
 * The undeclared pool is real (PoolSeeder, same honest hook). Only the final outcome is simulated: it
 * assumes that pool's hook charged 10% at swap time, because the attack pool is not deployed yet.
 */
const ZERO: HexAddress = "0x0000000000000000000000000000000000000000";
const KHOOK: HexAddress = "0x4cB41E85e1E16D7de576e2a262fF1b96eE948b96";
const DELTA_FEE_HOOK: HexAddress = "0x8CcDe930348ecA47D39A0104807acb0e16F6c044";
const DEMO_LAUNCHPAD: HexAddress = "0x8FEf655cA19cAf33C92E3627ff9FA0E35bAf3260";
const REGISTRAR: HexAddress = "0x820bE7B9aCdc7293A96cf7D4E10fd5e42fB1B36f";
const TOKENS_RESOLVER: HexAddress = "0xa783344Fa423AC738D99cdfcaF1cB2Bc6B5ddC18";
const POOL_MANAGER: HexAddress = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const CREATOR: HexAddress = "0xFdE8F95394e7C4ae5d7D6667EE6582587494a9e1";
const CANONICAL_POOL_ID: HexAddress = "0xcd973bc92799db8b453d1b4d897a44b6fd35f1990f153c3ff0a05e140cce95f6";
const UNDECLARED_POOL_ID: HexAddress = "0x84dd01cd1ef705c5a832af11a957284febdab0d2d8e318112c16a15d979f35e4";
const V4_QUOTER: HexAddress = "0x61b3f2011a92d183c7dbadbda940a7555ccf9227";
const UNIVERSAL_ROUTER: HexAddress = "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b";
const CHAIN_ID = 11155111;

export const CANONICAL_KEY: PoolKey = { currency0: ZERO, currency1: KHOOK, fee: 3000, tickSpacing: 60, hooks: DELTA_FEE_HOOK };
const UNDECLARED_KEY: PoolKey = { currency0: ZERO, currency1: KHOOK, fee: 500, tickSpacing: 10, hooks: DELTA_FEE_HOOK };

const LAUNCH_TX: HexAddress = "0x88939990e4361d2a422ce1abad0a3d41f6372a71bb89b6bed2789de86db5e682";
const SWAP_TX: HexAddress = "0x1cf6fddea42c635071e039f954659c1e5422ac33def47925e039f2e0f39ce04e";

const AMOUNT_IN = "0.0005 ETH";
const AMOUNT_IN_WEI = parseEther("0.0005");
const SLIPPAGE_BPS = 500; // demo CLI default
const WIDE_SLIPPAGE_BPS = 1500; // a meme trader's wide tolerance
const CANONICAL_OUT = 196_119.71;
const UNDECLARED_OUT = 196_739.12;
/** The quoted output if the undeclared pool's hook charged 10% at swap time instead of its 1% delta fee. */
const attackedOut = (quoted: number) => Math.round(((quoted * 0.9) / 0.99) * 100) / 100;
const minOut = (quoted: number, bps = SLIPPAGE_BPS) => Math.round(quoted * (1 - bps / 10_000) * 100) / 100;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const RECORDED: Evidence = { kind: "recorded" };
const live = (blockNumber: number | bigint): Evidence => ({ kind: "live", blockNumber: Number(blockNumber) });

// Short on purpose: the scene animation, not a spinner, carries each step in the recorded demo.
const DEMO_DELAY_MS = {
  launch: 900,
  quotes: 450,
  naive: 350,
  lookup: 500,
  seal: 400,
  requote: 450,
  execute: 500,
  naiveExecute: 450,
} as const;

/** Read from Sepolia on 2026-09-27 (block ~11787500): only REGISTRAR and its admin, kept for hooks.klamp.eth, remain. */
const recordedSeal = (): SealStatus => ({
  resolverRootRoles: 0,
  keys: [
    { key: "pool", writers: 1, registrarOnly: true },
    { key: "description", writers: 1, registrarOnly: true },
    { key: "url", writers: 1, registrarOnly: true },
    { key: "avatar", writers: 0, registrarOnly: false },
  ],
  tokensRoles: 0,
  tokensNeverExpires: true,
  klampRoles: 0,
  klampExpiryYear: 3026,
  registryRegistrar: 1,
  registryRegistrarAdmin: 1,
  registryOtherRoles: 0,
  evidence: RECORDED,
});

const CANONICAL_RECORD: CanonicalPoolRecord = {
  chainId: CHAIN_ID,
  ensName: `${KHOOK.toLowerCase()}.tokens.klamp.eth`,
  token: KHOOK,
  poolId: CANONICAL_POOL_ID,
  key: CANONICAL_KEY,
  issuer: DEMO_LAUNCHPAD,
  creator: CREATOR,
  issuerProof: "create2",
  registrar: REGISTRAR,
  resolver: TOKENS_RESOLVER,
  textRecord: `eip155:${CHAIN_ID}:${CANONICAL_POOL_ID}`,
  dataVerified: true,
};

const launchReceipt = (): LaunchReceipt => ({
  txHash: LAUNCH_TX,
  blockNumber: 11786120,
  token: KHOOK,
  symbol: "KHOOK",
  launchpad: DEMO_LAUNCHPAD,
  liquidityLocked: true,
  canonicalPool: CANONICAL_RECORD,
  evidence: RECORDED,
});

const candidates = (): CandidatePool[] => [
  {
    id: "canonical",
    label: "Declared launch pool",
    key: CANONICAL_KEY,
    poolId: CANONICAL_POOL_ID,
    quotedFeeBps: 130,
    quotedOut: CANONICAL_OUT,
    hookBehavior: "0.30% LP + 1% delta fee",
    simulated: false,
  },
  {
    id: "undeclared",
    label: "Undeclared hook pool",
    key: UNDECLARED_KEY,
    poolId: UNDECLARED_POOL_ID,
    quotedFeeBps: 105,
    quotedOut: UNDECLARED_OUT,
    hookBehavior: "0.05% LP + 1% delta fee, created by a third party",
    simulated: false,
  },
];

const quoteBoard = (): QuoteBoard => ({
  amountIn: AMOUNT_IN,
  tokenIn: "ETH",
  tokenOut: "KHOOK",
  quoter: "V4Quoter",
  quoterAddress: V4_QUOTER,
  candidates: candidates(),
  evidence: RECORDED,
});

/** The naive router: the largest quote wins. */
const naiveSelection = (board: QuoteBoard = quoteBoard()): NaiveSelection => {
  const best = board.candidates.reduce((a, b) => (b.quotedOut > a.quotedOut ? b : a));
  return { chosen: best.id, quotedOut: best.quotedOut, slippageBps: SLIPPAGE_BPS, minOut: minOut(best.quotedOut) };
};

const canonicalResult = (): Extract<CanonicalPoolResult, { status: "registered" }> & { evidence: Evidence } => ({
  status: "registered",
  source: "ens",
  chainId: BigInt(CHAIN_ID),
  poolManager: POOL_MANAGER,
  poolId: CANONICAL_POOL_ID,
  key: CANONICAL_KEY,
  evidence: RECORDED,
});

const requote = (): Requote => ({
  poolId: CANONICAL_POOL_ID,
  key: CANONICAL_KEY,
  quoter: "V4Quoter.quoteExactInputSingle",
  quotedOut: CANONICAL_OUT,
  slippageBps: SLIPPAGE_BPS,
  minOut: minOut(CANONICAL_OUT),
  evidence: RECORDED,
});

const execution = (): SwapExecution => ({
  router: "Universal Router",
  routerAddress: UNIVERSAL_ROUTER,
  actions: ["SWAP_EXACT_IN_SINGLE", "SETTLE_ALL", "TAKE_ALL"],
  calldataVerified: true,
  amountIn: AMOUNT_IN,
  receivedOut: 196_197.61,
  hookFeeOut: 1_981.79,
  txHash: SWAP_TX,
  blockNumber: 11786159,
  evidence: RECORDED,
});

const naiveOutcome = (quotedOut = UNDECLARED_OUT): NaiveOutcome => {
  const receivedOut = attackedOut(quotedOut);
  return {
    quotedOut,
    executedFeeBps: 1000,
    receivedOut,
    lossBps: Math.round((1 - receivedOut / quotedOut) * 10_000),
    traderSlippageBps: SLIPPAGE_BPS,
    traderMinOut: minOut(quotedOut),
    wideSlippageBps: WIDE_SLIPPAGE_BPS,
    wideMinOut: minOut(quotedOut, WIDE_SLIPPAGE_BPS),
    simulated: true,
  };
};

export const mockProtocolClient: ProtocolClient = {
  async launchToken() {
    await wait(DEMO_DELAY_MS.launch);
    return launchReceipt();
  },
  async quoteCandidates() {
    await wait(DEMO_DELAY_MS.quotes);
    return quoteBoard();
  },
  async naivePick(board) {
    await wait(DEMO_DELAY_MS.naive);
    return naiveSelection(board);
  },
  async resolveCanonicalPool() {
    await wait(DEMO_DELAY_MS.lookup);
    return canonicalResult();
  },
  async readSeal() {
    await wait(DEMO_DELAY_MS.seal);
    return recordedSeal();
  },
  async requoteCanonical() {
    await wait(DEMO_DELAY_MS.requote);
    return requote();
  },
  async buildAndExecute() {
    await wait(DEMO_DELAY_MS.execute);
    return execution();
  },
  async executeNaive(selection) {
    await wait(DEMO_DELAY_MS.naiveExecute);
    return naiveOutcome(selection.quotedOut);
  },
  getPresentationSnapshot() {
    const launch = launchReceipt();
    const board = quoteBoard();
    const canonical = canonicalResult();
    const undeclared = board.candidates.find((candidate) => candidate.id === "undeclared")!;
    return {
      launch,
      board,
      naive: naiveSelection(),
      canonical,
      seal: recordedSeal(),
      judgement: {
        verdict: "requote_canonical",
        comparison: { status: "mismatch", branch: 0, hop: 0 },
        judgedPoolId: undeclared.poolId,
      },
      requote: requote(),
      execution: execution(),
      naiveOutcome: naiveOutcome(),
    };
  },
};

/** Runs a live read alongside the scene's minimum delay, so a fast RPC does not rush the animation. */
async function paced<T>(ms: number, read: Promise<T>): Promise<T> {
  const [value] = await Promise.all([read, wait(ms)]);
  return value;
}

/**
 * Reads every step from Sepolia in the browser. Quotes and the ENSv2 lookup are fresh on each run; the launch
 * and the Klamp-mode swap are the team's txs, decoded from their receipts and calldata. A launch, quote or swap
 * read that fails falls back to the recorded value and is labelled as such. A failed ENS lookup stays
 * `lookup_failed`, as in the SDK: it is never replaced by a recorded `registered`.
 */
export const sepoliaProtocolClient: ProtocolClient = {
  async launchToken() {
    try {
      const launch = await paced(DEMO_DELAY_MS.launch, readLaunch(LAUNCH_TX));
      return {
        ...launchReceipt(),
        blockNumber: launch.blockNumber,
        token: launch.token,
        launchpad: launch.issuer,
        canonicalPool: {
          ...CANONICAL_RECORD,
          ensName: tokenName(launch.token),
          token: launch.token,
          poolId: launch.poolId,
          key: launch.key,
          issuer: launch.issuer,
          creator: launch.creator,
          textRecord: `eip155:${CHAIN_ID}:${launch.poolId}`,
        },
        evidence: live(launch.blockNumber),
      };
    } catch {
      return launchReceipt();
    }
  },
  async quoteCandidates() {
    // Candidate discovery is the router's job; the two KHOOK/ETH pools are fixed, their quotes are live.
    const read = async () => {
      const blockNumber = await sepoliaClient.getBlockNumber();
      const pools = candidates();
      const quotes = await Promise.all(pools.map((pool) => quoteExactIn(pool.key, AMOUNT_IN_WEI, blockNumber)));
      if (quotes.some((quote) => quote === null)) return quoteBoard();
      return { ...quoteBoard(), candidates: pools.map((pool, index) => ({ ...pool, quotedOut: quotes[index]! })), evidence: live(blockNumber) };
    };
    return paced(DEMO_DELAY_MS.quotes, read().catch(() => quoteBoard()));
  },
  async naivePick(board) {
    await wait(DEMO_DELAY_MS.naive);
    return naiveSelection(board);
  },
  async resolveCanonicalPool(token) {
    const lookup = await paced(DEMO_DELAY_MS.lookup, getCanonicalPool(token));
    return lookup.blockNumber === null ? lookup.result : { ...lookup.result, evidence: live(lookup.blockNumber) };
  },
  async readSeal() {
    const read = async () => {
      const { blockNumber, ...seal } = await readSeal();
      return { ...seal, evidence: live(blockNumber) };
    };
    return paced(DEMO_DELAY_MS.seal, read().catch(() => recordedSeal()));
  },
  async requoteCanonical(key, poolId) {
    const read = async () => {
      const blockNumber = await sepoliaClient.getBlockNumber();
      const quotedOut = await quoteExactIn(key, AMOUNT_IN_WEI, blockNumber);
      if (quotedOut === null) return requote();
      return { ...requote(), key, poolId, quotedOut, minOut: minOut(quotedOut), evidence: live(blockNumber) };
    };
    return paced(DEMO_DELAY_MS.requote, read().catch(() => requote()));
  },
  async buildAndExecute(judged) {
    try {
      const swap = await paced(DEMO_DELAY_MS.execute, readSwap(SWAP_TX, judged.key.currency1));
      return {
        ...execution(),
        routerAddress: swap.router ?? UNIVERSAL_ROUTER,
        calldataVerified: swap.pools.length > 0 && swap.pools.every((poolId) => poolId.toLowerCase() === judged.poolId.toLowerCase()),
        receivedOut: swap.receivedOut,
        hookFeeOut: swap.hookFeeOut,
        blockNumber: swap.blockNumber,
        evidence: live(swap.blockNumber),
      };
    } catch {
      return execution();
    }
  },
  async executeNaive(selection) {
    await wait(DEMO_DELAY_MS.naiveExecute);
    return naiveOutcome(selection.quotedOut);
  },
  getPresentationSnapshot: mockProtocolClient.getPresentationSnapshot,
};
