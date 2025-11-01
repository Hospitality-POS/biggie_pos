import { useRef, useState } from "react";
import {
  ActionType,
  ProFormInstance,
  ProTable,
} from "@ant-design/pro-components";
import ExpandedRowContent from "./ExpandableInvoice";
import { Space, Tag } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { getAllInvoices } from "@services/cart";
import InvoiceReprintModal from "./InvoiceReprintModal";
import moment from "moment";

const InvoicesTable = () => {
  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();

  // Date filter state
  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    start_date: moment().startOf("day").toISOString(),
    end_date: moment().endOf("day").toISOString(),
  });

  const columns = [
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
      <ProTable
        rowKey="_id"
        cardBordered
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
        pagination={{
          pageSize: queryParams.limit,
          current: queryParams.page,
          showQuickJumper: true,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            setQueryParams((prev) => ({ ...prev, page, limit: pageSize }));
          },
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
            const data = await getAllInvoices(query);

            return {
              data: data || [],
              success: true,
              total: data.pagination?.total || 0,
            };
          } catch (error) {
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
        formRef={formRef}
        actionRef={actionRef}
        rowSelection={{
          alwaysShowAlert: false,
          selections: false,
        }}
        scroll={{ x: "inherit" }}
        toolbar={{
          title: "Invoices",
          tooltip: "Invoice Management",
        }}
        options={{
          fullScreen: true,
        }}
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
