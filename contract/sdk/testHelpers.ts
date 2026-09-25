import assert from 'node:assert/strict';
import { pad, type Address, type PublicClient } from 'viem';
import { type NetworkConfig } from './canonicalPool.js';
export const a = (n: number) => `0x${n.toString(16).padStart(40,'0')}` as Address;
export const config: NetworkConfig = { chainId: 31337n, poolManager:a(1),stateView:a(2),universalResolver:a(3),rootRegistry:a(4),ethRegistry:a(5),registry:a(6),resolver:a(7),registryImplementation:a(8),resolverImplementation:a(9) };
export const poolId = `0x${'ab'.repeat(32)}`;
export function reader(value: string | null = `eip155:31337:${poolId}`, price = 1n): PublicClient {
 return {
  getChainId: async()=>31337, getBlockNumber:async()=>1n,
  getStorageAt:async({address}:{address:Address})=>pad(address===config.registry?config.registryImplementation:config.resolverImplementation),
  readContract:async({address,functionName}:{address:Address;functionName:string})=> {
   if(functionName==='ROOT_REGISTRY') return config.rootRegistry;
   if(functionName==='getSubregistry') return address===config.rootRegistry?config.ethRegistry:config.registry;
   if(functionName==='getResolver') return config.resolver;
   if(functionName==='poolManager') return config.poolManager;
   if(functionName==='findResolver') return [config.resolver,'0x',42n];
   if(functionName==='getSlot0') return [price,0,0,0];
   throw new Error('unexpected call');
  },
  getEnsText:async(p:{strict:boolean})=>{assert.equal(p.strict,true);return value;},
 } as unknown as PublicClient;
}
