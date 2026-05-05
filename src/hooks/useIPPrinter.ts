import { useState } from 'react';
import { App } from 'antd';

interface OrderData {
  shopName: string;
  location: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total?: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  cashierName?: string;
  tableNumber?: string;
  orderType?: string;
  discounts?: any[];
  serviceCharge?: number;
  discount?: number;
  discountType?: string;
  // Printer formatting options
  paperWidth?: number;
  charactersPerLine?: number;
  fontSize?: number;
  lineHeight?: number;
  includeHeader?: boolean;
  includeFooter?: boolean;
  includeBarcode?: boolean;
  formatForThermal?: boolean;
  documentType?: string;
  isSpaBill?: boolean;
  // Enhanced UI formatting
  boldText?: boolean;
  centerAlign?: boolean;
  padding?: number;
  doubleSpaceHeader?: boolean;
  emphasizeTotals?: boolean;
  includeBorders?: boolean;
  compactItems?: boolean;
}

export const useIPPrinter = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const getShopId = () => localStorage.getItem("shopId") || "";
  const getTenantCode = () => {
    try {
      const storedTenant = localStorage.getItem("tenant");
      const tenant = storedTenant ? JSON.parse(storedTenant) : null;
      return tenant?.tenant_code || "";
    } catch {
      return "";
    }
  };

  const printReceipt = async (orderData: OrderData) => {
    const shopId = getShopId();
    const tenantCode = getTenantCode();
    
    if (!shopId) {
      message.error('Shop ID not found');
      return { success: false, message: 'Shop ID not found' };
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3002/printer-service/print-receipt?shop_id=${shopId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'companycode': tenantCode
        },
        body: JSON.stringify({ orderData })
      });

      // Check if response is HTML (404) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Printer service not available');
      }

      const data = await response.json();
      
      if (data.success) {
        return { success: true, message: 'Receipt printed successfully' };
      } else {
        return { success: false, message: data.error || 'Failed to print receipt' };
      }
    } catch (error) {
      return { success: false, message: 'Printer service not available - cannot print receipt' };
    } finally {
      setLoading(false);
    }
  };

  const printBill = async (cartDetails: any, documentType: 'bill' | 'spa_bill') => {
    const shopId = getShopId();
    const tenantCode = getTenantCode();
    
    if (!shopId) {
      message.error('Shop ID not found');
      return { success: false, message: 'Shop ID not found' };
    }

    setLoading(true);
    
    // Debug: Log the incoming cartDetails
    console.log('🔍 IP Printer - Cart Details Received:', cartDetails);
    console.log('🔍 IP Printer - Document Type:', documentType);
    console.log('🔍 IP Printer - Items:', cartDetails?.items);
    console.log('🔍 IP Printer - Totals:', {
      subtotal: cartDetails?.subtotal,
      tax: cartDetails?.total_vat_amount,
      total: cartDetails?.grand_total || cartDetails?.total
    });

    try {
      // Transform cart details to order data format with enhanced formatting
      const orderData: OrderData = {
        shopName: cartDetails?.shop?.name || 'My Shop',
        location: cartDetails?.shop?.location || 'Nairobi, Kenya',
        orderNumber: cartDetails?.order_no || `BILL-${Date.now()}`,
        orderDate: new Date().toISOString(),
        // Use the items array from the data prop (which contains the actual cart items)
        items: (cartDetails?.items || []).map((item: any) => ({
          name: item?.product_id?.name || item.product_name || item.name || item.item_name,
          quantity: item.quantity,
          price: item.price || item.unit_price || item.selling_price,
          // Add additional formatting info for thermal printer
          total: (item.quantity || 0) * (item.price || item.unit_price || item.selling_price || 0)
        })),
        subtotal: cartDetails?.subtotal || 0,
        tax: cartDetails?.total_vat_amount || cartDetails?.vat || 0,
        total: cartDetails?.grand_total || cartDetails?.total || 0,
        paymentMethod: cartDetails?.payment_method || 'CASH',
        customerName: cartDetails?.customer_name || cartDetails?.client_name || cartDetails?.clientName,
        // Add additional receipt formatting data
        cashierName: cartDetails?.cashier_name || cartDetails?.served_by?.username || cartDetails?.created_by?.username || 'System',
        tableNumber: cartDetails?.table_number || cartDetails?.table_no || cartDetails?.table_id?.name || '',
        orderType: cartDetails?.order_type || 'Dine-in',
        discounts: cartDetails?.discounts || [],
        serviceCharge: cartDetails?.service_charge || 0,
        // Add discount info if present
        discount: cartDetails?.discount || 0,
        discountType: cartDetails?.discount_type || 'amount'
      };

      // Debug: Log the formatted order data
      console.log('🔍 IP Printer - Formatted Order Data:', orderData);

      // Add document type and printer formatting data
      const enhancedOrderData = {
        ...orderData,
        documentType,
        isSpaBill: documentType === 'spa_bill',
        // Enhanced printer formatting options
        paperWidth: 80, // 80mm paper for better formatting
        charactersPerLine: 32, // Much reduced for much larger text
        fontSize: 24, // Much larger font size for excellent readability
        lineHeight: 1.5, // Better line spacing for larger text
        includeHeader: true,
        includeFooter: true,
        includeBarcode: false, // Disable barcode for thermal printing
        formatForThermal: true, // Explicit thermal printer formatting
        // Enhanced UI formatting
        boldText: true, // Bold text for better visibility
        centerAlign: true, // Center alignment for header/footer
        padding: 4, // Add padding for better layout
        doubleSpaceHeader: true, // Double space header for emphasis
        emphasizeTotals: true, // Emphasize total amounts
        includeBorders: false, // No borders for cleaner look
        compactItems: false // More space between items
      };

      // Debug: Log the enhanced order data being sent to printer
      console.log('🔍 IP Printer - Enhanced Order Data for Printer:', enhancedOrderData);
      console.log('🔍 IP Printer - Sending to printer service:', {
        url: `http://localhost:3002/printer-service/print-receipt?shop_id=${shopId}`,
        shopId,
        tenantCode,
        orderData: enhancedOrderData
      });

      const response = await fetch(`http://localhost:3002/printer-service/print-receipt?shop_id=${shopId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'companycode': tenantCode
        },
        body: JSON.stringify({ orderData: enhancedOrderData })
      });

      // Check if response is HTML (404) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Printer service not available');
      }

      const data = await response.json();
      
      if (data.success) {
        return { success: true, message: `${documentType === 'spa_bill' ? 'Spa Bill' : 'Bill'} printed successfully` };
      } else {
        return { success: false, message: data.error || `Failed to print ${documentType === 'spa_bill' ? 'spa bill' : 'bill'}` };
      }
    } catch (error) {
      return { success: false, message: 'Printer service not available - cannot print bill' };
    } finally {
      setLoading(false);
    }
  };

  // Function to print HTML content directly from modal
  const printHtmlContent = async (htmlContent: string, documentType: 'bill' | 'spa_bill') => {
    const shopId = getShopId();
    const tenantCode = getTenantCode();
    
    if (!shopId) {
      message.error('Shop ID not found');
      return { success: false, message: 'Shop ID not found' };
    }

    setLoading(true);
    
    try {
      // Clean and sanitize HTML content
      const cleanHtmlContent = htmlContent
        .replace(/<!--.*?-->/gs, '') // Remove HTML comments
        .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
        .trim();

      console.log('🔍 IP Printer - Sending HTML content to printer:', {
        documentType,
        originalContentLength: htmlContent.length,
        cleanedContentLength: cleanHtmlContent.length,
        shopId,
        tenantCode
      });

      // Try multiple endpoints for HTML printing
      const endpoints = [
        `http://localhost:3002/printer-service/print-html?shop_id=${shopId}`,
        `http://localhost:3002/printer-service/print-receipt-html?shop_id=${shopId}`,
        `http://localhost:3002/printer-service/html-print?shop_id=${shopId}`
      ];

      let lastError;
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'companycode': tenantCode,
            },
            body: JSON.stringify({
              htmlContent: cleanHtmlContent,
              documentType,
              paperWidth: 80,
              charactersPerLine: 32,
              fontSize: 24,
              lineHeight: 1.5,
              formatForThermal: true,
              ip_address: '192.168.100.89', // Force correct IP
              port: 9100
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log('🔍 IP Printer - HTML print response:', result);
            
            message.success('Receipt printed successfully via IP printer');
            return { success: true, message: 'Receipt printed successfully', data: result };
          } else {
            const errorData = await response.json().catch(() => ({}));
            lastError = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            console.log(`❌ Endpoint ${endpoint} failed: ${lastError.message}`);
          }
        } catch (error) {
          lastError = error;
          console.log(`❌ Endpoint ${endpoint} error: ${error.message}`);
        }
      }

      // If all endpoints failed, try the original print-receipt endpoint with HTML
      console.log('🔄 Trying fallback to print-receipt endpoint...');
      const fallbackResponse = await fetch(`http://localhost:3002/printer-service/print-receipt?shop_id=${shopId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'companycode': tenantCode,
        },
        body: JSON.stringify({
          orderData: {
            shopName: 'My Shop',
            location: 'Nairobi, Kenya',
            orderNumber: `BILL-${Date.now()}`,
            orderDate: new Date().toISOString(),
            items: [], // Empty items - just print the HTML
            subtotal: 0,
            tax: 0,
            total: 0,
            paymentMethod: 'CASH',
            documentType,
            isSpaBill: documentType === 'spa_bill',
            paperWidth: 80,
            charactersPerLine: 32,
            fontSize: 24,
            lineHeight: 1.5,
            formatForThermal: true,
            // Include HTML as raw content
            htmlContent: cleanHtmlContent,
            ip_address: '192.168.100.89',
            port: 9100
          }
        })
      });

      if (fallbackResponse.ok) {
        const fallbackResult = await fallbackResponse.json();
        console.log('🔍 IP Printer - Fallback response:', fallbackResult);
        message.success('Receipt printed successfully via IP printer (fallback)');
        return { success: true, message: 'Receipt printed successfully', data: fallbackResult };
      }

      throw lastError || new Error('All endpoints failed');
      
    } catch (error: any) {
      console.error('🔍 IP Printer - HTML print error:', error);
      const errorMessage = error.message || 'Failed to print receipt via IP printer';
      message.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return { printReceipt, printBill, printHtmlContent, loading };
};
