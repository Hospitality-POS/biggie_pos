import { useRef, useState } from "react";
import {
  ActionType,
  ProColumns,
  ProFormInstance,
  ProTable,
} from "@ant-design/pro-components";
import ExpandedRowContent from "./ExpandableOrderDetails";
import { deleteOrderById, getAllOrders, updateOrder, repostOrderPayment } from "@services/orders";
import { Badge, Button, Space, Tag, Modal, DatePicker, message, Form, Tooltip, Popconfirm } from "antd";
import { CSVLink } from "react-csv";
import moment from "moment";
import { ENTITY_NAME } from "@utils/config";
import {
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "src/store";

const OrdersTable = () => {
  const [exportOrderData, setExportOrderData] = useState([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [repostingPaymentId, setRepostingPaymentId] = useState<string | null>(null);

  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();
  const [dateForm] = Form.useForm();

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  // Query parameters state
  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    start_date: moment().startOf("day").toISOString(),
    end_date: moment().endOf("day").toISOString(),
  });

  // ✅ Handle edit order date
  const handleEditOrderDate = (record: any) => {
    setEditingOrderId(record._id);
    setDateModalVisible(true);
    dateForm.setFieldsValue({
      createdAt: moment(record.createdAt),
    });
  };

  // ✅ Handle save order date using updateOrder service
  const handleSaveOrderDate = async () => {
    try {
      const values = await dateForm.validateFields();
      setLoading(true);

      // Use the updateOrder service function
      const response = await updateOrder(editingOrderId!, {
        createdAt: values.createdAt.toISOString(),
      });

      // Show detailed success message with update counts
      if (response?.timestamp_update) {
        const { order_items_updated, order_payments_updated } = response.timestamp_update;
        message.success(
          `Order timestamp updated! ${order_items_updated} item(s) and ${order_payments_updated} payment(s) updated.`,
          5
        );
      }

      setDateModalVisible(false);
      setEditingOrderId(null);
      dateForm.resetFields();

      // Refresh table
      if (actionRef.current) {
        actionRef.current.reload();
      }
    } catch (error: any) {
      // Error message already shown by updateOrder service
      console.error("Error updating order date:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle cancel edit
  const handleCancelEdit = () => {
    setDateModalVisible(false);
    setEditingOrderId(null);
    dateForm.resetFields();
  };

  // ✅ NEW: Handle repost order payment
  const handleRepostOrderPayment = async (orderId: string, forceRecreate: boolean = false) => {
    try {
      setRepostingPaymentId(orderId);

      const response = await repostOrderPayment(orderId, {
        force_recreate: forceRecreate,
      });

      // Refresh table to show updated payment status
      if (actionRef.current) {
        actionRef.current.reload();
      }

      return response;
    } catch (error: any) {
      console.error("Error reposting payment:", error);
      throw error;
    } finally {
      setRepostingPaymentId(null);
    }
  };

  const handleExportCSV = () => {
    const orders = exportOrderData || [];

    const csvData = orders.map((order: any) => {
      // Handle order_amount which could be a number or array
      let orderAmount = 0;
      if (Array.isArray(order?.order_amount)) {
        orderAmount = order.order_amount.reduce((sum: number, amount: any) => sum + (Number(amount) || 0), 0);
      } else {
        orderAmount = Number(order?.order_amount) || 0;
      }

      return {
        "Order No": order?.order_no || "",
        Table: order?.table_id?.name || order.subscription_id ? "Subscription_Purchase" : "Deleted",
        "Closed By": order?.updated_by?.username || "N/A",
        "Payment Method": order?.order_payments?.[0]?.name || "N/A",
        Amount: `Ksh. ${orderAmount.toFixed(2)}`,
        "Time Closed": order?.createdAt
          ? moment(order.createdAt).format("MMM DD, YYYY h:mm A")
          : "N/A",
        "Order Type": order?.order_type || "Regular",
        "Payment Status": order?.order_payments?.length > 0 ? "Paid" : "Missing Payment",
      };
    });

    return (
      <CSVLink
        data={csvData}
        filename={`${ENTITY_NAME}_Orders_${moment().format("YYYY-MM-DD")}.csv`}
        className="ant-btn ant-btn-primary"
      >
        Export to CSV
      </CSVLink>
    );
  };

  const columns: ProColumns[] = [
    {
      title: "Order No.",
      dataIndex: "order_no",
      hideInSearch: false,
      copyable: true,
      fieldProps: {
        placeholder: "Enter Order number",
      },
    },
    {
      title: "Order Type",
      dataIndex: "order_type",
      key: "order_type",
      hideInSearch: true,
      render: (text: string) => {
        const typeConfig = {
          Regular: { color: "green", icon: "🛒" },
          Subscription_Visit: { color: "purple", icon: "📋" },
          Subscription_Purchase: { color: "blue", icon: "💳" },
        };
        const config = typeConfig[text] || typeConfig.Regular;
        return (
          <Tag color={config.color}>
            {config.icon} {text?.replace(/_/g, " ")}
          </Tag>
        );
      },
    },
    {
      title: "Table",
      dataIndex: ["table_id", "name"],
      key: "name",
      hideInSearch: false,
      fieldProps: {
        placeholder: "Enter table name",
      },
      render: (text: string, record: any) => {
        if (record.order_type === "Subscription_Purchase") {
          return <Badge status="processing" text="Package Purchase" />;
        }
        return (
          <Badge
            status={text !== "-" ? "success" : "error"}
            text={text !== "-" ? text : "No Table"}
          />
        );
      },
    },
    {
      title: "Closed By",
      dataIndex: ["updated_by", "username"],
      key: "closed-by",
      hideInSearch: true,
      fieldProps: {
        placeholder: "Enter username",
      },
      render: (text: string) => (
        <Tag color={text ? "green" : "default"}>
          {text ? (
            <>
              <UserOutlined /> {text}
            </>
          ) : (
            "System"
          )}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "order_amount",
      key: "order-amount",
      hideInSearch: true,
      ellipsis: true,
      render: (text: any, record: any) => {
        // Get the value directly from the record since 'text' might be the wrong parameter
        const value = record.order_amount;

        console.log('Amount render debug:', {
          textParam: text,
          textType: typeof text,
          recordValue: value,
          recordValueType: typeof value,
          isArray: Array.isArray(value),
          recordId: record._id,
          orderType: record.order_type,
          fullRecord: record // Let's see the full record
        });

        // Handle null/undefined - return 0
        if (value === null || value === undefined) {
          const formatted = `Ksh. 0.00`;
          if (record.order_type === "Subscription_Visit") {
            return (
              <Tooltip title="Pre-paid via subscription">
                <Tag color="purple">{formatted} (Pre-paid)</Tag>
              </Tooltip>
            );
          }
          return formatted;
        }

        // Handle arrays (split payments)
        if (Array.isArray(value)) {
          const totalAmount = value.reduce((sum: number, amount: any) => {
            const num = Number(amount);
            return sum + (isNaN(num) ? 0 : num);
          }, 0);
          const formatted = `Ksh. ${totalAmount.toFixed(2)}`;

          const splitDetails = value.map((v: any) => {
            const num = Number(v);
            return `Ksh. ${isNaN(num) ? '0.00' : num.toFixed(2)}`;
          }).join(' + ');

          return (
            <Tooltip title={`Split payment: ${splitDetails}`}>
              <Tag color="blue">{formatted} (Split)</Tag>
            </Tooltip>
          );
        }

        // Handle string or number - try to convert to number
        const numericValue = Number(value);

        // Check if conversion was successful
        if (isNaN(numericValue)) {
          console.warn('Cannot convert order_amount to number:', value, typeof value);
          return (
            <Tooltip title={`Value: ${value} (type: ${typeof value})`}>
              <Tag color="red">Invalid</Tag>
            </Tooltip>
          );
        }

        const formatted = `Ksh. ${numericValue.toFixed(2)}`;

        // Handle subscription visits with 0 amount
        if (record.order_type === "Subscription_Visit" && numericValue === 0) {
          return (
            <Tooltip title="Pre-paid via subscription">
              <Tag color="purple">{formatted} (Pre-paid)</Tag>
            </Tooltip>
          );
        }

        return formatted;
      },
    },
    {
      title: "Payment Status",
      dataIndex: "order_payments",
      key: "payment_status",
      hideInSearch: true,
      render: (text: any[], record: any) => {
        const payments = text;

        // Subscription visits don't need payments
        if (record.order_type === "Subscription_Visit") {
          return <Tag color="purple">Pre-paid</Tag>;
        }

        // Regular orders need payments
        if (!payments || payments.length === 0) {
          return (
            <Tooltip title="No payment records found. Click repost to fix.">
              <Tag color="red">Missing Payment</Tag>
            </Tooltip>
          );
        }

        // Calculate total paid amount
        const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Get order amount (handle both number and array cases)
        let orderAmount = 0;
        const amountValue = record.order_amount;

        if (Array.isArray(amountValue)) {
          orderAmount = amountValue.reduce((sum: number, amount: any) => sum + (Number(amount) || 0), 0);
        } else if (amountValue !== undefined && amountValue !== null) {
          orderAmount = Number(amountValue) || 0;
        }

        const isPaid = totalPaid >= orderAmount;

        return (
          <Tag color={isPaid ? "green" : "orange"}>
            {isPaid ? "✓ Paid" : "Partial"}
          </Tag>
        );
      },
    },
    {
      title: "Time Closed",
      dataIndex: "createdAt",
      hideInSearch: true,
      valueType: "dateTime",
      render: (text: string) => text ? moment(text).format("YYYY-MM-DD HH:mm:ss") : "N/A",
      sorter: (a, b) =>
        new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime(),
    },
    {
      title: "Actions",
      search: false,
      key: "action",
      width: 280,
      fixed: "right",
      render: (text, record) => {
        const hasPayments = record.order_payments && record.order_payments.length > 0;
        const isRegularOrder = record.order_type === "Regular";
        const needsPayment = isRegularOrder && !hasPayments;

        return (
          <Space size="small" wrap>
            {/* Edit Date Button */}
            <Tooltip title="Edit order date/time">
              <Button
                type="link"
                size="small"
                icon={<CalendarOutlined />}
                onClick={() => handleEditOrderDate(record)}
                style={{ padding: "0 4px" }}
              >
                Date
              </Button>
            </Tooltip>

            {/* Repost Payment Button - Only for Regular orders */}
            {isRegularOrder && (
              <Tooltip
                title={
                  needsPayment
                    ? "Create missing payment records"
                    : "Recreate payment records"
                }
              >
                <Popconfirm
                  title={
                    needsPayment
                      ? "Create payment records?"
                      : "Recreate payment records?"
                  }
                  description={
                    needsPayment
                      ? "This will create payment records for this order."
                      : "This will delete existing payments and recreate them."
                  }
                  onConfirm={() => handleRepostOrderPayment(record._id, hasPayments)}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{
                    danger: hasPayments,
                    loading: repostingPaymentId === record._id,
                  }}
                >
                  <Button
                    type={needsPayment ? "primary" : "link"}
                    size="small"
                    danger={hasPayments && !needsPayment}
                    icon={needsPayment ? <DollarOutlined /> : <RedoOutlined />}
                    loading={repostingPaymentId === record._id}
                  >
                    {needsPayment ? "Fix" : "Repost"}
                  </Button>
                </Popconfirm>
              </Tooltip>
            )}

            {/* Delete Button */}
            <Tooltip title={isAdmin ? "Delete order" : "Admin only"}>
              <Popconfirm
                title="Delete this order?"
                description="This will permanently delete the order and all related records."
                onConfirm={async () => {
                  if (!isAdmin) return;
                  const success = await deleteOrderById(record._id);
                  if (success && actionRef.current) {
                    actionRef.current.reload();
                  }
                }}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
                disabled={!isAdmin}
              >
                <Button
                  type="link"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  disabled={!isAdmin}
                  style={{
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    opacity: isAdmin ? 1 : 0.5,
                  }}
                >
                  Delete
                </Button>
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <ProTable
        rowKey="_id"
        cardBordered
        formRef={formRef}
        form={{
          onFinish: async (values) => {
            const { dateRange, ...rest } = values;
            const newParams = {
              ...rest,
              page: 1,
              limit: queryParams.limit,
            };
            setQueryParams(newParams);
            return true;
          },
          initialValues: {
            dateRange: [moment().startOf("day"), moment().endOf("day")],
          },
        }}
        search={{
          labelWidth: "auto",
          defaultCollapsed: false,
          searchText: "Search",
          resetText: "Reset",
          optionRender: (_, __, dom) => [...dom],
        }}
        toolbar={{
          title: "Orders",
          tooltip: "Order Management",
          actions: [
            <Button key="export" type="primary" icon={<DownloadOutlined />}>
              {handleExportCSV()}
            </Button>,
          ],
        }}
        columns={[
          {
            title: "Date Range",
            dataIndex: "dateRange",
            valueType: "dateRange",
            hideInTable: true,
            fieldProps: {
              ranges: {
                Today: [moment().startOf("day"), moment().endOf("day")],
                Yesterday: [
                  moment().subtract(1, "days").startOf("day"),
                  moment().subtract(1, "days").endOf("day"),
                ],
                "This Week": [moment().startOf("week"), moment().endOf("week")],
                "Last Week": [
                  moment().subtract(1, "week").startOf("week"),
                  moment().subtract(1, "week").endOf("week"),
                ],
                "This Month": [
                  moment().startOf("month"),
                  moment().endOf("month"),
                ],
              },
            },
          },
          ...columns,
        ]}
        request={async (params) => {
          const { current, pageSize, dateRange, _timestamp, ...rest } = params;

          const startDate = dateRange?.[0]
            ? moment(dateRange[0]).startOf("day").toISOString()
            : moment().startOf("day").toISOString();

          const endDate = dateRange?.[1]
            ? moment(dateRange[1]).endOf("day").toISOString()
            : moment().endOf("day").toISOString();

          const query = {
            ...rest,
            page: current,
            limit: pageSize,
            start_date: startDate,
            end_date: endDate,
          };

          try {
            const response = await getAllOrders(query);
            setExportOrderData(response);
            return {
              data: response,
              success: true,
              total: response.pagination?.total || 0,
            };
          } catch (error) {
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
        pagination={{
          pageSize: queryParams.limit,
          current: queryParams.page,
          showQuickJumper: true,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            setQueryParams((prev) => ({ ...prev, page, limit: pageSize }));
          },
        }}
        expandable={{
          expandedRowRender: (record) => (
            <ExpandedRowContent
              record={record}
              onRefresh={() => {
                if (actionRef.current) {
                  actionRef.current.reload();
                }
              }}
            />
          ),
          defaultExpandAllRows: false,
          expandIconColumnIndex: 1,
        }}
        actionRef={actionRef}
        scroll={{ x: 1200 }}
      />

      {/* Edit Order Date Modal */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            Edit Order Date & Time
          </Space>
        }
        open={dateModalVisible}
        onOk={handleSaveOrderDate}
        onCancel={handleCancelEdit}
        confirmLoading={loading}
        okText="Save"
        cancelText="Cancel"
        width={500}
      >
        <Form form={dateForm} layout="vertical">
          <Form.Item
            name="createdAt"
            label="Order Date & Time"
            rules={[
              { required: true, message: "Please select order date and time" },
            ]}
            extra="This will update the order timestamp and propagate to all order items and payments"
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: "100%" }}
              placeholder="Select date and time"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default OrdersTable;