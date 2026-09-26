import {
  createPublicClient,
  decodeAbiParameters,
  decodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  formatUnits,
  hexToBytes,
  http,
  isAddress,
  keccak256,
  namehash,
  parseAbi,
  parseAbiParameters,
  parseEventLogs,
  toBytes,
  toHex,
} from "viem";
import { sepolia } from "viem/chains";
import { normalize, packetToBytes } from "viem/ens";
import type { CanonicalPoolResult, HexAddress, PoolKey, SealStatus } from "@/domain/protocol";

/**
 * Live Sepolia reads for the browser. A port of contract/sdk/canonicalPool.ts (same checks, same
 * `registered | not_registered | lookup_failed` states) plus V4Quoter quotes and receipt decoding.
 * Addresses come from contract/deployments/sepolia.phase1.json.
 */
export const SEPOLIA = {
  chainId: 11155111n,
  universalResolver: "0x5d25c1d6acbb71b7a28aa7899618a3412a8303e3",
  rootRegistry: "0x9703DBD26dAB89504490994138cF2c575251a9cE",
  ethRegistry: "0x657ea849311d3d5823348dded7c2aaafb3ede09e",
  registry: "0x32beA21696e8615583139f92F11349C32F3a6064",
  resolver: "0xa783344Fa423AC738D99cdfcaF1cB2Bc6B5ddC18",
  registryImplementation: "0xa80338aaa8d23831cea25e858d1774534abb0263",
  resolverImplementation: "0x14f09fd05d4585759e54844dc9b00147131cf243",
  registrar: "0x820bE7B9aCdc7293A96cf7D4E10fd5e42fB1B36f",
  poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  stateView: "0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c",
  v4Quoter: "0x61b3f2011a92d183c7dbadbda940a7555ccf9227",
} as const satisfies Record<string, HexAddress | bigint>;

const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
export const sepoliaClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL, { retryCount: 1 }) });

const equal = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const poolKeyAbi = {
  type: "tuple",
  components: [
    { name: "currency0", type: "address" },
    { name: "currency1", type: "address" },
    { name: "fee", type: "uint24" },
    { name: "tickSpacing", type: "int24" },
    { name: "hooks", type: "address" },
  ],
} as const;
export const poolIdOf = (key: PoolKey) => keccak256(encodeAbiParameters([poolKeyAbi], [key]));

export function tokenName(token: HexAddress): string {
  return normalize(`${token.toLowerCase()}.tokens.klamp.eth`);
}

const registryAbi = parseAbi(["function getSubregistry(string) view returns (address)", "function getResolver(string) view returns (address)"]);
const stateAbi = parseAbi(["function poolManager() view returns (address)", "function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)"]);
const dataAbi = parseAbi(["function data(bytes32 node, string key) view returns (bytes)"]);
const universalAbi = parseAbi([
  "function ROOT_REGISTRY() view returns (address)",
  "function findResolver(bytes) view returns (address,bytes32,uint256)",
  "function resolve(bytes name, bytes data) view returns (bytes, address)",
]);
const eip1967 = toHex(BigInt(keccak256(toBytes("eip1967.proxy.implementation"))) - 1n, { size: 32 });

/** Mirrors verifyNamespace: klamp.eth, tokens.klamp.eth and their implementations are the pinned ones. */
async function verifyNamespace(token: HexAddress, blockNumber: bigint): Promise<boolean> {
  const c = SEPOLIA;
  const read = (address: HexAddress, functionName: "getSubregistry" | "getResolver", label: string) =>
    sepoliaClient.readContract({ address, abi: registryAbi, functionName, args: [label], blockNumber });
  const [root, eth, registry, resolver, manager, resolved, ri, pi] = await Promise.all([
    sepoliaClient.readContract({ address: c.universalResolver, abi: universalAbi, functionName: "ROOT_REGISTRY", blockNumber }),
    read(c.rootRegistry, "getSubregistry", "eth"),
    read(c.ethRegistry, "getSubregistry", "klamp"),
    read(c.registry, "getResolver", "tokens"),
    sepoliaClient.readContract({ address: c.stateView, abi: stateAbi, functionName: "poolManager", blockNumber }),
    sepoliaClient.readContract({ address: c.universalResolver, abi: universalAbi, functionName: "findResolver", args: [toHex(packetToBytes(tokenName(token)))], blockNumber }),
    sepoliaClient.getStorageAt({ address: c.registry, slot: eip1967, blockNumber }),
    sepoliaClient.getStorageAt({ address: c.resolver, slot: eip1967, blockNumber }),
  ]);
  return equal(root, c.rootRegistry) && equal(eth, c.ethRegistry) && equal(registry, c.registry) && equal(resolver, c.resolver)
    && equal(manager, c.poolManager) && equal(resolved[0], c.resolver)
    && !!ri && equal(`0x${ri.slice(-40)}`, c.registryImplementation)
    && !!pi && equal(`0x${pi.slice(-40)}`, c.resolverImplementation);
}

