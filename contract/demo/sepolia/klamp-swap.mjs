// Demo terminal: compares naive router mode and Klamp mode on the same candidate pools.
// Usage: node klamp-swap.mjs --mode naive|klamp [--amount 0.001] [--slippage 5] [--execute]
//   With --execute, swaps for real on the Universal Router from the KLAMP_PK (env var) account. Without it, stops after quote, verdict and calldata check.
import fs from 'fs'
import { createWalletClient, http, parseEther, formatUnits, parseEventLogs, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import {
  client, ADDR, getCanonicalPool, judge, allowedPools, quote, buildSwap, verifySwapCalldata, poolIdOf, isStatic,
} from './klamp-sdk.mjs'

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : (process.argv[i + 1] ?? true) }
const mode = arg('mode', 'klamp')
const amountIn = parseEther(String(arg('amount', '0.001')))
const slippageBps = BigInt(Math.round(Number(arg('slippage', '5')) * 100))
const execute = process.argv.includes('--execute')

const cfg = JSON.parse(fs.readFileSync(new URL('./pools.json', import.meta.url)))
const token = cfg.token
const candidates = cfg.candidates
const short = (k) => `${poolIdOf(k).slice(0, 10)}… fee ${k.fee} hooks ${k.hooks === '0x0000000000000000000000000000000000000000' ? 'none' : k.hooks.slice(0, 8) + '…'}`
const fmt = (x) => Number(formatUnits(x, 18)).toLocaleString('en-US', { maximumFractionDigits: 2 })

console.log(`\n[${mode === 'naive' ? 'Naive router' : 'Klamp'}] ETH ${formatUnits(amountIn, 18)} → ${cfg.symbol}`)

// 1. Quote every candidate pool (the naive router picks the best pool here)
const quotes = []
for (const k of candidates) {
  const out = await quote(k, amountIn)
  quotes.push({ key: k, out })
  console.log(`  quote  ${short(k)}  → ${out === null ? 'fail' : fmt(out)}`)
}
const best = (list) => list.filter((q) => q.out !== null).sort((a, b) => (b.out > a.out ? 1 : -1))[0]
let chosen = best(quotes)

// 2. Klamp: canonical pool lookup → verdict → if needed, requote on allowed pools only
if (mode === 'klamp') {
  const c = await getCanonicalPool(token)
  console.log(`  ENS    ${token.toLowerCase().slice(0, 10)}….tokens.klamp.eth → ${c.status}${c.poolId ? ' ' + c.poolId.slice(0, 10) + '…' : ''}`)
  const verdict = judge(token, c, [chosen.key])
  console.log(`  judge  route [${short(chosen.key)}] → ${verdict}`)
  if (verdict !== 'allow') {
    const ok = allowedPools(c, candidates, verdict)
    chosen = best(quotes.filter((q) => ok.some((k) => poolIdOf(k) === poolIdOf(q.key))))
    if (!chosen) { console.log('  → No allowed pool, not trading'); process.exit(0) }
    console.log(`  requote → ${short(chosen.key)} (${isStatic(chosen.key) ? 'static' : 'canonical'})`)
  }
}

// 3. Build calldata and check it before signing
const minOut = chosen.out * (10000n - slippageBps) / 10000n
const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
const data = buildSwap(chosen.key, amountIn, minOut, deadline)
const v = verifySwapCalldata(data, [chosen.key])
console.log(`  route  ${short(chosen.key)}  quote ${fmt(chosen.out)}  min ${fmt(minOut)}  verify ${v.ok ? 'OK' : 'FAIL'}`)
if (!v.ok) process.exit(1)

// 4. Execute
if (!execute) { console.log('  (dry run: pass --execute to swap for real)\n'); process.exit(0) }
const account = privateKeyToAccount(process.env.KLAMP_PK)
const wallet = createWalletClient({ account, chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const hash = await wallet.sendTransaction({ to: ADDR.UNIVERSAL_ROUTER, data, value: amountIn })
const rc = await client.waitForTransactionReceipt({ hash })
const got = parseEventLogs({ abi: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']), logs: rc.logs })
  .filter((l) => l.address.toLowerCase() === token.toLowerCase() && l.args.to.toLowerCase() === account.address.toLowerCase())
  .at(-1)?.args.value ?? 0n // the router's TAKE_ALL is the last transfer (excluding the hook fee collection transfer)
console.log(`  tx     ${hash} (${rc.status})`)
console.log(`  got    ${fmt(got)} ${cfg.symbol}  (vs quote ${((Number(got) / Number(chosen.out) - 1) * 100).toFixed(2)}%)\n`)
