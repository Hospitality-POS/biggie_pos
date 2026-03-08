import React, { useEffect, useState } from "react";
import {
    Button,
    DatePicker,
    Drawer,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Typography,
} from "antd";
import {
    DeleteOutlined,
    DollarOutlined,
    EditOutlined,
    MinusCircleOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { addWage, updateWage } from "@services/wages";
import { fetchAllUsersList } from "@services/users";
import dayjs from "dayjs";

const { Text } = Typography;
const { TextArea } = Input;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
};

const fmtK = (v: number) =>
    v.toLocaleString("en-KE", { minimumFractionDigits: 0 });

// ── Mobile detection ──────────────────────────────────────────────────────────
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return isMobile;
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface LineItem {
    key: number;
    name: string;
    amount: number;
    frequency: string;
}

interface WageFormProps {
    visible: boolean;
    onCancel: () => void;
    editingWage: any;
}

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Text
        style={{
            fontSize: 10,
            fontWeight: 700,
            color: C.subText,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            display: "block",
            marginBottom: 10,
        }}
    >
        {children}
    </Text>
);

// ── Form section card ─────────────────────────────────────────────────────────
const FormSection: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
    children,
    style,
}) => (
    <div
        style={{
            background: "#f8fafc",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "14px 14px 6px",
            marginBottom: 14,
            ...style,
        }}
    >
        {children}
    </div>
);

