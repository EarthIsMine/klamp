import { readFileSync } from 'node:fs';
import { isAddress, keccak256, parseAbi, type Address, type Hex } from 'viem';
import { createReader } from '../sdk/canonicalPool.js';

// Read-only. Expected hashes must come from independently reviewed deployments/builds.
const input=JSON.parse(readFileSync(process.env.DEPLOYMENT_CONFIG??'deployments/sepolia.candidates.json','utf8'));
const fields=['rootRegistry','ethRegistry','ethRegistrar','universalResolver','verifiableFactory','registryImplementation','resolverImplementation','poolManager','stateView','paymentToken','tokenFactory','launcher'];
for(const key of [...fields,'operator','hooksAdmin']) if(!isAddress(input[key]??'')||/^0x0{40}$/i.test(input[key])) throw Error(`Missing or invalid configuration: ${key}`);
if(!process.env.RPC_URL) throw Error('RPC_URL is required');
const client=createReader(process.env.RPC_URL);
const chainId=BigInt(input.chainId);
if(BigInt(await client.getChainId())!==chainId) throw Error('Wrong chain');
const block=await client.getBlockNumber();
for(const key of fields) {
 const code=await client.getCode({address:input[key],blockNumber:block});
 if(!code||code==='0x') throw Error(`No contract code: ${key}`);
 const expected=input.expectedCodeHashes?.[key] as Hex|undefined;
 if(!expected||!/^0x[0-9a-fA-F]{64}$/.test(expected)||keccak256(code).toLowerCase()!==expected.toLowerCase()) throw Error(`Unverified protocol code hash: ${key}`);
}
const abi=parseAbi([
 'function ROOT_REGISTRY() view returns (address)','function ETH_REGISTRY() view returns (address)','function poolManager() view returns (address)',
 'function getSubregistry(string) view returns (address)','function getOwner(uint256) view returns (address)',
 'function hasRootRoles(uint256,address) view returns (bool)','function balanceOf(address) view returns (uint256)',
 'function allowance(address,address) view returns (uint256)','function getRegisterPrice(string,uint64,address) view returns (uint256,uint256)',
 'function MIN_REGISTER_DURATION() view returns (uint64)',
]);
const read=(address:Address,functionName:string,args:readonly unknown[]=[])=>client.readContract({address,abi,functionName,args,blockNumber:block} as Parameters<typeof client.readContract>[0]);
const same=(a:unknown,b:string)=>typeof a==='string'&&a.toLowerCase()===b.toLowerCase();
if(!same(await read(input.universalResolver,'ROOT_REGISTRY'),input.rootRegistry)||!same(await read(input.rootRegistry,'getSubregistry',['eth']),input.ethRegistry)||!same(await read(input.ethRegistrar,'ETH_REGISTRY'),input.ethRegistry)||!same(await read(input.stateView,'poolManager'),input.poolManager)) throw Error('Protocol linkage mismatch');
// RegistryRolesLib.ROLE_REGISTRAR = 1 << 0 in the pinned source.
if(!await read(input.ethRegistry,'hasRootRoles',[1n,input.ethRegistrar])) throw Error('ETH registrar lacks registration role');
const nativeBalance=await client.getBalance({address:input.operator,blockNumber:block});
if(nativeBalance===0n) throw Error('Operator has no gas funds');
const owner=await read(input.ethRegistry,'getOwner',[BigInt(keccak256(new TextEncoder().encode('klamp')))]) as Address;
if(!/^0x0{40}$/i.test(owner)&&!same(owner,input.operator)) throw Error('klamp.eth is owned by another account');
let registrationCost:bigint|undefined;
if(/^0x0{40}$/i.test(owner)) {
 const duration=BigInt(input.registrationDuration);
 if(duration<(await read(input.ethRegistrar,'MIN_REGISTER_DURATION') as bigint)||duration>2n**64n-1n) throw Error('Invalid registration duration');
 const [base,premium]=await read(input.ethRegistrar,'getRegisterPrice',['klamp',duration,input.paymentToken]) as readonly [bigint,bigint];
 registrationCost=base+premium;
 if(registrationCost>BigInt(input.maxRegistrationPrice)) throw Error('Registration exceeds price cap');
 const balance=await read(input.paymentToken,'balanceOf',[input.operator]) as bigint;
 if(balance<registrationCost) throw Error('Insufficient registration payment funds');
}
const allowance=await read(input.paymentToken,'allowance',[input.operator,input.ethRegistrar]) as bigint;
console.log(JSON.stringify({status:'preflight passed',chainId:chainId.toString(),block:block.toString(),owner,registrationCost:registrationCost?.toString(),allowance:allowance.toString(),nativeBalance:nativeBalance.toString(),note:'Read-only checks; signer access and gas estimate must be checked by forge simulation.'},null,2));
