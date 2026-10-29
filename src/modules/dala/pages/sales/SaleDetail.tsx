import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title } = Typography;

const SaleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dala/sales')}
          >
            Back to Sales
          </Button>
        </Space>
      </div>

      <Card>
        <Title level={2}>Sale Detail - {id}</Title>
        <p>Sale details component will be implemented here.</p>
      </Card>
    </div>
  );
};

export default SaleDetail;
