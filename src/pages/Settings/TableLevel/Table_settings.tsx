import { useRef, useState } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button, Card, Space, Popconfirm, message, Tag, Typography } from "antd";
import { DeleteOutlined, StopOutlined, CheckCircleOutlined, TableOutlined, HomeOutlined } from "@ant-design/icons";
import {
  deleteTable,
  getAllTablesIncludeDisabled,
  disableTable,
  enableTable,
} from "@services/tables";
import { Badge } from "antd/lib";
import AddEditProTableModal from "@components/MODALS/pro/AddEditProTableModal";
import MobileCardList, {
  mobileCardBodyStyle,
  mobileCardStyle,
  useMobileListData,
} from "@components/MobileCardList/MobileCardList";
import { useIsCompact } from "@hooks/useIsCompact";
import { useMutation } from "@tanstack/react-query";
import { usePOSMode } from "@context/POSModeContext";

const { Text } = Typography;

const locationLabel = (locatedAt: any) =>
  locatedAt && typeof locatedAt === "object" ? locatedAt.name : locatedAt;

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE / TABLET LIST
// ─────────────────────────────────────────────────────────────────────────────
const TableCardList = () => {
  const { isHotelMode } = usePOSMode();
  const { items, loading, reload, listRef } = useMobileListData<any>(
    () => getAllTablesIncludeDisabled({}),
    isHotelMode ? "Failed to load rooms" : "Failed to load tables"
  );

  // deleteTable is typed as ParamsType but takes the table id.
  const deleteMutation = useMutation((id: string) => deleteTable(id as any), {
    onSuccess: () => { message.success("Table deleted successfully"); reload(); },
    onError: () => message.error("Failed to delete table"),
  });
  const disableMutation = useMutation(disableTable, {
    onSuccess: () => { message.success("Table disabled"); reload(); },
    onError: () => message.error("Failed to disable table"),
  });
  const enableMutation = useMutation(enableTable, {
    onSuccess: () => { message.success("Table enabled"); reload(); },
    onError: () => message.error("Failed to enable table"),
  });

  const occupiedCount = items.filter((t) => t.isOccupied).length;
  const disabledCount = items.filter((t) => t.isDisabled).length;

  return (
    <MobileCardList
      items={items}
      loading={loading}
      onReload={reload}
      rowKey={(t) => t._id}
      matches={(t, q) =>
        t.name?.toLowerCase().includes(q) ||
        String(locationLabel(t.locatedAt) ?? "").toLowerCase().includes(q) ||
        String(t.served_by ?? "").toLowerCase().includes(q)
      }
      searchPlaceholder={isHotelMode ? "Search rooms…" : "Search tables…"}
      addButton={<AddEditProTableModal edit={false} actionRef={listRef} />}
      stats={[
        { label: isHotelMode ? "Rooms" : "Tables", value: items.length, color: "#6366f1", bg: "#eef2ff" },
        { label: "Occupied", value: occupiedCount, color: "#ef4444", bg: "#fef2f2" },
        { label: "Vacant", value: items.length - occupiedCount - disabledCount, color: "#10b981", bg: "#f0fdf4" },
      ]}
      emptyText={isHotelMode ? "No rooms found" : "No tables found"}
      renderCard={(record) => (
        <Card style={{ ...mobileCardStyle, opacity: record.isDisabled ? 0.75 : 1 }} bodyStyle={mobileCardBodyStyle}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ background: "#eff6ff", borderRadius: 9, padding: "7px 8px", color: "#1890ff", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
              {isHotelMode ? <HomeOutlined /> : <TableOutlined />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: 14, color: "#0f172a", display: "block", wordBreak: "break-word" }}>{record.name}</Text>
              <Text style={{ fontSize: 12, color: "#64748b" }}>{locationLabel(record.locatedAt) || "—"}</Text>
            </div>
            <Tag color={record.isDisabled ? "red" : "green"} style={{ margin: 0 }}>
              {record.isDisabled ? "Disabled" : "Active"}
            </Tag>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "8px 10px", background: "#f8fafc", borderRadius: 8, marginBottom: 10, flex: 1, alignItems: "start" }}>
            <div style={{ textAlign: "center" }}>
              <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Occupancy</Text>
              <Badge status={record.isOccupied ? "error" : "success"} text={<span style={{ fontSize: 12 }}>{record.isOccupied ? "Occupied" : "Vacant"}</span>} />
            </div>
            <div style={{ textAlign: "center", borderLeft: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
              <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Amount</Text>
              <Text strong style={{ fontSize: 12, color: "#10b981" }}>Ksh. {(record.cart_amount ?? 0).toLocaleString()}</Text>
            </div>
            <div style={{ textAlign: "center", minWidth: 0 }}>
              <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Served By</Text>
              <Text style={{ fontSize: 12, color: "#334155", wordBreak: "break-word" }}>{record.served_by || "—"}</Text>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <AddEditProTableModal edit={true} actionRef={listRef} data={record} block />
            </div>
            {record.isDisabled ? (
              <Popconfirm title="Enable this table?" onConfirm={() => enableMutation.mutate(record._id)} okText="Enable" cancelText="No" placement="topRight">
                <Button icon={<CheckCircleOutlined />} aria-label="Enable" title="Enable" style={{ borderRadius: 8, width: 38, padding: 0, color: "#16a34a", borderColor: "#16a34a" }} />
              </Popconfirm>
            ) : (
              <Popconfirm title="Disable this table? It will be hidden from the POS." onConfirm={() => disableMutation.mutate(record._id)} okText="Disable" cancelText="No" placement="topRight">
                <Button icon={<StopOutlined />} aria-label="Disable" title="Disable" style={{ borderRadius: 8, width: 38, padding: 0, color: "#d97706", borderColor: "#d97706" }} />
              </Popconfirm>
            )}
            <Popconfirm title="Are you sure you want to delete this table?" onConfirm={() => deleteMutation.mutate(record._id)} okText="Yes" okButtonProps={{ danger: true }} cancelText="No" placement="topRight">
              <Button danger icon={<DeleteOutlined />} aria-label="Delete" title="Delete" loading={deleteMutation.isLoading && deleteMutation.variables === record._id} style={{ borderRadius: 8, width: 38, padding: 0 }} />
            </Popconfirm>
          </div>
        </Card>
      )}
    />
  );
};

const TableSetting = () => {
  const isCompact = useIsCompact();
  return isCompact ? <TableCardList /> : <TableSettingsTable />;
};

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP TABLE
// ─────────────────────────────────────────────────────────────────────────────
const TableSettingsTable = () => {
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
