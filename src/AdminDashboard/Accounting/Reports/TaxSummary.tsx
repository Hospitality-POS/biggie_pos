import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, DatePicker, Select, Row, Col, Statistic, Tabs } from 'antd';
import { DownloadOutlined, PrinterOutlined, FileTextOutlined, DollarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getTaxSummaryReport } from '@services/accounting/reports';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

const TaxSummary: React.FC = () => {
    const [dateRange, setDateRange] = useState<[string, string]>([
        dayjs().startOf('month').format('YYYY-MM-DD'),
        dayjs().endOf('month').format('YYYY-MM-DD')
    ]);
    const [taxType, setTaxType] = useState<string>('vat');

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['taxSummaryReport', dateRange, taxType],
        queryFn: () => getTaxSummaryReport({
            start_date: dateRange[0],
            end_date: dateRange[1],
            tax_type: taxType
        }),
    });

    const report = reportData?.data || {};

    const salesColumns = [
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (text: string, record: any) => (
                <Text strong={record.is_total}>{text}</Text>
            ),
        },
        {
            title: 'Taxable Amount',
            dataIndex: 'taxable_amount',
            key: 'taxable_amount',
            align: 'right' as const,
            render: (amount: number, record: any) => (
                <Text strong={record.is_total}>
                    KES {amount?.toLocaleString() || '0.00'}
                </Text>
            ),
        },
        {
            title: 'Tax Rate',
            dataIndex: 'tax_rate',
            key: 'tax_rate',
            align: 'center' as const,
            render: (rate: number) => `${rate || 0}%`,
        },
        {
            title: 'Tax Amount',
            dataIndex: 'tax_amount',
            key: 'tax_amount',
            align: 'right' as const,
            render: (amount: number, record: any) => (
                <Text strong={record.is_total} style={{ color: '#52c41a' }}>
                    KES {amount?.toLocaleString() || '0.00'}
                </Text>
            ),
        },
    ];

    const purchaseColumns = [
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (text: string, record: any) => (
                <Text strong={record.is_total}>{text}</Text>
            ),
        },
        {
            title: 'Taxable Amount',
            dataIndex: 'taxable_amount',
            key: 'taxable_amount',
            align: 'right' as const,
            render: (amount: number, record: any) => (
                <Text strong={record.is_total}>
                    KES {amount?.toLocaleString() || '0.00'}
                </Text>
            ),
        },
        {
            title: 'Tax Rate',
            dataIndex: 'tax_rate',
            key: 'tax_rate',
            align: 'center' as const,
            render: (rate: number) => `${rate || 0}%`,
        },
        {
            title: 'Tax Amount',
            dataIndex: 'tax_amount',
            key: 'tax_amount',
            align: 'right' as const,
            render: (amount: number, record: any) => (
                <Text strong={record.is_total} style={{ color: '#f5222d' }}>
                    KES {amount?.toLocaleString() || '0.00'}
                </Text>
            ),
        },
    ];

    const totalSalesTax = report.total_sales_tax || 0;
    const totalPurchaseTax = report.total_purchase_tax || 0;
    const netTaxPayable = totalSalesTax - totalPurchaseTax;

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            <FileTextOutlined /> Tax Summary Report
                        </Title>
                        <Text type="secondary">VAT/Sales tax summary and reconciliation</Text>
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
                    <Select
                        defaultValue={taxType}
                        style={{ width: 150 }}
                        onChange={(value) => setTaxType(value)}
                    >
                        <Option value="vat">VAT</Option>
                        <Option value="sales_tax">Sales Tax</Option>
                        <Option value="withholding">Withholding Tax</Option>
                    </Select>
                </Space>

                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Total Sales Tax Collected"
                                value={totalSalesTax}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Total Purchase Tax Paid"
                                value={totalPurchaseTax}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: '#f5222d' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Net Tax Payable"
                                value={netTaxPayable}
                                prefix="KES"
                                precision={2}
                                valueStyle={{ color: netTaxPayable > 0 ? '#1890ff' : '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Effective Tax Rate"
                                value={report.total_sales ? ((totalSalesTax / report.total_sales) * 100).toFixed(2) : 0}
                                suffix="%"
                                precision={2}
                            />
                        </Card>
                    </Col>
                </Row>

                <Tabs defaultActiveKey="sales">
                    <TabPane tab="Sales Tax (Output)" key="sales">
                        <Card>
                            <Title level={5} style={{ marginBottom: 16 }}>
                                <DollarOutlined /> Tax Collected on Sales
                            </Title>
                            <Table
                                columns={salesColumns}
                                dataSource={report.sales_tax_items || []}
                                loading={isLoading}
                                pagination={false}
                                rowKey="id"
                                size="small"
                                summary={() => (
                                    <Table.Summary fixed>
                                        <Table.Summary.Row style={{ backgroundColor: '#f6ffed' }}>
                                            <Table.Summary.Cell index={0}>
                                                <Text strong style={{ fontSize: '16px' }}>TOTAL SALES TAX</Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={1} align="right">
                                                <Text strong style={{ fontSize: '16px' }}>
                                                    KES {(report.total_taxable_sales || 0).toLocaleString()}
                                                </Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={2} />
                                            <Table.Summary.Cell index={3} align="right">
                                                <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                                                    KES {totalSalesTax.toLocaleString()}
                                                </Text>
                                            </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                    </Table.Summary>
                                )}
                            />
                        </Card>
                    </TabPane>

                    <TabPane tab="Purchase Tax (Input)" key="purchases">
                        <Card>
                            <Title level={5} style={{ marginBottom: 16 }}>
                                <DollarOutlined /> Tax Paid on Purchases
                            </Title>
                            <Table
                                columns={purchaseColumns}
                                dataSource={report.purchase_tax_items || []}
                                loading={isLoading}
                                pagination={false}
                                rowKey="id"
                                size="small"
                                summary={() => (
                                    <Table.Summary fixed>
                                        <Table.Summary.Row style={{ backgroundColor: '#fff1f0' }}>
                                            <Table.Summary.Cell index={0}>
                                                <Text strong style={{ fontSize: '16px' }}>TOTAL PURCHASE TAX</Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={1} align="right">
                                                <Text strong style={{ fontSize: '16px' }}>
                                                    KES {(report.total_taxable_purchases || 0).toLocaleString()}
                                                </Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={2} />
                                            <Table.Summary.Cell index={3} align="right">
                                                <Text strong style={{ fontSize: '16px', color: '#f5222d' }}>
                                                    KES {totalPurchaseTax.toLocaleString()}
                                                </Text>
                                            </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                    </Table.Summary>
                                )}
                            />
                        </Card>
                    </TabPane>

                    <TabPane tab="Summary" key="summary">
                        <Card>
                            <Space direction="vertical" style={{ width: '100%' }} size="large">
                                <Row justify="space-between">
                                    <Col>
                                        <Text>Tax Period:</Text>
                                    </Col>
                                    <Col>
                                        <Text strong>
                                            {dayjs(dateRange[0]).format('MMM D, YYYY')} - {dayjs(dateRange[1]).format('MMM D, YYYY')}
                                        </Text>
                                    </Col>
                                </Row>

                                <Row justify="space-between">
                                    <Col>
                                        <Text>Total Taxable Sales:</Text>
                                    </Col>
                                    <Col>
                                        <Text strong>KES {(report.total_taxable_sales || 0).toLocaleString()}</Text>
                                    </Col>
                                </Row>

                                <Row justify="space-between">
                                    <Col>
                                        <Text>Sales Tax Collected:</Text>
                                    </Col>
                                    <Col>
                                        <Text strong style={{ color: '#52c41a' }}>
                                            KES {totalSalesTax.toLocaleString()}
                                        </Text>
                                    </Col>
                                </Row>

                                <Row justify="space-between">
                                    <Col>
                                        <Text>Total Taxable Purchases:</Text>
                                    </Col>
                                    <Col>
                                        <Text strong>KES {(report.total_taxable_purchases || 0).toLocaleString()}</Text>
                                    </Col>
                                </Row>

                                <Row justify="space-between">
                                    <Col>
                                        <Text>Purchase Tax Paid:</Text>
                                    </Col>
                                    <Col>
                                        <Text strong style={{ color: '#f5222d' }}>
                                            KES {totalPurchaseTax.toLocaleString()}
                                        </Text>
                                    </Col>
                                </Row>

                                <Card style={{ backgroundColor: netTaxPayable > 0 ? '#e6f7ff' : '#f6ffed', marginTop: 16 }}>
                                    <Row justify="space-between" align="middle">
                                        <Col>
                                            <Title level={4} style={{ margin: 0 }}>
                                                {netTaxPayable > 0 ? 'Net Tax Payable' : 'Net Tax Refundable'}
                                            </Title>
                                            <Text type="secondary">Amount to be remitted to tax authority</Text>
                                        </Col>
                                        <Col>
                                            <Title level={2} style={{ margin: 0, color: netTaxPayable > 0 ? '#1890ff' : '#52c41a' }}>
                                                KES {Math.abs(netTaxPayable).toLocaleString()}
                                            </Title>
                                        </Col>
                                    </Row>
                                </Card>
                            </Space>
                        </Card>
                    </TabPane>
                </Tabs>
            </Card>
        </div>
    );
};

export default TaxSummary;