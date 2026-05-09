import React, { useState, useCallback } from "react";
import {
    Card, Tabs, Table, Button, Space, Tag, Badge, Typography,
    Tooltip, Popconfirm, Drawer, Form, Input, InputNumber,
    Select, DatePicker, Switch, Row, Col, Statistic, App,
    Dropdown, MenuProps, Alert, Divider,
} from "antd";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined,
    SwapOutlined, StarOutlined, StarFilled, PoweroffOutlined,
    DownloadOutlined, FileExcelOutlined, FilePdfOutlined,
    DollarOutlined, ArrowRightOutlined, CheckCircleOutlined, ReloadOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import {
    listCurrencies, getFunctionalCurrency, createCurrency, updateCurrency,
    deactivateCurrency, setFunctionalCurrency, seedCurrencies,
    listRates, getLatestRates, createRate, updateRate, deleteRate,
    convertAmount, Currency, ExchangeRate, CreateCurrencyParams,
    CreateRateParams, formatCurrencyAmount, currencyLabel,
} from "@services/currency";

const { Text, Title } = Typography;
const { Option } = Select;

/* ─────────────────────────────────────────────────────────────────────────────
   CURRENCY FORM DRAWER
───────────────────────────────────────────────────────────────────────────── */
interface CurrencyDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editing?: Currency | null;
}

