import React from 'react';
import { Table, Typography, Tag, Progress, Button, Tooltip, Space, Row, Col } from 'antd';
import { PlusOutlined, InfoCircleOutlined, FilePdfOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { AgentCommissionReport, AgentSaleDetails, Sale } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;

interface AgentExpandedRowProps {
    record: AgentCommissionReport;
    onShowCommissionPaymentModal: (sale: Sale) => void;
    calculatePaymentStats?: (sale: Sale) => any;
}

/**
 * Calculate amount paid from payments array OR allPayments
 */
const calculateAmountPaid = (sale: Sale | AgentSaleDetails): number => {
    const saleData = sale.saleData || sale;

    if (saleData.status === 'completed') {
        return parseFloat(saleData.salePrice) || 0;
    }

    // Use paymentTotals.totalPaid from backend if available
    if (saleData.paymentTotals?.totalPaid !== undefined) {
        return parseFloat(saleData.paymentTotals.totalPaid) || 0;
    }

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
 * Calculate accrued commission based on amount paid
 */
const calculateAccruedCommission = (sale: Sale | AgentSaleDetails): number => {
    const amountPaid = calculateAmountPaid(sale);
    const saleData = sale.saleData || sale;

    let commissionRate = 0;

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
 * Calculate commission payment progress from commissionPayments array
 */
const calculateCommissionProgress = (sale: Sale | AgentSaleDetails): number => {
    const saleData = sale.saleData || sale;
    const commission = saleData.commission || {};

    let commissionPaid = 0;

    if (commission.commissionPayments && Array.isArray(commission.commissionPayments)) {
        commissionPaid = commission.commissionPayments.reduce((sum, payment) => {
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
const calculateClientPaymentProgress = (sale: Sale | AgentSaleDetails): number => {
    const saleData = sale.saleData || sale;
    const totalPrice = parseFloat(saleData.salePrice || sale.salePrice || 0);
    const amountPaid = calculateAmountPaid(sale);

    if (totalPrice <= 0) return 0;
    return (amountPaid / totalPrice) * 100;
};

/**
 * Generate PDF for a specific sale
 * ✅ FIX: Uses autoTable(doc, options) functional API instead of (doc as any).autoTable()
 *         This avoids the umi.js "Cannot read properties of undefined (reading 'call')" crash
 */
const generateSaleStatementPDF = (sale: AgentSaleDetails, agentName: string) => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        doc.setFont('helvetica', 'normal');
        const dateStr = formatDate(new Date());

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        const leftMargin = margin;
        const rightMargin = pageWidth - margin;
        const centerX = pageWidth / 2;

        const primaryColor: [number, number, number] = [24, 144, 255];
        const grayColor: [number, number, number] = [102, 102, 102];
        const greenColor: [number, number, number] = [82, 196, 26];
        const redColor: [number, number, number] = [255, 77, 79];
        const orangeColor: [number, number, number] = [250, 173, 20];

        let yPos = margin;

        // Header
        doc.setFontSize(24);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('Commission Statement', centerX, yPos, { align: 'center' });

        yPos += 10;
        doc.setFontSize(10);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text(`Generated on ${dateStr}`, centerX, yPos, { align: 'center' });

        yPos += 15;

        // Agent and Property Details
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');

        doc.text('Agent Details', centerX - contentWidth / 4, yPos, { align: 'center' });
        doc.text('Property Details', centerX + contentWidth / 4, yPos, { align: 'center' });

        yPos += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        doc.text(`Name: ${agentName}`, centerX - contentWidth / 4, yPos, { align: 'center' });
        doc.text(`Property: ${sale.property}`, centerX + contentWidth / 4, yPos, { align: 'center' });

        yPos += 6;
        doc.text(`Sale Code: ${sale.saleCode}`, centerX - contentWidth / 4, yPos, { align: 'center' });
        doc.text(`Unit: ${sale.unit || 'N/A'}`, centerX + contentWidth / 4, yPos, { align: 'center' });

        yPos += 15;

        // Sale Details Section
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Sale Details', centerX, yPos, { align: 'center' });

        yPos += 3;
        doc.setDrawColor(200, 200, 200);
        doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);

        yPos += 10;

        const salePrice = parseFloat(sale.salePrice);
        const amountPaid = calculateAmountPaid(sale);
        const commissionRate = sale.commissionPercentage || '5';
        const totalCommission = parseFloat(sale.commissionAmount);
        const accruedCommission = calculateAccruedCommission(sale);
        const commissionPaid = parseFloat(sale.commissionPaid) || 0;
        const remainingCommission = Math.max(0, accruedCommission - commissionPaid);

        // ✅ FIX: Use autoTable(doc, options) instead of (doc as any).autoTable(options)
        autoTable(doc, {
            startY: yPos,
            head: [['Description', 'Amount']],
            body: [
                ['Sale Price', formatCurrency(salePrice)],
                ['Amount Paid', formatCurrency(amountPaid)],
                ['Commission Rate', `${commissionRate}%`],
                ['Total Commission', formatCurrency(totalCommission)],
                ['Accrued Commission', formatCurrency(accruedCommission)],
                ['Commission Paid', formatCurrency(commissionPaid)],
                ['Remaining Commission', formatCurrency(remainingCommission)]
            ],
            styles: {
                fontSize: 10,
                cellPadding: 4,
                lineColor: [200, 200, 200],
                halign: 'center'
            },
            headStyles: {
                fillColor: primaryColor,
                textColor: 255,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'right' }
            },
            alternateRowStyles: {
                fillColor: [248, 248, 248]
            },
            margin: { left: leftMargin + contentWidth / 4, right: rightMargin - contentWidth / 4 },
            tableWidth: contentWidth / 2,
            didParseCell: function (data: any) {
                if (data.row.index === 4 && data.column.index === 1) {
                    data.cell.styles.textColor = primaryColor;
                    data.cell.styles.fontStyle = 'bold';
                }
                if (data.row.index === 6 && data.column.index === 1) {
                    data.cell.styles.textColor = remainingCommission > 0 ? redColor : greenColor;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        // ✅ Get Y position after table using lastAutoTable
        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Payment Progress Section
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Payment Progress', centerX, yPos, { align: 'center' });

        yPos += 3;
        doc.setDrawColor(200, 200, 200);
        doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);

        yPos += 12;

        const clientProgress = calculateClientPaymentProgress(sale);
        const commissionProgress = calculateCommissionProgress(sale);

        const progressBarWidth = contentWidth * 0.7;
        const progressBarLeft = centerX - (progressBarWidth / 2);

        // Client Payment Progress bar
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Client Payment Progress (${clientProgress.toFixed(1)}%)`, centerX, yPos, { align: 'center' });

        yPos += 8;

        doc.setDrawColor(240, 240, 240);
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(progressBarLeft, yPos, progressBarWidth, 6, 2, 2, 'F');

        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        const clientFillWidth = progressBarWidth * (clientProgress / 100);
        if (clientFillWidth > 0) {
            doc.roundedRect(progressBarLeft, yPos, clientFillWidth, 6, 2, 2, 'F');
        }

        yPos += 15;

        // Commission Payment Progress bar
        doc.setFont('helvetica', 'bold');
        doc.text(`Commission Payment Progress (${commissionProgress.toFixed(1)}%)`, centerX, yPos, { align: 'center' });

        yPos += 8;

        doc.setDrawColor(240, 240, 240);
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(progressBarLeft, yPos, progressBarWidth, 6, 2, 2, 'F');

        let progressBarColor: [number, number, number];
        if (commissionProgress < clientProgress * 0.8) {
            progressBarColor = redColor;
        } else if (commissionProgress < clientProgress) {
            progressBarColor = orangeColor;
        } else {
            progressBarColor = greenColor;
        }

        doc.setFillColor(progressBarColor[0], progressBarColor[1], progressBarColor[2]);
        const commissionFillWidth = progressBarWidth * (commissionProgress / 100);
        if (commissionFillWidth > 0) {
            doc.roundedRect(progressBarLeft, yPos, commissionFillWidth, 6, 2, 2, 'F');
        }

        // Footer
        yPos = pageHeight - 20;
        doc.setFontSize(8);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text(
            'This is an automatically generated statement. For questions, please contact the accounting department.',
            centerX,
            yPos,
            { align: 'center' }
        );

        doc.save(`Commission_Statement_${sale.saleCode}.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again or contact support.');
    }
};

/**
 * Fallback PDF generation (no autoTable)
 */
const generateBasicPDF = (doc: jsPDF, sale: AgentSaleDetails, agentName: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;
    const dateStr = formatDate(new Date());

    const primaryColor: [number, number, number] = [24, 144, 255];
    const grayColor: [number, number, number] = [102, 102, 102];

    let yPos = 20;

    doc.setFontSize(20);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Commission Statement', centerX, yPos, { align: 'center' });

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(`Generated on ${dateStr}`, centerX, yPos, { align: 'center' });

    yPos += 20;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Agent: ${agentName}`, centerX, yPos, { align: 'center' });
    yPos += 8;
    doc.text(`Sale Code: ${sale.saleCode}`, centerX, yPos, { align: 'center' });
    yPos += 8;
    doc.text(`Property: ${sale.property}`, centerX, yPos, { align: 'center' });
    yPos += 8;
    doc.text(`Unit: ${sale.unit || 'N/A'}`, centerX, yPos, { align: 'center' });

    yPos += 20;

    doc.setFontSize(16);
    doc.text('Sale Details', centerX, yPos, { align: 'center' });
    yPos += 10;

    const salePrice = parseFloat(sale.salePrice);
    const amountPaid = calculateAmountPaid(sale);
    const commissionRate = sale.commissionPercentage || '5';
    const totalCommission = parseFloat(sale.commissionAmount);
    const accruedCommission = calculateAccruedCommission(sale);
    const commissionPaid = parseFloat(sale.commissionPaid) || 0;
    const remainingCommission = Math.max(0, accruedCommission - commissionPaid);

    const drawCenteredKeyValue = (key: string, value: string) => {
        const keyX = centerX - 40;
        const valueX = centerX + 40;

        doc.setFont('helvetica', 'bold');
        doc.text(`${key}:`, keyX, yPos, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.text(value, valueX, yPos, { align: 'left' });

        yPos += 8;
    };

    doc.setFontSize(10);
    drawCenteredKeyValue('Sale Price', formatCurrency(salePrice));
    drawCenteredKeyValue('Amount Paid', formatCurrency(amountPaid));
    drawCenteredKeyValue('Commission Rate', `${commissionRate}%`);
    drawCenteredKeyValue('Total Commission', formatCurrency(totalCommission));
    drawCenteredKeyValue('Accrued Commission', formatCurrency(accruedCommission));
    drawCenteredKeyValue('Commission Paid', formatCurrency(commissionPaid));
    drawCenteredKeyValue('Remaining Commission', formatCurrency(remainingCommission));

    yPos = pageHeight - 20;
    doc.setFontSize(8);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(
        'This is an automatically generated statement. For questions, please contact the accounting department.',
        centerX,
        yPos,
        { align: 'center' }
    );

    doc.save(`Commission_Statement_${sale.saleCode}.pdf`);
};

const AgentExpandedRow: React.FC<AgentExpandedRowProps> = ({
    record,
    onShowCommissionPaymentModal,
    calculatePaymentStats
}) => {
    const salesDetailsColumns = [
        {
            title: 'Sale Code',
            dataIndex: 'saleCode',
            key: 'saleCode',
            width: 120
        },
        {
            title: 'Property',
            dataIndex: 'property',
            key: 'property',
        },
        {
            title: 'Unit',
            dataIndex: 'unit',
            key: 'unit',
        },
        {
            title: 'Sale Price',
            dataIndex: 'salePrice',
            key: 'salePrice',
            align: 'right' as const,
            render: (text: number) => formatCurrency(text)
        },
        {
            title: (
                <Tooltip title="Amount actually paid by customer so far">
                    Amount Paid
                </Tooltip>
            ),
            dataIndex: 'amountPaid',
            key: 'amountPaid',
            align: 'right' as const,
            render: (_: any, record: AgentSaleDetails) => {
                const amountPaid = calculateAmountPaid(record);
                return formatCurrency(amountPaid);
            }
        },
        {
            title: (
                <Tooltip title="Commission that can be paid based on the amount the customer has paid">
                    Accrued Commission
                </Tooltip>
            ),
            dataIndex: 'accruedCommission',
            key: 'accruedCommission',
            align: 'right' as const,
            render: (_: any, record: AgentSaleDetails) => {
                const accruedCommission = calculateAccruedCommission(record);
                return <Text style={{ color: '#1890ff' }}>{formatCurrency(accruedCommission)}</Text>;
            }
        },
        {
            title: 'Total Commission',
            dataIndex: 'commissionAmount',
            key: 'commissionAmount',
            align: 'right' as const,
            render: (text: number) => formatCurrency(text)
        },
        {
            title: 'Paid',
            dataIndex: 'commissionPaid',
            key: 'commissionPaid',
            align: 'right' as const,
            render: (text: number) => formatCurrency(text)
        },
        {
            title: (
                <Tooltip title="Client payment progress vs Commission payment progress">
                    Payment Progress
                </Tooltip>
            ),
            dataIndex: 'paymentProgress',
            key: 'paymentProgress',
            align: 'center' as const,
            width: 200,
            render: (_: any, record: AgentSaleDetails) => {
                const clientProgress = calculateClientPaymentProgress(record);
                const commissionProgress = calculateCommissionProgress(record);

                let statusColor = '#52c41a';

                if (commissionProgress < clientProgress * 0.8) {
                    statusColor = '#ff4d4f';
                } else if (commissionProgress < clientProgress) {
                    statusColor = '#faad14';
                }

                return (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Tooltip title={`Client Payment: ${clientProgress.toFixed(1)}%`}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Text style={{ width: '70px', fontSize: '12px' }}>Client:</Text>
                                <Progress
                                    percent={clientProgress}
                                    size="small"
                                    showInfo={false}
                                    style={{ flex: 1 }}
                                />
                                <Text style={{ width: '40px', fontSize: '12px', textAlign: 'right' }}>
                                    {clientProgress.toFixed(0)}%
                                </Text>
                            </div>
                        </Tooltip>
                        <Tooltip title={`Commission Payment: ${commissionProgress.toFixed(1)}%`}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Text style={{ width: '70px', fontSize: '12px' }}>Commission:</Text>
                                <Progress
                                    percent={commissionProgress}
                                    size="small"
                                    showInfo={false}
                                    strokeColor={statusColor}
                                    style={{ flex: 1 }}
                                />
                                <Text style={{ width: '40px', fontSize: '12px', textAlign: 'right' }}>
                                    {commissionProgress.toFixed(0)}%
                                </Text>
                            </div>
                        </Tooltip>
                    </Space>
                );
            }
        },
        {
            title: 'Status',
            dataIndex: 'commissionStatus',
            key: 'commissionStatus',
            align: 'center' as const,
            render: (status: string, record: AgentSaleDetails) => {
                const accrued = calculateAccruedCommission(record);
                const paid = parseFloat(record.commissionPaid) || 0;
                const clientProgress = calculateClientPaymentProgress(record);
                const commissionProgress = calculateCommissionProgress(record);

                let realStatus = status;
                let statusColor = 'red';

                if (accrued <= 0) {
                    realStatus = 'NO PAYMENT';
                    statusColor = 'red';
                } else if (paid >= accrued) {
                    realStatus = 'PAID';
                    statusColor = 'green';
                } else if (paid > 0) {
                    if (commissionProgress < clientProgress * 0.8) {
                        realStatus = 'BEHIND';
                        statusColor = 'red';
                    } else if (commissionProgress < clientProgress) {
                        realStatus = 'PARTIAL';
                        statusColor = 'orange';
                    } else {
                        realStatus = 'ON TRACK';
                        statusColor = 'green';
                    }
                } else {
                    realStatus = 'PENDING';
                    statusColor = 'blue';
                }

                return (
                    <Tag color={statusColor}>
                        {realStatus}
                    </Tag>
                );
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'center' as const,
            render: (_: any, record: AgentSaleDetails) => {
                if (!record.saleData) {
                    console.error('Sale data is missing for record:', record);
                    return null;
                }

                const accruedCommission = calculateAccruedCommission(record);
                const paidCommission = parseFloat(record.commissionPaid) || 0;
                const pendingCommission = Math.max(0, accruedCommission - paidCommission);
                const clientProgress = calculateClientPaymentProgress(record);
                const isFullyPaid = pendingCommission <= 0;
                const isClientProgressInsufficient = clientProgress <= 20;

                const getAddPaymentTooltip = () => {
                    if (isFullyPaid) return 'Commission has been fully paid';
                    if (isClientProgressInsufficient)
                        return `Client must pay more than 20% before commission can be added (current: ${clientProgress.toFixed(1)}%)`;
                    return '';
                };

                return (
                    <Space>
                        <Tooltip title={getAddPaymentTooltip()}>
                            <span>
                                <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => {
                                        console.log('Adding payment for sale:', record.saleData);

                                        const saleForModal = {
                                            ...record.saleData,
                                            _id: record.saleData._id || record.saleId,
                                            id: record.saleData.id || record.saleId,
                                            saleCode: record.saleData.saleCode || record.saleCode,
                                            salePrice: record.saleData.salePrice || record.salePrice,
                                            commission: record.saleData.commission || {
                                                _id: record.saleData.commission?._id,
                                                amount: record.commissionAmount,
                                                percentage: record.commissionPercentage,
                                                status: record.commissionStatus,
                                                commissionPayments: record.commissionPayments || []
                                            }
                                        };

                                        onShowCommissionPaymentModal(saleForModal);
                                    }}
                                    disabled={isFullyPaid || isClientProgressInsufficient}
                                >
                                    <PlusOutlined /> Add Payment
                                </Button>
                            </span>
                        </Tooltip>
                        <Button
                            type="default"
                            size="small"
                            icon={<FilePdfOutlined />}
                            onClick={() => generateSaleStatementPDF(record, record.agentName || record.agent || 'Agent')}
                        >
                            Export PDF
                        </Button>
                    </Space>
                );
            }
        }
    ];

    return (
        <div style={{ margin: '0 20px 20px 20px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Title level={5}>Sales Details</Title>
                </Col>
                <Col>
                    <Text type="secondary">
                        <InfoCircleOutlined /> Click the "Export PDF" button to download a detailed commission statement
                    </Text>
                </Col>
            </Row>
            <Table
                columns={salesDetailsColumns}
                dataSource={record.sales}
                pagination={false}
                size="small"
                rowKey="saleId"
                className="commission-table"
                rowClassName={(record) => {
                    const commissionProgress = calculateCommissionProgress(record);
                    const clientProgress = calculateClientPaymentProgress(record);

                    if (commissionProgress < clientProgress * 0.8) {
                        return 'commission-row-alert';
                    } else if (commissionProgress < clientProgress) {
                        return 'commission-row-warning';
                    }
                    return '';
                }}
            />
            <style jsx global>{`
                .commission-table .commission-row-alert {
                    background-color: rgba(255, 77, 79, 0.05);
                }
                .commission-table .commission-row-warning {
                    background-color: rgba(250, 173, 20, 0.05);
                }
                .commission-table .ant-table-row:hover {
                    background-color: rgba(24, 144, 255, 0.1) !important;
                }
            `}</style>
        </div>
    );
};

export default AgentExpandedRow;
