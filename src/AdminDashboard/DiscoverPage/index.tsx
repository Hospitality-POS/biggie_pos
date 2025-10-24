import React, { useState, useEffect } from 'react';
import {
    Card, Row, Col, Button, Typography, Space, Modal, Form, Input, Alert,
    Avatar, Tag, message, Switch, Divider, Checkbox
} from 'antd';
import {
    CreditCardOutlined, CheckCircleOutlined, PlusOutlined, GlobalOutlined,
    ApiOutlined, SettingOutlined, StarOutlined, ThunderboltOutlined,
    EditOutlined, PoweroffOutlined, FileProtectOutlined, CalculatorOutlined,
    TeamOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchTenantDetails,
    enableAccounting,
    disableAccounting,
    enablePosIntegration,
    disablePosIntegration,
    getCurrentTenantId
} from "@services/tenants";
import pesapalApi from "@services/pesapalApi";

const { Title, Text, Paragraph } = Typography;

const availableIntegrations = [
    {
        id: 'relia_pos',
        name: 'Base Store',
        category: 'Point of Sale',
        description: 'Smart POS system for seamless sales, inventory, and customer management.',
        longDescription:
            'Relia POS enables businesses to manage sales, handle shift operations, send notifications, and sync data in real-time with Relia Accounting and other Relia Suite products.',
        features: [
            'Sales',
            'Shift Management',
            'Notifications',
            'Inventory Management',
            'Customer Profiles',
            'Multi-branch Support',
            'Reports Dashboard',
        ],
        benefits: [
            'Faster checkouts',
            'Accurate stock levels',
            'Better customer experience',
            'Centralized reporting',
        ],
        pricing: 'KES 3,000/month',
        setupTime: '2 minutes',
        rating: 4.8,
        totalUsers: '100+',
        status: 'available',
        iconComponent: CreditCardOutlined,
        color: '#1890ff',
        tags: ['Relia Suite', 'Popular', 'POS'],
        requirements: ['Business registration', 'Internet connection', 'Active subscription'],
    },
    {
        id: 'relia_accounting',
        name: 'Base Pesa',
        category: 'Accounting & Finance',
        description: 'Complete accounting solution integrated with your POS.',
        longDescription:
            'Comprehensive accounting for Relia POS. Auto-sync sales, track expenses, and generate professional financial reports.',
        features: [
            'Auto POS Sync',
            'Chart of Accounts',
            'Double-Entry Bookkeeping',
            'Financial Reports',
            'Bank Reconciliation',
            'Multi-user Access',
        ],
        benefits: [
            'Eliminate manual entry',
            'Real-time visibility',
            'Professional statements',
            'Better cash flow',
            'Tax-ready reports',
        ],
        pricing: 'KES 2,000/month',
        setupTime: '2 minutes',
        rating: 4.9,
        totalUsers: '2+',
        status: 'available',
        iconComponent: CalculatorOutlined,
        color: '#52c41a',
        tags: ['Relia Suite', 'Auto-sync'],
        requirements: ['Active POS subscription', 'Business registration', 'Internet connection'],
    },
    {
        id: 'relia_payroll',
        name: 'Base Team',
        category: 'Human Resource & Payroll',
        description: 'Automate salary calculations, payslips, and statutory deductions.',
        longDescription:
            'Relia Payroll helps you manage employee payments, statutory compliance (NHIF, NSSF, PAYE), and generate detailed reports seamlessly integrated with Relia Accounting and POS.',
        features: [
            'Payslip Generation',
            'NHIF/NSSF/PAYE Automation',
            'Leave Management',
            'Employee Database',
            'Integration with Accounting',
        ],
        benefits: [
            'Accurate payments',
            'Full compliance',
            'Reduced manual work',
            'Easy reporting',
            'HR efficiency',
        ],
        pricing: 'Coming Soon',
        setupTime: 'N/A',
        rating: 4.7,
        totalUsers: '—',
        status: 'coming_soon',
        iconComponent: FileProtectOutlined,
        color: '#faad14',
        tags: ['Relia Suite', 'Coming Soon'],
        requirements: ['Employee data', 'Company registration', 'HR approval'],
    },
    {
        id: 'relia_clients',
        name: 'Base Clients',
        category: 'Customer Relationship Management',
        description: 'Manage clients, loyalty programs, and personalized engagement.',
        longDescription:
            'Base Clients helps you manage customer data, track purchases, and reward loyalty with points and special offers. Designed to improve retention and build lasting customer relationships across your stores.',
        features: [
            'Client Database',
            'Loyalty Programs',
            'Reward Points Tracking',
            'Purchase History',
            'Integration with POS',
        ],
        benefits: [
            'Improved customer retention',
            'Boost repeat sales',
            'Personalized promotions',
            'Better customer insights',
        ],
        pricing: 'KES 1,500/month',
        setupTime: 'N/A',
        rating: 4.6,
        totalUsers: '—',
        status: 'coming_soon',
        iconComponent: TeamOutlined,
        color: '#722ed1',
        tags: ['Relia Suite', 'CRM', 'Coming Soon'],
        requirements: ['Customer data', 'Active POS account', 'Marketing consent'],
    },
];


