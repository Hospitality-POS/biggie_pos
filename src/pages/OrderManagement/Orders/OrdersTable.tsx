import { useRef, useState } from "react";
import {
  ActionType,
  ProColumns,
  ProFormInstance,
  ProTable,
} from "@ant-design/pro-components";
import ExpandedRowContent from "./ExpandableOrderDetails";
import { deleteOrderById, getAllOrders } from "@services/orders";
import { Badge, Button, Space, Tag } from "antd";
import { CSVLink } from "react-csv";
import moment from "moment";
import { ENTITY_NAME } from "@utils/config";
import {
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "src/store";

const OrdersTable = () => {
  const [exportOrderData, setExportOrderData] = useState([]);

  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  // Query parameters state
  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    start_date: moment().startOf("day").toISOString(),
    end_date: moment().endOf("day").toISOString(),
  });

  const handleExportCSV = () => {
    // Make sure we're accessing the data correctly from the API response
    const orders = exportOrderData || [];

    const csvData = orders.map((order: any) => ({
      "Order No": order?.order_no || "",
      Table: order?.table_id?.name || "Deleted",
      "Closed By": order?.updated_by?.username || "N/A",
      "Payment Method": order?.order_payments?.[0]?.name || "N/A",
      Amount: `Ksh. ${order?.order_amount?.toFixed(2) || "0.00"}`,
      "Time Closed": order?.createdAt
        ? moment(order.createdAt).format("MMM DD, YYYY h:mm A")
        : "N/A",
    }));

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
      title: "Table",
      dataIndex: ["table_id", "name"],
      key: "name",
      hideInSearch: false,
      fieldProps: {
        placeholder: "Enter table name",
      },
      render: (name) => (
        <Badge
          status={name !== "-" ? "success" : "error"}
          text={name !== "-" ? name : "Deleted"}
        />
      ),
    },
    {
      title: "Closed By",
      dataIndex: ["updated_by", "username"],
      key: "closed-by",
      hideInSearch: true,
      fieldProps: {
        placeholder: "Enter username",
      },
      render: (text) => (
        <Tag color={text ? "green" : "error"}>
          {text ? (
            <>
              <UserOutlined /> {text}
            </>
          ) : (
            "Deleted"
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
      valueType: "money",
      renderText: (value: number) => `Ksh. ${value?.toFixed(2) || "0.00"}`,
    },
    {
      title: "Time Closed",
      dataIndex: "createdAt",
      hideInSearch: true,
      valueType: "dateTime",
      sorter: (a, b) =>
        new Date(a.createdAt as string) - new Date(b.createdAt as string),
    },
    {
      title: "Actions",
      search: false,
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Tag
            color={"error"}
            title="Delete"
            style={{
              cursor: isAdmin ? "pointer" : "not-allowed",
              opacity: isAdmin ? 1 : 0.5,
              pointerEvents: isAdmin ? "auto" : "none",
            }}
            onClick={async () => {
              if (!isAdmin) return;
              const success = await deleteOrderById(record._id);
              if (success && actionRef.current) {
                actionRef.current.reload();
              }
            }}
          >
            <DeleteOutlined />
            {record.status === "pending" ? "Cancel" : "Delete"}
          </Tag>
        </Space>
      ),
    },
  ];

  return (
    <ProTable
      rowKey="_id"
      cardBordered
      formRef={formRef}
      form={{
        onFinish: async (values) => {
          const { dateRange, ...rest } = values;
          const newParams = {
            ...rest,
            page: 1, // Reset to first page on filter change
            limit: queryParams.limit,
          };
          setQueryParams(newParams);
          return true; // Important: return true to close the search form
        },
        initialValues: {
          dateRange: [moment().startOf("day"), moment().endOf("day")],
        },
      }}
      search={{
        labelWidth: "auto",
        defaultCollapsed: false,
        searchText: "Filter",
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

        // Format the date range for the API
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
          // console.log(response)
          setExportOrderData(response);
          return {
            data: response,
            success: true,
            total: response.pagination?.total || 0,
          };
        } catch (error) {
          // console.error("Error fetching orders:", error);
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
        expandedRowRender: (record) => <ExpandedRowContent record={record} />,
        defaultExpandAllRows: false,
        expandIconColumnIndex: 1,
      }}
      actionRef={actionRef}
    />
  );
};

export default OrdersTable;
