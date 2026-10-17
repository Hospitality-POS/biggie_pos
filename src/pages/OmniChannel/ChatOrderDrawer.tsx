import React, { useMemo, useState } from "react";
import {
    App,
    Button,
    Drawer,
    Empty,
    Grid,
    Input,
    InputNumber,
    Segmented,
    Select,
    Space,
    Steps,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import {
    AppstoreOutlined,
    ArrowLeftOutlined,
    ArrowRightOutlined,
    CalendarOutlined,
    CarOutlined,
    CheckCircleFilled,
    CheckCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    GiftOutlined,
    MinusOutlined,
    PlusOutlined,
    RobotOutlined,
    SearchOutlined,
    SendOutlined,
    ShopOutlined,
    ShoppingCartOutlined,
    ToolOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import { fetchAllSellableItems } from "@services/products";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { ShopWhatsappMarketplace } from "@services/shops";
import { GuidedFlow, startGuidedFlow } from "@services/omnichannel/marketplace";
import { formatCurrency } from "@utils/formatters";
import { Conversation } from "./OmnichannelInboxPage";
import { ContactAvatar, tintStyle } from "./shared/ui";

const { Text, Paragraph } = Typography;

type LineKind = "inventory" | "service" | "giftcard";
type Mode = "guide" | "build";

interface OrderLine {
    key: string;
    kind: LineKind;
    product_id?: string | null;
    name: string;
    unit_price: number;
    quantity: number;
    stock?: number | null;
    recipient_name?: string;
    gift_message?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    conversation: Conversation;
    shopId: string;
    marketplace?: ShopWhatsappMarketplace;
    onOrderPlaced: () => void;
}

const WA_GREEN = "#25D366";
const DEFAULT_GIFT_PRESETS = [1000, 2500, 5000];

// One card per guided flow — the preview is the first message the customer
// receives, so the agent knows exactly what they're sending.
const FLOW_CARDS: {
    key: GuidedFlow;
    title: string;
    description: string;
    preview: string;
    icon: React.ReactNode;
    color: string;
}[] = [
    {
        key: "hub",
        title: "Full menu",
        description: "Let the customer choose: shop, gift card, booking or talk to you.",
        preview: "Hi, welcome! What can I help you with today?\n1. Shop  2. Gift card  3. Book…",
        icon: <AppstoreOutlined />,
        color: "#0284c7",
    },
    {
        key: "shop",
        title: "Shop the catalogue",
        description: "Numbered catalogue → cart → payment → order code.",
        preview: "Sure, here's what we have.\n1. … — Ksh …\nReply with an item number to add it",
        icon: <ShoppingCartOutlined />,
        color: "#16a34a",
    },
    {
        key: "giftcard",
        title: "Buy a gift card",
        description: "Amount → recipient & message → payment → card code to forward.",
        preview: "Lovely, a gift card. How much would you like to put on it?\n1. Ksh 1,000  2. Ksh 2,500 …",
        icon: <GiftOutlined />,
        color: "#c026d3",
    },
    {
        key: "booking",
        title: "Book an appointment",
        description: "Service → day → open time slots → confirm, pay now or at the shop.",
        preview: "Happy to book you in. Which service would you like?\n1. … — Ksh … (60 min)",
        icon: <CalendarOutlined />,
        color: "#7c3aed",
    },
];

const ChatOrderDrawer: React.FC<Props> = ({
    open,
    onClose,
    conversation,
    shopId,
    marketplace,
    onOrderPlaced,
}) => {
    const { message: antMessage } = App.useApp();
    const isMobile = !Grid.useBreakpoint().md;
    const queryClient = useQueryClient();

    const [mode, setMode] = useState<Mode>("guide");
    const [buildStep, setBuildStep] = useState<0 | 1>(0);
    const [lines, setLines] = useState<OrderLine[]>([]);
    const [methodId, setMethodId] = useState<string | undefined>();
    // Collect or delivery — chosen here only when the agent places the order
    // directly; with confirmation on, the customer picks it in chat.
    const [fulfilmentMethod, setFulfilmentMethod] = useState<"collect" | "delivery">("collect");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [sendingOffer, setSendingOffer] = useState(false);
    const [offerSent, setOfferSent] = useState(false);
    const [placing, setPlacing] = useState(false);
    const [placedOrder, setPlacedOrder] = useState<{ order_no: string; total: number } | null>(null);
    const [startingFlow, setStartingFlow] = useState<GuidedFlow | null>(null);
    const [flowStarted, setFlowStarted] = useState<GuidedFlow | null>(null);
    // Whether the picker lists inventory items or services.
    const [selectedKind, setSelectedKind] = useState<"inventory" | "service">("inventory");
    // Stable key per drawer session — lets the API dedupe a retried placement.
    const [idempotencyKey] = useState(() => crypto.randomUUID());

    const { data: sellable = [], isLoading: itemsLoading } = useQuery({
        queryKey: ["chat-order-sellable", shopId],
        queryFn: fetchAllSellableItems,
        enabled: open && mode === "build",
        staleTime: 60_000,
    });

    const { data: paymentMethods = [] } = useQuery({
        queryKey: ["paymentMethods"],
        queryFn: () => fetchAllPaymentMethods(),
        enabled: open && mode === "build",
        staleTime: 60_000,
    });

    const cfg = {
        sell_inventory: marketplace?.sell_inventory !== false,
        sell_services: marketplace?.sell_services !== false,
        sell_gift_cards: marketplace?.sell_gift_cards !== false,
        booking_enabled:
            marketplace?.sell_services !== false && marketplace?.booking_enabled !== false,
        require_confirmation: marketplace?.require_confirmation !== false,
        confirmation_message:
            marketplace?.confirmation_message || "Reply YES to confirm your order.",
        gift_presets: marketplace?.gift_card_presets?.length
            ? marketplace.gift_card_presets
            : DEFAULT_GIFT_PRESETS,
        pickup_enabled: marketplace?.pickup_enabled !== false,
        delivery_enabled: marketplace?.delivery_enabled !== false,
        delivery_fee: Number(marketplace?.delivery_fee) || 0,
    };

    const availableFlows = FLOW_CARDS.filter((f) => {
        if (f.key === "shop") return cfg.sell_inventory || cfg.sell_services;
        if (f.key === "giftcard") return cfg.sell_gift_cards;
        if (f.key === "booking") return cfg.booking_enabled;
        return true;
    });

    // Fall back to whichever kind is enabled when only one is configured.
    const itemKind: "inventory" | "service" =
        !cfg.sell_inventory && cfg.sell_services
            ? "service"
            : !cfg.sell_services && cfg.sell_inventory
                ? "inventory"
                : selectedKind;

    const pickerOptions = useMemo(() => {
        return (sellable as any[])
            .filter((it) =>
                it.type === "service" ? cfg.sell_services : cfg.sell_inventory
            )
            .filter((it) => (it.type === "service") === (itemKind === "service"))
            .map((it) => ({
                value: `${it.type === "service" ? "svc" : "inv"}:${it._id}`,
                label: it.name,
                item: it,
            }));
    }, [sellable, cfg.sell_inventory, cfg.sell_services, itemKind]);

    const itemsTotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
    const invalidGiftCard = lines.some((l) => l.kind === "giftcard" && !(l.unit_price > 0));
    const hasServices = lines.some((l) => l.kind === "service");
    // Physical items need collect/delivery; gift cards and services don't.
    const needsFulfilment = lines.some((l) => l.kind === "inventory");
    const fulfilmentChoices = [
        ...(cfg.pickup_enabled ? ["collect" as const] : []),
        ...(cfg.delivery_enabled ? ["delivery" as const] : []),
    ];
    const effectiveFulfilment =
        fulfilmentChoices.length === 1 ? fulfilmentChoices[0] : fulfilmentMethod;
    const isDelivery = needsFulfilment && effectiveFulfilment === "delivery";
    const deliveryFee = isDelivery && !cfg.require_confirmation ? cfg.delivery_fee : 0;
    const total = itemsTotal + deliveryFee;

    // Direct placement (no customer confirmation required) needs a payment
    // method chosen by the agent. When confirmation is required the customer
    // picks the payment method and confirms in chat instead.
    const canReview = lines.length > 0 && !invalidGiftCard;
    const missingAddress = isDelivery && !deliveryAddress.trim();
    const canPlace = canReview && !!methodId && !missingAddress && !placing && !placedOrder;
    const canSendOffer = canReview && !sendingOffer && !offerSent;

    const addLine = (opt: any) => {
        const it = opt?.item;
        if (!it) return;
        const kind: LineKind = it.type === "service" ? "service" : "inventory";
        const key = `${kind}:${it._id}`;
        setLines((prev) => {
            const existing = prev.find((l) => l.key === key);
            if (existing) {
                return prev.map((l) =>
                    l.key === key ? { ...l, quantity: l.quantity + 1 } : l
                );
            }
            return [
                ...prev,
                {
                    key,
                    kind,
                    product_id: it._id,
                    name: it.name,
                    unit_price: Number(it.price) || 0,
                    quantity: 1,
                    stock: kind === "inventory" ? it.quantity ?? null : null,
                },
            ];
        });
    };

    const addGiftCard = () => {
        setLines((prev) => [
            ...prev,
            {
                key: `giftcard:${Date.now()}`,
                kind: "giftcard",
                product_id: null,
                name: "Gift Card",
                unit_price: cfg.gift_presets[0] || 0,
                quantity: 1,
            },
        ]);
    };

    const updateLine = (key: string, patch: Partial<OrderLine>) =>
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

    const removeLine = (key: string) =>
        setLines((prev) => prev.filter((l) => l.key !== key));

    const orderItemsPayload = () =>
        lines.map((l) => ({
            kind: l.kind,
            product_id: l.product_id || undefined,
            quantity: l.quantity,
            amount: l.kind === "giftcard" ? l.unit_price : undefined,
            recipient_name: l.kind === "giftcard" ? l.recipient_name || undefined : undefined,
            gift_message: l.kind === "giftcard" ? l.gift_message || undefined : undefined,
        }));

    const apiError = (error: any, fallback: string) =>
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        fallback;

    const refreshThread = () => {
        queryClient.invalidateQueries({ queryKey: ["marketplace-flow", conversation._id] });
        onOrderPlaced();
    };

    // Hands the conversation to the assistant — the customer gets the first
    // step now and their replies are walked through to a finished sale,
    // gift card or booking by the webhook.
    const handleStartFlow = async (flow: GuidedFlow) => {
        setStartingFlow(flow);
        try {
            await startGuidedFlow(conversation._id, flow);
            setFlowStarted(flow);
            refreshThread();
        } catch (error: any) {
            antMessage.error(apiError(error, "Couldn't start the guided flow"));
        } finally {
            setStartingFlow(null);
        }
    };

    // Sends the order offer — the backend stores it on the conversation and
    // messages the customer the summary with numbered payment options. Their
    // reply (payment pick → YES/NO) places or cancels the order in the
    // webhook; the confirmation + order code land in this thread.
    const handleSendOffer = async () => {
        if (!lines.length) {
            antMessage.error("Add at least one item first");
            return;
        }
        setSendingOffer(true);
        try {
            await axiosInstance.post(`${BASE_URL}/omnichannel/marketplace/offer`, {
                conversation_id: conversation._id,
                items: orderItemsPayload(),
            });
            setOfferSent(true);
            refreshThread(); // refresh thread so the agent sees the offer
        } catch (error: any) {
            antMessage.error(apiError(error, "Failed to send the order offer"));
        } finally {
            setSendingOffer(false);
        }
    };

    const handlePlaceOrder = async () => {
        setPlacing(true);
        try {
            // Single server-side call: builds the cart, validates stock,
            // deducts inventory, records the payment method, issues gift
            // cards and sends the customer their order code in this thread.
            const res = await axiosInstance.post(
                `${BASE_URL}/omnichannel/marketplace/orders`,
                {
                    conversation_id: conversation._id,
                    method_id: methodId,
                    customer_id: conversation.customer_id || undefined,
                    customer_name:
                        conversation.external_contact_name || "WhatsApp Customer",
                    customer_phone: conversation.external_contact_phone || undefined,
                    idempotency_key: idempotencyKey,
                    items: orderItemsPayload(),
                    fulfilment: needsFulfilment
                        ? {
                              method: effectiveFulfilment,
                              address: isDelivery ? deliveryAddress.trim() : undefined,
                          }
                        : undefined,
                }
            );

            const orderNo =
                res.data?.order?.order_no || res.data?.order_no || "";
            const orderTotal = res.data?.order?.order_amount ?? total;
            setPlacedOrder({ order_no: orderNo, total: orderTotal });

            antMessage.success(`Order ${orderNo} placed`);
            refreshThread();
        } catch (error: any) {
            antMessage.error(apiError(error, "Failed to place order"));
        } finally {
            setPlacing(false);
        }
    };

    const reset = () => {
        setLines([]);
        setMethodId(undefined);
        setFulfilmentMethod("collect");
        setDeliveryAddress("");
        setOfferSent(false);
        setPlacedOrder(null);
        setFlowStarted(null);
        setBuildStep(0);
    };

    const closeDrawer = () => {
        reset();
        onClose();
    };


    // ── Layout helpers ────────────────────────────────────────────────────
    const firstName = (conversation.external_contact_name || "").trim().split(/\s+/)[0] || "customer";
    const section: React.CSSProperties = {
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 14,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
    };
    const sectionTitle = (text: string, extra?: React.ReactNode) => (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text strong style={{ fontSize: 13, color: "#0f172a" }}>{text}</Text>
            {extra}
        </div>
    );
    const kindTile = (kind: LineKind) => {
        const k = {
            inventory: { icon: <ShoppingCartOutlined />, color: "#16a34a", bg: "#f0fdf4" },
            service: { icon: <ToolOutlined />, color: "#7c3aed", bg: "#f5f3ff" },
            giftcard: { icon: <GiftOutlined />, color: "#c026d3", bg: "#fdf4ff" },
        }[kind];
        return (
            <div
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: k.bg,
                    color: k.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 15,
                }}
            >
                {k.icon}
            </div>
        );
    };
    const greenBtn = { className: "omni-btn-tint", style: { ...tintStyle(WA_GREEN), background: WA_GREEN, borderColor: WA_GREEN, borderRadius: 10, fontWeight: 600 } };

    // ── Result screens ────────────────────────────────────────────────────
    const resultScreen = (
        icon: React.ReactNode,
        color: string,
        title: string,
        body: string,
        extra?: React.ReactNode
    ) => (
        <div style={{ ...section, textAlign: "center", padding: "32px 20px", marginTop: 8 }}>
            <div
                style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: `${color}1a`,
                    color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 34,
                    margin: "0 auto 14px",
                }}
            >
                {icon}
            </div>
            <Text strong style={{ fontSize: 17, display: "block", color: "#0f172a" }}>{title}</Text>
            <Paragraph type="secondary" style={{ fontSize: 13, margin: "6px auto 0", maxWidth: 360 }}>{body}</Paragraph>
            {extra && <div style={{ marginTop: 14 }}>{extra}</div>}
            <Space style={{ marginTop: 20 }}>
                <Button onClick={reset} style={{ borderRadius: 10 }}>Start another</Button>
                <Button type="primary" onClick={closeDrawer} {...greenBtn}>
                    Back to chat
                </Button>
            </Space>
        </div>
    );

    const renderResult = () => {
        if (placedOrder) {
            return resultScreen(
                <CheckCircleOutlined />,
                "#16a34a",
                "Order placed",
                hasServices
                    ? "Confirmation sent with the order code — the assistant is now asking for an appointment time."
                    : `${firstName} has been sent the confirmation and order code.`,
                <Tag color="green" style={{ fontSize: 16, padding: "4px 16px", borderRadius: 8 }}>
                    {placedOrder.order_no}
                </Tag>
            );
        }
        if (offerSent) {
            return resultScreen(
                <SendOutlined />,
                WA_GREEN,
                "Order sent to " + firstName,
                "The assistant takes it from here: payment method → pay → confirm. The order is placed automatically — follow each step in the banner at the top of the chat."
            );
        }
        if (flowStarted) {
            const card = FLOW_CARDS.find((f) => f.key === flowStarted);
            return resultScreen(
                <RobotOutlined />,
                card?.color || WA_GREEN,
                `Assistant is guiding ${firstName}`,
                `"${card?.title}" was sent. Every reply is handled until the ${
                    flowStarted === "booking" ? "appointment is booked" : flowStarted === "giftcard" ? "gift card is issued" : "sale is complete"
                }. Track it in the chat banner, or tap "Take over" there to step in.`
            );
        }
        return null;
    };

    // ── Mode picker ───────────────────────────────────────────────────────
    const modeCard = (key: Mode, icon: React.ReactNode, title: string, desc: string) => {
        const active = mode === key;
        return (
            <button
                type="button"
                onClick={() => setMode(key)}
                style={{
                    textAlign: "left",
                    cursor: "pointer",
                    background: active ? "#f0fdf4" : "#fff",
                    border: `1.5px solid ${active ? WA_GREEN : "#e2e8f0"}`,
                    borderRadius: 14,
                    padding: "12px 12px 10px",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    position: "relative",
                }}
            >
                <span
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        background: active ? WA_GREEN : "#f1f5f9",
                        color: active ? "#fff" : "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </span>
                <span style={{ minWidth: 0 }}>
                    <Text strong style={{ fontSize: 13, display: "block", color: "#0f172a" }}>{title}</Text>
                    <Text style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.35, display: "block" }}>{desc}</Text>
                </span>
                {active && <CheckCircleFilled style={{ position: "absolute", top: 8, right: 8, color: WA_GREEN }} />}
            </button>
        );
    };

    // ── Guide mode ────────────────────────────────────────────────────────
    const renderGuide = () => (
        <>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                {availableFlows.map((f) => (
                    <div key={f.key} style={{ ...section, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 9,
                                    background: `${f.color}1a`,
                                    color: f.color,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                {f.icon}
                            </span>
                            <Text strong style={{ fontSize: 13, color: "#0f172a" }}>{f.title}</Text>
                        </div>
                        <Text style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.4 }}>{f.description}</Text>
                        {/* What the customer receives */}
                        <div style={{ background: "#efeae2", borderRadius: 10, padding: 8, flex: 1, display: "flex", alignItems: "flex-start" }}>
                            <div
                                style={{
                                    marginLeft: "auto",
                                    background: "#d9fdd3",
                                    borderRadius: "8px 2px 8px 8px",
                                    padding: "6px 8px",
                                    fontSize: 11,
                                    lineHeight: 1.45,
                                    color: "#111b21",
                                    whiteSpace: "pre-line",
                                    boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)",
                                    maxWidth: "95%",
                                }}
                            >
                                {f.preview}
                            </div>
                        </div>
                        <Button
                            type="primary"
                            block
                            icon={<SendOutlined />}
                            loading={startingFlow === f.key}
                            disabled={!!startingFlow && startingFlow !== f.key}
                            onClick={() => handleStartFlow(f.key)}
                            className="omni-btn-tint"
                            style={{ ...tintStyle(f.color), background: f.color, borderColor: f.color, borderRadius: 10 }}
                        >
                            Send to {firstName}
                        </Button>
                    </div>
                ))}
            </div>
            <Text style={{ fontSize: 11.5, color: "#94a3b8", display: "block", marginTop: 12, textAlign: "center" }}>
                Customers can start these themselves too — <Text code>MENU</Text> <Text code>ORDER</Text>{" "}
                <Text code>GIFT CARD</Text> <Text code>BOOK</Text>
            </Text>
        </>
    );

    // ── Build mode: one cart line ─────────────────────────────────────────
    const renderLine = (line: OrderLine, editable: boolean) => (
        <div key={line.key} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: "1px solid #f1f5f9", alignItems: "flex-start" }}>
            {kindTile(line.kind)}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <Text strong style={{ fontSize: 13, color: "#0f172a" }} ellipsis>
                        {line.kind === "giftcard" ? `Gift card${line.recipient_name ? ` for ${line.recipient_name}` : ""}` : line.name}
                    </Text>
                    <Text strong style={{ fontSize: 13, flexShrink: 0 }}>{formatCurrency(line.unit_price * line.quantity)}</Text>
                </div>

                {editable && line.kind === "giftcard" ? (
                    <Space direction="vertical" size={6} style={{ width: "100%", marginTop: 6 }}>
                        <Space size={4} wrap>
                            {cfg.gift_presets.map((amt) => (
                                <Tag.CheckableTag
                                    key={amt}
                                    checked={line.unit_price === amt}
                                    onChange={() => updateLine(line.key, { unit_price: amt })}
                                    style={{ border: "1px solid #e5e7eb", borderRadius: 999, padding: "1px 10px" }}
                                >
                                    {formatCurrency(amt)}
                                </Tag.CheckableTag>
                            ))}
                            <InputNumber
                                size="small"
                                min={1}
                                value={line.unit_price || null}
                                placeholder="Other"
                                onChange={(v) => updateLine(line.key, { unit_price: Number(v) || 0 })}
                                style={{ width: 100, borderRadius: 999 }}
                            />
                        </Space>
                        <Input
                            size="small"
                            placeholder="Recipient name (optional)"
                            maxLength={60}
                            value={line.recipient_name}
                            onChange={(e) => updateLine(line.key, { recipient_name: e.target.value })}
                        />
                        <Input
                            size="small"
                            placeholder="Gift message, e.g. Happy birthday! (optional)"
                            maxLength={200}
                            value={line.gift_message}
                            onChange={(e) => updateLine(line.key, { gift_message: e.target.value })}
                        />
                    </Space>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, gap: 8 }}>
                        <Text style={{ fontSize: 11.5, color: "#64748b" }}>
                            {formatCurrency(line.unit_price)} each
                            {line.kind === "inventory" && line.stock != null ? ` · ${line.stock} in stock` : ""}
                            {!editable && line.gift_message ? ` · “${line.gift_message}”` : ""}
                        </Text>
                        {editable ? (
                            <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", borderRadius: 999, padding: 2 }}>
                                <Button
                                    size="small"
                                    type="text"
                                    shape="circle"
                                    icon={line.quantity === 1 ? <DeleteOutlined style={{ color: "#ef4444" }} /> : <MinusOutlined />}
                                    onClick={() =>
                                        line.quantity === 1
                                            ? removeLine(line.key)
                                            : updateLine(line.key, { quantity: line.quantity - 1 })
                                    }
                                />
                                <Text strong style={{ fontSize: 13, minWidth: 22, textAlign: "center" }}>{line.quantity}</Text>
                                <Button
                                    size="small"
                                    type="text"
                                    shape="circle"
                                    icon={<PlusOutlined />}
                                    disabled={line.kind === "inventory" && line.stock != null && line.quantity >= line.stock}
                                    onClick={() => updateLine(line.key, { quantity: line.quantity + 1 })}
                                />
                            </div>
                        ) : (
                            <Text style={{ fontSize: 12, color: "#64748b" }}>× {line.quantity}</Text>
                        )}
                    </div>
                )}
            </div>
            {editable && line.kind === "giftcard" && (
                <Tooltip title="Remove">
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeLine(line.key)} />
                </Tooltip>
            )}
        </div>
    );

    // ── Build mode: step 1 — items ────────────────────────────────────────
    const renderItemsStep = () => (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <div style={section}>
                {sectionTitle("Add items")}
                {(cfg.sell_inventory || cfg.sell_services) && (
                    <>
                        {cfg.sell_inventory && cfg.sell_services && (
                            <Segmented
                                block
                                value={itemKind}
                                onChange={(v) => setSelectedKind(v as "inventory" | "service")}
                                options={[
                                    { label: <Space size={6}><ShoppingCartOutlined />Products</Space>, value: "inventory" },
                                    { label: <Space size={6}><ToolOutlined />Services</Space>, value: "service" },
                                ]}
                                style={{ marginBottom: 8 }}
                            />
                        )}
                        <Select
                            showSearch
                            size="large"
                            suffixIcon={<SearchOutlined />}
                            placeholder={itemKind === "service" ? "Search services…" : "Search products…"}
                            style={{ width: "100%" }}
                            loading={itemsLoading}
                            value={null}
                            onChange={(_, opt) => addLine(opt)}
                            filterOption={(input, option: any) =>
                                (option?.name || "").toLowerCase().includes(input.toLowerCase())
                            }
                            notFoundContent={
                                itemsLoading ? "Loading…" : itemKind === "service" ? "No services found" : "No products found"
                            }
                            options={pickerOptions.map((o: any) => ({
                                value: o.value,
                                name: o.label,
                                item: o.item,
                                label: (
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
                                        <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
                                            {formatCurrency(Number(o.item.price) || 0)}
                                        </Text>
                                    </div>
                                ),
                            }))}
                        />
                    </>
                )}
                {cfg.sell_gift_cards && (
                    <Button icon={<GiftOutlined />} onClick={addGiftCard} block type="dashed" style={{ marginTop: 8, borderRadius: 10 }}>
                        Add a gift card
                    </Button>
                )}
            </div>

            <div style={section}>
                {sectionTitle(
                    "Cart",
                    lines.length ? (
                        <Text style={{ fontSize: 12, color: "#64748b" }}>
                            {lines.reduce((s, l) => s + l.quantity, 0)} item{lines.reduce((s, l) => s + l.quantity, 0) === 1 ? "" : "s"}
                        </Text>
                    ) : null
                )}
                {lines.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<Text type="secondary" style={{ fontSize: 12.5 }}>Search above to add products, services or a gift card</Text>}
                        style={{ margin: "8px 0" }}
                    />
                ) : (
                    <div style={{ marginBottom: -10 }}>{lines.map((l) => renderLine(l, true))}</div>
                )}
            </div>
        </Space>
    );

    // ── Build mode: step 2 — review & send ────────────────────────────────
    const renderReviewStep = () => (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <div style={section}>
                {sectionTitle(
                    "Order summary",
                    <Button size="small" type="link" icon={<EditOutlined />} onClick={() => setBuildStep(0)} style={{ padding: 0 }}>
                        Edit
                    </Button>
                )}
                <div>{lines.map((l) => renderLine(l, false))}</div>
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, marginTop: 2 }}>
                    {deliveryFee > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <Text style={{ fontSize: 12.5, color: "#64748b" }}>Delivery fee</Text>
                            <Text style={{ fontSize: 12.5 }}>{formatCurrency(deliveryFee)}</Text>
                        </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text strong>Total</Text>
                        <Text strong style={{ fontSize: 16 }}>{formatCurrency(total)}</Text>
                    </div>
                </div>
            </div>

            {/* Collect or delivery — the agent decides only when placing
                directly; otherwise the customer is asked in chat. */}
            {needsFulfilment && !cfg.require_confirmation && fulfilmentChoices.length > 0 && (
                <div style={section}>
                    {sectionTitle("How does the customer get it?")}
                    {fulfilmentChoices.length > 1 && (
                        <Segmented
                            block
                            value={effectiveFulfilment}
                            onChange={(v) => setFulfilmentMethod(v as "collect" | "delivery")}
                            options={[
                                { label: <Space size={6}><ShopOutlined />Collect</Space>, value: "collect" },
                                {
                                    label: (
                                        <Space size={6}>
                                            <CarOutlined />
                                            Delivery{cfg.delivery_fee > 0 ? ` (+${formatCurrency(cfg.delivery_fee)})` : ""}
                                        </Space>
                                    ),
                                    value: "delivery",
                                },
                            ]}
                        />
                    )}
                    {isDelivery && (
                        <Input.TextArea
                            rows={2}
                            style={{ marginTop: 8, borderRadius: 10 }}
                            maxLength={300}
                            placeholder="Delivery address, e.g. Kilimani, Argwings Kodhek Rd, Apt 4B"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            status={missingAddress ? "warning" : undefined}
                        />
                    )}
                </div>
            )}

            {!cfg.require_confirmation && (
                <div style={section}>
                    {sectionTitle("Payment mode")}
                    <Select
                        size="large"
                        placeholder="How will the customer pay?"
                        style={{ width: "100%" }}
                        value={methodId}
                        onChange={setMethodId}
                        options={(paymentMethods as any[]).map((m: any) => ({ value: m._id, label: m.name }))}
                    />
                </div>
            )}

            {/* What happens next — so the agent knows the customer's path */}
            <div style={section}>
                {sectionTitle("What happens next")}
                <Steps
                    direction="vertical"
                    size="small"
                    current={-1}
                    items={[
                        ...(cfg.require_confirmation
                            ? [
                                  { title: `${firstName} gets the summary`, description: "With numbered options to reply to" },
                                  ...(needsFulfilment
                                      ? [{
                                            title: "Chooses collect or delivery",
                                            description: cfg.delivery_fee > 0
                                                ? `Delivery adds ${formatCurrency(cfg.delivery_fee)} and asks for an address or location pin`
                                                : "Delivery asks for an address or location pin",
                                        }]
                                      : []),
                                  { title: "Picks payment & pays", description: "M-Pesa SMS is checked automatically" },
                                  { title: "Order placed", description: "Order code sent in this chat" },
                              ]
                            : [{
                                  title: "Order placed now",
                                  description: needsFulfilment
                                      ? isDelivery
                                          ? "Order code + delivery details sent in this chat"
                                          : "Order code sent — customer collects at the shop"
                                      : "Order code sent in this chat",
                              }]),
                        ...(lines.some((l) => l.kind === "giftcard")
                            ? [{ title: "Gift card issued", description: "A forwardable card with the code" }]
                            : []),
                        ...(hasServices && cfg.booking_enabled
                            ? [{ title: "Appointment booked", description: "Assistant offers open time slots" }]
                            : []),
                    ]}
                />
            </div>
        </Space>
    );

    const result = renderResult();

    // ── Pinned footer: total + the next action ────────────────────────────
    const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
    const footer =
        result || mode !== "build" ? null : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {buildStep === 1 && (
                    <Button icon={<ArrowLeftOutlined />} onClick={() => setBuildStep(0)} style={{ borderRadius: 10 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>
                        {itemCount ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "No items yet"}
                    </Text>
                    <Text strong style={{ fontSize: 18, color: "#0f172a", lineHeight: 1.2 }}>
                        {formatCurrency(buildStep === 1 ? total : itemsTotal)}
                    </Text>
                    {buildStep === 0 && invalidGiftCard && (
                        <Text type="danger" style={{ fontSize: 11, display: "block" }}>Set an amount for each gift card</Text>
                    )}
                    {buildStep === 1 && !cfg.require_confirmation && (!methodId || missingAddress) && (
                        <Text type="warning" style={{ fontSize: 11, display: "block" }}>
                            {!methodId ? "Choose a payment mode" : "Add the delivery address"}
                        </Text>
                    )}
                </div>
                {buildStep === 0 ? (
                    <Button type="primary" size="large" disabled={!canReview} onClick={() => setBuildStep(1)} {...greenBtn}>
                        Review <ArrowRightOutlined />
                    </Button>
                ) : cfg.require_confirmation ? (
                    <Button
                        type="primary"
                        size="large"
                        icon={<SendOutlined />}
                        disabled={!canSendOffer}
                        loading={sendingOffer}
                        onClick={handleSendOffer}
                        {...greenBtn}
                    >
                        Send to {firstName}
                    </Button>
                ) : (
                    <Button
                        type="primary"
                        size="large"
                        icon={<CheckCircleOutlined />}
                        disabled={!canPlace}
                        loading={placing}
                        onClick={handlePlaceOrder}
                        {...greenBtn}
                    >
                        Place order
                    </Button>
                )}
            </div>
        );

    const header = (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <ContactAvatar
                    size={38}
                    name={conversation.external_contact_name || conversation.external_contact_phone}
                    seed={conversation.external_contact_id}
                    badgeColor={WA_GREEN}
                    badgeIcon={<ShoppingCartOutlined />}
                />
                <div style={{ minWidth: 0 }}>
                    <Text strong style={{ fontSize: 15, color: "#0f172a", display: "block" }} ellipsis>
                        Sell to {conversation.external_contact_name || "customer"}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: "#64748b" }} ellipsis>
                        {conversation.external_contact_phone ? `+${String(conversation.external_contact_phone).replace(/\D/g, "")} · ` : ""}
                        Orders, gift cards & bookings in WhatsApp
                    </Text>
                </div>
            </div>
            <Button size="small" type="text" onClick={closeDrawer} style={{ color: "#64748b", fontWeight: 600, fontSize: 13 }}>
                ✕
            </Button>
        </div>
    );

    return (
        <Drawer
            title={header}
            closeIcon={null}
            open={open}
            onClose={closeDrawer}
            width={isMobile ? "100%" : 540}
            destroyOnClose
            footer={footer}
            styles={{
                header: { padding: "12px 16px", background: "#fff", borderBottom: "1px solid #eef2f6" },
                body: { background: "#f8fafc", padding: 16 },
                footer: { padding: "12px 16px", background: "#fff", borderTop: "1px solid #eef2f6" },
            }}
        >
            {result || (
                <Space direction="vertical" size={14} style={{ width: "100%" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {modeCard("guide", <RobotOutlined />, "Let the assistant guide", `${firstName} replies, AI finishes the sale`)}
                        {modeCard("build", <ShoppingCartOutlined />, "Build the order", "Pick items, then send or place it")}
                    </div>
                    {mode === "guide" ? (
                        renderGuide()
                    ) : (
                        <>
                            <Steps
                                size="small"
                                current={buildStep}
                                onChange={(s) => (s === 0 || canReview ? setBuildStep(s as 0 | 1) : undefined)}
                                items={[{ title: "Items" }, { title: cfg.require_confirmation ? "Review & send" : "Review & place" }]}
                            />
                            {buildStep === 0 ? renderItemsStep() : renderReviewStep()}
                        </>
                    )}
                </Space>
            )}
        </Drawer>
    );
};

export default ChatOrderDrawer;
