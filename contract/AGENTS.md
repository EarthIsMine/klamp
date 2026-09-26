# Project Working Rules

Project-relative paths in this document are relative to `contract/`. Keep all implementation, tests, SDK, deployment scripts and docs inside this directory.

## Starting Work and Scope

- Before starting, read this file, `Klamp_Phase1_Agent_Spec.md`, and any nested `AGENTS.md` that applies to the paths you will modify. Briefly tell the user the paths of the instructions you read and the key rules that apply to this task.
- Check the current branch, uncommitted changes, the existing implementation and the verification environment. Preserve existing instructions and user changes.
- Implement in the spec's C01–C11 order and follow its dependencies. For items already done, record the evidence and skip them.
- Keep going with implementation, fixes and local verification within the scope of the user's request. Pending human verification is not a reason to stop AI work that can proceed independently.
- For remote push, real network broadcast and similar actions, follow the scope of permission the user granted. Do not repeatedly ask for permission already given.

## Plans and Commits

- Use the existing spec as the default plan. Record additional plans or plan changes in `docs/plans/` with the task ID, reason, scope of change, verification method and decision status. Distinguish AI proposals from confirmed human decisions.
- Commit plan-change documents together with the corresponding implementation code. Do not do unnecessary restructuring, bulk formatting or bulk dependency upgrades.
- Each implementation commit contains one purpose, its related tests and the corresponding `docs/WORKLOG.md` entry. Do not mark work complete while hiding related verification failures.
- When committing, check the changed files and include only files within the task scope. Do not distinguish human and AI contributions by commit author name alone.

## Records and Verification

- In `docs/WORKLOG.md`, record the task ID (C01, etc.), date, AI tool used, what the AI did, confirmed human decisions/edits, referenced official doc URLs and the actual version or SHA used, commands run, environment and actual results, and remaining issues.
- Keep AI-run verification and direct human verification as separate items. Without human confirmation, always record `Pending human verification`.
- When you receive a result that a human verified directly, record the verifier (shareable identifier), date, command/procedure, result and evidence location. Record document reading only when it has been confirmed.
- Do not guess or fabricate human decisions, document reading, execution or external feedback. Do not write that a test passed if it was not run.
- Distinguish Failed, Not run and Blocked from pass, and record the cause and how to resume. Local verification, Sepolia verification and manual app UI checks do not substitute for one another.
- Record only team member or mentor feedback actually received in `docs/FEEDBACK.md`. Record AI self-reviews in WORKLOG.
- Do not record or commit private keys, tokens or personal data. If commands or logs contain secrets, keep only a reproduction command with the values removed and the necessary results.

## Finishing Work

- Briefly report the changes, verification results, incomplete items and pending human verification.
- Provide the relevant official SDK docs and pinned versions for a human to read, commands to reproduce directly, and expected results. If only docs were changed, mark SDK verification as not applicable.
- Save plans, work records and actual evidence instead of copying the whole conversation. When correcting an existing record, state the reason for the correction.
