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
- `src/data/protocol` defines the `ProtocolClient` boundary and its current typed mock adapter.
- `src/store` orchestrates the demo and owns asynchronous UI state.
- `src/components` renders the protocol state.
- `src/styles` contains the Warm White, Charcoal, and Clamp Orange design tokens.

Replace the mock `ProtocolClient` with a viem-backed adapter to connect the UI. Keep generated ABIs and deployment addresses behind this data boundary instead of importing Foundry outputs directly into components.

## State model and demo scope

The frontend follows the implemented canonical-pool SDK state model:

- canonical pool resolution: `registered | not_registered | lookup_failed`
- route comparison: `match | mismatch | blocked`

The eight-step trace follows the path A demo on Sepolia: DemoLaunchpad deploys KHOOK, creates its hooked pool (DeltaFeeHook, 1% delta fee) with locked liquidity and declares it through `recordByCreate2` in one transaction. A naive router quotes the declared pool and a look-alike hook pool with V4Quoter and picks the larger quote. Klamp then resolves `0x<token>.tokens.klamp.eth` through UniversalResolverV2, judges the picked hop (`judge()` from `contract/sdk/judge.ts`: declared and static pools pass, other hook pools are requoted), requotes on the declared pool, verifies the Universal Router `V4_SWAP` calldata against the judged PoolKey and swaps. The last step compares both executions. Canonical addresses, PoolId and the 0.0005 ETH quote come from the Sepolia deployment and the read-only demo CLI; the look-alike pool and its 10% swap-time fee are simulated and labelled as such, because the attack pool is not deployed yet. The capped-hook stage (CappedHookProxy, hooks.klamp.eth) is roadmap only and does not appear in the trace. The progress rail can seek directly to any step from a deterministic mock snapshot; `Previous` moves back one scene. The demo uses the typed mock client: no wallet, RPC, ENS lookup or transaction is performed in the browser.

## GitHub Pages deployment

The production site is intended to use `https://klamp.kro.kr` at the domain root. `next build` uses Next.js static export and writes the deployable site to `out/`; no server runtime is required.

The repository workflow at `.github/workflows/deploy-pages.yml` lints, builds, and deploys `web/out` on pushes to `main`. It can also be started manually from the Actions tab.

Before the first deployment:

1. Verify the owned domain `klamp.kro.kr` in the `EarthIsMine` organization Pages settings.
2. In `EarthIsMine/klamp` settings, select **Pages → Source → GitHub Actions**.
3. Set the repository Pages custom domain to `klamp.kro.kr`.
4. At the DNS provider, point `klamp.kro.kr` to `EarthIsMine.github.io` using the provider's CNAME/ALIAS support, then enable HTTPS after GitHub validates DNS.

The Actions-based deployment does not require a committed `CNAME` file. Do not place private RPC credentials in the frontend or in `NEXT_PUBLIC_*` variables; all shipped browser configuration is public.
