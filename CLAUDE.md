# base_frontend

Basepointcloud frontend: React + TypeScript on Vite, Ant Design (incl. pro-components), Redux Toolkit. The backend lives in a sibling repo and runs via the top-level docker compose file (see `readme.md`).

## Checks

There is no test script. Before calling a change done, run `pnpm run typecheck` and `pnpm run lint:errors`; CI runs both on every pull request to `dev` and `master`.

`typecheck` fails on any missing name or unreachable code, and on more type errors than `scripts/typecheck-baseline.json` allows. After removing errors, lower the baseline with `pnpm run typecheck --update-baseline`. `pnpm run build` doesn't type-check, and the full `pnpm run lint` still fails on older warnings.

## Skills

Skills live in `.agents/skills/` and are symlinked into `.claude/skills/`, so they load automatically. Use them when the task matches:

- **Bug, error, or slowdown** reported → `diagnosing-bugs` before editing code.
- **Screens inside the POS app** (dashboards, tables, forms, settings) → `ui-taste`. Public/marketing pages → `design-taste-frontend`.
- **Seeing a changed screen** in the browser → `run-app`. It runs against production, so look, don't touch.
- **Reviewing a branch or PR** → `code-review`. Writing a PR description → `pr`.
- **Naming domain concepts** (orders, tables, zones, stock transfers) or recording a decision → `domain-modeling`.
- **Restructuring a module or its interface** → `codebase-design`.
- **Editing this file or any skill** → `writing-for-agents`.

## Agent skills

### Issue tracker

GitHub Issues in Hospitality-POS/biggie_pos, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
