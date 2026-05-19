import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Empty, Spin, Typography, Tabs } from 'antd';
import { Pie, Column } from '@ant-design/charts';
import { useFilters } from '../../../context/FiltersContext';
import { Sale, PropertyAnalysis } from '../types';
import { generateSalesAnalysisReport } from '../../../utils/dataProcessors';
import SalesAnalysisSummary from './SalesAnalysisSummary';
import PropertyDistributionTable from './PropertyDistributionTable';
import { formatCurrency } from '../../../utils/formatters';

const { Title } = Typography;

interface SalesAnalysisTabProps {
  salesData: Sale[];
  isLoading: boolean;
}

const SalesAnalysisTab: React.FC<SalesAnalysisTabProps> = ({
  salesData,
  isLoading
}) => {
  const [salesAnalysisData, setSalesAnalysisData] = useState<PropertyAnalysis[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  const {
    dateRange,
    selectedAgents,
    selectedProperties
  } = useFilters();

  // Process sales data to generate report when dependencies change
  useEffect(() => {
    if (!salesData.length) return;

    const processedData = generateSalesAnalysisReport(
      salesData,
      dateRange,
      selectedAgents,
      selectedProperties
    );

    setSalesAnalysisData(processedData);
  }, [salesData, dateRange, selectedAgents, selectedProperties]);

  // Prepare data for property distribution pie chart
  const preparePropertyPieData = () => {
    return salesAnalysisData.map(property => ({
      type: property.propertyName,
      value: property.totalValue
    }));
  };

  // Prepare data for property sales count chart
  const prepareSalesCountData = () => {
    return salesAnalysisData.map(property => ({
      property: property.propertyName,
      count: property.salesCount
    }));
  };

  // Property distribution pie chart config
  const propertyPieConfig = {
    appendPadding: 10,
    data: preparePropertyPieData(),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}',
    },
    interactions: [{ type: 'element-active' }],
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: datum.type,
          value: formatCurrency(datum.value)
        };
      },
    },
  };

  // Property sales count chart config
  const salesCountChartConfig = {
    data: prepareSalesCountData(),
    xField: 'property',
    yField: 'count',
    label: {
      position: 'middle',
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: true,
      },
      title: {
        text: 'Property',
      },
    },
    yAxis: {
      title: {
        text: 'Sales Count',
      },
    },
    meta: {
      property: {
        alias: 'Property',
      },
      count: {
        alias: 'Sales Count',
      },
    },
    color: '#1890ff',
  };

  return (
    <>
      {/* Sales Analysis Summary Cards */}
      <SalesAnalysisSummary salesAnalysisData={salesAnalysisData} />

      {/* Property Distribution Visualizations */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Property Sales Distribution">
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin tip="Loading sales analysis data..." />
              </div>
            ) : salesAnalysisData.length > 0 ? (
              <div style={{ height: 350 }}>
                <Pie {...propertyPieConfig} />
              </div>
            ) : (
              <Empty description="No sales data found for the selected criteria" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Property Sales Count">
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin tip="Loading sales analysis data..." />
              </div>
            ) : salesAnalysisData.length > 0 ? (
              <div style={{ height: 350 }}>
                <Column {...salesCountChartConfig} />
              </div>
            ) : (
              <Empty description="No sales data found for the selected criteria" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Property Sales Distribution Table */}
      <Card style={{ marginTop: 16 }}>
        <Title level={5}>Property Sales Details</Title>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin tip="Loading sales analysis data..." />
          </div>
        ) : salesAnalysisData.length > 0 ? (
          <PropertyDistributionTable
            salesAnalysisData={salesAnalysisData}
            exportLoading={exportLoading}
            setExportLoading={setExportLoading}
          />
        ) : (
          <Empty
            description="No sales data found for the selected criteria"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>
    </>
  );
};

export default SalesAnalysisTab;
