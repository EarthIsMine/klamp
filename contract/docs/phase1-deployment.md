# Deployment and Verification Reproduction

Run all commands from `contract/`. A real public network deployment has not been performed yet. `deployments/sepolia.candidates.json` holds candidate addresses from the original text and the pinned ENS repository; it is not a verified manifest.

## Full Local Run

```sh
./scripts/setup-dependencies.sh
forge test
npm test
npm run typecheck
npm run test:e2e
```

The last command starts a fresh Anvil, deploys real ENSv2, v4, the registrar and an ERC20 probe, verifies pool initialization, registration, seal, viem lookup and permission eth_calls, then shuts down Anvil. Generated files are `deployments/local.json` and `deployments/local.verification.json`. The verification file includes public addresses, versions, observed code hashes, deployment block, transaction hashes, expiry and seal state. Local is an environment deployed from source and is not Sepolia evidence.

To keep using the demo, keep a local node running in a separate terminal.

```sh
anvil --silent --port 18545
# In another terminal, contract/:
export RPC_URL=http://127.0.0.1:18545
export OPERATOR=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
forge script script/LocalPhase1.s.sol:LocalPhase1 --rpc-url "$RPC_URL" --broadcast --unlocked --slow
npm run demo
```

Open http://127.0.0.1:4173 in a browser. ProbeToken is a real ERC20, and no liquidity is added to the initialized pool. Sending trades is not provided. The local public development account is for testing only.

## Sepolia Team Deployment (2026-09-26)

A team member deployed Phase 1 to the Sepolia **ENSv2 Beta set** and performed role revocation. Addresses are recorded in [`deployments/sepolia.phase1.json`](../deployments/sepolia.phase1.json) as values re-read from the chain.

- The UniversalResolver is `0x5d25c1d6…`. The design doc's `0x85edf8…` follows the earlier candidate set (ETH registry `0x67b728…`), where a `klamp.eth` created earlier by the same operator also remains. Only the Beta set is used for lookups.
- The deployed registrar is a version adapted to the Beta resolver API (name-based `setText(bytes name, …)`, per-key permissions). description and url are written through `setTokenText`, with the registrar checking the creator. In C14 this repository's `src/` was made identical to the Sourcify-verified source; in C16 its Korean comments were translated to English, so the code is identical but the comments (and therefore the metadata hash) differ. The 0.8.26 build output matches the deployed bytecode except for immutables and metadata. Setup and local tests also run on the same ENS commit (`f2f0a05`).
- Roles: `klamp.eth` and `tokens.klamp.eth` have 0 roles. Only the operator's REGISTRAR + admin remain on the klamp registry root (for hooks registration). In the role revocation transaction the token ID was reissued, so the explorer shows "transferred → 0x0", but it is not an ownership transfer or burn.
- explorer.ens.dev shows `klamp.eth` and `tokens.klamp.eth`, but wildcard token names (`0x….tokens.klamp.eth`) are Not found. It appears to display only registered labels; the records are readable with viem `getEnsText`.
- ENSv2 Sepolia may be reset periodically (explorer notice, most recently 2026-09-15). Secure a recording before the presentation.

Sepolia lookup demo (read-only):

```sh
PORT=4174 MANIFEST=deployments/sepolia.phase1.json RPC_URL=<sepolia RPC> npm run demo
```

## Sepolia Preparation and Dry-Run

