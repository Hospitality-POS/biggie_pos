# Printer Integration Guide

## Overview

This guide explains how to integrate IP-based printer functionality into your frontend application. The printer system supports cross-network printing, allowing your DigitalOcean-hosted API to print to on-premise network printers at client locations.

## API Endpoints

### Base URL
```
/printer-service
```

### Available Endpoints

#### 1. Test Printer Connection
```http
POST /printer-service/test-connection
```

**Request Body:**
```json
{
  "ip_address": "192.168.1.100",
  "port": 9100,
  "timeout": 5000
}
```

**Response:**
```json
{
  "success": true,
  "connected": true,
  "message": "Successfully connected to printer",
  "tested_at": "2026-05-04T21:20:00.000Z"
}
```

#### 2. Get Printer Configuration
```http
GET /printer-service/config?shop_id={shopId}
```

**Response:**
```json
{
  "success": true,
  "printer_config": {
    "printer_name": "Thermal Printer 1",
    "printer_type": "thermal",
    "connection_type": "ip",
    "ip_address": "192.168.1.100",
    "port": 9100,
    "paper_width": 58,
    "characters_per_line": 32,
    "line_spacing": 32,
    "is_default": true,
    "is_active": true,
    "timeout_ms": 5000,
    "retry_attempts": 3
  }
}
```

#### 3. Update Printer Configuration
```http
PUT /printer-service/config?shop_id={shopId}
```

**Request Body:**
```json
{
  "printer_config": {
    "printer_name": "Main Receipt Printer",
    "printer_type": "thermal",
    "connection_type": "ip",
    "ip_address": "192.168.1.100",
    "port": 9100,
    "paper_width": 58,
    "characters_per_line": 32,
    "line_spacing": 32,
    "is_default": true,
    "is_active": true,
    "timeout_ms": 5000,
    "retry_attempts": 3
  }
}
```

#### 4. Print Test Page
```http
POST /printer-service/test-print?shop_id={shopId}
```

**Response:**
```json
{
  "success": true,
  "message": "Test page printed successfully",
  "printed_at": "2026-05-04T21:20:00.000Z"
}
```

#### 5. Print Receipt
```http
POST /printer-service/print-receipt?shop_id={shopId}
```

**Request Body:**
```json
{
  "orderData": {
    "shopName": "My Shop",
    "location": "Nairobi, Kenya",
    "orderNumber": "ORD-001",
    "orderDate": "2026-05-04T21:20:00.000Z",
    "items": [
      {
        "name": "Coffee",
        "quantity": 2,
        "price": 5.00
      },
      {
        "name": "Sandwich",
        "quantity": 1,
        "price": 8.50
      }
    ],
    "subtotal": 18.50,
    "tax": 2.78,
    "total": 21.28,
    "paymentMethod": "CASH",
    "customerName": "John Doe"
  }
}
```

## Frontend Implementation

### 1. Printer Settings Component

```jsx
// PrinterSettings.jsx
import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, Button, message, Space, Divider } from 'antd';

const { Option } = Select;

const PrinterSettings = ({ shopId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [printerConfig, setPrinterConfig] = useState({});

  // Fetch printer configuration
  useEffect(() => {
    fetchPrinterConfig();
  }, [shopId]);

  const fetchPrinterConfig = async () => {
    try {
      const response = await fetch(`/printer-service/config?shop_id=${shopId}`);
      const data = await response.json();
      
      if (data.success) {
        setPrinterConfig(data.printer_config);
        form.setFieldsValue(data.printer_config);
      }
    } catch (error) {
      message.error('Failed to fetch printer configuration');
    }
  };

  // Test printer connection
  const testConnection = async () => {
    const values = form.getFieldsValue(['ip_address', 'port']);
    
    if (!values.ip_address) {
      message.error('Please enter printer IP address');
      return;
    }

    setTesting(true);
    try {
      const response = await fetch('/printer-service/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: values.ip_address,
          port: values.port || 9100
        })
      });

      const data = await response.json();
      
      if (data.success && data.connected) {
        message.success('Printer connection successful!');
      } else {
        message.error('Failed to connect to printer');
      }
    } catch (error) {
      message.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  // Save printer configuration
  const saveConfig = async (values) => {
    setLoading(true);
    try {
      const response = await fetch(`/printer-service/config?shop_id=${shopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printer_config: values })
      });

      const data = await response.json();
      
      if (data.success) {
        message.success('Printer configuration saved successfully');
        setPrinterConfig(values);
      } else {
        message.error('Failed to save printer configuration');
      }
    } catch (error) {
      message.error('Save failed');
    } finally {
      setLoading(false);
    }
  };

  // Print test page
  const printTestPage = async () => {
    try {
      const response = await fetch(`/printer-service/test-print?shop_id=${shopId}`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        message.success('Test page printed successfully');
      } else {
        message.error('Failed to print test page');
      }
    } catch (error) {
      message.error('Print test failed');
    }
  };

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        onFinish={saveConfig}
        initialValues={{
          printer_type: 'thermal',
          connection_type: 'ip',
          port: 9100,
          paper_width: 58,
          characters_per_line: 32,
          line_spacing: 32,
          is_default: true,
          is_active: true,
          timeout_ms: 5000,
          retry_attempts: 3
        }}
      >
        <Form.Item
          label="Printer Name"
          name="printer_name"
          rules={[{ required: true, message: 'Please enter printer name' }]}
        >
          <Input placeholder="e.g., Thermal Printer 1" />
        </Form.Item>

        <Form.Item
          label="Printer Type"
          name="printer_type"
        >
          <Select>
            <Option value="thermal">Thermal</Option>
            <Option value="laser">Laser</Option>
            <Option value="inkjet">Inkjet</Option>
            <Option value="pos">POS</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Connection Type"
          name="connection_type"
        >
          <Select>
            <Option value="ip">IP Network</Option>
            <Option value="usb">USB</Option>
            <Option value="bluetooth">Bluetooth</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="IP Address"
          name="ip_address"
          rules={[
            { required: true, message: 'Please enter printer IP address' },
            { pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, message: 'Invalid IP address format' }
          ]}
        >
          <Input placeholder="e.g., 192.168.1.100" />
        </Form.Item>

        <Form.Item
          label="Port"
          name="port"
          rules={[{ type: 'number', min: 1, max: 65535, message: 'Port must be between 1 and 65535' }]}
        >
          <Input type="number" placeholder="9100" />
        </Form.Item>

        <Form.Item
          label="Paper Width (mm)"
          name="paper_width"
        >
          <Select>
            <Option value={58}>58mm</Option>
            <Option value={80}>80mm</Option>
            <Option value={112}>112mm</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Characters per Line"
          name="characters_per_line"
        >
          <Input type="number" min={20} max={48} />
        </Form.Item>

        <Form.Item
          label="Line Spacing"
          name="line_spacing"
        >
          <Input type="number" min={24} max={48} />
        </Form.Item>

        <Form.Item
          label="Timeout (ms)"
          name="timeout_ms"
        >
          <Input type="number" min={1000} max={30000} />
        </Form.Item>

        <Form.Item
          label="Retry Attempts"
          name="retry_attempts"
        >
          <Input type="number" min={1} max={10} />
        </Form.Item>

        <Form.Item
          label="Active"
          name="is_active"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Divider />

        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save Configuration
          </Button>
          <Button onClick={testConnection} loading={testing}>
            Test Connection
          </Button>
          <Button onClick={printTestPage} disabled={!printerConfig.is_active}>
            Print Test Page
          </Button>
        </Space>
      </Form>
    </div>
  );
};

