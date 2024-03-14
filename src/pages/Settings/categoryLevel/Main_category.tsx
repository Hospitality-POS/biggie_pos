import { useRef } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,          
} from "@mui/material";
import { fetchMainCategories } from "@services/categories";
import useCategorySettings from "../hooks/useCategorySettings";

const MainCategorySettings = () => {
  const refmain = useRef<ActionType>();
const {
  deleteConfirmationOpen,
  handleDeleteClick,
  handleDeleteConfirm,
  handleDeleteCancel,
  deleteCandidate,
} = useCategorySettings({ type: "main-category" });

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
            title: "Main-Category",
            key:"main--categ",
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
        actionRef={refmain}
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
        toolBarRender={() => []}
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
          <i>{deleteCandidate ? deleteCandidate.name : ""} main category </i>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleDeleteConfirm(refmain)} danger>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MainCategorySettings;
