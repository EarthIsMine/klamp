# Event Fallback Configuration

Only the TokenLaunched event of the [pinned InstantLaunchStrategy](https://github.com/Uniswap/liquidity-launcher/blob/1eda9f0c0243e2fdc0cbe0d665200ffa8c2ba53a/src/strategies/InstantLaunchStrategy.sol) is supported. The launcher's TokenCreated does not provide the pool key, so it is not used as a substitute.

Each entry in `FallbackConfig.sources` requires a verified strategy address, the deployed runtime code hash (including immutables), the launcher address and the deployment start block. Specify `confirmations >= 1`, `maxScanBlocks` and `chunkSize`. Because real public deployment addresses and code have not been verified, the default list is empty, and candidate addresses are never trusted automatically.

Only ENS `not_registered` is scanned. The only pool accepted from an event is the InstantLaunchStrategy shape `(ETH, token, 2500, 25, no hook)`. If ENS is `registered`, the event does not override it; if it differs from the launch pool, only `warning: launch-pool-differs` is attached. At a confirmed block, the namespace, the strategy's poolManager/launcher getters and the code hash are verified. Lookups are split into small ranges, and exceeding the maximum history range returns `lookup_failed`. The trusted emitter, target token, currency ordering and inclusion, match between the event PoolId and the PoolKey hash, the log block hash, and initialization state on the same PoolManager are checked. Removed logs are not used. Two conflicting pools yield `lookup_failed: multiple-launch-pools`, and the last log is never picked automatically.

The result source is launch-event, and nothing is written to ENS. The event input in the SDK tests is test data matched to the pinned ABI and does not replace verifying the strategy's emission and deployment on the real network.

## Robinhood Chain Measurements (2026-09-26, C12)

Checked read-only with the public RPC `https://rpc.mainnet.chain.robinhood.com` (chain ID 4663) and the Blockscout PRO API (chain_id=4663). Not yet added to the SDK default list.

| Item | Value |
| --- | --- |
| InstantLaunchStrategy v3.2.0 | `0x23f8209572b4a1C2AD88A42749E830791Fb027f1`, Blockscout verified source name InstantLaunchStrategy, event ABI same as the pinned source |
| runtime code hash | `0x29df27cf43533e9b3708dcd2a2c0fd17a1a8796407e7d39375f47e5c809cffca` (including immutables, head 72,99x,xxx at the time of checking) |
| Deployment block (fromBlock) | 28,519,960, deployer `0x32f4b2e69ebd7746596af8699dac1908f43107ad` (same deployer as LiquidityLauncher and UERC20Factory) |
| `launcher()` / `poolManager()` | `0x0000FffFBE8efE702c8703aE3477FF5dE3d319C0` / `0x8366a39CC670B4001A1121B8F6A443A643e40951` |
| Activity | 30,000+ TokenLaunched since deployment (counted up to the page limit), 249 in the last 2 million blocks |
| `0xAD44D55E7f8337C3cE113fBb591486E85be104b2` | Same version and deployer, 3,239 cumulative but 0 in the last 2 million blocks. The design doc's "0 recently" is correct, but it is not 0 cumulative |
| Real log PoolKey | Every sample is `(0x0, token, 2500(0x9c4), 25(0x19), no hook)` |

Classification of the graffiti owners of the last 30: 16 EOAs calling LiquidityLauncher directly (path B direct), 13 disposable contract creation transactions with no code (`recordByLiquidityLauncherVia` possible), and 1 intermediate contract whose code remains (63-byte revert-only runtime, `0x5cce771c…`; cannot be registered by any path). The ratio differs from the design doc's "10 of 12 disposable".
