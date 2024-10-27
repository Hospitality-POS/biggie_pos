import { useRef } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button, Space, Popconfirm, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { delLocation, getTableLocation } from "@services/tables";
import AddProTableLocationModal from "@components/MODALS/pro/AddProTableLocationModal";
import { useMutation } from "@tanstack/react-query";

const TableLocationSettings = () => {
  const locationRef = useRef<ActionType>();

  const DeleteLocationMutation = useMutation(delLocation, {
    onSuccess: () => {
      locationRef.current?.reload();
      message.success("Location deleted successfully");
    },
    onError: () => message.error("Failed to delete location"),
  });
  
  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_, record: any) => [
      <Space>
        <Tooltip key="edit" title="Edit">
          <Tooltip key="edit" title="Edit">
            <AddProTableLocationModal
              edit={true}
              actionRef={locationRef}
              data={record}
            />
          </Tooltip>
        </Tooltip>
        <Popconfirm
          title="Are you sure you want to delete this location?"
          onConfirm={() => DeleteLocationMutation.mutate(record._id)}
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
          showQuickJumper: false,
          showTotal: (total, range) => (
            <div>{`Showing ${range[0]}-${range[1]} of ${total} total items`}</div>
          ),
        }}
        columns={[
          {
            title: "Table Location",
            dataIndex: "name",
            key: "name",
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
        options={{
          fullScreen: true,
        }}
        dateFormatter="string"
        headerTitle="List of Table Locations"
        toolBarRender={() => [
          <AddProTableLocationModal
            actionRef={locationRef}
          />,
        ]}
      />
    </>
  );
};

export default TableLocationSettings;
