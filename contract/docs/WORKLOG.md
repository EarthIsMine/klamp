# Work log

AI work is kept separate from human decisions and direct verification. Blank templates and expected results are not evidence of execution.
Implementation status and human verification status are tracked separately; each stage's status follows the per-task entries below.

## Entry template

```markdown
## Cxx — Task title

- Date / environment:
- Status: In progress / AI implementation and verification complete / Blocked
- AI tools used:
- Instructions read:
- AI work / changed files:
- Human decisions/changes: list only confirmed items; if none, "nothing confirmed"
- Official references and versions/SHA: URLs actually opened and versions used
- Plan changes: none, or a link to a docs/plans/ document
- AI-run verification: actual commands / results / location of the required evidence
- Human verification: Pending human verification
- Human reproduction guide: documents to read / commands or procedure / expected results
- Open issues / how to resume:
```

## GOV01 — Set up working rules and the log template

- Date / environment: 2026-09-25 / `/home/user/klamp`, bash, main branch
- AI tools used: Codex
- Instructions read: No existing parent or root AGENTS.md. Read `Klamp_Phase1_Agent_Spec.md` and wrote the root `AGENTS.md` in this task.
- AI work / changed files: Wrote `AGENTS.md`, this log, `FEEDBACK.md`, and `plans/README.md`. The existing spec and implementation plan were not modified.
- Human decisions/changes: The user proposed keeping the working rules, plans and logs in the repository and asked for the rules to be organized. The spec author, completion of team review, whether the SDK docs were read, and whether tests were run directly were not confirmed.
- References and versions: Local `Klamp_Phase1_Agent_Spec.md` (document dated 2026-09-25, uncommitted). No external official docs were opened for this documentation pass. SDK version pinning is planned for C01.
- AI-run checks:
  - `rg --files -g 'AGENTS.md' -g '*Spec*' -g '*spec*' -g 'WORKLOG.md' -g 'FEEDBACK.md' -g '!node_modules' -g '!vendor'`: found one existing spec.
  - `git status --short`: `?? Klamp_Phase1_Agent_Spec.md` at the start of the task.
  - `git branch --show-current`: `main`.
  - `git log -1 --oneline`: exit code 128, the error saying there are no commits yet. This confirms the initial repository state, not a test failure.
- AI-run tests: Not run. Only documents were written; there is no implementation code or test environment.
- Human verification: Pending human verification.
- Human reproduction guide: Read the rules and templates in the four documents and check the added files with `git status --short`. SDK doc verification does not apply to this task.
- Open issues: The spec's authorship and team review status still need to be confirmed. `canonical-pool-registry-v1-spec.md` from the IDE tab was not found in the current repository. C01 implementation and commit were outside the scope of this task.


## GOV02 — Move the project scope into the contract directory

- Date / environment: 2026-09-25 / repository root, main
- AI tools used: Codex
- Instructions read: Existing root AGENTS.md and the implementation spec. After the move, the root guide and contract/AGENTS.md apply.
- Human decisions/changes: The user instructed moving all project content into a contract directory at the root and implementing inside it.
- AI work: Moved the spec, detailed instructions and docs into contract/. The root AGENTS.md keeps only the project-location guide. The spec body was not changed.
- References: Existing local spec. External SDK docs not applicable.
- Plan changes: docs/plans/project-location.md.
- AI-run verification: After the move, checks of file existence and the base plan's relative links passed. `git diff --cached --check` reported only 2 trailing spaces used for Markdown line breaks in the existing spec (exit 2). Kept to preserve the original.
- Human verification: Pending human verification.
- Human reproduction guide: From the repository root, git status --short, and check the spec link in contract/docs/plans/README.md.
- Open issues: Implementation to start from C01. The paths in the earlier GOV01 reflect the working location at the time and are preserved.

## C01 — Pin dependencies and the ABI baseline

- Date / environment: 2026-09-26 / Linux, Node 24.14.1, Foundry 1.7.1, Solidity 0.8.26/Cancun
- Status / AI tools used: AI implementation and verification complete / Codex
- Instructions read: Root AGENTS.md, contract/AGENTS.md, implementation spec.
- AI work: Pinned ENSv2, the launcher and their nested gitlinks; npm lock; minimal Foundry/TypeScript config; a reinstall script; added a test against the real ENS resolver proxy ABI.
- Human decisions/changes: Requested implementing in small commits following the spec order and working in contract/. No additional human verification confirmed.
- Official references and versions: [Pinned SHAs and source check notes](phase1-dependencies.md).
- AI-run verification: `forge test` 1 passed/0 failed; `npm run typecheck` passed. There were no existing project tests. The warning about the missing receive in the upstream dependency UUPSProxyLogic remains.
- Human verification: Pending human verification.
- Human reproduction guide: `./scripts/setup-dependencies.sh`, `forge test`, `npm run typecheck`. Expected: real resolver text/data writes and reads succeed.
- Open issues: Sepolia candidate addresses unverified. Real ENS calls from the SDK are in C07. The original SHA could not be determined, so a compatible source with a matching date was chosen.

## C02 — Reproduce the original registrar and both registration paths

- Date / environment / tools: 2026-09-26 / C01 pinned environment / Codex
- AI work: Kept the appendix registrar, added an explicit error for factory=0, and added fixtures for a real CREATE2 executor contract, the real LiquidityLauncher/UERC20Factory and the real PermissionedResolver proxy.
- Human decisions/changes: Nothing additional confirmed.
- References and versions: [C01 pinned sources](phase1-dependencies.md), spec appendix A1.
- AI-run verification: `forge test` 7 passed/0 failed. Verified normal text/data; rejection of a non-deployer, overwrites, a token not included, and a wrong creator; and real issuance through the launcher.
- Human verification: Pending human verification.
- Human reproduction: `forge test --match-contract CanonicalPoolRegistrarTest -vv`; 6 expected to pass.
- Open issues: C03 verification of real token/pool state and C04 editor separation are not yet implemented.

## C03 — Verify the deployed token and the actually initialized pool

- Date / environment / tools: 2026-09-26 / C01 pinned environment / Codex
- AI work: Added verification of the StateView/PoolManager immutables and the linking getter, and checks for token code, currency ordering and pool initialization. Added a test against the real v4 PoolManager and verification of rollback when the data write fails.
- Human decisions/changes: Nothing additional confirmed.
- References and versions: C01 StateView/PoolManager sources. Additional initialization of solmate 4b47a19038b798b4a33d9749d25e570443520647 from the pinned v4-core gitlink.
- AI-run verification: The first `forge test` failed to compile because solmate was missing. After fixing the install, remapping and reinstall script, `forge test` 13 passed/0 failed.
- Human verification: Pending human verification.
- Human reproduction: `forge test --match-contract PoolValidationTest -vv`, 6 expected to pass. Registration is possible with initialization alone, even without liquidity.
- Open issues: Trust in the StateView code itself is the responsibility of the deployment configuration; matching getters alone do not authenticate against a malicious implementation.

## C04 — Explicit metadata editor

- Date / environment / tools: 2026-09-26 / C01 pinned environment / Codex
- AI work: Kept the existing 4-argument CREATE2 function and added a 5-argument overload that takes an editor, plus a shared proof function. Kept the CanonicalRecorded ABI and the proving party.
- Human decisions/changes: Nothing additional confirmed.
- References and versions: Spec C04, C01 pinned PermissionedResolver source.
- AI-run verification: `forge test` 17 passed/0 failed. Confirmed the editor may set its own description/url; rejection of pool, other names and permission delegation; rejection of a 0 editor and a wrong prover; and the existing executor's edit behavior.
- Human verification: Pending human verification.
- Human reproduction: `forge test --match-contract MetadataEditorTest -vv`, 4 expected to pass.
- Open issues: namespace setup and the permission seal are implemented in C05.

## C05 — namespace setup and permission seal

- Date / environment / tools: 2026-09-26 / C01 pinned environment / Codex
- AI work: Set up the real ENS UserRegistry and resolver proxy, separated hooks, and added a seal library, Deploy/Seal scripts, and call-based permission tests.
- Human decisions/changes: Nothing additional confirmed.
- References and versions: C01 pinned RegistryRolesLib/PermissionedResolver/VerifiableFactory sources, [permission constraints](phase1-permissions.md).
- AI-run verification: Fixed the initial stack-too-deep compile error by splitting local variable lifetimes. Fixed the proxy same-salt collision with a separate salt. Fixed the test's same-call-depth expectRevert error with an external wrapper. Final `forge test` 20 passed/0 failed, `forge build` passed.
- Human verification: Pending human verification.
- Human reproduction: `forge test --match-contract NamespacePermissionsTest -vv`; check rejection of operator changes, re-delegation and upgrades, hooks isolation, rejection of the wrong chain, and re-sealing.
- Open issues: Trust in the network protocol code, root expiry and parent permissions are separate operational assumptions. Network broadcast not run.

## C06 — Real ENS wildcard integration

- Date / environment / tools: 2026-09-26 / C01 pinned environment / Codex
- AI work: Added tests that cross-check wildcard text/data across the integrated real UserRegistry, PermissionedResolver, UniversalResolverV2 and v4 state; both registration paths after the seal; and rollback when edit-permission delegation fails.
- Human decisions/changes: Nothing additional confirmed.
- References and versions: C01 pinned UniversalResolverV2/AbstractUniversalResolver/NameCoder sources.
- AI-run verification: `forge test --match-contract CanonicalPoolEnsIntegrationTest -vv` 3 passed/0 failed. Confirmed text/data chainId and PoolKey hash match, token label not registered, both paths succeed after the seal, and on delegation failure there is no mapping, neither record, and no edit permission. C03's data-write-failure rollback is also retained.
- Human verification: Pending human verification.
- Human reproduction: Run the command above. This is a Solidity integration check and does not mean viem execution is done.
- Open issues: Real viem round-trip calls run in C07.

## C07 — Standard viem-based lookup and explicit states

