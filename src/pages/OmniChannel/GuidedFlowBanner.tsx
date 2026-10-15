import React from "react";
import { App, Button, Grid, Popconfirm, Space, Steps, Tag, Tooltip, Typography } from "antd";
import {
    CalendarOutlined,
    GiftOutlined,
    RobotOutlined,
    ShoppingCartOutlined,
    UserSwitchOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelGuidedFlow, fetchFlowState, FlowState } from "@services/omnichannel/marketplace";
import { formatCurrency } from "@utils/formatters";

const { Text } = Typography;

interface Props {
    conversationId: string;
    onChanged?: () => void;
}

// Progress rail per flow. Step keys come from the backend; several keys can
// land on the same visual step (payment_proof and confirm are both "Pay").
type Rail = { title: string; keys: string[] }[];

const ORDER_RAILS: Record<string, Rail> = {
    selfserve: [
        { title: "Browse", keys: ["browse"] },
        { title: "Collect / deliver", keys: ["fulfilment", "pickup_shop", "delivery_shortage", "delivery_address"] },
        { title: "Payment", keys: ["payment"] },
        { title: "Pay & confirm", keys: ["payment_proof", "confirm"] },
    ],
    giftcard: [
        { title: "Amount", keys: ["gift_amount"] },
        { title: "Recipient", keys: ["gift_recipient"] },
        { title: "Payment", keys: ["payment"] },
        { title: "Pay & confirm", keys: ["payment_proof", "confirm"] },
    ],
    booking_payment: [
        { title: "Slot chosen", keys: [] },
        { title: "Payment", keys: ["payment"] },
        { title: "Pay & confirm", keys: ["payment_proof", "confirm"] },
    ],
    offer: [
        { title: "Offer sent", keys: [] },
        { title: "Collect / deliver", keys: ["fulfilment", "pickup_shop", "delivery_shortage", "delivery_address"] },
        { title: "Payment", keys: ["payment"] },
        { title: "Pay & confirm", keys: ["payment_proof", "confirm"] },
    ],
    hub: [{ title: "Menu", keys: ["hub"] }],
};

const BOOKING_RAILS: Record<string, Rail> = {
    standalone: [
        { title: "Service", keys: ["service"] },
        { title: "Day", keys: ["date"] },
        { title: "Time", keys: ["slot"] },
        { title: "Confirm", keys: ["confirm"] },
    ],
    post_order: [
        { title: "Paid", keys: [] },
        { title: "Day", keys: ["date"] },
        { title: "Time", keys: ["slot"] },
        { title: "Confirm", keys: ["confirm"] },
    ],
};

const flowMeta = (state: Exclude<FlowState, { active: false }>) => {
    if (state.kind === "booking") {
        return { icon: <CalendarOutlined />, color: "#7c3aed", bg: "#f5f3ff", title: "Booking an appointment" };
    }
    if (state.flow === "giftcard") {
        return { icon: <GiftOutlined />, color: "#c026d3", bg: "#fdf4ff", title: "Buying a gift card" };
    }
    if (state.flow === "hub") {
        return { icon: <RobotOutlined />, color: "#0284c7", bg: "#f0f9ff", title: "Viewing the menu" };
    }
    if (state.flow === "booking_payment") {
        return { icon: <CalendarOutlined />, color: "#7c3aed", bg: "#f5f3ff", title: "Paying for a booking" };
    }
    return { icon: <ShoppingCartOutlined />, color: "#16a34a", bg: "#f0fdf4", title: "Placing an order" };
};

const GuidedFlowBanner: React.FC<Props> = ({ conversationId, onChanged }) => {
    const { message: antMessage } = App.useApp();
    const queryClient = useQueryClient();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const { data: state } = useQuery({
        queryKey: ["marketplace-flow", conversationId],
        queryFn: () => fetchFlowState(conversationId),
        refetchInterval: 5_000,
        staleTime: 3_000,
        retry: false,
    });

    const takeOver = useMutation({
        mutationFn: () => cancelGuidedFlow(conversationId, true),
        onSuccess: () => {
            antMessage.success("You've taken over — the assistant has stopped for this chat");
            queryClient.invalidateQueries({ queryKey: ["marketplace-flow", conversationId] });
            onChanged?.();
        },
        onError: (err: any) =>
            antMessage.error(err?.response?.data?.message || "Couldn't stop the flow"),
    });

    if (!state?.active) return null;

    const meta = flowMeta(state);
    const rail =
        state.kind === "booking"
            ? BOOKING_RAILS[state.flow] || BOOKING_RAILS.post_order
            : ORDER_RAILS[state.flow] || ORDER_RAILS.offer;
    const current = Math.max(
        0,
        rail.findIndex((s) => s.keys.includes(state.step))
    );

    const detail =
        state.kind === "booking"
            ? [
                  state.services.map((s) => s.name).join(", "),
                  state.date_label,
                  state.start_time,
                  state.order_no ? `Order ${state.order_no}` : null,
              ]
                  .filter(Boolean)
                  .join(" · ")
            : [
                  state.items.length
                      ? `${state.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}`
                      : null,
                  state.items.length ? formatCurrency(state.total) : null,
                  state.fulfilment?.label,
                  state.method_name,
                  state.payment_ref ? `Ref ${state.payment_ref}` : null,
              ]
                  .filter(Boolean)
                  .join(" · ");

    return (
        <div
            style={{
                borderBottom: "1px solid #f0f0f0",
                background: meta.bg,
                padding: isMobile ? "8px 10px" : "8px 16px",
                flexShrink: 0,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                    style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: "#fff",
                        color: meta.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                    }}
                >
                    {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Space size={6} wrap>
                        <Tag
                            icon={<RobotOutlined />}
                            color="blue"
                            style={{ fontSize: 10, marginInlineEnd: 0 }}
                        >
                            Assistant
                        </Tag>
                        <Text strong style={{ fontSize: 13, color: meta.color }}>
                            {meta.title}
                        </Text>
                    </Space>
                    <Text
                        type="secondary"
                        style={{ fontSize: 12, display: "block" }}
                        ellipsis={{ tooltip: detail || state.step_label }}
                    >
                        {state.step_label}
                        {detail ? ` — ${detail}` : ""}
                    </Text>
                </div>
                <Popconfirm
                    title="Take over this chat?"
                    description="The assistant stops and the customer is told a team member is continuing."
                    okText="Take over"
                    onConfirm={() => takeOver.mutate()}
                >
                    <Tooltip title="Stop the assistant and reply yourself">
                        <Button size="small" icon={<UserSwitchOutlined />} loading={takeOver.isLoading}>
                            {isMobile ? null : "Take over"}
                        </Button>
                    </Tooltip>
                </Popconfirm>
            </div>
            {!isMobile && rail.length > 1 && (
                <Steps
                    size="small"
                    progressDot
                    current={current}
                    style={{ marginTop: 8, maxWidth: 560 }}
                    items={rail.map((s) => ({ title: <span style={{ fontSize: 11 }}>{s.title}</span> }))}
                />
            )}
        </div>
    );
};

export default GuidedFlowBanner;
