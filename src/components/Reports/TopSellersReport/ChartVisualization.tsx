import React from 'react';
import { Card, Row, Col, Empty, Spin } from 'antd';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { formatCurrency, formatNumber } from '../../../utils/formatters';

interface ChartVisualizationProps {
  data: any[];
  summary?: any;
  loading?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ChartVisualization: React.FC<ChartVisualizationProps> = ({ 
  data, 
  summary, 
  loading = false 
}) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Empty 
        description="No data available for the selected filters"
        style={{ padding: '50px' }}
      />
    );
  }

  // Prepare data for charts
  const revenueData = data.slice(0, 10).map(item => ({
    name: item.item_details?.name || 'Unknown',
    revenue: item.sales_metrics?.total_revenue || 0,
    quantity: item.sales_metrics?.total_quantity || 0,
    profit: item.financial_metrics?.profit || 0,
  }));

  const categoryData = data.reduce((acc: any[], item) => {
    const category = item.item_details?.category || 'Unknown';
    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.value += item.sales_metrics?.total_revenue || 0;
      existing.quantity += item.sales_metrics?.total_quantity || 0;
    } else {
      acc.push({
        name: category,
        value: item.sales_metrics?.total_revenue || 0,
        quantity: item.sales_metrics?.total_quantity || 0,
      });
    }
    return acc;
  }, []);

  const profitMarginData = data.slice(0, 10).map(item => ({
    name: item.item_details?.name || 'Unknown',
    margin: item.financial_metrics?.profit_margin || 0,
    profit: item.financial_metrics?.profit || 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color }}>
              {entry.name}: {entry.name.includes('Revenue') || entry.name.includes('Profit') 
                ? formatCurrency(entry.value) 
                : entry.name.includes('Margin')
                ? `${entry.value.toFixed(1)}%`
                : formatNumber(entry.value)
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* Revenue Bar Chart */}
        <Col xs={24} lg={12}>
          <Card 
            title="Top 10 Items by Revenue" 
            size="small"
            style={{ height: '400px' }}
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Category Pie Chart */}
        <Col xs={24} lg={12}>
          <Card 
            title="Revenue by Category" 
            size="small"
            style={{ height: '400px' }}
          >
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  content={<CustomTooltip />}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Quantity vs Revenue Chart */}
        <Col xs={24} lg={12}>
          <Card 
            title="Quantity vs Revenue Analysis" 
            size="small"
            style={{ height: '400px' }}
          >
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={12}
                />
                <YAxis yAxisId="left" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="quantity" 
                  stackId="1"
                  stroke="#52c41a" 
                  fill="#52c41a" 
                  fillOpacity={0.6}
                />
                <Area 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="revenue" 
                  stackId="2"
                  stroke="#1890ff" 
                  fill="#1890ff" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Profit Margin Chart */}
        <Col xs={24} lg={12}>
          <Card 
            title="Profit Margin Analysis" 
            size="small"
            style={{ height: '400px' }}
          >
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={profitMarginData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="margin" 
                  stroke="#722ed1" 
                  strokeWidth={2}
                  dot={{ fill: '#722ed1', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ChartVisualization;
