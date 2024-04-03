import { useRef } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { Avatar, Badge, Tag } from "antd/lib";
import { UserOutlined } from "@ant-design/icons";
import { MailOutlined } from "@mui/icons-material";
import { fetchAllUsersList } from "@services/users";
import ExpandedRowContent from "./ExpandableOrderDetails";
import { getAllOrders } from "@services/orders";
import { Button } from "antd";

const OrdersTable = () => {
  const actionRef = useRef<ActionType>();

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
          showQuickJumper: false,
          showTotal: (total, range) => (
            <div>{`Showing ${range[0]}-${range[1]} of ${total} total items`}</div>
          ),
        }}
        columns={[
          {
            title: "Order No.",
            dataIndex: "order_no",
            key: "order-Number",
            hideInSearch: false,
            copyable: true,
            fieldProps: {
              placeholder: "Enter Order number",
            },
          },
          {
            title: "Table",
            dataIndex: ["table_id", "name"],
            key: "table-name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter table name",
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
          },

          {
            title: "Role",
            dataIndex: "isAdmin",
            hideInSearch: true,
            render: (text) => (
              <Tag color={text ? "success" : "processing"}>
                {text ? "admin" : "user"}
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
          },
          {
            title: "Time Closed",
            dataIndex: "createdAt",
            hideInSearch: true,
            valueType: "dateTime",
          },
        ]}
        request={async (params) => {
          const data = await getAllOrders(params);
          return {
            data: data,
            success: true,
            total: data.length,
          };
        }}
        tableAlertRender={({ selectedRowKeys }) => {
          return <p>You have selected {selectedRowKeys.length}</p>;
        }}
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
        }}
        expandable={{
          expandedRowRender,
          defaultExpandAllRows: false,
          expandIconColumnIndex: 1,
          columnTitle: " ",
        }}
        dateFormatter="string"
        headerTitle="List of orders"
        toolBarRender={() => [<Button type="primary">Print *CSV</Button>, <Button type="primary">Print *PDF</Button>]}
      />
    </>
  );
};

export default OrdersTable;
