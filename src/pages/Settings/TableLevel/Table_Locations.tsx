import { useRef, useState } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button, Space, Popconfirm, message, Tag } from "antd";
import { DeleteOutlined, StopOutlined, CheckCircleOutlined } from "@ant-design/icons";
import {
  delLocation,
  getTableLocationIncludeDisabled,
  disableLocation,
  enableLocation,
} from "@services/tables";
import AddProTableLocationModal from "@components/MODALS/pro/AddProTableLocationModal";
import { useMutation } from "@tanstack/react-query";

const TableLocationSettings = () => {
  const locationRef = useRef<ActionType>();
  const [locationVersion, setLocationVersion] = useState(0);

  const DeleteLocationMutation = useMutation(delLocation, {
    onSuccess: () => {
      locationRef.current?.reload();
      message.success("Location deleted successfully");
    },
    onError: () => message.error("Failed to delete location"),
  });

  const DisableLocationMutation = useMutation(disableLocation, {
    onSuccess: () => {
      setLocationVersion(prev => prev + 1);
      message.success("Location disabled");
    },
    onError: () => message.error("Failed to disable location"),
  });

  const EnableLocationMutation = useMutation(enableLocation, {
    onSuccess: () => {
      setLocationVersion(prev => prev + 1);
      message.success("Location enabled");
    },
    onError: () => message.error("Failed to enable location"),
  });
  
  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_: any, record: any) => [
      <Space key="actions">
        <Tooltip key="edit" title="Edit">
          <AddProTableLocationModal edit={true} actionRef={locationRef} data={record} />
        </Tooltip>
        {record.isDisabled ? (
          <Popconfirm
            title="Enable this location? Its tables will reappear in the POS."
            onConfirm={() => EnableLocationMutation.mutate(record._id)}
            okText="Enable"
            cancelText="No"
          >
            <Button size="small" icon={<CheckCircleOutlined />} style={{ color: "#16a34a", borderColor: "#16a34a" }}>
              Enable
            </Button>
          </Popconfirm>
        ) : (
          <Popconfirm
            title="Disable this location? All its tables will be hidden from the POS."
            onConfirm={() => DisableLocationMutation.mutate(record._id)}
            okText="Disable"
            cancelText="No"
          >
            <Button size="small" icon={<StopOutlined />} style={{ color: "#d97706", borderColor: "#d97706" }}>
              Disable
            </Button>
          </Popconfirm>
        )}
        <Popconfirm
          title="Are you sure you want to delete this location?"
          onConfirm={() => DeleteLocationMutation.mutate(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button size="small" type="primary" danger icon={<DeleteOutlined />}>Delete</Button>
        </Popconfirm>
      </Space>,
    ],
  };

  return (
    <>
      <ProTable
        key={locationVersion}
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
          {
            title: "Status",
            dataIndex: "isDisabled",
            hideInSearch: true,
            render: (isDisabled: boolean) => (
              <Tag color={isDisabled ? "red" : "green"}>{isDisabled ? "Disabled" : "Active"}</Tag>
            ),
          },
          actionColumn,
        ]}
        request={async (params) => {
          const data = await getTableLocationIncludeDisabled(params);
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
