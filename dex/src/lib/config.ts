import { ADDR } from "@klamp/demo-sdk";
import type { NetworkConfig } from "@klamp/sdk/canonicalPool";
import pathA from "@deployments/demo-pathA.json";
import poolSeeder from "@deployments/pool-seeder.txt?raw";
import phase1 from "@deployments/sepolia.phase1.json";
import type { Address } from "viem";

/** Every address comes from the repo's deployment records; nothing here is redeployed. */
export const NETWORK: NetworkConfig = {
  chainId: BigInt(phase1.chainId),
  poolManager: phase1.poolManager as Address,
  stateView: phase1.stateView as Address,
  universalResolver: phase1.universalResolver as Address,
  rootRegistry: phase1.rootRegistry as Address,
  ethRegistry: phase1.ethRegistry as Address,
  registry: phase1.registry as Address,
  resolver: phase1.resolver as Address,
  registryImplementation: phase1.registryImplementation as Address,
  resolverImplementation: phase1.resolverImplementation as Address,
};

export const CONTRACTS = {
  registrar: phase1.registrar as Address,
  launchpad: pathA.demoLaunchpad as Address,
  hook: pathA.deltaFeeHook as Address,
  poolSeeder: poolSeeder.trim() as Address,
  universalRouter: ADDR.UNIVERSAL_ROUTER,
  quoter: ADDR.V4_QUOTER,
};

export const ETH = "0x0000000000000000000000000000000000000000" as Address;

export type KnownToken = { address: Address; symbol: string; fromBlock?: string; mine?: boolean };
/** KHOOK: the team's path A token with a declared pool and an undeclared look-alike (block of its launch below). */
export const KNOWN_TOKENS: KnownToken[] = [{ address: pathA.khookToken as Address, symbol: "KHOOK", fromBlock: "11786000" }];

export const EXPLORER = "https://sepolia.etherscan.io";
/** v4-core reproduction: a hook that quotes 0.05% and charges 10% or 30% at swap time. */
export const ATTACK_TEST_URL = "https://github.com/EarthIsMine/klamp/blob/main/contract/test/QuoteDivergenceAttack.t.sol";
export const RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
