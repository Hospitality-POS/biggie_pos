import React, { useState, useEffect } from 'react';
import {
    Card, Row, Col, Button, Typography, Space, Modal, Form, Input, Alert,
    Avatar, Tag, message, Switch, Divider, Checkbox
} from 'antd';
import {
    CreditCardOutlined, CheckCircleOutlined, PlusOutlined, GlobalOutlined,
    ApiOutlined, SettingOutlined, StarOutlined, ThunderboltOutlined,
    EditOutlined, PoweroffOutlined, FileProtectOutlined, CalculatorOutlined,
    TeamOutlined
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTenantDetails, enableAccounting, disableAccounting, getCurrentTenantId } from "@services/tenants";
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
            //   'Targeted Campaigns',
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
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const [form] = Form.useForm();
    const [accountingForm] = Form.useForm();
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

    const configurePesapalMutation = useMutation({
        mutationFn: (configData) => isUpdatingConfig
            ? pesapalApi.updateConfigForCurrentTenant(configData)
            : pesapalApi.configureForCurrentTenant(configData),
        onSuccess: () => {
            message.success(isUpdatingConfig ? 'Pesapal updated!' : 'Pesapal configured!');
            queryClient.invalidateQueries(["pesapalConfig", tenantId]);
            setConfigModalVisible(false);
            setIsUpdatingConfig(false);
            form.resetFields();
        },
        onError: (error) => {
            message.error(`Failed: ${error.response?.data?.message || error.message}`);
        }
    });

    const togglePesapalStatusMutation = useMutation({
        mutationFn: (isActive) => pesapalApi.toggleStatusForCurrentTenant(isActive),
        onSuccess: (data, isActive) => {
            message.success(`Pesapal ${isActive ? 'enabled' : 'disabled'}!`);
            queryClient.invalidateQueries(["pesapalConfig", tenantId]);
        },
        onError: (error) => message.error('Toggle failed: ' + error.message)
    });

    const testConnectionMutation = useMutation({
        mutationFn: () => pesapalApi.testConnectionForCurrentTenant(),
        onSuccess: () => message.success('Connection test successful!'),
        onError: (error) => message.error('Test failed: ' + error.message)
    });

    const enableAccountingMutation = useMutation({
        mutationFn: async (values) => {
            const data = {
                terms_acceptance: {
                    accept_terms: values.accept_terms,
                    accept_charges: values.accept_charges
                }
            };
            return enableAccounting(tenantId, data);
        },
        onSuccess: (data) => {
            // message.success('Accounting enabled successfully!');
            refetchTenant();
            setAccountingModalVisible(false);
            accountingForm.resetFields();

            setTimeout(() => {
                window.location.reload();
            }, 1000);
        },
        onError: (error) => {
            const errorMsg = error?.response?.data?.error || error.message;
            message.error(`Failed: ${errorMsg}`);
        }
    });

    const disableAccountingMutation = useMutation({
        mutationFn: async () => {
            return disableAccounting(tenantId);
        },
        onSuccess: (data) => {
            message.success('Accounting disabled!');
            refetchTenant();

            setTimeout(() => {
                window.location.reload();
            }, 1000);
        },
        onError: (error) => {
            const errorMsg = error?.response?.data?.error || error.message;
            message.error(`Failed: ${errorMsg}`);
        }
    });

    useEffect(() => {
        if (configModalVisible && isUpdatingConfig && pesapalConfig?.data?.config) {
            setTimeout(() => {
                form.setFieldsValue({
                    consumer_key: pesapalConfig.data.config.consumer_key || '',
                    consumer_secret: pesapalConfig.data.config.consumer_secret || '',
                    is_sandbox: pesapalConfig.data.config.is_sandbox || false
                });
            }, 100);
        } else if (configModalVisible && !isUpdatingConfig) {
            setTimeout(() => {
                form.resetFields();
                form.setFieldsValue({ is_sandbox: true });
            }, 100);
        }
    }, [configModalVisible, isUpdatingConfig, pesapalConfig?.data?.config, form]);

    const handleEnableIntegration = (integration) => {
        if (integration.status === 'coming_soon') {
            message.info('Coming soon!');
            return;
        }
        if (integration.id === 'pesapal') {
            setIsUpdatingConfig(false);
            setConfigModalVisible(true);
        } else if (integration.id === 'relia_accounting') {
            setAccountingModalVisible(true);
        }
    };

    const handleToggleStatus = (integration, currentStatus) => {
        const newStatus = !currentStatus;
        Modal.confirm({
            title: `${newStatus ? 'Enable' : 'Disable'} ${integration.name}`,
            content: `Confirm ${newStatus ? 'enable' : 'disable'}?`,
            okText: `Yes, ${newStatus ? 'Enable' : 'Disable'}`,
            okType: newStatus ? 'primary' : 'danger',
            onOk: () => {
                if (integration.id === 'pesapal') {
                    togglePesapalStatusMutation.mutate(newStatus);
                } else if (integration.id === 'relia_accounting' && !newStatus) {
                    disableAccountingMutation.mutate();
                }
            }
        });
    };

    const renderIntegrationCard = (integration) => {
        const pesapalConfigExists = integration.id === 'pesapal' && pesapalConfig?.success && pesapalConfig?.data?.config;
        const isPesapalActive = pesapalConfigExists && pesapalConfig?.data?.config?.is_active;
        const accountingEnabled = integration.id === 'relia_accounting' &&
            tenantDetails?.data?.modules?.accounting &&
            tenantDetails?.data?.accounting_database?.enabled;

        const isConfigured = pesapalConfigExists || accountingEnabled;
        const isActive = isPesapalActive || accountingEnabled;
        const isComingSoon = integration.status === 'coming_soon';
        const IconComponent = integration.iconComponent;

        return (
            <Col xs={24} sm={12} lg={8} key={integration.id}>
                <Card
                    hoverable={!isComingSoon}
                    style={{
                        borderRadius: '12px',
                        border: isActive ? `2px solid ${integration.color}` : '1px solid #f0f0f0',
                        opacity: isComingSoon ? 0.7 : 1
                    }}
                    cover={
                        <div style={{
                            padding: '24px',
                            background: `linear-gradient(135deg, ${integration.color}20, ${integration.color}10)`,
                            textAlign: 'center',
                            minHeight: '120px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <Avatar size={64} icon={<IconComponent />} style={{ backgroundColor: integration.color, margin: '0 auto 12px' }} />
                            <Title level={4} style={{ margin: 0, color: integration.color }}>{integration.name}</Title>
                        </div>
                    }
                    actions={[
                        <Button type="link" onClick={() => { setSelectedIntegration(integration); setModalVisible(true); }} style={{ color: integration.color }} key="more">
                            Learn More
                        </Button>,
                        isComingSoon ? (
                            <Button disabled key="soon">Coming Soon</Button>
                        ) : !isConfigured ? (
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleEnableIntegration(integration)}
                                style={{ backgroundColor: integration.color, borderColor: integration.color }} key="enable">
                                Enable Now
                            </Button>
                        ) : (
                            <Space key="actions" size="small" wrap>
                                {integration.id === 'pesapal' && (
                                    <Button icon={<EditOutlined />} onClick={() => { setIsUpdatingConfig(true); setConfigModalVisible(true); }} size="small">
                                        Update
                                    </Button>
                                )}
                                <Button icon={<PoweroffOutlined />} onClick={() => handleToggleStatus(integration, isActive)}
                                    loading={integration.id === 'pesapal' ? togglePesapalStatusMutation.isPending : disableAccountingMutation.isPending}
                                    size="small" type={isActive ? 'default' : 'primary'}>
                                    {isActive ? 'Disable' : 'Enable'}
                                </Button>
                                {isActive && integration.id === 'pesapal' && (
                                    <Button icon={<ApiOutlined />} onClick={() => testConnectionMutation.mutate()}
                                        loading={testConnectionMutation.isPending} size="small">
                                        Test
                                    </Button>
                                )}
                            </Space>
                        )
                    ]}
                >
                    <div style={{ minHeight: '140px' }}>
                        <Space wrap style={{ marginBottom: '12px' }}>
                            <Tag color={integration.color}>{integration.category}</Tag>
                            {integration.tags.map(tag => <Tag key={tag} color={tag === 'Popular' ? 'gold' : 'default'}>{tag}</Tag>)}
                            {isConfigured && <Tag color="blue" icon={<SettingOutlined />}>Configured</Tag>}
                            {isActive && <Tag color="success" icon={<CheckCircleOutlined />}>Active</Tag>}
                        </Space>
                        <Paragraph ellipsis={{ rows: 3 }} style={{ marginBottom: '16px' }}>
                            {integration.description}
                        </Paragraph>
                        {!isComingSoon && (
                            <Space size="small" wrap>
                                <Text type="secondary"><StarOutlined style={{ color: '#faad14' }} /> {integration.rating}/5</Text>
                                <Text type="secondary">{integration.totalUsers} users</Text>
                                <Text type="secondary"><ThunderboltOutlined /> {integration.setupTime}</Text>
                            </Space>
                        )}
                    </div>
                </Card>
            </Col>
        );
    };

    const pesapalEnabled = pesapalConfig?.success && pesapalConfig?.data?.config?.is_active ? 1 : 0;
    const accountingEnabled = tenantDetails?.data?.modules?.accounting && tenantDetails?.data?.accounting_database?.enabled ? 1 : 0;
    const enabledCount = pesapalEnabled + accountingEnabled;

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <Title level={2} style={{ marginBottom: '8px' }}>
                    <GlobalOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                    Discover Integrations
                </Title>
                <Paragraph style={{ fontSize: '16px', color: '#666', maxWidth: '600px', margin: '0 auto' }}>
                    Enhance your POS with powerful integrations.
                </Paragraph>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
                <Col xs={24} sm={8}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                        <Text strong style={{ fontSize: '24px', color: '#1890ff' }}>2</Text>
                        <br /><Text type="secondary">Available Now</Text>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                        <Text strong style={{ fontSize: '24px', color: '#52c41a' }}>2</Text>
                        <br /><Text type="secondary">Coming Soon</Text>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                        <Text strong style={{ fontSize: '24px', color: '#f5222d' }}>{enabledCount}</Text>
                        <br /><Text type="secondary">Active</Text>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[24, 24]}>
                {availableIntegrations.map(renderIntegrationCard)}
            </Row>

            <Modal
                title={<Space><Avatar icon={selectedIntegration?.iconComponent ? <selectedIntegration.iconComponent /> : <SettingOutlined />}
                    style={{ backgroundColor: selectedIntegration?.color }} />{selectedIntegration?.name}</Space>}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                width={800}
                footer={[
                    <Button key="close" onClick={() => setModalVisible(false)}>Close</Button>,
                    selectedIntegration?.status !== 'coming_soon' && (
                        <Button key="add" type="primary" icon={<PlusOutlined />}
                            onClick={() => { setModalVisible(false); handleEnableIntegration(selectedIntegration); }}
                            style={{ backgroundColor: selectedIntegration?.color, borderColor: selectedIntegration?.color }}>
                            Enable
                        </Button>
                    )
                ]}
            >
                {selectedIntegration && (
                    <div>
                        <Paragraph>{selectedIntegration.longDescription}</Paragraph>
                        {selectedIntegration.status !== 'coming_soon' && (
                            <>
                                <Title level={5}>Features</Title>
                                <ul>{selectedIntegration.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
                                <Title level={5}>Benefits</Title>
                                <ul>{selectedIntegration.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Card size="small"><Text strong>Pricing:</Text><br /><Text>{selectedIntegration.pricing}</Text></Card>
                                    </Col>
                                    <Col span={12}>
                                        <Card size="small"><Text strong>Setup:</Text><br /><Text>{selectedIntegration.setupTime}</Text></Card>
                                    </Col>
                                </Row>
                            </>
                        )}
                    </div>
                )}
            </Modal>

            <Modal
                title={<Space><Avatar icon={<CreditCardOutlined />} style={{ backgroundColor: '#1890ff' }} />
                    {isUpdatingConfig ? 'Update Pesapal' : 'Configure Pesapal'}</Space>}
                open={configModalVisible}
                onCancel={() => { setConfigModalVisible(false); setIsUpdatingConfig(false); form.resetFields(); }}
                footer={null}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={(values) => configurePesapalMutation.mutate(values)}>
                    <Alert message="Pesapal Setup" description="Enter your merchant credentials from pesapal.com"
                        type="info" style={{ marginBottom: '24px' }} showIcon />
                    <Form.Item name="consumer_key" label="Consumer Key" rules={[{ required: true, message: 'Required' }]}>
                        <Input.Password placeholder="Consumer key" />
                    </Form.Item>
                    <Form.Item name="consumer_secret" label="Consumer Secret" rules={[{ required: true, message: 'Required' }]}>
                        <Input.Password placeholder="Consumer secret" />
                    </Form.Item>
                    <Form.Item name="is_sandbox" label="Environment" valuePropName="checked">
                        <Switch checkedChildren="Sandbox" unCheckedChildren="Production" />
                    </Form.Item>
                    <Divider />
                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => { setConfigModalVisible(false); form.resetFields(); }}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={configurePesapalMutation.isPending}>
                                {isUpdatingConfig ? 'Update' : 'Configure'}
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            <Modal
                title={<Space><Avatar icon={<CalculatorOutlined />} style={{ backgroundColor: '#52c41a' }} />Enable Accounting</Space>}
                open={accountingModalVisible}
                onCancel={() => { setAccountingModalVisible(false); accountingForm.resetFields(); }}
                footer={null}
                width={600}
            >
                <Form form={accountingForm} layout="vertical" onFinish={(values) => enableAccountingMutation.mutate(values)}
                    initialValues={{ accept_terms: false, accept_charges: false }}>
                    <Alert message="Enable Professional Accounting"
                        description="Auto-sync POS data and get complete financial visibility."
                        type="success" style={{ marginBottom: '16px' }} showIcon />

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

                    <Alert message="Pricing: KES 3,000/month" description="Additional charges may apply based on usage."
                        type="warning" style={{ marginBottom: '16px' }} showIcon />

                    <Form.Item name="accept_terms" valuePropName="checked"
                        rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject('Required') }]}>
                        <Checkbox>I accept the <a href="/terms" target="_blank">terms and conditions</a></Checkbox>
                    </Form.Item>

                    <Form.Item name="accept_charges" valuePropName="checked"
                        rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject('Required') }]}>
                        <Checkbox>I acknowledge that additional charges may apply</Checkbox>
                    </Form.Item>

                    <Divider />
                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => { setAccountingModalVisible(false); accountingForm.resetFields(); }}
                                disabled={enableAccountingMutation.isPending}>Cancel</Button>
                            <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}
                                loading={enableAccountingMutation.isPending}
                                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>
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