1. Copy `.env.example` to the ignored `.env` and configure it. Use a Foundry keystore for signing and do not put private keys in the manifest. Generate a new registration secret locally and keep it the same between commit and register.
2. Copy the candidate JSON to `deployments/sepolia.private.json` and fill in the operator, verified tokenFactory/launchers (LiquidityLauncher v3.0.0 and v3.2.0 candidates) and the maximum registration fee. Cross-check each protocol address's runtime code hash against independently confirmed build or official deployment evidence, then put it in `expectedCodeHashes` by field name. Copying the value read from the current RPC as-is is not version verification. Also check immutables, proxy implementations and protocol roles.
3. Load the dotenv file into the command's execution environment. Keep the chain/address/operator settings in the JSON and env consistent. The root name is fixed as klamp.eth; on a conflict, do not silently switch to another name.
4. `npx tsx scripts/preflight.ts` performs read-only checks of the chain, code hashes, UniversalResolver/registry/StateView connections, registrar roles, name owner, registration price cap, balance, allowance and gas balance. It fails if any value is unfilled or unverified. If RPC, signing or code trust is not ready, do not mark public deployment preparation as complete here.
5. The following commands have no `--broadcast`, so they are simulations. If a step is not on-chain yet, the next step can only be reproduced after the preceding step is actually deployed.

```sh
forge script script/DeployPhase1.s.sol:DeployPhase1 --rpc-url "$RPC_URL"
forge script script/RegisterRoot.s.sol:RegisterRoot --rpc-url "$RPC_URL"
forge script script/ProbePhase1.s.sol:ProbePhase1 --rpc-url "$RPC_URL"
forge script script/SealPhase1.s.sol:SealPhase1 --rpc-url "$RPC_URL"
```

## Real Deployment Order and Resume

Add `--broadcast --slow --account <keystore-alias>` to the steps above only with a verified configuration and an allowed network and signing account. This was not run while writing this document. Check the sender and expected gas in each dry-run.

- Deploy: confirm the public registry/resolver/registrar addresses from the return value and receipt, and save them to REGISTRY/RESOLVER/REGISTRAR. When resuming, keep the original DEPLOYMENT_SALT and REGISTRAR. Existing proxies are reused after the factory verifies the implementation. If interrupted right after the registrar deployment, recover the address from the receipt.
- RegisterRoot: the first run only commits. Re-running after `readyAt` with the same configuration and secret approves only the exact price and performs register→setParent. Re-running while waiting writes nothing, an expired commitment is committed again, and if the same namespace is already registered there is no double payment. Ownership by someone else or a different linkage stops with an error.
- ProbePhase1: initializes a testnet-only ERC20/ETH pool and registers it with a real CREATE2 deployer. Preserve create2Launcher in `deployments/probe.json` as PROBE_LAUNCHER and token as PROBE_TOKEN. Re-runs use the same salt/launcher. The JSON is generated even in simulation, so do not use it as real deployment evidence before checking the receipt and code.
- Seal: seal after verifying a real ENS probe lookup and the expected permission state. If already sealed, skip the revocation writes. hooks management permissions remain separately.
- Smoke: after filling in the public manifest below, run `npx tsx scripts/deployment-smoke.ts`. The editor success and operator/overwrite failures are eth_calls, so no additional transactions are sent. The verification report is saved to SMOKE_OUTPUT.

For registration and renewal, check the price with the pinned ETHRegistrar's `getRegisterPrice`/`getRenewPrice`. The renewal ABI is `renew(string,uint64,IERC20,bytes32)`. Before klamp.eth expires, the person in charge must check the cost and duration and renew it. Automatic renewal is not in this implementation's scope.

## Public Manifest Fields

Write `deployments/sepolia.phase1.json` after the real deployment. Do not create a fake manifest with addresses that were never deployed. Use `deployments/local.json` and `versions.json` as structural references.

- chainId, rootRegistry, ethRegistry, registry, resolver, registryImplementation, resolverImplementation, universalResolver, registrar, stateView, poolManager, launcher, tokenFactory
- operator, editor (operator if omitted), token, poolId, create2Launcher, salt, initCodeHash
- independently verified expectedCodeHashes (one for each code address field above), deploymentBlock, publicTransactions (list of public tx hashes)

smoke reads this configuration, verifies text/data, permissions, seal and code, and records the actual observedCodeHashes, expiry, checkedBlock and versions in the report. A code hash match alone is not a claim of provider code safety or a completed audit. Whether the ENS app displays it, and whether a human read the SDK docs and ran it directly, are separate manual checks.
