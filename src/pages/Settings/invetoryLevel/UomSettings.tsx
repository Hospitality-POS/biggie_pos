import { ActionType, ProTable } from "@ant-design/pro-components";
import { deleteUom, deleteMultipleUom, deleteAllUom, fetchAllUom } from "@services/uom";
import {
  Button, Card, Checkbox, Empty, message, Modal,
  Popconfirm, Skeleton, Space, Tag, Typography,
} from "antd";
import {
  DeleteOutlined, DatabaseOutlined, CalendarOutlined,
  ReloadOutlined, ExclamationCircleOutlined,
} from "@ant-design/icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import UomModal from "@components/MODALS/pro/UomModal";
import { useMutation } from "@tanstack/react-query";

const { Text, Title } = Typography;
const { confirm } = Modal;

// ── Mobile detection ──────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

// ── Mobile UOM card ───────────────────────────────────────────────────────────
interface UomCardProps {
  record: any;
  onDelete: (id: string) => void;
  deleting: boolean;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  selectMode: boolean;
}

const UomCard: React.FC<UomCardProps> = ({ record, onDelete, deleting, actionRef, selected, onSelect, selectMode }) => (
  <Card
    style={{
      borderRadius: 12, marginBottom: 10,
      border: selected ? "1.5px solid #ef4444" : "1px solid #e2e8f0",
      boxShadow: selected ? "0 0 0 2px #fee2e2" : "0 1px 4px rgba(0,0,0,0.05)",
      background: selected ? "#fff5f5" : "#fff",
      transition: "all 0.15s",
    }}
    bodyStyle={{ padding: "12px 14px" }}
  >
    {/* Header */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <Space size={10}>
        {selectMode && (
          <Checkbox checked={selected} onChange={(e) => onSelect(record._id, e.target.checked)} />
        )}
        <div style={{ background: "#eef2ff", borderRadius: 8, padding: "6px 7px", color: "#6366f1", fontSize: 15, lineHeight: 1 }}>
          <DatabaseOutlined />
        </div>
        <div>
          <Text strong style={{ fontSize: 14, color: "#0f172a", display: "block" }}>{record.name}</Text>
          {record.symbol && (
            <Tag style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 4, fontSize: 10, padding: "0 6px", marginTop: 2 }}>
              {record.symbol}
            </Tag>
          )}
        </div>
      </Space>
    </div>

    {/* Dates */}
    <div style={{ display: "flex", gap: 8, padding: "7px 10px", background: "#f8fafc", borderRadius: 8, marginBottom: 10 }}>
      <div style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Created</Text>
        <Space size={4}>
          <CalendarOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
          <Text style={{ fontSize: 12, color: "#374151" }}>{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "—"}</Text>
        </Space>
      </div>
      <div style={{ width: 1, background: "#e2e8f0" }} />
      <div style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Updated</Text>
        <Space size={4}>
          <CalendarOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
          <Text style={{ fontSize: 12, color: "#374151" }}>{record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : "—"}</Text>
        </Space>
      </div>
    </div>

    {/* Actions */}
    {!selectMode && (
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}><UomModal actionRef={actionRef} edit={true} data={record} /></div>
        <Popconfirm title="Delete this UoM?" description="This action cannot be undone." onConfirm={() => onDelete(record._id)} okText="Delete" okButtonProps={{ danger: true }} cancelText="Cancel" placement="topRight">
          <Button danger size="middle" icon={<DeleteOutlined />} loading={deleting} style={{ borderRadius: 8, width: 38, padding: 0 }} />
        </Popconfirm>
      </div>
    )}
  </Card>
);

