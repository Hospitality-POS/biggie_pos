import React, { useEffect, useState } from "react";
import { Switch, Typography, Alert, Spin, Button, Radio, InputNumber, Space } from "antd";
import { ProCard } from "@ant-design/pro-components";
import { DollarOutlined, CalendarOutlined, PercentageOutlined, FileTextOutlined } from "@ant-design/icons";
import { message } from "antd";
import { fetchSystemSetupDetailsById, updateSystemSetup } from "../../../services/systemsetup";
import { THEME_C } from "../../../utils/getPrimaryColor";

const { Text } = Typography;
const C = THEME_C;

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: "12px 0",
};

const PayrollSettings: React.FC = () => {
  const [payFullFirstMonth, setPayFullFirstMonth] = useState(false);
  const [partialMethod, setPartialMethod] = useState<"prorate_days" | "fixed_percent">("prorate_days");
  const [partialPercent, setPartialPercent] = useState<number | null>(null);
  const [monthDays, setMonthDays] = useState<number>(30);
  const [payslipHeader, setPayslipHeader] = useState<"company" | "department">("company");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSystemSetupDetailsById();
        const ps = data?.payroll_settings || {};
        setPayFullFirstMonth(!!ps.pay_full_first_month);
        setPartialMethod(ps.partial_month_method === "fixed_percent" ? "fixed_percent" : "prorate_days");
        setPartialPercent(ps.partial_month_percent ?? null);
        setMonthDays(Number(ps.month_days) || 30);
        setPayslipHeader(ps.payslip_export_header === "department" ? "department" : "company");
        setSettingsId(data?._id || null);
      } catch (error) {
        console.error("Failed to load payroll settings:", error);
        message.error("Failed to load payroll settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!settingsId) {
      message.error("System settings not found");
      return;
    }
    if (partialMethod === "fixed_percent" && (partialPercent === null || partialPercent <= 0)) {
      message.error("Enter the percentage to pay for a partial first month");
      return;
    }

    setSaving(true);
    try {
      await updateSystemSetup({
        _id: settingsId,
        data: {
          payroll_settings: {
            pay_full_first_month: payFullFirstMonth,
            partial_month_method: partialMethod,
            partial_month_percent: partialMethod === "fixed_percent" ? partialPercent : null,
            month_days: monthDays,
            payslip_export_header: payslipHeader,
          },
        },
      });
      message.success("Payroll settings saved");
    } catch (error) {
      console.error("Failed to save payroll settings:", error);
      message.error("Failed to save payroll settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Controls how employees hired mid-period are paid in their first payroll."
        description="Applied when generating payroll — employees hired after the period start are adjusted automatically."
      />

      <ProCard bordered style={{ marginBottom: 16 }}>
        <div style={rowStyle}>
          <div>
            <Text strong style={{ display: "block", fontSize: 13 }}>
              <DollarOutlined style={{ color: C.primary, marginRight: 6 }} />
              Pay 100% in the first month
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              When on, employees hired mid-period receive their full salary for the first month.
              When off (default), the first month is partial.
            </Text>
          </div>
          <Switch checked={payFullFirstMonth} onChange={setPayFullFirstMonth} />
        </div>
      </ProCard>

      {!payFullFirstMonth && (
        <ProCard bordered title="Partial first month" style={{ marginBottom: 16 }}>
          <Radio.Group
            value={partialMethod}
            onChange={(e) => setPartialMethod(e.target.value)}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <Radio value="prorate_days">
              <Space direction="vertical" size={2}>
                <Text style={{ fontSize: 13 }}>
                  <CalendarOutlined style={{ color: C.primary, marginRight: 6 }} />
                  Pro-rate by days worked
                </Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Pay days worked ÷{" "}
                    <InputNumber
                      size="small"
                      min={1}
                      max={31}
                      value={monthDays}
                      onChange={(v) => setMonthDays(Number(v) || 30)}
                      style={{ width: 70 }}
                    />{" "}
                    days of the month.
                  </Text>
                </div>
              </Space>
            </Radio>
            <Radio value="fixed_percent">
              <Space direction="vertical" size={2}>
                <Text style={{ fontSize: 13 }}>
                  <PercentageOutlined style={{ color: C.primary, marginRight: 6 }} />
                  Fixed percentage
                </Text>
                {partialMethod === "fixed_percent" && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Pay&nbsp;</Text>
                    <InputNumber
                      size="small"
                      min={0}
                      max={100}
                      value={partialPercent}
                      onChange={(v) => setPartialPercent(v === null ? null : Number(v))}
                      style={{ width: 80 }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      &nbsp;% of salary when the employee has not completed {monthDays} days.
                    </Text>
                  </div>
                )}
              </Space>
            </Radio>
          </Radio.Group>
        </ProCard>
      )}

      <ProCard bordered title="Payslip exports" style={{ marginBottom: 16 }}>
        <div style={rowStyle}>
          <div>
            <Text strong style={{ display: "block", fontSize: 13 }}>
              <FileTextOutlined style={{ color: C.primary, marginRight: 6 }} />
              Header on payslip PDF / Excel exports
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Choose whether the payslip header shows the company name or the employee's
              department. This is the default — users can override it per export in the payslip drawer.
            </Text>
          </div>
          <Radio.Group
            value={payslipHeader}
            onChange={(e) => setPayslipHeader(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { value: "company", label: "Company name" },
              { value: "department", label: "Department name" },
            ]}
          />
        </div>
      </ProCard>

      <Button type="primary" onClick={handleSave} loading={saving} style={{ borderRadius: 8 }}>
        Save Payroll Settings
      </Button>
    </div>
  );
};

export default PayrollSettings;
