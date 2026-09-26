// Klamp SDK (runnable JS port of the TypeScript code in the phase 1 design doc + phase 3/4 quote and execute)
import {
  createPublicClient, http, keccak256, encodeAbiParameters, decodeAbiParameters, parseAbi,
  encodeFunctionData, decodeFunctionData, decodeFunctionResult, toHex, hexToBytes, parseAbiParameters,
} from 'viem'
import { sepolia } from 'viem/chains'
import { normalize, namehash, packetToBytes } from 'viem/ens'

export const ADDR = {
  UNIVERSAL_RESOLVER_V2: '0x5d25c1d6acbb71b7a28aa7899618a3412a8303e3', // ENSv2 Sepolia Beta
  TOKENS_RESOLVER: '0xa783344Fa423AC738D99cdfcaF1cB2Bc6B5ddC18', // tokens.klamp.eth resolver (fixed after setup)
  POOL_MANAGER: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
  V4_QUOTER: '0x61b3f2011a92d183c7dbadbda940a7555ccf9227',
  UNIVERSAL_ROUTER: '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b',
}
export const ZERO = '0x0000000000000000000000000000000000000000'
const DYNAMIC_FEE_FLAG = 0x800000

export const client = createPublicClient({ chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') })

const POOL_KEY = {
  type: 'tuple',
  components: [
    { name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' },
    { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' },
  ],
}
const dataAbi = parseAbi(['function data(bytes32 node, string key) view returns (bytes)'])
const extAbi = parseAbi(['function resolve(bytes name, bytes data) view returns (bytes)'])
const eq = (a, b) => a.toLowerCase() === b.toLowerCase()
export const poolIdOf = (key) => keccak256(encodeAbiParameters([POOL_KEY], [key]))

/** Phase 1: the token's canonical pool. registered / not_registered / lookup_failed */
export async function getCanonicalPool(token, root = 'klamp.eth') {
  const name = normalize(`${token.toLowerCase()}.tokens.${root}`)
  const ur = ADDR.UNIVERSAL_RESOLVER_V2
  try {
    const resolver = await client.getEnsResolver({ name, universalResolverAddress: ur })
    if (!eq(resolver, ADDR.TOKENS_RESOLVER)) return { status: 'lookup_failed', reason: 'unexpected resolver' }
    const text = await client.getEnsText({ name, key: 'pool', universalResolverAddress: ur, strict: true })
    if (text === null) return { status: 'not_registered' }
    const m = /^eip155:(\d+):(0x[0-9a-f]{64})$/.exec(text)
    if (!m || Number(m[1]) !== client.chain.id) return { status: 'lookup_failed', reason: 'bad pool record' }
    const poolId = m[2]
    const call = encodeFunctionData({ abi: dataAbi, functionName: 'data', args: [namehash(name), 'pool'] })
    const out = await client.readContract({
      address: ADDR.TOKENS_RESOLVER, abi: extAbi, functionName: 'resolve', args: [toHex(packetToBytes(name)), call],
    })
    const raw = decodeFunctionResult({ abi: dataAbi, functionName: 'data', data: out })
    const [chainId, key] = decodeAbiParameters([{ type: 'uint256' }, POOL_KEY], raw)
    if (Number(chainId) !== client.chain.id || poolIdOf(key) !== poolId) return { status: 'lookup_failed', reason: 'text/data mismatch' }
    if (!eq(key.currency0, token) && !eq(key.currency1, token)) return { status: 'lookup_failed', reason: 'token not in key' }
    return { status: 'registered', poolId, key }
  } catch (e) {
    return { status: 'lookup_failed', reason: e.shortMessage || e.message }
  }
}

/** Pool whose fee is fixed in the PoolKey: no hook + static fee */
export const isStatic = (k) => eq(k.hooks, ZERO) && (k.fee & DYNAMIC_FEE_FLAG) === 0

/** Phase 3 verdict: only looks at pools in the route that contain the token */
export function judge(token, c, route) {
  const hops = route.filter((k) => eq(k.currency0, token) || eq(k.currency1, token))
  const isCanonical = (k) => c.status === 'registered' && poolIdOf(k) === c.poolId
  if (hops.every((k) => isStatic(k) || isCanonical(k))) return 'allow'
  if (c.status === 'registered') return 'requote_canonical'
  if (c.status === 'not_registered') return 'requote_static'
  return 'hold'
}

/** Pools usable for a requote after the verdict */
export function allowedPools(c, candidates, verdict) {
  if (verdict === 'hold') return []
  return candidates.filter((k) => isStatic(k) || (c.status === 'registered' && poolIdOf(k) === c.poolId))
}

const quoterAbi = parseAbi([
  'function quoteExactInputSingle(((address,address,uint24,int24,address) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData) params) returns (uint256 amountOut, uint256 gasEstimate)',
])

/** V4Quoter quote (ETH → token, exact in). Returns null on failure */
export async function quote(key, amountIn) {
  try {
    const { result } = await client.simulateContract({
      address: ADDR.V4_QUOTER, abi: quoterAbi, functionName: 'quoteExactInputSingle',
      args: [{ poolKey: [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks], zeroForOne: true, exactAmount: amountIn, hookData: '0x' }],
    })
    return result[0]
  } catch { return null }
}

// ---------- Phase 4: Universal Router calldata ----------
const urAbi = parseAbi(['function execute(bytes commands, bytes[] inputs, uint256 deadline) payable'])
const V4_SWAP = 0x10
const ACT = { SWAP_EXACT_IN_SINGLE: 0x06, SETTLE_ALL: 0x0c, TAKE_ALL: 0x0f }
const EXACT_IN_SINGLE = [{ type: 'tuple', components: [{ ...POOL_KEY, name: 'poolKey' }, { name: 'zeroForOne', type: 'bool' }, { name: 'amountIn', type: 'uint128' }, { name: 'amountOutMinimum', type: 'uint128' }, { name: 'hookData', type: 'bytes' }] }]

/** Builds calldata for the requote route directly (ETH → token, single pool) */
export function buildSwap(key, amountIn, minOut, deadline) {
  const actions = toHex(new Uint8Array([ACT.SWAP_EXACT_IN_SINGLE, ACT.SETTLE_ALL, ACT.TAKE_ALL]))
  const params = [
    encodeAbiParameters(EXACT_IN_SINGLE, [{ poolKey: key, zeroForOne: true, amountIn, amountOutMinimum: minOut, hookData: '0x' }]),
    encodeAbiParameters(parseAbiParameters('address, uint256'), [key.currency0, amountIn]),
    encodeAbiParameters(parseAbiParameters('address, uint256'), [key.currency1, minOut]),
  ]
  const input = encodeAbiParameters(parseAbiParameters('bytes, bytes[]'), [actions, params])
  return encodeFunctionData({ abi: urAbi, functionName: 'execute', args: [toHex(new Uint8Array([V4_SWAP])), [input], deadline] })
}

/** Pre-signing check: every v4 swap pool in the calldata matches the route that passed the verdict */
export function verifySwapCalldata(calldata, judgedKeys) {
  const { args } = decodeFunctionData({ abi: urAbi, data: calldata })
  const [commands, inputs] = args
  const cmds = [...hexToBytes(commands)]
  const allowed = new Set(judgedKeys.map(poolIdOf))
  const seen = []
  cmds.forEach((cmd, i) => {
    if ((cmd & 0x3f) !== V4_SWAP) return
    const [actions, params] = decodeAbiParameters(parseAbiParameters('bytes, bytes[]'), inputs[i])
    ;[...hexToBytes(actions)].forEach((a, j) => {
      if (a === ACT.SWAP_EXACT_IN_SINGLE) {
        const [p] = decodeAbiParameters(EXACT_IN_SINGLE, params[j])
        seen.push(poolIdOf(p.poolKey))
      } else if ([0x07, 0x08, 0x09].includes(a)) {
        throw new Error('multi-hop/exact-out actions not handled in demo verifier')
      }
    })
  })
  const ok = seen.length > 0 && seen.every((id) => allowed.has(id))
  return { ok, pools: seen }
}

// ---------- Event fallback: Pools.trade tokens with no ENS record (Robinhood Chain) ----------
export const TOKEN_LAUNCHED_TOPIC0 = '0x3b3d2bafdcae274a232217e1f80ee4305d3af6aa25c8b14b1681bd68d18042a4'
/** Trusted InstantLaunchStrategy contracts (Robinhood Chain 4663). All 5 were deployed by the Pools.trade deployer EOA 0x32f4b2e6… */
export const TRUSTED_LAUNCH_EMITTERS = [
  '0x23f8209572b4a1c2ad88a42749e830791fb027f1',
  '0xad44d55e7f8337c3ce113fbb591486e85be104b2',
  '0x7c48dde3b447381f4d986334679b3afc7f2d35c2',
  '0xc9566675b1ea42861546f3c5b74ace2c79c49572',
  '0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491',
]

/** Default log source: Etherscan V2 getLogs (topic0 + topic2 = token, one call). The caller filters by emitting address.
 *  Can be swapped for another indexer or RPC */
export function etherscanLogSource(chainid, apikey) {
  return async (token) => {
    const q = new URLSearchParams({
      chainid: String(chainid), module: 'logs', action: 'getLogs', fromBlock: '0', toBlock: 'latest',
      topic0: TOKEN_LAUNCHED_TOPIC0, topic0_2_opr: 'and', topic2: '0x' + token.toLowerCase().slice(2).padStart(64, '0'), apikey,
    })
    const r = await (await fetch('https://api.etherscan.io/v2/api?' + q)).json()
    if (r.status === '0' && r.message !== 'No records found') throw new Error(`log source: ${r.result}`)
    return Array.isArray(r.result) ? r.result : []
  }
}

/** Finds the launch pool from TokenLaunched events emitted by trusted addresses. Result has the same shape as getCanonicalPool */
export async function getLaunchPoolFromEvents(token, fetchLogs) {
  try {
    {
      for (const log of await fetchLogs(token)) {
        if (!TRUSTED_LAUNCH_EMITTERS.includes(log.address.toLowerCase())) continue // only events emitted by trusted addresses
        if (log.topics[0].toLowerCase() !== TOKEN_LAUNCHED_TOPIC0) continue
        if ('0x' + log.topics[2].slice(26).toLowerCase() !== token.toLowerCase()) continue
        const [key] = decodeAbiParameters([POOL_KEY], log.data)
        if (poolIdOf(key) !== log.topics[1].toLowerCase()) return { status: 'lookup_failed', reason: 'poolId mismatch' }
        const fixed = eq(key.currency0, ZERO) && eq(key.currency1, token) && key.fee === 2500 && key.tickSpacing === 25 && eq(key.hooks, ZERO)
        if (!fixed) return { status: 'lookup_failed', reason: 'unexpected launch PoolKey' }
        return { status: 'registered', poolId: poolIdOf(key), key, source: 'event', txhash: log.transactionHash }
      }
    }
    return { status: 'not_registered' }
  } catch (e) {
    return { status: 'lookup_failed', reason: e.message }
  }
}
