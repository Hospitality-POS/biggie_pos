import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, DatePicker, Select, Row, Col, Statistic, Divider } from 'antd';
import { DownloadOutlined, PrinterOutlined, FundOutlined, BankOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getBalanceSheetReport } from '@services/accounting/reports';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const BalanceSheet: React.FC = () => {
    const [asOfDate, setAsOfDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['balanceSheetReport', asOfDate],
        queryFn: () => getBalanceSheetReport({
            as_of_date: asOfDate
        }),
    });

    const report = reportData?.data || {};

    const columns = [
        {
            title: 'Account',
            dataIndex: 'account_name',
            key: 'account_name',
            render: (text: string, record: any) => (
                <Text
                    strong={record.is_total || record.is_section}
                    style={{
                        paddingLeft: record.level * 20,
                        fontSize: record.is_section ? '16px' : '14px'
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
            render: (amount: number, record: any) => (
                <Text
                    strong={record.is_total || record.is_section}
                    style={{ fontSize: record.is_section ? '16px' : '14px' }}
                >
                    {amount !== undefined ? `KES ${amount?.toLocaleString()}` : ''}
                </Text>
            ),
        },
    ];

    const totalAssets = report.total_assets || 0;
    const totalLiabilities = report.total_liabilities || 0;
    const totalEquity = report.total_equity || 0;
    const workingCapital = (report.current_assets || 0) - (report.current_liabilities || 0);
    const debtToEquityRatio = totalEquity ? (totalLiabilities / totalEquity).toFixed(2) : 0;

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            <FundOutlined /> Balance Sheet
                        </Title>
                        <Text type="secondary">Statement of financial position</Text>
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
                    <Select defaultValue="standard" style={{ width: 150 }}>
                        <Option value="standard">Standard</Option>
                        <Option value="comparative">Comparative</Option>
                    </Select>
                </Space>

                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Total Assets"
                                value={totalAssets}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Total Liabilities"
                                value={totalLiabilities}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#f5222d' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Total Equity"
                                value={totalEquity}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Working Capital"
                                value={workingCapital}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: workingCapital >= 0 ? '#52c41a' : '#f5222d' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>
                    <BankOutlined /> ASSETS
                </Title>

                <Title level={5} style={{ marginLeft: 16, marginTop: 16 }}>Current Assets</Title>
                <Table
                    columns={columns}
                    dataSource={report.current_assets_accounts || []}
                    loading={isLoading}
                    pagination={false}
                    rowKey="account_id"
                    size="small"
                    showHeader={false}
                />

                <Title level={5} style={{ marginLeft: 16, marginTop: 16 }}>Fixed Assets</Title>
                <Table
                    columns={columns}
                    dataSource={report.fixed_assets_accounts || []}
                    loading={isLoading}
                    pagination={false}
                    rowKey="account_id"
                    size="small"
                    showHeader={false}
                />

                <Card style={{ marginTop: 16, backgroundColor: '#e6f7ff' }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Text strong style={{ fontSize: '16px' }}>TOTAL ASSETS</Text>
                        </Col>
                        <Col>
                            <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                                KES {totalAssets.toLocaleString()}
                            </Text>
                        </Col>
                    </Row>
                </Card>

                <Divider />

                <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>LIABILITIES</Title>

                <Title level={5} style={{ marginLeft: 16, marginTop: 16 }}>Current Liabilities</Title>
                <Table
                    columns={columns}
                    dataSource={report.current_liabilities_accounts || []}
                    loading={isLoading}
                    pagination={false}
                    rowKey="account_id"
                    size="small"
                    showHeader={false}
                />

                <Title level={5} style={{ marginLeft: 16, marginTop: 16 }}>Long-term Liabilities</Title>
                <Table
                    columns={columns}
                    dataSource={report.long_term_liabilities_accounts || []}
                    loading={isLoading}
                    pagination={false}
                    rowKey="account_id"
                    size="small"
                    showHeader={false}
                />

                <Card style={{ marginTop: 16, backgroundColor: '#fff1f0' }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Text strong style={{ fontSize: '16px' }}>TOTAL LIABILITIES</Text>
                        </Col>
                        <Col>
                            <Text strong style={{ fontSize: '16px', color: '#f5222d' }}>
                                KES {totalLiabilities.toLocaleString()}
                            </Text>
                        </Col>
                    </Row>
                </Card>

                <Divider />

                <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>EQUITY</Title>
                <Table
                    columns={columns}
                    dataSource={report.equity_accounts || []}
                    loading={isLoading}
                    pagination={false}
                    rowKey="account_id"
                    size="small"
                    showHeader={false}
                />

                <Card style={{ marginTop: 16, backgroundColor: '#f6ffed' }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Text strong style={{ fontSize: '16px' }}>TOTAL EQUITY</Text>
                        </Col>
                        <Col>
                            <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                                KES {totalEquity.toLocaleString()}
                            </Text>
                        </Col>
                    </Row>
                </Card>

                <Card style={{ marginTop: 24, backgroundColor: '#f0f2f5' }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Title level={4} style={{ margin: 0 }}>TOTAL LIABILITIES & EQUITY</Title>
                        </Col>
                        <Col>
                            <Title level={3} style={{ margin: 0 }}>
                                KES {(totalLiabilities + totalEquity).toLocaleString()}
                            </Title>
                        </Col>
                    </Row>
                </Card>

                <Row gutter={16} style={{ marginTop: 24 }}>
                    <Col span={12}>
                        <Card>
                            <Statistic
                                title="Debt-to-Equity Ratio"
                                value={debtToEquityRatio}
                                suffix=":1"
                                precision={2}
                            />
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card>
                            <Statistic
                                title="Current Ratio"
                                value={report.current_liabilities ? (report.current_assets / report.current_liabilities).toFixed(2) : 0}
                                suffix=":1"
                                precision={2}
                            />
                        </Card>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default BalanceSheet;