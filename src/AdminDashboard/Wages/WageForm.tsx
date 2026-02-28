import React, { useEffect, useState } from 'react';
import { Form, Input, Select, InputNumber, Modal, DatePicker, Button, Table, Divider, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { addWage, updateWage } from '@services/wages';
import { fetchAllUsersList } from '@services/users';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface WageFormProps {
    visible: boolean;
    onCancel: () => void;
    editingWage: any;
}

const WageForm: React.FC<WageFormProps> = ({ visible, onCancel, editingWage }) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const [allowances, setAllowances] = useState<any[]>([]);
    const [deductions, setDeductions] = useState<any[]>([]);
    const [selectedShop, setSelectedShop] = useState<string | null>(null);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [shops, setShops] = useState<any[]>([]);

    // Fetch users
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ['users'],
        queryFn: fetchAllUsersList,
        enabled: visible,
    });

    const allUsers = usersData || [];

    // Extract unique shops from users
    useEffect(() => {
        if (allUsers.length > 0) {
            const uniqueShops = allUsers
                .filter(user => user.shop_id)
                .reduce((acc, user) => {
                    const shopId = user.shop_id?._id || user.shop_id;
                    const shopName = user.shop_id?.name || user.shop_id?.shopName || 'Unknown Shop';
                    const shopExists = acc.find(shop => shop._id === shopId);

                    if (!shopExists && shopId) {
                        acc.push({
                            _id: shopId,
                            name: shopName
                        });
                    }
                    return acc;
                }, []);

            setShops(uniqueShops);
        }
    }, [allUsers]);

    const addMutation = useMutation({
        mutationFn: addWage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wages'] });
            form.resetFields();
            setAllowances([]);
            setDeductions([]);
            setSelectedShop(null);
            setFilteredUsers([]);
            onCancel();
        },
    });

    const editMutation = useMutation({
        mutationFn: updateWage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wages'] });
            form.resetFields();
            setAllowances([]);
            setDeductions([]);
            setSelectedShop(null);
            setFilteredUsers([]);
            onCancel();
        },
    });

    useEffect(() => {
        if (visible && editingWage) {
            const shopId = editingWage.shop_id?._id || editingWage.shop_id;
            const userId = editingWage.user_id?._id || editingWage.user_id;

            // Set selected shop and filter users
            setSelectedShop(shopId);
            const filtered = allUsers.filter(user => {
                const userShopId = user.shop_id?._id || user.shop_id;
                return userShopId === shopId;
            });
            setFilteredUsers(filtered);

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
            setAllowances(editingWage.allowances || []);
            setDeductions(editingWage.deductions || []);
        } else if (visible) {
            form.resetFields();
            form.setFieldsValue({
                currency: 'KES',
                effectiveDate: dayjs(),
                overtimeRate: 0,
                isActive: true,
            });
            setAllowances([]);
            setDeductions([]);
            setSelectedShop(null);
            setFilteredUsers([]);
        }
    }, [visible, editingWage, form, allUsers]);

    // Handle shop selection
    const handleShopChange = (shopId: string) => {
        setSelectedShop(shopId);

        // Filter users by selected shop
        const filtered = allUsers.filter(user => {
            const userShopId = user.shop_id?._id || user.shop_id;
            return userShopId === shopId;
        });

        setFilteredUsers(filtered);

        // Reset employee field when shop changes
        form.setFieldsValue({ user_id: undefined });
    };

    const handleAddAllowance = () => {
        const newAllowance = {
            key: Date.now(),
            name: '',
            amount: 0,
            frequency: 'monthly',
        };
        setAllowances([...allowances, newAllowance]);
    };

    const handleDeleteAllowance = (key: number) => {
        setAllowances(allowances.filter(item => item.key !== key));
    };

    const handleAllowanceChange = (key: number, field: string, value: any) => {
        const updatedAllowances = allowances.map(item => {
            if (item.key === key) {
                return { ...item, [field]: value };
            }
            return item;
        });
        setAllowances(updatedAllowances);
    };

    const handleAddDeduction = () => {
        const newDeduction = {
            key: Date.now(),
            name: '',
            amount: 0,
            frequency: 'monthly',
        };
        setDeductions([...deductions, newDeduction]);
    };

    const handleDeleteDeduction = (key: number) => {
        setDeductions(deductions.filter(item => item.key !== key));
    };

    const handleDeductionChange = (key: number, field: string, value: any) => {
        const updatedDeductions = deductions.map(item => {
            if (item.key === key) {
                return { ...item, [field]: value };
            }
            return item;
        });
        setDeductions(updatedDeductions);
    };

    const calculateTotalAllowances = () => {
        return allowances.reduce((sum, item) => sum + (item.amount || 0), 0);
    };

    const calculateTotalDeductions = () => {
        return deductions.reduce((sum, item) => sum + (item.amount || 0), 0);
    };

    const calculateNetWage = () => {
        const baseAmount = form.getFieldValue('baseAmount') || 0;
        return baseAmount + calculateTotalAllowances() - calculateTotalDeductions();
    };

    const allowanceColumns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: any) => (
                <Input
                    value={text}
                    onChange={(e) => handleAllowanceChange(record.key, 'name', e.target.value)}
                    placeholder="Allowance name"
                />
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 150,
            render: (value: number, record: any) => (
                <InputNumber
                    value={value}
                    onChange={(val) => handleAllowanceChange(record.key, 'amount', val)}
                    min={0}
                    prefix="KES"
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Frequency',
            dataIndex: 'frequency',
            key: 'frequency',
            width: 150,
            render: (value: string, record: any) => (
                <Select
                    value={value}
                    onChange={(val) => handleAllowanceChange(record.key, 'frequency', val)}
                    style={{ width: '100%' }}
                >
                    <Option value="daily">Daily</Option>
                    <Option value="weekly">Weekly</Option>
                    <Option value="monthly">Monthly</Option>
                    <Option value="one-time">One-time</Option>
                </Select>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 80,
            render: (record: any) => (
                <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteAllowance(record.key)}
                />
            ),
        },
    ];

    const deductionColumns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: any) => (
                <Input
                    value={text}
                    onChange={(e) => handleDeductionChange(record.key, 'name', e.target.value)}
                    placeholder="Deduction name"
                />
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 150,
            render: (value: number, record: any) => (
                <InputNumber
                    value={value}
                    onChange={(val) => handleDeductionChange(record.key, 'amount', val)}
                    min={0}
                    prefix="KES"
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Frequency',
            dataIndex: 'frequency',
            key: 'frequency',
            width: 150,
            render: (value: string, record: any) => (
                <Select
                    value={value}
                    onChange={(val) => handleDeductionChange(record.key, 'frequency', val)}
                    style={{ width: '100%' }}
                >
                    <Option value="daily">Daily</Option>
                    <Option value="weekly">Weekly</Option>
                    <Option value="monthly">Monthly</Option>
                    <Option value="one-time">One-time</Option>
                </Select>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 80,
            render: (record: any) => (
                <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteDeduction(record.key)}
                />
            ),
        },
    ];

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const wageData = {
                ...values,
                effectiveDate: values.effectiveDate ? values.effectiveDate.toISOString() : null,
                allowances: allowances.map(({ key, ...rest }) => rest),
                deductions: deductions.map(({ key, ...rest }) => rest),
            };

            if (editingWage) {
                await editMutation.mutateAsync({ _id: editingWage._id, value: wageData });
            } else {
                await addMutation.mutateAsync(wageData);
            }
        } catch (error) {
            console.error('Validation error:', error);
        }
    };

    const isLoading = addMutation.isPending || editMutation.isPending;

    return (
        <Modal
            title={editingWage ? 'Edit Wage' : 'Add New Wage'}
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={isLoading}
            width={1000}
            okText={editingWage ? 'Update' : 'Create'}
            okButtonProps={{
                disabled: isLoading,
                loading: isLoading,
            }}
            cancelButtonProps={{
                disabled: isLoading,
            }}
        >
            <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
                {/* Shop Selection - First Field */}
                <Form.Item
                    name="shop_id"
                    label="Shop"
                    rules={[{ required: true, message: 'Please select a shop' }]}
                >
                    <Select
                        placeholder="Select shop first"
                        showSearch
                        optionFilterProp="children"
                        onChange={handleShopChange}
                        loading={usersLoading}
                        filterOption={(input, option) =>
                            option?.children?.toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {shops.map((shop: any) => (
                            <Option key={shop._id} value={shop._id}>
                                {shop.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                {/* Employee Selection - Only shown when shop is selected */}
                {selectedShop && (
                    <Form.Item
                        name="user_id"
                        label="Employee"
                        rules={[{ required: true, message: 'Please select an employee' }]}
                    >
                        <Select
                            placeholder="Select employee"
                            showSearch
                            optionFilterProp="children"
                            loading={usersLoading}
                            filterOption={(input, option) =>
                                option?.children?.toLowerCase().includes(input.toLowerCase())
                            }
                            notFoundContent={
                                filteredUsers.length === 0 ? 'No employees found for this shop' : null
                            }
                        >
                            {filteredUsers.map((user: any) => (
                                <Option key={user._id} value={user._id}>
                                    {user.fullname} - {user.email}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                <Space size="large" style={{ width: '100%', display: 'flex' }}>
                    <Form.Item
                        name="wageType"
                        label="Wage Type"
                        rules={[{ required: true, message: 'Please select wage type' }]}
                        style={{ flex: 1 }}
                    >
                        <Select placeholder="Select wage type">
                            <Option value="daily">Daily</Option>
                            <Option value="weekly">Weekly</Option>
                            <Option value="monthly">Monthly</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="paymentFrequency"
                        label="Payment Frequency"
                        rules={[{ required: true, message: 'Please select payment frequency' }]}
                        style={{ flex: 1 }}
                    >
                        <Select placeholder="Select payment frequency">
                            <Option value="daily">Daily</Option>
                            <Option value="weekly">Weekly</Option>
                            <Option value="bi-weekly">Bi-weekly</Option>
                            <Option value="monthly">Monthly</Option>
                        </Select>
                    </Form.Item>
                </Space>

                <Space size="large" style={{ width: '100%', display: 'flex' }}>
                    <Form.Item
                        name="baseAmount"
                        label="Base Wage Amount"
                        rules={[{ required: true, message: 'Please enter base amount' }]}
                        style={{ flex: 1 }}
                    >
                        <InputNumber
                            min={0}
                            prefix="KES"
                            style={{ width: '100%' }}
                            placeholder="Enter base amount"
                        />
                    </Form.Item>

                    <Form.Item
                        name="overtimeRate"
                        label="Overtime Rate"
                        style={{ flex: 1 }}
                    >
                        <InputNumber
                            min={0}
                            prefix="KES"
                            style={{ width: '100%' }}
                            placeholder="Overtime rate"
                        />
                    </Form.Item>
                </Space>

                <Space size="large" style={{ width: '100%', display: 'flex' }}>
                    <Form.Item
                        name="effectiveDate"
                        label="Effective Date"
                        rules={[{ required: true, message: 'Please select effective date' }]}
                        style={{ flex: 1 }}
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="currency"
                        label="Currency"
                        initialValue="KES"
                        style={{ flex: 1 }}
                    >
                        <Select>
                            <Option value="KES">KES</Option>
                            <Option value="USD">USD</Option>
                            <Option value="EUR">EUR</Option>
                            <Option value="GBP">GBP</Option>
                        </Select>
                    </Form.Item>
                </Space>

                <Divider />

                <Form.Item label="Allowances">
                    <Table
                        columns={allowanceColumns}
                        dataSource={allowances}
                        pagination={false}
                        size="small"
                        rowKey="key"
                    />
                    <Button
                        type="dashed"
                        onClick={handleAddAllowance}
                        icon={<PlusOutlined />}
                        style={{ width: '100%', marginTop: 8 }}
                    >
                        Add Allowance
                    </Button>
                </Form.Item>

                <Form.Item label="Deductions">
                    <Table
                        columns={deductionColumns}
                        dataSource={deductions}
                        pagination={false}
                        size="small"
                        rowKey="key"
                    />
                    <Button
                        type="dashed"
                        onClick={handleAddDeduction}
                        icon={<PlusOutlined />}
                        style={{ width: '100%', marginTop: 8 }}
                    >
                        Add Deduction
                    </Button>
                </Form.Item>

                <Divider />

                <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span>Base Wage:</span>
                        <span style={{ fontWeight: 500 }}>KES {(form.getFieldValue('baseAmount') || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span>Total Allowances:</span>
                        <span style={{ fontWeight: 500, color: '#52c41a' }}>+ KES {calculateTotalAllowances().toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span>Total Deductions:</span>
                        <span style={{ fontWeight: 500, color: '#ff4d4f' }}>- KES {calculateTotalDeductions().toLocaleString()}</span>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 'bold' }}>
                        <span>Net Wage:</span>
                        <span style={{ color: '#1890ff' }}>KES {calculateNetWage().toLocaleString()}</span>
                    </div>
                </Space>

                <Divider />

                <Form.Item name="notes" label="Notes">
                    <TextArea rows={3} placeholder="Additional notes" />
                </Form.Item>

                <Form.Item
                    name="isActive"
                    label="Status"
                    initialValue={true}
                    rules={[{ required: true, message: 'Please select status' }]}
                >
                    <Select>
                        <Option value={true}>Active</Option>
                        <Option value={false}>Inactive</Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default WageForm;