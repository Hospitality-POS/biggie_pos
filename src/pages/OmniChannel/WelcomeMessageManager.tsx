import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, Switch, Spin, Typography, Space } from "antd";
import { SaveOutlined, ThunderboltOutlined } from "@ant-design/icons";
import {
    fetchWelcomeMessage,
    saveWelcomeMessage,
    refineText,
    type WelcomeMessage,
} from "@services/whatsappService";

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

interface Props {
    shopId: string;
}

const WelcomeMessageManager: React.FC<Props> = ({ shopId }) => {
    const queryClient = useQueryClient();
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
        <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
            <Title level={4} style={{ marginBottom: 8 }}>
                Automated Welcome Message
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                This message is sent automatically the first time a customer reaches out on WhatsApp.
            </Paragraph>

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
                        <TextArea
                            rows={6}
                            placeholder="Hi! Welcome to our shop. How can we help you today?"
                        />
                    </Form.Item>

                    <Form.Item noStyle>
                        <Space style={{ marginBottom: 24 }}>
                            <Input
                                placeholder="Refine instructions (optional)"
                                value={refineInstruction}
                                onChange={(e) => setRefineInstruction(e.target.value)}
                                style={{ width: 320 }}
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
    );
};

export default WelcomeMessageManager;
