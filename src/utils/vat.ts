/**
 * VAT Calculation Utilities
 * 
 * This utility provides functions to calculate VAT amounts based on tenant settings.
 * VAT configuration is retrieved from the admin settings at http://localhost:5374/admin/settings
 */

import { getCurrentTenantId, fetchTenantDetails } from '@services/tenants';

export interface VATConfig {
  is_vat_enabled: boolean;
  vat_standard_rate: number;
  vat_pricing_mode: 'INCLUSIVE' | 'EXCLUSIVE';
}

export interface VATCalculationResult {
  amount: number;
  vat_amount: number;
  total_amount: number;
  vat_rate: number;
  pricing_mode: 'INCLUSIVE' | 'EXCLUSIVE';
  is_vat_enabled: boolean;
}

/**
 * Get VAT configuration from tenant settings
 */
export const getVATConfig = async (): Promise<VATConfig | null> => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      console.warn('No tenant ID found');
      return null;
    }

    const tenantData = await fetchTenantDetails(tenantId);
    const tenant = tenantData?.data;

    if (!tenant) {
      console.warn('No tenant data found');
      return null;
    }

    return {
      is_vat_enabled: tenant.is_vat_enabled || false,
      vat_standard_rate: tenant.vat_standard_rate || 0,
      vat_pricing_mode: tenant.vat_pricing_mode || 'EXCLUSIVE',
    };
  } catch (error) {
    console.error('Error fetching VAT config:', error);
    return null;
  }
};

/**
 * Get VAT configuration from localStorage (synchronous version)
 */
export const getVATConfigSync = (): VATConfig => {
  try {
    const storedTenant = localStorage.getItem('tenant');
    if (!storedTenant) {
      return {
        is_vat_enabled: false,
        vat_standard_rate: 0,
        vat_pricing_mode: 'EXCLUSIVE',
      };
    }

    const tenant = JSON.parse(storedTenant);
    return {
      is_vat_enabled: tenant.is_vat_enabled || false,
      vat_standard_rate: tenant.vat_standard_rate || 0,
      vat_pricing_mode: tenant.vat_pricing_mode || 'EXCLUSIVE',
    };
  } catch (error) {
    console.error('Error parsing VAT config from localStorage:', error);
    return {
      is_vat_enabled: false,
      vat_standard_rate: 0,
      vat_pricing_mode: 'EXCLUSIVE',
    };
  }
};

/**
 * Calculate VAT amount based on pricing mode
 * 
 * @param amount - Base amount (before VAT for EXCLUSIVE, after VAT for INCLUSIVE)
 * @param vatConfig - VAT configuration
 * @returns VAT calculation result
 */
export const calculateVAT = (amount: number, vatConfig: VATConfig): VATCalculationResult => {
  if (!vatConfig.is_vat_enabled || vatConfig.vat_standard_rate <= 0) {
    return {
      amount,
      vat_amount: 0,
      total_amount: amount,
      vat_rate: 0,
      pricing_mode: vatConfig.vat_pricing_mode,
      is_vat_enabled: false,
    };
  }

  const vatRate = vatConfig.vat_standard_rate; // VAT rate is already a decimal (0.16 = 16%)
  let vatAmount: number;
  let totalAmount: number;
  let baseAmount: number;

  if (vatConfig.vat_pricing_mode === 'EXCLUSIVE') {
    // For EXCLUSIVE pricing: VAT is calculated on top of the base amount
    vatAmount = amount * vatRate;
    totalAmount = amount + vatAmount;
    baseAmount = amount;
  } else {
    // For INCLUSIVE pricing: Amount already includes VAT, need to extract VAT
    totalAmount = amount;
    baseAmount = amount / (1 + vatRate);
    vatAmount = amount - baseAmount;
  }

  return {
    amount: baseAmount,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    vat_rate: vatConfig.vat_standard_rate * 100, // Convert decimal to percentage for display
    pricing_mode: vatConfig.vat_pricing_mode,
    is_vat_enabled: true,
  };
};

/**
 * Calculate VAT for multiple line items
 * 
 * @param items - Array of items with amounts
 * @param vatConfig - VAT configuration
 * @returns Array of VAT calculation results
 */
export const calculateVATForItems = (
  items: Array<{ amount: number; quantity?: number }>,
  vatConfig: VATConfig
): VATCalculationResult[] => {
  return items.map(item => {
    const itemAmount = item.quantity ? item.amount * item.quantity : item.amount;
    return calculateVAT(itemAmount, vatConfig);
  });
};

/**
 * Calculate total VAT for multiple items
 * 
 * @param items - Array of items with amounts
 * @param vatConfig - VAT configuration
 * @returns Total VAT calculation result
 */
export const calculateTotalVAT = (
  items: Array<{ amount: number; quantity?: number }>,
  vatConfig: VATConfig
): VATCalculationResult => {
  const itemResults = calculateVATForItems(items, vatConfig);
  
  const totalBaseAmount = itemResults.reduce((sum, result) => sum + result.amount, 0);
  const totalVATAmount = itemResults.reduce((sum, result) => sum + result.vat_amount, 0);
  const totalAmount = itemResults.reduce((sum, result) => sum + result.total_amount, 0);

  return {
    amount: totalBaseAmount,
    vat_amount: totalVATAmount,
    total_amount: totalAmount,
    vat_rate: vatConfig.vat_standard_rate * 100, // Convert decimal to percentage for display
    pricing_mode: vatConfig.vat_pricing_mode,
    is_vat_enabled: vatConfig.is_vat_enabled,
  };
};

/**
 * Format VAT amount for display
 * 
 * @param amount - VAT amount
 * @param currency - Currency code (default: 'KES')
 * @returns Formatted string
 */
export const formatVATAmount = (amount: number, currency = 'KES'): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get VAT summary for display
 * 
 * @param result - VAT calculation result
 * @param currency - Currency code (default: 'KES')
 * @returns Formatted summary object
 */
export const getVATSummary = (result: VATCalculationResult, currency = 'KES') => {
  return {
    base_amount: formatVATAmount(result.amount, currency),
    vat_amount: formatVATAmount(result.vat_amount, currency),
    total_amount: formatVATAmount(result.total_amount, currency),
    vat_rate: `${result.vat_rate}%`,
    pricing_mode: result.pricing_mode,
    is_vat_enabled: result.is_vat_enabled,
  };
};
