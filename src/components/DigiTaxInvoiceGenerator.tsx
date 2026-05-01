import React, { useState, useEffect } from 'react';
import { Switch, Alert, Tag, Tooltip, Space } from 'antd';
import { SafetyCertificateOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { checkDigiTaxService, getShopDigiTaxSettings, generateTaxInvoice } from '../services/accounting/digiTax';

export interface DigiTaxData {
  success: boolean;
  useDigiTax: boolean;
  testMode?: boolean;
  taxReceiptNumber?: string;
  qrCode?: string;
  invoiceUrl?: string | null;
  generatedAt?: string;
  error?: string;
  testFallback?: any;
}

interface DigiTaxInvoiceGeneratorProps {
  invoiceId?: string;
  orderNo?: string;
  onDigiTaxChange?: (enabled: boolean) => void;
  onDigiTaxData?: (data: DigiTaxData) => void;
  disabled?: boolean;
}

const DigiTaxInvoiceGenerator: React.FC<DigiTaxInvoiceGeneratorProps> = ({
  invoiceId,
  orderNo,
  onDigiTaxChange,
  onDigiTaxData,
  disabled = false
}) => {
  const [digiTaxConfig, setDigiTaxConfig] = useState<any>(null);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [useDigiTax, setUseDigiTax] = useState(false);
  const [loading, setLoading] = useState(false);
  const [digiTaxData, setDigiTaxData] = useState<DigiTaxData | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [config, settings] = await Promise.all([
          checkDigiTaxService(),
          getShopDigiTaxSettings()
        ]);
        
        setDigiTaxConfig(config);
        setShopSettings(settings);
        
        // For beta testing, allow ETR to be enabled but default to OFF
        // Users must manually enable it
        const canUse = config.canUse && settings.canUse;
        const defaultEnabled = false; // Default to OFF
        setUseDigiTax(defaultEnabled);
        onDigiTaxChange?.(defaultEnabled);
      } catch (error) {
        console.error('Failed to load DigiTax configuration:', error);
      }
    };
    
    loadConfig();
  }, [onDigiTaxChange]);

  const handleGenerateTaxInvoice = async () => {
    if (!invoiceId && !orderNo) {
      console.error('No invoice ID or order number provided');
      return;
    }

    setLoading(true);
    try {
      const result = await generateTaxInvoice(invoiceId || orderNo || '', useDigiTax);
      setDigiTaxData(result);
      onDigiTaxData?.(result);
      
      if (result.success) {
        console.log('Tax invoice generated successfully:', result);
      } else {
        console.error('Failed to generate tax invoice:', result.error);
      }
    } catch (error) {
      console.error('Error generating tax invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDigiTax = (enabled: boolean) => {
    setUseDigiTax(enabled);
    onDigiTaxChange?.(enabled);
    
    // Auto-generate tax invoice when enabled
    if (enabled && (invoiceId || orderNo)) {
      handleGenerateTaxInvoice();
    }
  };

  if (!digiTaxConfig || !shopSettings) {
    return (
      <div style={{ padding: '8px 0' }}>
        <Alert
          message="Loading DigiTax configuration..."
          type="info"
          showIcon
          size="small"
        />
      </div>
    );
  }

  // For beta testing, allow ETR to be enabled even if service shows as disabled
  const canUseDigiTax = !disabled; // Beta mode: allow enabling regardless of service status

  return (
    <div style={{ padding: '8px 0' }}>
      {/* DigiTax Toggle */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8,
        marginBottom: 8
      }}>
        <Tooltip title={canUseDigiTax ? "Enable Electronic Tax Receipt (ETR)" : "DigiTax not available"}>
          <Space>
            <SafetyCertificateOutlined 
              style={{ 
                color: canUseDigiTax ? '#52c41a' : '#d9d9d9',
                fontSize: 16
              }} 
            />
            <span style={{ fontSize: 13, color: '#374151' }}>
              Use ETR (Electronic Tax Receipt)
            </span>
            <Switch
              checked={useDigiTax}
              onChange={handleToggleDigiTax}
              disabled={!canUseDigiTax}
              size="small"
              style={{ 
                backgroundColor: useDigiTax && canUseDigiTax ? '#52c41a' : undefined 
              }}
            />
          </Space>
        </Tooltip>
        
              </div>

      {/* Status Messages */}
      {!canUseDigiTax && (
        <Alert
          message={
            digiTaxConfig.enabled && !digiTaxConfig.available
              ? "DigiTax service unavailable"
              : !digiTaxConfig.enabled
              ? "DigiTax service disabled"
              : !shopSettings.canUse
              ? "DigiTax not enabled for this shop"
              : "DigiTax not available"
          }
          type="warning"
          showIcon
          size="small"
          style={{ marginBottom: 8 }}
        />
      )}

      
      {/* DigiTax Data Display */}
      {digiTaxData && useDigiTax && digiTaxData.success && (
        <div style={{ 
          background: '#f6ffed', 
          border: '1px solid #b7eb8f', 
          borderRadius: 6, 
          padding: '8px 12px',
          marginTop: 8
        }}>
          <div style={{ fontSize: 12, color: '#52c41a', marginBottom: 4 }}>
            <strong>ETR Generated Successfully</strong>
          </div>
          {digiTaxData.taxReceiptNumber && (
            <div style={{ fontSize: 11, color: '#389e0d' }}>
              Tax Receipt: {digiTaxData.taxReceiptNumber}
            </div>
          )}
          {digiTaxData.testMode && (
            <div style={{ fontSize: 11, color: '#d46b08', marginTop: 2 }}>
              * Test mode - not a valid tax document
            </div>
          )}
        </div>
      )}

      {digiTaxData && !digiTaxData.success && (
        <Alert
          message="ETR Generation Failed"
          description={digiTaxData.error || "Failed to generate electronic tax receipt"}
          type="error"
          showIcon
          size="small"
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
};

export default DigiTaxInvoiceGenerator;
