# Frontend DigiTax Integration Guide

## Overview
DigiTax integration allows users to generate tax-compliant invoices for printing with QR codes and tax receipt numbers. The system supports both test mode and production mode.

## Environment Variables Required
```bash
DIGI_TAX_API_KEY=your_api_key_here
DIGI_TAX_BASE_URL=https://api.digita.tax
DIGI_TAX_TEST_MODE=true
```

## API Endpoints

### Base URL: `/accounting/digi-tax`

#### Get Service Configuration
```
GET /accounting/digi-tax/config
Headers: Authorization: Bearer <token>

Response:
{
  "enabled": true,
  "test_mode": true,
  "base_url": "https://api.digita.tax",
  "features": {
    "invoice_generation": true,
    "qr_code": true,
    "tax_receipt_number": true,
    "invoice_status": true,
    "invoice_cancellation": true
  },
  "service_available": true,
  "message": "DigiTax service is available"
}
```

#### Get Shop DigiTax Settings
```
GET /accounting/digi-tax/shop-settings?shop_id=<shop_id>
Headers: Authorization: Bearer <token>

Response:
{
  "shop_digi_tax_enabled": true,
  "shop_tax_id": "KRA123456789",
  "service_config": { ... },
  "service_available": true,
  "can_use_digi_tax": true
}
```

#### Toggle Shop DigiTax Settings
```
POST /accounting/digi-tax/shop-settings
Headers: Authorization: Bearer <token>
Body:
{
  "enabled": true
}

Response:
{
  "message": "DigiTax enabled for shop",
  "digi_tax_enabled": true
}
```

#### Generate Tax Invoice
```
POST /accounting/digi-tax/invoices/{invoice_id}/generate
Headers: Authorization: Bearer <token>
Body:
{
  "use_digi_tax": true
}

Response (Success):
{
  "message": "Tax invoice generated successfully",
  "use_digi_tax": true,
  "test_mode": true,
  "tax_receipt_number": "TEST-INV-2025-00001",
  "qr_code": "TEST-QR-1648765432100",
  "invoice_url": null,
  "generated_at": "2025-04-30T00:30:00.000Z"
}

Response (DigiTax Disabled):
{
  "message": "DigiTax integration disabled for this invoice",
  "use_digi_tax": false
}

Response (Error with Test Fallback):
{
  "message": "Failed to generate tax invoice",
  "use_digi_tax": false,
  "error": "Service unavailable",
  "test_mode_fallback": {
    "test_mode": true,
    "invoice_number": "INV-2025-00001",
    "tax_receipt_number": "TEST-INV-2025-00001",
    "qr_code": "TEST-QR-1648765432100",
    "invoice_url": null,
    "message": "Test mode - Invoice generated locally",
    "generated_at": "2025-04-30T00:30:00.000Z"
  },
  "service_config": { ... }
}
```

#### Get Invoice Status
```
GET /accounting/digi-tax/invoices/{invoice_number}/status
Headers: Authorization: Bearer <token>

Response:
{
  "message": "Invoice status retrieved successfully",
  "data": {
    "status": "active",
    "generated_at": "2025-04-30T00:30:00.000Z",
    "qr_code": "QR-123456789",
    "tax_receipt_number": "TRN-123456789"
  }
}
```

#### Cancel Invoice
```
POST /accounting/digi-tax/invoices/{invoice_number}/cancel
Headers: Authorization: Bearer <token>
Body:
{
  "reason": "Customer request"
}

Response:
{
  "message": "Invoice cancelled successfully",
  "data": {
    "status": "cancelled",
    "cancelled_at": "2025-04-30T00:35:00.000Z",
    "reason": "Customer request"
  }
}
```

## Frontend Implementation Guide

### 1. Check Service Availability
```javascript
const checkDigiTaxService = async () => {
  try {
    const response = await fetch('/accounting/digi-tax/config', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const config = await response.json();
    
    return {
      enabled: config.enabled,
      testMode: config.test_mode,
      available: config.service_available,
      canUse: config.enabled && config.service_available
    };
  } catch (error) {
    console.error('Failed to check DigiTax service:', error);
    return { enabled: false, testMode: false, available: false, canUse: false };
  }
};
```

### 2. Get Shop Settings
```javascript
const getShopDigiTaxSettings = async (shopId) => {
  try {
    const response = await fetch(`/accounting/digi-tax/shop-settings${shopId ? `?shop_id=${shopId}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const settings = await response.json();
    
    return {
      shopEnabled: settings.shop_digi_tax_enabled,
      taxId: settings.shop_tax_id,
      canUse: settings.can_use_digi_tax
    };
  } catch (error) {
    console.error('Failed to get shop DigiTax settings:', error);
    return { shopEnabled: false, taxId: null, canUse: false };
  }
};
```

### 3. Generate Tax Invoice Component
```javascript
const generateTaxInvoice = async (invoiceId, useDigiTax) => {
  try {
    const response = await fetch(`/accounting/digi-tax/invoices/${invoiceId}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ use_digi_tax: useDigiTax })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        useDigiTax: result.use_digi_tax,
        testMode: result.test_mode,
        taxReceiptNumber: result.tax_receipt_number,
        qrCode: result.qr_code,
        invoiceUrl: result.invoice_url,
        generatedAt: result.generated_at
      };
    } else {
      // Handle error with test fallback
      return {
        success: false,
        useDigiTax: false,
        error: result.error,
        testFallback: result.test_mode_fallback
      };
    }
  } catch (error) {
    console.error('Failed to generate tax invoice:', error);
    return { success: false, error: error.message };
  }
};
```

### 4. React Component Example
```jsx
import React, { useState, useEffect } from 'react';

