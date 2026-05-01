import React, { useEffect, useState } from "react";
import {
    ProForm,
    ProFormText,
    ProFormSelect,
    ProFormTextArea,
    ProFormSwitch,
} from "@ant-design/pro-components";
import { Drawer, Divider, Typography, Switch, Space, AutoComplete } from "antd";
import {
    ChartOfAccount,
    AccountType,
    CreateAccountParams,
    UpdateAccountParams,
    createAccount,
    updateAccount,
    updateOpeningBalance,
} from "@services/accounting/accounts";

const { Text } = Typography;

/** Must exactly match the schema enum in charts-of-accounts.js */
const ACCOUNT_SUBTYPES: Record<AccountType, string[]> = {
    ASSET: [
        "Cash & Bank",
        "Accounts Receivable",
        "Inventory",
        "Prepaid Expenses",
        "Fixed Assets",
        "Accumulated Depreciation",
        "Other Asset",
    ],
    LIABILITY: [
        "Accounts Payable",
        "Accrued Liabilities",
        "Taxes Payable",
        "Short-term Loan",
        "Long-term Loan",
        "Other Liability",
    ],
    EQUITY: [
        "Owner's Equity",
        "Retained Earnings",
        "Share Capital",
        "Other Equity",
    ],
    REVENUE: [
        "Sales Revenue",
        "Service Revenue",
        "Subscription Revenue",
        "Other Revenue",
    ],
    EXPENSE: [
        "Cost of Goods Sold",
        "Operating Expense",
        "Payroll Expense",
        "Rent & Utilities",
        "Depreciation",
        "Tax Expense",
        "Other Expense",
    ],
};

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingAccount?: ChartOfAccount | null;
    accounts: ChartOfAccount[];
    shopId: string;
}

