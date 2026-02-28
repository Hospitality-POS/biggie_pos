import React, { useEffect } from "react";
import {
    ProForm,
    ProFormText,
    ProFormSelect,
    ProFormTextArea,
    ProFormSwitch,
    ProFormDigit,
    ProFormDatePicker,
} from "@ant-design/pro-components";
import { Drawer, Divider, Typography } from "antd";
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

const ACCOUNT_SUBTYPES: Record<AccountType, string[]> = {
    ASSET: ["Current Asset", "Fixed Asset", "Bank", "Cash", "Receivable", "Inventory", "Other Asset"],
    LIABILITY: ["Current Liability", "Long-term Liability", "Payable", "Tax Payable", "Other Liability"],
    EQUITY: ["Owner Equity", "Retained Earnings", "Capital", "Other Equity"],
    REVENUE: ["Operating Revenue", "Other Revenue", "Interest Income"],
    EXPENSE: ["Cost of Goods Sold", "Operating Expense", "Payroll", "Depreciation", "Other Expense"],
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

    // Watch account_type to update subtype options dynamically
    const selectedType: AccountType = ProForm.useWatch("account_type", form);

    useEffect(() => {
        if (open && editingAccount) {
            form.setFieldsValue({
                account_code: editingAccount.account_code,
                account_name: editingAccount.account_name,
                account_type: editingAccount.account_type,
                account_subtype: editingAccount.account_subtype,
                description: editingAccount.description,
                parent_account_id: typeof editingAccount.parent_account_id === "object"
                    ? (editingAccount.parent_account_id as ChartOfAccount)?._id
                    : editingAccount.parent_account_id,
                is_parent: editingAccount.is_parent,
                is_bank_account: editingAccount.is_bank_account,
                allows_direct_posting: editingAccount.allows_direct_posting,
                opening_balance: editingAccount.opening_balance,
                opening_balance_date: editingAccount.opening_balance_date
                    ? editingAccount.opening_balance_date
                    : undefined,
                bank_name: editingAccount.bank_details?.bank_name,
                account_number: editingAccount.bank_details?.account_number,
                branch: editingAccount.bank_details?.branch,
            });
        } else if (open && !editingAccount) {
            form.resetFields();
        }
    }, [open, editingAccount, form]);

    const handleSubmit = async (values: any) => {
        const {
            opening_balance,
            opening_balance_date,
            bank_name,
            account_number,
            branch,
            ...rest
        } = values;

        const payload: CreateAccountParams | UpdateAccountParams = {
            ...rest,
            shop_id: shopId,
            bank_details: (bank_name || account_number || branch)
                ? { bank_name, account_number, branch }
                : undefined,
            opening_balance,
            opening_balance_date,
        };

        if (isEdit && editingAccount) {
            await updateAccount(editingAccount._id, payload as UpdateAccountParams);

            // If opening balance changed, call the dedicated endpoint
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

    // Parent account options — exclude self and children
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

    const subtypeOptions = (ACCOUNT_SUBTYPES[selectedType] || []).map((s) => ({
        label: s,
        value: s,
    }));

    return (
        <Drawer
            title={isEdit ? `Edit Account — ${editingAccount?.account_code}` : "Create New Account"}
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
                {/* ── Identity ── */}
                <ProFormText
                    name="account_code"
                    label="Account Code"
                    placeholder="e.g. 1100"
                    disabled={isEdit && editingAccount?.is_system_account}
                    rules={[{ required: true, message: "Account code is required" }]}
                    fieldProps={{ maxLength: 20 }}
                />

                <ProFormText
                    name="account_name"
                    label="Account Name"
                    placeholder="e.g. Cash at Bank"
                    rules={[{ required: true, message: "Account name is required" }]}
                />

                <ProFormSelect
                    name="account_type"
                    label="Account Type"
                    options={["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map((t) => ({
                        label: t,
                        value: t,
                    }))}
                    disabled={isEdit && editingAccount?.is_system_account}
                    rules={[{ required: true, message: "Account type is required" }]}
                    onChange={() => {
                        form.setFieldValue("account_subtype", undefined);
                        form.setFieldValue("parent_account_id", undefined);
                    }}
                />

                <ProFormSelect
                    name="account_subtype"
                    label="Account Subtype"
                    options={subtypeOptions}
                    placeholder="Select subtype"
                    allowClear
                />

                <ProFormSelect
                    name="parent_account_id"
                    label="Parent Account"
                    options={parentOptions}
                    placeholder="Optional — leave blank for top-level"
                    allowClear
                    showSearch
                    fieldProps={{ optionFilterProp: "label" }}
                />

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

                <ProFormSwitch name="is_parent" label="Is Parent Account" />
                <ProFormSwitch name="is_bank_account" label="Is Bank / Cash Account" />
                <ProFormSwitch name="allows_direct_posting" label="Allow Direct Posting" initialValue={true} />

                {/* ── Opening Balance ── */}
                <Divider orientation="left" plain>
                    <Text type="secondary" style={{ fontSize: 12 }}>Opening Balance</Text>
                </Divider>

                <ProFormDigit
                    name="opening_balance"
                    label="Opening Balance"
                    placeholder="0.00"
                    fieldProps={{ precision: 2, prefix: "KES" }}
                    min={0}
                />

                <ProFormDatePicker
                    name="opening_balance_date"
                    label="Opening Balance Date"
                    fieldProps={{ style: { width: "100%" } }}
                />

                {/* ── Bank Details (shown when is_bank_account) ── */}
                <ProForm.Item
                    noStyle
                    shouldUpdate={(prev, curr) => prev.is_bank_account !== curr.is_bank_account}
                >
                    {({ getFieldValue }) =>
                        getFieldValue("is_bank_account") ? (
                            <>
                                <Divider orientation="left" plain>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Bank Details</Text>
                                </Divider>
                                <ProFormText name="bank_name" label="Bank Name" placeholder="e.g. KCB" />
                                <ProFormText name="account_number" label="Account Number" placeholder="e.g. 1234567890" />
                                <ProFormText name="branch" label="Branch" placeholder="e.g. Nairobi CBD" />
                            </>
                        ) : null
                    }
                </ProForm.Item>
            </ProForm>
        </Drawer>
    );
};

export default AccountFormDrawer;