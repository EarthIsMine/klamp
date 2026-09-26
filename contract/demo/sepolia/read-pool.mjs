// Demo 2: reads a token's canonical pool using only standard ENS tooling (viem), without Klamp code.
// Usage: node read-pool.mjs [tokenAddress]
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const client = createPublicClient({ chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') })
const UNIVERSAL_RESOLVER_V2 = '0x5d25c1d6acbb71b7a28aa7899618a3412a8303e3' // ENSv2 Sepolia Beta (docs.ens.domains)

const token = (process.argv[2] ?? '0x5a37301CD105B8C9C85505B28FBE6327bd495188').toLowerCase()
const name = `${token}.tokens.klamp.eth`

const pool = await client.getEnsText({ name, key: 'pool', universalResolverAddress: UNIVERSAL_RESOLVER_V2 })
const description = await client.getEnsText({ name, key: 'description', universalResolverAddress: UNIVERSAL_RESOLVER_V2 })

console.log(`\n  ENS name     ${name}`)
console.log(`  pool         ${pool ?? '(not registered)'}`)
console.log(`  description  ${description ?? '-'}\n`)
