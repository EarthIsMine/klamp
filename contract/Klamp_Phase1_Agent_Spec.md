# Klamp Phase 1 — Coding-Agent Implementation Spec

Written: 2026-09-25  
Basis: team shared document "Phase 1 design: launch and canonical pool records (ENSv2)"  
Goal: implement phase 1 starting from the existing code examples, in small diffs and independently verifiable commits.

## 0. Instructions for the agent

Modify the existing repository in the order of this document. First check AGENTS.md, the current branch and changes, and the existing contracts, tests, SDK and deployment scripts. Do not rewrite features that are already implemented; only verify their Done when conditions. Do not overwrite the user's uncommitted changes.

The original Solidity, setup and TypeScript code is included in the appendix. Keep its structure, names, record format and both registration paths, and apply only the minimal changes specified in the body. Body requirements take precedence over the original text in the appendix. The appendix is reference code, not finished code.

Each commit contains one purpose and its related tests only. Do not relocate whole folders, reformat in bulk, replace the toolchain, add unnecessary abstractions or bulk-upgrade dependencies. Prefer the existing repository structure over the file paths in the examples below. Only in an empty repository with no implementation, add Foundry and the minimal TypeScript setup needed to run the existing examples.

For each commit, report the reason for the change, the changed files, the verification run and its result, and remaining constraints. For items already done, do not create empty commits; record why they were skipped. The commit messages below are recommendations; the commit order and responsibility boundaries are what matter. Remote pushes and real network broadcasts follow the permission scope already granted by the repository and the user. Complete everything runnable without credentials: local implementation, integration tests and deployment dry-runs.

## 1. MVP policies fixed for this implementation

This section is this implementation's default decision for the parts left open in the original text. If the existing repository has conflicting confirmed requirements, do not silently overwrite them; record the difference.

| Item | Decision |
| --- | --- |
| Meaning of canonical pool | A pool designated by a verified deployer or by the creator of a supported launcher. Not a certification that it is the original launch pool or a safe pool |
| Target chain | One chain per deployment. Local and Sepolia first; cross-chain writes excluded |
| Pool identity | `(chainId, configured PoolManager, PoolId)`. Keep the text format as in the original text; PoolManager is fixed by deployment config |
| Registration timing | After token deployment and pool initialization. Same order even when called within the same launch transaction |
| Registration count | Once per token. Edits, deletion, versioning and pool migration are not implemented in this phase |
| Pre-registration checks | CREATE2 or LiquidityLauncher proof, token code exists, currency ordering and inclusion, pool initialized on the designated PoolManager |
| Name | Lowercase address including `0x` + `.tokens.klamp.eth`. The same name is used for reads and writes |
| Data | Keep `text("pool") = eip155:<chainId>:<poolId>` and `data("pool") = abi.encode(chainId, PoolKey)` |
| Metadata permission | Only description and url are granted to the designated editor. No pool edit permission is granted |
| Missing | Not judged malicious. Canonical pool unconfirmed |
| Lookup failure | A state separate from missing. Event fallback is not run |
| Demo policy | In canonical pool verification mode, only verified matching routes may proceed. This is a trading client policy, not a global blocking feature |
| Event fallback | Limited to verified TokenLaunched logs of supported launchers/strategies. Used only when ENS is genuinely missing, and its source is shown separately |
| Extension | The hooks namespace is reserved before the permission seal. CappedHookProxy and fee cap logic are not implemented |

Not guaranteed: prevention of impersonating tokens, deployer honesty, hook safety, liquidity, profitability, MEV protection, automatic adoption by all routers, permanent existence of the parent ENS name.

## 2. Structure to keep and minimal changes

### Keep

- A single `CanonicalPoolRegistrar` calls the shared `_record` from both registration paths.
- Keep the field order of `PoolKey` and `keccak256(abi.encode(key))`.
- Keep `canonicalPoolOf`, `tokensNode`, `tokensName`, `isLiquidityLauncher`, `uerc20Factory` and the existing events.
- Use the standard `UserRegistry` and `PermissionedResolver` implementations and `VerifiableFactory`.
- Use a single tokens label and wildcard resolution; do not register an ENS name per token.
- SDK record reads use viem `getEnsText`. Do not make a dedicated registrar lookup ABI mandatory.
- `_hex`, `_dec` and `_namehash` keep their behavior on valid input. Do not replace the helpers wholesale.

### Required changes

