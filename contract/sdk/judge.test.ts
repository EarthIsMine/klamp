import { test } from 'node:test';
import assert from 'node:assert/strict';
import { a } from './testHelpers.js';
import { judge, DYNAMIC_FEE_FLAG } from './judge.js';
import { hashPoolKey, type PoolKey } from './poolKey.js';
import { type CanonicalPoolResult } from './canonicalPool.js';
const token=a(10);
const staticPool:PoolKey={currency0:a(0),currency1:token,fee:2500,tickSpacing:25,hooks:a(0)};
const canonicalHook:PoolKey={currency0:a(0),currency1:token,fee:DYNAMIC_FEE_FLAG,tickSpacing:60,hooks:a(0x80)};
const replica:PoolKey={...canonicalHook,hooks:a(0x81)};
const found:CanonicalPoolResult={status:'registered',source:'ens',chainId:31337n,poolManager:a(1),poolId:hashPoolKey(canonicalHook),key:canonicalHook};
const failures:CanonicalPoolResult[]=[{status:'lookup_failed',reason:'format'},{status:'lookup_failed',reason:'rpc'},{status:'lookup_failed',reason:'multiple-launch-pools'}];
test('static and canonical pools pass in every lookup state',()=>{
 for(const c of [found,{status:'not_registered'} as CanonicalPoolResult,...failures]) assert.equal(judge(token,c,[staticPool]),'allow');
 assert.equal(judge(token,found,[canonicalHook]),'allow');
});
test('a hook pool that is not canonical is requoted by lookup state',()=>{
 assert.equal(judge(token,found,[replica]),'requote_canonical');
 assert.equal(judge(token,{status:'not_registered'},[canonicalHook]),'requote_static');
 for(const c of failures) assert.equal(judge(token,c,[canonicalHook]),'hold');
});
test('static fee with a hook or dynamic fee without a hook is not static',()=>{
 assert.equal(judge(token,{status:'not_registered'},[{...staticPool,hooks:a(0x80)}]),'requote_static');
 assert.equal(judge(token,{status:'not_registered'},[{...staticPool,fee:DYNAMIC_FEE_FLAG}]),'requote_static');
});
test('only hops that contain the token are judged',()=>{
 const unrelatedHook:PoolKey={currency0:a(0),currency1:a(20),fee:DYNAMIC_FEE_FLAG,tickSpacing:60,hooks:a(0x82)};
 assert.equal(judge(token,{status:'not_registered'},[unrelatedHook,staticPool]),'allow');
});
