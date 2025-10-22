import React, { useState, useCallback } from 'react';
import {
    Card, Row, Col, Statistic, Typography, Space, Table, Empty,
    Button, Radio, DatePicker, message, Skeleton,
} from 'antd';
import {
    DollarOutlined, ArrowUpOutlined, ArrowDownOutlined, BankOutlined,
    TeamOutlined, ShoppingCartOutlined, FileTextOutlined, ReloadOutlined,
    CalendarOutlined, PieChartOutlined, CheckCircleOutlined,
    ThunderboltOutlined, RocketOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
    getAccountingDashboardData, getRecentTransactions,
    getCashFlowData, getProfitLossTrend,
} from '@services/accounting/dashboard';
import { fetchAllAccounts } from '@services/accounting/accounts';
import { reseedChartOfAccounts, getCurrentTenantId } from '@services/tenants';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const COLORS = {
    primary: '#1890ff', success: '#52c41a', warning: '#faad14',
    error: '#ff4d4f', purple: '#722ed1', orange: '#fa8c16',
    gray: '#8c8c8c',
};

const AccountingDashboard: React.FC = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const [periodFilter, setPeriodFilter] = useState('month');
    const [customDateRange, setCustomDateRange] = useState<any>([]);
    const [isReseeding, setIsReseeding] = useState(false);

    // Check if chart of accounts exists
    const { data: accountsData, isLoading: isAccountsLoading } = useQuery({
        queryKey: ['chartOfAccounts'],
        queryFn: () => fetchAllAccounts({}),
    });

    const accounts = accountsData?.data || [];
    const hasNoAccounts = !isAccountsLoading && accounts.length === 0;

    const handleReseed = async () => {
        const tenantId = getCurrentTenantId();
        if (!tenantId) return;

        setIsReseeding(true);
        try {
            await reseedChartOfAccounts(tenantId);
            messageApi.success('Chart of accounts activated successfully!');
        } catch (error) {
            messageApi.error('Failed to activate chart of accounts');
        } finally {
            setIsReseeding(false);
        }
    };

    const getDateRange = useCallback(() => {
        const today = dayjs();
        let startDate, endDate;

        switch (periodFilter) {
            case 'day':
                startDate = today.startOf('day');
                endDate = today.endOf('day');
                break;
            case 'week':
                startDate = today.startOf('week');
                endDate = today.endOf('week');
                break;
            case 'year':
                startDate = today.startOf('year');
                endDate = today.endOf('year');
                break;
            case 'custom':
                if (customDateRange?.length === 2) {
                    startDate = customDateRange[0].startOf('day');
                    endDate = customDateRange[1].endOf('day');
                } else {
                    startDate = today.startOf('month');
                    endDate = today.endOf('month');
                }
                break;
            default:
                startDate = today.startOf('month');
                endDate = today.endOf('month');
        }
        return { startDate, endDate };
    }, [periodFilter, customDateRange]);

    const { startDate, endDate } = getDateRange();

    const { data: dashboardData, isLoading: isDashboardLoading, refetch, isRefetching } = useQuery({
        queryKey: ['accountingDashboard', startDate.format(), endDate.format()],
        queryFn: () => getAccountingDashboardData({
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
        }),
        enabled: !hasNoAccounts,
    });

    const { data: transactionsData, isLoading: isTransactionsLoading } = useQuery({
        queryKey: ['recentTransactions'],
        queryFn: () => getRecentTransactions(10),
        enabled: !hasNoAccounts,
    });

    const dashboard = dashboardData?.data || {};
    const transactions = transactionsData?.data || [];
    const isDataLoading = isDashboardLoading || isRefetching;

    const transactionColumns = [
        { title: 'Type', dataIndex: 'type', key: 'type', width: 150 },
        { title: 'Reference', dataIndex: 'reference', key: 'reference' },
        { title: 'Customer/Vendor', dataIndex: 'party_name', key: 'party_name' },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: COLORS.success }}>
                    KES {amount?.toLocaleString() || '0.00'}
                </Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors: Record<string, string> = {
                    paid: COLORS.success, partial: COLORS.warning,
                    open: COLORS.primary, overdue: COLORS.error,
                };
                return (
                    <span style={{ color: colors[status] || '#000' }}>
                        {status?.charAt(0).toUpperCase() + status?.slice(1)}
                    </span>
                );
            },
        },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
    ];

    return (
        <>
            {contextHolder}

            {/* Premium Activation Banner */}
            {hasNoAccounts && (
                <Card
                    style={{
                        marginBottom: 24,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: 16,
                    }}
                    bodyStyle={{ padding: '32px 40px' }}
                >
                    <Row gutter={[32, 24]} align="middle">
                        <Col xs={24} md={16}>
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                <Space size="middle">
                                    <div style={{
                                        width: 56, height: 56,
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        borderRadius: 16,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <RocketOutlined style={{ fontSize: 28, color: '#fff' }} />
                                    </div>
                                    <div>
                                        <Title level={3} style={{ margin: 0, color: '#fff', fontWeight: 700 }}>
                                            Ready to Start Tracking Your Finances?
                                        </Title>
                                        <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16 }}>
                                            Activate your Chart of Accounts in seconds
                                        </Text>
                                    </div>
                                </Space>

                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    padding: '20px 24px',
                                    borderRadius: 12,
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                }}>
                                    <Text style={{ color: '#fff', fontSize: 15, lineHeight: 1.8 }}>
                                        We'll automatically set up 26 standard accounts including Assets, Liabilities,
                                        Equity, Revenue, and Expenses to start managing your financial records.
                                    </Text>

                                    <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
                                        {[
                                            { icon: <CheckCircleOutlined />, text: '26 Pre-configured Accounts' },
                                            { icon: <ThunderboltOutlined />, text: 'Instant Activation' },
                                            { icon: <BankOutlined />, text: 'Industry Standard' },
                                        ].map((item, idx) => (
                                            <Col xs={24} sm={8} key={idx}>
                                                <Space style={{ color: '#fff' }}>
                                                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                                                    <Text style={{ color: '#fff', fontWeight: 500 }}>
                                                        {item.text}
                                                    </Text>
                                                </Space>
                                            </Col>
                                        ))}
                                    </Row>
                                </div>
                            </Space>
                        </Col>

                        <Col xs={24} md={8}>
                            <div style={{
                                textAlign: 'center',
                                background: 'rgba(255, 255, 255, 0.15)',
                                padding: '32px 24px',
                                borderRadius: 16,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                            }}>
                                <Title level={4} style={{ color: '#fff', marginBottom: 24 }}>
                                    Get Started Now
                                </Title>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<RocketOutlined />}
                                    onClick={handleReseed}
                                    loading={isReseeding}
                                    style={{
                                        height: 56,
                                        fontSize: 16,
                                        fontWeight: 600,
                                        background: '#fff',
                                        color: '#667eea',
                                        border: 'none',
                                        borderRadius: 12,
                                        width: '100%',
                                    }}
                                >
                                    {isReseeding ? 'Activating...' : 'Activate Chart of Accounts'}
                                </Button>
                                <Text style={{
                                    display: 'block',
                                    marginTop: 16,
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    fontSize: 13,
                                }}>
                                    Takes less than 5 seconds
                                </Text>
                            </div>
                        </Col>
                    </Row>
                </Card>
            )}

            {/* Header */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0, fontWeight: 600 }}>
                        Accounting Overview
                    </Title>
                    <Text type="secondary" style={{ fontSize: 16 }}>
                        Financial Performance
                    </Text>
                </div>

                <Space wrap>
                    <Radio.Group
                        value={periodFilter}
                        onChange={(e) => setPeriodFilter(e.target.value)}
                        buttonStyle="solid"
                    >
                        <Radio.Button value="day">Day</Radio.Button>
                        <Radio.Button value="week">Week</Radio.Button>
                        <Radio.Button value="month">Month</Radio.Button>
                        <Radio.Button value="year">Year</Radio.Button>
                        <Radio.Button value="custom">Custom</Radio.Button>
                    </Radio.Group>

                    {periodFilter === 'custom' && (
                        <RangePicker
                            value={customDateRange}
                            onChange={(dates) => setCustomDateRange(dates)}
                            style={{ minWidth: 280 }}
                        />
                    )}

                    <Button
                        type="primary"
                        icon={<ReloadOutlined spin={isRefetching} />}
                        onClick={() => refetch()}
                        disabled={hasNoAccounts}
                    >
                        Refresh
                    </Button>
                </Space>
            </Row>

            {!hasNoAccounts ? (
                <>
                    {/* Overview Cards */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        {[
                            {
                                title: 'Total Revenue',
                                value: dashboard.total_revenue || 0,
                                icon: <DollarOutlined style={{ color: COLORS.success }} />,
                                suffix: <ArrowUpOutlined style={{ color: COLORS.success }} />,
                            },
                            {
                                title: 'Total Expenses',
                                value: dashboard.total_expenses || 0,
                                icon: <DollarOutlined style={{ color: COLORS.error }} />,
                                suffix: <ArrowDownOutlined style={{ color: COLORS.error }} />,
                            },
                            {
                                title: 'Net Profit',
                                value: dashboard.net_profit || 0,
                                icon: <DollarOutlined style={{ color: COLORS.primary }} />,
                            },
                            {
                                title: 'Cash Balance',
                                value: dashboard.cash_balance || 0,
                                icon: <BankOutlined style={{ color: COLORS.purple }} />,
                            },
                        ].map((item, idx) => (
                            <Col xs={24} sm={12} lg={6} key={idx}>
                                <Card loading={isDataLoading} style={{ borderRadius: 12 }}>
                                    <Statistic
                                        title={item.title}
                                        value={item.value}
                                        prefix={item.icon}
                                        suffix={item.suffix}
                                        precision={2}
                                    />
                                </Card>
                            </Col>
                        ))}
                    </Row>

                    {/* Summary Cards */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        {[
                            {
                                label: 'Accounts Receivable',
                                value: dashboard.accounts_receivable || 0,
                                icon: <TeamOutlined style={{ fontSize: 24, color: COLORS.primary }} />,
                                desc: `${dashboard.outstanding_invoices || 0} outstanding invoices`,
                            },
                            {
                                label: 'Accounts Payable',
                                value: dashboard.accounts_payable || 0,
                                icon: <ShoppingCartOutlined style={{ fontSize: 24, color: COLORS.error }} />,
                                desc: `${dashboard.pending_bills || 0} pending bills`,
                            },
                            {
                                label: 'Profit Margin',
                                value: `${dashboard.profit_margin || 0}%`,
                                icon: <DollarOutlined style={{ fontSize: 24, color: COLORS.success }} />,
                                desc: 'Net profit percentage',
                            },
                            {
                                label: 'Working Capital',
                                value: dashboard.working_capital || 0,
                                icon: <BankOutlined style={{ fontSize: 24, color: COLORS.purple }} />,
                                desc: 'AR minus AP',
                            },
                        ].map((item, idx) => (
                            <Col xs={24} sm={12} lg={6} key={idx}>
                                <Card loading={isDataLoading} style={{ borderRadius: 12 }}>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text type="secondary">{item.label}</Text>
                                            {item.icon}
                                        </div>
                                        <Statistic
                                            value={item.value}
                                            prefix={typeof item.value === 'number' ? 'KES' : ''}
                                            precision={typeof item.value === 'number' ? 2 : 0}
                                        />
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {item.desc}
                                        </Text>
                                    </Space>
                                </Card>
                            </Col>
                        ))}
                    </Row>

                    {/* Recent Transactions */}
                    <Card
                        title={
                            <Space>
                                <FileTextOutlined style={{ color: COLORS.primary }} />
                                <span>Recent Transactions</span>
                            </Space>
                        }
                        style={{ borderRadius: 12 }}
                    >
                        <Table
                            columns={transactionColumns}
                            dataSource={transactions}
                            loading={isTransactionsLoading}
                            pagination={{ pageSize: 10 }}
                            rowKey="_id"
                        />
                    </Card>
                </>
            ) : (
                <Empty
                    image={<BankOutlined style={{ fontSize: 64, color: COLORS.gray }} />}
                    description="Activate Chart of Accounts to start tracking finances"
                    style={{ padding: '80px 0' }}
                />
            )}
        </>
    );
};

export default AccountingDashboard;