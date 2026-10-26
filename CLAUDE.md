# base_frontend

Basepointcloud frontend: React + TypeScript on Vite, Ant Design (incl. pro-components), Redux Toolkit. The backend lives in a sibling repo and runs via the top-level docker compose file (see `readme.md`).

## Checks

There is no test script. `npm run lint` is the gate (it fails on any warning) and `npm run build` catches type errors; run both before calling a change done.

## Skills

Skills live in `.agents/skills/` and are symlinked into `.claude/skills/`, so they load automatically. Use them when the task matches:

- **Bug, error, or slowdown** reported → `diagnosing-bugs` before editing code.
- **Screens inside the POS app** (dashboards, tables, forms, settings) → `ui-taste`. Public/marketing pages → `design-taste-frontend`.
- **Reviewing a branch or PR** → `code-review`. Writing a PR description → `pr`.
- **Naming domain concepts** (orders, tables, zones, stock transfers) or recording a decision → `domain-modeling`.
- **Restructuring a module or its interface** → `codebase-design`.
- **Editing this file or any skill** → `writing-for-agents`.
