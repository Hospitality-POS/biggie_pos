import { useState, useCallback } from "react";
import { App } from "antd";
import { BASE_URL } from "@utils/config";
import { printHtmlDirect } from "../utils/printHtmlDirect";

interface PrintOptions {
  documentType?: "bill" | "receipt" | "invoice" | "quotation" | "spa_bill";
  paperWidth?: 58 | 80;
  token?: string;
}

interface PrintResult {
  success: boolean;
  error?: string;
}

/**
 * Hook for printing receipts on a network thermal printer
 * via the browser's native print dialog.
 *
 * Works with any device (tablet, phone, laptop) — no install needed.
 * The thermal printer just needs to be added as a printer in OS settings.
 */
export const useReceiptPrinter = () => {
  const { message } = App.useApp();
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Print receipt HTML via browser print dialog using modal.
   *
   * @param {string}  htmlContent   - The receipt HTML (same HTML your modal renders)
   * @param {object}  options
   * @param {string}  options.documentType - "bill" | "receipt" | "invoice" | "quotation" | "spa_bill"
   * @param {number}  options.paperWidth   - 58 or 80 (mm)
   * @param {string}  options.token        - Auth token if your API requires it
   */
  const printReceipt = useCallback(async (htmlContent: string, options: PrintOptions = {}): Promise<PrintResult> => {
    const { documentType = "bill", paperWidth = 80, token } = options;

    setPrinting(true);
    setError(null);

    try {
      // Get tenant code first
      let tenantCode = "";
      const storedTenant = localStorage.getItem("tenant");
      if (storedTenant) {
        try {
          const tenant = JSON.parse(storedTenant);
          tenantCode = tenant?.tenant_code || "";
        } catch (e) {
          console.error("Failed to parse tenant:", e);
        }
      }

      if (!tenantCode) {
        throw new Error("Tenant code not found. Please ensure you are logged in.");
      }

      // Step 1: Send HTML to the API, get back a print URL
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
        "companycode": tenantCode // Ensure tenant code is always included
      };
      
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}/printer-service/store-receipt`, {
        method: "POST",
        headers,
        body: JSON.stringify({ htmlContent, documentType, paperWidth }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const { printUrl } = await res.json();

      // Step 2: Try API approach first, then fallback to direct printing
      try {
        // Create a temporary window for printing
        const printWindow = window.open(
          `${BASE_URL}${printUrl}`,
          '_blank',
          'width=400,height=600,scrollbars=yes,resizable=yes'
        );

        if (!printWindow) {
          throw new Error("Pop-up blocked. Please allow pop-ups for this site to print.");
        }

        // Wait for the window to load, then trigger print
        printWindow.addEventListener('load', () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        });

        message.success("Print dialog opened successfully");
      } catch (windowError) {
        console.warn("Window approach failed, using direct print:", windowError);
        
        // Fallback: Use direct HTML printing
        printHtmlDirect(htmlContent, paperWidth);
        message.success("Print dialog opened successfully (direct mode)");
      }

      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || "Failed to print receipt";
      setError(errorMessage);
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setPrinting(false);
    }
  }, [message]);

  return { printReceipt, printing, error };
};
