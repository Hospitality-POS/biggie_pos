import React, { useState, useCallback, useRef } from "react";
import {
    ProTable,
    ProForm,
    ProFormText,
    ProFormSelect,
    ProFormTextArea,
    ProFormDatePicker,
    ProFormDigit,
} from "@ant-design/pro-components";
import {
    Button, Space, Tag, Tooltip, Popconfirm, Typography, Badge, Card,
    Tabs, App, Drawer, Row, Col, Statistic, Input, Select, Upload,
    Modal, Divider, Empty, Spin, Grid, Dropdown, Breadcrumb, Form,
    Segmented, Alert,
} from "antd";
import {
    FolderOutlined, FileOutlined, PlusOutlined,
    EditOutlined, DeleteOutlined, SearchOutlined, UploadOutlined,
    DownloadOutlined, EyeOutlined, MoreOutlined, HomeOutlined,
    FileTextOutlined, BankOutlined, FileDoneOutlined, FileProtectOutlined,
    InboxOutlined, ReloadOutlined,
    AppstoreOutlined, UnorderedListOutlined,
    CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
    FilePdfOutlined, FileImageOutlined, FileExcelOutlined, FileWordOutlined,
    FolderAddOutlined, CloudUploadOutlined, RobotOutlined, ThunderboltOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
    createFolder, getFolders, updateFolder, deleteFolder, getFolderTree,
    createDocument, getAllDocuments, getDocumentById, updateDocument,
    updateDocumentStatus, deleteDocument, searchDocuments, getCheques,
    getChequeStats, addAttachments, removeAttachments,
    DocumentRecord, DocumentType, DocumentStatus, SearchParams, SearchMode,
} from "@services/documents";

dayjs.extend(relativeTime);

const { Text, Title, Paragraph } = Typography;
const { useBreakpoint } = Grid;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const DOC_TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    folder: { label: "Folder", icon: <FolderOutlined />, color: "#f5a623" },
    cheque: { label: "Cheque", icon: <BankOutlined />, color: "#1677ff" },
    invoice: { label: "Invoice", icon: <FileTextOutlined />, color: "#52c41a" },
    quotation: { label: "Quotation", icon: <FileDoneOutlined />, color: "#722ed1" },
    receipt: { label: "Receipt", icon: <CheckCircleOutlined />, color: "#13c2c2" },
    purchase_order: { label: "Purchase Order", icon: <InboxOutlined />, color: "#eb2f96" },
    delivery_note: { label: "Delivery Note", icon: <FileProtectOutlined />, color: "#fa8c16" },
    credit_note: { label: "Credit Note", icon: <FileExcelOutlined />, color: "#f5222d" },
    contract: { label: "Contract", icon: <FilePdfOutlined />, color: "#2f54eb" },
    other: { label: "Other", icon: <FileOutlined />, color: "#8c8c8c" },
};

const STATUS_META: Record<string, { label: string; color: string; badgeStatus: any }> = {
    draft: { label: "Draft", color: "default", badgeStatus: "default" },
    active: { label: "Active", color: "green", badgeStatus: "success" },
    archived: { label: "Archived", color: "default", badgeStatus: "default" },
    cancelled: { label: "Cancelled", color: "red", badgeStatus: "error" },
    cheque_received: { label: "Received", color: "blue", badgeStatus: "processing" },
    cheque_pending: { label: "Pending", color: "orange", badgeStatus: "warning" },
    cheque_processed: { label: "Processed", color: "green", badgeStatus: "success" },
    cheque_bounced: { label: "Bounced", color: "red", badgeStatus: "error" },
    cheque_cancelled: { label: "Cancelled", color: "default", badgeStatus: "default" },
    sent: { label: "Sent", color: "blue", badgeStatus: "processing" },
    approved: { label: "Approved", color: "green", badgeStatus: "success" },
    rejected: { label: "Rejected", color: "red", badgeStatus: "error" },
    paid: { label: "Paid", color: "green", badgeStatus: "success" },
    partially_paid: { label: "Partial", color: "orange", badgeStatus: "warning" },
    overdue: { label: "Overdue", color: "red", badgeStatus: "error" },
    fulfilled: { label: "Fulfilled", color: "cyan", badgeStatus: "success" },
};

const CHEQUE_STATUSES: DocumentStatus[] = [
    "cheque_received", "cheque_pending", "cheque_processed", "cheque_bounced", "cheque_cancelled",
];

const getFileIcon = (fileType: string) => {
    if (fileType?.includes("pdf")) return <FilePdfOutlined style={{ color: "#f5222d", fontSize: 20 }} />;
    if (fileType?.includes("image")) return <FileImageOutlined style={{ color: "#1677ff", fontSize: 20 }} />;
    if (fileType?.includes("sheet") || fileType?.includes("excel")) return <FileExcelOutlined style={{ color: "#52c41a", fontSize: 20 }} />;
    if (fileType?.includes("word") || fileType?.includes("document")) return <FileWordOutlined style={{ color: "#1677ff", fontSize: 20 }} />;
    return <FileOutlined style={{ color: "#8c8c8c", fontSize: 20 }} />;
};

const formatFileSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getShopId = () => localStorage.getItem("shopId") || "";

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Stat Card for Cheque Dashboard
// ─────────────────────────────────────────────────────────────────────────────

