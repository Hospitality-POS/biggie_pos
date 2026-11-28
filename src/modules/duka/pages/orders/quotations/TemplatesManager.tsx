import React, { useState } from "react";
import {
    Button, ColorPicker, Empty, Input, InputNumber, List, Modal, Popconfirm, Select, Space, Tag, Typography, message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, StarOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    apiErrorMessage, createQuotationTemplate, deleteQuotationTemplate, listQuotationTemplates, updateQuotationTemplate,
    type QuotationTemplate,
} from "@services/quotations";
import ImageInput from "./ImageInput";
import QuotationPreview from "./QuotationPreview";
import { DEFAULT_LAYOUT, getLayout } from "./templates";
import LayoutPicker from "./LayoutPicker";
import { STARTER_TEMPLATE_DEFAULTS, newQuote } from "./starter";

const { Text } = Typography;
const { TextArea } = Input;

type Draft = Partial<QuotationTemplate> & { name: string };

const blankTemplate = (): Draft => ({
    name: "",
    layout: DEFAULT_LAYOUT,
    accent_color: "#1f5f99",
    secondary_color: "#f58220",
    defaults: { ...STARTER_TEMPLATE_DEFAULTS, blocks: STARTER_TEMPLATE_DEFAULTS.blocks?.map((b) => ({ ...b })) },
});

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: 12, color: "#64748b", margin: "10px 0 4px" }}>{children}</div>
);

