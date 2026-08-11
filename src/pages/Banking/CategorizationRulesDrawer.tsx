import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Drawer, Tabs, Table, Button, Space, Tag, Switch, Typography,
    Popconfirm, Tooltip, Badge, Form, Input, Select, InputNumber,
    Modal, Row, Col, Divider, Alert, Radio, Checkbox,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    ThunderboltOutlined, TagOutlined, SettingOutlined,
    ArrowUpOutlined, ArrowDownOutlined,
} from "@ant-design/icons";
import {
    getCategorizationRules,
    createCategorizationRule,
    updateCategorizationRule,
    deleteCategorizationRule,
    CategorizationRule,
    CategorizationRuleInput,
    RuleCondition,
    ConditionField,
    ConditionOperator,
} from "@services/accounting/bankStatementImport";
import { getAllAccounts } from "@services/accounting/accounts";
import { fetchAllSuppliers } from "@services/supplier";
import { fetchTenantDetails, getCurrentTenantId } from "@services/tenants";

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
        { label: "Then", value: "then" },
    ],
    number: [
        { label: "Equals", value: "equals" },
        { label: "Greater than", value: "gt" },
        { label: "Greater or equal", value: "gte" },
        { label: "Less than", value: "lt" },
        { label: "Less or equal", value: "lte" },
        { label: "Between", value: "between" },
        { label: "Then", value: "then" },
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
    suppliers: any[];
    loading: boolean;
}> = ({ open, onClose, onConfirm, editingRule, accounts, suppliers, loading }) => {
    const [form] = Form.useForm();
    const [conditions, setConditions] = useState<Partial<RuleCondition>[]>([{}]);
    const [showTagInput, setShowTagInput] = useState(false);
    const [newTagValue, setNewTagValue] = useState("");

    const tenantId = getCurrentTenantId();
    const { data: tenantData } = useQuery({
        queryKey: ["tenant", tenantId],
        queryFn: () => fetchTenantDetails(tenantId),
        enabled: open && !!tenantId,
    });
    const tenant = tenantData?.data;

    React.useEffect(() => {
        if (open && editingRule) {
            form.setFieldsValue({
                name: editingRule.name,
                match_type: editingRule.match_type || "all",
                is_active: editingRule.is_active,
                apply_to: editingRule.apply_to || "deposits",
                transaction_handling: editingRule.transaction_handling || "recognized",
                auto_categorize: editingRule.auto_categorize || false,
                associate_accounts: editingRule.associate_accounts || "all_accounts",
                associated_account_id: Array.isArray(editingRule.associated_account_id) ? editingRule.associated_account_id : editingRule.associated_account_id,
                vendor_id: editingRule.vendor_id,
                vat_treatment: editingRule.vat_treatment,
                tax: editingRule.tax,
                tax_exemption_reason: editingRule.tax_exemption_reason,
                reference_number: editingRule.reference_number,
                custom_reference: editingRule.custom_reference,
                reporting_tags: editingRule.reporting_tags || [],
                action_account_id: editingRule.actions?.account_id,
                action_record_type: editingRule.actions?.record_type,
                action_target_account_id: editingRule.actions?.target_account_id,
            });
            setConditions(editingRule.conditions || [{}]);
            setShowTagInput(false);
            setNewTagValue('');
        } else if (open) {
            form.resetFields();
            form.setFieldsValue({ reporting_tags: [] });
            setConditions([{}]);
            setShowTagInput(false);
            setNewTagValue('');
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
        const targetAcc = values.action_target_account_id ? accounts.find((a: any) => a._id === values.action_target_account_id) : null;
        onConfirm({
            shop_id: editingRule?.shop_id || "",
            name: values.name,
            match_type: values.match_type || "all",
            is_active: values.is_active ?? true,
            apply_to: values.apply_to || "deposits",
            transaction_handling: values.transaction_handling || "recognized",
            auto_categorize: values.auto_categorize || false,
            associate_accounts: values.associate_accounts || "all_accounts",
            associated_account_id: values.associated_account_id,
            vendor_id: values.vendor_id,
            vat_treatment: values.vat_treatment,
            tax: values.tax,
            tax_exemption_reason: values.tax_exemption_reason,
            reference_number: values.reference_number,
            custom_reference: values.custom_reference,
            reporting_tags: values.reporting_tags || [],
            conditions: conditions.filter((c) => c.field && c.operator) as RuleCondition[],
            actions: {
                account_id: values.action_account_id,
                account_code: acc?.account_code,
                account_name: acc?.account_name,
                record_type: values.action_record_type,
                target_account_id: values.action_target_account_id,
                target_account_code: targetAcc?.account_code,
                target_account_name: targetAcc?.account_name,
            },
        });
    };

    const accountOptions = accounts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));
    const supplierOptions = suppliers.map((s: any) => ({
        label: s.name,
        value: s._id,
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
                <Form.Item name="name" label="Rule Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. Match Safaricom payments" />
                </Form.Item>

                <Form.Item name="apply_to" label="Apply To" initialValue="deposits">
                    <Radio.Group>
                        <Radio value="deposits">Deposit</Radio>
                        <Radio value="withdrawals">Withdrawal</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item name="transaction_handling" label="Transaction Handling" initialValue="recognized">
                    <Radio.Group>
                        <Radio value="recognized">Recognized transactions</Radio>
                        <Radio value="categorized">Categorized transactions</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item name="auto_categorize" valuePropName="checked" initialValue={false}>
                    <Checkbox>Allow Base to categorize my bank statements</Checkbox>
                </Form.Item>

                <Row gutter={8} align="middle" style={{ marginBottom: 16 }}>
                    <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Categorize the transactions when</Text>
                    </Col>
                    <Col span={9}>
                        <Select 
                            value={form.getFieldValue("match_type") || "all"}
                            onChange={(v) => form.setFieldsValue({ match_type: v })}
                            options={[
                                { label: "All the following criteria matches", value: "all" },
                                { label: "Any of the following criteria matches", value: "any" },
                            ]} 
                            style={{ width: "100%" }}
                            size="small"
                        />
                    </Col>
                    <Col span={3}>
                        <div></div>
                    </Col>
                </Row>

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
                                        placeholder="Match value"
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
                    Add criterion
                </Button>

                <Form.Item name="action_record_type" label="Record As">
                    <Select
                        placeholder="Select type..."
                        options={[
                            { label: "Income", value: "income" },
                            { label: "Expense", value: "expense" },
                            { label: "Transfer", value: "transfer" },
                            { label: "Refund", value: "refund" },
                        ]}
                        allowClear
                    />
                </Form.Item>

                <Form.Item name="action_account_id" label="account">
                    <Select
                        placeholder="Select account..."
                        options={accountOptions}
                        showSearch
                        optionFilterProp="label"
                        allowClear
                    />
                </Form.Item>

                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.action_record_type !== curr.action_record_type}>
                    {({ getFieldValue }) =>
                        getFieldValue("action_record_type") === "transfer" ? (
                            <Form.Item name="action_target_account_id" label="Target Account (for transfers)">
                                <Select
                                    placeholder="Select target account..."
                                    options={accountOptions}
                                    showSearch
                                    optionFilterProp="label"
                                    allowClear
                                />
                            </Form.Item>
                        ) : null
                    }
                </Form.Item>

                <Form.Item name="vendor_id" label="Vendor">
                    <Select
                        placeholder="Select vendor..."
                        options={supplierOptions}
                        showSearch
                        optionFilterProp="label"
                        allowClear
                    />
                </Form.Item>

                <Form.Item name="vat_treatment" label="Vat Treatment">
                    <Select
                        placeholder="Select vat treatment..."
                        options={[
                            { label: "Vat Registered", value: "vat_registered" },
                            { label: "Non Vat registered", value: "non_vat_registered" },
                        ]}
                        disabled={!tenant?.is_vat_enabled}
                    />
                </Form.Item>

                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item name="tax" label="Tax">
                            <Select
                                placeholder="Select tax..."
                                options={[
                                    { label: "Taxable", value: "taxable" },
                                    { label: "Exempt", value: "exempt" },
                                ]}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.tax !== curr.tax}>
                            {({ getFieldValue }) =>
                                getFieldValue("tax") === "exempt" ? (
                                    <Form.Item name="tax_exemption_reason" label="Tax Exemption Reason">
                                        <Input placeholder="Enter exemption reason..." />
                                    </Form.Item>
                                ) : null
                            }
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="reference_number" label="Reference Number">
                    <Select
                        placeholder="Select reference number..."
                        options={[
                            { label: "Use value from bank statement", value: "from_bank_statement" },
                            { label: "Custom", value: "custom" },
                        ]}
                    />
                </Form.Item>

                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.reference_number !== curr.reference_number}>
                    {({ getFieldValue }) =>
                        getFieldValue("reference_number") === "custom" ? (
                            <Form.Item name="custom_reference" label="Custom Reference">
                                <Input placeholder="Enter custom reference..." />
                            </Form.Item>
                        ) : null
                    }
                </Form.Item>

                <Form.Item name="reporting_tags" label="Reporting Tags">
                    <Form.List name="reporting_tags">
                        {(fields, { add, remove }) => (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    {fields.map((field) => (
                                        <Tag key={field.key} closable onClose={() => remove(field.name)}>
                                            {form.getFieldValue(['reporting_tags', field.name])}
                                        </Tag>
                                    ))}
                                    <Button 
                                        type="dashed" 
                                        size="small" 
                                        icon={<TagOutlined />}
                                        onClick={() => setShowTagInput(!showTagInput)}
                                    >
                                        {showTagInput ? 'Cancel' : 'Add Tag'}
                                    </Button>
                                </div>
                                {showTagInput && (
                                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                        <Input
                                            placeholder="Enter reporting tag..."
                                            value={newTagValue}
                                            onChange={(e) => setNewTagValue(e.target.value)}
                                            onPressEnter={(e) => {
                                                e.preventDefault();
                                                if (newTagValue.trim()) {
                                                    add(newTagValue.trim());
                                                    setNewTagValue('');
                                                    setShowTagInput(false);
                                                }
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                        <Button 
                                            type="primary" 
                                            size="small"
                                            onClick={() => {
                                                if (newTagValue.trim()) {
                                                    add(newTagValue.trim());
                                                    setNewTagValue('');
                                                    setShowTagInput(false);
                                                }
                                            }}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </Form.List>
                </Form.Item>

                <Divider orientation="left" plain>
                    <Text type="secondary" style={{ fontSize: 12 }}>Associate Accounts</Text>
                </Divider>

                <Form.Item name="associate_accounts" label="Associate Accounts" initialValue="all_accounts">
                    <Radio.Group>
                        <Radio value="all_accounts">All Accounts</Radio>
                        <Radio value="all_banks">All Banks</Radio>
                        <Radio value="all_cards">All Cards</Radio>
                        <Radio value="custom">Custom</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.associate_accounts !== curr.associate_accounts}>
                    {({ getFieldValue }) =>
                        getFieldValue("associate_accounts") === "custom" ? (
                            <Form.Item name="associated_account_id" label="Select Accounts">
                                <Select
                                    placeholder="Select accounts..."
                                    options={accountOptions}
                                    showSearch
                                    optionFilterProp="label"
                                    allowClear
                                    mode="multiple"
                                />
                            </Form.Item>
                        ) : null
                    }
                </Form.Item>

                <Alert
                    message="Depending on selected record as, some associate account options may be disabled"
                    type="info"
                    showIcon
                    style={{ fontSize: 11, marginTop: 8 }}
                />
            </Form>
        </Modal>
    );
};

// ── Main Drawer ────────────────────────────────────────────────────────────────
const CategorizationRulesDrawer: React.FC<Props> = ({ open, onClose, shopId }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("rules");
    const [ruleModalOpen, setRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<CategorizationRule | null>(null);

    const { data: rulesData, isLoading: rulesLoading } = useQuery({
        queryKey: ["categorization-rules", shopId],
        queryFn: () => getCategorizationRules(shopId),
        enabled: open,
    });

    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts", shopId],
        queryFn: () => getAllAccounts({ shop_id: shopId }),
        enabled: open,
    });

    const { data: suppliersData } = useQuery({
        queryKey: ["suppliers", shopId],
        queryFn: () => fetchAllSuppliers({}),
        enabled: open,
    });

    const accounts = accountsData?.accounts || [];
    const suppliers = suppliersData || [];
    const accountOptions = accounts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));
    const supplierOptions = suppliers.map((s: any) => ({
        label: s.name,
        value: s._id,
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

    const handleRuleSubmit = (d: CategorizationRuleInput) => {
        if (editingRule) ruleUpdateMutation.mutate({ id: editingRule._id, d });
        else ruleCreateMutation.mutate(d);
    };

    const ruleColumns = [
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
            title: "Account",
            key: "account",
            render: (_: any, r: CategorizationRule) => (
                r.actions?.account_name
                    ? <Tag color="blue" icon={<TagOutlined />}>{r.actions.account_code} {r.actions.account_name}</Tag>
                    : <Text type="secondary">—</Text>
            ),
        },
        {
            title: "Vendor",
            dataIndex: "vendor_id",
            render: (v: string) => v ? <Tag color="purple">{v}</Tag> : <Text type="secondary">—</Text>,
        },
        {
            title: "Vat Treatment",
            dataIndex: "vat_treatment",
            render: (v: string) => v ? <Tag color="orange">{v}</Tag> : <Text type="secondary">—</Text>,
        },
        {
            title: "Tax",
            dataIndex: "tax",
            render: (v: string) => v ? <Tag color="green">{v}</Tag> : <Text type="secondary">—</Text>,
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
    ];

    return (
        <>
            <Drawer
                title={
                    <Space>
                        <SettingOutlined />
                        <Text strong>Categorization Rules</Text>
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
                suppliers={suppliers}
                loading={ruleCreateMutation.isLoading || ruleUpdateMutation.isLoading}
            />
        </>
    );
};

export default CategorizationRulesDrawer;