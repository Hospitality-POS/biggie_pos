import React, { useEffect, useState } from "react";
import {
    Button,
    Drawer,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Typography,
} from "antd";
import {
    EditOutlined,
    KeyOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { createPermission, updatePermission } from "@services/permission";

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    orange: "#f59e0b",
    red: "#ef4444",
    blue: "#3b82f6",
    indigo: "#6366f1",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

// ── Mobile hook ───────────────────────────────────────────────────────────────
const useIsMobile = () => {
    const [v, setV] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setV(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return v;
};

// ── HTTP method config ────────────────────────────────────────────────────────
const METHOD_CFG: Record<string, { color: string; bg: string; desc: string }> = {
    GET: { color: C.green, bg: "#f0fdf4", desc: "Fetch data" },
    POST: { color: C.blue, bg: "#eff6ff", desc: "Create record" },
    PUT: { color: C.orange, bg: "#fffbeb", desc: "Update record" },
    PATCH: { color: C.indigo, bg: "#eef2ff", desc: "Partial update" },
    DELETE: { color: C.red, bg: "#fef2f2", desc: "Remove record" },
};

const METHOD_OPTIONS = Object.entries(METHOD_CFG).map(([value, cfg]) => ({
    value,
    label: (
        <Space size={8}>
            <span
                style={{
                    background: cfg.bg,
                    color: cfg.color,
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    fontFamily: "monospace",
                    display: "inline-block",
                    minWidth: 46,
                    textAlign: "center" as const,
                }}
            >
                {value}
            </span>
            <span style={{ fontSize: 12, color: C.subText }}>{cfg.desc}</span>
        </Space>
    ),
}));

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Text
        style={{
            fontSize: 10,
            fontWeight: 700,
            color: C.subText,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            display: "block",
            marginBottom: 10,
        }}
    >
        {children}
    </Text>
);

// ── Form section card ─────────────────────────────────────────────────────────
const FormSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
        style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "14px 14px 6px",
            marginBottom: 14,
        }}
    >
        {children}
    </div>
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface PermissionModalProps {
    actionRef: any;
    edit?: boolean;
    data?: any;
}

