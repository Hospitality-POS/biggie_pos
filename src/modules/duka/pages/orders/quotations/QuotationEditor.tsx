import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert, AutoComplete, Button, Card, Checkbox, DatePicker, Descriptions, Empty, Input, InputNumber, Select, Space, Spin, Typography, message,
} from "antd";
import {
    AppstoreOutlined, CalendarOutlined, DeleteOutlined, EyeOutlined, FileSearchOutlined, FileTextOutlined,
    PictureOutlined, PlusOutlined, ProfileOutlined, UnorderedListOutlined, UserOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import StepperModal from "@components/MODALS/StepperModal";
import {
    apiErrorMessage, createQuotation, getQuotation, listQuotationTemplates, updateQuotation,
    type Quotation, type QuotationTemplate, type QuoteLine, type QuoteSection,
} from "@services/quotations";
import { SAVED_ITEMS_KEY, listSavedItems, rememberSavedItems, type SavedItem } from "@services/savedItems";
import { fetchAllCustomers } from "@services/customers";
import { THEME_C } from "@utils/getPrimaryColor";
import ImageInput from "./ImageInput";
import LayoutPicker from "./LayoutPicker";
import QuotationPreview from "./QuotationPreview";
import { computeTotals, getLayout, money } from "./templates";
import { blankLine, blankSection, newQuote } from "./starter";

const { Text } = Typography;
const { TextArea } = Input;
const C = THEME_C;

const replaceAt = <T,>(list: T[], i: number, item: T) => list.map((x, j) => (j === i ? item : x));
const removeAt = <T,>(list: T[], i: number) => list.filter((_, j) => j !== i);

/** Customers can be people or companies; companies have company_name */
export const customerName = (c: any) =>
    c?.company_name || c?.customer_name || c?.name || [c?.first_name, c?.last_name].filter(Boolean).join(" ") || "";

const Field: React.FC<{ label: string; children: React.ReactNode; flex?: number | string }> = ({ label, children, flex = 1 }) => (
    <div style={{ flex, minWidth: 160 }}>
        <div style={{ fontSize: 12, color: C.subText, marginBottom: 4 }}>{label}</div>
        {children}
    </div>
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>{children}</div>
);

const StepTitle: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
    <div style={{ marginBottom: 14 }}>
        <Text strong style={{ fontSize: 15, display: "block" }}>{title}</Text>
        {hint && <Text type="secondary" style={{ fontSize: 12 }}>{hint}</Text>}
    </div>
);

const STEPS = [
    { title: "Client", description: "Who the quote is for", icon: <UserOutlined /> },
    { title: "Details", description: "Title, dates & template", icon: <CalendarOutlined /> },
    { title: "Items", description: "Priced sections", icon: <UnorderedListOutlined /> },
    { title: "Notes & terms", description: "Payment, delivery, warranty", icon: <ProfileOutlined /> },
    { title: "Specification", description: "Optional spec table", icon: <AppstoreOutlined /> },
    { title: "Pictures", description: "Features, gallery, banners", icon: <PictureOutlined /> },
    { title: "Review", description: "Check & save", icon: <FileSearchOutlined /> },
];
const LAST = STEPS.length - 1;

// ── Unsaved work ─────────────────────────────────────────────────────────────
// The form is kept in localStorage while it's being filled, so closing it (or
// reloading the page) and opening it again picks up where it was left. One
// draft per shop for a new quote, and one per quote being edited.
interface QuoteDraft {
    quote: Quotation;
    step: number;
    reached: number;
    savedAt: string;
    /** For an edited quote: its updatedAt when the draft began. A draft of an
     *  older version is dropped, so it can't undo someone else's save. */
    base?: string;
}

const draftKey = (quoteId: string | null) =>
    `quote_draft_${localStorage.getItem("shopId") || "shop"}_${quoteId || "new"}`;

const readDraft = (key: string): QuoteDraft | null => {
    try {
        const raw = localStorage.getItem(key);
        const d = raw ? (JSON.parse(raw) as QuoteDraft) : null;
        return d?.quote ? d : null;
    } catch {
        return null;
    }
};

const clearDraft = (key: string) => localStorage.removeItem(key);