const ChequeStatCard: React.FC<{
    label: string; count: number; amount: number; color: string; icon: React.ReactNode;
}> = ({ label, count, amount, color, icon }) => (
    <Card
        size="small"
        style={{
            borderLeft: `3px solid ${color}`, borderRadius: 8,
            background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
        styles={{ body: { padding: "12px 16px" } }}
    >
        <Space direction="vertical" size={2} style={{ width: "100%" }}>
            <Space>
                <span style={{ color, fontSize: 16 }}>{icon}</span>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>{label}</Text>
            </Space>
            <Title level={4} style={{ margin: 0, color }}>{count}</Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
                KES {amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </Text>
        </Space>
    </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Search Mode Toggle
// ─────────────────────────────────────────────────────────────────────────────

const SearchModeToggle: React.FC<{
    mode: SearchMode;
    onChange: (mode: SearchMode) => void;
    fallbackActive?: boolean;
}> = ({ mode, onChange, fallbackActive }) => (
    <Space size={6} align="center">
        <Segmented
            size="small"
            value={mode}
            onChange={(v) => onChange(v as SearchMode)}
            options={[
                {
                    value: "normal",
                    icon: <ThunderboltOutlined />,
                    label: <span style={{ fontSize: 11 }}>Normal</span>,
                },
                {
                    value: "ai",
                    icon: <RobotOutlined />,
                    label: <span style={{ fontSize: 11 }}>AI</span>,
                },
            ]}
        />
        {fallbackActive && (
            <Tooltip title="AI search is unavailable (OPENAI_API_KEY not configured). Showing normal search results.">
                <InfoCircleOutlined style={{ color: "#fa8c16", fontSize: 13 }} />
            </Tooltip>
        )}
    </Space>
);

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Document Card (grid view)
// ─────────────────────────────────────────────────────────────────────────────

const DocumentCard: React.FC<{
    doc: DocumentRecord;
    onOpen: (doc: DocumentRecord) => void;
    onEdit: (doc: DocumentRecord) => void;
    onDelete: (doc: DocumentRecord) => void;
    onStatusChange: (doc: DocumentRecord, status: DocumentStatus) => void;
    showSimilarity?: boolean;
}> = ({ doc, onOpen, onEdit, onDelete, onStatusChange, showSimilarity }) => {
    const meta = DOC_TYPE_META[doc.document_type] || DOC_TYPE_META.other;
    const statusMeta = STATUS_META[doc.status] || { label: doc.status, color: "default", badgeStatus: "default" };
    const isFolder = doc.document_type === "folder";

    const menuItems = [
        { key: "edit", label: "Edit", icon: <EditOutlined /> },
        ...(isFolder ? [] : [{ key: "view", label: "View Attachments", icon: <EyeOutlined /> }]),
        { key: "delete", label: "Delete", icon: <DeleteOutlined />, danger: true },
    ];

    return (
        <Card
            hoverable
            onClick={() => onOpen(doc)}
            style={{
                borderRadius: 10, border: "1px solid #f0f0f0",
                cursor: "pointer", transition: "all 0.2s ease",
                position: "relative", overflow: "hidden",
            }}
            styles={{ body: { padding: "14px 16px" } }}
        >
            {/* Top colour accent */}
            <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: meta.color, borderRadius: "10px 10px 0 0",
            }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 8,
                    background: `${meta.color}15`, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 20, color: meta.color,
                }}>
                    {meta.icon}
                </div>
                <Dropdown
                    menu={{
                        items: menuItems,
                        onClick: ({ key, domEvent }) => {
                            domEvent.stopPropagation();
                            if (key === "edit") onEdit(doc);
                            if (key === "delete") onDelete(doc);
                        },
                    }}
                    trigger={["click"]}
                >
                    <Button
                        type="text" size="small" icon={<MoreOutlined />}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "#8c8c8c" }}
                    />
                </Dropdown>
            </div>

            <div style={{ marginTop: 10 }}>
                <Text
                    strong
                    style={{ display: "block", fontSize: 13, marginBottom: 2 }}
                    ellipsis={{ tooltip: doc.name }}
                >
                    {doc.name}
                </Text>
                <Text style={{ fontSize: 11, color: "#8c8c8c" }}>{meta.label}</Text>
            </div>

            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {!isFolder ? (
                    <Tag color={statusMeta.color} style={{ fontSize: 10, lineHeight: "18px", padding: "0 6px", margin: 0 }}>
                        {statusMeta.label}
                    </Tag>
                ) : <span />}
                <Text type="secondary" style={{ fontSize: 10 }}>
                    {dayjs(doc.createdAt).fromNow()}
                </Text>
            </div>

            <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {doc.attachments && doc.attachments.length > 0 && (
                    <Tag style={{ fontSize: 10, lineHeight: "18px", padding: "0 5px" }}>
                        {doc.attachments.length} file{doc.attachments.length > 1 ? "s" : ""}
                    </Tag>
                )}
                {showSimilarity && doc._similarity !== undefined && (
                    <Tooltip title={`AI relevance score: ${(doc._similarity * 100).toFixed(0)}%`}>
                        <Tag
                            icon={<RobotOutlined />}
                            color="geekblue"
                            style={{ fontSize: 10, lineHeight: "18px", padding: "0 5px" }}
                        >
                            {(doc._similarity * 100).toFixed(0)}%
                        </Tag>
                    </Tooltip>
                )}
            </div>
        </Card>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Document Detail Drawer
// ─────────────────────────────────────────────────────────────────────────────

const DocumentDetailDrawer: React.FC<{
    open: boolean;
    onClose: () => void;
    documentId: string | null;
    onEdit: () => void;
    onStatusChange: (status: DocumentStatus, meta?: any) => void;
}> = ({ open, onClose, documentId, onEdit, onStatusChange }) => {
    const { data: doc, isLoading } = useQuery({
        queryKey: ["document", documentId],
        queryFn: () => getDocumentById(documentId!),
        enabled: open && !!documentId,
    });

    if (!doc) return (
        <Drawer open={open} onClose={onClose} width={520} title="Document Details">
            {isLoading
                ? <Spin style={{ display: "block", marginTop: 80, textAlign: "center" }} />
                : <Empty />
            }
        </Drawer>
    );

    const meta = DOC_TYPE_META[doc.document_type] || DOC_TYPE_META.other;
    const statusMeta = STATUS_META[doc.status] || { label: doc.status, color: "default" };
    const isCheque = doc.document_type === "cheque";

    return (
        <Drawer
            open={open} onClose={onClose} width={520}
            title={
                <Space>
                    <span style={{ color: meta.color, fontSize: 18 }}>{meta.icon}</span>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{doc.name}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{doc.code}</Text>
                    </div>
                </Space>
            }
            extra={<Button size="small" icon={<EditOutlined />} onClick={onEdit}>Edit</Button>}
            footer={null}
        >
            {/* Status + quick transitions */}
            <div style={{ marginBottom: 20 }}>
                <Space wrap>
                    <Tag color={statusMeta.color} style={{ fontSize: 13, padding: "3px 10px" }}>
                        {statusMeta.label}
                    </Tag>
                    {isCheque && CHEQUE_STATUSES.filter(s => s !== doc.status).map(s => (
                        <Button key={s} size="small" type="dashed" onClick={() => onStatusChange(s)} style={{ fontSize: 11 }}>
                            → {STATUS_META[s]?.label}
                        </Button>
                    ))}
                </Space>
            </div>

            <Divider style={{ margin: "12px 0" }} />

            {/* Core info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 16 }}>
                <div>
                    <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Type</Text>
                    <Text style={{ fontSize: 13 }}>{meta.label}</Text>
                </div>
                <div>
                    <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Created</Text>
                    <Text style={{ fontSize: 13 }}>{dayjs(doc.createdAt).format("DD MMM YYYY")}</Text>
                </div>
                {doc.counterparty?.name && (
                    <div>
                        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Counterparty</Text>
                        <Text style={{ fontSize: 13 }}>{doc.counterparty.name}</Text>
                    </div>
                )}
                {doc.meta?.reference_number && (
                    <div>
                        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Reference</Text>
                        <Text code style={{ fontSize: 12 }}>{doc.meta.reference_number}</Text>
                    </div>
                )}
            </div>

            {/* Cheque meta */}
            {isCheque && doc.meta && (
                <>
                    <Divider orientation="left" plain style={{ fontSize: 12 }}>Cheque Details</Divider>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", marginBottom: 16 }}>
                        {([
                            ["Cheque No.", doc.meta.cheque_number],
                            ["Bank", doc.meta.bank_name],
                            ["Drawer", doc.meta.drawer_name],
                            ["Payee", doc.meta.payee_name],
                            ["Amount", doc.meta.amount ? `KES ${doc.meta.amount.toLocaleString()}` : null],
                            ["Due Date", doc.meta.due_date ? dayjs(doc.meta.due_date).format("DD MMM YYYY") : null],
                        ] as [string, string | null][]).filter(([, v]) => v).map(([label, value]) => (
                            <div key={label}>
                                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{label}</Text>
                                <Text style={{ fontSize: 13 }}>{value}</Text>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Financial meta */}
            {doc.meta?.total_amount !== undefined && (
                <>
                    <Divider orientation="left" plain style={{ fontSize: 12 }}>Financials</Divider>
                    <Row gutter={12} style={{ marginBottom: 16 }}>
                        {[
                            { title: "Total", value: doc.meta.total_amount, color: "#1d39c4" },
                            { title: "Paid", value: doc.meta.amount_paid, color: "#389e0d" },
                            { title: "Balance", value: doc.meta.balance_due, color: (doc.meta.balance_due ?? 0) > 0 ? "#cf1322" : "#389e0d" },
                        ].map(({ title, value, color }) => (
                            <Col span={8} key={title}>
                                <Statistic
                                    title={<span style={{ fontSize: 11 }}>{title}</span>}
                                    value={value || 0}
                                    precision={2}
                                    prefix="KES"
                                    valueStyle={{ fontSize: 14, color }}
                                />
                            </Col>
                        ))}
                    </Row>
                </>
            )}

            {/* Description */}
            {doc.description && (
                <>
                    <Divider orientation="left" plain style={{ fontSize: 12 }}>Notes</Divider>
                    <Paragraph style={{ fontSize: 13, color: "#595959" }}>{doc.description}</Paragraph>
                </>
            )}

            {/* Attachments */}
            {doc.attachments && doc.attachments.length > 0 && (
                <>
                    <Divider orientation="left" plain style={{ fontSize: 12 }}>
                        Attachments ({doc.attachments.length})
                    </Divider>
                    <Space direction="vertical" style={{ width: "100%" }}>
                        {doc.attachments.map((att) => (
                            <div
                                key={att.file_url}
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "8px 12px", background: "#fafafa", borderRadius: 6,
                                    border: "1px solid #f0f0f0",
                                }}
                            >
                                <Space size={8}>
                                    {getFileIcon(att.file_type)}
                                    <div>
                                        <Text style={{ fontSize: 12, display: "block" }} ellipsis={{ tooltip: att.file_name }}>
                                            {att.file_name}
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: 10 }}>{formatFileSize(att.file_size)}</Text>
                                    </div>
                                </Space>
                                <Button
                                    type="link" size="small" icon={<DownloadOutlined />}
                                    href={att.file_url} target="_blank" rel="noopener noreferrer"
                                />
                            </div>
                        ))}
                    </Space>
                </>
            )}
        </Drawer>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Create/Edit Drawer
// ─────────────────────────────────────────────────────────────────────────────

const DocumentFormDrawer: React.FC<{
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingDoc?: DocumentRecord | null;
    parentFolderId?: string | null;
    initialType?: DocumentType;
}> = ({ open, onClose, onSuccess, editingDoc, parentFolderId, initialType }) => {
    const [form] = ProForm.useForm();
    const [fileList, setFileList] = useState<any[]>([]);
    const isEdit = !!editingDoc;
    const docType: DocumentType = ProForm.useWatch("document_type", form) || initialType;

    const isCheque = docType === "cheque";
    const isFinancial = ["invoice", "quotation", "receipt", "purchase_order", "credit_note"].includes(docType);
    const isFolder = docType === "folder";

    React.useEffect(() => {
        if (open && editingDoc) {
            form.setFieldsValue({
                name: editingDoc.name,
                document_type: editingDoc.document_type,
                status: editingDoc.status,
                description: editingDoc.description,
                counterparty_name: editingDoc.counterparty?.name,
                counterparty_email: editingDoc.counterparty?.email,
                counterparty_phone: editingDoc.counterparty?.phone,
                ...editingDoc.meta,
            });
        } else if (open && !editingDoc) {
            form.resetFields();
            if (initialType) form.setFieldValue("document_type", initialType);
            setFileList([]);
        }
    }, [open, editingDoc, initialType, form]);

    const handleSubmit = async (values: any) => {
        const { counterparty_name, counterparty_email, counterparty_phone, ...rest } = values;
        const files = fileList.map(f => f.originFileObj).filter(Boolean);
        const counterparty = (counterparty_name || counterparty_email || counterparty_phone)
            ? { name: counterparty_name, email: counterparty_email, phone: counterparty_phone }
            : undefined;

        const metaFields = [
            "cheque_number", "bank_name", "account_number", "drawer_name", "payee_name",
            "amount", "due_date", "issue_date", "processed_date", "reference_number",
            "payment_terms", "notes", "currency", "total_amount", "subtotal",
            "tax_amount", "discount_amount", "amount_paid",
        ];
        const meta: any = {};
        metaFields.forEach(k => { if (rest[k] !== undefined) { meta[k] = rest[k]; delete rest[k]; } });

        const payload = { ...rest, counterparty, meta, parent_id: parentFolderId, files };

        if (isEdit && editingDoc) {
            await updateDocument(editingDoc._id, payload);
        } else {
            await createDocument(payload);
        }
        onSuccess();
        onClose();
    };

    const docTypeOptions = Object.entries(DOC_TYPE_META)
        .filter(([k]) => k !== "folder")
        .map(([value, { label }]) => ({ value, label }));

    const statusOptions = isFolder ? [] : isCheque
        ? CHEQUE_STATUSES.map(s => ({ value: s, label: STATUS_META[s]?.label || s }))
        : Object.entries(STATUS_META)
            .filter(([k]) => !k.startsWith("cheque_"))
            .map(([value, { label }]) => ({ value, label }));

    return (
        <Drawer
            title={isEdit ? `Edit — ${editingDoc?.name}` : isFolder ? "New Folder" : "New Document"}
            open={open} onClose={onClose} width={560} destroyOnClose footer={null}
        >
            <ProForm
                form={form}
                onFinish={handleSubmit}
                initialValues={{ document_type: initialType || "invoice", status: "draft", currency: "KES" }}
                submitter={{
                    searchConfig: { submitText: isEdit ? "Save Changes" : "Create", resetText: "Cancel" },
                    onReset: onClose,
                }}
                layout="vertical"
            >
                <ProFormText
                    name="name" label="Name"
                    placeholder={isFolder ? "e.g. Customer Contracts 2024" : "e.g. Invoice for Kamau Enterprises"}
                    rules={[{ required: true, message: "Name is required" }]}
                />

                {!isEdit && (
                    <ProFormSelect
                        name="document_type" label="Document Type"
                        options={[
                            { value: "folder", label: "📁 Folder" },
                            ...docTypeOptions,
                        ]}
                        rules={[{ required: true }]}
                    />
                )}

                {!isFolder && (
                    <ProFormSelect name="status" label="Status" options={statusOptions} placeholder="Select status" />
                )}

                <ProFormTextArea name="description" label="Description" fieldProps={{ rows: 2 }} />

                {/* Counterparty */}
                {!isFolder && (
                    <>
                        <Divider orientation="left" plain>
                            <Text type="secondary" style={{ fontSize: 12 }}>Counterparty</Text>
                        </Divider>
                        <Row gutter={12}>
                            <Col span={12}>
                                <ProFormText name="counterparty_name" label="Name" placeholder="Client or vendor name" />
                            </Col>
                            <Col span={12}>
                                <ProFormText name="counterparty_phone" label="Phone" placeholder="+254..." />
                            </Col>
                        </Row>
                        <ProFormText name="counterparty_email" label="Email" placeholder="email@example.com" />
                    </>
                )}

                {/* Cheque fields */}
                {isCheque && (
                    <>
                        <Divider orientation="left" plain>
                            <Text type="secondary" style={{ fontSize: 12 }}>Cheque Details</Text>
                        </Divider>
                        <Row gutter={12}>
                            <Col span={12}><ProFormText name="cheque_number" label="Cheque Number" /></Col>
                            <Col span={12}><ProFormText name="bank_name" label="Bank Name" /></Col>
                        </Row>
                        <Row gutter={12}>
                            <Col span={12}><ProFormText name="drawer_name" label="Drawer Name" /></Col>
                            <Col span={12}><ProFormText name="payee_name" label="Payee Name" /></Col>
                        </Row>
                        <Row gutter={12}>
                            <Col span={12}>
                                <ProFormDigit name="amount" label="Amount (KES)" fieldProps={{ prefix: "KES", precision: 2 }} />
                            </Col>
                            <Col span={12}>
                                <ProFormDatePicker name="due_date" label="Cheque Date" fieldProps={{ style: { width: "100%" } }} />
                            </Col>
                        </Row>
                    </>
                )}

                {/* Financial fields */}
                {isFinancial && (
                    <>
                        <Divider orientation="left" plain>
                            <Text type="secondary" style={{ fontSize: 12 }}>Financial Details</Text>
                        </Divider>
                        <Row gutter={12}>
                            <Col span={12}><ProFormText name="reference_number" label="Reference No." /></Col>
                            <Col span={12}><ProFormText name="payment_terms" label="Payment Terms" placeholder="e.g. Net 30" /></Col>
                        </Row>
                        <Row gutter={12}>
                            <Col span={12}>
                                <ProFormDatePicker name="issue_date" label="Issue Date" fieldProps={{ style: { width: "100%" } }} />
                            </Col>
                            <Col span={12}>
                                <ProFormDatePicker name="due_date" label="Due Date" fieldProps={{ style: { width: "100%" } }} />
                            </Col>
                        </Row>
                        <Row gutter={12}>
                            <Col span={8}><ProFormDigit name="subtotal" label="Subtotal" fieldProps={{ precision: 2 }} /></Col>
                            <Col span={8}><ProFormDigit name="tax_amount" label="Tax" fieldProps={{ precision: 2 }} /></Col>
                            <Col span={8}><ProFormDigit name="total_amount" label="Total" fieldProps={{ precision: 2 }} /></Col>
                        </Row>
                        <Row gutter={12}>
                            <Col span={12}><ProFormDigit name="amount_paid" label="Amount Paid" fieldProps={{ precision: 2 }} /></Col>
                            <Col span={12}><ProFormText name="currency" label="Currency" /></Col>
                        </Row>
                    </>
                )}

                {/* Attachments */}
                {!isFolder && (
                    <>
                        <Divider orientation="left" plain>
                            <Text type="secondary" style={{ fontSize: 12 }}>Attachments</Text>
                        </Divider>
                        <Form.Item name="_files">
                            <Upload.Dragger
                                multiple fileList={fileList}
                                onChange={({ fileList: fl }) => setFileList(fl)}
                                beforeUpload={() => false}
                                style={{ borderRadius: 8 }}
                            >
                                <p className="ant-upload-drag-icon">
                                    <CloudUploadOutlined style={{ fontSize: 28, color: "#1677ff" }} />
                                </p>
                                <p style={{ fontSize: 13, margin: 0 }}>Drop files here or click to upload</p>
                                <p style={{ fontSize: 11, color: "#8c8c8c", margin: "4px 0 0" }}>
                                    Supports PDF, images, Word, Excel
                                </p>
                            </Upload.Dragger>
                        </Form.Item>
                    </>
                )}
            </ProForm>
        </Drawer>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const DocumentCenterPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { modal } = App.useApp();
    const shopId = getShopId();
    const screens = useBreakpoint();

    // ── View & Navigation ────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [activeTab, setActiveTab] = useState<"all" | "cheques" | "invoices" | "folders">("all");
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([
        { id: null, name: "All Documents" },
    ]);

    // ── Search & Filter ──────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState("");
    const [searchMode, setSearchMode] = useState<SearchMode>("normal");
    const [searchActive, setSearchActive] = useState(false);
    const [searchResults, setSearchResults] = useState<DocumentRecord[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchFacets, setSearchFacets] = useState<any>(null);
    const [searchModeUsed, setSearchModeUsed] = useState<string | null>(null); // actual mode returned by server
    const [filterStatus, setFilterStatus] = useState<string | undefined>();
    const [filterType, setFilterType] = useState<string | undefined>();

    // ── Drawer State ─────────────────────────────────────────────────────────
    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [initialDocType, setInitialDocType] = useState<DocumentType | undefined>();

    const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

    // ── Data Fetching ────────────────────────────────────────────────────────

    const { data: folders = [], isLoading: foldersLoading } = useQuery({
        queryKey: ["folders", currentFolderId, shopId],
        queryFn: () => getFolders({ parent_id: currentFolderId, shop_id: shopId }),
        enabled: !searchActive,
    });

    const docsQuery: any = {
        shop_id: shopId,
        parent_id: currentFolderId || undefined,
        pageSize: 50,
    };
    if (activeTab === "cheques") docsQuery.document_type = "cheque";
    if (activeTab === "invoices") docsQuery.document_type = "invoice";
    if (filterStatus) docsQuery.status = filterStatus;

    const { data: docsData, isLoading: docsLoading } = useQuery({
        queryKey: ["documents", docsQuery],
        queryFn: () => getAllDocuments(docsQuery),
        enabled: !searchActive,
    });

    const documents: DocumentRecord[] = docsData?.data || [];

    const { data: chequeStats } = useQuery({
        queryKey: ["cheque-stats", shopId],
        queryFn: () => getChequeStats(shopId),
        enabled: activeTab === "cheques",
    });

    // ── Mutations ────────────────────────────────────────────────────────────

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["folders"] });
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        queryClient.invalidateQueries({ queryKey: ["cheque-stats"] });
    };

    const statusMutation = useMutation({
        mutationFn: ({ id, status, meta }: { id: string; status: DocumentStatus; meta?: any }) =>
            updateDocumentStatus(id, status, meta),
        onSuccess: () => {
            invalidate();
            queryClient.invalidateQueries({ queryKey: ["document", selectedDocId] });
        },
    });

    const deleteMutation = useMutation({ mutationFn: (id: string) => deleteDocument(id), onSuccess: invalidate });
    const deleteFolderMutation = useMutation({ mutationFn: (id: string) => deleteFolder(id), onSuccess: invalidate });

    // ── Search ───────────────────────────────────────────────────────────────

    const runSearch = useCallback((q: string, mode: SearchMode, status?: string, type?: string) => {
        clearTimeout(searchTimeout.current);
        if (!q.trim()) {
            setSearchActive(false);
            setSearchResults([]);
            setSearchFacets(null);
            setSearchModeUsed(null);
            return;
        }
        setSearchActive(true);
        setSearchLoading(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const params: SearchParams = {
                    q,
                    mode,
                    shop_id: shopId,
                    document_type: type,
                    status,
                    pageSize: 50,
                };
                const result = await searchDocuments(params);
                setSearchResults(result.data);
                setSearchFacets(result.facets);
                setSearchModeUsed(result.search_mode);
            } catch {
                // error already shown by service layer
            } finally {
                setSearchLoading(false);
            }
        }, 400);
    }, [shopId]);

    const handleSearch = useCallback((q: string) => {
        setSearchQuery(q);
        runSearch(q, searchMode, filterStatus, filterType);
    }, [searchMode, filterStatus, filterType, runSearch]);

    const handleModeChange = useCallback((mode: SearchMode) => {
        setSearchMode(mode);
        if (searchQuery) runSearch(searchQuery, mode, filterStatus, filterType);
    }, [searchQuery, filterStatus, filterType, runSearch]);

    // ── Navigation ───────────────────────────────────────────────────────────

    const openFolder = (folder: DocumentRecord) => {
        setCurrentFolderId(folder._id);
        setBreadcrumbs(prev => [...prev, { id: folder._id, name: folder.name }]);
        setActiveTab("all");
    };

    const navigateBreadcrumb = (crumb: { id: string | null; name: string }, idx: number) => {
        setCurrentFolderId(crumb.id);
        setBreadcrumbs(prev => prev.slice(0, idx + 1));
    };

    // ── Document actions ─────────────────────────────────────────────────────

    const openDoc = (doc: DocumentRecord) => {
        if (doc.document_type === "folder") {
            openFolder(doc);
        } else {
            setSelectedDocId(doc._id);
            setDetailOpen(true);
        }
    };

    const openCreate = (type?: DocumentType) => {
        setEditingDoc(null);
        setInitialDocType(type);
        setFormOpen(true);
    };

    const openEdit = (doc: DocumentRecord) => {
        setEditingDoc(doc);
        setInitialDocType(doc.document_type);
        setFormOpen(true);
    };

    const confirmDelete = (doc: DocumentRecord) => {
        modal.confirm({
            title: `Delete "${doc.name}"?`,
            content: doc.document_type === "folder"
                ? "This will delete the folder and all its contents. This cannot be undone."
                : "This document will be moved to trash.",
            okText: "Delete",
            okButtonProps: { danger: true },
            onOk: () => doc.document_type === "folder"
                ? deleteFolderMutation.mutate(doc._id)
                : deleteMutation.mutate(doc._id),
        });
    };

    // ── Derived state ────────────────────────────────────────────────────────

    const displayDocs = searchActive ? searchResults : documents;
    const displayFolders = searchActive ? [] : folders;
    const isLoading = foldersLoading || docsLoading || searchLoading;
    const isFallback = searchModeUsed === "fallback_normal" && searchMode === "ai";
    const isAiResults = searchModeUsed === "ai";

    const quickCreateItems = [
        { key: "folder", label: "Folder", icon: <FolderAddOutlined /> },
        { type: "divider" as const },
        ...Object.entries(DOC_TYPE_META)
            .filter(([k]) => k !== "folder")
            .map(([key, { label, icon }]) => ({ key, label, icon })),
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 0 }}>

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "16px 24px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Space align="center">
                        <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <FileDoneOutlined style={{ color: "#fff", fontSize: 18 }} />
                        </div>
                        <div>
                            <Title level={5} style={{ margin: 0, fontSize: 16 }}>Document Center</Title>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Manage folders, cheques, invoices & more
                            </Text>
                        </div>
                    </Space>

                    <Space>
                        <Button.Group>
                            <Button
                                icon={<AppstoreOutlined />}
                                type={viewMode === "grid" ? "primary" : "default"}
                                onClick={() => setViewMode("grid")}
                                size="small"
                            />
                            <Button
                                icon={<UnorderedListOutlined />}
                                type={viewMode === "list" ? "primary" : "default"}
                                onClick={() => setViewMode("list")}
                                size="small"
                            />
                        </Button.Group>

                        <Dropdown
                            menu={{
                                items: quickCreateItems,
                                onClick: ({ key }) => openCreate(key as DocumentType),
                            }}
                            trigger={["click"]}
                        >
                            <Button type="primary" icon={<PlusOutlined />}>New</Button>
                        </Dropdown>
                    </Space>
                </div>

                {/* Tabs */}
                <Tabs
                    activeKey={activeTab}
                    onChange={(k) => {
                        setActiveTab(k as any);
                        setFilterType(k === "cheques" ? "cheque" : k === "invoices" ? "invoice" : undefined);
                        setSearchActive(false);
                        setSearchQuery("");
                        setSearchModeUsed(null);
                    }}
                    size="small"
                    tabBarStyle={{ marginBottom: 0 }}
                    items={[
                        { key: "all", label: "All Documents" },
                        { key: "folders", label: "Folders" },
                        { key: "cheques", label: <Space size={4}><BankOutlined />Cheques</Space> },
                        { key: "invoices", label: <Space size={4}><FileTextOutlined />Invoices</Space> },
                    ]}
                />
            </div>

            {/* ── Cheque Stats ─────────────────────────────────────────────── */}
            {activeTab === "cheques" && chequeStats && (
                <div style={{ padding: "16px 24px 0", background: "#fafafa" }}>
                    <Row gutter={12}>
                        {[
                            { key: "cheque_received", label: "Received", color: "#1677ff", icon: <InboxOutlined /> },
                            { key: "cheque_pending", label: "Pending", color: "#fa8c16", icon: <ClockCircleOutlined /> },
                            { key: "cheque_processed", label: "Processed", color: "#52c41a", icon: <CheckCircleOutlined /> },
                            { key: "cheque_bounced", label: "Bounced", color: "#f5222d", icon: <ExclamationCircleOutlined /> },
                        ].map(({ key, label, color, icon }) => (
                            <Col key={key} xs={12} sm={6}>
                                <ChequeStatCard
                                    label={label}
                                    count={chequeStats[key]?.count || 0}
                                    amount={chequeStats[key]?.total_amount || 0}
                                    color={color}
                                    icon={icon}
                                />
                            </Col>
                        ))}
                    </Row>
                </div>
            )}

            {/* ── Search + Filter Bar ───────────────────────────────────────── */}
            <div style={{
                background: "#fafafa", borderBottom: "1px solid #f0f0f0",
                padding: "12px 24px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
            }}>
                {/* Search mode toggle */}
                <SearchModeToggle
                    mode={searchMode}
                    onChange={handleModeChange}
                    fallbackActive={isFallback}
                />

                {/* Search input */}
                <Input
                    prefix={
                        searchMode === "ai"
                            ? <RobotOutlined style={{ color: "#722ed1" }} />
                            : <SearchOutlined style={{ color: "#bfbfbf" }} />
                    }
                    placeholder={
                        searchMode === "ai"
                            ? "Ask anything — e.g. 'pending payments from Kamau last month'..."
                            : "Search by name, reference, cheque number, counterparty..."
                    }
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    allowClear
                    style={{
                        maxWidth: 520, borderRadius: 8,
                        ...(searchMode === "ai" ? { borderColor: "#722ed1", boxShadow: "0 0 0 2px rgba(114,46,209,0.1)" } : {}),
                    }}
                    suffix={searchLoading ? <Spin size="small" /> : null}
                />

                {/* Status filter */}
                <Select
                    placeholder="Status"
                    allowClear
                    style={{ width: 140 }}
                    value={filterStatus}
                    onChange={(v) => {
                        setFilterStatus(v);
                        if (searchQuery) runSearch(searchQuery, searchMode, v, filterType);
                    }}
                    options={Object.entries(STATUS_META)
                        .filter(([k]) => activeTab === "cheques" ? k.startsWith("cheque_") : !k.startsWith("cheque_"))
                        .map(([value, { label }]) => ({ value, label }))}
                    size="middle"
                />

                {!searchActive && (
                    <Button icon={<ReloadOutlined />} onClick={invalidate} type="text" />
                )}

                {/* Search facet pills */}
                {searchActive && searchFacets && (
                    <Space>
                        {searchFacets.by_type?.slice(0, 3).map((f: any) => (
                            <Tag key={f._id} color={DOC_TYPE_META[f._id]?.color}>
                                {DOC_TYPE_META[f._id]?.label || f._id}: {f.count}
                            </Tag>
                        ))}
                    </Space>
                )}
            </div>

            {/* ── AI fallback banner ────────────────────────────────────────── */}
            {isFallback && (
                <Alert
                    type="warning"
                    showIcon
                    icon={<RobotOutlined />}
                    message="AI search unavailable"
                    description="OPENAI_API_KEY is not configured on the server. Showing normal search results instead."
                    closable
                    style={{ margin: "8px 24px 0", borderRadius: 8 }}
                />
            )}

            {/* ── AI mode hint (only when no query yet) ────────────────────── */}
            {searchMode === "ai" && !searchActive && !isFallback && (
                <Alert
                    type="info"
                    showIcon
                    icon={<RobotOutlined />}
                    message="AI Search active"
                    description='Type a natural-language query — e.g. "overdue invoices from Kamau" or "bounced cheques above 50000".'
                    style={{ margin: "8px 24px 0", borderRadius: 8 }}
                />
            )}

            {/* ── Breadcrumb ────────────────────────────────────────────────── */}
            {!searchActive && breadcrumbs.length > 1 && (
                <div style={{ padding: "8px 24px", background: "#fff", borderBottom: "1px solid #f5f5f5" }}>
                    <Breadcrumb
                        items={breadcrumbs.map((crumb, idx) => ({
                            title: (
                                <span
                                    style={{ cursor: "pointer", color: idx === breadcrumbs.length - 1 ? "#000" : "#1677ff" }}
                                    onClick={() => navigateBreadcrumb(crumb, idx)}
                                >
                                    {idx === 0 ? <><HomeOutlined /> {crumb.name}</> : crumb.name}
                                </span>
                            ),
                        }))}
                    />
                </div>
            )}

            {/* ── Content Area ──────────────────────────────────────────────── */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
                {isLoading ? (
                    <div style={{ textAlign: "center", paddingTop: 80 }}>
                        <Spin size="large" />
                    </div>
                ) : displayFolders.length === 0 && displayDocs.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            searchActive
                                ? `No documents found for "${searchQuery}"`
                                : "No documents yet"
                        }
                        style={{ marginTop: 60 }}
                    >
                        {!searchActive && (
                            <Space>
                                <Button icon={<FolderAddOutlined />} onClick={() => openCreate("folder" as any)}>
                                    New Folder
                                </Button>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
                                    New Document
                                </Button>
                            </Space>
                        )}
                    </Empty>
                ) : viewMode === "grid" ? (
                    <>
                        {/* Folders row */}
                        {displayFolders.length > 0 && (
                            <div style={{ marginBottom: 24 }}>
                                <Text type="secondary" style={{
                                    fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
                                    textTransform: "uppercase", display: "block", marginBottom: 12,
                                }}>
                                    Folders ({displayFolders.length})
                                </Text>
                                <Row gutter={[14, 14]}>
                                    {displayFolders.map((folder) => (
                                        <Col key={folder._id} xs={12} sm={8} md={6} lg={4}>
                                            <DocumentCard
                                                doc={folder}
                                                onOpen={openDoc}
                                                onEdit={openEdit}
                                                onDelete={confirmDelete}
                                                onStatusChange={(doc, status) =>
                                                    statusMutation.mutate({ id: doc._id, status })
                                                }
                                            />
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        )}

                        {/* Documents */}
                        {displayDocs.length > 0 && (
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                    <Text type="secondary" style={{
                                        fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase",
                                    }}>
                                        {searchActive ? `Results (${displayDocs.length})` : `Documents (${displayDocs.length})`}
                                    </Text>
                                    {isAiResults && (
                                        <Tag icon={<RobotOutlined />} color="geekblue" style={{ fontSize: 11 }}>
                                            AI Search
                                        </Tag>
                                    )}
                                </div>
                                <Row gutter={[14, 14]}>
                                    {displayDocs.map((doc) => (
                                        <Col key={doc._id} xs={12} sm={8} md={6} lg={4}>
                                            <DocumentCard
                                                doc={doc}
                                                onOpen={openDoc}
                                                onEdit={openEdit}
                                                onDelete={confirmDelete}
                                                showSimilarity={isAiResults}
                                                onStatusChange={(d, status) =>
                                                    statusMutation.mutate({ id: d._id, status })
                                                }
                                            />
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        )}
                    </>
                ) : (
                    // ── List View ─────────────────────────────────────────────
                    <ProTable<DocumentRecord>
                        rowKey="_id"
                        dataSource={[...displayFolders, ...displayDocs]}
                        loading={isLoading}
                        search={false}
                        options={false}
                        pagination={{ pageSize: 20, showTotal: (t) => `${t} items` }}
                        size="small"
                        cardBordered={false}
                        columns={[
                            {
                                title: "Name", dataIndex: "name",
                                render: (name: string, r: DocumentRecord) => {
                                    const m = DOC_TYPE_META[r.document_type] || DOC_TYPE_META.other;
                                    return (
                                        <Space style={{ cursor: "pointer" }} onClick={() => openDoc(r)}>
                                            <span style={{ color: m.color, fontSize: 16 }}>{m.icon}</span>
                                            <Text style={{ fontWeight: r.document_type === "folder" ? 600 : 400 }}>
                                                {name}
                                            </Text>
                                            {isAiResults && r._similarity !== undefined && (
                                                <Tooltip title={`AI relevance: ${(r._similarity * 100).toFixed(0)}%`}>
                                                    <Tag color="geekblue" style={{ fontSize: 10 }}>
                                                        <RobotOutlined /> {(r._similarity * 100).toFixed(0)}%
                                                    </Tag>
                                                </Tooltip>
                                            )}
                                        </Space>
                                    );
                                },
                            },
                            {
                                title: "Type", dataIndex: "document_type", width: 130,
                                render: (t: string) => {
                                    const m = DOC_TYPE_META[t];
                                    return m ? <Tag color={m.color} style={{ fontSize: 11 }}>{m.label}</Tag> : t;
                                },
                            },
                            {
                                title: "Status", dataIndex: "status", width: 110,
                                render: (s: string) => {
                                    const m = STATUS_META[s];
                                    return m
                                        ? <Badge status={m.badgeStatus} text={<Text style={{ fontSize: 12 }}>{m.label}</Text>} />
                                        : s;
                                },
                            },
                            {
                                title: "Counterparty", dataIndex: ["counterparty", "name"], width: 160,
                                render: (v: string) => v
                                    ? <Text style={{ fontSize: 12 }}>{v}</Text>
                                    : <Text type="secondary">—</Text>,
                            },
                            {
                                title: "Amount", width: 130, align: "right",
                                render: (_: any, r: DocumentRecord) => {
                                    const amt = r.meta?.total_amount || r.meta?.amount;
                                    return amt
                                        ? <Text strong style={{ fontSize: 12 }}>
                                            KES {amt.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                        </Text>
                                        : <Text type="secondary">—</Text>;
                                },
                            },
                            {
                                title: "Files", dataIndex: "attachments", width: 70, align: "center",
                                render: (att: any[]) => att?.length
                                    ? <Tag style={{ fontSize: 10 }}>{att.length}</Tag>
                                    : <Text type="secondary">—</Text>,
                            },
                            {
                                title: "Date", dataIndex: "createdAt", width: 110,
                                render: (d: string) => (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {dayjs(d).format("DD MMM YYYY")}
                                    </Text>
                                ),
                            },
                            {
                                title: "", key: "actions", width: 80, fixed: "right",
                                render: (_: any, r: DocumentRecord) => (
                                    <Space size={4}>
                                        <Tooltip title="View">
                                            <Button icon={<EyeOutlined />} size="small" onClick={() => openDoc(r)} />
                                        </Tooltip>
                                        <Tooltip title="Edit">
                                            <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
                                        </Tooltip>
                                        <Popconfirm
                                            title="Delete this document?"
                                            onConfirm={() => confirmDelete(r)}
                                            okText="Delete" okButtonProps={{ danger: true }}
                                        >
                                            <Button icon={<DeleteOutlined />} size="small" danger />
                                        </Popconfirm>
                                    </Space>
                                ),
                            },
                        ]}
                    />
                )}
            </div>

            {/* ── Drawers ───────────────────────────────────────────────────── */}
            <DocumentFormDrawer
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={() => { invalidate(); setFormOpen(false); }}
                editingDoc={editingDoc}
                parentFolderId={currentFolderId}
                initialType={initialDocType}
            />

            <DocumentDetailDrawer
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                documentId={selectedDocId}
                onEdit={() => {
                    setDetailOpen(false);
                    const doc = documents.find(d => d._id === selectedDocId);
                    if (doc) openEdit(doc);
                }}
                onStatusChange={(status, meta) => {
                    if (selectedDocId) statusMutation.mutate({ id: selectedDocId, status, meta });
                }}
            />
        </div>
    );
};

// Wrap in App for modal context
const DocumentCenter: React.FC = () => (
    <App>
        <DocumentCenterPage />
    </App>
);

export default DocumentCenter;