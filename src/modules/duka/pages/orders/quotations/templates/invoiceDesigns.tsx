import React from "react";
import useSystemDetails from "@hooks/useSystemDetails";
import {
    TEMPLATES as INVOICE_TEMPLATES,
    type InvoiceForPrint,
    type SystemDetails,
} from "@modules/pesa/pages/invoices/components/InvoiceTemplates";
import type { Quotation } from "@services/quotations";
import { computeTotals, type QuoteRenderProps } from "./shared";

// Quotes can be printed with any of the invoice designs (Classic, Slate Pro,
// Ocean, Minimal, Forest, Clean, Letterhead). The quote is shaped like a
// Draft invoice, which those designs already title "QUOTE", and drawn with
// the shop's own logo, contacts and bank details. These designs show the
// priced items and terms; the specification, features and pictures only
// print in the Sectioned layout.

const round2 = (n: number) => Math.round(n * 100) / 100;

export const quoteAsInvoice = (quote: Quotation): InvoiceForPrint => {
    const { sections, grand_total } = computeTotals(quote.sections || []);
    const multi = sections.length > 1;
    const items = sections.flatMap((s, si) => {
        const rate = Number(s.vat_rate) || 0;
        return s.lines
            .filter((l) => l.description?.trim() || l.unit_price)
            .map((l, li) => ({
                _id: `${si}-${li}`,
                description: multi && s.title ? `${s.title}: ${l.description}` : l.description,
                quantity: Number(l.quantity) || 0,
                unit_price: Number(l.unit_price) || 0,
                price: Number(l.unit_price) || 0,
                vat_amount: round2((l.amount || 0) * rate),
            }));
    });
    const subtotal = round2(sections.reduce((n, s) => n + (s.subtotal || 0), 0));
    const vat = round2(sections.reduce((n, s) => n + (s.vat_amount || 0), 0));
    const client = quote.client || {};
    const terms = (quote.blocks || [])
        .filter((b) => b.body?.trim())
        .map((b) => (b.heading ? `${b.heading}: ${b.body}` : b.body))
        .join("\n");

    return {
        _id: quote._id || "draft-quote",
        order_no: quote.quote_no || "Draft",
        createdAt: quote.createdAt || new Date().toISOString(),
        issue_date: quote.issue_date,
        status: "Draft",
        direction: "customer",
        counterparty_name: client.name,
        counterparty_phone: client.phone,
        counterparty_email: client.email,
        counterparty_kra_pin: client.kra_pin,
        items,
        subtotal,
        discount_amount: 0,
        total_vat_amount: vat,
        vat_pricing_mode: "EXCLUSIVE",
        grand_total,
        amount_paid: 0,
        amount_due: grand_total,
        currency: quote.currency || "KES",
        notes: [quote.title, quote.objectives].filter(Boolean).join(" — ") || undefined,
        terms: terms || undefined,
    };
};

/** One quote layout per invoice design */
export const INVOICE_DESIGN_LAYOUTS = INVOICE_TEMPLATES.map((t) => {
    const Design = t.component;
    const Component: React.FC<QuoteRenderProps> = ({ quote }) => {
        const sys: SystemDetails = useSystemDetails();
        return <Design inv={quoteAsInvoice(quote)} sys={sys} />;
    };
    Component.displayName = `QuoteAs${t.name.replace(/\s/g, "")}`;
    return {
        key: `invoice-${t.id}`,
        label: t.name,
        description: t.description,
        thumbBg: t.thumbBg as string,
        thumbAccent: t.thumbAccent as string,
        Component,
    };
});