/** Create or edit a quote in a stepped modal. `quoteId` null = new quote. */
const QuotationEditor: React.FC<{
    open: boolean;
    quoteId: string | null;
    onClose: () => void;
    onSaved: (quote: Quotation) => void;
}> = ({ open, quoteId, onClose, onSaved }) => {
    const queryClient = useQueryClient();
    const [quote, setQuote] = useState<Quotation | null>(null);
    const [step, setStep] = useState(0);
    // Furthest step reached, so the stepper lets the user jump back and forth
    const [reached, setReached] = useState(0);
    const [saving, setSaving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [itemSearch, setItemSearch] = useState("");

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
        queryFn: () => fetchAllCustomers({ search: customerSearch }),
        enabled: open,
        select: (res: any) => (Array.isArray(res) ? res : res?.customers || res?.data || []) as any[],
        staleTime: 30_000,
    });

    const { data: savedItems = [] } = useQuery({
        queryKey: [SAVED_ITEMS_KEY, itemSearch],
        queryFn: () => listSavedItems(itemSearch),
        enabled: open && step === 2,
        staleTime: 30_000,
        keepPreviousData: true,
    });

    const key = draftKey(quoteId);
    // The form as it was opened; a draft is only kept once it differs
    const baseline = useRef("");
    const [restoredAt, setRestoredAt] = useState<string | null>(null);

    const startFresh = (fresh: Quotation, startReached: number) => {
        baseline.current = JSON.stringify(fresh);
        setQuote(fresh);
        setStep(0);
        setReached(startReached);
        setRestoredAt(null);
    };

    // Load the quote being edited, or start a new one from the default
    // template — unless there's unsaved work to carry on with
    useEffect(() => {
        if (!open) { setQuote(null); setStep(0); setReached(0); setRestoredAt(null); return; }
        if (quote) return;
        const fresh = quoteId
            ? loaded
            : templatesReady ? newQuote(templates.find((t) => t.is_default) || templates[0]) : null;
        if (!fresh) return;
        startFresh(fresh, quoteId ? LAST : 0);
        const draft = readDraft(key);
        if (!draft) return;
        if (quoteId && draft.base !== loaded?.updatedAt) { clearDraft(key); return; }
        setQuote(draft.quote);
        setStep(Math.min(draft.step, LAST));
        setReached(Math.max(Math.min(draft.reached, LAST), quoteId ? LAST : 0));
        setRestoredAt(draft.savedAt);
    }, [open, quoteId, loaded, templates, templatesReady]); // eslint-disable-line react-hooks/exhaustive-deps

    // Writes the unsaved work, if the form differs from how it was opened
    const writeDraft = () => {
        if (!quote || JSON.stringify(quote) === baseline.current) return;
        const draft: QuoteDraft = {
            quote, step, reached, savedAt: new Date().toISOString(),
            base: quoteId ? loaded?.updatedAt : undefined,
        };
        try {
            localStorage.setItem(key, JSON.stringify(draft));
        } catch {
            // Storage full or blocked: the form still works, just isn't kept
        }
    };

    // Keep unsaved work (debounced) while the form is open
    useEffect(() => {
        if (!open || !quote) return;
        const timer = setTimeout(writeDraft, 400);
        return () => clearTimeout(timer);
    }, [open, quote, step, reached]); // eslint-disable-line react-hooks/exhaustive-deps

    // Closing keeps the latest keystrokes too, not just the last debounced write
    const handleClose = () => {
        writeDraft();
        onClose();
    };

    const discardDraft = () => {
        clearDraft(key);
        const fresh = quoteId ? loaded : newQuote(templates.find((t) => t.is_default) || templates[0]);
        if (fresh) startFresh(fresh, quoteId ? LAST : 0);
        message.info(quoteId ? "Changes discarded" : "Started a new quote");
    };

    const template: QuotationTemplate | null = useMemo(
        () => templates.find((t) => t._id === quote?.template_id) || null,
        [templates, quote?.template_id]
    );
    const totals = useMemo(() => computeTotals(quote?.sections || []), [quote?.sections]);

    const patch = (p: Partial<Quotation>) => setQuote((q) => (q ? { ...q, ...p } : q));
    const setSection = (i: number, s: QuoteSection) => quote && patch({ sections: replaceAt(quote.sections, i, s) });

    const goTo = (i: number) => {
        setStep(i);
        setReached((r) => Math.max(r, i));
    };

    const pickTemplate = (id: string | null) => {
        const t = templates.find((x) => x._id === id) || null;
        patch({ template_id: id, layout: t?.layout || quote?.layout });
        // A new quote that hasn't been typed into yet takes the template's text
        if (!quoteId && quote && !quote.title && t) {
            setQuote({ ...newQuote(t), client: quote.client, customer_id: quote.customer_id, issue_date: quote.issue_date });
        }
    };

    const pickCustomer = (id: string | null) => {
        const c = customers.find((x) => x._id === id);
        patch({
            customer_id: id,
            client: c
                ? {
                    ...quote?.client,
                    name: customerName(c),
                    contact_person: c.company_name ? c.customer_name || c.contact_person || quote?.client?.contact_person || "" : quote?.client?.contact_person,
                    phone: c.phone || c.phone_number || "",
                    email: c.email || "",
                    kra_pin: c.kra_pin || "",
                    address: [c.address?.street, c.address?.building, c.address?.city].filter(Boolean).join(", ") || c.location || quote?.client?.address || "",
                }
                : quote?.client,
        });
    };

    const lineFromSaved = (item: SavedItem): Partial<QuoteLine> => ({
        description: item.description,
        unit_price: item.unit_price || 0,
        ...(item.image ? { image: item.image } : {}),
    });

    const savedOptions = savedItems.map((item) => ({
        value: item._id,
        label: (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.description}</span>
                <Text type="secondary" style={{ whiteSpace: "nowrap" }}>{money(item.unit_price)}</Text>
            </div>
        ),
    }));

    const validateStep = (i: number) => {
        if (!quote) return false;
        if (i === 0 && !quote.client?.name?.trim()) { message.warning("Enter the client's name or pick a customer"); return false; }
        if (i === 1 && !quote.title.trim()) { message.warning("Give the quote a title"); return false; }
        if (i === 2 && !quote.sections.some((s) => s.lines.some((l) => l.description.trim()))) {
            message.warning("Add at least one priced item");
            return false;
        }
        return true;
    };

    const save = async () => {
        if (!quote) return;
        for (const i of [0, 1, 2]) {
            if (!validateStep(i)) { goTo(i); return; }
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
            clearDraft(key);
            // Nothing left unsaved, so closing now doesn't re-save a draft
            baseline.current = JSON.stringify(quote);
            // Keep the items for the next quote or invoice
            rememberSavedItems(
                body.sections.flatMap((s) => s.lines.map((l) => ({
                    description: l.description, unit_price: l.unit_price, vat_rate: s.vat_rate, image: l.image,
                }))),
                "quote"
            ).then(() => queryClient.invalidateQueries({ queryKey: [SAVED_ITEMS_KEY] }));
            onSaved(saved);
        } catch (err) {
            message.error(apiErrorMessage(err, "Couldn't save the quote"));
        } finally {
            setSaving(false);
        }
    };

    const readOnly = quote?.status === "accepted";

    // ── Steps ────────────────────────────────────────────────────────────────
    const clientStep = quote && (
        <>
            <StepTitle title="Client" hint="Pick a saved customer to fill the details, or type them in." />
            <Row>
                <Field label="Customer (optional)">
                    <Select
                        style={{ width: "100%" }}
                        showSearch allowClear
                        filterOption={false}
                        onSearch={setCustomerSearch}
                        notFoundContent={customersLoading ? <Spin size="small" /> : "No customers"}
                        value={quote.customer_id || null}
                        onChange={(v) => pickCustomer(v ?? null)}
                        placeholder="Search customers by name, company or phone"
                        options={customers.map((c) => ({
                            value: c._id,
                            label: `${customerName(c) || "Unnamed customer"}${c.phone ? ` · ${c.phone}` : ""}`,
                        }))}
                    />
                </Field>
            </Row>
            <Row>
                <Field label="Client / company name *" flex={2}>
                    <Input value={quote.client?.name} onChange={(e) => patch({ client: { ...quote.client, name: e.target.value } })} />
                </Field>
                <Field label="Contact person">
                    <Input value={quote.client?.contact_person} onChange={(e) => patch({ client: { ...quote.client, contact_person: e.target.value } })} />
                </Field>
            </Row>
            <Row>
                <Field label="Phone">
                    <Input value={quote.client?.phone} onChange={(e) => patch({ client: { ...quote.client, phone: e.target.value } })} />
                </Field>
                <Field label="Email">
                    <Input value={quote.client?.email} onChange={(e) => patch({ client: { ...quote.client, email: e.target.value } })} />
                </Field>
                <Field label="KRA PIN">
                    <Input value={quote.client?.kra_pin} onChange={(e) => patch({ client: { ...quote.client, kra_pin: e.target.value } })} />
                </Field>
            </Row>
            <Field label="Address">
                <Input value={quote.client?.address} onChange={(e) => patch({ client: { ...quote.client, address: e.target.value } })} />
            </Field>
        </>
    );

    const detailsStep = quote && (
        <>
            <StepTitle title="Details" />
            <Row>
                <Field label="Quote title *" flex={2}>
                    <Input value={quote.title} onChange={(e) => patch({ title: e.target.value })} placeholder="e.g. Kasarani Clay City lift quote" />
                </Field>
                <Field label="Saved template (banners & default text)">
                    <Select
                        style={{ width: "100%" }}
                        value={quote.template_id || null}
                        onChange={pickTemplate}
                        options={[
                            { value: null, label: "None" },
                            ...templates.map((t) => ({ value: t._id, label: `${t.name}${t.is_default ? " (default)" : ""}` })),
                        ]}
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
            <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: C.subText, marginBottom: 6 }}>Design</div>
                <LayoutPicker value={quote.layout} onChange={(layout) => patch({ layout })} />
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>{getLayout(quote.layout).description}</Text>
            </div>
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

    const GRID = "1fr 80px 130px 120px 120px 32px";
    const itemsStep = quote && (
        <>
            <StepTitle title="Items" hint="Start typing to pick an item you've used on an earlier quote or invoice. New items are saved for next time." />
            {quote.sections.map((section, si) => (
                <Card
                    key={section._id || si}
                    size="small"
                    style={{ marginBottom: 12, borderColor: C.border }}
                    title={
                        <Space wrap>
                            <Text strong>{String.fromCharCode(65 + si)}.</Text>
                            <Input style={{ width: 240 }} value={section.title} placeholder="Section title, e.g. Local charges"
                                onChange={(e) => setSection(si, { ...section, title: e.target.value })} />
                            <Input style={{ width: 80 }} value={section.currency} placeholder={quote.currency || "KES"}
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
                    <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, fontSize: 12, color: C.subText, marginBottom: 6 }}>
                        <span>Item</span><span>Qty</span><span>Unit price</span><span style={{ textAlign: "right" }}>Amount</span><span>Image</span><span />
                    </div>
                    {section.lines.map((line, li) => {
                        const setLine = (p: Partial<QuoteLine>) =>
                            setSection(si, { ...section, lines: replaceAt(section.lines, li, { ...line, ...p }) });
                        return (
                            <div key={line._id || li} style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, alignItems: "start", marginBottom: 8 }}>
                                <AutoComplete
                                    value={line.description}
                                    options={line.description.trim().length >= 1 ? savedOptions : []}
                                    onSearch={(t) => setItemSearch(t.trim())}
                                    onChange={(v) => setLine({ description: v })}
                                    onSelect={(id: string) => {
                                        const item = savedItems.find((x) => x._id === id);
                                        if (item) setLine(lineFromSaved(item));
                                    }}
                                    popupMatchSelectWidth={420}
                                >
                                    <TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder="Description — type to find saved items" />
                                </AutoComplete>
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                        <Space wrap>
                            <Button size="small" icon={<PlusOutlined />} onClick={() => setSection(si, { ...section, lines: [...section.lines, blankLine()] })}>
                                Add item
                            </Button>
                            <Select
                                size="small"
                                style={{ width: 260 }}
                                showSearch
                                value={null}
                                placeholder="Add a saved item…"
                                filterOption={false}
                                onSearch={(t) => setItemSearch(t.trim())}
                                onChange={(id: string) => {
                                    const item = savedItems.find((x) => x._id === id);
                                    if (!item) return;
                                    // Fill the empty starter row before adding a new one
                                    const empty = section.lines.findIndex((l) => !l.description.trim() && !l.unit_price);
                                    const line = { ...blankLine(), ...lineFromSaved(item) } as QuoteLine;
                                    setSection(si, {
                                        ...section,
                                        lines: empty >= 0 ? replaceAt(section.lines, empty, line) : [...section.lines, line],
                                    });
                                }}
                                notFoundContent="No saved items yet — they're kept when you save a quote or invoice"
                                options={savedOptions}
                            />
                        </Space>
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
    const termsStep = quote && (
        <>
            <StepTitle title="Notes & terms" hint="Each block prints as a heading with its text under the totals. Empty blocks are left out." />
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
    const specStep = quote && (
        <>
            <StepTitle title="Specification" hint="Optional. Prints in the Sectioned design as a table with a picture beside it." />
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
    const mediaStep = quote && (
        <>
            <StepTitle title="Features & pictures" hint="Optional. Pictures upload to DigitalOcean Spaces and print in the Sectioned design." />
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
                Leave empty to use the saved template's header and footer{template ? ` (${template.name})` : ""}.
            </Text>
            <Space direction="vertical">
                <Space><span style={{ width: 60, display: "inline-block" }}>Header</span><ImageInput wide value={quote.header_image} onChange={(header_image) => patch({ header_image })} label="Header banner" /></Space>
                <Space><span style={{ width: 60, display: "inline-block" }}>Footer</span><ImageInput wide value={quote.footer_image} onChange={(footer_image) => patch({ footer_image })} label="Footer banner" /></Space>
            </Space>
        </>
    );

    const LayoutComponent = getLayout(quote?.layout).Component;
    const reviewStep = quote && (
        <>
            <StepTitle title="Review" hint="This is how the quote will look. Go back to any step to change it." />
            <Descriptions size="small" bordered column={2} style={{ marginBottom: 14 }}>
                <Descriptions.Item label="Client">{quote.client?.name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Total">{quote.currency || "KES"} {money(totals.grand_total)}</Descriptions.Item>
                <Descriptions.Item label="Title">{quote.title || "—"}</Descriptions.Item>
                <Descriptions.Item label="Design">{getLayout(quote.layout).label}</Descriptions.Item>
            </Descriptions>
            <div style={{ background: "#e5e7eb", padding: 12, borderRadius: 8, maxHeight: 520, overflow: "auto" }}>
                <div style={{ background: "#fff", padding: 24, maxWidth: 794, margin: "0 auto" }}>
                    <LayoutComponent quote={quote} template={template} />
                </div>
            </div>
        </>
    );

    const stepBody = [clientStep, detailsStep, itemsStep, termsStep, specStep, mediaStep, reviewStep][step];

    const footer = (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <Button icon={<EyeOutlined />} disabled={!quote} onClick={() => setPreviewOpen(true)}>Preview & print</Button>
            <Space>
                {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
                {step < LAST && (
                    <Button type={quoteId ? "default" : "primary"} disabled={!quote} onClick={() => validateStep(step) && goTo(step + 1)}>
                        Next
                    </Button>
                )}
                {(step === LAST || !!quoteId) && (
                    <Button type="primary" icon={<FileTextOutlined />} loading={saving} disabled={!quote || readOnly} onClick={save}>
                        {quoteId ? "Save quote" : "Create quote"}
                    </Button>
                )}
            </Space>
        </div>
    );

    return (
        <>
            <StepperModal
                open={open}
                onCancel={handleClose}
                icon={<FileTextOutlined />}
                title={quoteId ? `Edit quote ${quote?.quote_no || ""}` : "Create Quote"}
                steps={STEPS}
                current={step}
                // Any step already reached can be opened again
                onStepClick={(i) => setStep(i)}
                reachedStep={reached}
                width={1200}
                maskClosable={false}
                footer={footer}
            >
                {!quote ? (
                    loading ? <div style={{ textAlign: "center", padding: 60 }}><Spin /></div> : <Empty />
                ) : (
                    <>
                        {restoredAt && !readOnly && (
                            <Alert
                                type="info"
                                showIcon
                                closable
                                onClose={() => setRestoredAt(null)}
                                style={{ marginBottom: 12 }}
                                message={`Picked up where you left off (${dayjs(restoredAt).format("DD MMM, HH:mm")})`}
                                description="Your unsaved changes were kept when the form was closed."
                                action={<Button size="small" onClick={discardDraft}>{quoteId ? "Discard changes" : "Start over"}</Button>}
                            />
                        )}
                        {readOnly && (
                            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
                                This quote was accepted, so it can't be changed. Duplicate it from the list to make a new version.
                            </div>
                        )}
                        {stepBody}
                    </>
                )}
            </StepperModal>

            <QuotationPreview
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                quote={quote}
                template={template}
            />
        </>
    );
};

export default QuotationEditor;
