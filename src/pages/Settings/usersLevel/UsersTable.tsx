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
      </Space>,
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
            title: "Name",
            dataIndex: "fullname",
            key: "fullname",
            hideInSearch: false,
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
            copyable: true,
            ellipsis: true,
            render: (text) => (
              <div style={{ display: "flex", alignItems: "center" }}>
                <MailOutlined />
                <span style={{ marginLeft: "8px" }}>{text}</span>
              </div>
            ),
          },
          {
            title: "Role",
            search: false,
            dataIndex: ["role", "role_type"],
            render: (text) => (
              <Tag color={text === "admin" ? "red-inverse" : "processing"}>
                {text}
              </Tag>
            ),
          },
          {
            title: "Status",
            search: false,
            dataIndex: "status",
            render: (status) => (
              <Badge
                status={status === "Active" ? "success" : "error"}
                text={status}
              />
            ),
          },
          actionColumn,
        ]}
        request={async (params) => {
          const data = await fetchAllUsersList(params);
          return { data, success: true, total: data.length };
        }}
        options={{ fullScreen: true }}
        actionRef={actionRef}
        expandable={{
          expandedRowRender: (record) => <ExpandedRowContent record={record} />,
        }}
        dateFormatter="string"
        headerTitle="List of All Users"
      />
    </>
  );
};

export default UsersTable;

