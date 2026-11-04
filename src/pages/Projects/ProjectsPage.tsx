import React, { useMemo, useState } from "react";
import {
    App,
    Button,
    Card,
    Col,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Row,
    Select,
    Space,
    Statistic,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ProjectOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
    createProject,
    deleteProject,
    getProjects,
    Project,
    ProjectInput,
    ProjectStatus,
    updateProject,
} from "@services/accounting/projects";

const { Text } = Typography;

const STATUSES: ProjectStatus[] = ["Active", "On Hold", "Completed", "Cancelled"];
const STATUS_COLORS: Record<ProjectStatus, string> = {
    Active: "green",
    "On Hold": "orange",
    Completed: "blue",
    Cancelled: "default",
};

const fmt = (v?: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ProjectsPage: React.FC = () => {
    App.useApp();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<string | undefined>();
    const [showArchived, setShowArchived] = useState(false);
    const [editing, setEditing] = useState<Project | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const shopId = localStorage.getItem("shopId") || undefined;

    const { data, isLoading } = useQuery({
        queryKey: ["projects", "list", shopId, search, status, showArchived],
        queryFn: () =>
            getProjects({
                shop_id: shopId,
                search: search || undefined,
                status,
                include_archived: showArchived,
                with_totals: true,
            }),
    });
    const projects = data?.projects || [];

    const summary = useMemo(
        () =>
            projects.reduce(
                (s, p) => ({
                    revenue: s.revenue + (p.totals?.revenue || 0),
                    expenses: s.expenses + (p.totals?.expenses || 0),
                }),
                { revenue: 0, expenses: 0 }
            ),
        [projects]
    );

    const refresh = () => queryClient.invalidateQueries({ queryKey: ["projects"] });

    const saveMutation = useMutation({
        mutationFn: (values: ProjectInput) =>
            editing ? updateProject(editing._id, values) : createProject(values),
        onSuccess: () => {
            refresh();
            closeModal();
        },
    });

    const deleteMutation = useMutation({ mutationFn: deleteProject, onSuccess: refresh });

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ status: "Active", shop_scoped: false });
        setModalOpen(true);
    };

    const openEdit = (p: Project) => {
        setEditing(p);
        form.setFieldsValue({
            name: p.name,
            code: p.code,
            description: p.description,
            status: p.status,
            budget: p.budget,
            dates: [p.start_date ? dayjs(p.start_date) : null, p.end_date ? dayjs(p.end_date) : null],
            shop_scoped: !!p.shop_id,
            is_archived: !!p.is_archived,
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        form.resetFields();
    };

    const handleSave = async () => {
        const v = await form.validateFields();
        const [start, end] = v.dates || [];
        saveMutation.mutate({
            name: v.name,
            code: v.code || undefined,
            description: v.description || undefined,
            status: v.status,
            budget: v.budget || 0,
            start_date: start ? start.toISOString() : undefined,
            end_date: end ? end.toISOString() : undefined,
            shop_id: v.shop_scoped ? shopId || null : null,
            ...(editing ? { is_archived: !!v.is_archived } : {}),
        });
    };

    const columns = [
        {
            title: "Project",
            key: "name",
            render: (_: any, p: Project) => (
                <Space direction="vertical" size={0}>
                    <Space size={6}>
                        {p.code && <Tag>{p.code}</Tag>}
                        <Text strong>{p.name}</Text>
                        {p.is_archived && <Tag>Archived</Tag>}
                    </Space>
                    {p.description && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {p.description}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 110,
            render: (s: ProjectStatus) => <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
        },
        {
            title: "Period",
            key: "period",
            width: 190,
            render: (_: any, p: Project) =>
                p.start_date || p.end_date ? (
                    <Text style={{ fontSize: 12 }}>
                        {p.start_date ? dayjs(p.start_date).format("DD MMM YYYY") : "…"} –{" "}
                        {p.end_date ? dayjs(p.end_date).format("DD MMM YYYY") : "…"}
                    </Text>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
        {
            title: "Budget",
            dataIndex: "budget",
            key: "budget",
            width: 130,
            align: "right" as const,
            render: (v: number) => (v ? fmt(v) : <Text type="secondary">—</Text>),
        },
        {
            title: "Income",
            key: "revenue",
            width: 130,
            align: "right" as const,
            render: (_: any, p: Project) => <Text style={{ color: "#389e0d" }}>{fmt(p.totals?.revenue)}</Text>,
        },
        {
            title: "Expenses",
            key: "expenses",
            width: 130,
            align: "right" as const,
            render: (_: any, p: Project) => <Text style={{ color: "#cf1322" }}>{fmt(p.totals?.expenses)}</Text>,
        },
        {
            title: "Net Profit",
            key: "net",
            width: 140,
            align: "right" as const,
            render: (_: any, p: Project) => {
                const net = p.totals?.net_profit || 0;
                return (
                    <Text strong style={{ color: net >= 0 ? "#389e0d" : "#cf1322" }}>
                        {fmt(net)}
                    </Text>
                );
            },
        },
        {
            title: "",
            key: "actions",
            width: 90,
            render: (_: any, p: Project) => (
                <Space size="small">
                    <Tooltip title="Edit">
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(p)} />
                    </Tooltip>
                    <Popconfirm
                        title="Delete this project?"
                        description="A project with transactions is archived instead."
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => deleteMutation.mutate(p._id)}
                    >
                        <Tooltip title="Delete">
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 16 }}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}>
                    <Card size="small">
                        <Statistic title="Projects" value={projects.length} prefix={<ProjectOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card size="small">
                        <Statistic
                            title="Income (all time)"
                            value={summary.revenue}
                            precision={2}
                            valueStyle={{ color: "#389e0d" }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card size="small">
                        <Statistic
                            title="Expenses (all time)"
                            value={summary.expenses}
                            precision={2}
                            valueStyle={{ color: "#cf1322" }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card
                size="small"
                title="Projects"
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        New Project
                    </Button>
                }
            >
                <Space wrap style={{ marginBottom: 12 }}>
                    <Input.Search
                        allowClear
                        placeholder="Search name or code"
                        onSearch={setSearch}
                        style={{ width: 240 }}
                    />
                    <Select
                        allowClear
                        placeholder="All statuses"
                        value={status}
                        onChange={setStatus}
                        options={STATUSES.map((s) => ({ value: s, label: s }))}
                        style={{ width: 160 }}
                    />
                    <Space size={6}>
                        <Switch size="small" checked={showArchived} onChange={setShowArchived} />
                        <Text>Show archived</Text>
                    </Space>
                </Space>

                <Table
                    rowKey="_id"
                    size="small"
                    loading={isLoading}
                    dataSource={projects}
                    columns={columns}
                    pagination={{ pageSize: 20, hideOnSinglePage: true }}
                    scroll={{ x: 1000 }}
                    locale={{ emptyText: "No projects yet — create one to start tagging income and expenses" }}
                />
            </Card>

            <Modal
                title={editing ? "Edit Project" : "New Project"}
                open={modalOpen}
                onCancel={closeModal}
                onOk={handleSave}
                okText={editing ? "Save Changes" : "Create Project"}
                confirmLoading={saveMutation.isPending}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Row gutter={12}>
                        <Col span={16}>
                            <Form.Item
                                name="name"
                                label="Project name"
                                rules={[{ required: true, whitespace: true, message: "Enter a project name" }]}
                            >
                                <Input placeholder="e.g. Westlands office fit-out" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="code" label="Code">
                                <Input placeholder="e.g. PRJ-001" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="status" label="Status">
                                <Select options={STATUSES.map((s) => ({ value: s, label: s }))} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="budget" label="Budget">
                                <InputNumber min={0} style={{ width: "100%" }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="dates" label="Start – end date">
                        <DatePicker.RangePicker allowEmpty={[true, true]} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item
                        name="shop_scoped"
                        label="Only this branch"
                        valuePropName="checked"
                        tooltip="Off: the project can be used by every branch"
                    >
                        <Switch />
                    </Form.Item>
                    {editing && (
                        <Form.Item name="is_archived" label="Archived" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default ProjectsPage;
