import React from 'react';
import { Modal, Table, Card, Row, Col, Statistic, Typography, Tag, Space, Button, Divider, Spin } from 'antd';
import { DollarOutlined, PercentageOutlined, FileTextOutlined, PrinterOutlined } from '@ant-design/icons';
import { useAppSelector } from "../../store";

const { Title, Text } = Typography;

interface VATReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: any;
  endDate: any;
}

const VATReportModal: React.FC<VATReportProps> = ({
  openM,
  onCloseM,
  startDate,
  endDate,
}) => {
  const { vatReport: data, loading: vatReportLoading } = useAppSelector((state: any) => state.Report);

  const { summary, vat_by_type, pricing_modes, daily_trends, vat_configuration, period_info } = data || {};

  const handlePrint = () => {
    const printContent = document.getElementById('vat-receipt');
    if (printContent) {
      const printWindow = window.open('', '');
      printWindow.document.write(`
        <html>
          <head>
            <title>VAT Summary Report</title>
            <style>
              body { font-family: 'Courier New', monospace; margin: 20px; }
              .receipt-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
              .receipt-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
              .receipt-period { font-size: 12px; margin-bottom: 15px; }
              .receipt-section { margin-bottom: 20px; }
              .receipt-line { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
              .receipt-total { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; }
              .receipt-footer { text-align: center; margin-top: 30px; font-size: 10px; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Thermal Receipt Style Component
  const ThermalReceipt = () => (
    <div id="vat-receipt" style={{ fontFamily: 'Courier New, monospace', width: '300px', margin: '0 auto' }}>
      {/* Receipt Header */}
      <div className="receipt-header" style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: '10px', marginBottom: '20px' }}>
        <div className="receipt-title" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
          VAT SUMMARY REPORT
        </div>
        <div className="receipt-period" style={{ fontSize: '12px', marginBottom: '15px' }}>
          {startDate} to {endDate}
        </div>
      </div>

      {/* VAT Configuration */}
      <div className="receipt-section" style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
          VAT CONFIGURATION
        </div>
        <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
          <span>VAT Enabled:</span>
          <span>{vat_configuration?.vat_enabled ? 'YES' : 'NO'}</span>
        </div>
        <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
          <span>Pricing Mode:</span>
          <span>{vat_configuration?.vat_mode || 'N/A'}</span>
        </div>
        <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
          <span>Standard Rate:</span>
          <span>{((vat_configuration?.standard_rate || 0) * 100).toFixed(2)}%</span>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="receipt-section" style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
          SUMMARY STATISTICS
        </div>
        <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
          <span>Total VAT Collected:</span>
          <span>KES {summary?.totalVAT?.toLocaleString() || '0.00'}</span>
        </div>
        <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
          <span>Total Revenue:</span>
          <span>KES {summary?.totalRevenue?.toLocaleString() || '0.00'}</span>
        </div>
        <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
          <span>Total Subtotal:</span>
          <span>KES {summary?.totalSubtotal?.toLocaleString() || '0.00'}</span>
        </div>
        <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
          <span>Total Discount:</span>
          <span>KES {summary?.totalDiscount?.toLocaleString() || '0.00'}</span>
        </div>
        <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
          <span>Invoice Count:</span>
          <span>{summary?.invoiceCount || 0}</span>
        </div>
        <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
          <span>Avg VAT per Invoice:</span>
          <span>KES {summary?.averageVATPerInvoice?.toLocaleString() || '0.00'}</span>
        </div>
        <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
          <span>VAT % of Revenue:</span>
          <span>{summary?.vatAsPercentageOfRevenue || 0}%</span>
        </div>
      </div>

      {/* VAT by Type */}
      {vat_by_type?.length > 0 && (
        <div className="receipt-section" style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
            VAT BREAKDOWN BY TYPE
          </div>
          {vat_by_type.map((item: any, index: number) => (
            <div key={index}>
              <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                <span>{item.vatType}:</span>
                <span>KES {item.totalVAT?.toLocaleString() || '0.00'}</span>
              </div>
              <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                <span>  Invoices:</span>
                <span>{item.invoiceCount || 0}</span>
              </div>
              <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px' }}>
                <span>  Rate:</span>
                <span>{((item.vatRate || 0) * 100).toFixed(2)}%</span>
              </div>
              {index < vat_by_type.length - 1 && <Divider style={{ margin: '10px 0' }} />}
            </div>
          ))}
        </div>
      )}

      {/* Pricing Modes */}
      {Object.keys(pricing_modes || {}).length > 0 && (
        <div className="receipt-section" style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
            VAT BY PRICING MODE
          </div>
          {Object.entries(pricing_modes).map(([key, value]: [string, any], index: number) => (
            <div key={key}>
              <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                <span>{key}:</span>
                <span>KES {value.totalVAT?.toLocaleString() || '0.00'}</span>
              </div>
              <div className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px' }}>
                <span>  Invoices:</span>
                <span>{value.invoiceCount || 0}</span>
              </div>
              {index < Object.keys(pricing_modes).length - 1 && <Divider style={{ margin: '10px 0' }} />}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="receipt-footer" style={{ textAlign: 'center', marginTop: '30px', fontSize: '10px' }}>
        <div>Completed Orders: {period_info?.completed_orders_count || 0}</div>
        <div>Generated on: {new Date().toLocaleString()}</div>
        <div>================================</div>
      </div>
    </div>
  );

  if(vatReportLoading) {
    return <Spin size="large"  fullscreen />
  }

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined style={{ color: '#52c41a' }} />
          VAT Summary Report
        </Space>
      }
      open={openM}
      onCancel={onCloseM}
      width={400}
      footer={
        <div style={{ textAlign: 'center', paddingTop: '10px' }}>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            style={{ width: '100%' }}
          >
            Print Receipt
          </Button>
        </div>
      }
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <ThermalReceipt />
      </div>
    </Modal>
  );
};

export default VATReportModal;