# Uniswap Developer Feedback — Klamp (ETHGlobal Tokyo 2026)

## What we built with Uniswap

- Uniswap v4 PoolManager on Sepolia: a launchpad that initializes a hooked pool and adds single-sided liquidity in the launch tx, and an honest delta-fee hook (`afterSwap` + `afterSwapReturnDelta`).
- V4Quoter `quoteExactInputSingle` for quotes, Universal Router `execute` with `V4_SWAP` (`SWAP_EXACT_IN_SINGLE`, `SETTLE_ALL`, `TAKE_ALL`) for swaps, built and verified without the SDK.
- Uniswap's LiquidityLauncher / UERC20Factory graffiti to prove who launched a Pools.trade token.

## What worked well

- `graffiti` in UERC20Factory made issuer proof possible for Pools.trade tokens without any change to Pools.trade.
- LiquidityLauncher v3.0.0, v3.2.0 and UERC20Factory have the same bytecode on Sepolia and Robinhood Chain, so the same proof works on both.
- `extsload` on PoolManager made the "pool is initialized" check cheap and dependency-free.

## Friction

- `docs.uniswap.org/contracts/v4/deployments` redirects twice (to developers.uniswap.org, then to an `llms.mdx` path) before showing addresses.
- Encoding `V4_SWAP` for Universal Router by hand requires reading periphery source for action codes and `ExactInputSingleParams`; a short reference table in the docs would help.
- Hook address mining is required for every hook deployment; a documented canonical miner / CREATE2 deployer address per chain would save time.
- Quotes include hook fees only if the hook behaves the same during simulation and execution. There is no standard, on-chain way for a router to know whether a hooked pool is the one the token issuer intended — the gap Klamp fills.
