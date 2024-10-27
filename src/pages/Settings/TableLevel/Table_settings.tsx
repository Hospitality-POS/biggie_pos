import { useRef } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button, Space, Popconfirm, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { deleteTable, getAllTables } from "@services/tables";
import { Badge } from "antd/lib";
import AddEditProTableModal from "@components/MODALS/pro/AddEditProTableModal";
import { useMutation } from "@tanstack/react-query";

const TableSetting = () => {
  const tableRef = useRef<ActionType>();

  const DeleteTableMutation = useMutation(deleteTable, {
    onSuccess: () => {
      tableRef.current?.reload();
      message.success("Table deleted successfully");
    },
    onError: () => message.error("Failed to delete table"),
  });

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => [
      <Space>
        <Tooltip key="edit" title="Edit">
          <AddEditProTableModal
            edit={true}
            actionRef={tableRef}
            data={record}
          />
        </Tooltip>
        <Popconfirm
          title="Are you sure you want to delete this table?"
          onConfirm={() => DeleteTableMutation.mutate(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button size="small" type="primary" danger icon={<DeleteOutlined />}>
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
          showQuickJumper: true,
          showSizeChanger: true,
          showTotal: (total, range) => (
            <div>{`Showing ${range[0]}-${range[1]} of ${total} total tables`}</div>
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
            valueType: "money",
            render: (_, record) => {
              return `Ksh. ${record?.cart_amount?.toLocaleString()}`;
            },
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
        options={{
          fullScreen: true,
        }}
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
        headerTitle="List of Tables"
        toolBarRender={() => [
          <AddEditProTableModal edit={false} actionRef={tableRef} />,
        ]}
      />
    </>
  );
};

export default TableSetting;
