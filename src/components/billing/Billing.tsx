import React, { useState, useMemo } from 'react';
import {
  Typography,
  Space,
  Row,
  Col,
  Button,
  Tag,
  Tabs,
  Badge,
  Modal,
  Segmented,
  Divider,
  Card,
  Tooltip,
  Table,
  Input,
  Statistic,
  Alert,
} from 'antd';
import { ProCard } from '@ant-design/pro-components';
import {
  CreditCardOutlined,
  CheckCircleFilled,
  ShopOutlined,
  RocketFilled,
  LockOutlined,
  ThunderboltFilled,
  CalendarOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  GiftFilled,
  DollarOutlined,
  SyncOutlined,
  CrownFilled,
  MobileOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

import { usePrimaryColor } from '@context/PrimaryColorContext';
import { THEME_C } from '@utils/getPrimaryColor';
import { useTenantModules } from '@hooks/useTenantModules';
import { isModuleEnabled, readStoredTenant } from '@utils/parseTenantModules';
import {
  BaseModuleKey,
  DEFAULT_BASE_PLANS,
  SaaSSubscriptionPlan,
  getValidPlanFeatures,
  getPlanDescription,
  getPlanDisplayName,
  getPlanTier,
  isRecommendedPlan,
  sortSubscriptionPlans,
} from '@shared/types/pricing';
import {
  useSubscribeModule,
  useModulePricing,
  useTenantInvoices,
  useInitiatePayment,
  type TenantInvoice,
} from '@shared/hooks/usePricing';
import { useResponsive } from '@shared/hooks/useResponsive';

const { Title, Text, Paragraph } = Typography;
const C = THEME_C;

interface ModuleCardConfig {
  key: BaseModuleKey;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  icon: string;
  chargingModel: string;
}

const MODULE_CONFIGS: ModuleCardConfig[] = [
  {
    key: 'duka',
    name: 'Duka by Base',
    subtitle: 'Point of Sale, Catalog & Multi-Shop Inventory',
    description: 'Cashier checkout, kitchen order printing, table management, barcode scanning, stock counts and recipe tracking.',
    color: '#0b2f78',
    icon: '🛒',
    chargingModel: 'Per Branch / Month',
  },
  {
    key: 'pesa',
    name: 'Pesa by Base',
    subtitle: 'Financial Accounting, General Ledger & Tax Compliance',
    description: 'Double-entry bookkeeping, chart of accounts, multi-currency reporting, bank reconciliation, and KRA eTIMS invoices.',
    color: '#0d9488',
    icon: '💰',
    chargingModel: 'Flat Rate / Business',
  },
  {
    key: 'bandu',
    name: 'Bandu by Base',
    subtitle: 'Human Resources, Attendance & Payroll Engine',
    description: 'Employee profiles, statutory PAYE/NHIF/NSSF deductions, staff shift scheduling, and automated PDF payslip generation.',
    color: '#7c3aed',
    icon: '👥',
    chargingModel: 'Flat Rate / Business',
  },
  {
    key: 'dala',
    name: 'Dala by Base',
    subtitle: 'Real Estate, Leases & Property Management',
    description: 'Multi-unit portfolio management, digital tenant lease contracts, automated monthly rent billing, and maintenance tracking.',
    color: '#2563eb',
    icon: '🏢',
    chargingModel: 'Flat Rate / Business',
  },
  {
    key: 'mteja',
    name: 'Mteja by Base',
    subtitle: 'CRM, WhatsApp & Omnichannel Customer Messaging',
    description: 'Lead generation workflows, targeted promotional broadcasts, WhatsApp business chat, and customer lifecycle insights.',
    color: '#ea580c',
    icon: '💬',
    chargingModel: 'Flat Rate / Business',
  },
  {
    key: 'esign',
    name: 'ESign by Base',
    subtitle: 'Document Center & Legally-Binding Digital Signatures',
    description: 'Contract templates, dynamic placeholder tags, signature pad, email dispatch, and audit-trailed signed PDF documents.',
    color: '#059669',
    icon: '✍️',
    chargingModel: 'Flat Rate / Business',
  },
];

const BillingDashboard: React.FC = () => {
  const primaryColor = usePrimaryColor();
  const tenantModules = useTenantModules();
  const tenant = readStoredTenant();
  const { isMobile } = useResponsive();
  const subscribeMutation = useSubscribeModule();

  // Invoices & Payments state (BFF Gateway)
  const { data: invoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = useTenantInvoices();
  const initiatePaymentMutation = useInitiatePayment();
  const [payingInvoice, setPayingInvoice] = useState<TenantInvoice | null>(null);
  const [mpesaPhone, setMpesaPhone] = useState<string>('');

  const invoiceStats = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalPending = 0;
    invoices.forEach((inv) => {
      const amt = Number(inv.amount) || 0;
      totalBilled += amt;
      if (inv.payment_status === 'paid') {
        totalPaid += amt;
      } else {
        totalPending += amt;
      }
    });
    return { totalBilled, totalPaid, totalPending, count: invoices.length };
  }, [invoices]);

  // Selected module for plan modal
  const [selectedModuleForPlan, setSelectedModuleForPlan] = useState<BaseModuleKey | null>(null);
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Monthly');

  // Load pricing plans for the selected modal module
  const { plans: livePlans, isLoading: plansLoading } = useModulePricing(
    selectedModuleForPlan || 'duka'
  );

  const displayPlans = useMemo(() => {
    if (!selectedModuleForPlan) return [];
    const source =
      livePlans && livePlans.length > 0
        ? livePlans
        : DEFAULT_BASE_PLANS[selectedModuleForPlan] || [];
    return sortSubscriptionPlans(source);
  }, [selectedModuleForPlan, livePlans]);

  const selectedModuleConfig = useMemo(() => {
    return MODULE_CONFIGS.find((m) => m.key === selectedModuleForPlan);
  }, [selectedModuleForPlan]);

  const activeModulesCount = useMemo(() => {
    return MODULE_CONFIGS.filter((m) => isModuleEnabled(tenantModules, m.key)).length;
  }, [tenantModules]);

  const handleSubscribe = async (moduleKey: BaseModuleKey, plan?: SaaSSubscriptionPlan) => {
    try {
      await subscribeMutation.mutateAsync({
        moduleKey,
        planId: plan?._id,
        billingCycle,
      });
      setSelectedModuleForPlan(null);
    } catch {
      // Error is surfaced via notification in useSubscribeModule
    }
  };

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 32px', width: '100%', boxSizing: 'border-box', maxWidth: 1240, margin: '0 auto' }}>
      {/* ── Top Header Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              background: `${primaryColor}18`,
              borderRadius: 14,
              padding: '10px 14px',
              color: primaryColor,
              fontSize: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CreditCardOutlined />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Title level={3} style={{ margin: 0, color: C.darkText, fontWeight: 700 }}>
                Billing & Subscriptions
              </Title>
              <Tag color="blue" style={{ borderRadius: 10, fontWeight: 600 }}>
                {tenant?.tenant_code || 'BASE'}
              </Tag>
            </div>
            <Text style={{ fontSize: 13, color: C.subText }}>
              Manage your BasePoint ecosystem subscriptions, plans, and business licenses
            </Text>
          </div>
        </div>

        {/* Global Summary Stats */}
        <Space size={16} wrap>
          <div
            style={{
              background: '#fff',
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: '8px 16px',
              textAlign: 'center',
            }}
          >
            <Text style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Active Modules</Text>
            <Text strong style={{ fontSize: 16, color: '#10b981' }}>
              {activeModulesCount} / 6
            </Text>
          </div>
          <div
            style={{
              background: '#fff',
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: '8px 16px',
              textAlign: 'center',
            }}
          >
            <Text style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Currency</Text>
            <Text strong style={{ fontSize: 16, color: '#0b2f78' }}>
              KES
            </Text>
          </div>
        </Space>
      </div>

      {/* ── Main Tabbed Content ── */}
      <Tabs
        defaultActiveKey="modules"
        type="card"
        items={[
          {
            key: 'modules',
            label: (
              <Space size={6}>
                <ShopOutlined />
                <span>Ecosystem Modules ({activeModulesCount}/6 Active)</span>
              </Space>
            ),
            children: (
              <div style={{ marginTop: 12 }}>
                <Row gutter={[20, 20]}>
                  {MODULE_CONFIGS.map((config) => {
                    const active = isModuleEnabled(tenantModules, config.key);
                    return (
                      <Col xs={24} md={12} lg={8} key={config.key}>
                        <ProCard
                          bordered
                          hoverable
                          style={{
                            borderRadius: 16,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            borderColor: active ? `${config.color}40` : '#e2e8f0',
                            borderWidth: active ? 2 : 1,
                            boxShadow: active ? `0 4px 16px ${config.color}14` : '0 1px 3px rgba(0,0,0,0.03)',
                            background: active ? `linear-gradient(180deg, ${config.color}08 0%, #ffffff 80%)` : '#fff',
                          }}
                          bodyStyle={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: '100%',
                            padding: 20,
                          }}
                        >
                          <div>
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                              <Space size={12}>
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    backgroundColor: `${config.color}14`,
                                    border: `1px solid ${config.color}25`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 22,
                                  }}
                                >
                                  {config.icon}
                                </div>
                                <div>
                                  <Title level={5} style={{ margin: 0, color: C.darkText, fontWeight: 700 }}>
                                    {config.name}
                                  </Title>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {config.chargingModel}
                                  </Text>
                                </div>
                              </Space>

                              {active ? (
                                <Tag color="success" icon={<CheckCircleFilled />} style={{ borderRadius: 12, padding: '2px 8px', fontWeight: 600 }}>
                                  Active
                                </Tag>
                              ) : (
                                <Tag color="default" icon={<LockOutlined />} style={{ borderRadius: 12, padding: '2px 8px' }}>
                                  Inactive
                                </Tag>
                              )}
                            </div>

                            <Text style={{ fontSize: 13, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                              {config.subtitle}
                            </Text>
                            <Paragraph type="secondary" style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                              {config.description}
                            </Paragraph>
                          </div>

                          {/* Card Footer Actions */}
                          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                            {active ? (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space size={4}>
                                  <Badge status="success" />
                                  <Text style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>License Active</Text>
                                </Space>
                                <Button
                                  size="small"
                                  onClick={() => setSelectedModuleForPlan(config.key)}
                                >
                                  View Plans
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="primary"
                                block
                                icon={<ThunderboltFilled />}
                                style={{
                                  backgroundColor: config.color,
                                  borderColor: config.color,
                                  borderRadius: 8,
                                  fontWeight: 600,
                                }}
                                onClick={() => setSelectedModuleForPlan(config.key)}
                              >
                                View Plans &amp; Subscribe
                              </Button>
                            )}
                          </div>
                        </ProCard>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            ),
          },
          {
            key: 'invoices',
            label: (
              <Space size={6}>
                <FileTextOutlined />
                <span>Invoices &amp; Receipts</span>
                {invoiceStats.totalPending > 0 && (
                  <Badge count={invoices.filter((i) => i.payment_status !== 'paid').length} style={{ backgroundColor: '#f59e0b' }} />
                )}
              </Space>
            ),
            children: (
              <div style={{ marginTop: 16 }}>
                {/* Metrics Summary */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                  <Col xs={24} sm={8}>
                    <Card bordered style={{ borderRadius: 12 }}>
                      <Statistic
                        title={<Text type="secondary">Total Invoiced</Text>}
                        value={invoiceStats.totalBilled}
                        prefix={<DollarOutlined style={{ color: '#0b2f78' }} />}
                        precision={0}
                        suffix="KES"
                        valueStyle={{ fontWeight: 700, color: '#0f172a' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card bordered style={{ borderRadius: 12 }}>
                      <Statistic
                        title={<Text type="secondary">Paid to Date</Text>}
                        value={invoiceStats.totalPaid}
                        prefix={<CheckCircleFilled style={{ color: '#059669' }} />}
                        precision={0}
                        suffix="KES"
                        valueStyle={{ fontWeight: 700, color: '#059669' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card bordered style={{ borderRadius: 12 }}>
                      <Statistic
                        title={<Text type="secondary">Due / Pending</Text>}
                        value={invoiceStats.totalPending}
                        prefix={<ClockCircleOutlined style={{ color: '#ea580c' }} />}
                        precision={0}
                        suffix="KES"
                        valueStyle={{ fontWeight: 700, color: invoiceStats.totalPending > 0 ? '#ea580c' : '#64748b' }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Invoices Table Card */}
                <Card
                  bordered
                  style={{ borderRadius: 14 }}
                  title={
                    <Space align="center">
                      <FileTextOutlined style={{ color: primaryColor }} />
                      <Text strong style={{ fontSize: 16 }}>Billing Invoices &amp; Receipts</Text>
                      <Tag color="cyan">Code: {tenant?.tenant_code || 'BASE'}</Tag>
                    </Space>
                  }
                  extra={
                    <Button
                      icon={<SyncOutlined spin={invoicesLoading} />}
                      onClick={() => refetchInvoices()}
                      size="small"
                    >
                      Refresh
                    </Button>
                  }
                >
                  <Table<TenantInvoice>
                    dataSource={invoices}
                    rowKey="_id"
                    loading={invoicesLoading}
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                    scroll={{ x: 650 }}
                    columns={[
                      {
                        title: 'Invoice #',
                        key: 'invoice_code',
                        render: (_, record) => (
                          <Text strong style={{ fontFamily: 'monospace', color: '#1e293b' }}>
                            {record.invoice_code || `INV-${record._id.slice(-6).toUpperCase()}`}
                          </Text>
                        ),
                      },
                      {
                        title: 'Product / Description',
                        key: 'description',
                        render: (_, record) => (
                          <div>
                            <Text strong style={{ display: 'block' }}>
                              {record.subscription_id?.name || record.module?.toUpperCase() || 'Ecosystem Module Plan'}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {record.subscription_id?.billing_cycle || 'Monthly Subscription'}
                            </Text>
                          </div>
                        ),
                      },
                      {
                        title: 'Amount',
                        key: 'amount',
                        render: (_, record) => (
                          <Text strong style={{ color: '#0f172a' }}>
                            KES {(record.amount || 0).toLocaleString()}
                          </Text>
                        ),
                      },
                      {
                        title: 'Due Date',
                        key: 'due_date',
                        render: (_, record) => {
                          const dateVal = record.due_date || record.createdAt;
                          return (
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              {dateVal ? new Date(dateVal).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                            </Text>
                          );
                        },
                      },
                      {
                        title: 'Status',
                        key: 'payment_status',
                        render: (_, record) => {
                          const status = (record.payment_status || 'pending').toLowerCase();
                          if (status === 'paid') {
                            return <Tag color="success" icon={<CheckCircleFilled />}>Paid</Tag>;
                          }
                          if (status === 'overdue') {
                            return <Tag color="error" icon={<CloseCircleOutlined />}>Overdue</Tag>;
                          }
                          return <Tag color="warning" icon={<ClockCircleOutlined />}>Pending</Tag>;
                        },
                      },
                      {
                        title: 'Action',
                        key: 'action',
                        render: (_, record) => {
                          const isPaid = (record.payment_status || '').toLowerCase() === 'paid';
                          if (isPaid) {
                            return (
                              <Button
                                size="small"
                                icon={<FileTextOutlined />}
                                onClick={() => {
                                  Modal.info({
                                    title: `Receipt for ${record.invoice_code || record._id}`,
                                    content: (
                                      <div style={{ marginTop: 12 }}>
                                        <p><strong>Amount Paid:</strong> KES {(record.amount || 0).toLocaleString()}</p>
                                        <p><strong>Status:</strong> Completed &amp; Verified</p>
                                        <p><strong>Tenant:</strong> {tenant?.name || tenant?.tenant_code}</p>
                                        <p style={{ color: '#64748b', fontSize: 12 }}>Official VAT invoice receipt dispatched to registered business email.</p>
                                      </div>
                                    ),
                                  });
                                }}
                              >
                                View Receipt
                              </Button>
                            );
                          }
                          return (
                            <Button
                              size="small"
                              type="primary"
                              icon={<MobileOutlined />}
                              style={{
                                backgroundColor: '#059669',
                                borderColor: '#059669',
                                fontWeight: 600,
                              }}
                              onClick={() => {
                                setPayingInvoice(record);
                                setMpesaPhone(tenant?.phone || '');
                              }}
                            >
                              Pay via M-Pesa
                            </Button>
                          );
                        },
                      },
                    ]}
                    locale={{
                      emptyText: (
                        <div style={{ padding: '32px 0', textAlign: 'center' }}>
                          <CheckCircleFilled style={{ fontSize: 36, color: '#10b981', marginBottom: 8 }} />
                          <Title level={5} style={{ margin: 0 }}>No Outstanding Invoices</Title>
                          <Text type="secondary">All module subscriptions and renewal invoices are fully up-to-date.</Text>
                        </div>
                      ),
                    }}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      {/* ── Plan Selection / Subscription Modal ── */}
      <Modal
        open={!!selectedModuleForPlan}
        onCancel={() => setSelectedModuleForPlan(null)}
        footer={null}
        width={1020}
        destroyOnHidden
        style={{ top: 24, maxWidth: '95vw' }}
        title={
          selectedModuleConfig ? (
            <Space align="center" size={12}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: `${selectedModuleConfig.color}14`,
                  border: `1px solid ${selectedModuleConfig.color}28`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                {selectedModuleConfig.icon}
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                  {selectedModuleConfig.name} Plans
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {selectedModuleConfig.subtitle}
                </Text>
              </div>
            </Space>
          ) : undefined
        }
      >
        <div style={{ marginTop: 14, marginBottom: 24, textAlign: 'center' }}>
          <Space align="center" size={12}>
            <Text strong style={{ color: '#475569' }}>Billing Cycle:</Text>
            <Segmented
              value={billingCycle}
              onChange={(val) => setBillingCycle(val as 'Monthly' | 'Yearly')}
              options={[
                { label: 'Monthly Billing', value: 'Monthly' },
                {
                  label: (
                    <Space size={6}>
                      <span>Annual Billing</span>
                      <Tag
                        color="success"
                        style={{
                          margin: 0,
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 6,
                          padding: '0 6px',
                        }}
                      >
                        SAVE 10%
                      </Tag>
                    </Space>
                  ),
                  value: 'Yearly',
                },
              ]}
            />
          </Space>
          <div style={{ marginTop: 10 }}>
            <Tag color="processing" icon={<GiftFilled />} style={{ borderRadius: 8, padding: '3px 10px', fontSize: 12 }}>
              1-Month Free Trial included on all plans • Instant workspace activation
            </Tag>
          </div>
        </div>

        {plansLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <SyncOutlined spin style={{ fontSize: 32, color: selectedModuleConfig?.color || primaryColor }} />
            <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 14 }}>
              Loading available subscription plans...
            </Text>
          </div>
        ) : (
          <Row gutter={[20, 20]} align="stretch">
            {displayPlans.map((plan, idx) => {
              const isRec = isRecommendedPlan(plan, idx, displayPlans.length);
              const displayName = getPlanDisplayName(plan, selectedModuleForPlan);
              const displayTier = getPlanTier(plan);
              const displayDesc = getPlanDescription(plan, selectedModuleForPlan);
              const isFree = plan.price === 0;
              const isYearly = billingCycle === 'Yearly';
              const monthlyPrice = plan.pricing?.monthly ?? plan.price;
              const yearlyPrice = plan.pricing?.yearly ?? Math.round(monthlyPrice * 12 * 0.9);
              const effectivePrice = isYearly ? yearlyPrice : monthlyPrice;
              const moduleColor = selectedModuleConfig?.color || primaryColor;
              const features = getValidPlanFeatures(plan, selectedModuleForPlan);

              const billingPeriodLabel = isFree
                ? 'forever'
                : isYearly
                ? 'year (10% off)'
                : plan.charging_model === 'per_shop'
                ? 'branch / month'
                : 'business / month';

              return (
                <Col xs={24} sm={12} lg={8} key={plan._id || plan.code || plan.name} style={{ display: 'flex' }}>
                  <Card
                    hoverable
                    style={{
                      width: '100%',
                      borderRadius: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      borderColor: isRec ? moduleColor : '#e2e8f0',
                      borderWidth: isRec ? 2 : 1,
                      boxShadow: isRec
                        ? `0 12px 30px ${moduleColor}25`
                        : '0 2px 10px rgba(0, 0, 0, 0.04)',
                      position: 'relative',
                      transition: 'all 0.25s ease',
                    }}
                    bodyStyle={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '100%',
                      flex: 1,
                      padding: '26px 22px 22px',
                    }}
                  >
                    {isRec && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -12,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: moduleColor,
                          color: '#ffffff',
                          padding: '2px 14px',
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          letterSpacing: '0.06em',
                          boxShadow: `0 4px 10px ${moduleColor}40`,
                          zIndex: 10,
                        }}
                      >
                        <CrownFilled style={{ color: '#fbbf24' }} />
                        <span>RECOMMENDED</span>
                      </div>
                    )}

                    <div>
                      {/* Plan Header & Tier Badge */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 8,
                        }}
                      >
                        <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                          {displayName}
                        </Title>
                        {displayTier && displayTier !== 'Free' && (
                          <Tag
                            color={isRec ? 'processing' : 'default'}
                            style={{ borderRadius: 6, fontSize: 11, margin: 0, fontWeight: 600 }}
                          >
                            {displayTier}
                          </Tag>
                        )}
                      </div>

                      {/* Plan Description */}
                      <Paragraph
                        type="secondary"
                        style={{
                          fontSize: 13,
                          lineHeight: '1.5',
                          minHeight: 40,
                          marginBottom: 16,
                          color: '#64748b',
                        }}
                      >
                        {displayDesc}
                      </Paragraph>

                      {/* Pricing Typography */}
                      <div
                        style={{
                          padding: '14px 0',
                          borderTop: '1px solid #f1f5f9',
                          borderBottom: '1px solid #f1f5f9',
                          marginBottom: 18,
                        }}
                      >
                        {isFree ? (
                          <div>
                            <Title
                              level={2}
                              style={{
                                margin: 0,
                                fontWeight: 800,
                                color: '#059669',
                                letterSpacing: '-0.02em',
                              }}
                            >
                              FREE
                            </Title>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                              Free forever for your business
                            </Text>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
                              <Title
                                level={2}
                                style={{
                                  margin: 0,
                                  fontWeight: 800,
                                  color: '#0f172a',
                                  letterSpacing: '-0.02em',
                                }}
                              >
                                KES {effectivePrice.toLocaleString()}
                              </Title>
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                / {billingPeriodLabel}
                              </Text>
                            </div>

                            {isYearly && (
                              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Tag color="success" style={{ margin: 0, fontSize: 10, fontWeight: 700, borderRadius: 4 }}>
                                  10% OFF
                                </Tag>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  ≈ KES {Math.round(effectivePrice / 12).toLocaleString()} / mo billed annually
                                </Text>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Included Features List (Natural expansion, NO internal card scroll!) */}
                      <div style={{ marginBottom: 20 }}>
                        <Text
                          strong
                          style={{
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: '#94a3b8',
                            display: 'block',
                            marginBottom: 12,
                          }}
                        >
                          Included Features:
                        </Text>

                        {features.length > 0 ? (
                          <Space direction="vertical" size={9} style={{ width: '100%' }}>
                            {features.map((featName, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 9,
                                }}
                              >
                                <CheckCircleFilled
                                  style={{
                                    color: isRec ? moduleColor : '#10b981',
                                    fontSize: 14,
                                    marginTop: 3,
                                    flexShrink: 0,
                                  }}
                                />
                                <Text style={{ fontSize: 13, lineHeight: '19px', color: '#334155' }}>
                                  {featName}
                                </Text>
                              </div>
                            ))}
                          </Space>
                        ) : (
                          <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>
                            Full suite of {selectedModuleConfig?.name || 'module'} features included
                          </Text>
                        )}
                      </div>
                    </div>

                    {/* Action Button pinned at bottom */}
                    <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                      <Button
                        type={isRec ? 'primary' : 'default'}
                        block
                        size="large"
                        loading={subscribeMutation.isLoading}
                        onClick={() => selectedModuleForPlan && handleSubscribe(selectedModuleForPlan, plan)}
                        style={{
                          borderRadius: 8,
                          fontWeight: 600,
                          backgroundColor: isRec ? moduleColor : undefined,
                          borderColor: isRec ? moduleColor : undefined,
                        }}
                      >
                        Start 1-Month Free Trial
                      </Button>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Modal>

      {/* ── Instant M-Pesa Payment Modal (BFF Gateway) ── */}
      <Modal
        open={!!payingInvoice}
        onCancel={() => {
          if (!initiatePaymentMutation.isLoading) {
            setPayingInvoice(null);
          }
        }}
        footer={null}
        width={460}
        destroyOnHidden
        title={
          <Space align="center" size={10}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: '#05966914',
                border: '1px solid #05966930',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                fontSize: 20,
              }}
            >
              <MobileOutlined />
            </div>
            <div>
              <Title level={5} style={{ margin: 0, fontWeight: 700 }}>
                Instant M-Pesa Checkout
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Lipa Na M-Pesa Online STK Push
              </Text>
            </div>
          </Space>
        }
      >
        {payingInvoice && (
          <div style={{ marginTop: 16 }}>
            <Card
              size="small"
              style={{
                borderRadius: 10,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                marginBottom: 16,
              }}
            >
              <Row justify="space-between" align="middle">
                <Col>
                  <Text type="secondary" style={{ fontSize: 12 }}>Invoice Code</Text>
                  <div>
                    <Text strong style={{ fontFamily: 'monospace', fontSize: 14 }}>
                      {payingInvoice.invoice_code || `INV-${payingInvoice._id.slice(-6).toUpperCase()}`}
                    </Text>
                  </div>
                </Col>
                <Col style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Total Due</Text>
                  <div>
                    <Text strong style={{ fontSize: 18, color: '#059669' }}>
                      KES {(payingInvoice.amount || 0).toLocaleString()}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>

            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Safaricom M-Pesa Phone Number:
              </Text>
              <Input
                size="large"
                prefix={<span style={{ color: '#64748b', fontWeight: 600 }}>+254</span>}
                placeholder="712 345 678"
                value={mpesaPhone.replace(/^(\+?254|0)/, '')}
                onChange={(e) => setMpesaPhone(`254${e.target.value.replace(/\D/g, '')}`)}
                style={{ borderRadius: 8, fontSize: 16 }}
              />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                Ensure your phone is unlocked. You will receive an instant prompt on your screen to enter your M-Pesa PIN.
              </Text>
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={initiatePaymentMutation.isLoading}
              style={{
                backgroundColor: '#059669',
                borderColor: '#059669',
                borderRadius: 8,
                fontWeight: 600,
                height: 44,
              }}
              onClick={async () => {
                if (!mpesaPhone || mpesaPhone.length < 9) {
                  message.warning('Please enter a valid M-Pesa phone number');
                  return;
                }
                const formatted = mpesaPhone.startsWith('254') ? mpesaPhone : `254${mpesaPhone.replace(/^0/, '')}`;
                try {
                  await initiatePaymentMutation.mutateAsync({
                    invoiceId: payingInvoice._id,
                    mpesaPhoneNumber: formatted,
                    amount: payingInvoice.amount,
                  });
                  setPayingInvoice(null);
                } catch (_) {}
              }}
            >
              Pay KES {(payingInvoice.amount || 0).toLocaleString()} via M-Pesa
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BillingDashboard;
