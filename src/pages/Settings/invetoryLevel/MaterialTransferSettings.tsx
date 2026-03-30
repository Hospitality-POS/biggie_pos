import React, { useCallback, useState } from "react";
import { message } from "antd";
import MaterialTransferTable from "./MaterialTransferTable";
import {
  approveTransfer,
  cancelTransfer,
  completeTransfer,
  fetchAllTransfers,
  rejectTransfer,
} from "@services/inventory";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Transfer {
  _id: string;
  transfer_code: string;
  from_shop_id: { _id: string; name: string; location: string };
  to_shop_id: { _id: string; name: string; location: string };
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
  items?: any[];
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const getUserId = (): string | undefined => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user._id || user.id;
  } catch {
    return undefined;
  }
};

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-KE", { dateStyle: "medium" }) : "Not set";

// ── Print template ────────────────────────────────────────────────────────────
const generatePrintContent = (transfer: Transfer): string => `
<!DOCTYPE html>
<html>
<head>
  <title>Transfer ${transfer.transfer_code}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      padding: 28px;
      max-width: 820px;
      margin: 0 auto;
      color: #1e293b;
      font-size: 13px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #6c1c2c;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header-title { font-size: 22px; font-weight: 800; color: #0f172a; }
    .header-sub { font-size: 12px; color: #64748b; margin-top: 3px; }
    .badge {
      background: #6c1c2c;
      color: #fff;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 14px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .meta-item { margin-bottom: 4px; }
    .meta-label { font-weight: 600; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; display: block; margin-bottom: 2px; }
    .meta-value { color: #1e293b; }
    .route-box {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .route-shop { flex: 1; }
    .route-shop-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; }
    .route-shop-name { font-size: 14px; font-weight: 700; color: #0f172a; }
    .route-shop-loc { font-size: 11px; color: #64748b; }
    .route-arrow { font-size: 20px; color: #f97316; flex-shrink: 0; }
    .notes-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 20px;
      font-size: 12px;
      color: #374151;
    }
    .notes-label { font-weight: 600; color: #92400e; display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead tr { background: #f8fafc; }
    th { padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.4px; }
    td { padding: 8px 10px; font-size: 12px; color: #374151; border-bottom: 1px solid #f1f5f9; }
    tr:nth-child(even) td { background: #fafafa; }
    .total-row { font-weight: 700; background: #f1f5f9; }
    .footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
      .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-title">Material Transfer</div>
      <div class="header-sub">Transfer document — keep for records</div>
    </div>
    <div class="badge">${transfer.transfer_code}</div>
  </div>

  <div class="route-box">
    <div class="route-shop">
      <div class="route-shop-label">From</div>
      <div class="route-shop-name">${transfer.from_shop_id?.name || "N/A"}</div>
      ${transfer.from_shop_id?.location ? `<div class="route-shop-loc">${transfer.from_shop_id.location}</div>` : ""}
    </div>
    <div class="route-arrow">→</div>
    <div class="route-shop">
      <div class="route-shop-label">To</div>
      <div class="route-shop-name">${transfer.to_shop_id?.name || "N/A"}</div>
      ${transfer.to_shop_id?.location ? `<div class="route-shop-loc">${transfer.to_shop_id.location}</div>` : ""}
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <span class="meta-label">Status</span>
      <span class="meta-value">${transfer.status.replace(/_/g, " ").toUpperCase()}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Transfer Date</span>
      <span class="meta-value">${fmtDate(transfer.transfer_date)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Expected Delivery</span>
      <span class="meta-value">${fmtDate(transfer.expected_delivery_date)}</span>
    </div>
    ${transfer.actual_delivery_date ? `
    <div class="meta-item">
      <span class="meta-label">Actual Delivery</span>
      <span class="meta-value">${fmtDate(transfer.actual_delivery_date)}</span>
    </div>` : ""}
    <div class="meta-item">
      <span class="meta-label">Initiated By</span>
      <span class="meta-value">${transfer.initiated_by?.name || "N/A"}</span>
    </div>
    ${transfer.approved_by ? `
    <div class="meta-item">
      <span class="meta-label">Approved By</span>
      <span class="meta-value">${transfer.approved_by.name}</span>
    </div>` : ""}
    ${transfer.received_by ? `
    <div class="meta-item">
      <span class="meta-label">Received By</span>
      <span class="meta-value">${transfer.received_by.name}</span>
    </div>` : ""}
    ${transfer.rejection_reason ? `
    <div class="meta-item">
      <span class="meta-label">Rejection Reason</span>
      <span class="meta-value" style="color:#ef4444">${transfer.rejection_reason}</span>
    </div>` : ""}
  </div>

  ${transfer.notes ? `
  <div class="notes-box">
    <span class="notes-label">Notes</span>
    ${transfer.notes}
  </div>` : ""}

  <div class="section-label">Transfer Items</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>Code</th>
        <th>Quantity</th>
        <th>Unit</th>
      </tr>
    </thead>
    <tbody>
      ${transfer.items?.map((item: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.product_id?.name || "N/A"}</td>
        <td>${item.product_id?.code || "—"}</td>
        <td><strong>${item.quantity}</strong></td>
        <td>${item.unit_id?.name || "—"}</td>
      </tr>`).join("") || "<tr><td colspan='5' style='text-align:center;color:#94a3b8'>No items</td></tr>"}
      <tr class="total-row">
        <td colspan="3" style="text-align:right;padding-right:16px">Total Items:</td>
        <td colspan="2"><strong>${transfer.total_items}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Generated on ${new Date().toLocaleString()} · ${transfer.transfer_code}
  </div>
