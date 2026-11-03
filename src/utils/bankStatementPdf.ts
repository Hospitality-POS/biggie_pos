import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Read transactions out of a text-based bank statement PDF (e.g. Equity Bank).
 *
 * Text is grouped into lines by position. A transaction row ends in
 * "<value date> <amount> <running balance>" — optionally with a reference
 * before the date — and the text lines since the previous row are its
 * description. Statements print credit and debit in one amount slot, so
 * whether money came in or went out is read from the running balance: up =
 * in, down = out. Every row where the balance moved by something other than
 * its amount is counted in `mismatches`, so a bad parse is visible rather
 * than silently wrong.
 */
export interface PdfStatementRow {
    transaction_date: string; // ISO, start of the (EAT) day
    description: string;
    reference?: string;
    debit: number; // money out
    credit: number; // money in
    balance: number;
}

export interface PdfStatementResult {
    rows: PdfStatementRow[];
    pages: number;
    opening: number | null;
    closing: number | null;
    /** Rows whose balance change ≠ amount — 0 means the parse is consistent */
    mismatches: number;
    /** Rows listed before an earlier-dated row (the bank prints in posting order) */
    outOfOrder: number;
}

const num = (s: string) => Number(s.replace(/,/g, ""));
const ROW_RX = /(?:^|\|\s*)(\d{2})\/(\d{2})\/(\d{4})\s*\|\s*([\d,]+\.\d{2})\s*\|\s*(-?[\d,]+\.\d{2})\s*$/;
// Header / footer lines that aren't part of any description
const SKIP_RX = /^(account|currency|statement|transactions|transaction details|period|disclaimer|page \d|value date|credit|debit|balance)\b/i;

const pageLines = async (doc: pdfjsLib.PDFDocumentProxy, p: number) => {
    const page = await doc.getPage(p);
    const { items } = await page.getTextContent();
    const byY = new Map<number, { x: number; s: string }[]>();
    for (const it of items as { str: string; transform: number[] }[]) {
        if (!it.str || !it.str.trim()) continue;
        const y = Math.round(it.transform[5]);
        if (!byY.has(y)) byY.set(y, []);
        byY.get(y)!.push({ x: it.transform[4], s: it.str.trim() });
    }
    return [...byY.keys()]
        .sort((a, b) => b - a)
        .map((y) => byY.get(y)!.sort((a, b) => a.x - b.x).map((r) => r.s).join(" | "));
};

export const parseBankStatementPdf = async (file: File): Promise<PdfStatementResult> => {
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjsLib.getDocument({ data }).promise;

    const raw: Omit<PdfStatementRow, "debit" | "credit">[] = [];
    const amounts: number[] = [];
    let desc: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
        for (const line of await pageLines(doc, p)) {
            const m = line.match(ROW_RX);
            if (!m) {
                // The table header row ends the page / statement header — anything
                // collected before it (account name, period, phone) isn't a description
                if (/^transaction details\b/i.test(line)) {
                    desc = [];
                    continue;
                }
                // Collect description text; drop headers, footers and emails
                if (!SKIP_RX.test(line) && !/@[\w.]+\.\w+$/.test(line)) desc.push(line.replace(/\s*\|\s*/g, " "));
                continue;
            }
            const before = line.slice(0, m.index).split("|").map((s) => s.trim()).filter(Boolean);
            const [, d, mo, y, amount, balance] = m;
            raw.push({
                transaction_date: new Date(`${y}-${mo}-${d}T00:00:00+03:00`).toISOString(),
                description: [...desc, ...before.slice(0, -1)].join(" ").replace(/\s+/g, " ").trim(),
                reference: before[before.length - 1] || undefined,
                balance: num(balance),
            });
            amounts.push(num(amount));
            desc = [];
        }
    }

    // Direction from the balance movement; the first row also gives the opening
    let mismatches = 0;
    let opening: number | null = null;
    const rows: PdfStatementRow[] = raw.map((r, i) => {
        const amount = amounts[i];
        let moneyIn: boolean;
        if (i === 0) {
            const openIfIn = r.balance - amount;
            const openIfOut = r.balance + amount;
            moneyIn = Math.abs(openIfIn) <= Math.abs(openIfOut);
            opening = Math.round((moneyIn ? openIfIn : openIfOut) * 100) / 100;
        } else {
            const delta = Math.round((r.balance - raw[i - 1].balance) * 100) / 100;
            moneyIn = delta >= 0;
            if (Math.abs(Math.abs(delta) - amount) > 0.01) mismatches += 1;
        }
        return { ...r, credit: moneyIn ? amount : 0, debit: moneyIn ? 0 : amount };
    });

    const outOfOrder = rows.filter((r, i) => i > 0 && r.transaction_date < rows[i - 1].transaction_date).length;
    return {
        rows,
        pages: doc.numPages,
        opening,
        closing: rows.length ? rows[rows.length - 1].balance : null,
        mismatches,
        outOfOrder,
    };
};
