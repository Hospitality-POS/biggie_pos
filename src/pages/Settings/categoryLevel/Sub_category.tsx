import { useRef } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button, Space, message, Popconfirm } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { deleteSubCategory, fetchSubCategories } from "@services/categories";
import useCategorySettings from "../hooks/useCategorySettings";
import SubCategoryModal from "@components/MODALS/pro/SubCategoryModal";
import { useMutation } from "@tanstack/react-query";
import { useAppSelector } from "src/store";

const SubCategorySettings = () => {
  const actionRef = useRef<ActionType>();
  const DeleteSubCategoryMutation = useMutation(deleteSubCategory, {
    onSuccess: () => {
      actionRef.current?.reload();
      message.success("Sub-Category deleted successfully");
    },
    onError: () => message.error("Failed to delete sub-category"),
  });

  const { user } = useAppSelector((state) => state.auth);
  const isAdminOrCashier = user?.role === "admin" || user?.role === "cashier";

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record) => [
      <Space>
        <Tooltip key="edit" title="Edit">
          <SubCategoryModal data={record} edit={true} actionRef={actionRef} />
        </Tooltip>

        <Popconfirm
          title="Are you sure you want to delete this sub-category?"
          onConfirm={() => DeleteSubCategoryMutation.mutate(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button size="small" disabled={!isAdminOrCashier} type="primary" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      </Space>,
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
            <div>{`Showing ${range[0]}-${range[1]} of ${total} total sub-category`}</div>
          ),
        }}
        columns={[
          {
            title: "Sub-category",
            dataIndex: "name",
            key: "name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter sub-category name",
            },
          },
          {
            title: "Main-category",
            dataIndex: ["main_category", "name"],
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter main-category name",
            },
          },
          actionColumn,
        ]}
        request={async (params) => {
          const data = await fetchSubCategories(params);
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
        options={{
          fullScreen: true,
        }}
        rowSelection={{
          alwaysShowAlert: false,
          selections: false,
        }}
        search={{
          searchText: "Search sub-category",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        headerTitle="List of sub-categories"
        toolBarRender={() => [<SubCategoryModal actionRef={actionRef} />]}
      />
    </>
  );
};

export default SubCategorySettings;