export type CanonicalPoolLookup = {
  result: CanonicalPoolResult;
  ensName: string | null;
  blockNumber: bigint | null;
  /** Raw `text("pool")`, when the resolver returned one. */
  textRecord: string | null;
};

/** Mirrors contract/sdk/canonicalPool.ts getCanonicalPool. Every failure is lookup_failed, never not_registered. */
export async function getCanonicalPool(token: string): Promise<CanonicalPoolLookup> {
  const failed = (reason: Extract<CanonicalPoolResult, { status: "lookup_failed" }>["reason"], rest: Partial<CanonicalPoolLookup> = {}): CanonicalPoolLookup =>
    ({ ensName: null, blockNumber: null, textRecord: null, ...rest, result: { status: "lookup_failed", reason } });
  if (!isAddress(token) || /^0x0{40}$/i.test(token)) return failed("format");
  const name = tokenName(token);

  let blockNumber: bigint;
  try {
    if (BigInt(await sepoliaClient.getChainId()) !== SEPOLIA.chainId) return failed("chain", { ensName: name });
    blockNumber = await sepoliaClient.getBlockNumber();
  } catch {
    return failed("rpc", { ensName: name });
  }
  const base = { ensName: name, blockNumber };
  try {
    if (!(await verifyNamespace(token, blockNumber))) return failed("namespace", base);
  } catch {
    return failed("namespace", base);
  }

  let value: string | null;
  try {
    value = await sepoliaClient.getEnsText({ name, key: "pool", universalResolverAddress: SEPOLIA.universalResolver, strict: true, blockNumber });
  } catch {
    return failed("resolution", base);
  }
  if (value === null || value === "") return { ...base, textRecord: null, result: { status: "not_registered" } };
  const withText = { ...base, textRecord: value };
  const match = /^eip155:([1-9][0-9]*):(0x[0-9a-fA-F]{64})$/.exec(value);
  if (!match) return failed("format", withText);
  const chainId = BigInt(match[1]);
  const poolId = match[2].toLowerCase() as HexAddress;
  if (chainId !== SEPOLIA.chainId) return failed("chain", withText);

  // data("pool") = abi.encode(chainId, PoolKey), read through UniversalResolver.resolve like getEnsText.
  let raw: HexAddress;
  try {
    const call = encodeFunctionData({ abi: dataAbi, functionName: "data", args: [namehash(name), "pool"] });
    const [result, resolver] = await sepoliaClient.readContract({
      address: SEPOLIA.universalResolver, abi: universalAbi, functionName: "resolve", args: [toHex(packetToBytes(name)), call], blockNumber,
    });
    if (!equal(resolver, SEPOLIA.resolver)) return failed("namespace", withText);
    raw = decodeFunctionResult({ abi: dataAbi, functionName: "data", data: result });
  } catch {
    return failed("resolution", withText);
  }

  let key: PoolKey;
  try {
    const [dataChainId, decoded] = decodeAbiParameters([{ type: "uint256" }, poolKeyAbi], raw);
    key = decoded;
    if (dataChainId !== SEPOLIA.chainId || !equal(poolIdOf(key), poolId) || (!equal(key.currency0, token) && !equal(key.currency1, token))) {
      return failed("record-mismatch", withText);
    }
  } catch {
    return failed("record-mismatch", withText);
  }

  try {
    const [price] = await sepoliaClient.readContract({ address: SEPOLIA.stateView, abi: stateAbi, functionName: "getSlot0", args: [poolId], blockNumber });
    if (price === 0n) return failed("pool-uninitialized", withText);
  } catch {
    return failed("rpc", withText);
  }
  return { ...withText, result: { status: "registered", source: "ens", chainId, poolManager: SEPOLIA.poolManager, poolId, key } };
}

const quoterAbi = parseAbi([
  "function quoteExactInputSingle(((address,address,uint24,int24,address) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData) params) returns (uint256 amountOut, uint256 gasEstimate)",
]);