/** Lists the shop's quotation templates and edits one at a time */
const TemplatesManager: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState<Draft | null>(null);
    const [saving, setSaving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const { data: templates = [], isFetching } = useQuery({
        queryKey: ["quotation-templates"],
        queryFn: listQuotationTemplates,
        enabled: open,
    });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["quotation-templates"] });

    const setDefaults = (p: Partial<NonNullable<Draft["defaults"]>>) =>
        setDraft((d) => (d ? { ...d, defaults: { ...d.defaults, ...p } } : d));

    const save = async () => {
        if (!draft) return;
        if (!draft.name.trim()) { message.warning("Name the template"); return; }
        setSaving(true);
        try {
            const body = {
                ...draft,
                defaults: {
                    ...draft.defaults,
                    blocks: (draft.defaults?.blocks || []).filter((b) => b.heading.trim() || b.body.trim()),
                },
            };
            if (draft._id) await updateQuotationTemplate(draft._id, body);
            else await createQuotationTemplate(body);
            message.success("Template saved");
            setDraft(null);
            refresh();
        } catch (err) {
            message.error(apiErrorMessage(err, "Couldn't save the template"));
        } finally {
            setSaving(false);
        }
    };

    const makeDefault = async (t: QuotationTemplate) => {
        try {
            await updateQuotationTemplate(t._id, { is_default: true });
            refresh();
        } catch (err) {
            message.error(apiErrorMessage(err, "Couldn't change the default template"));
        }
    };

    const remove = async (t: QuotationTemplate) => {
        try {
            await deleteQuotationTemplate(t._id);
            message.success("Template deleted");
            refresh();
        } catch (err) {
            message.error(apiErrorMessage(err, "Couldn't delete the template"));
        }
    };

    const blocks = draft?.defaults?.blocks || [];
    // A sample quote to preview the template with
    const sample = draft
        ? {
            ...newQuote(draft as QuotationTemplate),
            title: "Sample quote",
            quote_no: "QT-0000-00001",
            client: { name: "Sample client", phone: "0700 000 000" },
            sections: (draft.defaults?.section_titles?.length ? draft.defaults.section_titles : ["Charges"]).map((title) => ({
                title, vat_rate: 0, lines: [{ description: "Sample item", quantity: 1, unit_price: 100000 }],
            })),
        }
        : null;

    return (
        <Modal
            open={open}
            onCancel={() => { setDraft(null); onClose(); }}
            title={draft ? (draft._id ? `Edit template — ${draft.name}` : "New quotation template") : "Quotation templates"}
            width={760}
            footer={draft ? (
                <Space>
                    <Button onClick={() => setDraft(null)}>Back</Button>
                    <Button onClick={() => setPreviewOpen(true)}>Preview</Button>
                    <Button type="primary" loading={saving} onClick={save}>Save template</Button>
                </Space>
            ) : null}
            destroyOnHidden
        >
            {!draft ? (
                <>
                    <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
                        A template sets a quote's layout, header and footer banners, colours and starting text.
                        New quotes use the default template.
                    </Text>
                    <List
                        loading={isFetching}
                        dataSource={templates}
                        locale={{ emptyText: <Empty description="No templates yet. Quotes use the Sectioned layout until you add one." /> }}
                        renderItem={(t) => (
                            <List.Item
                                actions={[
                                    !t.is_default && <Button key="d" size="small" icon={<StarOutlined />} onClick={() => makeDefault(t)}>Make default</Button>,
                                    <Button key="e" size="small" icon={<EditOutlined />} onClick={() => setDraft({ ...t, defaults: { ...t.defaults } })}>Edit</Button>,
                                    <Popconfirm key="x" title="Delete this template?" description="Quotes made with it keep their layout." onConfirm={() => remove(t)}>
                                        <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete template" />
                                    </Popconfirm>,
                                ].filter(Boolean)}
                            >
                                <List.Item.Meta
                                    avatar={t.header_image
                                        ? <img src={t.header_image} alt="" style={{ width: 120, height: 32, objectFit: "contain" }} />
                                        : <div style={{ width: 120, height: 32, background: t.accent_color || "#1f5f99", borderRadius: 4 }} />}
                                    title={<Space>{t.name}{t.is_default && <Tag color="gold">Default</Tag>}</Space>}
                                    description={getLayout(t.layout).label}
                                />
                            </List.Item>
                        )}
                    />
                    <Button type="dashed" block icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => setDraft(blankTemplate())}>
                        New template
                    </Button>
                </>
            ) : (
                <div>
                    <Label>Name</Label>
                    <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Lift quote" />

                    <Label>Design</Label>
                    <LayoutPicker size="small" value={draft.layout} onChange={(layout) => setDraft({ ...draft, layout })} />
                    <Text type="secondary" style={{ fontSize: 12 }}>{getLayout(draft.layout).description}</Text>

                    <Label>Header banner (logo and contacts)</Label>
                    <ImageInput wide value={draft.header_image} onChange={(header_image) => setDraft({ ...draft, header_image })} label="Upload header" />
                    <Label>Footer banner</Label>
                    <ImageInput wide value={draft.footer_image} onChange={(footer_image) => setDraft({ ...draft, footer_image })} label="Upload footer" />

                    <Space size={24} style={{ marginTop: 4 }}>
                        <div>
                            <Label>Main colour</Label>
                            <ColorPicker value={draft.accent_color} onChange={(c) => setDraft({ ...draft, accent_color: c.toHexString() })} showText />
                        </div>
                        <div>
                            <Label>Highlight colour</Label>
                            <ColorPicker value={draft.secondary_color} onChange={(c) => setDraft({ ...draft, secondary_color: c.toHexString() })} showText />
                        </div>
                        <div>
                            <Label>Valid for (days)</Label>
                            <InputNumber min={1} value={draft.defaults?.validity_days} onChange={(v) => setDefaults({ validity_days: v ?? 30 })} />
                        </div>
                        <div>
                            <Label>Currency</Label>
                            <Input style={{ width: 90 }} value={draft.defaults?.currency} onChange={(e) => setDefaults({ currency: e.target.value })} />
                        </div>
                    </Space>

                    <Label>Introduction</Label>
                    <TextArea autoSize={{ minRows: 2 }} value={draft.defaults?.intro} onChange={(e) => setDefaults({ intro: e.target.value })} />

                    <Label>Price sections a new quote starts with</Label>
                    <Select
                        mode="tags"
                        style={{ width: "100%" }}
                        value={draft.defaults?.section_titles || []}
                        onChange={(section_titles) => setDefaults({ section_titles })}
                        placeholder="Type a section name and press Enter"
                        open={false}
                    />

                    <Label>Default notes and terms</Label>
                    {blocks.map((b, i) => (
                        <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, marginBottom: 8 }}>
                            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                <Input value={b.heading} placeholder="Heading" variant="borderless" style={{ fontWeight: 600, padding: 0 }}
                                    onChange={(e) => setDefaults({ blocks: blocks.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)) })} />
                                <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="Remove block"
                                    onClick={() => setDefaults({ blocks: blocks.filter((_, j) => j !== i) })} />
                            </Space>
                            <TextArea autoSize={{ minRows: 1 }} value={b.body} placeholder="Text"
                                onChange={(e) => setDefaults({ blocks: blocks.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} />
                        </div>
                    ))}
                    <Button size="small" icon={<PlusOutlined />} onClick={() => setDefaults({ blocks: [...blocks, { heading: "", body: "" }] })}>
                        Add block
                    </Button>
                </div>
            )}

            <QuotationPreview
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                quote={sample}
                template={draft as QuotationTemplate | null}
            />
        </Modal>
    );
};

export default TemplatesManager;
