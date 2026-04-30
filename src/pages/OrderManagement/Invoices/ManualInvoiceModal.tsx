import React, { useEffect, useState } from "react";
import {
    Modal, Form, Input, InputNumber, Select, DatePicker,
    Button, Space, Table, Divider, App, Row, Col, Tag,
    Typography, Alert, Segmented, Steps, Card, Statistic, Tooltip, Checkbox,
} from "antd";
import {
    PlusOutlined, DeleteOutlined,
    FileDoneOutlined, FileTextOutlined, DollarOutlined,
    CheckCircleOutlined, ArrowRightOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllAccounts } from "@services/accounting/accounts";
import { createInvoice, convertQuoteToInvoice, recordInvoicePayment } from "@services/accounting/invoice";
import { fetchAllCustomers } from "@services/customers";
import { fetchAllInventoryItems, getAllProducts } from "@services/products";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { fetchTenantDetails, getCurrentTenantId } from "@services/tenants";
import AddCustomerModal from "@pages/Customer/AddCustomerModal";
import AccountFormDrawer from "@pages/ChartOfAccounts/AccountFormDrawer";
import dayjs, { Dayjs } from "dayjs";

const { TextArea } = Input;
const { Text } = Typography;

const PRESET_TERMS = [
    { label: "Due on Receipt", value: "Due on Receipt", days: 0 },
    { label: "Net 7", value: "Net 7", days: 7 },
    { label: "Net 14", value: "Net 14", days: 14 },
    { label: "Net 30", value: "Net 30", days: 30 },
    { label: "Net 60", value: "Net 60", days: 60 },
    { label: "Net 90", value: "Net 90", days: 90 },
    { label: "Cash on Delivery", value: "Cash on Delivery", days: null },
];

// Parse "Net N" pattern to extract days — handles custom terms like "Net 2", "Net 45"
const parseDaysFromTerm = (term: string): number | null => {
    const preset = PRESET_TERMS.find((t) => t.value === term);
    if (preset !== undefined) return preset.days;
    const match = term?.match(/^[Nn]et\s+(\d+)$/);
    if (match) return parseInt(match[1]);
    return null;
};

const calcDueDate = (issueDate: Dayjs, terms: string): Dayjs | null => {
    const days = parseDaysFromTerm(terms);
    if (days == null) return null;
    return issueDate.add(days, "day");
};

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface LineItem {
    key: string;
    item_type: "inventory" | "service" | "custom";
    item_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    vat_rate: number;
    account_id: string;
}

type DocType = "quote" | "invoice";

const newLine = (defaultVatRate = 0): LineItem => ({
    key: `${Date.now()}-${Math.random()}`,
    item_type: "custom",
    description: "",
    quantity: 1,
    unit_price: 0,
    discount_amount: 0,
    vat_rate: defaultVatRate,
    account_id: "",
});

