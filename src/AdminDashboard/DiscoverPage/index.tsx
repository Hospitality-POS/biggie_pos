import React, { useState, useEffect } from 'react';
import {
    Card,
    Row,
    Col,
    Button,
    Typography,
    Space,
    Badge,
    Modal,
    Form,
    Input,
    Alert,
    Avatar,
    Tag,
    Tooltip,
    message,
    Switch,
    Divider,
    Empty
} from 'antd';
import {
    CreditCardOutlined,
    CheckCircleOutlined,
    PlusOutlined,
    GlobalOutlined,
    ApiOutlined,
    SecurityScanOutlined,
    ShoppingCartOutlined,
    BankOutlined,
    PhoneOutlined,
    SettingOutlined,
    StarOutlined,
    ThunderboltOutlined,
    SafetyOutlined,
    RocketOutlined,
    DollarOutlined,
    UserOutlined,
    EditOutlined,
    PoweroffOutlined,
    RobotOutlined
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchTenantDetails,
    updateTenant,
    getCurrentTenantId,
} from "@services/tenants";
import pesapalApi from "@services/pesapalApi";

const { Title, Text, Paragraph } = Typography;

// Safe icon wrapper to prevent null icon issues
const SafeIcon = ({ icon, fallback = <SettingOutlined /> }) => {
    return icon || fallback;
};

