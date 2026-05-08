import React, { useState, useMemo } from 'react';
import { ProCard } from '@ant-design/pro-components';
import { Typography, Tabs, Button, Space, Modal, Tag } from 'antd';
import { BarChartOutlined, TableOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useTopSellersReport } from "../../hooks/useTopSellersReport";
import FiltersPanel from './FiltersPanel';
import MetricCards from './MetricCards';
import SellersTable from './SellersTable';
import ChartVisualization from './ChartVisualization';
import { getPermissionChecker } from '@utils/getPermissionChecker';
import { formatCurrency, formatNumber } from '../../utils/formatters';

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

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  const getStockStatusTag = (item: any) => {
    if (item.performance_indicators?.is_out_of_stock) {
      return <Tag color="red">Out of Stock</Tag>;
    }
    if (item.performance_indicators?.is_low_stock) {
      return <Tag color="orange">Low Stock</Tag>;
    }
    return <Tag color="green">In Stock</Tag>;
  };

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

      {/* Item Details Modal */}
      <Modal
        title="Item Details"
        open={!!selectedItem}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" onClick={handleCloseModal}>
            Close
          </Button>
        ]}
        width={600}
        styles={{ body: { padding: '20px' } }}
      >
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Item Info Card */}
            <div style={{
              background: '#f8f9fa',
              borderRadius: 8,
              padding: '16px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#495057',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }} title={selectedItem.item_details?.name || 'Unknown Item'}>
                  {selectedItem.item_details?.name || 'Unknown Item'}
                </div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>
                  {selectedItem.item_details?.sku || 'No SKU'}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    background: '#007bff',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    #{selectedItem.rank}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: '#6c757d',
                    padding: '2px 8px',
                    background: '#e9ecef',
                    borderRadius: 12
                  }}>
                    {selectedItem.item_details?.category || 'Uncategorized'}
                  </span>
                </div>
                {getStockStatusTag(selectedItem)}
              </div>
            </div>

            {/* Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{
                background: 'white',
                border: '1px solid #e9ecef',
                borderRadius: 6,
                padding: '12px'
              }}>
                <div style={{ fontSize: 11, color: '#6c757d', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Quantity
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#212529' }}>
                  {formatNumber(selectedItem.sales_metrics?.total_quantity || 0)}
                </div>
              </div>

              <div style={{
                background: 'white',
                border: '1px solid #e9ecef',
                borderRadius: 6,
                padding: '12px'
              }}>
                <div style={{ fontSize: 11, color: '#6c757d', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Revenue
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#28a745' }}>
                  {formatCurrency(selectedItem.sales_metrics?.total_revenue || 0)}
                </div>
              </div>

              {(selectedItem.financial_metrics?.profit !== null && 
                selectedItem.financial_metrics?.profit !== undefined && 
                selectedItem.financial_metrics?.profit > 0) && (
                <>
                  <div style={{
                    background: 'white',
                    border: '1px solid #e9ecef',
                    borderRadius: 6,
                    padding: '12px'
                  }}>
                    <div style={{ fontSize: 11, color: '#6c757d', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Profit
                    </div>
                    <div style={{ 
                      fontSize: 18, 
                      fontWeight: 600, 
                      color: (selectedItem.financial_metrics?.profit || 0) >= 0 ? '#28a745' : '#dc3545'
                    }}>
                      {formatCurrency(selectedItem.financial_metrics?.profit || 0)}
                    </div>
                  </div>

                  <div style={{
                    background: 'white',
                    border: '1px solid #e9ecef',
                    borderRadius: 6,
                    padding: '12px'
                  }}>
                    <div style={{ fontSize: 11, color: '#6c757d', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Margin
                    </div>
                    <div style={{ 
                      fontSize: 18, 
                      fontWeight: 600,
                      color: (selectedItem.financial_metrics?.profit_margin || 0) >= 15 ? '#28a745' : 
                             (selectedItem.financial_metrics?.profit_margin || 0) >= 10 ? '#ffc107' : '#dc3545'
                    }}>
                      {(selectedItem.financial_metrics?.profit_margin || 0).toFixed(1)}%
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </ProCard>
  );
};

export default TopSellersReport;