const DiscoverPage = () => {
    const [selectedIntegration, setSelectedIntegration] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [accountingModalVisible, setAccountingModalVisible] = useState(false);
    const [posModalVisible, setPosModalVisible] = useState(false);
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const [form] = Form.useForm();
    const [accountingForm] = Form.useForm();
    const [posForm] = Form.useForm();
    const queryClient = useQueryClient();
    const tenantId = getCurrentTenantId();

    const { data: tenantDetails, refetch: refetchTenant } = useQuery({
        queryKey: ["tenant", tenantId],
        queryFn: () => fetchTenantDetails(tenantId),
        enabled: !!tenantId,
        refetchOnWindowFocus: false,
    });

    const { data: pesapalConfig } = useQuery({
        queryKey: ["pesapalConfig", tenantId],
        queryFn: () => pesapalApi.getConfig(tenantId),
        enabled: !!tenantId,
        refetchOnWindowFocus: false,
    });

    const getIntegrationStatus = (integrationId) => {
        if (!tenantDetails?.data) return 'not_enabled';

        const tenant = tenantDetails.data;

        switch (integrationId) {
            case 'relia_pos':
                return tenant.pos_integration?.enabled === true ? 'enabled' : 'not_enabled';

            case 'relia_accounting':
                return tenant.modules?.accounting === true &&
                    tenant.accounting_database?.enabled === true
                    ? 'enabled'
                    : 'not_enabled';

            case 'pesapal':
                return tenant.use_pesapal === true || pesapalConfig?.data?.enabled === true
                    ? 'enabled'
                    : 'not_enabled';

            default:
                return 'not_enabled';
        }
    };

    const enabledCount = availableIntegrations.filter(
        (int) => getIntegrationStatus(int.id) === 'enabled'
    ).length;

    const configurePesapalMutation = useMutation({
        mutationFn: (values) => pesapalApi.configure(tenantId, values),
        onSuccess: () => {
            message.success('Pesapal configured successfully');
            setConfigModalVisible(false);
            setIsUpdatingConfig(false);
            form.resetFields();
            queryClient.invalidateQueries(["pesapalConfig", tenantId]);
            queryClient.invalidateQueries(["tenant", tenantId]);
        },
        onError: (error) => {
            message.error(error.message || 'Failed to configure Pesapal');
        }
    });

    const enableAccountingMutation = useMutation({
        mutationFn: (values) => enableAccounting(tenantId, { terms_acceptance: values }),
        onSuccess: () => {
            message.success('Accounting enabled successfully');
            setAccountingModalVisible(false);
            accountingForm.resetFields();
            queryClient.invalidateQueries(["tenant", tenantId]);
            refetchTenant();
        },
        onError: (error) => {
            message.error(error.message || 'Failed to enable accounting');
        }
    });

    const disableAccountingMutation = useMutation({
        mutationFn: () => disableAccounting(tenantId),
        onSuccess: () => {
            message.success('Accounting disabled successfully');
            queryClient.invalidateQueries(["tenant", tenantId]);
            refetchTenant();
        },
        onError: (error) => {
            message.error(error.message || 'Failed to disable accounting');
        }
    });

    const enablePosMutation = useMutation({
        mutationFn: (config) => enablePosIntegration(tenantId, config),
        onSuccess: () => {
            message.success('POS integration enabled successfully');
            setPosModalVisible(false);
            posForm.resetFields();
            queryClient.invalidateQueries(["tenant", tenantId]);
            refetchTenant();
        },
        onError: (error) => {
            message.error(error.message || 'Failed to enable POS integration');
        }
    });

    const disablePosMutation = useMutation({
        mutationFn: () => disablePosIntegration(tenantId),
        onSuccess: () => {
            message.success('POS integration disabled successfully');
            queryClient.invalidateQueries(["tenant", tenantId]);
            refetchTenant();
        },
        onError: (error) => {
            message.error(error.message || 'Failed to disable POS integration');
        }
    });

    const handleEnableIntegration = (integration) => {
        const status = getIntegrationStatus(integration.id);

        if (status === 'enabled') {
            message.info(`${integration.name} is already enabled`);
            return;
        }

        if (integration.id === 'relia_pos') {
            setPosModalVisible(true);
            return;
        }

        if (integration.id === 'relia_accounting') {
            setAccountingModalVisible(true);
            return;
        }

        if (integration.id === 'pesapal') {
            setConfigModalVisible(true);
            setIsUpdatingConfig(false);
            return;
        }

        message.info('This integration will be available soon');
    };

    const handleDisableIntegration = (integrationId) => {
        if (integrationId === 'relia_accounting') {
            Modal.confirm({
                title: 'Disable Accounting?',
                content: 'This will stop auto-sync and hide accounting features. Your data will be preserved.',
                okText: 'Disable',
                okType: 'danger',
                onOk: () => disableAccountingMutation.mutate(),
            });
        } else if (integrationId === 'relia_pos') {
            Modal.confirm({
                title: 'Disable POS Integration?',
                content: 'This will stop the POS system integration. Are you sure?',
                okText: 'Disable',
                okType: 'danger',
                onOk: () => disablePosMutation.mutate(),
            });
        } else if (integrationId === 'pesapal') {
            Modal.confirm({
                title: 'Disable Pesapal?',
                content: 'This will stop payment processing through Pesapal. Are you sure?',
                okText: 'Disable',
                okType: 'danger',
                onOk: async () => {
                    try {
                        await pesapalApi.disable(tenantId);
                        message.success('Pesapal disabled successfully');
                        queryClient.invalidateQueries(["pesapalConfig", tenantId]);
                        queryClient.invalidateQueries(["tenant", tenantId]);
                    } catch (error) {
                        message.error('Failed to disable Pesapal');
                    }
                },
            });
        }
    };

    const openLearnMoreModal = (integration) => {
        setSelectedIntegration(integration);
        setModalVisible(true);
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <Title level={2}>
                    <ApiOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
                    Discover Integrations
                </Title>
                <Paragraph style={{ fontSize: '16px', color: '#595959' }}>
                    Enhance your business with powerful integrations from the Relia Suite.
                    Connect seamlessly and unlock new features to streamline your operations.
                </Paragraph>
                <Alert
                    message={`${enabledCount} integration${enabledCount !== 1 ? 's' : ''} enabled`}
                    type="info"
                    showIcon
                    style={{ marginTop: '16px' }}
                />
            </div>

            <Row gutter={[24, 24]}>
                {availableIntegrations.map((integration) => {
                    const IconComponent = integration.iconComponent;
                    const integrationStatus = getIntegrationStatus(integration.id);
                    const isEnabled = integrationStatus === 'enabled';

                    return (
                        <Col xs={24} sm={24} md={12} lg={8} key={integration.id}>
                            <Card
                                hoverable
                                style={{
                                    height: '100%',
                                    borderRadius: '12px',
                                    border: isEnabled ? `2px solid ${integration.color}` : undefined,
                                    boxShadow: isEnabled ? `0 4px 12px ${integration.color}30` : undefined,
                                }}
                            >
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Avatar
                                            size={56}
                                            icon={<IconComponent />}
                                            style={{ backgroundColor: integration.color }}
                                        />
                                        {isEnabled && (
                                            <Tag icon={<CheckCircleOutlined />} color="success">Enabled</Tag>
                                        )}
                                    </div>

                                    <div>
                                        <Title level={4} style={{ marginBottom: '4px' }}>{integration.name}</Title>
                                        <Text type="secondary" style={{ fontSize: '13px' }}>{integration.category}</Text>
                                    </div>

                                    <Paragraph
                                        ellipsis={{ rows: 3 }}
                                        style={{ marginBottom: '12px', minHeight: '60px' }}
                                    >
                                        {integration.description}
                                    </Paragraph>

                                    <Space wrap>
                                        {integration.tags.map((tag, index) => (
                                            <Tag key={index} color={index === 0 ? 'blue' : 'default'}>
                                                {tag}
                                            </Tag>
                                        ))}
                                    </Space>

                                    <Divider style={{ margin: '12px 0' }} />

                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text strong>Pricing:</Text>
                                            <Text>{integration.pricing}</Text>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text strong>Setup:</Text>
                                            <Text>{integration.setupTime}</Text>
                                        </div>
                                    </Space>

                                    <Space style={{ width: '100%', marginTop: '12px' }} direction="vertical">
                                        {isEnabled ? (
                                            <Button
                                                danger
                                                block
                                                icon={<PoweroffOutlined />}
                                                onClick={() => handleDisableIntegration(integration.id)}
                                            >
                                                Disable
                                            </Button>
                                        ) : (
                                            <Button
                                                type="primary"
                                                block
                                                icon={<PlusOutlined />}
                                                onClick={() => handleEnableIntegration(integration)}
                                                disabled={integration.status === 'coming_soon'}
                                                style={{ backgroundColor: integration.color, borderColor: integration.color }}
                                            >
                                                {integration.status === 'coming_soon' ? 'Coming Soon' : 'Enable'}
                                            </Button>
                                        )}
                                        <Button
                                            block
                                            icon={<InfoCircleOutlined />}
                                            onClick={() => openLearnMoreModal(integration)}
                                        >
                                            Learn More
                                        </Button>
                                    </Space>
                                </Space>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            {/* Learn More Modal */}
            <Modal
                title={null}
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    setSelectedIntegration(null);
                }}
                footer={null}
                width={700}
            >
                {selectedIntegration && (
                    <div>
                        <Space align="center" size="large" style={{ marginBottom: '24px' }}>
                            <Avatar
                                size={64}
                                icon={React.createElement(selectedIntegration.iconComponent)}
                                style={{ backgroundColor: selectedIntegration.color }}
                            />
                            <div>
                                <Title level={3} style={{ margin: 0 }}>{selectedIntegration.name}</Title>
                                <Text type="secondary">{selectedIntegration.category}</Text>
                            </div>
                        </Space>

                        {selectedIntegration.status === 'coming_soon' ? (
                            <Alert
                                message="Coming Soon!"
                                description="This integration is under development. Stay tuned for updates!"
                                type="warning"
                                showIcon
                                style={{ marginBottom: '24px' }}
                            />
                        ) : (
                            <>
                                <Paragraph style={{ fontSize: '15px', lineHeight: '1.8' }}>
                                    {selectedIntegration.longDescription}
                                </Paragraph>

                                <Title level={5}>Features:</Title>
                                <ul>{selectedIntegration.features.map((f, i) => <li key={i}>{f}</li>)}</ul>

                                <Title level={5}>Benefits:</Title>
                                <ul>{selectedIntegration.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Card size="small">
                                            <Text strong>Pricing:</Text><br />
                                            <Text>{selectedIntegration.pricing}</Text>
                                        </Card>
                                    </Col>
                                    <Col span={12}>
                                        <Card size="small">
                                            <Text strong>Setup:</Text><br />
                                            <Text>{selectedIntegration.setupTime}</Text>
                                        </Card>
                                    </Col>
                                </Row>
                            </>
                        )}
                    </div>
                )}
            </Modal>

            {/* Pesapal Configuration Modal */}
            <Modal
                title={
                    <Space>
                        <Avatar icon={<CreditCardOutlined />} style={{ backgroundColor: '#1890ff' }} />
                        {isUpdatingConfig ? 'Update Pesapal' : 'Configure Pesapal'}
                    </Space>
                }
                open={configModalVisible}
                onCancel={() => {
                    setConfigModalVisible(false);
                    setIsUpdatingConfig(false);
                    form.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={(values) => configurePesapalMutation.mutate(values)}
                >
                    <Alert
                        message="Pesapal Setup"
                        description="Enter your merchant credentials from pesapal.com"
                        type="info"
                        style={{ marginBottom: '24px' }}
                        showIcon
                    />
                    <Form.Item
                        name="consumer_key"
                        label="Consumer Key"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Input.Password placeholder="Consumer key" />
                    </Form.Item>
                    <Form.Item
                        name="consumer_secret"
                        label="Consumer Secret"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Input.Password placeholder="Consumer secret" />
                    </Form.Item>
                    <Form.Item
                        name="is_sandbox"
                        label="Environment"
                        valuePropName="checked"
                    >
                        <Switch checkedChildren="Sandbox" unCheckedChildren="Production" />
                    </Form.Item>
                    <Divider />
                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => {
                                setConfigModalVisible(false);
                                form.resetFields();
                            }}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={configurePesapalMutation.isPending}
                            >
                                {isUpdatingConfig ? 'Update' : 'Configure'}
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            {/* POS Enable Modal */}
            <Modal
                title={
                    <Space>
                        <Avatar icon={<CreditCardOutlined />} style={{ backgroundColor: '#1890ff' }} />
                        Enable POS Integration
                    </Space>
                }
                open={posModalVisible}
                onCancel={() => {
                    setPosModalVisible(false);
                    posForm.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={posForm}
                    layout="vertical"
                    onFinish={(values) => enablePosMutation.mutate(values)}
                    initialValues={{
                        auto_sync: true,
                        sync_interval: 3600000
                    }}
                >
                    <Alert
                        message="Enable POS Integration"
                        description="Connect your POS system with the accounting module for seamless data sync."
                        type="info"
                        style={{ marginBottom: '16px' }}
                        showIcon
                    />

                    <Card size="small" style={{ marginBottom: '16px', background: '#e6f7ff' }}>
                        <Title level={5} style={{ marginTop: 0 }}>What's Included:</Title>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            <li>Real-time sales sync</li>
                            <li>Inventory management</li>
                            <li>Customer data integration</li>
                            <li>Payment reconciliation</li>
                            <li>Multi-branch support</li>
                        </ul>
                    </Card>

                    <Form.Item
                        name="auto_sync"
                        label="Auto Sync"
                        valuePropName="checked"
                    >
                        <Switch checkedChildren="On" unCheckedChildren="Off" />
                    </Form.Item>

                    <Form.Item
                        name="sync_interval"
                        label="Sync Interval (milliseconds)"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Input type="number" placeholder="3600000 (1 hour)" />
                    </Form.Item>

                    <Divider />
                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button
                                onClick={() => {
                                    setPosModalVisible(false);
                                    posForm.resetFields();
                                }}
                                disabled={enablePosMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<CheckCircleOutlined />}
                                loading={enablePosMutation.isPending}
                                style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                            >
                                Enable POS
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            {/* Accounting Enable Modal */}
            <Modal
                title={
                    <Space>
                        <Avatar icon={<CalculatorOutlined />} style={{ backgroundColor: '#52c41a' }} />
                        Enable Accounting
                    </Space>
                }
                open={accountingModalVisible}
                onCancel={() => {
                    setAccountingModalVisible(false);
                    accountingForm.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={accountingForm}
                    layout="vertical"
                    onFinish={(values) => enableAccountingMutation.mutate(values)}
                    initialValues={{ accept_terms: false, accept_charges: false }}
                >
                    <Alert
                        message="Enable Professional Accounting"
                        description="Auto-sync POS data and get complete financial visibility."
                        type="success"
                        style={{ marginBottom: '16px' }}
                        showIcon
                    />

                    <Card size="small" style={{ marginBottom: '16px', background: '#f6ffed' }}>
                        <Title level={5} style={{ marginTop: 0 }}>What's Included:</Title>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            <li>Auto POS sync</li>
                            <li>Chart of accounts</li>
                            <li>Financial reports (P&L, Balance Sheet, Cash Flow)</li>
                            <li>Invoice & bill management</li>
                            <li>Bank reconciliation</li>
                            <li>Tax reports (eTIMS ready)</li>
                            <li>Multi-user access</li>
                        </ul>
                    </Card>

                    <Alert
                        message="Pricing: KES 3,000/month"
                        description="Additional charges may apply based on usage."
                        type="warning"
                        style={{ marginBottom: '16px' }}
                        showIcon
                    />

                    <Form.Item
                        name="accept_terms"
                        valuePropName="checked"
                        rules={[{
                            validator: (_, value) =>
                                value ? Promise.resolve() : Promise.reject('Required')
                        }]}
                    >
                        <Checkbox>
                            I accept the <a href="/terms" target="_blank">terms and conditions</a>
                        </Checkbox>
                    </Form.Item>

                    <Form.Item
                        name="accept_charges"
                        valuePropName="checked"
                        rules={[{
                            validator: (_, value) =>
                                value ? Promise.resolve() : Promise.reject('Required')
                        }]}
                    >
                        <Checkbox>I acknowledge that additional charges may apply</Checkbox>
                    </Form.Item>

                    <Divider />
                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button
                                onClick={() => {
                                    setAccountingModalVisible(false);
                                    accountingForm.resetFields();
                                }}
                                disabled={enableAccountingMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<CheckCircleOutlined />}
                                loading={enableAccountingMutation.isPending}
                                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                            >
                                Enable Accounting
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default DiscoverPage;