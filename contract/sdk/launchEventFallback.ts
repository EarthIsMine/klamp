import { parseAbi, parseAbiItem, keccak256, type Address, type Hex, type PublicClient } from 'viem';
import { getCanonicalPool, stateAbi, verifyNamespace, type CanonicalPoolResult, type NetworkConfig } from './canonicalPool.js';
import { hashPoolKey, type PoolKey } from './poolKey.js';
export { hashPoolKey, type PoolKey } from './poolKey.js';
// Pinned InstantLaunchStrategy.sol, not LiquidityLauncher.sol.
export const tokenLaunchedEvent = parseAbiItem('event TokenLaunched(bytes32 indexed poolId, address indexed token, address indexed finalPositionRecipient, (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key)');
/** InstantLaunchStrategy LP_FEE / TICK_SPACING: every Pools.trade launch pool is (ETH, token, 2500, 25, no hooks). */
export const LAUNCH_FEE = 2500, LAUNCH_TICK_SPACING = 25;
/**
 * Design doc: InstantLaunchStrategy v3.2.0 on Robinhood Chain (liquidity-launcher README table).
 * Not trusted automatically: add it to FallbackConfig.sources only with its verified runtime code hash,
 * launcher and start block for the chain being read.
 */
export const ROBINHOOD_INSTANT_LAUNCH_STRATEGY: Address = '0x23f8209572b4a1C2AD88A42749E830791Fb027f1';
const ZERO = '0x0000000000000000000000000000000000000000';
export interface LaunchSource { address: Address; runtimeCodeHash: Hex; launcher: Address; fromBlock: bigint }
export interface FallbackConfig { sources: readonly LaunchSource[]; confirmations: bigint; maxScanBlocks: bigint; chunkSize: bigint }
const sourceAbi = parseAbi(['function poolManager() view returns (address)','function launcher() view returns (address)']);
const eq = (a:string,b:string)=>a.toLowerCase()===b.toLowerCase();
type Scan = { status: 'ids'; ids: Map<Hex, PoolKey> } | { status: 'chain' } | { status: 'namespace' } | { status: 'not-confirmed' };
/** Collects initialized launch pools for `token` from trusted strategies. Throws on RPC/trust failures. */
async function scanLaunchPools(client: PublicClient, network: NetworkConfig, token: Address, config: FallbackConfig): Promise<Scan> {
 if(config.confirmations<1n || config.chunkSize<1n || config.maxScanBlocks<1n) throw new Error('invalid scan bounds');
 if(BigInt(await client.getChainId())!==network.chainId) return {status:'chain'};
 const head=await client.getBlockNumber();
 if(head<config.confirmations) return {status:'not-confirmed'};
 const toBlock=head-config.confirmations;
 if(!await verifyNamespace(client,network,token,toBlock)) return {status:'namespace'};
 const ids=new Map<Hex, PoolKey>();
 for(const source of config.sources) {
  if(source.fromBlock<0n || toBlock-source.fromBlock+1n>config.maxScanBlocks) throw new Error('history exceeds configured scan bound');
  const [code,manager,launcher] = await Promise.all([
   client.getCode({address:source.address,blockNumber:toBlock}),
   client.readContract({address:source.address,abi:sourceAbi,functionName:'poolManager',blockNumber:toBlock}),
   client.readContract({address:source.address,abi:sourceAbi,functionName:'launcher',blockNumber:toBlock}),
  ]);
  if(!code || code==='0x' || !eq(keccak256(code),source.runtimeCodeHash) || !eq(manager,network.poolManager) || !eq(launcher,source.launcher)) throw new Error('untrusted strategy');
  for(let from=source.fromBlock;from<=toBlock;from+=config.chunkSize) {
   const end=from+config.chunkSize-1n<toBlock?from+config.chunkSize-1n:toBlock;
   const logs=await client.getLogs({address:source.address,event:tokenLaunchedEvent,args:{token},fromBlock:from,toBlock:end,strict:true});
   for(const log of logs) {
    if(log.removed || log.blockNumber===null || log.blockNumber<from || log.blockNumber>end || !eq(log.address,source.address) || !eq(log.args.token,token)) continue;
    const key=log.args.key;
    // Only the InstantLaunchStrategy pool shape: (ETH, token, 2500, 25, no hooks).
    if(!eq(key.currency0,ZERO) || !eq(key.currency1,token) || key.fee!==LAUNCH_FEE || key.tickSpacing!==LAUNCH_TICK_SPACING || !eq(key.hooks,ZERO)) continue;
    const id=hashPoolKey(key);
    if(!eq(id,log.args.poolId)) continue;
    const block=await client.getBlock({blockNumber:log.blockNumber});
    if(!log.blockHash || block.hash!==log.blockHash) throw new Error('reorganized log');
    const [price]=await client.readContract({address:network.stateView,abi:stateAbi,functionName:'getSlot0',args:[id],blockNumber:toBlock});
    if(price===0n) continue;
    ids.set(id,key);
   }
  }
 }
 return {status:'ids',ids};
}
export async function launchEventFallback(client: PublicClient, network: NetworkConfig, token: Address, ens: CanonicalPoolResult, config: FallbackConfig): Promise<CanonicalPoolResult> {
 if (ens.status !== 'not_registered' || config.sources.length===0) return ens;
 try {
  const scan=await scanLaunchPools(client,network,token,config);
  if(scan.status==='chain') return {status:'lookup_failed',reason:'chain'};
  if(scan.status==='namespace') return {status:'lookup_failed',reason:'namespace'};
  if(scan.status==='not-confirmed') return ens;
  if(scan.ids.size>1) return {status:'lookup_failed',reason:'multiple-launch-pools'};
  const [entry]=scan.ids;
  return entry?{status:'registered',source:'launch-event',chainId:network.chainId,poolManager:network.poolManager,poolId:entry[0],key:entry[1]}:ens;
 } catch { return {status:'lookup_failed',reason:'rpc'}; }
}
/** Launch-event pools are treated like registered ones. ENS wins over the launch event. When they differ, the ENS pool is kept with a `launch-pool-differs` warning. */
export async function launchConflictWarning(client: PublicClient, network: NetworkConfig, token: Address, ens: CanonicalPoolResult, config: FallbackConfig): Promise<CanonicalPoolResult> {
 if (ens.status !== 'registered' || ens.source !== 'ens' || config.sources.length===0) return ens;
 try {
  const scan=await scanLaunchPools(client,network,token,config);
  if(scan.status==='ids' && scan.ids.size>0 && ![...scan.ids.keys()].some(id=>eq(id,ens.poolId))) return {...ens,warning:'launch-pool-differs'};
 } catch { /* The warning is advisory; a failed scan never downgrades a verified ENS record. */ }
 return ens;
}
export async function resolveCanonicalPool(client: PublicClient, network: NetworkConfig, token: Address, fallback: FallbackConfig): Promise<CanonicalPoolResult> {
 const ens=await getCanonicalPool(client,network,token);
 return ens.status==='registered' ? launchConflictWarning(client,network,token,ens,fallback) : launchEventFallback(client,network,token,ens,fallback);
}
