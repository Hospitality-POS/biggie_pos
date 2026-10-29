import React, { useState } from 'react';
import { Card, Button, Typography, Tag, Row, Col, Space, Spin, Alert, Modal, Segmented } from 'antd';
import {
  CheckCircleOutlined,
  CrownOutlined,
  ThunderboltOutlined,
  ArrowRightOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { BaseModuleKey, SaaSSubscriptionPlan } from '../types/pricing';
import { useModuleLicense } from './useModuleLicense';
import { useModulePricing } from '../hooks/usePricing';
import { useResponsive } from '../hooks/useResponsive';

const { Title, Paragraph, Text } = Typography;

export interface ModuleGateProps {
  moduleId: BaseModuleKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const MODULE_META: Record<
  BaseModuleKey,
  { name: string; subtitle: string; description: string; color: string; icon: string }
> = {
  duka: {
    name: 'Duka by Base',
    subtitle: 'Point of Sale, Inventory & Restaurant Operations',
    description:
      'Manage multiple shop fronts, POS cashier terminals, recipe management, modifiers, offline orders, and kitchen display systems seamlessly.',
    color: '#0b2f78',
    icon: '🛒',
  },
  pesa: {
    name: 'Pesa by Base',
    subtitle: 'Financial Accounting, Invoices & Tax Compliance',
    description:
      'Multi-currency double-entry bookkeeping, chart of accounts, bank reconciliations, VAT/ETIMS reports, and automated financial statements.',
    color: '#0d9488',
    icon: '💰',
  },
  bandu: {
    name: 'Bandu by Base',
    subtitle: 'Human Resources, Shifts & Payroll Engine',
    description:
      'Manage employee profiles, automated PAYE/NHIF/NSSF payroll, attendance biometric sync, shift schedules, and PDF payslip delivery.',
    color: '#7c3aed',
    icon: '👥',
  },
  dala: {
    name: 'Dala by Base',
    subtitle: 'Real Estate, Leases & Property Management',
    description:
      'Complete property lifecycle: multi-unit inventory, digital lease contracts, automated rent invoicing, meter readings, and maintenance tracking.',
    color: '#2563eb',
    icon: '🏢',
  },
  mteja: {
    name: 'Mteja by Base',
    subtitle: 'CRM, WhatsApp & Omnichannel Customer Engagement',
    description:
      'Track sales leads, run targeted broadcast campaigns, automate WhatsApp workflows, and view 360-degree customer purchase history.',
    color: '#ea580c',
    icon: '💬',
  },
  esign: {
    name: 'ESign by Base',
    subtitle: 'Document Center & Legally-Binding Digital Signatures',
    description:
      'Prepare contract templates, embed dynamic placeholder tags, dispatch signing links, and generate audit-trailed signed PDFs.',
    color: '#059669',
    icon: '✍️',
  },
};

export const ModuleGate: React.FC<ModuleGateProps> = ({
  moduleId,
  children,
  fallback,
}) => {
  const { isLicensed, enableModule, isActivating } = useModuleLicense(moduleId);
  const { plans, isLoading } = useModulePricing(moduleId);
  const { isMobile } = useResponsive();
  const [selectedPlan, setSelectedPlan] = useState<SaaSSubscriptionPlan | null>(null);

  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Monthly');

  if (isLicensed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const meta = MODULE_META[moduleId] || {
    name: moduleId.toUpperCase(),
    subtitle: 'Modular Ecosystem Feature',
    description: 'Subscribe to access this module.',
    color: '#0b2f78',
    icon: '🔒',
  };

  const handleActivate = async (plan?: SaaSSubscriptionPlan) => {
    try {
      await enableModule(plan?._id);
    } catch {
      // Error handled by hook notification
    }
  };

  return (
    <div
      style={{
        padding: isMobile ? '16px' : '32px 24px',
        maxWidth: 1100,
        margin: '0 auto',
        minHeight: '80vh',
      }}
    >
      {/* Header Banner */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          background: `linear-gradient(135deg, ${meta.color}15, #ffffff)`,
          border: `1px solid ${meta.color}30`,
          marginBottom: 24,
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space align="center" size={16}>
            <span style={{ fontSize: 40 }}>{meta.icon}</span>
            <div>
              <Space>
                <Title level={2} style={{ margin: 0, color: meta.color }}>
                  {meta.name}
                </Title>
                <Tag color="orange" icon={<LockOutlined />}>
                  License Required
                </Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 16, display: 'block' }}>
                {meta.subtitle}
              </Text>
            </div>
          </Space>

          <Paragraph style={{ fontSize: 15, color: '#4b5563', margin: '8px 0 0' }}>
            {meta.description}
          </Paragraph>
        </Space>
      </Card>

      {/* Pricing Header & Billing Toggle */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            Choose a Plan to Get Started
          </Title>
          <Space size={8} wrap>
            <Tag color="green">🎁 1-Month Free Trial on All Plans</Tag>
            <Tag color="blue">10% Off Annual Billing</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Prices in KES, exclude 16% VAT
            </Text>
          </Space>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Segmented
            value={billingCycle}
            onChange={(val) => setBillingCycle(val as 'Monthly' | 'Yearly')}
            options={[
              { label: 'Monthly', value: 'Monthly' },
              {
                label: (
                  <span>
                    Annual <Tag color="success" style={{ margin: 0, marginLeft: 4, fontSize: 10 }}>SAVE 10%</Tag>
                  </span>
                ),
                value: 'Yearly',
              },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Loading module pricing from admin portal...</Text>
          </div>
        </div>
      ) : plans.length > 0 ? (
        <Row gutter={[24, 24]}>
          {plans.map((plan) => {
            const isRec = plan.is_recommended;
            const isFree = plan.price === 0;
            const isYearly = billingCycle === 'Yearly';
            const priceAmount = isYearly
              ? plan.pricing?.yearly || Math.round(plan.price * 12 * 0.9)
              : plan.price;
            const billingPeriodLabel = isFree
              ? 'forever'
              : isYearly
              ? 'year (10% off)'
              : plan.charging_model === 'per_shop'
              ? 'branch / month'
              : 'business / month';

            return (
              <Col xs={24} sm={12} lg={8} key={plan._id}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 14,
                    borderColor: isRec ? meta.color : '#e5e7eb',
                    borderWidth: isRec ? 2 : 1,
                    position: 'relative',
                    boxShadow: isRec ? `0 8px 24px ${meta.color}20` : undefined,
                  }}
                  bodyStyle={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    padding: 24,
                  }}
                >
                  {isRec && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -12,
                        right: 20,
                        backgroundColor: meta.color,
                        color: '#fff',
                        padding: '2px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <CrownOutlined /> RECOMMENDED
                    </div>
                  )}

                  <Title level={4} style={{ marginBottom: 4 }}>
                    {plan.name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13, minHeight: 38, display: 'block' }}>
                    {plan.description || `${plan.charging_model.replace('_', ' ')} plan`}
                  </Text>

                  <div style={{ margin: '16px 0 20px 0' }}>
                    {isFree ? (
                      <span style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>
                        FREE
                      </span>
                    ) : (
                      <>
                        <span style={{ fontSize: 32, fontWeight: 700, color: '#111827' }}>
                          KES {priceAmount.toLocaleString()}
                        </span>
                        <Text type="secondary" style={{ fontSize: 13, marginLeft: 6 }}>
                          / {billingPeriodLabel}
                        </Text>
                        {isYearly && (
                          <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>
                            ≈ KES {Math.round(priceAmount / 12).toLocaleString()} / month
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Feature list */}
                  <div style={{ flex: 1, marginBottom: 24 }}>
                    <Text strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#6b7280' }}>
                      Included Features:
                    </Text>
                    <div style={{ marginTop: 12 }}>
                      {Array.isArray(plan.features) &&
                        plan.features.slice(0, 8).map((f, idx) => {
                          const featureName = typeof f === 'string' ? f : f.name;
                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 8,
                                fontSize: 13,
                              }}
                            >
                              <CheckCircleOutlined style={{ color: '#10b981' }} />
                              <span>{featureName}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <Button
                    type={isRec ? 'primary' : 'default'}
                    block
                    size="large"
                    loading={isActivating}
                    onClick={() => handleActivate(plan)}
                    style={{
                      borderRadius: 8,
                      ...(isRec && { backgroundColor: meta.color, borderColor: meta.color }),
                    }}
                  >
                    {isFree ? 'Start Free Forever' : 'Start 1-Month Free Trial'}
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        /* Fallback when no plans are configured yet in admin portal */
        <Card
          bordered={false}
          style={{
            borderRadius: 14,
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#f9fafb',
          }}
        >
          <ThunderboltOutlined style={{ fontSize: 44, color: meta.color, marginBottom: 16 }} />
          <Title level={4}>Instant Module Activation</Title>
          <Paragraph style={{ maxWidth: 500, margin: '0 auto 24px', color: '#6b7280' }}>
            Ready to empower your workspace with {meta.name}? Enable it now to start your free
            onboarding trial.
          </Paragraph>
          <Button
            type="primary"
            size="large"
            loading={isActivating}
            onClick={() => handleActivate()}
            style={{
              backgroundColor: meta.color,
              borderColor: meta.color,
              borderRadius: 8,
              padding: '0 32px',
            }}
          >
            Activate {meta.name} Now
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ModuleGate;
