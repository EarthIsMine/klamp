import { isAddress, type Address, type Hex } from 'viem';
import { type CanonicalPoolResult } from './canonicalPool.js';
export interface RouteHop { chainId: bigint; poolManager: Address; poolId: Hex; tokenIn: Address; tokenOut: Address }
export type RouteComparison =
 | { status: 'match'; source: 'ens' | 'launch-event'; checkedHops: number }
 | { status: 'mismatch'; branch: number; hop: number }
 | { status: 'blocked'; reason: 'invalid-route' | Exclude<CanonicalPoolResult['status'],'registered'> };
const eq=(a:string,b:string)=>a.toLowerCase()===b.toLowerCase();
/** Compares declared route information; does not verify opaque execution calldata. */
export function compareRoutes(token: Address, canonical: CanonicalPoolResult, branches: readonly (readonly RouteHop[])[]): RouteComparison {
 if(canonical.status!=='registered') return {status:'blocked',reason:canonical.status};
 if(!isAddress(token)||branches.length===0) return {status:'blocked',reason:'invalid-route'};
 let checkedHops=0;
 for(const [b,branch] of branches.entries()) {
  let targetHops=0;
  for(const [h,hop] of branch.entries()) {
   if(typeof hop.chainId!=='bigint'||hop.chainId<=0n||!isAddress(hop.poolManager)||!isAddress(hop.tokenIn)||!isAddress(hop.tokenOut)||!/^0x[0-9a-fA-F]{64}$/.test(hop.poolId)) return {status:'blocked',reason:'invalid-route'};
   if(!eq(hop.tokenIn,token)&&!eq(hop.tokenOut,token)) continue;
   targetHops++; checkedHops++;
   if(hop.chainId!==canonical.chainId||!eq(hop.poolManager,canonical.poolManager)||!eq(hop.poolId,canonical.poolId)) return {status:'mismatch',branch:b,hop:h};
  }
  if(targetHops===0) return {status:'blocked',reason:'invalid-route'};
 }
 return {status:'match',source:canonical.source,checkedHops};
}
