import { useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from "@mui/material";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { Avatar, Badge, Tag, Tooltip } from "antd/lib";
import { Button, Space } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { UserOutlined } from "@ant-design/icons";
import { MailOutlined } from "@mui/icons-material";
import { fetchAllUsersList } from "@services/users";
import ExpandedRowContent from "./ExpandedRowContent";
import AddEditProUserModal from "@components/MODALS/pro/AddEditProUserModal";
import useUserSettings from "../hooks/useUserSettings";
import { User } from "src/interfaces/User";
import { useAppSelector } from "src/store";

const UsersTable = () => {
  const { user } = useAppSelector((state) => state.auth);

  const onDeleteCandidate = (_user: User) => {
    // Handle any logic needed when a category is deleted
  };

  const {
    deleteConfirmationOpen,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    deleteCandidate,
  } = useUserSettings({ onDeleteCandidate });

  const actionRef = useRef<ActionType>();

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
            user?.name === record?.username ? "Not Allowed" : "Delete this user"
          }
        >
          <Button
            type="link"
            danger
            disabled={user?.name === record?.username}
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteClick(record)}
          />
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
        // headerTitle="List of Users"
        toolBarRender={() => [<AddEditProUserModal actionRef={actionRef} />]}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmationOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this user?
            <i>{deleteCandidate ? deleteCandidate.name : ""} </i>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleDeleteConfirm(actionRef)} danger>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UsersTable;
