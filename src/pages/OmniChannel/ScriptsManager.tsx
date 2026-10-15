import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Card,
    Col,
    Empty,
    Flex,
    Form,
    Grid,
    Input,
    Modal,
    Popconfirm,
    Row,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography,
    Upload,
    App,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ThunderboltOutlined,
    UploadOutlined,
    SearchOutlined,
    FileTextOutlined,
    CopyOutlined,
    ShopOutlined,
} from "@ant-design/icons";
import { ShopWhatsappMarketplace } from "@services/shops";
import { cardChrome, PageHeader, TONES, tintStyle, useMarketplace } from "./shared/ui";
import dayjs from "dayjs";
import {
    fetchScripts,
    createScript,
    updateScript,
    deleteScript,
    refineText,
    extractScriptFromFile,
    type Script,
} from "@services/whatsappService";
import TinyMCEInput from "@components/TinyMCEInput";

const { Text, Paragraph } = Typography;

interface Props {
    shopId: string;
    readOnly?: boolean;
    onSelect?: (script: Script) => void;
}

const stripHtml = (html: string) =>
    (html || "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim();

const MARKETPLACE_CATEGORY = "Marketplace";

// Ready-to-use replies for chat selling, built from the shop's marketplace
// settings so fees, amounts and options are accurate.
const marketplaceStarterScripts = (mp?: ShopWhatsappMarketplace) => {
    const list: { title: string; content: string }[] = [
        {
            title: "How to order on WhatsApp",
            content:
                "<p>You can order right here in WhatsApp 🛍️</p>" +
                "<p>• Reply <b>ORDER</b> to see our catalogue<br>• Reply with an item number to add it (e.g. <b>2</b> or <b>2 x3</b>)<br>• Reply <b>DONE</b> to check out and pay</p>" +
                "<p>Reply <b>MENU</b> anytime to see everything we can help with.</p>",
        },
        {
            title: "Paying with M-Pesa",
            content:
                "<p>At checkout you'll get our M-Pesa details 💳</p>" +
                "<p>Once you've paid, just paste the full M-Pesa confirmation SMS in this chat — your order is confirmed automatically with an order code.</p>",
        },
    ];
    const pickup = mp?.pickup_enabled !== false;
    const delivery = mp?.delivery_enabled !== false;
    if (pickup || delivery) {
        const fee = Number(mp?.delivery_fee) || 0;
        list.push({
            title: "Collection & delivery",
            content:
                "<p>Before you pay, you choose how to get your order:</p><p>" +
                (pickup ? "🏪 <b>Collect</b> at any of our shops — show your order code when you pick up<br>" : "") +
                (delivery
                    ? `🛵 <b>Delivery</b>${fee > 0 ? ` for Ksh ${fee}` : " (free)"}${mp?.delivery_note ? ` — ${mp.delivery_note}` : ""}. Share your location pin or type your address.`
                    : "") +
                "</p>",
        });
    }
    if (mp?.sell_gift_cards !== false) {
        const presets = mp?.gift_card_presets?.length ? mp.gift_card_presets : [1000, 2500, 5000];
        list.push({
            title: "Gift cards",
            content:
                "<p>Looking for a gift? 🎁 Reply <b>GIFT CARD</b>.</p>" +
                `<p>Pick an amount (${presets.map((p) => `Ksh ${p.toLocaleString()}`).join(", ")} or any amount), add the recipient's name and a message, pay — and you'll get a gift card you can forward straight to them.</p>`,
        });
    }
    if (mp?.sell_services !== false && mp?.booking_enabled !== false) {
        list.push({
            title: "Booking an appointment",
            content:
                "<p>Reply <b>BOOK</b> to book an appointment 📅</p>" +
                "<p>Choose the service and a day, then pick from the open time slots. You can confirm and pay at the shop" +
                (mp?.booking_require_payment ? "" : " or pay now to secure your slot") +
                ".</p>",
        });
    }
    list.push({
        title: "Order status & collection",
        content:
            "<p>Thanks for your order! 🙏 Please keep your <b>order code</b> — you'll need it when you collect or receive your order.</p>" +
            "<p>If anything changes we'll update you right here.</p>",
    });
    return list.map((s) => ({ ...s, category: MARKETPLACE_CATEGORY }));
};

const ScriptsManager: React.FC<Props> = ({ shopId, readOnly = false, onSelect }) => {
    const { message } = App.useApp();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const [editing, setEditing] = useState<Script | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [preview, setPreview] = useState<Script | null>(null);
    const [refineInstruction, setRefineInstruction] = useState("");
    const [search, setSearch] = useState("");
    const [extracting, setExtracting] = useState(false);
    const [category, setCategory] = useState<string | null>(null);
    const [addingStarters, setAddingStarters] = useState(false);
    const { enabled: marketplaceOn, config: mp } = useMarketplace(shopId);

    const { data, isLoading } = useQuery({
        queryKey: ["omnichannel-scripts", shopId],
        queryFn: () => fetchScripts({ shop_id: shopId }),
        enabled: !!shopId,
    });

    const scripts: Script[] = data?.scripts || [];

    const filteredScripts = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return scripts;
        return scripts.filter(
            (s) =>
                s.title?.toLowerCase().includes(q) ||
                s.category?.toLowerCase().includes(q) ||
                stripHtml(s.content).toLowerCase().includes(q)
        );
    }, [scripts, search]);

    const createMutation = useMutation({
        mutationFn: createScript,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["omnichannel-scripts"] });
            form.resetFields();
            setIsModalOpen(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, values }: { id: string; values: Partial<Script> }) =>
            updateScript(id, values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["omnichannel-scripts"] });
            form.resetFields();
            setEditing(null);
            setIsModalOpen(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteScript,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["omnichannel-scripts"] });
        },
    });

    const refineMutation = useMutation({
        mutationFn: (payload: { text: string; instruction: string }) => refineText(payload),
        onSuccess: (data: any) => {
            if (data?.result) {
                form.setFieldValue("content", data.result);
            }
        },
    });

    const handleSubmit = async (values: { title: string; content: string; category?: string }) => {
        if (editing) {
            await updateMutation.mutateAsync({
                id: editing._id,
                values: { title: values.title, content: values.content, category: values.category },
            });
        } else {
            await createMutation.mutateAsync({
                shop_id: shopId,
                title: values.title,
                content: values.content,
                category: values.category,
            });
        }
    };

    const handleAdd = () => {
        setEditing(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (script: Script) => {
        setEditing(script);
        form.setFieldsValue({
            title: script.title,
            content: script.content,
            category: script.category,
        });
        setIsModalOpen(true);
    };

    const handleFileUpload = async (file: File) => {
        setExtracting(true);
        try {
            const res = await extractScriptFromFile(file);
            if (res?.content) {
                setEditing(null);
                form.setFieldsValue({ title: res.title || "", content: res.content, category: undefined });
                setIsModalOpen(true);
                message.success("Text extracted — review and save the script");
            }
        } finally {
            setExtracting(false);
        }
    };

    const handleRowClick = (script: Script) => {
        if (readOnly) {
            if (onSelect) {
                onSelect(script);
            } else {
                setPreview(script);
            }
        }
    };

    const uploadButton = (
        <Upload
            accept=".pdf,.doc,.docx,.txt"
            showUploadList={false}
            beforeUpload={(file) => {
                handleFileUpload(file as File);
                return false;
            }}
        >
            <Button icon={<UploadOutlined />} loading={extracting}>
                Upload PDF / Doc
            </Button>
        </Upload>
    );

    const copyScript = async (script: Script) => {
        try {
            await navigator.clipboard.writeText(stripHtml(script.content));
            message.success("Copied — paste it into the chat");
        } catch {
            message.error("Couldn't copy to the clipboard");
        }
    };

    const categories = useMemo(
        () => [...new Set(scripts.map((s) => s.category).filter(Boolean) as string[])].sort(),
        [scripts]
    );
    const visibleScripts = category ? filteredScripts.filter((s) => s.category === category) : filteredScripts;

    // Starter scripts not yet added (matched by title).
    const existingTitles = new Set(scripts.map((s) => (s.title || "").trim().toLowerCase()));
    const starters = marketplaceOn
        ? marketplaceStarterScripts(mp).filter((s) => !existingTitles.has(s.title.toLowerCase()))
        : [];
    const addStarters = async (list: typeof starters) => {
        setAddingStarters(true);
        try {
            for (const s of list) {
                await createScript({ shop_id: shopId, title: s.title, content: s.content, category: s.category });
            }
            queryClient.invalidateQueries({ queryKey: ["omnichannel-scripts"] });
            message.success(`${list.length} script${list.length > 1 ? "s" : ""} added`);
        } finally {
            setAddingStarters(false);
        }
    };

    const renderCard = (script: Script) => (
        <Col xs={24} sm={12} xl={8} key={script._id}>
            <Card
                size="small"
                hoverable={readOnly}
                onClick={() => handleRowClick(script)}
                style={{ ...cardChrome, height: "100%", cursor: readOnly ? "pointer" : "default" }}
                styles={{ body: { display: "flex", flexDirection: "column", height: "100%", gap: 8, padding: 14 } }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <Space size={6} style={{ minWidth: 0 }}>
                        <FileTextOutlined style={{ color: script.category === MARKETPLACE_CATEGORY ? "#16a34a" : "#3b82f6" }} />
                        <Text strong ellipsis style={{ maxWidth: 220 }}>
                            {script.title}
                        </Text>
                    </Space>
                    {script.category && (
                        <Tag
                            color={script.category === MARKETPLACE_CATEGORY ? "green" : undefined}
                            style={{ marginInlineEnd: 0, flexShrink: 0 }}
                        >
                            {script.category}
                        </Tag>
                    )}
                </div>
                <Paragraph type="secondary" ellipsis={{ rows: 3 }} style={{ marginBottom: 0, fontSize: 12.5, flex: 1, whiteSpace: "pre-line" }}>
                    {stripHtml(script.content) || "—"}
                </Paragraph>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {script.updatedAt ? `Updated ${dayjs(script.updatedAt).format("MMM D, YYYY")}` : ""}
                    </Text>
                    <Space size={0} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Copy text">
                            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyScript(script)} />
                        </Tooltip>
                        {readOnly && onSelect ? (
                            <Button type="link" size="small" onClick={() => onSelect(script)}>
                                Use
                            </Button>
                        ) : !readOnly ? (
                            <>
                                <Tooltip title="Edit">
                                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(script)} />
                                </Tooltip>
                                <Popconfirm
                                    title="Delete script?"
                                    description="This can't be undone."
                                    okText="Delete"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => deleteMutation.mutate(script._id)}
                                >
                                    <Tooltip title="Delete">
                                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                    </Tooltip>
                                </Popconfirm>
                            </>
                        ) : null}
                    </Space>
                </div>
            </Card>
        </Col>
    );

    return (
        <div style={{ padding: readOnly ? 16 : (isMobile ? 12 : 24), height: "100%", overflowY: "auto" }}>
            {!readOnly && (
                <PageHeader
                    icon={<FileTextOutlined />}
                    {...TONES.blue}
                    title="Reply Scripts"
                    marketplace={marketplaceOn}
                    subtitle={`Reusable replies your team can drop into conversations · ${scripts.length} saved`}
                    extra={
                        <>
                            {uploadButton}
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                                New Script
                            </Button>
                        </>
                    }
                />
            )}

            {!readOnly && starters.length > 0 && (
                <Card
                    size="small"
                    style={{ ...cardChrome, marginBottom: 16, background: "linear-gradient(135deg,#f0fdf4 0%,#ffffff 70%)", borderColor: "#bbf7d0" }}
                    styles={{ body: { padding: 14 } }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                        <Space align="start" size={10}>
                            <ShopOutlined style={{ color: "#16a34a", fontSize: 18, marginTop: 2 }} />
                            <div>
                                <Text strong style={{ display: "block" }}>Marketplace starter scripts</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Ready replies for ordering, M-Pesa, collection & delivery, gift cards and bookings — written
                                    from your marketplace settings.
                                </Text>
                            </div>
                        </Space>
                        <Button type="primary" icon={<PlusOutlined />} loading={addingStarters} onClick={() => addStarters(starters)}
                            className="omni-btn-tint" style={{ ...tintStyle("#16a34a"), background: "#16a34a", borderColor: "#16a34a" }}>
                            Add all {starters.length}
                        </Button>
                    </div>
                    <Space size={6} wrap style={{ marginTop: 10 }}>
                        {starters.map((s) => (
                            <Button key={s.title} size="small" icon={<PlusOutlined />} disabled={addingStarters} onClick={() => addStarters([s])}>
                                {s.title}
                            </Button>
                        ))}
                    </Space>
                </Card>
            )}

            <Flex gap={10} wrap="wrap" align="center" style={{ marginBottom: 14 }}>
                <Input
                    allowClear
                    prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                    placeholder="Search scripts…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: isMobile ? "100%" : 300 }}
                />
                {categories.length > 0 && (
                    <Space size={4} wrap>
                        <Tag.CheckableTag checked={!category} onChange={() => setCategory(null)}>
                            All ({scripts.length})
                        </Tag.CheckableTag>
                        {categories.map((c) => (
                            <Tag.CheckableTag key={c} checked={category === c} onChange={() => setCategory(category === c ? null : c)}>
                                {c} ({scripts.filter((s) => s.category === c).length})
                            </Tag.CheckableTag>
                        ))}
                    </Space>
                )}
            </Flex>

            {isLoading ? (
                <div style={{ textAlign: "center", padding: 48 }}>
                    <Spin />
                </div>
            ) : visibleScripts.length === 0 ? (
                <Card size="small" style={cardChrome}>
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            scripts.length
                                ? "No scripts match your search"
                                : "No scripts yet — create one, upload a document" + (starters.length ? " or add the marketplace starters above" : "")
                        }
                    >
                        {!readOnly && !scripts.length && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                                New Script
                            </Button>
                        )}
                    </Empty>
                </Card>
            ) : (
                <Row gutter={[12, 12]}>{visibleScripts.map(renderCard)}</Row>
            )}

            <Modal
                title={editing ? "Edit Script" : "Add Script"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={createMutation.isLoading || updateMutation.isLoading}
                okText={editing ? "Save changes" : "Create script"}
                width={isMobile ? "94%" : 700}
                destroyOnClose
            >
                {!editing && (
                    <Flex justify="flex-end" style={{ marginBottom: 8 }}>
                        {uploadButton}
                    </Flex>
                )}
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="title"
                        label="Title"
                        rules={[{ required: true, message: "Title is required" }]}
                    >
                        <Input placeholder="e.g. Welcome message" />
                    </Form.Item>
                    <Form.Item
                        name="category"
                        label="Category"
                    >
                        <Input placeholder="e.g. Greetings" />
                    </Form.Item>
                    <Form.Item
                        name="content"
                        label="Script Content"
                        rules={[{ required: true, message: "Content is required" }]}
                    >
                        <TinyMCEInput
                            height={220}
                            placeholder="Type the script an agent can reference..."
                        />
                    </Form.Item>

                    <Form.Item noStyle>
                        <Space style={{ marginBottom: 24 }}>
                            <Input
                                placeholder="Refine instructions (optional)"
                                value={refineInstruction}
                                onChange={(e) => setRefineInstruction(e.target.value)}
                                style={{ width: 320 }}
                            />
                            <Button
                                icon={<ThunderboltOutlined />}
                                loading={refineMutation.isLoading}
                                onClick={() => {
                                    const current = form.getFieldValue("content");
                                    const instruction = refineInstruction.trim() ||
                                        "Make it more professional and friendly for WhatsApp";
                                    refineMutation.mutate({ text: current, instruction });
                                }}
                            >
                                Improve with AI
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={preview?.title}
                open={!!preview}
                onCancel={() => setPreview(null)}
                footer={[
                    <Button key="close" onClick={() => setPreview(null)}>
                        Close
                    </Button>,
                    onSelect && preview ? (
                        <Button
                            key="use"
                            type="primary"
                            onClick={() => {
                                onSelect(preview);
                                setPreview(null);
                            }}
                        >
                            Use Script
                        </Button>
                    ) : null,
                ]}
            >
                <div
                    className="script-preview"
                    dangerouslySetInnerHTML={{ __html: preview?.content || "" }}
                    style={{ whiteSpace: "pre-wrap", minHeight: 60 }}
                />
            </Modal>
        </div>
    );
};

export default ScriptsManager;
