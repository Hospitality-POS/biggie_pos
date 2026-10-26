import { useRef, useState } from "react";

import { ActionType, ProTable } from "@ant-design/pro-components";
import { Tooltip, Button, Card, Space, Popconfirm, message, Tag, Typography } from "antd";
import { DeleteOutlined, StopOutlined, CheckCircleOutlined, EnvironmentOutlined } from "@ant-design/icons";
import {
  delLocation,
  getTableLocationIncludeDisabled,
  disableLocation,
  enableLocation,
} from "@services/tables";
import AddProTableLocationModal from "@components/MODALS/pro/AddProTableLocationModal";
import MobileCardList, {
  mobileCardBodyStyle,
  mobileCardStyle,
  useMobileListData,
} from "@components/MobileCardList/MobileCardList";
import { useIsCompact } from "@hooks/useIsCompact";
import { useMutation } from "@tanstack/react-query";

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE / TABLET LIST
// ─────────────────────────────────────────────────────────────────────────────
const LocationCardList = () => {
  const { items, loading, reload, listRef } = useMobileListData<any>(
    () => getTableLocationIncludeDisabled({}),
    "Failed to load locations"
  );

  // delLocation is typed as ParamsType but takes the location id.
  const deleteMutation = useMutation((id: string) => delLocation(id as any), {
    onSuccess: () => { message.success("Location deleted successfully"); reload(); },
    onError: () => message.error("Failed to delete location"),
  });
  const disableMutation = useMutation(disableLocation, {
    onSuccess: () => { message.success("Location disabled"); reload(); },
    onError: () => message.error("Failed to disable location"),
  });
  const enableMutation = useMutation(enableLocation, {
    onSuccess: () => { message.success("Location enabled"); reload(); },
    onError: () => message.error("Failed to enable location"),
  });

  const activeCount = items.filter((l) => !l.isDisabled).length;

  return (
    <MobileCardList
      items={items}
      loading={loading}
      onReload={reload}
      rowKey={(l) => l._id}
      matches={(l, q) => l.name?.toLowerCase().includes(q)}
      searchPlaceholder="Search locations…"
      addButton={<AddProTableLocationModal actionRef={listRef} />}
      stats={[
        { label: "Locations", value: items.length, color: "#6366f1", bg: "#eef2ff" },
        { label: "Active", value: activeCount, color: "#10b981", bg: "#f0fdf4" },
        { label: "Disabled", value: items.length - activeCount, color: "#ef4444", bg: "#fef2f2" },
      ]}
      emptyText="No locations found"
      renderCard={(record) => (
        <Card style={{ ...mobileCardStyle, opacity: record.isDisabled ? 0.75 : 1 }} bodyStyle={mobileCardBodyStyle}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flex: 1 }}>
            <div style={{ background: "#f0fdf4", borderRadius: 9, padding: "7px 8px", color: "#10b981", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
              <EnvironmentOutlined />
            </div>
            <Text strong style={{ fontSize: 14, color: "#0f172a", flex: 1, minWidth: 0, wordBreak: "break-word" }}>
              {record.name}
            </Text>
            <Tag color={record.isDisabled ? "red" : "green"} style={{ margin: 0 }}>
              {record.isDisabled ? "Disabled" : "Active"}
            </Tag>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <AddProTableLocationModal edit={true} actionRef={listRef} data={record} block />
            </div>
            {record.isDisabled ? (
              <Popconfirm title="Enable this location? Its tables will reappear in the POS." onConfirm={() => enableMutation.mutate(record._id)} okText="Enable" cancelText="No" placement="topRight">
                <Button icon={<CheckCircleOutlined />} aria-label="Enable" title="Enable" style={{ borderRadius: 8, width: 38, padding: 0, color: "#16a34a", borderColor: "#16a34a" }} />
              </Popconfirm>
            ) : (
              <Popconfirm title="Disable this location? All its tables will be hidden from the POS." onConfirm={() => disableMutation.mutate(record._id)} okText="Disable" cancelText="No" placement="topRight">
                <Button icon={<StopOutlined />} aria-label="Disable" title="Disable" style={{ borderRadius: 8, width: 38, padding: 0, color: "#d97706", borderColor: "#d97706" }} />
              </Popconfirm>
            )}
            <Popconfirm title="Are you sure you want to delete this location?" onConfirm={() => deleteMutation.mutate(record._id)} okText="Yes" okButtonProps={{ danger: true }} cancelText="No" placement="topRight">
              <Button danger icon={<DeleteOutlined />} aria-label="Delete" title="Delete" loading={deleteMutation.isLoading && deleteMutation.variables === record._id} style={{ borderRadius: 8, width: 38, padding: 0 }} />
            </Popconfirm>
          </div>
        </Card>
      )}
    />
  );
};

const TableLocationSettings = () => {
  const isCompact = useIsCompact();
  return isCompact ? <LocationCardList /> : <TableLocationTable />;
};

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP TABLE
// ─────────────────────────────────────────────────────────────────────────────
const TableLocationTable = () => {
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