const CurrencyDrawer: React.FC<CurrencyDrawerProps> = ({ open, onClose, onSuccess, editing }) => {
    const [form] = Form.useForm();
    const isEdit = !!editing;

    React.useEffect(() => {
        if (open && editing) {
            form.setFieldsValue({ ...editing });
        } else if (open) {
            form.resetFields();
            form.setFieldsValue({ decimal_places: 2, symbol_position: "before", is_active: true });
        }
    }, [open, editing, form]);

    const handleFinish = async (values: any) => {
        if (isEdit && editing) {
            await updateCurrency(editing.code, values);
        } else {
            await createCurrency(values as CreateCurrencyParams);
        }
        onSuccess();
        onClose();
    };

    return (
        <Drawer
            title={isEdit ? `Edit Currency — ${editing?.code}` : "Add Currency"}
            open={open}
            onClose={onClose}
            width={480}
            destroyOnClose
            footer={
                <Space style={{ justifyContent: "flex-end", width: "100%", display: "flex" }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="primary" onClick={() => form.submit()}>
                        {isEdit ? "Save Changes" : "Add Currency"}
                    </Button>
                </Space>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                {!isEdit && (
                    <Form.Item
                        name="code"
                        label="ISO Code"
                        rules={[
                            { required: true, message: "Code required" },
                            { pattern: /^[A-Za-z]{3}$/, message: "Must be 3 letters (e.g. USD)" },
                        ]}
                    >
                        <Input
                            placeholder="e.g. USD"
                            maxLength={3}
                            style={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 2 }}
                            onChange={(e) =>
                                form.setFieldValue("code", e.target.value.toUpperCase())
                            }
                        />
                    </Form.Item>
                )}

                <Form.Item name="name" label="Currency Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. US Dollar" />
                </Form.Item>

                <Row gutter={12}>
                    <Col span={10}>
                        <Form.Item name="symbol" label="Symbol" rules={[{ required: true }]}>
                            <Input placeholder="e.g. $" />
                        </Form.Item>
                    </Col>
                    <Col span={14}>
                        <Form.Item name="symbol_position" label="Symbol Position">
                            <Select>
                                <Option value="before">Before amount ($100)</Option>
                                <Option value="after">After amount (100$)</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item name="decimal_places" label="Decimal Places">
                            <InputNumber min={0} max={4} style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="thousands_separator" label="Thousands Sep.">
                            <Input placeholder="," maxLength={1} />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="is_active" label="Active" valuePropName="checked">
                    <Switch />
                </Form.Item>
            </Form>
        </Drawer>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   EXCHANGE RATE FORM DRAWER
───────────────────────────────────────────────────────────────────────────── */
interface RateDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editing?: ExchangeRate | null;
    currencies: Currency[];
    functionalCode: string;
}

const RateDrawer: React.FC<RateDrawerProps> = ({
    open, onClose, onSuccess, editing, currencies, functionalCode,
}) => {
    const [form] = Form.useForm();

    React.useEffect(() => {
        if (open && editing) {
            form.setFieldsValue({
                ...editing,
                rate_date: dayjs(editing.rate_date),
            });
        } else if (open) {
            form.resetFields();
            form.setFieldsValue({
                to_currency: functionalCode,
                rate_date: dayjs(),
                source: "manual",
            });
        }
    }, [open, editing, functionalCode, form]);

    const handleFinish = async (values: any) => {
        const payload = {
            ...values,
            rate_date: values.rate_date?.toISOString(),
        };
        if (editing) {
            await updateRate(editing._id, payload);
        } else {
            await createRate(payload as CreateRateParams);
        }
        onSuccess();
        onClose();
    };

    const currencyOptions = currencies.map((c) => (
        <Option key={c.code} value={c.code}>
            <Space>
                <Text strong>{c.code}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{c.name}</Text>
            </Space>
        </Option>
    ));

    return (
        <Drawer
            title={editing ? "Edit Exchange Rate" : "Add Exchange Rate"}
            open={open}
            onClose={onClose}
            width={440}
            destroyOnClose
            footer={
                <Space style={{ justifyContent: "flex-end", width: "100%", display: "flex" }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="primary" onClick={() => form.submit()}>
                        {editing ? "Save Changes" : "Add Rate"}
                    </Button>
                </Space>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Row gutter={12} align="middle">
                    <Col span={10}>
                        <Form.Item
                            name="from_currency"
                            label="From"
                            rules={[{ required: true }]}
                        >
                            <Select placeholder="USD" showSearch disabled={!!editing}>
                                {currencyOptions}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={4} style={{ textAlign: "center", paddingTop: 24 }}>
                        <ArrowRightOutlined style={{ color: "#8c8c8c", fontSize: 18 }} />
                    </Col>
                    <Col span={10}>
                        <Form.Item
                            name="to_currency"
                            label="To"
                            rules={[{ required: true }]}
                        >
                            <Select placeholder="KES" showSearch disabled={!!editing}>
                                {currencyOptions}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    name="rate"
                    label="Rate (1 FROM = X TO)"
                    rules={[{ required: true }, { type: "number", min: 0.000001, message: "Rate must be > 0" }]}
                >
                    <InputNumber
                        style={{ width: "100%" }}
                        precision={6}
                        step={0.01}
                        placeholder="e.g. 129.50"
                    />
                </Form.Item>

                <Row gutter={12}>
                    <Col span={14}>
                        <Form.Item name="rate_date" label="Effective Date" rules={[{ required: true }]}>
                            <DatePicker style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>
                    <Col span={10}>
                        <Form.Item name="source" label="Source">
                            <Select>
                                <Option value="manual">Manual</Option>
                                <Option value="api">API</Option>
                                <Option value="central_bank">Central Bank</Option>
                                <Option value="fixed">Fixed</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="notes" label="Notes">
                    <Input.TextArea rows={2} placeholder="Optional notes" />
                </Form.Item>
            </Form>
        </Drawer>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   CURRENCY CONVERTER WIDGET
───────────────────────────────────────────────────────────────────────────── */
const CurrencyConverter: React.FC<{ currencies: Currency[] }> = ({ currencies }) => {
    const [amount, setAmount] = useState<number>(1000);
    const [from, setFrom] = useState("USD");
    const [to, setTo] = useState("KES");
    const [result, setResult] = useState<{ converted: number; rate: number } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleConvert = async () => {
        setLoading(true);
        const res = await convertAmount({ amount, from_currency: from, to_currency: to });
        if (res) setResult({ converted: res.converted_amount, rate: res.exchange_rate });
        setLoading(false);
    };

    const swap = () => { setFrom(to); setTo(from); setResult(null); };

    const fromCcy = currencies.find((c) => c.code === from);
    const toCcy = currencies.find((c) => c.code === to);

    return (
        <Card
            size="small"
            title={<Space><SwapOutlined />Currency Converter</Space>}
            style={{ marginBottom: 16 }}
        >
            <Row gutter={12} align="middle">
                <Col span={6}>
                    <InputNumber
                        value={amount}
                        onChange={(v) => { setAmount(v || 0); setResult(null); }}
                        style={{ width: "100%" }}
                        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        parser={(v) => Number(v?.replace(/,/g, ""))}
                        min={0}
                    />
                </Col>
                <Col span={6}>
                    <Select value={from} onChange={(v) => { setFrom(v); setResult(null); }} style={{ width: "100%" }} showSearch>
                        {currencies.map((c) => <Option key={c.code} value={c.code}>{c.code} — {c.symbol}</Option>)}
                    </Select>
                </Col>
                <Col span={2} style={{ textAlign: "center" }}>
                    <Button icon={<SwapOutlined />} size="small" onClick={swap} />
                </Col>
                <Col span={6}>
                    <Select value={to} onChange={(v) => { setTo(v); setResult(null); }} style={{ width: "100%" }} showSearch>
                        {currencies.map((c) => <Option key={c.code} value={c.code}>{c.code} — {c.symbol}</Option>)}
                    </Select>
                </Col>
                <Col span={4}>
                    <Button type="primary" onClick={handleConvert} loading={loading} block>Convert</Button>
                </Col>
            </Row>

            {result && (
                <div style={{
                    marginTop: 16, padding: "12px 16px",
                    background: "linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)",
                    borderRadius: 8, border: "1px solid #91caff",
                }}>
                    <Row gutter={24}>
                        <Col>
                            <Text type="secondary" style={{ fontSize: 12 }}>Converted</Text>
                            <br />
                            <Text strong style={{ fontSize: 22, color: "#1d39c4" }}>
                                {formatCurrencyAmount(result.converted, toCcy)}
                            </Text>
                        </Col>
                        <Col>
                            <Text type="secondary" style={{ fontSize: 12 }}>Rate used</Text>
                            <br />
                            <Text style={{ fontSize: 14 }}>
                                1 {from} = {result.rate.toFixed(4)} {to}
                            </Text>
                        </Col>
                    </Row>
                </div>
            )}
        </Card>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
const CurrencyPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { modal } = App.useApp();

    const [currencyDrawer, setCurrencyDrawer] = useState(false);
    const [rateDrawer, setRateDrawer] = useState(false);
    const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
    const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
    const [activeTab, setActiveTab] = useState("currencies");
    const [seeding, setSeeding] = useState(false);

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: currencies = [], isLoading: loadingCurrencies, refetch: refetchCurrencies } = useQuery({
        queryKey: ["currencies"],
        queryFn: () => listCurrencies(false),          // show all (active + inactive)
    });

    const { data: functional } = useQuery({
        queryKey: ["functional-currency"],
        queryFn: getFunctionalCurrency,
    });

    const { data: latestRates = [], isLoading: loadingRates, refetch: refetchRates } = useQuery({
        queryKey: ["latest-rates"],
        queryFn: getLatestRates,
    });

    const invalidate = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["currencies"] });
        queryClient.invalidateQueries({ queryKey: ["functional-currency"] });
        queryClient.invalidateQueries({ queryKey: ["latest-rates"] });
    }, [queryClient]);

    // ── Mutations ──────────────────────────────────────────────────────────────
    const deactivateMutation = useMutation({
        mutationFn: (code: string) => deactivateCurrency(code),
        onSuccess: invalidate,
    });

    const setFunctionalMutation = useMutation({
        mutationFn: (code: string) => setFunctionalCurrency(code),
        onSuccess: invalidate,
    });

    const deleteRateMutation = useMutation({
        mutationFn: (id: string) => deleteRate(id),
        onSuccess: invalidate,
    });

    const handleSeed = () => {
        modal.confirm({
            title: "Seed Default Currencies?",
            content: "Inserts KES (functional) + 10 common currencies. Safe to run multiple times.",
            okText: "Seed",
            onOk: async () => {
                setSeeding(true);
                try { await seedCurrencies(); invalidate(); }
                finally { setSeeding(false); }
            },
        });
    };

    // ── Export ─────────────────────────────────────────────────────────────────
    const exportRatesToExcel = async () => {
        const XLSX = await import("xlsx");
        const rows = latestRates.map((r) => ({
            "From": r.from_currency, "To": r.to_currency,
            "Rate": r.rate, "Date": dayjs(r.rate_date).format("DD MMM YYYY"),
            "Source": r.source,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Exchange Rates");
        XLSX.writeFile(wb, `exchange-rates-${dayjs().format("YYYYMMDD")}.xlsx`);
    };

    const exportMenuItems: MenuProps["items"] = [
        { key: "excel", icon: <FileExcelOutlined style={{ color: "#217346" }} />, label: "Export to Excel", onClick: exportRatesToExcel },
    ];

    // ── Currency columns ───────────────────────────────────────────────────────
    const currencyColumns = [
        {
            title: "Code", dataIndex: "code", key: "code", width: 80,
            render: (v: string) => <Text strong style={{ fontFamily: "monospace", fontSize: 14 }}>{v}</Text>,
        },
        {
            title: "Currency", dataIndex: "name", key: "name",
            render: (name: string, r: Currency) => (
                <Space>
                    <Text style={{ fontWeight: r.is_functional ? 600 : 400 }}>{name}</Text>
                    {r.is_functional && (
                        <Tag color="gold" icon={<StarFilled />} style={{ fontSize: 11 }}>Base</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: "Symbol", dataIndex: "symbol", key: "symbol", width: 80,
            render: (v: string, r: Currency) => (
                <Text style={{ fontSize: 16 }}>
                    {r.symbol_position === "before" ? `${v}100` : `100${v}`}
                </Text>
            ),
        },
        {
            title: "Decimals", dataIndex: "decimal_places", key: "decimal_places", width: 80,
            render: (v: number) => <Text type="secondary">{v}</Text>,
        },
        {
            title: "Status", dataIndex: "is_active", key: "is_active", width: 90,
            render: (v: boolean) => v
                ? <Badge status="success" text="Active" />
                : <Badge status="default" text="Inactive" />,
        },
        {
            title: "Actions", key: "actions", width: 160, fixed: "right" as const,
            render: (_: any, r: Currency) => (
                <Space size={4}>
                    <Tooltip title={r.is_functional ? "Already the base currency" : "Set as base currency"}>
                        <Popconfirm
                            title={`Set ${r.code} as the functional (base) currency?`}
                            description="All new transactions will use this as the base. Existing records are unaffected."
                            onConfirm={() => setFunctionalMutation.mutate(r.code)}
                            okText="Set as Base" disabled={r.is_functional}
                        >
                            <Button
                                icon={r.is_functional ? <StarFilled style={{ color: "#faad14" }} /> : <StarOutlined />}
                                size="small"
                                disabled={r.is_functional}
                            />
                        </Popconfirm>
                    </Tooltip>
                    <Tooltip title="Edit">
                        <Button
                            icon={<EditOutlined />} size="small"
                            onClick={() => { setEditingCurrency(r); setCurrencyDrawer(true); }}
                        />
                    </Tooltip>
                    <Tooltip title={r.is_functional ? "Cannot deactivate base currency" : "Deactivate"}>
                        <Popconfirm
                            title={`Deactivate ${r.code}?`}
                            onConfirm={() => deactivateMutation.mutate(r.code)}
                            okText="Deactivate" okButtonProps={{ danger: true }}
                            disabled={r.is_functional}
                        >
                            <Button
                                icon={<PoweroffOutlined />} size="small"
                                danger={r.is_active && !r.is_functional}
                                disabled={r.is_functional}
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    // ── Rate columns ───────────────────────────────────────────────────────────
    const rateColumns = [
        {
            title: "Pair", key: "pair", width: 140,
            render: (_: any, r: ExchangeRate) => (
                <Space>
                    <Text strong style={{ fontFamily: "monospace" }}>{r.from_currency}</Text>
                    <ArrowRightOutlined style={{ color: "#8c8c8c", fontSize: 11 }} />
                    <Text strong style={{ fontFamily: "monospace" }}>{r.to_currency}</Text>
                </Space>
            ),
        },
        {
            title: "Rate", dataIndex: "rate", key: "rate", width: 130,
            render: (v: number, r: ExchangeRate) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: 15 }}>{v.toLocaleString("en-US", { maximumFractionDigits: 6 })}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        1 {r.from_currency} = {v} {r.to_currency}
                    </Text>
                </Space>
            ),
        },
        {
            title: "Effective Date", dataIndex: "rate_date", key: "rate_date", width: 130,
            render: (v: string) => dayjs(v).format("DD MMM YYYY"),
        },
        {
            title: "Source", dataIndex: "source", key: "source", width: 120,
            render: (v: string) => {
                const color: Record<string, string> = {
                    manual: "default", api: "blue", central_bank: "green", fixed: "orange",
                };
                return <Tag color={color[v] || "default"}>{v?.replace(/_/g, " ").toUpperCase()}</Tag>;
            },
        },
        {
            title: "Actions", key: "actions", width: 100, fixed: "right" as const,
            render: (_: any, r: ExchangeRate) => (
                <Space size={4}>
                    <Tooltip title="Edit">
                        <Button icon={<EditOutlined />} size="small"
                            onClick={() => { setEditingRate(r); setRateDrawer(true); }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete this exchange rate?"
                        onConfirm={() => deleteRateMutation.mutate(r._id)}
                        okText="Delete" okButtonProps={{ danger: true }}
                    >
                        <Button icon={<DeleteOutlined />} size="small" danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // ── Summary cards ──────────────────────────────────────────────────────────
    const activeCurrencies = currencies.filter((c) => c.is_active);

    return (
        <App>
            <Card
                bordered
                bodyStyle={{ padding: 0 }}
                title={
                    <Space>
                        <DollarOutlined style={{ fontSize: 18, color: "#1890ff" }} />
                        <Text strong style={{ fontSize: 16 }}>Multi-Currency Settings</Text>
                    </Space>
                }
                extra={
                    <Space>
                        {activeTab === "currencies" && (
                            <>
                                <Tooltip title="Refresh currencies data">
                                    <Button 
                                        icon={<ReloadOutlined />} 
                                        onClick={() => refetchCurrencies()}
                                        loading={loadingCurrencies}
                                    />
                                </Tooltip>
                                <Tooltip title="Seed KES + 10 common currencies — safe to run multiple times">
                                    <Button icon={<ThunderboltOutlined />} onClick={handleSeed} loading={seeding}>
                                        Seed Defaults
                                    </Button>
                                </Tooltip>
                                <Button
                                    type="primary" icon={<PlusOutlined />}
                                    onClick={() => { setEditingCurrency(null); setCurrencyDrawer(true); }}
                                >
                                    Add Currency
                                </Button>
                            </>
                        )}
                        {activeTab === "rates" && (
                            <>
                                <Tooltip title="Refresh exchange rates data">
                                    <Button 
                                        icon={<ReloadOutlined />} 
                                        onClick={() => refetchRates()}
                                        loading={loadingRates}
                                    />
                                </Tooltip>
                                <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
                                    <Button icon={<DownloadOutlined />}>Export</Button>
                                </Dropdown>
                                <Button
                                    type="primary" icon={<PlusOutlined />}
                                    onClick={() => { setEditingRate(null); setRateDrawer(true); }}
                                >
                                    Add Rate
                                </Button>
                            </>
                        )}
                    </Space>
                }
            >
                {/* ── Functional currency banner ── */}
                {functional && (
                    <div style={{ padding: "12px 24px", borderBottom: "1px solid #f0f0f0" }}>
                        <Space>
                            <CheckCircleOutlined style={{ color: "#52c41a" }} />
                            <Text type="secondary">Base (functional) currency:</Text>
                            <Text strong style={{ fontSize: 15 }}>
                                {functional.code} — {functional.name} ({functional.symbol})
                            </Text>
                            <Tag color="gold">Base</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                All amounts are stored and reported in this currency
                            </Text>
                        </Space>
                    </div>
                )}

                {!functional && (
                    <Alert
                        message="No base currency set"
                        description='Click "Seed Defaults" to initialise currencies with KES as the base, or add a currency and mark it as functional.'
                        type="warning"
                        showIcon
                        style={{ margin: "16px 24px" }}
                    />
                )}

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    style={{ paddingLeft: 16, paddingRight: 16 }}
                    items={[
                        {
                            key: "currencies",
                            label: (
                                <Space>
                                    Currencies
                                    <Tag style={{ fontSize: 10, padding: "0 5px" }}>{activeCurrencies.length}</Tag>
                                </Space>
                            ),
                            children: (
                                <>
                                    {/* Summary row */}
                                    <Row gutter={16} style={{ padding: "16px 8px" }}>
                                        <Col span={6}>
                                            <Statistic title="Total Currencies" value={currencies.length} />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic title="Active" value={activeCurrencies.length} valueStyle={{ color: "#52c41a" }} />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title="Base Currency"
                                                value={functional?.code ?? "—"}
                                                suffix={functional ? <Text type="secondary" style={{ fontSize: 13 }}>{functional.symbol}</Text> : null}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic title="Exchange Rates" value={latestRates.length} />
                                        </Col>
                                    </Row>
                                    <Table
                                        rowKey="_id"
                                        dataSource={currencies}
                                        columns={currencyColumns}
                                        loading={loadingCurrencies}
                                        size="small"
                                        pagination={false}
                                        scroll={{ x: 700 }}
                                        rowClassName={(r) => !r.is_active ? "opacity-50" : ""}
                                    />
                                </>
                            ),
                        },
                        {
                            key: "rates",
                            label: (
                                <Space>
                                    Exchange Rates
                                    <Tag style={{ fontSize: 10, padding: "0 5px" }}>{latestRates.length}</Tag>
                                </Space>
                            ),
                            children: (
                                <>
                                    <div style={{ padding: "16px 8px 8px" }}>
                                        <CurrencyConverter currencies={activeCurrencies} />
                                    </div>
                                    <Table
                                        rowKey="_id"
                                        dataSource={latestRates}
                                        columns={rateColumns}
                                        loading={loadingRates}
                                        size="small"
                                        pagination={{ pageSize: 20, showTotal: (t) => `${t} rates` }}
                                        scroll={{ x: 700 }}
                                    />
                                </>
                            ),
                        },
                    ]}
                />
            </Card>

            {/* ── Drawers ── */}
            <CurrencyDrawer
                open={currencyDrawer}
                onClose={() => setCurrencyDrawer(false)}
                onSuccess={invalidate}
                editing={editingCurrency}
            />
            <RateDrawer
                open={rateDrawer}
                onClose={() => setRateDrawer(false)}
                onSuccess={invalidate}
                editing={editingRate}
                currencies={activeCurrencies}
                functionalCode={functional?.code ?? "KES"}
            />
        </App>
    );
};

export default CurrencyPage;