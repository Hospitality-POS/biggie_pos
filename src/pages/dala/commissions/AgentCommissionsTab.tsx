import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Empty, Spin, message } from 'antd';
import { useFilters } from '../../../context/FiltersContext';
import { Sale, User, AgentCommissionReport } from '../types';
import { generateAgentCommissionsReport } from '../../../utils/dataProcessors';
import AgentCommissionsSummary from './AgentCommissionsSummary';
import AgentCommissionsTable from './AgentCommissionsTable';

// Import these calculation functions from where they're defined in your project
// Or copy their implementation if they're defined inline in AgentCommissionsTable
const calculateAmountPaid = (sale: Sale): number => {
    // Check if the sale has the saleData property where payments are stored
    const saleData = sale.saleData || sale;

    // For completed sales, the full sale price has been paid
    if (saleData.status === 'completed') {
        return parseFloat(saleData.salePrice) || 0;
    }

    // Use paymentTotals.totalPaid from backend if available
    if (saleData.paymentTotals?.totalPaid !== undefined) {
        return parseFloat(saleData.paymentTotals.totalPaid) || 0;
    }

    // Get directly from payments array - this is the source of truth
    if (saleData.payments && Array.isArray(saleData.payments) && saleData.payments.length > 0) {
        return saleData.payments.reduce((sum, payment) => {
            const amount = parseFloat(payment.amount) || 0;
            // Count all payments regardless of status for now
            return sum + amount;
        }, 0);
    }

    // Fallback to amountPaid field if it exists
    return parseFloat(saleData.amountPaid || sale.amountPaid) || 0;
};

const calculateAccruedCommission = (sale: Sale): number => {
    const amountPaid = calculateAmountPaid(sale);
    const saleData = sale.saleData || sale;

    // Get commission rate from the appropriate source
    let commissionRate = 0;
    if (sale.commissionPercentage) {
        commissionRate = parseFloat(sale.commissionPercentage) / 100;
    } else if (saleData.commission?.percentage) {
        commissionRate = parseFloat(saleData.commission.percentage) / 100;
    } else if (saleData.commission?.rate) {
        commissionRate = parseFloat(saleData.commission.rate) / 100;
    } else {
        commissionRate = 0.05; // Default to 5% if no rate found
    }

    return amountPaid * commissionRate;
};

const calculateTotalAccruedCommission = (record: AgentCommissionReport) => {
    return record.sales.reduce((sum, sale) => {
        return sum + calculateAccruedCommission(sale);
    }, 0);
};

interface AgentCommissionsTabProps {
    salesData: Sale[];
    usersData: User[];
    isLoading: boolean;
    refetchSales: () => void;
    showCommissionPaymentModal: (sale: Sale) => void; // Ensure this prop is passed from parent
}

const AgentCommissionsTab: React.FC<AgentCommissionsTabProps> = ({
    salesData,
    usersData,
    isLoading,
    refetchSales,
    showCommissionPaymentModal
}) => {
    const [reportData, setReportData] = useState<AgentCommissionReport[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
    const [sortedInfo, setSortedInfo] = useState<any>({});
    const [printLoading, setPrintLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    const {
        dateRange,
        selectedAgents,
        filterType
    } = useFilters();

    // Process sales data to generate report when dependencies change
    useEffect(() => {
        if (!salesData.length) return;

        const processedData = generateAgentCommissionsReport(
            salesData,
            dateRange,
            selectedAgents,
            filterType
        );

        setReportData(processedData);
    }, [salesData, dateRange, selectedAgents, filterType]);

    // Calculate totals for the summary including accrued commission
    const calculateTotals = () => {
        let totalSales = 0;
        let totalSaleValue = 0;
        let totalAmountPaid = 0;
        let totalAccruedCommission = 0;
        let totalCommission = 0;
        let totalPaidCommission = 0;
        let totalPendingCommission = 0;

        reportData.forEach(agent => {
            totalSales += agent.totalSales;
            totalSaleValue += agent.totalSaleValue;
            totalCommission += agent.totalCommission;
            totalPaidCommission += agent.totalCommissionPaid;

            // Calculate amount paid across all sales for this agent
            const agentAmountPaid = agent.sales.reduce((sum, sale) => {
                return sum + calculateAmountPaid(sale);
            }, 0);
            totalAmountPaid += agentAmountPaid;

            // Calculate accrued commission for this agent
            const agentAccruedCommission = calculateTotalAccruedCommission(agent);
            totalAccruedCommission += agentAccruedCommission;

            // Calculate pending commission as accrued minus paid
            const agentPendingCommission = Math.max(0, agentAccruedCommission - agent.totalCommissionPaid);
            totalPendingCommission += agentPendingCommission;
        });

        return {
            totalSales,
            totalSaleValue,
            totalAmountPaid,
            totalAccruedCommission,
            totalCommission,
            totalPaidCommission,
            totalPendingCommission
        };
    };

    // Handle row expansion
    const handleExpandRow = (expanded: boolean, record: AgentCommissionReport) => {
        setExpandedRowKeys(expanded ? [record.agentId] : []);
    };

    // Handle table sort change
    const handleTableChange = (pagination: any, filters: any, sorter: any) => {
        setSortedInfo(sorter);
    };

    // Handle showing the commission payment modal
    const handleShowCommissionPaymentModal = (sale: Sale) => {
        console.log('Showing commission payment modal from tab for sale:', sale);

        // Make sure the sale has the required properties
        if (!sale || !sale._id) {
            message.error('Invalid sale data. Cannot add payment.');
            console.error('Invalid sale data:', sale);
            return;
        }

        // Call the parent function to show the modal
        showCommissionPaymentModal(sale);
    };

    const totals = calculateTotals();

    return (
        <>
            {/* Summary stats */}
            <AgentCommissionsSummary totals={totals} />

            {/* Agent commissions table */}
            <Card style={{ marginTop: 16 }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <Spin tip="Loading report data..." />
                    </div>
                ) : reportData.length > 0 ? (
                    <AgentCommissionsTable
                        reportData={reportData}
                        expandedRowKeys={expandedRowKeys}
                        sortedInfo={sortedInfo}
                        onExpandRow={handleExpandRow}
                        onTableChange={handleTableChange}
                        onShowCommissionPaymentModal={handleShowCommissionPaymentModal}
                        printLoading={printLoading}
                        exportLoading={exportLoading}
                        setPrintLoading={setPrintLoading}
                        setExportLoading={setExportLoading}
                    />
                ) : (
                    <Empty
                        description="No commission data found for the selected criteria"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                )}
            </Card>
        </>
    );
};

export default AgentCommissionsTab;