const AccountFormDrawer: React.FC<Props> = ({
    open,
    onClose,
    onSuccess,
    editingAccount,
    accounts,
    shopId,
}) => {
    const [form] = ProForm.useForm();
    const isEdit = !!editingAccount;
    const [autoCode, setAutoCode] = useState(true);

    const selectedType: AccountType = ProForm.useWatch("account_type", form);
    const selectedParentId: string = ProForm.useWatch("parent_account_id", form);
    const isBankAccount: boolean = ProForm.useWatch("is_bank_account", form);

    // ── Populate form on open ──────────────────────────────────────────────────
    useEffect(() => {
        if (open && editingAccount) {
            setAutoCode(false);
            form.setFieldsValue({
                account_code: editingAccount.account_code,
                account_name: editingAccount.account_name,
                account_type: editingAccount.account_type,
                account_subtype: editingAccount.account_subtype,
                description: editingAccount.description,
                parent_account_id:
                    typeof editingAccount.parent_account_id === "object"
                        ? (editingAccount.parent_account_id as ChartOfAccount)?._id
                        : editingAccount.parent_account_id,
                is_parent: editingAccount.is_parent,
                is_bank_account: editingAccount.is_bank_account,
                allows_direct_posting: editingAccount.allows_direct_posting,
                opening_balance: editingAccount.opening_balance,
                opening_balance_date: editingAccount.opening_balance_date ?? undefined,
                bank_name: editingAccount.bank_details?.bank_name,
                account_number: editingAccount.bank_details?.account_number,
                branch: editingAccount.bank_details?.branch,
            });
        } else if (open && !editingAccount) {
            setAutoCode(true);
            form.resetFields();
        }
    }, [open, editingAccount, form]);

    // ── Auto-suggest next AVAILABLE account code ───────────────────────────────
    useEffect(() => {
        if (!autoCode || !selectedParentId) return;
        const parent = accounts.find((a) => a._id === selectedParentId);
        if (!parent) return;

        // All codes that exist in this shop — used for collision checking
        const allCodes = new Set(
            accounts.map((a) => parseInt(a.account_code)).filter(Boolean)
        );

        // Highest sibling code (accounts that share the same parent)
        const siblingCodes = accounts
            .filter((a) => {
                const pid =
                    typeof a.parent_account_id === "object"
                        ? (a.parent_account_id as ChartOfAccount)?._id
                        : a.parent_account_id;
                return String(pid) === String(selectedParentId);
            })
            .map((a) => parseInt(a.account_code))
            .filter(Boolean)
            .sort((a, b) => b - a);

        const baseCode = parseInt(parent.account_code);
        // Start one step above the highest sibling, or parent + 10 if no siblings yet
        let candidate = siblingCodes.length > 0 ? siblingCodes[0] + 10 : baseCode + 10;

        // Keep stepping by 10 until we find a code not already in use
        while (allCodes.has(candidate)) {
            candidate += 10;
        }

        form.setFieldValue("account_code", String(candidate));
    }, [selectedParentId, autoCode, accounts, form]);

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async (values: any) => {
        const {
            opening_balance,
            opening_balance_date,
            bank_name,
            account_number,
            branch,
            ...rest
        } = values;

        const parent = accounts.find((a) => a._id === rest.parent_account_id);
        const level = parent ? (parent.level || 1) + 1 : 1;

        const payload: CreateAccountParams | UpdateAccountParams = {
            ...rest,
            shop_id: shopId,
            level,
            bank_details:
                bank_name || account_number || branch
                    ? { bank_name, account_number, branch }
                    : undefined,
            opening_balance,
            opening_balance_date,
        };

        if (isEdit && editingAccount) {
            await updateAccount(editingAccount._id, payload as UpdateAccountParams);
            if (
                opening_balance !== undefined &&
                opening_balance !== editingAccount.opening_balance
            ) {
                await updateOpeningBalance(
                    editingAccount._id,
                    opening_balance,
                    opening_balance_date
                );
            }
        } else {
            await createAccount(payload as CreateAccountParams);
        }

        onSuccess();
        onClose();
    };

    // ── Derived options ────────────────────────────────────────────────────────
    const parentOptions = accounts
        .filter(
            (a) =>
                a.is_parent &&
                a._id !== editingAccount?._id &&
                (!selectedType || a.account_type === selectedType)
        )
        .map((a) => ({
            label: `${a.account_code} — ${a.account_name}`,
            value: a._id,
        }));

    // Never disabled — options are empty when no type is selected, that's fine
    const subtypeOptions = (ACCOUNT_SUBTYPES[selectedType] || []).map((s) => ({
        label: s,
        value: s,
    }));

    const selectedParent = accounts.find((a) => a._id === selectedParentId);

    return (
        <Drawer
            title={
                isEdit
                    ? `Edit Account — ${editingAccount?.account_code}`
                    : "Create New Account"
            }
            open={open}
            onClose={onClose}
            width={560}
            destroyOnClose
            footer={null}
        >
            <ProForm
                form={form}
                onFinish={handleSubmit}
                submitter={{
                    searchConfig: {
                        submitText: isEdit ? "Save Changes" : "Create Account",
                        resetText: "Cancel",
                    },
                    onReset: onClose,
                    submitButtonProps: { block: false },
                    resetButtonProps: { block: false },
                }}
                layout="vertical"
            >
                {/* ── Account Type ── */}
                <ProFormSelect
                    name="account_type"
                    label="Account Type"
                    options={["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map(
                        (t) => ({ label: t, value: t })
                    )}
                    disabled={isEdit && editingAccount?.is_system_account}
                    rules={[{ required: true, message: "Account type is required" }]}
                    onChange={() => {
                        form.setFieldValue("account_subtype", undefined);
                        form.setFieldValue("parent_account_id", undefined);
                    }}
                />

                {/* ── Parent Account ── */}
                <ProFormSelect
                    name="parent_account_id"
                    label="Parent Account"
                    options={parentOptions}
                    placeholder="Optional — leave blank for top-level"
                    allowClear
                    showSearch
                    fieldProps={{ optionFilterProp: "label" }}
                />

                {/* Indentation preview */}
                {selectedParent && (
                    <div
                        style={{
                            marginTop: -12,
                            marginBottom: 16,
                            borderLeft: "3px solid #1890ff",
                            background: "#f0f5ff",
                            borderRadius: "0 4px 4px 0",
                            padding: "6px 10px 6px 12px",
                        }}
                    >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Will appear under:{" "}
                            <Text strong style={{ fontSize: 12 }}>
                                {"—".repeat(Math.max(0, (selectedParent.level || 1) - 1))}{" "}
                                {selectedParent.account_name}
                            </Text>
                        </Text>
                    </div>
                )}

                {/* ── Account Code with Auto/Manual toggle ── */}
                <ProForm.Item
                    label={
                        <Space>
                            <span>Account Code</span>
                            <Switch
                                size="small"
                                checked={autoCode}
                                onChange={(v) => {
                                    setAutoCode(v);
                                    if (v) form.setFieldValue("account_code", undefined);
                                }}
                                checkedChildren="Auto"
                                unCheckedChildren="Manual"
                            />
                        </Space>
                    }
                    name="account_code"
                    rules={[]}
                >
                    <AutoComplete
                        placeholder={
                            autoCode
                                ? "Auto-suggested — pick a parent first"
                                : "Optional — e.g. 1150"
                        }
                        disabled={isEdit && editingAccount?.is_system_account}
                        options={
                            autoCode && form.getFieldValue("account_code")
                                ? [{ value: form.getFieldValue("account_code") }]
                                : []
                        }
                        style={{ width: "100%" }}
                    />
                </ProForm.Item>

                {/* ── Account Name ── */}
                <ProFormText
                    name="account_name"
                    label="Account Name"
                    placeholder="e.g. Cash at Bank"
                    rules={[{ required: true, message: "Account name is required" }]}
                />

                {/* ── Account Subtype — never disabled ── */}
                <ProFormSelect
                    name="account_subtype"
                    label="Account Subtype"
                    options={subtypeOptions}
                    placeholder={
                        selectedType
                            ? `Select ${selectedType.toLowerCase()} subtype`
                            : "Select account type first to see options"
                    }
                    disabled={!selectedType}
                    allowClear
                    fieldProps={{ showSearch: true, optionFilterProp: "label" }}
                />

                {/* ── Description ── */}
                <ProFormTextArea
                    name="description"
                    label="Description"
                    placeholder="Optional description"
                    fieldProps={{ rows: 2 }}
                />

                {/* ── Flags ── */}
                <Divider orientation="left" plain>
                    <Text type="secondary" style={{ fontSize: 12 }}>Settings</Text>
                </Divider>

                <ProFormSwitch name="is_parent" label="Is Parent / Header Account" />
                <ProFormSwitch name="is_bank_account" label="Is Bank / Cash Account" />

                {/* ── Bank Details (conditional) ── */}
                {isBankAccount && (
                    <>
                        <Divider orientation="left" plain>
                            <Text type="secondary" style={{ fontSize: 12 }}>Bank Details</Text>
                        </Divider>
                        <ProFormText name="bank_name" label="Bank Name" placeholder="e.g. KCB" />
                        <ProFormText
                            name="account_number"
                            label="Account Number"
                            placeholder="e.g. 1234567890"
                        />
                        <ProFormText name="branch" label="Branch" placeholder="e.g. Nairobi CBD" />
                    </>
                )}
            </ProForm>
        </Drawer>
    );
};

export default AccountFormDrawer;