import React, { useState } from 'react';
import { Card, Typography, Button, Space, DatePicker, Select, Spin, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { FiltersProvider, useFilters } from '../../../context/FiltersContext';
import AgentCommissionsTab from './AgentCommissionsTab';
import CommissionPaymentModal from './CommissionPaymentModal';
import { Sale, User } from '../types';
import { fetchPropertySales } from '@services/dala';
import { useQuery } from '@tanstack/react-query';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const CommissionManagementContent: React.FC = () => {
  const { dateRange, setDateRange, selectedAgents, setSelectedAgents, filterType, setFilterType } = useFilters();
  const [commissionPaymentModalVisible, setCommissionPaymentModalVisible] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<Sale | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dala-sales'],
    queryFn: () => fetchPropertySales(),
  });

  // Map sales data to commission structure
  const salesData: Sale[] = React.useMemo(() => {
    if (!data?.data || !Array.isArray(data.data)) return [];

    return data.data.map((sale: any) => {
      const salePrice = sale.salePrice || sale.sale_price || 0;
      const commissionRate = sale.commissionPercentage || sale.commission_rate || 0;
      const commissionAmount = sale.commissionAmount || sale.commission?.amount || (salePrice * (commissionRate / 100));
      
      return {
        _id: sale._id,
        id: sale._id,
        saleCode: sale.saleCode || sale._id,
        salePrice: salePrice,
        amountPaid: sale.paymentTotals?.totalPaid || 0,
        paymentTotals: sale.paymentTotals,
        commissionPercentage: commissionRate,
        commissionAmount: commissionAmount,
        commissionPaid: sale.commission?.paid || 0,
        commissionStatus: sale.commission?.status || sale.commission_status || 'pending',
        commissionSplits: sale.commissionSplits || sale.commission?.commissionSplits || [],
        property: sale.property?.name || sale.property?.propertyType || 'N/A',
        unit: sale.unit?.name || sale.apartmentName,
        unitId: sale.unit_id,
        propertyId: sale.property_id,
        status: sale.status,
        createdAt: sale.sale_date || sale.created_at,
        agentId: sale.salesAgent?._id,
        agent: sale.salesAgent ? {
          _id: sale.salesAgent._id,
          name: sale.salesAgent.email || 'Unknown Agent',
          email: sale.salesAgent.email,
        } : undefined,
        payments: sale.payments || [],
        allPayments: sale.payments || [],
        commission: {
          _id: sale.commission?._id,
          amount: commissionAmount,
          percentage: commissionRate,
          status: sale.commission?.status || sale.commission_status || 'pending',
          paid: sale.commission?.paid || 0,
          commissionPayments: sale.commission?.commissionPayments || [],
          commissionSplits: sale.commissionSplits || sale.commission?.commissionSplits || [],
        },
      };
    });
  }, [data]);

  // Extract unique agents from sales data
  const usersData: User[] = React.useMemo(() => {
    const agentMap = new Map<string, User>();

    salesData.forEach((sale) => {
      if (sale.agent) {
        if (!agentMap.has(sale.agent._id)) {
          agentMap.set(sale.agent._id, {
            _id: sale.agent._id,
            name: sale.agent.name || sale.agent.fullname || 'Unknown Agent',
            email: sale.agent.email || '',
          });
        }
      }
    });

    return Array.from(agentMap.values());
  }, [salesData]);

  const handleShowCommissionPaymentModal = (sale: Sale) => {
    setSelectedSaleForPayment(sale);
    setCommissionPaymentModalVisible(true);
  };

  const handleCommissionPaymentSuccess = () => {
    refetch();
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space align="center" wrap>
          <Title level={2} style={{ margin: 0 }}>Commission Management</Title>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
        </Space>
      </div>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Filters */}
          <Space wrap>
            <RangePicker
              value={[
                dateRange.startDate ? dayjs(dateRange.startDate) : null,
                dateRange.endDate ? dayjs(dateRange.endDate) : null
              ]}
              onChange={(dates: [Dayjs | null, Dayjs | null] | null) => {
                setDateRange({
                  startDate: dates?.[0]?.toDate() || null,
                  endDate: dates?.[1]?.toDate() || null,
                });
              }}
              placeholder={['Start Date', 'End Date']}
            />
            <Select
              style={{ width: 200 }}
              mode="multiple"
              placeholder="Select Agents"
              value={selectedAgents}
              onChange={setSelectedAgents}
              options={usersData.map(user => ({
                label: user.name,
                value: user._id,
              }))}
            />
            <Select
              style={{ width: 150 }}
              value={filterType}
              onChange={setFilterType}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Paid', value: 'paid' },
                { label: 'Pending', value: 'pending' },
                { label: 'Partial', value: 'partial' },
              ]}
            />
          </Space>

          {/* Commission Tab */}
          <AgentCommissionsTab
            salesData={salesData}
            usersData={usersData}
            isLoading={isLoading}
            refetchSales={() => refetch()}
            showCommissionPaymentModal={handleShowCommissionPaymentModal}
          />
        </Space>
      </Card>

      {/* Commission Payment Modal */}
      <CommissionPaymentModal
        visible={commissionPaymentModalVisible}
        onCancel={() => {
          setCommissionPaymentModalVisible(false);
          setSelectedSaleForPayment(null);
        }}
        sale={selectedSaleForPayment}
        onSuccess={handleCommissionPaymentSuccess}
      />
    </div>
  );
};

const CommissionManagement: React.FC = () => {
  return (
    <FiltersProvider>
      <CommissionManagementContent />
    </FiltersProvider>
  );
};

export default CommissionManagement;
