import React, { useState } from 'react';
import { Button, Typography, Tag, Row, Col, Space, Spin, Segmented } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import {
  CheckCircleFilled,
  CrownFilled,
  ThunderboltFilled,
  LockOutlined,
  RocketFilled,
  GiftFilled,
  SafetyCertificateFilled,
  CustomerServiceFilled,
  ClockCircleFilled,
  PercentageOutlined,
} from '@ant-design/icons';
import { BaseModuleKey, SaaSSubscriptionPlan, DEFAULT_BASE_PLANS } from '../types/pricing';
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

/**
 * Robust helper to safely extract feature label from strings or populated MongoDB objects
 */
const extractFeatureName = (f: any): string => {
  if (typeof f === 'string') return f.trim();
  if (!f) return '';
  return (
    f?.feature?.name ||
    f?.name ||
    f?.feature?.key ||
    f?.key ||
    f?.feature?.code ||
    f?.code ||
    ''
  ).trim();
};

/**
 * Filter and extract valid non-empty feature strings
 */
const getValidPlanFeatures = (plan: SaaSSubscriptionPlan): string[] => {
  if (!Array.isArray(plan.features)) return [];
  const list: string[] = [];
  for (const item of plan.features) {
    if (typeof item === 'string' && item.trim()) {
      list.push(item.trim());
    } else if (typeof item === 'object' && item !== null) {
      if ((item as any).enabled === false) continue;
      const name = extractFeatureName(item);
      if (name) list.push(name);
    }
  }
  return list;
};

