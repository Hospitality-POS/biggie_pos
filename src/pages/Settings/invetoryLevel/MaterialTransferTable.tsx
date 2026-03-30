import React, { useEffect, useRef, useState } from "react";
import {
    Badge,
    Button,
    Card,
    Dropdown,
    Empty,
    Flex,
    Input,
    Modal,
    Progress,
    Skeleton,
    Space,
    Tag,
    Typography,
} from "antd";
import {
    ArrowRightOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    DeleteOutlined,
    FileExcelOutlined,
    FilePdfOutlined,
    FileTextOutlined,
    MoreOutlined,
    PrinterOutlined,
    ReloadOutlined,
    StopOutlined,
    SwapOutlined,
    TruckOutlined,
} from "@ant-design/icons";
import { ProTable } from "@ant-design/pro-components";
import type { ActionType } from "@ant-design/pro-components";
import AddEditTransferModal from "../../../components/MODALS/pro/AddEditTransferModal";

const { Text } = Typography;
const { TextArea } = Input;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    blue: "#3b82f6",
    green: "#10b981",
    orange: "#f59e0b",
    indigo: "#6366f1",
    red: "#ef4444",
    subText: "#64748b",
    darkText: "#0f172a",
    tableBorder: "#e2e8f0",
};

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

// ── Types ─────────────────────────────────────────────────────────────────────
interface ShopLocation {
    address?: string;
    formatted_address?: string;
    city?: string;
    country?: string;
    place_id?: string;
    lat?: number;
    lng?: number;
    maps_url?: string;
}

interface Shop {
    _id: string;
    name: string;
    location: string | ShopLocation;
}

interface Transfer {
    _id: string;
    transfer_code: string;
    from_shop_id: Shop;
    to_shop_id: Shop;
    status: "pending" | "in_transit" | "completed" | "cancelled" | "rejected";
    initiated_by: { _id: string; name: string; email?: string };
    approved_by?: { _id: string; name: string; email?: string };
    received_by?: { _id: string; name: string; email?: string };
    transfer_date: string;
    expected_delivery_date?: string;
    actual_delivery_date?: string;
    notes?: string;
    rejection_reason?: string;
    total_items: number;
    items?: TransferItem[];
    createdAt: string;
    updatedAt: string;
}

interface TransferItem {
    _id: string;
    from_product_id: { _id: string; name: string; code: string; thumbnail?: string };
    to_product_id: { _id: string; name: string; code: string; thumbnail?: string };
    quantity: number;
    unit_id: { _id: string; name: string };
    notes?: string;
}

interface MaterialTransferTableProps {
    onDeleteTransfer: (id: string) => Promise<{ success: boolean }>;
    onApproveTransfer: (id: string) => Promise<{ success: boolean }>;
    onCompleteTransfer: (id: string) => Promise<{ success: boolean }>;
    onRejectTransfer: (id: string, reason: string) => Promise<{ success: boolean }>;
    onCancelTransfer: (id: string) => Promise<{ success: boolean }>;
    onViewTransfer: (record: Transfer) => void;
    onPrintTransfer: (record: Transfer) => void;
    onExportToExcel: (data: Transfer[]) => void;
    onExportToPDF: (data: Transfer[]) => void;
    onFetchData: (params: any, sort?: any, filter?: any) => Promise<{
        data: Transfer[];
        success: boolean;
        total: number;
    }>;
}

// ── Location helper ───────────────────────────────────────────────────────────
const getLocationStr = (location: string | ShopLocation | undefined): string => {
    if (!location) return "";
    if (typeof location === "string") return location;
    return location.formatted_address || location.address || location.city || "";
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; text: string; bg: string }> = {
    pending: { icon: <ClockCircleOutlined />, color: C.orange, text: "Pending", bg: "#fffbeb" },
    in_transit: { icon: <TruckOutlined />, color: C.blue, text: "In Transit", bg: "#eff6ff" },
    completed: { icon: <CheckCircleOutlined />, color: C.green, text: "Completed", bg: "#f0fdf4" },
    cancelled: { icon: <StopOutlined />, color: C.subText, text: "Cancelled", bg: "#f1f5f9" },
    rejected: { icon: <CloseCircleOutlined />, color: C.red, text: "Rejected", bg: "#fef2f2" },
};

