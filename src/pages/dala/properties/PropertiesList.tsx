import { fetchProperties, deleteProperty } from '@services/dala';
import {
  DeleteOutlined,
  DownOutlined,
  EnvironmentOutlined,
  ExportOutlined,
  FileExcelOutlined,
  FileSearchOutlined,
  PrinterOutlined,
  BuildOutlined,
  TagOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { ActionType, ProTable } from '@ant-design/pro-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Drawer,
  Dropdown,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  message,
  Descriptions,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';
import { useRef, useState } from 'react';
import AddEditPropertyModal from './AddEditPropertyModal';

interface Property {
  _id: string;
  name: string;
  propertyType: string;
  location?: {
    address?: string;
    county?: string;
    constituency?: string;
  };
  blocks?: any[];
  currentPhase?: string;
  units?: any[];
  propertyUnits?: any[];
  status: string;
  propertyManager?: {
    name: string;
    _id: string;
  };
  createdAt: string;
}

const PropertiesList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const onView = (property: any) => {
    setSelectedProperty(property);
    setDrawerVisible(true);
  };

  const getCurrentPrice = (unit: any) => {
    if (!unit?.phasePricing || unit.phasePricing.length === 0) {
      return unit?.basePrice || unit?.price || 0;
    }
    const currentPhase = unit.phasePricing.find((phase: any) => phase.active);
    return currentPhase?.price || unit?.basePrice || unit?.price || 0;
  };

  const deletePropertyMutation = useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => {
      message.success('Property deleted successfully');
      actionRef.current?.reload();
    },
    onError: () => {
      message.error("Couldn't delete property");
    },
  });

  return (
    <>
      {/* Properties Table Component */}
      <ProTable
        columns={[
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            fieldProps: {
              placeholder: 'Search by name',
            },
            sorter: (a, b) => (a?.name || '').localeCompare(b?.name || ''),
          },
          {
            title: 'Type',
            dataIndex: 'propertyType',
            key: 'propertyType',
            align: 'center',
            search: false,
            render: (type) => {
              const color = type === 'land' ? 'green' : 'blue';
              return <Tag color={color}>{type || 'N/A'}</Tag>;
            },
            filters: [
              { text: 'Land', value: 'land' },
              { text: 'Apartment', value: 'apartment' },
            ],
            onFilter: (value, record) => record.propertyType === value,
          },
          {
            title: 'Location',
            key: 'location',
            search: false,
            render: (_, record) => (
              <span>
                <EnvironmentOutlined />{' '}
                {record?.location?.name || record?.location?.description || 'N/A'}
              </span>
            ),
          },
          {
            title: 'Structure',
            key: 'structure',
            align: 'center',
            search: false,
            render: (_, record) => {
              if (record.propertyType === 'apartment' && record.blocks) {
                const totalBlocks = record.blocks?.length || 0;
                const totalFloors = record.blocks?.reduce(
                  (sum: number, block: any) => sum + (block.floors?.length || 0),
                  0
                ) || 0;

                return (
                  <Space direction="vertical" size="small">
                    <span>
                      <BuildOutlined /> {totalBlocks} {totalBlocks === 1 ? 'Block' : 'Blocks'}
                    </span>
                    {totalFloors > 0 && (
                      <Tag color="blue">{totalFloors} floors total</Tag>
                    )}
                  </Space>
                );
              }
              return <span>-</span>;
            },
          },
          {
            title: 'Current Phase',
            key: 'currentPhase',
            align: 'center',
            search: false,
            render: (_, record) => {
              if (record.currentPhase) {
                const phaseName = typeof record.currentPhase === 'object' ? record.currentPhase.name : record.currentPhase;
                return (
                  <Tag color="green" icon={<TagOutlined />}>
                    {phaseName}
                  </Tag>
                );
              }
              return <span>-</span>;
            },
          },
          {
            title: 'Units Info',
            key: 'units',
            align: 'center',
            search: false,
            render: (_, record) => {
              // Handle both 'units' and 'propertyUnits' for backward compatibility
              const unitsArray = record?.units || record?.propertyUnits || [];

              if (!Array.isArray(unitsArray) || unitsArray.length === 0) {
                return <span>0 / 0 units</span>;
              }

              const totalUnits = unitsArray.reduce(
                (total, unit) => total + (unit?.totalUnits || 0),
                0,
              );
              const availableUnits = unitsArray.reduce(
                (total, unit) => total + (unit?.availableUnits || 0),
                0,
              );

              return (
                <Space direction="vertical" size="small">
                  <span>
                    <Tag color="green">{availableUnits}</Tag> /{' '}
                    <Tag color="blue">{totalUnits}</Tag> units
                  </span>
                  {record.propertyType === 'land' && unitsArray.length > 0 && (
                    <div>
                      <small>
                        {unitsArray
                          .filter((unit) => unit?.plotSize?.area)
                          .map(
                            (unit) =>
                              `${unit.plotSize.area} ${unit.plotSize.unit || 'sqm'}` 
                          )
                          .join(', ') || 'N/A'}
                      </small>
                    </div>
                  )}
                </Space>
              );
            },
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            search: false,
            render: (status) => {
              let color = 'green';
              if (status === 'reserved') color = 'orange';
              if (status === 'sold') color = 'red';
              if (status === 'under_construction') color = 'blue';
              return <Tag color={color}>{status || 'N/A'}</Tag>;
            },
            filters: [
              { text: 'Available', value: 'available' },
              { text: 'Reserved', value: 'reserved' },
              { text: 'Sold', value: 'sold' },
              { text: 'Under Construction', value: 'under_construction' },
            ],
            onFilter: (value, record) => record.status === value,
          },
          {
            title: 'Manager',
            key: 'manager',
            search: false,
            render: (_, record) => record?.propertyManager?.name || 'N/A',
            sorter: (a, b) =>
              (a?.propertyManager?.name || '').localeCompare(
                b?.propertyManager?.name || ''
              ),
          },
          {
            title: 'Total Value (KES)',
            key: 'value',
            align: 'center',
            search: false,
            render: (_, record) => {
              const unitsArray = record?.units || record?.propertyUnits || [];

              if (!Array.isArray(unitsArray) || unitsArray.length === 0) {
                return <span>0</span>;
              }

              const totalValue = unitsArray.reduce((total, unit) => {
                const currentPrice = getCurrentPrice(unit);
                return total + currentPrice * (unit?.totalUnits || 0);
              }, 0);

              return <strong>{totalValue.toLocaleString()}</strong>;
            },
            sorter: (a, b) => {
              const getPropertyValue = (property: any) => {
                const unitsArray = property?.units || property?.propertyUnits || [];
                return unitsArray.reduce((total: number, unit: any) => {
                  const currentPrice = getCurrentPrice(unit);
                  return total + currentPrice * (unit?.totalUnits || 0);
                }, 0);
              };
              return getPropertyValue(a) - getPropertyValue(b);
            },
          },
          {
            title: 'Created At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            align: 'center',
            search: false,
            sorter: (a, b) =>
              new Date(a?.createdAt || 0).getTime() -
              new Date(b?.createdAt || 0).getTime(),
            render: (text) =>
              text ? new Date(text).toLocaleDateString() : 'N/A',
          },
          {
            title: 'Actions',
            key: 'actions',
            align: 'center',
            search: false,
            fixed: 'right',
            width: 150,
            render: (_, record) => (
              <Space>
                <Tooltip title="View Details">
                  <Button
                    icon={<FileSearchOutlined />}
                    size="small"
                    onClick={() => onView(record)}
                  />
                </Tooltip>
                <Tooltip title="Edit">
                  <AddEditPropertyModal
                    actionRef={actionRef}
                    key={`edit-property-${record._id}`}
                    data={record}
                    edit={true}
                  />
                </Tooltip>
                <Tooltip title="Delete">
                  <Popconfirm
                    title="Are you sure to delete this property?"
                    onConfirm={() => {
                      deletePropertyMutation.mutate(record._id);
                    }}
                    okText="Yes"
                    cancelText="No"
                    key={`delete-${record._id}`}
                  >
                    <Button icon={<DeleteOutlined />} size="small" danger />
                  </Popconfirm>
                </Tooltip>
              </Space>
            ),
          },
        ]}
        rowKey="_id"
        request={async () => {
          try {
            const data = await fetchProperties();
            return {
              data: data?.data || [],
              success: true,
              total: data?.data?.length || 0,
            };
          } catch (error) {
            message.error('Failed to fetch properties');
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
        search={{
          searchText: 'Search',
          resetText: 'Reset',
          labelWidth: 'auto',
          layout: 'vertical',
        }}
        actionRef={actionRef}
        pagination={{
          pageSize: 10,
          showTotal: (total, range) => (
            <div>{`Showing ${range[0]}-${range[1]} of ${total} total properties`}</div>
          ),
        }}
        scroll={{ x: 1400 }}
        headerTitle="Properties"
        toolBarRender={() => [
          <AddEditPropertyModal actionRef={actionRef} key={'add-edit-property'} />,
          <Dropdown
            key={'export'}
            menu={{
              items: [
                {
                  key: '1',
                  icon: <FileExcelOutlined />,
                  label: 'Export to Excel',
                },
                {
                  key: '2',
                  icon: <PrinterOutlined />,
                  label: 'Export to PDF',
                },
              ],
            }}
          >
            <Button style={{ width: '100%' }}>
              <ExportOutlined /> Export <DownOutlined />
            </Button>
          </Dropdown>,
        ]}
      />
      
      {/* Property Details Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EnvironmentOutlined style={{ color: '#1890ff' }} />
            <span>{selectedProperty?.name || 'Property Details'}</span>
          </div>
        }
        width={700}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedProperty(null);
        }}
        styles={{ body: { padding: 24 } }}
      >
        {selectedProperty && (
          <div>
            {/* Property Overview Section */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#262626', fontSize: 16 }}>Property Overview</h4>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card size="small" style={{ height: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        {selectedProperty.units?.length || selectedProperty.propertyUnits?.length || 0}
                      </div>
                      <div style={{ color: '#8c8c8c', fontSize: 12 }}>Total Units</div>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" style={{ height: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                        {selectedProperty.blocks?.length || 0}
                      </div>
                      <div style={{ color: '#8c8c8c', fontSize: 12 }}>Total Blocks</div>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>

            {/* Detailed Information */}
            <Descriptions 
              title={<span style={{ fontSize: 16 }}>Detailed Information</span>} 
              bordered 
              column={1}
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="Property Type">
                <Tag color="blue" style={{ textTransform: 'capitalize' }}>
                  {selectedProperty.propertyType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Property Purpose">
                <Tag color="purple" style={{ textTransform: 'capitalize' }}>
                  {selectedProperty.purpose || 'sale'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedProperty.status === 'available' ? 'green' : 'orange'}>
                  {selectedProperty.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {selectedProperty.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <EnvironmentOutlined style={{ color: '#ff4d4f' }} />
                    <span>
                      <strong>{selectedProperty.location.name || 'Unknown Location'}</strong>
                      {selectedProperty.location.description && (
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                          {selectedProperty.location.description}
                        </div>
                      )}
                    </span>
                  </div>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Property Manager">
                {selectedProperty.propertyManager ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%', 
                      background: '#f0f0f0', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}>
                      {selectedProperty.propertyManager.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{selectedProperty.propertyManager.name}</div>
                      {selectedProperty.propertyManager.email && (
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                          {selectedProperty.propertyManager.email}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <span style={{ color: '#8c8c8c' }}>Not assigned</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Current Phase">
                {selectedProperty.currentPhase ? (
                  <Tag color="green" icon={<TagOutlined />}>
                    {selectedProperty.currentPhase.name}
                  </Tag>
                ) : (
                  <span style={{ color: '#8c8c8c' }}>No active phase</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Created Date">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarOutlined style={{ color: '#1890ff' }} />
                  <span>{new Date(selectedProperty.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              </Descriptions.Item>
            </Descriptions>

            {/* Additional Information */}
            {selectedProperty.phases && selectedProperty.phases.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#262626', fontSize: 16 }}>Pricing Phases</h4>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedProperty.phases.map((phase: any) => (
                    <Tag 
                      key={phase._id}
                      color={phase.active ? 'green' : 'default'}
                      style={{ marginBottom: 4 }}
                    >
                      {phase.name} {phase.active && '(Active)'}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {/* Statistics */}
            <div>
              <h4 style={{ margin: '0 0 16px 0', color: '#262626', fontSize: 16 }}>Statistics</h4>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic 
                    title="Active Phases" 
                    value={selectedProperty.phases?.filter((p: any) => p.active).length || 0}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Occupancy Rate" 
                    value={selectedProperty.occupancySummary?.occupancyRate || 0}
                    suffix="%"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Available Units" 
                    value={selectedProperty.occupancySummary?.vacantUnits || 0}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default PropertiesList;
