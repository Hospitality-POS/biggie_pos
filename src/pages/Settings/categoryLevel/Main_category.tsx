import { useRef } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button, Space, Popconfirm, Switch, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { deleteMainCategory, fetchMainCategories, editMainCategory } from "@services/categories";
import MainCategoryModal from "@components/MODALS/pro/MainCategoryModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "src/store";

const MainCategorySettings = () => {
  const actionRef = useRef<ActionType>();
  const queryClient = useQueryClient();

  const DeleteMainCategoryMutation = useMutation(deleteMainCategory, {
    onSuccess: () => {
      actionRef.current?.reload();
      message.success("Main-Category deleted successfully");
    },
    onError: () => message.error("Failed to delete main-category"),
  });

  const togglePosMutation = useMutation(editMainCategory, {
    onSuccess: () => {
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ["Maincategories"] });
    },
    onError: () => message.error("Failed to update POS visibility"),
  });

  const { user } = useAppSelector((state) => state.auth);
  const isAdminOrCashier = user?.role === "admin" || user?.role === "cashier";

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => [
      <Space>
        <Tooltip key="edit" title="Edit">
          <MainCategoryModal actionRef={actionRef} data={record} edit={true} />
        </Tooltip>
        <Popconfirm
          title="Are you sure you want to delete this main-category?"
          onConfirm={() => DeleteMainCategoryMutation.mutate(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="primary" disabled={!isAdminOrCashier} danger icon={<DeleteOutlined />} size="small">
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
        columns={[
          {
            title: "Main-Category",
            key: "name",
            dataIndex: "name",
            hideInSearch: false,
            fieldProps: {
              placeholder: "Enter Main-Category name",
            },
          },
          {
            title: "Show on POS",
            key: "list_on_pos",
            dataIndex: "list_on_pos",
            hideInSearch: true,
            render: (_, record: any) => (
              <Tooltip title={record.list_on_pos === false ? "Hidden on POS — click to show" : "Listed on POS — click to hide"}>
                <Switch
                  size="small"
                  checked={record.list_on_pos !== false}
                  loading={togglePosMutation.isLoading && togglePosMutation.variables?._id === record._id}
                  onChange={(checked) =>
                    togglePosMutation.mutate({
                      _id: record._id,
                      values: { name: record.name, list_on_pos: checked },
                    })
                  }
                />
              </Tooltip>
            ),
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
        actionRef={actionRef}
        options={{
          fullScreen: true,
        }}
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
        headerTitle="List of Main Categories"
        toolBarRender={() => [<MainCategoryModal actionRef={actionRef} />]}
      />
    </>
  );
};

export default MainCategorySettings;
