import React, { useMemo, useState } from "react";
import {
    Drawer, Tabs, List, Tag, Button, Popconfirm, Typography, Space,
    Form, Input, Select, InputNumber, Switch, App, Empty, Tooltip,
} from "antd";
import {
    MessageOutlined, MailOutlined, CheckCircleFilled, DisconnectOutlined,
    PlusOutlined, ExperimentOutlined, StarFilled, EditOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchSenders, connectSender, updateSender, disconnectSender, testSender,
    SenderConfig, MessagingChannel, SmsProvider, EmailProvider,
} from "@services/omnichannel/messagingCampaigns";
import { EMAIL_TEMPLATES } from "./emailTemplates";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;
const { Option } = Select;
const C = THEME_C;

interface Props {
    open: boolean;
    onClose: () => void;
    shopId: string;
    defaultChannel?: MessagingChannel;
}

const SMS_PROVIDERS: { value: SmsProvider; label: string }[] = [
    { value: "africastalking", label: "Africa's Talking" },
    { value: "onfon", label: "Onfon Media" },
    { value: "twilio", label: "Twilio" },
    { value: "custom_http", label: "Other (custom HTTP gateway)" },
];

const EMAIL_PROVIDERS: { value: EmailProvider; label: string }[] = [
    { value: "brevo", label: "Brevo (Sendinblue)" },
    { value: "mailchimp", label: "Mailchimp Transactional" },
    { value: "sendgrid", label: "SendGrid" },
    { value: "smtp", label: "SMTP (any mail server)" },
    { value: "custom_http", label: "Other (custom HTTP API)" },
];

