import React from "react";
import { Button, Input, Select, Empty, Spin, Modal } from "antd";
import {
    FilePdfOutlined,
    FileImageOutlined,
    SignatureOutlined,
    EditOutlined,
    DownloadOutlined,
    MailOutlined,
    ReloadOutlined,
    LinkOutlined,
    DeleteOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    UploadOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import PermissionButton from "@components/PermissionButton";
import { UploadDocumentModal } from "./SigningWorkflowModals";
import type { Document } from "../types/esign.types";
import { DOCUMENT_STATUS_CONFIG } from "../types/esign.types";

export interface DocumentListProps {
    documents: Document[];
    isLoading: boolean;
    statCounts: { total: number; pending: number; signed: number; draft: number };
    searchText: string;
    onSearchChange: (text: string) => void;
    statusFilter: string;
    onStatusFilterChange: (status: string) => void;
    viewMode: "grid" | "list";
    onViewModeChange: (mode: "grid" | "list") => void;
    onOpenSigning: (doc: Document) => void;
    onInitiate: (doc: Document) => void;
    onDownload: (docId: string) => void;
    onShare: (docId: string) => void;
    onClearSignature: (docId: string) => void;
    onOpenLinkModal: (docId: string) => void;
    onDelete: (doc: Document) => void;
    onOpenUpload?: () => void;
    onUploadSuccess?: () => void;
    loadingDocId?: string | null;
}

export const DocumentList: React.FC<DocumentListProps> = ({
    documents,
    isLoading,
    statCounts,
    searchText,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    viewMode,
    onViewModeChange,
    onOpenSigning,
    onInitiate,
    onDownload,
    onShare,
    onClearSignature,
    onOpenLinkModal,
    onDelete,
    onUploadSuccess,
    loadingDocId,
}) => {
    const isDocPdf = (doc: Document) => {
        return (
            doc.attachments?.[0]?.file_type?.includes("pdf") ||
            doc.name?.toLowerCase().endsWith(".pdf")
        );
    };

    return (
        <div>
            {/* ── Stat chips ───────────────────────────────── */}
            {!isLoading && (
                <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                    {[
                        { label: "Total", value: statCounts.total, color: "#6366f1", bg: "#eef2ff", filter: "all" },
                        { label: "Pending", value: statCounts.pending, color: "#f59e0b", bg: "#fffbeb", filter: "pending_signature" },
                        { label: "Signed", value: statCounts.signed, color: "#10b981", bg: "#ecfdf5", filter: "signed" },
                        { label: "Draft", value: statCounts.draft, color: "#6b7280", bg: "#f3f4f6", filter: "draft" },
                    ].map((s) => (
                        <div
                            key={s.label}
                            onClick={() => onStatusFilterChange(s.filter)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                background: s.bg,
                                border: `1.5px solid ${s.color}33`,
                                borderRadius: 12,
                                padding: "10px 18px",
                                cursor: "pointer",
                                transition: "box-shadow .15s",
                            }}
                        >
                            <span style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: s.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Search + filter + view toggle ──────────── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
                <Input
                    placeholder="Search documents…"
                    value={searchText}
                    onChange={(e) => onSearchChange(e.target.value)}
                    allowClear
                    prefix={<SearchOutlined style={{ color: "#9ca3af", marginRight: 2 }} />}
                    style={{ flex: 1, borderRadius: 8, height: 40 }}
                />
                <Select
                    value={statusFilter}
                    onChange={onStatusFilterChange}
                    style={{ width: 190, height: 40 }}
                    options={[
                        { value: "all", label: "All Status" },
                        { value: "draft", label: "Draft" },
                        { value: "pending_signature", label: "Pending Signature" },
                        { value: "partially_signed", label: "Partially Signed" },
                        { value: "signed", label: "Signed" },
                        { value: "declined", label: "Declined" },
                    ]}
                />
                {/* View mode toggle */}
                <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", height: 40 }}>
                    <button
                        onClick={() => onViewModeChange("grid")}
                        title="Card view"
                        style={{
                            width: 40,
                            height: 40,
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: viewMode === "grid" ? "#1677ff" : "#fff",
                            color: viewMode === "grid" ? "#fff" : "#6b7280",
                            transition: "background .15s",
                        }}
                    >
                        <AppstoreOutlined style={{ fontSize: 16 }} />
                    </button>
                    <button
                        onClick={() => onViewModeChange("list")}
                        title="List view"
                        style={{
                            width: 40,
                            height: 40,
                            border: "none",
                            borderLeft: "1px solid #e5e7eb",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: viewMode === "list" ? "#1677ff" : "#fff",
                            color: viewMode === "list" ? "#fff" : "#6b7280",
                            transition: "background .15s",
                        }}
                    >
                        <UnorderedListOutlined style={{ fontSize: 16 }} />
                    </button>
                </div>
            </div>

            {/* ── Document grid / list ──────────────────────── */}
            {isLoading ? (
                <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>
            ) : documents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <Empty description={searchText || statusFilter !== "all" ? "No documents match your filters" : "No documents yet"} />
                    {!searchText && statusFilter === "all" && (
                        <UploadDocumentModal
                            onSuccess={onUploadSuccess}
                            trigger={
                                <Button type="primary" icon={<UploadOutlined />} style={{ marginTop: 16, borderRadius: 8 }}>
                                    Upload your first document
                                </Button>
                            }
                        />
                    )}
                </div>
            ) : viewMode === "grid" ? (
                /* Card View */
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
                    {documents.map((doc) => {
                        const isPdf = isDocPdf(doc);
                        const sc = DOCUMENT_STATUS_CONFIG[doc.status] || DOCUMENT_STATUS_CONFIG.draft;
                        const isSigned = doc.status === "signed";

                        return (
                            <div
                                key={doc._id}
                                style={{
                                    background: "#fff",
                                    borderRadius: 14,
                                    border: "1px solid #e5e7eb",
                                    padding: 20,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 14,
                                    transition: "box-shadow .18s, transform .18s",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.10)";
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.transform = "none";
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: isPdf ? "#fff1f0" : "#e6f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {isPdf ? <FilePdfOutlined style={{ fontSize: 24, color: "#f5222d" }} /> : <FileImageOutlined style={{ fontSize: 24, color: "#1677ff" }} />}
                                    </div>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg, padding: "3px 10px", borderRadius: 20 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dotColor }} />
                                        {sc.label}
                                    </span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", lineHeight: 1.4, marginBottom: 4, wordBreak: "break-word" }}>{doc.name}</div>
                                    {doc.signing_workflow && (
                                        <span style={{ fontSize: 11, color: "#6366f1", background: "#eef2ff", padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>
                                            {doc.signing_workflow.workflow_type === "self_sign" ? "Self-sign" : "Multi-signer"}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    {doc.signing_workflow ? (
                                        <>
                                            <Button
                                                type="primary"
                                                icon={<SignatureOutlined />}
                                                onClick={() => onOpenSigning(doc)}
                                                loading={loadingDocId === doc._id}
                                                style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}
                                            >
                                                {isSigned ? "Preview" : "Sign"}
                                            </Button>
                                            {isSigned && (
                                                <>
                                                    <Button icon={<DownloadOutlined />} onClick={() => onDownload(doc._id)} style={{ borderRadius: 8 }} title="Download" />
                                                    <Button icon={<MailOutlined />} onClick={() => onShare(doc._id)} style={{ borderRadius: 8 }} title="Share via email" />
                                                    <Button
                                                        title="Re-sign"
                                                        icon={<ReloadOutlined />}
                                                        style={{ borderRadius: 8 }}
                                                        onClick={() =>
                                                            Modal.confirm({
                                                                title: "Clear & Re-sign",
                                                                content: "Erase existing signature to re-sign?",
                                                                okText: "Clear & Re-sign",
                                                                okButtonProps: { danger: true },
                                                                onOk: () => onClearSignature(doc._id),
                                                            })
                                                        }
                                                    />
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <PermissionButton permission="SIGNATURE_SEND_FOR_SIGNING">
                                            <Button type="primary" icon={<EditOutlined />} onClick={() => onInitiate(doc)} style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}>
                                                Initiate
                                            </Button>
                                        </PermissionButton>
                                    )}
                                    {Boolean(doc.attachments?.length) && !isSigned && (
                                        <PermissionButton permission="SIGNATURE_SEND_FOR_SIGNING">
                                            <Button icon={<LinkOutlined />} onClick={() => onOpenLinkModal(doc._id)} style={{ borderRadius: 8 }} title="Share signing link (expires in 24h)" />
                                        </PermissionButton>
                                    )}
                                    <PermissionButton permission="SIGNATURE_DELETE">
                                        <Button
                                            danger
                                            icon={<DeleteOutlined />}
                                            style={{ borderRadius: 8 }}
                                            title="Delete"
                                            onClick={() =>
                                                Modal.confirm({
                                                    title: "Delete Document",
                                                    content: `Delete "${doc.name}"? This cannot be undone.`,
                                                    okText: "Delete",
                                                    okButtonProps: { danger: true },
                                                    onOk: () => onDelete(doc),
                                                })
                                            }
                                        />
                                    </PermissionButton>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* List View */
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 130px 120px 200px", gap: 0, padding: "10px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        {["Type", "Document Name", "Status", "Workflow", "Actions"].map((h, i) => (
                            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, gridColumn: i === 4 ? "5 / 6" : undefined, textAlign: i === 4 ? "right" : "left" }}>
                                {h}
                            </div>
                        ))}
                    </div>
                    {documents.map((doc, idx) => {
                        const isPdf = isDocPdf(doc);
                        const sc = DOCUMENT_STATUS_CONFIG[doc.status] || DOCUMENT_STATUS_CONFIG.draft;
                        const isSigned = doc.status === "signed";

                        return (
                            <div
                                key={doc._id}
                                style={{ display: "grid", gridTemplateColumns: "40px 1fr 130px 120px 200px", alignItems: "center", gap: 0, padding: "12px 16px", borderBottom: idx < documents.length - 1 ? "1px solid #f3f4f6" : "none", transition: "background .12s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#fafafa"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    {isPdf ? <FilePdfOutlined style={{ fontSize: 20, color: "#f5222d" }} /> : <FileImageOutlined style={{ fontSize: 20, color: "#1677ff" }} />}
                                </div>
                                <div style={{ fontWeight: 500, fontSize: 13, color: "#111827", paddingRight: 16, wordBreak: "break-word" }}>{doc.name}</div>
                                <div>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg, padding: "2px 9px", borderRadius: 20 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dotColor }} />
                                        {sc.label}
                                    </span>
                                </div>
                                <div>
                                    {doc.signing_workflow ? (
                                        <span style={{ fontSize: 11, color: "#6366f1", background: "#eef2ff", padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>
                                            {doc.signing_workflow.workflow_type === "self_sign" ? "Self-sign" : "Multi-signer"}
                                        </span>
                                    ) : <span style={{ color: "#d1d5db", fontSize: 12 }}>—</span>}
                                </div>
                                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                    {doc.signing_workflow ? (
                                        <>
                                            <Button size="small" type="primary" icon={<SignatureOutlined />} onClick={() => onOpenSigning(doc)} loading={loadingDocId === doc._id} style={{ borderRadius: 6, fontWeight: 600 }}>
                                                {isSigned ? "Preview" : "Sign"}
                                            </Button>
                                            {isSigned && (
                                                <>
                                                    <Button size="small" icon={<DownloadOutlined />} onClick={() => onDownload(doc._id)} style={{ borderRadius: 6 }} title="Download" />
                                                    <Button size="small" icon={<MailOutlined />} onClick={() => onShare(doc._id)} style={{ borderRadius: 6 }} title="Share via email" />
                                                    <Button
                                                        size="small"
                                                        title="Re-sign"
                                                        icon={<ReloadOutlined />}
                                                        style={{ borderRadius: 6 }}
                                                        onClick={() =>
                                                            Modal.confirm({
                                                                title: "Clear & Re-sign",
                                                                content: "Erase existing signature to re-sign?",
                                                                okText: "Clear & Re-sign",
                                                                okButtonProps: { danger: true },
                                                                onOk: () => onClearSignature(doc._id),
                                                            })
                                                        }
                                                    />
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <PermissionButton permission="SIGNATURE_SEND_FOR_SIGNING">
                                            <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => onInitiate(doc)} style={{ borderRadius: 6 }}>
                                                Initiate
                                            </Button>
                                        </PermissionButton>
                                    )}
                                    {Boolean(doc.attachments?.length) && !isSigned && (
                                        <PermissionButton permission="SIGNATURE_SEND_FOR_SIGNING">
                                            <Button size="small" icon={<LinkOutlined />} onClick={() => onOpenLinkModal(doc._id)} style={{ borderRadius: 6 }} title="Share signing link (expires in 24h)" />
                                        </PermissionButton>
                                    )}
                                    <PermissionButton permission="SIGNATURE_DELETE">
                                        <Button
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            style={{ borderRadius: 6 }}
                                            title="Delete"
                                            onClick={() =>
                                                Modal.confirm({
                                                    title: "Delete Document",
                                                    content: `Delete "${doc.name}"? This cannot be undone.`,
                                                    okText: "Delete",
                                                    okButtonProps: { danger: true },
                                                    onOk: () => onDelete(doc),
                                                })
                                            }
                                        />
                                    </PermissionButton>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DocumentList;
