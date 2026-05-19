import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Empty, Spin, Typography, Progress } from 'antd';
import { Pie, Column, Gauge } from '@ant-design/charts';
import { useFilters } from '../../../context/FiltersContext';
import { Sale, Property, PortfolioProperty } from '../types';
import { generatePortfolioProgressReport } from '../../../utils/dataProcessors';
import PortfolioSummary from './PortfolioSummary';
import PortfolioProgressTable from './PortfolioProgressTable';
import { formatCurrency } from '../../../utils/formatters';

const { Title } = Typography;

interface PortfolioProgressTabProps {
  salesData: Sale[];
  propertiesData: Property[];
  isLoading: boolean;
}

const PortfolioProgressTab: React.FC<PortfolioProgressTabProps> = ({
  salesData,
  propertiesData,
  isLoading
}) => {
  const [portfolioProgressData, setPortfolioProgressData] = useState<PortfolioProperty[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [useSimpleProgress, setUseSimpleProgress] = useState<boolean>(false);

  const {
    dateRange,
    selectedProperties
  } = useFilters();

  // Process data to generate portfolio progress report
  useEffect(() => {
    if (!propertiesData.length) return;

    try {
      const processedData = generatePortfolioProgressReport(
        salesData,
        propertiesData,
        dateRange,
        selectedProperties
      );

      setPortfolioProgressData(processedData);
    } catch (error) {
      console.error('Error processing portfolio data:', error);
      setPortfolioProgressData([]);
    }
  }, [salesData, propertiesData, dateRange, selectedProperties]);

  // Handle row expansion
  const handleExpandRow = (expanded: boolean, record: PortfolioProperty) => {
    setExpandedRowKeys(expanded ? [record.propertyId] : []);
  };

  // Calculate overall portfolio progress with safe checks
  const calculateOverallProgress = () => {
    try {
      const totalUnits = portfolioProgressData.reduce((sum, property) => sum + (property.totalUnits || 0), 0);
      const soldUnits = portfolioProgressData.reduce((sum, property) => sum + (property.soldUnits || 0), 0);

      return totalUnits > 0 ? (soldUnits / totalUnits) * 100 : 0;
    } catch (error) {
      console.error('Error calculating progress:', error);
      return 0;
    }
  };

  // Prepare data for units status pie chart
  const prepareUnitStatusData = () => {
    try {
      const totalSold = portfolioProgressData.reduce((sum, property) => sum + (property.soldUnits || 0), 0);
      const totalReserved = portfolioProgressData.reduce((sum, property) => sum + (property.reservedUnits || 0), 0);
      const totalAvailable = portfolioProgressData.reduce((sum, property) => sum + (property.availableUnits || 0), 0);

      return [
        { type: 'Sold', value: totalSold },
        { type: 'Reserved', value: totalReserved },
        { type: 'Available', value: totalAvailable }
      ];
    } catch (error) {
      console.error('Error preparing unit status data:', error);
      return [
        { type: 'Sold', value: 0 },
        { type: 'Reserved', value: 0 },
        { type: 'Available', value: 0 }
      ];
    }
  };

  // Prepare data for property progress chart
  const preparePropertyProgressData = () => {
    try {
      return portfolioProgressData.map(property => ({
        property: property.propertyName,
        progress: Number(property.salesProgress) || 0,
        soldUnits: property.soldUnits || 0,
        totalUnits: property.totalUnits || 0
      }));
    } catch (error) {
      console.error('Error preparing property progress data:', error);
      return [];
    }
  };

  // Unit status pie chart config
  const unitStatusPieConfig = {
    appendPadding: 10,
    data: prepareUnitStatusData(),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}',
    },
    legend: {
      layout: 'horizontal',
      position: 'bottom'
    },
    interactions: [{ type: 'element-active' }],
    colors: ['#52c41a', '#faad14', '#1890ff'],
  };

  // Property progress chart config
  const propertyProgressConfig = {
    data: preparePropertyProgressData(),
    xField: 'property',
    yField: 'progress',
    meta: {
      progress: {
        alias: 'Sales Progress (%)',
        min: 0,
        max: 100,
      },
    },
    label: {
      position: 'middle',
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
      formatter: (datum: any) => {
        // Safe formatter
        try {
          if (datum && datum.progress !== undefined && !isNaN(datum.progress)) {
            return `${datum.progress.toFixed(1)}%`;
          }
          return '0.0%';
        } catch (error) {
          return '0.0%';
        }
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        try {
          const progress = datum?.progress !== undefined ? parseFloat(datum.progress).toFixed(1) : '0.0';
          const soldUnits = datum?.soldUnits !== undefined ? datum.soldUnits : 0;
          const totalUnits = datum?.totalUnits !== undefined ? datum.totalUnits : 0;

          return {
            name: datum?.property || 'Unknown',
            value: `${progress}% (${soldUnits}/${totalUnits} units)` 
          };
        } catch (error) {
          return { name: 'Error', value: 'Invalid data' };
        }
      },
    },
    color: ({ progress }: any) => {
      try {
        const progressValue = progress !== undefined ? parseFloat(progress) : 0;

        if (progressValue >= 75) return '#52c41a';
        if (progressValue >= 50) return '#1890ff';
        if (progressValue >= 25) return '#faad14';
        return '#ff4d4f';
      } catch (error) {
        return '#1890ff';
      }
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: true,
      },
    },
    yAxis: {
      max: 100,
      title: {
        text: 'Sales Progress (%)',
      },
    },
  };

  // Overall progress gauge config with fallback handling
  const overallProgressConfig = {
    percent: Math.min(1, Math.max(0, calculateOverallProgress() / 100)),
    range: {
      color: 'l(0) 0:#ff4d4f 0.25:#faad14 0.5:#1890ff 0.75:#52c41a 1:#52c41a',
    },
    type: 'meter',
    innerRadius: 0.75,
    meter: {
      steps: 50,
      stepRatio: 0.8,
    },
    indicator: false,
    statistic: {
      content: {
        formatter: function formatter(datum: any) {
          try {
            return `${calculateOverallProgress().toFixed(1)}%`;
          } catch (error) {
            return '0.0%';
          }
        },
        style: {
          fontSize: '24px',
          lineHeight: '44px',
        },
      },
      title: {
        content: 'Overall Completion',
        style: {
          fontSize: '14px',
          lineHeight: '22px',
        },
      },
    },
  };

  // Handle chart rendering error
  const handleGaugeError = (error: any) => {
    console.error('Error rendering gauge chart:', error);
    setUseSimpleProgress(true);
  };

  return (
    <>
      {/* Portfolio Progress Summary */}
      <PortfolioSummary portfolioProgressData={portfolioProgressData} />

      {/* Portfolio Visualizations */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card title="Overall Portfolio Progress">
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin tip="Loading portfolio data..." />
              </div>
            ) : portfolioProgressData.length > 0 ? (
              <div style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {useSimpleProgress ? (
                  // Fallback to simpler Ant Design Progress
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <Progress
                      type="dashboard"
                      percent={Number(calculateOverallProgress().toFixed(1))}
                      format={percent => `${percent}%`}
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#52c41a',
                      }}
                      size={220}
                    />
                    <Title level={5} style={{ marginTop: 16 }}>
                      Overall Portfolio Completion
                    </Title>
                  </div>
                ) : (
                  // Try to use the Gauge chart first
                  <div style={{ width: '100%', height: '100%' }}>
                    <Gauge {...overallProgressConfig} onError={handleGaugeError} />
                  </div>
                )}
              </div>
            ) : (
              <Empty description="No portfolio data found" />
            )}
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card title="Unit Status Distribution">
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin tip="Loading portfolio data..." />
              </div>
            ) : portfolioProgressData.length > 0 ? (
              <div style={{ height: 300 }}>
                <Pie {...unitStatusPieConfig} />
              </div>
            ) : (
              <Empty description="No portfolio data found" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Property Progress Chart */}
      <Card style={{ marginTop: 16 }}>
        <Title level={5}>Property Sales Progress</Title>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin tip="Loading portfolio data..." />
          </div>
        ) : portfolioProgressData.length > 0 ? (
          <div style={{ height: 350 }}>
            <Column {...propertyProgressConfig} />
          </div>
        ) : (
          <Empty description="No portfolio data found" />
        )}
      </Card>

      {/* Portfolio Progress Table */}
      <Card style={{ marginTop: 16 }}>
        <Title level={5}>Detailed Portfolio Data</Title>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin tip="Loading portfolio data..." />
          </div>
        ) : portfolioProgressData.length > 0 ? (
          <PortfolioProgressTable
            portfolioProgressData={portfolioProgressData}
            expandedRowKeys={expandedRowKeys}
            onExpandRow={handleExpandRow}
          />
        ) : (
          <Empty
            description="No portfolio data found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>
    </>
  );
};

export default PortfolioProgressTab;
