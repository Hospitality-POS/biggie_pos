import React, { useState, useEffect } from "react";
import {
  Typography,
  Progress,
  Steps,
  Row,
  Col,
  Statistic,
  Alert,
  Divider,
  Collapse,
} from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  ClockCircleOutlined,
  CalendarOutlined,
  ApiOutlined,
  AuditOutlined,
  SafetyCertificateTwoTone,
  LoadingOutlined,
  UpOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Title, Paragraph } = Typography;

interface AuditMilestone {
  title: string;
  description: string;
  detail: string;
  durationSec: number;
}

const AUDIT_MILESTONES: AuditMilestone[] = [
  {
    title: "Session Authorization",
    description: "Tenant Verification",
    detail: "Validating tenant security token and establishing secure scoring gateway...",
    durationSec: 4,
  },
  {
    title: "Duka Transactions",
    description: "16-Month Sales History",
    detail: "Extracting multi-channel sales receipts and inventory turns from Duka POS...",
    durationSec: 8,
  },
  {
    title: "General Ledger(Pesa)",
    description: "Accounting & Aging",
    detail: "Reconciling Pesa double-entry journals, trial balance, and debtor/creditor aging...",
    durationSec: 10,
  },
  {
    title: "Workforce(Bandu) & CRM(Mteja)",
    description: "Payroll & Retention",
    detail: "Auditing Bandu wage stability, staff turnover, and Mteja customer lifetime value...",
    durationSec: 10,
  },
  {
    title: "Metric Synthesis",
    description: "75 Health Ratios",
    detail: "Evaluating 75 quantitative measures across 6 dimensions and validating red flags...",
    durationSec: 12,
  },
];

export const ProcessingState: React.FC<{
  title?: string;
  subtitle?: string;
}> = ({
  title = "Computing Comprehensive Business Health Audit",
  subtitle = "Aggregating and analysing multi-product data across Duka (POS & Inventory), Pesa (Double-Entry Accounting), Bandu (Staff & Payroll), Mteja (CRM), and Dala (Properties)...",
}) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const primaryColor = usePrimaryColor();

    useEffect(() => {
      const timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    // Determine current milestone
    let accumulated = 0;
    let currentStepIndex = AUDIT_MILESTONES.length - 1;

    for (let i = 0; i < AUDIT_MILESTONES.length; i++) {
      accumulated += AUDIT_MILESTONES[i].durationSec;
      if (elapsedSeconds < accumulated) {
        currentStepIndex = i;
        break;
      }
    }

    const totalTargetSec = AUDIT_MILESTONES.reduce((sum, s) => sum + s.durationSec, 0);
    const rawProgress = Math.min((elapsedSeconds / totalTargetSec) * 92, 95);
    const progressPercent = Math.max(10, Math.round(rawProgress));

    const currentMilestone = AUDIT_MILESTONES[currentStepIndex];

    return (
      <ProCard
        ghost
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "32px auto",
        }}
      >
        <div style={{ textAlign: "center", padding: "24px 16px 8px" }}>
          {/* ── HEADER & ICON ── */}
          <SafetyCertificateTwoTone
            twoToneColor={primaryColor}
            style={{ fontSize: 44, marginBottom: 16 }}
          />

          <Title level={3} style={{ margin: "0 0 10px", fontWeight: 600, color: "#1f2937" }}>
            {title}
          </Title>

          <Paragraph
            type="secondary"
            style={{
              maxWidth: 620,
              margin: "0 auto 28px",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {subtitle}
          </Paragraph>

          {/* ── NATIVE ANTD PROGRESS BAR & STATUS ── */}
          <div style={{ margin: "0 auto 8px" }}>
            <Progress
              percent={progressPercent}
              status="active"
              strokeColor={{
                from: "#1677ff",
                to: "#52c41a",
              }}
              size={["100%", 8]}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12.5,
                color: "#6b7280",
                marginTop: 8,
              }}
            >
              <span>
                <ClockCircleOutlined style={{ marginRight: 5, color: "#1677ff" }} />
                Elapsed: <strong>{elapsedSeconds}s</strong>
              </span>
              <span>
                Milestone <strong>{currentStepIndex + 1}</strong> of{" "}
                <strong>{AUDIT_MILESTONES.length}</strong> ({progressPercent}% Complete)
              </span>
            </div>
          </div>

          {/* ── CURRENT ACTION NOTICE ── */}
          <div
            style={{
              margin: "18px auto 32px",
              padding: "12px 18px",
              borderRadius: 8,
              backgroundColor: "#f0f7ff",
              border: "1px solid #bae0ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              fontSize: 13,
              color: "#003a8c",
            }}
          >
            <LoadingOutlined style={{ color: "#1677ff", fontSize: 14 }} />
            <span>
              <strong>Current Operation:</strong> {currentMilestone.detail}
            </span>
          </div>

          <Divider style={{ margin: "24px 0" }} />

          <Collapse
            expandIcon={({ isActive }) => (
              <span style={{ color: isActive ? "#10b981" : "#94a3b8" }}>
                {isActive ? <UpOutlined /> : <DownOutlined />}
              </span>
            )}
            ghost
            style={{ marginBottom: 24 }}
          >
            <Collapse.Panel
              header="Audit Milestones Timeline"
              key="audit-milestones"
              extra={
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                 CLICK TO EXPAND
                </span>
              }
            >
              <div style={{ padding: "0 12px 12px" }}>
                <Steps
                  current={currentStepIndex}
                  responsive
                  direction="vertical"
                  size="small"
                  items={AUDIT_MILESTONES.map((milestone, idx) => ({
                    title: milestone.title,
                    subTitle: idx === currentStepIndex ? "In Progress" : undefined,
                    description: milestone.description,
                    icon:
                      idx === currentStepIndex ? (
                        <LoadingOutlined style={{ color: primaryColor }} />
                      ) : undefined,
                  }))}
                />
              </div>
            </Collapse.Panel>

          </Collapse>

         
        </div>
      </ProCard>
    );
  };
