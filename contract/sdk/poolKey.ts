import { encodeAbiParameters, keccak256, type Address, type Hex } from 'viem';
export interface PoolKey { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address }
export const poolKeyAbi = {type:'tuple',components:[{name:'currency0',type:'address'},{name:'currency1',type:'address'},{name:'fee',type:'uint24'},{name:'tickSpacing',type:'int24'},{name:'hooks',type:'address'}]} as const;
/** Same value as Solidity keccak256(abi.encode(key)) and v4 PoolIdLibrary. */
export function hashPoolKey(key: PoolKey): Hex {
 return keccak256(encodeAbiParameters([poolKeyAbi],[key]));
}