- Date / environment / tools: 2026-09-26 / C01 pinned environment, Anvil chain 31337 / Codex
- AI work: Added bigint and 32-byte PoolId parsing, strict getEnsText, checks of the namespace link, the EIP-1967 implementation address and the StateView link, per-state results, and scripts reproducing a full local deployment and a viem smoke test.
- Human decisions/changes: Nothing additional confirmed.
- References and versions: [viem getEnsText](https://viem.sh/docs/ens/actions/getEnsText), viem 2.56.9 source actions/ens/getEnsText.ts. After a content-type error from the docs web tool, the official docs were read via curl.
- AI-run verification: SDK lookup tests 7 passed, `npm run typecheck` passed. Local deployment with `forge script script/LocalPhase1.s.sol:LocalPhase1 --rpc-url http://127.0.0.1:18545 --broadcast --unlocked` succeeded, then `npx tsx scripts/local-smoke.ts` passed. While reproducing on a fresh chain, the run stalled waiting on nonces from parallel sends; after switching to sequential sends with `--slow`, `./scripts/local-e2e.sh` passed.
- Results: Real viem getEnsText found, empty wildcard record missing, implementation address mismatch unavailable/namespace. Local pool ID: 0xee6e9c6deca57a017d87d370cc25678eb55fa99ab546fcffb94024b3aaf8f350.
- Human verification: Pending human verification.
- Human reproduction: `./scripts/local-e2e.sh` starts and stops a standalone Anvil and verifies the three results above. RPC failures and unknown reverts are not treated as missing.
- Open issues: Public network verification not run. The local manifest is generated on every run and excluded from Git.

## C08 — Verified strategy event fallback

- Date / environment / tools: 2026-09-26 / C01 pinned environment / Codex
- AI work: Added the real InstantLaunchStrategy TokenLaunched ABI; explicit trusted sources, code hash, confirmation blocks and range limits; checks of token, key, pool initialization and block hash; and ambiguous handling.
- Human decisions/changes: Nothing additional confirmed.
- References and versions: [Pinned sources and configuration notes](phase1-fallback.md). Reflects that the emitter of the original event is the strategy, not the launcher.
- AI-run verification: `npm test` 7 lookup + 6 fallback = 13 passed/0 failed, `npm run typecheck` passed. Confirmed normal logs and conflicting pools; rejection of a fake emitter, another token, removed logs and a mismatched hash; code mismatch, reorg and RPC errors; and the disabled path.
- Human verification: Pending human verification.
- Human reproduction: `npm test`. Before external deployment verification, sources is an empty list.
- Open issues: Verification of the real Sepolia strategy address, deployment block and runtime code hash not run. The event tests used mock RPC inputs and are not recorded as a public-chain success.

## C09 — Route comparison and a minimal lookup demo

- Date / environment / tools: 2026-09-26 / C01 pinned environment, local HTTP/Anvil / Codex
- AI work: Added chain/PoolManager/PoolId comparison, target-hop checks across all split branches, exclusion of common-asset hops, per-state blocking, and a minimal HTML demo showing the token, ENS name, source, and canonical and candidate IDs. There is no transaction-sending feature, and the screen states the scope of the declared route comparison.
- Human decisions/changes: Nothing additional confirmed.
- References and versions: Spec C09 and the C07/C08 SDK.
- AI-run verification: `npm test` 17 passed/0 failed, `npm run typecheck` passed. After `npm run demo`, Node fetch/assert checks of `/api/check` for match, mismatch and missing and of the HTML response passed. Visual browser inspection not run.
- Human verification: Pending human verification.
- Human reproduction: With Anvil and the local deployment ready, `npm run demo` and open http://127.0.0.1:4173. Expected: the default route matches, changing the poolId gives a mismatch, and an unregistered token gives no record. When the RPC is down, lookup failed is shown.
- Open issues: Not combined with a real quote builder or transaction calldata, so it is not used as a guarantee of the pool a trade executes on. A general trading mode is not implemented.

## C10a — Resumable ENS registration procedure

- Date / environment / tools: 2026-09-26 / C01 pinned environment / Codex
- AI work: Added a registration state machine and script that use ETHRegistrar's real commitment timing, registration price and payment balance/allowance. Does not overwrite names owned by others or other existing namespaces.
- Human decisions/changes: Wrote the [C10 split plan](plans/C10-deployment-steps.md) to reflect the request for small, single-responsibility commits.
- References and versions: C01 pinned ETHRegistrar/IETHRegistrar/AbstractETHRegistrar sources.
- AI-run verification: `forge test --match-contract RegistrationFlowTest -vv` 4 passed/0 failed, `forge build` passed. Uses the real registrar and registry; only the payment token and price oracle are test fixtures. Verified commit/wait/register/setParent, already registered, expired commitment, owned by others, price cap and insufficient balance.
- Human verification: Pending human verification.
- Human reproduction: The Foundry command above. On a public chain, rerun the RegisterRoot script after readyAt with the same secret and configuration.
- Open issues: Real Sepolia run not done. Redeployment deduplication and manifest/preflight/smoke are the next C10 units.

## C10b — Resumable namespace deployment and a stronger seal probe

- Date / environment / tools: 2026-09-26 / C01 pinned environment / Codex
- AI work: Computes the expected proxy address from the pinned VerifiableFactory creation code; if it already exists, verifies the implementation and reuses it. Designates the existing registrar as REGISTRAR, checks the state, and applies only the missing settings. The seal probe cross-checks the mapping's PoolId, text and data against each other.
- Human decisions/changes: Nothing additional confirmed.
- References and versions: C01 VerifiableFactory/CloneProxyBytecode sources, C10 split plan.
- AI-run verification: `forge test --match-contract NamespacePermissionsTest -vv` 4 passed/0 failed. Confirmed that a redeploy call after the seal gives the same address and emits 0 logs. `forge build` passed.
- Human verification: Pending human verification.
- Human reproduction: The test above. A real resume keeps the original DEPLOYMENT_SALT and the REGISTRAR address from the broadcast receipt. If the registrar permission has already been granted but the address is omitted, the run aborts instead of deploying a duplicate.
- Open issues: Even if the run stops right after the registrar deployment and before the permission grant, the address must be recovered from the receipt and specified to avoid deploying an unnecessary new registrar. The operator and settings must match the initial deployment.

## C10c — Deployment preflight, ERC20 probe and verification manifest

- Date / environment / tools: 2026-09-26 / C01 pinned environment, fresh Anvil 31337 / Codex
- AI work: Added the pre-verification Sepolia candidate config; pre-checks of code hashes, chain, roles, links, registration fee and balance; a testnet-only real ERC20 probe with resume; eth_call smoke; and generation of a public verification report. Local E2E also switched to the real ERC20 probe.
- Human decisions/changes: Nothing additional confirmed.
- References and versions: C01 pinned ENS Sepolia deployment JSON and contract sources, [deployment reproduction doc](phase1-deployment.md), deployments/versions.json.
- AI-run verification: Fixed a preflight TypeScript error comparing an unknown return value by using the bigint type. Final `forge test` 29 passed/0 failed, `forge build` passed, `npm test` 17 passed/0 failed, `npm run typecheck` passed. `./scripts/local-e2e.sh` passed fresh-chain deployment, viem and permission smoke. Confirmed via Node spawn/assert that an unconfigured candidate is rejected with a missing tokenFactory error before any RPC access.
- Local results: Real ERC20 probe pool ID 0xe703bcf882198060d40e34384b820d425dac4359d6869fef2e5619e517c1a709. The generated deployments/local.verification.json records public addresses, versions, deployment blocks, tx hashes, expiry, code hashes and seal status. Private keys and the registration secret are not included in the report.
- Human verification: Pending human verification.
- Human reproduction: `npm run test:e2e`; expected: found/missing/namespace are distinguished and ENS text/data, editor, overwrite, operator denial and sealed roles all pass. For Sepolia, start with the preflight and the step-by-step dry-runs in the doc.
- Open issues: Real lookups of Sepolia addresses and protocol versions, and signing/broadcast, not run; ENS app UI not checked. Public-chain verification needs an RPC, verified code hashes, funds and a signing account. The local fixture oracle is not treated as real Sepolia price verification.

## C10 follow-up — Protect an existing local RPC

- Date / tools: 2026-09-26 / Codex
- AI work: If an Ethereum RPC is already running on the port selected for E2E, reject before starting so it is not mistaken for a fresh test chain and deployed to.
- Human decisions/changes: Nothing additional confirmed.
- Reference: Self-review of the C10 local reproduction script.
- AI-run verification: With an existing test Anvil (18545) running, confirmed via Node spawn/assert that `KLAMP_LOCAL_PORT=18545 ./scripts/local-e2e.sh` returns exit 1 and a rejection message. Exits before any deployment call.
- Human verification: Pending human verification.
- Human reproduction: Setting KLAMP_LOCAL_PORT to an RPC port already in use must refuse to run.

## C11 — Guarantee scope and verification handoff

- Date / environment / tools: 2026-09-26 / C01 pinned environment / Codex
- AI work: Added the README, a per-requirement verification table, human reproduction and SDK doc guidance, and a copy of the real local verification report. Updated the plan index's not-started statuses to the actual implementation status. The original spec is preserved.
- Human decisions/changes: Nothing additional confirmed. The spec author and team review also remain pending confirmation.
- References and versions: C01 pinned docs/sources, viem getEnsText 2.56.9, C10 deployment doc.
- AI-run verification: After the final local port protection change, reran `./scripts/local-e2e.sh`, which passed. Copied the generated real report to docs/evidence/local-phase1.json. The full code verification baseline is C10c's passing results (29 Foundry, 17 SDK, typecheck); the same code tests were not needlessly repeated for documentation changes.
- Human verification: Pending human verification.
- Human reproduction: The install and test commands in the README and the manual check procedure in docs/phase1-verification.md. Expected results and items not run on public networks are listed separately.
- Open issues: Real Sepolia deployment, real strategy logs, ENS app UI, human verification and team/mentor feedback are not run/not received. Local passes do not substitute for completing these items.

## WEB01 — Port the protocol terminal and sync the SDK state model

- Date / environment / tools: 2026-09-26 / Next.js 15, pnpm 12.6.0 / Codex
- AI work: Ported a separate frontend working copy into the repository's `web/` and aligned canonical pool lookup to `found | missing | invalid | unavailable | ambiguous` and route comparison to `match | mismatch | blocked`. Separated UI/Zustand state from the on-chain data adapter boundary and explicitly marked the phase 2 fee cap scene as mock. Recorded the responsibilities and tools of the two workspaces in the root working instructions and README.
- Human decisions/changes: Requested merging the frontend into the contract repository, skipping contract work, and first syncing the frontend spec with the actual state model.
- References and versions: `sdk/canonicalPool.ts`, `sdk/compareRoutes.ts`, the C09 and C11 entries, pnpm 12.6.0.
- AI-run verification: `pnpm lint` and `pnpm build` passed both before and after the port. `pnpm install --frozen-lockfile` also passed in the ported workspace. Contract sources and the npm lockfile were not changed.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm build`, then run Run demo in `pnpm dev`.
- Open issues: `ProtocolClient` is currently a mock. The viem adapter and wiring to the real deployment manifest, visual Sepolia UI verification, and the phase 2 fee cap contract implementation are not done.

## WEB02 — Prepare klamp.kro.kr GitHub Pages deployment

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26, pnpm 12.6.0, GitHub Pages Actions / Codex
- AI work: Enabled Next.js static export and trailing slash, and added a workflow that lints and builds web changes on `main` and deploys `web/out` to GitHub Pages. Recorded in the README the operating procedure for serving the custom domain `klamp.kro.kr` at the root path.
- Human decisions/changes: Chose `klamp.kro.kr` as the deployment domain and requested preparing the deployment in code.
- References and versions: Next.js static export/basePath official docs, GitHub Pages custom workflow/custom domain official docs, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v5`, `pnpm/setup@v3`.
- AI-run verification: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build` passed. Confirmed `web/out/index.html` and `web/out/_next/static` were generated, the HTML uses root `/_next/` asset paths, and the workflow YAML parses.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm build`; `out/index.html` should be generated. On GitHub, set the Pages source to GitHub Actions and check the custom domain and DNS/HTTPS status.
- Open issues: Organization domain TXT verification, registering the repository's Pages custom domain, the DNS CNAME, a real Actions run and a visual check of the public URL require external GitHub/DNS configuration and were not done.

## WEB03 — Apply the Klamp brand icon

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26, pnpm 12.6.0, local Chrome responsive check / Codex
- AI work: Trimmed excess outer margin in `public/klamp.svg` via its viewBox and replaced the existing temporary square mark with the main clamp asset. Applied the same vector to the header, hero, footer and favicon metadata, and hid the large hero mark on mobile to keep information density.
- Human decisions/changes: Requested reviewing the main icon in public and, if suitable, adjusting it and placing it in appropriate spots.
- References and versions: The repository's `web/public/klamp.svg`, Next.js 15 Metadata/Image API.
- AI-run verification: `pnpm lint`, `pnpm build` passed. Checked the desktop and 390×844 mobile layouts in local Chrome and confirmed the three `/klamp.svg` images on the page load correctly at a 256×256 natural size. The hydration warning caused by Chrome's auto-translate extension changing `lang` and the DOM is not an app source error.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; check the header, desktop hero, footer and browser tab icon. At 900px and below, the large hero icon should be hidden and the header icon kept.
- Open issues: Favicon cache refresh after the real GitHub Pages deployment and visual checks across browsers not done.

## WEB04 — Remove marketing landing patterns and restructure protocol information

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26, pnpm 12.6.0, local Chrome responsive check / Codex
- AI work: Removed the repeated all-caps eyebrow text, the orange-highlighted slogan, the 3-column benefits strip, and the large rounded cards and soft shadows. Changed the hero to a protocol summary and a phase scope table, and restructured the guarantee scope into technical-doc-style rows. Changed the terminal's eyebrow status text to step codes and the colored cards to flat data panels. During verification, fixed the mock PoolId, which was 63 hex characters, to 32 bytes, restoring the happy path's `match · ens`.
- Human decisions/changes: Requested using the frontend skill to find and remove design that looks like AI slop, especially eyebrow-style titles. No skill with that name exists in the current environment, so a code audit and a Browser visual check were used instead.
- References and versions: Repository UI and the C09 SDK state policy, Next.js 15.5.26.
- AI-run verification: `pnpm lint`, `pnpm build` passed. Checked the full desktop screen and 390×844 mobile in local Chrome, and after Run demo completed, confirmed `route match · ens`, the 30% request and the 1% mock applied state.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; check the hero, Protocol boundary and Protocol trace on desktop and mobile, run Run demo, and confirm route is `match · ens`.
- Open issues: A human visual check of the real deployed screen and follow-up copy and interaction improvements not done.

## WEB05 — 100dvh landing and a separate demo route

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, local Chrome responsive check / Codex
- AI work: Removed `Sepolia ready` from the landing header and placed the header over the full-height hero. Fixed the hero at `100dvh` and linked the CTA and the header Demo link to a separate `/demo/` route. Removed the terminal from the home page and built a demo-only intro, scope label, terminal, link back to the overview, and dedicated metadata.
- Human decisions/changes: Requested removing `Sepolia ready`, a 100dvh hero, and having the CTA go to a separate demo page.
- References and versions: Next.js 15.5.26 App Router and static export.
- AI-run verification: `pnpm lint`, `pnpm build` passed; confirmed `out/demo/index.html` was generated. In Chrome, confirmed the desktop hero height of 754px matches the 754px viewport, the CTA navigates to `/demo/`, the demo title and Run demo appear, and the 390×844 mobile layout.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; confirm the first screen of `/` fills one viewport and the CTA goes to `/demo/`, and that `/demo/` can run the terminal and return to the overview.
- Open issues: Browser cache refresh for the two static paths and the new metadata after the real GitHub Pages deployment unverified.

## WEB06 — Improve the protocol-centered visual system of the landing and demo

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, pnpm 12.6.0, local Chrome check / Codex, Anthropic `frontend-design` skill
- AI work: Kept the Warm White, Charcoal and Clamp Orange palette while replacing Inter with IBM Plex Sans and limiting the mono typeface to addresses and execution values. Changed the landing hero to a direct comparison of the ENSv2 record and the proposed route, and placed the clamp mark as a meaningful device joining the two values. Restructured the contract/client responsibility boundary into two columns and split Phase 2 out as a separate simulation. In the demo, removed the decorative terminal card and the uppercase, middle-dot and arrow notation, and restructured step progress, canonical route comparison, fee-cap simulation and the execution readout into a single instrument screen.
- Human decisions/changes: Requested keeping the Clamp Orange and Warm White combination and applying the previously agreed guideline for removing AI-generated design traces to both the landing and the demo.
- References and versions: Next.js 15.5.26, Emotion 11.14.1, Zustand 5.0.8, `@fontsource-variable/ibm-plex-sans` 5.3.0, `@fontsource/ibm-plex-mono` 5.3.0.
- AI-run verification: `pnpm lint`, `pnpm build` passed. Confirmed the static export generates `/` and `/demo`. In Chrome, checked the full landing flow, the demo's initial state, and after running `Run trace`, the ENS route match and the 30% requested / 1% applied result.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; check the comparison diagram and responsibility boundary at `/`, and run `Run trace` at `/demo/` to confirm the route match and the Phase 2 simulation labels are kept separate.
- Open issues: The real GitHub Pages deployment screen and human verification on a physical mobile device not done.

## WEB07 — Hero protocol console and a switch to surface emphasis

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, local Chrome check / Codex, Anthropic `frontend-design` skill
- AI work: Replaced the comparison diagram on the right of the landing hero with a light protocol console showing a real `klamp verify` command, the ENSv2 lookup, the chain/manager/PoolId comparison and the route match result. No OS window chrome, dark terminal or traffic lights were used. Removed the vertical orange border fragment on the CTA and the thick left border on the demo's Phase 2 area, and switched the emphasis to the full CTA surface and the background color of the verification result.
- Human decisions/changes: Requested making the right side of the hero like a terminal, removing the fingernail-style border emphasis, and replacing any needed emphasis with another method.
- References and versions: Next.js 15.5.26, Emotion 11.14.1, `frontend-design` skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome, confirmed the light terminal on the full landing screen, the CTA surface emphasis, and the removal of the left emphasis border in the demo's Phase 2 area.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; check the right-side console data and result row at `/`, and confirm there is no thick left border in the Phase 2 simulation area of `/demo/`.
- Open issues: Real GitHub Pages deployment and physical mobile device verification not done.

## WEB08 — Stronger TUI conventions in the hero verification console

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, local Chrome check / Codex, Anthropic `frontend-design` skill
- AI work: Redesigned the hero's right console as a light TUI made of fixed columns, sequential sections, status tokens and a bottom status bar. Separated canonical record resolution and proposed route comparison as 01/02 in their actual order, and showed the chain, PoolManager and PoolId verdicts and the final status on one screen. No full dark theme, CRT effect, scanlines or blinking cursor were used.
- Human decisions/changes: Requested pushing the hero's right area closer to a TUI than an ordinary terminal.
- References and versions: Next.js 15.5.26, Emotion 11.14.1, `frontend-design` skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome, confirmed the light TUI's resolution/compare sections, the `ok` status, the `MATCH` status bar and the full landing flow.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; confirm the right side of the `/` hero reads in the order 01 resolve, 02 compare, MATCH.
- Open issues: Real GitHub Pages deployment and physical mobile device verification not done.

## WEB09 — Oh My Zsh-style palette for the hero TUI only

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, local Chrome check / Codex, Anthropic `frontend-design` skill
- AI work: Applied the Oh My Zsh `agnoster`/default prompt color semantics, based on Solarized Dark, only inside the hero TUI. The background and panels use the Solarized base range; resolution steps are yellow, network is blue, route and status info is cyan, and success and MATCH are green. Used a bright foreground and base0 for legibility of small data values; the landing and demo's existing Warm White/Clamp Orange tokens were not changed.
- Human decisions/changes: Requested applying the Oh My Zsh color palette only to the hero TUI area.
- References and versions: Oh My Zsh `agnoster.zsh-theme` master, `robbyrussell.zsh-theme` master, Next.js 15.5.26.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome, confirmed the existing palette is kept outside the TUI and the Solarized/ANSI status colors apply only inside it.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; at `/`, confirm only the TUI uses the dark Solarized range, success states are green, and the outer CTA keeps Clamp Orange.
- Open issues: Real GitHub Pages deployment and physical mobile device verification not done.

## WEB10 — macOS terminal window frame for the hero TUI

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, local Chrome check / Codex, Anthropic `frontend-design` skill
- AI work: Added a macOS Terminal-style outer frame to the hero TUI: a 30px-tall light title bar, 10px red/yellow/green window controls, a centered session title, a thin gray outline, a 10px corner radius and a restrained two-level window shadow. The controls are non-functional decoration so as not to create fake button accessibility, and the inner Oh My Zsh/Solarized TUI is kept.
- Human decisions/changes: Requested making the hero TUI border look like a real Mac window.
- References and versions: Next.js 15.5.26, Emotion 11.14.1, `frontend-design` skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome, confirmed the macOS title bar, traffic-light controls, border radius and shadow combine with the existing TUI content.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; confirm the title bar, the three controls, the rounded outline and the inner TUI of the window on the right of the `/` hero connect naturally.
- Open issues: Real GitHub Pages deployment and physical mobile device verification not done.

## WEB11 — 100dvh step-by-step protocol demo

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 754px viewport check / Codex, Anthropic `frontend-design` skill
- AI work: Removed the demo page's large intro and bottom footer and rebuilt it as a 100dvh screen where the header and protocol tool use exactly one viewport. Split the state store's batch autoplay into four user inputs: `Declare canonical pool` → `Verify proposed route` → `Request 30% fee` → `Apply 1% cap`. Each input performs only one state change and one async task, and `Start over` resets after completion. Placed the comparison result and the fee simulation side by side on desktop, switching to vertical scrolling on short screens and mobile.
- Human decisions/changes: For ease of presenting, requested making the demo 100dvh, removing excessive titles and structuring the interaction step by step.
- References and versions: Next.js 15.5.26, Zustand 5.0.8, Emotion 11.14.1, `frontend-design` skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome 1440×754, confirmed the initial and completed screens fit in one viewport. Ran the four step buttons in order to confirm the canonical record, ENSv2 route match, 30% request and 1% applied results, and that `Start over` returns to the first step.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; at `/demo/`, press the four buttons in order and confirm each step advances one at a time and the whole screen fits in one viewport even in the completed state.
- Open issues: Real GitHub Pages deployment and physical mobile device verification not done.

## WEB12 — Per-step scenes and interaction animation

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1440×756 check / Codex, Anthropic `frontend-design` skill
- AI work: Removed the route, fee and execution readout that were shown on one screen at the same time, and restructured the demo into single scenes that show only the information the current step needs. Enlarged the main headings and result figures, and made the Declare receipt, Verify comparison, 30% request and 1% cap results replace one another in order. Scene entry, the progress line, route joining and fee value change animations run only after button input, and all transitions are removed under `prefers-reduced-motion`. Phase 2 results are still labeled as simulation.
- Human decisions/changes: Requested reducing the demo's small text and excessive information and adding dynamic animation that responds to button interaction.
- References and versions: Next.js 15.5.26, Emotion 11.14.1, Zustand 5.0.8, `frontend-design` skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome 1440×756, checked the four scenes Declare, Verify, Request 30% and Apply 1% in order; on both the completed and initial screens, the viewport height and document height matched at 756px. Also confirmed the first step button is restored after `Start over`.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; at `/demo/`, press the four buttons in order and confirm only one scene is visible at a time, the transition animation runs right after the click, and after completion `Start over` returns to the initial scene.
- Open issues: Behavior verification on the real GitHub Pages deployment screen and physical mobile devices not done.

## WEB13 — Copy that describes current behavior instead of development phases

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1440×756 check / Codex, Anthropic `frontend-design` skill
- AI work: Removed the `Phase 1` / `Phase 2` distinction from the landing, demo header, step descriptions, status summary and metadata. The landing now uses `Fee cap preview` after route verification, and the demo uses `Canonical route`, `Pool verification` and `Fee cap preview`, directly describing the behavior the user is looking at. The fee cap, which is not yet in the contract, is labeled with its execution scope, simulation and preview, instead of a development phase.
- Human decisions/changes: Requested dropping the phase 1/2 distinction across the web pages and describing the step currently being performed instead.
- References and versions: Next.js 15.5.26, Emotion 11.14.1, `frontend-design` skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. Searched `web/src` and the static export to confirm no phase wording remains. In Chrome 1440×756, checked the landing's fee cap description and the demo's context/status copy, and confirmed the demo's document height equals the viewport height at 756px.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; check the Fee cap preview at `/` and the Canonical route, Pool verification and Fee cap preview copy at `/demo/`, and confirm no development phase numbers are shown.
- Open issues: Real GitHub Pages deployment screen and physical mobile device verification not done.

## WEB14 — Attack payload and clamp collision animation

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1440×756 check / Codex, Anthropic `frontend-design` skill
- AI work: Changed the 30% request scene from a simple number enlargement into an attack sequence where a `Malicious hook` sends a `feeOverride(3000)` payload toward the pool. The request line, three moving packets, the 30% payload collision and a brief screen recoil run once, right after user input. In the cap scene, the incoming 30% hits the central clamp and recoils before the 1% result appears. Brick Red marks the attack and Clamp Orange the defense, and under reduced motion all animations are removed as before.
- Human decisions/changes: Requested stronger attack and defense animations, since number changes alone did not make the attacker's attack feel dynamic enough.
- References and versions: Next.js 15.5.26, Emotion 11.14.1, Zustand 5.0.8, `frontend-design` skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome 1440×756, confirmed the payload travel and collision frames right after the Request 30% input, the clamp collision and recoil frames right after the Apply 1% input, and the final 1% result. On the completed screen, the document height and viewport height matched at 756px.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; press the third button at `/demo/` to see the attack packets and the 30% collision, and with the fourth button confirm the 30% hits the clamp and then 1% appears. With the OS reduce-motion setting on, transitions should complete instantly.
- Open issues: Animation verification on the real GitHub Pages deployment screen and physical mobile devices not done.

## WEB15 — Remove the double transition in the cap scene

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1440×756 check / Codex, Anthropic `frontend-design` skill
- AI work: Removed the cause of React remounting the whole Scene when `enforce-busy` changed to `complete-ready` on input 4. The `enforce` and `complete` states now use the same `fee-enforcement` key, so the attack collision animation runs only once on first entry, and after the mock result arrives only the 1% result and the completion copy update within the same scene.
- Human decisions/changes: After noticing the screen appeared to be swapped once in the middle of action 4, requested a fix that updates the result within the same scene.
- References and versions: Next.js 15.5.26, React 19, Emotion 11.14.1, `frontend-design` skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome 1440×756, confirmed `Applying the 1% cap` appears right after the click, followed after completion by `The request was capped` and `1.00%`. The completed screen's document and viewport heights were both 756px.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; press the fourth button at `/demo/` and confirm the clamp collision animation runs only once and the 1% result appears on the same screen.
- Open issues: Animation verification on the real GitHub Pages deployment screen and physical mobile devices not done.

## WEB16 — klamp.eth-based 5-step mock verification flow

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1470×700 check / Codex, `frontend-design` skill
- AI work: Restructured the demo into five steps: `Launch + ENS record` → `Verify route` → `Verify hook` → `Request 30%` → `Enforce 1%`. Each scene reflects its part: the launcher creating the token and pool and then recording the canonical pool in `tokens.klamp.eth`; route recomputation; the hook code hash and 1% cap confirmed from `hooks.klamp.eth`; a 3,000 bps request from malicious logic inside the verified proxy; and the final 1% application with matching quoted/received output. Kept the existing attack payload and clamp collision animations, and stated the local mock and no-wallet/RPC status at the top of the screen and inside the instrument.
- Human decisions/changes: Requested holding off on the real contract connection and prioritizing the frontend demo up to just before contract connection and mock labeling, while keeping the existing level of interaction and animation.
- References and versions: Next.js 15.5.26, Emotion 11.14.1, Zustand 5.0.8, `frontend-design` skill.
- AI-run verification: Passed `pnpm lint` and `pnpm build`. In Chrome, ran the five steps' states and buttons in order to confirm the ENS record, canonical route, hook cap, 30% request, 1% applied and matching quoted/received output. Also confirmed the `Start over` return and that on a 1470×700 screen the document and viewport heights are both 700px.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; at `/demo/`, press the five buttons in order and check each ENS namespace and verification result, the attack/defense animations, the final output match, and the `Mock data` and `No wallet or RPC` labels.
- Open issues: Connecting a real wallet/RPC/ENS and the deployed contracts, switching to Sepolia live data, and physical mobile device verification not done.

## WEB17 — Remove the double playback in the Launch scene

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1470×756 check / Codex, `frontend-design` skill
- AI work: Removed the cause of the same screen remounting on the first Launch input, which was a different Scene key for each of `idle`, `launch-busy` and `launch-ready`. The three states now keep a single `launch-flow` scene, and the connector-line animation is tied to state so it starts only once on input. During async execution, a separate progress heading and Deploying/Initializing/Writing statuses are shown, and on completion only the actual mock values update in place.
- Human decisions/changes: Requested removing the screen flicker in the middle of action 1 while keeping the existing level of interaction and animation.
- References and versions: Next.js 15.5.26, React 19, Emotion 11.14.1, `frontend-design` skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome, checked the initial state, the in-progress state 120ms after input and the completed state after 520ms, and confirmed only the copy and values update while the Launch actor and receipt structure stay in place. The completed screen's document and viewport heights were both 756px.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; press the first button at `/demo/` and confirm the whole scene does not disappear and reappear, the connector line runs only once, and the progress copy changes to the completed values in the same place.
- Open issues: Transition verification in the real GitHub Pages deployment environment and on physical mobile devices not done.

## WEB18 — Adjust per-step mock response delays

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1470×756 check / Codex, `frontend-design` skill
- AI work: So the status copy and scene changes are readable, gathered the mock data layer's response delays in one place and increased them to Launch 950ms, route verification 850ms, hook verification 850ms and fee cap application 1,050ms. CSS animation speeds, including the attack payload and clamp collision, were not changed.
- Human decisions/changes: Requested longer waits between all steps than before.
- References and versions: Next.js 15.5.26, TypeScript 5, `frontend-design` skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome, measured from the click until the next action button appears: Launch 1,064ms, route 970ms, hook 962ms, cap 1,166ms. The completed screen's document and viewport heights were both 756px.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; press each button at `/demo/` in order and confirm the in-progress state lasts about 1 second for Launch, route and hook, and about 1.1 seconds for the final cap application.
- Open issues: Response times after connecting to a real network are unrelated to the mock delays, so a separate pending/loading policy is needed.

## WEB19 — Clean up the demo header and pad the Launch table

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1470×756 check / Codex, `frontend-design` skill
- AI work: Removed the `Protocol trace`, `klamp.eth namespaces`, `Mock data` and `No wallet or RPC` context group from the demo header, leaving only the Klamp brand and `Project overview` at either end. Added 18px of left and right inner padding to the receipt table in the first Launch scene so row text does not touch the borders.
- Human decisions/changes: Requested adding left/right padding to the Step 1 table and removing all of the header's `klamp.eth namespaces`, `Mock data` and `No wallet or RPC` copy.
- References and versions: Next.js 15.5.26, Emotion 11.14.1, `frontend-design` skill.
- AI-run verification: `pnpm lint` passed. The first `pnpm build` failed while collecting page data because of a conflict with the `.next` output of a running dev server for the same repository; after stopping that dev server and rerunning, it passed through static export. In Chrome, confirmed the header copy is gone, the Launch table has left/right padding, and long ENS names are truncated with an ellipsis; the document and viewport heights were both 756px.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; confirm only Klamp and `Project overview` remain in the `/demo/` header, and Step 1's three rows are aligned away from the left and right borders.
- Open issues: Verification in the real GitHub Pages deployment environment and on physical mobile devices not done.

## WEB20 — Remove the double transition in the Route and Hook scenes

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1470×756 check / Codex, `frontend-design` skill
- AI work: Changed the structure where the Scene key changed on every `busy → ready` transition in Step 2 and Step 3, remounting the whole screen, into fixed `route-verification` and `hook-verification` scenes respectively. Separated the animations so route animates only the clamp joining when the result arrives, and hook animates only the 1% cap figure when verification completes. While in progress, `Verifying the proposed route` and `Resolving the hook cap` are shown instead of the completion copy. Increased the mock response delays to Launch 1,250ms, route 1,150ms, hook 1,150ms and cap 1,350ms.
- Human decisions/changes: Requested increasing the overall wait further and removing the screen flicker in the middle of Step 2 and Step 3.
- References and versions: Next.js 15.5.26, React 19, Emotion 11.14.1, `frontend-design` skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome, confirmed the progress headings of Step 2 and Step 3 are each shown and then updated to the completed data within the same structure. From the click until the next action became available, route and hook each took 1,296ms and cap took 1,497ms; the document and viewport heights were both 756px.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; run Steps 2 and 3 at `/demo/` and confirm the whole scene does not reappear and, after the progress copy, only the route clamp and the 1% cap value animate once.
- Open issues: Transition verification in the real GitHub Pages deployment environment and on physical mobile devices not done.

## WEB21 — Show the connector line after route verification completes

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, local Chrome check / Codex, `frontend-design` skill
- AI work: Fixed the cause of the orange lines on either side of the central clamp in Step 2 being visible before route verification. The lines are hidden with `scaleX(0)` in the unmatched state, and when the `Canonical route verified` result arrives and matched becomes true, a 420ms animation expanding from the center out to both sides runs once and then holds the completed state.
- Human decisions/changes: Pointed out that the orange connector animation in Step 2 should run after `Canonical route verified`.
- References and versions: Next.js 15.5.26, React 19, Emotion 11.14.1, `frontend-design` skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome, confirmed the pseudo-element transform is `matrix(0, 0, 0, 1, 0, 0)` while the in-progress heading is `Verifying the proposed route`, and `matrix(1, 0, 0, 1, 0, 0)` when the completed heading is `Canonical route verified`.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; run Step 2 at `/demo/` and confirm there is no central orange line during verification and the line spreads out to both sides together with the completion copy.
- Open issues: Animation verification in the real GitHub Pages deployment environment and on physical mobile devices not done.

## WEB22 — Sync the demo's causal order and result reveal

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1470×756 local check / Codex, `frontend-design`, `browser` skills
- AI work: Added `deploying → initializing → recording → complete` visual states to Step 1 so token deployment, pool initialization and the ENS record do not look like they happen at the same time. During the 900ms the Step 4 30% attack sequence plays, the next action and Reset are locked and the progress copy is separate. In Step 5, the applied fee and settlement proof values and area are hidden until the mock execution result arrives, and only after the result is written to state are 1.00% and the actual quoted/received output shown. Reset is disabled during async work so in-flight requests and a reset do not race.
- Human decisions/changes: Following the earlier full animation review, requested continuing with follow-up fixes to make the scenario's causality clearer.
- References and versions: Next.js 15.5.26, React 19, Emotion 11.14.1, Zustand 5.0.8, `frontend-design` skill, Browser skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome, confirmed Step 1 changes in the order `Deploying/Waiting/Waiting` → `Complete/Initializing/Waiting` → `Complete/Complete/Writing` → the actual recorded values. Confirmed that right after the Step 4 input the `Sending request…` button is disabled and `Apply 1% cap` becomes enabled 950ms later. Confirmed that after the Step 5 input, up to the 1,000ms mark, the applied/result area has opacity 0 and empty values, and after the mock result `1.00%` and `41,842.17` are shown. No console errors, and the document and viewport heights were both 756px.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; at `/demo/`, confirm Step 1's three tasks change in order, the next button cannot be pressed during the Step 4 attack motion, and the Step 5 result appears only after the cap execution completes.
- Open issues: Pending/failure/retry states tied to real contract/RPC responses, the GitHub Pages deployment environment, and physical mobile device verification not done.

## WEB23 — Unblock browser translation in the demo

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, pnpm 12.6.0 / Codex
- AI work: Removed the `translate="no"` attribute applied to the entire demo instrument so the browser's translation feature can translate the on-screen copy. Screen structure, state transitions and technical data values were not changed.
- Human decisions/changes: Requested removing the setting that blocks Korean browser translation of the demo page.
- References and versions: Next.js 15.5.26, React 19.
- AI-run verification: `pnpm lint`, `pnpm build` passed. Also confirmed `/demo` is generated in the static export.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; run the browser's Korean translation at `/demo/` and confirm the UI copy is included in the translation.
- Open issues: If a browser translation extension changes DOM attributes before React hydration, hydration warnings may reappear in development. Stable multilingual support at the product level requires a separate i18n implementation.

## WEB24 — Visualize the protected pool creation premise and the routing actors

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1470×700 local check / Codex, `frontend-design`, `browser` skills
- AI work: Added a row and description to Step 1 stating the dynamic-fee pool has `CappedHookProxy · 1% max` as its hook from creation. In Step 2, built and placed separate dedicated SVGs for the Aggregator, which merges candidate routes, and the Router, which forwards the selected route, and animated orange packets that travel through the two segments in sequence and then lead into the canonical pool comparison. Corrected the responsibilities in the copy: in Step 3 ENS attests the wrapper and cap, in Step 4 the compromised fee strategy inside the official pool requests an excessive value, and in Step 5 the on-chain wrapper, not ENS, enforces the cap. Fixed v4's dynamic fee PoolKey to `0x800000`, corrected the mock hook address to include `BEFORE_SWAP_FLAG(0x80)`, recomputed the PoolId, and labeled the 30% raw fee request as `300_000` pips.
- Human decisions/changes: Requested separating canonical route verification and cap enforcement inside the official pool as two lines of defense, and adding separate images and animations for the Aggregator and the Router, which were not visible on the existing screen.
- References and versions: Next.js 15.5.26, React 19, Emotion 11.14.1, Zustand 5.0.8, viem 2.56.9, Uniswap v4-core `PoolKey`, `IHooks`, `LPFeeLibrary`, `frontend-design` skill, Browser skill.
- AI-run verification: Computed the PoolId `0x469206…d0cfbc` of the PoolKey reflecting the dynamic fee and the beforeSwap permission using viem 2.56.9 ABI encoding and keccak256. In Chrome, confirmed Step 1's capped proxy row, Step 2's Aggregator, Router, Selected branch order with the two packet movements, and the final route match. Then ran Steps 3~5 to confirm `Compromised strategy`, `requestFee(300_000)`, `Onchain maximum 1.00%` and the final applied/output values, with no console errors. At 1470×700 the document and viewport heights were both 700px with no horizontal overflow. After applying the final PoolKey and PoolId, reran `pnpm lint` and `pnpm build`, which passed.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; at `/demo/`, check the Pool hook row after Step 1 completes, and on the Step 2 input confirm the Aggregator and Router appear as separate images and the packets travel left to right in sequence.
- Open issues: `CappedHookProxy` and the fee strategy are still a mock scenario; a real on-chain wrapper implementation, immutable cap verification, attack/bypass tests and animation verification on physical devices not done.

## WEB25 — Six-step protected path and the completed return to PoolManager

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome desktop and 390×844 responsive check / Codex, `frontend-design`, `browser` skills
- AI work: Split the existing flow into six steps so each screen shows only one decision. Made the scene where the Aggregator builds candidate branches and the Router hands the PoolKey to the v4 PoolManager its own step, and added a `ProposedRoute` type and a mock client boundary separate from the canonical lookup. Route verification shows the ENS resolver, chain, PoolManager and PoolId comparison; hook verification shows evidence of the ENS identity, PoolKey hook address, runtime code hash and the `Immutable · 1%` cap. The attack was made concrete as an external strategy admin key compromise producing a `setFee(300_000)` output, and the final scene shows the CappedHookProxy returning the value clamped to 1% back to the PoolManager. Added a new PoolManager SVG in the project palette and removed the page-level horizontal overflow caused by the minimum width of mobile grid items.
- Human decisions/changes: Requested including all needed elements first and, if screen complexity grows, keeping it at a reasonable level by splitting steps.
- References and versions: Next.js 15.5.26, React 19, Emotion 11.14.1, Zustand 5.0.8, Uniswap v4 PoolManager/PoolKey concepts, `frontend-design` skill, Browser skill.
- AI-run verification: `pnpm lint`, `pnpm build` passed. In Chrome, ran all six steps in order and confirmed the Aggregator → Router → PoolManager handoff, the four canonical items matching, the four pieces of immutable hook cap evidence, the strategy admin attack, the wrapper → PoolManager 1% return and the settlement result. On desktop there were no console errors and no horizontal or vertical overflow, and at 390×844 there was no document-wide horizontal overflow apart from the intended internal horizontal scroll of the step progress area.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; run the six buttons in order at `/demo/` and confirm each step explains only one event and that both the handoff target in Step 2 and the return target in Step 6 are the PoolManager.
- Open issues: All protocol responses, the attack and cap enforcement are explicitly in the mock data layer; real ENS/RPC/contract connections, failure/mismatch paths and physical mobile device verification are still needed.

## WEB26 — Complete the malicious replica pool block, capped quote and revocation scenario

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 static export, Chrome 1470×756 and 390×844 responsive check / Codex, `frontend-design`, PDF, Browser skills
- AI work: Restructured the whole demo into 8 steps. Step 1 presents the CappedHookFactory's proxy deployment and hook identity issuance and the issuer's canonical pool record as one launch flow. In Step 2 the Aggregator discovers a 0.25% issuer pool and a 0.05% bait-quote replica pool as not-yet-trusted candidates, and in Step 3 the Guarded Router excludes the replica based on the ENS canonical PoolId. Step 4 verifies the hook address, runtime code hash, the immutable 1% maximum and that before/after swap return deltas are disabled, and quotes at the registered cap instead of the advertised fee. Moved the PoolManager handoff to Step 5, fixing the causal order so the PoolKey is handed over only after all verification. Step 6 shows the 30% request from the strategy admin key compromise, Step 7 a side-by-side comparison of the protected 1% result and the unguarded 30% result, and Step 8 the switch to resolver `0x0`, attestation revoked and route blocked after the Guardian unregisters. Each async step is split into its own typed mock client method and Zustand state.
- Human decisions/changes: Requested adding all missing key scenes, adding steps if needed while keeping each screen's complexity at a reasonable level, and including plenty of interaction animation.
- References and versions: Final phase 1 design PDF, CappedHooks development plan and spec PDF, Next.js 15.5.26, React 19, Emotion 11.14.1, Zustand 5.0.8, `frontend-design`, PDF, Browser skills.
- AI-run verification: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` passed. In Chrome, ran the 8 actions in order and confirmed replica `REJECT`, hook `Both disabled`, the 1% quote basis, PoolManager `Route accepted` after Step 5, the 30% attack, the guarded/unguarded comparison, the Guardian revoke and the final `Blocked`. There were no application console errors, only the browser extensions' own warnings. At 1470×756 the document and viewport sizes matched, and at 390×844 there was no document-wide horizontal overflow apart from the progress area's internal scroll.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; run the 8 steps in order at `/demo/`. Step 2 must have no PoolManager handoff; check Step 3 replica `REJECT`, Step 4 `Immutable maximum 1.00%` and `Both disabled`, Step 5 `Route accepted`, the Step 7 comparison of the two results, and Step 8's final `Revoked` and `Blocked`.
- Open issues: CappedHookFactory, the hook ENS registry, GuardedRouter, Guardian and fee enforcement are still a typed mock data layer; the real phase 2 contracts and RPC connection, failure/retry branches and physical mobile device verification are still needed.

## WEB27 — Align spacing in the Step 4 cap instrument panel

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26, Chrome 1470×756 and 390×844 responsive check / Codex, `frontend-design`, Browser skills
- AI work: Fixed the structure in which Step 4's hook identity, immutable maximum and quote basis sat in three independent columns, doubling up the column gap and left padding. Changed it to two columns, the identity body and a 360px instrument panel, and gave `Immutable maximum` and `Quote basis` inside the panel the same 180px column, the same padding, the same left alignment and the same numeral size. Set the row gap to the verification row below to 22px, and at 430px and below the two figures stack into one column.
- Human decisions/changes: Pointed out that the overall spacing around Step 4's `Immutable maximum` looked wrong and requested checking and fixing it.
- References and versions: Next.js 15.5.26, Emotion 11.14.1, `frontend-design`, Browser skills.
- AI-run verification: In Chrome's computed layout, confirmed the desktop instrument panel is 180px/180px, both cells have `15px 18px 16px` padding, and both are left-aligned. At 1470×756 the document and viewport matched, and at 390×844 the two cells stacked into a single column with no document horizontal overflow. `pnpm lint` and `pnpm build` also passed.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; proceed to Step 4 at `/demo/` and confirm `Immutable maximum` and `Quote basis` share the same baseline and padding within one instrument panel.
- Open issues: Human visual verification of actual font rendering and on physical mobile devices is still needed.

## WEB28 — Gentler demo motion and two-way step navigation

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26, Chrome 1470×756 and 390×844 responsive check / Codex, `frontend-design`, Browser skills
- AI work: Increased all mock response delays by about 15% and slowed the scene entry, candidate branching, verification gate, route packet, cap reveal, attack collision, result comparison and Guardian revocation animations by about 15~20%. The existing order and easing are unchanged. Added `Previous` at the bottom and extended the Zustand state to go back one step at a time while keeping visited results. Changed the top 8-step progress table into keyboard-accessible buttons. Future steps with no data yet are disabled, the immediate next step is runnable, and a step completed once can later be clicked to jump to it instantly. In past scenes, the display range is limited to the current step so later results are not exposed in the bottom status.
- Human decisions/changes: Requested slightly slowing all animations and adding, besides Reset, a previous-step button and click navigation on the top step table.
- References and versions: Next.js 15.5.26, Emotion 11.14.1, Zustand 5.0.8, `frontend-design`, Browser skills.
- AI-run verification: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` passed. In Chrome, ran all 8 steps to the end using only the top step table, and after completion confirmed jumping directly to Step 3, returning to Step 2 via `Previous`, and jumping directly to Step 7. Confirmed future state is hidden in past steps and all 8 step buttons become enabled once everything has been visited. At 390×844, `Reset`, `Previous` and the next action button fit within 390px, there was no document horizontal overflow, and there were no localhost application console errors.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; click Step 1 through Step 8 at the top in order, then click any completed step to jump to it immediately, go back one step with `Previous`, and confirm the data and bottom status match that scene.
- Open issues: Once real on-chain transactions are connected, presentation mode and live mode must be distinguished so that moving to a previous step in the UI is not mistaken for reverting chain state that is already final.

## WEB29 — Direct navigation to unvisited steps

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26, Chrome desktop and mobile responsive check / Codex, `frontend-design`, Browser skills
- AI work: Changed the top 8-step progress table so future steps that have not been run yet can also be opened immediately. Added an optional presentation snapshot port to `ProtocolClient`; only the local mock adapter provides a completed deterministic snapshot. On direct navigation, only the data needed up to the selected scene is filled into Zustand and later steps' results are left empty, preventing state leaks such as Step 7 results appearing early at Step 4. Direct navigation to Step 8 shows the completed revocation scene. The bottom CTA's sequential execution and delayed animations and the `Previous` behavior are unchanged.
- Human decisions/changes: Requested that during a presentation, future steps can also be navigated freely from the top progress table whether or not they have been visited.
- References and versions: Next.js 15.5.26, Emotion 11.14.1, Zustand 5.0.8, `frontend-design`, Browser skills.
- AI-run verification: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` passed. On Chrome's initial screen, confirmed 0 of the 8 progress buttons are disabled. On direct navigation to Step 4, the immutable 1% quote was visible and Step 7 results were not shown; after jumping directly to Step 7 and going back to Step 6 with `Previous`, the bottom `Applied at 1%` result was hidden. Direct navigation to Step 8 right after a reset also immediately showed the revoked/blocked completed scene. At 390×844, the document width and viewport width were both 390px. There were no localhost-related console errors; only the pre-existing hydration warning caused by the auto-translate extension changing `html lang` and wallet extension warnings were seen.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; from the initial screen, click Step 4, Step 7 and Step 8 directly, one at a time, and confirm the scene and the required prior data appear immediately. Also confirm that when going back from Step 7 to Step 6 with `Previous`, the cap application result does not remain visible in the bottom status.
- Open issues: A real on-chain adapter without a presentation snapshot cannot fabricate unconfirmed future state, so when live mode is introduced the policy for direct navigation to future steps in the top table must be indicated separately or restricted.

## WEB30 — Separate the normal quote from the attack fee

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26, Chrome desktop and 390×844 responsive check / Codex, `frontend-design`, Browser skills
- AI work: Corrected the error where Step 4 quoted at the 100 bps cap instead of the verified normal pool's current 25 bps fee. Changed `CapQuote` to be based on the current fee and rearranged the screen in the order `Current quote 0.25% → Immutable maximum 1.00%`. The Step 5 handoff screen also shows the 0.25% current quote. Step 6 now spells out the actor, target and action: an external attacker uses a stolen strategy-admin key to make an unauthorized `setFee(300_000)` call on the verified official pool. Step 7 distinguishes the earlier 0.25% quote, the 30% attack request and the protected 1% applied fee, and removes the earlier claim that the 0.25% quote and the 1% execution result are the same. The mock output computes 0.25%, 1% and 30% each on the same fee-before-output basis.
- Human decisions/changes: Requested that since the malicious replica pool is excluded in Step 3, Step 4 should show the normal pool's 0.25%, and that the 30% request in Step 6 be expressed more clearly as an external attack.
- References and versions: Root `AGENTS.md`, `contract/AGENTS.md`, `contract/Klamp_Phase1_Agent_Spec.md`, Next.js 15.5.26, Emotion 11.14.1, Zustand 5.0.8, `frontend-design`, Browser skills.
- AI-run verification: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` passed. In Chrome, confirmed the Step 4 heading and instrument panel show the normal pool's `0.25%` first and the immutable maximum `1.00%` separately. In Step 6, confirmed `External attacker`, `Stolen strategy-admin key`, the official pool as target, the unauthorized `setFee(300_000)` and the 30% output. In Step 7, the earlier 0.25% quote, the 30% attack request, and the guarded 1% and unguarded 30% results were distinguished. At 390×844, the document and viewport widths were both 390px. Apart from the pre-existing hydration warning caused by the auto-translate extension changing `html lang`, there were no localhost application errors.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; go directly to Step 4 at `/demo/` and confirm the order of the 0.25% current quote and the 1% cap, and in Step 6 confirm the attacker, stolen key, official pool target and 30% request read as one flow. Also confirm Step 7 does not describe the 0.25% quote and the 1% applied result as the same.
- Open issues: The phase 2 CappedHookProxy, the strategy attack, fee enforcement and the output comparison are still typed mocks. When real contracts are connected, state differences between quote time and execution time and reverts due to `amountOutMinimum` must be replaced with real RPC results.

## WEB31 — Remove demo execution-mode labels

- Date / environment / tools: 2026-09-26 / Next.js 15.5.26 / Codex
- AI work: In line with the presentation direction that the demo is not a DApp running the system live but a trace viewer for exploring prepared event records, removed the `Local mock` label from the instrument header. Also removed the execution-mode wording `mocked` from the metadata, leaving only the purpose, protocol trace. The internal typed mock adapter and the README's note on current implementation limits stay until they are replaced with real on-chain records.
- Human decisions/changes: Decided that since the demo always traces existing records, the screen should not state a live/mock distinction.
- References and versions: Root `AGENTS.md`, Next.js 15.5.26, Emotion 11.14.1.
- AI-run verification: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` passed. Statically confirmed `Local mock` and `mocked` were removed from the user-facing strings in `web/src` and only the trace naming remains.
- Human verification: Pending human verification.
- Human reproduction: `cd web && pnpm dev`; confirm there is no live/mock execution-mode wording at the top of the `/demo/` instrument or in the page metadata.
- Open issues: The current trace data is not yet a real Sepolia execution artifact, so the README's mock notice stays. After Phase 2 is implemented and deployed, it must be replaced with a recorded trace adapter that includes transaction hashes, block numbers and event/read results.

## C12 — Align the baseline code to the final design doc

- Date / environment / tools: 2026-09-26 / Foundry (existing environment), Node, local Anvil / Claude Code (Opus 5.5)
- AI work: Replaced the registrar with the full CanonicalPoolRegistrar code from `final_klamp_with_code.md` (5-argument path A, PoolKey-pinned path B, a path via a disposable contract, the extsload POOLS_SLOT initialization check, NotIssuer, and issuer and creator events). The setup drops the hooks pre-registration and hooksAdmin, leaves only the operator REGISTRAR (+admin) after the seal, and has it revoked in phase 2 via `finalizeHooks`. Added data record cross-verification, `judge()`, restriction of the event fallback to the launch pool shape, and an ENS conflict warning to the SDK. Aligned the deployment, seal, preflight and smoke scripts, `.env.example`, the Sepolia candidate file, related docs and the web result types. Detailed decisions are in the [C12 plan](plans/C12-design-doc-alignment.md).
- Human decisions/changes: Requested aligning the baseline code to the two new design docs. The plan doc's "what was left different from the docs" is pending human review.
- References and versions: Existing pinned versions (`deployments/versions.json`) unchanged. Confirmed v4-core 59d3ecf StateLibrary.POOLS_SLOT = 6.
- AI-run verification: `forge test` 34 passed (0 failed, including 4,096 CREATE address fuzz runs). `npm test` 24 passed. `npm run typecheck` passed. `npm run test:e2e` passed (smoke for fresh Anvil deployment, registration, seal, viem found/missing/namespace, editor/issuer permissions, overwrite and sealed roles).
- Human verification: Pending human verification.
- Human reproduction: `cd contract && forge test && npm test && npm run typecheck && npm run test:e2e`.
- Open issues: The Robinhood strategy address's code hash and start block, and whether the Sepolia LiquidityLauncher and UERC20Factory exist, are unverified. Phases 2~4 and the demo launchpad and terminal are not implemented. The running local demo chain must be redeployed with the new registrar.

## C12 — Switch to three lookup states and check public chains

- Date / environment / tools: 2026-09-26 / Node, Foundry, cast, Sepolia public RPC (publicnode), Robinhood Chain public RPC, Blockscout PRO API / Claude Code (Opus 5.5)
- Human decisions/changes: Decided to change the lookup states to three as in the design doc, taking precedence over the root AGENTS.md. The Robinhood strategy constants and compareRoutes stay as they are. Of the design docs, only `final_klamp_with_code.md` is committed. Provided a Blockscout API key (not recorded in the repository).
- AI work: Changed the SDK's `CanonicalPoolResult` to `registered | not_registered | lookup_failed` (+`reason`) and put the PoolKey in `registered`. Aligned the fallback, compareRoutes, judge, smoke scripts, the 4173 demo labels, the web mirror types and mock, the root AGENTS.md and the READMEs. Checked the LiquidityLauncher, UERC20Factory and InstantLaunchStrategy code read-only on Sepolia and Robinhood Chain (results in the [fallback doc](phase1-fallback.md) and the Sepolia candidate file).
- Findings: LiquidityLauncher v3.0.0 `0x00004c4c…` (hash `0x6720…6ed6`) and v3.2.0 `0x0000FffF…` (hash `0x4a58…7d80`) exist on both Sepolia and Robinhood with identical hashes. The UERC20Factory used by Pools.trade is `0x000000e2…ad49b` (same hash `0x9f04…6aeb` on both chains), and `getUERC20Address(name, symbol, decimals, launcher, graffiti) == token` was reproduced for the real Robinhood token `0xd565…dead`. The `0x0cde87c1…` in the uerc20-factory README has no code on Robinhood. Robinhood InstantLaunchStrategy `0x23f8…`: code hash `0x29df…cffca`, deployment block 28,519,960, launcher = v3.2.0.
- AI-run verification: See the command results in the WORKLOG additions below.
- Human verification: Pending human verification.
- Open issues: 1 of the latest 30 went through an intermediate contract that still has code and cannot be registered via either path. The public RPC does not provide traces or historical state, so the deployer of that contract could not be identified.

## C12 — Show the block reason in the demo

- Date / environment / tools: 2026-09-26 / local Anvil 18545, demo-server 4173 / Claude Code (Opus 5.5)
- AI work: The 4173 demo status copy showed only "Blocked" regardless of why it was blocked; changed it to show copy per `comparison.reason` (no token hop in the route, not registered, lookup failed), the mismatch location (split route, hop), and the lookup failure `reason`.
- Human decisions/changes: After a lookup with `tokenIn` still set to the previous token showed "Blocked" with no reason, requested a fix.
- AI-run verification: Applied the screen logic to 4 real `/api/check` responses (invalid-route, match, mismatch, not_registered) from the running demo-server and confirmed the expected copy. Visual browser check not run.
- Human verification: Pending human verification.

## C12 — Add PoolKey to the CanonicalRecorded event

- Date / environment / tools: 2026-09-26 / Foundry, local Anvil / Claude Code (Opus 5.5)
- Human decisions/changes: Decided to put the PoolKey in the event for cases where an aggregator backend integrates through event indexing instead of ENS lookups. Judged there is no exposure issue since it is public information.
- AI work: Changed it to `CanonicalRecorded(token, poolId, issuer, creator, key)` (key is non-indexed data) and updated the event definition and description in the design doc `final_klamp_with_code.md` and the C12 plan along with it. Two event tests verify down to key.

## C13 — Confirm the team's Sepolia deployment and fix the SDK lookup path

- Date / environment / tools: 2026-09-26 / Sepolia public RPC (publicnode), Blockscout PRO API, Sourcify / Claude Code (Opus 5.5)
- Human decisions/changes: A teammate completed setup, role revocation and the KDEMO Via declaration on the Sepolia ENSv2 Beta set and shared the checklist results (verifier identifier pending). The user shared explorer.ens.dev screens (klamp.eth, tokens.klamp.eth) and confirmed wildcard token names show Not found. Requested the SDK fix and connecting the demo to Sepolia.
- AI work: Cross-checked the shared claims read-only on chain. Found the Beta UniversalResolver `0x5d25c1d6…`, downloaded the deployed registrar source from Sourcify and compared it with the repository (a variant adapted to the Beta resolver API, with no PoolKey in the event). Changed the SDK's data record read from calling the resolver directly to going through UniversalResolver `resolve()`, and treated a returned resolver that differs from the configured one as `lookup_failed: namespace`. Wrote `deployments/sepolia.phase1.json`.
- AI-run verification: `npm test` 25 passed, typecheck passed, `npm run test:e2e` passed (the local UniversalResolver also works through the same path). With the repository SDK, Sepolia KDEMO is `registered` (PoolKey `(ETH, KDEMO, 2500, 25, no hook)`, hash match) and an undeclared token is `not_registered`. In the Sepolia-connected demo (4174): KDEMO's own pool match, another pool mismatch, undeclared not_registered.
- Human verification: The user checked the explorer.ens.dev structure screens. The rest is pending human verification.
- Open issues: The repository's `src/`, setup and local tests differ from the Sepolia deployment (Beta API). The event PoolKey change is not in the deployment. A redeploy script for the Beta API is needed when ENSv2 Sepolia is reset.

## C14 — Switch to ENSv2 Beta

- Date / environment / tools: 2026-09-26 / Foundry 1.7.1 (solc 0.8.25, 0.8.26), Node, local Anvil, Sepolia public RPC, Sourcify / Claude Code (Opus 5.5)
- Human decisions/changes: Decided to align the repository with the Sepolia deployment (Beta) and revert the event PoolKey change. Also requested doing any necessary side work.
- AI work: Re-pinned contracts-v2 to `f2f0a05` (confirmed the official Sepolia address table matches the Beta set). Replaced the registrar with the Sourcify-verified source. Decoded the teammate's setup transactions to confirm the role values and the 4 `grantSetterRoles` calls, and moved `Phase1Setup`, the scripts and fixtures to an interface + `vm.deployCode` structure. Rewrote the metadata tests around `setTokenText` and changed the smoke script to read through UniversalResolver. Reverted the event PoolKey edit in the design doc. Plan: [C14](plans/C14-ensv2-beta.md).
- AI-run verification: `forge test` 34 passed. `npm test` 25 passed, typecheck passed, `npm run test:e2e` passed (Beta ENS local deployment, registration, seal, viem lookup and permission smoke). The repository registrar's 0.8.26 build and the Sepolia `0x820bE7…` runtime code differ by 0 bytes apart from immutables and metadata.
- Human verification: Pending human verification.
- Open issues: A fresh Sepolia deployment with the repository scripts has not been run. When Sepolia ENSv2 is reset, redeploy with these scripts.

## C15 — Merge the teammate handoff repository (handoff `klamp/`)

- Date / environment / tools: 2026-09-26 / Foundry 1.7.1, Node, Sepolia public RPC / Claude Code (Opus 5.5)
- Human decisions/changes: Decided not to create a new public repository and instead to merge the demo materials and tests from the handed-off `klamp/` (commit `2f2558b`) into this repository in small commits. The handoff folder and zip are not tracked and are deleted after the merge.
- Sourcing principle: Teammate sources are brought in unmodified. Import path differences are absorbed with remapping aliases (`v4-core/`, `ensv2/`, `ens-contracts/`). The teammate repository uses v4-core `46c6834`; this repository uses `59d3ecf` (via liquidity-launcher).
- 1) Four demo contracts in `src/demo/` (DeltaFeeHook, DemoLaunchpad, DisposableLauncher, PoolSeeder): copied verbatim; `forge build` passed (only DisposableLauncher's intended `selfdestruct` warning); existing `forge test` 34 passed.
- 2) The scripts actually run for the Sepolia setup, `script/KlampSetup.sol`, `Commit.s.sol` and `Finish.s.sol`: verbatim. The signer is passed via the CLI and there are no keys in the code. `Commit` writes the registration secret to `deployments/sepolia.json`; this value is already public through the register transaction. Same order and role values as the repository's `Phase1Setup` family (cross-checked by transaction decoding in C14). `forge build` passed, existing tests 34 passed.
- 3) Demo launch scripts `script/DemoLaunch.s.sol` (path B, KDEMO via a disposable contract) and `DemoPathA.s.sol` (path A, KHOOK with DemoLaunchpad + DeltaFeeHook), and the team deployment records they read and write, `deployments/sepolia.json`, `demo-pathA.json`, `demo-token.txt` and `pool-seeder.txt`: verbatim. The records contain only public addresses and the already-public registration secret. `forge build` passed.
- 4) Sepolia fork tests `test/SetupFork.t.sol` (setup links and permission revocation, path B direct and via a disposable contract) and `test/PathAFork.t.sol` (path A hooked pool declaration and fixed-fee trade, attacker rejection, 4 registration checks): verbatim. Because they need a network, they are excluded from the default profile and run with `FOUNDRY_PROFILE=fork forge test` (`[rpc_endpoints] sepolia` is the same public RPC the teammate used). AI run: fork 10 passed (built with this repository's v4-core 59d3ecf and ENS f2f0a05), default 34 passed.
- 5) JS demo tools in `demo/sepolia/` (`klamp-sdk.mjs` for lookup, judge, requote and UR calldata verification; `klamp-swap.mjs` with two modes, naive and klamp; `read-pool.mjs`; `pools.json`; package and lock): verbatim, placed in a subfolder separate from the existing 4173 demo. AI run (read-only): `read-pool` read the KDEMO pool and description; `naive` selected the undeclared pool 0x84dd…; `klamp` went ENS registered → judge `requote_canonical` → requote on the canonical pool 0xcd97…; calldata verify OK in both modes. Execution (`--execute`) needs a key and was not run.
- 6) Teammate Sepolia run logs in `docs/evidence/sepolia-broadcast/` (Commit 5, Finish 11, DemoLaunch 2, DemoPathA 4 transactions, all receipts successful): since `broadcast/` is ignored, only `run-latest.json` was copied into the evidence folder (same content as the timestamped files). No key fields.
- 7) Added the Uniswap submission `FEEDBACK.md` verbatim at the repository root (a draft; the Trading API section is a team TODO). `contract/docs/FEEDBACK.md` is separate and records teammate and mentor feedback.
- 8) Merged the handoff README's introduction, issuer proof table, Sepolia deployment addresses, known limitations and AI-use disclosure into the root README, and changed the run paths to this repository's layout (`contract/`, `demo/sepolia`, fork profile). The original's "all admin roles are revoked" did not match chain state (REGISTRAR for hooks remains on the klamp registry), so it was corrected to an accurate sentence. The AI-use section distinguishes Codex and Claude Code as recorded in the WORKLOG.
- 9) Added the handoff folder's `reference/` (analysis of the real Pools.trade launch Uptober and the flow via a disposable contract; public addresses and txs only, no keys) verbatim to `docs/evidence/pools-trade/` as evidence for the presentation. `HANDOFF.md` was not merged, since it is a work order that assumes publishing a separate repository.

## C16 — Translate Korean docs, comments and UI strings to English

- Date / environment / tools: 2026-09-26 / Foundry 1.7.1, Node / Claude Code (Opus 5.5, parallel sub-agents per file group)
- Human decisions/changes: Translate every Korean Markdown file and code comment in the repository to English, including the comments of the Sepolia-deployed contracts, and also the Korean user-facing strings (lookup demo page, demo server messages, demo CLI output).
- AI work: Translated 36 tracked files (docs, plans, evidence, AGENTS files, design doc, agent spec, this log, Solidity comments, demo JS/HTML/TS strings). Code, identifiers, addresses, hashes and commands were left unchanged; heading, line and code-fence counts were compared with the previous revision. One anchor link was updated (`phase1-deployment.md#sepolia-team-deployment-2026-09-26`). Status labels are now `Local pass / Sepolia pass / Manual check / Not run / Blocked`. Because the registrar comments changed, the docs now say the repository code (not the byte-for-byte source) matches the Sourcify-verified deployment.
- AI-run verification: no tracked file outside `contract/lib/` contains Korean. `forge test` 34 passed, `FOUNDRY_PROFILE=fork forge test` 10 passed, `npm test` 25 passed, typecheck passed. Demo CLI (`read-pool`, naive, klamp) runs with English output. Registrar 0.8.26 build vs Sepolia `0x820bE7…`: 0 differing bytes outside immutables and metadata.
- Human verification: Pending human verification.

## WEB32 — Align the web trace with the final phase 1 design

- Date / environment / tools: 2026-09-27 / Next.js 15.5, pnpm / Claude Code (Opus 5.5)
- Human decisions/changes: The web demo did not match the final structure; rework it around the final concept without wiring live data yet.
- AI work: Replaced the stage 2 trace (capped-hook identity under hooks.klamp.eth, 1% wrapper, stolen-key 30% request, Guardian revocation) with the eight-step path A flow of the final spec: DemoLaunchpad launch and `recordByCreate2` declaration, V4Quoter quotes for the declared pool and a look-alike hook pool, naive best-quote pick, ENS lookup through UniversalResolverV2, `judge()` verdict `requote_canonical`, requote on the declared pool, Universal Router `V4_SWAP` calldata check and swap, and the outcome comparison. `web/src/domain/protocol.ts` now mirrors `contract/sdk/judge.ts` next to `compareRoutes`. Canonical values (KHOOK, DeltaFeeHook, DemoLaunchpad, registrar, resolver, PoolId, launch tx `0x88939990…`, 196,119.71 KHOOK for 0.0005 ETH) come from the Sepolia deployment and the demo CLI; the look-alike pool, its 0.05%/10% fees and the resulting −9.95% are simulated and labelled "Simulated" in the UI. The landing page and metadata no longer claim fee-cap enforcement; capped hooks are shown as roadmap only.
- AI-run verification: `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm build` passed. The static HTML contains the new copy, and no source file still mentions Guardian, revocation, stolen keys or hook attestation. Browser rendering was not checked: the local headless Chromium lacks system libraries (`libnspr4`).
- Human verification: Pending human verification (open `/demo/`, step through all eight steps, check desktop and 390 px mobile).

## WEB33 — Use live Sepolia data in the web trace

- Date / environment / tools: 2026-09-27 / Sepolia public RPC, Next.js 15.5 / Claude Code (Opus 5.5)
- Human decisions/changes: Use the addresses in the final team spec in the web demo.
- Findings (read-only, on chain): KHOOK has exactly two pools on the Sepolia PoolManager, the declared pool `0xcd973bc9…` (fee 3000, DeltaFeeHook, launch tx `0x88939990…`) and an undeclared pool `0x84dd01cd…` (fee 500, same hook, tx `0xc81311c1…`); no attack pool is deployed yet. The live registrar has two declarations, KDEMO (via disposable contract) and KHOOK (CREATE2 launchpad); the direct LiquidityLauncher entry point is covered by fork tests only, not by a live declaration. The deployer made three Klamp-mode swaps on the declared pool through the Universal Router; the 0.0005 ETH one (`0x1cf6fdde…`, block 11786159) received 196,197.61 KHOOK plus a 1,981.79 KHOOK hook fee to the fee recipient. The quote at that block could not be rechecked (the public RPC has no historical state); the current quote for the same input is 196,119.71.
- AI work: Steps 2–7 now use this data (real undeclared pool instead of a simulated replica, V4Quoter and Universal Router addresses, demo CLI quotes and 5% minimums, the team's swap tx). Only step 8 is simulated and labelled: if the undeclared hook charged 10% at swap time, the naive swap reverts at 5% slippage and loses 9.09% at 15%.
- AI-run verification: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` passed. Browser rendering not checked (headless Chromium lacks system libraries).
- Human verification: Pending human verification.

## WEB34 — Animated web trace for the demo video

- Date / environment / tools: 2026-09-27 / Next.js 15.5, Motion 12 / Claude Code (Opus 5.5)
- Human decisions/changes: Make the web demo heavily animated with much less text for a 4-minute demo video.
- AI work: Replaced the text-heavy trace with one SVG node diagram (launchpad, ENSv2, trader, router/Klamp, declared and undeclared pools) that builds up across the eight steps: drawn edges, token packets, counting quotes, REJECT/ONCE stamps and a final two-card outcome (naive side still labelled simulated). Each step has a headline and one line. Added autoplay and keyboard controls (→/Space, ←, P, R) and shortened the mock client delays so the animation, not a spinner, carries each step. Data, states and the `judge()` path are unchanged.
- AI-run verification: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` passed. Browser rendering not checked (headless Chromium lacks system libraries).
- Human verification: Pending human verification.

## WEB35 — Live Sepolia reads in the browser and submission requirements

- Date / environment / tools: 2026-09-27 / Sepolia public RPC, Next.js 15.5, viem 2.56.9 / Claude Code (Opus 5.5)
- Human decisions/changes: Check the repository against the ENS (Best Use of ENSv2) and Uniswap (Best Uniswap Stack Contribution) prize requirements and fix the gaps: the live demo must not rely on hard-coded values, the code must be open source, and the README must point to the relevant contracts and lines.
- AI work: Added `web/src/data/protocol/sepolia.ts` (browser port of `getCanonicalPool` with namespace, text/data and pool checks; V4Quoter quotes; decoding of the launch tx's `CanonicalRecorded`/`Initialize` events and of the swap tx's Universal Router calldata and KHOOK transfers) and `sepoliaProtocolClient`, now the demo's default client. The naive pick and the simulated outcome are computed from the live quotes. Each demo step shows `Live · Sepolia #<block>` or `Recorded snapshot`. The landing page's illustrative terminal became a live ENSv2 lookup for any token address. Added an MIT `LICENSE`, a live demo link and ENSv2/Uniswap code-pointer tables to the README, and removed the draft markers from `FEEDBACK.md`.
- AI-run verification: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` passed. The live client run from Node against Sepolia returned: launch decoded at block 11786120 with PoolId `0xcd973bc9…`; quotes 196,119.71 (declared) and 196,739.12 (undeclared), naive pick undeclared; KHOOK `registered`; requote 196,119.71; swap `0x1cf6fdde…` calldata PoolKey = declared pool, 196,197.61 received, 1,981.79 hook fee. KDEMO `registered` (fee 2500, no hook), `0x1111…1111` `not_registered`, `0x123` `lookup_failed: format`. The RPC answers CORS preflight with `access-control-allow-origin: *`. Browser rendering was not checked (headless Chromium lacks system libraries).
- Human verification: Pending human verification (open the landing page and `/demo/` in a browser, try the three preset tokens).

## DEX1 — Wallet dApp on the deployed contracts

- Date / environment / tools: 2026-09-27 / Vite 8, React 19, viem 2.56.9, Sepolia public RPC, anvil Sepolia fork / Claude Code (Opus 5.5)
- Human decisions/changes: Add a separate root directory with a frontend that uses the deployed DemoLaunchpad, registrar, PoolManager and Universal Router as an integrated launchpad and router would, so pair creation and swaps can be tried for real. Leave `web/` unchanged.
- AI work: `dex/` (pnpm, Vite). Launch tab calls `DemoLaunchpad.launch` and reads the ENS record back with `contract/sdk` `getCanonicalPool`; the creator can call `setTokenText`. Look-alike tab seeds a pool through `PoolSeeder` about 3% above the declared pool's live price (`canonicalPoolOf` + StateView) and simulates `recordByCreate2` from the caller. Swap tab discovers ETH pools from PoolManager `Initialize` logs, quotes with V4Quoter, and in Klamp mode runs `getCanonicalPool`, `judge`, `compareRoutes`, `allowedPools`, `buildSwap` and `verifySwapCalldata` before the wallet signs. The contract SDK, the demo SDK and the deployment JSON are imported through Vite aliases, not copied; `viem` is deduplicated.
- AI-run verification: `pnpm build` (tsc + vite) passed. Live Sepolia reads from Node through the app modules: KHOOK pools 3000/60 and 500/10 found; naive picks `0x84dd…` (196,739.12), Klamp gets `registered` / `requote_canonical` / `mismatch` and picks `0xcd97…` (196,119.71); calldata check OK both ways; `recordByCreate2` from a third party reverts `NotIssuer`. On an anvil fork of Sepolia (block 11787512) from a fresh account: launch (1,034,186 gas) → ENS `registered` / `allow` / `match`; buy 0.002 ETH; approve + seed a 0.05% hooked look-alike at ticks 197700–198300; quotes 195,964.04 (declared) vs 201,577.07 (look-alike); naive swap received 201,577.07 on the look-alike, Klamp swap got `requote_canonical` / `mismatch` and received 195,964.04 on the declared pool, both equal to their quotes. A first version seeded at the launch price and lost on quote, so the look-alike is now priced above the declared pool.
- Human verification: Pending human verification (open `dex/` with a Sepolia wallet and run launch → buy → look-alike → swap).

## WEB36 / DEX2 — Show who can still change a record, fix demo layout

- Date / environment / tools: 2026-09-27 / Sepolia public RPC, Next.js 15.5, Vite 8, headless Chromium screenshots / Claude Code (Opus 5.5)
- Human decisions/changes: Show the ENSv2 permission state in both frontends, each in its own tone (web as a presentation slide, dex as a dApp status badge). Fix dex addresses overflowing their boxes and the rejection mark sitting off its route.
- Findings (read-only, Sepolia block ~11787640): resolver root roles 0; per-key writers `pool` text 1 and data 1, `description` 1, `url` 1, all the registrar; `avatar` 0; `tokens.klamp.eth` roles 0 and expiry max uint64; `klamp.eth` roles 0, expiry year 3026; klamp.eth registry root roles = REGISTRAR 1 and REGISTRAR_ADMIN 1 (operator), nothing else. The README previously said every root role on the registry was revoked; corrected.
- AI work: web: new `seal` step between the ENS lookup and the verdict (`readSeal` in `sepolia.ts`, recorded fallback in `client.ts`, store and snapshot), shown as a board of locked rows with the REGISTRAR row in warning colour; wider diagram nodes, chips sized to their text, SVG kept inside the canvas so it no longer runs under the controls, ONCE and REJECT stamps moved off labels. dex: `lib/seal.ts` and a header `SealBadge` with a live role panel; route pool boxes widened, ✕ placed at the edge's cubic midpoint, long values wrap instead of overflowing. README: accurate seal wording, "Why ENSv2" (data-only subnames, per-record roles, a name nobody controls, standard reads) and "For Uniswap and for agents".
- AI-run verification: web `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`; dex `pnpm build`. `readSeal` run against Sepolia returned the values above. Screenshots from headless Chromium (browser libraries extracted to a scratch dir) of web steps 1, 4, 5 (seal), 6, 8, 9 and of dex swap, seal panel, look-alike and 390 px mobile were checked by eye.
- Human verification: Pending human verification.

## DEX3 — Deploy dex with the web site on GitHub Pages

- Date / environment / tools: 2026-09-27 / pnpm 12.6.0, Vite 8, Next.js 15.5 / Claude Code (Opus 5.5)
- Human decisions/changes: Deploy `dex/` on GitHub Pages as well.
- AI work: A repository has one Pages site, so `deploy-pages.yml` now builds dex after the web export and copies `dex/dist` to `web/out/dex` (served at `/dex/`). The workflow also triggers on `dex/**` and on the contract files dex bundles (`contract/sdk`, `klamp-sdk.mjs`, `contract/deployments`). dex is pinned to pnpm 12.6.0 like web; its lockfile was re-resolved with pnpm 12 because the default minimum-release-age policy rejected the pnpm 10 lockfile; `@types/node` is pinned to 24.10.1 so no policy exception is needed. Landing page links to `/dex/`; dex links back with `../`.
- AI-run verification: dex built from a clean `git archive` checkout with no `contract/node_modules`; `pnpm install --frozen-lockfile` and `pnpm build` pass with pnpm 12.6.0; web `pnpm lint` and `pnpm build` pass. The combined `web/out` served locally: `/dex/` 200 (`/dex` 301 to `/dex/`), landing → "Try it with your wallet" → dex loads live KHOOK quotes and the seal badge → "Klamp home" returns to `/`.
- Human verification: Pending (check the Pages run after pushing).


## ATK1 — Reproduce the quote/swap fee divergence attack on v4-core

- Date / environment / tools: 2026-09-27 / Foundry 1.7.1, solc 0.8.26, v4-core `59d3ecf5`, v4-periphery `ad04c9f` (both under `lib/liquidity-launcher/lib`) / Claude Code (Opus 5.5)
- Human decisions/changes: After a judge-style review of the submission, the team asked for the attack reproduction the design doc describes to be in the repository (it was not: no test used dynamic fees or `OVERRIDE_FEE_FLAG`).
- AI work: `test/QuoteDivergenceAttack.t.sol`. Real `PoolManager`, `PoolSwapTest`, `PoolModifyLiquidityTest` and v4-periphery `V4Quoter`. Same pair, same price and depth: a static 0.25% pool (what an issuer would declare) and a dynamic-fee look-alike whose `QuoteAwareFeeHook` (beforeSwap flag only) returns 0.05% when `sender` is the quoter and 10% or 30% otherwise. A router wrapper reverts below `quote × (1 − slippage)`. Tests: the look-alike wins the quote; the static pool pays exactly its quote; at 10% swap-time fee the swap reverts at 0.5/1/5% slippage and executes at 10/20/30% losing 9.95%; at 30% it reverts up to 20% and loses 29.96% at 30%. The log prints these as percentages for the demo video. v4-core's `Deployers` is not used: its solmate `MockERC20` makes `EnsDeploy`'s `vm.deployCode("MockERC20.sol:MockERC20")` ambiguous and broke `RegistrationFlowTest.setUp`.
- AI-run verification: `forge test --match-contract QuoteDivergenceAttack -vv` 4/4 pass. `forge clean && forge build && forge test`: 9 suites, 38 passed, 0 failed. Found while checking: after `forge clean`, `forge test` alone fails 8 suites with `vm.deployCode: no matching artifact found`, because the ENS artifacts come from `script/EnsArtifacts.sol`, which `forge test` does not compile. The root and contract READMEs now run `forge build` before `forge test`. The README's Uniswap table points to the test.
- Correction to an earlier record: the design doc's table shows −9.94%; this test measures −9.95% (fee gap 9.95 points on a 1e18 trade in 1e24 liquidity). The doc was not edited.
- Human verification: Pending human verification (`forge build && forge test --match-contract QuoteDivergenceAttack -vv`).

## DEX4 — Explain why the larger quote is not the better trade

- Date / environment / tools: 2026-09-27 / Vite 8, Sepolia public RPC, headless Chromium screenshots / Claude Code (Opus 5.5)
- Human decisions/changes: In the review, the Swap tab read as "Klamp pays less" (196,119.71 vs 196,739.12 KHOOK), because the Sepolia look-alike is an honest hook; fix this without deploying an attack hook.
- AI work: `SwapPanel` shows a note under the route. Klamp off, best quote from an undeclared hook pool: the quote is not a promise; the swap can revert or pay the slippage minimum (live value). Klamp on with `requote_canonical`: how much output was given up versus the best quote and why. Both link to the ATK1 test (GitHub `main`, live after push). The calldata row is shown only with Klamp on (with it off nothing is judged, so "matches judged PoolKey" was misleading). The look-alike caption says the hook can quote one fee and charge another. dex README limits point to the test.
- AI-run verification: `pnpm build` passed. Screenshots of `dist` served locally, desktop and 390 px, with live KHOOK quotes: Klamp on shows "619.41 KHOOK (0.31%) below the best quote, on purpose"; Klamp off shows "This number is a quote, not a promise" with 186,902.16 KHOOK at 5% slippage and no calldata row. Wallet flows were not exercised (no browser wallet in the agent environment).
- Human verification: Pending human verification.

## WEB37 / DEX5 — Show the registry admin role that is still kept

- Date / environment / tools: 2026-09-27 / Sepolia public RPC, Next.js 15.5, Vite 8, headless Chromium screenshots / Claude Code (Opus 5.5)
- Human decisions/changes: A check of the team spec against dex found "only REGISTRAR is kept" is inaccurate; fix the display and wording.
- Findings (read-only, Sepolia): klamp.eth registry `roleCount(0)` has one holder each in the ROLE_REGISTRAR and ROLE_REGISTRAR_ADMIN slots and nothing else; the operator `0xFdE8…a9e1` holds both (`hasRoles`). This matches `Phase1Setup.KEPT_REG_ROLES` and `testKeptRegistrarCannotTouchTokens`, which runs with both roles. Both frontends counted only the REGISTRAR slot and left the admin slot out of the display.
- AI work: `SealStatus` / `Seal` gain `registryRegistrarAdmin` (live read of slot 128 in web `sepolia.ts` and dex `seal.ts`, 1 in the recorded snapshot). The web seal slide and the dex badge show `REGISTRAR ×1 + admin ×1 · for hooks.klamp.eth`; the dex panel note says two roles are left, both ours, and neither can replace tokens.klamp.eth. Root, web and dex READMEs say REGISTRAR and its admin. `docs/phase1-permissions.md` already said so. The team spec draft (`final_klamp_organized.md`, not tracked) was corrected in the same two places.
- AI-run verification: web `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`; dex `pnpm build`. Screenshots of the web seal slide and the dex seal panel show `REGISTRAR ×1 + admin ×1` from live reads at block 11787908.
- Human verification: Pending human verification.

## WEB38 — Keep the step title in sync with fast key presses

- Date / environment / tools: 2026-09-27 / Next.js 15.5, Motion 12, headless Chromium / Claude Code (Opus 5.5)
- Human decisions/changes: None; found while checking WEB37. Fixed because a presenter pressing → quickly while recording would hit it.
- Finding: pressing → as soon as each step finished left the step 3 title ("A naive router takes it") on screen at step 5, still stale after 5 s. The title's `AnimatePresence mode="wait"` exit was interrupted by the next key change.
- AI work: the title and line remount per step with a fade-in and no exit animation.
- AI-run verification: `pnpm lint`, `pnpm build`. Headless Chromium pressing → as soon as each step finished shows "Nobody can rewrite it" at step 5 and "Quoted fee = paid fee" at step 9, immediately and after 1 s and 5 s.
- Human verification: Pending human verification.
