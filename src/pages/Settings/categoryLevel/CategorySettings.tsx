import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import { ActionType, ProFormText, ProTable } from "@ant-design/pro-components";
import { fetchAllCategories } from "../../../services/categories";
import AddProCategoryDialog from "../../../components/MODALS/Dialogs/AddProCategoryModal";
import { Tooltip, Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import useCategorySettings from "../hooks/useCategorySettings";

const CategorySettings = () => {
  const actionRef = useRef<ActionType>()
  const onDeleteCandidate = (category: any) => {
    // Handle any logic needed when a category is deleted
  };

  const {
    deleteConfirmationOpen,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    deleteCandidate,
    loading,
    addCategoryDialogOpen,
    setAddCategoryDialogOpen
  } = useCategorySettings({ onDeleteCandidate });

  const handleAddCategory = () => {
    // You can update your state or perform any necessary actions here
    // For example, you can add the newCategory to your existing categories
    // and update the table accordingly.
  };
  const handleEditClick = (record: React.SetStateAction<null>) => {
    console.log(record);
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
          onClick={() => handleEditClick(record)}
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
        loading={loading}
        columns={[
          {
            title: "Name",
            dataIndex: "name",
            hideInSearch: false,

            renderFormItem: () => {
              return (
                <ProFormText
                  width={"md"}
                  name={"name"}
                  placeholder={"Search Name"}
                />
              );
            },
          },
          {
            title: "Subcategory",
            dataIndex: ["sub_category", "name"],
            hideInSearch: false,

            renderFormItem: () => {
              return (
                <ProFormText
                  width={"md"}
                  name={["sub_category", "name"]}
                  placeholder={"Search subcategory"}
                />
              );
            },
          },
          actionColumn,
        ]}
        request={async () => {
          const data = await fetchAllCategories();
          // console.log("========", data);
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
          searchText: "Search Category",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        headerTitle="List of categories"
        toolBarRender={() => [
          <AddProCategoryDialog
            open={addCategoryDialogOpen}
            onClose={() => setAddCategoryDialogOpen(false)}
            onAddCategory={handleAddCategory}
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
          <i>{deleteCandidate ? deleteCandidate.name : ""} </i>the category
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={()=>handleDeleteConfirm(actionRef)} danger>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CategorySettings;
