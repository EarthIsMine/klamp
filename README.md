# Klamp

**The fee you're quoted is the fee you pay.** Klamp lets a token's issuer declare its canonical Uniswap v4 pool **once**, records it in **ENSv2**, and lets any router or terminal read it with standard ENS tools to route around look-alike pools.

- Only the address a token's address cryptographically points to (its **issuer**) can declare. Nobody can declare for someone else's token.
- A declaration is permanent and nobody, us included, can rewrite it. The registrar is not upgradeable. After setup every role on the `tokens.klamp.eth` resolver, on `tokens.klamp.eth` and on `klamp.eth` itself was revoked, ours included. The `klamp.eth` registry keeps one role, REGISTRAR, only to add `hooks.klamp.eth` in stage 2; `tokens` is registered without expiry, so that role cannot replace it. Both demos read these role counts live from Sepolia.
- The record lives at `<token>.tokens.klamp.eth` (`text("pool")` = `eip155:<chainId>:<poolId>`, `data("pool")` = `abi.encode(chainId, PoolKey)`), readable with `viem.getEnsText`, no Klamp ABI needed.

## Why ENSv2

- **Data-only subnames.** Token names are never registered. `<token>.tokens.klamp.eth` exists only as records on the `tokens.klamp.eth` resolver (wildcard resolution), so a declaration is one resolver write, not a registration.
- **Per-record roles.** ENSv2 roles can be scoped to a single record key. One contract, the registrar, holds the setter role for exactly `pool` (text and data), `description` and `url`. Nobody holds a role for any other key.
- **A name nobody controls.** `klamp.eth` is registered for 1,000 years (until 3026) and holds no roles, `tokens.klamp.eth` never expires and holds no roles, and the resolver has no admin and no upgrade role.
- **Standard reads.** Any router, wallet or agent reads the record with `getEnsText` through UniversalResolverV2. A mapping in our own contract would only protect clients that know our ABI.

## For Uniswap and for agents

Today each router decides on its own which hooked pools to trust. Klamp adds an onchain answer that every router, API client or agent can check before signing: the pool the token's issuer declared, once. It changes no Uniswap contract and already plugs into Uniswap's live launch stack, since the Pools.trade entry points prove the creator with LiquidityLauncher's UERC20Factory graffiti. If a launch strategy recorded the pool at launch and a router read the record, every v4 launch would have a canonical pool from birth.

Trading agents that buy new tokens automatically are the easiest targets for look-alike pools. For them the check is one `getEnsText` read before signing.

Built for ETHGlobal Tokyo 2026 (ENS · Uniswap). Stage 1 (launch + canonical pool record) and the Klamp routing mode are deployed and exercised on Sepolia.

