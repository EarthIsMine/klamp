import { encodeAbiParameters, keccak256, parseAbi, parseAbiItem, type Address, type Hex, type PublicClient } from 'viem';
import { getCanonicalPool, stateAbi, verifyNamespace, type CanonicalPoolResult, type NetworkConfig } from './canonicalPool.js';
// Pinned InstantLaunchStrategy.sol, not LiquidityLauncher.sol.
export const tokenLaunchedEvent = parseAbiItem('event TokenLaunched(bytes32 indexed poolId, address indexed token, address indexed finalPositionRecipient, (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key)');
export interface PoolKey { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address }
export function hashPoolKey(key: PoolKey): Hex {
 return keccak256(encodeAbiParameters([{type:'tuple',components:[{name:'currency0',type:'address'},{name:'currency1',type:'address'},{name:'fee',type:'uint24'},{name:'tickSpacing',type:'int24'},{name:'hooks',type:'address'}]}],[key]));
}
export interface LaunchSource { address: Address; runtimeCodeHash: Hex; launcher: Address; fromBlock: bigint }
export interface FallbackConfig { sources: readonly LaunchSource[]; confirmations: bigint; maxScanBlocks: bigint; chunkSize: bigint }
const sourceAbi = parseAbi(['function poolManager() view returns (address)','function launcher() view returns (address)']);
const eq = (a:string,b:string)=>a.toLowerCase()===b.toLowerCase();
export async function launchEventFallback(client: PublicClient, network: NetworkConfig, token: Address, ens: CanonicalPoolResult, config: FallbackConfig): Promise<CanonicalPoolResult> {
 if (ens.status !== 'missing' || config.sources.length===0) return ens;
 try {
  if(config.confirmations<1n || config.chunkSize<1n || config.maxScanBlocks<1n) throw new Error('invalid scan bounds');
  if(BigInt(await client.getChainId())!==network.chainId) return {status:'invalid',reason:'chain'};
  const head=await client.getBlockNumber();
  if(head<config.confirmations) return ens;
  const toBlock=head-config.confirmations;
  if(!await verifyNamespace(client,network,token,toBlock)) return {status:'unavailable',reason:'namespace'};
  const ids=new Set<Hex>();
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
     if(BigInt(key.currency0)>=BigInt(key.currency1) || (!eq(key.currency0,token)&&!eq(key.currency1,token))) continue;
     const id=hashPoolKey(key);
     if(!eq(id,log.args.poolId)) continue;
     const block=await client.getBlock({blockNumber:log.blockNumber});
     if(!log.blockHash || block.hash!==log.blockHash) throw new Error('reorganized log');
     const [price]=await client.readContract({address:network.stateView,abi:stateAbi,functionName:'getSlot0',args:[id],blockNumber:toBlock});
     if(price===0n) continue;
     ids.add(id);
    }
   }
  }
  if(ids.size>1) return {status:'ambiguous',reason:'multiple-launch-pools'};
  const poolId=ids.values().next().value;
  return poolId?{status:'found',source:'launch-event',chainId:network.chainId,poolManager:network.poolManager,poolId}:ens;
 } catch { return {status:'unavailable',reason:'rpc'}; }
}
export async function resolveCanonicalPool(client: PublicClient, network: NetworkConfig, token: Address, fallback: FallbackConfig): Promise<CanonicalPoolResult> {
 return launchEventFallback(client,network,token,await getCanonicalPool(client,network,token),fallback);
}
