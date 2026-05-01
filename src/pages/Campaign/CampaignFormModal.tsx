import { useEffect, useState } from "react";
import {
    Button, DatePicker, Form, Input, InputNumber,
    Modal, Select, Typography,
} from "antd";
import { EditOutlined, NotificationOutlined, SaveOutlined } from "@ant-design/icons";
import { useAppDispatch } from "../../store";
import {
    createCampaign, updateCampaign,
    Campaign, CampaignStatus,
} from "@services/crm/campaigns";
import { fetchAllDepartments } from "@services/crm/departments";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    blue: "#3b82f6",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
} as const;

const CAMPAIGN_TYPES = [
    "email", "sms", "social_media", "google_ads",
    "referral", "event", "flyer", "radio", "tv", "other",
];
const CAMPAIGN_STATUSES: CampaignStatus[] = [
    "draft", "scheduled", "active", "paused", "completed", "cancelled",
];

interface CampaignFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    campaign?: Campaign | null;
    mode?: "add" | "edit";
}

export const CampaignFormModal: React.FC<CampaignFormModalProps> = ({
    visible, onClose, onSuccess, campaign, mode = "add",
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const dispatch = useAppDispatch();
    const isEdit = mode === "edit";

    const { data: deptData } = useQuery({
        queryKey: ["departments"],
        queryFn: () => fetchAllDepartments(),
        staleTime: 60_000,
        enabled: visible,
    });
    const departments = deptData?.departments || [];

    useEffect(() => {
        if (!visible) return;
        if (isEdit && campaign) {
            form.setFieldsValue({
                ...campaign,
                start_date: campaign.start_date ? dayjs(campaign.start_date) : undefined,
                end_date: campaign.end_date ? dayjs(campaign.end_date) : undefined,
                tags: campaign.tags?.join(", "),
                department_id: typeof campaign.department_id === "object"
                    ? (campaign as any).department_id?._id
                    : (campaign as any).department_id,
            });
        } else {
            form.resetFields();
        }
    }, [visible, mode, campaign, form]);

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const shop_id = JSON.parse(localStorage.getItem("shop") || "{}")?._id;
            const payload = {
                ...values,
                start_date: values.start_date?.toISOString(),
                end_date: values.end_date?.toISOString(),
                tags: values.tags
                    ? values.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
                    : [],
                shop_id,
            };
            if (isEdit && campaign?._id) {
                await dispatch(updateCampaign({ id: campaign._id, data: payload })).unwrap();
            } else {
                await dispatch(createCampaign(payload)).unwrap();
            }
            form.resetFields();
            onClose();
            onSuccess?.();
        } catch { } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={visible}
            onCancel={() => { if (!loading) { form.resetFields(); onClose(); } }}
            destroyOnClose
            style={{ top: 20 }}
            width="min(620px, 96vw)"
            footer={null}
            styles={{ body: { padding: "20px 24px 24px", maxHeight: "82vh", overflowY: "auto" } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: isEdit ? "#eff6ff" : C.primaryLight, borderRadius: 7, padding: "4px 6px", color: isEdit ? C.blue : C.primary, fontSize: 14, lineHeight: 1 }}>
                        {isEdit ? <EditOutlined /> : <NotificationOutlined />}
                    </div>
                    <Text strong style={{ fontSize: 14 }}>{isEdit ? "Edit Campaign" : "New Campaign"}</Text>
                </div>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 4 }}>
                {/* Name */}
                <Form.Item name="name" label="Campaign Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. April SMS Blast" style={{ borderRadius: 8 }} autoFocus />
                </Form.Item>

                {/* Type + Status */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="type" label="Type" style={{ flex: "1 1 180px" }}>
                        <Select placeholder="Select type" allowClear>
                            {CAMPAIGN_TYPES.map(t => (
                                <Option key={t} value={t}>
                                    {t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="status" label="Status" style={{ flex: "1 1 160px" }} initialValue="draft">
                        <Select placeholder="Select status">
                            {CAMPAIGN_STATUSES.map(s => (
                                <Option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </div>

                {/* Dates */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="start_date" label="Start Date" style={{ flex: "1 1 200px" }}>
                        <DatePicker style={{ width: "100%", borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item name="end_date" label="End Date" style={{ flex: "1 1 200px" }}>
                        <DatePicker style={{ width: "100%", borderRadius: 8 }} />
                    </Form.Item>
                </div>

                {/* Budget + Targets */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="budget" label="Budget (KES)" style={{ flex: "1 1 180px" }}>
                        <InputNumber
                            min={0} style={{ width: "100%", borderRadius: 8 }}
                            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            parser={v => v?.replace(/,/g, "") as any}
                        />
                    </Form.Item>
                    <Form.Item name="target_leads" label="Target Leads" style={{ flex: "1 1 130px" }}>
                        <InputNumber min={0} style={{ width: "100%", borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item name="target_revenue" label="Target Revenue (KES)" style={{ flex: "1 1 180px" }}>
                        <InputNumber
                            min={0} style={{ width: "100%", borderRadius: 8 }}
                            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            parser={v => v?.replace(/,/g, "") as any}
                        />
                    </Form.Item>
                </div>

                {/* Department */}
                {departments.length > 0 && (
                    <Form.Item name="department_id" label="Department (optional)">
                        <Select placeholder="Scope campaign to a department" allowClear>
                            {departments.map(d => (
                                <Option key={d._id} value={d._id}>
                                    {d.name}{d.code ? ` (${d.code})` : ""}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                {/* Audience + Tags */}
                <Form.Item name="target_audience" label="Target Audience">
                    <Input placeholder="e.g. Existing customers aged 25-40" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item name="tags" label="Tags (comma-separated)">
                    <Input placeholder="e.g. seasonal, promo" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item name="description" label="Description">
                    <TextArea rows={3} style={{ borderRadius: 8 }} />
                </Form.Item>

                <div style={{ display: "flex", gap: 10 }}>
                    <Button block onClick={() => { form.resetFields(); onClose(); }} disabled={loading} style={{ borderRadius: 8, height: 38 }}>
                        Cancel
                    </Button>
                    <Button block type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}
                        style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 38, fontWeight: 500 }}>
                        {isEdit ? "Update Campaign" : "Create Campaign"}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};