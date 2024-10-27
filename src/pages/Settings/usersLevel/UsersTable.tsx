import { useRef } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { Avatar, Badge, Tag, Tooltip } from "antd/lib";
import { Button, message, Popconfirm, Space } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { UserOutlined } from "@ant-design/icons";
import { MailOutlined } from "@mui/icons-material";
import { deleteUserById, fetchAllUsersList } from "@services/users";
import ExpandedRowContent from "./ExpandedRowContent";
import AddEditProUserModal from "@components/MODALS/pro/AddEditProUserModal";
import { useAppSelector } from "src/store";
import { useMutation } from "@tanstack/react-query";

const UsersTable = () => {
  const { user } = useAppSelector((state) => state.auth);

  const actionRef = useRef<ActionType>();

  const deleteUserMutation = useMutation(deleteUserById, {
    onSuccess: () => {
      actionRef.current?.reload();
      message.success("User deleted successfully");
    },
    onError: () => message.error("Failed to delete user"),
  });

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => [
      <Space>
        <Tooltip key="edit" title="Edit">
          <AddEditProUserModal
            edit={true}
            actionRef={actionRef}
            data={record}
          />
        </Tooltip>

        <Tooltip
          key="delete"
          placement="right"
          title={
            user?.name === record?.username ? "Not Allowed" : "Delete User"
          }
        >
          <Popconfirm
            title="Are you sure you want to delete this user?"
            onConfirm={() => deleteUserMutation.mutate(record._id)}
            disabled={user?.name === record?.username}
            okText="Yes"
            cancelText="No"
          >
            <Button type="primary" danger icon={<DeleteOutlined />} size="small">
              Delete
            </Button>
          </Popconfirm>
        </Tooltip>
      </Space>,
    ],
  };

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
            title: "Name",
            dataIndex: "fullname",
            key: "fullname",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter User's name",
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
            title: "User email",
            dataIndex: "email",
            key: "email",
            hideInSearch: false,
            copyable: true,
            ellipsis: true,
            fieldProps: {
              placeholder: "Enter user's email",
            },

            render: (text) => (
              <div style={{ display: "flex", alignItems: "center" }}>
                <MailOutlined />
                <span style={{ marginLeft: "8px" }}>{text}</span>
              </div>
            ),
          },

          {
            title: "Role",
            dataIndex: ["role", "role_type"],
            hideInSearch: true,
            render: (text) => (
              <Tag
                color={
                  text === "admin"
                    ? "red-inverse"
                    : text === "supervisor"
                    ? "gold-inverse"
                    : text === "waiter"
                    ? "cyan-inverse"
                    : "processing"
                }
              >
                {text}
              </Tag>
            ),
          },
          {
            title: "Status",
            dataIndex: "status",
            hideInSearch: true,
            render: (status) => (
              <Badge
                status={status === "Active" ? "success" : "error"}
                text={status === "Active" ? "Active" : "Suspended"}
              />
            ),
          },
          actionColumn,
        ]}
        request={async (params) => {
          const data = await fetchAllUsersList(params);
          console.log("======", params);

          return {
            data: data,
            success: true,
            total: data.length,
          };
        }}
        options={{
          fullScreen: true,
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
          searchText: "Search User",
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
        headerTitle="List of All Users"
        toolBarRender={() => [<AddEditProUserModal actionRef={actionRef} />]}
      />
    </>
  );
};

export default UsersTable;
