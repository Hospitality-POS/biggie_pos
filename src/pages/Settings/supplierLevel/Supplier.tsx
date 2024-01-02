import { useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { ActionType, ProFormText, ProTable } from "@ant-design/pro-components";
import { Avatar, Tooltip } from "antd/lib";
import { Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { fetchAllSuppliers } from "../../../services/supplier";
import { UserOutlined } from "@ant-design/icons";
import { MailOutlined, PhoneOutlined } from "@mui/icons-material";
import AddProSupplierModal from "../../../components/MODALS/Dialogs/pro/AddProSupplierModal";
import { useSupplierSettings } from "../hooks/useSuppliersettings";

const SupplierTable = () => {
  const actionRef = useRef<ActionType>();

  const {
    deleteConfirmationOpen,
    deleteCandidate,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleAddSupplier,
  } = useSupplierSettings();

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => [
      <Tooltip key="edit" title="Edit">
        <Button
          type="link"
          icon={<EditOutlined style={{ color: "#6c1c2c" }} />}
          //   onClick={() => handleEditClick(record)}
        />
      </Tooltip>,
      <Tooltip key="delete" title="Delete">
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteClick(record)}
        />
      </Tooltip>,
    ],
  };

  return (
    <>
      <ProTable
        rowKey="_id"
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
            renderFormItem: () => {
              return (
                <>
                  <ProFormText
                    width={"md"}
                    name={"name"}
                    placeholder={"Search Supplier"}
                  />
                </>
              );
            },
          },
          {
            title: "Email",
            dataIndex: "email",
            hideInSearch: false,
            copyable: true,
            ellipsis: true,
            render: (text) => (
              <div style={{ display: "flex", alignItems: "center" }}>
                <MailOutlined />
                <span style={{ marginLeft: "8px" }}>{text}</span>
              </div>
            ),
            renderFormItem: () => {
              return (
                <ProFormText
                  width={"md"}
                  name={"email"}
                  placeholder={"Search Supplier email"}
                />
              );
            },
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
          // console.log("========", params);
          // console.log(sorter, filter);
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
            onAddSupplier={handleAddSupplier}
            actionRef={actionRef}
          />,
        ]}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmationOpen}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete :{" "}
          <i>{deleteCandidate ? deleteCandidate.name : ""} </i>the supplier
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

export default SupplierTable;
