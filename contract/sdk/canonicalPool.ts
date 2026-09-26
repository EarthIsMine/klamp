import { createPublicClient, http, keccak256, toBytes, toHex as numberToHex, isAddress, parseAbi, toHex, decodeAbiParameters, decodeFunctionResult, encodeFunctionData, namehash, type Address, type Hex, type PublicClient } from 'viem';
import { normalize, packetToBytes } from 'viem/ens';
import { hashPoolKey, poolKeyAbi, type PoolKey } from './poolKey.js';

export type CanonicalPoolResult =
  | { status: 'registered'; source: 'ens' | 'launch-event'; chainId: bigint; poolManager: Address; poolId: Hex; key: PoolKey; warning?: 'launch-pool-differs' }
  | { status: 'not_registered' }
  | { status: 'lookup_failed'; reason: LookupFailure };
/** Every failure is a lookup failure: never shown as "not registered" and never bypassed by the user. */
export type LookupFailure =
  | 'rpc' | 'resolution' | 'namespace' // RPC error, not the pinned resolver/namespace
  | 'format' | 'chain' | 'pool-uninitialized' | 'record-mismatch' // record present but not valid for this chain
  | 'multiple-launch-pools'; // conflicting trusted launch events
export interface NetworkConfig {
  chainId: bigint;
  poolManager: Address; stateView: Address; universalResolver: Address;
  rootRegistry: Address; ethRegistry: Address; registry: Address; resolver: Address;
  registryImplementation: Address; resolverImplementation: Address;
}
export const stateAbi = parseAbi([
  'function poolManager() view returns (address)',
  'function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)',
]);
const registryAbi = parseAbi(['function getSubregistry(string) view returns (address)', 'function getResolver(string) view returns (address)']);
const dataAbi = parseAbi(['function data(bytes32 node, string key) view returns (bytes)']);
const universalAbi = parseAbi(['function ROOT_REGISTRY() view returns (address)', 'function findResolver(bytes) view returns (address,bytes32,uint256)', 'function resolve(bytes name, bytes data) view returns (bytes, address)']);
// EIP-1967 slot, computed from the standard (full 32-byte value).
const eip1967 = numberToHex(BigInt(keccak256(toBytes('eip1967.proxy.implementation'))) - 1n, { size: 32 });
export function createReader(rpcUrl: string): PublicClient { return createPublicClient({ transport: http(rpcUrl, { retryCount: 0 }) }); }
export function tokenName(token: Address): string {
  if (!isAddress(token)) throw new Error('Invalid token address');
  return normalize(`${token.toLowerCase()}.tokens.klamp.eth`);
}
export function parsePoolRecord(value: string): { chainId: bigint; poolId: Hex } | null {
  const m = /^eip155:([1-9][0-9]*):(0x[0-9a-fA-F]{64})$/.exec(value);
  return m ? { chainId: BigInt(m[1]), poolId: m[2].toLowerCase() as Hex } : null;
}
const equal = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export async function verifyNamespace(client: PublicClient, c: NetworkConfig, token: Address, blockNumber: bigint): Promise<boolean> {
  const read = (address: Address, functionName: 'getSubregistry' | 'getResolver', label: string) =>
    client.readContract({ address, abi: registryAbi, functionName, args: [label], blockNumber });
  const [root, eth, registry, resolver, manager, resolved, ri, pi] = await Promise.all([
    client.readContract({ address: c.universalResolver, abi: universalAbi, functionName: 'ROOT_REGISTRY', blockNumber }),
    read(c.rootRegistry, 'getSubregistry', 'eth'), read(c.ethRegistry, 'getSubregistry', 'klamp'), read(c.registry, 'getResolver', 'tokens'),
    client.readContract({ address: c.stateView, abi: stateAbi, functionName: 'poolManager', blockNumber }),
    client.readContract({ address: c.universalResolver, abi: universalAbi, functionName: 'findResolver', args: [toHex(packetToBytes(tokenName(token)))], blockNumber }),
    client.getStorageAt({ address: c.registry, slot: eip1967, blockNumber }), client.getStorageAt({ address: c.resolver, slot: eip1967, blockNumber }),
  ]);
  return equal(root,c.rootRegistry) && equal(eth,c.ethRegistry) && equal(registry,c.registry) && equal(resolver,c.resolver)
    && equal(manager,c.poolManager) && equal(resolved[0],c.resolver)
    && !!ri && equal(`0x${ri.slice(-40)}`,c.registryImplementation)
    && !!pi && equal(`0x${pi.slice(-40)}`,c.resolverImplementation);
}
export async function getCanonicalPool(client: PublicClient, config: NetworkConfig, token: Address): Promise<CanonicalPoolResult> {
  if (!isAddress(token) || /^0x0{40}$/i.test(token)) return { status: 'lookup_failed', reason: 'format' };
  let blockNumber: bigint;
  try {
    if (BigInt(await client.getChainId()) !== config.chainId) return { status: 'lookup_failed', reason: 'chain' };
    blockNumber = await client.getBlockNumber();
  } catch { return { status: 'lookup_failed', reason: 'rpc' }; }
  try {
    if (!await verifyNamespace(client, config, token, blockNumber)) return { status: 'lookup_failed', reason: 'namespace' };
  } catch { return { status: 'lookup_failed', reason: 'namespace' }; }
  let value: string | null;
  try {
    value = await client.getEnsText({ name: tokenName(token), key: 'pool', universalResolverAddress: config.universalResolver, strict: true, blockNumber });
  } catch { return { status: 'lookup_failed', reason: 'resolution' }; }
  if (value === null || value === '') return { status: 'not_registered' };
  const parsed = parsePoolRecord(value);
  if (!parsed) return { status: 'lookup_failed', reason: 'format' };
  if (parsed.chainId !== config.chainId) return { status: 'lookup_failed', reason: 'chain' };
  // data("pool") = abi.encode(chainId, PoolKey): recompute the PoolId and require the token to be in the key.
  // Read through UniversalResolver.resolve like getEnsText does: the Sepolia ENSv2 Beta resolver has no direct data(node, key) getter.
  let raw: Hex;
  try {
    const name = tokenName(token);
    const call = encodeFunctionData({ abi: dataAbi, functionName: 'data', args: [namehash(name), 'pool'] });
    const [result, resolver] = await client.readContract({ address: config.universalResolver, abi: universalAbi, functionName: 'resolve', args: [toHex(packetToBytes(name)), call], blockNumber });
    if (!equal(resolver, config.resolver)) return { status: 'lookup_failed', reason: 'namespace' };
    raw = decodeFunctionResult({ abi: dataAbi, functionName: 'data', data: result });
  } catch { return { status: 'lookup_failed', reason: 'resolution' }; }
  let key: PoolKey;
  try {
    const [dataChainId, decoded] = decodeAbiParameters([{ type: 'uint256' }, poolKeyAbi], raw);
    key = decoded;
    if (dataChainId !== config.chainId || !equal(hashPoolKey(key), parsed.poolId) || (!equal(key.currency0, token) && !equal(key.currency1, token)))
      return { status: 'lookup_failed', reason: 'record-mismatch' };
  } catch { return { status: 'lookup_failed', reason: 'record-mismatch' }; }
  try {
    const [price] = await client.readContract({ address: config.stateView, abi: stateAbi, functionName: 'getSlot0', args: [parsed.poolId], blockNumber });
    if (price === 0n) return { status: 'lookup_failed', reason: 'pool-uninitialized' };
  } catch { return { status: 'lookup_failed', reason: 'rpc' }; }
  return { status: 'registered', source: 'ens', ...parsed, poolManager: config.poolManager, key };
}
