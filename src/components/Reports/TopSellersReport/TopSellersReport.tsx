import React, { useState, useMemo } from 'react';
import { ProCard } from '@ant-design/pro-components';
import { Typography, Tabs, Button, Space } from 'antd';
import { BarChartOutlined, TableOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useTopSellersReport } from '../../../hooks/useTopSellersReport';
import FiltersPanel from './FiltersPanel';
import MetricCards from './MetricCards';
import SellersTable from './SellersTable';
import ChartVisualization from './ChartVisualization';
import { getPermissionChecker } from '@utils/getPermissionChecker';

const { Title, Text } = Typography;

interface TopSellersReportProps {
  shopId?: string;
}

const TopSellersReport: React.FC<TopSellersReportProps> = ({ shopId }) => {
  const can = getPermissionChecker();
  const currentShopId = shopId || localStorage.getItem('shopId') || '';
  
  const [filters, setFilters] = useState({
    shop_id: currentShopId,
    start_date: '',
    end_date: '',
    category: '',
    sort_by: 'revenue',
    limit: 20
  });

  const [activeTab, setActiveTab] = useState('hierarchy');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { 
    data, 
    loading, 
    error, 
    refetch 
  } = useTopSellersReport(filters);

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleExport = () => {
    // Export functionality - to be implemented
    console.log('Export functionality to be implemented');
  };

  const handleRefresh = () => {
    refetch();
  };

  const tabItems = useMemo(() => [
    {
      key: 'hierarchy',
      label: (
        <Space>
          <TableOutlined />
          <span>Top Sellers Hierarchy</span>
        </Space>
      ),
      children: (
        <div>
          <MetricCards summary={data?.summary} />
          <SellersTable 
            sellers={data?.top_sellers || []}
            onItemSelect={setSelectedItem}
            sortBy={filters.sort_by}
            loading={loading}
          />
        </div>
      ),
    },
    {
      key: 'analytics',
      label: (
        <Space>
          <BarChartOutlined />
          <span>Analytics & Charts</span>
        </Space>
      ),
      children: (
        <div>
          <MetricCards summary={data?.summary} />
          <ChartVisualization 
            data={data?.top_sellers || []}
            summary={data?.summary}
            loading={loading}
          />
        </div>
      ),
    }
  ], [data, filters.sort_by, loading]);

  if (!can('INVENTORY_VIEW')) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "60px 24px", gap: 12,
        color: "#94a3b8", textAlign: "center",
      }}>
        <div style={{ fontSize: 32, color: "#cbd5e1" }}>🔒</div>
        <Text style={{ fontSize: 14, color: "#94a3b8" }}>
          You don't have permission to access <strong>Top Sellers Report</strong>.
        </Text>
        <Text style={{ fontSize: 12, color: "#cbd5e1" }}>
          Contact your administrator to request access.
        </Text>
      </div>
    );
  }

  return (
    <ProCard
      bordered
      headerBordered
      title={
        <Space size={10} align="center">
          <div style={{
            background: "#f0fdf4",
            borderRadius: 9,
            padding: "7px 8px",
            color: "#10b981",
            fontSize: 16,
            lineHeight: 1,
          }}>
            <BarChartOutlined />
          </div>
          <div>
            <Title level={5} style={{ margin: 0, color: "#0f172a" }}>Top Sellers Report</Title>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              Analyze your best performing inventory items
            </Text>
          </div>
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={loading}
            size="small"
          >
            Refresh
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
            size="small"
          >
            Export
          </Button>
        </Space>
      }
      style={{ borderRadius: 12 }}
    >
      <FiltersPanel 
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={() => setFilters({
          shop_id: currentShopId,
          start_date: '',
          end_date: '',
          category: '',
          sort_by: 'revenue',
          limit: 20
        })}
        loading={loading}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="middle"
        items={tabItems}
        style={{ marginTop: 24 }}
      />
    </ProCard>
  );
};

export default TopSellersReport;
