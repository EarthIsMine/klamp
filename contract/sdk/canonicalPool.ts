import { createPublicClient, http, keccak256, toBytes, toHex as numberToHex, isAddress, parseAbi, toHex, type Address, type Hex, type PublicClient } from 'viem';
import { normalize, packetToBytes } from 'viem/ens';

export type CanonicalPoolResult =
  | { status: 'found'; source: 'ens' | 'launch-event'; chainId: bigint; poolManager: Address; poolId: Hex }
  | { status: 'missing' }
  | { status: 'invalid'; reason: 'format' | 'chain' | 'pool-uninitialized' }
  | { status: 'unavailable'; reason: 'rpc' | 'resolution' | 'namespace' }
  | { status: 'ambiguous'; reason: 'multiple-launch-pools' };
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
const universalAbi = parseAbi(['function ROOT_REGISTRY() view returns (address)', 'function findResolver(bytes) view returns (address,bytes32,uint256)']);
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
  if (!isAddress(token) || /^0x0{40}$/i.test(token)) return { status: 'invalid', reason: 'format' };
  let blockNumber: bigint;
  try {
    if (BigInt(await client.getChainId()) !== config.chainId) return { status: 'invalid', reason: 'chain' };
    blockNumber = await client.getBlockNumber();
  } catch { return { status: 'unavailable', reason: 'rpc' }; }
  try {
    if (!await verifyNamespace(client, config, token, blockNumber)) return { status: 'unavailable', reason: 'namespace' };
  } catch { return { status: 'unavailable', reason: 'namespace' }; }
  let value: string | null;
  try {
    value = await client.getEnsText({ name: tokenName(token), key: 'pool', universalResolverAddress: config.universalResolver, strict: true, blockNumber });
  } catch { return { status: 'unavailable', reason: 'resolution' }; }
  if (value === null || value === '') return { status: 'missing' };
  const parsed = parsePoolRecord(value);
  if (!parsed) return { status: 'invalid', reason: 'format' };
  if (parsed.chainId !== config.chainId) return { status: 'invalid', reason: 'chain' };
  try {
    const [price] = await client.readContract({ address: config.stateView, abi: stateAbi, functionName: 'getSlot0', args: [parsed.poolId], blockNumber });
    if (price === 0n) return { status: 'invalid', reason: 'pool-uninitialized' };
  } catch { return { status: 'unavailable', reason: 'rpc' }; }
  return { status: 'found', source: 'ens', ...parsed, poolManager: config.poolManager };
}
