import React, { useState, useEffect } from "react";
import {
    Form, Input, InputNumber, Select, DatePicker,
    Button, App, Row, Col, Alert, Divider, Descriptions, Typography,
} from "antd";
import {
    FileTextOutlined, PlusOutlined, ShopOutlined, DollarOutlined, FileSearchOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllAccounts } from "@services/accounting/accounts";
import { createBill, updateBill } from "@services/accounting/bill";
import { fetchAllSuppliers } from "@services/supplier";
import AddProSupplierModal from "@components/MODALS/pro/AddProSupplierModal";
import StepperModal from "@components/MODALS/StepperModal";
import AccountFormDrawer from "@pages/ChartOfAccounts/AccountFormDrawer";
import { getVATConfigSync, calculateVAT } from "@utils/vat";
import { CurrencySelector, useCurrency } from "@components/Currency";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text } = Typography;

const ACCENT = "#8b5cf6";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    billToEdit?: any;
}

const numFormatter = (v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const numParser = (v: any) => v!.replace(/,/g, "") as any;
const fmt2 = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STEPS = [
    { title: "Supplier", description: "Who & when", icon: <ShopOutlined /> },
    { title: "Amount", description: "Account, amount & VAT", icon: <DollarOutlined /> },
    { title: "Review", description: "Notes & create", icon: <FileSearchOutlined /> },
];

const BillFormModal: React.FC<Props> = ({ open, onClose, onSuccess, billToEdit }) => {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const { functionalCurrency } = useCurrency();

    const [step, setStep] = useState(0);
    const [supplierSearch, setSupplierSearch] = useState("");
    const [addSupplierOpen, setAddSupplierOpen] = useState(false);
    const [addAccountOpen, setAddAccountOpen] = useState(false);

    const shopId = localStorage.getItem("shopId") || undefined;
    // Existing bills only allow header fields to change (amounts are posted)
    const isEdit = !!billToEdit;

    useEffect(() => {
        if (open) setStep(0);
    }, [open]);

    useEffect(() => {
        if (open && billToEdit) {
            form.setFieldsValue({
                supplier_id: billToEdit.supplier_id?._id || billToEdit.supplier_id,
                issue_date: dayjs(billToEdit.bill_date),
                due_date: billToEdit.due_date ? dayjs(billToEdit.due_date) : null,
                expense_account_id: billToEdit.bill_lines?.[0]?.account_id?._id || billToEdit.bill_lines?.[0]?.account_id,
                amount: billToEdit.subtotal || billToEdit.bill_lines?.[0]?.amount,
                vat_amount: billToEdit.total_vat_amount || billToEdit.total_vat,
                notes: billToEdit.notes,
                description: billToEdit.bill_lines?.[0]?.description,
                currency: billToEdit.currency || functionalCurrency?.code || "KES",
            });
        }
    }, [open, billToEdit, form, functionalCurrency]);

    // ── VAT ───────────────────────────────────────────────────────────────────
    const vatConfig = getVATConfigSync();
    const vatEnabled = vatConfig.is_vat_enabled;
    const standardVatRate = vatConfig.vat_standard_rate;
    const amountValue = Form.useWatch("amount", form);
    const vatValue = Form.useWatch("vat_amount", form);

    useEffect(() => {
        if (open && !isEdit && vatEnabled && amountValue && amountValue > 0) {
            form.setFieldsValue({ vat_amount: calculateVAT(amountValue, vatConfig).vat_amount });
        }
    }, [open, isEdit, vatEnabled, amountValue, vatConfig, form]);

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts"],
        queryFn: () => getAllAccounts({ shop_id: shopId }),
        enabled: open,
    });
    const allAccounts = accountsData?.accounts || [];
    const expenseAccountOptions = allAccounts
        .filter((a: any) => a.account_type === "EXPENSE" && a.is_active)
        .map((a: any) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));

    const { data: suppliersData, isFetching: suppliersFetching } = useQuery({
        queryKey: ["suppliers-dropdown-bill", supplierSearch],
        queryFn: () => fetchAllSuppliers({ name: supplierSearch }),
        enabled: open,
        select: (res: any) => Array.isArray(res) ? res : (res?.suppliers || res?.data || []),
        staleTime: 30_000,
    });
    const supplierOptions = (suppliersData || []).map((s: any) => ({
        label: `${s.name}${s.phone ? ` — ${s.phone}` : ""}`,
        value: s._id,
    }));
    // Keep the edited bill's supplier visible even if the search list doesn't include it
    if (billToEdit?.supplier_id?._id && !supplierOptions.some((o: any) => o.value === billToEdit.supplier_id._id)) {
        supplierOptions.unshift({ label: billToEdit.supplier_id.name, value: billToEdit.supplier_id._id });
    }

    const labelOf = (opts: { label: string; value: string }[], id?: string) =>
        opts.find((o) => o.value === id)?.label;

    const addButton = (label: string, onAdd: () => void) => (
        <>
            <Divider style={{ margin: "4px 0" }} />
            <Button
                type="link" icon={<PlusOutlined />}
                style={{ width: "100%", textAlign: "left", padding: "4px 8px" }}
                onMouseDown={(e) => { e.preventDefault(); onAdd(); }}
            >
                {label}
            </Button>
        </>
    );

    // ── Mutations ─────────────────────────────────────────────────────────────
    const afterSave = (res: any) => {
        if (res?.warning) message.warning(res.warning);
        form.resetFields();
        setSupplierSearch("");
        queryClient.invalidateQueries({ queryKey: ["bills-dropdown-bill"] });
        queryClient.invalidateQueries({ queryKey: ["bills"] });
        onSuccess?.();
        onClose();
    };

    const createMutation = useMutation({
        mutationFn: createBill,
        onSuccess: afterSave,
        onError: (err: any) => message.error(err?.response?.data?.message || "Failed to create bill"),
    });
    const updateMutation = useMutation({
        mutationFn: (data: any) => updateBill(billToEdit!._id, data),
        onSuccess: afterSave,
        onError: (err: any) => message.error(err?.response?.data?.message || "Failed to update bill"),
    });
    const saving = createMutation.isPending || updateMutation.isPending;

    // ── Step navigation ───────────────────────────────────────────────────────
    const STEP_FIELDS = [
        ["supplier_id", "description", "issue_date", "due_date"],
        ["expense_account_id", "currency", "amount"],
    ];

    const next = async () => {
        try {
            await form.validateFields(STEP_FIELDS[step]);
            setStep((s) => s + 1);
        } catch { /* field errors are shown inline */ }
    };

    const handleSubmit = async () => {
        let v: any;
        try {
            v = await form.validateFields();
        } catch (e: any) {
            // Jump back to the first step with an error
            const bad = e?.errorFields?.[0]?.name?.[0];
            const idx = STEP_FIELDS.findIndex((f) => f.includes(bad));
            if (idx >= 0) setStep(idx);
            return;
        }
        const netAmount = v.amount as number;
        const vatAmount = (v.vat_amount as number) || 0;

        if (isEdit) {
            updateMutation.mutate({
                bill_date: v.issue_date?.toISOString(),
                due_date: v.due_date?.toISOString(),
                supplier_ref: v.supplier_id,
                notes: v.notes || undefined,
                currency: v.currency,
            });
        } else {
            createMutation.mutate({
                supplier_id: v.supplier_id,
                bill_date: v.issue_date?.toISOString(),
                due_date: v.due_date?.toISOString(),
                bill_lines: [
                    {
                        account_id: v.expense_account_id,
                        description: v.description,
                        quantity: 1,
                        unit_price: netAmount,
                        amount: netAmount,
                        vat_rate: vatAmount > 0 ? parseFloat((vatAmount / netAmount).toFixed(4)) : 0,
                        vat_amount: vatAmount,
                        vat_inclusive: false,
                    },
                ],
                notes: v.notes || undefined,
                // Bills are deferred — Pending until paid via Record Payment
                status: "Pending",
                currency: v.currency || functionalCurrency?.code || "KES",
            });
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setSupplierSearch("");
        onClose();
    };

    const isLast = step === STEPS.length - 1;
    const show = (s: number) => ({ display: step === s ? "block" : "none" });
    const reviewValues = form.getFieldsValue(true);

    const footer = [
        <Button key="cancel" onClick={handleCancel}>Cancel</Button>,
        step > 0 && <Button key="back" onClick={() => setStep((s) => s - 1)}>Back</Button>,
        isLast ? (
            <Button
                key="submit" type="primary" loading={saving} onClick={handleSubmit}
                style={{ background: ACCENT, borderColor: ACCENT }}
            >
                {isEdit ? "Update Bill" : "Create Bill"}
            </Button>
        ) : (
            <Button key="next" type="primary" onClick={next}>Next</Button>
        ),
    ];

    return (
        <>
            <StepperModal
                open={open}
                onCancel={handleCancel}
                icon={<FileTextOutlined />}
                accent={ACCENT}
                title={isEdit ? `Edit Supplier Bill — ${billToEdit.bill_no || ""}` : "Create Supplier Bill"}
                steps={STEPS}
                current={step}
                onStepClick={setStep}
                footer={footer}
                width={860}
            >
                <Form form={form} layout="vertical" initialValues={{ issue_date: dayjs() }}>
                    {/* ── Step 1: Supplier ─────────────────────────────────── */}
                    <div style={show(0)}>
                        <Alert
                            type="info" showIcon
                            message="Supplier bill stays Pending — use Record Payment on the Bills list when you pay."
                            style={{ marginBottom: 16 }}
                        />
                        <Form.Item name="supplier_id" label="Supplier" rules={[{ required: true, message: "Supplier is required" }]}>
                            <Select
                                showSearch allowClear placeholder="Search supplier..."
                                filterOption={false} onSearch={setSupplierSearch}
                                loading={suppliersFetching} options={supplierOptions}
                                notFoundContent={suppliersFetching ? "Searching..." : "No suppliers found"}
                                dropdownRender={(menu) => (
                                    <>{menu}{addButton("Add New Supplier", () => setAddSupplierOpen(true))}</>
                                )}
                            />
                        </Form.Item>
                        <Form.Item name="description" label="Description / Item" rules={[{ required: true }]}>
                            <Input placeholder="e.g. Office supplies — February 2025" disabled={isEdit} />
                        </Form.Item>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="issue_date" label="Bill Date" rules={[{ required: true }]}>
                                    <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="due_date" label="Due Date">
                                    <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    {/* ── Step 2: Amount ───────────────────────────────────── */}
                    <div style={show(1)}>
                        {isEdit && (
                            <Alert
                                type="warning" showIcon style={{ marginBottom: 16 }}
                                message="Amounts and account can't be changed on an existing bill — void it and create a new one instead."
                            />
                        )}
                        <Form.Item
                            name="expense_account_id" label="Expense Account (DR)" rules={[{ required: true }]}
                            tooltip="Which expense category does this bill fall under?"
                        >
                            <Select
                                showSearch placeholder="e.g. Rent, Utilities, COGS"
                                options={expenseAccountOptions} optionFilterProp="label" disabled={isEdit}
                                dropdownRender={(menu) => (
                                    <>{menu}{addButton("Add Expense Account", () => setAddAccountOpen(true))}</>
                                )}
                            />
                        </Form.Item>
                        <Form.Item
                            name="currency" label="Currency" rules={[{ required: true }]}
                            initialValue={functionalCurrency?.code || "KES"}
                        >
                            <CurrencySelector placeholder="Select currency" />
                        </Form.Item>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name="amount" label="Net Amount"
                                    rules={[{ required: true }, { type: "number", min: 0.01 }]}
                                >
                                    <InputNumber
                                        style={{ width: "100%" }} min={0.01} precision={2}
                                        placeholder="0.00" formatter={numFormatter} parser={numParser}
                                        disabled={isEdit}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="vat_amount" label={`VAT Amount (${(standardVatRate * 100).toFixed(0)}% - Auto-calculated)`}>
                                    <InputNumber
                                        style={{ width: "100%" }} min={0} precision={2}
                                        placeholder="0.00" formatter={numFormatter} parser={numParser}
                                        readOnly disabled
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    {/* ── Step 3: Review ───────────────────────────────────── */}
                    <div style={show(2)}>
                        <Form.Item name="notes" label="Notes">
                            <TextArea rows={2} placeholder="Any additional notes about this bill" />
                        </Form.Item>
                        {step === 2 && (
                            <>
                                <Divider orientation="left" plain style={{ fontSize: 12, margin: "4px 0 12px" }}>Summary</Divider>
                                <Descriptions size="small" column={2} bordered>
                                    <Descriptions.Item label="Supplier" span={2}>
                                        {labelOf(supplierOptions, reviewValues.supplier_id) || "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Description" span={2}>{reviewValues.description || "—"}</Descriptions.Item>
                                    <Descriptions.Item label="Bill Date">
                                        {reviewValues.issue_date ? dayjs(reviewValues.issue_date).format("DD MMM YYYY") : "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Due Date">
                                        {reviewValues.due_date ? dayjs(reviewValues.due_date).format("DD MMM YYYY") : "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Account (DR)" span={2}>
                                        {labelOf(expenseAccountOptions, reviewValues.expense_account_id) || "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Net">{fmt2(amountValue)}</Descriptions.Item>
                                    <Descriptions.Item label="VAT">{fmt2(vatValue)}</Descriptions.Item>
                                    <Descriptions.Item label="Total payable" span={2}>
                                        <Text strong style={{ color: ACCENT }}>
                                            {reviewValues.currency || "KES"} {fmt2((Number(amountValue) || 0) + (Number(vatValue) || 0))}
                                        </Text>
                                    </Descriptions.Item>
                                </Descriptions>
                            </>
                        )}
                    </div>
                </Form>
            </StepperModal>

            <AddProSupplierModal
                externalOpen={addSupplierOpen}
                onExternalClose={() => {
                    setAddSupplierOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["suppliers-dropdown-bill"] });
                }}
            />
            <AccountFormDrawer
                open={addAccountOpen}
                onClose={() => setAddAccountOpen(false)}
                onSuccess={() => {
                    setAddAccountOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
                }}
                accounts={allAccounts}
                shopId={shopId}
            />
        </>
    );
};

export default BillFormModal;
