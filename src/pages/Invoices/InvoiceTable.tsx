import { useRef, useState, useEffect } from "react";
import {
  ActionType,
  ProColumns,
  ProFormInstance,
  ProTable,
} from "@ant-design/pro-components";
import ExpandedRowContent from "./ExpandableInvoice";
import { Button, DatePicker, Radio, Space, Tag, Typography } from "antd";
import { CalendarOutlined, PrinterOutlined, UserOutlined } from "@ant-design/icons";
import { getAllInvoices, rePrintInvoice } from "@services/cart";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import InvoiceReprintModal from "./InvoiceReprintModal";
import moment from "moment";

const { RangePicker } = DatePicker;

const InvoicesTable = () => {
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
  // Track current invoices data separately
  const [currentInvoices, setCurrentInvoices] = useState([]);

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

    // Reset cached data and force reload
    setCurrentInvoices([]);

    // Trigger reload with new parameters
    if (actionRef.current) {
      actionRef.current.reload();
    }
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

      // Reset data and force reload
      setCurrentInvoices([]);
      if (actionRef.current) {
        actionRef.current.reload();
      }
    } else {
      setDateFilterType("all");
      setDateRange(null);

      // Remove date filters
      const newParams = { ...queryParams };
      delete newParams.start_date;
      delete newParams.end_date;
      setQueryParams(newParams);

      // Reset data and force reload
      setCurrentInvoices([]);
      if (actionRef.current) {
        actionRef.current.reload();
      }
    }
  };

  const reprintMutation = useMutation(rePrintInvoice, {
    onSuccess: (data) => {
      actionRef?.current?.reload();
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const ActionsColumn: ProColumns<any>[] = [
    {
      title: "Actions",
      hideInSearch: true,
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <InvoiceReprintModal
            invoiceId={record?._id}
            orderNo={record?.order_no}
          />
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
            <div>{`Showing ${range[0]}-${range[1]} of ${total} total invoices`}</div>
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
            key: "table",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter table name",
            },
          },
          {
            title: "Closed By",
            dataIndex: ["served_by", "username"],
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
            title: "Time Closed",
            dataIndex: "createdAt",
            hideInSearch: true,
            valueType: "dateTime",
            sorter: (a, b) =>
              new Date(a.createdAt as string).getTime() -
              new Date(b.createdAt as string).getTime(),
          },
          ...ActionsColumn,
        ]}
        request={async (params) => {
          // Merge ProTable's params with our date filter params
          const mergedParams = {
            ...params,
            ...queryParams
          };

          try {
            // Reset data before fetching to avoid showing stale data
            setCurrentInvoices([]);

            const data = await getAllInvoices(mergedParams);

            // Update current invoices data
            setCurrentInvoices(data || []);

            return {
              data: data || [],
              success: true,
              total: (data || []).length,
            };
          } catch (error) {
            console.error("Error fetching invoices:", error);
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
        tableAlertRender={({ selectedRowKeys }) => {
          return <p>You have selected {selectedRowKeys?.length}</p>;
        }}
        formRef={ref}
        actionRef={actionRef}
        rowSelection={{
          alwaysShowAlert: false,
          selections: false,
        }}
        scroll={{ x: "inherit" }}
        search={{
          searchText: "Search invoice",
          resetText: "Reset",
          labelWidth: "auto",
          onSearch: (values) => {
            // When search form is submitted, update the queryParams
            const newParams = { ...queryParams };

            // Add search form values to queryParams
            if (values.order_no) {
              newParams.orderNo = values.order_no;
            } else {
              delete newParams.orderNo;
            }

            if (values.table) {
              newParams.tableName = values.table;
            } else {
              delete newParams.tableName;
            }

            // Update query params
            setQueryParams(newParams);

            // Reset data and force reload
            setCurrentInvoices([]);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          },
        }}
        options={{
          fullScreen: true,
          reload: () => {
            // Reset data before reloading
            setCurrentInvoices([]);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          },
        }}
        headerTitle={
          <div>
            List of All Invoices
            {dateRange && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {dateFilterType === "custom"
                  ? `${dateRange[0].format('MMM DD, YYYY')} - ${dateRange[1].format('MMM DD, YYYY')}`
                  : dateFilterType}
              </Tag>
            )}
          </div>
        }
        expandable={{
          expandedRowRender,
          defaultExpandAllRows: false,
          expandIconColumnIndex: 1,
          columnTitle: " ",
        }}
        dateFormatter="string"
      />
    </>
  );
};

export default InvoicesTable;