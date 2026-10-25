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

/** Keys of required, visible questions that still have no answer. */
export const findUnanswered = (sections: FormSection[], answers: Answers): string[] => {
  const keys: string[] = [];
  for (const s of sections) {
    if (!s.enabled) continue;
    for (const f of s.fields) {
      if (!f.enabled || !f.required || f.type === "info") continue;
      const v = answers[f.key];
      const empty =
        f.type === "consent" ? v !== true : Array.isArray(v) ? v.length === 0 : v === undefined || v === null || v === "";
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
