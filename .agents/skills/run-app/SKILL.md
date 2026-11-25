---
name: run-app
description: Open the POS app in a real browser and screenshot it. Use after changing a screen, to check a layout or style change, or when the user asks to run or see the app.
---

# Run the app

The dev server talks to the **production** API (`.env`) and signs in as the demo business. There is no staging API yet. The backend can't run locally: its tenant databases are `mongodb+srv` only, and its `.env` starts production's reminder and DigiTax jobs. Leave the backend alone.

## Look, don't touch

Production data is real. In the browser, navigate, open menus and dialogs, switch tabs, and stop there. Saving, paying, sending, deleting and submitting all write to production: when checking a change needs one, ask the user first.

## Steps

1. Credentials: `BASE_DEMO_COMPANY_CODE` and `BASE_DEMO_PIN` come from `env` in `.claude/settings.local.json`, which git ignores. If they're unset, ask the user, and keep them out of tracked files.
2. First run only: `npm install --prefix .agents/skills/run-app --no-package-lock`.
3. If `http://localhost:5374` already answers, the user's dev server is running: use it, and leave it running at the end. Otherwise start `pnpm dev` in the background (the port is fixed) and wait until it answers.
4. Screenshot: `node .agents/skills/run-app/screenshot.mjs /tables /orders --out <scratchpad>`. Add `--width 390 --height 844` for the phone layout (the app switches below 768px). The demo PIN is an admin, so sign-in lands on `/admin/dashboard`.
5. Read each PNG it prints, and the "Problems seen" list after them. A page error is a bug even when the screenshot looks right.
6. Stop the dev server if you started it.

Done when every screen you changed has been seen at each width it supports, and every listed problem is fixed or explained as unrelated.
