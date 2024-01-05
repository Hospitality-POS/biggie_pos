import { useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from "@mui/material";
import {
  ActionType,
  ProDescriptions,
  ProDescriptionsActionType,
  ProFormText,
  ProTable,
} from "@ant-design/pro-components";
import { Avatar, Badge, Space, Tag, Tooltip } from "antd/lib";
import { Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { fetchAllSuppliers } from "../../../services/supplier";
import { UserOutlined } from "@ant-design/icons";
import { MailOutlined, PhoneOutlined } from "@mui/icons-material";
import AddProSupplierModal from "../../../components/MODALS/pro/AddProSupplierModal";
import { useSupplierSettings } from "../hooks/useSuppliersettings";
import { fetchAllUsersList } from "../../../services/users";
import AddUserDialog from "../../../components/MODALS/Dialogs/AddUserDialog";
import { useAppDispatch } from "../../../store";
import { deleteUser, fetchUserById } from "../../../features/Auth/AuthActions";
import EditUserDialog from "../../../components/MODALS/Dialogs/EditUserDialog";
import { UserDescription } from "./UserDescription";

interface User {
  fullname: string;
  id: number;
  name: string;
  email: string;
  phone: number;
  role: string;
}

const UsersTable = () => {
  const [openAddUserDialog, setOpenAddUserDialog] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [openEditUserDialog, setOpenEditUserDialog] = useState(false);

  const actionRef = useRef<ActionType>();
  const actionRefD = useRef<ProDescriptionsActionType>();

  const dispatch = useAppDispatch();

  const handleDeleteUser = (userId: number) => {
    setOpenDeleteDialog(true);
    setSelectedUserId(userId);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedUserId(null);
  };

  const handleEditUser = (userId: string) => {
    console.log("user", userId);
    dispatch(fetchUserById(userId));
    setSelectedUser(userId);

    setOpenEditUserDialog(true);
  };

  const handleConfirmDelete = () => {
    if (selectedUserId !== null) {
      dispatch(deleteUser(selectedUserId));
      handleCloseDeleteDialog();
    }
  };

  const handleAddUser = () => {
    setOpenAddUserDialog(true);
  };

  // if (IsError) {
  //   setOpenAddUserDialog(true);
  // }
  const handleCloseAddUserDialog = () => {
    setOpenAddUserDialog(false);
  };

  const handleConfirmAddUser = () => {
    handleCloseAddUserDialog();
  };

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => [
      <Tooltip key="edit" title="Edit">
        <Button
          type="link"
          icon={<EditOutlined style={{ color: "#6c1c2c" }} />}
          onClick={() => handleEditUser(record._id)}
        />
      </Tooltip>,
      <Tooltip key="delete" title="Delete">
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteUser(record)}
        />
      </Tooltip>,
    ],
  };

  const expandedRowRender = (record) => {
    const { pin, username, createdAt, phone } = record;
    const formattedCreatedAt = new Date(createdAt).toLocaleString();

    const data = [
      {
        title: "Username",
        dataIndex: "username",
        value: username,
      },
      {
        title: "Pin",
        dataIndex: "pin",
        value: pin,
      },
      {
        title: "Phone No.",
        dataIndex: "phone",
        value: phone
      },
      {
        title: "Date created",
        dataIndex: "createdAt",
      },
    ];

    return (
      <ProDescriptions
        tooltip="Contains more infomation about the user"
        actionRef={actionRefD}
        layout="horizontal"
        title="Additional Information"
        dataSource={{ pin, username, createdAt: formattedCreatedAt, phone }}
        columns={data}
      />
    );
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
            title: "Email",
            dataIndex: "email",
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
            dataIndex: "isAdmin",
            hideInSearch: true,
            render: (text) => (
              <Tag color={text ? "success" : "processing"}>
                {text ? "admin" : "user"}
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
          searchText: "Search User",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        expandable={{
          expandedRowRender,
          defaultExpandAllRows: false,
          expandIconColumnIndex: 2,
          columnTitle: " ",
        }}
        dateFormatter="string"
        headerTitle="List of Users"
        toolBarRender={() => [
          <AddUserDialog
            open={openAddUserDialog}
            onClose={handleCloseAddUserDialog}
            onAddUser={(user) => {
              console.log(user);
            }}
          />,
          <EditUserDialog
            open={openEditUserDialog}
            onClose={() => setOpenEditUserDialog(false)}
            userId={selectedUser}
          />,
        ]}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this user?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} danger>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UsersTable;