// ── Line item card ────────────────────────────────────────────────────────────
const LineItemCard: React.FC<{
    item: LineItem;
    type: "allowance" | "deduction";
    index: number;
    isMobile: boolean;
    onChange: (key: number, field: string, value: any) => void;
    onDelete: (key: number) => void;
}> = ({ item, type, index, isMobile, onChange, onDelete }) => {
    const accentColor = type === "allowance" ? C.green : C.red;
    const accentBg = type === "allowance" ? "#f0fdf4" : "#fef2f2";
    const accentBorder = type === "allowance" ? "#bbf7d0" : "#fca5a5";

    return (
        <div
            style={{
                background: "#fff",
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${accentColor}`,
                borderRadius: 9,
                padding: "10px 12px",
                marginBottom: 8,
            }}
        >
            {/* Card header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div
                        style={{
                            background: accentBg,
                            borderRadius: 6,
                            width: 22,
                            height: 22,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: accentColor,
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                        }}
                    >
                        {index + 1}
                    </div>
                    <Text style={{ fontSize: 11, color: C.subText, fontWeight: 600 }}>
                        {type === "allowance" ? "Allowance" : "Deduction"} #{index + 1}
                    </Text>
                </div>
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDelete(item.key)}
                    style={{ width: 28, height: 28, padding: 0, borderRadius: 6 }}
                />
            </div>

            {/* Fields — 3-col on desktop, stacked on mobile */}
            {isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                        <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            Name
                        </Text>
                        <Input
                            value={item.name}
                            onChange={(e) => onChange(item.key, "name", e.target.value)}
                            placeholder="e.g. Housing"
                            style={{ borderRadius: 7, height: 36, fontSize: 13 }}
                        />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                            <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                                Amount (KES)
                            </Text>
                            <InputNumber
                                value={item.amount}
                                onChange={(val) => onChange(item.key, "amount", val ?? 0)}
                                min={0}
                                style={{ width: "100%", borderRadius: 7 }}
                                controls={false}
                            />
                        </div>
                        <div>
                            <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                                Frequency
                            </Text>
                            <Select
                                value={item.frequency}
                                onChange={(val) => onChange(item.key, "frequency", val)}
                                style={{ width: "100%" }}
                                options={[
                                    { value: "daily", label: "Daily" },
                                    { value: "weekly", label: "Weekly" },
                                    { value: "monthly", label: "Monthly" },
                                    { value: "one-time", label: "One-time" },
                                ]}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                        <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            Name
                        </Text>
                        <Input
                            value={item.name}
                            onChange={(e) => onChange(item.key, "name", e.target.value)}
                            placeholder="e.g. Housing"
                            style={{ borderRadius: 7, height: 32, fontSize: 12 }}
                        />
                    </div>
                    <div>
                        <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            Amount (KES)
                        </Text>
                        <InputNumber
                            value={item.amount}
                            onChange={(val) => onChange(item.key, "amount", val ?? 0)}
                            min={0}
                            style={{ width: "100%", borderRadius: 7, height: 32 }}
                            controls={false}
                        />
                    </div>
                    <div>
                        <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            Frequency
                        </Text>
                        <Select
                            value={item.frequency}
                            onChange={(val) => onChange(item.key, "frequency", val)}
                            style={{ width: "100%", height: 32 }}
                            options={[
                                { value: "daily", label: "Daily" },
                                { value: "weekly", label: "Weekly" },
                                { value: "monthly", label: "Monthly" },
                                { value: "one-time", label: "One-time" },
                            ]}
                        />
                    </div>
                </div>
            )}

            {/* Amount pill */}
            {item.amount > 0 && (
                <div style={{ marginTop: 8, textAlign: "right" }}>
                    <span
                        style={{
                            background: accentBg,
                            border: `1px solid ${accentBorder}`,
                            borderRadius: 6,
                            padding: "2px 10px",
                            fontSize: 12,
                            fontWeight: 700,
                            color: accentColor,
                        }}
                    >
                        {type === "allowance" ? "+" : "−"} KES {fmtK(item.amount)}
                    </span>
                </div>
            )}
        </div>
    );
};

// ── Net summary ───────────────────────────────────────────────────────────────
const NetSummary: React.FC<{
    base: number;
    allowTotal: number;
    dedTotal: number;
    currency: string;
}> = ({ base, allowTotal, dedTotal, currency }) => {
    const net = base + allowTotal - dedTotal;
    return (
        <div
            style={{
                background: "#f8fafc",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 14,
            }}
        >
            <SectionLabel>Wage Summary</SectionLabel>
            {[
                { label: "Base Wage", value: `${currency} ${fmtK(base)}`, color: C.darkText },
                { label: "Total Allowances", value: `+ ${currency} ${fmtK(allowTotal)}`, color: C.green },
                { label: "Total Deductions", value: `− ${currency} ${fmtK(dedTotal)}`, color: C.red },
            ].map(({ label, value, color }) => (
                <div
                    key={label}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}
                >
                    <Text style={{ fontSize: 12, color: C.subText }}>{label}</Text>
                    <Text strong style={{ fontSize: 12, color }}>{value}</Text>
                </div>
            ))}
            <div
                style={{
                    borderTop: `2px solid ${C.border}`,
                    paddingTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <Text strong style={{ fontSize: 13, color: C.darkText }}>Net Wage</Text>
                <div style={{ background: C.primaryLight, borderRadius: 8, padding: "5px 16px" }}>
                    <Text strong style={{ fontSize: 16, color: C.primary }}>
                        {currency} {fmtK(net)}
                    </Text>
                </div>
            </div>
        </div>
    );
};

// ── Shared form body ──────────────────────────────────────────────────────────
const FormBody: React.FC<{
    form: any;
    isMobile: boolean;
    selectedShop: string | null;
    shops: any[];
    filteredUsers: any[];
    usersLoading: boolean;
    allowances: LineItem[];
    deductions: LineItem[];
    baseAmount: number;
    currency: string;
    onShopChange: (id: string) => void;
    onBaseAmountChange: (v: number) => void;
    onCurrencyChange: (v: string) => void;
    onAddLine: (type: "allowance" | "deduction") => void;
    onDeleteLine: (type: "allowance" | "deduction", key: number) => void;
    onChangeLine: (type: "allowance" | "deduction", key: number, field: string, value: any) => void;
}> = ({
    form, isMobile, selectedShop, shops, filteredUsers, usersLoading,
    allowances, deductions, baseAmount, currency,
    onShopChange, onBaseAmountChange, onCurrencyChange,
    onAddLine, onDeleteLine, onChangeLine,
}) => {
        const allowTotal = allowances.reduce((s, a) => s + (a.amount || 0), 0);
        const dedTotal = deductions.reduce((s, d) => s + (d.amount || 0), 0);
        // 2-col on desktop, 1-col on mobile
        const grid2 = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 } as React.CSSProperties;

        const fieldLabel = (label: string) => (
            <Text style={{ fontSize: 12, color: C.subText }}>{label}</Text>
        );

        return (
            <Form form={form} layout="vertical" requiredMark={false}>

                {/* ── Assignment ─────────────────────────────────────────────────────── */}
                <FormSection>
                    <SectionLabel>Assignment</SectionLabel>
                    <div style={grid2}>
                        <Form.Item
                            name="shop_id"
                            label={fieldLabel("Shop")}
                            rules={[{ required: true, message: "Select a shop" }]}
                            style={{ marginBottom: 10 }}
                        >
                            <Select
                                placeholder="Select shop first…"
                                showSearch
                                optionFilterProp="label"
                                onChange={onShopChange}
                                loading={usersLoading}
                                style={{ borderRadius: 8 }}
                                options={shops.map((s: any) => ({ value: s._id, label: s.name }))}
                            />
                        </Form.Item>

                        {selectedShop && (
                            <Form.Item
                                name="user_id"
                                label={fieldLabel("Employee")}
                                rules={[{ required: true, message: "Select an employee" }]}
                                style={{ marginBottom: 10 }}
                            >
                                <Select
                                    placeholder="Select employee…"
                                    showSearch
                                    optionFilterProp="label"
                                    loading={usersLoading}
                                    notFoundContent={filteredUsers.length === 0 ? "No employees in this shop" : null}
                                    style={{ borderRadius: 8 }}
                                    options={filteredUsers.map((u: any) => ({
                                        value: u._id,
                                        label: `${u.fullname} — ${u.email}`,
                                    }))}
                                />
                            </Form.Item>
                        )}
                    </div>
                </FormSection>

                {/* ── Wage configuration ─────────────────────────────────────────────── */}
                <FormSection>
                    <SectionLabel>Wage Configuration</SectionLabel>
                    <div style={grid2}>
                        <Form.Item
                            name="wageType"
                            label={fieldLabel("Wage Type")}
                            rules={[{ required: true, message: "Select wage type" }]}
                            style={{ marginBottom: 10 }}
                        >
                            <Select
                                placeholder="Select type"
                                style={{ borderRadius: 8 }}
                                options={[
                                    { value: "daily", label: "Daily" },
                                    { value: "weekly", label: "Weekly" },
                                    { value: "monthly", label: "Monthly" },
                                ]}
                            />
                        </Form.Item>

                        <Form.Item
                            name="paymentFrequency"
                            label={fieldLabel("Payment Frequency")}
                            rules={[{ required: true, message: "Select frequency" }]}
                            style={{ marginBottom: 10 }}
                        >
                            <Select
                                placeholder="Select frequency"
                                style={{ borderRadius: 8 }}
                                options={[
                                    { value: "daily", label: "Daily" },
                                    { value: "weekly", label: "Weekly" },
                                    { value: "bi-weekly", label: "Bi-weekly" },
                                    { value: "monthly", label: "Monthly" },
                                ]}
                            />
                        </Form.Item>

                        <Form.Item
                            name="baseAmount"
                            label={fieldLabel("Base Wage Amount")}
                            rules={[{ required: true, message: "Enter base amount" }]}
                            style={{ marginBottom: 10 }}
                        >
                            <InputNumber
                                min={0}
                                prefix="KES"
                                style={{ width: "100%", borderRadius: 8 }}
                                placeholder="0"
                                controls={false}
                                onChange={(v) => onBaseAmountChange(v ?? 0)}
                            />
                        </Form.Item>

                        <Form.Item
                            name="overtimeRate"
                            label={fieldLabel("Overtime Rate")}
                            style={{ marginBottom: 10 }}
                        >
                            <InputNumber
                                min={0}
                                prefix="KES"
                                style={{ width: "100%", borderRadius: 8 }}
                                placeholder="0 (optional)"
                                controls={false}
                            />
                        </Form.Item>

                        <Form.Item
                            name="effectiveDate"
                            label={fieldLabel("Effective Date")}
                            rules={[{ required: true, message: "Select date" }]}
                            style={{ marginBottom: 10 }}
                        >
                            <DatePicker style={{ width: "100%", borderRadius: 8 }} />
                        </Form.Item>

                        <Form.Item
                            name="currency"
                            label={fieldLabel("Currency")}
                            initialValue="KES"
                            style={{ marginBottom: 10 }}
                        >
                            <Select
                                style={{ borderRadius: 8 }}
                                onChange={onCurrencyChange}
                                options={[
                                    { value: "KES", label: "KES — Kenyan Shilling" },
                                    { value: "USD", label: "USD — US Dollar" },
                                    { value: "EUR", label: "EUR — Euro" },
                                    { value: "GBP", label: "GBP — British Pound" },
                                ]}
                            />
                        </Form.Item>
                    </div>
                </FormSection>

                {/* ── Allowances ─────────────────────────────────────────────────────── */}
                <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <SectionLabel>Allowances ({allowances.length})</SectionLabel>
                        <Button
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => onAddLine("allowance")}
                            style={{ borderRadius: 7, borderColor: C.green, color: C.green, fontSize: 12, height: 30 }}
                        >
                            Add
                        </Button>
                    </div>
                    {allowances.length > 0 ? (
                        allowances.map((item, i) => (
                            <LineItemCard
                                key={item.key}
                                item={item}
                                type="allowance"
                                index={i}
                                isMobile={isMobile}
                                onChange={(key, field, value) => onChangeLine("allowance", key, field, value)}
                                onDelete={(key) => onDeleteLine("allowance", key)}
                            />
                        ))
                    ) : (
                        <div style={{ background: "#f8fafc", border: `1px dashed ${C.border}`, borderRadius: 9, padding: "14px", textAlign: "center" }}>
                            <Text style={{ fontSize: 12, color: "#94a3b8" }}>No allowances added</Text>
                        </div>
                    )}
                </div>

                {/* ── Deductions ─────────────────────────────────────────────────────── */}
                <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <SectionLabel>Deductions ({deductions.length})</SectionLabel>
                        <Button
                            size="small"
                            icon={<MinusCircleOutlined />}
                            onClick={() => onAddLine("deduction")}
                            style={{ borderRadius: 7, borderColor: C.red, color: C.red, fontSize: 12, height: 30 }}
                        >
                            Add
                        </Button>
                    </div>
                    {deductions.length > 0 ? (
                        deductions.map((item, i) => (
                            <LineItemCard
                                key={item.key}
                                item={item}
                                type="deduction"
                                index={i}
                                isMobile={isMobile}
                                onChange={(key, field, value) => onChangeLine("deduction", key, field, value)}
                                onDelete={(key) => onDeleteLine("deduction", key)}
                            />
                        ))
                    ) : (
                        <div style={{ background: "#f8fafc", border: `1px dashed ${C.border}`, borderRadius: 9, padding: "14px", textAlign: "center" }}>
                            <Text style={{ fontSize: 12, color: "#94a3b8" }}>No deductions added</Text>
                        </div>
                    )}
                </div>

                {/* ── Live net summary ───────────────────────────────────────────────── */}
                <NetSummary base={baseAmount} allowTotal={allowTotal} dedTotal={dedTotal} currency={currency} />

                {/* ── Additional info ────────────────────────────────────────────────── */}
                <FormSection>
                    <SectionLabel>Additional Info</SectionLabel>
                    <Form.Item
                        name="notes"
                        label={fieldLabel("Notes")}
                        style={{ marginBottom: 10 }}
                    >
                        <TextArea rows={2} placeholder="Any additional notes…" style={{ borderRadius: 8, fontSize: 12 }} />
                    </Form.Item>
                    <Form.Item
                        name="isActive"
                        label={fieldLabel("Status")}
                        initialValue={true}
                        rules={[{ required: true, message: "Select status" }]}
                        style={{ marginBottom: 10 }}
                    >
                        <Select
                            style={{ borderRadius: 8 }}
                            options={[
                                { value: true, label: "Active" },
                                { value: false, label: "Inactive" },
                            ]}
                        />
                    </Form.Item>
                </FormSection>
            </Form>
        );
    };

// ── Modal / Drawer title ──────────────────────────────────────────────────────
const FormTitle: React.FC<{ editingWage: any }> = ({ editingWage }) => (
    <Space size={8}>
        <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
            {editingWage ? <EditOutlined /> : <DollarOutlined />}
        </div>
        <Text strong style={{ fontSize: 13, color: C.darkText }}>
            {editingWage ? "Edit Wage" : "New Wage"}
        </Text>
    </Space>
);

// ── Main component ────────────────────────────────────────────────────────────
const WageForm: React.FC<WageFormProps> = ({ visible, onCancel, editingWage }) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const isMobile = useIsMobile();

    const [allowances, setAllowances] = useState<LineItem[]>([]);
    const [deductions, setDeductions] = useState<LineItem[]>([]);
    const [selectedShop, setSelectedShop] = useState<string | null>(null);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [shops, setShops] = useState<any[]>([]);
    const [baseAmount, setBaseAmount] = useState(0);
    const [currency, setCurrency] = useState("KES");

    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ["users"],
        queryFn: fetchAllUsersList,
        enabled: visible,
    });

    const allUsers = usersData || [];

    useEffect(() => {
        if (allUsers.length > 0) {
            const uniqueShops = allUsers
                .filter((u: any) => u.shop_id)
                .reduce((acc: any[], u: any) => {
                    const id = u.shop_id?._id || u.shop_id;
                    const name = u.shop_id?.name || u.shop_id?.shopName || "Unknown Shop";
                    if (!acc.find((s) => s._id === id) && id) acc.push({ _id: id, name });
                    return acc;
                }, []);
            setShops(uniqueShops);
        }
    }, [allUsers]);

    const resetState = () => {
        setAllowances([]);
        setDeductions([]);
        setSelectedShop(null);
        setFilteredUsers([]);
        setBaseAmount(0);
        setCurrency("KES");
    };

    const onSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ["wages"] });
        form.resetFields();
        resetState();
        onCancel();
    };

    const addMutation = useMutation({ mutationFn: addWage, onSuccess });
    const editMutation = useMutation({ mutationFn: updateWage, onSuccess });

    useEffect(() => {
        if (!visible) return;
        if (editingWage) {
            const shopId = editingWage.shop_id?._id || editingWage.shop_id;
            const userId = editingWage.user_id?._id || editingWage.user_id;
            setSelectedShop(shopId);
            setFilteredUsers(allUsers.filter((u: any) => (u.shop_id?._id || u.shop_id) === shopId));
            setBaseAmount(editingWage.baseAmount || 0);
            setCurrency(editingWage.currency || "KES");
            form.setFieldsValue({
                shop_id: shopId,
                user_id: userId,
                wageType: editingWage.wageType,
                baseAmount: editingWage.baseAmount,
                currency: editingWage.currency,
                effectiveDate: editingWage.effectiveDate ? dayjs(editingWage.effectiveDate) : null,
                paymentFrequency: editingWage.paymentFrequency,
                overtimeRate: editingWage.overtimeRate,
                notes: editingWage.notes,
                isActive: editingWage.isActive,
            });
            setAllowances((editingWage.allowances || []).map((a: any, i: number) => ({ ...a, key: i })));
            setDeductions((editingWage.deductions || []).map((d: any, i: number) => ({ ...d, key: i })));
        } else {
            form.resetFields();
            form.setFieldsValue({ currency: "KES", effectiveDate: dayjs(), overtimeRate: 0, isActive: true });
            resetState();
        }
    }, [visible, editingWage]);

    const handleShopChange = (shopId: string) => {
        setSelectedShop(shopId);
        setFilteredUsers(allUsers.filter((u: any) => (u.shop_id?._id || u.shop_id) === shopId));
        form.setFieldsValue({ user_id: undefined });
    };

    const addLine = (type: "allowance" | "deduction") => {
        const item: LineItem = { key: Date.now(), name: "", amount: 0, frequency: "monthly" };
        if (type === "allowance") setAllowances((p) => [...p, item]);
        else setDeductions((p) => [...p, item]);
    };

    const deleteLine = (type: "allowance" | "deduction", key: number) => {
        if (type === "allowance") setAllowances((p) => p.filter((i) => i.key !== key));
        else setDeductions((p) => p.filter((i) => i.key !== key));
    };

    const changeLine = (type: "allowance" | "deduction", key: number, field: string, value: any) => {
        const upd = (prev: LineItem[]) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i));
        if (type === "allowance") setAllowances(upd);
        else setDeductions(upd);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                ...values,
                effectiveDate: values.effectiveDate ? values.effectiveDate.toISOString() : null,
                allowances: allowances.map(({ key, ...rest }) => rest),
                deductions: deductions.map(({ key, ...rest }) => rest),
            };
            if (editingWage) {
                await editMutation.mutateAsync({ _id: editingWage._id, value: payload });
            } else {
                await addMutation.mutateAsync(payload);
            }
        } catch {
            // validation errors shown inline by AntD
        }
    };

    const isLoading = addMutation.isPending || editMutation.isPending;

    const sharedBodyProps = {
        form,
        isMobile,
        selectedShop,
        shops,
        filteredUsers,
        usersLoading,
        allowances,
        deductions,
        baseAmount,
        currency,
        onShopChange: handleShopChange,
        onBaseAmountChange: setBaseAmount,
        onCurrencyChange: setCurrency,
        onAddLine: addLine,
        onDeleteLine: deleteLine,
        onChangeLine: changeLine,
    };

    // ── Mobile → bottom Drawer ────────────────────────────────────────────────
    if (isMobile) {
        return (
            <Drawer
                open={visible}
                onClose={onCancel}
                placement="bottom"
                height="92vh"
                destroyOnClose
                title={<FormTitle editingWage={editingWage} />}
                styles={{
                    body: {
                        padding: "14px 14px 100px", // bottom padding for pinned footer
                        overflowY: "auto",
                    },
                    footer: { padding: "12px 14px", borderTop: `1px solid ${C.border}`, background: "#fff" },
                }}
                footer={
                    <div style={{ display: "flex", gap: 10 }}>
                        <Button
                            block
                            onClick={onCancel}
                            disabled={isLoading}
                            style={{ borderRadius: 8, height: 44 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            block
                            type="primary"
                            onClick={handleSubmit}
                            loading={isLoading}
                            disabled={isLoading}
                            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 44, fontWeight: 600 }}
                        >
                            {editingWage ? "Update Wage" : "Create Wage"}
                        </Button>
                    </div>
                }
            >
                <FormBody {...sharedBodyProps} />
            </Drawer>
        );
    }

    // ── Desktop → Modal ───────────────────────────────────────────────────────
    return (
        <Modal
            open={visible}
            onCancel={onCancel}
            onOk={handleSubmit}
            confirmLoading={isLoading}
            width={860}
            centered
            destroyOnClose
            title={<FormTitle editingWage={editingWage} />}
            okText={editingWage ? "Update Wage" : "Create Wage"}
            okButtonProps={{
                disabled: isLoading,
                loading: isLoading,
                style: { background: C.primary, borderColor: C.primary, borderRadius: 7, fontWeight: 500 },
            }}
            cancelButtonProps={{ disabled: isLoading, style: { borderRadius: 7 } }}
            styles={{ body: { maxHeight: "76vh", overflowY: "auto", padding: "20px 20px 4px" } }}
        >
            <FormBody {...sharedBodyProps} />
        </Modal>
    );
};

export default WageForm;