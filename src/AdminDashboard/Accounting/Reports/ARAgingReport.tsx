import React, { useState } from 'react';
import {
    Card, Table, Button, Space, Typography,
    DatePicker, Select, Row, Col, Statistic, Progress
} from 'antd';
import {
    DownloadOutlined, PrinterOutlined, UserOutlined, WarningOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getARAgingReport } from '@services/accounting/reports';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

// ✅ Safely extract numeric amount
const getAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object') {
        return Number(val.value || val.amount || 0);
    }
    return 0;
};

const ARAgingReport: React.FC = () => {
    const [asOfDate, setAsOfDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['arAgingReport', asOfDate],
        queryFn: () => getARAgingReport({
            as_of_date: asOfDate
        }),
    });

    const report = reportData?.data || {};
    const customersRaw = report.customers || [];

    // ✅ Normalize all numeric fields
    const totalReceivables = getAmount(report.total_receivables);
    const currentAmount = getAmount(report.current);
    const days30 = getAmount(report.days_1_30);
    const days60 = getAmount(report.days_31_60);
    const days90 = getAmount(report.days_61_90);
    const days90Plus = getAmount(report.days_over_90);

    const customers = customersRaw.map((c: any) => ({
        ...c,
        current: getAmount(c.current),
        days_1_30: getAmount(c.days_1_30),
        days_31_60: getAmount(c.days_31_60),
        days_61_90: getAmount(c.days_61_90),
        days_over_90: getAmount(c.days_over_90),
        total: getAmount(c.total),
    }));

    const columns = [
        {
            title: 'Customer',
            dataIndex: 'customer_name',
            key: 'customer_name',
            fixed: 'left' as const,
            width: 200,
            render: (text: string, record: any) => (
                <div>
                    <Text strong>{text}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>{record.customer_email}</Text>
                </div>
            ),
        },
        {
            title: 'Current',
            dataIndex: 'current',
            key: 'current',
            align: 'right' as const,
            width: 120,
            render: (amount: number) => (
                <Text style={{ color: '#52c41a' }}>
                    {amount > 0 ? `KES ${Number(amount).toLocaleString()}` : '-'}
                </Text>
            ),
        },
        {
            title: '1-30 Days',
            dataIndex: 'days_1_30',
            key: 'days_1_30',
            align: 'right' as const,
            width: 120,
            render: (amount: number) => (
                <Text style={{ color: '#faad14' }}>
                    {amount > 0 ? `KES ${Number(amount).toLocaleString()}` : '-'}
                </Text>
            ),
        },
        {
            title: '31-60 Days',
            dataIndex: 'days_31_60',
            key: 'days_31_60',
            align: 'right' as const,
            width: 120,
            render: (amount: number) => (
                <Text style={{ color: '#ff7a45' }}>
                    {amount > 0 ? `KES ${Number(amount).toLocaleString()}` : '-'}
                </Text>
            ),
        },
        {
            title: '61-90 Days',
            dataIndex: 'days_61_90',
            key: 'days_61_90',
            align: 'right' as const,
            width: 120,
            render: (amount: number) => (
                <Text style={{ color: '#ff4d4f' }}>
                    {amount > 0 ? `KES ${Number(amount).toLocaleString()}` : '-'}
                </Text>
            ),
        },
        {
            title: 'Over 90 Days',
            dataIndex: 'days_over_90',
            key: 'days_over_90',
            align: 'right' as const,
            width: 120,
            render: (amount: number) => (
                <Text strong style={{ color: '#cf1322' }}>
                    {amount > 0 ? `KES ${Number(amount).toLocaleString()}` : '-'}
                </Text>
            ),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            align: 'right' as const,
            fixed: 'right' as const,
            width: 140,
            render: (amount: number) => (
                <Text strong style={{ fontSize: '14px' }}>
                    KES {Number(amount || 0).toLocaleString()}
                </Text>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            fixed: 'right' as const,
            width: 100,
            render: () => (
                <Space size="small">
                    <Button type="link" size="small">View</Button>
                    <Button type="link" size="small">Contact</Button>
                </Space>
            ),
        },
    ];

    const overduePercentage = totalReceivables
        ? (((days30 + days60 + days90 + days90Plus) / totalReceivables) * 100).toFixed(1)
        : 0;

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                {/* Header */}
                <div style={{
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            <UserOutlined /> Accounts Receivable Aging
                        </Title>
                        <Text type="secondary">Track outstanding customer invoices by age</Text>
                    </div>
                    <Space>
                        <Button icon={<PrinterOutlined />}>Print</Button>
                        <Button icon={<DownloadOutlined />}>Export</Button>
                    </Space>
                </div>

                {/* Filters */}
                <Space style={{ marginBottom: 16 }} wrap>
                    <DatePicker
                        defaultValue={dayjs(asOfDate)}
                        onChange={(date) => date && setAsOfDate(date.format('YYYY-MM-DD'))}
                        format="YYYY-MM-DD"
                    />
                    <Select defaultValue="all" style={{ width: 200 }}>
                        <Option value="all">All Customers</Option>
                        <Option value="overdue">Overdue Only</Option>
                        <Option value="high-risk">High Risk (90+ days)</Option>
                    </Select>
                </Space>

                {/* Summary cards */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={4}><Card><Statistic title="Total AR" value={totalReceivables} prefix="KES" precision={2} valueStyle={{ color: '#1890ff' }} /></Card></Col>
                    <Col span={4}><Card><Statistic title="Current" value={currentAmount} prefix="KES" precision={2} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                    <Col span={4}><Card><Statistic title="1-30 Days" value={days30} prefix="KES" precision={2} valueStyle={{ color: '#faad14' }} /></Card></Col>
                    <Col span={4}><Card><Statistic title="31-60 Days" value={days60} prefix="KES" precision={2} valueStyle={{ color: '#ff7a45' }} /></Card></Col>
                    <Col span={4}><Card><Statistic title="61-90 Days" value={days90} prefix="KES" precision={2} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
                    <Col span={4}><Card><Statistic title="Over 90 Days" value={days90Plus} prefix="KES" precision={2} valueStyle={{ color: '#cf1322' }} prefix={<WarningOutlined />} /></Card></Col>
                </Row>

                {/* Progress Summary */}
                <Card style={{ marginBottom: 16 }}>
                    <Title level={5}>Aging Summary</Title>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {[
                            { label: 'Current (Not Overdue)', val: currentAmount, color: '#52c41a' },
                            { label: '1-30 Days Overdue', val: days30, color: '#faad14' },
                            { label: '31-60 Days Overdue', val: days60, color: '#ff7a45' },
                            { label: '61-90 Days Overdue', val: days90, color: '#ff4d4f' },
                            { label: 'Over 90 Days (High Risk)', val: days90Plus, color: '#cf1322', strong: true },
                        ].map(({ label, val, color, strong }) => (
                            <div key={label}>
                                <Text strong={strong} style={{ color }}>{label}</Text>
                                <Progress
                                    percent={totalReceivables ? ((val / totalReceivables) * 100) : 0}
                                    strokeColor={color}
                                    format={(percent) => `${percent?.toFixed(1)}%`}
                                />
                            </div>
                        ))}
                    </Space>
                </Card>

                {/* Table */}
                <Table
                    columns={columns}
                    dataSource={customers}
                    loading={isLoading}
                    rowKey="customer_id"
                    scroll={{ x: 1200 }}
                    pagination={{
                        pageSize: 20,
                        showTotal: (total) => `Total ${total} customers`,
                        showSizeChanger: true
                    }}
                    summary={() => (
                        <Table.Summary fixed>
                            <Table.Summary.Row style={{ backgroundColor: '#f0f2f5' }}>
                                <Table.Summary.Cell index={0}><Text strong style={{ fontSize: '16px' }}>TOTAL</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right"><Text strong style={{ color: '#52c41a' }}>KES {currentAmount.toLocaleString()}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={2} align="right"><Text strong style={{ color: '#faad14' }}>KES {days30.toLocaleString()}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={3} align="right"><Text strong style={{ color: '#ff7a45' }}>KES {days60.toLocaleString()}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={4} align="right"><Text strong style={{ color: '#ff4d4f' }}>KES {days90.toLocaleString()}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={5} align="right"><Text strong style={{ color: '#cf1322' }}>KES {days90Plus.toLocaleString()}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={6} align="right"><Text strong style={{ fontSize: '16px' }}>KES {totalReceivables.toLocaleString()}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={7} />
                            </Table.Summary.Row>
                        </Table.Summary>
                    )}
                />

                {/* Health card */}
                <Card style={{ marginTop: 16, backgroundColor: Number(overduePercentage) > 30 ? '#fff1f0' : '#f6ffed' }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Title level={5} style={{ margin: 0 }}>Collection Health</Title>
                            <Text type="secondary">Percentage of overdue receivables</Text>
                        </Col>
                        <Col>
                            <Statistic
                                value={overduePercentage}
                                suffix="%"
                                precision={1}
                                valueStyle={{ color: Number(overduePercentage) > 30 ? '#f5222d' : '#52c41a' }}
                            />
                        </Col>
                    </Row>
                </Card>
            </Card>
        </div>
    );
};

export default ARAgingReport;
