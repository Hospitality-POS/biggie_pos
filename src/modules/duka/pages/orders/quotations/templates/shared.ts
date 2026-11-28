import dayjs from "dayjs";
import type { Quotation, QuotationTemplate, QuoteSection } from "@services/quotations";

/** What every quote layout is drawn from */
export interface QuoteRenderProps {
    quote: Quotation;
    template?: QuotationTemplate | null;
}

export const money = (v?: number) =>
    (Number(v) || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const quoteDate = (d?: string) => (d ? dayjs(d).format("DD/MM/YYYY") : "");

/** A, B, C … for section headings and the contract total label */
export const sectionLetter = (i: number) => String.fromCharCode(65 + (i % 26));

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Same arithmetic as the API (models/Quotation/quotation.js) so the preview
 *  of an unsaved quote shows the totals it will be saved with. */
export const computeTotals = (sections: QuoteSection[]) => {
    let grand = 0;
    const computed = sections.map((s) => {
        const lines = s.lines.map((l) => ({
            ...l,
            amount: round2((Number(l.quantity) || 0) * (Number(l.unit_price) || 0)),
        }));
        const subtotal = round2(lines.reduce((sum, l) => sum + l.amount, 0));
        const vat_amount = round2(subtotal * (Number(s.vat_rate) || 0));
        const total = round2(subtotal + vat_amount);
        grand += total;
        return { ...s, lines, subtotal, vat_amount, total };
    });
    return { sections: computed, grand_total: round2(grand) };
};

/** Branding for a quote: the quote's own banners win over its template's */
export const branding = ({ quote, template }: QuoteRenderProps) => ({
    header: quote.header_image || template?.header_image,
    footer: quote.footer_image || template?.footer_image,
    accent: template?.accent_color || "#1f5f99",
    secondary: template?.secondary_color || "#f58220",
});
