import React, { useEffect, useMemo, useState } from "react";
import {
    Modal, Form, Input, Select, Radio, Button, Upload, Typography,
    Space, Alert, Tag, App,
} from "antd";
import { UploadOutlined, DownloadOutlined, NotificationOutlined, PlusOutlined, EyeOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    fetchSenders, previewAudience, importContacts, downloadContactsTemplate,
    createCampaign, MessagingChannel, CampaignAudience,
} from "@services/omnichannel/messagingCampaigns";
import { fetchAllCampaigns } from "@services/crm/campaigns";
import { EMAIL_TEMPLATES, getEmailTemplate } from "./emailTemplates";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const C = THEME_C;

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    shopId: string;
    channel: MessagingChannel;
}

interface ParsedContact { name?: string; phone?: string; email?: string; source: string }

const CampaignFormModal: React.FC<Props> = ({ open, onClose, onSuccess, shopId, channel }) => {
    const { message: toast } = App.useApp();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importedContacts, setImportedContacts] = useState<ParsedContact[]>([]);
    const [manualText, setManualText] = useState("");
    const [previewOpen, setPreviewOpen] = useState(false);

    const audience: CampaignAudience = Form.useWatch("audience", form) || "manual";
    const senderConfigId = Form.useWatch("sender_config_id", form);
    const templateId = Form.useWatch("template_id", form) || "simple";
    const subjectVal = Form.useWatch("subject", form) || "";
    const messageVal = Form.useWatch("message", form) || "";
    const isEmail = channel === "email";

    const { data: sendersData } = useQuery({
        queryKey: ["messaging-senders", shopId, channel],
        queryFn: () => fetchSenders({ shop_id: shopId, channel }),
        enabled: !!shopId && open,
    });
    const senders = sendersData?.senders || [];

    // Default the template to the selected sender's preferred template.
    useEffect(() => {
        if (!isEmail || !senderConfigId) return;
        const sender = senders.find((s) => s._id === senderConfigId);
        if (sender?.default_template) form.setFieldsValue({ template_id: sender.default_template });
    }, [senderConfigId, isEmail, senders, form]);

    const { data: crmCampaignsData } = useQuery({
        queryKey: ["crm-campaigns-link-list", shopId],
        queryFn: () => fetchAllCampaigns({ shop_id: shopId, limit: 100 }),
        enabled: !!shopId && open,
    });
    const crmCampaigns = crmCampaignsData?.campaigns || [];

    const { data: audiencePreview } = useQuery({
        queryKey: ["messaging-audience-preview", shopId, audience, channel],
        queryFn: () => previewAudience({ shop_id: shopId, audience: audience as "customers" | "leads" | "both", channel }),
        enabled: !!shopId && open && ["customers", "leads", "both"].includes(audience),
    });

    const manualContacts = useMemo<ParsedContact[]>(() => {
        if (audience !== "manual" || !manualText.trim()) return [];
        return manualText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const parts = line.split(",").map((p) => p.trim());
                if (parts.length >= 2) {
                    const contact: ParsedContact = { name: parts[0], source: "manual" };
                    if (channel === "email") contact.email = parts[1]; else contact.phone = parts[1];
                    return contact;
                }
                const contact: ParsedContact = { source: "manual" };
                if (channel === "email") contact.email = parts[0]; else contact.phone = parts[0];
                return contact;
            });
    }, [manualText, audience, channel]);

    const recipientCount =
        audience === "excel" ? importedContacts.length
            : audience === "manual" ? manualContacts.length
                : (audiencePreview?.total ?? 0);

    const previewHtml = useMemo(
        () => isEmail ? getEmailTemplate(templateId).render(subjectVal || "Preview subject", messageVal || "Your message will appear here...") : "",
        [isEmail, templateId, subjectVal, messageVal]
    );

    const handleUpload = async (file: File) => {
        setImporting(true);
        try {
            const res = await importContacts(shopId, file);
            setImportedContacts(res.contacts);
            toast.success(`Imported ${res.contacts.length} contact(s)${res.errors?.length ? ` (${res.errors.length} skipped)` : ""}`);
        } catch {
            /* toast handled in service */
        } finally {
            setImporting(false);
        }
        return false; // prevent antd's default upload behaviour
    };

    const handleSubmit = async (values: any) => {
        if (recipientCount === 0) {
            toast.warning("Add at least one recipient before creating the campaign");
            return;
        }
        setSaving(true);
        try {
            const manual_recipients = audience === "excel" ? importedContacts
                : audience === "manual" ? manualContacts
                    : undefined;

            const selectedCampaign = crmCampaigns.find((c) => c._id === values.campaign_id);
            const finalMessage = isEmail
                ? getEmailTemplate(values.template_id).render(values.subject, values.message)
                : values.message;

            const res = await createCampaign({
                shop_id: shopId,
                name: selectedCampaign?.name || "Untitled Campaign",
                channel,
                subject: values.subject,
                message: finalMessage,
                sender_config_id: values.sender_config_id,
                audience: values.audience,
                manual_recipients,
                campaign_id: values.campaign_id,
            });

            form.resetFields();
            setImportedContacts([]);
            setManualText("");
            onClose();
            onSuccess();
            return res;
        } catch {
            /* toast handled in service */
        } finally {
            setSaving(false);
        }
    };

    const reset = () => {
        form.resetFields();
        setImportedContacts([]);
        setManualText("");
        onClose();
    };

    return (
        <Modal
            open={open}
            onCancel={() => { if (!saving) reset(); }}
            destroyOnClose
            footer={null}
            width="min(620px, 96vw)"
            styles={{ body: { maxHeight: "78vh", overflowY: "auto", paddingTop: 8 } }}
            title={
                <Space>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary }}>
                        <NotificationOutlined />
                    </div>
                    <Text strong>New {isEmail ? "Email" : "SMS"} Campaign</Text>
                </Space>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ audience: "both", template_id: "simple" }}>
                <Form.Item
                    name="campaign_id"
                    label="Campaign Name"
                    rules={[{ required: true, message: "Select a marketing campaign" }]}
                    tooltip="This blast is tied to a CRM → Campaigns record so sends roll up into its budget/ROI tracking"
                    extra={
                        <Link to="/crm/campaigns" target="_blank" style={{ fontSize: 11 }}>
                            <PlusOutlined /> Don't see it? Create a campaign in CRM → Campaigns first
                        </Link>
                    }
                >
                    <Select
                        placeholder={crmCampaigns.length ? "Select a campaign" : "No campaigns found"}
                        showSearch
                        optionFilterProp="children"
                        notFoundContent="No campaigns yet — create one in CRM → Campaigns first"
                        autoFocus
                    >
                        {crmCampaigns.map((c) => (
                            <Option key={c._id} value={c._id}>{c.name}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="sender_config_id"
                    label="Send From"
                    rules={[{ required: true, message: "Connect and select a sender first" }]}
                >
                    <Select
                        placeholder={senders.length ? "Select a connected sender" : "No senders connected yet"}
                        notFoundContent="Connect a sender first (top-right button)"
                    >
                        {senders.map((s) => (
                            <Option key={s._id} value={s._id}>
                                {s.name || s.provider} {s.is_default ? "· default" : ""}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                {isEmail && (
                    <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
                        <Input placeholder="Email subject line" />
                    </Form.Item>
                )}

                {isEmail && (
                    <Form.Item name="template_id" label="Email Template">
                        <Select onSelect={() => setPreviewOpen(false)}>
                            {EMAIL_TEMPLATES.map((t) => (
                                <Option key={t.id} value={t.id}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.accent, display: "inline-block" }} />
                                        {t.name}
                                    </span>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                <Form.Item
                    name="message"
                    label={isEmail ? "Email Body" : "Message"}
                    rules={[{ required: true }]}
                    tooltip="Use {{name}} to personalize with the recipient's name"
                    extra={isEmail && (
                        <Button size="small" type="link" icon={<EyeOutlined />} style={{ padding: 0 }} onClick={() => setPreviewOpen(true)}>
                            Preview template
                        </Button>
                    )}
                >
                    <TextArea rows={isEmail ? 6 : 4} placeholder="Hi {{name}}, ..." />
                </Form.Item>

                <Form.Item name="audience" label="Send To" rules={[{ required: true }]}>
                    <Radio.Group
                        options={[
                            { label: "Customers", value: "customers" },
                            { label: "Leads", value: "leads" },
                            { label: "Both", value: "both" },
                            { label: "Import Excel", value: "excel" },
                            { label: "Paste List", value: "manual" },
                        ]}
                        optionType="button"
                        buttonStyle="solid"
                    />
                </Form.Item>

                {audience === "excel" && (
                    <div style={{ marginBottom: 16 }}>
                        <Space>
                            <Upload beforeUpload={handleUpload as any} showUploadList={false} accept=".xlsx,.xls,.csv">
                                <Button icon={<UploadOutlined />} loading={importing}>Upload Excel File</Button>
                            </Upload>
                            <Button icon={<DownloadOutlined />} type="link" onClick={downloadContactsTemplate}>
                                Download template
                            </Button>
                        </Space>
                        {importedContacts.length > 0 && (
                            <Alert
                                style={{ marginTop: 8 }}
                                type="success"
                                showIcon
                                message={`${importedContacts.length} contact(s) ready to import`}
                            />
                        )}
                    </div>
                )}

                {audience === "manual" && (
                    <Form.Item
                        label={channel === "email" ? "Paste emails (one per line, or 'Name, email')" : "Paste phone numbers (one per line, or 'Name, phone')"}
                    >
                        <TextArea
                            rows={4}
                            value={manualText}
                            onChange={(e) => setManualText(e.target.value)}
                            placeholder={channel === "email"
                                ? "Jane Doe, jane@example.com\njohn@example.com"
                                : "Jane Doe, 0712345678\n0798765432"}
                        />
                    </Form.Item>
                )}

                <Tag color={recipientCount > 0 ? "blue" : "default"} style={{ marginBottom: 16 }}>
                    {recipientCount} recipient(s) will receive this campaign
                </Tag>

                <div style={{ display: "flex", gap: 10 }}>
                    <Button block onClick={reset} disabled={saving}>Cancel</Button>
                    <Button
                        block type="primary" htmlType="submit" loading={saving}
                        style={{ background: C.primary, borderColor: C.primary }}
                    >
                        Create Campaign
                    </Button>
                </div>
            </Form>

            {isEmail && (
                <Modal
                    open={previewOpen}
                    onCancel={() => setPreviewOpen(false)}
                    footer={null}
                    title="Template Preview"
                    width="min(640px, 94vw)"
                >
                    <div
                        style={{ border: `1px solid ${C.border}`, borderRadius: 8, maxHeight: "70vh", overflowY: "auto" }}
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                </Modal>
            )}
        </Modal>
    );
};

export default CampaignFormModal;
