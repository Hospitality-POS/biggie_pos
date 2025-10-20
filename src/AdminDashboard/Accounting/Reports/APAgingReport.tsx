import React, { useState } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Typography,
    DatePicker,
    Select,
    Row,
    Col,
    Statistic,
    Progress
} from 'antd';
import {
    DownloadOutlined,
    PrinterOutlined,
    ShoppingCartOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getAPAgingReport } from '@services/accounting/reports';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

// 🧮 Utility: safely extract numeric values from numbers or nested objects
const getAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object') {
        return Number(val.value || val.amount || 0);
    }
    return 0;
};

// 💰 Utility: format amounts consistently as KES 12,345.00
const formatKES = (val: any) => `KES ${Number(getAmount(val)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const APAgingReport: React.FC = () => {
    const [asOfDate, setAsOfDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['apAgingReport', asOfDate],
        queryFn: () =>
            getAPAgingReport({
                as_of_date: asOfDate,
            }),
    });

    const report = reportData?.data || {};

    // Normalize vendor data and amounts
    const vendors = (report.vendors || []).map((v: any) => ({
        ...v,
        current: getAmount(v.current),
        days_1_30: getAmount(v.days_1_30),
        days_31_60: getAmount(v.days_31_60),
        days_61_90: getAmount(v.days_61_90),
        days_over_90: getAmount(v.days_over_90),
        total: getAmount(v.total),
    }));

    // Summary values
    const totalPayables = getAmount(report.total_payables);
    const currentAmount = getAmount(report.current);
    const days30 = getAmount(report.days_1_30);
    const days60 = getAmount(report.days_31_60);
    const days90 = getAmount(report.days_61_90);
    const days90Plus = getAmount(report.days_over_90);

    const overduePercentage = totalPayables
        ? (((days30 + days60 + days90 + days90Plus) / totalPayables) * 100).toFixed(1)
        : 0;

    const columns = [
        {
            title: 'Vendor',
            dataIndex: 'vendor_name',
            key: 'vendor_name',
            fixed: 'left' as const,
            width: 200,
            render: (text: string, record: any) => (
                <div>
                    <Text strong>{text}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {record.vendor_email}
                    </Text>
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
                    {amount > 0 ? formatKES(amount) : '-'}
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
                    {amount > 0 ? formatKES(amount) : '-'}
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
                    {amount > 0 ? formatKES(amount) : '-'}
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
                    {amount > 0 ? formatKES(amount) : '-'}
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
                    {amount > 0 ? formatKES(amount) : '-'}
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
                    {formatKES(amount)}
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
                    <Button type="link" size="small">
                        View
                    </Button>
                    <Button type="link" size="small">
                        Pay
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <div
                    style={{
                        marginBottom: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            <ShoppingCartOutlined /> Accounts Payable Aging
                        </Title>
                        <Text type="secondary">
                            Track outstanding vendor bills by age
                        </Text>
                    </div>
                    <Space>
                        <Button icon={<PrinterOutlined />}>Print</Button>
                        <Button icon={<DownloadOutlined />}>Export</Button>
                    </Space>
                </div>

                <Space style={{ marginBottom: 16 }} wrap>
                    <DatePicker
                        defaultValue={dayjs(asOfDate)}
                        onChange={(date) => {
                            if (date) {
                                setAsOfDate(date.format('YYYY-MM-DD'));
                            }
                        }}
                        format="YYYY-MM-DD"
                    />
                    <Select defaultValue="all" style={{ width: 200 }}>
                        <Option value="all">All Vendors</Option>
                        <Option value="overdue">Overdue Only</Option>
                        <Option value="urgent">Urgent (90+ days)</Option>
                    </Select>
                </Space>

                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="Total AP"
                                value={totalPayables}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#f5222d' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="Current"
                                value={currentAmount}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="1-30 Days"
                                value={days30}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#faad14' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="31-60 Days"
                                value={days60}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#ff7a45' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="61-90 Days"
                                value={days90}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#ff4d4f' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="Over 90 Days"
                                value={days90Plus}
                                prefix={<WarningOutlined />}
                                precision={2}
                                valueStyle={{ color: '#cf1322' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card style={{ marginBottom: 16 }}>
                    <Title level={5}>Aging Summary</Title>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                            <Text>Current (Not Overdue)</Text>
                            <Progress
                                percent={
                                    totalPayables
                                        ? (currentAmount / totalPayables) * 100
                                        : 0
                                }
                                strokeColor="#52c41a"
                                format={(percent) => `${percent?.toFixed(1)}%`}
                            />
                        </div>
                        <div>
                            <Text>1-30 Days Overdue</Text>
                            <Progress
                                percent={
                                    totalPayables
                                        ? (days30 / totalPayables) * 100
                                        : 0
                                }
                                strokeColor="#faad14"
                                format={(percent) => `${percent?.toFixed(1)}%`}
                            />
                        </div>
                        <div>
                            <Text>31-60 Days Overdue</Text>
                            <Progress
                                percent={
                                    totalPayables
                                        ? (days60 / totalPayables) * 100
                                        : 0
                                }
                                strokeColor="#ff7a45"
                                format={(percent) => `${percent?.toFixed(1)}%`}
                            />
                        </div>
                        <div>
                            <Text>61-90 Days Overdue</Text>
                            <Progress
                                percent={
                                    totalPayables
                                        ? (days90 / totalPayables) * 100
                                        : 0
                                }
                                strokeColor="#ff4d4f"
                                format={(percent) => `${percent?.toFixed(1)}%`}
                            />
                        </div>
                        <div>
                            <Text strong style={{ color: '#cf1322' }}>
                                Over 90 Days (Urgent)
                            </Text>
                            <Progress
                                percent={
                                    totalPayables
                                        ? (days90Plus / totalPayables) * 100
                                        : 0
                                }
                                strokeColor="#cf1322"
                                format={(percent) => `${percent?.toFixed(1)}%`}
                            />
                        </div>
                    </Space>
                </Card>

                <Table
                    columns={columns}
                    dataSource={vendors}
                    loading={isLoading}
                    rowKey="vendor_id"
                    scroll={{ x: 1200 }}
                    pagination={{
                        pageSize: 20,
                        showTotal: (total) => `Total ${total} vendors`,
                        showSizeChanger: true,
                    }}
                    summary={() => (
                        <Table.Summary fixed>
                            <Table.Summary.Row
                                style={{ backgroundColor: '#f0f2f5' }}
                            >
                                <Table.Summary.Cell index={0}>
                                    <Text strong style={{ fontSize: '16px' }}>
                                        TOTAL
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">
                                    <Text strong style={{ color: '#52c41a' }}>
                                        {formatKES(currentAmount)}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={2} align="right">
                                    <Text strong style={{ color: '#faad14' }}>
                                        {formatKES(days30)}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={3} align="right">
                                    <Text strong style={{ color: '#ff7a45' }}>
                                        {formatKES(days60)}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={4} align="right">
                                    <Text strong style={{ color: '#ff4d4f' }}>
                                        {formatKES(days90)}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={5} align="right">
                                    <Text strong style={{ color: '#cf1322' }}>
                                        {formatKES(days90Plus)}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={6} align="right">
                                    <Text strong style={{ fontSize: '16px' }}>
                                        {formatKES(totalPayables)}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={7} />
                            </Table.Summary.Row>
                        </Table.Summary>
                    )}
                />

                <Card
                    style={{
                        marginTop: 16,
                        backgroundColor:
                            Number(overduePercentage) > 30
                                ? '#fff1f0'
                                : '#f6ffed',
                    }}
                >
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Title level={5} style={{ margin: 0 }}>
                                Payment Health
                            </Title>
                            <Text type="secondary">
                                Percentage of overdue payables
                            </Text>
                        </Col>
                        <Col>
                            <Statistic
                                value={overduePercentage}
                                suffix="%"
                                precision={1}
                                valueStyle={{
                                    color:
                                        Number(overduePercentage) > 30
                                            ? '#f5222d'
                                            : '#52c41a',
                                }}
                            />
                        </Col>
                    </Row>
                </Card>
            </Card>
        </div>
    );
};

export default APAgingReport;
