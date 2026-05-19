import React, { useState } from 'react';
import { Table, Typography, Tag, Progress, Empty } from 'antd';
import { PortfolioProperty, PortfolioUnit, UnitSale } from '../types';
import { formatCurrency, formatDate } from '../../../utils/formatters';

const { Title } = Typography;

interface ExpandedPortfolioRowProps {
  record: PortfolioProperty;
}

const ExpandedPortfolioRow: React.FC<ExpandedPortfolioRowProps> = ({ record }) => {
  const [expandedUnitKeys, setExpandedUnitKeys] = useState<string[]>([]);

  // Handle unit row expansion
  const handleExpandUnitRow = (expanded: boolean, record: PortfolioUnit) => {
    setExpandedUnitKeys(expanded ? [record.unitId] : []);
  };

  // Unit details columns
  const unitDetailsColumns = [
    {
      title: 'Unit Type',
      dataIndex: 'unitType',
      key: 'unitType',
    },
    {
      title: 'Plot Size',
      dataIndex: 'plotSize',
      key: 'plotSize',
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      align: 'right' as const,
      render: (text: number) => formatCurrency(text)
    },
    {
      title: 'Total Units',
      dataIndex: 'totalUnits',
      key: 'totalUnits',
      align: 'center' as const,
    },
    {
      title: 'Sold Units',
      dataIndex: 'soldUnits',
      key: 'soldUnits',
      align: 'center' as const,
    },
    {
      title: 'Available',
      dataIndex: 'availableUnits',
      key: 'availableUnits',
      align: 'center' as const,
    },
    {
      title: 'Sales Progress',
      dataIndex: 'salesProgress',
      key: 'salesProgress',
      align: 'center' as const,
      render: (progress: number | string) => (
        <Progress
          percent={Number(progress)}
          size="small"
          status={Number(progress) >= 100 ? "success" : Number(progress) > 0 ? "active" : "exception"}
        />
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => (
        <Tag color={
          status === 'sold' ? 'green' :
            status === 'reserved' ? 'orange' : 'blue'
        }>
          {status.toUpperCase()}
        </Tag>
      )
    }
  ];

  // Unit sales columns
  const unitSalesColumns = [
    {
      title: 'Sale Code',
      dataIndex: 'saleCode',
      key: 'saleCode',
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: 'Sale Date',
      dataIndex: 'saleDate',
      key: 'saleDate',
      render: (text: string) => formatDate(text)
    },
    {
      title: 'Sale Price',
      dataIndex: 'salePrice',
      key: 'salePrice',
      align: 'right' as const,
      render: (text: number) => formatCurrency(text)
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center' as const,
    },
    {
      title: 'Agent',
      dataIndex: 'agentName',
      key: 'agentName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => (
        <Tag color={
          status === 'completed' ? 'green' :
            status === 'cancelled' ? 'red' : 'orange'
        }>
          {status.toUpperCase()}
        </Tag>
      )
    }
  ];

  return (
    <div style={{ margin: '0 20px 20px 20px' }}>
      <Title level={5}>Unit Details</Title>
      <Table
        columns={unitDetailsColumns}
        dataSource={record.units}
        pagination={false}
        size="small"
        rowKey="unitId"
        expandable={{
          expandedRowRender: (unitRecord) => (
            <div style={{ margin: '0 20px 20px 20px' }}>
              <Title level={5}>Unit Sales History</Title>
              {unitRecord.sales && unitRecord.sales.length > 0 ? (
                <Table
                  columns={unitSalesColumns}
                  dataSource={unitRecord.sales}
                  pagination={false}
                  size="small"
                  rowKey="saleId"
                />
              ) : (
                <Empty description="No sales history found" />
              )}
            </div>
          ),
          expandedRowKeys: expandedUnitKeys,
          onExpand: handleExpandUnitRow,
          rowExpandable: (record) => record.sales && record.sales.length > 0
        }}
      />
    </div>
  );
};

export default ExpandedPortfolioRow;
