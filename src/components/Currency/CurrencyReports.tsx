import React, { useState } from 'react';
import { 
    Card, Table, DatePicker, Button, Space, Typography, 
    Select, Row, Col, Statistic, Tag,
    Tabs
} from 'antd';
import { 
    DollarOutlined, SwapOutlined, BarChartOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
    useCurrency, 
    CurrencyDisplay, 
    CurrencyBadge, 
    ExchangeRateIndicator
} from './index';
import { ExchangeRate } from '@services/currency';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Mock data types - replace with actual API calls
interface CurrencyBalanceData {
    currency: string;
    balance: number;
    accounts_count: number;
}

interface GainLossData {
    currency: string;
    unrealized_gain_loss: number;
    revalued_balance: number;
    original_balance: number;
}

interface TrialBalanceData {
    account_code: string;
    account_name: string;
    currency: string;
    debit: number;
    credit: number;
    balance: number;
}

// Currency Balance Summary Report
export const CurrencyBalanceSummary: React.FC<{
    date?: string;
    refreshable?: boolean;
}> = ({ date, refreshable = true }) => {
    const { currencies } = useCurrency();
    const [selectedDate, setSelectedDate] = useState(date || dayjs().format('YYYY-MM-DD'));

    // Mock API call - replace with actual implementation
    const { data: balanceData = [], isLoading, refetch } = useQuery({
        queryKey: ['currency-balance-summary', selectedDate],
        queryFn: async (): Promise<CurrencyBalanceData[]> => {
            // This should be replaced with actual API call
            return currencies.map(currency => ({
                currency: currency.code,
                balance: Math.random() * 1000000,
                accounts_count: Math.floor(Math.random() * 10) + 1,
            }));
        },
        enabled: !!selectedDate,
    });

    const columns = [
        {
            title: 'Currency',
            dataIndex: 'currency',
            key: 'currency',
            render: (currency: string) => <CurrencyBadge currency={currency} />,
        },
        {
            title: 'Balance',
            dataIndex: 'balance',
            key: 'balance',
            render: (balance: number, record: CurrencyBalanceData) => (
                <CurrencyDisplay 
                    amount={balance} 
                    currency={record.currency}
                    showBaseCurrency={true}
                />
            ),
        },
        {
            title: 'Accounts',
            dataIndex: 'accounts_count',
            key: 'accounts_count',
            render: (count: number) => `${count} accounts`,
        },
    ];

    return (
        <Card
            title={
                <Space>
                    <DollarOutlined />
                    Currency Balance Summary
                </Space>
            }
            extra={
                refreshable && (
                    <Space>
                        <DatePicker
                            value={dayjs(selectedDate)}
                            onChange={(date) => setSelectedDate(date?.format('YYYY-MM-DD') || '')}
                            format="DD MMM YYYY"
                        />
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={() => refetch()}
                            loading={isLoading}
                        >
                            Refresh
                        </Button>
                    </Space>
                )
            }
        >
            <Table
                dataSource={balanceData}
                columns={columns}
                loading={isLoading}
                rowKey="currency"
                pagination={false}
                size="small"
            />
        </Card>
    );
};

