import React from 'react';
import { Card, Typography, Button, Space } from 'antd';
import { DollarOutlined } from '@ant-design/icons';

const { Title } = Typography;

const RentCollection: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Title level={2}>Rent Collection</Title>
          <Button type="primary" icon={<DollarOutlined />}>
            Collect Rent
          </Button>
        </Space>
      </div>

      <Card>
        <p>Rent collection component will be implemented here.</p>
      </Card>
    </div>
  );
};

export default RentCollection;