// ─────────────────────────────────────────────────────────────────────────────
const ManualInvoiceModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
    const [form] = Form.useForm();
    const [payForm] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();

    const [lines, setLines] = useState<LineItem[]>([newLine()]);
    const [docType, setDocType] = useState<DocType>("invoice");
    const [step, setStep] = useState(0);
    const [savedInvoice, setSavedInvoice] = useState<any>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [customTermInput, setCustomTermInput] = useState("");
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    
    // Discount state
    const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [discountPercentage, setDiscountPercentage] = useState<number>(0);
    const [discountReason, setDiscountReason] = useState<string>("");

    // Track whether we've had a successful save so closing always triggers refresh
    const [didSave, setDidSave] = useState(false);

    // ── Inline add modals ─────────────────────────────────────────────────────
    const [addCustomerOpen, setAddCustomerOpen] = useState(false);
    const [addAccountOpen, setAddAccountOpen] = useState(false);
    const [addDepositAccountOpen, setAddDepositAccountOpen] = useState(false);

    const shopId = localStorage.getItem("shopId") || "";
    const tenantId = getCurrentTenantId();

    // ── Tenant VAT config ─────────────────────────────────────────────────────
    const { data: tenantData } = useQuery({
        queryKey: ["tenant", tenantId],
        queryFn: () => fetchTenantDetails(tenantId),
        enabled: !!tenantId && open,
        staleTime: 5 * 60 * 1000,
    });

    const tenant = tenantData?.data;
    const vatEnabled = tenant?.is_vat_enabled ?? true;
    const standardVatRate = tenant?.vat_standard_rate ?? 0.16;
    const vatPricingMode = tenant?.vat_pricing_mode ?? "EXCLUSIVE";

    const vatRateOptions = [
        { label: "Exempt (0%)", value: 0 },
        { label: `Standard (${(standardVatRate * 100).toFixed(0)}%)`, value: standardVatRate },
    ];

    useEffect(() => {
        if (!vatEnabled) {
            setLines((prev) => prev.map((l) => ({ ...l, vat_rate: 0 })));
        }
    }, [vatEnabled]);

    // ── Accounts ──────────────────────────────────────────────────────────────
    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts"],
        queryFn: () => getAllAccounts({}),
        enabled: open,
    });
    const allAccounts = accountsData?.accounts || [];

    const revenueAccounts = allAccounts.filter(
        (a: any) => a.account_type === "REVENUE" && a.is_active
    );
    const assetAccounts = allAccounts.filter(
        (a: any) => a.account_type === "ASSET" && a.is_active
    );
    const assetAccountOptions = assetAccounts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));

    // ── Customers ─────────────────────────────────────────────────────────────
    const { data: customersData, isFetching: customersFetching } = useQuery({
        queryKey: ["customers-dropdown", customerSearch],
        queryFn: () => fetchAllCustomers({ customer_name: customerSearch }),
        enabled: open,
        select: (res: any) =>
            Array.isArray(res) ? res : (res?.customers || res?.data || []),
        staleTime: 30_000,
    });

    // ── Inventory Items & Services ─────────────────────────────────────────────
    // Products (used as inventory items)
    const { data: inventoryData, isFetching: inventoryFetching } = useQuery({
        queryKey: ["inventory-items"],
        queryFn: () => fetchAllInventoryItems({}),
        enabled: open,
        select: (res: any) => {
            const items = Array.isArray(res) ? res : (res?.data || res?.inventory || []);
            return items.map((item: any) => ({
                id: item._id || item.id,
                name: item.name || item.product_name,
                price: item.price || item.selling_price || 0,
                type: 'inventory',
                account_id: item.account_id || 'acc_4100',
                sku: item.sku,
                stock_quantity: item.quantity || item.stock_quantity || 0,
                description: item.description,
            }));
        },
        staleTime: 30_000,
    });
   
    // Services (using products endpoint)
    const { data: servicesData, isFetching: servicesFetching } = useQuery({
        queryKey: ["services"],
        queryFn: () => getAllProducts(),
        enabled: open,
        select: (res: any) => {
            console.log('API Response:', res);
            
            // Handle nested structure: categories -> products array
            const categories = Array.isArray(res) ? res : (res?.data || res?.categories || []);
            const allProducts: any[] = [];
            
            categories.forEach((category: any) => {
                if (category.products && Array.isArray(category.products)) {
                    category.products.forEach((product: any) => {
                        allProducts.push({
                            ...product,
                            category_name: category.name, // Add category name for reference
                        });
                    });
                }
            });
            
            console.log('Extracted products:', allProducts);
            
            return allProducts.map((product: any) => ({
                id: product._id || product.id,
                name: product.name || product.product_name,
                price: product.price || product.selling_price || 0,
                type: 'service',
                account_id: product.account_id || 'acc_4100',
                description: product.description,
                category_name: product.category_name,
                activateInventory: product.activateInventory,
                quantity: product.quantity,
            }));
        },
        staleTime: 30_000,
    });

    // Update state when data changes
    useEffect(() => {
        if (inventoryData) {
            setInventoryItems(inventoryData);
        }
    }, [inventoryData]);

    useEffect(() => {
        if (servicesData) {
            setServices(servicesData);
        }
    }, [servicesData]);

    const customerOptions = (customersData || []).map((c: any) => ({
        label: `${c.customer_name}${c.phone ? ` — ${c.phone}` : ""}`,
        value: c._id,
    }));

    // ── Payment methods ───────────────────────────────────────────────────────
    const { data: methodsData } = useQuery({
        queryKey: ["payment-methods"],
        queryFn: () => fetchAllPaymentMethods({}),
        enabled: open && step === 2,
    });
    const methodOptions = (methodsData || []).map((m: any) => ({
        label: m.name,
        value: m._id,
    }));

    // ── Shared: refetch helpers called after inline creates ───────────────────
    const handleCustomerAdded = () => {
        queryClient.invalidateQueries({ queryKey: ["customers-dropdown"] });
    };
    const handleAccountAdded = () => {
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    };

    // ── Shared: dropdown footer factory ──────────────────────────────────────
    const dropdownFooter = (label: string, onAdd: () => void) => (
        <>
            <Divider style={{ margin: "4px 0" }} />
            <Button
                type="link"
                icon={<PlusOutlined />}
                style={{ width: "100%", textAlign: "left", padding: "4px 8px" }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    onAdd();
                }}
            >
                {label}
            </Button>
        </>
    );

    // ── Line helpers ──────────────────────────────────────────────────────────
    const updateLine = (key: string, field: keyof LineItem, val: any) =>
        setLines((prev) =>
            prev.map((l) => (l.key === key ? { ...l, [field]: val } : l))
        );

    const addLine = () =>
        setLines((prev) => [
            ...prev,
            newLine(vatEnabled ? standardVatRate : 0),
        ]);

    const removeLine = (key: string) =>
        setLines((prev) => prev.filter((l) => l.key !== key));

    // ── Totals ────────────────────────────────────────────────────────────────
    const lineNet = (l: LineItem) => {
        const grossAmount = l.quantity * l.unit_price;
        const discountedAmount = grossAmount - l.discount_amount;
        
        if (vatPricingMode === "INCLUSIVE" && l.vat_rate > 0) {
            return discountedAmount / (1 + l.vat_rate);
        }
        return discountedAmount;
    };
    const lineVAT = (l: LineItem) => {
        if (!vatEnabled || l.vat_rate === 0) return 0;
        if (vatPricingMode === "INCLUSIVE") {
            const gross = l.quantity * l.unit_price;
            const discountedGross = gross - l.discount_amount;
            return discountedGross - discountedGross / (1 + l.vat_rate);
        }
        return lineNet(l) * l.vat_rate;
    };
    const lineGross = (l: LineItem) =>
        vatPricingMode === "INCLUSIVE"
            ? l.quantity * l.unit_price
            : lineNet(l) + lineVAT(l);

    const subtotal = lines.reduce((s, l) => s + lineNet(l), 0);
    const totalVAT = lines.reduce((s, l) => s + lineVAT(l), 0);
    
    // Calculate invoice-level discount
    const invoiceDiscount = discountType === "percentage" 
        ? (subtotal * discountPercentage) / 100 
        : discountAmount;
    
    const grandTotal = subtotal + totalVAT - invoiceDiscount;

    const fmt = (n: number) =>
        n.toLocaleString("en-KE", { minimumFractionDigits: 2 });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const saveMutation = useMutation({
        mutationFn: createInvoice,
        onSuccess: (data) => {
            setSavedInvoice(data?.invoice);
            setDidSave(true); // mark: table needs refresh when modal closes
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
            setStep(docType === "quote" ? 1 : 2);
        },
        onError: (err: any) =>
            message.error(err?.response?.data?.message || "Failed to save"),
    });

    const convertMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data?: any }) =>
            convertQuoteToInvoice(id, data),
        onSuccess: (data) => {
            setSavedInvoice(data?.invoice);
            setDidSave(true);
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
            setStep(2);
        },
        onError: (err: any) =>
            message.error(err?.response?.data?.message || "Failed to convert"),
    });

    const payMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            recordInvoicePayment(id, data),
        onSuccess: () => {
            message.success("Payment recorded — invoice settled");
            queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
            queryClient.invalidateQueries({ queryKey: ["income-history"] });
            // Payment success: call onSuccess then close cleanly
            onSuccess?.();
            resetAndClose();
        },
        onError: (err: any) =>
            message.error(err?.response?.data?.message || "Failed to record payment"),
    });

    // ── Reset + close — always fires onSuccess if anything was saved ──────────
    const resetAndClose = () => {
        form.resetFields();
        payForm.resetFields();
        setLines([newLine(vatEnabled ? standardVatRate : 0)]);
        setStep(0);
        setDocType("invoice");
        setSavedInvoice(null);
        setDidSave(false);
        setCustomTermInput("");
        onClose();
    };

    // Called for every close path (X button, Cancel, Skip, close after payment)
    const handleClose = () => {
        // If we successfully created/converted anything, refresh the table
        if (didSave) {
            onSuccess?.();
        }
        resetAndClose();
    };

    const buildPayload = (values: any, status: "Draft" | "Pending") => ({
        direction: "customer" as const,
        shop_id: shopId,
        customer_id: values.customer_id,
        issue_date: values.issue_date?.toISOString(),
        due_date: values.due_date?.toISOString(),
        notes: values.notes,
        terms: values.terms,
        status,
        discount_type: invoiceDiscount > 0 ? discountType : undefined,
        discount_amount: invoiceDiscount > 0 ? invoiceDiscount : undefined,
        discount_percentage: invoiceDiscount > 0 && discountType === "percentage" ? discountPercentage : undefined,
        discount_reason: invoiceDiscount > 0 ? discountReason : undefined,
        lines: lines.map((l) => ({
            description: l.description,
            account_id: l.account_id,
            quantity: l.quantity,
            price: l.unit_price,
            discount_amount: l.discount_amount,
            vat_rate: vatEnabled ? l.vat_rate : 0,
            vat_amount: parseFloat(lineVAT(l).toFixed(2)),
            item_type: l.item_type,
        })),
    } as any);

    const handleSave = async () => {
        if (!shopId) {
            message.error("No shop selected — please select a branch first");
            return;
        }
        const values = await form.validateFields();
        if (lines.some((l) => !l.description || l.unit_price <= 0)) {
            message.warning("Fill in all line items — description and price are required");
            return;
        }
        saveMutation.mutate(
            buildPayload(values, docType === "quote" ? "Draft" : "Pending")
        );
    };

    const handleConvert = () => {
        const values = form.getFieldsValue();
        convertMutation.mutate({
            id: savedInvoice._id,
            data: {
                due_date: values.due_date?.toISOString(),
                notes: values.notes,
                terms: values.terms,
            },
        });
    };

    const handlePayNow = async () => {
        const v = await payForm.validateFields();
        payMutation.mutate({
            id: savedInvoice._id,
            data: {
                amount: v.amount,
                method_id: v.method_id,
                account_id: v.account_id,
                reference: v.reference,
                notes: v.notes,
            },
        });
    };

    // ── Line items columns ────────────────────────────────────────────────────
    const lineColumns = [
        {
            title: "Item",
            dataIndex: "description",
            width: 300,
            render: (_: any, r: LineItem) => (
                <Select
                    size="small"
                    placeholder={inventoryFetching || servicesFetching ? "Loading items..." : "Select item or service"}
                    value={r.item_id}
                    onChange={(value: string) => {
                        if (value === "custom") {
                            // Handle custom item selection
                            updateLine(r.key, "item_id" as keyof LineItem, null);
                            updateLine(r.key, "item_type" as keyof LineItem, "custom");
                            updateLine(r.key, "description" as keyof LineItem, "");
                            updateLine(r.key, "unit_price" as keyof LineItem, 0);
                            return;
                        }

                        const selectedItem = [...inventoryItems, ...services].find(item => item.id === value);
                        if (selectedItem) {
                            updateLine(r.key, "item_id" as keyof LineItem, value);
                            updateLine(r.key, "item_type" as keyof LineItem, selectedItem.type);
                            updateLine(r.key, "description" as keyof LineItem, selectedItem.name);
                            updateLine(r.key, "unit_price" as keyof LineItem, selectedItem.price);
                            updateLine(r.key, "account_id" as keyof LineItem, selectedItem.account_id || "");
                        }
                    }}
                    allowClear
                    showSearch
                    loading={inventoryFetching || servicesFetching}
                    filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={[
                        ...(inventoryItems.length > 0 ? [{
                            label: "Inventory Items",
                            options: inventoryItems.map(item => ({
                                label: `${item.name}${item.sku ? ` (${item.sku})` : ""} - KES${item.price}`,
                                value: item.id,
                            })),
                        }] : []),
                        ...(services.length > 0 ? [{
                            label: "Services",
                            options: services.map(service => ({
                                label: `${service.name} - KES${service.price}`,
                                value: service.id,
                            })),
                        }] : []),
                        {
                            label: "Custom Item",
                            options: [{
                                label: "Create custom item...",
                                value: "custom",
                            }],
                        },
                    ]}
                />
            ),
        },
        {
            title: "Revenue Account",
            dataIndex: "account_id",
            width: 250,
            render: (_: any, r: LineItem) => (
                <Select
                    size="small" style={{ width: "100%" }}
                    placeholder="Account (display only)"
                    value={r.account_id || undefined}
                    showSearch optionFilterProp="label" allowClear
                    onChange={(v) => updateLine(r.key, "account_id", v ?? "")}
                    options={revenueAccounts.map((a: any) => ({
                        label: `${a.account_code} ${a.account_name}`,
                        value: a._id,
                    }))}
                    dropdownRender={(menu) => (
                        <>
                            {menu}
                            {dropdownFooter("Add Revenue Account", () => setAddAccountOpen(true))}
                        </>
                    )}
                />
            ),
        },
        {
            title: "Qty",
            dataIndex: "quantity",
            width: 80,
            render: (_: any, r: LineItem) => (
                <InputNumber
                    size="small" min={1} value={r.quantity} style={{ width: "100%" }}
                    onChange={(v) => updateLine(r.key, "quantity", v || 1)}
                />
            ),
        },
        {
            title: vatPricingMode === "INCLUSIVE" ? "Unit Price (incl. VAT)" : "Unit Price",
            dataIndex: "unit_price",
            width: 150,
            render: (_: any, r: LineItem) => (
                <InputNumber
                    size="small" min={0} precision={2} value={r.unit_price}
                    style={{ width: "100%" }}
                    onChange={(v) => updateLine(r.key, "unit_price", v || 0)}
                />
            ),
        },
        {
            title: "Discount",
            dataIndex: "discount_amount",
            width: 120,
            render: (_: any, r: LineItem) => (
                <InputNumber
                    size="small" min={0} precision={2} value={r.discount_amount}
                    placeholder="0"
                    style={{ width: "100%" }}
                    onChange={(v) => updateLine(r.key, "discount_amount", v || 0)}
                />
            ),
        },
        ...(vatEnabled
            ? [{
                title: (
                    <Space size={4}>
                        VAT
                        <Tooltip title={`Pricing mode: ${vatPricingMode}`}>
                            <InfoCircleOutlined style={{ fontSize: 11, color: "#8c8c8c" }} />
                        </Tooltip>
                    </Space>
                ),
                dataIndex: "vat_rate",
                width: 140,
                render: (_: any, r: LineItem) => (
                    <Select
                        size="small" style={{ width: "100%" }}
                        value={r.vat_rate}
                        onChange={(v) => updateLine(r.key, "vat_rate", v)}
                        options={vatRateOptions}
                    />
                ),
            }]
            : []
        ),
        {
            title: "Total",
            key: "gross",
            width: 130,
            align: "right" as const,
            render: (_: any, r: LineItem) => (
                <Text strong>{fmt(lineGross(r))}</Text>
            ),
        },
        {
            title: "",
            key: "del",
            width: 45,
            render: (_: any, r: LineItem) => (
                <Button
                    type="text" danger size="small" icon={<DeleteOutlined />}
                    disabled={lines.length === 1}
                    onClick={() => removeLine(r.key)}
                />
            ),
        },
    ];

    // ── Totals block ──────────────────────────────────────────────────────────
    const TotalsCard = () => (
        <Row justify="end">
            <Col span={10}>
                <div style={{
                    background: "#fafafa", padding: "12px 16px",
                    borderRadius: 8, border: "1px solid #f0f0f0",
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <Text type="secondary">Subtotal (excl. VAT)</Text>
                        <Text>KES {fmt(subtotal)}</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <Text type="secondary">VAT</Text>
                        {vatEnabled
                            ? <Tag color="blue">KES {fmt(totalVAT)}</Tag>
                            : <Tag color="default">Exempt</Tag>
                        }
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <Text type="secondary">Discount</Text>
                            <Select
                                value={discountType}
                                onChange={setDiscountType}
                                size="small"
                                style={{ width: 100 }}
                            >
                                <Select.Option value="fixed">Fixed</Select.Option>
                                <Select.Option value="percentage">Percentage</Select.Option>
                            </Select>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <InputNumber
                                value={discountType === "fixed" ? discountAmount : discountPercentage}
                                onChange={(value) => {
                                    if (discountType === "fixed") {
                                        setDiscountAmount(value || 0);
                                    } else {
                                        setDiscountPercentage(value || 0);
                                    }
                                }}
                                placeholder={discountType === "fixed" ? "Amount" : "Percentage"}
                                size="small"
                                min={0}
                                max={discountType === "percentage" ? 100 : undefined}
                                precision={discountType === "percentage" ? 2 : 0}
                                style={{ flex: 1 }}
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {discountType === "percentage" ? "%" : "KES"}
                            </Text>
                        </div>
                        <Input
                            value={discountReason}
                            onChange={(e) => setDiscountReason(e.target.value)}
                            placeholder="Discount reason (optional)"
                            size="small"
                            style={{ marginTop: 4, fontSize: 12 }}
                        />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <Text type="secondary">Discount Amount</Text>
                        <Text type="secondary">-KES {fmt(invoiceDiscount)}</Text>
                    </div>
                    <Divider style={{ margin: "8px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text strong>Grand Total</Text>
                        <Text strong style={{ fontSize: 16, color: "#1d39c4" }}>
                            KES {fmt(grandTotal)}
                        </Text>
                    </div>
                </div>
            </Col>
        </Row>
    );

    // ── Step 0 — create quote / invoice ───────────────────────────────────────
    const renderStep0 = () => (
        <>
            <Row justify="center" style={{ marginBottom: 16 }}>
                <Segmented
                    value={docType}
                    onChange={(v) => setDocType(v as DocType)}
                    size="large"
                    options={[
                        { label: <Space><FileTextOutlined />Quote</Space>, value: "quote" },
                        { label: <Space><FileDoneOutlined />Invoice</Space>, value: "invoice" },
                    ]}
                />
            </Row>

            {!vatEnabled ? (
                <Alert
                    type="warning" showIcon
                    style={{ marginBottom: 12 }}
                    message="VAT is disabled for this business"
                    description={
                        <>
                            All line items will be VAT-exempt (0%). To enable VAT go to{" "}
                            <strong>Tenant Settings → VAT Config</strong>.
                        </>
                    }
                />
            ) : (
                <Alert
                    type="info" showIcon icon={<InfoCircleOutlined />}
                    style={{ marginBottom: 12 }}
                    message={
                        <Space>
                            VAT active — standard rate{" "}
                            <strong>{(standardVatRate * 100).toFixed(0)}%</strong>
                            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
                                {vatPricingMode === "INCLUSIVE" ? "Tax Inclusive" : "Tax Exclusive"}
                            </Tag>
                        </Space>
                    }
                    description="Standard rate is pre-applied to new lines. You can set individual lines to Exempt."
                />
            )}

            <Alert
                type={docType === "quote" ? "warning" : "info"}
                showIcon style={{ marginBottom: 16 }}
                message={docType === "quote" ? "Saving as Quote (Draft)" : "Creating Invoice (A/R)"}
                description={
                    docType === "quote"
                        ? "No journal entry or AR impact until you convert it to an invoice."
                        : "Posts to books immediately — DR Accounts Receivable (1200), CR Sales Revenue (4100)."
                }
            />

            <Form form={form} layout="vertical" initialValues={{ issue_date: dayjs() }}>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="customer_id" label="Customer / Billed To"
                            rules={[{ required: true, message: "Select a customer" }]}
                        >
                            <Select
                                showSearch allowClear placeholder="Search customer..."
                                filterOption={false}
                                onSearch={setCustomerSearch}
                                loading={customersFetching}
                                options={customerOptions}
                                notFoundContent={customersFetching ? "Searching..." : "No customers found"}
                                onChange={(value: string) => {
                                    const customer = customersData?.find((c: any) => c._id === value);
                                    if (customer?.address) {
                                        form.setFieldsValue({
                                            billing_address: {
                                                use_customer_address: true,
                                                street: customer.address.street || "",
                                                building: customer.address.building || "",
                                                city: customer.address.city || "",
                                                postal_code: customer.address.postal_code || "",
                                                country: customer.address.country || "",
                                            }
                                        });
                                    } else {
                                        form.setFieldsValue({
                                            billing_address: {
                                                use_customer_address: false,
                                                street: "",
                                                building: "",
                                                city: "",
                                                postal_code: "",
                                                country: "",
                                            }
                                        });
                                    }
                                }}
                                dropdownRender={(menu) => (
                                    <>
                                        {menu}
                                        {dropdownFooter("Add New Customer", () => setAddCustomerOpen(true))}
                                    </>
                                )}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item name="billing_address" label="Billing Address">
                            <Row gutter={8}>
                                <Col span={6}>
                                    <Form.Item name={["billing_address", "use_customer_address"]} valuePropName="checked" style={{ marginBottom: 0 }}>
                                        <Checkbox>Use Customer Address</Checkbox>
                                    </Form.Item>
                                </Col>
                                <Col span={6}>
                                    <Form.Item name={["billing_address", "street"]} style={{ marginBottom: 0 }}>
                                        <Input placeholder="Street" />
                                    </Form.Item>
                                </Col>
                                <Col span={4}>
                                    <Form.Item name={["billing_address", "building"]} style={{ marginBottom: 0 }}>
                                        <Input placeholder="Building" />
                                    </Form.Item>
                                </Col>
                                <Col span={4}>
                                    <Form.Item name={["billing_address", "city"]} style={{ marginBottom: 0 }}>
                                        <Input placeholder="City" />
                                    </Form.Item>
                                </Col>
                                <Col span={4}>
                                    <Form.Item name={["billing_address", "postal_code"]} style={{ marginBottom: 0 }}>
                                        <Input placeholder="Postal Code" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="issue_date"
                            label={docType === "quote" ? "Quote Date" : "Invoice Date"}
                            rules={[{ required: true }]}
                        >
                            <DatePicker
                                style={{ width: "100%" }}
                                format="DD MMM YYYY"
                                onChange={(date) => {
                                    const terms = form.getFieldValue("terms");
                                    if (date && terms) {
                                        const due = calcDueDate(date, terms);
                                        form.setFieldValue("due_date", due ?? null);
                                    }
                                }}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="terms" label="Terms">
                            <Select
                                placeholder="Select terms"
                                allowClear
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                                }
                                options={PRESET_TERMS.map((t) => ({ label: t.label, value: t.value }))}
                                listHeight={220}
                                dropdownStyle={{ paddingBottom: 0 }}
                                searchValue={customTermInput}
                                onSearch={(val) => setCustomTermInput(val)}
                                onChange={(terms) => {
                                    setCustomTermInput("");
                                    const issueDate = form.getFieldValue("issue_date");
                                    if (issueDate && terms) {
                                        const due = calcDueDate(issueDate, terms);
                                        form.setFieldValue("due_date", due ?? null);
                                    } else if (!terms) {
                                        form.setFieldValue("due_date", null);
                                    }
                                }}
                                dropdownRender={(menu) => (
                                    <div>
                                        {menu}
                                        <div style={{
                                            padding: "8px 12px",
                                            borderTop: "1px solid #f0f0f0",
                                            background: "#fafafa",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}>
                                            <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                                                Custom Net:
                                            </span>
                                            <InputNumber
                                                size="small"
                                                min={1}
                                                max={365}
                                                placeholder="days"
                                                style={{ width: 72 }}
                                                value={customTermInput ? parseInt(customTermInput) || undefined : undefined}
                                                onChange={(val) => setCustomTermInput(val ? String(val) : "")}
                                                onPressEnter={() => {
                                                    const days = parseInt(customTermInput);
                                                    if (!days || days < 1) return;
                                                    const term = `Net ${days}`;
                                                    form.setFieldValue("terms", term);
                                                    setCustomTermInput("");
                                                    const issueDate = form.getFieldValue("issue_date");
                                                    if (issueDate) form.setFieldValue("due_date", calcDueDate(issueDate, term));
                                                }}
                                            />
                                            <Button
                                                size="small"
                                                type="primary"
                                                disabled={!customTermInput || parseInt(customTermInput) < 1}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    const days = parseInt(customTermInput);
                                                    if (!days || days < 1) return;
                                                    const term = `Net ${days}`;
                                                    form.setFieldValue("terms", term);
                                                    setCustomTermInput("");
                                                    const issueDate = form.getFieldValue("issue_date");
                                                    if (issueDate) form.setFieldValue("due_date", calcDueDate(issueDate, term));
                                                }}
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="due_date"
                            label="Due Date"
                            rules={[]}
                            tooltip={
                                docType === "quote"
                                    ? "Optional for quotes — auto-set when payment terms are selected"
                                    : "Auto-set by payment terms — you can override manually"
                            }
                        >
                            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left" plain style={{ fontSize: 13, fontWeight: 600 }}>
                    Line Items
                </Divider>

                <Table
                    dataSource={lines} columns={lineColumns}
                    rowKey="key" pagination={false} size="small"
                    style={{ marginBottom: 12 }}
                />

                <Button
                    type="dashed" icon={<PlusOutlined />} onClick={addLine}
                    style={{ width: "100%", marginBottom: 16 }}
                >
                    Add Line Item
                </Button>

                <TotalsCard />

                <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={24}>
                        <Form.Item name="notes" label="Notes">
                            <TextArea rows={2} placeholder="Notes printed on document..." />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </>
    );

    // ── Step 1 — review quote before converting ───────────────────────────────
    const renderStep1 = () => (
        <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Alert
                type="success" showIcon
                message={`Quote saved — ${savedInvoice?.order_no || ""}`}
                description="Review the quote below. When the customer accepts it, click Convert to Invoice."
            />
            <Card size="small" title="Quote Summary">
                <Row gutter={24}>
                    <Col span={8}>
                        <Statistic title="Customer"
                            value={savedInvoice?.counterparty_name || "—"}
                            valueStyle={{ fontSize: 14 }} />
                    </Col>
                    <Col span={8}>
                        <Statistic title="Issue Date"
                            value={savedInvoice?.issue_date
                                ? dayjs(savedInvoice.issue_date).format("DD MMM YYYY") : "—"}
                            valueStyle={{ fontSize: 14 }} />
                    </Col>
                    <Col span={8}>
                        <Statistic title="Grand Total (KES)"
                            value={savedInvoice?.grand_total != null ? fmt(savedInvoice.grand_total) : "—"}
                            valueStyle={{ fontSize: 14, color: "#1d39c4" }} />
                    </Col>
                </Row>
            </Card>
            <TotalsCard />
            <Alert
                type="info" showIcon
                message="Converting to Invoice"
                description="Posts DR Accounts Receivable (1200) / CR Sales Revenue (4100) and changes status from Draft to Pending."
            />
        </Space>
    );

    // ── Step 2 — record payment ───────────────────────────────────────────────
    const renderStep2 = () => (
        <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Alert
                type="success" showIcon icon={<CheckCircleOutlined />}
                message={`Invoice posted — ${savedInvoice?.order_no || ""}`}
                description="Journal entry created. You can record payment now or do it later from the Invoices tab."
            />
            <Card size="small" title="Invoice Summary">
                <Row gutter={24}>
                    <Col span={6}>
                        <Statistic title="Invoice No."
                            value={savedInvoice?.order_no || "—"} valueStyle={{ fontSize: 13 }} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="Customer"
                            value={savedInvoice?.counterparty_name || "—"} valueStyle={{ fontSize: 13 }} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="Due Date"
                            value={savedInvoice?.due_date
                                ? dayjs(savedInvoice.due_date).format("DD MMM YYYY") : "—"}
                            valueStyle={{ fontSize: 13 }} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="Amount Due (KES)"
                            value={savedInvoice?.grand_total != null ? fmt(savedInvoice.grand_total) : "—"}
                            valueStyle={{ fontSize: 13, color: "#fa8c16" }} />
                    </Col>
                </Row>
            </Card>

            <Divider orientation="left" plain style={{ fontWeight: 600 }}>
                <Space><DollarOutlined /> Record Payment (optional)</Space>
            </Divider>

            <Form form={payForm} layout="vertical">
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="method_id" label="Payment Method"
                            rules={[{ required: true, message: "Select payment method" }]}>
                            <Select showSearch placeholder="M-Pesa / Bank / Cash"
                                options={methodOptions} optionFilterProp="label" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="account_id"
                            label="Deposit Account"
                            rules={[{ required: true, message: "Select the account receiving payment" }]}
                            tooltip="Choose the cash or bank account where this payment is deposited."
                        >
                            <Select
                                showSearch
                                placeholder="e.g. Cash on Hand, Bank, M-Pesa Float"
                                optionFilterProp="label"
                                options={assetAccountOptions}
                                notFoundContent="No asset accounts found — add them in Chart of Accounts"
                                dropdownRender={(menu) => (
                                    <>
                                        {menu}
                                        {dropdownFooter("Add Asset Account", () => setAddDepositAccountOpen(true))}
                                    </>
                                )}
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="amount" label="Amount Received (KES)"
                            initialValue={savedInvoice?.grand_total}
                            rules={[{ required: true }, { type: "number", min: 0.01 }]}>
                            <InputNumber
                                style={{ width: "100%" }} min={0.01} precision={2}
                                max={savedInvoice?.grand_total}
                                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                parser={(v) => v!.replace(/,/g, "") as any}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="reference" label="Reference / Transaction Code">
                            <Input placeholder="M-Pesa code, cheque no..." />
                        </Form.Item>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Form.Item name="notes" label="Notes">
                            <Input placeholder="Optional" />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Space>
    );

    // ── Footer buttons ────────────────────────────────────────────────────────
    const renderFooter = () => {
        if (step === 0) return [
            <Button key="cancel" onClick={handleClose}>Cancel</Button>,
            <Button key="save" type="primary"
                loading={saveMutation.isPending}
                icon={docType === "quote" ? <FileTextOutlined /> : <FileDoneOutlined />}
                style={docType === "quote" ? { background: "#faad14", borderColor: "#faad14" } : {}}
                onClick={handleSave}>
                {docType === "quote" ? "Save Quote" : "Post Invoice"}
            </Button>,
        ];
        if (step === 1) return [
            // "Close" on step 1 = saved a quote, still trigger refresh
            <Button key="close" onClick={handleClose}>Close (save as quote)</Button>,
            <Button key="convert" type="primary"
                loading={convertMutation.isPending}
                icon={<ArrowRightOutlined />}
                onClick={handleConvert}>
                Convert to Invoice
            </Button>,
        ];
        if (step === 2) return [
            // "Skip" = invoice already posted, must refresh table
            <Button key="skip" onClick={handleClose}>Skip — pay later</Button>,
            <Button key="pay" type="primary"
                loading={payMutation.isPending}
                icon={<DollarOutlined />}
                style={{ background: "#52c41a", borderColor: "#52c41a" }}
                onClick={handlePayNow}>
                Record Payment
            </Button>,
        ];
        return [];
    };

    // ── Steps config ──────────────────────────────────────────────────────────
    const stepsConfig = docType === "quote"
        ? [
            { title: "Details", icon: <FileTextOutlined /> },
            { title: "Convert", icon: <ArrowRightOutlined /> },
            { title: "Payment", icon: <DollarOutlined /> },
        ]
        : [
            { title: "Details", icon: <FileDoneOutlined /> },
            { title: "Payment", icon: <DollarOutlined /> },
        ];

    const stepsIndex = docType === "quote" ? step : step === 0 ? 0 : 1;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Modal
                open={open}
                onCancel={handleClose}
                title={
                    <Space>
                        {step === 0 && (docType === "quote"
                            ? <FileTextOutlined style={{ color: "#faad14" }} />
                            : <FileDoneOutlined style={{ color: "#1890ff" }} />)}
                        {step === 1 && <FileTextOutlined style={{ color: "#faad14" }} />}
                        {step === 2 && <DollarOutlined style={{ color: "#52c41a" }} />}
                        {step === 0 && (docType === "quote" ? "Create Quote" : "Create Invoice")}
                        {step === 1 && "Review & Convert Quote"}
                        {step === 2 && "Record Payment"}
                    </Space>
                }
                width={1200}
                footer={renderFooter()}
                destroyOnClose
            >
                <Steps
                    current={stepsIndex}
                    size="small"
                    items={stepsConfig}
                    style={{ marginBottom: 24 }}
                />
                {step === 0 && renderStep0()}
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
            </Modal>

            <AddCustomerModal
                visible={addCustomerOpen}
                onClose={() => setAddCustomerOpen(false)}
                onSuccess={handleCustomerAdded}
                mode="add"
            />

            <AccountFormDrawer
                open={addAccountOpen}
                onClose={() => setAddAccountOpen(false)}
                onSuccess={() => {
                    setAddAccountOpen(false);
                    handleAccountAdded();
                }}
                accounts={allAccounts}
                shopId={shopId}
            />

            <AccountFormDrawer
                open={addDepositAccountOpen}
                onClose={() => setAddDepositAccountOpen(false)}
                onSuccess={() => {
                    setAddDepositAccountOpen(false);
                    handleAccountAdded();
                }}
                accounts={allAccounts}
                shopId={shopId}
            />
        </>
    );
};

export default ManualInvoiceModal;