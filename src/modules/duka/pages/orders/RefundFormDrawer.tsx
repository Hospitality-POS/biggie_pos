import React, { useEffect, useState } from "react";
import { Drawer, Form, Input, Select, DatePicker, InputNumber, Button, Space, App, Table, Typography } from "antd";
import { SaveOutlined, CloseOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
    createRefund,
    updateRefund,
    Refund,
    RefundType,
    RefundMethod,
    RefundReason,
    CreateRefundParams,
    UpdateRefundParams,
    CreateRefundItemParam,
} from "@services/accounting/refunds";
import { fetchAllCustomers } from "@services/customers";
import { getAllInvoices } from "@services/accounting/invoice";
import { fetchAllInventory } from "@services/inventory";
import { fetchAllInventoryItems, getAllProducts } from "@services/products";
import { fetchAllConsultations } from "@services/consultation";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface RefundFormDrawerProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    refund?: Refund | null;
    onSuccess: () => void;
}

const RefundFormDrawer: React.FC<RefundFormDrawerProps> = ({
    open,
    setOpen,
    refund,
    onSuccess,
}) => {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    // Fetch customers data
    const { data: customersData } = useQuery({
        queryKey: ['customers'],
        queryFn: () => fetchAllCustomers(),
        enabled: open,
    });

    // Fetch invoices data
    const { data: invoicesData } = useQuery({
        queryKey: ['invoices'],
        queryFn: () => getAllInvoices(),
        enabled: open,
    });

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

    const [refundItems, setRefundItems] = useState<CreateRefundItemParam[]>([]);

    const createMutation = useMutation({
        mutationFn: createRefund,
        onSuccess: () => {
            message.success("Refund created successfully");
            onSuccess();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateRefundParams }) =>
            updateRefund(id, data),
        onSuccess: () => {
            message.success("Refund updated successfully");
            onSuccess();
        },
    });

    useEffect(() => {
        if (open && refund) {
            form.setFieldsValue({
                ...refund,
                refund_date: dayjs(refund.refund_date),
                original_transaction_date: refund.original_transaction_date 
                    ? dayjs(refund.original_transaction_date) 
                    : undefined,
            });
            setRefundItems(refund.refund_items.map(item => ({
                item_id: item.item_id,
                item_name: item.item_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                reason: item.reason,
            })));
        } else if (open) {
            form.resetFields();
            form.setFieldsValue({
                refund_date: dayjs(),
                refund_type: "Partial",
                refund_method: "Cash",
                status: "Pending",
            });
            setRefundItems([]);
        }
    }, [open, refund, form]);

    // Combine all available items (inventory + services)
    const getAllAvailableItems = () => {
        const items: any[] = [];
        
        // Add inventory items
        if (inventoryData && Array.isArray(inventoryData)) {
            inventoryData.forEach((item: any) => {
                items.push({
                    _id: item.id,
                    name: item.name,
                    price: item.price,
                    type: 'inventory',
                    source: 'inventory',
                    sku: item.sku,
                    stock_quantity: item.stock_quantity,
                    description: item.description,
                });
            });
        }
        
        // Add services
        if (servicesData && Array.isArray(servicesData)) {
            servicesData.forEach((service: any) => {
                items.push({
                    _id: service.id,
                    name: service.name,
                    price: service.price,
                    type: 'service',
                    source: 'services',
                    description: service.description,
                    category_name: service.category_name,
                    activateInventory: service.activateInventory,
                    quantity: service.quantity,
                });
            });
        }
        
        return items;
    };

    const addRefundItem = () => {
        // Use the first available item from all sources
        const allItems = getAllAvailableItems();
        const firstItem = allItems[0];
        setRefundItems([...refundItems, {
            item_type: "product_inventory",
            item_id: firstItem?._id || "",
            item_name: firstItem?.name || "",
            quantity: 1,
            unit_price: firstItem?.price || 0,
            batch_number: "",
            expiry_date: "",
            reason: "",
        }]);
    };

    const updateRefundItem = (index: number, field: keyof CreateRefundItemParam, value: any) => {
        const newItems = [...refundItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setRefundItems(newItems);
    };

    const removeRefundItem = (index: number) => {
        setRefundItems(refundItems.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return refundItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            
            if (refundItems.length === 0) {
                message.error("Please add at least one refund item");
                return;
            }

            const hasInvalidItem = refundItems.some(item => 
                !item.item_name || !item.quantity || !item.unit_price
            );
            
            if (hasInvalidItem) {
                message.error("Please fill in all required fields for refund items");
                return;
            }

            const submitData = {
                ...values,
                refund_date: values.refund_date.format("YYYY-MM-DD"),
                original_transaction_date: values.original_transaction_date?.format("YYYY-MM-DD"),
                refund_items: refundItems,
                refund_total: calculateTotal(),
            };

            if (refund) {
                updateMutation.mutate({ id: refund._id, data: submitData });
            } else {
                createMutation.mutate(submitData as CreateRefundParams);
            }
        } catch (error) {
            console.error("Validation failed:", error);
        }
    };

    const isLoading = createMutation.isLoading || updateMutation.isLoading;

    const itemColumns = [
        {
            title: "Select Item",
            dataIndex: "item_id",
            key: "item_id",
            render: (value: string, record: CreateRefundItemParam, index: number) => {
                const allItems = getAllAvailableItems();
                
                // Group items by type
                const inventoryItems = allItems.filter(item => item.type === 'inventory');
                const serviceItems = allItems.filter(item => item.type === 'service');
                
                return (
                    <Select
                        value={value}
                        placeholder={inventoryFetching || servicesFetching ? "Loading items..." : "Select item or service"}
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        onChange={(val) => {
                            if (val === "custom") {
                                // Handle custom item selection
                                updateRefundItem(index, "item_type", "custom");
                                updateRefundItem(index, "item_id", "");
                                updateRefundItem(index, "item_name", "");
                                updateRefundItem(index, "unit_price", 0);
                                updateRefundItem(index, "batch_number", "");
                                updateRefundItem(index, "expiry_date", "");
                            } else {
                                // Handle service/product selection
                                const selectedItem = allItems.find((item: any) => item._id === val);
                                if (selectedItem) {
                                    updateRefundItem(index, "item_type", selectedItem.type === 'service' ? "custom" : "product_inventory");
                                    updateRefundItem(index, "item_id", val);
                                    updateRefundItem(index, "item_name", selectedItem.name);
                                    updateRefundItem(index, "unit_price", selectedItem.price);
                                    updateRefundItem(index, "batch_number", "");
                                    updateRefundItem(index, "expiry_date", "");
                                    updateRefundItem(index, "custom_description", selectedItem.type === 'service' ? selectedItem.name : "");
                                }
                            }
                        }}
                        style={{ width: "100%" }}
                        loading={inventoryFetching || servicesFetching}
                        allowClear
                        options={[
                            ...(inventoryItems.length > 0 ? [{
                                label: "Inventory Items",
                                options: inventoryItems.map(item => ({
                                    label: `${item.name}${item.sku ? ` (${item.sku})` : ""} - KES${item.price}`,
                                    value: item._id,
                                })),
                            }] : []),
                            ...(serviceItems.length > 0 ? [{
                                label: "Services",
                                options: serviceItems.map(service => ({
                                    label: `${service.name} - KES${service.price}`,
                                    value: service._id,
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
                );
            },
        },
        {
            title: "Item Name",
            dataIndex: "item_name",
            key: "item_name",
            render: (value: string, record: CreateRefundItemParam, index: number) => (
                <Input
                    value={value}
                    placeholder={record.item_type === "custom" ? "Enter custom item name" : "Item name (auto-filled)"}
                    onChange={(e) => updateRefundItem(index, "item_name", e.target.value)}
                    disabled={record.item_type !== "custom"}
                />
            ),
        },
        {
            title: "Description",
            dataIndex: "custom_description",
            key: "custom_description",
            render: (value: string, record: CreateRefundItemParam, index: number) => {
                if (record.item_type === "custom") {
                    return (
                        <Input
                            value={value}
                            placeholder="Describe the custom service/item"
                            onChange={(e) => updateRefundItem(index, "custom_description", e.target.value)}
                        />
                    );
                }
                return <Input placeholder="Auto-filled from selection" disabled />;
            },
        },
        {
            title: "Quantity",
            dataIndex: "quantity",
            key: "quantity",
            width: 100,
            render: (value: number, record: CreateRefundItemParam, index: number) => (
                <InputNumber
                    value={value}
                    min={1}
                    onChange={(val) => updateRefundItem(index, "quantity", val || 1)}
                />
            ),
        },
        {
            title: "Unit Price",
            dataIndex: "unit_price",
            key: "unit_price",
            width: 120,
            render: (value: number, record: CreateRefundItemParam, index: number) => (
                <InputNumber
                    value={value}
                    min={0}
                    precision={2}
                    formatter={(value) => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(value) => Number(value?.replace(/KES\s?|(,*)/g, "") || "0")}
                    onChange={(val) => updateRefundItem(index, "unit_price", val || 0)}
                />
            ),
        },
        {
            title: "Total",
            key: "total",
            width: 100,
            render: (value: any, record: CreateRefundItemParam) => (
                <Text strong>KES {(record.quantity * record.unit_price).toLocaleString()}</Text>
            ),
        },
        {
            title: "Reason",
            dataIndex: "reason",
            key: "reason",
            render: (value: string, record: CreateRefundItemParam, index: number) => (
                <Input
                    value={value}
                    placeholder="Reason for refund"
                    onChange={(e) => updateRefundItem(index, "reason", e.target.value)}
                />
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 60,
            render: (value: any, record: CreateRefundItemParam, index: number) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeRefundItem(index)}
                />
            ),
        },
    ];

    return (
        <Drawer
            title={refund ? "Edit Refund" : "New Refund"}
            width={800}
            open={open}
            onClose={() => setOpen(false)}
            extra={
                <Space>
                    <Button icon={<CloseOutlined />} onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSubmit}
                        loading={isLoading}
                    >
                        {refund ? "Update" : "Create"}
                    </Button>
                </Space>
            }
        >
            <Form
                form={form}
                layout="vertical"
                requiredMark={false}
            >
                <Form.Item
                    name="refund_date"
                    label="Refund Date"
                    rules={[{ required: true, message: "Please select refund date" }]}
                >
                    <DatePicker style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item
                    name="original_invoice_id"
                    label="Original Invoice"
                    rules={[{ required: true, message: "Please select original invoice" }]}
                >
                    <Select 
                        placeholder="Select original invoice"
                        showSearch
                        filterOption={(input, option) =>
                            (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                        onChange={(value, option) => {
                            const invoice = invoicesData?.invoices?.find((inv: any) => inv._id === value);
                            if (invoice) {
                                form.setFieldsValue({
                                    original_invoice_no: invoice.order_no,
                                    original_transaction_date: invoice.issue_date ? dayjs(invoice.issue_date) : null,
                                    customer_id: invoice.customer_id?._id || invoice.customer_id,
                                    customer_name: invoice.customer_id?.customer_name || invoice.customer_name,
                                    customer_contact: invoice.customer_id?.phone || invoice.customer_id?.email || invoice.customer_phone || invoice.customer_email
                                });
                            }
                        }}
                    >
                        {invoicesData?.invoices?.map((invoice: any) => (
                            <Option key={invoice._id} value={invoice._id}>
                                {invoice.order_no} - {invoice.customer_id?.customer_name || invoice.customer_name} (KES {invoice.grand_total?.toLocaleString()})
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="original_invoice_no"
                    label="Original Invoice Number"
                    rules={[{ required: true, message: "Please enter original invoice number" }]}
                >
                    <Input placeholder="Invoice number (auto-filled)" readOnly />
                </Form.Item>

                <Form.Item
                    name="original_transaction_date"
                    label="Original Transaction Date"
                >
                    <DatePicker style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item
                    name="customer_id"
                    label="Customer"
                    rules={[{ required: true, message: "Please select customer" }]}
                >
                    <Select 
                        placeholder="Select customer"
                        showSearch
                        filterOption={(input, option) =>
                            (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                        onChange={(value, option) => {
                            const customer = customersData?.find((c: any) => c._id === value);
                            if (customer) {
                                form.setFieldsValue({
                                    customer_name: customer.customer_name,
                                    customer_contact: customer.phone || customer.email
                                });
                            }
                        }}
                    >
                        {customersData?.map((customer: any) => (
                            <Option key={customer._id} value={customer._id}>
                                {customer.customer_name} ({customer.phone || customer.email})
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="customer_name"
                    label="Customer Name"
                    rules={[{ required: true, message: "Please enter customer name" }]}
                >
                    <Input placeholder="Customer name (auto-filled)" readOnly />
                </Form.Item>

                <Form.Item
                    name="customer_contact"
                    label="Customer Contact"
                >
                    <Input placeholder="Enter customer contact (phone/email)" />
                </Form.Item>

                <Form.Item
                    name="refund_type"
                    label="Refund Type"
                    rules={[{ required: true, message: "Please enter refund type" }]}
                >
                    <Input placeholder="Enter refund type (e.g., Full, Partial, Exchange)" />
                </Form.Item>

                <Form.Item
                    name="refund_reason"
                    label="Refund Reason"
                    rules={[{ required: true, message: "Please select refund reason" }]}
                >
                    <Select placeholder="Select refund reason">
                        <Option value="Defective">Defective</Option>
                        <Option value="Wrong Item">Wrong Item</Option>
                        <Option value="Damaged">Damaged</Option>
                        <Option value="Customer Dissatisfaction">Customer Dissatisfaction</Option>
                        <Option value="Return Policy">Return Policy</Option>
                        <Option value="Other">Other</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="refund_reason_details"
                    label="Refund Reason Details"
                >
                    <TextArea rows={3} placeholder="Enter detailed reason for refund" />
                </Form.Item>

                <Form.Item
                    name="refund_method"
                    label="Refund Method"
                    rules={[{ required: true, message: "Please select refund method" }]}
                >
                    <Select placeholder="Select refund method">
                        <Option value="Cash">Cash</Option>
                        <Option value="M-Pesa">M-Pesa</Option>
                        <Option value="Bank_Transfer">Bank Transfer</Option>
                        <Option value="Card">Card</Option>
                        <Option value="Cheque">Cheque</Option>
                        <Option value="Store_Credit">Store Credit</Option>
                        <Option value="Original_Method">Original Method</Option>
                    </Select>
                </Form.Item>

                {/* Refund Items */}
                <Form.Item label="Refund Items">
                    <div style={{ marginBottom: 16 }}>
                        <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={addRefundItem}
                        >
                            Add Refund Item
                        </Button>
                    </div>
                    <Table
                        dataSource={refundItems}
                        columns={itemColumns}
                        pagination={false}
                        size="small"
                        rowKey={(_, index) => index || 0}
                    />
                    <div style={{ marginTop: 16, textAlign: "right" }}>
                        <Text strong style={{ fontSize: "16px" }}>
                            Total Refund Amount: KES {calculateTotal().toLocaleString()}
                        </Text>
                    </div>
                </Form.Item>

                <Form.Item
                    name="notes"
                    label="Notes"
                >
                    <TextArea rows={3} placeholder="Enter additional notes" />
                </Form.Item>

                {!refund && (
                    <Form.Item
                        name="status"
                        label="Status"
                        initialValue="Pending"
                    >
                        <Select>
                            <Option value="Pending">Pending</Option>
                            <Option value="Approved">Approved</Option>
                        </Select>
                    </Form.Item>
                )}
            </Form>
        </Drawer>
    );
};

export default RefundFormDrawer;