/** V4Quoter exact-in quote, currency0 → currency1. `null` when the quoter reverts or the RPC fails. */
export async function quoteExactIn(key: PoolKey, amountIn: bigint, blockNumber?: bigint, decimals = 18): Promise<number | null> {
  try {
    const { result } = await sepoliaClient.simulateContract({
      blockNumber,
      address: SEPOLIA.v4Quoter,
      abi: quoterAbi,
      functionName: "quoteExactInputSingle",
      args: [{ poolKey: [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks], zeroForOne: true, exactAmount: amountIn, hookData: "0x" }],
    });
    return Number(formatUnits(result[0], decimals));
  } catch {
    return null;
  }
}

const launchEvents = parseAbi([
  "event CanonicalRecorded(address indexed token, bytes32 indexed poolId, address indexed issuer, address creator)",
  "event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)",
]);

/** Decodes a launch tx: the registrar's CanonicalRecorded event and the PoolManager Initialize of that pool. */
export async function readLaunch(txHash: HexAddress) {
  const receipt = await sepoliaClient.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("launch tx reverted");
  const logs = parseEventLogs({ abi: launchEvents, logs: receipt.logs });
  const recorded = logs.find((log) => log.eventName === "CanonicalRecorded" && equal(log.address, SEPOLIA.registrar));
  if (!recorded || recorded.eventName !== "CanonicalRecorded") throw new Error("no CanonicalRecorded event");
  const init = logs.find((log) => log.eventName === "Initialize" && equal(log.address, SEPOLIA.poolManager) && equal(log.args.id, recorded.args.poolId));
  if (!init || init.eventName !== "Initialize") throw new Error("no Initialize event for the recorded pool");
  const key: PoolKey = {
    currency0: init.args.currency0, currency1: init.args.currency1, fee: init.args.fee, tickSpacing: init.args.tickSpacing, hooks: init.args.hooks,
  };
  return {
    blockNumber: Number(receipt.blockNumber),
    token: recorded.args.token,
    poolId: recorded.args.poolId,
    issuer: recorded.args.issuer,
    creator: recorded.args.creator,
    key,
  };
}

const transferEvent = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 value)"]);
const routerAbi = parseAbi(["function execute(bytes commands, bytes[] inputs, uint256 deadline) payable"]);
const V4_SWAP = 0x10;
const SWAP_EXACT_IN_SINGLE = 0x06;
const exactInSingleAbi = [{
  type: "tuple",
  components: [
    { ...poolKeyAbi, name: "poolKey" },
    { name: "zeroForOne", type: "bool" },
    { name: "amountIn", type: "uint128" },
    { name: "amountOutMinimum", type: "uint128" },
    { name: "hookData", type: "bytes" },
  ],
}] as const;

/** Every v4 pool a Universal Router `execute` call swaps through (port of verifySwapCalldata in the demo SDK). */
export function swapPoolIds(calldata: HexAddress): HexAddress[] {
  const { args } = decodeFunctionData({ abi: routerAbi, data: calldata });
  const [commands, inputs] = args;
  const pools: HexAddress[] = [];
  hexToBytes(commands).forEach((command, index) => {
    if ((command & 0x3f) !== V4_SWAP) return;
    const [actions, params] = decodeAbiParameters(parseAbiParameters("bytes, bytes[]"), inputs[index]);
    hexToBytes(actions).forEach((action, j) => {
      if (action === SWAP_EXACT_IN_SINGLE) pools.push(poolIdOf(decodeAbiParameters(exactInSingleAbi, params[j])[0].poolKey));
      else if (action === 0x07 || action === 0x08 || action === 0x09) throw new Error("multi-hop and exact-out actions are not decoded");
    });
  });
  return pools;
}

/**
 * Decodes a v4 swap tx: the pools its Universal Router calldata swaps through, and `token` transfers out of the PoolManager. The delta-fee hook takes its fee in the
 * same token during afterSwap, so the larger transfer is the swap output and the smaller one the hook fee.
 */
