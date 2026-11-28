import React, { useEffect, useMemo, useState } from "react";
import {
    Button, Card, Checkbox, DatePicker, Drawer, Empty, Input, InputNumber, Select, Space, Spin, Tabs, Typography, message,
} from "antd";
import { DeleteOutlined, EyeOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
    apiErrorMessage, createQuotation, getQuotation, listQuotationTemplates, updateQuotation,
    type Quotation, type QuotationTemplate, type QuoteSection,
} from "@services/quotations";
import { fetchAllCustomers } from "@services/customers";
import { THEME_C } from "@utils/getPrimaryColor";
import ImageInput from "./ImageInput";
import QuotationPreview from "./QuotationPreview";
import { QUOTE_LAYOUTS, computeTotals, money } from "./templates";
import { blankLine, blankSection, newQuote } from "./starter";

const { Text } = Typography;
const { TextArea } = Input;
const C = THEME_C;

const replaceAt = <T,>(list: T[], i: number, item: T) => list.map((x, j) => (j === i ? item : x));
const removeAt = <T,>(list: T[], i: number) => list.filter((_, j) => j !== i);

const Field: React.FC<{ label: string; children: React.ReactNode; flex?: number | string }> = ({ label, children, flex = 1 }) => (
    <div style={{ flex, minWidth: 160 }}>
        <div style={{ fontSize: 12, color: C.subText, marginBottom: 4 }}>{label}</div>
        {children}
    </div>
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>{children}</div>
);