// ── Mobile list ───────────────────────────────────────────────────────────────
const MobileUomList: React.FC<{ actionRef: React.MutableRefObject<ActionType | undefined> }> = ({ actionRef }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const shopId = localStorage.getItem("shopId") || "";

  const loadItems = useCallback(async () => {
    setLoading(true);
    try { const data = await fetchAllUom({}); setItems(data); }
    catch { message.error("Failed to load UoM data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadItems(); }, []);

  const deleteMutation = useMutation(deleteUom, {
    onMutate: (id: string) => setDeletingId(id),
    onSuccess: () => { message.success("UoM deleted"); setDeletingId(null); loadItems(); },
    onError: () => { message.error("Failed to delete UoM"); setDeletingId(null); },
  });

  const filtered = items.filter((item) => !searchText || item.name?.toLowerCase().includes(searchText.toLowerCase()));

  const toggleSelectMode = () => { setSelectMode(v => !v); setSelectedIds(new Set()); };
  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
  };
  const allSelected = filtered.length > 0 && filtered.every(i => selectedIds.has(i._id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return message.warning("No items selected");
    confirm({
      title: `Delete ${selectedIds.size} selected UoM(s)?`,
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content: "This action cannot be undone.",
      okText: "Delete", okButtonProps: { danger: true }, cancelText: "Cancel",
      onOk: async () => {
        setBulkDeleting(true);
        try {
          const r = await deleteMultipleUom(Array.from(selectedIds));
          message.success(`${r.deleted} UoM(s) deleted`);
          setSelectMode(false); setSelectedIds(new Set()); loadItems();
        } catch { } finally { setBulkDeleting(false); }
      },
    });
  };

  const handleDeleteAll = () => {
    confirm({
      title: "Delete ALL units of measure?",
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content: <div><Text>Permanently deletes <strong>all {items.length} UoMs</strong> in this shop.</Text><br /><Text type="danger" style={{ fontSize: 12 }}>Cannot be undone.</Text></div>,
      okText: "Delete All", okButtonProps: { danger: true }, cancelText: "Cancel",
      onOk: async () => {
        setBulkDeleting(true);
        try {
          const r = await deleteAllUom(shopId);
          message.success(`${r.deleted} UoM(s) deleted`);
          setSelectMode(false); setSelectedIds(new Set()); loadItems();
        } catch { } finally { setBulkDeleting(false); }
      },
    });
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input placeholder="Search units…" value={searchText} onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: 1, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", padding: "0 12px", fontSize: 13, outline: "none", color: "#0f172a", background: "#f8fafc" }} />
        <Button icon={<ReloadOutlined />} onClick={loadItems} loading={loading} style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }} />
        <UomModal actionRef={actionRef} />
      </div>

      {/* Bulk delete bar */}
      <div style={{ background: "#fff1f2", borderRadius: 10, padding: "10px 14px", marginBottom: 14, border: "1px solid #fecdd3", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" as const }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button size="small" onClick={toggleSelectMode}
            style={{ borderRadius: 6, fontSize: 12, background: selectMode ? "#fee2e2" : "#fff", border: selectMode ? "1px solid #fca5a5" : "1px solid #e2e8f0", color: selectMode ? "#dc2626" : "#374151" }}>
            {selectMode ? "Cancel Selection" : "Select Items"}
          </Button>
          {selectMode && (
            <Checkbox indeterminate={someSelected} checked={allSelected}
              onChange={(e) => setSelectedIds(e.target.checked ? new Set(filtered.map(i => i._id)) : new Set())}>
              <Text style={{ fontSize: 12, color: "#374151" }}>{selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}</Text>
            </Checkbox>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {selectMode && selectedIds.size > 0 && (
            <Button danger size="small" icon={<DeleteOutlined />} loading={bulkDeleting} onClick={handleDeleteSelected}
              style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              Delete {selectedIds.size}
            </Button>
          )}
          <Button danger size="small" icon={<DeleteOutlined />} loading={bulkDeleting} onClick={handleDeleteAll}
            style={{ borderRadius: 6, fontSize: 12, background: "#fff1f2", border: "1px solid #fca5a5", color: "#dc2626" }}>
            Delete All
          </Button>
        </div>
      </div>

      {/* Summary */}
      {!loading && items.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "#eef2ff", borderRadius: 9, marginBottom: 14, border: "1px solid #e0e7ff" }}>
          <DatabaseOutlined style={{ color: "#6366f1", fontSize: 16 }} />
          <Text style={{ fontSize: 13, color: "#374151" }}>
            <Text strong style={{ color: "#6366f1" }}>{items.length}</Text> unit{items.length !== 1 ? "s" : ""} of measure configured
          </Text>
        </div>
      )}

      {/* Cards */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} style={{ borderRadius: 12, marginBottom: 10, border: "1px solid #e2e8f0" }} bodyStyle={{ padding: 14 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        ))
      ) : filtered.length === 0 ? (
        <Empty description="No units of measure found" style={{ padding: "40px 0" }} />
      ) : (
        filtered.map((record) => (
          <UomCard key={record._id} record={record} onDelete={(id) => deleteMutation.mutate(id)}
            deleting={deletingId === record._id} actionRef={actionRef}
            selected={selectedIds.has(record._id)} onSelect={handleSelect} selectMode={selectMode} />
        ))
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
function UomSettings() {
  const actionRef = useRef<ActionType>();
  const isMobile = useIsMobile();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const shopId = localStorage.getItem("shopId") || "";

  const deleteUomMutation = useMutation(deleteUom, {
    onSuccess: () => { actionRef.current?.reload(); message.success("UoM deleted"); },
    onError: () => message.error("Failed to delete UoM"),
  });

  const requestData = async (params: any) => {
    try {
      const data = await fetchAllUom(params);
      return { data, success: true, total: data.length };
    } catch {
      message.error("Failed to load UoM data");
      return { data: [], success: false, total: 0 };
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRowKeys.length === 0) return message.warning("No items selected");
    confirm({
      title: `Delete ${selectedRowKeys.length} selected UoM(s)?`,
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content: "This action cannot be undone.",
      okText: "Delete", okButtonProps: { danger: true }, cancelText: "Cancel",
      onOk: async () => {
        setBulkDeleting(true);
        try {
          const r = await deleteMultipleUom(selectedRowKeys as string[]);
          message.success(`${r.deleted} UoM(s) deleted`);
          setSelectedRowKeys([]); actionRef.current?.reload();
        } catch { } finally { setBulkDeleting(false); }
      },
    });
  };

  const handleDeleteAll = () => {
    confirm({
      title: "Delete ALL units of measure?",
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content: <div><Text>This will permanently delete <strong>all UoMs</strong> in this shop.</Text><br /><Text type="danger" style={{ fontSize: 12 }}>Cannot be undone.</Text></div>,
      okText: "Delete All", okButtonProps: { danger: true }, cancelText: "Cancel",
      onOk: async () => {
        setBulkDeleting(true);
        try {
          const r = await deleteAllUom(shopId);
          message.success(`${r.deleted} UoM(s) deleted`);
          setSelectedRowKeys([]); actionRef.current?.reload();
        } catch { } finally { setBulkDeleting(false); }
      },
    });
  };

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <Space align="center" size={10}>
            <div style={{ background: "#eef2ff", borderRadius: 9, padding: "7px 8px", color: "#6366f1", fontSize: 16, lineHeight: 1 }}>
              <DatabaseOutlined />
            </div>
            <div>
              <Title level={5} style={{ margin: 0, color: "#0f172a" }}>Units of Measure</Title>
              <Text style={{ fontSize: 12, color: "#64748b" }}>Configure measurement units for inventory</Text>
            </div>
          </Space>
        </div>
        <MobileUomList actionRef={actionRef} />
      </div>
    );
  }

  // ── Desktop ───────────────────────────────────────────────────────────────
  return (
    <ProTable
      columns={[
        {
          title: "Name",
          dataIndex: "name",
          key: "name",
          sorter: true,
          fieldProps: { autoComplete: "on", allowClear: true, placeholder: "Search UoM name" },
          render: (text: any, record: any) => (
            <Space size={10}>
              <div style={{ background: "#eef2ff", borderRadius: 7, padding: "4px 5px", color: "#6366f1", fontSize: 13, lineHeight: 1 }}>
                <DatabaseOutlined />
              </div>
              <div>
                <Text strong style={{ fontSize: 13, color: "#0f172a" }}>{text}</Text>
                {record.symbol && (
                  <Tag style={{ marginLeft: 6, background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 4, fontSize: 10, padding: "0 5px" }}>
                    {record.symbol}
                  </Tag>
                )}
              </div>
            </Space>
          ),
        },
        {
          title: "Date Created",
          dataIndex: "createdAt",
          key: "createdAt",
          search: false,
          sorter: true,
          width: 140,
          render: (value: any) => (
            <Space size={4}>
              <CalendarOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
              <Text style={{ fontSize: 13, color: "#374151" }}>{value ? new Date(value).toLocaleDateString() : "—"}</Text>
            </Space>
          ),
        },
        {
          title: "Date Updated",
          dataIndex: "updatedAt",
          key: "updatedAt",
          search: false,
          sorter: true,
          width: 140,
          render: (value: any) => (
            <Space size={4}>
              <CalendarOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
              <Text style={{ fontSize: 13, color: "#374151" }}>{value ? new Date(value).toLocaleDateString() : "—"}</Text>
            </Space>
          ),
        },
        {
          title: "Actions",
          key: "actions",
          search: false,
          width: 120,
          render: (_: any, record: any) => (
            <Space size={6}>
              <UomModal actionRef={actionRef} edit={true} data={record} />
              <Popconfirm title="Delete this UoM?" description="This action cannot be undone." onConfirm={() => deleteUomMutation.mutate(record._id)} okText="Delete" okButtonProps={{ danger: true }} cancelText="Cancel">
                <Button danger size="small" icon={<DeleteOutlined />} style={{ borderRadius: 6, height: 28, width: 28, padding: 0 }} />
              </Popconfirm>
            </Space>
          ),
        },
      ]}
      actionRef={actionRef}
      rowKey="_id"
      request={requestData}
      pagination={{
        pageSize: 10,
        showQuickJumper: true,
        showTotal: (total, range) => (
          <Text style={{ fontSize: 12, color: "#64748b" }}>{range[0]}–{range[1]} of {total} units</Text>
        ),
      }}
      options={{ density: true, fullScreen: true, reload: true, setting: true }}
      headerTitle={
        <Space size={8}>
          <div style={{ background: "#eef2ff", borderRadius: 8, padding: "5px 6px", color: "#6366f1", fontSize: 15, lineHeight: 1 }}>
            <DatabaseOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: "#0f172a" }}>Units of Measure</Text>
        </Space>
      }
      // ── Selection + bulk action bar ────────────────────────────────────────
      rowSelection={{
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
        alwaysShowAlert: false,
      }}
      tableAlertRender={({ selectedRowKeys: keys }: any) =>
        keys.length > 0 ? (
          <Space size={8}>
            <Text style={{ fontSize: 13 }}>{keys.length} unit{keys.length !== 1 ? "s" : ""} selected</Text>
            <Button danger size="small" icon={<DeleteOutlined />} loading={bulkDeleting} onClick={handleDeleteSelected}
              style={{ borderRadius: 6, fontWeight: 600 }}>
              Delete Selected
            </Button>
          </Space>
        ) : null
      }
      tableAlertOptionRender={() => (
        <Button type="link" danger size="small" onClick={() => setSelectedRowKeys([])}>Clear selection</Button>
      )}
      search={{ searchText: "Search", resetText: "Reset", labelWidth: "auto" }}
      style={{ borderRadius: 12 }}
      toolBarRender={() => [
        <UomModal key="add" actionRef={actionRef} />,
        <Popconfirm
          key="delete-all"
          title="Delete ALL units of measure?"
          description="Permanently deletes every UoM in this shop. Cannot be undone."
          onConfirm={handleDeleteAll}
          okText="Delete All"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
          placement="bottomRight"
        >
          <Button danger icon={<DeleteOutlined />} loading={bulkDeleting} style={{ borderRadius: 7, fontWeight: 500 }}>
            Delete All
          </Button>
        </Popconfirm>,
      ]}
    />
  );
}

export default UomSettings;