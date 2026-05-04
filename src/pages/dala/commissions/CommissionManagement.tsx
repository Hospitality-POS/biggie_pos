import React from 'react';
import { Card, Typography, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

const CommissionManagement: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Title level={2}>Commission Management</Title>
          <Button type="primary" icon={<PlusOutlined />}>
            New Commission
          </Button>
        </Space>
      </div>

      <Card>
        <p>Commission management component will be implemented here.</p>
      </Card>
    </div>
  );
};

export default CommissionManagement;
