import { useEffect, useState } from "react";
import { ProTable } from "@ant-design/pro-components";
import {
    Button, DatePicker, Form, Input, Modal, Select, Tooltip, Typography,
} from "antd";
import {
    CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
    EditOutlined, ExclamationCircleOutlined, UserOutlined,
} from "@ant-design/icons";
import { fetchAllConsultations, updateConsultationStatus } from "@services/consultation";
import { getAllProducts } from "@services/products";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    orange: "#f59e0b",
    purple: "#8b5cf6",
    cyan: "#06b6d4",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── CSS-only badges ────────────────────────────────────────────────────────
const pill = (bg: string, color: string, border: string): React.CSSProperties => ({
    display: "inline-block", borderRadius: 5, padding: "2px 8px",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
    background: bg, color, border: `1px solid ${border}`,
});

const STATUS_CFG: Record<string, { bg: string; color: string; border: string; icon?: React.ReactNode }> = {
    pending: { bg: "#fffbeb", color: C.orange, border: "#fde68a", icon: <ClockCircleOutlined /> },
    confirmed: { bg: "#eff6ff", color: C.blue, border: "#bfdbfe" },
    completed: { bg: "#f0fdf4", color: C.green, border: "#bbf7d0", icon: <CheckCircleOutlined /> },
    cancelled: { bg: "#fef2f2", color: C.red, border: "#fecaca", icon: <CloseCircleOutlined /> },
    no_show: { bg: C.bg, color: C.subText, border: C.border, icon: <ExclamationCircleOutlined /> },
};

// Dynamic services — cycle through colour slots for any product _id
const SERVICE_COLORS = [
    { bg: "#faf5ff", color: C.purple, border: "#e9d5ff" },
    { bg: "#ecfeff", color: C.cyan, border: "#a5f3fc" },
    { bg: "#fdf4ff", color: "#c026d3", border: "#f0abfc" },
    { bg: "#eff6ff", color: C.blue, border: "#bfdbfe" },
    { bg: "#f0fdf4", color: C.green, border: "#bbf7d0" },
    { bg: "#fffbeb", color: C.orange, border: "#fde68a" },
];
const serviceColorCache: Record<string, typeof SERVICE_COLORS[0]> = {};
let serviceColorIdx = 0;
const getServiceColor = (key: string) => {
    if (!serviceColorCache[key]) {
        serviceColorCache[key] = SERVICE_COLORS[serviceColorIdx % SERVICE_COLORS.length];
        serviceColorIdx++;
    }
    return serviceColorCache[key];
};

const StatusTag = ({ status }: { status: string }) => {
    const s = STATUS_CFG[status] ?? STATUS_CFG.no_show;
    return (
        <span style={{ ...pill(s.bg, s.color, s.border), display: "inline-flex", alignItems: "center", gap: 4 }}>
            {s.icon && <span style={{ fontSize: 10 }}>{s.icon}</span>}
            {status.replace(/_/g, " ").toUpperCase()}
        </span>
    );
};

const ServiceTag = ({ type, label }: { type: string; label?: string }) => {
    const s = getServiceColor(type);
    return <span style={pill(s.bg, s.color, s.border)}>{label || type.replace(/_/g, " ").toUpperCase()}</span>;
};

const BookingTypeTag = ({ type }: { type: string }) => {
    const isAuth = type === "authenticated";
    return (
        <span style={pill(
            isAuth ? "#eff6ff" : C.bg,
            isAuth ? C.blue : C.subText,
            isAuth ? "#bfdbfe" : C.border,
        )}>
            {isAuth ? "Registered" : "Guest"}
        </span>
    );
};

// ── Modal title helper ─────────────────────────────────────────────────────
const modalTitle = (icon: React.ReactNode, iconColor: string, label: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: iconColor, fontSize: 14, lineHeight: 1 }}>
            {icon}
        </div>
        <Text strong style={{ fontSize: 14, color: C.darkText }}>{label}</Text>
    </div>
);

// ── Types ──────────────────────────────────────────────────────────────────
interface Consultation {
    _id: string;
    customer_id?: { customer_name: string; email: string; phone: string };
    guest_customer?: { name: string; email: string; phone: string };
    staff_id?: { name: string; email: string };
    shop_id?: { shop_name: string };
    booking_type: "authenticated" | "guest";
    service_type: "facial" | "massage" | "wood_therapy" | "other";
    appointment_date: string;
    start_time: string;
    end_time: string;
    duration: number;
    status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
    special_requests?: string;
    price?: number;
    customer_display_name: string;
    createdAt: string;
    updatedAt: string;
}

