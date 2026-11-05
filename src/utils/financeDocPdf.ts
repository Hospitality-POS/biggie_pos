/**
 * Branded A5 PDF for accounting documents — sales receipts, supplier bills,
 * expenses. One layout, styled by the same export templates as payroll and
 * payslips (Minimal / Slate / Accent / Branded). jsPDF loads on demand.
 */
import dayjs from "dayjs";
import { getExportTheme, type ExportTemplateId, type RGB } from "./exportTemplates";

export interface DocBusiness {
    name: string;
    location?: string;
    poBox?: string;
    phone?: string;
    email?: string;
    kraPin?: string;
    logoUrl?: string;
    /** e.g. "Till 123456" or "Paybill 400200  Acc 1234" */
    paymentInfo?: string;
}

export type DocTone = "good" | "warn" | "bad" | "neutral";

export interface DocColumn {
    header: string;
    align?: "left" | "right";
    /** mm; omit for the flexible column */
    width?: number;
}

export interface FinanceDoc {
    /** Big heading, e.g. "RECEIPT", "BILL", "EXPENSE" */
    title: string;
    number: string;
    date: string;
    /** Extra right-hand lines under the date, e.g. "Due 12 Dec 2026" */
    meta?: string[];
    status: { label: string; tone: DocTone };
    /** Two info blocks under the header, e.g. "Received from" + "Payment" */
    blocks: { title: string; lines: (string | undefined | null | false)[] }[];
    columns: DocColumn[];
    rows: string[][];
    totals: { label: string; value: string }[];
    grand: { label: string; value: string };
    /** Rows after the grand total, e.g. Paid / Balance due */
    after?: { label: string; value: string; tone?: DocTone }[];
    notes?: string;
    /** Red line under the notes, e.g. the void reason */
    alert?: string;
    watermark?: string;
    thanks?: string;
    /** Print the business's till / paybill in the footer (customer-facing documents only) */
    showPaymentInfo?: boolean;
    filename: string;
}

/** Only printable values — an object (e.g. an address stored as {street, city}) would print as "[object Object]". */
const isText = (v: unknown): v is string | number =>
    (typeof v === "string" && v.trim() !== "") || (typeof v === "number" && Number.isFinite(v));

