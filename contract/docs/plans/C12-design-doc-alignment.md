# C12 — Aligning the Baseline Code with the Final Design Doc

- Written: 2026-09-26, Claude Code (Opus 5.5)
- Source documents: `final_klamp_with_code.md` (final Phase 1 design), `final_klamp_organized.md` (final development plan and spec)
- Human decision: "Let's update the baseline code to match the two new documents" (requested in conversation). Of the detailed choices below, those not in the documents are AI proposals pending review.

## Differences from the Existing Plan (C01–C11)

| Item | Existing (Agent Spec) | Changed (design doc) |
| --- | --- | --- |
| Path A | 4 arguments (editor = executing contract) + 5 arguments (editor 0 rejected) | A single 5-argument form. If creator = 0, no description/link permission. The issuer contract has no metadata permission |
| Path B | Takes a PoolKey argument | Takes no PoolKey; fixed to the launch pool `(ETH, token, 2500, 25, no hook)` |
| Path B via | None | `recordByLiquidityLauncherVia(token, launcher, nonce)`: the creator who deployed the disposable contract. Addresses whose code remains are rejected |
| Pool initialization check | StateView in the constructor, `getSlot0` | PoolManager `extsload(keccak256(poolId, POOLS_SLOT))`. POOLS_SLOT = 6 tested on the real PoolManager |
| Errors and events | `NotDeployer`, `CanonicalRecorded(token, poolId, deployer)` | `NotIssuer`, `CanonicalRecorded(token, poolId, issuer, creator)`. The change adding PoolKey to the event was reverted in C14 to match the Sepolia deployment |
| Seal | Register hooks at setup and grant roles to hooksAdmin | Seal leaving the operator only REGISTRAR (+admin). In Phase 2, register hooks with 0 roles and then revoke (`finalizeHooks`) |
| SDK lookup | text + StateView initialization | Additionally recompute the PoolId from the data record's chainId and PoolKey, and check the token is included (`invalid: record-mismatch`) |
| SDK judgment | `compareRoutes` (match/mismatch/blocked) | Additionally `judge()` (allow / requote_canonical / requote_static / hold); static pools always allowed |
| Event fallback | Any PoolKey allowed, no conflict warning | Only the launch pool shape accepted; if it differs from ENS, keep ENS + `warning: launch-pool-differs` |

## Deviations from the Documents (AI judgment, pending review)

- ~~Keep 5 lookup states~~ → Human decision (2026-09-26): change to the 3 states `registered | not_registered | lookup_failed` as in the design doc, taking precedence over the root AGENTS.md. The root AGENTS.md was fixed as well. The detailed cause is kept in `lookup_failed.reason`, and `registered` includes `key` (PoolKey) as in the document.
- `compareRoutes` was kept because the demo server uses it. Policy judgment is based on `judge()`.
- The Robinhood InstantLaunchStrategy address (`0x23f8…`) is exposed only as a constant. Its runtime code hash, launcher and start block were not verified, so it was not added to the default trust list.
- The LiquidityLauncher v3.0.0 and v3.2.0 addresses were added to the Sepolia candidates file only as "unverified". The document's claim of "the same bytecode on Sepolia" was not checked in this task.
- The POOLS_SLOT comment cites 59d3ecf, which the repository pins, instead of the document's v4-core 46c6834. The value is 6 in both commits, and the pinned version was confirmed by tests.

## Out of Scope

Phases 2–4 (CappedHookProxy and factory, getCap, requote, verifySwapCalldata/buildSwap), the type-D demo launchpad, attack reproduction, the terminal's two modes, and Sepolia deployment.

## Verification

`forge test`, `npm test`, `npm run typecheck`, `npm run test:e2e`. See WORKLOG C12 for results.
