import React, { useState } from "react";
import { Button, Dropdown, Input, Segmented, Space, Table, Tag, Typography, message, Modal } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    CheckCircleOutlined, CloseCircleOutlined, FileDoneOutlined, CopyOutlined, DeleteOutlined, EditOutlined, EyeOutlined,
    LayoutOutlined, MoreOutlined, PlusOutlined, SendOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
    apiErrorMessage, deleteQuotation, duplicateQuotation, getQuotation, listQuotations, setQuotationStatus,
    type Quotation, type QuotationStatus,
} from "@services/quotations";
import { THEME_C } from "@utils/getPrimaryColor";
import QuotationEditor from "./QuotationEditor";
import QuotationPreview from "./QuotationPreview";
import TemplatesManager from "./TemplatesManager";
import ConvertToInvoiceModal from "./ConvertToInvoiceModal";
import { useTenantModules } from "@hooks/useTenantModules";
import { money } from "./templates";

const { Text } = Typography;
const C = THEME_C;

const STATUS: Record<QuotationStatus, { label: string; color: string }> = {
    draft: { label: "Draft", color: "default" },
    sent: { label: "Sent", color: "blue" },
    accepted: { label: "Accepted", color: "green" },
    declined: { label: "Declined", color: "red" },
    expired: { label: "Expired", color: "orange" },
};

const FILTERS = [
    { value: "all", label: "All" },
    ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label })),
];

