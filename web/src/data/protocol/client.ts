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

const AMOUNT_IN = "0.0005 ETH";
const SLIPPAGE_BPS = 500; // demo CLI default
const WIDE_SLIPPAGE_BPS = 1500; // a meme trader's wide tolerance
const CANONICAL_OUT = 196_119.71;
const UNDECLARED_OUT = 196_739.12;
const ATTACKED_OUT = 178_853.75; // UNDECLARED_OUT × 0.90 / 0.99: the 1% delta fee replaced by 10%
const minOut = (quoted: number, bps = SLIPPAGE_BPS) => Math.round(quoted * (1 - bps / 10_000) * 100) / 100;

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
});

const naiveSelection = (): NaiveSelection => ({
  chosen: "undeclared",
  quotedOut: UNDECLARED_OUT,
  slippageBps: SLIPPAGE_BPS,
  minOut: minOut(UNDECLARED_OUT),
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
  routerAddress: UNIVERSAL_ROUTER,
  actions: ["SWAP_EXACT_IN_SINGLE", "SETTLE_ALL", "TAKE_ALL"],
  calldataVerified: true,
  amountIn: AMOUNT_IN,
  receivedOut: 196_197.61,
  hookFeeOut: 1_981.79,
  txHash: "0x1cf6fddea42c635071e039f954659c1e5422ac33def47925e039f2e0f39ce04e",
  blockNumber: 11786159,
});

const naiveOutcome = (): NaiveOutcome => ({
  quotedOut: UNDECLARED_OUT,
  executedFeeBps: 1000,
  receivedOut: ATTACKED_OUT,
  lossBps: Math.round((1 - ATTACKED_OUT / UNDECLARED_OUT) * 10_000),
  traderSlippageBps: SLIPPAGE_BPS,
  traderMinOut: minOut(UNDECLARED_OUT),
  wideSlippageBps: WIDE_SLIPPAGE_BPS,
  wideMinOut: minOut(UNDECLARED_OUT, WIDE_SLIPPAGE_BPS),
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
    const undeclared = board.candidates.find((candidate) => candidate.id === "undeclared")!;
    return {
      launch,
      board,
      naive: naiveSelection(),
      canonical,
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
