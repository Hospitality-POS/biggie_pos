#!/usr/bin/env node
// Type-check gate for CI and local runs: `pnpm run typecheck`.
//
// The codebase still carries older type errors, so plain `tsc` can't gate pull
// requests yet. This script fails when:
//   - any "cannot find name" or unreachable-code error exists, because those
//     crash or silently break at runtime, or
//   - the total error count rises above the baseline in typecheck-baseline.json.
// When the count drops, it asks for the baseline to be lowered, so fixed errors
// can't creep back. `--update-baseline` records the current count.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const BASELINE_FILE = new URL("./typecheck-baseline.json", import.meta.url);
const ALWAYS_FAIL = {
  TS2304: "cannot find name",
  TS2552: "cannot find name",
  TS7027: "unreachable code",
};

const tsc = spawnSync(
  process.execPath,
  [require.resolve("typescript/bin/tsc"), "--noEmit", "-p", "tsconfig.json"],
  { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
);
if (tsc.error) {
  console.error("Could not run tsc:", tsc.error.message);
  process.exit(2);
}

const output = `${tsc.stdout}${tsc.stderr}`;
const errors = output.split("\n").filter((line) => /error TS\d+:/.test(line));
if (tsc.status !== 0 && errors.length === 0) {
  console.error(output || `tsc exited with status ${tsc.status} and no output`);
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8")).errors;
const count = errors.length;

if (process.argv.includes("--update-baseline")) {
  writeFileSync(BASELINE_FILE, `${JSON.stringify({ errors: count }, null, 2)}\n`);
  console.log(`Baseline updated: ${baseline} -> ${count} type errors.`);
  process.exit(0);
}

const blocking = errors.filter((line) =>
  Object.keys(ALWAYS_FAIL).some((code) => line.includes(`error ${code}:`)),
);
let failed = false;

if (blocking.length > 0) {
  failed = true;
  console.error(`\n${blocking.length} error(s) that break at runtime (cannot find name / unreachable code):\n`);
  for (const line of blocking) console.error(`  ${line}`);
}

if (count > baseline) {
  failed = true;
  console.error(
    `\nType errors: ${count}, baseline ${baseline}. This change adds ${count - baseline}.` +
      "\nRun `npx tsc --noEmit -p tsconfig.json` and fix the errors in the files you changed.",
  );
} else if (count < baseline) {
  console.log(
    `Type errors: ${count}, baseline ${baseline}. Lower the baseline so these stay fixed:` +
      "\n  pnpm run typecheck --update-baseline",
  );
} else {
  console.log(`Type errors: ${count}, at the baseline.`);
}

process.exit(failed ? 1 : 0);
