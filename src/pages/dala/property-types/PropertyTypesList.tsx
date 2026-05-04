import React, { useState, useRef, useEffect } from 'react';
import { ProTable } from '@ant-design/pro-components';
import {
  Button,
  Space,
  Tag,
  Popconfirm,
  message,
  Modal,
  Form,
  Input,
  Select,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPropertyTypes, createPropertyType, updatePropertyType, deletePropertyType } from '@services/dala';

const { TextArea } = Input;

// Helper function to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

const PropertyTypesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [form] = Form.useForm();
  const actionRef = useRef();

  // Handle name change to auto-generate slug (only for new property types)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = generateSlug(name);
    // Only auto-generate slug if creating new property type (not editing)
    if (!editingType) {
      form.setFieldsValue({ slug });
    }
  };

  // Fetch property types
  const { data, isLoading } = useQuery({
    queryKey: ['property-types'],
    queryFn: () => fetchPropertyTypes({ status: 'active', limit: 100 }),
  });

  const propertyTypes = data?.data || [];

  // Create property type
  const createMutation = useMutation({
    mutationFn: createPropertyType,
    onSuccess: () => {
      message.success('Property type created successfully');
      setCreateModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['property-types'] });
    },
    onError: (error: any) => {
      message.error(error?.message || 'Failed to create property type');
    },
  });

  // Update property type
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePropertyType(id, data),
    onSuccess: () => {
      message.success('Property type updated successfully');
      setEditingType(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['property-types'] });
    },
    onError: (error: any) => {
      message.error(error?.message || 'Failed to update property type');
    },
  });

  // Delete property type
  const deleteMutation = useMutation({
    mutationFn: deletePropertyType,
    onSuccess: () => {
      message.success('Property type deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['property-types'] });
    },
    onError: (error: any) => {
      message.error(error?.message || 'Failed to delete property type');
    },
  });

  const handleCreate = () => {
    setEditingType(null);
    form.resetFields();
    setCreateModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingType(record);
    form.setFieldsValue(record);
    setCreateModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleSubmit = async (values: any) => {
    // Get shop_id and tenant_id from localStorage
    const tenantStr = localStorage.getItem('tenant');
    let tenantId = '';
    let shopId = '';
    
    try {
      const tenant = JSON.parse(tenantStr || '{}');
      tenantId = tenant._id || '';
      shopId = tenant.shop_id || '';
    } catch (error) {
      console.error('Error parsing tenant:', error);
    }

    const dataWithIds = {
      ...values,
      shop_id: shopId,
      tenant_id: tenantId,
    };

    if (editingType) {
      updateMutation.mutate({ id: editingType._id, data: dataWithIds });
    } else {
      createMutation.mutate(dataWithIds);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space>
          <ApartmentOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (text: string) => (
        <Tag color="blue">{text}</Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this property type?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              icon={<DeleteOutlined />}
              danger
              size="small"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <ProTable
        actionRef={actionRef}
        columns={columns}
        dataSource={propertyTypes}
        loading={isLoading}
        rowKey="_id"
        search={{
          labelWidth: 'auto',
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
        dateFormatter="string"
        headerTitle="Property Types"
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Add Property Type
          </Button>,
        ]}
      />

      <Modal
        title={editingType ? 'Edit Property Type' : 'Create Property Type'}
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
          setEditingType(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter property type name' }]}
          >
            <Input 
              placeholder="e.g., Apartment, House, Commercial" 
              onChange={handleNameChange}
            />
          </Form.Item>

          <Form.Item
            name="slug"
            label="Slug"
            rules={[{ required: true, message: 'Please enter slug' }]}
            extra={editingType ? "Editing existing slug" : "Auto-generated from name field"}
          >
            <Input 
              placeholder="e.g., apartment, house, commercial" 
              readOnly={!editingType}
              style={{ backgroundColor: !editingType ? '#f5f5f5' : 'white' }}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea
              rows={4}
              placeholder="Enter description for this property type"
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            initialValue="active"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setCreateModalVisible(false);
                  form.resetFields();
                  setEditingType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isLoading || updateMutation.isLoading}
              >
                {editingType ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PropertyTypesList;
