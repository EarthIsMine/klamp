# Klamp Web

The web workspace is a light-mode protocol terminal built with Next.js App Router, TypeScript, Emotion styled components, and Zustand. It visualizes protocol state rather than presenting a generic dashboard.

## Run locally

```sh
pnpm install
pnpm dev
```

Open `http://localhost:3000` and select **Run demo**.

```sh
pnpm lint
pnpm build
```

## Architecture

- `src/domain` contains protocol-native types and route comparison policy without UI dependencies.
- `src/data/protocol` defines the `ProtocolClient` boundary. `sepolia.ts` holds the browser Sepolia reads (a port of `contract/sdk/canonicalPool.ts`, V4Quoter quotes, launch/swap receipt and calldata decoding); `client.ts` has `sepoliaProtocolClient` (live, the default) and `mockProtocolClient` (the recorded snapshot used for seeking).
- `src/components/lookup` is the landing page's live ENSv2 lookup terminal.
- `src/store` orchestrates the demo and owns asynchronous UI state.
- `src/components` renders the protocol state.
- `src/styles` contains the Warm White, Charcoal, and Clamp Orange design tokens.

Keep ABIs and deployment addresses behind this data boundary instead of importing Foundry outputs directly into components. The RPC defaults to `https://ethereum-sepolia-rpc.publicnode.com`; set `NEXT_PUBLIC_SEPOLIA_RPC_URL` at build time to use another endpoint.

## State model and demo scope

The frontend follows the implemented canonical-pool SDK state model:

- canonical pool resolution: `registered | not_registered | lookup_failed`
- route comparison: `match | mismatch | blocked`

The nine-step trace follows the path A demo on Sepolia. DemoLaunchpad deploys KHOOK, creates its hooked pool (DeltaFeeHook, 1% delta fee) with locked liquidity and declares it through `recordByCreate2` in one transaction (`0x88939990…`). A naive router quotes the declared pool and a third party's undeclared KHOOK pool (fee 500, same hook, created by PoolSeeder) with V4Quoter and picks the larger quote. Klamp then resolves `0x<token>.tokens.klamp.eth` through UniversalResolverV2, shows who can still change that record (ENSv2 role counts read live: registrar-only writers for `pool`, `description` and `url`, no resolver admin, no roles on `tokens.klamp.eth` or `klamp.eth`, and REGISTRAR and its admin kept for `hooks.klamp.eth`), judges the picked hop (`judge()` from `contract/sdk/judge.ts`: declared and static pools pass, other hook pools are requoted), requotes on the declared pool, verifies the Universal Router `V4_SWAP` calldata against the judged PoolKey and swaps; the execution step shows the team's Klamp-mode swap (`0x1cf6fdde…`, 0.0005 ETH → 196,197.61 KHOOK). Every step is read from Sepolia in the browser: the launch tx's `CanonicalRecorded` and PoolManager `Initialize` events, fresh V4Quoter quotes for both pools (the naive pick is whichever quotes more), the ENSv2 lookup with the SDK's checks, a fresh requote, and the swap tx's receipt and Universal Router calldata, whose v4 PoolKey is checked against the judged pool. The header shows `Live · Sepolia #<block>` per step; if a launch, quote or swap read fails, the recorded value is shown and labelled `Recorded snapshot`. A failed ENS lookup is shown as `lookup_failed`, never replaced by a recorded result. Only step 8 is simulated and labelled: it assumes the undeclared hook charged 10% at swap time, which reverts at the trader's 5% slippage and loses about 9% at a wide 15% tolerance, because the attack pool is not deployed yet. The capped-hook stage (CappedHookProxy, hooks.klamp.eth) is roadmap only and does not appear in the trace. Each step is an animated scene on one SVG node diagram (Motion for springs and counters, SVG `animateMotion` for token flow) with a one-line caption. For recording: `Play` autoplays the eight steps (about 40 s, stops at the outcome), `→`/Space advances, `←` goes back, `P` toggles play, `R` resets, and the progress dots seek to any step from the recorded snapshot (labelled `Recorded snapshot`). No wallet is connected and no transaction is sent from the browser; all reads are public RPC calls.

The landing page terminal resolves any token address the visitor enters (`registered`, `not_registered` or `lookup_failed: <reason>`) and shows the verdict a router would get for an undeclared hook pool of that token.

## GitHub Pages deployment

The production site is intended to use `https://klamp.kro.kr` at the domain root. `next build` uses Next.js static export and writes the deployable site to `out/`; no server runtime is required.

The repository workflow at `.github/workflows/deploy-pages.yml` lints, builds, and deploys `web/out` on pushes to `main`. It can also be started manually from the Actions tab.

Before the first deployment:

1. Verify the owned domain `klamp.kro.kr` in the `EarthIsMine` organization Pages settings.
2. In `EarthIsMine/klamp` settings, select **Pages → Source → GitHub Actions**.
3. Set the repository Pages custom domain to `klamp.kro.kr`.
4. At the DNS provider, point `klamp.kro.kr` to `EarthIsMine.github.io` using the provider's CNAME/ALIAS support, then enable HTTPS after GitHub validates DNS.

The Actions-based deployment does not require a committed `CNAME` file. Do not place private RPC credentials in the frontend or in `NEXT_PUBLIC_*` variables; all shipped browser configuration is public.
