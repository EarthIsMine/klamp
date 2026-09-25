import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { BaseError, ContractFunctionRevertedError, keccak256, parseAbi, namehash, decodeAbiParameters, type Address, type Hex } from 'viem';
import { createReader, getCanonicalPool, tokenName, type NetworkConfig } from '../sdk/canonicalPool.js';
const path=process.env.MANIFEST??'deployments/local.json';
const raw=JSON.parse(readFileSync(path,'utf8'));
const config:NetworkConfig={...raw,chainId:BigInt(raw.chainId)};
if(!process.env.RPC_URL) throw Error('RPC_URL is required');
const client=createReader(process.env.RPC_URL);
const block=await client.getBlockNumber();
const result=await getCanonicalPool(client,config,raw.token);
assert.equal(result.status,'found');
if(result.status!=='found') throw Error('Missing canonical pool');
const resolverAbi=parseAbi([
 'function text(bytes32,string) view returns (string)','function data(bytes32,string) view returns (bytes)',
 'function setText(bytes32,string,string)','function setData(bytes32,string,bytes)',
 'function roleCount(uint256) view returns (uint256)','function roles(uint256,address) view returns (uint256)',
 'error EACUnauthorizedAccountRoles(uint256 resource,uint256 roleBitmap,address account)',
]);
const node=namehash(tokenName(raw.token));
const encoded=await client.readContract({address:raw.resolver,abi:resolverAbi,functionName:'data',args:[node,'pool'],blockNumber:block});
const [chainId,key]=decodeAbiParameters([{type:'uint256'},{type:'tuple',components:[{name:'currency0',type:'address'},{name:'currency1',type:'address'},{name:'fee',type:'uint24'},{name:'tickSpacing',type:'int24'},{name:'hooks',type:'address'}]}],encoded);
assert.equal(chainId,config.chainId);
const {hashPoolKey}=await import('../sdk/launchEventFallback.js');
assert.equal(hashPoolKey(key),result.poolId);
async function rejected(call:Promise<unknown>,expected:string) {
 try {await call;} catch(e) {
  const revert=e instanceof BaseError?e.walk(x=>x instanceof ContractFunctionRevertedError):undefined;
  if(revert instanceof ContractFunctionRevertedError && revert.data?.errorName===expected) return;
  throw Error(`Expected ${expected}; received another failure`);
 }
 throw Error(`Expected ${expected}; call succeeded`);
}
await client.simulateContract({address:raw.resolver,abi:resolverAbi,functionName:'setText',args:[node,'description','smoke eth_call only'],account:raw.editor??raw.operator});
await client.simulateContract({address:raw.resolver,abi:resolverAbi,functionName:'setText',args:[node,'url','https://example.com'],account:raw.editor??raw.operator});
await rejected(client.simulateContract({address:raw.resolver,abi:resolverAbi,functionName:'setText',args:[node,'pool','forged'],account:raw.operator}),'EACUnauthorizedAccountRoles');
const registrarAbi=parseAbi([
 'function recordByCreate2(address,(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks),bytes32,bytes32)',
 'error AlreadyRecorded()',
]);
await rejected(client.simulateContract({address:raw.registrar,abi:registrarAbi,functionName:'recordByCreate2',args:[raw.token,key,raw.salt,raw.initCodeHash],account:raw.create2Launcher}),'AlreadyRecorded');
const registryAbi=parseAbi([
 'function roleCount(uint256) view returns (uint256)','function getResource(uint256) view returns (uint256)',
 'function getState(uint256) view returns ((uint8 status,uint64 expiry,address latestOwner,uint256 tokenId,uint256 resource))',
 'function setResolver(uint256,address)','error EACUnauthorizedAccountRoles(uint256 resource,uint256 roleBitmap,address account)',
]);
const id=(label:string)=>BigInt(keccak256(new TextEncoder().encode(label)));
const rootState=await client.readContract({address:raw.ethRegistry,abi:registryAbi,functionName:'getState',args:[id('klamp')],blockNumber:block});
assert.equal(await client.readContract({address:raw.registry,abi:registryAbi,functionName:'roleCount',args:[0n],blockNumber:block}),0n);
assert.equal(await client.readContract({address:raw.ethRegistry,abi:registryAbi,functionName:'roleCount',args:[rootState.resource],blockNumber:block}),0n);
await rejected(client.simulateContract({address:raw.registry,abi:registryAbi,functionName:'setResolver',args:[id('tokens'),raw.operator],account:raw.operator}),'EACUnauthorizedAccountRoles');
const observedCodeHashes:Record<string,Hex>={};
for(const key of ['rootRegistry','ethRegistry','registry','resolver','registryImplementation','resolverImplementation','registrar','stateView','poolManager','universalResolver','launcher','tokenFactory']) {
 const code=await client.getCode({address:raw[key] as Address,blockNumber:block});
 assert.ok(code&&code!=='0x',`Missing code: ${key}`);
 observedCodeHashes[key]=keccak256(code);
 if(config.chainId!==31337n) assert.equal(observedCodeHashes[key],raw.expectedCodeHashes?.[key],`Unverified code: ${key}`);
}
const versions=JSON.parse(readFileSync('deployments/versions.json','utf8'));
const publicTransactions:Hex[]=raw.publicTransactions??[];
let deploymentBlock=raw.deploymentBlock??null;
if(config.chainId===31337n) {
 const broadcast=JSON.parse(readFileSync('broadcast/LocalPhase1.s.sol/31337/run-latest.json','utf8'));
 for(const receipt of broadcast.receipts??[]) {
  assert.equal(BigInt(receipt.status),1n);
  publicTransactions.push(receipt.transactionHash);
  const n=Number(BigInt(receipt.blockNumber));deploymentBlock=deploymentBlock===null?n:Math.min(deploymentBlock,n);
 }
}
if(config.chainId!==31337n) assert.ok(deploymentBlock!==null&&publicTransactions.length>0,'Missing public deployment evidence');
const report={chainId:config.chainId.toString(),checkedBlock:block.toString(),root:'klamp.eth',token:raw.token,poolId:result.poolId,addresses:Object.fromEntries(Object.keys(observedCodeHashes).map(k=>[k,raw[k]])),expiry:rootState.expiry.toString(),sealed:true,observedCodeHashes,versions,deploymentBlock,publicTransactions:[...new Set(publicTransactions)],checks:['ENS viem text/data','editor description/url eth_call','operator pool/resolver denied','overwrite denied','sealed roles'],ensAppUi:'not checked',humanVerification:'pending'};
writeFileSync(process.env.SMOKE_OUTPUT??'deployments/local.verification.json',JSON.stringify(report,null,2)+'\n');
console.log('Deployment smoke passed: ENS text/data, editor, overwrite, operator denial, sealed roles.');
