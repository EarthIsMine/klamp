# Project Working Location Change

- Task ID: GOV02 (common to C01–C11)
- Date / authoring tool: 2026-09-25 / Codex
- Human decision: per the user's instruction, place the entire project inside `contract/` at the root.
- Scope of change: move the existing spec, detailed AGENTS.md and docs; afterwards, Foundry, TypeScript, deployment and demo files are also created under `contract/`.
- Difference from the existing plan: the purpose and order of C01–C11 are kept; only the base path changes to `contract/`.
- Verification method: check file existence, relative links in existing docs, and the Git change list.
- Unresolved issues: none. The root AGENTS.md points to the working location.
