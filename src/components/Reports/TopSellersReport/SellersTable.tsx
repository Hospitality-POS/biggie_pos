import React from 'react';
import { Table, Tag, Button, Badge, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { formatCurrency, formatNumber } from '../../../utils/formatters';

interface SellersTableProps {
  sellers: any[];
  onItemSelect: (item: any) => void;
  sortBy: string;
  loading?: boolean;
}

const SellersTable: React.FC<SellersTableProps> = ({ 
  sellers, 
  onItemSelect, 
  sortBy, 
  loading = false 
}) => {
  const getSortIcon = (column: string) => {
    if (sortBy === column) return ' ↓';
    return null;
  };

  const getStockStatus = (item: any) => {
    if (item.performance_indicators?.is_out_of_stock) {
      return <Tag color="red">Out of Stock</Tag>;
    }
    if (item.performance_indicators?.is_low_stock) {
      return <Tag color="orange">Low Stock</Tag>;
    }
    return <Tag color="green">In Stock</Tag>;
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 20) return 'green';
    if (margin >= 10) return 'orange';
    return 'red';
  };

  const columns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => (
        <Badge 
          count={rank} 
          style={{ 
            backgroundColor: '#1890ff',
            fontSize: '12px',
            fontWeight: 'bold'
          }} 
        />
      ),
      sorter: false,
    },
    {
      title: 'Item Details',
      key: 'item_details',
      render: (record: any) => (
        <div>
          <div style={{ fontWeight: 600, color: '#262626' }}>
            {record.item_details?.name || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            SKU: {record.item_details?.sku || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: ['item_details', 'category'],
      key: 'category',
      render: (category: string) => category || 'N/A',
    },
    {
      title: `Quantity${getSortIcon('quantity')}`,
      dataIndex: ['sales_metrics', 'total_quantity'],
      key: 'quantity',
      render: (quantity: number) => formatNumber(quantity || 0),
      sorter: false,
    },
    {
      title: `Revenue${getSortIcon('revenue')}`,
      dataIndex: ['sales_metrics', 'total_revenue'],
      key: 'revenue',
      render: (revenue: number) => (
        <span style={{ fontWeight: 600, color: '#1890ff' }}>
          {formatCurrency(revenue || 0)}
        </span>
      ),
      sorter: false,
    },
    {
      title: `Profit${getSortIcon('profit')}`,
      dataIndex: ['financial_metrics', 'profit'],
      key: 'profit',
      render: (profit: number) => (
        <span style={{ 
          fontWeight: 600,
          color: (profit || 0) >= 0 ? '#52c41a' : '#ff4d4f'
        }}>
          {formatCurrency(profit || 0)}
        </span>
      ),
      sorter: false,
    },
    {
      title: 'Margin',
      dataIndex: ['financial_metrics', 'profit_margin'],
      key: 'margin',
      render: (margin: number) => (
        <Tag color={getMarginColor(margin || 0)}>
          {(margin || 0).toFixed(1)}%
        </Tag>
      ),
    },
    {
      title: 'Transactions',
      dataIndex: ['sales_metrics', 'transaction_count'],
      key: 'transactions',
      render: (count: number) => count || 0,
    },
    {
      title: 'Stock Status',
      key: 'stock_status',
      render: (record: any) => getStockStatus(record),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (record: any) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onItemSelect(record)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={sellers}
      rowKey="item_id"
      loading={loading}
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => 
          `${range[0]}-${range[1]} of ${total} items`,
      }}
      scroll={{ x: 1200 }}
      size="small"
      style={{
        background: '#fff',
        borderRadius: 8,
      }}
    />
  );
};

export default SellersTable;
