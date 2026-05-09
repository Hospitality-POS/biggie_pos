/**
 * Auto VAT Calculation Form Component
 * 
 * This component demonstrates auto VAT calculation when typing net amount.
 * When VAT is enabled, the VAT input field is hidden and VAT is calculated automatically.
 * When VAT is disabled, the VAT input field is shown for manual entry.
 */

import React, { useState, useEffect } from 'react';
import { 
  Form, 
  InputNumber, 
  Input, 
  Button, 
  Card, 
  Space, 
  Typography, 
  Alert, 
  Divider,
  Row,
  Col,
  Switch
} from 'antd';
import { useVAT } from '@hooks/useVAT';
import VATDisplay from './VATDisplay';

const { Text } = Typography;

interface AutoVATFormProps {
  onSubmit?: (data: {
    net_amount: number;
    vat_amount: number;
    gross_amount: number;
    description: string;
    vat_enabled: boolean;
  }) => void;
}

/**
 * Form component with auto VAT calculation
 */
const AutoVATForm: React.FC<AutoVATFormProps> = ({ onSubmit }) => {
  const { vatConfig, calculateVAT, isLoading, error } = useVAT();
  const [form] = Form.useForm();
  
  // Form states
  const [netAmount, setNetAmount] = useState<number>(0);
  const [vatAmount, setVatAmount] = useState<number>(0);
  const [grossAmount, setGrossAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [manualVATEnabled, setManualVATEnabled] = useState<boolean>(false);

  // Auto-calculate VAT when net amount changes and VAT is enabled
  useEffect(() => {
    if (vatConfig.is_vat_enabled && !manualVATEnabled) {
      const calculation = calculateVAT(netAmount);
      setVatAmount(calculation.vat_amount);
      setGrossAmount(calculation.total_amount);
    } else if (!vatConfig.is_vat_enabled || manualVATEnabled) {
      // When VAT is disabled or manual mode, calculate gross from net + VAT
      setGrossAmount(netAmount + vatAmount);
    }
  }, [netAmount, vatAmount, vatConfig, calculateVAT, manualVATEnabled]);

  // Handle net amount change
  const handleNetAmountChange = (value: number | null) => {
    const amount = value || 0;
    setNetAmount(amount);
  };

  // Handle VAT amount change (only when VAT is disabled or manual mode)
  const handleVATAmountChange = (value: number | null) => {
    const amount = value || 0;
    setVatAmount(amount);
  };

  // Handle form submission
  const handleSubmit = () => {
    const formData = {
      net_amount: netAmount,
      vat_amount: vatAmount,
      gross_amount: grossAmount,
      description,
      vat_enabled: vatConfig.is_vat_enabled && !manualVATEnabled,
    };

    if (onSubmit) {
      onSubmit(formData);
    } else {
      console.log('Form submitted:', formData);
    }
  };

  // Reset form
  const handleReset = () => {
    form.resetFields();
    setNetAmount(0);
    setVatAmount(0);
    setGrossAmount(0);
    setDescription('');
    setManualVATEnabled(false);
  };

  if (isLoading) {
    return <Alert message="Loading VAT configuration..." type="info" />;
  }

  if (error) {
    return <Alert message={`Error loading VAT configuration: ${error}`} type="error" />;
  }

  return (
    <Card title="Auto VAT Calculation Form" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* VAT Configuration Status */}
        <Alert
          message={
            <Space>
              <Text>VAT Status: {vatConfig.is_vat_enabled ? 'Enabled' : 'Disabled'}</Text>
              {vatConfig.is_vat_enabled && (
                <Switch
                  size="small"
                  checked={!manualVATEnabled}
                  onChange={(checked) => setManualVATEnabled(!checked)}
                  checkedChildren="Auto"
                  unCheckedChildren="Manual"
                />
              )}
            </Space>
          }
          description={
            vatConfig.is_vat_enabled
              ? `Rate: ${vatConfig.vat_standard_rate}% | Mode: ${vatConfig.vat_pricing_mode} | ${manualVATEnabled ? 'Manual VAT Entry' : 'Auto VAT Calculation'}`
              : 'VAT is disabled - manual VAT entry available'
          }
          type={vatConfig.is_vat_enabled ? 'success' : 'info'}
          showIcon
        />

        {/* Form Fields */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Description">
                <Input
                  placeholder="Enter description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={false}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item 
                label={
                  <Space>
                    <Text>Net Amount</Text>
                    {vatConfig.is_vat_enabled && !manualVATEnabled && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        (VAT will be auto-calculated)
                      </Text>
                    )}
                  </Space>
                }
              >
                <InputNumber
                  placeholder="0.00"
                  value={netAmount}
                  onChange={handleNetAmountChange}
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  disabled={false}
                  formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  parser={(value) => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
                  addonBefore="KES"
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item 
                label={
                  <Space>
                    <Text>VAT Amount</Text>
                    {vatConfig.is_vat_enabled && !manualVATEnabled && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        (Auto-calculated)
                      </Text>
                    )}
                  </Space>
                }
                help={
                  vatConfig.is_vat_enabled && !manualVATEnabled
                    ? `VAT (${vatConfig.vat_standard_rate}%) calculated automatically`
                    : vatConfig.is_vat_enabled
                    ? 'Manual VAT entry enabled'
                    : 'Enter VAT amount manually'
                }
              >
                <InputNumber
                  placeholder="0.00"
                  value={vatAmount}
                  onChange={handleVATAmountChange}
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  disabled={false}
                  formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  parser={(value) => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
                  addonBefore="KES"
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item label="Gross Amount">
                <InputNumber
                  placeholder="0.00"
                  value={grossAmount}
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  disabled
                  formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  parser={(value) => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
                  addonBefore="KES"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* VAT Display Summary */}
          {(netAmount > 0 || vatAmount > 0) && (
            <VATDisplay
              calculation={{
                amount: netAmount,
                vat_amount: vatAmount,
                total_amount: grossAmount,
                vat_rate: vatConfig.vat_standard_rate,
                pricing_mode: vatConfig.vat_pricing_mode,
                is_vat_enabled: vatConfig.is_vat_enabled && !manualVATEnabled,
              }}
              currency="KES"
              showDetails={true}
              compact={true}
            />
          )}

          {/* Form Actions */}
          <Row justify="end" gutter={8}>
            <Col>
              <Button onClick={handleReset}>Reset</Button>
            </Col>
            <Col>
              <Button 
                type="primary" 
                htmlType="submit"
                disabled={netAmount <= 0}
              >
                Submit
              </Button>
            </Col>
          </Row>
        </Form>
      </Space>
    </Card>
  );
};

export default AutoVATForm;