// Available integrations/solutions data with safe icon handling
const availableIntegrations = [
    {
        id: 'pesapal',
        name: 'Pesapal',
        category: 'Payment Gateway',
        description: 'Accept mobile money, card payments, and bank transfers seamlessly in your POS system.',
        longDescription: 'Pesapal is Kenya\'s leading payment gateway that enables businesses to accept payments through multiple channels including M-Pesa, Airtel Money, Visa, Mastercard, and bank transfers. Perfect for retail, hospitality, and service businesses.',
        logo: 'https://pesapal.com/assets/img/pesapal-logo.png',
        features: [
            'Mobile Money Integration (M-Pesa, Airtel Money)',
            'Credit & Debit Card Processing',
            'Bank Transfer Support',
            'Real-time Payment Notifications',
            'Secure Payment Processing',
            'Multi-currency Support',
            'Detailed Transaction Reports',
            'Easy Integration'
        ],
        benefits: [
            'Increase sales with multiple payment options',
            'Reduce cash handling and theft risk',
            'Faster checkout process',
            'Automatic payment reconciliation',
            'Professional payment experience'
        ],
        pricing: 'Transaction-based fees starting from 3.5%',
        setupTime: '15 minutes',
        rating: 4.8,
        totalUsers: '50,000+',
        status: 'available',
        iconComponent: CreditCardOutlined,
        color: '#1890ff',
        tags: ['Popular', 'Secure', 'Local'],
        requirements: [
            'Valid business registration',
            'Active bank account',
            'KRA PIN certificate',
            'Business permit/license'
        ]
    },
    // Payment Solutions
    {
        id: 'mpesa_express',
        name: 'M-Pesa Express',
        category: 'Mobile Money',
        description: 'Direct M-Pesa integration for instant mobile payments.',
        longDescription: 'Coming soon - Direct integration with Safaricom M-Pesa for seamless mobile money transactions with real-time STK push notifications.',
        logo: '/mpesa-logo.png',
        features: ['Coming Soon'],
        benefits: ['Coming Soon'],
        pricing: 'Coming Soon',
        setupTime: 'TBA',
        rating: 0,
        totalUsers: 'Coming Soon',
        status: 'coming_soon',
        iconComponent: PhoneOutlined,
        color: '#52c41a',
        tags: ['Coming Soon', 'Mobile Money'],
        requirements: []
    },
    {
        id: 'paystack',
        name: 'Paystack',
        category: 'Payment Gateway',
        description: 'Modern payment infrastructure for African businesses.',
        longDescription: 'Paystack is a leading payment gateway that enables businesses across Africa to accept payments online and in-store. With support for local payment methods, cards, and bank transfers, Paystack provides a seamless payment experience.',
        logo: '/paystack-logo.png',
        features: [
            'Card Payment Processing',
            'Bank Transfer Support',
            'Mobile Money Integration',
            'Recurring Payment Support',
            'Multi-currency Transactions',
            'Advanced Fraud Detection',
            'Real-time Transaction Monitoring',
            'Developer-friendly APIs'
        ],
        benefits: [
            'Accept payments from customers across Africa',
            'Reduce payment failures with smart routing',
            'Comprehensive fraud protection',
            'Detailed analytics and reporting',
            'Easy integration and setup'
        ],
        pricing: 'Transaction fees from 1.5% + ₦100',
        setupTime: '10 minutes',
        rating: 4.7,
        totalUsers: '100,000+',
        status: 'coming_soon',
        iconComponent: CreditCardOutlined,
        color: '#0ea5e9',
        tags: ['Popular', 'African', 'Modern'],
        requirements: [
            'Valid business registration',
            'Active bank account',
            'Government-issued ID',
            'Business documentation'
        ]
    },
    // Banking Solutions
    {
        id: 'equity_bank',
        name: 'Equity Bank API',
        category: 'Banking',
        description: 'Direct bank integration for seamless banking services.',
        longDescription: 'Coming soon - Integration with Equity Bank for direct banking services, account management, and financial transactions.',
        logo: '/equity-logo.png',
        features: ['Coming Soon'],
        benefits: ['Coming Soon'],
        pricing: 'Coming Soon',
        setupTime: 'TBA',
        rating: 0,
        totalUsers: 'Coming Soon',
        status: 'coming_soon',
        iconComponent: BankOutlined,
        color: '#722ed1',
        tags: ['Coming Soon', 'Banking'],
        requirements: []
    },
    // Tax & Compliance
    {
        id: 'etims',
        name: 'eTIMS',
        category: 'Tax Compliance',
        description: 'Electronic Tax Invoice Management System integration.',
        longDescription: 'Coming soon - Seamless integration with Kenya Revenue Authority\'s eTIMS system for automated tax compliance, invoice generation, and real-time reporting.',
        logo: '/etims-logo.png',
        features: ['Coming Soon'],
        benefits: ['Coming Soon'],
        pricing: 'Coming Soon',
        setupTime: 'TBA',
        rating: 0,
        totalUsers: 'Coming Soon',
        status: 'coming_soon',
        iconComponent: SecurityScanOutlined,
        color: '#d4af37',
        tags: ['Coming Soon', 'Tax Compliance', 'KRA'],
        requirements: []
    },
    // Accounting Solutions
    {
        id: 'quickbooks',
        name: 'QuickBooks',
        category: 'Accounting',
        description: 'Sync your POS data with QuickBooks accounting software.',
        longDescription: 'Coming soon - Automatic synchronization of sales data, inventory, and financial records with QuickBooks for streamlined accounting and financial management.',
        logo: '/quickbooks-logo.png',
        features: ['Coming Soon'],
        benefits: ['Coming Soon'],
        pricing: 'Coming Soon',
        setupTime: 'TBA',
        rating: 0,
        totalUsers: 'Coming Soon',
        status: 'coming_soon',
        iconComponent: ShoppingCartOutlined,
        color: '#2ca01c',
        tags: ['Coming Soon', 'Accounting', 'Global'],
        requirements: []
    },
    {
        id: 'zoho',
        name: 'Zoho Books',
        category: 'Accounting',
        description: 'Integrate with Zoho Books for comprehensive business management.',
        longDescription: 'Coming soon - Connect your POS system with Zoho Books for automated accounting, inventory management, and comprehensive business analytics.',
        logo: '/zoho-logo.png',
        features: ['Coming Soon'],
        benefits: ['Coming Soon'],
        pricing: 'Coming Soon',
        setupTime: 'TBA',
        rating: 0,
        totalUsers: 'Coming Soon',
        status: 'coming_soon',
        iconComponent: GlobalOutlined,
        color: '#c7131f',
        tags: ['Coming Soon', 'Business Suite'],
        requirements: []
    },
    // Internal Solutions
    {
        id: 'petty_cash',
        name: 'Petty Cash Manager',
        category: 'Cash Management',
        description: 'Comprehensive petty cash tracking and management solution.',
        longDescription: 'Coming soon - Built-in petty cash management system for tracking small expenses, approvals workflow, and detailed reporting for better cash flow control.',
        logo: '/petty-cash-logo.png',
        features: ['Coming Soon'],
        benefits: ['Coming Soon'],
        pricing: 'Coming Soon',
        setupTime: 'TBA',
        rating: 0,
        totalUsers: 'Coming Soon',
        status: 'coming_soon',
        iconComponent: DollarOutlined,
        color: '#8b4513',
        tags: ['Coming Soon', 'Internal', 'Cash Flow'],
        requirements: []
    },
    {
        id: 'relia_payroll',
        name: 'Relia Payroll',
        category: 'HR & Payroll',
        description: 'Integrated payroll management system for your business.',
        longDescription: 'Coming soon - Comprehensive payroll solution integrated with your POS system for employee management, salary processing, tax calculations, and compliance reporting.',
        logo: '/relia-payroll-logo.png',
        features: ['Coming Soon'],
        benefits: ['Coming Soon'],
        pricing: 'Coming Soon',
        setupTime: 'TBA',
        rating: 0,
        totalUsers: 'Coming Soon',
        status: 'coming_soon',
        iconComponent: UserOutlined,
        color: '#6c1c2c',
        tags: ['Coming Soon', 'Relia Suite', 'Payroll'],
        requirements: []
    },
    {
        id: 'workpay',
        name: 'WorkPay',
        category: 'HR & Payroll',
        description: 'Modern payroll and HR management platform for African businesses.',
        longDescription: 'Coming soon - Integration with WorkPay\'s comprehensive HR and payroll platform, offering employee management, automated payroll processing, tax compliance, and workforce analytics.',
        logo: '/workpay-logo.png',
        features: ['Coming Soon'],
        benefits: ['Coming Soon'],
        pricing: 'Coming Soon',
        setupTime: 'TBA',
        rating: 0,
        totalUsers: 'Coming Soon',
        status: 'coming_soon',
        iconComponent: UserOutlined,
        color: '#4169e1',
        tags: ['Coming Soon', 'HR Platform', 'African'],
        requirements: []
    },
    // AI Assistant
    {
        id: 'relia_ai',
        name: 'Relia AI Assistant',
        category: 'AI & Analytics',
        description: 'Intelligent business assistant powered by AI for enhanced decision-making.',
        longDescription: 'Relia AI Assistant is an intelligent business companion that provides real-time insights, predictive analytics, and automated recommendations to optimize your business operations. Get instant answers to business questions and actionable insights.',
        logo: '/relia-ai-logo.png',
        features: [
            'Real-time Business Insights',
            'Predictive Sales Analytics',
            'Inventory Optimization Recommendations',
            'Customer Behavior Analysis',
            'Automated Report Generation',
            'Natural Language Queries',
            'Performance Trend Analysis',
            'Smart Alerts and Notifications'
        ],
        benefits: [
            'Make data-driven decisions faster',
            'Identify sales opportunities and trends',
            'Optimize inventory and reduce waste',
            'Understand customer preferences better',
            'Save time with automated insights'
        ],
        pricing: 'Starting from KES 2,000/month',
        setupTime: '5 minutes',
        rating: 4.9,
        totalUsers: '10,000+',
        status: 'coming_soon',
        iconComponent: RobotOutlined,
        color: '#ff4d4f',
        tags: ['AI-Powered', 'Analytics', 'Relia Suite'],
        requirements: [
            'Active POS system',
            'Minimum 3 months of transaction data',
            'Internet connection'
        ]
    }
];
const DiscoverPage = () => {
    const [selectedIntegration, setSelectedIntegration] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const tenantId = getCurrentTenantId();

    // Fetch tenant details
    const { data: tenantDetails } = useQuery({
        queryKey: ["tenant", tenantId],
        queryFn: () => fetchTenantDetails(tenantId),
        enabled: !!tenantId,
        refetchOnWindowFocus: false,
    });

    // Fetch Pesapal configuration status
    const { data: pesapalConfig, refetch: refetchPesapalConfig } = useQuery({
        queryKey: ["pesapalConfig", tenantId],
        queryFn: () => pesapalApi.getConfig(tenantId),
        enabled: !!tenantId,
        refetchOnWindowFocus: false,
    });

    // Configure/Update Pesapal mutation
    const configurePesapalMutation = useMutation({
        mutationFn: (configData) => {
            if (isUpdatingConfig) {
                // Use the updateConfigForCurrentTenant method
                return pesapalApi.updateConfigForCurrentTenant(configData);
            } else {
                // Use the configureForCurrentTenant method (no tenant_id needed)
                return pesapalApi.configureForCurrentTenant(configData);
            }
        },
        onSuccess: () => {
            message.success(isUpdatingConfig ? 'Pesapal updated successfully!' : 'Pesapal configured successfully!');
            queryClient.invalidateQueries(["pesapalConfig", tenantId]);
            setConfigModalVisible(false);
            setIsUpdatingConfig(false);
            form.resetFields();
        },
        onError: (error) => {
            console.error('Pesapal configuration error:', error);

            // Extract meaningful error message
            let errorMessage = 'Unknown error';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            message.error(`Failed to ${isUpdatingConfig ? 'update' : 'configure'} Pesapal: ${errorMessage}`);
        }
    });

    // Toggle Pesapal status mutation
    const togglePesapalStatusMutation = useMutation({
        mutationFn: (isActive) => pesapalApi.toggleStatusForCurrentTenant(isActive),
        onSuccess: (data, isActive) => {
            message.success(`Pesapal ${isActive ? 'enabled' : 'disabled'} successfully!`);
            queryClient.invalidateQueries(["pesapalConfig", tenantId]);
        },
        onError: (error) => {
            console.error('Toggle status error:', error);
            let errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            message.error('Failed to toggle Pesapal status: ' + errorMessage);
        }
    });

    // Test connection mutation
    const testConnectionMutation = useMutation({
        mutationFn: () => pesapalApi.testConnectionForCurrentTenant(),
        onSuccess: () => {
            message.success('Pesapal connection test successful!');
        },
        onError: (error) => {
            console.error('Test connection error:', error);
            let errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            message.error('Connection test failed: ' + errorMessage);
        }
    });

    // Delete Pesapal configuration mutation
    const deletePesapalMutation = useMutation({
        mutationFn: () => pesapalApi.deleteConfigForCurrentTenant(),
        onSuccess: () => {
            message.success('Pesapal integration removed successfully!');
            queryClient.invalidateQueries(["pesapalConfig", tenantId]);
        },
        onError: (error) => {
            console.error('Delete config error:', error);
            let errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            message.error('Failed to remove Pesapal: ' + errorMessage);
        }
    });

    // Effect to prefill form when opening config modal for updates
    useEffect(() => {
        console.log('useEffect triggered:', {
            configModalVisible,
            isUpdatingConfig,
            pesapalConfig: pesapalConfig?.data?.config
        });

        if (configModalVisible) {
            if (isUpdatingConfig && pesapalConfig?.data?.config) {
                const config = pesapalConfig.data.config;
                console.log('Setting form values with config:', config);

                // Set form values with a slight delay to ensure form is ready
                setTimeout(() => {
                    const formValues = {
                        consumer_key: config.consumer_key || '',
                        consumer_secret: config.consumer_secret || '',
                        is_sandbox: config.is_sandbox || false
                    };

                    console.log('Form values to set:', formValues);
                    form.setFieldsValue(formValues);
                }, 100);

            } else if (!isUpdatingConfig) {
                // Reset form for new configuration with a slight delay
                console.log('Resetting form for new configuration');
                setTimeout(() => {
                    form.resetFields();
                    form.setFieldsValue({
                        is_sandbox: true
                    });
                }, 100);
            }
        }
    }, [configModalVisible, isUpdatingConfig, pesapalConfig?.data?.config, form]);

    // Additional effect to handle form reset when modal closes
    useEffect(() => {
        if (!configModalVisible) {
            form.resetFields();
            setIsUpdatingConfig(false);
        }
    }, [configModalVisible, form]);

    const handleViewDetails = (integration) => {
        setSelectedIntegration(integration);
        setModalVisible(true);
    };

    const handleEnableIntegration = (integration) => {
        if (integration.status === 'coming_soon') {
            message.info('This integration is coming soon!');
            return;
        }

        if (integration.id === 'pesapal') {
            setSelectedIntegration(integration);
            setIsUpdatingConfig(false);
            setConfigModalVisible(true);
        }
    };

    const handleUpdateIntegration = (integration) => {
        if (integration.id === 'pesapal') {
            setSelectedIntegration(integration);
            setIsUpdatingConfig(true);
            setConfigModalVisible(true);
        }
    };

    const handleToggleIntegrationStatus = (integration, currentStatus) => {
        if (integration.id === 'pesapal') {
            const newStatus = !currentStatus;
            Modal.confirm({
                title: `${newStatus ? 'Enable' : 'Disable'} Pesapal Integration`,
                content: `Are you sure you want to ${newStatus ? 'enable' : 'disable'} Pesapal integration?`,
                okText: `Yes, ${newStatus ? 'Enable' : 'Disable'}`,
                okType: newStatus ? 'primary' : 'danger',
                cancelText: 'Cancel',
                onOk: () => {
                    togglePesapalStatusMutation.mutate(newStatus);
                }
            });
        }
    };

    const handleRemoveIntegration = (integration) => {
        if (integration.id === 'pesapal') {
            Modal.confirm({
                title: 'Remove Pesapal Integration',
                content: 'Are you sure you want to completely remove Pesapal integration? This will delete all configuration settings and cannot be undone.',
                okText: 'Yes, Remove',
                okType: 'danger',
                cancelText: 'Cancel',
                onOk: () => {
                    deletePesapalMutation.mutate();
                }
            });
        }
    };

    const handlePesapalConfig = async (values) => {
        try {
            console.log('Form submitted with values:', values);

            const configData = {
                ...values
            };

            console.log('Submitting config data:', configData);
            await configurePesapalMutation.mutateAsync(configData);
        } catch (error) {
            console.error('Pesapal configuration error:', error);
        }
    };

    const handleTestConnection = async (integration) => {
        if (integration.id === 'pesapal') {
            await testConnectionMutation.mutateAsync();
        }
    };

    const handleModalCancel = () => {
        console.log('Modal cancel clicked');
        setConfigModalVisible(false);
        setIsUpdatingConfig(false);
        form.resetFields();
    };

    const renderIntegrationCard = (integration) => {
        // Check Pesapal configuration status
        const pesapalConfigExists = integration.id === 'pesapal' &&
            pesapalConfig?.success &&
            pesapalConfig?.data?.config;

        const isPesapalActive = pesapalConfigExists && pesapalConfig?.data?.config?.is_active;
        const isPesapalConfigured = pesapalConfigExists;

        const isConfigured = isPesapalConfigured;
        const isActive = isPesapalActive;
        const isComingSoon = integration.status === 'coming_soon';

        // Safe icon rendering
        const IconComponent = integration.iconComponent || SettingOutlined;

        return (
            <Col xs={24} sm={12} lg={8} key={integration.id}>
                <Card
                    hoverable={!isComingSoon}
                    className={`integration-card ${isActive ? 'enabled' : ''} ${isComingSoon ? 'coming-soon' : ''}`}
                    style={{
                        transition: 'all 0.3s ease',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: isActive ? `2px solid ${integration.color}` : '1px solid #f0f0f0',
                        boxShadow: isActive ? `0 4px 12px ${integration.color}20` : undefined,
                        opacity: isComingSoon ? 0.7 : 1
                    }}
                    cover={
                        <div
                            style={{
                                padding: '24px',
                                background: `linear-gradient(135deg, ${integration.color}20, ${integration.color}10)`,
                                textAlign: 'center',
                                minHeight: '120px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                        >
                            <Avatar
                                size={64}
                                icon={<IconComponent />}
                                style={{
                                    backgroundColor: integration.color,
                                    marginBottom: '12px'
                                }}
                            />
                            <Title level={4} style={{ margin: 0, color: integration.color }}>
                                {integration.name}
                            </Title>
                        </div>
                    }
                    actions={[
                        <Button
                            type="link"
                            onClick={() => handleViewDetails(integration)}
                            style={{ color: integration.color }}
                            key="learn-more"
                        >
                            Learn More
                        </Button>,
                        isComingSoon ? (
                            <Button disabled key="coming-soon">
                                Coming Soon
                            </Button>
                        ) : !isConfigured ? (
                            // Not configured yet - show Add Integration button
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => handleEnableIntegration(integration)}
                                style={{ backgroundColor: integration.color, borderColor: integration.color }}
                                key="add-integration"
                            >
                                Add Integration
                            </Button>
                        ) : (
                            // Configured - show management actions
                            <Space key="management-actions" size="small" wrap>
                                <Button
                                    icon={<EditOutlined />}
                                    onClick={() => handleUpdateIntegration(integration)}
                                    size="small"
                                    title="Update Configuration"
                                >
                                    Update
                                </Button>
                                <Button
                                    icon={<PoweroffOutlined />}
                                    onClick={() => handleToggleIntegrationStatus(integration, isActive)}
                                    loading={togglePesapalStatusMutation.isPending}
                                    size="small"
                                    type={isActive ? 'default' : 'primary'}
                                    style={isActive ? {} : { backgroundColor: integration.color, borderColor: integration.color }}
                                    title={isActive ? 'Disable Integration' : 'Enable Integration'}
                                >
                                    {isActive ? 'Disable' : 'Enable'}
                                </Button>
                                {isActive && (
                                    <Button
                                        icon={<ApiOutlined />}
                                        onClick={() => handleTestConnection(integration)}
                                        loading={testConnectionMutation.isPending}
                                        size="small"
                                        title="Test Connection"
                                    >
                                        Test
                                    </Button>
                                )}
                                <Button
                                    danger
                                    onClick={() => handleRemoveIntegration(integration)}
                                    loading={deletePesapalMutation.isPending}
                                    size="small"
                                    title="Remove Integration"
                                >
                                    Remove
                                </Button>
                            </Space>
                        )
                    ]}
                >
                    <div style={{ minHeight: '140px' }}>
                        <div style={{ marginBottom: '12px' }}>
                            <Space wrap>
                                <Tag color={integration.color}>{integration.category}</Tag>
                                {integration.tags.map(tag => (
                                    <Tag key={tag} color={tag === 'Popular' ? 'gold' : 'default'}>
                                        {tag}
                                    </Tag>
                                ))}
                                {isConfigured && (
                                    <Tag color="blue" icon={<SettingOutlined />}>
                                        Configured
                                    </Tag>
                                )}
                                {isActive && (
                                    <Tag color="success" icon={<CheckCircleOutlined />}>
                                        Active
                                    </Tag>
                                )}
                                {isConfigured && !isActive && (
                                    <Tag color="warning" icon={<PoweroffOutlined />}>
                                        Disabled
                                    </Tag>
                                )}
                            </Space>
                        </div>

                        <Paragraph
                            ellipsis={{ rows: 3, tooltip: integration.description }}
                            style={{ marginBottom: '16px' }}
                        >
                            {integration.description}
                        </Paragraph>

                        <div style={{ marginTop: 'auto' }}>
                            {!isComingSoon && (
                                <Space size="small" wrap>
                                    <Text type="secondary">
                                        <StarOutlined style={{ color: '#faad14' }} /> {integration.rating}/5
                                    </Text>
                                    <Text type="secondary">
                                        {integration.totalUsers} users
                                    </Text>
                                    <Text type="secondary">
                                        <ThunderboltOutlined /> {integration.setupTime} setup
                                    </Text>
                                </Space>
                            )}
                        </div>
                    </div>
                </Card>
            </Col>
        );
    };

    // Count enabled integrations based on Pesapal config only
    const enabledCount = pesapalConfig?.success && pesapalConfig?.data?.config?.is_active ? 1 : 0;
    const configuredCount = pesapalConfig?.success && pesapalConfig?.data?.config ? 1 : 0;

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <Title level={2} style={{ marginBottom: '8px' }}>
                    <GlobalOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                    Discover Integrations
                </Title>
                <Paragraph style={{ fontSize: '16px', color: '#666', maxWidth: '600px', margin: '0 auto' }}>
                    Enhance your POS system with powerful integrations. Connect with payment gateways,
                    banking services, and other business tools to streamline your operations.
                </Paragraph>
            </div>

            {/* Stats Bar */}
            <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
                <Col xs={24} sm={6}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                        <Space direction="vertical" size="small">
                            <Text strong style={{ fontSize: '24px', color: '#1890ff' }}>1</Text>
                            <Text type="secondary">Available Now</Text>
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                        <Space direction="vertical" size="small">
                            <Text strong style={{ fontSize: '24px', color: '#52c41a' }}>8</Text>
                            <Text type="secondary">Coming Soon</Text>
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                        <Space direction="vertical" size="small">
                            <Text strong style={{ fontSize: '24px', color: '#722ed1' }}>{configuredCount}</Text>
                            <Text type="secondary">Configured</Text>
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                        <Space direction="vertical" size="small">
                            <Text strong style={{ fontSize: '24px', color: '#f5222d' }}>{enabledCount}</Text>
                            <Text type="secondary">Currently Active</Text>
                        </Space>
                    </Card>
                </Col>
            </Row>

            {/* Current Tenant Info */}
            {tenantDetails?.data && (
                <Card style={{ marginBottom: '24px', background: '#f9f9f9' }} size="small">
                    <Space wrap>
                        <Text strong>Current Tenant:</Text>
                        <Text>{tenantDetails.data.name}</Text>
                        <Text type="secondary">({tenantDetails.data.tenant_code})</Text>
                        {pesapalConfig?.success && pesapalConfig?.data?.config && (
                            <>
                                <Tag color="blue" icon={<SettingOutlined />}>
                                    Pesapal Configured
                                </Tag>
                                {pesapalConfig?.data?.config?.is_active ? (
                                    <Tag color="success" icon={<CheckCircleOutlined />}>
                                        Pesapal Active
                                    </Tag>
                                ) : (
                                    <Tag color="warning" icon={<PoweroffOutlined />}>
                                        Pesapal Disabled
                                    </Tag>
                                )}
                            </>
                        )}
                    </Space>
                </Card>
            )}

            {/* Integrations Grid */}
            <Row gutter={[24, 24]}>
                {availableIntegrations.map(renderIntegrationCard)}
            </Row>

            {/* Integration Details Modal */}
            <Modal
                title={
                    <Space>
                        <Avatar
                            icon={selectedIntegration?.iconComponent ? <selectedIntegration.iconComponent /> : <SettingOutlined />}
                            style={{ backgroundColor: selectedIntegration?.color }}
                        />
                        {selectedIntegration?.name}
                    </Space>
                }
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                width={800}
                footer={[
                    <Button key="close" onClick={() => setModalVisible(false)}>
                        Close
                    </Button>,
                    selectedIntegration?.status !== 'coming_soon' && (
                        <Button
                            key="add"
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setModalVisible(false);
                                handleEnableIntegration(selectedIntegration);
                            }}
                            style={{
                                backgroundColor: selectedIntegration?.color,
                                borderColor: selectedIntegration?.color
                            }}
                        >
                            Add Integration
                        </Button>
                    )
                ]}
            >
                {selectedIntegration && (
                    <div>
                        <div style={{ marginBottom: '24px' }}>
                            <Space wrap style={{ marginBottom: '16px' }}>
                                <Tag color={selectedIntegration.color}>{selectedIntegration.category}</Tag>
                                {selectedIntegration.tags.map(tag => (
                                    <Tag key={tag} color={tag === 'Popular' ? 'gold' : 'default'}>
                                        {tag}
                                    </Tag>
                                ))}
                            </Space>
                            <Paragraph>{selectedIntegration.longDescription}</Paragraph>
                        </div>

                        {selectedIntegration.status !== 'coming_soon' && (
                            <>
                                <Title level={4}>Key Features</Title>
                                <ul style={{ marginBottom: '24px' }}>
                                    {selectedIntegration.features.map((feature, index) => (
                                        <li key={index}>{feature}</li>
                                    ))}
                                </ul>

                                <Title level={4}>Benefits</Title>
                                <ul style={{ marginBottom: '24px' }}>
                                    {selectedIntegration.benefits.map((benefit, index) => (
                                        <li key={index}>{benefit}</li>
                                    ))}
                                </ul>

                                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                                    <Col span={12}>
                                        <Card size="small">
                                            <Text strong>Pricing:</Text>
                                            <br />
                                            <Text>{selectedIntegration.pricing}</Text>
                                        </Card>
                                    </Col>
                                    <Col span={12}>
                                        <Card size="small">
                                            <Text strong>Setup Time:</Text>
                                            <br />
                                            <Text>{selectedIntegration.setupTime}</Text>
                                        </Card>
                                    </Col>
                                </Row>

                                {selectedIntegration.requirements.length > 0 && (
                                    <>
                                        <Title level={4}>Requirements</Title>
                                        <ul>
                                            {selectedIntegration.requirements.map((req, index) => (
                                                <li key={index}>{req}</li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}
            </Modal>

            {/* Pesapal Configuration Modal */}
            <Modal
                title={
                    <Space>
                        <Avatar
                            icon={<CreditCardOutlined />}
                            style={{ backgroundColor: '#1890ff' }}
                        />
                        {isUpdatingConfig ? 'Update Pesapal Configuration' : 'Configure Pesapal Integration'}
                    </Space>
                }
                open={configModalVisible}
                onCancel={handleModalCancel}
                footer={null}
                width={600}
                destroyOnClose={false}
                maskClosable={false}
                forceRender={true}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handlePesapalConfig}
                    preserve={false}
                    key={`pesapal-form-${isUpdatingConfig ? 'update' : 'create'}`}
                >
                    <Alert
                        message={isUpdatingConfig ? "Update Pesapal Configuration" : "Pesapal Integration Setup"}
                        description={
                            isUpdatingConfig
                                ? "Update your Pesapal configuration settings below. Changes will take effect immediately."
                                : "You'll need your Pesapal merchant account credentials. Visit pesapal.com to create an account if you don't have one."
                        }
                        type={isUpdatingConfig ? "warning" : "info"}
                        style={{ marginBottom: '24px' }}
                        showIcon
                    />

                    {/* Show current configuration status for updates */}
                    {isUpdatingConfig && pesapalConfig?.data?.config && (
                        <Card size="small" style={{ marginBottom: '16px', background: '#f6ffed' }}>
                            <Space direction="vertical" size="small">
                                <Text strong>Current Status:</Text>
                                <Space wrap>
                                    <Tag color={pesapalConfig.data.config.is_active ? 'success' : 'warning'}>
                                        {pesapalConfig.data.config.is_active ? 'Active' : 'Disabled'}
                                    </Tag>
                                    <Tag color={pesapalConfig.data.config.is_sandbox ? 'orange' : 'blue'}>
                                        {pesapalConfig.data.config.is_sandbox ? 'Sandbox' : 'Production'}
                                    </Tag>
                                    {pesapalConfig.data.config.updatedAt && (
                                        <Text type="secondary">
                                            Last updated: {new Date(pesapalConfig.data.config.updatedAt).toLocaleDateString()}
                                        </Text>
                                    )}
                                </Space>
                            </Space>
                        </Card>
                    )}

                    <Form.Item
                        name="consumer_key"
                        label="Consumer Key"
                        rules={[{ required: true, message: 'Please enter your consumer key' }]}
                        tooltip="Your Pesapal merchant consumer key from your Pesapal dashboard"
                    >
                        <Input.Password
                            placeholder="Enter your Pesapal consumer key"
                            autoComplete="new-password"
                            visibilityToggle
                        />
                    </Form.Item>

                    <Form.Item
                        name="consumer_secret"
                        label="Consumer Secret"
                        rules={[{ required: true, message: 'Please enter your consumer secret' }]}
                        tooltip="Your Pesapal merchant consumer secret from your Pesapal dashboard"
                    >
                        <Input.Password
                            placeholder="Enter your Pesapal consumer secret"
                            autoComplete="new-password"
                            visibilityToggle
                        />
                    </Form.Item>

                    <Form.Item
                        name="is_sandbox"
                        label="Environment"
                        valuePropName="checked"
                        tooltip="Use sandbox for testing with demo credentials. Switch to production when ready to accept real payments."
                    >
                        <Switch
                            checkedChildren="Sandbox"
                            unCheckedChildren="Production"
                        />
                    </Form.Item>

                    {/* Show environment-specific information */}
                    <Form.Item noStyle shouldUpdate={(prevValues, currentValues) =>
                        prevValues.is_sandbox !== currentValues.is_sandbox
                    }>
                        {({ getFieldValue }) => {
                            const isSandbox = getFieldValue('is_sandbox');
                            return (
                                <Alert
                                    message={isSandbox ? 'Sandbox Environment' : 'Production Environment'}
                                    description={
                                        isSandbox
                                            ? 'You can use demo credentials for testing. No real money will be processed.'
                                            : 'Real payments will be processed. Ensure you have valid production credentials.'
                                    }
                                    type={isSandbox ? 'info' : 'warning'}
                                    style={{ marginBottom: '24px' }}
                                    showIcon
                                />
                            );
                        }}
                    </Form.Item>

                    <Divider />

                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button
                                onClick={handleModalCancel}
                                disabled={configurePesapalMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={isUpdatingConfig ? <EditOutlined /> : <CheckCircleOutlined />}
                                loading={configurePesapalMutation.isPending}
                                style={{ minWidth: '120px' }}
                            >
                                {isUpdatingConfig ? 'Update Configuration' : 'Configure Pesapal'}
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>



            {/* Custom CSS Styles */}
            <style jsx>{`
                .integration-card {
                    transition: all 0.3s ease;
                }
                
                .integration-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
                }
                
                .integration-card.enabled {
                    position: relative;
                    overflow: visible;
                }
                
                .integration-card.enabled::before {
                    content: '';
                    position: absolute;
                    top: -2px;
                    left: -2px;
                    right: -2px;
                    bottom: -2px;
                    background: linear-gradient(45deg, #1890ff, #52c41a);
                    border-radius: 14px;
                    z-index: -1;
                    opacity: 0.1;
                }
                
                .integration-card.coming-soon {
                    position: relative;
                }
                
                .integration-card.coming-soon::after {
                    content: 'Coming Soon';
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: #faad14;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: bold;
                    z-index: 1;
                }
                
                .ant-card-actions {
                    border-top: 1px solid #f0f0f0;
                }
                
                .ant-card-actions > li {
                    margin: 8px 0;
                }
                
                .ant-form-item-explain {
                    margin-top: 4px;
                }
                
                .ant-alert {
                    border-radius: 8px;
                }
                
                .ant-tag {
                    border-radius: 4px;
                    margin: 2px;
                }
                
                @media (max-width: 768px) {
                    .integration-card .ant-card-actions {
                        flex-direction: column;
                    }
                    
                    .integration-card .ant-card-actions > li {
                        width: 100%;
                        margin: 4px 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default DiscoverPage;