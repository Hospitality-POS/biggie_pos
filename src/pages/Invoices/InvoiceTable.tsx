import { useRef } from "react";
import {
  ActionType,
  ProColumns,
  ProFormInstance,
  ProTable,
} from "@ant-design/pro-components";
import ExpandedRowContent from "./ExpandableInvoice";
import { Space, Tag, Typography } from "antd";
import { DeleteOutlined, UserOutlined } from "@ant-design/icons";
import { getAllInvoices, rePrintInvoice } from "@services/cart";

const InvoicesTable = () => {
  const actionRef = useRef<ActionType>();
  const ref = useRef<ProFormInstance>();

  const ActionsColumn: ProColumns<any>[] = [
    {
      title: "Actions",
      hideInSearch: true,
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Tag
            color={"green"}
            title="Re-print"
            style={{ cursor: "pointer" }}
            onClick={async () => {
              const success = await rePrintInvoice(record._id);
              if (success && actionRef.current) {
                actionRef.current.reload();
              }
            }}
          >
            <DeleteOutlined />
            <Typography.Text>
              Re-print
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
              new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime(),
          },
          ...ActionsColumn,
        ]}
        request={async (params) => {
          const data = await getAllInvoices(params);
          return {
            data: data,
            success: true,
            total: data.length,
          };
        }}
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
          searchText: "Search invoice",
          resetText: "Reset",
          labelWidth: "auto",
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