export const ModuleGate: React.FC<ModuleGateProps> = ({
  moduleId,
  children,
  fallback,
}) => {
  const { isLicensed, enableModule, isActivating } = useModuleLicense(moduleId);
  const { plans, isLoading } = useModulePricing(moduleId);
  const { isMobile } = useResponsive();

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

  // Filter backend plans to strictly match the current moduleId or its solution aliases
  const modulePlans = (plans || []).filter((p) => {
    if (!p) return false;
    if (p.module && p.module.toLowerCase() === moduleId.toLowerCase()) return true;
    const sol = (p.solution_type || '').toLowerCase();
    if (moduleId === 'duka' && (sol.includes('pos') || sol.includes('retail') || sol.includes('duka'))) return true;
    if (moduleId === 'pesa' && (sol.includes('account') || sol.includes('pesa'))) return true;
    if (moduleId === 'bandu' && (sol.includes('payroll') || sol.includes('bandu') || sol.includes('hr'))) return true;
    if (moduleId === 'dala' && (sol.includes('prop') || sol.includes('dala') || sol.includes('estate'))) return true;
    if (moduleId === 'mteja' && (sol.includes('crm') || sol.includes('mteja') || sol.includes('chat'))) return true;
    if (moduleId === 'esign' && (sol.includes('sign') || sol.includes('esign') || sol.includes('doc'))) return true;
    return false;
  });

  // Fallback to official Kenyan pricing matrix if no matching plans from backend
  const displayPlans = modulePlans.length > 0 ? modulePlans : (DEFAULT_BASE_PLANS[moduleId] || []);

  const handleActivate = async (plan?: SaaSSubscriptionPlan) => {
    try {
      await enableModule(plan?._id, billingCycle);
    } catch {
      // Error handled by hook notification
    }
  };

  return (
    <div
      style={{
        padding: isMobile ? '16px 12px' : '32px 24px',
        maxWidth: 1180,
        margin: '0 auto',
        minHeight: '80vh',
      }}
    >
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. Header Banner using ProCard                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <ProCard
        bordered
        style={{
          borderRadius: 18,
          background: `linear-gradient(135deg, ${meta.color}14 0%, #ffffff 85%)`,
          borderColor: `${meta.color}35`,
          marginBottom: 28,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        }}
        bodyStyle={{ padding: isMobile ? '20px 16px' : '28px 32px' }}
      >
        <Row gutter={[24, 20]} align="middle">
          <Col xs={24} md={16}>
            <Space align="start" size={16}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 16,
                  backgroundColor: `${meta.color}18`,
                  border: `1px solid ${meta.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 30,
                  flexShrink: 0,
                  boxShadow: `0 4px 12px ${meta.color}20`,
                }}
              >
                {meta.icon}
              </div>
              <div>
                <Space align="center" size={10} wrap>
                  <Title level={2} style={{ margin: 0, color: meta.color, fontWeight: 700 }}>
                    {meta.name}
                  </Title>
                  <Tag
                    color="warning"
                    icon={<LockOutlined />}
                    style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 600 }}
                  >
                    License Required
                  </Tag>
                </Space>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: '#475569',
                    display: 'block',
                    marginTop: 4,
                  }}
                >
                  {meta.subtitle}
                </Text>
                <Paragraph
                  style={{
                    fontSize: 13,
                    color: '#64748b',
                    margin: '8px 0 0',
                    lineHeight: 1.6,
                  }}
                >
                  {meta.description}
                </Paragraph>
              </div>
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <Space
              direction="vertical"
              size={8}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'flex-end',
              }}
            >
              <Tag color="cyan" icon={<GiftFilled />} style={{ borderRadius: 8, padding: '4px 10px', fontSize: 12, margin: 0 }}>
                1-Month Free Trial on All Plans
              </Tag>
              <Tag color="blue" icon={<SafetyCertificateFilled />} style={{ borderRadius: 8, padding: '4px 10px', fontSize: 12, margin: 0 }}>
                KRA & Legal Compliance Ready
              </Tag>
              <Tag color="purple" icon={<ThunderboltFilled />} style={{ borderRadius: 8, padding: '4px 10px', fontSize: 12, margin: 0 }}>
                Instant Workspace Provisioning
              </Tag>
            </Space>
          </Col>
        </Row>
      </ProCard>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. Control Bar & Billing Cycle Toggle                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 16,
          marginBottom: 26,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Choose a Plan to Get Started
          </Title>
          <Space size={8} wrap style={{ marginTop: 4 }}>
            <Tag color="success" icon={<GiftFilled />}>1-Month Free Trial</Tag>
            <Tag color="processing" icon={<PercentageOutlined />}>Annual Save 10%</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Prices in KES, exclude 16% VAT
            </Text>
          </Space>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            padding: 4,
            borderRadius: 10,
          }}
        >
          <Segmented
            value={billingCycle}
            onChange={(val) => setBillingCycle(val as 'Monthly' | 'Yearly')}
            options={[
              { label: 'Monthly Billing', value: 'Monthly' },
              {
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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
                  </span>
                ),
                value: 'Yearly',
              },
            ]}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. Pricing Cards Grid using ProCard                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Loading module pricing from admin portal...</Text>
          </div>
        </div>
      ) : displayPlans.length > 0 ? (
        <Row
          gutter={[24, 24]}
          justify={displayPlans.length <= 2 ? 'center' : 'start'}
          align="stretch"
        >
          {displayPlans.map((plan) => {
            const isRec = Boolean(plan.is_recommended);
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

            const features = getValidPlanFeatures(plan);

            // Responsive column widths based on count of plans
            const colSpan =
              displayPlans.length === 1
                ? { xs: 24, sm: 16, md: 12 }
                : displayPlans.length === 2
                ? { xs: 24, sm: 12, md: 12, lg: 10 }
                : displayPlans.length === 4
                ? { xs: 24, sm: 12, lg: 6 }
                : { xs: 24, sm: 12, lg: 8 };

            return (
              <Col {...colSpan} key={plan._id || plan.code || plan.name} style={{ display: 'flex' }}>
                <ProCard
                  bordered
                  hoverable
                  style={{
                    width: '100%',
                    borderRadius: 16,
                    borderColor: isRec ? meta.color : '#e2e8f0',
                    borderWidth: isRec ? 2 : 1,
                    boxShadow: isRec
                      ? `0 16px 36px ${meta.color}25`
                      : '0 4px 16px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  bodyStyle={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    padding: '28px 24px 24px',
                  }}
                >
                  {/* Recommended Floating Badge */}
                  {isRec && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: meta.color,
                        color: '#ffffff',
                        padding: '3px 16px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        letterSpacing: '0.06em',
                        boxShadow: `0 4px 12px ${meta.color}45`,
                        zIndex: 10,
                      }}
                    >
                      <CrownFilled style={{ color: '#fbbf24' }} />
                      <span>RECOMMENDED</span>
                    </div>
                  )}

                  {/* Plan Name & Tier Badge */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <Title
                        level={4}
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        {plan.name}
                      </Title>
                    </div>
                    {plan.tier && plan.tier !== 'Free' && (
                      <Tag
                        color={isRec ? 'processing' : 'default'}
                        style={{ borderRadius: 6, fontSize: 11, margin: 0 }}
                      >
                        {plan.tier}
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
                    {plan.description || `${plan.charging_model?.replace('_', ' ') || 'Subscription'} plan`}
                  </Paragraph>

                  {/* Pricing Typography */}
                  <div
                    style={{
                      padding: '16px 0',
                      borderTop: '1px solid #f1f5f9',
                      borderBottom: '1px solid #f1f5f9',
                      marginBottom: 20,
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
                            KES {priceAmount.toLocaleString()}
                          </Title>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            / {billingPeriodLabel}
                          </Text>
                        </div>

                        {isYearly && (
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Tag color="success" style={{ margin: 0, fontSize: 10, fontWeight: 700, borderRadius: 4 }}>
                              10% OFF
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              ≈ KES {Math.round(priceAmount / 12).toLocaleString()} / month billed annually
                            </Text>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Included Features List */}
                  <div style={{ flex: 1, marginBottom: 24 }}>
                    <Text
                      strong
                      style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#94a3b8',
                        display: 'block',
                        marginBottom: 14,
                      }}
                    >
                      Included Features:
                    </Text>

                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      {features.map((featName, fIdx) => (
                        <div
                          key={fIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                          }}
                        >
                          <CheckCircleFilled
                            style={{
                              color: isRec ? meta.color : '#10b981',
                              fontSize: 15,
                              marginTop: 2,
                              flexShrink: 0,
                            }}
                          />
                          <Text style={{ fontSize: 13, lineHeight: '19px', color: '#334155' }}>
                            {featName}
                          </Text>
                        </div>
                      ))}
                    </Space>
                  </div>

                  {/* Action CTA Button */}
                  <div>
                    <Button
                      type={isRec ? 'primary' : 'default'}
                      block
                      size="large"
                      icon={isFree ? <RocketFilled /> : <ThunderboltFilled />}
                      loading={isActivating}
                      onClick={() => handleActivate(plan)}
                      style={{
                        height: 46,
                        borderRadius: 10,
                        fontWeight: 600,
                        fontSize: 14,
                        ...(isRec
                          ? {
                              backgroundColor: meta.color,
                              borderColor: meta.color,
                              boxShadow: `0 4px 14px ${meta.color}40`,
                            }
                          : {
                              borderColor: '#cbd5e1',
                            }),
                      }}
                    >
                      {isFree ? 'Start Free Forever' : 'Start 1-Month Free Trial'}
                    </Button>

                    <Text
                      type="secondary"
                      style={{
                        fontSize: 11,
                        textAlign: 'center',
                        display: 'block',
                        marginTop: 8,
                        color: '#94a3b8',
                      }}
                    >
                      {isFree ? 'Instant activation • No card required' : '1-month free trial • Cancel anytime'}
                    </Text>
                  </div>
                </ProCard>
              </Col>
            );
          })}
        </Row>
      ) : (
        /* Fallback when no plans are configured yet in admin portal */
        <ProCard
          bordered
          style={{
            borderRadius: 16,
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: `${meta.color}15`,
              color: meta.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 32,
            }}
          >
            <ThunderboltFilled />
          </div>
          <Title level={3} style={{ marginBottom: 8 }}>
            Instant Module Activation
          </Title>
          <Paragraph style={{ maxWidth: 520, margin: '0 auto 24px', color: '#64748b', fontSize: 14 }}>
            Ready to empower your workspace with {meta.name}? Enable it now to start your 1-month free onboarding trial.
          </Paragraph>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltFilled />}
            loading={isActivating}
            onClick={() => handleActivate()}
            style={{
              backgroundColor: meta.color,
              borderColor: meta.color,
              borderRadius: 10,
              height: 46,
              padding: '0 36px',
              fontWeight: 600,
              boxShadow: `0 4px 14px ${meta.color}40`,
            }}
          >
            Activate {meta.name} Now
          </Button>
        </ProCard>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 4. Trust & Security Footer using ProCard                           */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <ProCard
        bordered
        style={{
          marginTop: 36,
          borderRadius: 14,
          backgroundColor: '#f8fafc',
          borderColor: '#e2e8f0',
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} md={8}>
            <Space align="start" size={12}>
              <SafetyCertificateFilled style={{ fontSize: 22, color: '#0d9488', marginTop: 2 }} />
              <div>
                <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>
                  Enterprise Security & Tax Compliant
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  KRA eTIMS ready, automated audit trails & encrypted storage.
                </Text>
              </div>
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <Space align="start" size={12}>
              <ClockCircleFilled style={{ fontSize: 22, color: '#3b82f6', marginTop: 2 }} />
              <div>
                <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>
                  30-Day Risk-Free Trial
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Enjoy full product access. Cancel or adjust anytime in 1 click.
                </Text>
              </div>
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <Space align="start" size={12}>
              <CustomerServiceFilled style={{ fontSize: 22, color: '#8b5cf6', marginTop: 2 }} />
              <div>
                <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>
                  Dedicated Kenyan Support
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Direct WhatsApp, phone, and on-site onboarding assistance 7 days a week.
                </Text>
              </div>
            </Space>
          </Col>
        </Row>
      </ProCard>
    </div>
  );
};

export default ModuleGate;
