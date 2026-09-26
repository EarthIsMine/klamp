# Phase 1 Verification Handoff

Verification date: 2026-09-26 (Asia/Tokyo). Run by: Codex. Direct human verification: **pending**.
For the execution environment and pinned SHAs, see the [dependencies doc](phase1-dependencies.md) and [versions.json](../deployments/versions.json).

## Status by Requirement

| Requirement | Status | Evidence |
| --- | --- | --- |
| Real CREATE2 proof, rejection of non-deployers and overwrites | Local pass | CanonicalPoolRegistrarTest |
| Real LiquidityLauncher/UERC20Factory and graffiti proof | Local pass | CanonicalPoolRegistrarTest |
| Token code, currency ordering, pool initialization on the same PoolManager | Local pass | PoolValidationTest |
| Atomic rollback on a second write or failed editor delegation | Local pass | PoolValidationTest, CanonicalPoolEnsIntegrationTest |
| An explicit editor may set only its own description/url | Local pass | MetadataEditorTest, deployment-smoke |
| tokens seal, rejection of upgrade and re-delegation, hooks separation | Local pass | NamespacePermissionsTest |
| Real lookup before seal; both registration paths keep working after seal | Local pass | CanonicalPoolEnsIntegrationTest |
| ENS text/data match without per-token name registration | Local pass | Real UniversalResolver integration, viem E2E |
| registered/not_registered/lookup_failed separation (C12) | Local pass | SDK tests, local-smoke |
| Event emitter, keys, initialization, reorg and conflict handling | Local pass | ABI-based mock RPC tests in the SDK. Verification against real public strategy logs Not run |
| Chain, manager and pool comparison across every split branch | Local pass | compareRoutes.test.ts |
| HTTP responses of the lookup/comparison demo | Local pass | C09 match/mismatch/not_registered/HTML checked. Visual check in a browser Not run |
| commit/wait/register/setParent, resume, price, balance, name conflict | Local pass | RegistrationFlowTest with real ETHRegistrar + fixture oracle/token |
| Deployment resume, real ERC20 probe, permission eth_call, public manifest | Local pass | ProbeLauncherTest, NamespacePermissionsTest, full E2E |
| Sepolia address, code and version check | Team check + AI read check | ENSv2 Beta set, LiquidityLauncher, UERC20Factory, POOLS_SLOT. This repository's preflight script has not been run against the Beta set |
| Real Sepolia deployment, canonical pool registration, round-trip lookup | Team deployment + AI read check | registrar `0x820bE7…` (Sourcify verified), KDEMO declared via Via. registered/not_registered reproduced with the repository SDK. Same code as the repository `src/` (comments translated in C16) and runtime bytecode match (C14, rechecked in C16) ([Sepolia record](phase1-deployment.md#sepolia-team-deployment-2026-09-26)) |
| Name display in the ENS app UI | Not run | Needs a separate manual check by a human |
| Human reading of the official SDK docs and direct test run | Not run | Pending human verification |
| Applying team member and mentor feedback | Not run | No actual feedback received yet |

## Commands Actually Run and Results

Run from `contract/`.

| Command | Result |
| --- | --- |
| `forge test` | 29 passed, 0 failed, 0 skipped |
| `forge build` | Pass. The warning about the upstream VerifiableFactory lacking a receive function remains |
| `npm test` | 17 passed, 0 failed |
| `npm run typecheck` | Pass |
| `npm run test:e2e` / `./scripts/local-e2e.sh` | Fresh-chain deployment, registration, seal, viem registered/not_registered/namespace and permission smoke passed |
| Starting E2E on an existing RPC port | Confirmed explicit rejection before deployment |
| Starting preflight with unfilled Sepolia candidates | Confirmed rejection as a configuration error before any RPC access. Does not mean a real network preflight passed |

The [local run evidence](evidence/local-phase1.json) is a copy of an actually generated report. Local addresses and transaction hashes cannot be looked up on Sepolia; the original generated artifact is `deployments/local.verification.json`. Each reproduction creates a new report. The history of major failures and fixes is kept in the [WORKLOG](WORKLOG.md).

## Items for a Human to Check Directly

1. Read the [official viem getEnsText docs](https://viem.sh/docs/ens/actions/getEnsText) and the strict option and UniversalResolver address handling in pinned version 2.56.9. Cross-check the permission and wildcard paths in the [pinned ENSv2 source](https://github.com/ensdomains/contracts-v2/tree/f2f0a05e6c1711134b73204a1e37f8e6c1aea6ab).
2. Run the commands above directly and check the results. Do not copy the AI run records and relabel them as human verification.
3. Use the [demo procedure](phase1-deployment.md) to check on screen the match / different pool / not registered / RPC failure displays. Confirm that it is a comparison demo that sends no real trades.
4. Add the verifier identifier, date, docs and commands, and actual results and evidence location to the WORKLOG. Record only feedback actually received in FEEDBACK.

Inputs needed to resume on Sepolia are the RPC, verified protocol implementations/code hashes, operator, funds for registration fees and gas, a signing method, and the locally stored registration secret. Before a public deployment, check the dry-run and sender/gas; after deployment, run a read-only smoke and a manual ENS app check separately.
