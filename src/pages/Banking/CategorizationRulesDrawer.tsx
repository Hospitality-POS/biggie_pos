import React, { useState } from "react";
import {
    Drawer, Tabs, Table, Button, Space, Tag, Switch, Typography,
    Popconfirm, Tooltip, Badge, Form, Input, Select, InputNumber,
    Modal, Row, Col, Divider, Alert,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    ThunderboltOutlined, TagOutlined, SettingOutlined,
    ArrowUpOutlined, ArrowDownOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getCategorizationRules,
    createCategorizationRule,
    updateCategorizationRule,
    deleteCategorizationRule,
    getCategoryMappings,
    createCategoryMapping,
    updateCategoryMapping,
    deleteCategoryMapping,
    getColumnMappings,
    createColumnMapping,
    updateColumnMapping,
    deleteColumnMapping,
    CategorizationRule,
    CategoryMapping,
    ColumnMapping,
    CategorizationRuleInput,
    CategoryMappingInput,
    ColumnMappingInput,
    RuleCondition,
    ConditionField,
    ConditionOperator,
} from "@services/accounting/bankStatementImport";
import { getAllAccounts } from "@services/accounting/accounts";

const { Text, Title } = Typography;

const FIELD_OPTIONS: { label: string; value: ConditionField }[] = [
    { label: "Description", value: "description" },
    { label: "Reference", value: "reference" },
    { label: "Amount", value: "amount" },
    { label: "Debit", value: "debit" },
    { label: "Credit", value: "credit" },
    { label: "Direction", value: "direction" },
];

const OPERATOR_OPTIONS: Record<string, { label: string; value: ConditionOperator }[]> = {
    string: [
        { label: "Contains", value: "contains" },
        { label: "Does not contain", value: "not_contains" },
        { label: "Starts with", value: "starts_with" },
        { label: "Ends with", value: "ends_with" },
        { label: "Equals", value: "equals" },
        { label: "Regex", value: "regex" },
    ],
    number: [
        { label: "Equals", value: "equals" },
        { label: "Greater than", value: "gt" },
        { label: "Greater or equal", value: "gte" },
        { label: "Less than", value: "lt" },
        { label: "Less or equal", value: "lte" },
        { label: "Between", value: "between" },
    ],
    direction: [{ label: "Is", value: "is" }],
};

const getOperatorGroup = (field: ConditionField) => {
    if (["amount", "debit", "credit"].includes(field)) return "number";
    if (field === "direction") return "direction";
    return "string";
};

interface Props {
    open: boolean;
    onClose: () => void;
    shopId: string;
}

