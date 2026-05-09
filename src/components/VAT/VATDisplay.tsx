/**
 * VAT Display Component
 * 
 * This component displays VAT calculations in a clean, formatted way
 * that can be easily integrated into forms and submission pages.
 */

import React from 'react';
import { Card, Typography, Space, Divider } from 'antd';
import { VATCalculationResult, getVATSummary } from '@utils/vat';

const { Text, Title } = Typography;

interface VATDisplayProps {
  calculation: VATCalculationResult;
  currency?: string;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Component to display VAT calculation results
 */
const VATDisplay: React.FC<VATDisplayProps> = ({
  calculation,
  currency = 'KES',
  showDetails = true,
  compact = false,
}) => {
  const summary = getVATSummary(calculation, currency);

  if (!calculation.is_vat_enabled) {
    return (
      <Card size={compact ? 'small' : 'default'} style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary">VAT is disabled</Text>
          <Text strong>{summary.total_amount}</Text>
        </Space>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">Subtotal:</Text>
            <Text>{summary.base_amount}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">VAT ({summary.vat_rate}):</Text>
            <Text>{summary.vat_amount}</Text>
          </div>
          <Divider style={{ margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text strong>Total:</Text>
            <Text strong style={{ color: '#1890ff' }}>{summary.total_amount}</Text>
          </div>
        </Space>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            VAT Summary
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({summary.pricing_mode === 'INCLUSIVE' ? 'Tax Inclusive' : 'Tax Exclusive'})
          </Text>
        </Space>
      }
      size="default" 
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {showDetails && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Subtotal:</Text>
              <Text>{summary.base_amount}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">VAT Rate:</Text>
              <Text>{summary.vat_rate}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">VAT Amount:</Text>
              <Text style={{ color: '#52c41a' }}>{summary.vat_amount}</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ fontSize: 16 }}>Total Amount:</Text>
          <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
            {summary.total_amount}
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default VATDisplay;
