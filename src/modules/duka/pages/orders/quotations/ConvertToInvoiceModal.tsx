import React, { useMemo, useState } from "react";
import { Alert, DatePicker, Descriptions, Modal, Typography, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { createInvoice } from "@services/accounting/invoice";
import { apiErrorMessage, getQuotation, markQuotationConverted, type Quotation } from "@services/quotations";
import { computeTotals, money } from "./templates";

const { Text } = Typography;

// Quote currencies are free text ("Ksh", "USD"); invoices need a code
const invoiceCurrency = (c?: string) => {
    const v = (c || "").trim().toUpperCase();
    if (!v || v === "KSH" || v === "KSHS") return "KES";
    return /^[A-Z]{3}$/.test(v) ? v : "KES";
};

/**
 * Turns a quote into a real invoice: it is created through the normal
 * invoice endpoint (numbered, taxed and posted to A/R like any other), then
 * linked back to the quote, which becomes accepted.
 */
const ConvertToInvoiceModal: React.FC<{
    quote: Quotation | null;
    onClose: () => void;
    onConverted: (invoiceNo: string) => void;
}> = ({ quote, onClose, onConverted }) => {
    const [dueDate, setDueDate] = useState<Dayjs | null>(dayjs().add(30, "day"));
    const [busy, setBusy] = useState(false);

    const lineCount = useMemo(
        () => (quote?.sections || []).reduce((n, s) => n + s.lines.filter((l) => l.quantity > 0 && l.unit_price > 0).length, 0),
        [quote]
    );

    const convert = async () => {
        if (!quote?._id) return;
        setBusy(true);
        try {
            // The list row has no line items; load the full quote
            const full = await getQuotation(quote._id);
            if (full.invoice_id) {
                message.info(`Already converted to invoice ${full.invoice_no}`);
                onConverted(full.invoice_no || "");
                return;
            }
            const clientName = full.client?.name?.trim();
            if (!clientName && !full.customer_id) {
                message.warning("Add the client's name to the quote before converting it");
                return;
            }
            const { sections } = computeTotals(full.sections || []);
            // Section titles carry into the line text so the invoice reads like the quote
            const lines = sections.flatMap((s) =>
                s.lines
                    .filter((l) => Number(l.quantity) > 0 && Number(l.unit_price) > 0)
                    .map((l) => {
                        const vatRate = Number(s.vat_rate) || 0;
                        return {
                            description: sections.length > 1 && s.title ? `${s.title}: ${l.description}` : l.description || s.title || "Item",
                            account_id: "acc_4100",
                            item_type: "custom",
                            quantity: Number(l.quantity),
                            price: Number(l.unit_price),
                            vat_rate: vatRate,
                            vat_amount: Math.round(l.amount * vatRate * 100) / 100,
                        };
                    })
            );
            if (!lines.length) {
                message.warning("The quote has no priced items to invoice");
                return;
            }

            // createInvoice shows its own error message, so failures stop here quietly
            const created = await createInvoice({
                direction: "customer",
                customer_id: full.customer_id || undefined,
                counterparty_name: clientName,
                counterparty_email: full.client?.email || undefined,
                counterparty_phone: full.client?.phone || undefined,
                counterparty_kra_pin: full.client?.kra_pin || undefined,
                issue_date: dayjs().toISOString(),
                due_date: dueDate?.toISOString(),
                currency: invoiceCurrency(full.currency),
                notes: `From quote ${full.quote_no}${full.title ? ` — ${full.title}` : ""}`,
                terms: (full.blocks || []).filter((b) => b.body?.trim()).map((b) => `${b.heading}\n${b.body}`).join("\n\n") || undefined,
                lines,
            } as Parameters<typeof createInvoice>[0]).catch(() => null);
            const invoice = created?.invoice;
            if (!invoice?._id) return;

            try {
                await markQuotationConverted(full._id as string, invoice._id);
            } catch (err) {
                message.warning(apiErrorMessage(err, `Invoice ${invoice.order_no} was created, but the quote couldn't be marked as converted`));
            }
            onConverted(invoice.order_no || "");
        } catch (err) {
            message.error(apiErrorMessage(err, "Couldn't convert the quote"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={!!quote}
            title={`Convert quote ${quote?.quote_no || ""} to an invoice`}
            okText="Create invoice"
            confirmLoading={busy}
            onOk={convert}
            onCancel={onClose}
            destroyOnHidden
        >
            {quote && (
                <>
                    <Descriptions size="small" column={1} bordered style={{ marginBottom: 12 }}>
                        <Descriptions.Item label="Client">{quote.client?.name || <Text type="danger">No client name</Text>}</Descriptions.Item>
                        <Descriptions.Item label="Quote total">{quote.currency || "KES"} {money(quote.grand_total)}</Descriptions.Item>
                        {!!lineCount && <Descriptions.Item label="Priced items">{lineCount}</Descriptions.Item>}
                        <Descriptions.Item label="Due date">
                            <DatePicker format="DD/MM/YYYY" value={dueDate} onChange={setDueDate} allowClear={false} />
                        </Descriptions.Item>
                    </Descriptions>
                    <Alert
                        type="info"
                        showIcon
                        message="The invoice posts to the books straight away (Accounts Receivable)."
                        description="Each priced item becomes an invoice line with its section's VAT. The quote is then marked accepted and can't be edited. Any catering levy set for this shop is added on the invoice."
                    />
                </>
            )}
        </Modal>
    );
};

export default ConvertToInvoiceModal;