const SenderConfigDrawer: React.FC<Props> = ({ open, onClose, shopId, defaultChannel }) => {
    const { message: toast } = App.useApp();
    const queryClient = useQueryClient();
    const [channel, setChannel] = useState<MessagingChannel>(defaultChannel || "sms");
    const [showForm, setShowForm] = useState(false);
    const [editingSender, setEditingSender] = useState<SenderConfig | null>(null);
    const [saving, setSaving] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [testTarget, setTestTarget] = useState<Record<string, string>>({});
    const [form] = Form.useForm();
    const isEdit = !!editingSender;

    React.useEffect(() => {
        if (open && defaultChannel) setChannel(defaultChannel);
    }, [open, defaultChannel]);

    const { data, isLoading } = useQuery({
        queryKey: ["messaging-senders", shopId, channel],
        queryFn: () => fetchSenders({ shop_id: shopId, channel }),
        enabled: !!shopId && open,
    });
    const senders = data?.senders || [];

    const provider = Form.useWatch("provider", form);
    const providerOptions = channel === "sms" ? SMS_PROVIDERS : EMAIL_PROVIDERS;

    const reload = () => queryClient.invalidateQueries({ queryKey: ["messaging-senders", shopId] });

    const openNew = () => {
        setEditingSender(null);
        form.resetFields();
        form.setFieldsValue({ default_template: "simple" });
        setShowForm(true);
    };

    const openEdit = (sender: SenderConfig) => {
        setEditingSender(sender);
        form.setFieldsValue({
            name: sender.name,
            provider: sender.provider,
            sender_id: sender.sender_id,
            from_email: sender.from_email,
            from_name: sender.from_name,
            default_template: sender.default_template || "simple",
            is_default: sender.is_default,
        });
        setShowForm(true);
    };

    const handleSubmit = async (values: any) => {
        setSaving(true);
        try {
            const {
                name, sender_id, from_email, from_name, is_default, default_template,
                api_key, username, sandbox, client_id, base_url,
                account_sid, auth_token, messaging_service_sid, from_number,
                host, port, secure, password, url, method, headers, body_template,
            } = values;

            const credentials: Record<string, any> = {};
            if (api_key) credentials.api_key = api_key;
            if (username) credentials.username = username;
            if (sandbox !== undefined) credentials.sandbox = sandbox;
            if (client_id) credentials.client_id = client_id;
            if (base_url) credentials.base_url = base_url;
            if (account_sid) credentials.account_sid = account_sid;
            if (auth_token) credentials.auth_token = auth_token;
            if (messaging_service_sid) credentials.messaging_service_sid = messaging_service_sid;
            if (from_number) credentials.from_number = from_number;
            if (host) credentials.host = host;
            if (port) credentials.port = port;
            if (secure !== undefined) credentials.secure = secure;
            if (password) credentials.password = password;
            if (url) credentials.url = url;
            if (method) credentials.method = method;
            if (headers) {
                try { credentials.headers = JSON.parse(headers); } catch { /* ignore invalid JSON */ }
            }
            if (body_template) {
                try { credentials.body_template = JSON.parse(body_template); } catch { credentials.body_template = body_template; }
            }

            if (isEdit && editingSender) {
                await updateSender(editingSender._id, {
                    shop_id: shopId,
                    name,
                    sender_id,
                    from_email,
                    from_name,
                    default_template,
                    is_default,
                    credentials,
                });
            } else {
                await connectSender({
                    shop_id: shopId,
                    channel,
                    provider: values.provider,
                    name,
                    sender_id,
                    from_email,
                    from_name,
                    default_template,
                    is_default,
                    credentials,
                });
            }
            form.resetFields();
            setShowForm(false);
            setEditingSender(null);
            reload();
        } catch {
            /* toast handled in service */
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnect = async (id: string) => {
        await disconnectSender(id, shopId);
        reload();
    };

    const handleTest = async (id: string) => {
        const to = testTarget[id];
        if (!to) {
            toast.warning(channel === "sms" ? "Enter a phone number to test" : "Enter an email to test");
            return;
        }
        setTestingId(id);
        try {
            await testSender(id, shopId, to);
            reload();
        } catch {
            /* toast handled in service */
        } finally {
            setTestingId(null);
        }
    };

    const renderProviderFields = useMemo(() => {
        const req = !isEdit; // credentials become optional when editing — blank = keep existing
        const keepHint = (label: string) => isEdit ? `Leave blank to keep existing ${label}` : label;

        switch (provider) {
            case "africastalking":
                return (
                    <>
                        <Form.Item name="username" label="Username" rules={[{ required: req }]}>
                            <Input placeholder={keepHint("Africa's Talking username")} />
                        </Form.Item>
                        <Form.Item name="api_key" label="API Key" rules={[{ required: req }]}>
                            <Input.Password placeholder={keepHint("Africa's Talking API key")} />
                        </Form.Item>
                        <Form.Item name="sender_id" label="Sender ID / Shortcode">
                            <Input placeholder="e.g. 22123 or AFRICASTKNG" />
                        </Form.Item>
                        <Form.Item name="sandbox" label="Use sandbox" valuePropName="checked" initialValue={false}>
                            <Switch />
                        </Form.Item>
                    </>
                );
            case "onfon":
                return (
                    <>
                        <Form.Item name="client_id" label="Client ID" rules={[{ required: req }]}>
                            <Input placeholder={keepHint("Onfon Client ID")} />
                        </Form.Item>
                        <Form.Item name="api_key" label="API Key" rules={[{ required: req }]}>
                            <Input.Password placeholder={keepHint("Onfon API key")} />
                        </Form.Item>
                        <Form.Item name="sender_id" label="Sender ID / Shortcode" rules={[{ required: req }]}>
                            <Input placeholder="e.g. BIGGIEPOS" />
                        </Form.Item>
                        <Form.Item name="base_url" label="API Base URL (optional)">
                            <Input placeholder="https://api.onfonmedia.co.ke/v1/sms" />
                        </Form.Item>
                    </>
                );
            case "twilio":
                return (
                    <>
                        <Form.Item name="account_sid" label="Account SID" rules={[{ required: req }]}>
                            <Input placeholder={keepHint("ACxxxxxxxxxxxxxxxx")} />
                        </Form.Item>
                        <Form.Item name="auth_token" label="Auth Token" rules={[{ required: req }]}>
                            <Input.Password placeholder={keepHint("Twilio auth token")} />
                        </Form.Item>
                        <Form.Item name="from_number" label="From Number">
                            <Input placeholder="+1415XXXXXXX" />
                        </Form.Item>
                        <Form.Item name="messaging_service_sid" label="Messaging Service SID (optional)">
                            <Input placeholder="MGxxxxxxxxxxxxxxxx" />
                        </Form.Item>
                    </>
                );
            case "brevo":
            case "mailchimp":
            case "sendgrid":
                return (
                    <>
                        <Form.Item name="api_key" label="API Key" rules={[{ required: req }]}>
                            <Input.Password placeholder={keepHint(`${provider} API key`)} />
                        </Form.Item>
                        <Form.Item name="from_email" label="From Email" rules={[{ required: req, type: "email" }]}>
                            <Input placeholder="campaigns@yourbusiness.com" />
                        </Form.Item>
                        <Form.Item name="from_name" label="From Name">
                            <Input placeholder="Your Business Name" />
                        </Form.Item>
                    </>
                );
            case "smtp":
                return (
                    <>
                        <Form.Item name="host" label="SMTP Host" rules={[{ required: req }]}>
                            <Input placeholder="smtp.yourprovider.com" />
                        </Form.Item>
                        <Space.Compact style={{ width: "100%" }}>
                            <Form.Item name="port" label="Port" style={{ width: "40%" }} initialValue={587}>
                                <InputNumber style={{ width: "100%" }} />
                            </Form.Item>
                            <Form.Item name="secure" label="Use TLS/SSL" valuePropName="checked" style={{ width: "60%", paddingLeft: 12 }}>
                                <Switch />
                            </Form.Item>
                        </Space.Compact>
                        <Form.Item name="username" label="Username" rules={[{ required: req }]}>
                            <Input placeholder={keepHint("SMTP username")} />
                        </Form.Item>
                        <Form.Item name="password" label="Password" rules={[{ required: req }]}>
                            <Input.Password placeholder={keepHint("SMTP password")} />
                        </Form.Item>
                        <Form.Item name="from_email" label="From Email" rules={[{ required: req, type: "email" }]}>
                            <Input placeholder="campaigns@yourbusiness.com" />
                        </Form.Item>
                        <Form.Item name="from_name" label="From Name">
                            <Input placeholder="Your Business Name" />
                        </Form.Item>
                    </>
                );
            case "custom_http":
                return (
                    <>
                        <Form.Item name="url" label="Request URL" rules={[{ required: req }]}>
                            <Input placeholder={keepHint("https://your-gateway.com/send")} />
                        </Form.Item>
                        <Form.Item name="method" label="HTTP Method" initialValue="POST">
                            <Select>
                                <Option value="POST">POST</Option>
                                <Option value="GET">GET</Option>
                                <Option value="PUT">PUT</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="headers" label="Headers (JSON)" tooltip="e.g. { &quot;Authorization&quot;: &quot;Bearer xxx&quot; }">
                            <Input.TextArea rows={2} placeholder='{ "Authorization": "Bearer xxx" }' />
                        </Form.Item>
                        <Form.Item
                            name="body_template"
                            label="Body Template (JSON)"
                            tooltip={channel === "sms"
                                ? "Use {{to}}, {{message}}, {{sender_id}} placeholders"
                                : "Use {{to}}, {{subject}}, {{html}}, {{from_email}}, {{from_name}} placeholders"}
                        >
                            <Input.TextArea rows={3} placeholder='{ "to": "{{to}}", "message": "{{message}}" }' />
                        </Form.Item>
                        {channel === "email" && (
                            <>
                                <Form.Item name="from_email" label="From Email">
                                    <Input placeholder="campaigns@yourbusiness.com" />
                                </Form.Item>
                                <Form.Item name="from_name" label="From Name">
                                    <Input placeholder="Your Business Name" />
                                </Form.Item>
                            </>
                        )}
                        {channel === "sms" && (
                            <Form.Item name="sender_id" label="Sender ID (optional)">
                                <Input placeholder="e.g. your shortcode" />
                            </Form.Item>
                        )}
                    </>
                );
            default:
                return null;
        }
    }, [provider, channel, isEdit]);

    return (
        <Drawer
            title={
                <Space>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "5px 7px", color: C.primary }}>
                        <MessageOutlined />
                    </div>
                    <Text strong>Connect SMS / Email Senders</Text>
                </Space>
            }
            open={open}
            onClose={() => { setShowForm(false); setEditingSender(null); form.resetFields(); onClose(); }}
            width="min(560px, 96vw)"
        >
            <Tabs
                activeKey={channel}
                onChange={(k) => { setChannel(k as MessagingChannel); setShowForm(false); setEditingSender(null); form.resetFields(); }}
                items={[
                    { key: "sms", label: <span><MessageOutlined /> SMS</span> },
                    { key: "email", label: <span><MailOutlined /> Email</span> },
                ]}
            />

            {!showForm ? (
                <>
                    <List
                        loading={isLoading}
                        dataSource={senders}
                        locale={{ emptyText: <Empty description={`No ${channel === "sms" ? "SMS" : "email"} sender connected yet`} /> }}
                        renderItem={(sender: SenderConfig) => (
                            <List.Item
                                key={sender._id}
                                style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }}
                            >
                                <div style={{ width: "100%" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Space size={6}>
                                            <Text strong style={{ fontSize: 13 }}>
                                                {sender.name || sender.provider}
                                            </Text>
                                            {sender.is_default && <Tag color="gold" icon={<StarFilled />} style={{ fontSize: 10 }}>Default</Tag>}
                                            {sender.last_test_status === "success" && (
                                                <Tag color="success" icon={<CheckCircleFilled />} style={{ fontSize: 10 }}>Verified</Tag>
                                            )}
                                            {sender.last_test_status === "failed" && (
                                                <Tag color="error" style={{ fontSize: 10 }}>Test failed</Tag>
                                            )}
                                        </Space>
                                        <Space size={4}>
                                            <Tooltip title="Edit sender details">
                                                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(sender)} />
                                            </Tooltip>
                                            <Popconfirm title="Disconnect this sender?" onConfirm={() => handleDisconnect(sender._id)}>
                                                <Button size="small" danger type="text" icon={<DisconnectOutlined />} />
                                            </Popconfirm>
                                        </Space>
                                    </div>
                                    <Text style={{ fontSize: 11, color: C.subText, display: "block", marginTop: 2 }}>
                                        {sender.provider}
                                        {sender.sender_id ? ` · ${sender.sender_id}` : ""}
                                        {sender.from_email ? ` · ${sender.from_email}` : ""}
                                    </Text>
                                    <Space.Compact style={{ width: "100%", marginTop: 8 }}>
                                        <Input
                                            size="small"
                                            placeholder={channel === "sms" ? "Test phone e.g. 0712345678" : "Test email address"}
                                            value={testTarget[sender._id] || ""}
                                            onChange={(e) => setTestTarget((p) => ({ ...p, [sender._id]: e.target.value }))}
                                        />
                                        <Tooltip title="Send a test message">
                                            <Button
                                                size="small"
                                                icon={<ExperimentOutlined />}
                                                loading={testingId === sender._id}
                                                onClick={() => handleTest(sender._id)}
                                            >
                                                Test
                                            </Button>
                                        </Tooltip>
                                    </Space.Compact>
                                </div>
                            </List.Item>
                        )}
                    />
                    <Button block icon={<PlusOutlined />} onClick={openNew} style={{ borderRadius: 8, marginTop: 4 }}>
                        Connect a new {channel === "sms" ? "SMS" : "email"} sender
                    </Button>
                </>
            ) : (
                <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 12 }}>
                    <Form.Item name="name" label="Label (optional)">
                        <Input placeholder="e.g. Main shortcode" />
                    </Form.Item>
                    <Form.Item
                        name="provider"
                        label="Provider"
                        rules={[{ required: true }]}
                        tooltip={isEdit ? "To switch providers, disconnect this sender and connect a new one" : undefined}
                    >
                        <Select
                            placeholder="Select a provider"
                            disabled={isEdit}
                            onChange={() => form.setFieldsValue({})}
                        >
                            {providerOptions.map((p) => (
                                <Option key={p.value} value={p.value}>{p.label}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {renderProviderFields}

                    {channel === "email" && (
                        <Form.Item
                            name="default_template"
                            label="Default Email Template"
                            tooltip="Used to pre-select a look when composing from this sender — can be changed per-send"
                            initialValue="simple"
                        >
                            <Select>
                                {EMAIL_TEMPLATES.map((t) => (
                                    <Option key={t.id} value={t.id}>{t.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item name="is_default" label="Set as default for this channel" valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                        <Button onClick={() => { setShowForm(false); setEditingSender(null); form.resetFields(); }} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit" loading={saving}
                            style={{ background: C.primary, borderColor: C.primary }}>
                            {isEdit ? "Save Changes" : "Connect"}
                        </Button>
                    </Space>
                </Form>
            )}
        </Drawer>
    );
};

export default SenderConfigDrawer;
