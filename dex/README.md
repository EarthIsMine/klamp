# Klamp DEX (Sepolia)

A small working DEX on Sepolia that shows Klamp as if a launchpad and a router had already integrated it. Every action is a real transaction from your wallet against contracts that are already deployed: nothing is mocked and nothing is redeployed.

| Tab | Role | What happens on chain |
|---|---|---|
| Launch | issuer | `DemoLaunchpad.launch(name, symbol)`: one tx deploys the token with CREATE2, initializes its ETH pool with the 1% `DeltaFeeHook`, locks the whole supply as liquidity and declares the pool through `CanonicalPoolRegistrar.recordByCreate2`. The app then reads `<token>.tokens.klamp.eth` back through ENSv2. The launcher is the creator and can set the ENS `description` through `setTokenText`. |
| Look-alike pool | third party | `PoolSeeder.seed` opens another ETH/token pool (0.01%, 0.05% or 0.1% LP fee, with the same hook or none) priced about 3% above the declared pool, so it wins on quote. Declaring it is simulated (`eth_call`) and reverts with `NotIssuer`. |
| Swap | trader | Every ETH pool of the token is found from PoolManager `Initialize` events and quoted with V4Quoter. With Klamp routing off the best quote wins. With it on, the app resolves the canonical pool from ENSv2, runs `judge` and `compareRoutes`, requotes on the allowed pools, checks the Universal Router `V4_SWAP` calldata against the judged PoolKey, and only then asks the wallet to sign. |

## Code it reuses

Nothing is copied. `vite.config.ts` aliases the repo's own code:

- `@klamp/sdk` → [`contract/sdk`](../contract/sdk): `getCanonicalPool` (namespace, text/data and pool checks; `registered | not_registered | lookup_failed`), `judge`, `compareRoutes` (`match | mismatch | blocked`), `hashPoolKey`.
- `@klamp/demo-sdk` → [`contract/demo/sepolia/klamp-sdk.mjs`](../contract/demo/sepolia/klamp-sdk.mjs): `buildSwap`, `verifySwapCalldata`, `allowedPools`. Quotes use the same V4Quoter call through this app's RPC.
- `@deployments` → [`contract/deployments`](../contract/deployments): every address.

## Run

```sh
cd dex
pnpm install
pnpm dev        # http://localhost:5174
pnpm build      # typecheck + static build in dist/
```

You need a browser wallet on Sepolia with a little Sepolia ETH (a launch costs about 1M gas). `VITE_SEPOLIA_RPC_URL` overrides the public RPC used for reads; signatures always go through the wallet.

## A 3-minute walkthrough

1. **Launch** a token. Four checks appear: token, pool, declaration, and the ENS record read back as `registered`.
2. **Buy it** on the Swap tab (0.002 ETH is enough to seed a pool that can fill a 0.0005 ETH trade).
3. **Add a look-alike pool** with the hook and create it (approve, then create). Try to declare it: `NotIssuer`.
4. Back on **Swap** at 0.0005 ETH: with Klamp off the route goes to the look-alike (best quote); with Klamp on it is crossed out (`requote_canonical`, route `mismatch`) and the swap goes to the declared pool. A look-alike with no hook is static, and Klamp lets it through.

KHOOK is preselected and already has an undeclared look-alike pool, so step 4 works without launching anything.

## Limits

- The look-alike uses the same honest `DeltaFeeHook`, so the naive route really does pay out its quote here. The point is that Klamp only trusts the pool the issuer declared; a hook that charges more at swap time than at quote time is not deployed on Sepolia.
- Buys only (ETH → token). Selling needs a Permit2 approval flow that this demo does not build.
- Pools are discovered from `Initialize` logs in 50,000-block windows, the last 200,000 blocks by default (from the launch block for tokens launched here). Launched and pasted tokens are remembered in this browser only.
- A pool can only pay out what it holds: if the look-alike has less liquidity than one trade's output it returns no quote and the naive router skips it.

Rehearsed on an anvil fork of Sepolia before release (see `contract/docs/WORKLOG.md`, DEX1). Browser rendering and wallet prompts were not checked from the agent environment.
