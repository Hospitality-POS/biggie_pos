import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Form, Grid, Input, Row, Space, Spin, Switch, Tag, Typography } from "antd";
import {
    CalendarOutlined,
    CheckCircleOutlined,
    GiftOutlined,
    PlusOutlined,
    RobotOutlined,
    SaveOutlined,
    ShoppingCartOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";
import {
    fetchWelcomeMessage,
    saveWelcomeMessage,
    refineText,
    type WelcomeMessage,
} from "@services/whatsappService";
import { cardChrome, PageHeader, TONES, useMarketplace } from "./shared/ui";

const { Text } = Typography;

interface Props {
    shopId: string;
}

const MAX_LEN = 1000;

// Ready-made openers — {shop} is replaced with the shop's name.
const TEMPLATES: { key: string; label: string; text: string }[] = [
    {
        key: "friendly",
        label: "Friendly",
        text: "Hi, welcome to {shop}! Thanks for reaching out. How can we help you today?",
    },
    {
        key: "hours",
        label: "With hours",
        text: "Hello and welcome to {shop}!\nWe reply Mon–Sat, 8am–6pm. Leave your question here and we'll get back to you shortly.",
    },
    {
        key: "busy",
        label: "Busy period",
        text: "Hi there! Thanks for messaging {shop}. We're attending to other customers right now and will reply as soon as possible",
    },
];

// Lines that tell customers the chat can sell/book for them — each maps to
// a keyword the WhatsApp assistant understands.
const MARKETPLACE_LINES = [
    { key: "menu", icon: <RobotOutlined />, label: "MENU", line: "Reply *MENU* to see everything we can do for you" },
    { key: "order", icon: <ShoppingCartOutlined />, label: "ORDER", line: "Reply *ORDER* to shop and pay right here in WhatsApp" },
    { key: "gift", icon: <GiftOutlined />, label: "GIFT CARD", line: "Reply *GIFT CARD* to send someone a gift card" },
    { key: "book", icon: <CalendarOutlined />, label: "BOOK", line: "Reply *BOOK* to book an appointment" },
];

const toPlain = (s: string) =>
    (s || "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&");

// WhatsApp-style *bold* / _italic_ in the preview bubble.
const renderWhatsappText = (text: string) =>
    text.split("\n").map((line, i) => (
        <div key={i} style={{ minHeight: "1.2em" }}>
            {line.split(/(\*[^*]+\*|_[^_]+_)/g).map((part, j) =>
                /^\*[^*]+\*$/.test(part) ? (
                    <b key={j}>{part.slice(1, -1)}</b>
                ) : /^_[^_]+_$/.test(part) ? (
                    <i key={j}>{part.slice(1, -1)}</i>
                ) : (
                    <React.Fragment key={j}>{part}</React.Fragment>
                )
            )}
        </div>
    ));

const WelcomeMessageManager: React.FC<Props> = ({ shopId }) => {
    const { message: toast } = App.useApp();
    const queryClient = useQueryClient();
    const isMobile = !Grid.useBreakpoint().md;
    const [form] = Form.useForm();
    const { enabled: marketplaceOn, config: mp, shopName } = useMarketplace(shopId);

    const { data, isLoading } = useQuery({
        queryKey: ["omnichannel-welcome-message", shopId],
        queryFn: () => fetchWelcomeMessage({ shop_id: shopId }),
        enabled: !!shopId,
    });

    const welcome = data?.welcome as WelcomeMessage | null | undefined;
    const messageVal: string = Form.useWatch("message", form) || "";
    const isActive: boolean = Form.useWatch("is_active", form) ?? true;
    const plain = toPlain(messageVal);

    useEffect(() => {
        form.setFieldsValue({
            message: welcome?.message || "",
            is_active: welcome ? !!welcome.is_active : true,
        });
    }, [welcome, form]);

    const saveMutation = useMutation({
        mutationFn: saveWelcomeMessage,
        onSuccess: () => {
            toast.success("Welcome message saved");
            queryClient.invalidateQueries({ queryKey: ["omnichannel-welcome-message"] });
        },
    });

    const [refineInstruction, setRefineInstruction] = useState("");
    const refineMutation = useMutation({
        mutationFn: (payload: { text: string; instruction: string }) => refineText(payload),
        onSuccess: (res: any) => {
            if (res?.result) form.setFieldValue("message", res.result);
        },
    });

    const setMessage = (text: string) => form.setFieldValue("message", text);
    const appendLine = (line: string) => {
        const current = plain.trimEnd();
        if (current.includes(line)) return;
        setMessage(current ? `${current}\n${line}` : line);
    };

    // Which keywords the shop actually supports.
    const availableLines = MARKETPLACE_LINES.filter((l) => {
        if (l.key === "gift") return mp?.sell_gift_cards !== false;
        if (l.key === "book") return mp?.sell_services !== false && mp?.booking_enabled !== false;
        if (l.key === "order") return mp?.sell_inventory !== false || mp?.sell_services !== false;
        return true;
    });
    const missingKeywords = marketplaceOn && !/\b(MENU|ORDER)\b/i.test(plain);

    const handleSubmit = (values: { message: string; is_active: boolean }) => {
        saveMutation.mutate({ shop_id: shopId, message: values.message, is_active: values.is_active });
    };

    return (
        <div style={{ padding: isMobile ? 12 : 20, height: "100%", overflowY: "auto" }}>
            <PageHeader
                icon={<RobotOutlined />}
                {...TONES.indigo}
                title="Automated Welcome Message"
                marketplace={marketplaceOn}
                subtitle="Sent automatically the first time a customer messages you on WhatsApp"
                extra={
                    welcome ? (
                        <Tag color={welcome.is_active ? "green" : "default"} icon={welcome.is_active ? <CheckCircleOutlined /> : undefined}>
                            {welcome.is_active ? "Live" : "Off"}
                        </Tag>
                    ) : (
                        <Tag>Not set up</Tag>
                    )
                }
            />

            {isLoading ? (
                <div style={{ textAlign: "center", padding: 60 }}>
                    <Spin />
                </div>
            ) : (
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={14}>
                        <Card size="small" style={cardChrome} styles={{ body: { padding: isMobile ? 14 : 18 } }}>
                            <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ message: "", is_active: true }}>
                                <div style={{ marginBottom: 12 }}>
                                    <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                                        Start from a template
                                    </Text>
                                    <Space size={6} wrap>
                                        {TEMPLATES.map((t) => (
                                            <Button
                                                key={t.key}
                                                size="small"
                                                onClick={() => setMessage(t.text.replace("{shop}", shopName || "our shop"))}
                                            >
                                                {t.label}
                                            </Button>
                                        ))}
                                    </Space>
                                </div>

                                <Form.Item
                                    name="message"
                                    label="Welcome message"
                                    rules={[
                                        { required: true, message: "Please enter a welcome message" },
                                        {
                                            validator: (_, v) =>
                                                toPlain(v || "").length > MAX_LEN
                                                    ? Promise.reject(new Error(`Keep it under ${MAX_LEN} characters`))
                                                    : Promise.resolve(),
                                        },
                                    ]}
                                    extra={
                                        <Text type={plain.length > MAX_LEN ? "danger" : "secondary"} style={{ fontSize: 11 }}>
                                            {plain.length}/{MAX_LEN} · use *bold* and _italic_ like in WhatsApp
                                        </Text>
                                    }
                                >
                                    <Input.TextArea
                                        autoSize={{ minRows: 6, maxRows: 14 }}
                                        placeholder="Hi! Welcome to our shop. How can we help you today?"
                                        style={{ fontSize: 14 }}
                                    />
                                </Form.Item>

                                {marketplaceOn && (
                                    <div
                                        style={{
                                            background: "#f0fdf4",
                                            border: "1px solid #bbf7d0",
                                            borderRadius: 10,
                                            padding: 12,
                                            marginBottom: 16,
                                        }}
                                    >
                                        <Text strong style={{ fontSize: 12, display: "block" }}>
                                            Tell customers they can shop in chat
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                                            Each line adds a keyword the WhatsApp assistant answers automatically.
                                        </Text>
                                        <Space size={6} wrap>
                                            {availableLines.map((l) => {
                                                const added = plain.includes(l.line);
                                                return (
                                                    <Button
                                                        key={l.key}
                                                        size="small"
                                                        icon={added ? <CheckCircleOutlined /> : <PlusOutlined />}
                                                        disabled={added}
                                                        onClick={() => appendLine(l.line)}
                                                    >
                                                        {l.label}
                                                    </Button>
                                                );
                                            })}
                                        </Space>
                                    </div>
                                )}

                                <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
                                    <Input
                                        placeholder="How should AI improve it? (optional)"
                                        value={refineInstruction}
                                        onChange={(e) => setRefineInstruction(e.target.value)}
                                    />
                                    <Button
                                        icon={<ThunderboltOutlined />}
                                        loading={refineMutation.isLoading}
                                        disabled={!plain.trim()}
                                        onClick={() =>
                                            refineMutation.mutate({
                                                text: form.getFieldValue("message"),
                                                instruction:
                                                    refineInstruction.trim() ||
                                                    "Make it warm, short and friendly for WhatsApp. Keep any *KEYWORD* lines exactly as they are.",
                                            })
                                        }
                                    >
                                        Improve with AI
                                    </Button>
                                </Space.Compact>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                    <Form.Item name="is_active" valuePropName="checked" noStyle>
                                        <Switch checkedChildren="On" unCheckedChildren="Off" />
                                    </Form.Item>
                                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saveMutation.isLoading}>
                                        Save welcome message
                                    </Button>
                                </div>
                            </Form>
                        </Card>
                    </Col>

                    {/* Live preview — what the customer sees */}
                    <Col xs={24} lg={10}>
                        <Card
                            size="small"
                            style={cardChrome}
                            title={<Text strong style={{ fontSize: 13 }}>Customer preview</Text>}
                            styles={{ body: { padding: 0 } }}
                        >
                            <div style={{ background: "#075e54", color: "#fff", padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>
                                {shopName || "Your shop"}
                            </div>
                            <div
                                style={{
                                    background: "#ece5dd",
                                    padding: 14,
                                    minHeight: 260,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                }}
                            >
                                <div style={{ alignSelf: "flex-end", background: "#dcf8c6", borderRadius: "8px 8px 2px 8px", padding: "6px 10px", fontSize: 12, maxWidth: "75%" }}>
                                    Hi
                                </div>
                                {plain.trim() ? (
                                    <div
                                        style={{
                                            alignSelf: "flex-start",
                                            background: "#fff",
                                            borderRadius: "8px 8px 8px 2px",
                                            padding: "8px 10px",
                                            fontSize: 12.5,
                                            lineHeight: 1.45,
                                            maxWidth: "88%",
                                            opacity: isActive ? 1 : 0.5,
                                            boxShadow: "0 1px 1px rgba(0,0,0,0.06)",
                                        }}
                                    >
                                        {renderWhatsappText(plain.trim())}
                                    </div>
                                ) : (
                                    <Text type="secondary" style={{ fontSize: 12, textAlign: "center", marginTop: 40 }}>
                                        Your message will appear here
                                    </Text>
                                )}
                                {!isActive && plain.trim() && (
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        Off — customers won't receive this until you switch it on.
                                    </Text>
                                )}
                            </div>
                        </Card>
                        {missingKeywords && (
                            <Alert
                                type="info"
                                showIcon
                                style={{ marginTop: 12, borderRadius: 10 }}
                                message="Customers don't know they can shop in chat"
                                description="Add a MENU or ORDER line so new customers discover ordering, gift cards and bookings."
                            />
                        )}
                    </Col>
                </Row>
            )}
        </div>
    );
};

export default WelcomeMessageManager;