const DigiTaxInvoiceGenerator = ({ invoiceId, onGenerate }) => {
  const [digiTaxConfig, setDigiTaxConfig] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [useDigiTax, setUseDigiTax] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const [config, settings] = await Promise.all([
        checkDigiTaxService(),
        getShopDigiTaxSettings()
      ]);
      
      setDigiTaxConfig(config);
      setShopSettings(settings);
      setUseDigiTax(config.canUse && settings.canUse);
    };
    
    loadConfig();
  }, []);

  const handleGenerateInvoice = async () => {
    setLoading(true);
    try {
      const result = await generateTaxInvoice(invoiceId, useDigiTax);
      onGenerate(result);
    } catch (error) {
      console.error('Invoice generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!digiTaxConfig || !shopSettings) {
    return <div>Loading DigiTax configuration...</div>;
  }

  return (
    <div className="digi-tax-invoice-generator">
      <div className="digi-tax-status">
        <label>
          <input
            type="checkbox"
            checked={useDigiTax}
            onChange={(e) => setUseDigiTax(e.target.checked)}
            disabled={!digiTaxConfig.canUse || !shopSettings.canUse}
          />
          Use DigiTax for Tax Invoice
        </label>
        
        {digiTaxConfig.testMode && (
          <span className="test-mode-badge">TEST MODE</span>
        )}
      </div>
      
      {digiTaxConfig.testMode && (
        <div className="test-mode-notice">
          <p>DigiTax is running in test mode. Invoices will be generated locally for testing purposes.</p>
        </div>
      )}
      
      <button
        onClick={handleGenerateInvoice}
        disabled={loading}
        className="generate-invoice-btn"
      >
        {loading ? 'Generating...' : 'Generate Invoice'}
      </button>
    </div>
  );
};

export default DigiTaxInvoiceGenerator;
```

### 5. Invoice Display Component
```jsx
const InvoiceDisplay = ({ invoiceData, digiTaxData }) => {
  return (
    <div className="invoice-print-layout">
      {/* Regular Invoice Content */}
      <div className="invoice-header">
        <h1>TAX INVOICE</h1>
        <div className="invoice-number">{invoiceData.invoice_no}</div>
      </div>
      
      {/* DigiTax Information */}
      {digiTaxData && digiTaxData.useDigiTax && (
        <div className="digi-tax-info">
          <div className="tax-receipt-number">
            Tax Receipt: {digiTaxData.taxReceiptNumber}
          </div>
          
          {digiTaxData.testMode && (
            <div className="test-mode-indicator">
              TEST MODE - Not a valid tax document
            </div>
          )}
          
          {digiTaxData.qrCode && (
            <div className="qr-code">
              <img src={`data:image/png;base64,${digiTaxData.qrCode}`} alt="QR Code" />
            </div>
          )}
        </div>
      )}
      
      {/* Invoice Items and Totals */}
      <div className="invoice-body">
        {/* ... regular invoice content ... */}
      </div>
    </div>
  );
};
```

## User Interface Guidelines

### 1. Toggle Switch
- Use a clear toggle switch for "Use DigiTax" option
- Show test mode indicator when enabled
- Disable toggle when service is unavailable

### 2. Test Mode Indication
- Always show "TEST MODE" badge when in test mode
- Add warning that test invoices are not valid tax documents
- Use different styling for test vs production

### 3. Error Handling
- Gracefully fallback to regular invoice if DigiTax fails
- Show clear error messages to users
- Provide retry options for temporary failures

### 4. Invoice Layout
- Include tax receipt number prominently
- Display QR code for tax verification
- Show test mode watermark when applicable

## Testing Scenarios

### 1. Test Mode Workflow
1. Enable test mode in environment
2. Generate invoice with DigiTax enabled
3. Verify test receipt number and QR code
4. Check test mode indicators

### 2. Production Mode Workflow
1. Set DIGI_TAX_TEST_MODE=false
2. Ensure API key is configured
3. Generate invoice with DigiTax enabled
4. Verify real tax receipt number

### 3. Fallback Scenarios
1. Test with service unavailable
2. Test with invalid API key
3. Test network failures
4. Verify graceful fallback to regular invoice

## Security Considerations

- API key should be stored securely in environment variables
- Never expose API key in frontend code
- Validate all user inputs before sending to DigiTax
- Implement rate limiting for DigiTax API calls
- Log all DigiTax interactions for audit purposes
