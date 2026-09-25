import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pad, type Address, type PublicClient } from 'viem';
import { getCanonicalPool, parsePoolRecord, tokenName, type NetworkConfig } from './canonicalPool.js';
import { a, config, poolId, reader } from './testHelpers.js';
test('strict pool record format and bigint',()=>{
 assert.equal(parsePoolRecord('eip155:01:'+poolId),null);
 assert.equal(parsePoolRecord('eip155:1:0x00'),null);
 assert.equal(parsePoolRecord('eip155:0:'+poolId),null);
 assert.equal(parsePoolRecord('eip155:9007199254740993:'+poolId)?.chainId,9007199254740993n);
 assert.equal(tokenName(a(255)),`${a(255)}.tokens.klamp.eth`);
});
test('found record',async()=>assert.equal((await getCanonicalPool(reader(),config,a(10))).status,'found'));
test('empty record only is missing',async()=>assert.deepEqual(await getCanonicalPool(reader(null),config,a(10)),{status:'missing'}));
test('format and chain errors',async()=>{
 assert.deepEqual(await getCanonicalPool(reader('bad'),config,a(10)),{status:'invalid',reason:'format'});
 assert.deepEqual(await getCanonicalPool(reader('eip155:1:'+poolId),config,a(10)),{status:'invalid',reason:'chain'});
});
test('uninitialized pool',async()=>assert.deepEqual(await getCanonicalPool(reader(undefined,0n),config,a(10)),{status:'invalid',reason:'pool-uninitialized'}));
test('resolution failure cannot become missing',async()=>{
 const c=reader(); c.getEnsText=async()=>{throw new Error('unknown revert');};
 assert.deepEqual(await getCanonicalPool(c,config,a(10)),{status:'unavailable',reason:'resolution'});
});
test('RPC and namespace failure cannot become missing',async()=>{
 const c=reader(); c.getChainId=async()=>{throw new Error('offline');};
 assert.deepEqual(await getCanonicalPool(c,config,a(10)),{status:'unavailable',reason:'rpc'});
 const c2=reader(); c2.getStorageAt=async()=>pad(a(100));
 assert.deepEqual(await getCanonicalPool(c2,config,a(10)),{status:'unavailable',reason:'namespace'});
});
