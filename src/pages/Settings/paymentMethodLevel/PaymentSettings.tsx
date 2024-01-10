import { useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ActionType,
  ProCard,
  ProFormText,
  ProTable,
} from "@ant-design/pro-components";
import { Tooltip } from "antd/lib";
import { Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import usePaymentSettings from "../hooks/usePaymentSettings";
import AddProPaymentMethodSettingsModal from "@components/MODALS/pro/AddProPaymentSettingsModal";

const PaymentsMethodSettings = () => {
  const paymentRef = useRef<ActionType>();
  const {
    deleteCandidate,
    setDeleteCandidate,
    addPaymentSettingDialogOpen,
    setAddPaymentSettingDialogOpen,
    deleteConfirmationOpen,
    setDeleteConfirmationOpen,
    handleDeleteCancel,
    handleDeleteClick,
    handleOpenAddPaymentSettingDialog,
    handleAddPaymentSetting,
    handleDeleteConfirm,
  } = usePaymentSettings();

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
            title: "Method",
            dataIndex: "name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter payment method",
            },
          },

          actionColumn,
        ]}
        request={async (param) => {
          const data = await fetchAllPaymentMethods(param);

          return {
            data: data,
            success: true,
            total: data.length,
          };
        }}
        tableAlertRender={({ selectedRowKeys }) => {
          return <p>You have selected {selectedRowKeys.length}</p>;
        }}
        actionRef={paymentRef}
        rowSelection={{
          alwaysShowAlert: false,
          selections: false,
        }}
        search={{
          searchText: "Search Method",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        headerTitle="List of Payment Methods"
        toolBarRender={() => [
          <AddProPaymentMethodSettingsModal
            actionRef={paymentRef}
            onAddPaymentMethod={handleAddPaymentSetting}
          />,
        ]}
      />

      <Dialog
        open={deleteConfirmationOpen}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete:{" "}
          <i>{deleteCandidate ? deleteCandidate.name : ""}</i> the payment
          method
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleDeleteConfirm(paymentRef)} danger>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PaymentsMethodSettings;
