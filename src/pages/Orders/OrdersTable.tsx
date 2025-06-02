import { useRef, useState, useEffect } from "react";
import {
  ActionType,
  ProColumns,
  ProFormInstance,
  ProTable,
} from "@ant-design/pro-components";
import ExpandedRowContent from "./ExpandableOrderDetails";
import { deleteOrderById, getAllOrders } from "@services/orders";
import { Badge, Button, DatePicker, Radio, Space, Tag, Typography } from "antd";
import { CSVLink } from "react-csv";
import moment from "moment";
// import jsPDF from "jspdf";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ENTITY_NAME } from "@utils/config";
import { CalendarOutlined, DeleteOutlined, UserOutlined } from "@ant-design/icons";
import { useAppSelector } from "src/store";

const { RangePicker } = DatePicker;

const OrdersTable = () => {
  const actionRef = useRef<ActionType>();
  const ref = useRef<ProFormInstance>();
  const queryClient = useQueryClient();

  // Date filter state
  const [dateFilterType, setDateFilterType] = useState("today");

  const todayStart = moment().startOf('day');
  const todayEnd = moment().endOf('day');

  const [dateRange, setDateRange] = useState<[moment.Moment, moment.Moment]>([todayStart, todayEnd]);

  // Query parameters state
  const [queryParams, setQueryParams] = useState({
    start_date: todayStart.toISOString(),
    end_date: todayEnd.toISOString(),
  });
  // Track current orders data separately 
  const [currentOrders, setCurrentOrders] = useState([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["orderlist", queryParams],
    queryFn: () => getAllOrders(queryParams),
    networkMode: "always",
  });

  // Update currentOrders when data changes
  useEffect(() => {
    // Ensure we set currentOrders to an empty array if data is null or undefined
    setCurrentOrders(data || []);
  }, [data]);

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  // Function to handle preset date filters
  const handleDateFilterChange = (e) => {
    const filterType = e.target.value;
    setDateFilterType(filterType);

    let startDate = null;
    let endDate = null;

    switch (filterType) {
      case "today":
        startDate = moment().startOf('day');
        endDate = moment().endOf('day');
        break;
      case "yesterday":
        startDate = moment().subtract(1, 'days').startOf('day');
        endDate = moment().subtract(1, 'days').endOf('day');
        break;
      case "currentWeek":
        startDate = moment().startOf('week'); // Start of current week (Sunday)
        endDate = moment().endOf('week'); // End of current week (Saturday)
        break;
      case "lastWeek":
        startDate = moment().subtract(1, 'week').startOf('week');
        endDate = moment().subtract(1, 'week').endOf('week');
        break;
      case "currentMonth":
        startDate = moment().startOf('month');
        endDate = moment().endOf('month');
        break;
      case "custom":
        // Don't set dates here, let the user pick from the RangePicker
        break;
      default:
        // "all" - no date filtering
        startDate = null;
        endDate = null;
    }

    // Set date range state
    setDateRange(startDate && endDate ? [startDate, endDate] : null);

    // Update query parameters
    const newParams = { ...queryParams };
    if (startDate && endDate) {
      newParams.start_date = startDate.toISOString();
      newParams.end_date = endDate.toISOString();
    } else {
      // Remove date filters if "all" is selected
      delete newParams.start_date;
      delete newParams.end_date;
    }

    // Set the new query parameters
    setQueryParams(newParams);

    // Reset cached data before refetching to ensure stale data isn't shown
    queryClient.resetQueries(["orderlist"]);

    // Force a data reset to empty array while loading
    setCurrentOrders([]);

    // Trigger refetch with new parameters
    setTimeout(() => refetch(), 0);
  };

  // Function to handle custom date range selection
  const handleCustomDateChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateFilterType("custom");
      setDateRange(dates);

      const newParams = { ...queryParams };
      newParams.start_date = dates[0].startOf('day').toISOString();
      newParams.end_date = dates[1].endOf('day').toISOString();
      setQueryParams(newParams);

      // Reset cached data before refetching
      queryClient.resetQueries(["orderlist"]);

      // Force a data reset to empty array while loading
      setCurrentOrders([]);

      // Trigger refetch with new parameters
      setTimeout(() => refetch(), 0);
    } else {
      setDateFilterType("all");
      setDateRange(null);

      // Remove date filters
      const newParams = { ...queryParams };
      delete newParams.start_date;
      delete newParams.end_date;
      setQueryParams(newParams);

      // Reset cached data before refetching
      queryClient.resetQueries(["orderlist"]);

      // Force a data reset to empty array while loading
      setCurrentOrders([]);

      // Trigger refetch with new parameters
      setTimeout(() => refetch(), 0);
    }
  };

  const handleExportCSV = () => {
    const csvData =
      currentOrders?.length > 0
        ? currentOrders.map((order) => ({
          OrderNo: order?.order_no,
          Amount: order?.order_amount,
          UpdatedBy: order?.updated_by?.username,
          CreatedAt: moment(order?.createdAt).format("MMM-DD-YY, h:mm a"),
        }))
        : [];

    const csvHeaders = [
      { label: "Order No", key: "OrderNo" },
      { label: "Amount", key: "Amount" },
      { label: "Closed By", key: "UpdatedBy" },
      { label: "Closed At", key: "CreatedAt" },
    ];

    return (
      <CSVLink
        data={csvData}
        headers={csvHeaders}
        filename={`${ENTITY_NAME} ORDERS ${moment().format(
          "MMM-DD-YY, h:mm a"
        )}.csv`}
        style={{ textDecoration: "none" }}
      >
        Export *CSV
      </CSVLink>
    );
  };

  const ActionsColumn: ProColumns<any>[] = [
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
              cursor: isAdmin ? "pointer" : "not-allowed", // Change cursor when disabled
              opacity: isAdmin ? 1 : 0.5, // Dim when disabled
              pointerEvents: isAdmin ? "auto" : "none", // Prevent clicks when disabled
            }}
            onClick={async () => {
              if (!isAdmin) return; // Prevent function execution if disabled

              const success = await deleteOrderById(record._id);
              if (success && actionRef.current) {
                actionRef.current.reload();

                // Also manually invalidate the query to ensure fresh data
                queryClient.invalidateQueries(["orderlist"]);
              }
            }}
          >
            <DeleteOutlined />
            <Typography.Text>
              {record.status === "pending" ? "Cancel" : "Delete"}
            </Typography.Text>
          </Tag>
        </Space>
      ),
    },
  ];

  const expandedRowRender = (record: any) => {
    return <ExpandedRowContent record={record} />;
  };

  return (
    <>
      {/* Date Filter Controls */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <Space>
          <CalendarOutlined style={{ fontSize: '16px' }} />
          <Typography.Text strong>Date Filter:</Typography.Text>
        </Space>

        <Radio.Group
          value={dateFilterType}
          onChange={handleDateFilterChange}
          buttonStyle="solid"
          optionType="button"
          style={{ marginRight: 16 }}
        >
          <Radio.Button value="all">All Time</Radio.Button>
          <Radio.Button value="today">Today</Radio.Button>
          <Radio.Button value="yesterday">Yesterday</Radio.Button>
          <Radio.Button value="currentWeek">Current Week</Radio.Button>
          <Radio.Button value="lastWeek">Last Week</Radio.Button>
          <Radio.Button value="currentMonth">Current Month</Radio.Button>
          <Radio.Button value="custom">Custom</Radio.Button>
        </Radio.Group>

        {dateFilterType === "custom" && (
          <RangePicker
            value={dateRange}
            onChange={handleCustomDateChange}
            format="YYYY-MM-DD"
            allowClear
          />
        )}
      </div>

      <ProTable
        rowKey="_id"
        cardBordered
        pagination={{
          pageSize: 5,
          showQuickJumper: true,
          showSizeChanger: true,
          showTotal: (total, range) => (
            <div>{`Showing ${range[0]}-${range[1]} of ${total} total orders`}</div>
          ),
        }}
        columns={[
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
          ...ActionsColumn,
        ]}
        dataSource={currentOrders}
        loading={isLoading}
        tableAlertRender={({ selectedRowKeys }) => {
          return <p>You have selected {selectedRowKeys.length}</p>;
        }}
        formRef={ref}
        actionRef={actionRef}
        rowSelection={{
          alwaysShowAlert: false,
          selections: false,
        }}
        scroll={{ x: "inherit" }}
        search={{
          searchText: "Search order",
          resetText: "Reset",
          labelWidth: "auto",
          onSearch: (values) => {
            // When search form is submitted, reset the queryParams
            const newParams = { ...queryParams };

            // Add search form values to queryParams
            if (values.order_no) {
              newParams.order_no = values.order_no;
            } else {
              delete newParams.order_no;
            }

            if (values.name) {
              newParams.name = values.name;
            } else {
              delete newParams.name;
            }

            // Update query params
            setQueryParams(newParams);

            // Reset cached data and force reload
            queryClient.resetQueries(["orderlist"]);
            setCurrentOrders([]);
            setTimeout(() => refetch(), 0);
          },
        }}
        options={{
          search: true,
          fullScreen: true,
          reload: () => {
            // Reset cached data and force reload
            queryClient.resetQueries(["orderlist"]);
            setCurrentOrders([]);
            refetch();
          },
        }}
        expandable={{
          expandedRowRender,
          defaultExpandAllRows: false,
          expandIconColumnIndex: 1,
          columnTitle: " ",
        }}
        headerTitle={
          <div>
            List of All Orders
            {dateRange && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {dateFilterType === "custom"
                  ? `${dateRange[0].format('MMM DD, YYYY')} - ${dateRange[1].format('MMM DD, YYYY')}`
                  : dateFilterType}
              </Tag>
            )}
          </div>
        }
        dateFormatter="string"
        toolBarRender={() => [
          <Button type="primary" loading={isLoading} disabled={isLoading}>
            {handleExportCSV()}
          </Button>,
          // <Button type="primary" onClick={handleExportPDF} loading={isLoading}>
          //   Export *PDF
          // </Button>,
        ]}
      />
    </>
  );
};

export default OrdersTable;