// ── Rule Form Modal ────────────────────────────────────────────────────────────
const RuleFormModal: React.FC<{
    open: boolean;
    onClose: () => void;
    onConfirm: (data: CategorizationRuleInput) => void;
    editingRule: CategorizationRule | null;
    accounts: any[];
    loading: boolean;
}> = ({ open, onClose, onConfirm, editingRule, accounts, loading }) => {
    const [form] = Form.useForm();
    const [conditions, setConditions] = useState<Partial<RuleCondition>[]>([{}]);

    React.useEffect(() => {
        if (open && editingRule) {
            form.setFieldsValue({
                name: editingRule.name,
                priority: editingRule.priority,
                match_type: editingRule.match_type,
                is_active: editingRule.is_active,
                action_account_id: editingRule.actions?.account_id,
                action_category_label: editingRule.actions?.category_label,
                action_payee_name: editingRule.actions?.payee_name,
                action_exclude: editingRule.actions?.exclude,
            });
            setConditions(editingRule.conditions || [{}]);
        } else if (open) {
            form.resetFields();
            setConditions([{}]);
        }
    }, [open, editingRule, form]);

    const addCondition = () => setConditions([...conditions, {}]);
    const removeCondition = (i: number) => setConditions(conditions.filter((_, idx) => idx !== i));
    const updateCondition = (i: number, patch: Partial<RuleCondition>) => {
        const updated = [...conditions];
        updated[i] = { ...updated[i], ...patch };
        setConditions(updated);
    };

    const handleOk = async () => {
        const values = await form.validateFields();
        const acc = accounts.find((a: any) => a._id === values.action_account_id);
        onConfirm({
            shop_id: editingRule?.shop_id || "",
            name: values.name,
            priority: values.priority || 100,
            match_type: values.match_type || "all",
            is_active: values.is_active ?? true,
            conditions: conditions.filter((c) => c.field && c.operator) as RuleCondition[],
            actions: {
                account_id: values.action_account_id,
                account_code: acc?.account_code,
                account_name: acc?.account_name,
                category_label: values.action_category_label,
                payee_name: values.action_payee_name,
                exclude: values.action_exclude || false,
            },
        });
    };

    const accountOptions = accounts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));

    return (
        <Modal
            open={open}
            title={editingRule ? "Edit Rule" : "Create Categorization Rule"}
            onCancel={onClose}
            onOk={handleOk}
            confirmLoading={loading}
            okText={editingRule ? "Save Changes" : "Create Rule"}
            width={680}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Row gutter={12}>
                    <Col span={14}>
                        <Form.Item name="name" label="Rule Name" rules={[{ required: true }]}>
                            <Input placeholder="e.g. Match Safaricom payments" />
                        </Form.Item>
                    </Col>
                    <Col span={5}>
                        <Form.Item name="priority" label="Priority">
                            <InputNumber min={1} max={999} style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>
                    <Col span={5}>
                        <Form.Item name="match_type" label="Match" initialValue="all">
                            <Select options={[{ label: "ALL conditions", value: "all" }, { label: "ANY condition", value: "any" }]} />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left" plain>
                    <Text type="secondary" style={{ fontSize: 12 }}>Conditions</Text>
                </Divider>

                {conditions.map((cond, i) => {
                    const opsGroup = cond.field ? getOperatorGroup(cond.field) : "string";
                    const ops = OPERATOR_OPTIONS[opsGroup] || [];
                    return (
                        <Row key={i} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                            <Col span={6}>
                                <Select
                                    placeholder="Field"
                                    options={FIELD_OPTIONS}
                                    value={cond.field}
                                    onChange={(v) => updateCondition(i, { field: v, operator: undefined as any })}
                                    style={{ width: "100%" }}
                                />
                            </Col>
                            <Col span={6}>
                                <Select
                                    placeholder="Operator"
                                    options={ops}
                                    value={cond.operator}
                                    onChange={(v) => updateCondition(i, { operator: v })}
                                    style={{ width: "100%" }}
                                    disabled={!cond.field}
                                />
                            </Col>
                            <Col span={9}>
                                {cond.field === "direction" ? (
                                    <Select
                                        placeholder="debit or credit"
                                        options={[{ label: "Debit", value: "debit" }, { label: "Credit", value: "credit" }]}
                                        value={cond.value}
                                        onChange={(v) => updateCondition(i, { value: v })}
                                        style={{ width: "100%" }}
                                    />
                                ) : cond.operator === "between" ? (
                                    <Space.Compact style={{ width: "100%" }}>
                                        <InputNumber
                                            placeholder="Min"
                                            value={cond.value as any}
                                            onChange={(v) => updateCondition(i, { value: String(v) })}
                                            style={{ width: "50%" }}
                                        />
                                        <InputNumber
                                            placeholder="Max"
                                            value={cond.value2 as any}
                                            onChange={(v) => updateCondition(i, { value2: String(v) })}
                                            style={{ width: "50%" }}
                                        />
                                    </Space.Compact>
                                ) : (
                                    <Input
                                        placeholder="Value"
                                        value={cond.value}
                                        onChange={(e) => updateCondition(i, { value: e.target.value })}
                                    />
                                )}
                            </Col>
                            <Col span={3}>
                                <Button danger size="small" onClick={() => removeCondition(i)} disabled={conditions.length === 1}>
                                    ✕
                                </Button>
                            </Col>
                        </Row>
                    );
                })}
                <Button type="dashed" onClick={addCondition} size="small" icon={<PlusOutlined />} style={{ marginBottom: 16 }}>
                    Add Condition
                </Button>

                <Divider orientation="left" plain>
                    <Text type="secondary" style={{ fontSize: 12 }}>Actions (when rule matches)</Text>
                </Divider>

                <Form.Item name="action_account_id" label="Assign Account">
                    <Select
                        placeholder="Select account..."
                        options={accountOptions}
                        showSearch
                        optionFilterProp="label"
                        allowClear
                    />
                </Form.Item>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item name="action_category_label" label="Category Label">
                            <Input placeholder="e.g. Office Supplies" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="action_payee_name" label="Payee Name">
                            <Input placeholder="e.g. Safaricom" />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item name="action_exclude" valuePropName="checked" label="Exclude matching transactions">
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
};

