# C10 Deployment Task Split

- Date / authoring tool: 2026-09-26 / Codex
- Reason: split C10 into small units so that the registration, resume and verification responsibilities of network deployment are not bundled into one commit.
- C10a: commit/wait/register/setParent following the real ETHRegistrar ABI, state resume, and price/balance/name conflict tests.
- C10b: namespace deployment that can be re-run after interruption, and stronger record verification before the seal.
- C10c: pre-verification Sepolia candidate configuration, code/role/funds preflight, public manifest collection, read-only smoke and local reproduction.
- Verification: Foundry/TypeScript tests for each unit, and a final full deployment on a fresh Anvil with viem E2E.
- Human decision: an AI implementation split applying the user's request to break commits into small responsibilities. Completion of a separate human review has not been confirmed.
- Constraint: no public network broadcast is performed. Once the environment, signing and protocol code verification are ready, run it with the commands in the docs.
