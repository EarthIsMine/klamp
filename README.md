# Klamp

Klamp is an ETHGlobal Tokyo 2026 protocol project. The repository keeps the onchain implementation and the protocol terminal together without coupling their toolchains.

## Repository layout

```text
klamp/
├── contract/   # Phase 1 Solidity, ENSv2 integration, SDK, scripts, and tests
└── web/        # Next.js App Router protocol terminal
```

- [`contract/README.md`](contract/README.md) describes the implemented Phase 1 guarantees, deployment flow, and validation evidence.
- [`web/README.md`](web/README.md) describes the frontend architecture and demo flow.

## Contract workspace

The contract workspace uses npm and Foundry. Run its commands from `contract/`:

```sh
cd contract
./scripts/setup-dependencies.sh
forge test
npm test
npm run typecheck
```

## Web workspace

The frontend uses pnpm 12.6.0. Run its commands from `web/`:

```sh
cd web
pnpm install
pnpm dev
```

Validation commands:

```sh
pnpm lint
pnpm build
```

The web workspace is statically exported and deployed from `main` to GitHub Pages through `.github/workflows/deploy-pages.yml`. Its intended custom domain is `https://klamp.kro.kr`; complete the repository Pages and DNS settings described in [`web/README.md`](web/README.md) before the first production deployment.

The UI models the Phase 1 SDK results as `found`, `missing`, `invalid`, `unavailable`, or `ambiguous`, and route comparisons as `match`, `mismatch`, or `blocked`. The 30% request to 1% cap sequence is an explicitly labelled Phase 2 mock; the current contracts do not implement that enforcement.
