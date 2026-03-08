import React, { useState, useEffect } from "react";
import {
    Modal,
    Form,
    Button,
    Space,
    InputNumber,
    Input,
    DatePicker,
    Table,
    message,
    Divider,
    Typography,
    Tag,
    Badge,
    Row,
    Col,
    Card,
    Select,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    SwapOutlined,
    SaveOutlined,
    CloseOutlined,
    ShoppingCartOutlined,
    ArrowRightOutlined,
} from "@ant-design/icons";
import { ProFormSelect, ProFormTextArea } from "@ant-design/pro-components";
import type { ActionType } from "@ant-design/pro-components";
import { createTransfer } from "@services/inventory";
import { fetchAllInventory } from "@services/inventory";
import { fetchAllShops } from "@services/shops";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface TransferItem {
    key: string;
    from_product_id: string;
    from_product_name?: string;
    from_product_code?: string;
    to_product_id: string;
    to_product_name?: string;
    to_product_code?: string;
    quantity: number;
    unit_id: string;
    unit_name?: string;
    available_quantity?: number;
    notes?: string;
}

interface AddEditTransferModalProps {
    actionRef: React.RefObject<ActionType>;
    data?: any;
    edit?: boolean;
}

const AddEditTransferModal: React.FC<AddEditTransferModalProps> = ({
    actionRef,
    data,
    edit = false,
}) => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
    const [fromShopId, setFromShopId] = useState<string>("");
    const [toShopId, setToShopId] = useState<string>("");
    const [availableFromProducts, setAvailableFromProducts] = useState<any[]>([]);
    const [availableToProducts, setAvailableToProducts] = useState<any[]>([]);

    useEffect(() => {
        if (visible && edit && data) {
            form.setFieldsValue({
                from_shop_id: data.from_shop_id?._id,
                to_shop_id: data.to_shop_id?._id,
                expected_delivery_date: data.expected_delivery_date
                    ? dayjs(data.expected_delivery_date)
                    : null,
                notes: data.notes,
            });

            setFromShopId(data.from_shop_id?._id || "");
            setToShopId(data.to_shop_id?._id || "");

            const items = data.items?.map((item: any, index: number) => ({
                key: `item-${index}`,
                from_product_id: item.from_product_id?._id,
                from_product_name: item.from_product_id?.name,
                from_product_code: item.from_product_id?.code,
                to_product_id: item.to_product_id?._id,
                to_product_name: item.to_product_id?.name,
                to_product_code: item.to_product_id?.code,
                quantity: item.quantity,
                unit_id: item.unit_id?._id,
                unit_name: item.unit_id?.name,
                notes: item.notes,
            })) || [];

            setTransferItems(items);
        }
    }, [visible, edit, data, form]);

    useEffect(() => {
        if (fromShopId) {
            loadAvailableProducts(fromShopId, "from");
        }
    }, [fromShopId]);

    useEffect(() => {
        if (toShopId) {
            loadAvailableProducts(toShopId, "to");
        }
    }, [toShopId]);

    const loadAvailableProducts = async (shopId: string, type: "from" | "to") => {
        try {
            console.log(`Loading ${type} products for shop ID:`, shopId);
            const products = await fetchAllInventory({ origin_shop: shopId });

            if (type === "from") {
                setAvailableFromProducts(products || []);
            } else {
                setAvailableToProducts(products || []);
            }
        } catch (error) {
            console.error(`Error loading ${type} products:`, error);
            message.error(`Failed to load ${type} shop products`);
        }
    };

    const showModal = () => {
        setVisible(true);
        if (!edit) {
            form.resetFields();
            setTransferItems([]);
            setFromShopId("");
            setToShopId("");
        }
    };

    const handleCancel = () => {
        setVisible(false);
        form.resetFields();
        setTransferItems([]);
        setFromShopId("");
        setToShopId("");
        setAvailableFromProducts([]);
        setAvailableToProducts([]);
    };

    const handleFromShopChange = (value: string) => {
        setFromShopId(value);
        setTransferItems([]);
    };

    const handleToShopChange = (value: string) => {
        setToShopId(value);
        // Clear to_product selections when destination shop changes
        setTransferItems(items => items.map(item => ({
            ...item,
            to_product_id: "",
            to_product_name: "",
            to_product_code: ""
        })));
    };

    const addTransferItem = () => {
        const newItem: TransferItem = {
            key: `item-${Date.now()}`,
            from_product_id: "",
            to_product_id: "",
            quantity: 1,
            unit_id: "",
            notes: "",
        };
        setTransferItems([...transferItems, newItem]);
    };

    const removeTransferItem = (key: string) => {
        setTransferItems(transferItems.filter((item) => item.key !== key));
    };

    const updateTransferItem = (key: string, field: string, value: any) => {
        setTransferItems(
            transferItems.map((item) => {
                if (item.key === key) {
                    if (field === "from_product_id") {
                        const product = availableFromProducts.find((p) => p._id === value);
                        return {
                            ...item,
                            from_product_id: value,
                            from_product_name: product?.name,
                            from_product_code: product?.code,
                            unit_id: product?.unit_id?._id || "",
                            unit_name: product?.unit_id?.name || "",
                            available_quantity: product?.quantity || 0,
                        };
                    } else if (field === "to_product_id") {
                        const product = availableToProducts.find((p) => p._id === value);
                        return {
                            ...item,
                            to_product_id: value,
                            to_product_name: product?.name,
                            to_product_code: product?.code,
                        };
                    }
                    return { ...item, [field]: value };
                }
                return item;
            })
        );
    };

    const handleSubmit = async () => {
        try {
            await form.validateFields();

            if (transferItems.length === 0) {
                message.error("Please add at least one item to transfer");
                return;
            }

            const invalidItems = transferItems.filter(
                (item) =>
                    !item.from_product_id ||
                    !item.to_product_id ||
                    !item.quantity ||
                    item.quantity <= 0
            );

            if (invalidItems.length > 0) {
                message.error("Please fill in all required fields (from product, to product, and quantity) for each item");
                return;
            }

            const insufficientItems = transferItems.filter(
                (item) => item.quantity > (item.available_quantity || 0)
            );

            if (insufficientItems.length > 0) {
                const itemNames = insufficientItems.map((i) => i.from_product_name).join(", ");
                message.error(
                    `Insufficient stock for: ${itemNames}. Please adjust quantities.`
                );
                return;
            }

            setLoading(true);

            const formValues = form.getFieldsValue();
            const transferData = {
                from_shop_id: formValues.from_shop_id,
                to_shop_id: formValues.to_shop_id,
                expected_delivery_date: formValues.expected_delivery_date
                    ? formValues.expected_delivery_date.toISOString()
                    : null,
                notes: formValues.notes,
                items: transferItems.map((item) => ({
                    from_product_id: item.from_product_id,
                    to_product_id: item.to_product_id,
                    quantity: item.quantity,
                    unit_id: item.unit_id,
                    notes: item.notes,
                })),
            };

            await createTransfer(transferData);

            message.success(
                edit ? "Transfer updated successfully" : "Transfer created successfully"
            );

            if (actionRef.current) {
                actionRef.current.reload();
            }

            handleCancel();
        } catch (error: any) {
            console.error("Error submitting transfer:", error);
            message.error(
                error?.response?.data?.message ||
                error?.message ||
                "Failed to create transfer"
            );
        } finally {
            setLoading(false);
        }
    };

    const calculateTransferSummary = () => {
        const totalItems = transferItems.length;
        const totalQuantity = transferItems.reduce(
            (sum, item) => sum + (item.quantity || 0),
            0
        );
        const totalValue = transferItems.reduce((sum, item) => {
            const product = availableFromProducts.find((p) => p._id === item.from_product_id);
            const productPrice = product?.price || 0;
            return sum + productPrice * (item.quantity || 0);
        }, 0);

        return { totalItems, totalQuantity, totalValue };
    };

    const itemColumns = [
        {
            title: "From Product (Source)",
            dataIndex: "from_product_id",
            key: "from_product_id",
            width: 250,
            render: (_: any, record: TransferItem) => (
                <Select
                    showSearch
                    placeholder="Select source product"
                    style={{ width: "100%" }}
                    value={record.from_product_id || undefined}
                    onChange={(value) => updateTransferItem(record.key, "from_product_id", value)}
                    filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={availableFromProducts.map((product) => ({
                        label: `${product.name} ${product.code ? `(${product.code})` : ""} - Stock: ${product.quantity || 0}`,
                        value: product._id,
                    }))}
                />
            ),
        },
        {
            title: "",
            key: "arrow",
            width: 40,
            align: "center",
            render: () => <ArrowRightOutlined style={{ color: "#1890ff" }} />,
        },
        {
            title: "To Product (Destination)",
            dataIndex: "to_product_id",
            key: "to_product_id",
            width: 250,
            render: (_: any, record: TransferItem) => (
                <Select
                    showSearch
                    placeholder="Select destination product"
                    style={{ width: "100%" }}
                    value={record.to_product_id || undefined}
                    onChange={(value) => updateTransferItem(record.key, "to_product_id", value)}
                    filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    disabled={!toShopId}
                    options={availableToProducts.map((product) => ({
                        label: `${product.name} ${product.code ? `(${product.code})` : ""}`,
                        value: product._id,
                    }))}
                />
            ),
        },
        {
            title: "Available",
            dataIndex: "available_quantity",
            key: "available_quantity",
            width: 100,
            render: (_: any, record: TransferItem) => (
                <Tag color={record.available_quantity && record.available_quantity > 0 ? "green" : "red"}>
                    {record.available_quantity || 0}
                </Tag>
            ),
        },
        {
            title: "Quantity",
            dataIndex: "quantity",
            key: "quantity",
            width: 120,
            render: (_: any, record: TransferItem) => (
                <InputNumber
                    min={1}
                    max={record.available_quantity || 0}
                    value={record.quantity}
                    onChange={(value) =>
                        updateTransferItem(record.key, "quantity", value || 1)
                    }
                    style={{ width: "100%" }}
                    status={
                        record.quantity > (record.available_quantity || 0)
                            ? "error"
                            : undefined
                    }
                />
            ),
        },
        {
            title: "Unit",
            dataIndex: "unit_name",
            key: "unit_name",
            width: 80,
            render: (_: any, record: TransferItem) => (
                <Text type="secondary">{record.unit_name || "-"}</Text>
            ),
        },
        {
            title: "Notes",
            dataIndex: "notes",
            key: "notes",
            width: 180,
            render: (_: any, record: TransferItem) => (
                <Input
                    placeholder="Optional notes"
                    value={record.notes}
                    onChange={(e) =>
                        updateTransferItem(record.key, "notes", e.target.value)
                    }
                />
            ),
        },
        {
            title: "Action",
            key: "action",
            width: 80,
            fixed: "right",
            render: (_: any, record: TransferItem) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeTransferItem(record.key)}
                />
            ),
        },
    ];

    const summary = calculateTransferSummary();

    const triggerButton = edit ? (
        <span onClick={showModal} style={{ cursor: "pointer" }}>
            Edit
        </span>
    ) : (
        <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
            New
        </Button>
    );

    return (
        <>
            {triggerButton}

            <Modal
                title={
                    <Space>
                        <SwapOutlined />
                        <span>{edit ? "Edit Transfer" : "Create New Transfer"}</span>
                    </Space>
                }
                open={visible}
                onCancel={handleCancel}
                width={1400}
                footer={[
                    <Button key="cancel" icon={<CloseOutlined />} onClick={handleCancel}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={loading}
                        onClick={handleSubmit}
                        disabled={!fromShopId || !toShopId || transferItems.length === 0}
                    >
                        {edit ? "Update Transfer" : "Create Transfer"}
                    </Button>,
                ]}
            >
                <Form form={form} layout="vertical">
                    <Card size="small" style={{ marginBottom: 16, background: "#f0f5ff" }}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <ProFormSelect
                                    name="from_shop_id"
                                    label="From Shop (Source)"
                                    placeholder="Select source shop"
                                    showSearch
                                    rules={[{ required: true, message: "Please select source shop" }]}
                                    request={async () => {
                                        try {
                                            const shops = await fetchAllShops();
                                            return shops.map(shop => ({
                                                label: shop.name,
                                                value: shop._id
                                            }));
                                        } catch (error) {
                                            console.error("Error fetching shops:", error);
                                            message.error("Failed to load shops");
                                            return [];
                                        }
                                    }}
                                    fieldProps={{
                                        onChange: handleFromShopChange,
                                        disabled: edit,
                                    }}
                                />
                            </Col>
                            <Col span={12}>
                                <ProFormSelect
                                    name="to_shop_id"
                                    label="To Shop (Destination)"
                                    placeholder="Select destination shop"
                                    showSearch
                                    rules={[
                                        { required: true, message: "Please select destination shop" },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (value && value === getFieldValue("from_shop_id")) {
                                                    return Promise.reject(
                                                        new Error("Source and destination shops must be different")
                                                    );
                                                }
                                                return Promise.resolve();
                                            },
                                        }),
                                    ]}
                                    request={async () => {
                                        try {
                                            const shops = await fetchAllShops();
                                            return shops.map(shop => ({
                                                label: shop.name,
                                                value: shop._id
                                            }));
                                        } catch (error) {
                                            console.error("Error fetching shops:", error);
                                            message.error("Failed to load shops");
                                            return [];
                                        }
                                    }}
                                    fieldProps={{
                                        onChange: handleToShopChange,
                                        disabled: edit,
                                    }}
                                />
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="expected_delivery_date"
                                    label="Expected Delivery Date"
                                >
                                    <DatePicker
                                        style={{ width: "100%" }}
                                        format="YYYY-MM-DD"
                                        disabledDate={(current) => {
                                            return current && current < dayjs().startOf("day");
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <ProFormTextArea
                                    name="notes"
                                    label="Transfer Notes"
                                    placeholder="Enter any notes for this transfer"
                                    fieldProps={{
                                        rows: 2,
                                    }}
                                />
                            </Col>
                        </Row>
                    </Card>

                    <Divider orientation="left">
                        <Space>
                            <ShoppingCartOutlined />
                            <span>Transfer Items Mapping</span>
                            <Badge count={transferItems.length} showZero color="blue" />
                        </Space>
                    </Divider>

                    {!fromShopId || !toShopId ? (
                        <Card>
                            <Text type="secondary">
                                Please select both source and destination shops to add items
                            </Text>
                        </Card>
                    ) : (
                        <>
                            <Table
                                dataSource={transferItems}
                                columns={itemColumns as any}
                                pagination={false}
                                size="small"
                                scroll={{ x: 1200 }}
                                locale={{
                                    emptyText: (
                                        <Space direction="vertical" style={{ padding: "20px 0" }}>
                                            <Text type="secondary">No items added yet</Text>
                                            <Text type="secondary" style={{ fontSize: "12px" }}>
                                                Map products from source shop to destination shop
                                            </Text>
                                            <Button
                                                type="dashed"
                                                icon={<PlusOutlined />}
                                                onClick={addTransferItem}
                                            >
                                                Add Item Mapping
                                            </Button>
                                        </Space>
                                    ),
                                }}
                            />

                            {transferItems.length > 0 && (
                                <Button
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    onClick={addTransferItem}
                                    style={{ width: "100%", marginTop: 16 }}
                                >
                                    Add Another Item Mapping
                                </Button>
                            )}
                        </>
                    )}

                    {transferItems.length > 0 && (
                        <Card size="small" style={{ marginTop: 16, background: "#f6ffed" }}>
                            <Space direction="vertical" style={{ width: "100%" }}>
                                <Text strong style={{ fontSize: "16px" }}>Transfer Summary</Text>
                                <Space>
                                    <Text strong>Total Items:</Text>
                                    <Badge count={summary.totalItems} showZero color="blue" />
                                </Space>
                                <Space>
                                    <Text strong>Total Quantity:</Text>
                                    <Text>{summary.totalQuantity}</Text>
                                </Space>
                                <Space>
                                    <Text strong>Estimated Value:</Text>
                                    <Text type="success">
                                        {summary.totalValue.toLocaleString("en-KE", {
                                            style: "currency",
                                            currency: "KES",
                                        })}
                                    </Text>
                                </Space>
                            </Space>
                        </Card>
                    )}
                </Form>
            </Modal>
        </>
    );
};

export default AddEditTransferModal;