# Contributing

This document defines the baseline engineering workflow for `prmpt`.

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Run local quality checks:

```bash
pnpm run prepush
```

## Branch Naming

Use these branch prefixes:

1. `feat/*` for feature work
2. `fix/*` for bug fixes
3. `chore/*` for tooling, refactors, and maintenance
4. `docs/*` for documentation-only changes
5. `test/*` for testing-focused work

Examples:

1. `feat/st-01-04-ci-quality-guards`
2. `fix/auth-callback-state-validation`
3. `chore/tsconfig-cleanup`

## Commit Message Standard

Use Conventional Commits format:

```text
<type>(optional-scope): short summary
```

Types used in this repo:

1. `feat`
2. `fix`
3. `chore`
4. `docs`
5. `test`
6. `refactor`

## Pull Request Standard

PRs must use the checklist in `.github/pull_request_template.md` and include:

1. Story ID and epic mapping
2. Scope in/out
3. Verification evidence for build/typecheck/lint/test
4. Security/privacy and telemetry notes
5. Rollback/fallback notes when behavior changes

## Required References

1. Definition of Ready / Definition of Done:
   - `wiki/planning/definition-of-ready-done.md`
2. Traceability matrix:
   - `wiki/planning/requirements-traceability-matrix.md`
3. Story and sprint source of truth:
   - `wiki/execution-plan/sprints/story-register.md`
   - `wiki/execution-plan/sprints/sprint-sequencing.md`

## Local Pre-Push Checks

Run before every push:

```bash
pnpm run prepush
```

To install a local Git hook that enforces the same checks automatically:

```bash
pnpm run setup:hooks
```
