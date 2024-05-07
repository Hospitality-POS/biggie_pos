import { useRef } from "react";
import { ActionType, ProFormInstance, ProTable } from "@ant-design/pro-components";
import ExpandedRowContent from "./ExpandableOrderDetails";
import { getAllOrders } from "@services/orders";
import { Badge, Button, Space, Tag } from "antd";
import { CSVLink } from "react-csv";
import moment from "moment";
// import jsPDF from "jspdf";
import { useQuery } from "@tanstack/react-query";
import { ENTITY_NAME } from "@utils/config";
import { UserOutlined } from "@ant-design/icons";

const OrdersTable = () => {
  const actionRef = useRef<ActionType>();
  const ref = useRef<ProFormInstance>();
  const { data, isLoading } = useQuery({
    queryKey: ["orderlist"],
    queryFn: getAllOrders,
    networkMode: "always",
  });

  const handleExportCSV = () => {
    const csvData =
      data?.length > 0
        ? data.map((order) => ({
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
        filename={`${ENTITY_NAME} ORDERS ${moment(Date()).format(
          "MMM-DD-YY, h:mm a"
        )}.csv`}
        style={{ textDecoration: "none" }}
      >
        Export *CSV
      </CSVLink>
    );
  };

  // const handleExportPDF = () => {
  //   const doc = new jsPDF();
  //   doc.text("Orders Report", 10, 10);

  //   const tableData =
  //     data?.length > 0 &&
  //     data?.map((order, i) => [
  //       i,
  //       order?.order_no,
  //       order?.order_amount,
  //       order?.updated_by.username,
  //       moment(order?.createdAt).format("MMMM Do YYYY, h:mm a"),
  //     ]);

  //   const headers = ["No.", "Order No.", "Amount", "Closed At", "Closed By"];
  //   const tableY = 20;
  //   const dataY = tableY + 10;

  //   doc.autoTable({
  //     head: [headers],
  //     body: tableData,
  //     startY: dataY,
  //   });

  //   doc.save(`orders-${Date.now()}.pdf`);
  // };

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
          },
          {
            title: "Time Closed",
            dataIndex: "createdAt",
            hideInSearch: true,
            valueType: "dateTime",
            sorter: (a, b) =>
              new Date(a.createdAt as string) - new Date(b.createdAt as string),
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
        }}
        options={{
          search: true,
          fullScreen: true,          
        }}
        expandable={{
          expandedRowRender,
          defaultExpandAllRows: false,
          expandIconColumnIndex: 1,
          columnTitle: " ",
        }}
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