// ── Main Drawer ────────────────────────────────────────────────────────────────
const CategorizationRulesDrawer: React.FC<Props> = ({ open, onClose, shopId }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("rules");
    const [ruleModalOpen, setRuleModalOpen] = useState(false);
    const [mappingModalOpen, setMappingModalOpen] = useState(false);
    const [columnMappingModalOpen, setColumnMappingModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<CategorizationRule | null>(null);
    const [editingMapping, setEditingMapping] = useState<CategoryMapping | null>(null);
    const [editingColumnMapping, setEditingColumnMapping] = useState<ColumnMapping | null>(null);
    const [mappingForm] = Form.useForm();
    const [columnForm] = Form.useForm();

    const { data: rulesData, isLoading: rulesLoading } = useQuery({
        queryKey: ["categorization-rules", shopId],
        queryFn: () => getCategorizationRules(shopId),
        enabled: open,
    });

    const { data: mappingsData, isLoading: mappingsLoading } = useQuery({
        queryKey: ["category-mappings", shopId],
        queryFn: () => getCategoryMappings(shopId),
        enabled: open,
    });

    const { data: columnMappingsData, isLoading: columnMappingsLoading } = useQuery({
        queryKey: ["column-mappings", shopId],
        queryFn: () => getColumnMappings(shopId),
        enabled: open,
    });

    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts", shopId],
        queryFn: () => getAllAccounts({ shop_id: shopId }),
        enabled: open,
    });

    const accounts = accountsData?.accounts || [];
    const accountOptions = accounts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ["categorization-rules", shopId] });
        queryClient.invalidateQueries({ queryKey: ["category-mappings", shopId] });
        queryClient.invalidateQueries({ queryKey: ["column-mappings", shopId] });
    };

    const ruleCreateMutation = useMutation({
        mutationFn: (d: CategorizationRuleInput) => createCategorizationRule({ ...d, shop_id: shopId }),
        onSuccess: () => { invalidateAll(); setRuleModalOpen(false); setEditingRule(null); },
    });

    const ruleUpdateMutation = useMutation({
        mutationFn: ({ id, d }: { id: string; d: Partial<CategorizationRuleInput> }) =>
            updateCategorizationRule(id, d),
        onSuccess: () => { invalidateAll(); setRuleModalOpen(false); setEditingRule(null); },
    });

    const ruleDeleteMutation = useMutation({
        mutationFn: (id: string) => deleteCategorizationRule(id),
        onSuccess: () => invalidateAll(),
    });

    const mappingCreateMutation = useMutation({
        mutationFn: (d: CategoryMappingInput) => createCategoryMapping({ ...d, shop_id: shopId }),
        onSuccess: () => { invalidateAll(); setMappingModalOpen(false); mappingForm.resetFields(); },
    });

    const mappingUpdateMutation = useMutation({
        mutationFn: ({ id, d }: { id: string; d: Partial<CategoryMappingInput> }) =>
            updateCategoryMapping(id, d),
        onSuccess: () => { invalidateAll(); setMappingModalOpen(false); setEditingMapping(null); },
    });

    const mappingDeleteMutation = useMutation({
        mutationFn: (id: string) => deleteCategoryMapping(id),
        onSuccess: () => invalidateAll(),
    });

    const columnCreateMutation = useMutation({
        mutationFn: (d: ColumnMappingInput) => createColumnMapping({ ...d, shop_id: shopId }),
        onSuccess: () => { invalidateAll(); setColumnMappingModalOpen(false); columnForm.resetFields(); },
    });

    const columnUpdateMutation = useMutation({
        mutationFn: ({ id, d }: { id: string; d: Partial<ColumnMappingInput> }) =>
            updateColumnMapping(id, d),
        onSuccess: () => { invalidateAll(); setColumnMappingModalOpen(false); setEditingColumnMapping(null); },
    });

    const columnDeleteMutation = useMutation({
        mutationFn: (id: string) => deleteColumnMapping(id),
        onSuccess: () => invalidateAll(),
    });

    const handleRuleSubmit = (d: CategorizationRuleInput) => {
        if (editingRule) ruleUpdateMutation.mutate({ id: editingRule._id, d });
        else ruleCreateMutation.mutate(d);
    };

    const openEditMapping = (m: CategoryMapping) => {
        setEditingMapping(m);
        mappingForm.setFieldsValue({
            keyword: m.keyword,
            match_mode: m.match_mode,
            direction: m.direction,
            account_id: m.account_id,
            category_label: m.category_label,
            payee_name: m.payee_name,
            priority: m.priority,
            is_active: m.is_active,
        });
        setMappingModalOpen(true);
    };

    const handleMappingSubmit = async () => {
        const values = await mappingForm.validateFields();
        const acc = accounts.find((a: any) => a._id === values.account_id);
        const payload: CategoryMappingInput = {
            ...values,
            shop_id: shopId,
            account_code: acc?.account_code,
            account_name: acc?.account_name,
        };
        if (editingMapping) mappingUpdateMutation.mutate({ id: editingMapping._id, d: payload });
        else mappingCreateMutation.mutate(payload);
    };

    const openEditColumnMapping = (m: ColumnMapping) => {
        setEditingColumnMapping(m);
        columnForm.setFieldsValue({
            name: m.name,
            bank_name: m.bank_name,
            date_format: m.date_format,
            skip_rows: m.skip_rows,
            amount_direction_mode: m.amount_direction_mode,
            is_default: m.is_default,
            field_date: m.field_map?.date,
            field_description: m.field_map?.description,
            field_debit: m.field_map?.debit,
            field_credit: m.field_map?.credit,
            field_amount: m.field_map?.amount,
            field_reference: m.field_map?.reference,
            field_balance: m.field_map?.balance,
        });
        setColumnMappingModalOpen(true);
    };

    const handleColumnMappingSubmit = async () => {
        const values = await columnForm.validateFields();
        const payload: ColumnMappingInput = {
            shop_id: shopId,
            name: values.name,
            bank_name: values.bank_name,
            date_format: values.date_format || "DD/MM/YYYY",
            skip_rows: values.skip_rows || 1,
            amount_direction_mode: values.amount_direction_mode || "split",
            is_default: values.is_default || false,
            field_map: {
                date: values.field_date,
                description: values.field_description,
                debit: values.field_debit,
                credit: values.field_credit,
                amount: values.field_amount,
                reference: values.field_reference,
                balance: values.field_balance,
            },
        };
        if (editingColumnMapping) columnUpdateMutation.mutate({ id: editingColumnMapping._id, d: payload });
        else columnCreateMutation.mutate(payload);
    };

    const ruleColumns = [
        {
            title: "Priority",
            dataIndex: "priority",
            width: 75,
            render: (v: number) => <Tag style={{ fontSize: 11 }}>{v}</Tag>,
        },
        {
            title: "Rule Name",
            dataIndex: "name",
            render: (v: string, r: CategorizationRule) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: 13 }}>{v}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {r.conditions?.length} condition{r.conditions?.length !== 1 ? "s" : ""} · match {r.match_type?.toUpperCase()}
                    </Text>
                </Space>
            ),
        },
        {
            title: "Assigns To",
            key: "assigns",
            render: (_: any, r: CategorizationRule) => (
                r.actions?.exclude
                    ? <Tag color="default">Exclude</Tag>
                    : r.actions?.account_name
                        ? <Tag color="blue" icon={<TagOutlined />}>{r.actions.account_code} {r.actions.account_name}</Tag>
                        : <Text type="secondary">—</Text>
            ),
        },
        {
            title: "Matches",
            dataIndex: "match_count",
            width: 80,
            render: (v: number) => <Text type="secondary" style={{ fontSize: 12 }}>{v || 0}</Text>,
        },
        {
            title: "Active",
            dataIndex: "is_active",
            width: 70,
            render: (v: boolean, r: CategorizationRule) => (
                <Switch
                    checked={v}
                    size="small"
                    onChange={(checked) => ruleUpdateMutation.mutate({ id: r._id, d: { is_active: checked } })}
                />
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 90,
            render: (_: any, r: CategorizationRule) => (
                <Space size={4}>
                    <Button icon={<EditOutlined />} size="small" onClick={() => { setEditingRule(r); setRuleModalOpen(true); }} />
                    <Popconfirm title="Delete this rule?" onConfirm={() => ruleDeleteMutation.mutate(r._id)} okText="Delete" okButtonProps={{ danger: true }} cancelText="No">
                        <Button icon={<DeleteOutlined />} size="small" danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const mappingColumns = [
        {
            title: "Keyword",
            dataIndex: "keyword",
            render: (v: string, r: CategoryMapping) => (
                <Space direction="vertical" size={0}>
                    <Text code style={{ fontSize: 12 }}>{v}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{r.match_mode} · {r.direction}</Text>
                </Space>
            ),
        },
        {
            title: "Maps To",
            key: "maps_to",
            render: (_: any, r: CategoryMapping) => (
                <Tag color="blue" icon={<TagOutlined />}>
                    {r.account_code} {r.account_name}
                </Tag>
            ),
        },
        {
            title: "Category",
            dataIndex: "category_label",
            render: (v: string) => v ? <Tag>{v}</Tag> : <Text type="secondary">—</Text>,
        },
        {
            title: "Priority",
            dataIndex: "priority",
            width: 75,
            render: (v: number) => <Tag style={{ fontSize: 11 }}>{v}</Tag>,
        },
        {
            title: "Active",
            dataIndex: "is_active",
            width: 70,
            render: (v: boolean, r: CategoryMapping) => (
                <Switch
                    checked={v}
                    size="small"
                    onChange={(checked) => mappingUpdateMutation.mutate({ id: r._id, d: { is_active: checked } })}
                />
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 90,
            render: (_: any, r: CategoryMapping) => (
                <Space size={4}>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEditMapping(r)} />
                    <Popconfirm title="Delete this mapping?" onConfirm={() => mappingDeleteMutation.mutate(r._id)} okText="Delete" okButtonProps={{ danger: true }} cancelText="No">
                        <Button icon={<DeleteOutlined />} size="small" danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const columnMappingColumns = [
        {
            title: "Name",
            dataIndex: "name",
            render: (v: string, r: ColumnMapping) => (
                <Space>
                    <Text strong>{v}</Text>
                    {r.is_default && <Tag color="green">Default</Tag>}
                    {r.bank_name && <Text type="secondary" style={{ fontSize: 12 }}>({r.bank_name})</Text>}
                </Space>
            ),
        },
        {
            title: "Date Format",
            dataIndex: "date_format",
            width: 120,
            render: (v: string) => <Tag>{v}</Tag>,
        },
        {
            title: "Amount Mode",
            dataIndex: "amount_direction_mode",
            width: 120,
            render: (v: string) => <Tag>{v}</Tag>,
        },
        {
            title: "Actions",
            key: "actions",
            width: 90,
            render: (_: any, r: ColumnMapping) => (
                <Space size={4}>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEditColumnMapping(r)} />
                    <Popconfirm title="Delete this template?" onConfirm={() => columnDeleteMutation.mutate(r._id)} okText="Delete" okButtonProps={{ danger: true }} cancelText="No">
                        <Button icon={<DeleteOutlined />} size="small" danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const tabItems = [
        {
            key: "rules",
            label: (
                <Space>
                    <ThunderboltOutlined />
                    Categorization Rules
                    <Tag>{rulesData?.rules?.length || 0}</Tag>
                </Space>
            ),
            children: (
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                    <Alert
                        type="info"
                        showIcon
                        message="Rules are applied in priority order (lowest number first) when a statement is imported. First match wins."
                    />
                    <div style={{ textAlign: "right" }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => { setEditingRule(null); setRuleModalOpen(true); }}
                        >
                            New Rule
                        </Button>
                    </div>
                    <Table
                        rowKey="_id"
                        dataSource={rulesData?.rules || []}
                        columns={ruleColumns}
                        loading={rulesLoading}
                        size="small"
                        pagination={false}
                        locale={{ emptyText: "No rules yet — create one to auto-categorize transactions" }}
                    />
                </Space>
            ),
        },
        {
            key: "mappings",
            label: (
                <Space>
                    <TagOutlined />
                    Keyword Mappings
                    <Tag>{mappingsData?.mappings?.length || 0}</Tag>
                </Space>
            ),
            children: (
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                    <Alert
                        type="info"
                        showIcon
                        message="Keyword mappings are simpler than rules — they match a keyword in the description to an account. Evaluated after rules."
                    />
                    <div style={{ textAlign: "right" }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => { setEditingMapping(null); mappingForm.resetFields(); setMappingModalOpen(true); }}
                        >
                            New Mapping
                        </Button>
                    </div>
                    <Table
                        rowKey="_id"
                        dataSource={mappingsData?.mappings || []}
                        columns={mappingColumns}
                        loading={mappingsLoading}
                        size="small"
                        pagination={false}
                        locale={{ emptyText: "No keyword mappings yet" }}
                    />
                </Space>
            ),
        },
        {
            key: "column-mappings",
            label: (
                <Space>
                    <SettingOutlined />
                    Column Templates
                    <Tag>{columnMappingsData?.mappings?.length || 0}</Tag>
                </Space>
            ),
            children: (
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                    <Alert
                        type="info"
                        showIcon
                        message="Save column mapping templates per bank so you don't have to re-map headers every time you import."
                    />
                    <div style={{ textAlign: "right" }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => { setEditingColumnMapping(null); columnForm.resetFields(); setColumnMappingModalOpen(true); }}
                        >
                            New Template
                        </Button>
                    </div>
                    <Table
                        rowKey="_id"
                        dataSource={columnMappingsData?.mappings || []}
                        columns={columnMappingColumns}
                        loading={columnMappingsLoading}
                        size="small"
                        pagination={false}
                        locale={{ emptyText: "No column templates yet" }}
                    />
                </Space>
            ),
        },
    ];

    return (
        <>
            <Drawer
                title={
                    <Space>
                        <SettingOutlined />
                        <Text strong>Rules & Mappings</Text>
                    </Space>
                }
                open={open}
                onClose={onClose}
                width={860}
                destroyOnClose
            >
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
            </Drawer>

            {/* ── Rule Modal ── */}
            <RuleFormModal
                open={ruleModalOpen}
                onClose={() => { setRuleModalOpen(false); setEditingRule(null); }}
                onConfirm={handleRuleSubmit}
                editingRule={editingRule}
                accounts={accounts}
                loading={ruleCreateMutation.isLoading || ruleUpdateMutation.isLoading}
            />

            {/* ── Keyword Mapping Modal ── */}
            <Modal
                open={mappingModalOpen}
                title={editingMapping ? "Edit Keyword Mapping" : "New Keyword Mapping"}
                onCancel={() => { setMappingModalOpen(false); setEditingMapping(null); mappingForm.resetFields(); }}
                onOk={handleMappingSubmit}
                confirmLoading={mappingCreateMutation.isLoading || mappingUpdateMutation.isLoading}
                okText={editingMapping ? "Save Changes" : "Create Mapping"}
                destroyOnClose
            >
                <Form form={mappingForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={12}>
                        <Col span={14}>
                            <Form.Item name="keyword" label="Keyword" rules={[{ required: true }]}>
                                <Input placeholder="e.g. SAFARICOM, KPA, KPLC" />
                            </Form.Item>
                        </Col>
                        <Col span={10}>
                            <Form.Item name="match_mode" label="Match Mode" initialValue="contains">
                                <Select options={[
                                    { label: "Contains", value: "contains" },
                                    { label: "Starts with", value: "starts_with" },
                                    { label: "Ends with", value: "ends_with" },
                                    { label: "Exact", value: "exact" },
                                    { label: "Regex", value: "regex" },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="direction" label="Apply to" initialValue="both">
                        <Select options={[
                            { label: "Both (debits and credits)", value: "both" },
                            { label: "Debits only (outflow)", value: "debit" },
                            { label: "Credits only (inflow)", value: "credit" },
                        ]} />
                    </Form.Item>
                    <Form.Item name="account_id" label="Map to Account" rules={[{ required: true }]}>
                        <Select
                            placeholder="Select account..."
                            options={accountOptions}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="category_label" label="Category Label">
                                <Input placeholder="e.g. Utilities" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="priority" label="Priority" initialValue={50}>
                                <InputNumber min={1} max={999} style={{ width: "100%" }} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
                                <Switch />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* ── Column Mapping Modal ── */}
            <Modal
                open={columnMappingModalOpen}
                title={editingColumnMapping ? "Edit Column Template" : "New Column Template"}
                onCancel={() => { setColumnMappingModalOpen(false); setEditingColumnMapping(null); columnForm.resetFields(); }}
                onOk={handleColumnMappingSubmit}
                confirmLoading={columnCreateMutation.isLoading || columnUpdateMutation.isLoading}
                okText={editingColumnMapping ? "Save Changes" : "Create Template"}
                width={600}
                destroyOnClose
            >
                <Form form={columnForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="name" label="Template Name" rules={[{ required: true }]}>
                                <Input placeholder="e.g. KCB Bank Kenya" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="bank_name" label="Bank Name">
                                <Input placeholder="e.g. KCB" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Divider orientation="left" plain>
                        <Text type="secondary" style={{ fontSize: 12 }}>Column Header Names (as they appear in the file)</Text>
                    </Divider>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="field_date" label="Date Column">
                                <Input placeholder="e.g. Date, Value Date" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="field_description" label="Description Column">
                                <Input placeholder="e.g. Description, Narration" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="field_debit" label="Debit Column">
                                <Input placeholder="e.g. Debit, Withdrawals" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="field_credit" label="Credit Column">
                                <Input placeholder="e.g. Credit, Deposits" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="field_amount" label="Single Amount Column">
                                <Input placeholder="e.g. Amount (leave blank if split)" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="field_reference" label="Reference Column">
                                <Input placeholder="e.g. Reference, Cheque No" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="field_balance" label="Balance Column">
                                <Input placeholder="e.g. Balance, Running Balance" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={8}>
                            <Form.Item name="date_format" label="Date Format" initialValue="DD/MM/YYYY">
                                <Select options={[
                                    { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
                                    { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
                                    { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
                                    { label: "DD-MMM-YYYY", value: "DD-MMM-YYYY" },
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="skip_rows" label="Header Rows" initialValue={1}>
                                <InputNumber min={0} max={10} style={{ width: "100%" }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="amount_direction_mode" label="Amount Mode" initialValue="split">
                                <Select options={[
                                    { label: "Split (debit/credit)", value: "split" },
                                    { label: "Sign (+/-)", value: "sign" },
                                    { label: "Type column", value: "column" },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="is_default" valuePropName="checked" label="Set as default template">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default CategorizationRulesDrawer;