1. Verify actual token and pool state before registration.
2. Add an overload to the CREATE2 path for designating a metadata editor.
3. Minimize setup permissions and add hooks reservation and seal verification.
4. Make the SDK's value validation, result states, fallback and route comparison explicit.
5. Leave verification evidence for real ENS integration and network setup.

Keep the original text's "compiles as a single file without external libraries" form where possible. The required StateView interface may be minimally declared in the same file. Tests and scripts import the real dependency implementations. Do not guess ABIs; confirm them at the pinned version.

## 3. Per-commit execution plan

| Order | Recommended commit message | Single goal | Depends on |
| --- | --- | --- | --- |
| C01 | `chore: pin phase1 contract and sdk dependencies` | Pin version differences between the original text and the runtime environment | None |
| C02 | `feat: add baseline canonical pool registrar` | Reproduce the original registration flow | C01 |
| C03 | `fix: validate deployed tokens and initialized pools` | Prevent invalid permanent registrations | C02 |
| C04 | `fix: delegate metadata editing to explicit recipients` | Separate deployer and editor | C02 |
| C05 | `feat: configure least-privilege ens namespaces` | tokens/hooks setup and seal | C03, C04 |
| C06 | `test: verify canonical registration through ens resolution` | Verify the real ENS path and permissions | C05 |
| C07 | `feat: add validated canonical pool resolution` | Standard ENS lookup with strict state handling | C06 |
| C08 | `feat: add verified launch event fallback` | Limited event-based fallback lookup | C07 |
| C09 | `feat: compare swap routes with canonical pools` | Route verdict and minimal demo display | C07, C08 |
| C10 | `feat: add reproducible sepolia deployment checks` | Deployable scripts and smoke test | C06, C09 |
| C11 | `docs: record phase1 guarantees and verification evidence` | Handoff docs consistent with the implementation | C10 |

Each commit includes its related tests, and the build must pass at that point. C06 is not a stage for deferring earlier commits' tests; it is the integration verification stage that ties all real dependencies together.

### C01 — Pin dependencies and baseline

Expected files: existing `foundry.toml`, dependency lock/submodule config, `package.json` and lockfile, `docs/phase1-dependencies.md`.

- The original text's `contracts-v2 2026-07-03` is a date, not an exact SHA. First recover the actual SHA from existing tests/repository. If it cannot be identified, say so and pin one compatible SHA.
- Record the versions of ENSv2, v4-core, v4-periphery/StateView, UERC20Factory, LiquidityLauncher and viem. Prefer reproducing the original text's versions; do not move everything to the latest versions.
- Confirm the ABIs for `authorizeTextRoles`, `authorizeDataRoles`, `authorizeNameRoles`, resolver initialization, UserRegistry registration, ETHRegistrar registration/renewal, and UniversalResolver.
- Confirm that LiquidityLauncher's graffiti and UERC20Factory's address computation match the original text. Also record whether the allowed launchers are upgradeable.
- The original text's Sepolia addresses are candidate values. Do not label them as verified deployments before confirming chain, code existence, implementation version and protocol role.

Done when: there is a baseline result for existing tests and a pinned-version table, and later commits are reproducible in the same environment. Do not invent selector/role bits to work around ENS library version mismatches.

### C02 — Reproduce the original registrar

Expected files: `src/CanonicalPoolRegistrar.sol`, `test/CanonicalPoolRegistrar.t.sol`, minimal fixtures as needed.

- Compare the appendix Solidity against the existing implementation and add only what is missing.
- The CREATE2 path is called by a fixture contract that actually executes CREATE2. Do not pass it with tests that merely pose an arbitrary EOA as the deployer.
- Verify the LiquidityLauncher path with tokens compatible with the pinned real UERC20Factory. Include a fixture or a real launcher integration test that also proves the launcher's graffiti generation rule.
- `isLiquidityLauncher` is set only in the constructor; do not add admin functions to change it.
- A small custom error may be added so that path B fails explicitly when the factory address is 0.

Done when: the original text's five scenarios (normal record, non-deployer rejected, overwrite rejected, launcher path, token-not-in-pool rejected) are reproduced. Do not report undeployed token/pool validation as done at this stage.

### C03 — Real token and pool validation

Expected files: registrar, its tests, constructor-calling fixtures.

