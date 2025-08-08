import React, { useState, useEffect } from 'react';
import {
    Modal,
    Form,
    Input,
    Select,
    Button,
    Space,
    Table,
    InputNumber,
    message,
    Typography,
    Divider,
    Row,
    Col,
    Card,
    Tag
} from 'antd';
import { TruckOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { createDeliveryFromPO } from '@services/purchaseOrder';
import { fetchAllUsersList } from '@services/users';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ActionType } from '@ant-design/pro-components';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface CreateDeliveryFromPOModalProps {
    actionRef: React.MutableRefObject<ActionType | undefined>;
    purchaseOrder: any;
}

const CreateDeliveryFromPOModal: React.FC<CreateDeliveryFromPOModalProps> = ({
    actionRef,
    purchaseOrder
}) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [pendingItems, setPendingItems] = useState<any[]>([]);
    const [deliveryItems, setDeliveryItems] = useState<any[]>([]);


    const { data: users } = useQuery({
        queryKey: ["users"],
        queryFn: fetchAllUsersList,
        retry: 1,
        refetchInterval: 5000,
        networkMode: "always",
    });


    const userOptions = users?.map((user: any) => ({
        label: user.fullname || user.username || user.email || user._id,
        value: user._id,
    })) || [];

    const createDeliveryMutation = useMutation(createDeliveryFromPO, {
        onSuccess: () => {
            message.success('Delivery created from purchase order successfully');
            setIsModalVisible(false);
            form.resetFields();
            setDeliveryItems([]);
            actionRef.current?.reload();
        },
        onError: () => {
            message.error('Failed to create delivery from purchase order');
        },
    });

    useEffect(() => {
        if (isModalVisible && purchaseOrder) {

            const items = purchaseOrder.po_items?.filter((item: any) =>
                item.quantity_received < item.quantity_ordered
            ).map((item: any, index: number) => ({
                key: index.toString(),
                inventory_id: item.inventory_id,
                unit_id: item.unit_id,
                quantity_ordered: item.quantity_ordered,
                quantity_received: item.quantity_received,
                pending_quantity: item.quantity_ordered - item.quantity_received,
                quantity_to_deliver: 0,
                supplier_price: item.unit_price || 0,
            })) || [];

            setPendingItems(items);
            setDeliveryItems(items);
        }
    }, [isModalVisible, purchaseOrder]);

    const showModal = () => {
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
        setDeliveryItems([]);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();


            const itemsToDeliver = deliveryItems.filter(item => item.quantity_to_deliver > 0);

            if (itemsToDeliver.length === 0) {
                message.warning('Please specify quantities to deliver');
                return;
            }


            const itemsWithoutPrice = itemsToDeliver.filter(item => !item.supplier_price || item.supplier_price <= 0);
            if (itemsWithoutPrice.length > 0) {
                message.warning('Please enter supplier price for all items to deliver');
                return;
            }

            const submitData = {
                purchase_order_id: purchaseOrder._id,
                delivered_by: values.delivered_by,
                received_by: values.received_by,
                delivery_notes: values.delivery_notes,
                delivery_items: itemsToDeliver.map((item: any) => ({
                    inventory_id: item.inventory_id._id || item.inventory_id,
                    quantity_delivered: item.quantity_to_deliver,
                    supplier_price: item.supplier_price,
                })),
            };

            createDeliveryMutation.mutate(submitData);
        } catch (error) {
            message.error('Please fill in all required fields');
        }
    };

    const updateDeliveryQuantity = (key: string, quantity: number) => {
        setDeliveryItems(prevItems => {
            return prevItems.map(item => {
                if (item.key === key) {
                    return { ...item, quantity_to_deliver: quantity };
                }
                return item;
            });
        });
    };

    const updateSupplierPrice = (key: string, price: number) => {
        setDeliveryItems(prevItems => {
            return prevItems.map(item => {
                if (item.key === key) {
                    return { ...item, supplier_price: price };
                }
                return item;
            });
        });
    };

    const deliveryColumns = [
        {
            title: 'Item',
            dataIndex: 'inventory_id',
            render: (item: any) => (
                <Space direction="vertical" size={2}>
                    <Text strong>{item?.name || 'Unknown Item'}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {item?.code || 'No code'}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Ordered',
            dataIndex: 'quantity_ordered',
            width: 80,
            render: (quantity: number) => (
                <Tag color="blue">{quantity}</Tag>
            ),
        },
        {
            title: 'Received',
            dataIndex: 'quantity_received',
            width: 80,
            render: (quantity: number) => (
                <Tag color="green">{quantity}</Tag>
            ),
        },
        {
            title: 'Pending',
            dataIndex: 'pending_quantity',
            width: 80,
            render: (quantity: number) => (
                <Tag color="orange">{quantity}</Tag>
            ),
        },
        {
            title: 'Deliver Now',
            dataIndex: 'quantity_to_deliver',
            width: 120,
            render: (_, record: any) => (
                <InputNumber
                    min={0}
                    max={record.pending_quantity}
                    value={record.quantity_to_deliver}
                    onChange={(value) => updateDeliveryQuantity(record.key, value || 0)}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Supplier Price',
            dataIndex: 'supplier_price',
            width: 120,
            render: (_, record: any) => (
                <InputNumber
                    min={0}
                    step={0.01}
                    precision={2}
                    value={record.supplier_price}
                    onChange={(value) => updateSupplierPrice(record.key, value || 0)}
                    style={{ width: '100%' }}
                    placeholder="0.00"
                    formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                />
            ),
        },
        {
            title: 'Unit',
            dataIndex: 'unit_id',
            width: 80,
            render: (unit: any) => (
                <Text type="secondary">{unit?.name || 'N/A'}</Text>
            ),
        },
    ];

    return (
        <>
            <Button
                type="primary"
                icon={<TruckOutlined />}
                onClick={showModal}
                size="small"
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
                Create Delivery
            </Button>

            <Modal
                title={
                    <Space>
                        <TruckOutlined />
                        <Title level={4} style={{ margin: 0 }}>
                            Create Delivery from PO: {purchaseOrder?.po_number}
                        </Title>
                    </Space>
                }
                open={isModalVisible}
                onCancel={handleCancel}
                width={1100}
                footer={[
                    <Button key="cancel" onClick={handleCancel}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={createDeliveryMutation.isLoading}
                        onClick={handleSubmit}
                    >
                        Create Delivery
                    </Button>,
                ]}
            >
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="delivered_by"
                                label="Delivered By"
                                rules={[{ required: true, message: 'Please enter who delivered' }]}
                            >
                                <Input placeholder="Enter delivery person name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="received_by"
                                label="Received By"
                                rules={[{ required: true, message: 'Please select who received' }]}
                            >
                                <Select
                                    placeholder="Select receiver"
                                    options={userOptions}
                                    showSearch
                                    loading={!users}
                                    notFoundContent={users?.length ? "No users found" : "Loading users..."}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="delivery_notes" label="Delivery Notes">
                        <TextArea rows={2} placeholder="Add delivery notes (optional)" />
                    </Form.Item>

                    <Divider />

                    <Title level={5}>Items to Deliver</Title>
                    <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
                        Specify the quantities and supplier prices for each item you want to deliver. You can do partial deliveries.
                    </Text>

                    <Table
                        dataSource={deliveryItems}
                        columns={deliveryColumns}
                        pagination={false}
                        size="small"
                        locale={{ emptyText: 'No pending items to deliver' }}
                        scroll={{ x: 800 }}
                    />

                    {deliveryItems.length > 0 && (
                        <Card style={{ marginTop: 16, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
                            <Space direction="vertical">
                                <Space>
                                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                    <Text>
                                        Total items to deliver: {deliveryItems.reduce((sum, item) => sum + item.quantity_to_deliver, 0)}
                                    </Text>
                                </Space>
                                <Text>
                                    Total delivery value: ${deliveryItems.reduce((sum, item) => sum + (item.quantity_to_deliver * item.supplier_price), 0).toFixed(2)}
                                </Text>
                            </Space>
                        </Card>
                    )}
                </Form>
            </Modal>
        </>
    );
};

export default CreateDeliveryFromPOModal;