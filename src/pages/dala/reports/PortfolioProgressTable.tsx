import React from 'react';
import { Table, Typography, Progress } from 'antd';
import { PortfolioProperty } from '../types';
import { formatCurrency } from '../../../utils/formatters';
import ExpandedPortfolioRow from './ExpandedPortfolioRow';

const { Title } = Typography;

interface PortfolioProgressTableProps {
  portfolioProgressData: PortfolioProperty[];
  expandedRowKeys: string[];
  onExpandRow: (expanded: boolean, record: PortfolioProperty) => void;
}

const PortfolioProgressTable: React.FC<PortfolioProgressTableProps> = ({
  portfolioProgressData,
  expandedRowKeys,
  onExpandRow
}) => {
  // Portfolio progress columns
  const portfolioProgressColumns = [
    {
      title: 'Property',
      dataIndex: 'propertyName',
      key: 'propertyName',
      sorter: (a: PortfolioProperty, b: PortfolioProperty) =>
        a.propertyName.localeCompare(b.propertyName),
    },
    {
      title: 'Total Units',
      dataIndex: 'totalUnits',
      key: 'totalUnits',
      align: 'center' as const,
      sorter: (a: PortfolioProperty, b: PortfolioProperty) =>
        a.totalUnits - b.totalUnits,
    },
    {
      title: 'Sold Units',
      dataIndex: 'soldUnits',
      key: 'soldUnits',
      align: 'center' as const,
      sorter: (a: PortfolioProperty, b: PortfolioProperty) =>
        a.soldUnits - b.soldUnits,
    },
    {
      title: 'Available Units',
      dataIndex: 'availableUnits',
      key: 'availableUnits',
      align: 'center' as const,
      sorter: (a: PortfolioProperty, b: PortfolioProperty) =>
        a.availableUnits - b.availableUnits,
    },
    {
      title: 'Sales Progress',
      dataIndex: 'salesProgress',
      key: 'salesProgress',
      align: 'center' as const,
      sorter: (a: PortfolioProperty, b: PortfolioProperty) =>
        Number(a.salesProgress) - Number(b.salesProgress),
      render: (progress: number | string) => (
        <Progress
          percent={Number(progress)}
          size="small"
          status={Number(progress) >= 100 ? "success" : Number(progress) > 0 ? "active" : "exception"}
        />
      )
    }
  ];

  return (
    <>
      <Title level={5}>Property Sales Progress</Title>
      <Table
        columns={portfolioProgressColumns}
        dataSource={portfolioProgressData}
        rowKey="propertyId"
        expandable={{
          expandedRowRender: (record) => <ExpandedPortfolioRow record={record} />,
          expandRowByClick: true,
          expandedRowKeys: expandedRowKeys,
          onExpand: onExpandRow
        }}
      />
    </>
  );
};

export default PortfolioProgressTable;
