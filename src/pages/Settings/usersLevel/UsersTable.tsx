import { useRef } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { Avatar, Badge, Tag, Tooltip } from "antd/lib";
import { Button, message, Popconfirm, Space } from "antd";
import { DeleteOutlined, ShopOutlined, UserOutlined } from "@ant-design/icons";
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
    render: (_, record: any) => {
      const isAdminRole = record?.role?.role_type?.toLowerCase() === "admin";

      return (
        <Space size="middle">
          <Tooltip key="edit" title="Edit">
            <AddEditProUserModal edit data={record} actionRef={actionRef} />
          </Tooltip>

          {isAdminRole ? (
            <Tooltip key="delete" title="Deletion not allowed for admin">
              <Button
                type="primary"
                danger
                icon={<DeleteOutlined />}
                size="small"
                disabled
              >
                Delete
              </Button>
            </Tooltip>
          ) : (
            <Tooltip key="delete" title="Delete User">
              <Popconfirm
                title="Are you sure you want to delete this user?"
                onConfirm={() => deleteUserMutation.mutate(record._id)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="primary"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                >
                  Delete
                </Button>
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      );
    },
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
            title: "Staff name",
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
            title: "Staff email",
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
                icon={<UserOutlined />}
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
            title: "Shop",
            dataIndex: ["shop_id", "name"],
            hideInSearch: false,
            search: false,
            fieldProps: {
              placeholder: "Enter Branch name",
            },
            render: (shop, record) => {
              const isAdminRole =
                record?.role?.role_type?.toLowerCase() === "admin";
              return (
                <Space>
                  <ShopOutlined />
                  {isAdminRole ? "N/A" : shop}
                </Space>
              );
            },
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
          const filteredData = data.filter((item: any) => {
            if (user?.isAdmin && user?.id) {
              return item._id !== user.id;
            }
            return true;
          });
          return {
            data: filteredData,
            success: true,
            total: filteredData.length,
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
        headerTitle="List of All Staff"
        toolBarRender={() => [<AddEditProUserModal actionRef={actionRef} />]}
      />
    </>
  );
};

export default UsersTable;