/** Orders → Quotations: list, create, edit, preview/print and track quotes */
const QuotationsTab: React.FC = () => {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [editor, setEditor] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
    const [preview, setPreview] = useState<Quotation | null>(null);
    const [templatesOpen, setTemplatesOpen] = useState(false);
    const [converting, setConverting] = useState<Quotation | null>(null);
    // Invoices live in Pesa (accounting); without it there is nothing to convert into
    const { hasAccounting } = useTenantModules();

    const { data, isFetching } = useQuery({
        queryKey: ["quotations", status, search, page, pageSize],
        queryFn: () => listQuotations({
            status: status === "all" ? undefined : (status as QuotationStatus),
            search: search || undefined,
            page,
            limit: pageSize,
        }),
        keepPreviousData: true,
    });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["quotations"] });

    const summary = (key: QuotationStatus) => data?.summary?.find((s) => s._id === key);

    const run = async (fn: () => Promise<unknown>, done: string, failed: string) => {
        try {
            await fn();
            message.success(done);
            refresh();
        } catch (err) {
            message.error(apiErrorMessage(err, failed));
        }
    };

    const openPreview = async (row: Quotation) => {
        try {
            setPreview(await getQuotation(row._id as string));
        } catch (err) {
            message.error(apiErrorMessage(err, "Couldn't open the quote"));
        }
    };

    const actionsFor = (row: Quotation) => {
        const id = row._id as string;
        const converted = !!row.invoice_id;
        const items = converted ? [
            { key: "preview", icon: <EyeOutlined />, label: "Preview / print" },
            { key: "duplicate", icon: <CopyOutlined />, label: "Duplicate" },
        ] : [
            { key: "preview", icon: <EyeOutlined />, label: "Preview / print" },
            ...(hasAccounting ? [{ key: "convert", icon: <FileDoneOutlined />, label: "Convert to invoice" }] : []),
            ...(row.status !== "accepted" ? [{ key: "edit", icon: <EditOutlined />, label: "Edit" }] : []),
            { key: "duplicate", icon: <CopyOutlined />, label: "Duplicate" },
            { type: "divider" as const },
            ...(row.status !== "sent" ? [{ key: "sent", icon: <SendOutlined />, label: "Mark as sent" }] : []),
            ...(row.status !== "accepted" ? [{ key: "accepted", icon: <CheckCircleOutlined />, label: "Mark as accepted" }] : []),
            ...(row.status !== "declined" ? [{ key: "declined", icon: <CloseCircleOutlined />, label: "Mark as declined" }] : []),
            ...(row.status !== "accepted" ? [{ type: "divider" as const }, { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true }] : []),
        ];
        const onClick = ({ key }: { key: string }) => {
            if (key === "preview") openPreview(row);
            else if (key === "convert") setConverting(row);
            else if (key === "edit") setEditor({ open: true, id });
            else if (key === "duplicate") run(() => duplicateQuotation(id), "Quote duplicated", "Couldn't duplicate the quote");
            else if (key === "delete") {
                Modal.confirm({
                    title: `Delete quote ${row.quote_no}?`,
                    content: "This can't be undone.",
                    okText: "Delete",
                    okButtonProps: { danger: true },
                    onOk: () => run(() => deleteQuotation(id), "Quote deleted", "Couldn't delete the quote"),
                });
            } else {
                run(() => setQuotationStatus(id, key as QuotationStatus), `Marked as ${STATUS[key as QuotationStatus].label.toLowerCase()}`, "Couldn't update the quote");
            }
        };
        return { items, onClick };
    };

    const columns: ColumnsType<Quotation> = [
        {
            title: "Quote No", dataIndex: "quote_no", width: 140,
            render: (v, row) => <a onClick={() => openPreview(row)} style={{ fontWeight: 600 }}>{v}</a>,
        },
        { title: "Title", dataIndex: "title", ellipsis: true },
        { title: "Client", key: "client", ellipsis: true, render: (_, row) => row.client?.name || <Text type="secondary">—</Text> },
        { title: "Date", dataIndex: "issue_date", width: 110, render: (v) => (v ? dayjs(v).format("DD MMM YYYY") : "—") },
        {
            title: "Valid until", dataIndex: "valid_until", width: 110,
            render: (v, row) => {
                if (!v) return "—";
                const lapsed = dayjs(v).isBefore(dayjs(), "day") && (row.status === "draft" || row.status === "sent");
                return <span style={{ color: lapsed ? C.red : undefined }}>{dayjs(v).format("DD MMM YYYY")}</span>;
            },
        },
        {
            title: "Total", dataIndex: "grand_total", width: 150, align: "right",
            render: (v, row) => <span style={{ fontWeight: 600 }}>{row.currency || "KES"} {money(v)}</span>,
        },
        {
            title: "Status", dataIndex: "status", width: 190,
            render: (v: QuotationStatus, row) => (
                <Space size={4} wrap>
                    <Tag color={STATUS[v]?.color}>{STATUS[v]?.label || v}</Tag>
                    {row.invoice_no && <Tag color="purple">Invoice {row.invoice_no}</Tag>}
                </Space>
            ),
        },
        {
            key: "actions", width: 48, align: "center",
            render: (_, row) => (
                <Dropdown trigger={["click"]} menu={actionsFor(row)}>
                    <Button type="text" icon={<MoreOutlined />} aria-label="Quote actions" />
                </Dropdown>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                {(["draft", "sent", "accepted"] as QuotationStatus[]).map((key) => (
                    <div key={key} style={{ flex: "1 1 160px", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", background: "#fff" }}>
                        <Text style={{ fontSize: 12, color: C.subText }}>{STATUS[key].label}</Text>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.darkText }}>{summary(key)?.count || 0}</div>
                        <Text style={{ fontSize: 12, color: C.subText }}>{money(summary(key)?.value)}</Text>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <Space wrap>
                    <Segmented size="small" value={status} onChange={(v) => { setStatus(String(v)); setPage(1); }} options={FILTERS} />
                    <Input.Search
                        allowClear size="middle" style={{ width: 240 }}
                        placeholder="Quote no, title or client"
                        onSearch={(v) => { setSearch(v.trim()); setPage(1); }}
                    />
                </Space>
                <Space>
                    <Button icon={<LayoutOutlined />} onClick={() => setTemplatesOpen(true)}>Templates</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ open: true, id: null })}>New quote</Button>
                </Space>
            </div>

            <Table<Quotation>
                rowKey="_id"
                size="middle"
                loading={isFetching}
                columns={columns}
                dataSource={data?.data || []}
                scroll={{ x: 900 }}
                locale={{ emptyText: "No quotations yet. Create one with New quote." }}
                pagination={{
                    current: page, pageSize, total: data?.total || 0, showSizeChanger: true,
                    onChange: (p, s) => { setPage(p); setPageSize(s); },
                }}
            />

            <QuotationEditor
                open={editor.open}
                quoteId={editor.id}
                onClose={() => setEditor({ open: false, id: null })}
                onSaved={(saved) => {
                    refresh();
                    queryClient.invalidateQueries({ queryKey: ["quotation", saved._id] });
                    setEditor({ open: false, id: null });
                }}
            />
            <QuotationPreview open={!!preview} onClose={() => setPreview(null)} quote={preview} template={preview?.template} />
            <ConvertToInvoiceModal
                quote={converting}
                onClose={() => setConverting(null)}
                onConverted={(invoiceNo) => {
                    setConverting(null);
                    if (invoiceNo) message.success(`Invoice ${invoiceNo} created. Find it in the Invoices tab.`);
                    refresh();
                    queryClient.invalidateQueries({ queryKey: ["invoices"] });
                }}
            />
            <TemplatesManager open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
        </div>
    );
};

export default QuotationsTab;
