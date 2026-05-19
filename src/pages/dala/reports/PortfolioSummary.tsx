import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { HomeOutlined, BarChartOutlined, DollarOutlined } from '@ant-design/icons';
import { PortfolioProperty } from '../types';
import { formatCurrency } from '../../../utils/formatters';

interface PortfolioSummaryProps {
  portfolioProgressData: PortfolioProperty[];
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ portfolioProgressData }) => {
  // Calculate totals
  const totalProperties = portfolioProgressData.length;
  const totalUnits = portfolioProgressData.reduce((total, property) => total + property.totalUnits, 0);
  const unitsSold = portfolioProgressData.reduce((total, property) => total + property.soldUnits, 0);
  const totalPortfolioValue = portfolioProgressData.reduce((total, property) => total + property.totalValue, 0);

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
            title="Total Units"
            value={totalUnits}
            prefix={<HomeOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Units Sold"
            value={unitsSold}
            valueStyle={{ color: '#3f8600' }}
            prefix={<BarChartOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Total Portfolio Value"
            value={formatCurrency(totalPortfolioValue)}
            prefix={<DollarOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default PortfolioSummary;
