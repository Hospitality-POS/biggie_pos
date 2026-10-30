import React, { useEffect, useState } from "react";
import {
    Modal,
    Tabs,
    Form,
    Input,
    Radio,
    Button,
    Typography,
    List,
    Avatar,
    Tag,
    Empty,
    Result,
    App,
} from "antd";
import { UserOutlined, SendOutlined, TeamOutlined } from "@ant-design/icons";
import {
    sendToPhoneNumber,
    fetchBroadcastRecipients,
    sendBroadcastMessage,
    type BroadcastAudience,
    type BroadcastRecipient,
} from "@services/whatsappService";

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface Props {
    open: boolean;
    onClose: () => void;
    shopId: string;
    onSent?: () => void;
}

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
    customers: "All Customers",
    leads: "All Leads",
    both: "Customers + Leads",
    all_chats: "All WhatsApp Chats",
};

const NewMessageModal: React.FC<Props> = ({ open, onClose, shopId, onSent }) => {
    const { message: antMessage } = App.useApp();
    const [activeTab, setActiveTab] = useState<"number" | "broadcast">("number");

    // ── Send to number state ───────────────────────────────────────────────
    const [phoneForm] = Form.useForm();
    const [sendingToNumber, setSendingToNumber] = useState(false);

    // ── Broadcast state ─────────────────────────────────────────────────────
    const [audience, setAudience] = useState<BroadcastAudience>("both");
    const [broadcastContent, setBroadcastContent] = useState("");
    const [step, setStep] = useState<"compose" | "preview" | "done">("compose");
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [preview, setPreview] = useState<{ total: number; recipients: BroadcastRecipient[] }>({
        total: 0,
        recipients: [],
    });
    const [sendingBroadcast, setSendingBroadcast] = useState(false);
    const [queuedCount, setQueuedCount] = useState(0);

    // Live recipient count shown as soon as an audience is picked
    const [audienceCount, setAudienceCount] = useState<number | null>(null);
    const [countLoading, setCountLoading] = useState(false);

    useEffect(() => {
        if (!open || activeTab !== "broadcast" || step !== "compose" || !shopId) return;
        let cancelled = false;
        setCountLoading(true);
        fetchBroadcastRecipients({ shop_id: shopId, audience })
            .then((data) => {
                if (!cancelled) setAudienceCount(data?.total ?? 0);
            })
            .finally(() => {
                if (!cancelled) setCountLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, activeTab, audience, step, shopId]);

    const resetState = () => {
        phoneForm.resetFields();
        setActiveTab("number");
        setAudience("both");
        setBroadcastContent("");
        setStep("compose");
        setPreview({ total: 0, recipients: [] });
        setQueuedCount(0);
        setAudienceCount(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleSendToNumber = async () => {
        try {
            const values = await phoneForm.validateFields();
            setSendingToNumber(true);
            const result = await sendToPhoneNumber({
                shop_id: shopId,
                phone_number: values.phone_number,
                content: values.content,
                contact_name: values.contact_name || undefined,
            });
            if (result) {
                onSent?.();
                handleClose();
            }
        } catch (err) {
            // validation errors are shown inline by the form
        } finally {
            setSendingToNumber(false);
        }
    };

    const handlePreview = async () => {
        if (!broadcastContent.trim()) {
            antMessage.warning("Please type a message first");
            return;
        }
        setLoadingPreview(true);
        try {
            const data = await fetchBroadcastRecipients({ shop_id: shopId, audience });
            setPreview(data);
            setStep("preview");
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleConfirmBroadcast = async () => {
        setSendingBroadcast(true);
        try {
            const result = await sendBroadcastMessage({
                shop_id: shopId,
                content: broadcastContent,
                audience,
            });
            if (result) {
                setQueuedCount(result.queued ?? preview.total);
                setStep("done");
                onSent?.();
            }
        } finally {
            setSendingBroadcast(false);
        }
    };

    return (
        <Modal
            title="New Message"
            open={open}
            onCancel={handleClose}
            footer={null}
            width={560}
            destroyOnClose
        >
            <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as "number" | "broadcast")}
                items={[
                    {
                        key: "number",
                        label: (
                            <span>
                                <UserOutlined /> Send to Number
                            </span>
                        ),
                        children: (
                            <Form form={phoneForm} layout="vertical" style={{ marginTop: 12 }}>
                                <Form.Item
                                    name="phone_number"
                                    label="Phone number"
                                    rules={[{ required: true, message: "Phone number is required" }]}
                                >
                                    <Input placeholder="e.g. 254712345678" size="large" />
                                </Form.Item>
                                <Form.Item name="contact_name" label="Contact name (optional)">
                                    <Input placeholder="e.g. Jane Doe" size="large" />
                                </Form.Item>
                                <Form.Item
                                    name="content"
                                    label="Message"
                                    rules={[{ required: true, message: "Message is required" }]}
                                >
                                    <TextArea rows={4} placeholder="Type your message…" />
                                </Form.Item>
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    onClick={handleSendToNumber}
                                    loading={sendingToNumber}
                                    block
                                    size="large"
                                >
                                    Send Message
                                </Button>
                            </Form>
                        ),
                    },
                    {
                        key: "broadcast",
                        label: (
                            <span>
                                <TeamOutlined /> Broadcast
                            </span>
                        ),
                        children: (
                            <div style={{ marginTop: 12 }}>
                                {step === "compose" && (
                                    <>
                                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                                            Send to
                                        </Text>
                                        <Radio.Group
                                            value={audience}
                                            onChange={(e) => setAudience(e.target.value)}
                                            style={{ marginBottom: 4 }}
                                        >
                                            <Radio.Button value="customers">Customers</Radio.Button>
                                            <Radio.Button value="leads">Leads</Radio.Button>
                                            <Radio.Button value="both">Both</Radio.Button>
                                            <Radio.Button value="all_chats">All Chats</Radio.Button>
                                        </Radio.Group>
                                        <Text
                                            type="secondary"
                                            style={{ display: "block", marginBottom: 16, fontSize: 12 }}
                                        >
                                            {countLoading
                                                ? "Counting recipients…"
                                                : audienceCount !== null
                                                    ? `Will send to ${audienceCount} recipient(s)`
                                                    : " "}
                                        </Text>
                                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                                            Message
                                        </Text>
                                        <TextArea
                                            rows={5}
                                            placeholder="Type the message to broadcast…"
                                            value={broadcastContent}
                                            onChange={(e) => setBroadcastContent(e.target.value)}
                                            style={{ marginBottom: 16 }}
                                        />
                                        <Button
                                            type="primary"
                                            onClick={handlePreview}
                                            loading={loadingPreview}
                                            block
                                            size="large"
                                        >
                                            Preview Recipients
                                        </Button>
                                    </>
                                )}

                                {step === "preview" && (
                                    <>
                                        <Paragraph>
                                            This message will be sent to{" "}
                                            <Text strong>{preview.total}</Text> recipient(s) —{" "}
                                            <Tag>{AUDIENCE_LABELS[audience]}</Tag>
                                        </Paragraph>
                                        <div
                                            style={{
                                                background: "#fafafa",
                                                border: "1px solid #f0f0f0",
                                                borderRadius: 8,
                                                padding: 12,
                                                marginBottom: 16,
                                                whiteSpace: "pre-wrap",
                                            }}
                                        >
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Message preview
                                            </Text>
                                            <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                                                {broadcastContent}
                                            </Paragraph>
                                        </div>

                                        {preview.total === 0 ? (
                                            <Empty description="No recipients with a valid phone number found" />
                                        ) : (
                                            <List
                                                size="small"
                                                style={{ maxHeight: 220, overflowY: "auto", marginBottom: 16 }}
                                                dataSource={preview.recipients}
                                                renderItem={(r) => (
                                                    <List.Item>
                                                        <List.Item.Meta
                                                            avatar={<Avatar icon={<UserOutlined />} size="small" />}
                                                            title={<Text style={{ fontSize: 13 }}>{r.name}</Text>}
                                                            description={
                                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                                    {r.phone} ·{" "}
                                                                    {r.source === "customer" ? "Customer" : r.source === "lead" ? "Lead" : "Chat"}
                                                                </Text>
                                                            }
                                                        />
                                                    </List.Item>
                                                )}
                                            />
                                        )}
                                        {preview.total > preview.recipients.length && (
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Showing first {preview.recipients.length} of {preview.total}…
                                            </Text>
                                        )}

                                        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                                            <Button block onClick={() => setStep("compose")}>
                                                Back
                                            </Button>
                                            <Button
                                                type="primary"
                                                danger={preview.total > 50}
                                                block
                                                icon={<SendOutlined />}
                                                loading={sendingBroadcast}
                                                disabled={preview.total === 0}
                                                onClick={handleConfirmBroadcast}
                                            >
                                                Send to {preview.total}
                                            </Button>
                                        </div>
                                    </>
                                )}

                                {step === "done" && (
                                    <Result
                                        status="success"
                                        title="Broadcast queued"
                                        subTitle={`Sending to ${queuedCount} recipient(s) in the background. This may take a few minutes.`}
                                        extra={
                                            <Button type="primary" onClick={handleClose}>
                                                Close
                                            </Button>
                                        }
                                    />
                                )}
                            </div>
                        ),
                    },
                ]}
            />
        </Modal>
    );
};

export default NewMessageModal;
