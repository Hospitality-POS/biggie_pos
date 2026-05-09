# VAT Calculation System

This document provides comprehensive information about the VAT (Value Added Tax) calculation system implemented for the POS application.

## Overview

The VAT system automatically calculates VAT amounts based on the VAT configuration set in the admin settings at `http://localhost:5374/admin/settings`. The system supports both tax-inclusive and tax-exclusive pricing modes.

## Configuration

### Admin Settings

VAT configuration is managed in the admin settings under the "VAT Config" tab:

- **Enable VAT**: Toggle to enable/disable VAT calculations
- **Pricing Mode**: 
  - `Tax Inclusive`: Prices already include VAT
  - `Tax Exclusive`: VAT is calculated on top of base prices
- **Standard Rate**: VAT percentage rate (e.g., 16%)

### VAT Configuration Properties

```typescript
interface VATConfig {
  is_vat_enabled: boolean;        // Whether VAT is enabled
  vat_standard_rate: number;      // VAT rate as percentage (e.g., 16)
  vat_pricing_mode: 'INCLUSIVE' | 'EXCLUSIVE';  // Pricing mode
}
```

## Components and Utilities

### 1. VAT Utility Functions (`/src/utils/vat.ts`)

Core VAT calculation utilities:

```typescript
// Get VAT configuration from tenant settings
const vatConfig = await getVATConfig();

// Synchronous version (uses localStorage)
const vatConfig = getVATConfigSync();

// Calculate VAT for a single amount
const result = calculateVAT(1000, vatConfig);

// Calculate VAT for multiple items
const items = [{ amount: 1000, quantity: 2 }, { amount: 500, quantity: 1 }];
const totalResult = calculateTotalVAT(items, vatConfig);

// Format amounts for display
const formatted = formatVATAmount(1500, 'KES'); // "KES 1,500.00"

// Get formatted summary
const summary = getVATSummary(result, 'KES');
```

### 2. React Hook (`/src/hooks/useVAT.ts`)

Easy integration with React components:

```typescript
import { useVAT } from '@hooks/useVAT';

function MyComponent() {
  const { 
    vatConfig, 
    calculateVAT, 
    calculateTotalVAT, 
    isLoading, 
    error 
  } = useVAT();

  // Auto-calculates when values change
  const vatResult = calculateVAT(1000);
  
  return (
    <div>
      <p>VAT Rate: {vatConfig.vat_standard_rate}%</p>
      <p>VAT Amount: {vatResult.vat_amount}</p>
    </div>
  );
}
```

### 3. VAT Display Component (`/src/components/VAT/VATDisplay.tsx`)

Reusable component for displaying VAT calculations:

```typescript
import VATDisplay from '@components/VAT/VATDisplay';

function OrderSummary() {
  const vatResult = calculateVAT(1000, vatConfig);
  
  return (
    <VATDisplay
      calculation={vatResult}
      currency="KES"
      showDetails={true}
      compact={false}
    />
  );
}
```

### 4. Form Example (`/src/components/VAT/VATFormExample.tsx`)

Complete example showing VAT integration in forms:

```typescript
import VATFormExample from '@components/VAT/VATFormExample';

function InvoiceForm() {
  const handleSubmit = (data) => {
    console.log('Submitted with VAT:', data);
  };
  
  return (
    <VATFormExample onSubmit={handleSubmit} />
  );
}
```

## Usage Examples

### Basic VAT Calculation

```typescript
import { getVATConfigSync, calculateVAT } from '@utils/vat';

// Get current VAT settings
const vatConfig = getVATConfigSync();

// Calculate VAT for KES 1000 (EXCLUSIVE pricing)
const result = calculateVAT(1000, vatConfig);
console.log(result);
// {
//   amount: 1000,           // Base amount
//   vat_amount: 160,       // VAT amount (16% of 1000)
//   total_amount: 1160,    // Total including VAT
//   vat_rate: 16,
//   pricing_mode: 'EXCLUSIVE',
//   is_vat_enabled: true
// }
```

### Tax Inclusive Pricing

```typescript
// For INCLUSIVE pricing (price already includes VAT)
const inclusiveResult = calculateVAT(1160, {
  is_vat_enabled: true,
  vat_standard_rate: 16,
  vat_pricing_mode: 'INCLUSIVE'
});

console.log(inclusiveResult);
// {
//   amount: 1000,           // Base amount (1160 / 1.16)
//   vat_amount: 160,       // VAT amount (1160 - 1000)
//   total_amount: 1160,    // Total (same as input)
//   vat_rate: 16,
//   pricing_mode: 'INCLUSIVE',
//   is_vat_enabled: true
// }
```

### Multiple Items Calculation

