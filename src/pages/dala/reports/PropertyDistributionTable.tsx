import React, { useState } from 'react';
import { Table, Typography, Tag, Space, Button, Tooltip } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../../utils/formatters';
import { PropertyAnalysis } from '../types';
import { exportToExcel } from '../../../utils/exportUtils';

const { Title, Text } = Typography;

interface PropertyDistributionTableProps {
  salesAnalysisData: PropertyAnalysis[];
  exportLoading: boolean;
  setExportLoading: (loading: boolean) => void;
}

const PropertyDistributionTable: React.FC<PropertyDistributionTableProps> = ({
  salesAnalysisData,
  exportLoading,
  setExportLoading
}) => {
  const [sortedInfo, setSortedInfo] = useState<any>({});

  // Handle table change for sorting
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    setSortedInfo(sorter);
  };

  // Property analysis columns
  const propertyAnalysisColumns = [
    {
      title: 'Property',
      dataIndex: 'propertyName',
      key: 'propertyName',
      sorter: (a: PropertyAnalysis, b: PropertyAnalysis) =>
        a.propertyName.localeCompare(b.propertyName),
      sortOrder: sortedInfo.columnKey === 'propertyName' && sortedInfo.order,
    },
    {
      title: 'Sales Count',
      dataIndex: 'salesCount',
      key: 'salesCount',
      align: 'center' as const,
      sorter: (a: PropertyAnalysis, b: PropertyAnalysis) =>
        a.salesCount - b.salesCount,
      sortOrder: sortedInfo.columnKey === 'salesCount' && sortedInfo.order,
    },
    {
      title: 'Total Value',
      dataIndex: 'totalValue',
      key: 'totalValue',
      align: 'right' as const,
      sorter: (a: PropertyAnalysis, b: PropertyAnalysis) =>
        a.totalValue - b.totalValue,
      sortOrder: sortedInfo.columnKey === 'totalValue' && sortedInfo.order,
      defaultSortOrder: 'descend' as const,
      render: (text: number) => formatCurrency(text)
    },
    {
      title: 'Top Agent',
      dataIndex: 'topAgent',
      key: 'topAgent',
      align: 'center' as const,
      render: (topAgent: any) => topAgent ? (
        <Tooltip title={`${topAgent.salesCount} sales worth ${formatCurrency(topAgent.totalValue)}`}>
          <Tag color="blue">{topAgent.agentName}</Tag>
        </Tooltip>
      ) : 'N/A'
    },
    {
      title: 'Share (%)',
      dataIndex: 'percentage',
      key: 'percentage',
      align: 'center' as const,
      render: (text: string | number) => `${text}%` 
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: PropertyAnalysis) => (
        <Space>
          <Button
            size="small"
            icon={<BarChartOutlined />}
            onClick={() => handleExportProperty(record)}
          >
            Details
          </Button>
        </Space>
      )
    }
  ];

  // Handle export of property details
  const handleExportProperty = (record: PropertyAnalysis) => {
    // Prepare property data for export
    const exportData = [
      {
        Property: record.propertyName,
        'Sales Count': record.salesCount,
        'Total Value': record.totalValue,
        'Top Agent': record.topAgent?.agentName || 'N/A',
        'Share (%)': record.percentage
      }
    ];

    exportToExcel(exportData, `Property_${record.propertyName}`, setExportLoading);
  };

  return (
    <>
      <Title level={5}>Property Sales Distribution</Title>
      <Table
        columns={propertyAnalysisColumns}
        dataSource={salesAnalysisData}
        rowKey="propertyId"
        onChange={handleTableChange}
      />
    </>
  );
};

export default PropertyDistributionTable;
