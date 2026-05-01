import { useState } from "react";
import {
    Button, Drawer, Form, Input, Modal, Select, Tag, Timeline, Typography, message,
} from "antd";
import {
    CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined,
    MailOutlined, PhoneOutlined, SwapOutlined, TeamOutlined,
    UserOutlined, UserAddOutlined, WalletOutlined,
} from "@ant-design/icons";
import { useAppDispatch } from "src/store";
import { Lead, LeadStage, updateLeadStage, convertLead } from "@services/crm/leads";
import { createLeadActivity } from "@services/crm/leadActivities";

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    orange: "#f59e0b",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

const STAGE_COLORS: Record<LeadStage, string> = {
    new: C.blue, contacted: C.orange, qualified: "#8b5cf6",
    proposal: "#0891b2", negotiation: "#d97706", won: C.green,
    lost: C.red, disqualified: C.subText,
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ color: C.primary, fontSize: 14, marginTop: 1 }}>{icon}</span>
        <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>{label}</Text>
            <div style={{ fontSize: 12, color: C.darkText }}>{value || "—"}</div>
        </div>
    </div>
);

const ACTIVITY_TYPES = ["call", "email", "meeting", "demo", "note", "task", "whatsapp", "site_visit", "other"];

interface LeadDetailDrawerProps {
    open: boolean;
    onClose: () => void;
    lead: Lead | null;
    onUpdated?: () => void;
    /** Called when user wants to convert via the customer form (pre-fills data from lead) */
    onConvertWithForm?: (prefill: { customer_name: string; phone?: string; email?: string; location?: string }) => void;
}

