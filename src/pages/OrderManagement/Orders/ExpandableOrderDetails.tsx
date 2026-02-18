import { ProDescriptions } from "@ant-design/pro-components";
import { Table, Tag, Typography, Button, Form, InputNumber, DatePicker, message, Space, Popconfirm, Alert, Tooltip } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined, DollarOutlined, RedoOutlined } from "@ant-design/icons";
import { useState } from "react";
import moment from "moment";
import axiosInstance from "@services/request";
import { BASE_URL } from "@utils/config";
import { repostOrderPayment } from "@services/orders";

const { Title } = Typography;

interface ProductReference {
  _id: string;
  name: string;
  price: number;
}

interface CategoryReference {
  _id: string;
  name: string;
}

interface OrderItem {
  _id: string;
  order_id: string;
  shop_id: string;
  product_id: ProductReference;
  product_type: string;
  category_id: CategoryReference;
  price: number;
  quantity: number;
  vat_amount: number;
  is_subscription_item: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OrderPayment {
  _id: string;
  name: string;
  amount: number;
  payment_status: string;
}

interface UserReference {
  _id: string;
  username: string;
}

interface VATDetail {
  rate: number;
  amount: number;
  net: number;
}

interface OrderDetailsInterface {
  _id: string;
  order_no: string;
  order_type: string;
  createdAt: string;
  served_by?: UserReference;
  order_items?: OrderItem[];
  order_payments?: OrderPayment[];
  discount?: number;
  discount_type?: string;
  subtotal: number;
  total_vat_amount: number;
  vat_breakdown?: Record<string, VATDetail>;
  order_amount: number;
}

interface EditingItem {
  itemId: string;
  quantity: number;
  createdAt: string;
}

const ExpandedRowContent = ({
  record,
  onRefresh,
}: {
  record: OrderDetailsInterface;
  onRefresh?: () => void;
}) => {
  const {
    _id: orderId,
    order_no,
    order_type,
    createdAt,
    served_by,
    order_items = [],
    order_payments = [],
    discount = 0,
    discount_type,
    subtotal,
    total_vat_amount,
    vat_breakdown,
    order_amount,
  } = record;

  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editingOrderTimestamp, setEditingOrderTimestamp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [repostingPayment, setRepostingPayment] = useState(false);
  const [form] = Form.useForm();
  const [orderTimestampForm] = Form.useForm();

  const formattedCreatedAt = new Date(createdAt).toLocaleString();
  const hasPayments = order_payments && order_payments.length > 0;
  const isRegularOrder = order_type === "Regular";
  const needsPayment = isRegularOrder && !hasPayments;

  // ✅ Handle edit order timestamp
  const handleEditOrderTimestamp = () => {
    setEditingOrderTimestamp(true);
    orderTimestampForm.setFieldsValue({
      createdAt: moment(createdAt),
    });
  };

  // ✅ Handle save order timestamp
  const handleSaveOrderTimestamp = async () => {
    try {
      const values = await orderTimestampForm.validateFields();
      setLoading(true);

      await axiosInstance.put(
        `${BASE_URL}/orders/${orderId}`,
        {
          createdAt: values.createdAt.toISOString(),
        }
      );

      message.success("Order timestamp updated successfully");
      setEditingOrderTimestamp(false);
      orderTimestampForm.resetFields();

      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Error updating order timestamp");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle cancel order timestamp edit
  const handleCancelOrderTimestamp = () => {
    setEditingOrderTimestamp(false);
    orderTimestampForm.resetFields();
  };

  // ✅ Handle repost order payment
  const handleRepostPayment = async (forceRecreate: boolean = false) => {
    try {
      setRepostingPayment(true);

      await repostOrderPayment(orderId, {
        force_recreate: forceRecreate,
      });

      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error("Error reposting payment:", error);
    } finally {
      setRepostingPayment(false);
    }
  };

  const handleEdit = (item: OrderItem) => {
    setEditingItem({
      itemId: item._id,
      quantity: item.quantity,
      createdAt: item.createdAt,
    });
    form.setFieldsValue({
      quantity: item.quantity,
      createdAt: moment(item.createdAt),
    });
  };

  const handleCancel = () => {
    setEditingItem(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const updateData = {
        quantity: values.quantity,
        createdAt: values.createdAt.toISOString(),
      };

      await axiosInstance.patch(
        `${BASE_URL}/orders/items/${editingItem?.itemId}`,
        updateData
      );

      message.success("Order item updated successfully");
      setEditingItem(null);
      form.resetFields();

      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Error updating order item");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle delete order item
  const handleDeleteItem = async (itemId: string) => {
    try {
      setDeletingItemId(itemId);
      setLoading(true);

      await axiosInstance.delete(
        `${BASE_URL}/orders/items/${itemId}`
      );

      message.success("Order item deleted successfully");

      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Error deleting order item");
    } finally {
      setLoading(false);
      setDeletingItemId(null);
    }
  };

  const paymentData = order_payments?.map((payment) => ({
    title: payment?.name,
    value: `Ksh.${payment?.amount?.toLocaleString()}`,
    status: payment?.payment_status,
  }));

  // Format VAT breakdown for display
  const vatBreakdownItems = vat_breakdown
    ? Object.entries(vat_breakdown).map(([type, details]) => ({
      label: `VAT (${type})`,
      value: `Ksh.${details.amount?.toFixed(2)} (${(
        details.rate * 100
      ).toFixed(0)}%)`,
    }))
    : [];

  const singlePaymentDisplay =
    paymentData?.length === 1 ? (
      <span>
        {paymentData[0]?.title} - Amount: {paymentData[0]?.value}
        {paymentData[0]?.status && (
          <Tag
            color={
              paymentData[0]?.status === "COMPLETED" ? "success" : "warning"
            }
            style={{ marginLeft: 8 }}
          >
            {paymentData[0]?.status}
          </Tag>
        )}
      </span>
    ) : (
      <ul style={{ listStyleType: "none", paddingLeft: 0, marginTop: 0 }}>
        {paymentData?.map((payment, index) => (
          <li key={`${payment?.title}-${index}`}>
            {payment?.title} - {payment?.value}
            {payment?.status && (
              <Tag
                color={payment?.status === "COMPLETED" ? "success" : "warning"}
                style={{ marginLeft: 8 }}
              >
                {payment?.status}
              </Tag>
            )}
          </li>
        ))}
      </ul>
    );

  // Order items table columns
  const orderItemsColumns = [
    {
      title: "Product",
      dataIndex: ["product_id", "name"],
      key: "product_name",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Category",
      dataIndex: ["category_id", "name"],
      key: "category_name",
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      align: "right" as const,
      render: (price: number) => `Ksh. ${price?.toFixed(2)}`,
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      align: "center" as const,
      render: (quantity: number, item: OrderItem) => {
        if (editingItem?.itemId === item._id) {
          return (
            <Form.Item
              name="quantity"
              style={{ margin: 0 }}
              rules={[
                { required: true, message: "Required" },
                { type: "number", min: 1, message: "Must be at least 1" },
              ]}
            >
              <InputNumber min={1} size="small" style={{ width: 80 }} />
            </Form.Item>
          );
        }
        return quantity;
      },
    },
    {
      title: "VAT",
      dataIndex: "vat_amount",
      key: "vat_amount",
      align: "right" as const,
      render: (vat: number) => `Ksh. ${vat?.toFixed(2)}`,
    },
    {
      title: "Line Total",
      key: "line_total",
      align: "right" as const,
      render: (_: any, item: OrderItem) => {
        const qty = editingItem?.itemId === item._id
          ? form.getFieldValue("quantity") || item.quantity
          : item.quantity;
        return (
          <strong>Ksh. {(item.price * qty).toFixed(2)}</strong>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "is_subscription_item",
      key: "is_subscription_item",
      render: (isSubscription: boolean) =>
        isSubscription ? (
          <Tag color="purple">Subscription</Tag>
        ) : (
          <Tag color="green">Regular</Tag>
        ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string, item: OrderItem) => {
        if (editingItem?.itemId === item._id) {
          return (
            <Form.Item
              name="createdAt"
              style={{ margin: 0 }}
              rules={[{ required: true, message: "Required" }]}
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                size="small"
                style={{ width: 180 }}
              />
            </Form.Item>
          );
        }
        return moment(date).format("MMM DD, YYYY HH:mm");
      },
    },
    {
      title: "Actions",
      key: "actions",
      align: "center" as const,
      width: 150,
      render: (_: any, item: OrderItem) => {
        if (editingItem?.itemId === item._id) {
          return (
            <Space size="small">
              <Button
                type="primary"
                size="small"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
              >
                Save
              </Button>
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </Space>
          );
        }
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(item)}
            >
              Edit
            </Button>
            <Popconfirm
              title="Delete this item?"
              description="This will remove the item from the order and recalculate totals."
              onConfirm={() => handleDeleteItem(item._id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deletingItemId === item._id}
                disabled={loading}
              >
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // Calculate order items total
  const orderItemsTotal = order_items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  return (
    <div style={{ padding: 16, background: "#fafafa" }}>
      {/* Payment Status Alert - Only for Regular orders */}
      {isRegularOrder && needsPayment && (
        <Alert
          message="Missing Payment Records"
          description={
            <Space direction="vertical">
              <span>
                This order is missing payment records. Click the button below to create them automatically.
              </span>
              <Popconfirm
                title="Create payment records?"
                description="This will create payment records based on the order's payment methods and amount."
                onConfirm={() => handleRepostPayment(false)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="primary"
                  size="small"
                  icon={<DollarOutlined />}
                  loading={repostingPayment}
                >
                  Create Payment Records
                </Button>
              </Popconfirm>
            </Space>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Order Items Section */}
      {order_items && order_items.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5} style={{ marginBottom: 12 }}>
            Order Items
            {order_type === "Subscription_Visit" && (
              <Tag color="purple" style={{ marginLeft: 8 }}>
                Subscription Visit (Pre-paid)
              </Tag>
            )}
            {order_type === "Subscription_Purchase" && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                Subscription Package Purchase
              </Tag>
            )}
          </Title>
          <Form form={form} component={false}>
            <Table
              dataSource={order_items}
              columns={orderItemsColumns}
              rowKey="_id"
              pagination={false}
              size="small"
              bordered
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5} align="right">
                      <strong>Items Total:</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <strong>
                        Ksh. {orderItemsTotal.toFixed(2)}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} colSpan={3} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Form>
        </div>
      )}

      {/* Order Details Section */}
      <ProDescriptions column={2} bordered size="small">
        <ProDescriptions.Item label="Order Number">
          {order_no}
        </ProDescriptions.Item>
        <ProDescriptions.Item label="Order Type">
          {order_type === "Regular" && <Tag color="green">Regular</Tag>}
          {order_type === "Subscription_Visit" && (
            <Tag color="purple">Subscription Visit</Tag>
          )}
          {order_type === "Subscription_Purchase" && (
            <Tag color="blue">Subscription Purchase</Tag>
          )}
        </ProDescriptions.Item>

        {/* Editable Order Date/Time */}
        <ProDescriptions.Item label="Date" span={2}>
          {editingOrderTimestamp ? (
            <Form form={orderTimestampForm} layout="inline">
              <Form.Item
                name="createdAt"
                rules={[{ required: true, message: "Required" }]}
                style={{ marginBottom: 0 }}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  style={{ width: 220 }}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    icon={<SaveOutlined />}
                    onClick={handleSaveOrderTimestamp}
                    loading={loading}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={handleCancelOrderTimestamp}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          ) : (
            <Space>
              <span>{formattedCreatedAt}</span>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={handleEditOrderTimestamp}
              >
                Edit
              </Button>
            </Space>
          )}
        </ProDescriptions.Item>

        <ProDescriptions.Item label="Served By">
          {served_by?.username || "N/A"}
        </ProDescriptions.Item>

        {/* Payment Method with Repost Option */}
        <ProDescriptions.Item label="Payment Method" span={2}>
          <Space direction="vertical" style={{ width: "100%" }}>
            {order_payments.length > 0 ? (
              <>
                {singlePaymentDisplay}
                {isRegularOrder && (
                  <Tooltip title="Recreate payment records">
                    <Popconfirm
                      title="Recreate payment records?"
                      description="This will delete existing payments and recreate them."
                      onConfirm={() => handleRepostPayment(true)}
                      okText="Yes"
                      cancelText="No"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<RedoOutlined />}
                        loading={repostingPayment}
                      >
                        Repost Payments
                      </Button>
                    </Popconfirm>
                  </Tooltip>
                )}
              </>
            ) : order_type === "Subscription_Visit" ? (
              <Tag color="orange">No Payment (Pre-paid via Subscription)</Tag>
            ) : (
              <Space>
                <Tag color="red">Missing Payment Records</Tag>
                {isRegularOrder && (
                  <Popconfirm
                    title="Create payment records?"
                    description="This will create payment records for this order."
                    onConfirm={() => handleRepostPayment(false)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      type="primary"
                      size="small"
                      icon={<DollarOutlined />}
                      loading={repostingPayment}
                    >
                      Fix
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            )}
          </Space>
        </ProDescriptions.Item>

        {/* Subtotal */}
        <ProDescriptions.Item label="Subtotal" span={2}>
          <strong>Ksh. {subtotal?.toFixed(2)}</strong>
        </ProDescriptions.Item>

        {/* VAT Breakdown */}
        {vatBreakdownItems.map((item, index) => (
          <ProDescriptions.Item key={index} label={item.label}>
            {item.value}
          </ProDescriptions.Item>
        ))}

        {/* Total VAT */}
        {total_vat_amount > 0 && (
          <ProDescriptions.Item label="Total VAT" span={2}>
            <Tag color="blue">Ksh. {total_vat_amount?.toFixed(2)}</Tag>
          </ProDescriptions.Item>
        )}

        {/* Discount */}
        {discount > 0 && (
          <ProDescriptions.Item
            label={`Discount (${discount_type || "fixed"})`}
            span={2}
          >
            <Tag color="orange">-Ksh. {discount?.toFixed(2)}</Tag>
          </ProDescriptions.Item>
        )}

        {/* Order Amount */}
        <ProDescriptions.Item label="Order Amount" span={2}>
          <strong>
            Ksh. {order_amount?.toFixed(2)}
            {order_type === "Subscription_Visit" && order_amount === 0 && (
              <Tag color="purple" style={{ marginLeft: 8 }}>
                Pre-paid
              </Tag>
            )}
          </strong>
        </ProDescriptions.Item>

        {/* Payment Total */}
        {order_payments.length > 0 && (
          <ProDescriptions.Item label="Total Payments" span={2}>
            <strong>
              Ksh.{" "}
              {order_payments
                .reduce((sum, p) => sum + p.amount, 0)
                .toFixed(2)}
            </strong>
          </ProDescriptions.Item>
        )}
      </ProDescriptions>
    </div>
  );
};

export default ExpandedRowContent;