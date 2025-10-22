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
} from 'antd';
import {
    DownloadOutlined,
    PrinterOutlined,
    DollarCircleOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getCashFlowReport } from '@services/accounting/reports';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const CashFlow: React.FC = () => {
    const [dateRange, setDateRange] = useState<[string, string]>([
        dayjs().startOf('month').format('YYYY-MM-DD'),
        dayjs().endOf('month').format('YYYY-MM-DD'),
    ]);
    const [method, setMethod] = useState<string>('indirect');

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['cashFlowReport', dateRange, method],
        queryFn: () =>
            getCashFlowReport({
                start_date: dateRange[0],
                end_date: dateRange[1],
                method,
            }),
    });

    // ✅ Ensure structure is always consistent
    const report = reportData?.data && typeof reportData.data === 'object'
        ? reportData.data
        : {};

    // ✅ Safe array defaults to prevent .some() or .map() errors
    const operatingActivities = Array.isArray(report.operating_activities)
        ? report.operating_activities
        : [];
    const investingActivities = Array.isArray(report.investing_activities)
        ? report.investing_activities
        : [];
    const financingActivities = Array.isArray(report.financing_activities)
        ? report.financing_activities
        : [];

    const columns = [
        {
            title: 'Item',
            dataIndex: 'item_name',
            key: 'item_name',
            render: (text: string, record: any) => (
                <Text
                    strong={record.is_total || record.is_subtotal}
                    style={{
                        paddingLeft: (record.level || 0) * 20,
                        fontSize: record.is_total ? '16px' : '14px',
                    }}
                >
                    {text}
                </Text>
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right' as const,
            render: (amount: number, record: any) => {
                const color = amount >= 0 ? '#52c41a' : '#f5222d';
                return (
                    <Text
                        strong={record.is_total || record.is_subtotal}
                        style={{
                            color:
                                record.is_total || record.is_subtotal ? color : 'inherit',
                            fontSize: record.is_total ? '16px' : '14px',
                        }}
                    >
                        {amount !== undefined ? `KES ${amount?.toLocaleString()}` : ''}
                    </Text>
                );
            },
        },
    ];

    const operatingCash = report.operating_activities_total || 0;
    const investingCash = report.investing_activities_total || 0;
    const financingCash = report.financing_activities_total || 0;
    const netCashFlow = operatingCash + investingCash + financingCash;
    const beginningCash = report.beginning_cash || 0;
    const endingCash = beginningCash + netCashFlow;

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
                            <DollarCircleOutlined /> Cash Flow Statement
                        </Title>
                        <Text type="secondary">Statement of cash flows</Text>
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
                                    dates[1]!.format('YYYY-MM-DD'),
                                ]);
                            }
                        }}
                    />
                    <Select
                        defaultValue={method}
                        style={{ width: 150 }}
                        onChange={(value) => setMethod(value)}
                    >
                        <Option value="indirect">Indirect Method</Option>
                        <Option value="direct">Direct Method</Option>
                    </Select>
                </Space>

                {/* === CASH SUMMARY CARDS === */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Beginning Cash"
                                value={beginningCash}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Net Cash Flow"
                                value={netCashFlow}
                                prefix="KES"
                                precision={2}
                                valueStyle={{
                                    color: netCashFlow >= 0 ? '#52c41a' : '#f5222d',
                                }}
                                suffix={
                                    netCashFlow >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />
                                }
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Ending Cash"
                                value={endingCash}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Change"
                                value={
                                    beginningCash
                                        ? ((netCashFlow / beginningCash) * 100).toFixed(2)
                                        : 0
                                }
                                suffix="%"
                                precision={2}
                                valueStyle={{
                                    color: netCashFlow >= 0 ? '#52c41a' : '#f5222d',
                                }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* === BEGINNING CASH BALANCE === */}
                <Card style={{ marginBottom: 16, backgroundColor: '#e6f7ff' }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Text strong style={{ fontSize: '16px' }}>
                                Beginning Cash Balance
                            </Text>
                        </Col>
                        <Col>
                            <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                                KES {beginningCash.toLocaleString()}
                            </Text>
                        </Col>
                    </Row>
                </Card>

                {/* === OPERATING ACTIVITIES === */}
                <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>
                    Operating Activities
                </Title>
                <Table
                    columns={columns}
                    dataSource={operatingActivities}
                    loading={isLoading}
                    pagination={false}
                    rowKey="item_id"
                    size="small"
                    showHeader={false}
                />
                <Card
                    style={{
                        marginTop: 8,
                        backgroundColor:
                            operatingCash >= 0 ? '#f6ffed' : '#fff1f0',
                    }}
                >
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Text strong>Net Cash from Operating Activities</Text>
                        </Col>
                        <Col>
                            <Text
                                strong
                                style={{
                                    color:
                                        operatingCash >= 0 ? '#52c41a' : '#f5222d',
                                }}
                            >
                                KES {operatingCash.toLocaleString()}
                            </Text>
                        </Col>
                    </Row>
                </Card>

                {/* === INVESTING ACTIVITIES === */}
                <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>
                    Investing Activities
                </Title>
                <Table
                    columns={columns}
                    dataSource={investingActivities}
                    loading={isLoading}
                    pagination={false}
                    rowKey="item_id"
                    size="small"
                    showHeader={false}
                />
                <Card
                    style={{
                        marginTop: 8,
                        backgroundColor:
                            investingCash >= 0 ? '#f6ffed' : '#fff1f0',
                    }}
                >
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Text strong>Net Cash from Investing Activities</Text>
                        </Col>
                        <Col>
                            <Text
                                strong
                                style={{
                                    color:
                                        investingCash >= 0 ? '#52c41a' : '#f5222d',
                                }}
                            >
                                KES {investingCash.toLocaleString()}
                            </Text>
                        </Col>
                    </Row>
                </Card>

                {/* === FINANCING ACTIVITIES === */}
                <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>
                    Financing Activities
                </Title>
                <Table
                    columns={columns}
                    dataSource={financingActivities}
                    loading={isLoading}
                    pagination={false}
                    rowKey="item_id"
                    size="small"
                    showHeader={false}
                />
                <Card
                    style={{
                        marginTop: 8,
                        backgroundColor:
                            financingCash >= 0 ? '#f6ffed' : '#fff1f0',
                    }}
                >
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Text strong>Net Cash from Financing Activities</Text>
                        </Col>
                        <Col>
                            <Text
                                strong
                                style={{
                                    color:
                                        financingCash >= 0 ? '#52c41a' : '#f5222d',
                                }}
                            >
                                KES {financingCash.toLocaleString()}
                            </Text>
                        </Col>
                    </Row>
                </Card>

                {/* === NET TOTAL === */}
                <Card style={{ marginTop: 24, backgroundColor: '#f0f2f5' }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Title level={4} style={{ margin: 0 }}>
                                Net Increase/(Decrease) in Cash
                            </Title>
                        </Col>
                        <Col>
                            <Title
                                level={3}
                                style={{
                                    margin: 0,
                                    color: netCashFlow >= 0 ? '#52c41a' : '#f5222d',
                                }}
                            >
                                KES {netCashFlow.toLocaleString()}
                            </Title>
                        </Col>
                    </Row>
                </Card>

                {/* === ENDING CASH BALANCE === */}
                <Card style={{ marginTop: 16, backgroundColor: '#e6f7ff' }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Title level={4} style={{ margin: 0 }}>
                                Ending Cash Balance
                            </Title>
                        </Col>
                        <Col>
                            <Title
                                level={3}
                                style={{ margin: 0, color: '#1890ff' }}
                            >
                                KES {endingCash.toLocaleString()}
                            </Title>
                        </Col>
                    </Row>
                </Card>
            </Card>
        </div>
    );
};

export default CashFlow;
