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
import { fetchAllInventory } from "@services/inventory";
import { useProductInventorySettings } from "../hooks/useProductInventorySettings";
import AddEditProInventoryModal from "@components/MODALS/pro/AddEditProInventoryModal";

const  InventorySettings= () => {
  const paymentRef = useRef<ActionType>();
  const {
     handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    deleteConfirmationOpen,
    deleteCandidate,
    handleAddInventory
  } = useProductInventorySettings();


  

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
            title: "code",
            dataIndex: "code",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter Code",
            },
          },
          {
            title: "Name",
            dataIndex: "name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter Product Name",
            },
          },
          {
            title: "Price",
            dataIndex: "price",
            hideInSearch: true,
            valueType: "money"
          },
           {
            title: "Quantity",
            dataIndex: "quantity", 
            hideInSearch: true,
            valueType: "digit"
          },
         
          actionColumn,
        ]}
        request={async (param) => {
          const data = await fetchAllInventory(param);
          // console.log(data);          
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
        headerTitle="List of Product Inventory"
        toolBarRender={() => [
          <AddEditProInventoryModal
            actionRef={paymentRef}
            onAddInventory={handleAddInventory}
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
          Are you sure you want to delete the inventory for :{" "}
          <i>{deleteCandidate ? deleteCandidate?.name : ""}</i> product.
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={async() => await handleDeleteConfirm(paymentRef)} danger>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InventorySettings;