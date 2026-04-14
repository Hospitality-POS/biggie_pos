import React, { useState } from 'react';
import {
    Modal,
    Form,
    Button,
    Space,
    Typography,
    Descriptions,
    message,
    Select,
    InputNumber,
    Divider,
    Tag,
    Avatar,
    Spin,
    Alert,
} from 'antd';
import {
    UserOutlined,
    CreditCardOutlined,
    DollarOutlined,
    CheckCircleOutlined,
    PhoneOutlined,
    MailOutlined,
    PlusOutlined,
    DeleteOutlined,
    SplitCellsOutlined,
} from '@ant-design/icons';
import { Package, purchaseSubscription } from '@services/subscription';
import { fetchAllCustomers } from '@services/customers';
import { fetchAllPaymentMethods } from '@services/paymentMethod';
import { useQuery } from '@tanstack/react-query';

const { Text, Title } = Typography;
const { Option } = Select;

interface PaymentLine {
    id: string;
    payment_method_id: string | null;
    amount: number;
}

interface PurchasePackageModalProps {
    visible: boolean;
    package: Package | null;
    onClose: () => void;
    onSuccess: () => void;
}

const C = {
    primary: '#6C1C2C',
    primaryLight: '#f9f0f2',
    green: '#10b981',
    border: '#e2e8f0',
    bg: '#f8fafc',
    subText: '#64748b',
};

const uid = () => Math.random().toString(36).slice(2, 9);

