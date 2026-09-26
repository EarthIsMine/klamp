# Phase 1 Dependency Baseline

Started from a repository with no existing implementation, lockfile or executed tests. There was no material to recover the original SHAs from, so an ENSv2 commit matching the spec date was selected and the real resolver ABI was verified by execution. Other Solidity dependencies follow the selected launcher's gitlinks.

| Dependency | Pinned SHA / version |
| --- | --- |
| ENSv2 | [f2f0a05e6c1711134b73204a1e37f8e6c1aea6ab](https://github.com/ensdomains/contracts-v2/tree/f2f0a05e6c1711134b73204a1e37f8e6c1aea6ab) (tag `sepolia-deployment-2026-09-15`, the official Sepolia ENSv2 Beta set. Re-pinned from `48b3e2d` in C14) |
| LiquidityLauncher | [1eda9f0c0243e2fdc0cbe0d665200ffa8c2ba53a](https://github.com/Uniswap/liquidity-launcher/tree/1eda9f0c0243e2fdc0cbe0d665200ffa8c2ba53a) |
| UERC20Factory | [46290a5447844016516b4b4530013da01b6ff801](https://github.com/Uniswap/uerc20-factory/tree/46290a5447844016516b4b4530013da01b6ff801) |
| v4-core | [59d3ecf53afa9264a16bba0e38f4c5d2231f80bc](https://github.com/Uniswap/v4-core/tree/59d3ecf53afa9264a16bba0e38f4c5d2231f80bc) |
| v4-periphery / StateView | [ad04c9f24a170accf5ea1b2836bbafd514537ca6](https://github.com/Uniswap/v4-periphery/tree/ad04c9f24a170accf5ea1b2836bbafd514537ca6) |
| viem | 2.56.9 (package-lock.json) |
| Solidity / EVM | 0.8.26 (`src/` pinned via `compilation_restrictions`, same as the Sepolia registrar) · ENSv2 implementation is 0.8.25 (`script/EnsArtifacts.sol`) / Cancun |
| Foundry runtime | 1.7.1, 4072e48705af9d93e3c0f6e29e93b5e9a40caed8 |
| Node / TypeScript | 24.14.1 / 5.9.3 |

## Confirmed Real ABIs and Constraints

- (C14, Beta `f2f0a05`) PermissionedResolver uses `initialize(Grant[],bytes[])`, name-based setters `setText(bytes name,string,string)` and `setData(bytes name,string,bytes)`, and per-key permissions `grantSetterRoles(bytes setter,address)`. There is no per-name delegation (`authorize*Roles`). Records are read only through `resolve(name, data)`. The implementation is `=0.8.25`, and the constructor rejects a zero-address namer.
- So for description and url, the registrar checks the creator with `creatorOf` and then writes on their behalf with `setTokenText`. The only permissions the registrar holds are the setter roles for the `pool` (text and data), `description` and `url` keys.
- UserRegistry uses `constructor(ILabelStore,address)`, `initialize(Grant[])` and `register(string,address,IRegistry,address,uint256,uint64)`. The VerifiableFactory `deployProxy` salt is a uint256.
- ETHRegistrar provides `makeCommitment(string,address,bytes32,IRegistry,address,uint64,bytes32)`, `commit(bytes32)`, `register(string,address,bytes32,IRegistry,address,uint64,IERC20,bytes32)` and `renew(string,uint64,IERC20,bytes32)`.
- UniversalResolverV2 takes the root registry, gateway provider and contract namer as constructor arguments and uses AbstractUniversalResolver's resolve path.
- The connection can be checked with the StateView `poolManager()` getter. `getSlot0(bytes32)` returns uint160,int24,uint24,uint24.
- LiquidityLauncher `getGraffiti(creator)` is keccak256(abi.encode(creator)). UERC20Factory uses name/symbol/decimals/caller/graffiti as the salt and computes the address with the real UERC20 creationCode. Neither implementation has a proxy upgrade entry point; the identity of real network addresses must be verified separately.
- `TokenLaunched(bytes32 indexed,address indexed,address indexed,(address,address,uint24,int24,address))` is emitted by the **InstantLaunchStrategy**, not the launcher. The strategy's immutable poolManager/launcher and trusted deployment address must be verified. The launcher's TokenCreated/TokenDistributed are not substituted for this event.
- All Sepolia addresses in the spec are candidates pending verification. Chain, code and deployed version verification has not been run yet.

## Reproduction

From `contract/`, run `./scripts/setup-dependencies.sh`, `forge test` and `npm run typecheck`. Installation initializes only the submodules the project imports. Solidity dependency SHAs are defined by the gitlinks, and JS by the lockfile.

Material actually read: from the pinned sources above, resolver/PermissionedResolver.sol, registry/UserRegistry.sol, registrar/ETHRegistrar.sol, registrar/AbstractETHRegistrar.sol, universalResolver/UniversalResolverV2.sol, LiquidityLauncher.sol, strategies/InstantLaunchStrategy.sol, factories/UERC20Factory.sol, lens/StateView.sol. SDK docs: https://viem.sh/docs/ens/actions/getEnsText (execution path verified during the SDK implementation step).
