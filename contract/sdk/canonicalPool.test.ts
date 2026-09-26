import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAddress, pad, type Address, type PublicClient } from 'viem';
import { getCanonicalPool, parsePoolRecord, tokenName, type NetworkConfig } from './canonicalPool.js';
import { hashPoolKey } from './poolKey.js';
import { a, config, encodeData, key, poolId, reader, token } from './testHelpers.js';
test('strict pool record format and bigint',()=>{
 assert.equal(parsePoolRecord('eip155:01:'+poolId),null);
 assert.equal(parsePoolRecord('eip155:1:0x00'),null);
 assert.equal(parsePoolRecord('eip155:0:'+poolId),null);
 assert.equal(parsePoolRecord('eip155:9007199254740993:'+poolId)?.chainId,9007199254740993n);
 assert.equal(tokenName(a(255)),`${a(255)}.tokens.klamp.eth`);
});
test('registered record carries the decoded PoolKey',async()=>assert.deepEqual(await getCanonicalPool(reader(),config,token),{status:'registered',source:'ens',chainId:31337n,poolId,poolManager:config.poolManager,key:{...key,currency1:getAddress(token)}}));
test('empty record only is not_registered',async()=>assert.deepEqual(await getCanonicalPool(reader(null),config,token),{status:'not_registered'}));
test('format and chain errors',async()=>{
 assert.deepEqual(await getCanonicalPool(reader('bad'),config,token),{status:'lookup_failed',reason:'format'});
 assert.deepEqual(await getCanonicalPool(reader('eip155:1:'+poolId),config,token),{status:'lookup_failed',reason:'chain'});
});
test('uninitialized pool',async()=>assert.deepEqual(await getCanonicalPool(reader(undefined,0n),config,token),{status:'lookup_failed',reason:'pool-uninitialized'}));
test('resolution failure cannot become not_registered',async()=>{
 const c=reader(); c.getEnsText=async()=>{throw new Error('unknown revert');};
 assert.deepEqual(await getCanonicalPool(c,config,token),{status:'lookup_failed',reason:'resolution'});
});
test('RPC and namespace failure cannot become not_registered',async()=>{
 const c=reader(); c.getChainId=async()=>{throw new Error('offline');};
 assert.deepEqual(await getCanonicalPool(c,config,token),{status:'lookup_failed',reason:'rpc'});
 const c2=reader(); c2.getStorageAt=async()=>pad(a(100));
 assert.deepEqual(await getCanonicalPool(c2,config,token),{status:'lookup_failed',reason:'namespace'});
});
test('data record must match text record and include the token',async()=>{
 assert.deepEqual(await getCanonicalPool(reader(undefined,1n,encodeData({...key,fee:500})),config,token),{status:'lookup_failed',reason:'record-mismatch'});
 assert.deepEqual(await getCanonicalPool(reader(undefined,1n,encodeData(key,1n)),config,token),{status:'lookup_failed',reason:'record-mismatch'});
 assert.deepEqual(await getCanonicalPool(reader(undefined,1n,'0x1234'),config,token),{status:'lookup_failed',reason:'record-mismatch'});
 const other={...key,currency1:a(11)};
 assert.deepEqual(await getCanonicalPool(reader(`eip155:31337:${hashPoolKey(other)}`,1n,encodeData(other)),config,token),{status:'lookup_failed',reason:'record-mismatch'});
});
test('data read failure is lookup_failed, not not_registered',async()=>{
 const c=reader(); const read=c.readContract;
 c.readContract=(async(p:Parameters<typeof read>[0])=>{if(p.functionName==='resolve') throw new Error('revert'); return read(p);}) as typeof read;
 assert.deepEqual(await getCanonicalPool(c,config,token),{status:'lookup_failed',reason:'resolution'});
});
test('data record answered by another resolver is a namespace failure',async()=>{
 const c=reader(); const read=c.readContract;
 c.readContract=(async(p:Parameters<typeof read>[0])=>{const r=await read(p); return p.functionName==='resolve'?[(r as [unknown,unknown])[0],a(99)]:r;}) as typeof read;
 assert.deepEqual(await getCanonicalPool(c,config,token),{status:'lookup_failed',reason:'namespace'});
});
