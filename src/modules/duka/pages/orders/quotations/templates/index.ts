import type React from "react";
import type { QuoteRenderProps } from "./shared";
import SectionedTemplate from "./SectionedTemplate";
import { INVOICE_DESIGN_LAYOUTS } from "./invoiceDesigns";

// Quote layouts. "Sectioned" is drawn after the business's Word quote and is
// the default; the rest are the invoice designs, so quotes and invoices can
// look the same. A saved quotation template (API: /quotations/templates)
// picks one of these by `key` and adds its own banners, colours and default
// text. To add a layout: write a component that takes QuoteRenderProps and
// add it here; it then shows in the template pickers.

export interface QuoteLayout {
    key: string;
    label: string;
    description: string;
    /** Colours for the picker thumbnail */
    thumbBg: string;
    thumbAccent: string;
    Component: React.FC<QuoteRenderProps>;
}

export const QUOTE_LAYOUTS: QuoteLayout[] = [
    {
        key: "sectioned",
        label: "Sectioned (banner)",
        description: "Banner header and footer, priced sections A/B/C with their own totals, terms, specification with pictures, optional functions and a gallery.",
        thumbBg: "#1f5f99",
        thumbAccent: "#f58220",
        Component: SectionedTemplate,
    },
    ...INVOICE_DESIGN_LAYOUTS,
];

export const DEFAULT_LAYOUT = "sectioned";

// Layout keys that were renamed; quotes saved with them still open
const RENAMED: Record<string, string> = { classic: "invoice-1" };

export const getLayout = (key?: string) => {
    const k = key ? RENAMED[key] || key : key;
    return QUOTE_LAYOUTS.find((l) => l.key === k) || QUOTE_LAYOUTS[0];
};

export type { QuoteRenderProps } from "./shared";
export { computeTotals, money, quoteDate } from "./shared";