- Add a trusted StateView to the constructor as immutable. Update only the constructor calls in existing deployment scripts and fixtures.
- Verify that StateView is connected to the expected PoolManager using the real version's getter or deployment evidence. Do not trust it merely because the address has code.
- The registered token must satisfy `token != address(0)` and `token.code.length > 0`. The 0 address for currency0 represents native ETH and is allowed.
- Check currency0 < currency1, token inclusion, and `sqrtPriceX96 != 0` for the PoolId on the same PoolManager.
- Use a lookup of the real initialized v4 pool as the basis of validation. Do not duplicate all fee, tickSpacing and hook rules in the registrar.
- On validation failure, no mapping, text/data, permission or event may remain. A resolver write failure must also revert the whole transaction.

Example of where to insert (confirm the interface against the pinned real ABI):

```solidity
interface IStateView {
    function getSlot0(bytes32 poolId) external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint24 protocolFee,
        uint24 lpFee
    );
}

// Run in _record before storing
if (token == address(0) || token.code.length == 0) revert TokenNotDeployed();
if (key.currency0 >= key.currency1) revert InvalidCurrencyOrder();
if (key.currency0 != token && key.currency1 != token) revert TokenNotInPool();
if (canonicalPoolOf[token] != bytes32(0)) revert AlreadyRecorded();
bytes32 poolId = keccak256(abi.encode(key));
(uint160 sqrtPriceX96,,,) = stateView.getSlot0(poolId);
if (sqrtPriceX96 == 0) revert PoolNotInitialized();
// Then keep the original mapping → text → data → permission → event flow
```

Done when: undeployed addresses, reversed/identical currencies and uninitialized pools fail, and a real initialized pool succeeds. State in tests and docs the policy that a pool that is initialized but has no liquidity can be registered. Liquidity checks are the quoting stage's responsibility.

### C04 — Separate the metadata editor

Expected files: registrar, edit-permission tests, path A calling fixture.

Keep the existing 4-argument entry point and only add an overload.

```solidity
function recordByCreate2(
    address token, PoolKey calldata key, bytes32 salt, bytes32 initCodeHash
) external; // existing: editor = msg.sender

function recordByCreate2(
    address token, PoolKey calldata key, bytes32 salt,
    bytes32 initCodeHash, address metadataEditor
) external; // new: the proving party is still msg.sender

// Direction of change for the shared record function
function _record(address token, PoolKey calldata key, address metadataEditor) internal;
```

- The proof logic may be factored into a small internal function, but do not refactor the whole permission scheme.
- The new path rejects the 0 address as editor. Launcher path B keeps editor = msg.sender.
- Give the editor only description and url. Do not give pool text/data or admin permissions.
- Keep the ABI of the existing `CanonicalRecorded`. Document that the last argument is the direct CREATE2 executor in A and the verified creator in B. If needed, add one `MetadataEditorAssigned(token, editor)` event.
- The existing 4-argument path A function is compatibility behavior in which the edit permission goes to the calling contract itself. The real launchpad demo uses the 5-argument function.

Done when: the designated editor can edit its own token's description and url but cannot edit the pool or other tokens' metadata. Designating an editor does not transfer the registration permission.

### C05 — ENS setup, hooks reservation, permission seal

Expected files: `script/DeployPhase1.s.sol`, `script/SealPhase1.s.sol`, permission tests, deployment config.

- Keep the original text's order of UserRegistry/PermissionedResolver deployment and tokens label registration.
- The registrar holds pool text/data write permission for all names.
- For description/url delegation, where possible grant only two TEXT_ADMIN permissions scoped to each key across all names. Use the real API's resource computation and grant functions.
- If such per-key admin is not supported at the pinned version, the original text's root TEXT_ADMIN may be kept. In that case, record the residual trust assumption that the contract code fixes delegation to the two keys, along with tests. Do not add unrelated setters.
- The tokens label must have its resolver/subregistry change permissions removed, including the admin path that could re-grant them. Do not treat the seal as successful just by looking at the owner value or roleBitmap=0.
- Register the `hooks` label before revoking the registrar's permissions. Grant a designated hooks-only admin the roles needed for future resolver/subregistry settings and their corresponding admin roles. That admin must not be able to change tokens or the klamp parent link.
- Because roles remain on hooks, do not write "all admin roles are gone after setup". The accurate claim: the tokens record path is sealed and the separate hooks extension permission remains.
- Check the effective re-grant paths, including the upgrade roles and corresponding admin roles of the registrar and resolver/registry proxies. Do not claim the ENS protocol's own higher-level permissions were removed.
- Document how expiry, renewal and re-registration of the root klamp.eth relate to the lookup path.
- In a new deployment, seal only after confirming the namespace and a successful round-trip lookup. The Seal script distinguishes a wrong network from an already sealed state and does not perform unnecessary writes when rerun.

