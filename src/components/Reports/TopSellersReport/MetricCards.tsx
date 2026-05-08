import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { 
  DollarOutlined, 
  ShoppingCartOutlined, 
  RiseOutlined, 
  TagsOutlined,
  PercentageOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { formatCurrency, formatNumber } from '../../../utils/formatters';

interface MetricCardsProps {
  summary?: {
    total_revenue?: number;
    total_quantity?: number;
    total_profit?: number;
    total_items?: number;
    avg_profit_margin?: number;
    period?: {
      days?: number;
    };
  };
}

const MetricCards: React.FC<MetricCardsProps> = ({ summary }) => {
  if (!summary) return null;

  const cards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(summary.total_revenue || 0),
      icon: <DollarOutlined />,
      color: '#1890ff',
      bgColor: '#f0f5ff',
    },
    {
      title: 'Total Quantity',
      value: formatNumber(summary.total_quantity || 0),
      icon: <ShoppingCartOutlined />,
      color: '#52c41a',
      bgColor: '#f6ffed',
    },
    {
      title: 'Total Profit',
      value: formatCurrency(summary.total_profit || 0),
      icon: <RiseOutlined />,
      color: (summary.total_profit || 0) >= 0 ? '#52c41a' : '#ff4d4f',
      bgColor: (summary.total_profit || 0) >= 0 ? '#f6ffed' : '#fff1f0',
    },
    {
      title: 'Items Analyzed',
      value: summary.total_items || 0,
      icon: <TagsOutlined />,
      color: '#722ed1',
      bgColor: '#f9f0ff',
    },
    {
      title: 'Avg Profit Margin',
      value: `${(summary.avg_profit_margin || 0).toFixed(1)}%`,
      icon: <PercentageOutlined />,
      color: (summary.avg_profit_margin || 0) >= 15 ? '#52c41a' : 
             (summary.avg_profit_margin || 0) >= 10 ? '#faad14' : '#ff4d4f',
      bgColor: (summary.avg_profit_margin || 0) >= 15 ? '#f6ffed' : 
                (summary.avg_profit_margin || 0) >= 10 ? '#fffbe6' : '#fff1f0',
    },
    {
      title: 'Period',
      value: `${summary.period?.days || 0} days`,
      icon: <CalendarOutlined />,
      color: '#8c8c8c',
      bgColor: '#f5f5f5',
    }
  ];

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {cards.map((card, index) => (
        <Col xs={24} sm={12} md={8} lg={6} xl={4} key={index}>
          <Card
            size="small"
            style={{
              backgroundColor: card.bgColor,
              border: `1px solid ${card.color}20`,
              borderRadius: 8,
            }}
          >
            <Statistic
              title={
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  color: '#595959',
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  <span style={{ color: card.color }}>{card.icon}</span>
                  {card.title}
                </div>
              }
              value={card.value}
              valueStyle={{
                color: card.color,
                fontSize: 18,
                fontWeight: 600,
              }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default MetricCards;