const renderStatus = (status: string) => {
    const cfg = STATUS_CONFIG[status] || { icon: null, color: C.subText, text: status, bg: "#f1f5f9" };
    return (
        <Tag
            icon={cfg.icon}
            style={{
                background: cfg.bg,
                color: cfg.color,
                border: "none",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
                padding: "2px 8px",
            }}
        >
            {cfg.text}
        </Tag>
    );
};

// ── Info pill ─────────────────────────────────────────────────────────────────
const InfoPill: React.FC<{ label: string; value: React.ReactNode; color?: string; bg?: string }> = ({
    label, value, color = "#374151", bg = "#f8fafc",
}) => (
    <div style={{ background: bg, borderRadius: 8, padding: "8px 10px", minWidth: 0 }}>
        <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 600 }}>
            {label}
        </Text>
        <Text style={{ fontSize: 12, color, fontWeight: 500, wordBreak: "break-word" }}>
            {value}
        </Text>
    </div>
);

// ── Route arrow ───────────────────────────────────────────────────────────────
const RouteDisplay: React.FC<{ from: Shop; to: Shop; compact?: boolean }> = ({ from, to, compact }) => {
    const fromLocation = getLocationStr(from?.location);
    const toLocation = getLocationStr(to?.location);

    return (
        <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 10, flexWrap: "wrap" }}>
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, flexShrink: 0, display: "inline-block" }} />
                    <Text strong style={{ fontSize: compact ? 12 : 13, color: C.darkText }}>{from?.name || "N/A"}</Text>
                </div>
                {!compact && fromLocation && (
                    <Text style={{ fontSize: 11, color: C.subText, marginLeft: 13 }}>{fromLocation}</Text>
                )}
            </div>
            <ArrowRightOutlined style={{ fontSize: compact ? 11 : 13, color: C.orange, flexShrink: 0 }} />
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, flexShrink: 0, display: "inline-block" }} />
                    <Text strong style={{ fontSize: compact ? 12 : 13, color: C.darkText }}>{to?.name || "N/A"}</Text>
                </div>
                {!compact && toLocation && (
                    <Text style={{ fontSize: 11, color: C.subText, marginLeft: 13 }}>{toLocation}</Text>
                )}
            </div>
        </div>
    );
};

// ── Product mapping item ──────────────────────────────────────────────────────
const TransferItemCard: React.FC<{ item: TransferItem; index: number }> = ({ item, index }) => (
    <div
        style={{
            background: index % 2 === 0 ? "#fff" : "#fafafa",
            border: `1px solid ${C.tableBorder}`,
            borderRadius: 9,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
        }}
    >
        <div style={{
            background: C.primaryLight,
            borderRadius: 6,
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.primary,
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
        }}>
            {index + 1}
        </div>

        <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {item.from_product_id?.thumbnail && (
                    <img
                        src={item.from_product_id.thumbnail}
                        alt=""
                        style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 5, border: `2px solid ${C.blue}`, flexShrink: 0 }}
                    />
                )}
                <div>
                    <Text strong style={{ fontSize: 12, color: C.blue, display: "block" }}>{item.from_product_id?.name || "N/A"}</Text>
                    <Text style={{ fontSize: 10, color: C.subText }}>Code: {item.from_product_id?.code || "—"}</Text>
                </div>
            </div>
        </div>

        <ArrowRightOutlined style={{ color: C.green, fontSize: 14, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {item.to_product_id?.thumbnail && (
                    <img
                        src={item.to_product_id.thumbnail}
                        alt=""
                        style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 5, border: `2px solid ${C.green}`, flexShrink: 0 }}
                    />
                )}
                <div>
                    <Text strong style={{ fontSize: 12, color: C.green, display: "block" }}>{item.to_product_id?.name || "N/A"}</Text>
                    <Text style={{ fontSize: 10, color: C.subText }}>Code: {item.to_product_id?.code || "—"}</Text>
                </div>
            </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ background: "#eef2ff", borderRadius: 6, padding: "4px 10px", marginBottom: item.notes ? 4 : 0 }}>
                <Text strong style={{ fontSize: 13, color: C.indigo }}>{item.quantity}</Text>
                <Text style={{ fontSize: 11, color: C.subText }}> {item.unit_id?.name || "units"}</Text>
            </div>
            {item.notes && (
                <Text italic style={{ fontSize: 10, color: C.subText }}>{item.notes}</Text>
            )}
        </div>
    </div>
);