Done when: the project operator cannot replace the tokens resolver, edit pool directly, or grant permissions bypassing the registrar. The hooks admin can configure hooks but cannot affect tokens. Proven by concrete allowed/rejected call tests.

### C06 — Real ENS integration tests

Expected files: `test/CanonicalPoolEnsIntegration.t.sol` and existing integration fixtures.

- Use the real pinned versions of the registry, PermissionedResolver, UniversalResolverV2 and v4 PoolManager/StateView.
- Verify the flow deploy → token issuance → pool initialization → registration → wildcard lookup → text/data comparison.
- Verify that the parent tokens resolver responds even though token labels are not registered individually.
- The PoolId in text, the hash of the PoolKey decoded from data, and chainId must match.
- Use the real UniversalResolver path, not a registrar lookup. Do not claim real viem execution is done just because `resolveWithGateways` was called from Solidity. viem calls are done separately in C07.
- Verify that when the resolver's second write or permission delegation fails, canonicalPoolOf and the first record write are also rolled back.
- Verify that new token registration through both registration paths still works after the permission seal.

Done when: permission, wildcard and ABI issues that a mock resolver alone would not reveal are verified on the real implementation. Replace claims that the original tests pass with new execution logs.

### C07 — SDK standard lookup and validation

Expected files: the existing SDK's `canonicalPool.ts`, network config, its tests.

- Keep the original text's `createPublicClient`, `normalize`, `getEnsText` flow.
- The root defaults to klamp.eth; the token label is normalized to lowercase.
- The resolver address is managed in environment config. Whether to use an explicit address follows the pinned viem/ENS deployment version and real integration results.
- Handle chainId as bigint and poolId as validated 32-byte hex. A TypeScript `as Hex` alone does not replace validation.
- Only a valid empty record and a clear name/record absence are missing. RPC failures, resolution errors and unknown reverts are unavailable.
- Run an init/smoke check that the ENS name path and resolver match the deployment manifest. If namespace expiry or replacement is detected for a previously protected target, do not fall back to missing; treat it as unavailable/namespace error.
- The read chainId must match the target chain, and pool initialization is rechecked on the configured StateView.

Recommended result shape:

```ts
type CanonicalPoolResult =
  | { status: 'found'; source: 'ens' | 'launch-event';
      chainId: bigint; poolManager: Address; poolId: Hex }
  | { status: 'missing' }
  | { status: 'invalid'; reason: 'format' | 'chain' | 'pool-uninitialized' }
  | { status: 'unavailable'; reason: 'rpc' | 'resolution' | 'namespace' }
  | { status: 'ambiguous'; reason: 'multiple-launch-pools' };

function parsePoolRecord(value: string) {
  const match = /^eip155:([1-9][0-9]*):(0x[0-9a-fA-F]{64})$/.exec(value);
  if (!match) return null;
  return { chainId: BigInt(match[1]), poolId: match[2].toLowerCase() as Hex };
}
```

If existing callers depend on `getCanonicalPool(): value | null`, add a detailed function and the type above internally, and have the existing function convert only missing to null. invalid/unavailable/ambiguous remain typed errors. New callers use the detailed function. Avoid unnecessary changes to all existing callers.

Done when: normal, empty value, malformed, other chain, uninitialized and RPC error are distinguished, and real viem getEnsText reads records from a local ENSv2 deployment.

### C08 — Verified event fallback

Expected files: the SDK's `launchEventFallback.ts`, per-chain emitter config, its tests.

- Run only when the ENS result is missing. Do not override found/invalid/unavailable with events.
- Confirm the exact ABI of `TokenLaunched`, the real emitting contract (launcher or strategy) and the token/PoolKey field positions from the sources pinned in C01. Do not invent event fields.
- Configure supported chains, trusted emitters and the search start block. Do not accept arbitrary events that merely share the topic string.
- Verify on the found key: token inclusion, PoolId computation, correct PoolManager, initialization state. If the log does not provide the needed key/identity information, supplement with a documented real state lookup. If it cannot be proven, leave it unsupported.
- Return multiple distinct candidates as ambiguous. Do not blindly pick the last log. Do not accept reorged/removed logs; apply the configured confirmation-block threshold.
- The fallback result has source=launch-event and is not automatically registered in ENS. Do not introduce a new indexer or DB; start with a bounded eth_getLogs range.

