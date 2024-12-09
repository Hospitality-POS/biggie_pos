import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";
import { message } from "antd";
const baseUrl = BASE_URL;


interface PrintData {
  cart_id: string;
  print_etr: boolean;
  print: boolean;
}

declare global {
  interface Window {
    showSaveFilePicker(options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }): Promise<FileSystemFileHandle>;
  }
}


export const getAllCartItems = async (cartId: string) => {
  try {
    const response = await axiosInstance.get(`${baseUrl}/cart/cart-items/${cartId}`);
    return response.data || [];
  } catch (error: any) {
    console.log(error);
  }
};

export const printInvoice = async (printData: PrintData): Promise<void> => {
  try {
    // Set response type to 'arraybuffer' to handle binary data
    const response = await axiosInstance.put(`${baseUrl}/cart/print-cart`, printData, {
      responseType: 'arraybuffer',
    });

    // Convert response data into a blob
    const blob = new Blob([response.data], { type: "application/pdf" });

    try {
      // Check if File System API is supported
      if (!('showSaveFilePicker' in window)) {
        throw new Error('File System API not supported');
      }

      // Let user choose where to save the file
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: `invoice_${Date.now()}.pdf`,
        types: [{
          description: 'PDF Files',
          accept: {
            'application/pdf': ['.pdf'],
          },
        }],
      });

      // Create a FileSystemWritableFileStream to write to
      const writable = await fileHandle.createWritable();

      // Write the blob to the file
      await writable.write(blob);
      await writable.close();

      message.success(`Invoice saved successfully`);
    } catch (fileError) {
      console.log("Falling back to traditional download due to:", fileError);

      // Fallback to traditional download if File System API is not supported
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      link.download = `invoice_${Date.now()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      message.success("Invoice downloaded successfully");
    }
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Failed to download invoice");
    }
  }
};

export const getAllInvoices = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.get(`${baseUrl}/cart/invoices`, {
      params: {
        orderNo: params?.order_no || params?.keyword,
        tableName: params?.table,
      }
    });
    return response.data || [];
  } catch (error: any) {
    console.log(error);
  }
};

export const rePrintInvoice = async (invoiceId: string) => {
  try {
    const response = await axiosInstance.put(`${baseUrl}/cart/re-print-inv`, {
      invoice_id: invoiceId,
    });
    message.success("Invoice re-printed successfully");
    return response.data || [];
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Failed to re-print invoice");
    }
  }
};