import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { HomeOutlined, BarChartOutlined, DollarOutlined } from '@ant-design/icons';
import { PropertyAnalysis } from '../types';
import { formatCurrency } from '../../../utils/formatters';

interface SalesAnalysisSummaryProps {
  salesAnalysisData: PropertyAnalysis[];
}

const SalesAnalysisSummary: React.FC<SalesAnalysisSummaryProps> = ({ salesAnalysisData }) => {
  // Calculate totals
  const totalProperties = salesAnalysisData.length;
  const totalSales = salesAnalysisData.reduce((total, property) => total + property.salesCount, 0);
  const totalSalesValue = salesAnalysisData.reduce((total, property) => total + property.totalValue, 0);

  return (
    <Row gutter={16} className="summary-cards">
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Total Properties"
            value={totalProperties}
            prefix={<HomeOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Total Sales"
            value={totalSales}
            prefix={<BarChartOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={12}>
        <Card>
          <Statistic
            title="Total Sales Value"
            value={formatCurrency(totalSalesValue)}
            prefix={<DollarOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default SalesAnalysisSummary;
