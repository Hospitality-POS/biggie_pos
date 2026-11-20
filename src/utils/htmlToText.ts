// Product descriptions are edited with TinyMCE and stored as HTML so the
// website can show them formatted. Anywhere the POS shows a description as
// plain text (receipts, cart lines, exports, tables) strips the markup first.
// Plain-text values pass through untouched.
const ENTITIES: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&rsquo;": "’",
    "&lsquo;": "‘",
    "&rdquo;": "”",
    "&ldquo;": "“",
    "&ndash;": "–",
    "&mdash;": "—",
};

export const htmlToText = (value?: string | null): string => {
    if (!value) return "";
    if (!/<[a-z][\s\S]*>|&[a-z#0-9]+;/i.test(value)) return value;
    return value
        .replace(/<\s*br\s*\/?>/gi, "\n")
        .replace(/<\s*li[^>]*>/gi, "• ")
        .replace(/<\/\s*(p|div|h[1-6]|li|ul|ol)\s*>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e)
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
};
