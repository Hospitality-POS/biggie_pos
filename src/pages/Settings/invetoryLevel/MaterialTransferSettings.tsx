import React, { useState, useCallback } from "react";
import { message } from "antd";
import MaterialTransferTable from "./MaterialTransferTable";
import {
  fetchAllTransfers,
  approveTransfer,
  completeTransfer,
  rejectTransfer,
  cancelTransfer,
} from "@services/inventory";

interface Transfer {
  _id: string;
  transfer_code: string;
  from_shop_id: {
    _id: string;
    name: string;
    location: string;
  };
  to_shop_id: {
    _id: string;
    name: string;
    location: string;
  };
  status: "pending" | "in_transit" | "completed" | "cancelled" | "rejected";
  initiated_by: {
    _id: string;
    name: string;
    email?: string;
  };
  approved_by?: {
    _id: string;
    name: string;
    email?: string;
  };
  received_by?: {
    _id: string;
    name: string;
    email?: string;
  };
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

export const MaterialTransferSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // Fetch transfers data
  const handleFetchData = useCallback(
    async (params: any, sort?: any, filter?: any) => {
      try {
        setLoading(true);

        const queryParams: any = {
          ...params,
        };

        // Add search filter
        if (params.transfer_code) {
          queryParams.transfer_code = params.transfer_code;
        }

        // Add status filter from table filters
        if (filter?.status && filter.status.length > 0) {
          queryParams.status = filter.status[0];
        }

        const response = await fetchAllTransfers(queryParams);

        // Handle the response structure properly
        // If response is an object with data property, use that
        // Otherwise, if response is directly an array, use it
        // Otherwise, return empty array
        let transfersData: Transfer[] = [];
        let totalCount = 0;

        if (response) {
          if (Array.isArray(response)) {
            // Response is directly an array
            transfersData = response;
            totalCount = response.length;
          } else if (response.data && Array.isArray(response.data)) {
            // Response is an object with data property
            transfersData = response.data;
            totalCount = response.total || response.data.length;
          } else if (response.transfers && Array.isArray(response.transfers)) {
            // Response might have transfers property
            transfersData = response.transfers;
            totalCount = response.total || response.transfers.length;
          }
        }

        console.log("Processed transfers data:", transfersData);
        console.log("Total count:", totalCount);

        return {
          data: transfersData,
          success: true,
          total: totalCount,
        };
      } catch (error) {
        console.error("Error fetching transfers:", error);
        message.error("Failed to fetch transfers");
        return {
          data: [],
          success: false,
          total: 0,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Delete transfer
  const handleDeleteTransfer = useCallback(async (id: string) => {
    try {
      message.warning("Delete functionality not yet implemented in API");
      return { success: false };
    } catch (error) {
      console.error("Error deleting transfer:", error);
      message.error("Failed to delete transfer");
      return { success: false };
    }
  }, []);

  // Approve transfer
  const handleApproveTransfer = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const userId = getUserId();
      await approveTransfer(id, { approved_by: userId });
      message.success("Transfer approved successfully");
      return { success: true };
    } catch (error: any) {
      console.error("Error approving transfer:", error);
      const errorMsg =
        error?.response?.data?.error || "Failed to approve transfer";
      message.error(errorMsg);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // Complete transfer
  const handleCompleteTransfer = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const userId = getUserId();
      await completeTransfer(id, { received_by: userId });
      message.success("Transfer completed successfully");
      return { success: true };
    } catch (error: any) {
      console.error("Error completing transfer:", error);
      const errorMsg =
        error?.response?.data?.error || "Failed to complete transfer";
      message.error(errorMsg);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // Reject transfer
  const handleRejectTransfer = useCallback(
    async (id: string, reason: string) => {
      try {
        setLoading(true);
        await rejectTransfer(id, { rejection_reason: reason });
        message.success("Transfer rejected successfully");
        return { success: true };
      } catch (error: any) {
        console.error("Error rejecting transfer:", error);
        const errorMsg =
          error?.response?.data?.error || "Failed to reject transfer";
        message.error(errorMsg);
        return { success: false };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Cancel transfer
  const handleCancelTransfer = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await cancelTransfer(id);
      message.success("Transfer cancelled successfully");
      return { success: true };
    } catch (error: any) {
      console.error("Error cancelling transfer:", error);
      const errorMsg =
        error?.response?.data?.error || "Failed to cancel transfer";
      message.error(errorMsg);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // View transfer details
  const handleViewTransfer = useCallback((record: Transfer) => {
    console.log("View transfer:", record);
    message.info(`Viewing transfer: ${record.transfer_code}`);
  }, []);

  // Print transfer
  const handlePrintTransfer = useCallback((record: Transfer) => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        message.error("Please allow popups to print");
        return;
      }

      const printContent = generatePrintContent(record);
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error("Error printing transfer:", error);
      message.error("Failed to print transfer");
    }
  }, []);

  // Export to Excel
  const handleExportToExcel = useCallback((data: Transfer[]) => {
    try {
      message.info("Export to Excel functionality - install xlsx package");
      console.log("Export data:", data);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      message.error("Failed to export to Excel");
    }
  }, []);

  // Export to PDF
  const handleExportToPDF = useCallback((data: Transfer[]) => {
    try {
      message.info("Export to PDF functionality - install jspdf package");
      console.log("Export data:", data);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      message.error("Failed to export to PDF");
    }
  }, []);

  // Helper function to get user ID
  const getUserId = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user._id || user.id;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting user ID:", error);
      return undefined;
    }
  };

  // Generate print content
  const generatePrintContent = (transfer: Transfer) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transfer ${transfer.transfer_code}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            color: #333;
          }
          .info-section {
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            margin-bottom: 10px;
          }
          .info-label {
            font-weight: bold;
            width: 150px;
          }
          .info-value {
            flex: 1;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .items-table th,
          .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .items-table th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Material Transfer</h1>
          <p><strong>${transfer.transfer_code}</strong></p>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">From Shop:</span>
            <span class="info-value">${transfer.from_shop_id?.name || "N/A"} (${transfer.from_shop_id?.location || ""
      })</span>
          </div>
          <div class="info-row">
            <span class="info-label">To Shop:</span>
            <span class="info-value">${transfer.to_shop_id?.name || "N/A"} (${transfer.to_shop_id?.location || ""
      })</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value">${transfer.status.toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Transfer Date:</span>
            <span class="info-value">${new Date(
        transfer.transfer_date
      ).toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Expected Delivery:</span>
            <span class="info-value">${transfer.expected_delivery_date
        ? new Date(
          transfer.expected_delivery_date
        ).toLocaleDateString()
        : "Not set"
      }</span>
          </div>
          <div class="info-row">
            <span class="info-label">Initiated By:</span>
            <span class="info-value">${transfer.initiated_by?.name || "N/A"
      }</span>
          </div>
          ${transfer.approved_by
        ? `
            <div class="info-row">
              <span class="info-label">Approved By:</span>
              <span class="info-value">${transfer.approved_by.name}</span>
            </div>
          `
        : ""
      }
          ${transfer.received_by
        ? `
            <div class="info-row">
              <span class="info-label">Received By:</span>
              <span class="info-value">${transfer.received_by.name}</span>
            </div>
          `
        : ""
      }
        </div>

        ${transfer.notes
        ? `
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Notes:</span>
              <span class="info-value">${transfer.notes}</span>
            </div>
          </div>
        `
        : ""
      }

        <table class="items-table">
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
            ${transfer.items
        ?.map(
          (item: any, index: number) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.product_id?.name || "N/A"}</td>
                <td>${item.product_id?.code || "N/A"}</td>
                <td>${item.quantity}</td>
                <td>${item.unit_id?.name || "N/A"}</td>
              </tr>
            `
        )
        .join("") || "<tr><td colspan='5'>No items</td></tr>"
      }
          </tbody>
        </table>

        <div class="footer">
          <p>Total Items: ${transfer.total_items}</p>
          <p>Printed on: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

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