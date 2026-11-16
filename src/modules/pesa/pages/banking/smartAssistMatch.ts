import type { RawTransaction, RuleCondition, ApplyTo } from "@services/accounting/bankStatementImport";

/**
 * Client-side twin of the API's Smart Assist matching (services/bankStatementAssist.js):
 * decides which lines "look like" each other, so the review screen can react
 * the moment someone categorizes a line — without a round trip.
 */

// Words that say how money moved, not who it went to
const NOISE = new Set([
    "mpesa", "m-pesa", "pos", "ref", "refno", "trf", "transfer", "to", "from", "payment", "pmt", "pay", "paid",
    "txn", "trx", "the", "of", "and", "for", "by", "on", "at", "kes", "ksh", "acc", "ac", "a/c", "no", "num",
    "purchase", "debit", "credit", "dr", "cr", "card", "online", "eft", "rtgs", "chq", "cheque", "funds", "fund",
    "via", "inward", "outward", "charge", "charges", "fee", "fees", "bank", "branch", "nbo", "nairobi", "ke",
    "ltd", "limited", "co", "plc", "mr", "mrs", "ms", "till", "paybill", "buy", "goods", "merchant", "customer",
    "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
    "january", "february", "march", "april", "june", "july", "august", "september", "october", "november", "december",
]);
const MONTHS = new Set([...NOISE].filter((w) => /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/.test(w)));

export const tokensOf = (description: string): string[] => {
    const words = String(description || "")
        .toLowerCase()
        .replace(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g, " ")
        .replace(/[^a-z0-9& ]+/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2 && (w.match(/\d/g) || []).length <= 1 && /[a-z]/.test(w));
    const meaningful = words.filter((w) => !NOISE.has(w));
    return meaningful.length ? meaningful : words.filter((w) => !MONTHS.has(w));
};

const keyOf = (tokens: string[]) => tokens.slice(0, 4).join(" ");

const jaccard = (a: Set<string>, b: Set<string>) => {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    a.forEach((x) => {
        if (b.has(x)) inter++;
    });
    return inter / (a.size + b.size - inter);
};

export const directionOf = (t: Pick<RawTransaction, "debit" | "credit">): "debit" | "credit" =>
    Math.abs(t.debit || 0) > 0 ? "debit" : "credit";

/** Same direction, and the same payee words (or mostly the same). */
export const looksAlike = (a: RawTransaction, b: RawTransaction) => {
    if (directionOf(a) !== directionOf(b)) return false;
    const ta = tokensOf(a.description);
    const tb = tokensOf(b.description);
    if (!ta.length || !tb.length) return false;
    if (keyOf(ta) === keyOf(tb)) return true;
    return jaccard(new Set(ta), new Set(tb)) >= 0.5;
};

/** Lines in the list that are still uncategorized and look like `line`. */
export const similarUncategorized = (line: RawTransaction, all: RawTransaction[]) =>
    all.filter((t) => t._id !== line._id && t.status === "Uncategorized" && !t.journal_entry_id && looksAlike(line, t));

/** The words a rule should look for: what all these narrations share, as one phrase if possible. */
export const rulePhrase = (lines: RawTransaction[]): string | null => {
    const words = tokensOf(lines[0]?.description || "").slice(0, 4);
    const descs = lines.map((l) => (l.description || "").toLowerCase());
    const share = (s: string) => descs.filter((d) => d.includes(s)).length / descs.length;
    for (let n = Math.min(3, words.length); n >= 1; n--) {
        for (let i = 0; i + n <= words.length; i++) {
            const phrase = words.slice(i, i + n).join(" ");
            if (phrase.length >= 4 && share(phrase) >= 0.9) return phrase;
        }
    }
    const longest = [...words].sort((a, b) => b.length - a.length)[0];
    return longest && share(longest) >= 0.9 ? longest : null;
};

/** A rule matching lines like these on this bank account, ready for createCategorizationRule. */
export const ruleFor = (
    lines: RawTransaction[],
    account: { account_id: string; account_code?: string; account_name?: string }
): { name: string; conditions: RuleCondition[]; apply_to: ApplyTo; phrase: string } | null => {
    const phrase = rulePhrase(lines);
    if (!phrase) return null;
    const title = phrase.replace(/\b\w/g, (c) => c.toUpperCase());
    return {
        phrase,
        name: `${title} → ${account.account_name || account.account_code || "account"}`,
        apply_to: directionOf(lines[0]) === "debit" ? "withdrawals" : "deposits",
        conditions: [{ field: "description", operator: "contains", value: phrase, case_sensitive: false }],
    };
};
