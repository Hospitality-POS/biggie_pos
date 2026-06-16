import { getRequest, postRequest } from '../request';

// Explicit permission keys for DigiTax operations
const DIGITAX_PERMISSIONS = {
  CONFIG: 'ACCOUNTING_DIGITAX_VIEW_CONFIG',
  SHOP_SETTINGS: 'ACCOUNTING_DIGITAX_MANAGE_SETTINGS',
  GENERATE_INVOICE: 'ACCOUNTING_DIGITAX_GENERATE_INVOICE',
  INVOICE_STATUS: 'ACCOUNTING_DIGITAX_VIEW_INVOICE_STATUS',
  CANCEL_INVOICE: 'ACCOUNTING_DIGITAX_CANCEL_INVOICE',
} as const;

export interface DigiTaxConfig {
  enabled: boolean;
  test_mode: boolean;
  base_url: string;
  features: {
    invoice_generation: boolean;
    qr_code: boolean;
    tax_receipt_number: boolean;
    invoice_status: boolean;
    invoice_cancellation: boolean;
  };
  service_available: boolean;
  message: string;
}

export interface ShopDigiTaxSettings {
  shop_digi_tax_enabled: boolean;
  shop_tax_id: string;
  service_config: DigiTaxConfig;
  service_available: boolean;
  can_use_digi_tax: boolean;
}

export interface DigiTaxReceipt {
  sale_id?: string;
  serial_number?: string;
  receipt_number?: number;
  invoice_number?: number;
  trader_invoice_number?: string;
  etims_url?: string | null;
  offline_url?: string | null;
  receipt_signature?: string | null;
  internal_data?: string | null;
  receipt_type_code?: string;
  sale_date?: string;
  sale_time?: string;
  submission_status?: string;
  submission_date?: string;
  error_message?: string | null;
}

export interface TaxInvoiceResponse {
  message: string;
  digitax?: DigiTaxReceipt;
  // legacy fields
  use_digi_tax?: boolean;
  test_mode?: boolean;
  tax_receipt_number?: string;
  qr_code?: string;
  invoice_url?: string | null;
  generated_at?: string;
  error?: string;
  test_mode_fallback?: {
    test_mode: boolean;
    invoice_number: string;
    tax_receipt_number: string;
    qr_code: string;
    invoice_url: string | null;
    message: string;
    generated_at: string;
  };
  service_config?: DigiTaxConfig;
  [key: string]: any;
}

export interface InvoiceStatusResponse {
  message: string;
  data: {
    status: string;
    generated_at: string;
    qr_code: string;
    tax_receipt_number: string;
  };
}

export interface CancelInvoiceResponse {
  message: string;
  data: {
    status: string;
    cancelled_at: string;
    reason: string;
  };
}

export const digiTaxService = {
  // Check service availability
  async getConfig(): Promise<DigiTaxConfig> {
    const response = await getRequest('/accounting/digi-tax/config', {
      headers: { 'x-permission': DIGITAX_PERMISSIONS.CONFIG }
    });
    return response.data;
  },

  // Get shop DigiTax settings
  async getShopSettings(shopId?: string): Promise<ShopDigiTaxSettings> {
    const url = shopId 
      ? `/accounting/digi-tax/shop-settings?shop_id=${shopId}`
      : '/accounting/digi-tax/shop-settings';
    const response = await getRequest(url, {
      headers: { 'x-permission': DIGITAX_PERMISSIONS.CONFIG }
    });
    return response.data;
  },

  // Toggle shop DigiTax settings
  async toggleShopSettings(enabled: boolean): Promise<{ message: string; digi_tax_enabled: boolean }> {
    const response = await postRequest('/accounting/digi-tax/shop-settings', { enabled }, {
      headers: { 'x-permission': DIGITAX_PERMISSIONS.SHOP_SETTINGS }
    });
    return response.data;
  },

  // Generate tax invoice
  async generateTaxInvoice(invoiceId: string, useDigiTax: boolean): Promise<TaxInvoiceResponse> {
    const response = await postRequest(
      `/accounting/invoices/${invoiceId}/generate-digita`,
      { use_digi_tax: useDigiTax },
      {
        headers: { 'x-permission': DIGITAX_PERMISSIONS.GENERATE_INVOICE }
      }
    );
    return response.data;
  },

  // Get invoice status
  async getInvoiceStatus(invoiceNumber: string): Promise<InvoiceStatusResponse> {
    const response = await getRequest(`/accounting/digi-tax/invoices/${invoiceNumber}/status`, {
      headers: { 'x-permission': DIGITAX_PERMISSIONS.INVOICE_STATUS }
    });
    return response.data;
  },

  // Cancel invoice
  async cancelInvoice(invoiceNumber: string, reason: string): Promise<CancelInvoiceResponse> {
    const response = await postRequest(
      `/accounting/digi-tax/invoices/${invoiceNumber}/cancel`,
      { reason },
      {
        headers: { 'x-permission': DIGITAX_PERMISSIONS.CANCEL_INVOICE }
      }
    );
    return response.data;
  },

  // Refresh ETR status from DigiTax
  async refreshEtr(invoiceId: string): Promise<TaxInvoiceResponse> {
    const response = await postRequest(
      `/accounting/invoices/${invoiceId}/refresh-etr`,
      {},
      { headers: { 'x-permission': DIGITAX_PERMISSIONS.GENERATE_INVOICE } }
    );
    return response.data;
  }
};

