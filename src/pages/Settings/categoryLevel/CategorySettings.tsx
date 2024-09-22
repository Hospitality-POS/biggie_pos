import { useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { fetchAllCategories } from "@services/categories";
import { Tooltip, Button, Space } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import useCategorySettings from "../hooks/useCategorySettings";
import AddProCategoryModal from "@components/MODALS/pro/AddProCategoryModal";

const CategorySettings = () => {
  const actionRef = useRef<ActionType>();

  const {
    deleteConfirmationOpen,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    deleteCandidate,
  } = useCategorySettings({ type:"category" });

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record) => [      
      <Space>
        <Tooltip key="edit" title="Edit">
          <AddProCategoryModal
            edit={true}
            actionRef={actionRef}
            data={record}
          />
        </Tooltip>
        
        <Tooltip key="delete" title="Delete">
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteClick(record)}
          >Delete</Button>
        </Tooltip>
      </Space>,
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
        cardBordered
        columns={[
          {
            title: "Category",
            key: "name",
            dataIndex: "name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter category name",
            },
            ellipsis: true,
          },
          {
            title: "Subcategory",
            dataIndex: ["sub_category", "name"],
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter sub_category name",
            },
          },
          actionColumn,
        ]}
        request={async (param) => {
          const data = await fetchAllCategories(param);

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
        options={{
          fullScreen: true,
        }}
        dateFormatter="string"
        // headerTitle="List of categories"
        toolBarRender={() => [<AddProCategoryModal actionRef={actionRef} />]}
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
          <Button onClick={() => handleDeleteConfirm(actionRef)} danger>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CategorySettings;