Done when: only trustworthy valid logs produce a fallback, and fake emitters, other tokens, conflicting candidates and lookup errors are not treated as success. If a supported ABI cannot be obtained, leave the adapter disabled, record the reason and continue with the remaining work.

### C09 — Route verdict and minimal demo wiring

Expected files: SDK route comparison function, the relevant panel and callers in the existing demo screen, policy tests.

- Compare chainId, PoolManager and PoolId for each hop of the route. Do not compare PoolId alone.
- The verification target is the launch token selected by the user and the hops that directly include that token. Do not force a canonical pool on every hop of common assets like ETH/USDC.
- In split routes, check every branch/hop that includes the protected token. If any one is a different pool, it is a mismatch. Invalid input with no target hop is not treated as success either.
- Comparing the ENS value with the pool info claimed by an external quote does not by itself guarantee the pool actually executed by the calldata. Confirm that the existing quote builder constructs execution calldata from the same route object. Opaque external calldata is outside the scope of "route verified".
- Do not build a new on-chain enforcement guard in this phase. Do not say that UI blocking prevents direct contract calls.

| Input state | Display | Canonical pool verification mode |
| --- | --- | --- |
| found + match | Canonical pool match / ENS or event source | Proceed after existing quote, slippage and other checks |
| found + mismatch | Differs from designated canonical pool | Blocked |
| missing | No canonical pool record | Blocked |
| invalid / ambiguous | Cannot verify, with reason | Blocked |
| unavailable | Lookup failure, retryable | Blocked; do not display as missing |

- This blocking policy applies only to that mode. Do not change the existing general trading mode wholesale.
- The screen only adds token address, ENS name, source, canonical PoolId, candidate PoolId and verdict to the existing UI. No new design system or full frontend rewrite.
- If there is no demo yet, build a minimal screen with only these values and lookup/compare buttons. The lookup and verdict demo works without sending real trades.

Done when: the valid canonical pool and a different pool of the same token are distinguished on the same screen, and missing and RPC failure are shown as different states. Do not attach "safe pool" or "confirmed malicious" badges.

### C10 — Sepolia deployment and smoke test

Expected files: deploy, seal and verification scripts, `.env.example`, `deployments/sepolia.phase1.json` or the existing manifest format.

- Implement the original text's registration order commit → wait → register → setParent with the real pinned-version ABI. Handle MockUSDC balance/allowance, price lookup and commitment timing conditions per the real API.
- Support rerunning between steps. If klamp.eth is already registered by someone else, do not hide it by silently using a different root. Complete local verification and report the name conflict.
- Before deployment, check chainId, protocol addresses, code, wallet, roles and funding conditions. Do not leave private keys or RPC secrets in the manifest or logs.
- Record roots/registries/resolvers/registrar/StateView/PoolManager/launcher list/implementation versions/deployment block/public transaction hashes/expiry/seal state.
- Confirm the ENS version matches the candidate protocol addresses. If the local test implementation differs from the network implementation, do not hide the difference.
- On the real network, register one token with an initialized pool and verify the viem round-trip lookup, editor permission, overwrite rejection, and rejection of operator writes after the seal. Perform revert checks with eth_call where possible.
- Whether the ENS app displays the name is a separate manual smoke item. Do not claim app UI support is confirmed because getEnsText succeeded. Do not improvise changes to the address label because of an app display failure.

Done when: with credentials, leave real deployment evidence within the permitted scope. Without them, complete local E2E, dry-run-capable scripts and exact run instructions, and mark Sepolia as not run. Do not leave the local implementation incomplete because of network waits.

### C11 — Docs and handoff

Expected files: relevant sections of the existing README/design docs, `docs/phase1-verification.md`.

- Align the canonical pool definition, the role of integrating clients, the different-pool vs malicious distinction, and the initialization vs liquidity distinction with the real implementation.
- Reflect that the contract's own mapping also stays on-chain. ENS's value lies in standard lookup, the namespace and shareable records.
- State that wildcard skips per-token name registration but resolver record writes still cost gas.
- Explain immutability separately for the mapping, record write permissions, the name's lookup path, and parent expiry.
- State: immutable after one registration, single chain, fixed PoolManager, only supported factories/launchers, hooks roles remain.
- Fee caps, attack losses, hook classification and market share are not part of this phase 1 verification result.
- Mark each verification item as one of `Local pass / Sepolia pass / Manual check / Not run / Blocked`. Link the run commands, pinned versions and evidence locations.