// Helper function to check if error is a permission error
const isPermissionError = (error: any): boolean => {
  return error?.isPermissionError || error?.message?.includes('Permission denied');
};

// Helper functions for frontend use
export const checkDigiTaxService = async () => {
  try {
    const config = await digiTaxService.getConfig();
    
    return {
      enabled: config.enabled,
      testMode: config.test_mode,
      available: config.service_available,
      canUse: config.enabled && config.service_available,
      config
    };
  } catch (error) {
    // Don't log permission errors as they're expected for users without access
    if (!isPermissionError(error)) {
      console.error('Failed to check DigiTax service:', error);
    }
    return { 
      enabled: false, 
      testMode: false, 
      available: false, 
      canUse: false,
      config: null,
      permissionError: isPermissionError(error)
    };
  }
};

export const getShopDigiTaxSettings = async (shopId?: string) => {
  try {
    const settings = await digiTaxService.getShopSettings(shopId);
    
    return {
      shopEnabled: settings.shop_digi_tax_enabled,
      taxId: settings.shop_tax_id,
      canUse: settings.can_use_digi_tax,
      settings
    };
  } catch (error) {
    // Don't log permission errors as they're expected for users without access
    if (!isPermissionError(error)) {
      console.error('Failed to get shop DigiTax settings:', error);
    }
    return { 
      shopEnabled: false, 
      taxId: null, 
      canUse: false,
      settings: null,
      permissionError: isPermissionError(error)
    };
  }
};

export const refreshInvoiceEtr = async (invoiceId: string) => {
  try {
    const result = await digiTaxService.refreshEtr(invoiceId);
    if (result.digitax) {
      return { success: true, digitax: result.digitax, message: result.message };
    }
    return { success: false, error: result.error || 'ETR refresh failed' };
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.message || (error instanceof Error ? error.message : 'Network error'),
    };
  }
};

export const generateTaxInvoice = async (invoiceId: string, useDigiTax: boolean) => {
  try {
    const result = await digiTaxService.generateTaxInvoice(invoiceId, useDigiTax);
    
    // Handle current backend response: { message, digitax: { ... } }
    if (result.digitax) {
      const d = result.digitax;
      const receiptNum = d.receipt_number ? String(d.receipt_number) : undefined;
      const invoiceNum = d.invoice_number ? `INV-${d.invoice_number}` : undefined;
      return {
        success: true,
        useDigiTax: true,
        testMode: false,
        taxReceiptNumber: receiptNum || invoiceNum,
        qrCode: d.offline_url || d.etims_url || undefined,
        invoiceUrl: d.offline_url || null,
        generatedAt: d.submission_date || new Date().toISOString(),
        serialNumber: d.serial_number,
        traderInvoiceNumber: d.trader_invoice_number,
        submissionStatus: d.submission_status,
        digitax: d,
        message: result.message,
      };
    } else if (result.use_digi_tax || result.test_mode_fallback) {
      // Legacy structure
      return {
        success: true,
        useDigiTax: result.use_digi_tax ?? false,
        testMode: result.test_mode || result.test_mode_fallback?.test_mode,
        taxReceiptNumber: result.tax_receipt_number || result.test_mode_fallback?.tax_receipt_number,
        qrCode: result.qr_code || result.test_mode_fallback?.qr_code,
        invoiceUrl: result.invoice_url || result.test_mode_fallback?.invoice_url,
        generatedAt: result.generated_at || result.test_mode_fallback?.generated_at,
        testFallback: result.test_mode_fallback
      };
    } else {
      return {
        success: false,
        useDigiTax: false,
        error: result.error || 'Failed to generate tax invoice',
        testFallback: result.test_mode_fallback,
      };
    }
  } catch (error) {
    // Don't log permission errors as they're expected for users without access
    if (!isPermissionError(error)) {
      console.error('Failed to generate tax invoice:', error);
    }
    return { 
      success: false,
      useDigiTax: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      permissionError: isPermissionError(error),
    };
  }
};
