import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Table,
    Button,
    Input,
    Form,
    Space,
    Popconfirm,
    Modal,
    Typography,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined } from "@ant-design/icons";
import {
    fetchScripts,
    createScript,
    updateScript,
    deleteScript,
    refineText,
    type Script,
} from "@services/whatsappService";

const { TextArea } = Input;
const { Paragraph } = Typography;

interface Props {
    shopId: string;
    readOnly?: boolean;
    onSelect?: (script: Script) => void;
}

const ScriptsManager: React.FC<Props> = ({ shopId, readOnly = false, onSelect }) => {
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const [editing, setEditing] = useState<Script | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [preview, setPreview] = useState<Script | null>(null);
    const [refineInstruction, setRefineInstruction] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["omnichannel-scripts", shopId],
        queryFn: () => fetchScripts({ shop_id: shopId }),
        enabled: !!shopId,
    });

    const scripts: Script[] = data?.scripts || [];

    const createMutation = useMutation({
        mutationFn: createScript,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["omnichannel-scripts"] });
            form.resetFields();
            setIsModalOpen(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, values }: { id: string; values: Partial<Script> }) =>
            updateScript(id, values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["omnichannel-scripts"] });
            form.resetFields();
            setEditing(null);
            setIsModalOpen(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteScript,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["omnichannel-scripts"] });
        },
    });

    const refineMutation = useMutation({
        mutationFn: (payload: { text: string; instruction: string }) => refineText(payload),
        onSuccess: (data: any) => {
            if (data?.result) {
                form.setFieldValue("content", data.result);
            }
        },
    });

    const handleSubmit = async (values: { title: string; content: string; category?: string }) => {
        if (editing) {
            await updateMutation.mutateAsync({
                id: editing._id,
                values: { title: values.title, content: values.content, category: values.category },
            });
        } else {
            await createMutation.mutateAsync({
                shop_id: shopId,
                title: values.title,
                content: values.content,
                category: values.category,
            });
        }
    };

    const handleAdd = () => {
        setEditing(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (script: Script) => {
        setEditing(script);
        form.setFieldsValue({
            title: script.title,
            content: script.content,
            category: script.category,
        });
        setIsModalOpen(true);
    };

    const handleRowClick = (script: Script) => {
        if (readOnly) {
            if (onSelect) {
                onSelect(script);
            } else {
                setPreview(script);
            }
        }
    };

    const columns = [
        { title: "Title", dataIndex: "title", key: "title" },
        { title: "Category", dataIndex: "category", key: "category" },
        ...(readOnly
            ? []
            : [
                {
                    title: "Actions",
                    key: "actions",
                    render: (_: any, script: Script) => (
                        <Space>
                            <Button
                                icon={<EditOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(script);
                                }}
                            />
                            <Popconfirm
                                title="Delete script?"
                                onConfirm={(e) => {
                                    e?.stopPropagation();
                                    deleteMutation.mutate(script._id);
                                }}
                            >
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </Popconfirm>
                        </Space>
                    ),
                },
            ]),
    ];

    return (
        <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
            {!readOnly && (
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                    style={{ marginBottom: 16 }}
                >
                    Add Script
                </Button>
            )}

            <Table
                dataSource={scripts}
                columns={columns}
                rowKey="_id"
                loading={isLoading}
                pagination={false}
                onRow={(script) => ({
                    onClick: () => handleRowClick(script),
                    style: { cursor: readOnly ? "pointer" : "default" },
                })}
            />

            <Modal
                title={editing ? "Edit Script" : "Add Script"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={createMutation.isLoading || updateMutation.isLoading}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="title"
                        label="Title"
                        rules={[{ required: true, message: "Title is required" }]}
                    >
                        <Input placeholder="e.g. Welcome message" />
                    </Form.Item>
                    <Form.Item
                        name="category"
                        label="Category"
                    >
                        <Input placeholder="e.g. Greetings" />
                    </Form.Item>
                    <Form.Item
                        name="content"
                        label="Script Content"
                        rules={[{ required: true, message: "Content is required" }]}
                    >
                        <TextArea
                            rows={6}
                            placeholder="Type the script an agent can reference..."
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
                                    const current = form.getFieldValue("content");
                                    const instruction = refineInstruction.trim() ||
                                        "Make it more professional and friendly for WhatsApp";
                                    refineMutation.mutate({ text: current, instruction });
                                }}
                            >
                                Improve with AI
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={preview?.title}
                open={!!preview}
                onCancel={() => setPreview(null)}
                footer={[
                    <Button key="close" onClick={() => setPreview(null)}>
                        Close
                    </Button>,
                    onSelect && preview ? (
                        <Button
                            key="use"
                            type="primary"
                            onClick={() => {
                                onSelect(preview);
                                setPreview(null);
                            }}
                        >
                            Use Script
                        </Button>
                    ) : null,
                ]}
            >
                <Paragraph style={{ whiteSpace: "pre-wrap" }}>{preview?.content}</Paragraph>
            </Modal>
        </div>
    );
};

export default ScriptsManager;
