# Repository Working Rules

- Keep the Phase 1 contract's spec, work records and implementation inside `contract/`, and the frontend inside `web/`.
- Before working in `contract/`, read and apply `contract/AGENTS.md` and `contract/Klamp_Phase1_Agent_Spec.md`.
- Run `contract/` commands from that directory with npm/Foundry, and `web/` commands from that directory with pnpm. Do not merge one side's package manager or lockfile into the other.
- The frontend's on-chain data layer consumes the `contract/sdk` states as-is. Keep the Phase 1 design doc's (`contract/final_klamp_with_code.md`) `registered | not_registered | lookup_failed` for canonical pool lookup and `match | mismatch | blocked` for route comparison.
- The Phase 2 fee cap is not in the current contract implementation scope. In the frontend demo, state that it is a mock and do not present it as a real on-chain guarantee.
- The Git repository root is the current directory; preserve existing user changes.
