import React, { useMemo, useState } from "react";
import {
    App,
    Button,
    Divider,
    Drawer,
    Empty,
    InputNumber,
    List,
    Segmented,
    Select,
    Space,
    Tag,
    Typography,
} from "antd";
import {
    CheckCircleOutlined,
    DeleteOutlined,
    GiftOutlined,
    MinusOutlined,
    PlusOutlined,
    SendOutlined,
    ShoppingCartOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import { fetchAllSellableItems } from "@services/products";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { ShopWhatsappMarketplace } from "@services/shops";
import { formatCurrency } from "@utils/formatters";
import { Conversation } from "./OmnichannelInboxPage";

const { Text } = Typography;

type LineKind = "inventory" | "service" | "giftcard";

interface OrderLine {
    key: string;
    kind: LineKind;
    product_id?: string | null;
    name: string;
    unit_price: number;
    quantity: number;
    stock?: number | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    conversation: Conversation;
    shopId: string;
    marketplace?: ShopWhatsappMarketplace;
    onOrderPlaced: () => void;
}

const ChatOrderDrawer: React.FC<Props> = ({
    open,
    onClose,
    conversation,
    shopId,
    marketplace,
    onOrderPlaced,
}) => {
    const { message: antMessage } = App.useApp();

    const [lines, setLines] = useState<OrderLine[]>([]);
    const [methodId, setMethodId] = useState<string | undefined>();
    const [sendingOffer, setSendingOffer] = useState(false);
    const [offerSent, setOfferSent] = useState(false);
    const [placing, setPlacing] = useState(false);
    const [placedOrder, setPlacedOrder] = useState<{ order_no: string; total: number } | null>(null);
    // Whether the picker lists inventory items or services.
    const [selectedKind, setSelectedKind] = useState<"inventory" | "service">("inventory");
    // Stable key per drawer session — lets the API dedupe a retried placement.
    const [idempotencyKey] = useState(() => crypto.randomUUID());

    const { data: sellable = [], isLoading: itemsLoading } = useQuery({
        queryKey: ["chat-order-sellable", shopId],
        queryFn: fetchAllSellableItems,
        enabled: open,
        staleTime: 60_000,
    });

    const { data: paymentMethods = [] } = useQuery({
        queryKey: ["paymentMethods"],
        queryFn: () => fetchAllPaymentMethods(),
        enabled: open,
        staleTime: 60_000,
    });

    const cfg = {
        sell_inventory: marketplace?.sell_inventory !== false,
        sell_services: marketplace?.sell_services !== false,
        sell_gift_cards: marketplace?.sell_gift_cards !== false,
        require_confirmation: marketplace?.require_confirmation !== false,
        confirmation_message:
            marketplace?.confirmation_message || "Reply YES to confirm your order.",
    };

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

    const total = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);

    // Direct placement (no customer confirmation required) needs a payment
    // method chosen by the agent. When confirmation is required the customer
    // picks the payment method and confirms in chat instead.
    const canPlace = lines.length > 0 && !!methodId && !placing && !placedOrder;
    const canSendOffer = lines.length > 0 && !sendingOffer && !offerSent;

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
                unit_price: 0,
                quantity: 1,
            },
        ]);
    };

    const updateLine = (key: string, patch: Partial<OrderLine>) =>
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

    const removeLine = (key: string) =>
        setLines((prev) => prev.filter((l) => l.key !== key));

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
                items: lines.map((l) => ({
                    kind: l.kind,
                    product_id: l.product_id || undefined,
                    quantity: l.quantity,
                    amount: l.kind === "giftcard" ? l.unit_price : undefined,
                })),
            });
            setOfferSent(true);
            antMessage.success("Order offer sent — waiting for the customer to confirm in chat");
            onOrderPlaced(); // refresh thread so the agent sees the offer
        } catch (error: any) {
            antMessage.error(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Failed to send the order offer"
            );
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
                    items: lines.map((l) => ({
                        kind: l.kind,
                        product_id: l.product_id || undefined,
                        quantity: l.quantity,
                        amount: l.kind === "giftcard" ? l.unit_price : undefined,
                    })),
                }
            );

            const orderNo =
                res.data?.order?.order_no || res.data?.order_no || "";
            const orderTotal = res.data?.order?.order_amount ?? total;
            setPlacedOrder({ order_no: orderNo, total: orderTotal });

            antMessage.success(`Order ${orderNo} placed`);
            onOrderPlaced();
        } catch (error: any) {
            antMessage.error(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Failed to place order"
            );
        } finally {
            setPlacing(false);
        }
    };

    const reset = () => {
        setLines([]);
        setMethodId(undefined);
        setOfferSent(false);
        setPlacedOrder(null);
    };

    return (
        <Drawer
            title={
                <Space>
                    <ShoppingCartOutlined style={{ color: "#25D366" }} />
                    <span>Sell in chat — {conversation.external_contact_name || "customer"}</span>
                </Space>
            }
            open={open}
            onClose={() => {
                reset();
                onClose();
            }}
            width={480}
            destroyOnClose
        >
            {placedOrder ? (
                <Space direction="vertical" size={16} style={{ width: "100%", textAlign: "center", paddingTop: 40 }}>
                    <CheckCircleOutlined style={{ fontSize: 56, color: "#52c41a" }} />
                    <div>
                        <Text strong style={{ fontSize: 16, display: "block" }}>
                            Order placed
                        </Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Confirmation sent to the customer with their order code.
                        </Text>
                    </div>
                    <Tag color="green" style={{ fontSize: 16, padding: "4px 16px" }}>
                        {placedOrder.order_no}
                    </Tag>
                    <Button
                        type="primary"
                        onClick={() => {
                            reset();
                            onClose();
                        }}
                    >
                        Done
                    </Button>
                </Space>
            ) : offerSent ? (
                <Space direction="vertical" size={16} style={{ width: "100%", textAlign: "center", paddingTop: 40 }}>
                    <SendOutlined style={{ fontSize: 56, color: "#25D366" }} />
                    <div>
                        <Text strong style={{ fontSize: 16, display: "block" }}>
                            Order offer sent
                        </Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            The customer picks a payment method and replies YES to
                            confirm — the order is placed automatically and their
                            order code is sent in this chat.
                        </Text>
                    </div>
                    <Button
                        type="primary"
                        onClick={() => {
                            reset();
                            onClose();
                        }}
                    >
                        Done
                    </Button>
                </Space>
            ) : (
                <Space direction="vertical" size={14} style={{ width: "100%" }}>
                    {/* What to sell — pick inventory or services first */}
                    {(cfg.sell_inventory || cfg.sell_services) && (
                        <Segmented
                            block
                            value={itemKind}
                            onChange={(v) => setSelectedKind(v as "inventory" | "service")}
                            options={[
                                ...(cfg.sell_inventory
                                    ? [{ label: "Inventory", value: "inventory" }]
                                    : []),
                                ...(cfg.sell_services
                                    ? [{ label: "Services", value: "service" }]
                                    : []),
                            ]}
                        />
                    )}

                    {/* Item picker */}
                    <Select
                        showSearch
                        placeholder={
                            itemKind === "service"
                                ? "Add a service…"
                                : "Add an inventory item…"
                        }
                        style={{ width: "100%" }}
                        loading={itemsLoading}
                        value={null}
                        onChange={(_, opt) => addLine(opt)}
                        filterOption={(input, option: any) =>
                            (option?.name || "").toLowerCase().includes(input.toLowerCase())
                        }
                        notFoundContent={
                            itemsLoading
                                ? "Loading…"
                                : itemKind === "service"
                                    ? "No services found"
                                    : "No inventory items found"
                        }
                        options={pickerOptions.map((o: any) => ({
                            value: o.value,
                            name: o.label,
                            item: o.item,
                            label: (
                                <Space size={6}>
                                    <span>{o.label}</span>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {formatCurrency(Number(o.item.price) || 0)}
                                    </Text>
                                </Space>
                            ),
                        }))}
                    />
                    {cfg.sell_gift_cards && (
                        <Button
                            icon={<GiftOutlined />}
                            onClick={addGiftCard}
                            size="small"
                        >
                            Add Gift Card
                        </Button>
                    )}

                    {/* Lines */}
                    {lines.length === 0 ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No items yet — add products, services or a gift card"
                        />
                    ) : (
                        <List
                            size="small"
                            dataSource={lines}
                            renderItem={(line) => (
                                <List.Item
                                    style={{ padding: "8px 0" }}
                                    actions={[
                                        <Button
                                            key="del"
                                            type="text"
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => removeLine(line.key)}
                                        />,
                                    ]}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Space size={6}>
                                            <Text strong style={{ fontSize: 13 }}>{line.name}</Text>
                                            {line.kind === "giftcard" && (
                                                <Tag icon={<GiftOutlined />} color="purple" style={{ fontSize: 10 }}>
                                                    Gift card
                                                </Tag>
                                            )}
                                            {line.kind === "inventory" && line.stock != null && (
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {line.stock} in stock
                                                </Text>
                                            )}
                                        </Space>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                            {line.kind === "giftcard" ? (
                                                <InputNumber
                                                    size="small"
                                                    min={1}
                                                    value={line.unit_price}
                                                    placeholder="Amount"
                                                    onChange={(v) =>
                                                        updateLine(line.key, { unit_price: Number(v) || 0 })
                                                    }
                                                    style={{ width: 130 }}
                                                />
                                            ) : (
                                                <>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        icon={<MinusOutlined />}
                                                        onClick={() =>
                                                            updateLine(line.key, {
                                                                quantity: Math.max(1, line.quantity - 1),
                                                            })
                                                        }
                                                    />
                                                    <Text style={{ fontSize: 13 }}>{line.quantity}</Text>
                                                    <Button
                                                        size="small"
                                                        type="text"
                                                        icon={<PlusOutlined />}
                                                        disabled={
                                                            line.kind === "inventory" &&
                                                            line.stock != null &&
                                                            line.quantity >= line.stock
                                                        }
                                                        onClick={() =>
                                                            updateLine(line.key, {
                                                                quantity: line.quantity + 1,
                                                            })
                                                        }
                                                    />
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        × {formatCurrency(line.unit_price)}
                                                    </Text>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <Text strong style={{ fontSize: 13 }}>
                                        {formatCurrency(line.unit_price * line.quantity)}
                                    </Text>
                                </List.Item>
                            )}
                        />
                    )}

                    <Divider style={{ margin: "4px 0" }} />

                    {/* Payment mode — only when the agent places directly.
                        Otherwise the customer picks it in chat. */}
                    {!cfg.require_confirmation && (
                        <div>
                            <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                                Payment mode
                            </Text>
                            <Select
                                placeholder="How will the customer pay?"
                                style={{ width: "100%" }}
                                value={methodId}
                                onChange={setMethodId}
                                options={(paymentMethods as any[]).map((m: any) => ({
                                    value: m._id,
                                    label: m.name,
                                }))}
                            />
                        </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text strong>Total</Text>
                        <Text strong style={{ fontSize: 16 }}>{formatCurrency(total)}</Text>
                    </div>

                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                        {cfg.require_confirmation ? (
                            <>
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    block
                                    disabled={!canSendOffer}
                                    loading={sendingOffer}
                                    onClick={handleSendOffer}
                                    style={{ background: "#25D366", borderColor: "#25D366" }}
                                >
                                    Send order to customer
                                </Button>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    The customer picks a payment method and replies YES —
                                    the order is placed and their order code is sent
                                    automatically in this chat.
                                </Text>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="primary"
                                    block
                                    icon={<CheckCircleOutlined />}
                                    disabled={!canPlace}
                                    loading={placing}
                                    onClick={handlePlaceOrder}
                                    style={{ background: "#25D366", borderColor: "#25D366" }}
                                >
                                    Place order
                                </Button>
                                {!methodId && lines.length > 0 && (
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        Select a payment mode to place the order.
                                    </Text>
                                )}
                            </>
                        )}
                    </Space>
                </Space>
            )}
        </Drawer>
    );
};

export default ChatOrderDrawer;
