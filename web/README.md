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

The frontend follows the implemented Phase 1 SDK state model:

- canonical pool resolution: `found | missing | invalid | unavailable | ambiguous`
- route comparison: `match | mismatch | blocked`

The happy path launches a token, resolves the write-once ENSv2 canonical pool record, and verifies the declared route. It then continues into a clearly labelled Phase 2 mock where a 3,000 bps fee request is capped at 100 bps. That cap is not implemented by the current contracts, and mock addresses or receipts are not live-chain claims.
