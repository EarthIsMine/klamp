# Uniswap Developer Feedback — Klamp (ETHGlobal Tokyo 2026)

Klamp lets a token's issuer declare its canonical Uniswap v4 pool once, records it in ENSv2, and lets routers requote around look-alike hook pools before the trader signs. Everything below comes from building and running it on Sepolia. Code pointers for each integration are in the README's [Where to look](README.md#where-to-look) section.

## What we built with Uniswap

- Uniswap v4 PoolManager on Sepolia: a launchpad that initializes a hooked pool and adds single-sided liquidity in the launch tx ([`DemoLaunchpad.sol`](contract/src/demo/DemoLaunchpad.sol#L102-L142)), and an honest delta-fee hook using `afterSwap` + `afterSwapReturnDelta` ([`DeltaFeeHook.sol`](contract/src/demo/DeltaFeeHook.sol#L32-L46)).
- V4Quoter `quoteExactInputSingle` for quotes, and Universal Router `execute` with `V4_SWAP` (`SWAP_EXACT_IN_SINGLE`, `SETTLE_ALL`, `TAKE_ALL`) for swaps, built and verified without the SDK ([`klamp-sdk.mjs`](contract/demo/sepolia/klamp-sdk.mjs#L83-L133)). The web demo decodes that calldata back to the PoolKey before trusting a swap ([`sepolia.ts`](web/src/data/protocol/sepolia.ts#L235-L248)).
- Uniswap's LiquidityLauncher / UERC20Factory graffiti to prove who launched a Pools.trade token ([`CanonicalPoolRegistrar.sol`](contract/src/CanonicalPoolRegistrar.sol#L120-L145)).

## What worked well

- `graffiti` in UERC20Factory made issuer proof possible for Pools.trade tokens without any change to Pools.trade.
- LiquidityLauncher v3.0.0, v3.2.0 and UERC20Factory have the same bytecode on Sepolia and Robinhood Chain, so the same proof works on both.
- `extsload` on PoolManager made the "pool is initialized" check cheap and dependency-free.

## Friction

- `docs.uniswap.org/contracts/v4/deployments` redirects twice (to developers.uniswap.org, then to an `llms.mdx` path) before showing addresses.
- Encoding `V4_SWAP` for Universal Router by hand requires reading periphery source for action codes and `ExactInputSingleParams`; a short reference table in the docs would help.
- Hook address mining is required for every hook deployment; a documented canonical miner / CREATE2 deployer address per chain would save time.
- V4Quoter's quote functions are not `view`, so a plain `readContract` / `eth_call` through a view ABI fails; they have to be simulated (`simulateContract`). A one-line note next to the V4Quoter address would help.
- A fee that a hook takes with `poolManager.take` inside `afterSwap` shows up in the receipt as an ordinary ERC-20 `Transfer` out of the PoolManager, indistinguishable from the swap output. In our Klamp-mode swap both transfers go to the same address, so we had to rely on amounts to tell them apart. A standard event for hook-taken amounts would let wallets and explorers show the real fee.
- There is no on-chain way to list the pools for a token; finding look-alike pools means indexing `Initialize` events on the PoolManager.
- Quotes include hook fees only if the hook behaves the same during simulation and execution. There is no standard, on-chain way for a router to know whether a hooked pool is the one the token issuer intended — the gap Klamp fills.

## Trading API

We did not use the Trading API. Klamp judges the exact PoolKey each hop uses, so we quote and build calldata directly against V4Quoter and Universal Router. To put Klamp behind the Trading API we would need to know whether `/quote` routes through hooked v4 pools, and whether its response exposes each v4 hop's full PoolKey (currencies, fee, tickSpacing, hooks) so a verifier can check the route before the user signs.
