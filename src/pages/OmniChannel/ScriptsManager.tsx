import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Card,
    Flex,
    Form,
    Input,
    Modal,
    Popconfirm,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
    Upload,
    App,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ThunderboltOutlined,
    UploadOutlined,
    SearchOutlined,
    FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
    fetchScripts,
    createScript,
    updateScript,
    deleteScript,
    refineText,
    extractScriptFromFile,
    type Script,
} from "@services/whatsappService";
import TinyMCEInput from "@components/TinyMCEInput";

const { Title, Text, Paragraph } = Typography;

interface Props {
    shopId: string;
    readOnly?: boolean;
    onSelect?: (script: Script) => void;
}

const stripHtml = (html: string) => (html || "").replace(/<[^>]*>/g, "").trim();

const ScriptsManager: React.FC<Props> = ({ shopId, readOnly = false, onSelect }) => {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const [editing, setEditing] = useState<Script | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [preview, setPreview] = useState<Script | null>(null);
    const [refineInstruction, setRefineInstruction] = useState("");
    const [search, setSearch] = useState("");
    const [extracting, setExtracting] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["omnichannel-scripts", shopId],
        queryFn: () => fetchScripts({ shop_id: shopId }),
        enabled: !!shopId,
    });

    const scripts: Script[] = data?.scripts || [];

    const filteredScripts = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return scripts;
        return scripts.filter(
            (s) =>
                s.title?.toLowerCase().includes(q) ||
                s.category?.toLowerCase().includes(q) ||
                stripHtml(s.content).toLowerCase().includes(q)
        );
    }, [scripts, search]);

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

    const handleFileUpload = async (file: File) => {
        setExtracting(true);
        try {
            const res = await extractScriptFromFile(file);
            if (res?.content) {
                setEditing(null);
                form.setFieldsValue({ title: res.title || "", content: res.content, category: undefined });
                setIsModalOpen(true);
                message.success("Text extracted — review and save the script");
            }
        } finally {
            setExtracting(false);
        }
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

    const uploadButton = (
        <Upload
            accept=".pdf,.doc,.docx,.txt"
            showUploadList={false}
            beforeUpload={(file) => {
                handleFileUpload(file as File);
                return false;
            }}
        >
            <Button icon={<UploadOutlined />} loading={extracting}>
                Upload PDF / Doc
            </Button>
        </Upload>
    );

    const columns = [
        {
            title: "Title",
            dataIndex: "title",
            key: "title",
            width: 220,
            ellipsis: true,
            render: (title: string) => (
                <Space size={8}>
                    <FileTextOutlined style={{ color: "#8c8c8c" }} />
                    <Text strong ellipsis style={{ maxWidth: 180 }}>
                        {title}
                    </Text>
                </Space>
            ),
        },
        {
            title: "Category",
            dataIndex: "category",
            key: "category",
            width: 130,
            ellipsis: true,
            render: (category: string) =>
                category ? <Tag>{category}</Tag> : <Text type="secondary">—</Text>,
        },
        {
            title: "Content Preview",
            key: "content",
            render: (_: any, script: Script) => (
                <Paragraph
                    type="secondary"
                    ellipsis={{ rows: 2 }}
                    style={{ marginBottom: 0, fontSize: 13 }}
                >
                    {stripHtml(script.content) || "—"}
                </Paragraph>
            ),
        },
        {
            title: "Updated",
            dataIndex: "updatedAt",
            key: "updatedAt",
            width: 110,
            render: (value: string) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {value ? dayjs(value).format("MMM D, YYYY") : "—"}
                </Text>
            ),
        },
        ...(readOnly
            ? []
            : [
                {
                    title: "",
                    key: "actions",
                    width: 90,
                    align: "right" as const,
                    render: (_: any, script: Script) => (
                        <Space size={0}>
                            <Tooltip title="Edit">
                                <Button
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(script);
                                    }}
                                />
                            </Tooltip>
                            <Popconfirm
                                title="Delete script?"
                                description="This can't be undone."
                                okText="Delete"
                                okButtonProps={{ danger: true }}
                                onConfirm={(e) => {
                                    e?.stopPropagation();
                                    deleteMutation.mutate(script._id);
                                }}
                            >
                                <Tooltip title="Delete">
                                    <Button
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </Tooltip>
                            </Popconfirm>
                        </Space>
                    ),
                },
            ]),
    ];

    return (
        <div style={{ padding: readOnly ? 16 : 24, height: "100%", overflowY: "auto" }}>
            {!readOnly && (
                <Flex
                    justify="space-between"
                    align="flex-start"
                    wrap="wrap"
                    gap={12}
                    style={{ marginBottom: 16 }}
                >
                    <div>
                        <Title level={4} style={{ margin: 0 }}>
                            Reply Scripts
                        </Title>
                        <Text type="secondary">
                            Reusable replies your team can drop into conversations
                        </Text>
                    </div>
                    <Space wrap>
                        {uploadButton}
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            New Script
                        </Button>
                    </Space>
                </Flex>
            )}

            <Input
                allowClear
                prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                placeholder="Search scripts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ maxWidth: 320, marginBottom: 16 }}
            />

            <Card size="small" styles={{ body: { padding: 0 } }}>
                <Table
                    dataSource={filteredScripts}
                    columns={columns}
                    rowKey="_id"
                    loading={isLoading}
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: "No scripts yet — create one or upload a document" }}
                    onRow={(script) => ({
                        onClick: () => handleRowClick(script),
                        style: { cursor: readOnly ? "pointer" : "default" },
                    })}
                />
            </Card>

            <Modal
                title={editing ? "Edit Script" : "Add Script"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={createMutation.isLoading || updateMutation.isLoading}
                okText={editing ? "Save changes" : "Create script"}
                width={700}
                destroyOnClose
            >
                {!editing && (
                    <Flex justify="flex-end" style={{ marginBottom: 8 }}>
                        {uploadButton}
                    </Flex>
                )}
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
                        <TinyMCEInput
                            height={220}
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
                <div
                    className="script-preview"
                    dangerouslySetInnerHTML={{ __html: preview?.content || "" }}
                    style={{ whiteSpace: "pre-wrap", minHeight: 60 }}
                />
            </Modal>
        </div>
    );
};

export default ScriptsManager;