export default PrinterSettings;
```

### 2. Print Receipt Hook

```jsx
// usePrinter.js
import { useState } from 'react';

export const usePrinter = (shopId) => {
  const [loading, setLoading] = useState(false);

  const printReceipt = async (orderData) => {
    setLoading(true);
    try {
      const response = await fetch(`/printer-service/print-receipt?shop_id=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderData })
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, message: 'Receipt printed successfully' };
      } else {
        return { success: false, message: data.error || 'Failed to print receipt' };
      }
    } catch (error) {
      return { success: false, message: 'Print request failed' };
    } finally {
      setLoading(false);
    }
  };

  return { printReceipt, loading };
};
```

### 3. Usage in Order Component

```jsx
// OrderComponent.jsx
import { usePrinter } from './hooks/usePrinter';

const OrderComponent = ({ order, shopId }) => {
  const { printReceipt, loading } = usePrinter(shopId);

  const handlePrintReceipt = async () => {
    const orderData = {
      shopName: order.shopName,
      location: order.location,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      paymentMethod: order.paymentMethod,
      customerName: order.customerName
    };

    const result = await printReceipt(orderData);
    
    if (result.success) {
      // Show success message
    } else {
      // Show error message
    }
  };

  return (
    <Button 
      onClick={handlePrintReceipt} 
      loading={loading}
      icon={<PrinterIcon />}
    >
      Print Receipt
    </Button>
  );
};
```

## Error Handling

### Common Error Responses

```json
{
  "error": "Printer IP address is not configured"
}
```

```json
{
  "error": "Printer is not active"
}
```

```json
{
  "error": "Failed to connect to 192.168.1.100:9100 - Connection timeout"
}
```

### Error Handling Best Practices

1. **Validate IP Address**: Always validate IP format before sending
2. **Check Printer Status**: Verify printer is active before attempting to print
3. **Handle Timeouts**: Implement proper timeout handling for network operations
4. **User Feedback**: Provide clear feedback for connection status and print results
5. **Retry Logic**: Implement client-side retry for failed print attempts

## Network Configuration

### Firewall Requirements

Ensure the following ports are open:
- **Port 9100**: Default raw TCP printing port
- **Custom Ports**: Any custom ports configured in printer settings

### VPN Considerations

If your DigitalOcean server needs to access on-premise printers:
1. Configure VPN between DigitalOcean and client network
2. Ensure printer IP is accessible through VPN
3. Test connectivity before deployment

## Testing Checklist

### Pre-Deployment Testing
- [ ] Test connection to actual printer IP
- [ ] Verify IP address validation
- [ ] Test with invalid IP addresses
- [ ] Test print functionality with sample orders
- [ ] Test timeout and retry behavior

### Production Testing
- [ ] Test cross-network connectivity (DigitalOcean to on-premise)
- [ ] Test with different printer models
- [ ] Test concurrent printing
- [ ] Test error handling and recovery

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check network connectivity
   - Verify IP address and port
   - Check firewall settings

2. **Print Fails**
   - Verify printer is powered on
   - Check printer paper
   - Test with different port number

3. **Invalid IP Address**
   - Use proper IP format (xxx.xxx.xxx.xxx)
   - Ensure printer is on same network or accessible via VPN

### Debug Tips

1. Use browser network tab to inspect API calls
2. Check server logs for detailed error messages
3. Test with local printer first before cross-network testing
4. Verify printer supports ESC/POS commands

## Support

For technical issues:
1. Check server logs in `/logs/printer.log`
2. Verify network connectivity using ping/traceroute
3. Test with different printer models
4. Contact support with error details and network configuration
