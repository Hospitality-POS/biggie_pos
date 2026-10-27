import React, { useEffect, useState } from "react";
import { Button, Grid, Modal, Result, Spin, Typography } from "antd";
import { DownloadOutlined, PrinterOutlined } from "@ant-design/icons";
import type { FormSubmissionSummary } from "./types";

const { Text } = Typography;

const safeName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, "_");

export const signedPdfName = (row: FormSubmissionSummary) => safeName(`${row.form.name} - ${row.subject_snapshot.name}.pdf`);
export const planPdfName = (plan: { title: string; subject_snapshot: { name: string } }) =>
  safeName(`${plan.title} - ${plan.subject_snapshot.name}.pdf`);

/**
 * Save a PDF from memory. A blob link works in browsers and in the desktop
 * app, which blocks new windows (so window.open on the storage link did nothing).
 */
export const saveBlob = (blob: Blob, fileName: string) => {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
};

interface Props {
  open: boolean;
  title: string;
  fileName: string;
  /** Fetches the PDF; called each time the modal opens */
  load: () => Promise<Blob>;
  onClose: () => void;
  /** Show the Download button (the user may preview but not save) */
  canDownload?: boolean;
}

/** Preview a PDF (signed form, plan…) in the app, with print and download. */
const PdfPreviewModal: React.FC<Props> = ({ open, title, fileName, load, onClose, canDownload = true }) => {
  const screens = Grid.useBreakpoint();
  const isPhone = !screens.md;
  const [blob, setBlob] = useState<Blob | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let href: string | null = null;
    let cancelled = false;
    setBlob(null);
    setSrc(null);
    setError(null);
    load()
      .then((b) => {
        if (cancelled) return;
        const pdf = b.type === "application/pdf" ? b : new Blob([b], { type: "application/pdf" });
        href = URL.createObjectURL(pdf);
        setBlob(pdf);
        setSrc(href);
      })
      .catch(async (e) => {
        if (cancelled) return;
        // Errors come back as a Blob because the request asked for one
        let msg = "Couldn't load the PDF";
        try {
          const data = e?.response?.data;
          if (data instanceof Blob) msg = JSON.parse(await data.text())?.message || msg;
        } catch {
          /* keep the default */
        }
        setError(msg);
      });
    return () => {
      cancelled = true;
      if (href) URL.revokeObjectURL(href);
    };
    // load is recreated by callers each render; reopening is what should refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const print = () => {
    const frame = document.getElementById("pdf-preview-frame") as HTMLIFrameElement | null;
    try {
      frame?.contentWindow?.focus();
      frame?.contentWindow?.print();
    } catch {
      if (blob && canDownload) saveBlob(blob, fileName);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      width={isPhone ? "100%" : 900}
      style={isPhone ? { top: 0, maxWidth: "100vw", padding: 0 } : { top: 24 }}
      styles={{ body: { padding: 0 } }}
      destroyOnClose
      footer={[
        <Button key="print" icon={<PrinterOutlined />} disabled={!src} onClick={print}>
          Print
        </Button>,
        ...(canDownload
          ? [
              <Button key="download" type="primary" icon={<DownloadOutlined />} disabled={!blob} onClick={() => blob && saveBlob(blob, fileName)}>
                Download
              </Button>,
            ]
          : []),
      ]}
    >
      <div style={{ height: isPhone ? "70vh" : "75vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {error ? (
          <Result status="warning" title="Couldn't load the PDF" subTitle={error} />
        ) : src ? (
          <iframe id="pdf-preview-frame" title={title} src={src} style={{ width: "100%", height: "100%", border: "none" }} />
        ) : (
          <Spin tip="Loading PDF…">
            <div style={{ width: 120, height: 60 }} />
          </Spin>
        )}
      </div>
      {src && isPhone && canDownload && (
        <Text style={{ display: "block", fontSize: 12, color: "#64748b", padding: "8px 12px" }}>
          Can't see it? Some phones don't show PDFs here — tap Download.
        </Text>
      )}
    </Modal>
  );
};

export default PdfPreviewModal;
