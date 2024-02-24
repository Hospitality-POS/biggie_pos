import { useRef } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { getTableLocation } from "@services/tables";
import { useTableLocationSettings } from "../hooks/useTableSettings";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,          
} from "@mui/material";
import AddProTableLocationModal from "@components/MODALS/pro/AddProTableLocationModal";
import { fetchMainCategories, fetchSubCategories } from "@services/categories";

const MainCategorySettings = () => {
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
          //   onClick={() => handleDeleteClickSubCategory(record)}
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
            title: "Main-Category",
            dataIndex: "name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter Main-Category name",
            },
          },
          actionColumn,
        ]}
        request={async () => {
          const data = await fetchMainCategories();
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
          searchText: "Search Main-Category",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        headerTitle="List of Main-Category"
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
          <Button
            onClick={() => handleDeleteConfirmLocation(locationRef)}
            danger
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MainCategorySettings;
