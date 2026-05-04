import React from 'react';
import { Card, Typography, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

const LeaseManagement: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Title level={2}>Lease Management</Title>
          <Button type="primary" icon={<PlusOutlined />}>
            New Lease
          </Button>
        </Space>
      </div>

      <Card>
        <p>Lease management component will be implemented here.</p>
      </Card>
    </div>
  );
};

export default LeaseManagement;