```typescript
const items = [
  { amount: 500, quantity: 2 },  // KES 1000 total
  { amount: 300, quantity: 1 },  // KES 300 total
  { amount: 200, quantity: 3 },  // KES 600 total
];

const totalResult = calculateTotalVAT(items, vatConfig);
console.log(totalResult);
// {
//   amount: 1900,          // Total base amount
//   vat_amount: 304,       // Total VAT (16% of 1900)
//   total_amount: 2204,    // Grand total
//   vat_rate: 16,
//   pricing_mode: 'EXCLUSIVE',
//   is_vat_enabled: true
// }
```

### Integration in Forms

```typescript
import React, { useState } from 'react';
import { useVAT } from '@hooks/useVAT';
import VATDisplay from '@components/VAT/VATDisplay';

function ProductForm() {
  const [price, setPrice] = useState(1000);
  const { calculateVAT } = useVAT();
  
  const vatResult = calculateVAT(price);
  
  return (
    <div>
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
      />
      
      <VATDisplay calculation={vatResult} />
      
      <button onClick={() => {
        // Submit with VAT calculation
        submitOrder({
          base_price: vatResult.amount,
          vat_amount: vatResult.vat_amount,
          total_price: vatResult.total_amount,
        });
      }}>
        Submit Order
      </button>
    </div>
  );
}
```

## API Integration

### Submission Data Format

When submitting forms with VAT calculations, include the VAT breakdown:

```typescript
const submissionData = {
  items: [
    {
      name: "Product A",
      base_price: 1000,
      vat_amount: 160,
      total_price: 1160,
      quantity: 2
    }
  ],
  order_summary: {
    subtotal: 2000,
    vat_total: 320,
    grand_total: 2320,
    vat_rate: 16,
    pricing_mode: 'EXCLUSIVE'
  }
};
```

### Backend Considerations

Ensure your backend API accepts and stores VAT information:

```typescript
interface OrderItem {
  name: string;
  base_price: number;
  vat_amount: number;
  total_price: number;
  quantity: number;
}

interface Order {
  items: OrderItem[];
  subtotal: number;
  vat_total: number;
  grand_total: number;
  vat_rate: number;
  pricing_mode: 'INCLUSIVE' | 'EXCLUSIVE';
  is_vat_enabled: boolean;
}
```

## Error Handling

The VAT system includes comprehensive error handling:

```typescript
import { useVAT } from '@hooks/useVAT';

function VATComponent() {
  const { vatConfig, isLoading, error } = useVAT();
  
  if (isLoading) {
    return <div>Loading VAT configuration...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  if (!vatConfig.is_vat_enabled) {
    return <div>VAT is disabled</div>;
  }
  
  // Proceed with VAT calculations
}
```

## Testing

### Example Test Cases

```typescript
import { calculateVAT, getVATConfigSync } from '@utils/vat';

// Test exclusive pricing
test('calculates VAT for exclusive pricing', () => {
  const config = { is_vat_enabled: true, vat_standard_rate: 16, vat_pricing_mode: 'EXCLUSIVE' };
  const result = calculateVAT(1000, config);
  
  expect(result.vat_amount).toBe(160);
  expect(result.total_amount).toBe(1160);
  expect(result.amount).toBe(1000);
});

// Test inclusive pricing
test('calculates VAT for inclusive pricing', () => {
  const config = { is_vat_enabled: true, vat_standard_rate: 16, vat_pricing_mode: 'INCLUSIVE' };
  const result = calculateVAT(1160, config);
  
  expect(result.vat_amount).toBe(160);
  expect(result.amount).toBe(1000);
  expect(result.total_amount).toBe(1160);
});

// Test disabled VAT
test('returns zero VAT when disabled', () => {
  const config = { is_vat_enabled: false, vat_standard_rate: 16, vat_pricing_mode: 'EXCLUSIVE' };
  const result = calculateVAT(1000, config);
  
  expect(result.vat_amount).toBe(0);
  expect(result.total_amount).toBe(1000);
  expect(result.is_vat_enabled).toBe(false);
});
```

## Best Practices

1. **Always check VAT configuration** before performing calculations
2. **Handle disabled VAT** gracefully in your components
3. **Use the React hook** for automatic updates when settings change
4. **Display VAT breakdown** to users for transparency
5. **Store VAT details** in your database for reporting and auditing
6. **Format amounts** using the provided utility functions
7. **Test both pricing modes** (inclusive and exclusive)

## Troubleshooting

### Common Issues

1. **VAT not calculating**: Check if VAT is enabled in admin settings
2. **Wrong amounts**: Verify pricing mode (inclusive vs exclusive)
3. **Configuration not updating**: Refresh VAT config using the hook's refresh method
4. **Type errors**: Ensure proper TypeScript types are imported

### Debug Information

```typescript
// Enable debug logging
console.log('VAT Config:', vatConfig);
console.log('VAT Result:', vatResult);
console.log('VAT Summary:', getVATSummary(vatResult));
```

## Support

For issues or questions about the VAT system:
1. Check the admin settings configuration
2. Verify tenant data in localStorage
3. Review browser console for error messages
4. Test with different VAT rates and pricing modes
