import React, { useEffect, useMemo, useState } from "react";
import { Modal, Form, Input, Select, Button, Typography, Space } from "antd";
import { SendOutlined, EyeOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchSenders, sendSingleMessage, MessagingChannel } from "@services/omnichannel/messagingCampaigns";
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

/**
 * Send a single SMS or email right now — a true one-off send, sent directly
 * through the provider. It is NOT a campaign — nothing is saved to the
 * campaigns list/table, so it won't clutter your bulk-campaign tracking.
 */
const QuickSendModal: React.FC<Props> = ({ open, onClose, onSuccess, shopId, channel }) => {
    const [form] = Form.useForm();
    const [sending, setSending] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const isEmail = channel === "email";

    const senderConfigId = Form.useWatch("sender_config_id", form);
    const templateId = Form.useWatch("template_id", form) || "simple";
    const subjectVal = Form.useWatch("subject", form) || "";
    const messageVal = Form.useWatch("message", form) || "";

    const { data: sendersData } = useQuery({
        queryKey: ["messaging-senders", shopId, channel],
        queryFn: () => fetchSenders({ shop_id: shopId, channel }),
        enabled: !!shopId && open,
    });
    const senders = sendersData?.senders || [];

    useEffect(() => {
        if (!isEmail || !senderConfigId) return;
        const sender = senders.find((s) => s._id === senderConfigId);
        if (sender?.default_template) form.setFieldsValue({ template_id: sender.default_template });
    }, [senderConfigId, isEmail, senders, form]);

    const previewHtml = useMemo(
        () => isEmail ? getEmailTemplate(templateId).render(subjectVal || "Preview subject", messageVal || "Your message will appear here...") : "",
        [isEmail, templateId, subjectVal, messageVal]
    );

    const reset = () => { form.resetFields(); onClose(); };

    const handleSubmit = async (values: any) => {
        setSending(true);
        try {
            const finalMessage = isEmail
                ? getEmailTemplate(values.template_id).render(values.subject, values.message)
                : values.message;

            await sendSingleMessage({
                shop_id: shopId,
                channel,
                sender_config_id: values.sender_config_id,
                to: values.to,
                name: values.name,
                subject: values.subject,
                message: finalMessage,
            });
            reset();
            onSuccess();
        } catch {
            /* toast handled in service */
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={() => { if (!sending) reset(); }}
            destroyOnClose
            footer={null}
            width="min(480px, 94vw)"
            title={
                <Space>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary }}>
                        <SendOutlined />
                    </div>
                    <Text strong>Send a Single {isEmail ? "Email" : "SMS"}</Text>
                </Space>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ template_id: "simple" }}>
                <Form.Item
                    name="sender_config_id"
                    label="Send From"
                    rules={[{ required: true, message: "Connect and select a sender first" }]}
                >
                    <Select placeholder={senders.length ? "Select a connected sender" : "No senders connected yet"}>
                        {senders.map((s) => (
                            <Option key={s._id} value={s._id}>{s.name || s.provider} {s.is_default ? "· default" : ""}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="name" label="Recipient Name (optional)">
                    <Input placeholder="e.g. Jane Doe" />
                </Form.Item>

                <Form.Item
                    name="to"
                    label={isEmail ? "Email Address" : "Phone Number"}
                    rules={[{ required: true }]}
                >
                    <Input placeholder={isEmail ? "jane@example.com" : "0712345678"} />
                </Form.Item>

                {isEmail && (
                    <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
                        <Input placeholder="Email subject line" />
                    </Form.Item>
                )}

                {isEmail && (
                    <Form.Item name="template_id" label="Email Template">
                        <Select>
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
                    extra={isEmail && (
                        <Button size="small" type="link" icon={<EyeOutlined />} style={{ padding: 0 }} onClick={() => setPreviewOpen(true)}>
                            Preview template
                        </Button>
                    )}
                >
                    <TextArea rows={isEmail ? 5 : 3} />
                </Form.Item>

                <div style={{ display: "flex", gap: 10 }}>
                    <Button block onClick={reset} disabled={sending}>Cancel</Button>
                    <Button block type="primary" htmlType="submit" loading={sending} icon={<SendOutlined />}
                        style={{ background: C.primary, borderColor: C.primary }}>
                        Send Now
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

export default QuickSendModal;
