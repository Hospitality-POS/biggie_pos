import { useRef } from "react";
import { ActionType, ProFormText, ProTable } from "@ant-design/pro-components";
import { Avatar, Tooltip } from "antd/lib";
import { Button, message, Popconfirm, Tag } from "antd";
import {  DeleteOutlined } from "@ant-design/icons";
import { deleteSupplier, fetchAllSuppliers } from "@services/supplier";
import { UserOutlined } from "@ant-design/icons";
import { MailOutlined, PhoneOutlined } from "@mui/icons-material";
import AddProSupplierModal from "@components/MODALS/pro/AddProSupplierModal";
import { useMutation } from "@tanstack/react-query";


const SupplierTable = () => {
  const actionRef = useRef<ActionType>();

  const DeleteSupplierMutation = useMutation(deleteSupplier, {
    onSuccess: () => {
      actionRef.current?.reload();
      message.success("Supplier deleted successfully");
    },
    onError: () => message.error("Failed to delete supplier"),
  });

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => [
      <Tooltip key="edit" title="Edit">
        <AddProSupplierModal
          edit={true}
          actionRef={actionRef}
          data={record}
        />
      </Tooltip>,
     <Popconfirm
        title="Are you sure you want to delete this supplier?"
        onConfirm={() => DeleteSupplierMutation.mutate(record._id)}
        okText="Yes"
        cancelText="No"
      >
        <Tag color="error" key={record._id} style={{ cursor: "pointer" }}>
          <DeleteOutlined />
           Delete
        </Tag>
      </Popconfirm>,
    ],
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
            title: "Supplier",
            dataIndex: "name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter Supplier name",
            },

            render: (text, record) => (
              <div style={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  src={record.avatar}
                />
                <span style={{ marginLeft: "8px" }}>{text}</span>
              </div>
            ),
          },
          {
            title: "Email",
            dataIndex: "email",
            hideInSearch: false,
            copyable: true,
            ellipsis: true,
            fieldProps: {
              placeholder: "Enter Supplier email",
            },

            render: (text) => (
              <div style={{ display: "flex", alignItems: "center" }}>
                <MailOutlined />
                <span style={{ marginLeft: "8px" }}>{text}</span>
              </div>
            ),
          },
          {
            title: "Phone",
            dataIndex: "phone",
            hideInSearch: true,
            ellipsis: true,
            render: (text) => (
              <div style={{ display: "flex", alignItems: "center" }}>
                <PhoneOutlined />
                <span style={{ marginLeft: "8px" }}>{text}</span>
              </div>
            ),
          },
          actionColumn,
        ]}
        request={async (params) => {
          const data = await fetchAllSuppliers(params);
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
          searchText: "Search Supplier",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        // expandable={{
        //   expandedRowRender: (record: DataType) => <p>{record.email}</p>,
        // }}
        dateFormatter="string"
        headerTitle="List of Suppliers"
        toolBarRender={() => [
          <AddProSupplierModal
            edit={false}
            actionRef={actionRef}
          />,
        ]}
      />

    </>
  );
};

export default SupplierTable;