const money = (v?: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const docMoney = money;
export const docPct = (r?: number) => `${parseFloat(((r || 0) * 100).toFixed(2))}%`;

const TONES: Record<DocTone, { fg: RGB; bg: RGB }> = {
    good: { fg: [21, 128, 61], bg: [220, 252, 231] },
    warn: { fg: [180, 83, 9], bg: [254, 243, 199] },
    bad: { fg: [185, 28, 28], bg: [254, 226, 226] },
    neutral: { fg: [71, 85, 105], bg: [241, 245, 249] },
};

/** Image URL → PNG data URL (SVG/WebP too); null when CORS blocks it or it's slow. */
const loadLogo = (url?: string): Promise<{ data: string; w: number; h: number } | null> =>
    new Promise((resolve) => {
        if (!url || typeof Image === "undefined") return resolve(null);
        const img = new Image();
        img.crossOrigin = "anonymous";
        const timer = setTimeout(() => resolve(null), 5000);
        img.onload = () => {
            clearTimeout(timer);
            try {
                const w = img.naturalWidth || 200, h = img.naturalHeight || 200;
                const scale = Math.min(1, 600 / Math.max(w, h));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(w * scale);
                canvas.height = Math.round(h * scale);
                canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve({ data: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height });
            } catch {
                resolve(null); // tainted canvas
            }
        };
        img.onerror = () => { clearTimeout(timer); resolve(null); };
        img.src = url;
    });

export const renderFinanceDocPdf = async (d: FinanceDoc, biz: DocBusiness, templateId?: ExportTemplateId) => {
    const [{ default: jsPDF }, { default: autoTable }, logo] = await Promise.all([
        import("jspdf"),
        import("./autoTable"),
        loadLogo(biz.logoUrl),
    ]);
    const t = getExportTheme(templateId);

    const doc = new jsPDF({ unit: "mm", format: "a5" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 12;
    const ink: RGB = [15, 23, 42];
    const muted: RGB = [100, 116, 139];
    const line: RGB = [226, 232, 240];

    // ── Page edges — full band (Branded), thin rule (Slate / Accent), none (Minimal)
    const band = t.headerBand ? 4 : t.id === "minimal" ? 0 : 1.2;
    if (band) {
        doc.setFillColor(...t.title);
        doc.rect(0, 0, W, band, "F");
        doc.rect(0, H - band / 2, W, band / 2, "F");
    }

    // ── Business block ─────────────────────────────────────────────────────
    const top = 12;
    let textX = M;
    const LOGO = 18;
    if (logo) {
        const ratio = logo.w / logo.h;
        const lw = ratio >= 1 ? LOGO : LOGO * ratio;
        const lh = ratio >= 1 ? LOGO / ratio : LOGO;
        doc.addImage(logo.data, "PNG", M, top, lw, lh);
        textX = M + lw + 4;
    } else if (biz.name) {
        doc.setFillColor(...t.title);
        doc.circle(M + 7, top + 7, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        const initials = biz.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
        doc.text(initials, M + 7, top + 8.8, { align: "center" });
        textX = M + 18;
    }
    // Business text wraps before it reaches the document title on the right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    const titleW = doc.getTextWidth(d.title);
    const leftW = Math.min(W / 2 + 4, W - M - titleW - 5) - textX;
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const nameLines = doc.splitTextToSize(biz.name || "", leftW);
    doc.text(nameLines, textX, top + 4);
    let by = top + 4 + nameLines.length * 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    [
        biz.location, biz.poBox ? `P.O. Box ${biz.poBox}` : "",
        biz.phone ? `Tel: ${biz.phone}` : "", biz.email, biz.kraPin ? `KRA PIN: ${biz.kraPin}` : "",
    ].filter(isText).forEach((s) => {
        const ls = doc.splitTextToSize(String(s), leftW);
        doc.text(ls, textX, by);
        by += ls.length * 3.6;
    });

    // ── Document block (right) ─────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...t.title);
    doc.text(d.title, W - M, top + 5, { align: "right" });
    doc.setFontSize(8);
    doc.setTextColor(...ink);
    doc.text(d.number, W - M, top + 11, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);
    let ry = top + 15;
    [d.date, ...(d.meta || [])].filter(Boolean).forEach((s) => { doc.text(s, W - M, ry, { align: "right" }); ry += 3.8; });

    const tone = TONES[d.status.tone];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const pw = doc.getTextWidth(d.status.label) + 6;
    doc.setFillColor(...tone.bg);
    doc.roundedRect(W - M - pw, ry - 1, pw, 5, 2.5, 2.5, "F");
    doc.setTextColor(...tone.fg);
    doc.text(d.status.label, W - M - pw / 2, ry + 2.5, { align: "center" });

    let y = Math.max(by, ry + 6, top + 24) + 3;
    doc.setDrawColor(...(t.id === "minimal" ? ink : line));
    doc.setLineWidth(t.id === "minimal" ? 0.4 : 0.3);
    doc.line(M, y, W - M, y);
    y += 6;

    // ── Info blocks ────────────────────────────────────────────────────────
    const blocks = d.blocks.slice(0, 2);
    const colW = (W - 2 * M - 6) / 2;
    let blockEnd = y;
    blocks.forEach((b, bi) => {
        const x = M + bi * (colW + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...muted);
        doc.text(b.title.toUpperCase(), x, y);
        let yy = y + 4.5;
        b.lines.filter(isText).forEach((s, i) => {
            doc.setFont("helvetica", i === 0 ? "bold" : "normal");
            doc.setFontSize(i === 0 ? 9 : 7.5);
            doc.setTextColor(...(i === 0 ? ink : muted));
            const ls = doc.splitTextToSize(String(s), colW);
            doc.text(ls, x, yy);
            yy += ls.length * (i === 0 ? 4.2 : 3.6);
        });
        blockEnd = Math.max(blockEnd, yy);
    });
    y = blockEnd + 3;

    // ── Items ──────────────────────────────────────────────────────────────
    const last = d.columns.length - 1;
    const columnStyles: Record<number, any> = {};
    d.columns.forEach((c, i) => {
        columnStyles[i] = {
            halign: c.align || "left",
            ...(c.width ? { cellWidth: c.width } : {}),
            ...(i === last ? { fontStyle: "bold" } : {}),
        };
    });
    const whiteHead = t.headFill.every((v) => v === 255);
    autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        head: [d.columns.map((c) => c.header)],
        body: d.rows,
        theme: "plain",
        styles: { font: "helvetica", fontSize: 8, cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 }, textColor: ink },
        headStyles: {
            fillColor: t.headFill, textColor: t.headText, fontStyle: "bold", fontSize: 7.5,
            ...(whiteHead ? { lineColor: t.headLine, lineWidth: { bottom: 0.4 } } : {}),
        },
        ...(t.zebra ? { alternateRowStyles: { fillColor: t.zebra } } : {}),
        bodyStyles: { lineColor: line, lineWidth: t.zebra ? 0 : { bottom: 0.15 } },
        columnStyles,
        didParseCell: (c: any) => {
            if (c.section === "head") c.cell.styles.halign = d.columns[c.column.index]?.align || "left";
        },
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    // ── Totals ─────────────────────────────────────────────────────────────
    const tW = 62;
    const tX = W - M - tW;
    const row = (label: string, value: string, color: RGB = ink, bold = false) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(8);
        doc.setTextColor(...muted);
        doc.text(label, tX, y);
        doc.setTextColor(...color);
        doc.text(value, W - M, y, { align: "right" });
        y += 4.6;
    };
    d.totals.forEach((r) => row(r.label, r.value));

    y += 1;
    if (t.netFill) {
        doc.setFillColor(...t.netFill);
        doc.roundedRect(tX - 3, y - 4, tW + 3, 9, 1.5, 1.5, "F");
    } else {
        doc.setDrawColor(...t.netBorder);
        doc.setLineWidth(0.5);
        doc.roundedRect(tX - 3, y - 4, tW + 3, 9, 1.5, 1.5, "S");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...t.netText);
    doc.text(d.grand.label, tX, y + 1.8);
    doc.text(d.grand.value, W - M - 2, y + 1.8, { align: "right" });
    y += 11;
    (d.after || []).forEach((r) => row(r.label, r.value, r.tone ? TONES[r.tone].fg : ink, true));
    y += 3;

    // ── Notes / alert ──────────────────────────────────────────────────────
    if (d.notes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...muted);
        doc.text("NOTES", M, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...ink);
        const ls = doc.splitTextToSize(d.notes, W - 2 * M);
        doc.text(ls, M, y + 4);
        y += 4 + ls.length * 3.6 + 2;
    }
    if (d.alert) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...TONES.bad.fg);
        doc.text(doc.splitTextToSize(d.alert, W - 2 * M), M, y);
    }

    // ── Watermark ──────────────────────────────────────────────────────────
    if (d.watermark) {
        const GState = (doc as any).GState;
        if (GState) doc.setGState(new GState({ opacity: 0.12 }));
        doc.setFont("helvetica", "bold");
        doc.setFontSize(72);
        doc.setTextColor(220, 38, 38);
        doc.text(d.watermark, W / 2, H / 2 + 10, { align: "center", angle: 30 });
        if (GState) doc.setGState(new GState({ opacity: 1 }));
    }

    // ── Footer ─────────────────────────────────────────────────────────────
    const fy = H - 16;
    doc.setDrawColor(...line);
    doc.setLineWidth(0.3);
    doc.line(M, fy, W - M, fy);
    if (d.thanks) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...t.title);
        doc.text(d.thanks, W / 2, fy + 5, { align: "center" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...muted);
    const foot = [d.showPaymentInfo ? biz.paymentInfo : "", `Generated ${dayjs().format("DD MMM YYYY, HH:mm")}`].filter(Boolean).join("   ·   ");
    doc.text(foot, W / 2, fy + (d.thanks ? 9.5 : 6), { align: "center" });

    doc.save(d.filename);
};