Done when: a new team member can reproduce the local demo and identify unverified items from the docs alone. Do not arbitrarily label anything "audited", "global protection" or "permanent guarantee".

## 4. Overall completion checklist

- [ ] The existing example structure and both registration paths are kept.
- [ ] Only the actual CREATE2 executor passes path A verification.
- [ ] Path B's factory, launcher and graffiti versions are pinned.
- [ ] Undeployed tokens, invalid currencies and uninitialized pools are not registered.
- [ ] A recorded token's PoolId cannot be overwritten.
- [ ] All state rolls back on resolver errors.
- [ ] description/url edit permission goes only to the intended editor.
- [ ] Real UniversalResolver/viem lookup works without per-token ENS registration.
- [ ] chainId, PoolId and PoolKey match between text and data.
- [ ] The tokens seal and hooks future-configuration permission are separated.
- [ ] Lookup failure, missing, mismatch, invalid and ambiguous are distinguished.
- [ ] Event fallback source, scope and conflict policy are verified.
- [ ] Route comparison covers chain, PoolManager, PoolId and split routes.
- [ ] Whether Sepolia was really deployed and whether the ENS app UI was checked are recorded separately.

## 5. Final report format

```text
Completed commits: SHA / title / key changes
Skipped commits: evidence already satisfied
Verification: commands run / results / environment
Diff vs original text: APIs added or changed and why
Deployment: local / Sepolia status, public addresses and manifest
Incomplete: specific cause, inputs needed to finish, resume command
Remaining constraints: what this phase does not guarantee
```

## 6. References

The code, addresses and verification claims in the original text are provided material, not results of recompiling or deploying to a network while writing this spec. The implementing agent confirms them in C01 and subsequent tests.

- ENSv2 app integration: https://docs.ens.domains/ensv2/tutorial-app-developers/
- ENSv2 permissions: https://docs.ens.domains/ensv2/enhanced-access-control/
- ENSv2 repository: https://github.com/ensdomains/contracts-v2
- LiquidityLauncher source: https://github.com/Uniswap/liquidity-launcher/blob/main/src/LiquidityLauncher.sol

The main-branch links are starting points for exploration. Record permalinks of the actually used commit SHAs in the implementation results.

## Appendix A. Original reference code

The code below is reference code copied verbatim from the provided document. Apply C03/C04's constructor, overload and validation changes and C05's setup changes. It is not an instruction to deploy the original code as-is.

