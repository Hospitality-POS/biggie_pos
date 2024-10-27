import { useRef } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { deleteCategory, fetchAllCategories } from "@services/categories";
import { Tooltip, Button, Space, Popconfirm, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import AddProCategoryModal from "@components/MODALS/pro/AddProCategoryModal";
import { useMutation } from "@tanstack/react-query";

const CategorySettings = () => {
  const actionRef = useRef<ActionType>();

  const DeleteCategoryMutation = useMutation(deleteCategory, {
    onSuccess: () => {
      actionRef.current?.reload();
      message.success("Category deleted successfully");
    },
    onError: () => message.error("Failed to delete category"),
  });

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

        <Popconfirm
          title="Are you sure you want to delete this category?"
          onConfirm={() => DeleteCategoryMutation.mutate(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            size="small"
            type="primary"
            danger
            icon={<DeleteOutlined />}
          >
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
        headerTitle="List of categories"
        toolBarRender={() => [<AddProCategoryModal actionRef={actionRef} />]}
      />
    </>
  );
};

export default CategorySettings;
