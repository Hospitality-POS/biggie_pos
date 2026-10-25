import type { Answers } from "../components/FormRenderer";
import type { FormSection } from "../types";

/** A problem the client can fix (unanswered questions, missing name). */
export class SubmitError extends Error {
  missing: string[];
  constructor(message: string, missing: string[] = []) {
    super(message);
    this.missing = missing;
  }
}

// "I, ________, consent…" — 3+ underscores (or 4+ dots) are a box the client
// fills in; answers live under "<key>__blank_<n>" (same rule as the API).
export const BLANK_RE = /_{3,}|\.{4,}|…{2,}/g;
export const countBlanks = (text: string) => (text.match(BLANK_RE) ?? []).length;
export const blankKey = (key: string, index: number) => `${key}__blank_${index}`;

/** Keys of required, visible questions that still have no answer. */
export const findUnanswered = (sections: FormSection[], answers: Answers): string[] => {
  const keys: string[] = [];
  for (const s of sections) {
    if (!s.enabled) continue;
    for (const f of s.fields) {
      if (!f.enabled || !f.required || f.type === "info") continue;
      const v = answers[f.key];
      const blanksFilled =
        f.type !== "consent" ||
        Array.from({ length: countBlanks(f.label) }, (_, i) => answers[blankKey(f.key, i)]).every((b) => !!String(b ?? "").trim());
      const empty =
        f.type === "consent" ? v !== true || !blanksFilled : Array.isArray(v) ? v.length === 0 : v === undefined || v === null || v === "";
      if (empty) keys.push(f.key);
    }
  }
  return keys;
};

/** "Allergies:" but "Are you pregnant?" — no colon after a question mark. */
export const questionLead = (question: string) => (/[?:]\s*$/.test(question) ? question : `${question}:`);

/** Share of required questions answered, 0–100. */
export const progressPercent = (sections: FormSection[], answers: Answers): number => {
  const required = sections
    .filter((s) => s.enabled)
    .flatMap((s) => s.fields.filter((f) => f.enabled && f.required && f.type !== "info"));
  if (required.length === 0) return 100;
  const missing = findUnanswered(sections, answers).length;
  return Math.round(((required.length - missing) / required.length) * 100);
};
