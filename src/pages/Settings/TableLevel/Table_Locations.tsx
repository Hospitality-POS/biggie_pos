import { useRef } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  getTableLocation,
} from "@services/tables";
import { useTableLocationSettings } from "../hooks/useTableSettings";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import AddProTableLocationModal from "@components/MODALS/pro/AddProTableLocationModal";

const TableLocationSettings = () => {
  const locationRef = useRef<ActionType>();

  const {
    deleteCandidate,
    handleAddLocation,
    deleteConfirmationOpen,
    handleDeleteClickLocation,
    handleEditLocation,
    handleDeleteConfirmLocation,
    handleDeleteCancel,
  } = useTableLocationSettings();

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => [
      <Tooltip key="edit" title="Edit">
        <Tooltip key="edit" title="Edit">
          <AddProTableLocationModal
            edit={true}
            actionRef={locationRef}
            data={record}
          />
        </Tooltip>
        
      </Tooltip>,
      <Tooltip key="delete" title="Delete">
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteClickLocation(record)}
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
            title: "Table Location",
            dataIndex: "name",
            key:"name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter location name",
            },
          },
          actionColumn,
        ]}
        request={async (params) => {
          const data = await getTableLocation(params);
          return {
            data: data,
            success: true,
            total: data.length,
          };
        }}
        tableAlertRender={({ selectedRowKeys }) => {
          return <p>You have selected {selectedRowKeys.length}</p>;
        }}
        actionRef={locationRef}
        rowSelection={{
          alwaysShowAlert: false,
          selections: false,
        }}
        search={{
          searchText: "Search Table Location",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        // headerTitle="List of Table Locations"
        toolBarRender={() => [
          <AddProTableLocationModal
            onAddLocation={handleAddLocation}
            actionRef={locationRef}
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
          Are you sure you want to delete Loaction:{" "}
          <i>{deleteCandidate ? deleteCandidate.name : ""} </i>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleDeleteConfirmLocation(locationRef)} danger>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TableLocationSettings;
