import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Tag,
  Table,
  Tabs,
  Descriptions,
  Progress,
  Image,
  Divider,
  Statistic,
  Modal,
  message,
  Form,
  Input,
  Select,
  Upload,
} from 'antd';
import {
  EditOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  PlusOutlined,
  EyeOutlined,
  EnvironmentOutlined,
  FileOutlined,
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProperty, fetchUnits, fetchBlocks, fetchFloors } from '@services/dala';
import { useDalaSelectedProperty, useDalaUnitsByProperty, useDalaBlocksByProperty } from '../../../stores/dalaStore';
import {
  fetchPropertyDocuments,
  uploadPropertyDocument,
  deletePropertyDocument,
  PropertyDocument,
  PROPERTY_DOCUMENT_TYPES,
} from '@services/dala/propertyDocuments';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('overview');
  const selectedProperty = useDalaSelectedProperty();
  const propertyUnits = useDalaUnitsByProperty(id || '');
  const propertyBlocks = useDalaBlocksByProperty(id || '');

  // Document management state
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [documentForm] = Form.useForm();

  const shop_id = localStorage.getItem("shopId");

  // Fetch documents when documents tab is opened
  useEffect(() => {
    if (activeTab === 'documents' && id && shop_id) {
      fetchDocuments();
    }
  }, [activeTab, id, shop_id]);

  const fetchDocuments = async () => {
    if (!id || !shop_id) return;
    setDocumentsLoading(true);
    try {
      const response = await fetchPropertyDocuments(id, shop_id);
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDocumentUpload = async (values: any) => {
    console.log('handleDocumentUpload called with values:', values);
    console.log('fileList:', fileList);
    console.log('id:', id);
    console.log('shop_id:', shop_id);
    
    if (!id || !shop_id) {
      message.error("Missing property_id or shop_id");
      return;
    }
    
    if (fileList.length === 0) {
      message.error("Please upload at least one file");
      return;
    }
    
    setUploadLoading(true);
    try {
      await uploadPropertyDocument(id, {
        shop_id,
        document_type: values.document_type,
        name: values.name,
        description: values.description,
        files: fileList.map(f => f.originFileObj).filter(Boolean),
      });
      documentForm.resetFields();
      setFileList([]);
      fetchDocuments();
      message.success("Document uploaded successfully");
    } catch (error) {
      console.error('Upload error:', error);
      message.error("Failed to upload document");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!id || !shop_id) return;
    try {
      await deletePropertyDocument(id, documentId, shop_id);
      fetchDocuments();
      message.success("Document deleted");
    } catch (error) {
      message.error("Failed to delete document");
    }
  };

  const SectionTitle = ({ label }: { label: string }) => (
    <Text strong style={{
      fontSize: 11, color: C.primary, textTransform: "uppercase",
      letterSpacing: "0.5px", display: "block",
    }}>
      {label}
    </Text>
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['dala-property', id],
    queryFn: () => fetchProperty(id!),
    enabled: !!id,
    onSuccess: (data) => {
      selectedProperty.setSelectedProperty(data.data);
    },
  });

  const { data: unitsData } = useQuery({
    queryKey: ['dala-units', { property_id: id }],
    queryFn: () => fetchUnits({ property_id: id }),
    enabled: !!id,
    onSuccess: (data) => {
      propertyUnits.setUnits(data.data);
    },
  });

  const { data: blocksData } = useQuery({
    queryKey: ['dala-blocks', { property_id: id }],
    queryFn: () => fetchBlocks({ property_id: id }),
    enabled: !!id,
    onSuccess: (data) => {
      propertyBlocks.setBlocks(data.data);
    },
  });

  if (isLoading) {
    return <div>Loading property details...</div>;
  }

  if (error || !selectedProperty) {
    return <div>Error loading property details</div>;
  }

  const property = selectedProperty;

  const unitColumns = [
    {
      title: 'Unit Code',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type.toUpperCase()}</Tag>,
    },
    {
      title: 'Size (sqft)',
      dataIndex: 'size_sqft',
      key: 'size_sqft',
      render: (size: number) => `${size.toLocaleString()} sqft`,
    },
    {
      title: 'Price',
      dataIndex: 'base_price',
      key: 'price',
      render: (price: number) => `KES ${price.toLocaleString()}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          available: 'green',
          reserved: 'orange',
          sold: 'red',
          rented: 'blue',
          maintenance: 'default',
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/dala/units/${record._id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  const blockColumns = [
    {
      title: 'Block Code',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Block Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Floors',
      dataIndex: 'floors',
      key: 'floors',
      render: (floors: number) => `${floors || 0} floors`,
    },
    {
      title: 'Units',
      dataIndex: 'units',
      key: 'units',
      render: (units: number) => `${units || 0} units`,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
    },
  ];

  const occupancyRate = property.total_units > 0 
    ? ((property.total_units - property.available_units) / property.total_units) * 100 
    : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dala/properties')}
          >
            Back to Properties
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/dala/properties/${id}/edit`)}
          >
            Edit Property
          </Button>
        </Space>
      </div>

      {/* Property Overview */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={16}>
            <Title level={2}>{property.name}</Title>
            <Space direction="vertical" size="small">
              <Space>
                <Tag color="blue">{property.code}</Tag>
                <Tag color={property.status === 'completed' ? 'green' : 'orange'}>
                  {property.status.replace('_', ' ').toUpperCase()}
                </Tag>
              </Space>
              {property.location && (
                <Space>
                  <EnvironmentOutlined />
                  <Text>{property.location}</Text>
                </Space>
              )}
              {property.address && (
                <Space>
                  <HomeOutlined />
                  <Text>{property.address}</Text>
                </Space>
              )}
              {property.description && (
                <Paragraph>{property.description}</Paragraph>
              )}
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Total Units"
                  value={property.total_units}
                  prefix={<HomeOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Available"
                  value={property.available_units}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Sold"
                  value={property.sold_units}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Rented"
                  value={property.rented_units}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Overview" key="overview">
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card title="Occupancy Rate" size="small">
                  <Progress
                    type="circle"
                    percent={Math.round(occupancyRate)}
                    format={(percent) => `${percent}%`}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Property Details" size="small">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Developer">
                      {property.developer || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Year Built">
                      {property.year_built || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Property Type">
                      {property.property_type?.name || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Created">
                      {new Date(property.created_at).toLocaleDateString()}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              {property.amenities && property.amenities.length > 0 && (
                <Col xs={24}>
                  <Card title="Amenities" size="small">
                    <Space wrap>
                      {property.amenities.map((amenity, index) => (
                        <Tag key={index} color="blue">
                          {amenity}
                        </Tag>
                      ))}
                    </Space>
                  </Card>
                </Col>
              )}
            </Row>
          </TabPane>

          <TabPane tab="Units" key="units">
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/dala/units/create?property_id=${id}`)}
              >
                Add Unit
              </Button>
            </div>
            <Table
              columns={unitColumns}
              dataSource={propertyUnits}
              rowKey="_id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} units`,
              }}
            />
          </TabPane>

          <TabPane tab="Blocks" key="blocks">
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/dala/blocks/create?property_id=${id}`)}
              >
                Add Block
              </Button>
            </div>
            <Table
              columns={blockColumns}
              dataSource={propertyBlocks}
              rowKey="_id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} blocks`,
              }}
            />
          </TabPane>

          {property.images && property.images.length > 0 && (
            <TabPane tab="Gallery" key="gallery">
              <Row gutter={[16, 16]}>
                {property.images.map((image, index) => (
                  <Col xs={24} sm={12} md={8} key={index}>
                    <Image
                      width="100%"
                      height={200}
                      src={image}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                    />
                  </Col>
                ))}
              </Row>
            </TabPane>
          )}

          <TabPane tab="Documents" key="documents">
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
              <SectionTitle label="Upload Document" />
              <Form
                form={documentForm}
                layout="vertical"
                onFinish={handleDocumentUpload}
                style={{ marginBottom: 20 }}
                onFinishFailed={(errorInfo) => console.log('Form validation failed:', errorInfo)}
              >
                <Form.Item
                  name="document_type"
                  label="Document Type"
                  rules={[{ required: true, message: "Please select document type" }]}
                >
                  <Select placeholder="Select document type">
                    {PROPERTY_DOCUMENT_TYPES.map(type => (
                      <Option key={type.value} value={type.value}>{type.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  name="name"
                  label="Document Name"
                  rules={[{ required: true, message: "Please enter document name" }]}
                >
                  <Input placeholder="Enter document name" />
                </Form.Item>
                <Form.Item name="description" label="Description">
                  <TextArea rows={3} placeholder="Enter description (optional)" />
                </Form.Item>
                <Form.Item label="Files">
                  <Upload
                    fileList={fileList}
                    onChange={({ fileList }) => setFileList(fileList)}
                    beforeUpload={() => false}
                    multiple
                  >
                    <Button icon={<UploadOutlined />}>Select Files</Button>
                  </Upload>
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={uploadLoading}
                    icon={<UploadOutlined />}
                    style={{ background: C.primary, borderColor: C.primary }}
                  >
                    Upload Document
                  </Button>
                </Form.Item>
              </Form>

              <SectionTitle label="Documents" />
              {documentsLoading ? (
                <div style={{ textAlign: "center", padding: 20 }}>Loading...</div>
              ) : documents.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: C.subText }}>No documents uploaded</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {documents.map(doc => (
                    <div key={doc._id} style={{
                      display: "flex", flexDirection: "column", gap: 8,
                      padding: "12px", border: `1px solid ${C.border}`,
                      borderRadius: 8, background: C.bg
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <FileOutlined style={{ color: C.primary, fontSize: 18 }} />
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 12, display: "block" }}>
                            {doc.name}
                          </Text>
                          {doc.description && (
                            <Text style={{ fontSize: 11, color: C.subText }}>{doc.description}</Text>
                          )}
                          <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>
                            {doc.attachments?.length || 0} file(s) · {new Date(doc.created_at).toLocaleDateString("en-GB")}
                          </Text>
                        </div>
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteDocument(doc._id)}
                        >
                          Delete
                        </Button>
                      </div>
                      {doc.attachments && doc.attachments.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 28 }}>
                          {doc.attachments.map((attachment) => (
                            <div key={attachment._id} style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "6px 10px", background: "#fff",
                              borderRadius: 6, border: `1px solid ${C.border}`
                            }}>
                              <FileOutlined style={{ color: C.subText, fontSize: 14 }} />
                              <Text style={{ fontSize: 11, flex: 1, color: C.darkText }}>
                                {attachment.file_name}
                              </Text>
                              <Button
                                size="small"
                                type="link"
                                icon={<EyeOutlined />}
                                onClick={() => window.open(attachment.file_url, '_blank')}
                                style={{ padding: "0 4px", fontSize: 11 }}
                              >
                                View
                              </Button>
                              <Button
                                size="small"
                                type="link"
                                icon={<DownloadOutlined />}
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = attachment.file_url;
                                  link.download = attachment.file_name;
                                  link.click();
                                }}
                                style={{ padding: "0 4px", fontSize: 11 }}
                              >
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default PropertyDetail;
