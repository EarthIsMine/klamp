# Klamp Phase 1

A verified CREATE2 deployer, or the creator of a supported LiquidityLauncher, records a token's canonical Uniswap v4 pool once. The record is stored in the ENS text/data of `<lowercase token address>.tokens.klamp.eth`, and the SDK looks it up with viem's standard `getEnsText`.

A canonical pool means a designated pool. It does not certify the original launch pool, a safe token or hook, sufficient liquidity, profitability, impersonation protection or MEV protection. A pool is registered as long as it is initialized; verifying the actual quote, slippage and liquidity is the trading client's responsibility.

## Getting Started

This directory is the project root. From the Git repository root, run `cd contract` first. Verified with Foundry 1.7.1 and Node 24.

```sh
./scripts/setup-dependencies.sh
forge test
npm test
npm run typecheck
npm run test:e2e
```

E2E deploys real ENSv2, PoolManager, StateView and ERC20 probes on a fresh Anvil and checks registration, sealing, viem lookup and permission eth_calls. It shuts down the test chain when finished. It does not deploy to an RPC port already in use. To use the demo while keeping it running, follow the [local run procedure in the deployment doc](docs/phase1-deployment.md).

## Structure and Responsibilities

| Path | Responsibility |
| --- | --- |
| `src/CanonicalPoolRegistrar.sol` | CREATE2/launcher proof, code/currency/pool initialization checks, one-time record, description/url delegation |
| `script/` | namespace deployment, registration, probe, seal, resume after interruption |
| `sdk/canonicalPool.ts` | namespace check, standard ENS lookup, strict result states |
| `sdk/launchEventFallback.ts` | fallback lookup using only confirmed logs from a trusted InstantLaunchStrategy |
| `sdk/compareRoutes.ts` | chain/PoolManager/PoolId and split-route comparison |
| `demo/`, `scripts/demo-server.ts` | lookup and judgment demo; sends no trades |
| `test/`, `sdk/*.test.ts` | Solidity integration with real dependencies, and SDK tests |

## Lookup Results and Client Policy

As in the design doc, SDK results are `registered` (registered), `not_registered` (not registered) and `lookup_failed` (lookup failed). The detailed cause of a lookup failure is kept in `reason` (rpc, resolution, namespace, format, chain, pool-uninitialized, record-mismatch, multiple-launch-pools). A lookup failure is never shown as not registered. Event fallback is attempted only when the ENS record is actually empty, and a pool obtained from a trusted launch event is treated the same as registered. Route judgment is handled by `judge()` (allow, requote_canonical, requote_static, hold). No external event source is configured by default, and arbitrary launcher logs are not trusted.

Canonical pool verification mode is `registered`, and every branch/hop that contains the target token must match on chain, PoolManager and PoolId. Hops that contain only common assets are not required to use the canonical pool. A match on the route information shown on screen does not guarantee the execution pool of opaque external calldata, and does not block direct contract calls.

## Guarantees and Constraints

- Only the first registration per token is possible; there is no API to modify, delete or move the pool. One deployment uses one chain and a fixed PoolManager.
- The registrar's own `canonicalPoolOf` mapping also stays on-chain. ENS provides standard lookup and shareable names and records.
- The wildcard skips per-token name registration, but resolver text/data storage gas is still incurred.
- The write path for token records and the operator's permission to change tokens are restricted. hooks keeps separate extension permissions.
- Upper-level permissions on the ENS root/klamp and expiry/re-registration are separate trust and operational assumptions. The one-time nature of the mapping and the permanent existence of the name path are not the same guarantee.
- The registrar's root TEXT_ADMIN is needed because of the fixed resolver's delegation API constraint. That the registrar code exposes only description/url delegation is a residual trust assumption.
- hooks proxy and fee cap, hook risk classification, attack losses and market share, and global router protection are not part of this implementation.

## Verification and Handoff

See the [verification table](docs/phase1-verification.md), [pinned versions and ABI](docs/phase1-dependencies.md), [permissions](docs/phase1-permissions.md), [fallback configuration](docs/phase1-fallback.md) and [deployment and resume procedure](docs/phase1-deployment.md).

Local verification currently passes; a real Sepolia deployment, display in the ENS app UI, and human reading of the SDK docs and direct reproduction have not yet been confirmed. No claim of a completed audit or permanent guarantee is made. Per-task changes, failures, fixes and command results are recorded in the [WORKLOG](docs/WORKLOG.md). Add only external feedback actually received to [FEEDBACK](docs/FEEDBACK.md).
