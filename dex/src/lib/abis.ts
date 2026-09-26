import { parseAbi, parseAbiItem } from "viem";

const KEY = "(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)";

export const launchpadAbi = parseAbi([
  "function launch(string name, string symbol) returns (address token)",
  "function predictToken(address creator, string name, string symbol) view returns (address)",
  "event Launched(address indexed token, address indexed creator, bytes32 poolId)",
]);

export const registrarAbi = parseAbi([
  `function recordByCreate2(address token, ${KEY} key, bytes32 salt, bytes32 initCodeHash, address creator)`,
  "function setTokenText(address token, string key, string value)",
  "function creatorOf(address token) view returns (address)",
  "function canonicalPoolOf(address token) view returns (bytes32)",
  "event CanonicalRecorded(address indexed token, bytes32 indexed poolId, address indexed issuer, address creator)",
  "error NotIssuer()",
  "error TokenNotDeployed()",
  "error PoolNotInitialized()",
  "error TokenNotInPool()",
  "error AlreadyRecorded()",
  "error NotCreator()",
  "error KeyNotAllowed()",
]);

export const seederAbi = parseAbi([`function seed(${KEY} key, int24 tickLower, int24 tickUpper, uint256 amount)`]);

export const stateViewAbi = parseAbi([
  "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
]);

export const tokenAbi = parseAbi([
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

export const initializeEvent = parseAbiItem(
  "event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)",
);
