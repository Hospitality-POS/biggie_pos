import React from 'react';
import { Row, Col, Card, Statistic, Tooltip } from 'antd';
import { BarChartOutlined, DollarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../../utils/formatters';

interface CommissionSummaryTotals {
    totalSales: number;
    totalSaleValue: number;
    totalAmountPaid?: number; // Amount clients have actually paid
    totalAccruedCommission?: number; // Commission based on client payments
    totalCommission: number;
    totalPaidCommission: number;
    totalPendingCommission: number;
}

interface AgentCommissionsSummaryProps {
    totals: CommissionSummaryTotals;
}

const AgentCommissionsSummary: React.FC<AgentCommissionsSummaryProps> = ({ totals }) => {
    return (
        <Row gutter={[16, 16]} wrap>
            <Col xs={24} sm={12} md={8}>
                <Card>
                    <Statistic
                        title="Total Sales"
                        value={totals.totalSales}
                        prefix={<BarChartOutlined />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
                <Card>
                    <Statistic
                        title="Total Sales Value"
                        value={formatCurrency(totals.totalSaleValue)}
                        prefix={<DollarOutlined />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
                <Card>
                    <Statistic
                        title="Amount Paid by Clients"
                        value={formatCurrency(totals.totalAmountPaid || 0)}
                        prefix={<DollarOutlined />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card>
                    <Statistic
                        title={
                            <span>
                                Accrued Commission
                                <Tooltip title="Commission based on what clients have actually paid">
                                    <InfoCircleOutlined style={{ marginLeft: 5 }} />
                                </Tooltip>
                            </span>
                        }
                        value={formatCurrency(totals.totalAccruedCommission || 0)}
                        valueStyle={{ color: '#1890ff' }}
                        prefix={<DollarOutlined />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card>
                    <Statistic
                        title={
                            <span>
                                Total Commission
                                <Tooltip title="Commission when all sales are fully paid">
                                    <InfoCircleOutlined style={{ marginLeft: 5 }} />
                                </Tooltip>
                            </span>
                        }
                        value={formatCurrency(totals.totalCommission)}
                        prefix={<DollarOutlined />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card>
                    <Statistic
                        title="Paid Commission"
                        value={formatCurrency(totals.totalPaidCommission)}
                        valueStyle={{ color: '#3f8600' }}
                        prefix={<DollarOutlined />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
                <Card>
                    <Statistic
                        title={
                            <span>
                                Pending Commission
                                <Tooltip title="Accrued commission that can be paid now">
                                    <InfoCircleOutlined style={{ marginLeft: 5 }} />
                                </Tooltip>
                            </span>
                        }
                        value={formatCurrency(totals.totalPendingCommission)}
                        valueStyle={{ color: '#faad14' }}
                        prefix={<DollarOutlined />}
                    />
                </Card>
            </Col>
        </Row>
    );
};

export default AgentCommissionsSummary;
