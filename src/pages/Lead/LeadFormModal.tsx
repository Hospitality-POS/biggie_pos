import { useEffect, useState } from "react";
import {
    Button, DatePicker, Form, Input, InputNumber, Modal, Select, Typography, message, Spin,
} from "antd";
import {
    EditOutlined, MailOutlined, PhoneOutlined, SaveOutlined,
    TeamOutlined, UserOutlined, UserSwitchOutlined,
} from "@ant-design/icons";
import { useAppDispatch } from "../../store";
import { createLead, updateLead, Lead } from "@services/crm/leads";
import { fetchAllUsersList } from "@services/users";
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
};

interface LeadFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    lead?: Lead | null;
    mode?: "add" | "edit";
}

interface User {
    _id: string;
    name: string;
    username: string;
    email: string;
}

const STAGES = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost", "disqualified"];
const SOURCES = ["walk_in", "referral", "social_media", "website", "cold_call", "email_campaign", "exhibition", "partner", "other"];

const LeadFormModal: React.FC<LeadFormModalProps> = ({
    visible, onClose, onSuccess, lead, mode = "add",
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const dispatch = useAppDispatch();
    const isEdit = mode === "edit";

    // Fetch users when modal opens
    useEffect(() => {
        if (!visible) return;

        const fetchUsers = async () => {
            setUsersLoading(true);
            try {
                const shopData = localStorage.getItem("shop");
                const shop = shopData ? JSON.parse(shopData) : null;
                const shop_id = shop?._id;

                const response = await fetchAllUsersList({
                    shop_id: shop_id || undefined
                });

                // Extract users from response (adjust based on your API response structure)
                const usersList = response?.data || response?.users || response || [];
                setUsers(Array.isArray(usersList) ? usersList : []);
            } catch (error) {
                console.error("Error fetching users:", error);
                message.error("Failed to load users list");
            } finally {
                setUsersLoading(false);
            }
        };

        fetchUsers();
    }, [visible]);

    useEffect(() => {
        if (!visible) return;
        if (isEdit && lead) {
            form.setFieldsValue({
                lead_name: lead.lead_name,
                company_name: lead.company_name,
                email: lead.email,
                phone: lead.phone,
                website: lead.website,
                stage: lead.stage,
                source: lead.source,
                assigned_to: lead.assigned_to?._id || lead.assigned_to,
                estimated_value: lead.estimated_value,
                probability: lead.probability,
                expected_close_date: lead.expected_close_date ? dayjs(lead.expected_close_date) : undefined,
                next_follow_up: lead.next_follow_up ? dayjs(lead.next_follow_up) : undefined,
                notes: lead.notes,
                tags: lead.tags?.join(", "),
                // address
                street: lead.address?.street,
                city: lead.address?.city,
                county: lead.address?.county,
            });
        } else {
            form.resetFields();
        }
    }, [visible, mode, lead, form]);

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const shopData = localStorage.getItem("shop");
            const shop = shopData ? JSON.parse(shopData) : null;
            const shop_id = shop?._id;

            const tenantData = localStorage.getItem("tenant");
            const tenant = tenantData ? JSON.parse(tenantData) : null;
            const tenant_id = tenant?._id;

            const payload: any = {
                lead_name: values.lead_name,
                company_name: values.company_name,
                email: values.email,
                phone: values.phone,
                website: values.website,
                stage: values.stage || "new",
                source: values.source,
                assigned_to: values.assigned_to, // Add assigned_to user ID
                estimated_value: values.estimated_value,
                probability: values.probability,
                expected_close_date: values.expected_close_date?.toISOString(),
                next_follow_up: values.next_follow_up?.toISOString(),
                notes: values.notes,
                tags: values.tags ? values.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
                address: {
                    street: values.street,
                    city: values.city,
                    county: values.county,
                },
                shop_id,
                tenant_id,
            };

            if (isEdit && lead?._id) {
                await dispatch(updateLead({ id: lead._id, data: payload })).unwrap();
            } else {
                await dispatch(createLead(payload)).unwrap();
            }

            form.resetFields();
            onClose();
            onSuccess?.();
        } catch (err: any) {
            // error shown by service layer
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={visible}
            onCancel={() => { if (!loading) { form.resetFields(); onClose(); } }}
            destroyOnClose
            style={{ top: 20 }}
            width="min(640px, 96vw)"
            footer={null}
            styles={{ body: { padding: "20px 24px 24px", maxHeight: "80vh", overflowY: "auto" } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                        background: isEdit ? "#eff6ff" : C.primaryLight,
                        borderRadius: 7, padding: "4px 6px",
                        color: isEdit ? C.blue : C.primary, fontSize: 14, lineHeight: 1,
                    }}>
                        {isEdit ? <EditOutlined /> : <TeamOutlined />}
                    </div>
                    <Text strong style={{ fontSize: 14, color: C.darkText }}>
                        {isEdit ? "Edit Lead" : "Add New Lead"}
                    </Text>
                </div>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 4 }}>

                {/* Name + Company */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="lead_name" label="Lead Name"
                        rules={[{ required: true, message: "Lead name is required" }]}
                        style={{ flex: "1 1 220px" }}>
                        <Input prefix={<UserOutlined style={{ color: C.subText }} />}
                            placeholder="Full name" style={{ borderRadius: 8 }} autoFocus />
                    </Form.Item>
                    <Form.Item name="company_name" label="Company / Business"
                        style={{ flex: "1 1 220px" }}>
                        <Input placeholder="Company name (optional)" style={{ borderRadius: 8 }} />
                    </Form.Item>
                </div>

                {/* Phone + Email */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="phone" label="Phone" style={{ flex: "1 1 200px" }}>
                        <Input prefix={<PhoneOutlined style={{ color: C.subText }} />}
                            placeholder="e.g. 0712345678" style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item name="email" label="Email"
                        rules={[{ type: "email", message: "Enter a valid email" }]}
                        style={{ flex: "1 1 200px" }}>
                        <Input prefix={<MailOutlined style={{ color: C.subText }} />}
                            placeholder="email@example.com" style={{ borderRadius: 8 }} />
                    </Form.Item>
                </div>

                {/* Stage + Source */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="stage" label="Stage" style={{ flex: "1 1 180px" }}>
                        <Select placeholder="Select stage" style={{ borderRadius: 8 }}>
                            {STAGES.map(s => (
                                <Option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="source" label="Source" style={{ flex: "1 1 180px" }}>
                        <Select placeholder="Lead source" allowClear style={{ borderRadius: 8 }}>
                            {SOURCES.map(s => (
                                <Option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </div>

                {/* Assigned To - New Section */}
                <Form.Item name="assigned_to" label="Assigned To">
                    <Select
                        placeholder="Select user to assign this lead"
                        allowClear
                        loading={usersLoading}
                        suffixIcon={usersLoading ? <Spin size="small" /> : <UserSwitchOutlined />}
                        style={{ borderRadius: 8 }}
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {users.map(user => (
                            <Option key={user._id} value={user._id} label={`${user.name} (${user.username})`}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <UserOutlined style={{ color: C.subText }} />
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{user.name}</div>
                                        {user.username && (
                                            <div style={{ fontSize: 12, color: C.subText }}>
                                                @{user.username}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                {/* Value + Probability */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="estimated_value" label="Estimated Value (KES)" style={{ flex: "1 1 180px" }}>
                        <InputNumber min={0} placeholder="0" style={{ width: "100%", borderRadius: 8 }}
                            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            parser={v => v?.replace(/,/g, "") as any} />
                    </Form.Item>
                    <Form.Item name="probability" label="Win Probability (%)" style={{ flex: "1 1 180px" }}>
                        <InputNumber min={0} max={100} placeholder="0"
                            style={{ width: "100%", borderRadius: 8 }} addonAfter="%" />
                    </Form.Item>
                </div>

                {/* Dates */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="expected_close_date" label="Expected Close Date" style={{ flex: "1 1 200px" }}>
                        <DatePicker style={{ width: "100%", borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item name="next_follow_up" label="Next Follow-Up" style={{ flex: "1 1 200px" }}>
                        <DatePicker style={{ width: "100%", borderRadius: 8 }} />
                    </Form.Item>
                </div>

                {/* Address */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="city" label="City" style={{ flex: "1 1 150px" }}>
                        <Input placeholder="e.g. Nairobi" style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item name="county" label="County" style={{ flex: "1 1 150px" }}>
                        <Input placeholder="e.g. Nairobi County" style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item name="street" label="Street / Building" style={{ flex: "1 1 200px" }}>
                        <Input placeholder="e.g. Kimathi Street" style={{ borderRadius: 8 }} />
                    </Form.Item>
                </div>

                {/* Tags + Notes */}
                <Form.Item name="tags" label="Tags (comma-separated)">
                    <Input placeholder="e.g. vip, hot-lead, referral" style={{ borderRadius: 8 }} />
                </Form.Item>

                <Form.Item name="notes" label="Notes">
                    <TextArea rows={3} placeholder="Any notes about this lead…"
                        showCount maxLength={1000} style={{ borderRadius: 8 }} />
                </Form.Item>

                <div style={{ display: "flex", gap: 10 }}>
                    <Button block onClick={() => { form.resetFields(); onClose(); }}
                        disabled={loading} style={{ borderRadius: 8, height: 38 }}>
                        Cancel
                    </Button>
                    <Button block type="primary" htmlType="submit" icon={<SaveOutlined />}
                        loading={loading}
                        style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 38, fontWeight: 500 }}>
                        {isEdit ? "Update Lead" : "Add Lead"}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default LeadFormModal;