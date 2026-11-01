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
} from '@ant-design/icons';

import { usePrimaryColor } from '@context/PrimaryColorContext';
import { THEME_C } from '@utils/getPrimaryColor';
import { useTenantModules } from '@hooks/useTenantModules';
import { isModuleEnabled, readStoredTenant } from '@utils/parseTenantModules';
import {
  BaseModuleKey,
  DEFAULT_BASE_PLANS,
  SaaSSubscriptionPlan,
} from '@shared/types/pricing';
import { useSubscribeModule, useModulePricing } from '@shared/hooks/usePricing';
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

  // Selected module for plan modal
  const [selectedModuleForPlan, setSelectedModuleForPlan] = useState<BaseModuleKey | null>(null);
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Monthly');

  // Load pricing plans for the selected modal module
  const { plans: livePlans, isLoading: plansLoading } = useModulePricing(
    selectedModuleForPlan || 'duka'
  );

  const displayPlans = useMemo(() => {
    if (!selectedModuleForPlan) return [];
    if (livePlans && livePlans.length > 0) return livePlans;
    return DEFAULT_BASE_PLANS[selectedModuleForPlan] || [];
  }, [selectedModuleForPlan, livePlans]);

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
                                  <Text strong style={{ fontSize: 16, color: C.darkText, display: 'block' }}>
                                    {config.name}
                                  </Text>
                                  <Text style={{ fontSize: 11, color: '#64748b' }}>
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

                            <Text style={{ fontSize: 12, color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                              {config.subtitle}
                            </Text>
                            <Paragraph style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
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
              </Space>
            ),
            children: (
              <div style={{ marginTop: 16 }}>
                <Card bordered style={{ borderRadius: 14 }}>
                  <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                    <div style={{ fontSize: 40, color: '#3b82f6', marginBottom: 12 }}>
                      <FileTextOutlined />
                    </div>
                    <Title level={4} style={{ marginBottom: 6 }}>
                      Invoices &amp; Payment Receipts
                    </Title>
                    <Paragraph style={{ color: '#64748b', maxWidth: 480, margin: '0 auto 16px' }}>
                      Subscription payments are processed through M-Pesa or Card. When a module renewal occurs, an automated receipt is generated and emailed to your billing contact.
                    </Paragraph>
                    <Space size={10}>
                      <Tag color="cyan">Business Code: {tenant?.tenant_code || 'BASE'}</Tag>
                      <Tag color="green">VAT Inclusive: {tenant?.is_vat_enabled ? 'Yes (16%)' : 'No'}</Tag>
                    </Space>
                  </div>
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
        width={960}
        destroyOnHidden
        title={
          selectedModuleForPlan ? (
            <Space align="center" size={10}>
              <span style={{ fontSize: 24 }}>
                {MODULE_CONFIGS.find((m) => m.key === selectedModuleForPlan)?.icon}
              </span>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {MODULE_CONFIGS.find((m) => m.key === selectedModuleForPlan)?.name} Plans
                </Title>
                <Text style={{ fontSize: 12, color: '#64748b' }}>
                  {MODULE_CONFIGS.find((m) => m.key === selectedModuleForPlan)?.subtitle}
                </Text>
              </div>
            </Space>
          ) : undefined
        }
      >
        <div style={{ marginTop: 12, marginBottom: 20, textAlign: 'center' }}>
          <Space align="center" size={12}>
            <Text style={{ fontWeight: 600 }}>Billing Cycle:</Text>
            <Segmented
              value={billingCycle}
              onChange={(val) => setBillingCycle(val as 'Monthly' | 'Yearly')}
              options={[
                { label: 'Monthly Billing', value: 'Monthly' },
                {
                  label: (
                    <Space size={4}>
                      <span>Annual Billing</span>
                      <Tag color="success" style={{ margin: 0, padding: '0 6px', borderRadius: 8, fontSize: 10 }}>
                        Save 10%
                      </Tag>
                    </Space>
                  ),
                  value: 'Yearly',
                },
              ]}
            />
          </Space>
          <div style={{ marginTop: 8 }}>
            <Tag color="processing" icon={<GiftFilled />}>
              1-Month Free Trial included on all plans
            </Tag>
          </div>
        </div>

        {plansLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <SyncOutlined spin style={{ fontSize: 28, color: primaryColor }} />
            <Text style={{ display: 'block', marginTop: 10, color: '#64748b' }}>Loading available plans...</Text>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {displayPlans.map((plan) => {
              const monthlyPrice = plan.pricing?.monthly ?? plan.price;
              const yearlyPrice = plan.pricing?.yearly ?? Math.round(monthlyPrice * 12 * 0.9);
              const effectivePrice = billingCycle === 'Yearly' ? yearlyPrice : monthlyPrice;

              return (
                <Col xs={24} sm={12} lg={8} key={plan._id || plan.name}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 14,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: plan.is_recommended ? `2px solid ${primaryColor}` : '1px solid #e2e8f0',
                    }}
                    bodyStyle={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', padding: 20 }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text strong style={{ fontSize: 16 }}>{plan.name}</Text>
                        {plan.is_recommended && (
                          <Tag color="blue" style={{ borderRadius: 8 }}>Recommended</Tag>
                        )}
                      </div>

                      <div style={{ margin: '14px 0' }}>
                        <Text style={{ fontSize: 24, fontWeight: 700, color: C.darkText }}>
                          KES {effectivePrice.toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                          /{billingCycle === 'Yearly' ? 'year' : 'month'}
                        </Text>
                      </div>

                      {plan.description && (
                        <Paragraph style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                          {plan.description}
                        </Paragraph>
                      )}

                      <Divider style={{ margin: '12px 0' }} />

                      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                        {Array.isArray(plan.features) &&
                          plan.features.map((feat: any, idx: number) => {
                            const featText = typeof feat === 'string' ? feat : feat?.name || feat?.code;
                            return (
                              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                                <CheckCircleFilled style={{ color: '#10b981', fontSize: 12, marginTop: 3 }} />
                                <Text style={{ fontSize: 11, color: '#334155' }}>{featText}</Text>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <Button
                        type={plan.is_recommended ? 'primary' : 'default'}
                        block
                        loading={subscribeMutation.isLoading}
                        onClick={() => selectedModuleForPlan && handleSubscribe(selectedModuleForPlan, plan)}
                        style={{ borderRadius: 8, fontWeight: 600 }}
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
    </div>
  );
};

export default BillingDashboard;
