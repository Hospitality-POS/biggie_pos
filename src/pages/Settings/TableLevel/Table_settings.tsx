import { useRef, useState } from "react";

import { ActionType, ProFormText, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { getAllTables } from "../../../services/tables";
import AddNewTableLocationDialog from "../../../components/MODALS/Dialogs/AddNewTableLocation";
import { useTableSettings } from "../hooks/useTableSettings";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import AddProTableLocationModal from "../../../components/MODALS/pro/AddProTableLocationModal";
import { Badge } from "antd/lib";
import AddEditProTableModal from "../../../components/MODALS/pro/AddEditProTableModal";

const TableSetting = () => {
  const tableRef = useRef<ActionType>();

  const {
    handleAddTable,
    deleteCandidateTable,
    handleDeleteClick,
    handleEdit,
    handleDeleteConfirmTable,
    deleteConfirmationOpenTable,
    handleDeleteCancel,
  } = useTableSettings();

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => [
      <Tooltip key="edit" title="Edit">
        <Button
          type="link"
          icon={<EditOutlined style={{ color: "#6c1c2c" }} />}
          // onClick={() => handleEditLocation(record)}
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
            title: "Table",
            dataIndex: "name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter table name",
            },
          },
          {
            title: "Located At",
            dataIndex: "locatedAt",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter table location name",
            },
          },
          {
            title: "status",
            dataIndex: "isOccupied",
            hideInSearch: true,
            render: (status) => (
              <Badge
                status={status ? "error" : "success"}
                text={status ? "Occupied" : "Vacant"}
              />
            ),
          },
          {
            title: "Amount",
            dataIndex: "cart_amount",
            hideInSearch: true,
            valueType: "money"
          },
          {
            title: "Served By",
            dataIndex: "served_by",
            hideInSearch: true,
          },
          actionColumn,
        ]}
        request={async (params) => {
          const data = await getAllTables(params);
        //   console.log(data);
          return {
            data: data,
            success: true,
            total: data.length,
          };
        }}
        tableAlertRender={({ selectedRowKeys }) => {
          return <p>You have selected {selectedRowKeys.length}</p>;
        }}
        actionRef={tableRef}
        rowSelection={{
          alwaysShowAlert: false,
          selections: false,
        }}
        search={{
          searchText: "Search Table",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        headerTitle="List of Table Locations"
        toolBarRender={() => [
          <AddEditProTableModal
            onAddTable={handleAddTable}
            actionRef={tableRef}
          />,
        ]}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmationOpenTable}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete Table:{" "}
          <i>{deleteCandidateTable ? deleteCandidateTable.name : ""} </i>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleDeleteConfirmTable(tableRef)} danger>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TableSetting;