// Exchange Rate History Report
export const ExchangeRateHistory: React.FC<{
    fromCurrency?: string;
    toCurrency?: string;
    dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
}> = ({ fromCurrency, toCurrency, dateRange }) => {
    const { currencies, latestRates } = useCurrency();
    const [selectedFromCurrency, setSelectedFromCurrency] = useState(fromCurrency);
    const [selectedToCurrency, setSelectedToCurrency] = useState(toCurrency);
    const [selectedDateRange, setSelectedDateRange] = useState(dateRange);

    // Mock API call - replace with actual implementation
    const { data: rateHistory = [], isLoading } = useQuery({
        queryKey: ['exchange-rate-history', selectedFromCurrency, selectedToCurrency, selectedDateRange],
        queryFn: async (): Promise<ExchangeRate[]> => {
            // This should be replaced with actual API call
            return latestRates.filter(rate => 
                (!selectedFromCurrency || rate.from_currency === selectedFromCurrency) &&
                (!selectedToCurrency || rate.to_currency === selectedToCurrency)
            );
        },
        enabled: !!(selectedFromCurrency && selectedToCurrency),
    });

    const columns = [
        {
            title: 'Date',
            dataIndex: 'rate_date',
            key: 'rate_date',
            render: (date: string) => dayjs(date).format('DD MMM YYYY'),
        },
        {
            title: 'From',
            dataIndex: 'from_currency',
            key: 'from_currency',
            render: (currency: string) => <CurrencyBadge currency={currency} size="small" />,
        },
        {
            title: 'To',
            dataIndex: 'to_currency',
            key: 'to_currency',
            render: (currency: string) => <CurrencyBadge currency={currency} size="small" />,
        },
        {
            title: 'Rate',
            dataIndex: 'rate',
            key: 'rate',
            render: (rate: number, record: ExchangeRate) => (
                <ExchangeRateIndicator
                    fromCurrency={record.from_currency}
                    toCurrency={record.to_currency}
                    rate={rate}
                />
            ),
        },
        {
            title: 'Source',
            dataIndex: 'source',
            key: 'source',
            render: (source: string) => (
                <Tag color={source === 'manual' ? 'default' : 'blue'}>
                    {source.toUpperCase()}
                </Tag>
            ),
        },
    ];

    return (
        <Card
            title={
                <Space>
                    <SwapOutlined />
                    Exchange Rate History
                </Space>
            }
            extra={
                <Space>
                    <Select
                        placeholder="From Currency"
                        value={selectedFromCurrency}
                        onChange={setSelectedFromCurrency}
                        style={{ width: 120 }}
                        allowClear
                    >
                        {currencies.map(currency => (
                            <Option key={currency.code} value={currency.code}>
                                {currency.code}
                            </Option>
                        ))}
                    </Select>
                    <Select
                        placeholder="To Currency"
                        value={selectedToCurrency}
                        onChange={setSelectedToCurrency}
                        style={{ width: 120 }}
                        allowClear
                    >
                        {currencies.map(currency => (
                            <Option key={currency.code} value={currency.code}>
                                {currency.code}
                            </Option>
                        ))}
                    </Select>
                    <RangePicker
                        value={selectedDateRange}
                        onChange={setSelectedDateRange}
                        format="DD MMM YYYY"
                    />
                </Space>
            }
        >
            <Table
                dataSource={rateHistory}
                columns={columns}
                loading={isLoading}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
                size="small"
            />
        </Card>
    );
};

// Currency Gain/Loss Report
export const CurrencyGainLossReport: React.FC<{
    dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
}> = ({ dateRange }) => {
    const { currencies, functionalCurrency, formatAmount } = useCurrency();
    const [selectedDateRange, setSelectedDateRange] = useState(dateRange);

    // Mock API call - replace with actual implementation
    const { data: gainLossData = [], isLoading } = useQuery({
        queryKey: ['currency-gain-loss', selectedDateRange],
        queryFn: async (): Promise<GainLossData[]> => {
            // This should be replaced with actual API call
            return currencies
                .filter(c => c.code !== functionalCurrency?.code)
                .map(currency => ({
                    currency: currency.code,
                    unrealized_gain_loss: (Math.random() - 0.5) * 10000,
                    revalued_balance: Math.random() * 100000,
                    original_balance: Math.random() * 100000,
                }));
        },
        enabled: !!selectedDateRange,
    });

    const totalGainLoss = gainLossData.reduce((sum, item) => sum + item.unrealized_gain_loss, 0);

    const columns = [
        {
            title: 'Currency',
            dataIndex: 'currency',
            key: 'currency',
            render: (currency: string) => <CurrencyBadge currency={currency} />,
        },
        {
            title: 'Original Balance',
            dataIndex: 'original_balance',
            key: 'original_balance',
            render: (balance: number, record: GainLossData) => (
                <CurrencyDisplay amount={balance} currency={record.currency} />
            ),
        },
        {
            title: 'Revalued Balance',
            dataIndex: 'revalued_balance',
            key: 'revalued_balance',
            render: (balance: number, record: GainLossData) => (
                <CurrencyDisplay amount={balance} currency={record.currency} />
            ),
        },
        {
            title: 'Unrealized Gain/Loss',
            dataIndex: 'unrealized_gain_loss',
            key: 'unrealized_gain_loss',
            render: (amount: number, record: GainLossData) => (
                <Text style={{ 
                    color: amount >= 0 ? '#52c41a' : '#ff4d4f',
                    fontWeight: 'bold'
                }}>
                    {formatAmount(Math.abs(amount), functionalCurrency?.code)}
                    {amount >= 0 ? ' Gain' : ' Loss'}
                </Text>
            ),
        },
    ];

    return (
        <Card
            title={
                <Space>
                    <BarChartOutlined />
                    Currency Gain/Loss Analysis
                </Space>
            }
            extra={
                <RangePicker
                    value={selectedDateRange}
                    onChange={setSelectedDateRange}
                    format="DD MMM YYYY"
                />
            }
        >
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Statistic
                        title="Total Unrealized Gain/Loss"
                        value={totalGainLoss}
                        precision={2}
                        valueStyle={{ 
                            color: totalGainLoss >= 0 ? '#52c41a' : '#ff4d4f' 
                        }}
                        formatter={(value) => formatAmount(Number(value), functionalCurrency?.code)}
                    />
                </Col>
                <Col span={8}>
                    <Statistic
                        title="Currencies with Gains"
                        value={gainLossData.filter(item => item.unrealized_gain_loss > 0).length}
                        valueStyle={{ color: '#52c41a' }}
                    />
                </Col>
                <Col span={8}>
                    <Statistic
                        title="Currencies with Losses"
                        value={gainLossData.filter(item => item.unrealized_gain_loss < 0).length}
                        valueStyle={{ color: '#ff4d4f' }}
                    />
                </Col>
            </Row>

            <Table
                dataSource={gainLossData}
                columns={columns}
                loading={isLoading}
                rowKey="currency"
                pagination={false}
                size="small"
            />
        </Card>
    );
};