### A1. Original Solidity

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @dev Uniswap v4 PoolKey. Same ABI as v4-core's PoolKey (Currency, IHooks = address).
struct PoolKey {
    address currency0; // 0x0 = ETH
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

/// @dev Only the ENSv2 PermissionedResolver functions we use.
interface IPermissionedResolver {
    function setText(bytes32 node, string calldata key, string calldata value) external;
    function setData(bytes32 node, string calldata key, bytes calldata value) external;
    function authorizeTextRoles(bytes calldata name, string calldata key, address account, bool grant)
        external
        returns (bool);
}

/// @dev Uniswap UERC20Factory. Token address = CREATE2(salt = keccak256(name, symbol, decimals, creator, graffiti)).
interface IUERC20Factory {
    function getUERC20Address(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address creator,
        bytes32 graffiti
    ) external view returns (address);
}

interface IERC20Metadata {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

/// @title CanonicalPoolRegistrar
/// @notice Only the party that created a token can record that token's canonical pool in ENS, once.
///         Record location: text("pool"), data("pool") of <tokenAddress>.tokens.klamp.eth
contract CanonicalPoolRegistrar {
    IPermissionedResolver public immutable resolver; // resolver of tokens.klamp.eth
    bytes32 public immutable tokensNode; // namehash("tokens.klamp.eth")
    bytes public tokensName; // DNS-encoded "tokens.klamp.eth"
    IUERC20Factory public immutable uerc20Factory; // 0x0 disables path B
    mapping(address => bool) public isLiquidityLauncher; // fixed at deployment, immutable afterwards

    mapping(address token => bytes32 poolId) public canonicalPoolOf;

    event CanonicalRecorded(address indexed token, bytes32 indexed poolId, address indexed deployer);

    error NotDeployer();
    error TokenNotInPool();
    error AlreadyRecorded();

    constructor(
        IPermissionedResolver resolver_,
        bytes memory tokensName_,
        IUERC20Factory uerc20Factory_,
        address[] memory liquidityLaunchers
    ) {
        resolver = resolver_;
        tokensName = tokensName_;
        tokensNode = _namehash(tokensName_, 0);
        uerc20Factory = uerc20Factory_;
        for (uint256 i; i < liquidityLaunchers.length; i++) {
            isLiquidityLauncher[liquidityLaunchers[i]] = true;
        }
    }

    /// @notice Path A: called within the launch transaction by the contract (launchpad) that deployed the token via CREATE2.
    function recordByCreate2(address token, PoolKey calldata key, bytes32 salt, bytes32 initCodeHash)
        external
    {
        address predicted = address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), msg.sender, salt, initCodeHash))))
        );
        if (predicted != token) revert NotDeployer();
        _record(token, key);
    }

    /// @notice Path B: called directly after launch by the creator of a token made with Uniswap LiquidityLauncher (Pools.trade).
    /// @dev LiquidityLauncher creates the token with graffiti = keccak256(abi.encode(original caller)).
    function recordByLiquidityLauncher(address token, PoolKey calldata key, address launcher) external {
        if (!isLiquidityLauncher[launcher]) revert NotDeployer();
        IERC20Metadata t = IERC20Metadata(token);
        address predicted = uerc20Factory.getUERC20Address(
            t.name(), t.symbol(), t.decimals(), launcher, keccak256(abi.encode(msg.sender))
        );
        if (predicted != token) revert NotDeployer();
        _record(token, key);
    }

    function _record(address token, PoolKey calldata key) internal {
        if (key.currency0 != token && key.currency1 != token) revert TokenNotInPool();
        if (canonicalPoolOf[token] != bytes32(0)) revert AlreadyRecorded();

        bytes32 poolId = keccak256(abi.encode(key)); // same value as v4 PoolIdLibrary
        canonicalPoolOf[token] = poolId;

        string memory label = _hex(abi.encodePacked(token)); // "0x" + 40 lowercase chars
        bytes32 node = keccak256(abi.encodePacked(tokensNode, keccak256(bytes(label))));
        bytes memory name = abi.encodePacked(uint8(bytes(label).length), label, tokensName);

        resolver.setText(
            node, "pool", string.concat("eip155:", _dec(block.chainid), ":", _hex(abi.encodePacked(poolId)))
        );
        resolver.setData(node, "pool", abi.encode(block.chainid, key));
        resolver.authorizeTextRoles(name, "description", msg.sender, true);
        resolver.authorizeTextRoles(name, "url", msg.sender, true);

        emit CanonicalRecorded(token, poolId, msg.sender);
    }

    // ---------- utils ----------

    function _namehash(bytes memory dns, uint256 offset) internal pure returns (bytes32) {
        uint256 len = uint8(dns[offset]);
        if (len == 0) return bytes32(0);
        bytes memory label = new bytes(len);
        for (uint256 i; i < len; i++) {
            label[i] = dns[offset + 1 + i];
        }
        return keccak256(abi.encodePacked(_namehash(dns, offset + 1 + len), keccak256(label)));
    }

    function _hex(bytes memory b) internal pure returns (string memory) {
        bytes16 digits = "0123456789abcdef";
        bytes memory s = new bytes(2 + b.length * 2);
        s[0] = "0";
        s[1] = "x";
        for (uint256 i; i < b.length; i++) {
            s[2 + i * 2] = digits[uint8(b[i]) >> 4];
            s[3 + i * 2] = digits[uint8(b[i]) & 0x0f];
        }
        return string(s);
    }

    function _dec(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 n;
        for (uint256 t = v; t != 0; t /= 10) n++;
        bytes memory s = new bytes(n);
        for (; v != 0; v /= 10) s[--n] = bytes1(uint8(48 + (v % 10)));
        return string(s);
    }
}
```

### A2. Original setup

```solidity
// Setup script (me = our deployer account). Steps 1, 3, 4 and the first two lines of 5 match the local test setUp
uint256 REG_ROLES = ROLE_REGISTRAR | ROLE_REGISTRAR_ADMIN | ROLE_SET_PARENT | ROLE_SET_PARENT_ADMIN;
uint256 RES_ROLES = ROLE_SET_TEXT_ADMIN | ROLE_SET_DATA_ADMIN;
bytes memory ANY = NameCoder.encode("");   // "any name" (namehash 0)