export async function readSwap(txHash: HexAddress, token: HexAddress, decimals = 18) {
  const [receipt, tx] = await Promise.all([
    sepoliaClient.getTransactionReceipt({ hash: txHash }),
    sepoliaClient.getTransaction({ hash: txHash }),
  ]);
  if (receipt.status !== "success") throw new Error("swap tx reverted");
  const amounts = parseEventLogs({ abi: transferEvent, logs: receipt.logs })
    .filter((log) => equal(log.address, token) && equal(log.args.from, SEPOLIA.poolManager))
    .map((log) => log.args.value)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  if (amounts.length === 0) throw new Error("no output transfer");
  return {
    blockNumber: Number(receipt.blockNumber),
    router: tx.to,
    pools: swapPoolIds(tx.input),
    receivedOut: Number(formatUnits(amounts[0], decimals)),
    hookFeeOut: amounts[1] === undefined ? 0 : Number(formatUnits(amounts[1], decimals)),
  };
}

const eacAbi = parseAbi([
  "function roleCount(uint256 resource) view returns (uint256)",
  "function hasRoles(uint256 resource, uint256 roleBitmap, address account) view returns (bool)",
  "function getResource(uint256 anyId) view returns (uint256)",
  "function getExpiry(uint256 anyId) view returns (uint64)",
]);
// ENSv2 roles are 4-bit slots (RegistryRolesLib, PermissionedResolverLib); roleCount packs one holder count per slot.
const holders = (packed: bigint) => {
  let total = 0;
  for (let rest = packed; rest > 0n; rest >>= 4n) total += Number(rest & 0xfn);
  return total;
};
const slot = (bit: bigint) => 0xfn << bit;
const REGISTRAR_SLOTS = slot(0n) | slot(128n); // ROLE_REGISTRAR and its admin
const SET_TEXT = 4n;
const SET_DATA = 24n;
const labelId = (label: string) => BigInt(keccak256(toBytes(label)));
const NEVER = (1n << 64n) - 1n;
const SEAL_KEYS = ["pool", "description", "url", "avatar"] as const;

/** Reads who can still write or change the namespace: root roles, per-key writers, and both names' roles and expiry. */
export async function readSeal(): Promise<SealStatus & { blockNumber: number }> {
  const blockNumber = await sepoliaClient.getBlockNumber();
  const roleCount = (address: HexAddress, resource: bigint) =>
    sepoliaClient.readContract({ address, abi: eacAbi, functionName: "roleCount", args: [resource], blockNumber });
  const read = (address: HexAddress, functionName: "getResource" | "getExpiry", label: string) =>
    sepoliaClient.readContract({ address, abi: eacAbi, functionName, args: [labelId(label)], blockNumber });
  const registrarWrites = (key: string, bit: bigint) =>
    sepoliaClient.readContract({ address: SEPOLIA.resolver, abi: eacAbi, functionName: "hasRoles", args: [labelId(key), 1n << bit, SEPOLIA.registrar], blockNumber });

  const [tokensResource, klampResource, tokensExpiry, klampExpiry] = await Promise.all([
    read(SEPOLIA.registry, "getResource", "tokens"),
    read(SEPOLIA.ethRegistry, "getResource", "klamp"),
    read(SEPOLIA.registry, "getExpiry", "tokens"),
    read(SEPOLIA.ethRegistry, "getExpiry", "klamp"),
  ]);
  const [resolverRoot, registryRoot, tokensRoles, klampRoles, keys] = await Promise.all([
    roleCount(SEPOLIA.resolver, 0n),
    roleCount(SEPOLIA.registry, 0n),
    roleCount(SEPOLIA.registry, tokensResource),
    roleCount(SEPOLIA.ethRegistry, klampResource),
    Promise.all(SEAL_KEYS.map(async (key) => {
      // Per-key resources hold text writers, and for `pool` also data writers.
      const [packed, text, data] = await Promise.all([roleCount(SEPOLIA.resolver, labelId(key)), registrarWrites(key, SET_TEXT), registrarWrites(key, SET_DATA)]);
      const writers = holders(packed & slot(SET_TEXT));
      const dataWriters = holders(packed & slot(SET_DATA));
      const registrarOnly = writers === 1 && text && (key === "pool" ? dataWriters === 1 && data : dataWriters === 0);
      return { key, writers: Math.max(writers, dataWriters), registrarOnly };
    })),
  ]);
  return {
    blockNumber: Number(blockNumber),
    resolverRootRoles: holders(resolverRoot),
    keys,
    tokensRoles: holders(tokensRoles),
    tokensNeverExpires: tokensExpiry === NEVER,
    klampRoles: holders(klampRoles),
    klampExpiryYear: new Date(Number(klampExpiry) * 1000).getUTCFullYear(),
    registryRegistrar: holders(registryRoot & slot(0n)),
    registryOtherRoles: holders(registryRoot & ~REGISTRAR_SLOTS),
  };
}