// Multi-Currency Trial Balance
export const MultiCurrencyTrialBalance: React.FC<{
    date?: string;
}> = ({ date }) => {
    const { currencies, functionalCurrency, formatAmount } = useCurrency();
    const [selectedDate, setSelectedDate] = useState(date || dayjs().format('YYYY-MM-DD'));

    // Mock API call - replace with actual implementation
    const { data: trialBalanceData = [], isLoading } = useQuery({
        queryKey: ['multi-currency-trial-balance', selectedDate],
        queryFn: async (): Promise<TrialBalanceData[]> => {
            // This should be replaced with actual API call
            return [];
        },
        enabled: !!selectedDate,
    });

    const columns = [
        {
            title: 'Account Code',
            dataIndex: 'account_code',
            key: 'account_code',
            render: (code: string) => <Text style={{ fontFamily: 'monospace' }}>{code}</Text>,
        },
        {
            title: 'Account Name',
            dataIndex: 'account_name',
            key: 'account_name',
        },
        {
            title: 'Currency',
            dataIndex: 'currency',
            key: 'currency',
            render: (currency: string) => <CurrencyBadge currency={currency} size="small" />,
        },
        {
            title: 'Debit',
            dataIndex: 'debit',
            key: 'debit',
            render: (debit: number, record: TrialBalanceData) => (
                debit > 0 ? <CurrencyDisplay amount={debit} currency={record.currency} /> : '-'
            ),
            align: 'right' as const,
        },
        {
            title: 'Credit',
            dataIndex: 'credit',
            key: 'credit',
            render: (credit: number, record: TrialBalanceData) => (
                credit > 0 ? <CurrencyDisplay amount={credit} currency={record.currency} /> : '-'
            ),
            align: 'right' as const,
        },
        {
            title: 'Balance',
            dataIndex: 'balance',
            key: 'balance',
            render: (balance: number, record: TrialBalanceData) => (
                <CurrencyDisplay 
                    amount={balance} 
                    currency={record.currency}
                    showBaseCurrency={record.currency !== functionalCurrency?.code}
                />
            ),
            align: 'right' as const,
        },
    ];

    return (
        <Card
            title={
                <Space>
                    <BarChartOutlined />
                    Multi-Currency Trial Balance
                </Space>
            }
            extra={
                <DatePicker
                    value={dayjs(selectedDate)}
                    onChange={(date) => setSelectedDate(date?.format('YYYY-MM-DD') || '')}
                    format="DD MMM YYYY"
                />
            }
        >
            <Table
                dataSource={trialBalanceData}
                columns={columns}
                loading={isLoading}
                rowKey={(record) => `${record.account_code}-${record.currency}`}
                pagination={{ pageSize: 20 }}
                size="small"
                scroll={{ x: 800 }}
            />
        </Card>
    );
};

// Main Currency Reports Container
export const CurrencyReportsContainer: React.FC = () => {
    const [activeTab, setActiveTab] = useState('balance-summary');

    const tabItems = [
        {
            key: 'balance-summary',
            label: 'Balance Summary',
            children: <CurrencyBalanceSummary />,
        },
        {
            key: 'exchange-rates',
            label: 'Exchange Rates',
            children: <ExchangeRateHistory />,
        },
        {
            key: 'gain-loss',
            label: 'Gain/Loss Analysis',
            children: <CurrencyGainLossReport />,
        },
        {
            key: 'trial-balance',
            label: 'Trial Balance',
            children: <MultiCurrencyTrialBalance />,
        },
    ];

    return (
        <div>
            <Title level={3}>Multi-Currency Reports</Title>
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="small"
            />
        </div>
    );
};