</body>
</html>`;

// ── Component ─────────────────────────────────────────────────────────────────
export const MaterialTransferSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const handleFetchData = useCallback(async (params: any, _sort?: any, filter?: any) => {
    try {
      setLoading(true);

      const queryParams: any = { ...params };
      if (filter?.status?.length > 0) queryParams.status = filter.status[0];

      const response = await fetchAllTransfers(queryParams);

      let data: Transfer[] = [];
      let total = 0;

      if (Array.isArray(response)) {
        data = response;
        total = response.length;
      } else if (Array.isArray(response?.data)) {
        data = response.data;
        total = response.total ?? response.data.length;
      } else if (Array.isArray(response?.transfers)) {
        data = response.transfers;
        total = response.total ?? response.transfers.length;
      }

      return { data, success: true, total };
    } catch {
      message.error("Failed to fetch transfers");
      return { data: [], success: false, total: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDeleteTransfer = useCallback(async (_id: string) => {
    message.warning("Delete is not yet available for transfers");
    return { success: false };
  }, []);

  // ── Approve ─────────────────────────────────────────────────────────────────
  const handleApproveTransfer = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await approveTransfer(id, { approved_by: getUserId() });
      message.success("Transfer approved");
      return { success: true };
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Failed to approve transfer");
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Complete ────────────────────────────────────────────────────────────────
  const handleCompleteTransfer = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await completeTransfer(id, { received_by: getUserId() });
      message.success("Transfer marked as completed");
      return { success: true };
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Failed to complete transfer");
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Reject ──────────────────────────────────────────────────────────────────
  const handleRejectTransfer = useCallback(async (id: string, reason: string) => {
    try {
      setLoading(true);
      await rejectTransfer(id, { rejection_reason: reason });
      message.success("Transfer rejected");
      return { success: true };
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Failed to reject transfer");
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Cancel ──────────────────────────────────────────────────────────────────
  const handleCancelTransfer = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await cancelTransfer(id);
      message.success("Transfer cancelled");
      return { success: true };
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Failed to cancel transfer");
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Print ───────────────────────────────────────────────────────────────────
  const handlePrintTransfer = useCallback((record: Transfer) => {
    const win = window.open("", "_blank");
    if (!win) {
      message.error("Please allow popups to print");
      return;
    }
    win.document.write(generatePrintContent(record));
    win.document.close();
    win.focus();
    win.print();
  }, []);

  // ── Export stubs (require package install) ──────────────────────────────────
  const handleExportToExcel = useCallback((_data: Transfer[]) => {
    message.info("Install the xlsx package to enable Excel export");
  }, []);

  const handleExportToPDF = useCallback((_data: Transfer[]) => {
    message.info("Install the jspdf package to enable PDF export");
  }, []);

  // ── View (pass-through — table handles its own modal) ───────────────────────
  const handleViewTransfer = useCallback((_record: Transfer) => { }, []);

  return (
    <MaterialTransferTable
      onFetchData={handleFetchData}
      onDeleteTransfer={handleDeleteTransfer}
      onApproveTransfer={handleApproveTransfer}
      onCompleteTransfer={handleCompleteTransfer}
      onRejectTransfer={handleRejectTransfer}
      onCancelTransfer={handleCancelTransfer}
      onViewTransfer={handleViewTransfer}
      onPrintTransfer={handlePrintTransfer}
      onExportToExcel={handleExportToExcel}
      onExportToPDF={handleExportToPDF}
    />
  );
};

export default MaterialTransferSettings;