import React, { useState } from "react";
import { Button, Dropdown, Tooltip, message } from "antd";
import { DownOutlined, FilePdfOutlined } from "@ant-design/icons";
import { useExportTemplate, EXPORT_TEMPLATES, type ExportTemplateId } from "@utils/exportTemplates";
import { exportTemplateMenuItem } from "./exportTemplateMenu";

/**
 * "Download PDF" for accounting documents, with the same Template picker as
 * the payroll / payslip exports. The template choice is remembered for all
 * receipts, bills and expenses in this browser.
 *
 * - default: split button — click downloads, the arrow opens the template menu
 * - compact: icon button for table rows (uses the remembered template)
 */
const DocumentPdfButton: React.FC<{
    onDownload: (template: ExportTemplateId) => Promise<unknown> | void;
    compact?: boolean;
    label?: string;
    disabled?: boolean;
}> = ({ onDownload, compact, label = "Download PDF", disabled }) => {
    const [template, setTemplate] = useExportTemplate("document");
    const [busy, setBusy] = useState(false);

    const run = async (id: ExportTemplateId = template) => {
        setBusy(true);
        try {
            await onDownload(id);
        } catch (e) {
            console.error("PDF download failed", e);
            message.error("Couldn't create the PDF");
        } finally {
            setBusy(false);
        }
    };

    if (compact) {
        return (
            <Tooltip title={`Download PDF (${EXPORT_TEMPLATES.find((t) => t.id === template)?.name} template)`}>
                <Button size="small" icon={<FilePdfOutlined />} loading={busy} disabled={disabled} onClick={() => run()} aria-label="Download PDF" />
            </Tooltip>
        );
    }

    const tpl = exportTemplateMenuItem(template, setTemplate) as any;
    return (
        <Dropdown.Button
            icon={<DownOutlined />}
            loading={busy}
            disabled={disabled}
            onClick={() => run()}
            menu={{
                items: [
                    { type: "group", label: "Template", children: tpl.children },
                ],
            }}
        >
            <FilePdfOutlined /> {label}
        </Dropdown.Button>
    );
};

export default DocumentPdfButton;
