import { keccak256, parseAbi, toBytes, type Address } from "viem";
import { publicClient } from "./chain";
import { CONTRACTS, NETWORK } from "./config";

const eacAbi = parseAbi([
  "function roleCount(uint256 resource) view returns (uint256)",
  "function hasRoles(uint256 resource, uint256 roleBitmap, address account) view returns (bool)",
  "function getResource(uint256 anyId) view returns (uint256)",
  "function getExpiry(uint256 anyId) view returns (uint64)",
]);

// ENSv2 roles are 4-bit slots (RegistryRolesLib, PermissionedResolverLib); roleCount packs one holder count per slot.
const holders = (packed: bigint) => {
  let total = 0;
  for (let rest = packed; rest > 0n; rest >>= 4n) total += Number(rest & 0xfn);
  return total;
};
const slot = (bit: bigint) => 0xfn << bit;
const SET_TEXT = 4n;
const SET_DATA = 24n;
const labelId = (label: string) => BigInt(keccak256(toBytes(label)));
const NEVER = (1n << 64n) - 1n;

export type Seal = {
  blockNumber: bigint;
  resolverRootRoles: number;
  keys: { key: string; writers: number; registrarOnly: boolean }[];
  tokensRoles: number;
  tokensNeverExpires: boolean;
  klampRoles: number;
  klampExpiryYear: number;
  registryRegistrar: number;
  registryOtherRoles: number;
};

/** Who can still change the Klamp namespace, from ENSv2 Enhanced Access Control role counts. */
export async function readSeal(): Promise<Seal> {
  const blockNumber = await publicClient.getBlockNumber();
  const roleCount = (address: Address, resource: bigint) =>
    publicClient.readContract({ address, abi: eacAbi, functionName: "roleCount", args: [resource], blockNumber });
  const read = (address: Address, functionName: "getResource" | "getExpiry", label: string) =>
    publicClient.readContract({ address, abi: eacAbi, functionName, args: [labelId(label)], blockNumber });
  const registrarWrites = (key: string, bit: bigint) =>
    publicClient.readContract({ address: NETWORK.resolver, abi: eacAbi, functionName: "hasRoles", args: [labelId(key), 1n << bit, CONTRACTS.registrar], blockNumber });

  const [tokensResource, klampResource, tokensExpiry, klampExpiry] = await Promise.all([
    read(NETWORK.registry, "getResource", "tokens"),
    read(NETWORK.ethRegistry, "getResource", "klamp"),
    read(NETWORK.registry, "getExpiry", "tokens"),
    read(NETWORK.ethRegistry, "getExpiry", "klamp"),
  ]);
  const [resolverRoot, registryRoot, tokensRoles, klampRoles, keys] = await Promise.all([
    roleCount(NETWORK.resolver, 0n),
    roleCount(NETWORK.registry, 0n),
    roleCount(NETWORK.registry, tokensResource),
    roleCount(NETWORK.ethRegistry, klampResource),
    Promise.all(["pool", "description", "url", "avatar"].map(async (key) => {
      const [packed, text, data] = await Promise.all([roleCount(NETWORK.resolver, labelId(key)), registrarWrites(key, SET_TEXT), registrarWrites(key, SET_DATA)]);
      const writers = holders(packed & slot(SET_TEXT));
      const dataWriters = holders(packed & slot(SET_DATA));
      const registrarOnly = writers === 1 && text && (key === "pool" ? dataWriters === 1 && data : dataWriters === 0);
      return { key, writers: Math.max(writers, dataWriters), registrarOnly };
    })),
  ]);
  return {
    blockNumber,
    resolverRootRoles: holders(resolverRoot),
    keys,
    tokensRoles: holders(tokensRoles),
    tokensNeverExpires: tokensExpiry === NEVER,
    klampRoles: holders(klampRoles),
    klampExpiryYear: new Date(Number(klampExpiry) * 1000).getUTCFullYear(),
    registryRegistrar: holders(registryRoot & slot(0n)),
    registryOtherRoles: holders(registryRoot & ~(slot(0n) | slot(128n))),
  };
}
