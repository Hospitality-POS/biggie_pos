/**
 * VAT Test Page
 * 
 * This page demonstrates the auto VAT calculation functionality
 * where VAT is calculated when typing net amount and VAT input is hidden when enabled.
 */

import React from 'react';
import { Card, Typography, Space, Alert } from 'antd';
import AutoVATForm from '@components/VAT/AutoVATForm';

const { Title, Text } = Typography;

const VATTestPage: React.FC = () => {
  const handleFormSubmit = (data: {
    net_amount: number;
    vat_amount: number;
    gross_amount: number;
    description: string;
    vat_enabled: boolean;
  }) => {
    console.log('VAT Form Submitted:', data);
    alert(`Form submitted with:\nNet: KES ${data.net_amount}\nVAT: KES ${data.vat_amount}\nGross: KES ${data.gross_amount}\nVAT Auto-enabled: ${data.vat_enabled}`);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* Page Header */}
        <div>
          <Title level={2}>VAT Auto-Calculation Test</Title>
          <Text type="secondary">
            This page demonstrates automatic VAT calculation when typing net amount.
            When VAT is enabled in admin settings, the VAT input field is hidden and VAT is calculated automatically.
          </Text>
        </div>

        {/* Instructions */}
        <Alert
          message="How to Test"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Configure VAT settings in admin panel at <code>/admin/settings</code></li>
              <li>Enable VAT and set a rate (e.g., 16%)</li>
              <li>Type a net amount below - VAT will be calculated automatically</li>
              <li>When VAT is enabled, the VAT input field is disabled and shows auto-calculated value</li>
              <li>Toggle between Auto/Manual VAT entry using the switch</li>
              <li>When VAT is disabled in settings, you can manually enter VAT amounts</li>
            </ul>
          }
          type="info"
          showIcon
        />

        {/* Auto VAT Form */}
        <AutoVATForm onSubmit={handleFormSubmit} />

        {/* Additional Information */}
        <Card title="Key Features" size="small">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong>✅ Auto VAT Calculation:</Text>
              <Text> VAT is automatically calculated when you type the net amount</Text>
            </div>
            <div>
              <Text strong>✅ Hidden VAT Input:</Text>
              <Text> When VAT is enabled, the VAT input field is disabled and shows auto-calculated value</Text>
            </div>
            <div>
              <Text strong>✅ Manual Override:</Text>
              <Text> Switch to manual VAT entry when needed (even when VAT is enabled)</Text>
            </div>
            <div>
              <Text strong>✅ Real-time Updates:</Text>
              <Text> Gross amount updates automatically as you type</Text>
            </div>
            <div>
              <Text strong>✅ Settings Integration:</Text>
              <Text> Automatically uses VAT rate and mode from admin settings</Text>
            </div>
          </Space>
        </Card>

      </Space>
    </div>
  );
};

export default VATTestPage;
