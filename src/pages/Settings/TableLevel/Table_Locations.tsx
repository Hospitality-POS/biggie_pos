import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import { ActionType, ProFormText, ProTable } from "@ant-design/pro-components";
import { fetchAllCategories } from "../../../services/categories";
import AddProCategoryDialog from "../../../components/MODALS/Dialogs/pro/AddProCategoryModal";
import { Tooltip, Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import useCategorySettings from "../hooks/useCategorySettings";
import {
  fetchAllTableLocation,
  fetchAllTables,
} from "../../../services/tables";
import AddNewTableLocationDialog from "../../../components/MODALS/Dialogs/AddNewTableLocation";
import { useAppDispatch } from "../../../store";

const TableLocationSettings = () => {
  const [addLocationDialogOpen, setAddLocationDialogOpen] = useState(false);

  const dispatch = useAppDispatch()

  const handleOpenAddLocationDialog = () => {
    setAddLocationDialogOpen(true);
  };
  const actionRef = useRef<ActionType>();
  const onDeleteCandidate = (category: any) => {
    // Handle any logic needed when a category is deleted
  };


   const handleAddLocation = (newLocation: string) => {
    dispatch(createLocation(newLocation));
    // console.log("New Location:", newLocation);
    // You can update your state or perform any other actions here
  };


//   const handleEditClick = (record: React.SetStateAction<null>) => {
//     console.log(record);
//   };

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
        //   onClick={() => handleDeleteClick(record)}
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
            title: "Table Location",
            dataIndex: "name",
            hideInSearch: false,

            renderFormItem: () => {
              return (
                <ProFormText
                  width={"md"}
                  name={"location"}
                  placeholder={"Search Table Location"}
                />
              );
            },
          },
          actionColumn,
        ]}
        request={async (params) => {
          const data = await fetchAllTableLocation(params);
          // console.log("========", data);
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
        search={{
          searchText: "Search Table Location",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        headerTitle="List of Table Locations"
        toolBarRender={() => [
            // <AddProCategoryDialog
            //   open={addCategoryDialogOpen}
            //   onClose={() => setAddCategoryDialogOpen(false)}
            //   onAddCategory={handleAddCategory}
            //   actionRef={actionRef}
            // />,
          <AddNewTableLocationDialog
            open={addLocationDialogOpen}
            onClose={() => setAddLocationDialogOpen(false)}
            onAddLocation={handleAddLocation}
          />,
        ]}
      />

      {/* Delete Confirmation Dialog */}
      {/* <Dialog
        // open={deleteConfirmationOpen}
        // onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete :{" "}
          <i>{deleteCandidate ? deleteCandidate.name : ""} </i>the category
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleDeleteConfirm(actionRef)} danger>
            Delete
          </Button>
        </DialogActions>
      </Dialog> */}
    </>
  );
};

export default TableLocationSettings;
