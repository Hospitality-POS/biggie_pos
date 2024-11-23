import React, { useState } from 'react';
import {
    Button,
    ConfigProvider,
    FloatButton,
    Input,
    Typography,
    Card,
    Row,
    Col,
    Statistic,
    Table,
    Badge,
    Space,
} from "antd";
import { useNavigate } from 'react-router-dom';
import {
    ShoppingCartOutlined,
    ShopOutlined,
    TruckOutlined,
    TeamOutlined,
    ClockCircleOutlined,
    TableOutlined,
    DollarOutlined,
    WarningOutlined,
    ReloadOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

const Dashboard = () => {

    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    // Sample data
    const stats = {
        dailyOrders: 145,
        totalRevenue: 3245.50,
        activeOrders: 12,
        lowStock: 8,
        pendingDeliveries: 5,
        activeShifts: 4,
    };

    const recentOrders = [
        { key: '1', id: '#1234', table: 'Table 5', amount: 45.50, status: 'In Progress', time: '5m ago' },
        { key: '2', id: '#1233', table: 'Table 3', amount: 32.00, status: 'Completed', time: '15m ago' },
        { key: '3', id: '#1232', table: 'Table 8', amount: 78.25, status: 'Completed', time: '25m ago' },
    ];

    const orderColumns = [
        {
            title: 'Order ID',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: 'Table',
            dataIndex: 'table',
            key: 'table',
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount) => `$${amount.toFixed(2)}`,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Badge
                    status={status === 'In Progress' ? 'processing' : 'success'}
                    text={status}
                />
            ),
        },
        {
            title: 'Time',
            dataIndex: 'time',
            key: 'time',
        },
    ];

    const lowStockItems = [
        { key: '1', name: 'Coca Cola', current: 10, minimum: 20 },
        { key: '2', name: 'Burger Buns', current: 15, minimum: 30 },
        { key: '3', name: 'French Fries', current: 8, minimum: 25 },
    ];

    const stockColumns = [
        {
            title: 'Item Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Current Stock',
            dataIndex: 'current',
            key: 'current',
        },
        {
            title: 'Minimum Required',
            dataIndex: 'minimum',
            key: 'minimum',
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                <Badge status="error" text={`${record.current} remaining`} />
            ),
        },
    ];

    const quickAccessButtons = [
        { icon: <ShoppingCartOutlined />, text: 'Orders', route: '/orders', color: '#1890ff' },
        { icon: <ShopOutlined />, text: 'Inventory', route: '/inventory', color: '#52c41a' },
        { icon: <TruckOutlined />, text: 'Deliveries', route: '/inventory', color: '#722ed1' },
        { icon: <TeamOutlined />, text: 'Suppliers', route: '/suppliers', color: '#faad14' },
        { icon: <ClockCircleOutlined />, text: 'Shifts', route: '/employee-shift', color: '#eb2f96' },
        { icon: <TableOutlined />, text: 'Tables', route: '/table-settings', color: '#fa541c' },
    ];

    return (
        <ConfigProvider>
            <div style={{ padding: 24 }}>
                {/* Header */}
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                    <Title level={2}>Dashboard</Title>
                    <Space>
                        <Button type="primary" icon={<ReloadOutlined />}>
                            Refresh
                        </Button>
                        <Text>{new Date().toLocaleString()}</Text>
                    </Space>
                </Row>

                {/* Statistics Cards */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Today's Orders"
                                value={stats.dailyOrders}
                                prefix={<ShoppingCartOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Revenue"
                                value={stats.totalRevenue}
                                precision={2}
                                prefix={<DollarOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Active Orders"
                                value={stats.activeOrders}
                                prefix={<ShopOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Active Shifts"
                                value={stats.activeShifts}
                                prefix={<TeamOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Quick Access Buttons */}
                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                    {quickAccessButtons.map((button, index) => (
                        <Col xs={12} sm={8} lg={4} key={index}>
                            <Card
                                hoverable
                                style={{ textAlign: 'center' }}
                                onClick={() => navigate(button.route)}
                            >
                                <Space direction="vertical">
                                    {React.cloneElement(button.icon, {
                                        style: { fontSize: 24, color: button.color }
                                    })}
                                    <Text>{button.text}</Text>
                                </Space>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Recent Orders and Low Stock */}
                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                    <Col xs={24} lg={12}>
                        <Card title="Recent Orders" extra={<a href="#">View All</a>}>
                            <Table
                                columns={orderColumns}
                                dataSource={recentOrders}
                                pagination={false}
                                size="small"
                            />
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card
                            title={
                                <Space>
                                    <WarningOutlined style={{ color: '#ff4d4f' }} />
                                    Low Stock Alerts
                                </Space>
                            }
                            extra={<a href="#">View All</a>}
                        >
                            <Table
                                columns={stockColumns}
                                dataSource={lowStockItems}
                                pagination={false}
                                size="small"
                            />
                        </Card>
                    </Col>
                </Row>
            </div>
        </ConfigProvider>
    );
};

export default Dashboard;