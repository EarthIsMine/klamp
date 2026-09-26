import type {
  CandidatePool,
  CanonicalPoolRecord,
  CanonicalPoolResult,
  HexAddress,
  LaunchReceipt,
  NaiveOutcome,
  NaiveSelection,
  PoolKey,
  PresentationSnapshot,
  QuoteBoard,
  Requote,
  SwapExecution,
} from "@/domain/protocol";

/**
 * The UI only talks to this port. A viem-backed Sepolia adapter (contract/demo/sepolia/klamp-sdk.mjs)
 * can replace the mock without changing demo components or Zustand state.
 */
export interface ProtocolClient {
  launchToken(): Promise<LaunchReceipt>;
  quoteCandidates(token: HexAddress): Promise<QuoteBoard>;
  naivePick(board: QuoteBoard): Promise<NaiveSelection>;
  resolveCanonicalPool(token: HexAddress): Promise<CanonicalPoolResult>;
  requoteCanonical(key: PoolKey, poolId: HexAddress): Promise<Requote>;
  buildAndExecute(requote: Requote): Promise<SwapExecution>;
  executeNaive(selection: NaiveSelection): Promise<NaiveOutcome>;
  getPresentationSnapshot?(): PresentationSnapshot;
}

/*
 * Sepolia values from the team deployment (contract/deployments/sepolia.phase1.json, demo-pathA.json)
 * and the read-only demo CLI run for 0.0005 ETH. The replica pool and its swap-time fee are simulated:
 * the attack pool is not deployed yet.
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
const REPLICA_POOL_ID: HexAddress = "0x93e858d08aafd523583e476f5ba44490f4d14a7cb7ac91cdb8a5bed452ea6da1";
const REPLICA_HOOK: HexAddress = "0xB665A4B5C889DA8ACF911378a9DB3497792C00C0";
const CHAIN_ID = 11155111;

export const CANONICAL_KEY: PoolKey = { currency0: ZERO, currency1: KHOOK, fee: 3000, tickSpacing: 60, hooks: DELTA_FEE_HOOK };
const REPLICA_KEY: PoolKey = { currency0: ZERO, currency1: KHOOK, fee: 0x800000, tickSpacing: 60, hooks: REPLICA_HOOK };

const AMOUNT_IN = "0.0005 ETH";
const SLIPPAGE_BPS = 1500; // A meme trader's wide tolerance: the replica's 10% fee still executes.
const CANONICAL_OUT = 196_119.71;
const REPLICA_QUOTE_OUT = 198_597.46;
const REPLICA_RECEIVED_OUT = 178_827.13;
const minOut = (quoted: number) => Math.round(quoted * (1 - SLIPPAGE_BPS / 10_000) * 100) / 100;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEMO_DELAY_MS = {
  launch: 1450,
  quotes: 1200,
  naive: 900,
  lookup: 1325,
  requote: 1200,
  execute: 1450,
  naiveExecute: 1300,
} as const;

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
  txHash: "0x88939990e4361d2a422ce1abad0a3d41f6372a71bb89b6bed2789de86db5e682",
  blockNumber: 11786120,
  token: KHOOK,
  symbol: "KHOOK",
  launchpad: DEMO_LAUNCHPAD,
  liquidityLocked: true,
  canonicalPool: CANONICAL_RECORD,
});

const candidates = (): CandidatePool[] => [
  {
    id: "canonical",
    label: "Declared launch pool",
    key: CANONICAL_KEY,
    poolId: CANONICAL_POOL_ID,
    quotedFeeBps: 130,
    quotedOut: CANONICAL_OUT,
    hookBehavior: "0.30% LP + 1% delta fee, same at quote and swap",
    simulated: false,
  },
  {
    id: "replica",
    label: "Look-alike hook pool",
    key: REPLICA_KEY,
    poolId: REPLICA_POOL_ID,
    quotedFeeBps: 5,
    quotedOut: REPLICA_QUOTE_OUT,
    hookBehavior: "0.05% when quoted, 10% when swapped",
    simulated: true,
  },
];

const quoteBoard = (): QuoteBoard => ({
  amountIn: AMOUNT_IN,
  tokenIn: "ETH",
  tokenOut: "KHOOK",
  quoter: "V4Quoter",
  candidates: candidates(),
});

const naiveSelection = (): NaiveSelection => ({
  chosen: "replica",
  quotedOut: REPLICA_QUOTE_OUT,
  slippageBps: SLIPPAGE_BPS,
  minOut: minOut(REPLICA_QUOTE_OUT),
});

const canonicalResult = (): Extract<CanonicalPoolResult, { status: "registered" }> => ({
  status: "registered",
  source: "ens",
  chainId: BigInt(CHAIN_ID),
  poolManager: POOL_MANAGER,
  poolId: CANONICAL_POOL_ID,
  key: CANONICAL_KEY,
});

const requote = (): Requote => ({
  poolId: CANONICAL_POOL_ID,
  key: CANONICAL_KEY,
  quoter: "V4Quoter.quoteExactInputSingle",
  quotedOut: CANONICAL_OUT,
  slippageBps: SLIPPAGE_BPS,
  minOut: minOut(CANONICAL_OUT),
});

const execution = (): SwapExecution => ({
  router: "Universal Router",
  actions: ["SWAP_EXACT_IN_SINGLE", "SETTLE_ALL", "TAKE_ALL"],
  calldataVerified: true,
  receivedOut: CANONICAL_OUT,
});

const naiveOutcome = (): NaiveOutcome => ({
  quotedOut: REPLICA_QUOTE_OUT,
  executedFeeBps: 1000,
  minOut: minOut(REPLICA_QUOTE_OUT),
  receivedOut: REPLICA_RECEIVED_OUT,
  lossBps: Math.round((1 - REPLICA_RECEIVED_OUT / REPLICA_QUOTE_OUT) * 10_000),
  simulated: true,
});

export const mockProtocolClient: ProtocolClient = {
  async launchToken() {
    await wait(DEMO_DELAY_MS.launch);
    return launchReceipt();
  },
  async quoteCandidates() {
    await wait(DEMO_DELAY_MS.quotes);
    return quoteBoard();
  },
  async naivePick() {
    await wait(DEMO_DELAY_MS.naive);
    return naiveSelection();
  },
  async resolveCanonicalPool() {
    await wait(DEMO_DELAY_MS.lookup);
    return canonicalResult();
  },
  async requoteCanonical() {
    await wait(DEMO_DELAY_MS.requote);
    return requote();
  },
  async buildAndExecute() {
    await wait(DEMO_DELAY_MS.execute);
    return execution();
  },
  async executeNaive() {
    await wait(DEMO_DELAY_MS.naiveExecute);
    return naiveOutcome();
  },
  getPresentationSnapshot() {
    const launch = launchReceipt();
    const board = quoteBoard();
    const canonical = canonicalResult();
    const replica = board.candidates.find((candidate) => candidate.id === "replica")!;
    return {
      launch,
      board,
      naive: naiveSelection(),
      canonical,
      judgement: {
        verdict: "requote_canonical",
        comparison: { status: "mismatch", branch: 0, hop: 0 },
        judgedPoolId: replica.poolId,
      },
      requote: requote(),
      execution: execution(),
      naiveOutcome: naiveOutcome(),
    };
  },
};