const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({ open, onClose, lead, onUpdated, onConvertWithForm }) => {
    const dispatch = useAppDispatch();
    const [stageLoading, setStageLoading] = useState(false);
    const [convertLoading, setConvertLoading] = useState(false);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityForm] = Form.useForm();
    const [stageForm] = Form.useForm();

    if (!lead) return null;

    const shop_id = JSON.parse(localStorage.getItem("shop") || "{}")?._id;

    const handleStageUpdate = async (values: any) => {
        setStageLoading(true);
        try {
            await dispatch(updateLeadStage({ id: lead._id, shop_id, stage: values.stage, note: values.note })).unwrap();
            stageForm.resetFields();
            onUpdated?.();
            message.success("Stage updated");
        } catch { } finally {
            setStageLoading(false);
        }
    };

    // Quick convert — calls API directly (no customer form)
    const handleConvertDirect = async () => {
        setConvertLoading(true);
        try {
            await dispatch(convertLead({ id: lead._id, shop_id })).unwrap();
            onUpdated?.();
            onClose();
        } catch { } finally {
            setConvertLoading(false);
        }
    };

    // Convert with form — opens AddCustomerModal pre-filled with lead data
    const handleConvertWithForm = () => {
        const prefill = {
            customer_name: lead.lead_name,
            phone: lead.phone,
            email: lead.email,
            location: lead.address?.city || lead.address?.county,
        };
        if (onConvertWithForm) {
            onConvertWithForm(prefill);
        } else {
            // Fallback: confirm then convert directly
            Modal.confirm({
                title: `Convert "${lead.lead_name}" to customer?`,
                content: "This will create a customer record linked to this lead.",
                okText: "Convert",
                okButtonProps: { style: { background: C.green, borderColor: C.green } },
                onOk: handleConvertDirect,
            });
        }
    };

    const handleLogActivity = async (values: any) => {
        setActivityLoading(true);
        try {
            await dispatch(createLeadActivity({
                lead_id: lead._id, shop_id,
                type: values.type,
                subject: values.subject,
                description: values.description,
                outcome: values.outcome,
            })).unwrap();
            activityForm.resetFields();
            onUpdated?.();
            message.success("Activity logged");
        } catch { } finally {
            setActivityLoading(false);
        }
    };

    const SectionTitle = ({ label }: { label: string }) => (
        <Text strong style={{
            fontSize: 11, color: C.primary, textTransform: "uppercase",
            letterSpacing: "0.5px", display: "block",
            borderBottom: `2px solid ${C.primaryLight}`, paddingBottom: 6, marginBottom: 10,
        }}>
            {label}
        </Text>
    );

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement="right"
            width="min(580px, 98vw)"
            destroyOnClose
            styles={{ body: { padding: "16px 20px", background: C.bg } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
                        <TeamOutlined />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>{lead.lead_name}</Text>
                        {lead.company_name && <Text style={{ fontSize: 11, color: C.subText }}>{lead.company_name}</Text>}
                    </div>
                    <Tag color={STAGE_COLORS[lead.stage]} style={{ marginLeft: "auto", borderRadius: 10, fontSize: 11 }}>
                        {lead.stage.toUpperCase()}
                    </Tag>
                </div>
            }
            footer={
                lead.stage !== "won" && lead.stage !== "disqualified" && !lead.customer_id ? (
                    <div style={{ display: "flex", gap: 8, padding: "8px 0", flexWrap: "wrap" }}>
                        {/* Primary: open AddCustomerModal pre-filled */}
                        <Button
                            flex="1" type="primary" icon={<UserAddOutlined />}
                            onClick={handleConvertWithForm}
                            style={{ flex: 1, background: C.green, borderColor: C.green, borderRadius: 8, height: 40, fontWeight: 500 }}
                        >
                            Convert to Customer
                        </Button>
                        {/* Secondary: direct API convert (no form) — only if onConvertWithForm provided */}
                        {onConvertWithForm && (
                            <Button
                                icon={<CheckCircleOutlined />}
                                loading={convertLoading}
                                onClick={handleConvertDirect}
                                style={{ borderRadius: 8, height: 40, color: C.green, borderColor: C.green }}
                            >
                                Quick Convert
                            </Button>
                        )}
                    </div>
                ) : lead.customer_id ? (
                    <div style={{ padding: "8px 0", textAlign: "center" }}>
                        <Text style={{ fontSize: 12, color: C.green }}>
                            <CheckCircleOutlined /> Converted — {(lead.customer_id as any)?.customer_name || "Customer"}
                        </Text>
                    </div>
                ) : null
            }
        >
            {/* ── Contact Info ─────────────────────────────────────── */}
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <SectionTitle label="Contact Info" />
                <InfoRow icon={<PhoneOutlined />} label="Phone" value={lead.phone} />
                <InfoRow icon={<MailOutlined />} label="Email" value={lead.email} />
                <InfoRow icon={<UserOutlined />} label="Assigned To" value={lead.assigned_to?.name} />
                <InfoRow icon={<WalletOutlined />} label="Est. Value"
                    value={lead.estimated_value ? `KES ${lead.estimated_value.toLocaleString()} (${lead.probability ?? 0}%)` : undefined} />
                <InfoRow icon={<CalendarOutlined />} label="Expected Close"
                    value={lead.expected_close_date ? new Date(lead.expected_close_date).toLocaleDateString("en-GB") : undefined} />
                <InfoRow icon={<ClockCircleOutlined />} label="Next Follow-Up"
                    value={lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleDateString("en-GB") : undefined} />
                {lead.tags?.length ? (
                    <div style={{ padding: "7px 0" }}>
                        <Text style={{ fontSize: 10, color: C.subText, display: "block", marginBottom: 4 }}>Tags</Text>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {lead.tags.map(t => (
                                <Tag key={t} style={{ fontSize: 10, borderRadius: 8 }}>{t}</Tag>
                            ))}
                        </div>
                    </div>
                ) : null}
                {lead.notes && (
                    <div style={{ padding: "7px 0" }}>
                        <Text style={{ fontSize: 10, color: C.subText, display: "block", marginBottom: 4 }}>Notes</Text>
                        <Text style={{ fontSize: 12 }}>{lead.notes}</Text>
                    </div>
                )}
            </div>

            {/* ── Update Stage ─────────────────────────────────────── */}
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <SectionTitle label="Update Stage" />
                <Form form={stageForm} layout="vertical" onFinish={handleStageUpdate}>
                    <div style={{ display: "flex", gap: 10 }}>
                        <Form.Item name="stage" label="New Stage"
                            rules={[{ required: true, message: "Select a stage" }]}
                            style={{ flex: 1 }}>
                            <Select placeholder="Select stage">
                                {(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost", "disqualified"] as LeadStage[]).map(s => (
                                    <Option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </div>
                    <Form.Item name="note" label="Note (optional)">
                        <Input placeholder="Reason for stage change…" style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Button htmlType="submit" loading={stageLoading} icon={<SwapOutlined />}
                        style={{ background: C.primary, borderColor: C.primary, color: "#fff", borderRadius: 8, width: "100%" }}>
                        Update Stage
                    </Button>
                </Form>
            </div>

            {/* ── Log Activity ─────────────────────────────────────── */}
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <SectionTitle label="Log Activity" />
                <Form form={activityForm} layout="vertical" onFinish={handleLogActivity}>
                    <div style={{ display: "flex", gap: 10 }}>
                        <Form.Item name="type" label="Type"
                            rules={[{ required: true, message: "Select activity type" }]}
                            style={{ flex: 1 }}>
                            <Select placeholder="Type">
                                {ACTIVITY_TYPES.map(t => (
                                    <Option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="outcome" label="Outcome" style={{ flex: 1 }}>
                            <Select placeholder="Outcome" allowClear>
                                {["no_answer", "left_voicemail", "follow_up_scheduled", "interested", "not_interested", "callback_requested", "completed", "cancelled"].map(o => (
                                    <Option key={o} value={o}>{o.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </div>
                    <Form.Item name="subject" label="Subject">
                        <Input placeholder="e.g. Follow-up call" style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <TextArea rows={2} placeholder="What happened…" style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Button htmlType="submit" loading={activityLoading}
                        style={{ background: C.blue, borderColor: C.blue, color: "#fff", borderRadius: 8, width: "100%" }}>
                        Log Activity
                    </Button>
                </Form>
            </div>

            {/* ── Stage History ─────────────────────────────────────── */}
            {lead.stage_history?.length ? (
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                    <SectionTitle label="Stage History" />
                    <Timeline
                        items={[...lead.stage_history].reverse().map(h => ({
                            color: STAGE_COLORS[h.stage as LeadStage] || C.subText,
                            children: (
                                <div>
                                    <Text strong style={{ fontSize: 12 }}>
                                        {h.stage.charAt(0).toUpperCase() + h.stage.slice(1)}
                                    </Text>
                                    {h.note && <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>{h.note}</Text>}
                                    <Text style={{ fontSize: 10, color: C.subText }}>
                                        {new Date(h.changed_at).toLocaleString("en-GB")}
                                        {h.changed_by ? ` · ${h.changed_by.name}` : ""}
                                    </Text>
                                </div>
                            ),
                        }))}
                    />
                </div>
            ) : null}
        </Drawer>
    );
};

export default LeadDetailDrawer;