// ── Main component ────────────────────────────────────────────────────────────
const PermissionModal: React.FC<PermissionModalProps> = ({
    actionRef,
    edit,
    data,
}) => {
    const [form] = Form.useForm();
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const isMobile = useIsMobile();

    // ── Populate on open ────────────────────────────────────────────────────────
    useEffect(() => {
        if (open && edit && data) {
            form.setFieldsValue({ ...data });
        }
    }, [open, edit, data, form]);

    // ── Open / close ────────────────────────────────────────────────────────────
    const handleOpen = (next: boolean) => {
        setOpen(next);
        if (!next) {
            form.resetFields();
            setSubmitting(false);
        }
    };

    // ── Submit ───────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        let values: any;
        try {
            values = await form.validateFields();
        } catch {
            return; // inline validation errors shown
        }

        const confirmed = await ShowConfirm({
            title: `${edit ? "Update" : "Create"} this permission?`,
            position: true,
        });
        if (!confirmed) return;

        setSubmitting(true);
        try {
            edit
                ? await updatePermission({ values, _id: data._id })
                : await createPermission(values);
            actionRef?.current?.reload();
            handleOpen(false);
        } catch {
            // service handles error messages
        } finally {
            setSubmitting(false);
        }
    };

    // ── Modal title ──────────────────────────────────────────────────────────────
    const modalTitle = (
        <Space size={8}>
            <div
                style={{
                    background: C.primaryLight,
                    borderRadius: 7,
                    padding: "4px 6px",
                    color: C.primary,
                    fontSize: 14,
                    lineHeight: 1,
                }}
            >
                {edit ? <EditOutlined /> : <KeyOutlined />}
            </div>
            <Text strong style={{ fontSize: 13, color: C.darkText }}>
                {edit ? "Edit Permission" : "New Permission"}
            </Text>
        </Space>
    );

    // ── Trigger button ───────────────────────────────────────────────────────────
    const triggerButton = edit ? (
        <Button
            size="small"
            icon={<EditOutlined style={{ color: C.primary }} />}
            style={{ borderRadius: 7 }}
            onClick={() => handleOpen(true)}
        >
            Edit
        </Button>
    ) : (
        <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{
                background: C.primary,
                borderColor: C.primary,
                borderRadius: 7,
                fontWeight: 500,
            }}
            onClick={() => handleOpen(true)}
        >
            {isMobile ? "Add" : "New Permission"}
        </Button>
    );

    // ── Footer ───────────────────────────────────────────────────────────────────
    const footer = (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button
                onClick={() => handleOpen(false)}
                disabled={submitting}
                style={{ borderRadius: 8 }}
            >
                Cancel
            </Button>
            <Button
                type="primary"
                onClick={handleSubmit}
                loading={submitting}
                style={{
                    background: C.primary,
                    borderColor: C.primary,
                    borderRadius: 8,
                    fontWeight: 500,
                }}
            >
                {edit ? "Save Changes" : "Create Permission"}
            </Button>
        </div>
    );

    // ── Mobile footer (block buttons at 44px) ────────────────────────────────────
    const mobileFooter = (
        <div style={{ display: "flex", gap: 10 }}>
            <Button
                block
                onClick={() => handleOpen(false)}
                disabled={submitting}
                style={{ borderRadius: 8, height: 44 }}
            >
                Cancel
            </Button>
            <Button
                block
                type="primary"
                onClick={handleSubmit}
                loading={submitting}
                style={{
                    background: C.primary,
                    borderColor: C.primary,
                    borderRadius: 8,
                    height: 44,
                    fontWeight: 600,
                }}
            >
                {edit ? "Save Changes" : "Create Permission"}
            </Button>
        </div>
    );

    // ── Form node (shared — plain Form.Item, 100% width everywhere) ──────────────
    const formNode = (
        <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 4 }}>
            {/* Permission details */}
            <FormSection>
                <SectionLabel>Permission Details</SectionLabel>

                <Form.Item
                    name="name"
                    label={<Text style={{ fontSize: 12, color: C.subText }}>Permission Name</Text>}
                    rules={[{ required: true, message: "Name is required" }]}
                    style={{ marginBottom: 10 }}
                >
                    <Input
                        placeholder="e.g. view_orders"
                        style={{ borderRadius: 8, height: 38 }}
                    />
                </Form.Item>

                <Form.Item
                    name="group_name"
                    label={<Text style={{ fontSize: 12, color: C.subText }}>Group Name</Text>}
                    rules={[{ required: true, message: "Group Name is required" }]}
                    style={{ marginBottom: 10 }}
                >
                    <Input
                        placeholder="e.g. Orders, Inventory"
                        style={{ borderRadius: 8, height: 38 }}
                    />
                </Form.Item>
            </FormSection>

            {/* Route configuration */}
            <FormSection>
                <SectionLabel>Route Configuration</SectionLabel>

                <Form.Item
                    name="route_url"
                    label={<Text style={{ fontSize: 12, color: C.subText }}>Route URL</Text>}
                    rules={[{ required: true, message: "Route URL is required" }]}
                    style={{ marginBottom: 10 }}
                >
                    <Input
                        placeholder="/api/v1/orders"
                        style={{
                            borderRadius: 8,
                            height: 38,
                            fontFamily: "monospace",
                            fontSize: 12,
                        }}
                    />
                </Form.Item>

                <Form.Item
                    name="method"
                    label={<Text style={{ fontSize: 12, color: C.subText }}>HTTP Method</Text>}
                    rules={[{ required: true, message: "Method is required" }]}
                    style={{ marginBottom: 10 }}
                >
                    <Select
                        placeholder="Select HTTP method"
                        style={{ width: "100%" }}
                        options={METHOD_OPTIONS}
                    />
                </Form.Item>
            </FormSection>
        </Form>
    );

    // ── Mobile → Drawer (bottom, 75vh) ───────────────────────────────────────────
    if (isMobile) {
        return (
            <>
                {triggerButton}
                <Drawer
                    open={open}
                    onClose={() => handleOpen(false)}
                    placement="bottom"
                    height="75vh"
                    destroyOnClose
                    title={modalTitle}
                    styles={{
                        body: { padding: "14px 14px 110px", overflowY: "auto" },
                        footer: {
                            padding: "12px 14px",
                            borderTop: `1px solid ${C.border}`,
                            background: "#fff",
                        },
                    }}
                    footer={mobileFooter}
                >
                    {formNode}
                </Drawer>
            </>
        );
    }

    // ── Desktop → Modal ──────────────────────────────────────────────────────────
    return (
        <>
            {triggerButton}
            <Modal
                open={open}
                onCancel={() => handleOpen(false)}
                destroyOnClose
                width="min(500px, 96vw)"
                title={modalTitle}
                footer={footer}
                styles={{
                    body: { maxHeight: "72vh", overflowY: "auto", padding: "20px 20px 8px" },
                }}
            >
                {formNode}
            </Modal>
        </>
    );
};

export default PermissionModal;