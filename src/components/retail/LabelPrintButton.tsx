import React, { useState } from "react";
import { TagOutlined } from "@ant-design/icons";
import LabelPrintModal from "./LabelPrintModal";

/**
 * "Labels" button for the POS header (next to Browse / Scan) that opens the
 * label printing dialog. Render it only when the shop has label printing on.
 */
const LabelPrintButton: React.FC<{ isMobile: boolean; shopName?: string }> = ({ isMobile, shopName }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Print price / barcode labels"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: isMobile ? "5px 8px" : "5px 12px",
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 8,
          border: "1px solid rgba(255, 255, 255, 0.2)",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          color: "#ffffff",
          cursor: "pointer",
        }}
      >
        <TagOutlined style={{ fontSize: 12 }} />
        {!isMobile && <span>Labels</span>}
      </button>
      <LabelPrintModal open={open} onClose={() => setOpen(false)} shopName={shopName} />
    </>
  );
};

export default LabelPrintButton;
