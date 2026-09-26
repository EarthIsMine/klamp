# Klamp

**The fee you're quoted is the fee you pay.** Klamp lets a token's issuer declare its canonical Uniswap v4 pool **once**, records it in **ENSv2**, and lets any router or terminal read it with standard ENS tools to route around look-alike pools.

- Only the address a token's address cryptographically points to (its **issuer**) can declare. Nobody can declare for someone else's token.
- A declaration is permanent. Registrar is not upgradeable, and every role over `klamp.eth`, `tokens.klamp.eth` and the resolver is revoked after setup, including ours. One registry role (REGISTRAR) remains only to add `hooks.klamp.eth` in stage 2 and cannot touch `tokens`.
- The record lives at `<token>.tokens.klamp.eth` (`text("pool")` = `eip155:<chainId>:<poolId>`, `data("pool")` = `abi.encode(chainId, PoolKey)`), readable with `viem.getEnsText`, no Klamp ABI needed.

Built for ETHGlobal Tokyo 2026 (ENS · Uniswap). Stage 1 (launch + canonical pool record) and the Klamp routing mode are deployed and exercised on Sepolia.

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

## Repository layout

```text
klamp/
├── contract/   # Phase 1 Solidity, ENSv2 integration, SDK, scripts, and tests
└── web/        # Next.js App Router protocol terminal
```

- [`contract/README.md`](contract/README.md) describes the implemented Phase 1 guarantees, deployment flow, and validation evidence.
- [`web/README.md`](web/README.md) describes the frontend architecture and demo flow.

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

The web workspace is statically exported and deployed from `main` to GitHub Pages through `.github/workflows/deploy-pages.yml`. Its intended custom domain is `https://klamp.kro.kr`; complete the repository Pages and DNS settings described in [`web/README.md`](web/README.md) before the first production deployment.

The UI models the Phase 1 SDK results as `registered`, `not_registered`, or `lookup_failed`, route comparisons as `match`, `mismatch`, or `blocked`, and route verdicts as `allow`, `requote_canonical`, `requote_static`, or `hold`. The trace follows the path A demo (launch, naive quote, ENS lookup, verdict, requote, verified swap); the look-alike pool and its swap-time fee are simulated and labelled in the UI. Capped hooks (stage 2) are roadmap only.

For presentations, the demo progress rail can seek directly to any of its eight steps using a deterministic local mock snapshot. The bottom action plays the ordered, delayed sequence, and `Previous` revisits the prior scene.

## Known limits

- The ENS app (`sepolia.app.ens.domains`) is ENSv1 and does not read ENSv2 records. The ENSv2 explorer shows `klamp.eth` and `tokens.klamp.eth`; token names are wildcard (not registered), so their records are read through UniversalResolverV2 (`read-pool.mjs`).
- Sepolia has no InstantLaunchStrategy, so the path B demo pool was initialized by our disposable launcher and holds no liquidity.
- Records for other chains (e.g. Robinhood Chain) are roadmap: the registrar can only verify state on its own chain. Until then the SDK uses the verified `TokenLaunched` event from the five trusted Pools.trade strategies.
- Stage 2 (CappedHookProxy fee cap) is designed, not built.

## AI usage

Parts of this repository were written with AI coding agents and reviewed by the team: Codex (phase 1 contract, SDK, local deployment flow and the web terminal) and Claude Code (Anthropic: design-doc alignment, the ENSv2 Beta registrar port, Sepolia setup and demo scripts, fork tests, the Sepolia demo SDK and this README). On-chain analysis of Pools.trade launches used the Etherscan and Blockscout APIs. Per-task AI and human steps are logged in [`contract/docs/WORKLOG.md`](contract/docs/WORKLOG.md).
