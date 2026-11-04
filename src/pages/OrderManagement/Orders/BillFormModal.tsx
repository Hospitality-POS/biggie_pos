import React, { useState, useEffect } from "react";
import {
    Form, Input, InputNumber, Select, DatePicker,
    Button, App, Row, Col, Alert, Divider, Descriptions, Typography, Checkbox,
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
import ProjectSelect from "@components/accounting/ProjectSelect";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text } = Typography;

const ACCENT = "#8b5cf6";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    billToEdit?: any;
    // Pre-fill a NEW bill from this one (Clone) — saved with createBill
    billToClone?: any;
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

const BillFormModal: React.FC<Props> = ({ open, onClose, onSuccess, billToEdit, billToClone }) => {
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
                vat_exempt: !!billToEdit.vat_exempt,
                notes: billToEdit.notes,
                project_id: billToEdit.project_id?._id || billToEdit.project_id || undefined,
                description: billToEdit.bill_lines?.[0]?.description,
                currency: billToEdit.currency || functionalCurrency?.code || "KES",
            });
        }
    }, [open, billToEdit, form, functionalCurrency]);

    // ── Clone: same supplier, account, amount and notes; dated today with the
    // original's payment term (bill date → due date gap). VAT is recomputed.
    const isClone = !isEdit && !!billToClone;
    useEffect(() => {
        if (!open || !isClone) return;
        const src = billToClone;
        const termDays = src.bill_date && src.due_date
            ? Math.max(0, dayjs(src.due_date).startOf("day").diff(dayjs(src.bill_date).startOf("day"), "day"))
            : null;
        form.setFieldsValue({
            supplier_id: src.supplier_id?._id || src.supplier_id,
            issue_date: dayjs(),
            due_date: termDays !== null ? dayjs().add(termDays, "day") : null,
            expense_account_id: src.bill_lines?.[0]?.account_id?._id || src.bill_lines?.[0]?.account_id,
            amount: src.subtotal || src.bill_lines?.[0]?.amount,
            vat_exempt: !!src.vat_exempt,
            notes: src.notes,
            description: src.bill_lines?.[0]?.description,
            currency: src.currency || functionalCurrency?.code || "KES",
        });
    }, [open, isClone, billToClone, form, functionalCurrency]);

    // ── VAT ───────────────────────────────────────────────────────────────────
    const vatConfig = getVATConfigSync();
    const vatEnabled = vatConfig.is_vat_enabled;
    const standardVatRate = vatConfig.vat_standard_rate;
    const amountValue = Form.useWatch("amount", form);
    const vatValue = Form.useWatch("vat_amount", form);
    const vatExempt = !!Form.useWatch("vat_exempt", form);
    const originalExempt = !!billToEdit?.vat_exempt;
    // On edit, the exemption is the only amount-related change allowed
    const exemptChanged = isEdit && vatExempt !== originalExempt;

    // The entered amount is the NET (VAT-exclusive) amount and the bill line is
    // saved with vat_inclusive: false — so VAT always goes on top of it, whatever
    // the tenant's POS pricing mode is, rounded to the cent. Exempt → no VAT.
    // On edit the saved VAT is kept unless the exemption is toggled.
    useEffect(() => {
        if (!open) return;
        if (vatExempt) {
            form.setFieldsValue({ vat_amount: 0 });
        } else if (vatEnabled && amountValue && amountValue > 0 && (!isEdit || exemptChanged || originalExempt)) {
            const { vat_amount } = calculateVAT(amountValue, { ...vatConfig, vat_pricing_mode: "EXCLUSIVE" });
            form.setFieldsValue({ vat_amount: Math.round(vat_amount * 100) / 100 });
        } else if (isEdit && !exemptChanged) {
            form.setFieldsValue({ vat_amount: billToEdit?.total_vat_amount || billToEdit?.total_vat || 0 });
        }
    }, [open, isEdit, vatEnabled, amountValue, vatConfig, form, vatExempt, exemptChanged, originalExempt, billToEdit]);

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
    // Keep the edited / cloned bill's supplier visible even if the search list doesn't include it
    const sourceSupplier = (billToEdit || billToClone)?.supplier_id;
    if (sourceSupplier?._id && !supplierOptions.some((o: any) => o.value === sourceSupplier._id)) {
        supplierOptions.unshift({ label: sourceSupplier.name, value: sourceSupplier._id });
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
        const vatAmount = v.vat_exempt ? 0 : (v.vat_amount as number) || 0;

        if (isEdit) {
            updateMutation.mutate({
                bill_date: v.issue_date?.toISOString(),
                due_date: v.due_date?.toISOString(),
                notes: v.notes || undefined,
                currency: v.currency,
                // Toggling the exemption recalculates the bill and reposts its JE
                ...(exemptChanged ? { vat_exempt: !!v.vat_exempt, vat_rate: standardVatRate } : {}),
                project_id: v.project_id || null,
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
                vat_exempt: !!v.vat_exempt,
                project_id: v.project_id || null,
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
                title={
                    isEdit
                        ? `Edit Supplier Bill — ${billToEdit.bill_no || ""}`
                        : isClone
                            ? `Clone Supplier Bill — from ${billToClone.bill_no || ""}`
                            : "Create Supplier Bill"
                }
                steps={STEPS}
                current={step}
                onStepClick={setStep}
                footer={footer}
                width={860}
            >
                <Form form={form} layout="vertical" initialValues={{ issue_date: dayjs() }}>
                    {/* ── Step 1: Supplier ─────────────────────────────────── */}
                    <div style={show(0)}>
                        {isClone ? (
                            <Alert
                                type="success" showIcon
                                message={`Cloned from ${billToClone.bill_no || "an existing bill"}`}
                                description="Everything is copied and dated today — change anything you need, then create. The original bill is not changed."
                                style={{ marginBottom: 16 }}
                            />
                        ) : (
                            <Alert
                                type="info" showIcon
                                message="Supplier bill stays Pending — use Record Payment on the Bills list when you pay."
                                style={{ marginBottom: 16 }}
                            />
                        )}
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
                        <Form.Item name="project_id" label="Project (optional)" tooltip="Optional — tag this bill to a project so it shows in that project's Profit & Loss">
                            <ProjectSelect placeholder="No project" />
                        </Form.Item>
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
                                <Form.Item
                                    name="vat_amount"
                                    label={vatExempt ? "VAT Amount (exempt)" : `VAT Amount (${(standardVatRate * 100).toFixed(0)}% - Auto-calculated)`}
                                >
                                    <InputNumber
                                        style={{ width: "100%" }} min={0} precision={2}
                                        placeholder="0.00" formatter={numFormatter} parser={numParser}
                                        readOnly disabled
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item
                            name="vat_exempt"
                            valuePropName="checked"
                            initialValue={false}
                            style={{ marginBottom: 8 }}
                            extra={
                                isEdit
                                    ? "Changing this recalculates the bill total and reposts its journal entry."
                                    : "For suppliers whose goods or services carry no VAT — no VAT Input is claimed."
                            }
                        >
                            <Checkbox>VAT exempt — no VAT on this bill</Checkbox>
                        </Form.Item>
                        {exemptChanged && (
                            <Alert
                                type="warning" showIcon style={{ marginBottom: 8 }}
                                message={
                                    vatExempt
                                        ? `VAT will be removed: new total ${fmt2(Number(amountValue) || 0)}`
                                        : `VAT will be added at ${(standardVatRate * 100).toFixed(0)}%: new total ${fmt2((Number(amountValue) || 0) + (Number(vatValue) || 0))}`
                                }
                            />
                        )}
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
                                    <Descriptions.Item label="VAT">{vatExempt ? "Exempt" : fmt2(vatValue)}</Descriptions.Item>
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
