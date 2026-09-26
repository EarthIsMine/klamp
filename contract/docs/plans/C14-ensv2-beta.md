# C14 — ENSv2 Beta Migration (Aligning the Repository with the Sepolia Deployment)

- Written: 2026-09-26, Claude Code (Opus 5.5)
- Human decision: take the Sepolia deployment's source as the repository baseline, re-pin the ENS dependency to Beta, align local tests and setup with Beta, and revert the event PoolKey change (requested in conversation).

## Changes

| Item | Before | After |
| --- | --- | --- |
| ENS dependency | contracts-v2 `48b3e2d` (2026-07-03) | `f2f0a05` (tag `sepolia-deployment-2026-09-15`). The official Sepolia address table (`contracts/deployments/sepolia/addresses.md`) matches the Beta set |
| registrar source | C12 design doc code + event PoolKey | The Sourcify-verified Sepolia `0x820bE7…` source as-is. Name-based resolver writes, `creatorOf` and `setTokenText`, `NotCreator` and `KeyNotAllowed` |
| resolver permissions | `authorizeTextRoles` (name × key), registrar root TEXT_ADMIN | 4 × `grantSetterRoles(setText/setData("", key, ""), registrar)`. 0 resolver root roles after the seal |
| Record reads | `resolver.text/data(node, key)` | `resolver.resolve(name, …)` or UniversalResolver |
| Compilation | Single 0.8.26 | The ENS implementation is `=0.8.25`, so it is compiled separately via `script/EnsArtifacts.sol` and deployed with `vm.deployCode` (`script/EnsDeploy.sol`). Our code imports only ENS interfaces. `src/**` is restricted to 0.8.26 |
| Local namer | Zero address | The Beta constructor rejects granting roles to the zero address, so a local-only non-zero address |

## Verification

`forge test`, `npm test`, `npm run typecheck`, `npm run test:e2e`, and a comparison of the repository registrar's 0.8.26 build against the Sepolia runtime bytecode (excluding immutables and metadata). Results in WORKLOG C14.

## Remaining

- A fresh deployment to Sepolia with the repository's setup scripts has never been done (written to reproduce the team deployment and verified only locally).
- Since the event has no PoolKey, indexers get the PoolKey from the `Initialize` event or the data record.
