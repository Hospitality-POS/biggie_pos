/**
 * VAT Form Example Component
 * 
 * This component demonstrates how to integrate VAT calculations into forms
 * for automatic VAT calculation during submission.
 */

import React, { useState, useEffect } from 'react';
import { InputNumber, Button, Card, Space, Typography, Alert, Divider, Input } from 'antd';
import { useVAT } from '@hooks/useVAT';
import VATDisplay from './VATDisplay';
import { VATCalculationResult } from '@utils/vat';

const { Title, Text } = Typography;

interface FormItem {
  id: string;
  name: string;
  amount: number;
  quantity: number;
}

interface VATFormExampleProps {
  onSubmit?: (data: {
    items: FormItem[];
    vatCalculation: VATCalculationResult;
    total: number;
  }) => void;
}

/**
 * Example component showing VAT integration in forms
 */
const VATFormExample: React.FC<VATFormExampleProps> = ({ onSubmit }) => {
  const { vatConfig, calculateTotalVAT, isLoading, error } = useVAT();
  const [items, setItems] = useState<FormItem[]>([
    { id: '1', name: 'Item 1', amount: 100, quantity: 1 },
  ]);
  const [vatCalculation, setVatCalculation] = useState<VATCalculationResult | null>(null);

  // Calculate VAT whenever items or VAT config changes
  useEffect(() => {
    if (items.length > 0 && !isLoading && vatConfig.is_vat_enabled) {
      const calculation = calculateTotalVAT(items);
      setVatCalculation(calculation);
    } else if (!vatConfig.is_vat_enabled) {
      // If VAT is disabled, just calculate simple total
      const total = items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
      setVatCalculation({
        amount: total,
        vat_amount: 0,
        total_amount: total,
        vat_rate: 0,
        pricing_mode: vatConfig.vat_pricing_mode,
        is_vat_enabled: false,
      });
    }
  }, [items, vatConfig, calculateTotalVAT, isLoading]);

  const addItem = () => {
    const newId = (items.length + 1).toString();
    setItems([...items, { id: newId, name: `Item ${newId}`, amount: 0, quantity: 1 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof FormItem, value: number | string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = () => {
    if (onSubmit && vatCalculation) {
      onSubmit({
        items,
        vatCalculation,
        total: vatCalculation.total_amount,
      });
    }
  };

  if (isLoading) {
    return <Alert message="Loading VAT configuration..." type="info" />;
  }

  if (error) {
    return <Alert message={`Error loading VAT configuration: ${error}`} type="error" />;
  }

  return (
    <Card title="VAT Calculation Example" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* VAT Configuration Status */}
        <Alert
          message={`VAT Status: ${vatConfig.is_vat_enabled ? 'Enabled' : 'Disabled'}`}
          description={
            vatConfig.is_vat_enabled
              ? `Rate: ${vatConfig.vat_standard_rate}% | Mode: ${vatConfig.vat_pricing_mode}`
              : 'VAT calculations are disabled in settings'
          }
          type={vatConfig.is_vat_enabled ? 'success' : 'info'}
          showIcon
        />

        {/* Form Items */}
        <div>
          <Title level={5}>Items</Title>
          {items.map((item, index) => (
            <Card key={item.id} size="small" style={{ marginBottom: 8 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <Text strong>Item {index + 1}</Text>
                  {items.length > 1 && (
                    <Button 
                      type="text" 
                      danger 
                      size="small"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Text type="secondary">Description</Text>
                    <Input
                      placeholder="Item description"
                      value={item.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(item.id, 'name', e.target.value)}
                    />
                  </div>
                  <div style={{ width: 120 }}>
                    <Text type="secondary">Amount</Text>
                    <InputNumber
                      placeholder="0.00"
                      value={item.amount}
                      onChange={(value) => updateItem(item.id, 'amount', value || 0)}
                      style={{ width: '100%' }}
                      min={0}
                      precision={2}
                    />
                  </div>
                  <div style={{ width: 80 }}>
                    <Text type="secondary">Qty</Text>
                    <InputNumber
                      placeholder="1"
                      value={item.quantity}
                      onChange={(value) => updateItem(item.id, 'quantity', value || 1)}
                      style={{ width: '100%' }}
                      min={1}
                      precision={0}
                    />
                  </div>
                  <div style={{ width: 120 }}>
                    <Text type="secondary">Total</Text>
                    <div style={{ paddingTop: 4 }}>
                      <Text strong>
                        {((item.amount || 0) * (item.quantity || 1)).toLocaleString('en-KE', {
                          style: 'currency',
                          currency: 'KES',
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </div>
                  </div>
                </div>
              </Space>
            </Card>
          ))}
          <Button type="dashed" onClick={addItem} style={{ width: '100%' }}>
            Add Item
          </Button>
        </div>

        <Divider />

        {/* VAT Calculation Display */}
        {vatCalculation && (
          <VATDisplay
            calculation={vatCalculation}
            currency="KES"
            showDetails={true}
            compact={false}
          />
        )}

        {/* Submit Button */}
        <div style={{ textAlign: 'right' }}>
          <Button 
            type="primary" 
            size="large"
            onClick={handleSubmit}
            disabled={!vatCalculation || items.some(item => !item.amount || item.amount <= 0)}
          >
            Submit with VAT Calculation
          </Button>
        </div>
      </Space>
    </Card>
  );
};

export default VATFormExample;
