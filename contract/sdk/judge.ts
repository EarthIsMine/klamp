import { type Address } from 'viem';
import { type CanonicalPoolResult } from './canonicalPool.js';
import { hashPoolKey, type PoolKey } from './poolKey.js';
export type Verdict = 'allow' | 'requote_canonical' | 'requote_static' | 'hold';
export const DYNAMIC_FEE_FLAG = 0x800000;
const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
/** Fee fixed in the PoolKey: no hooks and no dynamic-fee flag. Quoted fee = executed fee. */
export const isStatic = (k: PoolKey) => eq(k.hooks, '0x0000000000000000000000000000000000000000') && (k.fee & DYNAMIC_FEE_FLAG) === 0;
/**
 * Router/terminal policy from the phase 1 design doc. Only pools containing `token` are judged.
 * A trusted launch-event pool counts as registered.
 */
export function judge(token: Address, c: CanonicalPoolResult, route: readonly PoolKey[]): Verdict {
  const hops = route.filter((k) => eq(k.currency0, token) || eq(k.currency1, token));
  const isCanonical = (k: PoolKey) => c.status === 'registered' && eq(hashPoolKey(k), c.poolId);
  if (hops.every((k) => isStatic(k) || isCanonical(k))) return 'allow';
  if (c.status === 'registered') return 'requote_canonical'; // canonical and static pools only
  if (c.status === 'not_registered') return 'requote_static'; // static pools only; warn and confirm if none
  return 'hold'; // lookup failed: static pools only, no user override, retry
}
