import React, { useRef, useState } from "react";
import { Button, Modal, Select, Space, message } from "antd";
import { DownloadOutlined, PrinterOutlined } from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { Quotation, QuotationTemplate } from "@services/quotations";
import { QUOTE_LAYOUTS, getLayout } from "./templates";

// A4 at 96 dpi
const PAGE_WIDTH_PX = 794;

/** Shows a quote in its layout with Print and Download PDF */
const QuotationPreview: React.FC<{
    open: boolean;
    onClose: () => void;
    quote: Quotation | null;
    template?: QuotationTemplate | null;
}> = ({ open, onClose, quote, template }) => {
    const pageRef = useRef<HTMLDivElement>(null);
    const [layoutKey, setLayoutKey] = useState<string | undefined>();
    const [downloading, setDownloading] = useState(false);

    const activeKey = layoutKey || quote?.layout || template?.layout;
    const { Component } = getLayout(activeKey);
    const fileName = `${quote?.quote_no || "quotation"}${quote?.title ? ` - ${quote.title}` : ""}`;

    const print = useReactToPrint({
        content: () => pageRef.current,
        documentTitle: fileName,
        pageStyle: "@page { size: A4; margin: 10mm } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
    });

    const downloadPdf = async () => {
        if (!pageRef.current) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
            const pdf = new jsPDF({ unit: "mm", format: "a4" });
            const margin = 10;
            const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
            const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
            // Slice the tall canvas into A4-sized pieces
            const sliceHeightPx = Math.floor((pageH / pageW) * canvas.width);
            for (let y = 0, page = 0; y < canvas.height; y += sliceHeightPx, page++) {
                const slice = document.createElement("canvas");
                slice.width = canvas.width;
                slice.height = Math.min(sliceHeightPx, canvas.height - y);
                slice.getContext("2d")?.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
                if (page > 0) pdf.addPage();
                pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, pageW, (slice.height * pageW) / canvas.width);
            }
            pdf.save(`${fileName}.pdf`);
        } catch {
            message.error("Couldn't build the PDF here. Use Print and choose \"Save as PDF\" instead.");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={() => { setLayoutKey(undefined); onClose(); }}
            width={PAGE_WIDTH_PX + 64}
            title={quote?.quote_no ? `Quote ${quote.quote_no}` : "Quote preview"}
            footer={
                <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                    <Space>
                        <span style={{ fontSize: 12, color: "#64748b" }}>Layout</span>
                        <Select
                            size="small"
                            style={{ width: 190 }}
                            value={getLayout(activeKey).key}
                            onChange={setLayoutKey}
                            options={QUOTE_LAYOUTS.map((l) => ({ value: l.key, label: l.label }))}
                        />
                    </Space>
                    <Space>
                        <Button icon={<DownloadOutlined />} loading={downloading} onClick={downloadPdf}>Download PDF</Button>
                        <Button type="primary" icon={<PrinterOutlined />} onClick={() => print()}>Print</Button>
                    </Space>
                </Space>
            }
            styles={{ body: { background: "#e5e7eb", padding: 16, maxHeight: "75vh", overflow: "auto" } }}
            destroyOnHidden
        >
            {quote && (
                <div style={{ width: PAGE_WIDTH_PX, maxWidth: "100%", margin: "0 auto", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.15)" }}>
                    <div ref={pageRef} style={{ padding: 28, background: "#fff" }}>
                        <Component quote={quote} template={template} />
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default QuotationPreview;
