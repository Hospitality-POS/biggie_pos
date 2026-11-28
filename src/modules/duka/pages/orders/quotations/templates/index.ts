import type React from "react";
import type { QuoteRenderProps } from "./shared";
import SectionedTemplate from "./SectionedTemplate";
import ClassicTemplate from "./ClassicTemplate";

// Quote layouts. A saved quotation template (API: /quotations/templates)
// picks one of these by `key` and adds its own banners, colours and default
// text. To add a layout: write a component that takes QuoteRenderProps, add
// it here, and it shows up in the template and quote editors.

export interface QuoteLayout {
    key: string;
    label: string;
    description: string;
    Component: React.FC<QuoteRenderProps>;
}

export const QUOTE_LAYOUTS: QuoteLayout[] = [
    {
        key: "sectioned",
        label: "Sectioned (banner)",
        description: "Banner header and footer, priced sections A/B/C with their own totals, terms, specification with pictures, optional functions and a picture gallery.",
        Component: SectionedTemplate,
    },
    {
        key: "classic",
        label: "Classic",
        description: "One items table with a bill-to box and terms underneath.",
        Component: ClassicTemplate,
    },
];

export const DEFAULT_LAYOUT = "sectioned";

export const getLayout = (key?: string) =>
    QUOTE_LAYOUTS.find((l) => l.key === key) || QUOTE_LAYOUTS[0];

export type { QuoteRenderProps } from "./shared";
export { computeTotals, money, quoteDate } from "./shared";
