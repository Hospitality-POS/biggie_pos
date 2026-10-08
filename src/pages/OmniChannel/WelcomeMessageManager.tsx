import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Grid, Input, Switch, Spin, Typography, Space } from "antd";
import { SaveOutlined, ThunderboltOutlined, RobotOutlined } from "@ant-design/icons";
import {
    fetchWelcomeMessage,
    saveWelcomeMessage,
    refineText,
    type WelcomeMessage,
} from "@services/whatsappService";
import TinyMCEInput from "@components/TinyMCEInput";

const { Title, Paragraph } = Typography;

interface Props {
    shopId: string;
}

const WelcomeMessageManager: React.FC<Props> = ({ shopId }) => {
    const queryClient = useQueryClient();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const [form] = Form.useForm();

    const { data, isLoading } = useQuery({
        queryKey: ["omnichannel-welcome-message", shopId],
        queryFn: () => fetchWelcomeMessage({ shop_id: shopId }),
        enabled: !!shopId,
    });

    const welcome = data?.welcome as WelcomeMessage | null | undefined;

    useEffect(() => {
        form.setFieldsValue({
            message: welcome?.message || "",
            is_active: welcome ? !!welcome.is_active : true,
        });
    }, [welcome, form]);

    const saveMutation = useMutation({
        mutationFn: saveWelcomeMessage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["omnichannel-welcome-message"] });
        },
    });

    const [refineInstruction, setRefineInstruction] = useState("");

    const refineMutation = useMutation({
        mutationFn: (payload: { text: string; instruction: string }) =>
            refineText(payload),
        onSuccess: (data: any) => {
            if (data?.result) {
                form.setFieldValue("message", data.result);
            }
        },
    });

    const handleSubmit = (values: { message: string; is_active: boolean }) => {
        saveMutation.mutate({
            shop_id: shopId,
            message: values.message,
            is_active: values.is_active,
        });
    };

    return (
        <div style={{ padding: isMobile ? 12 : 20, height: "100%", overflowY: "auto" }}>
            <Space align="center" size={10} style={{ marginBottom: isMobile ? 12 : 16 }}>
                <div
                    style={{
                        background: "#f5f3ff",
                        borderRadius: 10,
                        padding: "6px 8px",
                        color: "#6366f1",
                        fontSize: 18,
                        display: "flex",
                    }}
                >
                    <RobotOutlined />
                </div>
                <div>
                    <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>
                        Automated Welcome Message
                    </Title>
                    <Paragraph style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                        Sent automatically the first time a customer reaches out on WhatsApp
                    </Paragraph>
                </div>
            </Space>

            <div
                style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: isMobile ? 14 : 20,
                    maxWidth: 720,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
            >
            {isLoading ? (
                <div style={{ textAlign: "center", padding: 60 }}>
                    <Spin />
                </div>
            ) : (
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{ message: "", is_active: true }}
                    style={{ maxWidth: 700 }}
                >
                    <Form.Item
                        name="message"
                        label="Welcome message"
                        rules={[{ required: true, message: "Please enter a welcome message" }]}
                    >
                        <TinyMCEInput
                            height={220}
                            plainText
                            placeholder="Hi! Welcome to our shop. How can we help you today?"
                        />
                    </Form.Item>

                    <Form.Item noStyle>
                        <Space wrap style={{ marginBottom: 24, width: "100%" }}>
                            <Input
                                placeholder="Refine instructions (optional)"
                                value={refineInstruction}
                                onChange={(e) => setRefineInstruction(e.target.value)}
                                style={{ width: isMobile ? "100%" : 320 }}
                            />
                            <Button
                                icon={<ThunderboltOutlined />}
                                loading={refineMutation.isLoading}
                                onClick={() => {
                                    const current = form.getFieldValue("message");
                                    const instruction = refineInstruction.trim() ||
                                        "Make it more professional and friendly for WhatsApp";
                                    refineMutation.mutate({ text: current, instruction });
                                }}
                            >
                                Improve with AI
                            </Button>
                        </Space>
                    </Form.Item>

                    <Form.Item
                        name="is_active"
                        valuePropName="checked"
                        label="Enabled"
                    >
                        <Switch checkedChildren="On" unCheckedChildren="Off" />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={saveMutation.isLoading}
                        >
                            Save Welcome Message
                        </Button>
                    </Form.Item>
                </Form>
            )}
            </div>
        </div>
    );
};

export default WelcomeMessageManager;
