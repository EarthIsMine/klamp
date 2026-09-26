import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { BaseError, ContractFunctionRevertedError, keccak256, parseAbi, namehash, decodeAbiParameters, decodeFunctionResult, encodeFunctionData, toHex, type Address, type Hex } from 'viem';
import { packetToBytes } from 'viem/ens';
import { createReader, getCanonicalPool, tokenName, type NetworkConfig } from '../sdk/canonicalPool.js';
const path=process.env.MANIFEST??'deployments/local.json';
const raw=JSON.parse(readFileSync(path,'utf8'));
const config:NetworkConfig={...raw,chainId:BigInt(raw.chainId)};
if(!process.env.RPC_URL) throw Error('RPC_URL is required');
const client=createReader(process.env.RPC_URL);
const block=await client.getBlockNumber();
const result=await getCanonicalPool(client,config,raw.token);
assert.equal(result.status,'registered');
if(result.status!=='registered') throw Error('Missing canonical pool');
const resolverAbi=parseAbi([
 'function text(bytes32,string) view returns (string)','function data(bytes32,string) view returns (bytes)',
 'function setText(bytes,string,string)','function setData(bytes,string,bytes)',
 'function roleCount(uint256) view returns (uint256)','function roles(uint256,address) view returns (uint256)',
 'error EACUnauthorizedAccountRoles(uint256 resource,uint256 roleBitmap,address account)',
]);
const name=tokenName(raw.token);
const node=namehash(name);
const dnsName=toHex(packetToBytes(name));
// ENSv2 Beta resolver records are read through UniversalResolver.resolve (no direct data(node, key) getter).
const urAbi=parseAbi(['function resolve(bytes,bytes) view returns (bytes,address)']);
const [dataResult,dataResolver]=await client.readContract({address:raw.universalResolver,abi:urAbi,functionName:'resolve',args:[dnsName,encodeFunctionData({abi:resolverAbi,functionName:'data',args:[node,'pool']})],blockNumber:block});
assert.equal(dataResolver.toLowerCase(),String(raw.resolver).toLowerCase());
const encoded=decodeFunctionResult({abi:resolverAbi,functionName:'data',data:dataResult});
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
// Beta resolver roles are key-scoped, so description/url go through registrar.setTokenText (creator only).
const metaAbi=parseAbi(['function setTokenText(address,string,string)','error NotCreator()','error KeyNotAllowed()']);
await client.simulateContract({address:raw.registrar,abi:metaAbi,functionName:'setTokenText',args:[raw.token,'description','smoke eth_call only'],account:raw.editor??raw.operator});
await client.simulateContract({address:raw.registrar,abi:metaAbi,functionName:'setTokenText',args:[raw.token,'url','https://example.com'],account:raw.editor??raw.operator});
await rejected(client.simulateContract({address:raw.registrar,abi:metaAbi,functionName:'setTokenText',args:[raw.token,'pool','forged'],account:raw.editor??raw.operator}),'KeyNotAllowed');
// The issuer contract gets no description/url rights, and nobody writes the resolver directly.
await rejected(client.simulateContract({address:raw.registrar,abi:metaAbi,functionName:'setTokenText',args:[raw.token,'description','issuer'],account:raw.create2Launcher}),'NotCreator');
await rejected(client.simulateContract({address:raw.resolver,abi:resolverAbi,functionName:'setText',args:[dnsName,'description','direct'],account:raw.editor??raw.operator}),'EACUnauthorizedAccountRoles');
await rejected(client.simulateContract({address:raw.resolver,abi:resolverAbi,functionName:'setText',args:[dnsName,'pool','forged'],account:raw.operator}),'EACUnauthorizedAccountRoles');
assert.equal(await client.readContract({address:raw.resolver,abi:resolverAbi,functionName:'roleCount',args:[0n],blockNumber:block}),0n);
const registrarAbi=parseAbi([
 'function recordByCreate2(address,(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks),bytes32,bytes32,address)',
 'error AlreadyRecorded()',
]);
await rejected(client.simulateContract({address:raw.registrar,abi:registrarAbi,functionName:'recordByCreate2',args:[raw.token,key,raw.salt,raw.initCodeHash,raw.editor??raw.operator],account:raw.create2Launcher}),'AlreadyRecorded');
const registryAbi=parseAbi([
 'function roleCount(uint256) view returns (uint256)','function roles(uint256,address) view returns (uint256)','function getResource(uint256) view returns (uint256)',
 'function getState(uint256) view returns ((uint8 status,uint64 expiry,address latestOwner,uint256 tokenId,uint256 resource))',
 'function setResolver(uint256,address)','error EACUnauthorizedAccountRoles(uint256 resource,uint256 roleBitmap,address account)',
]);
// Pinned RegistryRolesLib: ROLE_REGISTRAR = 1 << 0, ROLE_REGISTRAR_ADMIN = ROLE_REGISTRAR << 128.
const KEPT_REGISTRY_ROLES=1n|(1n<<128n);
const id=(label:string)=>BigInt(keccak256(new TextEncoder().encode(label)));
const rootState=await client.readContract({address:raw.ethRegistry,abi:registryAbi,functionName:'getState',args:[id('klamp')],blockNumber:block});
// Only REGISTRAR(+ADMIN) stays until hooks.klamp.eth is registered in stage 2.
const keptRegistryRoles=await client.readContract({address:raw.registry,abi:registryAbi,functionName:'roles',args:[0n,raw.operator],blockNumber:block});
assert.equal(await client.readContract({address:raw.registry,abi:registryAbi,functionName:'roleCount',args:[0n],blockNumber:block}),keptRegistryRoles);
assert.ok(keptRegistryRoles===0n||keptRegistryRoles===KEPT_REGISTRY_ROLES,'Unexpected registry roles after seal');
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
const report={chainId:config.chainId.toString(),checkedBlock:block.toString(),root:'klamp.eth',token:raw.token,poolId:result.poolId,addresses:Object.fromEntries(Object.keys(observedCodeHashes).map(k=>[k,raw[k]])),expiry:rootState.expiry.toString(),sealed:true,observedCodeHashes,versions,deploymentBlock,publicTransactions:[...new Set(publicTransactions)],checks:['ENS viem text/data','editor description/url eth_call','issuer metadata denied','operator pool/resolver denied','overwrite denied','sealed roles (registry REGISTRAR kept for hooks)'],ensAppUi:'not checked',humanVerification:'pending'};
writeFileSync(process.env.SMOKE_OUTPUT??'deployments/local.verification.json',JSON.stringify(report,null,2)+'\n');
console.log('Deployment smoke passed: ENS text/data, editor, overwrite, operator denial, sealed roles.');
