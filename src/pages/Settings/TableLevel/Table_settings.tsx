import { useRef, useState } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button, Space, Popconfirm, message, Tag } from "antd";
import { DeleteOutlined, StopOutlined, CheckCircleOutlined } from "@ant-design/icons";
import {
  deleteTable,
  getAllTablesIncludeDisabled,
  disableTable,
  enableTable,
} from "@services/tables";
import { Badge } from "antd/lib";
import AddEditProTableModal from "@components/MODALS/pro/AddEditProTableModal";
import { useMutation } from "@tanstack/react-query";
import { usePOSMode } from "@context/POSModeContext";

const TableSetting = () => {
  const tableRef = useRef<ActionType>();
  const { isHotelMode } = usePOSMode();
  const [tableVersion, setTableVersion] = useState(0);

  const DeleteTableMutation = useMutation(deleteTable, {
    onSuccess: () => {
      tableRef.current?.reload();
      message.success("Table deleted successfully");
    },
    onError: () => message.error("Failed to delete table"),
  });

  const DisableTableMutation = useMutation(disableTable, {
    onSuccess: () => {
      setTableVersion(prev => prev + 1);
      message.success("Table disabled");
    },
    onError: () => message.error("Failed to disable table"),
  });

  const EnableTableMutation = useMutation(enableTable, {
    onSuccess: () => {
      setTableVersion(prev => prev + 1);
      message.success("Table enabled");
    },
    onError: () => message.error("Failed to enable table"),
  });

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_: any, record: any) => [
      <Space key="actions">
        <Tooltip key="edit" title="Edit">
          <AddEditProTableModal edit={true} actionRef={tableRef} data={record} />
        </Tooltip>
        {record.isDisabled ? (
          <Popconfirm
            title="Enable this table?"
            onConfirm={() => EnableTableMutation.mutate(record._id)}
            okText="Enable"
            cancelText="No"
          >
            <Button size="small" icon={<CheckCircleOutlined />} style={{ color: "#16a34a", borderColor: "#16a34a" }}>
              Enable
            </Button>
          </Popconfirm>
        ) : (
          <Popconfirm
            title="Disable this table? It will be hidden from the POS."
            onConfirm={() => DisableTableMutation.mutate(record._id)}
            okText="Disable"
            cancelText="No"
          >
            <Button size="small" icon={<StopOutlined />} style={{ color: "#d97706", borderColor: "#d97706" }}>
              Disable
            </Button>
          </Popconfirm>
        )}
        <Popconfirm
          title="Are you sure you want to delete this table?"
          onConfirm={() => DeleteTableMutation.mutate(record._id)}
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
        key={tableVersion}
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
            title: isHotelMode ? "Room" : "Table",
            dataIndex: "name",
            hideInSearch: false,
            fieldProps: {
              placeholder: isHotelMode ? "Enter room name" : "Enter table name",
            },
          },
          {
            title: isHotelMode ? "Floor" : "Located At",
            dataIndex: "locatedAt",
            hideInSearch: false,
            fieldProps: {
              placeholder: isHotelMode ? "Enter floor name" : "Enter table location name",
            },
          },
          {
            title: "Occupancy",
            dataIndex: "isOccupied",
            hideInSearch: true,
            render: (status: boolean) => (
              <Badge
                status={status ? "error" : "success"}
                text={status ? "Occupied" : "Vacant"}
              />
            ),
          },
          {
            title: "Status",
            dataIndex: "isDisabled",
            hideInSearch: true,
            render: (isDisabled: boolean) => (
              <Tag color={isDisabled ? "red" : "green"}>{isDisabled ? "Disabled" : "Active"}</Tag>
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
          const data = await getAllTablesIncludeDisabled(params);
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
          searchText: isHotelMode ? "Search Room" : "Search Table",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        dateFormatter="string"
        headerTitle={isHotelMode ? "List of Rooms" : "List of Tables"}
        toolBarRender={() => [
          <AddEditProTableModal edit={false} actionRef={tableRef} />,
        ]}
      />
    </>
  );
};

export default TableSetting;
