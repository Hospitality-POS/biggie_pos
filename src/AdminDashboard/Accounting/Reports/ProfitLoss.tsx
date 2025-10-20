import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, DatePicker, Select, Row, Col, Statistic } from 'antd';
import { DownloadOutlined, PrinterOutlined, LineChartOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getProfitLossReport } from '@services/accounting/reports';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ProfitLoss: React.FC = () => {
    const [dateRange, setDateRange] = useState<[string, string]>([
        dayjs().startOf('month').format('YYYY-MM-DD'),
        dayjs().endOf('month').format('YYYY-MM-DD')
    ]);

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['profitLossReport', dateRange],
        queryFn: () => getProfitLossReport({
            start_date: dateRange[0],
            end_date: dateRange[1]
        }),
    });

    const report = reportData?.data || {};

    const revenueColumns = [
        {
            title: 'Account',
            dataIndex: 'account_name',
            key: 'account_name',
            render: (text: string, record: any) => (
                <Text strong={record.is_total} style={{ paddingLeft: record.level * 20 }}>
                    {text}
                </Text>
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right' as const,
            render: (amount: number, record: any) => (
                <Text strong={record.is_total} style={{ color: '#52c41a' }}>
                    KES {amount?.toLocaleString() || '0.00'}
                </Text>
            ),
        },
    ];

    const expenseColumns = [
        {
            title: 'Account',
            dataIndex: 'account_name',
            key: 'account_name',
            render: (text: string, record: any) => (
                <Text strong={record.is_total} style={{ paddingLeft: record.level * 20 }}>
                    {text}
                </Text>
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right' as const,
            render: (amount: number, record: any) => (
                <Text strong={record.is_total} style={{ color: '#f5222d' }}>
                    KES {amount?.toLocaleString() || '0.00'}
                </Text>
            ),
        },
    ];

    const netIncome = (report.total_revenue || 0) - (report.total_expenses || 0);
    const profitMargin = report.total_revenue ? ((netIncome / report.total_revenue) * 100).toFixed(2) : 0;

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            <LineChartOutlined /> Profit & Loss Statement
                        </Title>
                        <Text type="secondary">Income statement showing revenues and expenses</Text>
                    </div>
                    <Space>
                        <Button icon={<PrinterOutlined />}>Print</Button>
                        <Button icon={<DownloadOutlined />}>Export</Button>
                    </Space>
                </div>

                <Space style={{ marginBottom: 16 }} wrap>
                    <RangePicker
                        defaultValue={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
                        onChange={(dates) => {
                            if (dates) {
                                setDateRange([
                                    dates[0]!.format('YYYY-MM-DD'),
                                    dates[1]!.format('YYYY-MM-DD')
                                ]);
                            }
                        }}
                    />
                    <Select defaultValue="accrual" style={{ width: 150 }}>
                        <Option value="accrual">Accrual Basis</Option>
                        <Option value="cash">Cash Basis</Option>
                    </Select>
                </Space>

                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Total Revenue"
                                value={report.total_revenue || 0}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#52c41a' }}
                                suffix={<ArrowUpOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Total Expenses"
                                value={report.total_expenses || 0}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#f5222d' }}
                                suffix={<ArrowDownOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Net Income"
                                value={netIncome}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: netIncome >= 0 ? '#52c41a' : '#f5222d' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Profit Margin"
                                value={profitMargin}
                                suffix="%"
                                precision={2}
                                valueStyle={{ color: Number(profitMargin) >= 0 ? '#52c41a' : '#f5222d' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>Revenue</Title>
                <Table
                    columns={revenueColumns}
                    dataSource={report.revenue_accounts || []}
                    loading={isLoading}
                    pagination={false}
                    rowKey="account_id"
                    size="small"
                />

                <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>Expenses</Title>
                <Table
                    columns={expenseColumns}
                    dataSource={report.expense_accounts || []}
                    loading={isLoading}
                    pagination={false}
                    rowKey="account_id"
                    size="small"
                />

                <Card style={{ marginTop: 24, backgroundColor: '#f0f2f5' }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Title level={4} style={{ margin: 0 }}>Net Income</Title>
                        </Col>
                        <Col>
                            <Title level={3} style={{ margin: 0, color: netIncome >= 0 ? '#52c41a' : '#f5222d' }}>
                                KES {netIncome.toLocaleString()}
                            </Title>
                        </Col>
                    </Row>
                </Card>
            </Card>
        </div>
    );
};

export default ProfitLoss;