/** Create or edit a quote. `quoteId` null = new quote. */
const QuotationEditor: React.FC<{
    open: boolean;
    quoteId: string | null;
    onClose: () => void;
    onSaved: (quote: Quotation) => void;
}> = ({ open, quoteId, onClose, onSaved }) => {
    const [quote, setQuote] = useState<Quotation | null>(null);
    const [saving, setSaving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");

    const { data: templates = [], isFetched: templatesReady } = useQuery({
        queryKey: ["quotation-templates"],
        queryFn: listQuotationTemplates,
        enabled: open,
        staleTime: 60_000,
    });

    const { data: loaded, isFetching: loading } = useQuery({
        queryKey: ["quotation", quoteId],
        queryFn: () => getQuotation(quoteId as string),
        enabled: open && !!quoteId,
    });

    const { data: customers = [], isFetching: customersLoading } = useQuery({
        queryKey: ["quotation-customers", customerSearch],
        queryFn: () => fetchAllCustomers({ search: customerSearch, customer_name: customerSearch }),
        enabled: open,
        select: (res: any) => (Array.isArray(res) ? res : res?.customers || res?.data || []) as any[],
        staleTime: 30_000,
    });

    // Load the quote being edited, or start a new one from the default template
    useEffect(() => {
        if (!open) { setQuote(null); return; }
        if (quoteId) {
            if (loaded) setQuote(loaded);
        } else if (!quote && templatesReady) {
            setQuote(newQuote(templates.find((t) => t.is_default) || templates[0]));
        }
    }, [open, quoteId, loaded, templates, templatesReady]); // eslint-disable-line react-hooks/exhaustive-deps

    const template: QuotationTemplate | null = useMemo(
        () => templates.find((t) => t._id === quote?.template_id) || null,
        [templates, quote?.template_id]
    );
    const totals = useMemo(() => computeTotals(quote?.sections || []), [quote?.sections]);

    const patch = (p: Partial<Quotation>) => setQuote((q) => (q ? { ...q, ...p } : q));
    const setSection = (i: number, s: QuoteSection) => quote && patch({ sections: replaceAt(quote.sections, i, s) });

    const pickTemplate = (id: string | null) => {
        const t = templates.find((x) => x._id === id) || null;
        patch({ template_id: id, layout: t?.layout || quote?.layout });
        // A new quote that hasn't been typed into yet takes the template's text
        if (!quoteId && quote && !quote.title && !quote.client?.name && t) {
            setQuote({ ...newQuote(t), issue_date: quote.issue_date });
        }
    };

    const pickCustomer = (id: string | null) => {
        const c = customers.find((x) => x._id === id);
        patch({
            customer_id: id,
            client: c
                ? {
                    ...quote?.client,
                    name: c.customer_name || c.name || "",
                    phone: c.phone || c.phone_number || "",
                    email: c.email || "",
                    kra_pin: c.kra_pin || "",
                    address: [c.address?.street, c.address?.city].filter(Boolean).join(", ") || quote?.client?.address || "",
                }
                : quote?.client,
        });
    };

    const save = async () => {
        if (!quote) return;
        if (!quote.title.trim()) { message.warning("Give the quote a title"); return; }
        if (!quote.sections.some((s) => s.lines.some((l) => l.description.trim()))) {
            message.warning("Add at least one priced item");
            return;
        }
        // Drop empty rows so they don't print as blank lines
        const body: Quotation = {
            ...quote,
            sections: quote.sections.map((s) => ({ ...s, lines: s.lines.filter((l) => l.description.trim() || l.unit_price) })),
            blocks: (quote.blocks || []).filter((b) => b.heading.trim() || b.body.trim()),
            spec_groups: (quote.spec_groups || []).map((g) => ({ ...g, rows: g.rows.filter((r) => r.label || r.value) })),
            features: (quote.features || []).filter((f) => f.name.trim() || f.image),
            gallery: (quote.gallery || []).filter((g) => g.image),
        };
        delete body.template;
        setSaving(true);
        try {
            const saved = quoteId ? await updateQuotation(quoteId, body) : await createQuotation(body);
            message.success(quoteId ? "Quote saved" : `Quote ${saved.quote_no} created`);
            onSaved(saved);
        } catch (err) {
            message.error(apiErrorMessage(err, "Couldn't save the quote"));
        } finally {
            setSaving(false);
        }
    };

    const readOnly = quote?.status === "accepted";

    const detailsTab = quote && (
        <>
            <Row>
                <Field label="Quote title" flex={2}>
                    <Input value={quote.title} onChange={(e) => patch({ title: e.target.value })} placeholder="e.g. Kasarani Clay City lift quote" />
                </Field>
                <Field label="Template">
                    <Select
                        style={{ width: "100%" }}
                        value={quote.template_id || null}
                        onChange={pickTemplate}
                        options={[
                            { value: null, label: "No saved template" },
                            ...templates.map((t) => ({ value: t._id, label: `${t.name}${t.is_default ? " (default)" : ""}` })),
                        ]}
                    />
                </Field>
                <Field label="Layout">
                    <Select
                        style={{ width: "100%" }}
                        value={quote.layout}
                        onChange={(layout) => patch({ layout })}
                        options={QUOTE_LAYOUTS.map((l) => ({ value: l.key, label: l.label }))}
                    />
                </Field>
            </Row>
            <Row>
                <Field label="Date">
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" allowClear={false}
                        value={quote.issue_date ? dayjs(quote.issue_date) : null}
                        onChange={(d) => patch({ issue_date: d?.toISOString() })} />
                </Field>
                <Field label="Valid until">
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY"
                        value={quote.valid_until ? dayjs(quote.valid_until) : null}
                        onChange={(d) => patch({ valid_until: d?.toISOString() })} />
                </Field>
                <Field label="Currency">
                    <Input value={quote.currency} onChange={(e) => patch({ currency: e.target.value })} placeholder="KES" />
                </Field>
            </Row>

            <Text strong style={{ display: "block", margin: "8px 0" }}>Client</Text>
            <Row>
                <Field label="Customer (optional)" flex={2}>
                    <Select
                        style={{ width: "100%" }}
                        showSearch allowClear
                        filterOption={false}
                        onSearch={setCustomerSearch}
                        notFoundContent={customersLoading ? <Spin size="small" /> : "No customers"}
                        value={quote.customer_id || null}
                        onChange={(v) => pickCustomer(v ?? null)}
                        placeholder="Search customers to fill the client details"
                        options={customers.map((c) => ({ value: c._id, label: `${c.customer_name || c.name}${c.phone ? ` · ${c.phone}` : ""}` }))}
                    />
                </Field>
                <Field label="Client name">
                    <Input value={quote.client?.name} onChange={(e) => patch({ client: { ...quote.client, name: e.target.value } })} />
                </Field>
            </Row>
            <Row>
                <Field label="Contact person">
                    <Input value={quote.client?.contact_person} onChange={(e) => patch({ client: { ...quote.client, contact_person: e.target.value } })} />
                </Field>
                <Field label="Phone">
                    <Input value={quote.client?.phone} onChange={(e) => patch({ client: { ...quote.client, phone: e.target.value } })} />
                </Field>
                <Field label="Email">
                    <Input value={quote.client?.email} onChange={(e) => patch({ client: { ...quote.client, email: e.target.value } })} />
                </Field>
            </Row>
            <Row>
                <Field label="Address" flex={2}>
                    <Input value={quote.client?.address} onChange={(e) => patch({ client: { ...quote.client, address: e.target.value } })} />
                </Field>
                <Field label="KRA PIN">
                    <Input value={quote.client?.kra_pin} onChange={(e) => patch({ client: { ...quote.client, kra_pin: e.target.value } })} />
                </Field>
            </Row>

            <Field label="Introduction">
                <TextArea autoSize={{ minRows: 2 }} value={quote.intro} onChange={(e) => patch({ intro: e.target.value })} />
            </Field>
            <div style={{ height: 12 }} />
            <Row>
                <Field label="Objectives heading">
                    <Input value={quote.objectives_heading} onChange={(e) => patch({ objectives_heading: e.target.value })} />
                </Field>
            </Row>
            <Field label="Customer objectives / scope">
                <TextArea autoSize={{ minRows: 2 }} value={quote.objectives} onChange={(e) => patch({ objectives: e.target.value })}
                    placeholder="What the client asked for, e.g. supply, install and service a 12-floor passenger lift" />
            </Field>
        </>
    );

    const pricingTab = quote && (
        <>
            {quote.sections.map((section, si) => (
                <Card
                    key={section._id || si}
                    size="small"
                    style={{ marginBottom: 12, borderColor: C.border }}
                    title={
                        <Space wrap>
                            <Text strong>{String.fromCharCode(65 + si)}.</Text>
                            <Input style={{ width: 260 }} value={section.title} placeholder="Section title, e.g. Local charges"
                                onChange={(e) => setSection(si, { ...section, title: e.target.value })} />
                            <Input style={{ width: 90 }} value={section.currency} placeholder={quote.currency || "KES"}
                                onChange={(e) => setSection(si, { ...section, currency: e.target.value })} />
                            <Select style={{ width: 110 }} value={section.vat_rate || 0}
                                onChange={(v) => setSection(si, { ...section, vat_rate: v })}
                                options={[{ value: 0, label: "No VAT" }, { value: 0.16, label: "VAT 16%" }, { value: 0.08, label: "VAT 8%" }]} />
                        </Space>
                    }
                    extra={quote.sections.length > 1 && (
                        <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove section"
                            onClick={() => patch({ sections: removeAt(quote.sections, si) })} />
                    )}
                >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 130px 120px 130px 32px", gap: 8, fontSize: 12, color: C.subText, marginBottom: 6 }}>
                        <span>Item</span><span>Qty</span><span>Unit price</span><span style={{ textAlign: "right" }}>Amount</span><span>Image</span><span />
                    </div>
                    {section.lines.map((line, li) => {
                        const setLine = (p: Partial<typeof line>) =>
                            setSection(si, { ...section, lines: replaceAt(section.lines, li, { ...line, ...p }) });
                        return (
                            <div key={line._id || li} style={{ display: "grid", gridTemplateColumns: "1fr 80px 130px 120px 130px 32px", gap: 8, alignItems: "start", marginBottom: 8 }}>
                                <TextArea autoSize={{ minRows: 1, maxRows: 4 }} value={line.description} placeholder="Description"
                                    onChange={(e) => setLine({ description: e.target.value })} />
                                <InputNumber min={0} style={{ width: "100%" }} value={line.quantity} onChange={(v) => setLine({ quantity: v ?? 0 })} />
                                <InputNumber min={0} style={{ width: "100%" }} value={line.unit_price}
                                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                    parser={(v) => Number((v || "").replace(/,/g, ""))}
                                    onChange={(v) => setLine({ unit_price: v ?? 0 })} />
                                <Text style={{ textAlign: "right", paddingTop: 5 }}>{money(totals.sections[si]?.lines[li]?.amount)}</Text>
                                <ImageInput value={line.image} onChange={(image) => setLine({ image })} label="Image" />
                                <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove item"
                                    disabled={section.lines.length === 1}
                                    onClick={() => setSection(si, { ...section, lines: removeAt(section.lines, li) })} />
                            </div>
                        );
                    })}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <Button size="small" icon={<PlusOutlined />} onClick={() => setSection(si, { ...section, lines: [...section.lines, blankLine()] })}>
                            Add item
                        </Button>
                        <Text strong>
                            Total {money(totals.sections[si]?.total)}
                            {!!section.vat_rate && <Text type="secondary" style={{ fontWeight: 400 }}> (incl. VAT {money(totals.sections[si]?.vat_amount)})</Text>}
                        </Text>
                    </div>
                </Card>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button icon={<PlusOutlined />} onClick={() => patch({ sections: [...quote.sections, blankSection()] })}>Add section</Button>
                <Text strong style={{ fontSize: 15 }}>Contract total: {quote.currency || "KES"} {money(totals.grand_total)}</Text>
            </div>
        </>
    );

    const blocks = quote?.blocks || [];
    const termsTab = quote && (
        <>
            <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 12 }}>
                Notes, payment terms, delivery time, warranty — each shows as a heading with its text under the totals.
            </Text>
            {blocks.map((b, i) => (
                <Card key={b._id || i} size="small" style={{ marginBottom: 10 }}
                    title={<Input value={b.heading} placeholder="Heading" variant="borderless" style={{ fontWeight: 600, padding: 0 }}
                        onChange={(e) => patch({ blocks: replaceAt(blocks, i, { ...b, heading: e.target.value }) })} />}
                    extra={<Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove block" onClick={() => patch({ blocks: removeAt(blocks, i) })} />}
                >
                    <TextArea autoSize={{ minRows: 2 }} value={b.body} placeholder="One point per line"
                        onChange={(e) => patch({ blocks: replaceAt(blocks, i, { ...b, body: e.target.value }) })} />
                </Card>
            ))}
            <Button icon={<PlusOutlined />} onClick={() => patch({ blocks: [...blocks, { heading: "", body: "" }] })}>Add block</Button>
        </>
    );

    const groups = quote?.spec_groups || [];
    const specTab = quote && (
        <>
            <Row>
                <Field label="Heading">
                    <Input value={quote.spec_heading} onChange={(e) => patch({ spec_heading: e.target.value })} />
                </Field>
            </Row>
            {groups.map((g, gi) => {
                const setGroup = (p: Partial<typeof g>) => patch({ spec_groups: replaceAt(groups, gi, { ...g, ...p }) });
                return (
                    <Card key={g._id || gi} size="small" style={{ marginBottom: 10 }}
                        title={<Input value={g.title} placeholder="Group, e.g. 1.1 General spec" variant="borderless" style={{ fontWeight: 600, padding: 0 }}
                            onChange={(e) => setGroup({ title: e.target.value })} />}
                        extra={<Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove group" onClick={() => patch({ spec_groups: removeAt(groups, gi) })} />}
                    >
                        <Space style={{ marginBottom: 10 }} wrap>
                            <ImageInput value={g.image} onChange={(image) => setGroup({ image })} label="Side picture" />
                            {g.image && <Input style={{ width: 220 }} value={g.image_caption} placeholder="Picture caption"
                                onChange={(e) => setGroup({ image_caption: e.target.value })} />}
                        </Space>
                        {g.rows.map((r, ri) => (
                            <div key={ri} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 32px", gap: 8, marginBottom: 6 }}>
                                <Input value={r.label} placeholder="e.g. Shaft size" onChange={(e) => setGroup({ rows: replaceAt(g.rows, ri, { ...r, label: e.target.value }) })} />
                                <Input value={r.value} placeholder="e.g. 1750mm (W) x 1750mm (D)" onChange={(e) => setGroup({ rows: replaceAt(g.rows, ri, { ...r, value: e.target.value }) })} />
                                <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove row" onClick={() => setGroup({ rows: removeAt(g.rows, ri) })} />
                            </div>
                        ))}
                        <Button size="small" icon={<PlusOutlined />} onClick={() => setGroup({ rows: [...g.rows, { label: "", value: "" }] })}>Add row</Button>
                    </Card>
                );
            })}
            <Button icon={<PlusOutlined />} onClick={() => patch({ spec_groups: [...groups, { title: "", rows: [{ label: "", value: "" }] }] })}>
                Add specification group
            </Button>
            <div style={{ height: 12 }} />
            <Field label="Note under the specification">
                <TextArea autoSize={{ minRows: 1 }} value={quote.spec_note} onChange={(e) => patch({ spec_note: e.target.value })} />
            </Field>
        </>
    );

    const features = quote?.features || [];
    const gallery = quote?.gallery || [];
    const mediaTab = quote && (
        <>
            <Row>
                <Field label="Features heading">
                    <Input value={quote.features_heading} onChange={(e) => patch({ features_heading: e.target.value })} />
                </Field>
            </Row>
            {features.map((f, i) => {
                const setFeature = (p: Partial<typeof f>) => patch({ features: replaceAt(features, i, { ...f, ...p }) });
                return (
                    <div key={f._id || i} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 120px 100px 32px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <Input value={f.name} placeholder="e.g. ARD" onChange={(e) => setFeature({ name: e.target.value })} />
                        <Input value={f.description} placeholder="e.g. Automatic Rescue Device" onChange={(e) => setFeature({ description: e.target.value })} />
                        <ImageInput value={f.image} onChange={(image) => setFeature({ image })} label="Image" />
                        <Checkbox checked={!!f.included} onChange={(e) => setFeature({ included: e.target.checked })}>Included</Checkbox>
                        <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove feature" onClick={() => patch({ features: removeAt(features, i) })} />
                    </div>
                );
            })}
            <Button icon={<PlusOutlined />} onClick={() => patch({ features: [...features, { name: "", included: false }] })}>Add feature</Button>

            <div style={{ height: 20 }} />
            <Row>
                <Field label="Pictures heading">
                    <Input value={quote.gallery_heading} onChange={(e) => patch({ gallery_heading: e.target.value })} />
                </Field>
            </Row>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {gallery.map((g, i) => (
                    <div key={g._id || i} style={{ width: 170, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8 }}>
                        <ImageInput value={g.image} onChange={(image) => image
                            ? patch({ gallery: replaceAt(gallery, i, { ...g, image }) })
                            : patch({ gallery: removeAt(gallery, i) })} />
                        <Input size="small" style={{ marginTop: 6 }} value={g.caption} placeholder="Caption"
                            onChange={(e) => patch({ gallery: replaceAt(gallery, i, { ...g, caption: e.target.value }) })} />
                    </div>
                ))}
                <div style={{ width: 170, display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${C.border}`, borderRadius: 8, minHeight: 90 }}>
                    <ImageInput value={undefined} label="Add picture" onChange={(image) => image && patch({ gallery: [...gallery, { image, caption: "" }] })} />
                </div>
            </div>

            <div style={{ height: 20 }} />
            <Text strong style={{ display: "block", marginBottom: 6 }}>Banners for this quote</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
                Leave empty to use the template's header and footer{template ? ` (${template.name})` : ""}.
            </Text>
            <Space direction="vertical">
                <Space><span style={{ width: 60, display: "inline-block" }}>Header</span><ImageInput wide value={quote.header_image} onChange={(header_image) => patch({ header_image })} label="Header banner" /></Space>
                <Space><span style={{ width: 60, display: "inline-block" }}>Footer</span><ImageInput wide value={quote.footer_image} onChange={(footer_image) => patch({ footer_image })} label="Footer banner" /></Space>
            </Space>
        </>
    );

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={980}
            title={quoteId ? `Edit quote ${quote?.quote_no || ""}` : "New quote"}
            destroyOnHidden
            extra={
                <Space>
                    <Button icon={<EyeOutlined />} disabled={!quote} onClick={() => setPreviewOpen(true)}>Preview</Button>
                    <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!quote || readOnly} onClick={save}>
                        Save
                    </Button>
                </Space>
            }
        >
            {!quote ? (
                loading ? <div style={{ textAlign: "center", padding: 60 }}><Spin /></div> : <Empty />
            ) : (
                <>
                    {readOnly && (
                        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
                            This quote was accepted, so it can't be changed. Duplicate it from the list to make a new version.
                        </div>
                    )}
                    <Tabs
                        items={[
                            { key: "details", label: "Client & intro", children: detailsTab },
                            { key: "pricing", label: "Pricing", children: pricingTab },
                            { key: "terms", label: "Notes & terms", children: termsTab },
                            { key: "spec", label: "Specification", children: specTab },
                            { key: "media", label: "Features & pictures", children: mediaTab },
                        ]}
                    />
                </>
            )}

            <QuotationPreview
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                quote={quote}
                template={template}
            />
        </Drawer>
    );
};

export default QuotationEditor;
