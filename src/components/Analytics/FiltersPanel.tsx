import React, { useState, useEffect } from 'react';
import { Card, Form, Select, DatePicker, Button, Space, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { fetchInventoryCategories } from '../../services/inventory';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface FiltersPanelProps {
  filters: any;
  onFilterChange: (filters: any) => void;
  onReset: () => void;
  loading?: boolean;
}

const FiltersPanel: React.FC<FiltersPanelProps> = ({ 
  filters, 
  onFilterChange, 
  onReset, 
  loading = false 
}) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    // Fetch categories when shop_id is available
    if (filters.shop_id) {
      fetchInventoryCategories(filters.shop_id)
        .then(response => {
          setCategories(response.categories || []);
        })
        .catch(console.error);
    }
  }, [filters.shop_id]);

  useEffect(() => {
    // Update form when filters change
    form.setFieldsValue({
      dateRange: filters.start_date && filters.end_date 
        ? [dayjs(filters.start_date), dayjs(filters.end_date)] 
        : null,
      category: filters.category || undefined,
      sort_by: filters.sort_by || 'revenue',
      limit: filters.limit || 20
    });
  }, [filters, form]);

  const handleApply = (values: any) => {
    const newFilters = {
      ...filters,
      start_date: values.dateRange?.[0] ? values.dateRange[0].format('YYYY-MM-DD') : '',
      end_date: values.dateRange?.[1] ? values.dateRange[1].format('YYYY-MM-DD') : '',
      category: values.category || '',
      sort_by: values.sort_by || 'revenue',
      limit: values.limit || 20
    };
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleApply}
        initialValues={{
          sort_by: 'revenue',
          limit: 20
        }}
      >
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item label="Date Range" name="dateRange">
              <RangePicker 
                style={{ width: '100%' }}
                placeholder={['Start date', 'End date']}
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item label="Category" name="category">
              <Select 
                placeholder="All Categories"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  option?.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {categories.map(cat => (
                  <Option key={cat} value={cat}>{cat}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item label="Sort By" name="sort_by">
              <Select>
                <Option value="revenue">Revenue</Option>
                <Option value="quantity">Quantity</Option>
                <Option value="profit">Profit</Option>
                <Option value="margin">Profit Margin</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item label="Limit" name="limit">
              <Select>
                <Option value={10}>Top 10</Option>
                <Option value={20}>Top 20</Option>
                <Option value={50}>Top 50</Option>
                <Option value={100}>Top 100</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row>
          <Col span={24}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                icon={<SearchOutlined />}
                loading={loading}
              >
                Apply Filters
              </Button>
              <Button 
                onClick={handleReset}
                icon={<ReloadOutlined />}
              >
                Reset
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default FiltersPanel;