// 1. Deploy our registry and resolver using the ENS standard implementations
//    To revoke later we must also receive the _ADMIN roles (revoking also requires ADMIN)
UserRegistry reg = UserRegistry(VERIFIABLE_FACTORY.deployProxy(
    USER_REGISTRY_IMPL, salt1, abi.encodeCall(UserRegistry.initialize, (me, REG_ROLES))));
PermissionedResolver res = PermissionedResolver(VERIFIABLE_FACTORY.deployProxy(
    PERMISSIONED_RESOLVER_IMPL, salt2,
    abi.encodeCall(PermissionedResolver.initialize, (me, RES_ROLES, new bytes[](0)))));

// 2. Register klamp.eth, setting our registry as the subregistry directly (commit, wait → register)
ETH_REGISTRAR.commit(ETH_REGISTRAR.makeCommitment("klamp", me, secret, reg, address(0), 365 days, bytes32(0)));
ETH_REGISTRAR.register("klamp", me, secret, reg, address(0), 365 days, MOCK_USDC, bytes32(0));
reg.setParent(ETH_REGISTRY, "klamp");

// 3. tokens label: set resolver, roles 0, maximum expiry
reg.register("tokens", me, IRegistry(address(0)), address(res), 0, type(uint64).max);

// 4. Deploy the registrar and grant permissions
CanonicalPoolRegistrar registrar = new CanonicalPoolRegistrar(
    res, NameCoder.encode("tokens.klamp.eth"), UERC20_FACTORY, launchers);
res.authorizeTextRoles(ANY, "pool", address(registrar), true);            // text(pool) of all names
res.authorizeDataRoles(ANY, "pool", address(registrar), true);            // data(pool) of all names
res.authorizeNameRoles(ANY, ROLE_SET_TEXT_ADMIN, address(registrar), true); // for description/url delegation

// 5. Revoke all of our permissions
res.authorizeNameRoles(ANY, RES_ROLES, me, false);
reg.revokeRootRoles(REG_ROLES, me);
ETH_REGISTRY.revokeRoles(rootTokenId, ROLE_SET_SUBREGISTRY | ROLE_SET_SUBREGISTRY_ADMIN
    | ROLE_SET_RESOLVER | ROLE_SET_RESOLVER_ADMIN, me);                   // seal replacement of klamp.eth's subregistry
```

### A3. Original TypeScript

```ts
import { createPublicClient, http, type Address, type Hex } from 'viem'
import { sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'

const client = createPublicClient({ chain: sepolia, transport: http() })
const UNIVERSAL_RESOLVER_V2 = '0x85edf8b6b7d4211e2b07aa687506b746357b92cf'

/** The token's canonical pool. null if there is no record */
export async function getCanonicalPool(token: Address, root = 'klamp.eth') {
  const value = await client.getEnsText({
    name: normalize(`${token.toLowerCase()}.tokens.${root}`),
    key: 'pool',
    universalResolverAddress: UNIVERSAL_RESOLVER_V2,
  })
  if (!value) return null
  const [, chainId, poolId] = value.split(':') // eip155:<chainId>:<poolId>
  return { chainId: Number(chainId), poolId: poolId as Hex }
}
```

### A4. Original Sepolia addresses — unverified candidates

| Contract | Address in original text |
| --- | --- |
| ENSv2 ETHRegistrar | `0xa4449a0dd2b83007553d9b1d28b583a46a805a30` |
| ENSv2 ETHRegistry | `0x67b728a792e789a8978b30cf1b3b641f19354b43` |
| VerifiableFactory | `0x118bc31a50d559f7015a8da26d54b3b030cdb70f` |
| UserRegistry implementation | `0x840fa461059862ea466a711e8c98c8de732061c0` |
| PermissionedResolver implementation | `0x7e4b2d59938930168024201752ee5503df402303` |
| UniversalResolverV2 | `0x85edf8b6b7d4211e2b07aa687506b746357b92cf` |
| MockUSDC (registration fee payment) | `0xd3322b29a7bdee707d1684676f149bf41aa3422f` |
| Uniswap v4 PoolManager | `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543` |
| Uniswap v4 StateView | `0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c` |
