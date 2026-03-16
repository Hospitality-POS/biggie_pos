import { useRef } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { Avatar, Button, message, Popconfirm, Space, Tooltip } from "antd";
import {
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { deleteSupplier, fetchAllSuppliers } from "@services/supplier";
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
    render: (_: any, record: any) => (
      <Space>
        <Tooltip title="Edit">
          <AddProSupplierModal edit={true} actionRef={actionRef} data={record} />
        </Tooltip>
        <Popconfirm
          title="Are you sure you want to delete this supplier?"
          onConfirm={() => DeleteSupplierMutation.mutate(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="primary" danger icon={<DeleteOutlined />} size="small">
            Delete
          </Button>
        </Popconfirm>
      </Space>
    ),
  };

  return (
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
          fieldProps: { placeholder: "Enter Supplier name" },
          render: (text: any, record: any) => (
            <Space>
              <Avatar size="small" icon={<UserOutlined />} src={record.avatar} />
              <span>{text}</span>
            </Space>
          ),
        },
        {
          title: "Email",
          dataIndex: "email",
          hideInSearch: false,
          copyable: true,
          ellipsis: true,
          fieldProps: { placeholder: "Enter Supplier email" },
          render: (text: any) => (
            <Space>
              <MailOutlined style={{ color: "#94a3b8" }} />
              <span>{text}</span>
            </Space>
          ),
        },
        {
          title: "Phone",
          dataIndex: "phone",
          hideInSearch: true,
          ellipsis: true,
          render: (text: any) => (
            <Space>
              <PhoneOutlined style={{ color: "#94a3b8" }} />
              <span>{text}</span>
            </Space>
          ),
        },
        actionColumn,
      ]}
      request={async (params) => {
        const data = await fetchAllSuppliers(params);
        return { data, success: true, total: data.length };
      }}
      tableAlertRender={({ selectedRowKeys }: any) => (
        <span>You have selected {selectedRowKeys.length}</span>
      )}
      actionRef={actionRef}
      rowSelection={{ alwaysShowAlert: false, selections: false }}
      scroll={{ x: "max-content" }}
      search={{
        searchText: "Search Supplier",
        resetText: "Reset",
        labelWidth: "auto",
      }}
      dateFormatter="string"
      headerTitle="List of Suppliers"
      toolBarRender={() => [
        <AddProSupplierModal key="add" edit={false} actionRef={actionRef} />,
      ]}
    />
  );
};

export default SupplierTable;