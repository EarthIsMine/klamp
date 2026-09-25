import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keccak256, type PublicClient } from 'viem';
import { a, config, reader } from './testHelpers.js';
import { hashPoolKey, launchEventFallback, type FallbackConfig, type PoolKey } from './launchEventFallback.js';
const token=a(100), emitter=a(101), launcher=a(102);
const key:PoolKey={currency0:a(0),currency1:token,fee:3000,tickSpacing:60,hooks:a(0)};
const scan:FallbackConfig={sources:[{address:emitter,launcher,runtimeCodeHash:keccak256('0x1234'),fromBlock:1n}],confirmations:1n,maxScanBlocks:100n,chunkSize:4n};
const blockHash=`0x${'11'.repeat(32)}`;
function log(k=key) {return {address:emitter,args:{key:k,poolId:hashPoolKey(k),token,finalPositionRecipient:a(103)},removed:false,blockNumber:2n,blockHash};}
function source(logs:unknown[]):PublicClient {
 const base=reader(); const read=base.readContract;
 return {...base,getBlockNumber:async()=>10n,getCode:async()=> '0x1234',getBlock:async()=>({hash:blockHash}),getLogs:async()=>logs,
  readContract:async(p:Parameters<typeof read>[0])=>p.functionName==='launcher'?launcher:read(p),
 } as unknown as PublicClient;
}
test('only missing triggers fallback',async()=>{
 const c=source([]); c.getBlockNumber=async()=>{throw new Error('must not scan');};
 for(const status of ['invalid','unavailable','ambiguous'] as const) {
  const input={status,reason:'format'} as never;
  assert.equal(await launchEventFallback(c,config,token,input,scan),input);
 }
});
test('verified strategy log resolves',async()=>assert.deepEqual(await launchEventFallback(source([log()]),config,token,{status:'missing'},scan),{status:'found',source:'launch-event',chainId:config.chainId,poolManager:config.poolManager,poolId:hashPoolKey(key)}));
test('different pool candidates are ambiguous',async()=>assert.deepEqual(await launchEventFallback(source([log(),log({...key,fee:500})]),config,token,{status:'missing'},scan),{status:'ambiguous',reason:'multiple-launch-pools'}));
test('wrong emitter, token, removed or mismatched hash cannot resolve',async()=>{
 for(const bad of [{...log(),address:a(200)},{...log(),removed:true},{...log(),args:{...log().args,token:a(200)}},{...log(),args:{...log().args,poolId:`0x${'22'.repeat(32)}`}}])
  assert.deepEqual(await launchEventFallback(source([bad]),config,token,{status:'missing'},scan),{status:'missing'});
});
test('strategy code mismatch, reorg and query errors are unavailable',async()=>{
 const c=source([log()]);c.getCode=async()=> '0x4321';
 assert.equal((await launchEventFallback(c,config,token,{status:'missing'},scan)).status,'unavailable');
 const c2=source([{...log(),blockHash:`0x${'22'.repeat(32)}`}]);
 assert.equal((await launchEventFallback(c2,config,token,{status:'missing'},scan)).status,'unavailable');
 const c3=source([]);c3.getLogs=async()=>{throw new Error('offline');};
 assert.equal((await launchEventFallback(c3,config,token,{status:'missing'},scan)).status,'unavailable');
});
test('disabled source list makes no RPC calls',async()=>assert.deepEqual(await launchEventFallback({} as PublicClient,config,token,{status:'missing'},{...scan,sources:[]}),{status:'missing'}));