**Live demo: [klamp.kro.kr](https://klamp.kro.kr)**. The landing page resolves any token's canonical pool from ENSv2 in your browser (UniversalResolverV2 on Sepolia, no backend); [`/demo`](https://klamp.kro.kr/demo/) walks through the full flow with live V4Quoter quotes, a live ENSv2 lookup and the decoded launch and swap txs.

The repository keeps the onchain implementation and the protocol terminal together without coupling their toolchains.

## Issuer proof: three entry points

| Entry point | Caller (= issuer) | Proof |
|---|---|---|
| `recordByCreate2(token, key, salt, initCodeHash, creator)` | The launchpad contract that ran CREATE2, inside the launch tx | `CREATE2(msg.sender, salt, initCodeHash) == token` |
| `recordByLiquidityLauncher(token, launcher)` | A Pools.trade creator who called Uniswap's LiquidityLauncher directly | `UERC20Factory.getUERC20Address(..., launcher, keccak256(abi.encode(msg.sender))) == token` |
| `recordByLiquidityLauncherVia(token, launcher, nonce)` | A Pools.trade creator who launched through a self-destructing deployer contract (most real launches) | graffiti owner = `CREATE(msg.sender, nonce)`, and that address has no code |

Before writing, the registrar checks `TokenNotDeployed`, `TokenNotInPool`, `AlreadyRecorded`, `PoolNotInitialized`. Pools.trade entry points take no PoolKey: the pool is fixed to the Instant Launch pool (ETH, token, 2500, 25, no hook). The token's creator can later set `description` / `url` through `setTokenText` (only those two keys, only for their token).

## Deployments (Sepolia)

ENSv2: the official Sepolia ENSv2 Beta set ([ENS deployments](https://docs.ens.domains/learn/deployments#sepolia-ensv2-beta)). Uniswap v4: canonical Sepolia deployments.

| Contract | Address |
|---|---|
| CanonicalPoolRegistrar (verified) | [`0x820bE7B9aCdc7293A96cf7D4E10fd5e42fB1B36f`](https://sepolia.etherscan.io/address/0x820bE7B9aCdc7293A96cf7D4E10fd5e42fB1B36f#code) |
| `klamp.eth` UserRegistry | `0x32beA21696e8615583139f92F11349C32F3a6064` |
| `tokens.klamp.eth` PermissionedResolver | `0xa783344Fa423AC738D99cdfcaF1cB2Bc6B5ddC18` |
| DeltaFeeHook (demo D-type hook, 1% delta fee, verified) | `0x8CcDe930348ecA47D39A0104807acb0e16F6c044` |
| DemoLaunchpad (path A, verified) | `0x8FEf655cA19cAf33C92E3627ff9FA0E35bAf3260` |
| KHOOK — path A token, hooked canonical pool declared in the launch tx | `0x4cB41E85e1E16D7de576e2a262fF1b96eE948b96` |
| KDEMO — path B token, Pools.trade-style disposable launch | `0x5a37301CD105B8C9C85505B28FBE6327bd495188` |
| PoolSeeder (creates the undeclared pool used in the demo) | `0x3F4bE4f833BCcf3b2A4c243f8E6e02762613Fabc` |

Explorer: [klamp.eth](https://explorer.ens.dev/klamp.eth) · [tokens.klamp.eth](https://explorer.ens.dev/tokens.klamp.eth) (Protocol ENSv2, role holders 0).

The repository build of `CanonicalPoolRegistrar` matches the deployed bytecode (immutables and metadata aside); team deployment records are in [`contract/deployments/`](contract/deployments/) and [`contract/docs/evidence/sepolia-broadcast/`](contract/docs/evidence/sepolia-broadcast/).

## Where to look

### ENSv2 (Sepolia ENSv2 Beta)

| What | Code |
|---|---|
| Registrar writes `text("pool")` and `data("pool")` on the PermissionedResolver of `tokens.klamp.eth` after the issuer proof | [`CanonicalPoolRegistrar.sol:147-165`](contract/src/CanonicalPoolRegistrar.sol#L147-L165) |
| Issuer-only `description` / `url` updates | [`CanonicalPoolRegistrar.sol:169-175`](contract/src/CanonicalPoolRegistrar.sol#L169-L175) |
| `klamp.eth` UserRegistry creates `tokens`; Enhanced Access Control grants the registrar `ROLE_SET_TEXT` / `ROLE_SET_DATA` scoped per record key (`pool`, `description`, `url`) | [`Phase1Setup.sol:52-76`](contract/script/Phase1Setup.sol#L52-L76) |
| Seal: root roles on the resolver, roles on `tokens.klamp.eth` and our roles on `klamp.eth` are revoked, so no one (us included) can rewrite a record; the registry keeps only REGISTRAR for `hooks.klamp.eth` (stage 2) | [`Phase1Setup.sol:98-133`](contract/script/Phase1Setup.sol#L98-L133) |
| The same role counts, read live in both demos | [`web/src/data/protocol/sepolia.ts`](web/src/data/protocol/sepolia.ts) `readSeal`, [`dex/src/lib/seal.ts`](dex/src/lib/seal.ts) |
| Token names are wildcard under `tokens.klamp.eth`; lookup via UniversalResolverV2 with namespace, text/data and pool checks (SDK) | [`contract/sdk/canonicalPool.ts:54`](contract/sdk/canonicalPool.ts#L54) |
| The same lookup, in the browser | [`web/src/data/protocol/sepolia.ts:105`](web/src/data/protocol/sepolia.ts#L105), UI in [`LiveLookup.tsx`](web/src/components/lookup/LiveLookup.tsx#L114) |
| Plain `viem.getEnsText`, no Klamp code | [`read-pool.mjs:12`](contract/demo/sepolia/read-pool.mjs#L12) |

### Uniswap v4

| What | Code |
|---|---|
| Launchpad: CREATE2 token, `PoolManager.initialize` of a hooked pool, locked single-sided liquidity, canonical record, all in the launch tx | [`DemoLaunchpad.sol:102-142`](contract/src/demo/DemoLaunchpad.sol#L102-L142) |
| Delta-fee hook (`afterSwap` + `afterSwapReturnDelta`) | [`DeltaFeeHook.sol:32-46`](contract/src/demo/DeltaFeeHook.sol#L32-L46) |
| Registrar checks the pool is initialized with `PoolManager.extsload` | [`CanonicalPoolRegistrar.sol:147-156`](contract/src/CanonicalPoolRegistrar.sol#L147-L156) |
| Pools.trade issuer proof via Uniswap LiquidityLauncher / UERC20Factory graffiti | [`CanonicalPoolRegistrar.sol:120-145`](contract/src/CanonicalPoolRegistrar.sol#L120-L145) |
| Route verdict (`allow`, `requote_canonical`, `requote_static`, `hold`) | [`contract/sdk/judge.ts:13`](contract/sdk/judge.ts#L13) |
| V4Quoter `quoteExactInputSingle`, Universal Router `V4_SWAP` calldata build and pre-signing PoolKey check | [`klamp-sdk.mjs:83-133`](contract/demo/sepolia/klamp-sdk.mjs#L83-L133) |
| Live quotes and swap calldata decoding in the web demo | [`web/src/data/protocol/sepolia.ts:177-272`](web/src/data/protocol/sepolia.ts#L177-L272) |

## Repository layout

```text
klamp/
├── contract/   # Phase 1 Solidity, ENSv2 integration, SDK, scripts, and tests
├── dex/        # Vite dApp: launch, look-alike pool and swap with real Sepolia transactions
└── web/        # Next.js App Router protocol terminal
```

- [`contract/README.md`](contract/README.md) describes the implemented Phase 1 guarantees, deployment flow, and validation evidence.
- [`web/README.md`](web/README.md) describes the frontend architecture and demo flow.
- [`dex/README.md`](dex/README.md) describes the wallet dApp that uses the deployed contracts as a launchpad and router would.

## Contract workspace

The contract workspace uses npm and Foundry. Run its commands from `contract/`:

```sh
cd contract
./scripts/setup-dependencies.sh
forge test
npm test
npm run typecheck
```

## Try it on Sepolia

```sh
cd contract
FOUNDRY_PROFILE=fork forge test          # Sepolia fork tests against the live registrar (10 tests)

cd demo/sepolia && npm ci
node read-pool.mjs 0x4cB41E85e1E16D7de576e2a262fF1b96eE948b96     # standard ENS read, no Klamp code
node klamp-swap.mjs --mode naive --amount 0.0005                     # picks the best quote: an undeclared pool
node klamp-swap.mjs --mode klamp --amount 0.0005                     # ENS lookup → judge → requote canonical
KLAMP_PK=0x... node klamp-swap.mjs --mode klamp --amount 0.0005 --execute   # swaps through Universal Router
```

Pass signing keys only through environment variables; never commit them.

## Web workspace

The frontend uses pnpm 12.6.0. Run its commands from `web/`:

```sh
cd web
pnpm install
pnpm dev
```

Validation commands:

```sh
pnpm lint
pnpm build
```

The web workspace is statically exported and deployed from `main` to GitHub Pages through `.github/workflows/deploy-pages.yml`, together with `dex/` at `/dex/`. Its intended custom domain is `https://klamp.kro.kr`; complete the repository Pages and DNS settings described in [`web/README.md`](web/README.md) before the first production deployment.

The UI models the Phase 1 SDK results as `registered`, `not_registered`, or `lookup_failed`, route comparisons as `match`, `mismatch`, or `blocked`, and route verdicts as `allow`, `requote_canonical`, `requote_static`, or `hold`. The trace follows the path A demo on Sepolia (launch, naive quote, ENS lookup, who can still change the record, verdict, requote, verified swap) and reads each step from Sepolia in the browser: the launch tx's `CanonicalRecorded` and `Initialize` events, V4Quoter quotes for both pools, the ENSv2 lookup, the ENSv2 role counts on the namespace, and the team's Klamp-mode swap tx, whose Universal Router calldata is decoded and checked against the judged PoolKey. Each step is labelled `Live · Sepolia #<block>`, or `Recorded snapshot` if a read fails and the recorded value is shown instead; a failed ENS lookup stays `lookup_failed`. Only the final attack outcome is simulated and labelled in the UI. Capped hooks (stage 2) are roadmap only.

For presentations, the demo is an animated node diagram with a one-line caption per step. `Play` autoplays all nine steps; `→`/Space, `←`, `P` (play) and `R` (reset) drive it from the keyboard, and the progress dots seek to any step using a deterministic recorded snapshot (labelled as such).

## DEX workspace

`dex/` is a separate Vite app (pnpm) where you use Klamp with your own wallet: launch a token and its declared pool through DemoLaunchpad, open a look-alike pool as a third party, and swap through Universal Router with Klamp routing on or off. It imports `contract/sdk`, `contract/demo/sepolia/klamp-sdk.mjs` and `contract/deployments` directly.

```sh
cd dex
pnpm install
pnpm dev        # http://localhost:5174
```

It is deployed with the web workspace: the Pages workflow builds both and serves dex at [`/dex/`](https://klamp.kro.kr/dex/).

## Known limits

- The ENS app (`sepolia.app.ens.domains`) is ENSv1 and does not read ENSv2 records. The ENSv2 explorer shows `klamp.eth` and `tokens.klamp.eth`; token names are wildcard (not registered), so their records are read through UniversalResolverV2 (`read-pool.mjs`).
- Sepolia has no InstantLaunchStrategy, so the path B demo pool was initialized by our disposable launcher and holds no liquidity.
- Records for other chains (e.g. Robinhood Chain) are roadmap: the registrar can only verify state on its own chain. Until then the SDK uses the verified `TokenLaunched` event from the five trusted Pools.trade strategies.
- Stage 2 (CappedHookProxy fee cap) is designed, not built.

## AI usage

Parts of this repository were written with AI coding agents and reviewed by the team: Codex (phase 1 contract, SDK, local deployment flow and the web terminal) and Claude Code (Anthropic: design-doc alignment, the ENSv2 Beta registrar port, Sepolia setup and demo scripts, fork tests, the Sepolia demo SDK and this README). On-chain analysis of Pools.trade launches used the Etherscan and Blockscout APIs. Per-task AI and human steps are logged in [`contract/docs/WORKLOG.md`](contract/docs/WORKLOG.md).