// ── Summary strip ──────────────────────────────────────────────────────────
const SummaryStrip = ({ data }: { data: Consultation[] }) => {
    const counts = {
        pending: data.filter(c => c.status === "pending").length,
        confirmed: data.filter(c => c.status === "confirmed").length,
        completed: data.filter(c => c.status === "completed").length,
        cancelled: data.filter(c => c.status === "cancelled").length,
    };
    return (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {([
                ["pending", C.orange, "#fffbeb", "#fde68a"],
                ["confirmed", C.blue, "#eff6ff", "#bfdbfe"],
                ["completed", C.green, "#f0fdf4", "#bbf7d0"],
                ["cancelled", C.red, "#fef2f2", "#fecaca"],
            ] as const).map(([key, color, bg, border]) => (
                <span key={key} style={pill(bg, color, border)}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}: {counts[key as keyof typeof counts]}
                </span>
            ))}
        </div>
    );
};

// ── Status modal ───────────────────────────────────────────────────────────
const StatusModal: React.FC<{
    open: boolean;
    consultation: Consultation | null;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ open, consultation, onClose, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && consultation) {
            form.setFieldsValue({ status: consultation.status, notes: "" });
        }
    }, [open, consultation]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            await updateConsultationStatus(consultation!._id, values);
            form.resetFields();
            onSuccess();
            onClose();
        } catch {
            // validation or api error handled by message
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onClose();
    };

    return (
        <Modal
            open={open} onCancel={handleCancel} destroyOnClose
            style={{ top: 20 }} width="min(480px, 96vw)"
            styles={{ body: { padding: "20px 24px" } }}
            title={modalTitle(<EditOutlined />, C.primary, `Update Status — ${consultation?.customer_display_name || ""}`)}
            footer={[
                <Button key="cancel" onClick={handleCancel} style={{ borderRadius: 8 }}>Cancel</Button>,
                <Button key="ok" type="primary" loading={loading} onClick={handleOk}
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
                    Update
                </Button>,
            ]}
        >
            <Form form={form} layout="vertical">
                <Form.Item name="status" label="Status" rules={[{ required: true, message: "Please select a status" }]}>
                    <Select style={{ borderRadius: 8 }} options={[
                        { label: "Pending", value: "pending" },
                        { label: "Confirmed", value: "confirmed" },
                        { label: "Completed", value: "completed" },
                        { label: "Cancelled", value: "cancelled" },
                        { label: "No Show", value: "no_show" },
                    ]} />
                </Form.Item>
                <Form.Item name="notes" label="Notes">
                    <Input.TextArea rows={3} placeholder="Add any notes…" style={{ borderRadius: 8 }} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

// ── Main ───────────────────────────────────────────────────────────────────
const ConsultationTable: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [consultationData, setConsultationData] = useState<Consultation[]>([]);
    const [serviceType, setServiceType] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState<[string, string] | null>(null);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
    const [serviceOptions, setServiceOptions] = useState<{ label: string; value: string }[]>([
        { label: "All Services", value: "all" },
    ]);

    useEffect(() => {
        getAllProducts()
            .then((data) => {
                const products: any[] = data?.products || data || [];
                setServiceOptions([
                    { label: "All Services", value: "all" },
                    ...products.map((p: any) => ({ label: p.name, value: p._id })),
                ]);
            })
            .catch(() => { });
    }, []);

    const fetchConsultations = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (serviceType !== "all") params.service_type = serviceType;
            if (statusFilter !== "all") params.status = statusFilter;
            if (dateRange) { params.start_date = dateRange[0]; params.end_date = dateRange[1]; }
            const response = await fetchAllConsultations(params);
            setConsultationData(response.consultations || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchConsultations(); }, [serviceType, statusFilter, dateRange]);

    const openStatusModal = (record: Consultation) => {
        setSelectedConsultation(record);
        setStatusModalOpen(true);
    };

    // ── Columns ──────────────────────────────────────────────────────────
    const columns = [
        {
            title: "Customer", dataIndex: "customer_display_name", key: "customer",
            width: 200,
            render: (text: string, record: Consultation) => {
                const email = record.booking_type === "authenticated"
                    ? record.customer_id?.email
                    : record.guest_customer?.email;
                return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <UserOutlined style={{ fontSize: 12, color: record.booking_type === "authenticated" ? C.blue : C.subText }} />
                            <Text strong style={{ fontSize: 12 }}>{text}</Text>
                        </div>
                        {email && <Text style={{ fontSize: 11, color: C.subText }}>{email}</Text>}
                        <BookingTypeTag type={record.booking_type} />
                    </div>
                );
            },
        },
        {
            title: "Service", dataIndex: "service_type", key: "service_type", width: 160,
            render: (type: string) => {
                const match = serviceOptions.find(o => o.value === type);
                return <ServiceTag type={type} label={match?.label} />;
            },
        },
        {
            title: "Appointment", key: "appointment", width: 190,
            render: (_: any, record: Consultation) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Text strong style={{ fontSize: 12 }}>{dayjs(record.appointment_date).format("DD MMM YYYY")}</Text>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <ClockCircleOutlined style={{ fontSize: 11, color: C.subText }} />
                        <Text style={{ fontSize: 11, color: C.subText }}>{record.start_time} – {record.end_time}</Text>
                    </div>
                    <Text style={{ fontSize: 11, color: C.subText }}>{record.duration} min</Text>
                </div>
            ),
            sorter: (a: Consultation, b: Consultation) =>
                new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime(),
        },
        {
            title: "Staff", dataIndex: "staff_id", key: "staff", width: 150,
            render: (staff: any) =>
                staff ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Text style={{ fontSize: 12 }}>{staff.name}</Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>{staff.email}</Text>
                    </div>
                ) : (
                    <Text style={{ fontSize: 12, color: C.subText, fontStyle: "italic" }}>Not assigned</Text>
                ),
        },
        {
            title: "Status", dataIndex: "status", key: "status", width: 130,
            render: (status: string) => <StatusTag status={status} />,
        },
        {
            title: "Contact", key: "contact", width: 140,
            render: (_: any, record: Consultation) => {
                const phone = record.booking_type === "authenticated"
                    ? record.customer_id?.phone
                    : record.guest_customer?.phone;
                return phone
                    ? <Text copyable style={{ fontSize: 12 }}>{phone}</Text>
                    : <Text style={{ fontSize: 12, color: C.subText, fontStyle: "italic" }}>N/A</Text>;
            },
        },
        {
            title: "Price", dataIndex: "price", key: "price", width: 110, align: "right" as const,
            render: (price: number) =>
                price
                    ? <Text strong style={{ fontSize: 12, color: C.green }}>KES {fmt(price)}</Text>
                    : <Text style={{ fontSize: 12, color: C.subText, fontStyle: "italic" }}>N/A</Text>,
        },
        {
            title: "Special Requests", dataIndex: "special_requests", key: "special_requests", ellipsis: true,
            render: (requests: string) =>
                requests ? (
                    <Tooltip title={requests} placement="topLeft">
                        <Text style={{ fontSize: 12 }}>{requests}</Text>
                    </Tooltip>
                ) : (
                    <Text style={{ fontSize: 12, color: C.subText, fontStyle: "italic" }}>None</Text>
                ),
        },
        {
            title: "Actions", key: "actions", width: 130, fixed: "right" as const,
            render: (_: any, record: Consultation) => (
                <Button size="small" icon={<EditOutlined />} onClick={() => openStatusModal(record)}
                    style={{ borderRadius: 6, fontSize: 11 }}>
                    Update Status
                </Button>
            ),
        },
    ];

    return (
        <>
            <ProTable<Consultation>
                columns={columns}
                dataSource={consultationData}
                loading={loading}
                rowKey="_id"
                search={false}
                scroll={{ x: 1400 }}
                options={{ reload: fetchConsultations, density: true, fullScreen: true }}
                pagination={{
                    defaultPageSize: 10, showSizeChanger: true,
                    showTotal: (total) => `${total} consultations`,
                }}
                headerTitle={
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>Consultations</Text>
                        <SummaryStrip data={consultationData} />
                    </div>
                }
                toolbar={{
                    actions: [
                        <Select
                            key="service" value={serviceType} onChange={setServiceType}
                            style={{ width: 180, borderRadius: 8 }}
                            options={serviceOptions}
                            loading={serviceOptions.length <= 1}
                        />,
                        <Select
                            key="status" value={statusFilter} onChange={setStatusFilter}
                            style={{ width: 140, borderRadius: 8 }}
                            options={[
                                { label: "All Status", value: "all" },
                                { label: "Pending", value: "pending" },
                                { label: "Confirmed", value: "confirmed" },
                                { label: "Completed", value: "completed" },
                                { label: "Cancelled", value: "cancelled" },
                                { label: "No Show", value: "no_show" },
                            ]}
                        />,
                        <RangePicker
                            key="dates"
                            style={{ borderRadius: 8 }}
                            format="DD MMM YYYY"
                            presets={[
                                { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
                                { label: "This Week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
                                { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                            ]}
                            onChange={(dates) => {
                                setDateRange(dates
                                    ? [dates[0]!.format("YYYY-MM-DD"), dates[1]!.format("YYYY-MM-DD")]
                                    : null,
                                );
                            }}
                        />,
                    ],
                }}
            />

            <StatusModal
                open={statusModalOpen}
                consultation={selectedConsultation}
                onClose={() => setStatusModalOpen(false)}
                onSuccess={fetchConsultations}
            />
        </>
    );
};

export default ConsultationTable;