const PurchasePackageModal: React.FC<PurchasePackageModalProps> = ({
    visible,
    package: pkg,
    onClose,
    onSuccess,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
        { id: uid(), payment_method_id: null, amount: 0 },
    ]);

    // ── Queries ─────────────────────────────────────────────────────────────
    const { data: customersData, isLoading: customersLoading } = useQuery({
        queryKey: ['customers-for-package'],
        queryFn: () => fetchAllCustomers({}),
        enabled: visible,
    });

    const { data: paymentMethodsData, isLoading: paymentMethodsLoading } = useQuery({
        queryKey: ['payment-methods'],
        queryFn: () => fetchAllPaymentMethods({}),
        enabled: visible,
    });

    const customers = customersData || [];
    const paymentMethods: any[] = Array.isArray(paymentMethodsData)
        ? paymentMethodsData
        : paymentMethodsData?.paymentMethods || [];

    // ── Customer search filter ───────────────────────────────────────────────
    const filteredCustomers = customers.filter(customer => {
        if (!searchTerm.trim()) return true;
        const searchLower = searchTerm.toLowerCase();
        const phoneString = customer.phone ? String(customer.phone) : '';
        const name = customer.customer_name ? customer.customer_name.toLowerCase() : '';
        const email = customer.email ? customer.email.toLowerCase() : '';
        return (
            name.includes(searchLower) ||
            phoneString.includes(searchTerm) ||
            email.includes(searchLower)
        );
    });

    // ── Payment line helpers ─────────────────────────────────────────────────
    const packagePrice = pkg?.price ?? 0;

    const totalAllocated = paymentLines.reduce((sum, l) => sum + (l.amount || 0), 0);
    const remaining = parseFloat((packagePrice - totalAllocated).toFixed(2));
    const isBalanced = Math.abs(remaining) < 0.01;

    // No useCallback — plain functions read current state directly via the
    // functional setState updater form, which always receives the latest state.
    const addPaymentLine = () => {
        setPaymentLines(prev => [
            ...prev,
            { id: uid(), payment_method_id: null, amount: 0 },
        ]);
    };

    const removePaymentLine = (id: string) => {
        setPaymentLines(prev => prev.filter(l => l.id !== id));
    };

    const updateLine = (id: string, field: 'payment_method_id' | 'amount', value: any) => {
        setPaymentLines(prev =>
            prev.map(l => (l.id === id ? { ...l, [field]: value } : l))
        );
    };

    // Fill remaining: uses the functional updater so it always sees fresh state.
    const fillRemaining = (lineId: string) => {
        setPaymentLines(prev => {
            const otherTotal = prev
                .filter(l => l.id !== lineId)
                .reduce((sum, l) => sum + (l.amount || 0), 0);
            const fill = parseFloat((packagePrice - otherTotal).toFixed(2));
            return prev.map(l =>
                l.id === lineId ? { ...l, amount: Math.max(0, fill) } : l
            );
        });
    };

    // ── Validation ───────────────────────────────────────────────────────────
    const validatePaymentLines = (): string | null => {
        if (paymentLines.length === 0) return 'Add at least one payment method.';
        for (const line of paymentLines) {
            if (!line.payment_method_id) return 'Select a payment method for each row.';
            if (!line.amount || line.amount <= 0) return 'Each payment amount must be greater than 0.';
        }
        const methodIds = paymentLines.map(l => l.payment_method_id);
        if (new Set(methodIds).size !== methodIds.length) return 'Each payment method can only appear once.';
        if (!isBalanced) return `Total allocated (KES ${totalAllocated.toLocaleString()}) must equal package price (KES ${packagePrice.toLocaleString()}).`;
        return null;
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async (values: any) => {
        if (!pkg) return;

        const paymentError = validatePaymentLines();
        if (paymentError) {
            message.error(paymentError);
            return;
        }

        setLoading(true);
        try {
            await purchaseSubscription({
                customer_id: values.customer_id,
                package_id: pkg._id,
                // Single method fallback for backward compat kept as first method
                payment_method_id: paymentLines[0].payment_method_id,
                payment_amount: packagePrice,
                // New: full split array
                payment_methods: paymentLines.map(l => ({
                    payment_method_id: l.payment_method_id,
                    amount: l.amount,
                })),
            });

            message.success('Package purchased successfully!');
            resetModal();
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error purchasing package:', error);
            message.error(error.message || 'Failed to purchase package');
        } finally {
            setLoading(false);
        }
    };

    const resetModal = () => {
        form.resetFields();
        setSearchTerm('');
        setPaymentLines([{ id: uid(), payment_method_id: null, amount: 0 }]);
    };

    const handleCancel = () => {
        if (!loading) {
            resetModal();
            onClose();
        }
    };

    // Reset payment lines when pkg changes so amount defaults update
    React.useEffect(() => {
        if (pkg) {
            setPaymentLines([{ id: uid(), payment_method_id: null, amount: pkg.price }]);
        }
    }, [pkg?._id]);

    const getPaymentMethodIcon = (methodName: string) => {
        const name = methodName?.toLowerCase() || '';
        if (name.includes('cash')) return <DollarOutlined />;
        if (name.includes('mpesa') || name.includes('m-pesa')) return <PhoneOutlined />;
        if (name.includes('card')) return <CreditCardOutlined />;
        return <CreditCardOutlined />;
    };

    if (!pkg) return null;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <Modal
            title={
                <Space>
                    <CreditCardOutlined style={{ color: C.primary, fontSize: 20 }} />
                    <span style={{ fontSize: 18, fontWeight: 600 }}>Purchase Package</span>
                </Space>
            }
            open={visible}
            onCancel={handleCancel}
            footer={null}
            width={780}
            destroyOnClose
            centered
        >
            <Space direction="vertical" style={{ width: '100%' }} size="large">

                {/* ── Package summary ─────────────────────────────────────── */}
                <div>
                    <Title level={5} style={{ marginBottom: 16, marginTop: 8 }}>Package Details</Title>
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="Package Name" span={2}>
                            <Text strong style={{ fontSize: 15 }}>{pkg.name}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Code">
                            <Text copyable>{pkg.code}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Price">
                            <Text strong style={{ color: C.green, fontSize: 16 }}>
                                KES {pkg.price.toLocaleString()}
                            </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Total Visits">
                            <Tag color="blue" icon={<CheckCircleOutlined />}>
                                {pkg.total_visits} visits
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Price per Visit">
                            <Text strong>KES {(pkg.price / pkg.total_visits).toFixed(0)}</Text>
                        </Descriptions.Item>
                        {pkg.validity_days && (
                            <Descriptions.Item label="Validity" span={2}>
                                {pkg.validity_days} days from purchase
                            </Descriptions.Item>
                        )}
                        {pkg.desc && (
                            <Descriptions.Item label="Description" span={2}>
                                {pkg.desc}
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                </div>

                <Divider style={{ margin: '4px 0' }} />

                {/* ── Form ────────────────────────────────────────────────── */}
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    {/* Customer select */}
                    <Form.Item
                        name="customer_id"
                        label={<Text strong style={{ fontSize: 14 }}>Select Customer</Text>}
                        rules={[{ required: true, message: 'Please select a customer' }]}
                        style={{ marginBottom: 20 }}
                    >
                        <Select
                            showSearch
                            placeholder="Search by name, phone, or email…"
                            loading={customersLoading}
                            filterOption={false}
                            onSearch={setSearchTerm}
                            notFoundContent={
                                customersLoading ? (
                                    <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                                        {searchTerm ? 'No customers found' : 'Start typing to search customers'}
                                    </div>
                                )
                            }
                            size="large"
                            style={{ width: '100%' }}
                        >
                            {filteredCustomers.map(customer => (
                                <Option key={customer._id} value={customer._id}>
                                    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 4px', gap: 12 }}>
                                        <Avatar
                                            icon={<UserOutlined />}
                                            style={{ backgroundColor: C.primary, flexShrink: 0 }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: '#262626', marginBottom: 4 }}>
                                                {customer.customer_name}
                                            </div>
                                            <Space size={12} style={{ fontSize: 12, color: '#8c8c8c' }} wrap>
                                                {customer.phone && (
                                                    <span><PhoneOutlined style={{ marginRight: 4 }} />{String(customer.phone)}</span>
                                                )}
                                                {customer.email && (
                                                    <span><MailOutlined style={{ marginRight: 4 }} />{customer.email}</span>
                                                )}
                                            </Space>
                                        </div>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {/* ── Payment methods section ──────────────────────────── */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text strong style={{ fontSize: 14 }}>
                                <SplitCellsOutlined style={{ marginRight: 6, color: C.primary }} />
                                Payment Method{paymentLines.length > 1 ? 's' : ''}
                            </Text>
                            <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={addPaymentLine}
                                disabled={paymentMethodsLoading || (paymentMethods.length > 0 && paymentLines.length >= paymentMethods.length)}
                                style={{ borderColor: C.primary, color: C.primary, borderRadius: 7 }}
                            >
                                Split Payment
                            </Button>
                        </div>

                        {/* Payment lines */}
                        <div style={{
                            background: C.bg,
                            border: `1px solid ${C.border}`,
                            borderRadius: 10,
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                        }}>
                            {paymentLines.map((line, idx) => {
                                const usedMethodIds = paymentLines
                                    .filter(l => l.id !== line.id)
                                    .map(l => l.payment_method_id);

                                return (
                                    <div
                                        key={line.id}
                                        style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
                                    >
                                        {/* Method selector */}
                                        <div style={{ flex: '0 0 220px' }}>
                                            {idx === 0 && (
                                                <Text style={{ fontSize: 11, color: C.subText, display: 'block', marginBottom: 4 }}>Method</Text>
                                            )}
                                            <Select
                                                placeholder="Select method"
                                                value={line.payment_method_id ?? undefined}
                                                onChange={v => updateLine(line.id, 'payment_method_id', v)}
                                                style={{ width: '100%' }}
                                                size="large"
                                                loading={paymentMethodsLoading}
                                                notFoundContent={
                                                    paymentMethodsLoading
                                                        ? <Spin size="small" />
                                                        : <span style={{ color: '#999', fontSize: 12 }}>No methods</span>
                                                }
                                            >
                                                {paymentMethods.map((method: any) => (
                                                    <Option
                                                        key={method._id}
                                                        value={method._id}
                                                        disabled={usedMethodIds.includes(method._id)}
                                                    >
                                                        <Space>
                                                            {getPaymentMethodIcon(method.name)}
                                                            <span>{method.name}</span>
                                                        </Space>
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>

                                        {/* Amount */}
                                        <div style={{ flex: 1 }}>
                                            {idx === 0 && (
                                                <Text style={{ fontSize: 11, color: C.subText, display: 'block', marginBottom: 4 }}>Amount (KES)</Text>
                                            )}
                                            <InputNumber
                                                value={line.amount}
                                                onChange={v => updateLine(line.id, 'amount', v ?? 0)}
                                                min={0}
                                                max={packagePrice}
                                                style={{ width: '100%' }}
                                                size="large"
                                                formatter={v => `KES ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                parser={v => v?.replace(/KES\s?|(,*)/g, '') as any}
                                            />
                                        </div>

                                        {/* Fill remaining button */}
                                        {paymentLines.length > 1 && (
                                            <div>
                                                {idx === 0 && (
                                                    <div style={{ height: 20, marginBottom: 4 }} />
                                                )}
                                                <Button
                                                    size="large"
                                                    onClick={() => fillRemaining(line.id)}
                                                    title="Fill remaining balance"
                                                    style={{ borderRadius: 8, borderColor: C.border, color: C.subText, padding: '0 10px' }}
                                                >
                                                    ↓ Fill
                                                </Button>
                                            </div>
                                        )}

                                        {/* Remove */}
                                        {paymentLines.length > 1 && (
                                            <div>
                                                {idx === 0 && (
                                                    <div style={{ height: 20, marginBottom: 4 }} />
                                                )}
                                                <Button
                                                    size="large"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => removePaymentLine(line.id)}
                                                    style={{ borderRadius: 8, padding: '0 10px' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Balance summary */}
                            <div style={{
                                borderTop: `1px dashed ${C.border}`,
                                paddingTop: 10,
                                marginTop: 2,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <Text style={{ fontSize: 12, color: C.subText }}>
                                    Allocated: <strong>KES {totalAllocated.toLocaleString()}</strong>
                                    {' '}/{' '}
                                    KES {packagePrice.toLocaleString()}
                                </Text>
                                {!isBalanced ? (
                                    <Tag color={remaining > 0 ? 'orange' : 'red'} style={{ margin: 0, borderRadius: 6 }}>
                                        {remaining > 0
                                            ? `KES ${remaining.toLocaleString()} remaining`
                                            : `KES ${Math.abs(remaining).toLocaleString()} over`}
                                    </Tag>
                                ) : (
                                    <Tag color="green" icon={<CheckCircleOutlined />} style={{ margin: 0, borderRadius: 6 }}>
                                        Balanced
                                    </Tag>
                                )}
                            </div>
                        </div>

                        {/* Validation hint */}
                        {!isBalanced && totalAllocated > 0 && (
                            <Alert
                                type={remaining > 0 ? 'warning' : 'error'}
                                message={
                                    remaining > 0
                                        ? `Allocate the remaining KES ${remaining.toLocaleString()} before completing purchase.`
                                        : `Total exceeds package price by KES ${Math.abs(remaining).toLocaleString()}.`
                                }
                                showIcon
                                style={{ marginTop: 8, borderRadius: 8 }}
                            />
                        )}
                    </div>

                    {/* ── Action buttons ───────────────────────────────────── */}
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button
                                size="large"
                                onClick={handleCancel}
                                disabled={loading}
                                style={{ minWidth: 100 }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                icon={<CheckCircleOutlined />}
                                loading={loading}
                                disabled={!isBalanced}
                                style={{
                                    backgroundColor: C.primary,
                                    borderColor: C.primary,
                                    minWidth: 180,
                                }}
                            >
                                Complete Purchase
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Space>
        </Modal>
    );
};

export default PurchasePackageModal;