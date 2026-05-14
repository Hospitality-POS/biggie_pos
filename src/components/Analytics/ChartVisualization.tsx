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
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Legend
} from 'recharts';
import { formatCurrency, formatNumber } from '../../utils/formatters';

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

  // Prepare data for charts with better structure
  const topItems = data.slice(0, 8).map((item, index) => ({
    name: item.item_details?.name?.substring(0, 20) || 'Unknown',
    fullName: item.item_details?.name || 'Unknown',
    revenue: item.sales_metrics?.total_revenue || 0,
    quantity: item.sales_metrics?.total_quantity || 0,
    profit: item.financial_metrics?.profit || 0,
    margin: item.financial_metrics?.profit_margin || 0,
    rank: index + 1
  }));

  const categoryData = data.reduce((acc: any[], item) => {
    const category = item.item_details?.category || 'Unknown';
    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.revenue += item.sales_metrics?.total_revenue || 0;
      existing.quantity += item.sales_metrics?.total_quantity || 0;
      existing.count += 1;
    } else {
      acc.push({
        name: category,
        revenue: item.sales_metrics?.total_revenue || 0,
        quantity: item.sales_metrics?.total_quantity || 0,
        count: 1
      });
    }
    return acc;
  }, []);

  // Performance trend data (simulated for visualization)
  const trendData = topItems.map((item, index) => ({
    name: item.name,
    revenue: item.revenue,
    quantity: item.quantity,
    trend: item.revenue * (0.8 + Math.random() * 0.4) // Simulated trend
  }));

  // Radar data for top 5 items
  const radarData = topItems.slice(0, 5).map(item => ({
    item: item.name,
    revenue: Math.min((item.revenue / Math.max(...topItems.map(d => d.revenue))) * 100, 100),
    quantity: Math.min((item.quantity / Math.max(...topItems.map(d => d.quantity))) * 100, 100),
    profit: item.profit > 0 ? Math.min((item.profit / Math.max(...topItems.map(d => d.profit))) * 100, 100) : 0,
    margin: item.margin
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(10px)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#262626' }}>
            {payload[0]?.payload?.fullName || label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ 
              margin: '4px 0', 
              color: entry.color,
              fontSize: '12px'
            }}>
              <span style={{ fontWeight: 500 }}>{entry.name}:</span>{' '}
              {entry.name.includes('Revenue') || entry.name.includes('Profit') || entry.name.includes('trend')
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

  // Check if profits are 0 to hide profit-related analysis
  const hasProfitData = (summary?.total_profit || 0) > 0;

  return (
    <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px' }}>
      <Row gutter={[20, 20]}>
        {/* Modern Line Chart - Revenue Trend */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 4,
                  height: 20,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 2
                }} />
                <span style={{ fontWeight: 600, color: '#262626' }}>Revenue Performance Trend</span>
              </div>
            }
            size="small"
            style={{ 
              height: '380px',
              border: '1px solid #f0f0f0',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#8c8c8c' }}
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                />
                <YAxis tick={{ fontSize: 11, fill: '#8c8c8c' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="url(#revenueGradient)"
                  strokeWidth={3}
                  dot={{ fill: '#667eea', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="trend" 
                  stroke="#ff6b6b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Modern Area Chart - Quantity vs Revenue */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 4,
                  height: 20,
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  borderRadius: 2
                }} />
                <span style={{ fontWeight: 600, color: '#262626' }}>Sales Volume Analysis</span>
              </div>
            }
            size="small"
            style={{ 
              height: '380px',
              border: '1px solid #f0f0f0',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={topItems}>
                <defs>
                  <linearGradient id="quantityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4facfe" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4facfe" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="revenueGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#43e97b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#43e97b" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#8c8c8c' }}
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#8c8c8c' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#8c8c8c' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="quantity" 
                  stroke="#4facfe"
                  fill="url(#quantityGradient)"
                  strokeWidth={2}
                />
                <Area 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#43e97b"
                  fill="url(#revenueGradient2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Radar Chart - Multi-dimensional Analysis */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 4,
                  height: 20,
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  borderRadius: 2
                }} />
                <span style={{ fontWeight: 600, color: '#262626' }}>Performance Radar</span>
              </div>
            }
            size="small"
            style={{ 
              height: '380px',
              border: '1px solid #f0f0f0',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e0e0e0" />
                <PolarAngleAxis dataKey="item" tick={{ fontSize: 11, fill: '#8c8c8c' }} />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={{ fontSize: 10, fill: '#8c8c8c' }}
                />
                <Radar 
                  name="Revenue" 
                  dataKey="revenue" 
                  stroke="#667eea" 
                  fill="#667eea" 
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
                <Radar 
                  name="Quantity" 
                  dataKey="quantity" 
                  stroke="#f093fb" 
                  fill="#f093fb" 
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
                {hasProfitData && (
                  <Radar 
                    name="Profit" 
                    dataKey="profit" 
                    stroke="#43e97b" 
                    fill="#43e97b" 
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                )}
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Modern Donut Chart - Category Distribution */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 4,
                  height: 20,
                  background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                  borderRadius: 2
                }} />
                <span style={{ fontWeight: 600, color: '#262626' }}>Category Distribution</span>
              </div>
            }
            size="small"
            style={{ 
              height: '380px',
              border: '1px solid #f0f0f0',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="revenue"
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
      </Row>
    </div>
  );
};

export default ChartVisualization;
