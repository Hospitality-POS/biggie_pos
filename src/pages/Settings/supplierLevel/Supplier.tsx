import React, { useRef } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { Avatar, Button, Card, message, Popconfirm, Space, Tooltip, Typography } from "antd";
import {
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { deleteSupplier, fetchAllSuppliers } from "@services/supplier";
import AddProSupplierModal from "@components/MODALS/pro/AddProSupplierModal";
import MobileCardList, {
  mobileCardBodyStyle,
  mobileCardStyle,
  useMobileListData,
} from "@components/MobileCardList/MobileCardList";
import { useIsCompact } from "@hooks/useIsCompact";
import { useMutation } from "@tanstack/react-query";

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE / TABLET CARD
// ─────────────────────────────────────────────────────────────────────────────
interface SupplierCardProps {
  record: any;
  onDelete: (id: string) => void;
  deleting: boolean;
  listRef: React.MutableRefObject<any>;
}

const SupplierCard: React.FC<SupplierCardProps> = ({ record, onDelete, deleting, listRef }) => (
  <Card style={mobileCardStyle} bodyStyle={mobileCardBodyStyle}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
      <Avatar size={40} icon={<UserOutlined />} src={record.avatar} style={{ flexShrink: 0, background: "#eef2ff", color: "#6366f1" }} />
      <Text strong style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.3, minWidth: 0, wordBreak: "break-word" }}>
        {record.name}
      </Text>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 10px", background: "#f8fafc", borderRadius: 8, marginBottom: 10, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <MailOutlined style={{ color: "#94a3b8", flexShrink: 0 }} />
        {record.email ? (
          <Text copyable={{ text: record.email }} style={{ fontSize: 12, color: "#334155", minWidth: 0, wordBreak: "break-all" }}>
            <a href={`mailto:${record.email}`} style={{ color: "inherit" }}>{record.email}</a>
          </Text>
        ) : (
          <Text style={{ fontSize: 12, color: "#94a3b8" }}>No email</Text>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PhoneOutlined style={{ color: "#94a3b8", flexShrink: 0 }} />
        {record.phone ? (
          <a href={`tel:${record.phone}`} style={{ fontSize: 12, color: "#334155" }}>{record.phone}</a>
        ) : (
          <Text style={{ fontSize: 12, color: "#94a3b8" }}>No phone</Text>
        )}
      </div>
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1 }}>
        <AddProSupplierModal edit={true} actionRef={listRef} data={record} block />
      </div>
      <Popconfirm
        title="Are you sure you want to delete this supplier?"
        onConfirm={() => onDelete(record._id)}
        okText="Yes"
        okButtonProps={{ danger: true }}
        cancelText="No"
        placement="topRight"
      >
        <Button danger icon={<DeleteOutlined />} loading={deleting} aria-label="Delete" style={{ borderRadius: 8, width: 38, padding: 0 }} />
      </Popconfirm>
    </div>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE / TABLET LIST
// ─────────────────────────────────────────────────────────────────────────────
const SupplierCardList: React.FC = () => {
  const { items, loading, reload, listRef } = useMobileListData<any>(
    () => fetchAllSuppliers({}),
    "Failed to load suppliers"
  );

  // deleteSupplier is typed as ParamsType but takes the supplier id.
  const deleteMutation = useMutation((id: string) => deleteSupplier(id as any), {
    onSuccess: () => {
      message.success("Supplier deleted successfully");
      reload();
    },
    onError: () => message.error("Failed to delete supplier"),
  });

  return (
    <MobileCardList
      items={items}
      loading={loading}
      onReload={reload}
      rowKey={(s) => s._id}
      matches={(s, q) =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        String(s.phone ?? "").includes(q)
      }
      searchPlaceholder="Search suppliers…"
      addButton={<AddProSupplierModal edit={false} actionRef={listRef} />}
      stats={[
        { label: "Suppliers", value: items.length, color: "#6366f1", bg: "#eef2ff" },
        { label: "With Email", value: items.filter((s) => s.email).length, color: "#0ea5e9", bg: "#f0f9ff" },
        { label: "With Phone", value: items.filter((s) => s.phone).length, color: "#10b981", bg: "#f0fdf4" },
      ]}
      emptyText="No suppliers found"
      renderCard={(record) => (
        <SupplierCard
          record={record}
          onDelete={(id) => deleteMutation.mutate(id)}
          deleting={deleteMutation.isLoading && deleteMutation.variables === record._id}
          listRef={listRef}
        />
      )}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SupplierTable = () => {
  const actionRef = useRef<ActionType>();
  const isCompact = useIsCompact();

  const DeleteSupplierMutation = useMutation(deleteSupplier, {
    onSuccess: () => {
      actionRef.current?.reload();
      message.success("Supplier deleted successfully");
    },
    onError: () => message.error("Failed to delete supplier"),
  });

  if (isCompact) return <SupplierCardList />;

  const actionColumn = {
    title: "Actions",
    dataIndex: "actions",
    hideInSearch: true,
    render: (_: any, record: any) => (
      <Space>
        <Tooltip title="Edit">
          <AddProSupplierModal edit={true} actionRef={actionRef} data={record} />
        </Tooltip>
        <Popconfirm
          title="Are you sure you want to delete this supplier?"
          onConfirm={() => DeleteSupplierMutation.mutate(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="primary" danger icon={<DeleteOutlined />} size="small">
            Delete
          </Button>
        </Popconfirm>
      </Space>
    ),
  };

  return (
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
          title: "Supplier",
          dataIndex: "name",
          hideInSearch: false,
          fieldProps: { placeholder: "Enter Supplier name" },
          render: (text: any, record: any) => (
            <Space>
              <Avatar size="small" icon={<UserOutlined />} src={record.avatar} />
              <span>{text}</span>
            </Space>
          ),
        },
        {
          title: "Email",
          dataIndex: "email",
          hideInSearch: false,
          copyable: true,
          ellipsis: true,
          fieldProps: { placeholder: "Enter Supplier email" },
          render: (text: any) => (
            <Space>
              <MailOutlined style={{ color: "#94a3b8" }} />
              <span>{text}</span>
            </Space>
          ),
        },
        {
          title: "Phone",
          dataIndex: "phone",
          hideInSearch: true,
          ellipsis: true,
          render: (text: any) => (
            <Space>
              <PhoneOutlined style={{ color: "#94a3b8" }} />
              <span>{text}</span>
            </Space>
          ),
        },
        actionColumn,
      ]}
      request={async (params) => {
        const data = await fetchAllSuppliers(params);
        return { data, success: true, total: data.length };
      }}
      tableAlertRender={({ selectedRowKeys }: any) => (
        <span>You have selected {selectedRowKeys.length}</span>
      )}
      actionRef={actionRef}
      rowSelection={{ alwaysShowAlert: false, selections: false }}
      scroll={{ x: "max-content" }}
      search={{
        searchText: "Search Supplier",
        resetText: "Reset",
        labelWidth: "auto",
      }}
      dateFormatter="string"
      headerTitle="List of Suppliers"
      toolBarRender={() => [
        <AddProSupplierModal key="add" edit={false} actionRef={actionRef} />,
      ]}
    />
  );
};

export default SupplierTable;
