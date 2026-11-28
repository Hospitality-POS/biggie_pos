import dayjs from "dayjs";
import type { Quotation, QuotationTemplate, QuoteSection } from "@services/quotations";
import { DEFAULT_LAYOUT } from "./templates";

// Starting content for new quotes and templates, taken from the business's
// Word quote template (intro line, lettered charge sections, then notes,
// payment terms, delivery time and warranty).

export const STARTER_TEMPLATE_DEFAULTS: NonNullable<QuotationTemplate["defaults"]> = {
    intro: "Thank you for allowing us to offer a quotation for your needs. We look forward to working with you.",
    objectives_heading: "Customer objectives",
    section_titles: ["Supply charges", "Local charges", "Installation charges"],
    currency: "KES",
    validity_days: 30,
    blocks: [
        { heading: "Note", body: "Any fluctuation in exchange rates, taxes, duties or any other government charges, the quote shall be revised.\nValidity of offer 30 days." },
        { heading: "Payment terms", body: "" },
        { heading: "Production and delivery time", body: "" },
        { heading: "Warranty", body: "" },
    ],
    spec_note: "",
};

export const blankLine = () => ({ description: "", quantity: 1, unit_price: 0 });

export const blankSection = (title = ""): QuoteSection => ({ title, lines: [blankLine()], vat_rate: 0 });

/** A new quote, filled from the template's defaults (or the starter text) */
export const newQuote = (template?: QuotationTemplate | null): Quotation => {
    const d = template?.defaults?.blocks?.length || template?.defaults?.intro
        ? template.defaults
        : STARTER_TEMPLATE_DEFAULTS;
    const today = dayjs();
    return {
        title: "",
        template_id: template?._id || null,
        layout: template?.layout || DEFAULT_LAYOUT,
        issue_date: today.toISOString(),
        valid_until: today.add(d?.validity_days || 30, "day").toISOString(),
        currency: d?.currency || "KES",
        client: {},
        intro: d?.intro || "",
        objectives_heading: d?.objectives_heading || "Customer objectives",
        objectives: "",
        sections: (d?.section_titles?.length ? d.section_titles : [""]).map((t) => blankSection(t)),
        blocks: (d?.blocks || []).map((b) => ({ ...b })),
        spec_heading: "Specification",
        spec_groups: [],
        spec_note: d?.spec_note || "",
        features_heading: "Optional functions",
        features: [],
        gallery_heading: "Pictures",
        gallery: [],
    };
};
