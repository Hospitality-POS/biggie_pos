import { useEffect, useState } from "react";
import { ProTable } from "@ant-design/pro-components";
import { Button, DatePicker, Rate, Select, Typography } from "antd";
import {
    CheckCircleOutlined, ReloadOutlined, StarFilled, UserOutlined,
} from "@ant-design/icons";
import { fetchAllFeedback } from "@services/customers";
import dayjs from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    orange: "#f59e0b",
    blue: "#3b82f6",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

// ── CSS-only pills ─────────────────────────────────────────────────────────
const pill = (bg: string, color: string, border: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    borderRadius: 5, padding: "2px 8px",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
    background: bg, color, border: `1px solid ${border}`,
});

// ── Rating badge ───────────────────────────────────────────────────────────
const RatingBadge = ({ rating }: { rating: number }) => {
    const color =
        rating >= 4 ? C.green :
            rating >= 3 ? C.orange : C.red;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Rate
                disabled value={rating} count={5}
                character={<StarFilled />}
                style={{ fontSize: 11, color }}
            />
            <Text style={{ fontSize: 11, color, fontWeight: 600 }}>{rating.toFixed(1)}</Text>
        </div>
    );
};

// ── Type badge ─────────────────────────────────────────────────────────────
const TypeBadge = ({ type }: { type: string }) => (
    type === "authenticated"
        ? <span style={pill("#eff6ff", C.blue, "#bfdbfe")}><CheckCircleOutlined />Customer</span>
        : <span style={pill(C.bg, C.subText, C.border)}>Anonymous</span>
);

// ── Interface ──────────────────────────────────────────────────────────────
interface Feedback {
    _id: string;
    customer_id?: { customer_name: string; email: string; phone: string };
    anonymous_customer?: { name?: string; email?: string; phone?: string };
    shop_id?: { shop_name: string };
    feedback_type: "authenticated" | "anonymous";
    rating: number;
    review?: string;
    customer_display_name: string;
    is_verified: boolean;
    visit_date: string;
    createdAt: string;
    updatedAt: string;
}

// ── Component ──────────────────────────────────────────────────────────────
const FeedbackTable: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);
    const [feedbackType, setFeedbackType] = useState<string>("all");
    const [dateRange, setDateRange] = useState<[string, string] | null>(null);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (feedbackType !== "all") params.feedback_type = feedbackType;
            if (dateRange) { params.start_date = dateRange[0]; params.end_date = dateRange[1]; }
            const res = await fetchAllFeedback(params);
            setFeedbackData(res.feedback || []);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFeedback(); }, [feedbackType, dateRange]);

    // ── Columns ──────────────────────────────────────────────────────────────
    const columns = [
        {
            title: "Customer", dataIndex: "customer_display_name", key: "customer", width: 200,
            render: (text: string, record: Feedback) => {
                const email = record.feedback_type === "authenticated"
                    ? record.customer_id?.email
                    : record.anonymous_customer?.email;
                return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <UserOutlined style={{
                                fontSize: 11,
                                color: record.feedback_type === "authenticated" ? C.blue : C.subText,
                            }} />
                            <Text strong style={{ fontSize: 12 }}>{text}</Text>
                        </div>
                        {email && (
                            <Text style={{ fontSize: 11, color: C.subText, paddingLeft: 16 }}>{email}</Text>
                        )}
                    </div>
                );
            },
        },
        {
            title: "Type", dataIndex: "feedback_type", key: "feedback_type", width: 120,
            render: (type: string) => <TypeBadge type={type} />,
        },
        {
            title: "Rating", dataIndex: "rating", key: "rating", width: 200,
            sorter: (a: Feedback, b: Feedback) => a.rating - b.rating,
            render: (rating: number) => <RatingBadge rating={rating} />,
        },
        {
            title: "Review", dataIndex: "review", key: "review",
            ellipsis: { showTitle: true },
            render: (review: string) =>
                review
                    ? <Text style={{ fontSize: 12 }}>{review}</Text>
                    : <Text style={{ fontSize: 12, color: C.subText, fontStyle: "italic" }}>No review</Text>,
        },
        {
            title: "Contact", key: "contact", width: 140,
            render: (_: any, record: Feedback) => {
                const phone = record.feedback_type === "authenticated"
                    ? record.customer_id?.phone
                    : record.anonymous_customer?.phone;
                return phone
                    ? <Text copyable style={{ fontSize: 12 }}>{phone}</Text>
                    : <Text style={{ fontSize: 12, color: C.subText, fontStyle: "italic" }}>—</Text>;
            },
        },
        {
            title: "Date", dataIndex: "createdAt", key: "createdAt", width: 150,
            sorter: (a: Feedback, b: Feedback) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            render: (date: string) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Text style={{ fontSize: 12 }}>{dayjs(date).format("DD MMM YYYY")}</Text>
                    <Text style={{ fontSize: 11, color: C.subText }}>{dayjs(date).format("hh:mm A")}</Text>
                </div>
            ),
        },
    ];

    // ── Stats ─────────────────────────────────────────────────────────────────
    const avgRating = feedbackData.length > 0
        ? (feedbackData.reduce((s, i) => s + i.rating, 0) / feedbackData.length).toFixed(1)
        : "—";

    const ratingColor =
        Number(avgRating) >= 4 ? C.green :
            Number(avgRating) >= 3 ? C.orange : C.red;

    return (
        <ProTable<Feedback>
            columns={columns}
            dataSource={feedbackData}
            loading={loading}
            rowKey="_id"
            search={false}
            cardBordered={false}
            size="small"
            options={false}
            pagination={{
                defaultPageSize: 10, showSizeChanger: true,
                showTotal: (total) => `${total} review${total !== 1 ? "s" : ""}`,
            }}
            headerTitle={
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <StarFilled style={{ color: ratingColor, fontSize: 16 }} />
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>
                            Avg {avgRating}
                        </Text>
                    </div>
                    <Text style={{ fontSize: 12, color: C.subText }}>
                        {feedbackData.length} review{feedbackData.length !== 1 ? "s" : ""}
                    </Text>
                </div>
            }
            toolbar={{
                actions: [
                    <Select
                        key="type"
                        value={feedbackType}
                        onChange={setFeedbackType}
                        style={{ width: 140, borderRadius: 8 }}
                        options={[
                            { label: "All Feedback", value: "all" },
                            { label: "Customers", value: "authenticated" },
                            { label: "Anonymous", value: "anonymous" },
                        ]}
                    />,
                    <RangePicker
                        key="dates"
                        format="DD MMM YYYY"
                        style={{ borderRadius: 8 }}
                        onChange={(dates) => {
                            setDateRange(dates
                                ? [dates[0]?.format("YYYY-MM-DD") || "", dates[1]?.format("YYYY-MM-DD") || ""]
                                : null
                            );
                        }}
                    />,
                    <Button
                        key="reload"
                        icon={<ReloadOutlined />}
                        onClick={fetchFeedback}
                        style={{ borderRadius: 8 }}
                    />,
                ],
            }}
        />
    );
};

export default FeedbackTable;