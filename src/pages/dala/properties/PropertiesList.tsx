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
  Tabs,
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
            title: 'Purpose',
            dataIndex: 'purpose',
            key: 'purpose',
            align: 'center',
            search: false,
            render: (purpose) => {
              let color = 'blue';
              if (purpose === 'sale') color = 'green';
              if (purpose === 'rental' || purpose === 'rent') color = 'orange';
              if (purpose === 'lease') color = 'orange';
              if (purpose === 'mixed') color = 'purple';
              return <Tag color={color}>{purpose || 'sale'}</Tag>;
            },
            filters: [
              { text: 'Sale', value: 'sale' },
              { text: 'Rental', value: 'rental' },
              { text: 'Rent', value: 'rent' },
              { text: 'Lease', value: 'lease' },
              { text: 'Mixed', value: 'mixed' },
            ],
            onFilter: (value, record) => record.purpose === value,
          },
          {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            align: 'center',
            search: false,
            render: (category) => {
              const color = 'cyan';
              return <Tag color={color} style={{ textTransform: 'capitalize' }}>{category || 'N/A'}</Tag>;
            },
            filters: [
              { text: 'Residential', value: 'residential' },
              { text: 'Commercial', value: 'commercial' },
              { text: 'Industrial', value: 'industrial' },
            ],
            onFilter: (value, record) => record.category === value,
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
                  {record.propertyType === 'apartment' && unitsArray.length > 0 && (
                    <div>
                      <small>
                        {unitsArray
                          .filter((unit) => unit?.areaSqm)
                          .map(
                            (unit) =>
                              `${unit.areaSqm} sqm`
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
            render: (_, record) => {
              const manager = record?.propertyManager;
              if (manager?.name) return manager.name;
              if (manager?.email) return manager.email;
              if (manager?.phone) return manager.phone;
              return 'N/A';
            },
            sorter: (a, b) => {
              const getManagerName = (record: any) => {
                const manager = record?.propertyManager;
                return manager?.name || manager?.email || manager?.phone || '';
              };
              return getManagerName(a).localeCompare(getManagerName(b));
            },
          },
          {
            title: 'Total Value (KES)',
            key: 'value',
            align: 'center',
            search: false,
            render: (_, record) => {
              const unitsArray = record?.units || record?.propertyUnits || [];
              const propertyPurpose = record?.purpose || record?.propertyPurpose || 'sale';

              if (!Array.isArray(unitsArray) || unitsArray.length === 0) {
                return <span>0</span>;
              }

              const totalValue = unitsArray.reduce((total, unit) => {
                // If unit tracks individual apartments, sum their prices based on property purpose
                if (unit?.trackIndividualUnits && Array.isArray(unit?.apartments) && unit.apartments.length > 0) {
                  const apartmentsTotal = unit.apartments.reduce((aptTotal, apt) => {
                    if (propertyPurpose === 'lease' || propertyPurpose === 'rent') {
                      // For lease/rent, use monthlyRentOverride, monthlyRent, or fall back to saleListPrice
                      return aptTotal + (apt?.monthlyRentOverride || apt?.monthlyRent || apt?.saleListPrice || 0);
                    }
                    return aptTotal + (apt?.saleListPrice || 0);
                  }, 0);
                  return total + apartmentsTotal;
                }
                
                // Otherwise use unit price based on property purpose
                if (propertyPurpose === 'lease' || propertyPurpose === 'rent') {
                  // For lease/rent, use monthlyRent or fall back to listPrice/basePrice
                  const rentPrice = unit?.monthlyRent || unit?.listPrice || unit?.basePrice || 0;
                  return total + rentPrice * (unit?.totalUnits || 0);
                }
                
                const currentPrice = unit?.basePrice || unit?.price || unit?.listPrice || 0;
                return total + currentPrice * (unit?.totalUnits || 0);
              }, 0);

              return <strong>{totalValue.toLocaleString()}</strong>;
            },
            sorter: (a, b) => {
              const getPropertyValue = (property: any) => {
                const unitsArray = property?.units || property?.propertyUnits || [];
                const propertyPurpose = property?.purpose || property?.propertyPurpose || 'sale';
                return unitsArray.reduce((total: number, unit: any) => {
                  // If unit tracks individual apartments, sum their prices based on property purpose
                  if (unit?.trackIndividualUnits && Array.isArray(unit?.apartments) && unit.apartments.length > 0) {
                    const apartmentsTotal = unit.apartments.reduce((aptTotal: number, apt: any) => {
                      if (propertyPurpose === 'lease' || propertyPurpose === 'rent') {
                        // For lease/rent, use monthlyRentOverride, monthlyRent, or fall back to saleListPrice
                        return aptTotal + (apt?.monthlyRentOverride || apt?.monthlyRent || apt?.saleListPrice || 0);
                      }
                      return aptTotal + (apt?.saleListPrice || 0);
                    }, 0);
                    return total + apartmentsTotal;
                  }
                  
                  // Otherwise use unit price based on property purpose
                  if (propertyPurpose === 'lease' || propertyPurpose === 'rent') {
                    // For lease/rent, use monthlyRent or fall back to listPrice/basePrice
                    const rentPrice = unit?.monthlyRent || unit?.listPrice || unit?.basePrice || 0;
                    return total + rentPrice * (unit?.totalUnits || 0);
                  }
                  
                  const currentPrice = unit?.basePrice || unit?.price || unit?.listPrice || 0;
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
          <Tabs defaultActiveKey="overview">
            {/* Overview Tab */}
            <Tabs.TabPane tab="Overview" key="overview">
              <div>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
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

                <Descriptions 
                  bordered 
                  column={1}
                  size="small"
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
              </div>
            </Tabs.TabPane>

            {/* Location Tab */}
            <Tabs.TabPane tab="Location" key="location">
              <Descriptions 
                bordered 
                column={1}
                size="small"
              >
                <Descriptions.Item label="Location Name">
                  {selectedProperty.location?.name || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                  {selectedProperty.location?.description || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Type">
                  <Tag color="blue" style={{ textTransform: 'capitalize' }}>
                    {selectedProperty.location?.type || 'N/A'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Tabs.TabPane>

            {/* Blocks Tab */}
            <Tabs.TabPane tab="Blocks" key="blocks">
              {selectedProperty.blocks && selectedProperty.blocks.length > 0 ? (
                <div>
                  {selectedProperty.blocks.map((block: any) => (
                    <Card 
                      key={block._id} 
                      size="small" 
                      style={{ marginBottom: 16 }}
                      title={`Block ${block.name}`}
                    >
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Total Floors">
                          {block.totalFloors || 0}
                        </Descriptions.Item>
                        <Descriptions.Item label="Status">
                          <Tag color={block.status === 'active' ? 'green' : 'orange'}>
                            {block.status}
                          </Tag>
                        </Descriptions.Item>
                        {block.floors && block.floors.length > 0 && (
                          <Descriptions.Item label="Floors">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {block.floors.map((floor: any) => (
                                <Tag key={floor._id} color="blue">
                                  {floor.name} (Floor {floor.floorNumber})
                                </Tag>
                              ))}
                            </div>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </Card>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 24 }}>
                  No blocks found
                </div>
              )}
            </Tabs.TabPane>

            {/* Phases Tab */}
            <Tabs.TabPane tab="Phases" key="phases">
              {selectedProperty.phases && selectedProperty.phases.length > 0 ? (
                <div>
                  {selectedProperty.phases.map((phase: any) => (
                    <Card 
                      key={phase._id} 
                      size="small" 
                      style={{ marginBottom: 16 }}
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{phase.name}</span>
                          {phase.active && <Tag color="green">Active</Tag>}
                        </div>
                      }
                    >
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Description">
                          {phase.description || 'N/A'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Start Date">
                          {new Date(phase.startDate).toLocaleDateString()}
                        </Descriptions.Item>
                        <Descriptions.Item label="End Date">
                          {new Date(phase.endDate).toLocaleDateString()}
                        </Descriptions.Item>
                        <Descriptions.Item label="Price Multiplier">
                          {phase.priceMultiplier}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 24 }}>
                  No phases found
                </div>
              )}
            </Tabs.TabPane>

            {/* Units Tab */}
            <Tabs.TabPane tab="Units" key="units">
              {selectedProperty.units && selectedProperty.units.length > 0 ? (
                <div>
                  {selectedProperty.units.map((unit: any) => (
                    <Card 
                      key={unit._id} 
                      size="small" 
                      style={{ marginBottom: 16 }}
                      title={unit.name || `Unit ${unit.unitNumber}`}
                    >
                      <Descriptions column={2} size="small">
                        <Descriptions.Item label="Unit Number">
                          {unit.unitNumber}
                        </Descriptions.Item>
                        <Descriptions.Item label="Unit Type">
                          <Tag color="purple">{unit.unitType}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Area">
                          {unit.areaSqm} {unit.areaUnit}
                        </Descriptions.Item>
                        <Descriptions.Item label="Total Units">
                          {unit.totalUnits}
                        </Descriptions.Item>
                        <Descriptions.Item label="Track Individual">
                          {unit.trackIndividualUnits ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Status">
                          <Tag color={unit.status === 'available' ? 'green' : 'orange'}>
                            {unit.status}
                          </Tag>
                        </Descriptions.Item>
                        {unit.trackIndividualUnits && unit.apartments && unit.apartments.length > 0 && (
                          <Descriptions.Item label="Apartments" span={2}>
                            <div style={{ marginTop: 8 }}>
                              {unit.apartments.map((apt: any) => (
                                <Tag key={apt._id} color="blue" style={{ marginBottom: 4 }}>
                                  {apt.apartmentName} - {apt.area?.value} {apt.area?.unit} - KES {apt.saleListPrice?.toLocaleString()}
                                </Tag>
                              ))}
                            </div>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </Card>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 24 }}>
                  No units found
                </div>
              )}
            </Tabs.TabPane>

            {/* Pricing Tab */}
            <Tabs.TabPane tab="Pricing" key="pricing">
              <Descriptions 
                bordered 
                column={1}
                size="small"
              >
                <Descriptions.Item label="Currency">
                  <Tag color="blue">{selectedProperty.currency || 'KES'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Category">
                  <Tag color="purple" style={{ textTransform: 'capitalize' }}>
                    {selectedProperty.category || 'N/A'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Default Price/Sqm">
                  {selectedProperty.defaultPricePerSqm ? 
                    `KES ${selectedProperty.defaultPricePerSqm.toLocaleString()}` : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Default Rent/Sqm">
                  {selectedProperty.defaultRentPerSqm ? 
                    `KES ${selectedProperty.defaultRentPerSqm.toLocaleString()}` : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Service Charge">
                  {selectedProperty.defaultServiceCharge ? 
                    `KES ${selectedProperty.defaultServiceCharge.toLocaleString()}` : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Deposit Months">
                  {selectedProperty.defaultDepositMonths || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Rent Due Day">
                  {selectedProperty.defaultRentDueDay || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Utilities">
                  {selectedProperty.defaultUtilities ? (
                    <Space size="small">
                      {selectedProperty.defaultUtilities.water && <Tag color="blue">Water</Tag>}
                      {selectedProperty.defaultUtilities.electricity && <Tag color="yellow">Electricity</Tag>}
                      {selectedProperty.defaultUtilities.internet && <Tag color="green">Internet</Tag>}
                      {selectedProperty.defaultUtilities.garbage && <Tag color="orange">Garbage</Tag>}
                    </Space>
                  ) : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Total Value">
                  {(() => {
                    const unitsArray = selectedProperty?.units || selectedProperty?.propertyUnits || [];
                    if (!Array.isArray(unitsArray) || unitsArray.length === 0) {
                      return 'KES 0';
                    }
                    const totalValue = unitsArray.reduce((total: number, unit: any) => {
                      if (unit?.trackIndividualUnits && Array.isArray(unit?.apartments) && unit.apartments.length > 0) {
                        const apartmentsTotal = unit.apartments.reduce((aptTotal: number, apt: any) => {
                          return aptTotal + (apt?.saleListPrice || 0);
                        }, 0);
                        return total + apartmentsTotal;
                      }
                      const currentPrice = unit?.basePrice || unit?.price || unit?.listPrice || 0;
                      return total + currentPrice * (unit?.totalUnits || 0);
                    }, 0);
                    return `KES ${totalValue.toLocaleString()}`;
                  })()}
                </Descriptions.Item>
              </Descriptions>
            </Tabs.TabPane>
          </Tabs>
        )}
      </Drawer>
    </>
  );
};

export default PropertiesList;
