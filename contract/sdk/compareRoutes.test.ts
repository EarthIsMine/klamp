import { test } from 'node:test';
import assert from 'node:assert/strict';
import { a } from './testHelpers.js';
import { compareRoutes, type RouteHop } from './compareRoutes.js';
import { type CanonicalPoolResult } from './canonicalPool.js';
const id=`0x${'11'.repeat(32)}` as const;
const c:CanonicalPoolResult={status:'registered',source:'ens',chainId:31337n,poolManager:a(1),poolId:id,key:{currency0:a(0),currency1:a(2),fee:3000,tickSpacing:60,hooks:a(0)}};
const hop:RouteHop={chainId:31337n,poolManager:a(1),poolId:id,tokenIn:a(2),tokenOut:a(3)};
test('matches target hop while allowing unrelated common-asset hops',()=>assert.deepEqual(compareRoutes(a(2),c,[[hop,{...hop,tokenIn:a(3),tokenOut:a(4),poolId:`0x${'22'.repeat(32)}`}]]),{status:'match',source:'ens',checkedHops:1}));
test('checks chain, manager, pool and every split branch',()=>{
 for(const change of [{chainId:1n},{poolManager:a(5)},{poolId:`0x${'22'.repeat(32)}` as const}])
 assert.deepEqual(compareRoutes(a(2),c,[[hop],[{...hop,...change}]]),{status:'mismatch',branch:1,hop:0});
});
test('empty routes and branches without target are blocked',()=>{
 for(const routes of [[],[[]],[[{...hop,tokenIn:a(4)}]],[[hop],[]]])
 assert.deepEqual(compareRoutes(a(2),c,routes),{status:'blocked',reason:'invalid-route'});
});
test('all unresolved states block with distinct reasons',()=>{
 const cases:CanonicalPoolResult[]=[{status:'not_registered'},{status:'lookup_failed',reason:'format'},{status:'lookup_failed',reason:'rpc'},{status:'lookup_failed',reason:'multiple-launch-pools'}];
 for(const state of cases) assert.deepEqual(compareRoutes(a(2),state,[[hop]]),{status:'blocked',reason:state.status});
});
