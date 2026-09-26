// 데모 터미널: 같은 풀 후보로 일반 라우터 모드와 Klamp 모드를 비교한다.
// 실행: node klamp-swap.mjs --mode naive|klamp [--amount 0.001] [--slippage 5] [--execute]
//   --execute 를 주면 KLAMP_PK(환경변수)의 계정으로 Universal Router에 실제 체결한다. 없으면 견적·판정·calldata 검증까지만.
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

console.log(`\n[${mode === 'naive' ? '일반 라우터' : 'Klamp'}] ETH ${formatUnits(amountIn, 18)} → ${cfg.symbol}`)

// 1. 모든 후보 풀 견적 (일반 라우터는 여기서 가장 좋은 풀을 고른다)
const quotes = []
for (const k of candidates) {
  const out = await quote(k, amountIn)
  quotes.push({ key: k, out })
  console.log(`  quote  ${short(k)}  → ${out === null ? 'fail' : fmt(out)}`)
}
const best = (list) => list.filter((q) => q.out !== null).sort((a, b) => (b.out > a.out ? 1 : -1))[0]
let chosen = best(quotes)

// 2. Klamp: 대표 풀 조회 → 판정 → 필요하면 허용된 풀로만 재견적
if (mode === 'klamp') {
  const c = await getCanonicalPool(token)
  console.log(`  ENS    ${token.toLowerCase().slice(0, 10)}….tokens.klamp.eth → ${c.status}${c.poolId ? ' ' + c.poolId.slice(0, 10) + '…' : ''}`)
  const verdict = judge(token, c, [chosen.key])
  console.log(`  judge  route [${short(chosen.key)}] → ${verdict}`)
  if (verdict !== 'allow') {
    const ok = allowedPools(c, candidates, verdict)
    chosen = best(quotes.filter((q) => ok.some((k) => poolIdOf(k) === poolIdOf(q.key))))
    if (!chosen) { console.log('  → 허용된 풀이 없어 거래하지 않음'); process.exit(0) }
    console.log(`  requote → ${short(chosen.key)} (${isStatic(chosen.key) ? 'static' : 'canonical'})`)
  }
}

// 3. calldata 생성과 서명 전 검증
const minOut = chosen.out * (10000n - slippageBps) / 10000n
const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
const data = buildSwap(chosen.key, amountIn, minOut, deadline)
const v = verifySwapCalldata(data, [chosen.key])
console.log(`  route  ${short(chosen.key)}  quote ${fmt(chosen.out)}  min ${fmt(minOut)}  verify ${v.ok ? 'OK' : 'FAIL'}`)
if (!v.ok) process.exit(1)

// 4. 체결
if (!execute) { console.log('  (dry run: --execute 로 실제 체결)\n'); process.exit(0) }
const account = privateKeyToAccount(process.env.KLAMP_PK)
const wallet = createWalletClient({ account, chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const hash = await wallet.sendTransaction({ to: ADDR.UNIVERSAL_ROUTER, data, value: amountIn })
const rc = await client.waitForTransactionReceipt({ hash })
const got = parseEventLogs({ abi: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)']), logs: rc.logs })
  .filter((l) => l.address.toLowerCase() === token.toLowerCase() && l.args.to.toLowerCase() === account.address.toLowerCase())
  .at(-1)?.args.value ?? 0n // 라우터의 TAKE_ALL이 마지막 전송이다 (훅 수수료 수령 전송은 제외)
console.log(`  tx     ${hash} (${rc.status})`)
console.log(`  받음   ${fmt(got)} ${cfg.symbol}  (견적 대비 ${((Number(got) / Number(chosen.out) - 1) * 100).toFixed(2)}%)\n`)
