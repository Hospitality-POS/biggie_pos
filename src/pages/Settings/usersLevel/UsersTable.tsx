import { useRef } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { Avatar, Badge, Tag, Tooltip } from "antd/lib";
import { Button, message, Popconfirm, Space } from "antd";
import {
  DeleteOutlined,
  ShopOutlined,
  UserOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { MailOutlined } from "@mui/icons-material";
import { deleteUserById, fetchAllUsersList, updateUserStatus } from "@services/users";
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

  const updateStatusMutation = useMutation(
    ({ id, status }: { id: string; status: "Active" | "Suspended" | "Terminated" }) =>
      updateUserStatus(id, status),
    {
      onSuccess: () => actionRef.current?.reload(),
      onError: () => { },
    }
  );

  const statusConfig: Record<string, { badge: "success" | "warning" | "error"; label: string }> = {
    Active: { badge: "success", label: "Active" },
    Suspended: { badge: "warning", label: "Suspended" },
    Terminated: { badge: "error", label: "Terminated" },
  };

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_: any, record: any) => {
      const isAdminRole = record?.role?.role_type?.toLowerCase() === "admin";
      const currentStatus = record?.status || "Active";
      const isLoading = updateStatusMutation.isLoading;

      return (
        <Space size="small" wrap>
          <Tooltip title="Edit">
            <AddEditProUserModal edit data={record} actionRef={actionRef} />
          </Tooltip>

          {currentStatus === "Active" && (
            <Tooltip title="Suspend user — they will not be able to log in">
              <Popconfirm
                title="Suspend this user?"
                description="They will not be able to log in until reactivated."
                onConfirm={() => updateStatusMutation.mutate({ id: record._id, status: "Suspended" })}
                okText="Suspend"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="default"
                  icon={<StopOutlined />}
                  size="small"
                  loading={isLoading}
                  style={{ color: "#faad14", borderColor: "#faad14" }}
                >
                  Suspend
                </Button>
              </Popconfirm>
            </Tooltip>
          )}

          {currentStatus === "Suspended" && (
            <Tooltip title="Reactivate user — restore login access">
              <Popconfirm
                title="Reactivate this user?"
                description="They will be able to log in again."
                onConfirm={() => updateStatusMutation.mutate({ id: record._id, status: "Active" })}
                okText="Reactivate"
                cancelText="Cancel"
                okButtonProps={{ style: { backgroundColor: "#52c41a", borderColor: "#52c41a" } }}
              >
                <Button
                  type="default"
                  icon={<CheckCircleOutlined />}
                  size="small"
                  loading={isLoading}
                  style={{ color: "#52c41a", borderColor: "#52c41a" }}
                >
                  Reactivate
                </Button>
              </Popconfirm>
            </Tooltip>
          )}

          {currentStatus === "Terminated" && (
            <Tooltip title="Reinstate user — restore login access">
              <Popconfirm
                title="Reinstate this terminated user?"
                description="Their account will be set back to Active and they can log in again."
                onConfirm={() => updateStatusMutation.mutate({ id: record._id, status: "Active" })}
                okText="Reinstate"
                cancelText="Cancel"
                okButtonProps={{ style: { backgroundColor: "#52c41a", borderColor: "#52c41a" } }}
              >
                <Button
                  type="default"
                  icon={<CheckCircleOutlined />}
                  size="small"
                  loading={isLoading}
                  style={{ color: "#52c41a", borderColor: "#52c41a" }}
                >
                  Reinstate
                </Button>
              </Popconfirm>
            </Tooltip>
          )}

          {currentStatus !== "Terminated" && (
            <Tooltip title="Terminate user permanently">
              <Popconfirm
                title="Terminate this user?"
                description={
                  <span style={{ color: "#ff4d4f" }}>
                    This will block all login access. You can reinstate them later if needed.
                  </span>
                }
                onConfirm={() => updateStatusMutation.mutate({ id: record._id, status: "Terminated" })}
                okText="Terminate"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="primary"
                  danger
                  icon={<CloseCircleOutlined />}
                  size="small"
                  loading={isLoading}
                >
                  Terminate
                </Button>
              </Popconfirm>
            </Tooltip>
          )}

          {isAdminRole ? (
            <Tooltip title="Deletion not allowed for admin">
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
            <Tooltip title="Delete user permanently">
              <Popconfirm
                title="Delete this user?"
                description="This action cannot be undone."
                onConfirm={() => deleteUserMutation.mutate(record._id)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="primary"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  loading={deleteUserMutation.isLoading}
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

  const expandedRowRender = (record: any) => <ExpandedRowContent record={record} />;

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
            fieldProps: { placeholder: "Enter User's name" },
            render: (text, record) => (
              <div style={{ display: "flex", alignItems: "center" }}>
                <Avatar size="small" icon={<UserOutlined />} src={record.avatar} />
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
            fieldProps: { placeholder: "Enter user's email" },
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
            fieldProps: { placeholder: "Enter Branch name" },
            render: (shop, record) => {
              const isAdminRole = record?.role?.role_type?.toLowerCase() === "admin";
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
            hideInSearch: false,
            valueType: "select",
            valueEnum: {
              Active: { text: "Active", status: "Success" },
              Suspended: { text: "Suspended", status: "Warning" },
              Terminated: { text: "Terminated", status: "Error" },
            },
            fieldProps: { placeholder: "Filter by status" },
            render: (_, record) => {
              const status = record?.status || "Active";
              const config = statusConfig[status] || statusConfig.Active;
              return <Badge status={config.badge} text={config.label} />;
            },
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
        options={{ fullScreen: true }}
        tableAlertRender={({ selectedRowKeys }) => (
          <p>You have selected {selectedRowKeys.length}</p>
        )}
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