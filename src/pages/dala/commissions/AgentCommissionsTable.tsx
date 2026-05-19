import React from 'react';
import { Table, Space, Button, Dropdown, Menu, Typography, Tooltip, Progress } from 'antd';
import { DownloadOutlined, DownOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { AgentCommissionReport, Sale } from '../types';
import { formatCurrency } from '../../../utils/formatters';
import { exportToExcel, exportToCSV, exportToPDF } from '../../../utils/exportUtils';
import AgentExpandedRow from './AgentExpandedRow';
import { useFilters } from '../../../context/FiltersContext';

const { Text } = Typography;

interface AgentCommissionsTableProps {
    reportData: AgentCommissionReport[];
    expandedRowKeys: string[];
    sortedInfo: any;
    onExpandRow: (expanded: boolean, record: AgentCommissionReport) => void;
    onTableChange: (pagination: any, filters: any, sorter: any) => void;
    onShowCommissionPaymentModal: (sale: Sale) => void;
    printLoading: boolean;
    exportLoading: boolean;
    setPrintLoading: (loading: boolean) => void;
    setExportLoading: (loading: boolean) => void;
    calculatePaymentStats?: (sale: Sale) => any;
}

/**
 * ✅ UPDATED: Calculate amount paid from payments array OR allPayments
 */
const calculateAmountPaid = (sale: Sale): number => {
    const saleData = sale.saleData || sale;

    if (saleData.status === 'completed') {
        return parseFloat(saleData.salePrice) || 0;
    }

    // ✅ Try payments array first, then allPayments
    const paymentsArray = saleData.payments || saleData.allPayments || [];

    if (Array.isArray(paymentsArray) && paymentsArray.length > 0) {
        return paymentsArray.reduce((sum, payment) => {
            const amount = parseFloat(payment.amount) || 0;
            return sum + amount;
        }, 0);
    }

    return parseFloat(saleData.amountPaid || sale.amountPaid) || 0;
};

/**
 * ✅ UPDATED: Calculate accrued commission based on amount paid
 */
const calculateAccruedCommission = (sale: Sale): number => {
    const amountPaid = calculateAmountPaid(sale);
    const saleData = sale.saleData || sale;

    let commissionRate = 0;

    // ✅ Check commission object first
    if (saleData.commission?.percentage) {
        commissionRate = parseFloat(saleData.commission.percentage) / 100;
    } else if (sale.commissionPercentage) {
        commissionRate = parseFloat(sale.commissionPercentage) / 100;
    } else {
        commissionRate = 0.05; // Default 5%
    }

    return amountPaid * commissionRate;
};

/**
 * ✅ UPDATED: Calculate commission payments progress from commissionPayments array
 */
const calculateCommissionProgress = (sale: Sale): number => {
    const saleData = sale.saleData || sale;
    const commission = saleData.commission || {};

    // ✅ Get commission paid from commissionPayments array
    let commissionPaid = 0;

    if (commission.commissionPayments && Array.isArray(commission.commissionPayments)) {
        commissionPaid = commission.commissionPayments.reduce((sum, payment) => {
            // ✅ Use netAmount if available, otherwise amount
            const paymentAmount = parseFloat(payment.netAmount || payment.amount || 0);
            return sum + paymentAmount;
        }, 0);
    }

    const totalCommission = parseFloat(commission.amount || 0);

    if (totalCommission <= 0) return 0;
    return (commissionPaid / totalCommission) * 100;
};

/**
 * Calculate client payment progress
 */
const calculateClientPaymentProgress = (sale: Sale): number => {
    const saleData = sale.saleData || sale;
    const totalPrice = parseFloat(saleData.salePrice || 0);
    const amountPaid = calculateAmountPaid(sale);

    if (totalPrice <= 0) return 0;
    return (amountPaid / totalPrice) * 100;
};

const AgentCommissionsTable: React.FC<AgentCommissionsTableProps> = ({
    reportData,
    expandedRowKeys,
    sortedInfo,
    onExpandRow,
    onTableChange,
    onShowCommissionPaymentModal,
    printLoading,
    exportLoading,
    setPrintLoading,
    setExportLoading,
    calculatePaymentStats
}) => {
    const { dateRange } = useFilters();

    // Calculate total accrued commission for an agent
    const calculateTotalAccruedCommission = (record: AgentCommissionReport) => {
        return record.sales.reduce((sum, sale) => {
            return sum + calculateAccruedCommission(sale);
        }, 0);
    };

    // Calculate average commission payment progress for an agent
    const calculateAvgCommissionProgress = (record: AgentCommissionReport) => {
        if (!record.sales || record.sales.length === 0) return 0;

        const totalProgress = record.sales.reduce((sum, sale) => {
            return sum + calculateCommissionProgress(sale);
        }, 0);

        return totalProgress / record.sales.length;
    };

    // Calculate average client payment progress for an agent
    const calculateAvgClientPaymentProgress = (record: AgentCommissionReport) => {
        if (!record.sales || record.sales.length === 0) return 0;

        const totalProgress = record.sales.reduce((sum, sale) => {
            return sum + calculateClientPaymentProgress(sale);
        }, 0);

        return totalProgress / record.sales.length;
    };

    // Handle export with filtered columns
    const handleExport = (record, format) => {
        const excludeColumns = ['saleId', 'commissionStatus', 'unit', 'unitId', 'saleData', 'quantity', 'paymentProgress', 'propertyId'];

        if (format === 'pdf') {
            excludeColumns.push('totalSales', 'commissionPaymentProgress');
        }

        const exportData = record.sales.map(sale => {
            const filteredSale = { ...sale };
            excludeColumns.forEach(col => {
                delete filteredSale[col];
            });

            if (!filteredSale.amountPaid) {
                filteredSale.amountPaid = calculateAmountPaid(sale);
            }

            const accruedCommission = calculateAccruedCommission(sale);
            filteredSale.accruedCommission = accruedCommission;

            filteredSale.clientPaymentProgress = `${calculateClientPaymentProgress(sale).toFixed(1)}%`;

            if (format !== 'pdf') {
                filteredSale.commissionPaymentProgress = `${calculateCommissionProgress(sale).toFixed(1)}%`;
            }

            // ✅ UPDATED: For PDF, get commission payment info from commissionPayments array
            if (format === 'pdf') {
                const saleData = sale.saleData || sale;
                const commission = saleData.commission || {};

                let commissionPaid = 0;

                if (commission.commissionPayments && Array.isArray(commission.commissionPayments)) {
                    commissionPaid = commission.commissionPayments.reduce((sum, payment) => {
                        return sum + parseFloat(payment.netAmount || payment.amount || 0);
                    }, 0);

                    filteredSale.commissionPaid = commissionPaid;
                    filteredSale.commissionBalance = accruedCommission - commissionPaid;

                    // Get the most recent payment
                    const mostRecentPayment = [...commission.commissionPayments].sort((a, b) =>
                        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
                    )[0];

                    if (mostRecentPayment) {
                        filteredSale.lastPaymentMethod = mostRecentPayment.paymentMethod || 'N/A';
                        filteredSale.lastPaymentReference = mostRecentPayment.reference || 'N/A';
                        filteredSale.lastPaymentNotes = mostRecentPayment.description || mostRecentPayment.notes || 'N/A';
                    } else {
                        filteredSale.lastPaymentMethod = 'N/A';
                        filteredSale.lastPaymentReference = 'N/A';
                        filteredSale.lastPaymentNotes = 'N/A';
                    }
                } else {
                    filteredSale.commissionPaid = 0;
                    filteredSale.commissionBalance = accruedCommission;
                    filteredSale.lastPaymentMethod = 'N/A';
                    filteredSale.lastPaymentReference = 'N/A';
                    filteredSale.lastPaymentNotes = 'N/A';
                }
            }

            return filteredSale;
        });

        setExportLoading(true);

        try {
            if (format === 'excel') {
                exportToExcel(exportData, `${record.agentName}_Commission`, setExportLoading);
            } else if (format === 'csv') {
                exportToCSV(exportData, `${record.agentName}_Commission`, setExportLoading);
            } else if (format === 'pdf') {
                const pdfConfig = {
                    title: `Commission Report for ${record.agentName}`,
                    subtitle: `Generated on ${new Date().toLocaleDateString()}`,
                    columns: [
                        { header: 'Sale Code', dataKey: 'saleCode' },
                        { header: 'Amount Paid by Client', dataKey: 'amountPaid' },
                        { header: 'Commission Amount', dataKey: 'accruedCommission' },
                        { header: 'Commission Paid', dataKey: 'commissionPaid' },
                        { header: 'Balance', dataKey: 'commissionBalance' },
                        { header: 'Payment Method', dataKey: 'lastPaymentMethod' },
                        { header: 'Reference', dataKey: 'lastPaymentReference' },
                        { header: 'Payment Notes', dataKey: 'lastPaymentNotes' }
                    ]
                };

                exportToPDF(exportData, `${record.agentName}_Commission`, setExportLoading, pdfConfig);
            }
        } catch (error) {
            console.error(`Error exporting to ${format}:`, error);
            setExportLoading(false);
        }
    };

    // Agent commissions report columns
    const agentColumns = [
        {
            title: 'Agent',
            dataIndex: 'agentName',
            key: 'agentName',
            width: 200,
            sorter: (a: AgentCommissionReport, b: AgentCommissionReport) =>
                a.agentName.localeCompare(b.agentName),
            sortOrder: sortedInfo.columnKey === 'agentName' && sortedInfo.order,
            render: (text: string, record: AgentCommissionReport) => (
                <div>
                    <Text strong>{text}</Text>
                    <div>
                        <Text type="secondary">{record.agentEmail}</Text>
                    </div>
                </div>
            )
        },
        {
            title: 'Sales',
            dataIndex: 'totalSales',
            key: 'totalSales',
            width: 80,
            align: 'center' as const,
            sorter: (a: AgentCommissionReport, b: AgentCommissionReport) =>
                a.totalSales - b.totalSales,
            sortOrder: sortedInfo.columnKey === 'totalSales' && sortedInfo.order,
        },
        {
            title: 'Sale Value',
            dataIndex: 'totalSaleValue',
            key: 'totalSaleValue',
            width: 120,
            align: 'right' as const,
            sorter: (a: AgentCommissionReport, b: AgentCommissionReport) =>
                a.totalSaleValue - b.totalSaleValue,
            sortOrder: sortedInfo.columnKey === 'totalSaleValue' && sortedInfo.order,
            render: (text: number) => formatCurrency(text)
        },
        {
            title: (
                <Tooltip title="The total amount that clients have paid for all of this agent's sales">
                    Amount Paid
                </Tooltip>
            ),
            dataIndex: 'totalAmountPaid',
            key: 'totalAmountPaid',
            width: 120,
            align: 'right' as const,
            sorter: (a: AgentCommissionReport, b: AgentCommissionReport) => {
                const aPaid = a.sales.reduce((sum, sale) => sum + calculateAmountPaid(sale), 0);
                const bPaid = b.sales.reduce((sum, sale) => sum + calculateAmountPaid(sale), 0);
                return aPaid - bPaid;
            },
            sortOrder: sortedInfo.columnKey === 'totalAmountPaid' && sortedInfo.order,
            render: (_: number, record: AgentCommissionReport) => {
                const totalPaid = record.sales.reduce((sum, sale) => {
                    return sum + calculateAmountPaid(sale);
                }, 0);

                return formatCurrency(totalPaid);
            }
        },
        {
            title: (
                <Tooltip title="Commission calculated based on what clients have actually paid so far">
                    Accrued Commission
                </Tooltip>
            ),
            dataIndex: 'accruedPayableCommission',
            key: 'accruedPayableCommission',
            width: 140,
            align: 'right' as const,
            sorter: (a: AgentCommissionReport, b: AgentCommissionReport) => {
                return calculateTotalAccruedCommission(a) - calculateTotalAccruedCommission(b);
            },
            sortOrder: sortedInfo.columnKey === 'accruedPayableCommission' && sortedInfo.order,
            render: (_: any, record: AgentCommissionReport) => {
                const accruedCommission = calculateTotalAccruedCommission(record);
                return <Text style={{ color: '#1890ff' }}>{formatCurrency(accruedCommission)}</Text>;
            }
        },
        {
            title: (
                <Tooltip title="Total commission when all sales are fully paid">
                    Total Commission
                </Tooltip>
            ),
            dataIndex: 'totalCommission',
            key: 'totalCommission',
            width: 130,
            align: 'right' as const,
            sorter: (a: AgentCommissionReport, b: AgentCommissionReport) =>
                a.totalCommission - b.totalCommission,
            sortOrder: sortedInfo.columnKey === 'totalCommission' && sortedInfo.order,
            defaultSortOrder: 'descend' as const,
            render: (text: number) => formatCurrency(text)
        },
        {
            title: 'Paid',
            dataIndex: 'totalCommissionPaid',
            key: 'totalCommissionPaid',
            width: 100,
            align: 'right' as const,
            sorter: (a: AgentCommissionReport, b: AgentCommissionReport) =>
                a.totalCommissionPaid - b.totalCommissionPaid,
            sortOrder: sortedInfo.columnKey === 'totalCommissionPaid' && sortedInfo.order,
            render: (text: number) => <Text type="success">{formatCurrency(text)}</Text>
        },
        {
            title: (
                <Tooltip title="Commission that can be paid now based on client payments minus already paid commission">
                    Pending
                </Tooltip>
            ),
            dataIndex: 'pendingCommission',
            key: 'pendingCommission',
            width: 100,
            align: 'right' as const,
            sorter: (a: AgentCommissionReport, b: AgentCommissionReport) => {
                const aPending = calculateTotalAccruedCommission(a) - a.totalCommissionPaid;
                const bPending = calculateTotalAccruedCommission(b) - b.totalCommissionPaid;
                return aPending - bPending;
            },
            sortOrder: sortedInfo.columnKey === 'pendingCommission' && sortedInfo.order,
            render: (_: any, record: AgentCommissionReport) => {
                const accruedCommission = calculateTotalAccruedCommission(record);
                const pendingCommission = Math.max(0, accruedCommission - record.totalCommissionPaid);
                return <Text type="warning">{formatCurrency(pendingCommission)}</Text>;
            }
        },
        {
            title: (
                <Tooltip title="Commission payment progress compared to client payment progress">
                    Payment Progress
                </Tooltip>
            ),
            dataIndex: 'paymentProgress',
            key: 'paymentProgress',
            width: 140,
            align: 'center' as const,
            sorter: (a: AgentCommissionReport, b: AgentCommissionReport) => {
                return calculateAvgCommissionProgress(a) - calculateAvgCommissionProgress(b);
            },
            sortOrder: sortedInfo.columnKey === 'paymentProgress' && sortedInfo.order,
            render: (_: any, record: AgentCommissionReport) => {
                const commissionProgress = calculateAvgCommissionProgress(record);
                const clientProgress = calculateAvgClientPaymentProgress(record);

                let statusColor = '#52c41a';

                if (commissionProgress < clientProgress * 0.8) {
                    statusColor = '#ff4d4f';
                } else if (commissionProgress < clientProgress) {
                    statusColor = '#faad14';
                }

                return (
                    <div style={{ width: '100%' }}>
                        <Tooltip title={`Commission: ${commissionProgress.toFixed(1)}% | Client: ${clientProgress.toFixed(1)}%`}>
                            <Progress
                                percent={commissionProgress}
                                strokeColor={statusColor}
                                size="small"
                                format={(percent) => `${percent?.toFixed(1)}%`}
                            />
                        </Tooltip>
                    </div>
                );
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            align: 'center' as const,
            render: (_: any, record: AgentCommissionReport) => (
                <Space>
                    <Dropdown overlay={
                        <Menu>
                            <Menu.Item
                                key="1"
                                onClick={() => handleExport(record, 'excel')}
                            >
                                <FileExcelOutlined /> Excel
                            </Menu.Item>
                            <Menu.Item
                                key="2"
                                onClick={() => handleExport(record, 'csv')}
                            >
                                <DownloadOutlined /> CSV
                            </Menu.Item>
                            <Menu.Item
                                key="3"
                                onClick={() => handleExport(record, 'pdf')}
                            >
                                <FilePdfOutlined /> PDF
                            </Menu.Item>
                        </Menu>
                    }>
                        <Button size="small" loading={exportLoading}>
                            <DownloadOutlined /> Export <DownOutlined />
                        </Button>
                    </Dropdown>
                </Space>
            )
        }
    ];

    const handleShowCommissionPaymentModal = (sale: Sale) => {
        console.log('Showing commission payment modal from table for sale:', sale);
        onShowCommissionPaymentModal(sale);
    };

    return (
        <Table
            columns={agentColumns}
            dataSource={reportData}
            rowKey="agentId"
            scroll={{ x: 1280 }}
            expandable={{
                expandedRowRender: (record) => (
                    <AgentExpandedRow
                        record={record}
                        onShowCommissionPaymentModal={handleShowCommissionPaymentModal}
                        calculatePaymentStats={calculatePaymentStats}
                    />
                ),
                expandRowByClick: true,
                expandedRowKeys,
                onExpand: onExpandRow
            }}
            onChange={onTableChange}
            size="middle"
            pagination={{
                pageSize: 10,
                position: ['bottomRight']
            }}
            summary={(pageData) => {
                if (!pageData || pageData.length === 0) return null;

                let totalSales = 0;
                let totalSaleValue = 0;
                let totalAmountPaid = 0;
                let totalAccruedCommission = 0;
                let totalCommission = 0;
                let totalCommissionPaid = 0;
                let totalPendingCommission = 0;
                let avgCommissionProgress = 0;
                let avgClientProgress = 0;

                pageData.forEach(record => {
                    totalSales += record.totalSales || 0;
                    totalSaleValue += record.totalSaleValue || 0;

                    totalAmountPaid += record.sales.reduce((sum, sale) => {
                        return sum + calculateAmountPaid(sale);
                    }, 0);

                    const agentAccruedCommission = calculateTotalAccruedCommission(record);
                    totalAccruedCommission += agentAccruedCommission;

                    totalCommission += record.totalCommission || 0;
                    totalCommissionPaid += record.totalCommissionPaid || 0;
                    totalPendingCommission += Math.max(0, agentAccruedCommission - record.totalCommissionPaid);

                    avgCommissionProgress += calculateAvgCommissionProgress(record);
                    avgClientProgress += calculateAvgClientPaymentProgress(record);
                });

                if (pageData.length > 0) {
                    avgCommissionProgress = avgCommissionProgress / pageData.length;
                    avgClientProgress = avgClientProgress / pageData.length;
                }

                let statusColor = '#52c41a';
                if (avgCommissionProgress < avgClientProgress * 0.8) {
                    statusColor = '#ff4d4f';
                } else if (avgCommissionProgress < avgClientProgress) {
                    statusColor = '#faad14';
                }

                return (
                    <Table.Summary fixed>
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0}></Table.Summary.Cell>
                            <Table.Summary.Cell index={0}></Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="center">
                                <Text strong>{totalSales}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">
                                <Text strong>{formatCurrency(totalSaleValue)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                                <Text strong>{formatCurrency(totalAmountPaid)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} align="right">
                                <Text strong style={{ color: '#1890ff' }}>{formatCurrency(totalAccruedCommission)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5} align="right">
                                <Text strong>{formatCurrency(totalCommission)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={6} align="right">
                                <Text strong type="success">{formatCurrency(totalCommissionPaid)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={7} align="right">
                                <Text strong type="warning">{formatCurrency(totalPendingCommission)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={8} align="center">
                                <Progress
                                    percent={avgCommissionProgress}
                                    strokeColor={statusColor}
                                    size="small"
                                    format={(percent) => `${percent?.toFixed(1)}%`}
                                    title={`Avg Commission: ${avgCommissionProgress.toFixed(1)}% | Avg Client: ${avgClientProgress.toFixed(1)}%`}
                                />
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={9}></Table.Summary.Cell>
                        </Table.Summary.Row>
                    </Table.Summary>
                );
            }}
        />
    );
};

export default AgentCommissionsTable;
