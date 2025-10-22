import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, DatePicker, Select, Row, Col, Statistic, Alert } from 'antd';
import { DownloadOutlined, PrinterOutlined, CalculatorOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getTrialBalanceReport } from '@services/accounting/reports';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const TrialBalance: React.FC = () => {
    const [asOfDate, setAsOfDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['trialBalanceReport', asOfDate],
        queryFn: () => getTrialBalanceReport({
            as_of_date: asOfDate
        }),
    });

    const report = reportData?.data || {};
    const accounts = report.accounts || [];

    const totalDebits = report.total_debits || 0;
    const totalCredits = report.total_credits || 0;
    const isBalanced = totalDebits === totalCredits;
    const difference = Math.abs(totalDebits - totalCredits);

    const columns = [
        {
            title: 'Account Code',
            dataIndex: 'account_code',
            key: 'account_code',
            width: 120,
        },
        {
            title: 'Account Name',
            dataIndex: 'account_name',
            key: 'account_name',
            render: (text: string, record: any) => (
                <Text strong={record.is_total}>
                    {text}
                </Text>
            ),
        },
        {
            title: 'Account Type',
            dataIndex: 'account_type',
            key: 'account_type',
            width: 150,
            render: (type: string) => {
                const colors: Record<string, string> = {
                    asset: 'blue',
                    liability: 'red',
                    equity: 'green',
                    revenue: 'cyan',
                    expense: 'orange'
                };
                return <Text style={{ color: colors[type] }}>{type?.toUpperCase()}</Text>;
            },
        },
        {
            title: 'Debit',
            dataIndex: 'debit',
            key: 'debit',
            align: 'right' as const,
            width: 150,
            render: (amount: number, record: any) => (
                <Text strong={record.is_total}>
                    {amount > 0 ? `KES ${amount?.toLocaleString()}` : '-'}
                </Text>
            ),
        },
        {
            title: 'Credit',
            dataIndex: 'credit',
            key: 'credit',
            align: 'right' as const,
            width: 150,
            render: (amount: number, record: any) => (
                <Text strong={record.is_total}>
                    {amount > 0 ? `KES ${amount?.toLocaleString()}` : '-'}
                </Text>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            <CalculatorOutlined /> Trial Balance
                        </Title>
                        <Text type="secondary">Verify that debits equal credits</Text>
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
                        <Option value="all">All Accounts</Option>
                        <Option value="active">Active Accounts Only</Option>
                        <Option value="non-zero">Non-Zero Balances Only</Option>
                    </Select>
                </Space>

                {isBalanced ? (
                    <Alert
                        message="Trial Balance is Balanced"
                        description="Total debits equal total credits. Your books are in balance."
                        type="success"
                        icon={<CheckCircleOutlined />}
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                ) : (
                    <Alert
                        message="Trial Balance is NOT Balanced"
                        description={`Difference: KES ${difference.toLocaleString()}. Please review your entries.`}
                        type="error"
                        icon={<CloseCircleOutlined />}
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Total Debits"
                                value={totalDebits}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Total Credits"
                                value={totalCredits}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Difference"
                                value={difference}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: isBalanced ? '#52c41a' : '#f5222d' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Table
                    columns={columns}
                    dataSource={accounts}
                    loading={isLoading}
                    rowKey="account_id"
                    pagination={{
                        pageSize: 20,
                        showTotal: (total) => `Total ${total} accounts`,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100']
                    }}
                    summary={() => (
                        <Table.Summary fixed>
                            <Table.Summary.Row style={{ backgroundColor: '#f0f2f5' }}>
                                <Table.Summary.Cell index={0} colSpan={3}>
                                    <Text strong style={{ fontSize: '16px' }}>TOTAL</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={3} align="right">
                                    <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                                        KES {totalDebits.toLocaleString()}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={4} align="right">
                                    <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                                        KES {totalCredits.toLocaleString()}
                                    </Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        </Table.Summary>
                    )}
                />

                <Card style={{ marginTop: 16, backgroundColor: isBalanced ? '#f6ffed' : '#fff1f0' }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Space>
                                {isBalanced ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} /> : <CloseCircleOutlined style={{ color: '#f5222d', fontSize: '24px' }} />}
                                <div>
                                    <Title level={4} style={{ margin: 0 }}>
                                        {isBalanced ? 'Books are Balanced' : 'Books are NOT Balanced'}
                                    </Title>
                                    <Text type="secondary">
                                        As of {dayjs(asOfDate).format('MMMM D, YYYY')}
                                    </Text>
                                </div>
                            </Space>
                        </Col>
                        {!isBalanced && (
                            <Col>
                                <Text strong style={{ fontSize: '18px', color: '#f5222d' }}>
                                    Difference: KES {difference.toLocaleString()}
                                </Text>
                            </Col>
                        )}
                    </Row>
                </Card>
            </Card>
        </div>
    );
};

export default TrialBalance;