// ── Expanded row ──────────────────────────────────────────────────────────────
const ExpandedRow: React.FC<{ record: Transfer; isMobile?: boolean }> = ({ record, isMobile }) => (
    <div style={{ padding: isMobile ? "12px 4px 4px" : "14px 16px", background: "#f8fafc", borderTop: `1px solid ${C.tableBorder}` }}>

        <div style={{
            background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10,
            padding: "12px 14px", marginBottom: 14,
        }}>
            <Text style={{ fontSize: 10, color: "#92400e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: 8 }}>
                Transfer Route
            </Text>
            <RouteDisplay from={record.from_shop_id} to={record.to_shop_id} />
        </div>

        <Text style={{ fontSize: 10, color: C.subText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
            Details
        </Text>
        <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 8, marginBottom: 14,
        }}>
            <InfoPill label="Transfer Date" value={new Date(record.transfer_date).toLocaleDateString("en-KE", { dateStyle: "medium" })} />
            <InfoPill
                label="Expected Delivery"
                value={record.expected_delivery_date ? new Date(record.expected_delivery_date).toLocaleDateString("en-KE", { dateStyle: "medium" }) : "Not set"}
            />
            {record.actual_delivery_date && (
                <InfoPill label="Actual Delivery" value={new Date(record.actual_delivery_date).toLocaleDateString("en-KE", { dateStyle: "medium" })} color={C.green} bg="#f0fdf4" />
            )}
            <InfoPill label="Initiated By" value={record.initiated_by?.name || "N/A"} />
            <InfoPill label="Created" value={new Date(record.createdAt).toLocaleDateString("en-KE", { dateStyle: "medium" })} />
            {record.approved_by && (
                <InfoPill label="Approved By" value={record.approved_by.name} color={C.green} bg="#f0fdf4" />
            )}
            {record.received_by && (
                <InfoPill label="Received By" value={record.received_by.name} color={C.blue} bg="#eff6ff" />
            )}
            <InfoPill label="Total Items" value={`${record.total_items} item${record.total_items !== 1 ? "s" : ""}`} color={C.indigo} bg="#eef2ff" />
        </div>

        {record.rejection_reason && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
                <Text style={{ fontSize: 10, color: "#b91c1c", fontWeight: 600, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.4px" }}>Rejection Reason</Text>
                <Text style={{ fontSize: 12, color: C.red }}>{record.rejection_reason}</Text>
            </div>
        )}

        {record.notes && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
                <Text style={{ fontSize: 10, color: "#92400e", fontWeight: 600, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.4px" }}>Notes</Text>
                <Text style={{ fontSize: 12, color: "#374151" }}>{record.notes}</Text>
            </div>
        )}

        <Text style={{ fontSize: 10, color: C.subText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
            <SwapOutlined style={{ marginRight: 4 }} />
            Item Mapping ({record.items?.length || 0})
        </Text>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {record.items?.length ? (
                record.items.map((item, i) => (
                    <TransferItemCard key={item._id || i} item={item} index={i} />
                ))
            ) : (
                <Text type="secondary" style={{ fontSize: 12, padding: "12px 0", display: "block" }}>No items in this transfer</Text>
            )}
        </div>
    </div>
);

// ── Action cell ───────────────────────────────────────────────────────────────
const ActionCell: React.FC<{
    record: Transfer;
    actionRef: React.RefObject<ActionType>;
    onViewTransfer: (r: Transfer) => void;
    onPrintTransfer: (r: Transfer) => void;
    onApprove: (id: string) => void;
    onComplete: (id: string) => void;
    onRejectClick: (id: string) => void;
    onCancel: (id: string) => void;
    onDelete: (id: string) => void;
    isMobile?: boolean;
}> = ({ record, actionRef, onViewTransfer, onPrintTransfer, onApprove, onComplete, onRejectClick, onCancel, onDelete, isMobile }) => (
    <Space size={4}>
        <Dropdown
            menu={{
                items: [
                    { key: "print", icon: <PrinterOutlined />, label: "Print", onClick: () => onPrintTransfer(record) },
                    ...(record.status === "pending" ? [
                        { key: "approve", icon: <CheckCircleOutlined />, label: "Approve", onClick: () => onApprove(record._id) },
                        { key: "cancel", icon: <StopOutlined />, label: "Cancel", danger: true, onClick: () => onCancel(record._id) },
                    ] : []),
                    ...(record.status === "in_transit" ? [
                        { key: "complete", icon: <CheckCircleOutlined />, label: "Mark Complete", onClick: () => onComplete(record._id) },
                    ] : []),
                    ...(record.status === "pending" || record.status === "in_transit" ? [
                        { key: "reject", icon: <CloseCircleOutlined />, label: "Reject", danger: true, onClick: () => onRejectClick(record._id) },
                    ] : []),
                    { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true, onClick: () => onDelete(record._id) },
                ],
            }}
            trigger={["click"]}
            placement={isMobile ? "topRight" : "bottomRight"}
        >
            <Button
                type="text"
                icon={<MoreOutlined />}
                style={{
                    borderRadius: 7,
                    border: `1px solid ${C.tableBorder}`,
                    background: "#f8fafc",
                    width: isMobile ? 36 : 32,
                    height: isMobile ? 36 : 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                }}
            />
        </Dropdown>
        {record.status === "pending" && (
            <AddEditTransferModal actionRef={actionRef} data={record} edit key={`edit-${record._id}`} />
        )}
    </Space>
);

// ── Mobile transfer card ──────────────────────────────────────────────────────
const TransferCard: React.FC<{
    record: Transfer;
    actionRef: React.RefObject<ActionType>;
    onViewTransfer: (r: Transfer) => void;
    onPrintTransfer: (r: Transfer) => void;
    onApprove: (id: string) => void;
    onComplete: (id: string) => void;
    onRejectClick: (id: string) => void;
    onCancel: (id: string) => void;
    onDelete: (id: string) => void;
    expanded: boolean;
    onToggleExpand: () => void;
}> = ({ record, actionRef, onViewTransfer, onPrintTransfer, onApprove, onComplete, onRejectClick, onCancel, onDelete, expanded, onToggleExpand }) => {
    const isOverdue = record.expected_delivery_date && new Date(record.expected_delivery_date) < new Date();

    return (
        <Card
            style={{
                borderRadius: 12,
                marginBottom: 10,
                border: `1px solid ${record.status === "cancelled" || record.status === "rejected" ? "#fca5a5" : C.tableBorder}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                opacity: record.status === "cancelled" ? 0.75 : 1,
            }}
            bodyStyle={{ padding: "12px 14px" }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Space size={6} style={{ marginBottom: 5, flexWrap: "wrap" }}>
                        <Tag style={{ background: "#eef2ff", color: "#4f46e5", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
                            {record.transfer_code}
                        </Tag>
                        {renderStatus(record.status)}
                    </Space>
                    <RouteDisplay from={record.from_shop_id} to={record.to_shop_id} compact />
                    {record.expected_delivery_date && (
                        <Text style={{ fontSize: 11, color: isOverdue ? C.red : C.subText, display: "block", marginTop: 4 }}>
                            Due: {new Date(record.expected_delivery_date).toLocaleDateString()}
                            {isOverdue && " · Overdue"}
                        </Text>
                    )}
                </div>
                <ActionCell
                    record={record}
                    actionRef={actionRef}
                    onViewTransfer={onViewTransfer}
                    onPrintTransfer={onPrintTransfer}
                    onApprove={onApprove}
                    onComplete={onComplete}
                    onRejectClick={onRejectClick}
                    onCancel={onCancel}
                    onDelete={onDelete}
                    isMobile
                />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div style={{ background: "#eef2ff", borderRadius: 8, padding: "7px 10px" }}>
                    <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Items</Text>
                    <Text strong style={{ fontSize: 15, color: C.indigo }}>{record.total_items}</Text>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: "7px 10px" }}>
                    <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Transfer Date</Text>
                    <Text strong style={{ fontSize: 12, color: C.darkText }}>
                        {new Date(record.transfer_date).toLocaleDateString("en-KE", { dateStyle: "medium" })}
                    </Text>
                </div>
            </div>

            <Button
                type="text"
                size="small"
                onClick={onToggleExpand}
                style={{ width: "100%", height: 28, fontSize: 12, color: C.subText, background: "#f8fafc", borderRadius: 6, border: `1px solid ${C.tableBorder}` }}
            >
                {expanded ? "Hide details ↑" : "View items & details ↓"}
            </Button>

            {expanded && (
                <div style={{ marginTop: 10 }}>
                    <ExpandedRow record={record} isMobile />
                </div>
            )}
        </Card>
    );
};

// ── Mobile list ───────────────────────────────────────────────────────────────
const MobileTransferList: React.FC<{
    actionRef: React.RefObject<ActionType>;
    onViewTransfer: (r: Transfer) => void;
    onPrintTransfer: (r: Transfer) => void;
    onExportToExcel: (d: Transfer[]) => void;
    onExportToPDF: (d: Transfer[]) => void;
    onFetchData: MaterialTransferTableProps["onFetchData"];
    onApproveTransfer: MaterialTransferTableProps["onApproveTransfer"];
    onCompleteTransfer: MaterialTransferTableProps["onCompleteTransfer"];
    onRejectTransfer: MaterialTransferTableProps["onRejectTransfer"];
    onCancelTransfer: MaterialTransferTableProps["onCancelTransfer"];
    onDeleteTransfer: MaterialTransferTableProps["onDeleteTransfer"];
    onRejectClick: (id: string) => void;
}> = ({ actionRef, onViewTransfer, onPrintTransfer, onExportToExcel, onExportToPDF, onFetchData, onApproveTransfer, onCompleteTransfer, onRejectTransfer, onCancelTransfer, onDeleteTransfer, onRejectClick }) => {
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedIds, setExpandedIds] = useState<string[]>([]);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await onFetchData({ current: 1, pageSize: 100 });
            setTransfers(data);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleApprove = async (id: string) => {
        Modal.confirm({
            title: "Approve Transfer",
            content: "This will deduct items from the source shop. Continue?",
            onOk: async () => { const { success } = await onApproveTransfer(id); if (success) load(); },
        });
    };

    const handleComplete = async (id: string) => {
        Modal.confirm({
            title: "Complete Transfer",
            content: "This will add items to the destination shop. Continue?",
            onOk: async () => { const { success } = await onCompleteTransfer(id); if (success) load(); },
        });
    };

    const handleCancel = async (id: string) => {
        Modal.confirm({
            title: "Cancel Transfer",
            content: "Are you sure you want to cancel this transfer?",
            okButtonProps: { danger: true },
            onOk: async () => { const { success } = await onCancelTransfer(id); if (success) load(); },
        });
    };

    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: "Delete Transfer",
            content: "This action cannot be undone.",
            okButtonProps: { danger: true },
            onOk: async () => { const { success } = await onDeleteTransfer(id); if (success) load(); },
        });
    };

    const filtered = transfers.filter(
        (t) => !search || t.transfer_code?.toLowerCase().includes(search.toLowerCase()) ||
            t.from_shop_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
            t.to_shop_id?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const completed = transfers.filter((t) => t.status === "completed").length;
    const pending = transfers.filter((t) => t.status === "pending").length;

    return (
        <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <input
                    placeholder="Search transfers…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ flex: 1, height: 36, borderRadius: 8, border: `1px solid ${C.tableBorder}`, padding: "0 12px", fontSize: 13, outline: "none", color: C.darkText, background: "#f8fafc" }}
                />
                <Button icon={<ReloadOutlined />} onClick={load} loading={loading} style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }} />
                <Dropdown menu={{
                    items: [
                        { key: "excel", label: "Export Excel", icon: <FileExcelOutlined />, onClick: () => onExportToExcel(transfers) },
                        { key: "pdf", label: "Export PDF", icon: <FilePdfOutlined />, onClick: () => onExportToPDF(transfers) },
                    ]
                }}>
                    <Button icon={<FileTextOutlined />} style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }} />
                </Dropdown>
                <AddEditTransferModal key="add-transfer" actionRef={actionRef} />
            </div>

            {!loading && transfers.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {[
                        { label: "Total", value: transfers.length, color: C.indigo, bg: "#eef2ff" },
                        { label: "Pending", value: pending, color: pending > 0 ? C.orange : C.green, bg: pending > 0 ? "#fffbeb" : "#f0fdf4" },
                        { label: "Completed", value: completed, color: C.green, bg: "#f0fdf4" },
                    ].map((s, i) => (
                        <div key={i} style={{ background: s.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                            <Text style={{ fontSize: 13, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
                            <Text style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</Text>
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} style={{ borderRadius: 12, marginBottom: 10, border: `1px solid ${C.tableBorder}` }} bodyStyle={{ padding: 14 }}>
                        <Skeleton active paragraph={{ rows: 3 }} />
                    </Card>
                ))
            ) : filtered.length === 0 ? (
                <Empty description="No transfers found" style={{ padding: "40px 0" }} />
            ) : (
                filtered.map((record) => (
                    <TransferCard
                        key={record._id}
                        record={record}
                        actionRef={actionRef}
                        onViewTransfer={onViewTransfer}
                        onPrintTransfer={onPrintTransfer}
                        onApprove={handleApprove}
                        onComplete={handleComplete}
                        onRejectClick={onRejectClick}
                        onCancel={handleCancel}
                        onDelete={handleDelete}
                        expanded={expandedIds.includes(record._id)}
                        onToggleExpand={() =>
                            setExpandedIds((prev) =>
                                prev.includes(record._id) ? prev.filter((id) => id !== record._id) : [...prev, record._id]
                            )
                        }
                    />
                ))
            )}
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
export const MaterialTransferTable: React.FC<MaterialTransferTableProps> = ({
    onDeleteTransfer,
    onApproveTransfer,
    onCompleteTransfer,
    onRejectTransfer,
    onCancelTransfer,
    onViewTransfer,
    onPrintTransfer,
    onExportToExcel,
    onExportToPDF,
    onFetchData,
}) => {
    const [selectedRows, setSelectedRows] = useState<Transfer[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [selectedTransferId, setSelectedTransferId] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");
    const actionRef = useRef<ActionType>();
    const isMobile = useIsMobile();

    const handleApprove = (id: string) => {
        Modal.confirm({
            title: "Approve Transfer",
            content: "This will deduct items from the source shop. Continue?",
            onOk: async () => { const { success } = await onApproveTransfer(id); if (success) actionRef.current?.reload(); },
        });
    };

    const handleComplete = (id: string) => {
        Modal.confirm({
            title: "Complete Transfer",
            content: "This will add items to the destination shop. Continue?",
            onOk: async () => { const { success } = await onCompleteTransfer(id); if (success) actionRef.current?.reload(); },
        });
    };

    const handleRejectClick = (id: string) => {
        setSelectedTransferId(id);
        setRejectModalVisible(true);
    };

    const handleRejectSubmit = async () => {
        if (!rejectionReason.trim()) {
            Modal.error({ title: "Required", content: "Please enter a rejection reason" });
            return;
        }
        const { success } = await onRejectTransfer(selectedTransferId, rejectionReason);
        if (success) {
            setRejectModalVisible(false);
            setRejectionReason("");
            setSelectedTransferId("");
            actionRef.current?.reload();
        }
    };

    const handleCancel = (id: string) => {
        Modal.confirm({
            title: "Cancel Transfer",
            content: "Are you sure you want to cancel this transfer?",
            okButtonProps: { danger: true },
            onOk: async () => { const { success } = await onCancelTransfer(id); if (success) actionRef.current?.reload(); },
        });
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: "Delete Transfer?",
            content: "This action cannot be undone.",
            okButtonProps: { danger: true },
            onOk: async () => { const { success } = await onDeleteTransfer(id); if (success) actionRef.current?.reload(); },
        });
    };

    // ── Mobile ────────────────────────────────────────────────────────────────
    if (isMobile) {
        return (
            <>
                <MobileTransferList
                    actionRef={actionRef as React.RefObject<ActionType>}
                    onViewTransfer={onViewTransfer}
                    onPrintTransfer={onPrintTransfer}
                    onExportToExcel={onExportToExcel}
                    onExportToPDF={onExportToPDF}
                    onFetchData={onFetchData}
                    onApproveTransfer={onApproveTransfer}
                    onCompleteTransfer={onCompleteTransfer}
                    onRejectTransfer={onRejectTransfer}
                    onCancelTransfer={onCancelTransfer}
                    onDeleteTransfer={onDeleteTransfer}
                    onRejectClick={handleRejectClick}
                />
                <RejectModal
                    visible={rejectModalVisible}
                    reason={rejectionReason}
                    onChange={setRejectionReason}
                    onOk={handleRejectSubmit}
                    onCancel={() => { setRejectModalVisible(false); setRejectionReason(""); setSelectedTransferId(""); }}
                />
            </>
        );
    }

    // ── Desktop ProTable ──────────────────────────────────────────────────────
    return (
        <>
            <ProTable<Transfer>
                rowKey="_id"
                style={{ borderRadius: 12 }}
                headerTitle={
                    <Space size={8}>
                        <div style={{ background: "#eef2ff", borderRadius: 8, padding: "5px 6px", color: C.indigo, fontSize: 15, lineHeight: 1 }}>
                            <SwapOutlined />
                        </div>
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>Material Transfers</Text>
                    </Space>
                }
                search={{
                    labelWidth: "auto",
                    span: { xs: 24, sm: 12, md: 8, lg: 6, xl: 6, xxl: 4 },
                    searchText: "Search",
                    resetText: "Reset",
                    layout: "vertical",
                }}
                rowSelection={{
                    selectedRowKeys: selectedRows.map((r) => r._id),
                    onChange: (_: React.Key[], rows: Transfer[]) => setSelectedRows(rows),
                    preserveSelectedRowKeys: true,
                }}
                actionRef={actionRef}
                expandable={{
                    expandedRowRender: (record) => <ExpandedRow record={record} />,
                    expandedRowKeys,
                    onExpand: (expanded, record) =>
                        setExpandedRowKeys(
                            expanded ? [...expandedRowKeys, record._id] : expandedRowKeys.filter((k) => k !== record._id)
                        ),
                }}
                columns={[
                    {
                        title: "Code",
                        dataIndex: "transfer_code",
                        width: 130,
                        fixed: "left" as const,
                        fieldProps: { placeholder: "Search code" },
                        render: (text: string) => (
                            <Tag style={{ background: "#eef2ff", color: "#4f46e5", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 700, padding: "2px 8px" }}>
                                {text}
                            </Tag>
                        ),
                    },
                    {
                        title: "Route",
                        key: "shops",
                        width: 220,
                        search: false,
                        render: (_: any, record: Transfer) => <RouteDisplay from={record.from_shop_id} to={record.to_shop_id} />,
                    },
                    {
                        title: "Status",
                        dataIndex: "status",
                        align: "center" as const,
                        search: false,
                        width: 130,
                        render: renderStatus,
                        filters: [
                            { text: "Pending", value: "pending" },
                            { text: "In Transit", value: "in_transit" },
                            { text: "Completed", value: "completed" },
                            { text: "Cancelled", value: "cancelled" },
                            { text: "Rejected", value: "rejected" },
                        ],
                        onFilter: (value: any, record: Transfer) => record.status === value,
                    },
                    {
                        title: "Items",
                        dataIndex: "total_items",
                        width: 80,
                        align: "center" as const,
                        search: false,
                        render: (n: number) => (
                            <div style={{ background: "#eef2ff", borderRadius: 6, padding: "2px 10px", display: "inline-block" }}>
                                <Text strong style={{ color: C.indigo, fontSize: 13 }}>{n}</Text>
                            </div>
                        ),
                    },
                    {
                        title: "Transfer Date",
                        dataIndex: "transfer_date",
                        width: 120,
                        search: false,
                        render: (d: string) => d ? (
                            <Text style={{ fontSize: 12, color: C.subText }}>
                                {new Date(d).toLocaleDateString("en-KE", { dateStyle: "medium" })}
                            </Text>
                        ) : "—",
                    },
                    {
                        title: "Expected",
                        dataIndex: "expected_delivery_date",
                        align: "center" as const,
                        width: 130,
                        search: false,
                        render: (d: string) => {
                            if (!d) return <Text style={{ fontSize: 12, color: "#94a3b8" }}>Not set</Text>;
                            const date = new Date(d);
                            const overdue = date < new Date();
                            return (
                                <Tag style={{ background: overdue ? "#fef2f2" : "#eff6ff", color: overdue ? C.red : C.blue, border: "none", borderRadius: 6, fontSize: 11, fontWeight: 500 }}>
                                    {date.toLocaleDateString()}
                                </Tag>
                            );
                        },
                    },
                    {
                        title: "Initiated By",
                        dataIndex: ["initiated_by", "name"],
                        width: 130,
                        search: false,
                        ellipsis: true,
                        render: (name: string) => <Text style={{ fontSize: 12, color: C.subText }}>{name || "N/A"}</Text>,
                    },
                    {
                        title: "Actions",
                        key: "actions",
                        search: false,
                        width: 100,
                        fixed: "right" as const,
                        render: (_: any, record: Transfer) => (
                            <ActionCell
                                record={record}
                                actionRef={actionRef as React.RefObject<ActionType>}
                                onViewTransfer={onViewTransfer}
                                onPrintTransfer={onPrintTransfer}
                                onApprove={handleApprove}
                                onComplete={handleComplete}
                                onRejectClick={handleRejectClick}
                                onCancel={handleCancel}
                                onDelete={handleDelete}
                            />
                        ),
                    },
                ]}
                request={async (params, sort, filter) => {
                    const { data, total } = await onFetchData(params, sort, filter);
                    return { data, total, success: true };
                }}
                scroll={{ x: 1200 }}
                pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    showTotal: (total, range) => (
                        <Text style={{ fontSize: 12, color: C.subText }}>{range[0]}–{range[1]} of {total} transfers</Text>
                    ),
                }}
                tableAlertRender={({ selectedRowKeys }) =>
                    selectedRowKeys.length > 0 ? (
                        <Flex justify="space-between" align="center" gap={16}>
                            <Text style={{ fontSize: 13 }}>{selectedRowKeys.length} selected</Text>
                            <Space size={8}>
                                <Button size="small" icon={<PrinterOutlined />} onClick={() => selectedRows.forEach((r) => onPrintTransfer(r))}>Print</Button>
                                <Button size="small" icon={<FileExcelOutlined />} onClick={() => onExportToExcel(selectedRows)}>Excel</Button>
                                <Button size="small" icon={<FilePdfOutlined />} onClick={() => onExportToPDF(selectedRows)}>PDF</Button>
                            </Space>
                        </Flex>
                    ) : null
                }
                toolBarRender={() => [
                    <AddEditTransferModal key="add-transfer" actionRef={actionRef} />,
                ]}
                options={{
                    density: true,
                    fullScreen: true,
                    reload: () => actionRef.current?.reload(),
                    setting: { draggable: true, checkedReset: true },
                }}
                rowClassName={(record) => {
                    if (record.status === "cancelled") return "row-cancelled";
                    if (record.status === "rejected") return "row-rejected";
                    if (record.status === "completed") return "row-completed";
                    return "";
                }}
            />

            <RejectModal
                visible={rejectModalVisible}
                reason={rejectionReason}
                onChange={setRejectionReason}
                onOk={handleRejectSubmit}
                onCancel={() => { setRejectModalVisible(false); setRejectionReason(""); setSelectedTransferId(""); }}
            />
        </>
    );
};

// ── Reject reason modal ───────────────────────────────────────────────────────
const RejectModal: React.FC<{
    visible: boolean;
    reason: string;
    onChange: (v: string) => void;
    onOk: () => void;
    onCancel: () => void;
}> = ({ visible, reason, onChange, onOk, onCancel }) => (
    <Modal
        title={
            <Space size={8}>
                <div style={{ background: "#fef2f2", borderRadius: 7, padding: "4px 6px", color: C.red, fontSize: 14, lineHeight: 1 }}>
                    <CloseCircleOutlined />
                </div>
                <Text strong style={{ fontSize: 13, color: C.darkText }}>Reject Transfer</Text>
            </Space>
        }
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        okText="Reject"
        okButtonProps={{ danger: true, style: { borderRadius: 7 } }}
        cancelButtonProps={{ style: { borderRadius: 7 } }}
        destroyOnClose
    >
        <Space direction="vertical" style={{ width: "100%" }} size={8}>
            <Text style={{ fontSize: 13, color: C.subText }}>Please provide a reason for rejecting this transfer:</Text>
            <TextArea
                rows={4}
                value={reason}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter rejection reason…"
                style={{ borderRadius: 8 }}
            />
        </Space>
    </Modal>
);

export default MaterialTransferTable;