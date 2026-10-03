import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Typography,
  Select,
  Row,
  Col,
  Drawer,
  Tag,
  Tooltip,
  Empty,
  Popconfirm,
  Modal,
  message,
  Progress,
  Dropdown,
  Spin,
  ColorPicker,
  Grid,
  Input,
  Checkbox,
  Switch,
} from "antd";
import {
  FileTextOutlined,
  DownloadOutlined,
  MailOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmployeePayslips,
  fetchAllPayslips,
  getPayslipById,
  emailPayslip,
  emailPayslipsBatch,
  previewPayslipEmail,
  emailP9FormPdf,
  deletePayslip,
  fetchEmployees,
  type Payslip,
} from "@services/bandu";
import { getUser } from "@services/tenants";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import { fetchSystemSetupDetailsById } from "@services/systemsetup";
import { generatePayslipPDF } from "@utils/payslipPDF";
import { exportPayslipsToExcel, exportPayslipToExcel, generatePayslipsPDF, buildPayslipsPDFDoc, exportP9ToExcel } from "@utils/payslipExport";
import { generateP9FormPDF, buildP9FormDoc } from "@utils/p9FormPDF";
import dayjs from "dayjs";
import { THEME_C } from "@utils/getPrimaryColor";

const { Title, Text } = Typography;
const { Option } = Select;

const C = THEME_C;

// ── Dashboard-style card ──────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div style={{ ...cardStyle, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `${color}15`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>{title}</Text>
      <Text strong style={{ fontSize: 18, color, lineHeight: 1.2 }}>
        {value}
      </Text>
    </div>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; extra?: React.ReactNode }> = ({
  children,
  extra,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    }}
  >
    <Text
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {children}
    </Text>
    {extra}
  </div>
);

const MoneyRow: React.FC<{ label: string; value?: number; strong?: boolean; color?: string }> = ({
  label,
  value,
  strong,
  color,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      padding: "3px 0",
    }}
  >
    <Text style={{ color: "#64748b" }}>{label}</Text>
    <Text strong={strong} style={{ color: color || "#0f172a" }}>
      KES {(value ?? 0).toLocaleString()}
    </Text>
  </div>
);

const employeeLabel = (emp: any) =>
  emp?.fullname || emp?.user_id?.fullname || emp?.employee_number || "—";

const PayslipView: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(new Date().getMonth() + 1);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [emailProgress, setEmailProgress] = useState<{ sent: number; total: number } | null>(null);
  // Email template modal — preview exactly what will be sent
  const [emailModal, setEmailModal] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [emailTemplate, setEmailTemplate] = useState<"summary" | "detailed" | "classic" | "minimal" | "statement">("statement");
  // Brand color override — empty = tenant primary color (falls back to #0b2f78 server-side)
  const [emailColor, setEmailColor] = useState<string>("");
  const [emailPreviewHtml, setEmailPreviewHtml] = useState("");
  const [emailPreviewSubject, setEmailPreviewSubject] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  // Single-payslip send — editable recipient/cc/subject/message + PDF attach
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailRecipientName, setEmailRecipientName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailSubjectEdited, setEmailSubjectEdited] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailAttachPdf, setEmailAttachPdf] = useState(false);
  // Email header — "company" shows the company name, "department" shows the payslip's department
  const [emailHeader, setEmailHeader] = useState<"company" | "department">("company");

  const user = getUser();
  const isAdmin = user?.role === "admin";
  const checkPerms = getPermissionChecker();
  const can = (k: string) => isAdmin || user?.isAdmin === true || checkPerms(k);
  const canViewAllPayslips = can("BANDU_PAYSLIPS_VIEW_ALL");
  const canEmailPayslips = can("BANDU_PAYSLIPS_EMAIL");
  const canExportPayslips = can("BANDU_PAYSLIPS_EXPORT");
  const canDeletePayslip = can("BANDU_PAYSLIPS_DELETE");
  const queryClient = useQueryClient();

  // Fetch employees for the "all payslips" filter
  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetchEmployees(),
    enabled: canViewAllPayslips,
  });

  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];

  // Unique departments from employees (for the admin department filter)
  const payslipDepartments = React.useMemo(() => {
    const deptMap = new Map<string, any>();
    (employees as any[]).forEach((emp: any) => {
      if (emp.department_id?._id && !deptMap.has(emp.department_id._id)) {
        deptMap.set(emp.department_id._id, emp.department_id);
      }
    });
    return Array.from(deptMap.values());
  }, [employees]);

  // Fetch payslips based on user role and employee/department filters
  const { data: payslipsData, isLoading } = useQuery({
    queryKey: canViewAllPayslips
      ? ["all-payslips", selectedYear, selectedMonth, selectedEmployeeId, selectedDepartmentId]
      : ["employee-payslips", selectedYear, selectedMonth],
    queryFn: () => {
      const params = { year: selectedYear, month: selectedMonth };
      if (canViewAllPayslips) {
        return fetchAllPayslips({
          ...params,
          employee_id: selectedEmployeeId,
          department_id: selectedDepartmentId,
        });
      }
      return fetchEmployeePayslips(user?._id || user?.id, params);
    },
  });

  const payslips = Array.isArray(payslipsData) ? payslipsData : payslipsData?.data || [];

  // P9 is an annual deduction card — it needs every payslip in the selected
  // YEAR, regardless of the month / employee / department filters above.
  const { data: p9PayslipsData } = useQuery({
    queryKey: ["p9-payslips", selectedYear, canViewAllPayslips ? "all" : user?._id || user?.id],
    queryFn: () =>
      canViewAllPayslips
        ? fetchAllPayslips({ year: selectedYear })
        : fetchEmployeePayslips(user?._id || user?.id, { year: selectedYear }),
  });
  const p9YearPayslips = Array.isArray(p9PayslipsData) ? p9PayslipsData : p9PayslipsData?.data || [];

  // Email payslip mutation
  const emailMutation = useMutation({
    mutationFn: ({ id, template, color, opts }: { id: string; template?: string; color?: string; opts?: any }) =>
      emailPayslip(id, template, color, opts),
  });

  // Render the server-side preview whenever the modal/template/overrides
  // change — the previewed HTML is the exact payload sent by the email endpoints.
  // Message/recipient-name edits re-render live (debounced).
  useEffect(() => {
    if (!emailModal.open || !emailModal.ids.length) return;
    const isSingle = emailModal.ids.length === 1;
    const timer = setTimeout(() => {
      setPreviewLoading(true);
      previewPayslipEmail(emailModal.ids[0], emailTemplate, emailColor || undefined, {
        header: emailHeader,
        message: isSingle ? emailMessage || undefined : undefined,
        recipient_name: isSingle ? emailRecipientName || undefined : undefined,
      })
        .then((r) => {
          setEmailPreviewHtml(r.html);
          setEmailPreviewSubject(r.subject);
          if (!emailSubjectEdited) setEmailSubject(r.subject);
        })
        .catch(() => {
          setEmailPreviewHtml("");
          setEmailPreviewSubject("");
        })
        .finally(() => setPreviewLoading(false));
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailModal.open, emailModal.ids, emailTemplate, emailColor, emailMessage, emailRecipientName, emailHeader]);

  const openEmailModal = (ids: string[]) => {
    if (!ids.length) return;
    const slip = payslips.find((p: Payslip) => p._id === ids[0]);
    setEmailTo(slip?.employee_id?.email || slip?.employee_id?.user_id?.email || "");
    setEmailRecipientName(
      slip?.employee_id?.fullname || slip?.employee_id?.user_id?.fullname || ""
    );
    setEmailCc("");
    setEmailSubject("");
    setEmailSubjectEdited(false);
    setEmailMessage(
      "Your payslip for the period below is now available. Please find the details of your earnings and deductions."
    );
    setEmailAttachPdf(false);
    setEmailHeader("company");
    setEmailModal({ open: true, ids });
  };

  const handleConfirmEmail = async () => {
    const { ids } = emailModal;
    setEmailModal({ open: false, ids: [] });
    if (ids.length === 1) {
      try {
        // Optionally render the payslip PDF client-side and attach it
        let pdf: string | undefined;
        if (emailAttachPdf) {
          const slip = payslips.find((p: Payslip) => p._id === ids[0]);
          const doc = slip ? await buildPayslipsPDFDoc([slip]) : null;
          pdf = doc?.output("datauristring").split(",")[1];
        }
        await emailMutation.mutateAsync({
          id: ids[0],
          template: emailTemplate,
          color: emailColor || undefined,
          opts: {
            to: emailTo.trim() || undefined,
            cc: emailCc.trim() || undefined,
            recipient_name: emailRecipientName.trim() || undefined,
            subject: emailSubject.trim() || undefined,
            message: emailMessage.trim() || undefined,
            header: emailHeader,
            pdf,
          },
        });
      } catch {
        /* handled by mutation */
      }
      return;
    }
    await handleBulkEmail(ids, emailTemplate, emailColor || undefined, emailHeader);
  };

  // Delete payslip mutation
  const deleteMutation = useMutation({
    mutationFn: deletePayslip,
    onSuccess: () => {
      handleRefresh();
      if (isDrawerVisible) {
        setIsDrawerVisible(false);
        setSelectedPayslip(null);
      }
    },
  });

  // Bulk delete — same pattern as payroll: per-item calls with a summary toast
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const handleBulkDelete = () => {
    if (!selectedRowKeys.length) return;
    Modal.confirm({
      title: `Delete ${selectedRowKeys.length} payslip(s)?`,
      content: "This action cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        setIsBulkDeleting(true);
        try {
          const results = await Promise.allSettled(
            selectedRowKeys.map((id) => deletePayslip(String(id)))
          );
          const ok = results.filter((r) => r.status === "fulfilled").length;
          const failed = results.length - ok;
          if (ok === 0) message.error(`Delete failed for all ${results.length} payslip(s)`);
          else if (failed > 0) message.warning(`Deleted ${ok} payslip(s) — ${failed} failed`);
          queryClient.invalidateQueries({ queryKey: ["all-payslips"] });
          queryClient.invalidateQueries({ queryKey: ["employee-payslips"] });
          queryClient.invalidateQueries({ queryKey: ["p9-payslips"] });
          setSelectedRowKeys([]);
        } finally {
          setIsBulkDeleting(false);
        }
      },
    });
  };

  const handleViewPayslip = async (payslipId: string) => {
    try {
      const data = await getPayslipById(payslipId);
      setSelectedPayslip(data);
      setIsDrawerVisible(true);
    } catch (error) {
      // Error handled by service
    }
  };

  const handleEmailPayslip = (payslipId: string) => openEmailModal([payslipId]);

  // Send payslips to a list of ids — chunked batches so progress is real
  // and large sends don't hit request timeouts
  const handleBulkEmail = async (ids: string[], template?: string, color?: string, header?: "company" | "department") => {
    if (!ids.length || isBulkSending) return;
    setIsBulkSending(true);
    const BATCH = 10;
    const allSkipped: any[] = [];
    const allFailed: any[] = [];
    let sent = 0;
    try {
      for (let i = 0; i < ids.length; i += BATCH) {
        const res = await emailPayslipsBatch(ids.slice(i, i + BATCH), template, color, header);
        sent += res?.results?.sent?.length ?? 0;
        allSkipped.push(...(res?.results?.skipped || []));
        allFailed.push(...(res?.results?.failed || []));
        setEmailProgress({ sent: Math.min(i + BATCH, ids.length), total: ids.length });
      }
      if (sent > 0) {
        message.success(`Payslips emailed to ${sent} employee${sent === 1 ? "" : "s"}`);
      }
      if (allSkipped.length) {
        message.warning(
          `${allSkipped.length} skipped (no email): ${allSkipped
            .map((s: any) => s.employee_number || s.payslip_id)
            .join(", ")}`,
          6
        );
      }
      if (allFailed.length) {
        message.error(`${allFailed.length} failed to send`, 5);
      }
      setSelectedRowKeys([]);
      handleRefresh();
    } catch (error: any) {
      const partial = sent > 0 ? ` (${sent} already sent)` : "";
      message.error((error?.response?.data?.message || "Failed to send payslips") + partial);
    } finally {
      setIsBulkSending(false);
      setEmailProgress(null);
    }
  };

  // Export header — which name appears at the top of exported payslips.
  // "auto" = whatever the global System Setup toggle says.
  const [exportHeader, setExportHeader] = useState<"auto" | "company" | "department">("auto");
  const headerOverride = exportHeader === "auto" ? undefined : exportHeader;

  const handleDownloadPayslip = async () => {
    if (selectedPayslip) {
      await generatePayslipPDF(selectedPayslip as any, headerOverride);
    }
  };

  // ── P9 preview state ─────────────────────────────────────────────────────────
  const [isP9ModalOpen, setIsP9ModalOpen] = useState(false);
  const [p9EmployeeId, setP9EmployeeId] = useState<string | null>(null);
  const [p9Settings, setP9Settings] = useState<any>(null);
  const [p9HideEmployer, setP9HideEmployer] = useState(false);

  // Unique employees present in the year's payslips (month filter ignored)
  const p9Employees = (() => {
    const map = new Map<string, string>();
    p9YearPayslips.forEach((p: any) => {
      const id = p.employee_id?._id;
      if (id && !map.has(id)) {
        map.set(
          id,
          p.employee_id?.fullname ||
            p.employee_id?.user_id?.fullname ||
            p.employee_id?.employee_number ||
            "Employee"
        );
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  })();

  const p9ActiveEmployeeId = p9EmployeeId || p9Employees[0]?.value || null;
  const p9Payslips = p9ActiveEmployeeId
    ? p9YearPayslips.filter((p: any) => p.employee_id?._id === p9ActiveEmployeeId)
    : p9YearPayslips;

  const handleOpenP9Modal = () => {
    if (p9YearPayslips.length === 0) {
      message.warning("No payslips available for the selected year");
      return;
    }
    setP9EmployeeId(p9Employees[0]?.value || null);
    setIsP9ModalOpen(true);
    if (!p9Settings) {
      fetchSystemSetupDetailsById()
        .then((s) => {
          setP9Settings(s);
          setP9HideEmployer(!!s?.payroll_settings?.p9_hide_employer);
        })
        .catch(() => undefined);
    }
  };

  const handleDownloadP9Form = async () => {
    await generateP9FormPDF(p9Payslips, selectedYear, { hideEmployer: p9HideEmployer });
  };

  const [isP9Emailing, setIsP9Emailing] = useState(false);
  const handleEmailP9Form = async () => {
    if (!p9ActiveEmployeeId || p9Payslips.length === 0 || isP9Emailing) return;
    setIsP9Emailing(true);
    try {
      const doc = await buildP9FormDoc(p9Payslips, selectedYear, { hideEmployer: p9HideEmployer });
      const base64 = (doc.output("datauristring") as string).split(",")[1];
      const empNo = p9Payslips[0]?.employee_id?.employee_number || "employee";
      const res = await emailP9FormPdf({
        employee_id: p9ActiveEmployeeId,
        year: selectedYear,
        pdf_base64: base64,
        filename: `P9_Form_${empNo}_${selectedYear}.pdf`,
      });
      message.success(`P9 form emailed to ${res?.email || "employee"}`);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to email P9 form");
    } finally {
      setIsP9Emailing(false);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: canViewAllPayslips ? ["all-payslips", selectedYear] : ["employee-payslips", selectedYear],
    });
  };

  // Compact money cell for the flat columns
  const moneyCell = (v?: number | null, color = "#0f172a", strong = false) => (
    <Text strong={strong} style={{ fontSize: 11.5, color, fontVariantNumeric: "tabular-nums" }}>
      {(v ?? 0).toLocaleString()}
    </Text>
  );
  const moneyColumn = (title: string, getter: (p: Payslip) => number | undefined, color?: string, strong = false) => ({
    title,
    key: title,
    width: 96,
    align: "right" as const,
    render: (_: unknown, p: Payslip) => moneyCell(getter(p), color, strong),
  });

  // WHT applies to consultants only — hide it for everyone else. The value
  // check is a fallback for records fetched without employment_type.
  const showWht = (p: Payslip) =>
    p.employee_id?.employment_type === "consultant" ||
    ((p.deductions as any)?.withholding_tax || 0) > 0;

  // Expand a lumped earnings total into one row per named item — prefers the
  // payslip's own snapshot (payroll-line items), falls back to the employee
  // record, and keeps any unmatched remainder as a generic "Other" row.
  const earningItemRows = (
    items: any[] | undefined,
    empItems: any[] | undefined,
    field: "amount" | "value",
    total: number | undefined,
    label: string
  ): { label: string; value: number }[] => {
    const t = Number(total || 0);
    if (!(t > 0)) return [];
    const src = items?.length ? items : empItems || [];
    const rows = src
      .filter((it) => Number(it?.[field]) > 0)
      .map((it) => ({
        label: String(it.name || it.allowance_type || it.benefit_type || label),
        value: Number(it[field]) || 0,
      }));
    const sum = rows.reduce((s, r) => s + r.value, 0);
    const residual = Math.round((t - sum) * 100) / 100;
    if (residual > 0) rows.push({ label: rows.length ? `Other ${label}s` : `${label}s`, value: residual });
    if (!rows.length) rows.push({ label: `${label}s`, value: t });
    return rows;
  };

  // Same idea for the flat payslip table — one column per named item plus a
  // residual "Other" column only when a total exceeds its named parts
  const earningItemColumns = (
    lineField: "allowance_items" | "benefit_items",
    empField: "allowances" | "benefits",
    field: "amount" | "value",
    totalField: "allowances" | "benefits",
    label: string
  ) => {
    const itemsOf = (p: Payslip): any[] => {
      const line = (p.earnings as any)?.[lineField];
      if (Array.isArray(line) && line.length) return line;
      return ((p.employee_id as any)?.[empField]) || [];
    };
    const labelOf = (it: any) =>
      it?.name || it?.allowance_type || it?.benefit_type || label;
    const names = Array.from(
      new Set(
        payslips.flatMap((p: Payslip) =>
          itemsOf(p).filter((it) => Number(it?.[field]) > 0).map(labelOf)
        )
      )
    );
    const cols = names.map((n) =>
      moneyColumn(String(n), (p) =>
        itemsOf(p)
          .filter((it) => labelOf(it) === n)
          .reduce((s, it) => s + (Number(it?.[field]) || 0), 0)
      )
    );
    const residualOf = (p: Payslip) =>
      Math.round(
        ((p.earnings?.[totalField] || 0) -
          itemsOf(p)
            .filter((it) => Number(it?.[field]) > 0)
            .reduce((s, it) => s + (Number(it?.[field]) || 0), 0)) * 100
      ) / 100;
    if (payslips.some((p) => residualOf(p) > 0)) {
      cols.push(moneyColumn(`Other ${label}s`, residualOf));
    }
    return cols;
  };

  const columns = [
    ...(canViewAllPayslips
      ? [
          {
            title: "Employee",
            key: "employee",
            width: 170,
            fixed: "left" as const,
            render: (_: unknown, record: Payslip) => (
              <div>
                <Text style={{ fontSize: 12, fontWeight: 500, display: "block" }}>
                  {employeeLabel(record.employee_id)}
                </Text>
                <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                  {[record.employee_id?.employee_number, record.employee_id?.job_title]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </div>
            ),
          },
        ]
      : []),
    {
      title: "Period",
      key: "period",
      width: 130,
      fixed: "left" as const,
      render: (_: unknown, record: Payslip) => (
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500, display: "block" }}>{record.period_label}</Text>
          <Text style={{ fontSize: 11, color: "#94a3b8" }}>
            {dayjs(record.period_start).format("DD MMM")} – {dayjs(record.period_end).format("DD MMM YYYY")}
          </Text>
        </div>
      ),
    },
    moneyColumn("Basic", (p) => p.earnings?.basic_salary),
    ...earningItemColumns("allowance_items", "allowances", "amount", "allowances", "Allowance"),
    ...earningItemColumns("benefit_items", "benefits", "value", "benefits", "Benefit"),
    moneyColumn("Overtime", (p) => p.earnings?.overtime_pay),
    moneyColumn("Gross", (p) => p.earnings?.gross_salary, "#0f172a", true),
    moneyColumn("PAYE", (p) => p.deductions?.paye, "#ef4444"),
    moneyColumn("NSSF", (p) => p.deductions?.nssf, "#ef4444"),
    moneyColumn("SHA", (p) => p.deductions?.nhif, "#ef4444"),
    moneyColumn("Housing Levy", (p) => p.deductions?.housing_levy, "#ef4444"),
    ...(payslips.some((p) => ((p.deductions as any)?.pension || 0) > 0)
      ? [moneyColumn("Pension", (p) => (p.deductions as any)?.pension, "#ef4444")]
      : []),
    ...(payslips.some(showWht)
      ? [moneyColumn("WHT", (p) => (p.deductions as any)?.withholding_tax, "#ef4444")]
      : []),
    // Custom deductions shown as named columns (loans, advances…) — not a
    // generic "Other" bucket
    ...Array.from(
      new Set(
        payslips.flatMap((p: Payslip) =>
          (p.deductions?.custom || []).map((c: any) => c.name).filter(Boolean)
        )
      )
    ).map((name) =>
      moneyColumn(
        String(name),
        (p) => (p.deductions?.custom || []).find((c: any) => c.name === name)?.amount || 0,
        "#ef4444"
      )
    ),
    moneyColumn("Total Ded.", (p) => p.deductions?.total, "#ef4444", true),
    {
      title: "Net Pay",
      dataIndex: "net_pay",
      key: "net_pay",
      align: "right" as const,
      render: (amount: number) => (
        <Text strong style={{ color: C.green }}>KES {(amount ?? 0).toLocaleString()}</Text>
      ),
    },
    {
      title: "Generated",
      dataIndex: "generated_at",
      key: "generated_at",
      render: (date: string) => (
        <Text style={{ fontSize: 12 }}>{date ? dayjs(date).format("DD MMM YYYY") : "—"}</Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 110,
      fixed: "right" as const,
      render: (_: unknown, record: Payslip) => (
        <Space size={0}>
          <Tooltip title="View payslip">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleViewPayslip(record._id)} />
          </Tooltip>
          {canEmailPayslips && (
            <Tooltip title="Email payslip">
              <Button
                type="text"
                size="small"
                icon={<MailOutlined />}
                onClick={() => handleEmailPayslip(record._id)}
                loading={emailMutation.isLoading}
              />
            </Tooltip>
          )}
          {canDeletePayslip && (
            <Popconfirm
              title="Delete this payslip?"
              description="This cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteMutation.mutate(record._id)}
            >
              <Tooltip title="Delete payslip">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Hide Allowances / Benefits / Overtime columns when every row is zero
  const hiddenColumns = new Set(
    [
      ["Allowances", payslips.every((p: Payslip) => !(p.earnings?.allowances || 0))],
      ["Benefits", payslips.every((p: Payslip) => !(p.earnings?.benefits || 0))],
      ["Overtime", payslips.every((p: Payslip) => !(p.earnings?.overtime_pay || 0))],
    ]
      .filter(([, hidden]) => payslips.length > 0 && hidden)
      .map(([title]) => title)
  );
  const visibleColumns = columns.filter((c: any) => !hiddenColumns.has(c.title));

  const totalGross = payslips.reduce((sum: number, p: Payslip) => sum + (p.earnings?.gross_salary || 0), 0);
  const totalNet = payslips.reduce((sum: number, p: Payslip) => sum + (p.net_pay || 0), 0);
  const totalDeductions = payslips.reduce((sum: number, p: Payslip) => sum + (p.deductions?.total || 0), 0);

  return (
    <div style={{ padding: isMobile ? 12 : 24, background: "#f8fafc", minHeight: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: C.darkText }}>
            <FileTextOutlined style={{ marginRight: 8, color: C.primary }} />
            {canViewAllPayslips ? "Payslips" : "My Payslips"}
          </Title>
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {payslips.length} payslip{payslips.length !== 1 ? "s" : ""} ·{" "}
            {selectedMonth ? `${dayjs().month(selectedMonth - 1).format("MMMM")} ` : ""}
            {selectedYear}
          </Text>
        </div>
        <Space wrap>
          {canViewAllPayslips && (
            <Select
              placeholder="Filter by Department"
              value={selectedDepartmentId}
              onChange={setSelectedDepartmentId}
              allowClear
              style={{ width: 180 }}
              showSearch
              optionFilterProp="children"
            >
              {payslipDepartments.map((dept: any) => (
                <Option key={dept._id} value={dept._id}>
                  {dept.name}{dept.code ? ` (${dept.code})` : ""}
                </Option>
              ))}
            </Select>
          )}
          {canViewAllPayslips && (
            <Select
              placeholder="Filter by Employee"
              value={selectedEmployeeId}
              onChange={setSelectedEmployeeId}
              allowClear
              style={{ width: 220 }}
              showSearch
              optionFilterProp="children"
            >
              {employees.map((emp: any) => (
                <Option key={emp._id} value={emp._id}>
                  {employeeLabel(emp)} ({emp.employee_number})
                </Option>
              ))}
            </Select>
          )}
          <Select
            value={selectedMonth}
            onChange={setSelectedMonth}
            allowClear
            placeholder="All months"
            style={{ width: 130 }}
            options={[
              { value: 1, label: "January" },
              { value: 2, label: "February" },
              { value: 3, label: "March" },
              { value: 4, label: "April" },
              { value: 5, label: "May" },
              { value: 6, label: "June" },
              { value: 7, label: "July" },
              { value: 8, label: "August" },
              { value: 9, label: "September" },
              { value: 10, label: "October" },
              { value: 11, label: "November" },
              { value: 12, label: "December" },
            ]}
          />
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 110 }}
            options={[0, 1, 2, 3].map((offset) => {
              const y = new Date().getFullYear() - offset;
              return { value: y, label: `${y}` };
            })}
          />
          {canEmailPayslips && (
            <Button
              type="primary"
              icon={<MailOutlined />}
              disabled={payslips.length === 0 || isBulkSending}
              loading={isBulkSending}
              onClick={() => openEmailModal(payslips.map((p: Payslip) => p._id))}
            >
              Email All
            </Button>
          )}
          {canExportPayslips && (
          <Dropdown
            menu={{
              items: [
                {
                  key: "excel",
                  label: `Excel (${payslips.length} payslip${payslips.length === 1 ? "" : "s"})`,
                  icon: <FileExcelOutlined />,
                  children: [
                    {
                      key: "excel-auto",
                      label: "Default header",
                      onClick: () => exportPayslipsToExcel(payslips),
                    },
                    {
                      key: "excel-company",
                      label: "Company name header",
                      onClick: () => exportPayslipsToExcel(payslips, "company"),
                    },
                    {
                      key: "excel-dept",
                      label: "Department name header",
                      onClick: () => exportPayslipsToExcel(payslips, "department"),
                    },
                  ],
                },
                {
                  key: "pdf",
                  label: `PDF (${payslips.length} payslip${payslips.length === 1 ? "" : "s"})`,
                  icon: <FilePdfOutlined />,
                  children: [
                    {
                      key: "pdf-auto",
                      label: "Default header",
                      onClick: () => generatePayslipsPDF(payslips),
                    },
                    {
                      key: "pdf-company",
                      label: "Company name header",
                      onClick: () => generatePayslipsPDF(payslips, "company"),
                    },
                    {
                      key: "pdf-dept",
                      label: "Department name header",
                      onClick: () => generatePayslipsPDF(payslips, "department"),
                    },
                  ],
                },
              ],
            }}
            trigger={["click"]}
          >
            <Button icon={<DownloadOutlined />} disabled={payslips.length === 0}>
              Export
            </Button>
          </Dropdown>
          )}
          {canExportPayslips && (
            <Tooltip title="Preview & download P9 Form for the selected year">
              <Button icon={<FilePdfOutlined />} onClick={handleOpenP9Modal} disabled={p9YearPayslips.length === 0}>
                P9 Form
              </Button>
            </Tooltip>
          )}
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}>
            Refresh
          </Button>
        </Space>
      </div>

      {/* Summary Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard title="Total Payslips" value={payslips.length} icon={<FileTextOutlined />} color="#3b82f6" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="Total Gross"
            value={`KES ${totalGross.toLocaleString()}`}
            icon={<DollarOutlined />}
            color="#3b82f6"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="Total Deductions"
            value={`KES ${totalDeductions.toLocaleString()}`}
            icon={<DeleteOutlined />}
            color="#ef4444"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="Total Net Pay"
            value={`KES ${totalNet.toLocaleString()}`}
            icon={<CheckCircleOutlined />}
            color="#10b981"
          />
        </Col>
      </Row>

      {/* Selection bar */}
      {selectedRowKeys.length > 0 && (
        <div
          style={{
            ...cardStyle,
            padding: "8px 14px",
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <Text style={{ fontSize: 12 }}>
            <Text strong>{selectedRowKeys.length}</Text> payslip{selectedRowKeys.length !== 1 ? "s" : ""} selected
          </Text>
          <Space>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>
              Clear
            </Button>
            {canEmailPayslips && (
              <Button
                size="small"
                type="primary"
                icon={<MailOutlined />}
                loading={isBulkSending}
                onClick={() => openEmailModal(selectedRowKeys.map(String))}
              >
                Email Selected
              </Button>
            )}
            {canDeletePayslip && (
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={isBulkDeleting}
                onClick={handleBulkDelete}
              >
                Delete Selected
              </Button>
            )}
          </Space>
        </div>
      )}

      {/* Payslip table */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          columns={visibleColumns}
          dataSource={payslips}
          loading={isLoading}
          rowKey="_id"
          size="small"
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 12 }}
          locale={{
            emptyText: (
              <Empty
                description={`No payslips for ${selectedYear}`}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: "32px 0" }}
              />
            ),
          }}
        />
      </div>

      {/* Payslip Detail Drawer */}
      <Drawer
        title="Payslip"
        placement="right"
        width={isMobile ? "100%" : 640}
        open={isDrawerVisible}
        onClose={() => {
          setIsDrawerVisible(false);
          setSelectedPayslip(null);
        }}
        styles={{ body: { background: "#f8fafc", padding: 16 } }}
      >
        {selectedPayslip && (
          <div>
            {/* Header card */}
            <div
              style={{
                ...cardStyle,
                padding: "14px 16px",
                marginBottom: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <Text strong style={{ fontSize: 14, display: "block" }}>
                  {selectedPayslip.period_label}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  {employeeLabel(selectedPayslip.employee_id)} ·{" "}
                  {selectedPayslip.employee_id?.employee_number} ·{" "}
                  {dayjs(selectedPayslip.period_start).format("DD MMM")} –{" "}
                  {dayjs(selectedPayslip.period_end).format("DD MMM YYYY")}
                </Text>
              </div>
              {selectedPayslip.emailed_at ? (
                <Tag color="green" style={{ margin: 0 }}>
                  Emailed {dayjs(selectedPayslip.emailed_at).format("DD MMM YYYY")}
                </Tag>
              ) : (
                <Tag style={{ margin: 0 }}>Not emailed</Tag>
              )}
            </div>

            {/* Net pay highlight */}
            <div
              style={{
                ...cardStyle,
                padding: "16px",
                marginBottom: 14,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                textAlign: "center",
              }}
            >
              <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>NET PAY</Text>
              <Text strong style={{ fontSize: 26, color: "#10b981" }}>
                KES {(selectedPayslip.net_pay ?? 0).toLocaleString()}
              </Text>
            </div>

            {/* Earnings */}
            <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 12 }}>
              <SectionTitle
                extra={
                  <Text strong style={{ fontSize: 13 }}>
                    KES {(selectedPayslip.earnings?.gross_salary ?? 0).toLocaleString()}
                  </Text>
                }
              >
                Earnings
              </SectionTitle>
              <MoneyRow label="Basic Salary" value={selectedPayslip.earnings?.basic_salary} />
              {earningItemRows(
                selectedPayslip.earnings?.allowance_items,
                (selectedPayslip.employee_id as any)?.allowances,
                "amount",
                selectedPayslip.earnings?.allowances,
                "Allowance"
              ).map((r, i) => (
                <MoneyRow key={`alw-${i}`} label={r.label} value={r.value} />
              ))}
              {earningItemRows(
                selectedPayslip.earnings?.benefit_items,
                (selectedPayslip.employee_id as any)?.benefits,
                "value",
                selectedPayslip.earnings?.benefits,
                "Benefit"
              ).map((r, i) => (
                <MoneyRow key={`ben-${i}`} label={r.label} value={r.value} />
              ))}
              <MoneyRow label="Overtime Pay" value={selectedPayslip.earnings?.overtime_pay} />
              <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 6, paddingTop: 6 }}>
                <MoneyRow label="Gross Salary" value={selectedPayslip.earnings?.gross_salary} strong color="#3b82f6" />
              </div>
            </div>

            {/* Deductions */}
            <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 12 }}>
              <SectionTitle
                extra={
                  <Text strong style={{ fontSize: 13, color: "#ef4444" }}>
                    − KES {(selectedPayslip.deductions?.total ?? 0).toLocaleString()}
                  </Text>
                }
              >
                Deductions
              </SectionTitle>
              <MoneyRow label="NSSF" value={selectedPayslip.deductions?.nssf} color="#ef4444" />
              <MoneyRow label="SHIF" value={selectedPayslip.deductions?.nhif} color="#ef4444" />
              <MoneyRow label="Housing Levy" value={selectedPayslip.deductions?.housing_levy} color="#ef4444" />
              {((selectedPayslip.deductions as any)?.pension || 0) > 0 && (
                <MoneyRow label="Pension Contribution" value={(selectedPayslip.deductions as any)?.pension} color="#ef4444" />
              )}
              {showWht(selectedPayslip) && (
                <MoneyRow label="Withholding Tax" value={(selectedPayslip.deductions as any)?.withholding_tax} color="#ef4444" />
              )}
              <div style={{ borderTop: "1px dashed #e2e8f0", margin: "6px 0", paddingTop: 6 }}>
                <MoneyRow label="Taxable Pay" value={(selectedPayslip.deductions as any)?.taxable_pay} strong color="#64748b" />
              </div>
              <MoneyRow label="Income Tax" value={(selectedPayslip.deductions as any)?.income_tax} color="#f59e0b" />
              <MoneyRow
                label="Personal Relief"
                value={
                  (selectedPayslip.deductions as any)?.personal_relief != null
                    ? -(selectedPayslip.deductions as any).personal_relief
                    : undefined
                }
                color="#10b981"
              />
              {((selectedPayslip.deductions as any)?.insurance_relief || 0) > 0 && (
                <MoneyRow
                  label="Insurance Relief"
                  value={-(selectedPayslip.deductions as any).insurance_relief}
                  color="#10b981"
                />
              )}
              <MoneyRow label="P.A.Y.E" value={selectedPayslip.deductions?.paye} strong color="#ef4444" />
              <div style={{ borderTop: "1px dashed #e2e8f0", margin: "6px 0", paddingTop: 6 }}>
                <MoneyRow
                  label="Pay After Tax"
                  value={
                    ((selectedPayslip.deductions as any)?.taxable_pay ??
                      (selectedPayslip.earnings?.gross_salary || 0) -
                        (selectedPayslip.deductions?.nssf || 0) -
                        (selectedPayslip.deductions?.nhif || 0) -
                        (selectedPayslip.deductions?.housing_levy || 0)) -
                    (selectedPayslip.deductions?.paye || 0)
                  }
                  strong
                  color="#64748b"
                />
              </div>
              {(selectedPayslip.deductions?.custom || []).map((d: any, i: number) => (
                <MoneyRow key={i} label={d.name} value={d.amount} color="#ef4444" />
              ))}
              <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 6, paddingTop: 6 }}>
                <MoneyRow label="Total Deductions" value={selectedPayslip.deductions?.total} strong color="#ef4444" />
              </div>
            </div>

            {/* Meta */}
            <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 16 }}>
              <SectionTitle>Details</SectionTitle>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Tag style={{ margin: 0 }}>Days worked: {selectedPayslip.days_worked ?? 0}</Tag>
                <Tag style={{ margin: 0 }}>Overtime: {selectedPayslip.overtime_hours ?? 0} hrs</Tag>
                {selectedPayslip.generated_at && (
                  <Tag style={{ margin: 0 }}>
                    Generated: {dayjs(selectedPayslip.generated_at).format("DD MMM YYYY")}
                  </Tag>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {canEmailPayslips && (
                <Button
                  type="primary"
                  icon={<MailOutlined />}
                  onClick={() => handleEmailPayslip(selectedPayslip._id)}
                  loading={emailMutation.isLoading}
                >
                  Email Payslip
                </Button>
              )}
              {canExportPayslips && (
              <Dropdown
                menu={{
                  selectedKeys: [exportHeader === "auto" ? "hdr-auto" : `hdr-${exportHeader}`],
                  items: [
                    {
                      key: "pdf",
                      label: "Download PDF",
                      icon: <FilePdfOutlined />,
                      onClick: handleDownloadPayslip,
                    },
                    {
                      key: "excel",
                      label: "Export Excel",
                      icon: <FileExcelOutlined />,
                      onClick: () => exportPayslipToExcel(selectedPayslip, headerOverride),
                    },
                    { type: "divider" as const },
                    {
                      key: "hdr",
                      label: "Header shows",
                      type: "group" as const,
                      children: [
                        {
                          key: "hdr-auto",
                          label: "Auto (system default)",
                          onClick: () => setExportHeader("auto"),
                        },
                        {
                          key: "hdr-company",
                          label: "Company name",
                          onClick: () => setExportHeader("company"),
                        },
                        {
                          key: "hdr-department",
                          label: "Department name",
                          onClick: () => setExportHeader("department"),
                        },
                      ],
                    },
                  ],
                }}
                trigger={["click"]}
              >
                <Button icon={<DownloadOutlined />}>
                  Export <DownOutlined />
                </Button>
              </Dropdown>
              )}
              {canDeletePayslip && (
                <Popconfirm
                  title="Delete this payslip?"
                  description="This cannot be undone."
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deleteMutation.mutate(selectedPayslip._id)}
                >
                  <Button danger icon={<DeleteOutlined />} loading={deleteMutation.isLoading}>
                    Delete
                  </Button>
                </Popconfirm>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ── P9 Form Preview Modal ── */}
      <Modal
        title={
          <Space size={8}>
            <FilePdfOutlined style={{ color: C.red }} />
            <Text strong>P9 Form — Income Tax Deduction Card</Text>
          </Space>
        }
        open={isP9ModalOpen}
        onCancel={() => setIsP9ModalOpen(false)}
        width={isMobile ? "100%" : 1080}
        style={{ top: isMobile ? 0 : 14 }}
        destroyOnClose
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              {p9Payslips.length} payslip{p9Payslips.length !== 1 ? "s" : ""} included · Year {selectedYear}
            </Text>
            <Space>
              <Button onClick={() => setIsP9ModalOpen(false)}>Close</Button>
              {canExportPayslips && (
                <Tooltip title="Export this P9 card to Excel (official format)">
                  <Button
                    icon={<FileExcelOutlined />}
                    onClick={() => exportP9ToExcel(p9Payslips, selectedYear, { hideEmployer: p9HideEmployer })}
                    disabled={p9Payslips.length === 0}
                  >
                    Excel
                  </Button>
                </Tooltip>
              )}
              {canEmailPayslips && (
                <Tooltip title="Email this P9 as a PDF attachment to the employee">
                  <Button
                    icon={<MailOutlined />}
                    onClick={handleEmailP9Form}
                    loading={isP9Emailing}
                    disabled={p9Payslips.length === 0 || !p9ActiveEmployeeId}
                  >
                    Email P9
                  </Button>
                </Tooltip>
              )}
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadP9Form}
                disabled={p9Payslips.length === 0}
              >
                Download P9 PDF
              </Button>
            </Space>
          </div>
        }
      >
        {(() => {
          const emp: any = p9Payslips[0]?.employee_id || {};
          const tenant = JSON.parse(localStorage.getItem("tenant") || "{}");
          const employerName =
            p9Settings?.name || p9Settings?.business_name || tenant.tenant_name || "—";
          const employerPin = p9Settings?.kra_pin || tenant.kra_pin || "—";
          const employeeName = emp.fullname || emp.user_id?.fullname || "—";

          const months = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
          const E3_FIXED = 30000; // statutory monthly cap on defined contribution
          const rows = months.map((m, i) => {
            const agg = { a: 0, b: 0, c: 0, d: 0, e1: 0, e2: 0, eUsed: 0, f: 0, g: 0, h: 0, ii: 0, j: 0, k: 0, l: 0, mm: 0, n: 0, o: 0 };
            p9Payslips.forEach((p: any) => {
              if (new Date(p.period_start).getMonth() !== i) return;
              const e2 = p.earnings || {};
              const d2 = p.deductions || {};
              const a = e2.basic_salary || 0;
              const gross = e2.gross_salary || 0;
              agg.a += a;
              agg.b += gross - a;           // allowances + benefits + overtime
              agg.d += gross;
              agg.e2 += d2.nssf || 0;       // actual contribution
              agg.f += d2.housing_levy || 0;
              agg.g += d2.nhif || 0;        // SHIF
              agg.l += d2.income_tax || 0;
              agg.mm += d2.personal_relief || 0;
              agg.o += d2.paye || 0;
            });
            agg.e1 = agg.a * 0.3;
            agg.eUsed = Math.min(agg.e1, agg.e2, E3_FIXED);
            agg.j = agg.eUsed + agg.f + agg.g + agg.h + agg.ii;
            agg.k = agg.d - agg.j;          // chargeable pay
            return { month: m, ...agg, has: agg.d > 0 };
          });
          const tot = (k: string) => rows.reduce((s, r: any) => s + (r[k] || 0), 0);
          const fmt = (v: number) => (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          // official-form cell styles — black borders, compact
          const border = "1px solid #000";
          const th: React.CSSProperties = { border, padding: "3px 4px", fontSize: 8, fontWeight: 700, textAlign: "center", verticalAlign: "bottom", lineHeight: 1.2 };
          const td: React.CSSProperties = { border, padding: "3px 6px", fontSize: 9.5, textAlign: "right" };
          const tdL: React.CSSProperties = { ...td, textAlign: "left", fontWeight: 700 };

          const infoRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: "1px 0", fontSize: 12 };
          const infoLabel: React.CSSProperties = { fontWeight: 700, fontSize: 11 };
          const infoValue: React.CSSProperties = { borderBottom: "1px solid #000", minWidth: isMobile ? 120 : 220, flex: 1, fontSize: 12, fontWeight: 600 };

          return (
            <div>
              {/* Employee picker — above the document */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                  flexWrap: "wrap",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                }}
              >
                <Text strong style={{ fontSize: 13, whiteSpace: "nowrap" }}>Employee</Text>
                <Select
                  value={p9ActiveEmployeeId}
                  onChange={setP9EmployeeId}
                  options={p9Employees}
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select employee"
                  style={{ minWidth: isMobile ? "100%" : 280, flex: isMobile ? 1 : undefined }}
                />
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                  <Tooltip title="Removes the Employer's Name and Employer's P.I.N. rows from the P9 (preview, PDF, Excel, and email)">
                    <Space size={6}>
                      <Switch
                        size="small"
                        checked={p9HideEmployer}
                        onChange={setP9HideEmployer}
                      />
                      <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                        Hide employer name & PIN
                      </Text>
                    </Space>
                  </Tooltip>
                  <Tag style={{ margin: 0 }}>Year {selectedYear}</Tag>
                </div>
              </div>

              {/* ── Official P9 document ── */}
              <div style={{ border: "2px solid #000", background: "#fff", padding: "14px 18px", overflowX: "auto" }}>
                {/* KRA header */}
                <div style={{ textAlign: "center", marginBottom: 10 }}>
                  <img
                    src="/kra.png"
                    alt="KRA"
                    style={{ width: 64, height: 64, objectFit: "contain", margin: "0 auto 4px", display: "block" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.5, color: "#000" }}>KENYA REVENUE AUTHORITY</div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#000" }}>DOMESTIC TAXES DEPARTMENT</div>
                  <div style={{ fontWeight: 800, fontSize: 12.5, color: "#000" }}>
                    INCOME TAX DEDUCTION CARD YEAR {selectedYear}
                  </div>
                </div>

                {/* Employer / employee info — official two-column layout; privacy
                    mode blanks the employer values but keeps the labels */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", columnGap: 48, marginBottom: 8 }}>
                  <div>
                    <div style={infoRow}><span style={infoLabel}>Employer's Name:</span><span style={infoValue}>{p9HideEmployer ? "" : employerName}</span></div>
                    <div style={infoRow}><span style={infoLabel}>Employee's Main Name:</span><span style={infoValue}>{employeeName}</span></div>
                  </div>
                  <div>
                    <div style={infoRow}><span style={infoLabel}>Employer's P.I.N.:</span><span style={infoValue}>{p9HideEmployer ? "" : employerPin}</span></div>
                    <div style={infoRow}><span style={infoLabel}>Employee's P.I.N.:</span><span style={infoValue}>{emp.kra_pin || ""}</span></div>
                  </div>
                </div>

                {/* Monthly grid — official columns A–O */}
                <table style={{ width: "100%", minWidth: 960, borderCollapse: "collapse", border: "1px solid #000" }}>
                  <thead>
                    <tr>
                      <th rowSpan={3} style={{ ...th, verticalAlign: "middle", minWidth: 80 }}>MONTH</th>
                      <th style={th}>Basic Salary</th>
                      <th style={th}>Benefits Non-Cash</th>
                      <th style={th}>Value of Quarters</th>
                      <th style={th}>Total Gross Pay</th>
                      <th colSpan={3} style={th}>Defined Contribution Retirement Scheme</th>
                      <th style={th}>Affordable Housing Levy (AHL)</th>
                      <th style={th}>Social Health Insurance Fund (SHIF)</th>
                      <th style={th}>Post Retirement Medical Fund (PRMF)</th>
                      <th style={th}>Owner Occupied Interest</th>
                      <th style={th}>Total Deductions (E+F+G+H+I)</th>
                      <th style={th}>Chargeable Pay</th>
                      <th style={th}>Tax Charged</th>
                      <th style={th}>Personal Relief</th>
                      <th style={th}>Insurance Relief</th>
                      <th style={th}>P.A.Y.E. Tax (L–M–N)</th>
                    </tr>
                    <tr>
                      {["A", "B", "C", "D", "E1", "E2", "E3", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"].map((l) => (
                        <th key={l} style={{ ...th, fontWeight: 800 }}>{l}</th>
                      ))}
                    </tr>
                    <tr>
                      <th style={th}>Kshs.</th><th style={th}>Kshs.</th><th style={th}>Kshs.</th><th style={th}>Kshs.</th>
                      <th style={th}>E1 30% of A</th><th style={th}>E2 Actual</th><th style={th}>E3 Fixed</th>
                      <th style={th}>Kshs.</th><th style={th}>Kshs.</th><th style={th}>Kshs.</th><th style={th}>Kshs.</th>
                      <th style={th}>Kshs.</th><th style={th}>Kshs.</th><th style={th}>Kshs.</th><th style={th}>Kshs.</th><th style={th}>Kshs.</th><th style={th}>Kshs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => (
                      <tr key={r.month} style={{ color: r.has ? "#000" : "#9ca3af" }}>
                        <td style={tdL}>{r.month}</td>
                        <td style={td}>{r.has ? fmt(r.a) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.b) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.c) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.d) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.e1) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.e2) : ""}</td>
                        <td style={td}>{r.has ? fmt(E3_FIXED) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.f) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.g) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.h) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.ii) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.j) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.k) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.l) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.mm) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.n) : ""}</td>
                        <td style={td}>{r.has ? fmt(r.o) : ""}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 800, background: "#fff" }}>
                      <td style={tdL}>TOTALS</td>
                      <td style={td}>{fmt(tot("a"))}</td>
                      <td style={td}>{fmt(tot("b"))}</td>
                      <td style={td}>{fmt(tot("c"))}</td>
                      <td style={td}>{fmt(tot("d"))}</td>
                      <td style={td}>{fmt(tot("e1"))}</td>
                      <td style={td}>{fmt(tot("e2"))}</td>
                      <td style={td}>{fmt(rows.filter((r: any) => r.has).length * E3_FIXED)}</td>
                      <td style={td}>{fmt(tot("f"))}</td>
                      <td style={td}>{fmt(tot("g"))}</td>
                      <td style={td}>{fmt(tot("h"))}</td>
                      <td style={td}>{fmt(tot("ii"))}</td>
                      <td style={td}>{fmt(tot("j"))}</td>
                      <td style={td}>{fmt(tot("k"))}</td>
                      <td style={td}>{fmt(tot("l"))}</td>
                      <td style={td}>{fmt(tot("mm"))}</td>
                      <td style={td}>{fmt(tot("n"))}</td>
                      <td style={td}>{fmt(tot("o"))}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Employer end-of-year totals */}
                <div style={{ marginTop: 8, fontSize: 11 }}>
                  <Text style={{ fontSize: 10.5, fontStyle: "italic", display: "block" }}>
                    To be completed by Employer at end of year
                  </Text>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, marginTop: 4 }}>
                    <span>TOTAL CHARGEABLE PAY (COL K) Kshs. {fmt(tot("k"))}</span>
                    <span>TOTAL TAX (COL O) Kshs. {fmt(tot("o"))}</span>
                  </div>
                </div>

                {/* IMPORTANT notes */}
                <div style={{ marginTop: 10, fontSize: 10, lineHeight: 1.5, color: "#111" }}>
                  <div style={{ fontWeight: 800, fontSize: 11 }}>IMPORTANT</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", columnGap: 32 }}>
                    <div>
                      <div>1. Use P9A (a) for all liable employees and where director/employee received benefits in addition to cash emoluments.</div>
                      <div style={{ marginLeft: 14 }}>(b) Where an employee is eligible to deduction on owner occupier interest.</div>
                      <div style={{ marginLeft: 14 }}>(c) Where an employee contributes to a post retirement medical fund.</div>
                      <div>2. (a) Deductible interest in respect of any month must not exceed Kshs. 30,000/=.</div>
                      <div style={{ marginLeft: 14 }}>(b) Deductible contributions to a post retirement medical fund in respect of any month must not exceed Kshs. 15,000.</div>
                    </div>
                    <div>
                      <div>(d) Personal relief is Kshs. 2,400 per month or 28,800 per year.</div>
                      <div>(e) Insurance relief is 15% of the premium up to a maximum of Kshs. 5,000 per month or 60,000 per year.</div>
                      <div>(f) Attach (i) Photostat copy of interest certificate and statement of account from the financial institution.</div>
                      <div style={{ marginLeft: 24 }}>(ii) The DECLARATION duly signed by the employee.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Email template picker + live preview ── */}
      <Modal
        open={emailModal.open}
        title={
          <span>
            Send {emailModal.ids.length} Payslip{emailModal.ids.length === 1 ? "" : "s"}
            {emailPreviewSubject && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 10, fontWeight: 400 }}>
                Subject: {emailPreviewSubject}
              </Text>
            )}
          </span>
        }
        onCancel={() => setEmailModal({ open: false, ids: [] })}
        width={isMobile ? "100%" : 760}
        style={{ top: isMobile ? 0 : 100 }}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {emailModal.ids.length === 1 ? (
              <Checkbox
                checked={emailAttachPdf}
                onChange={(e) => setEmailAttachPdf(e.target.checked)}
              >
                Attach payslip as PDF
              </Checkbox>
            ) : (
              <span />
            )}
            <Space>
              <Button onClick={() => setEmailModal({ open: false, ids: [] })}>Cancel</Button>
              <Button
                type="primary"
                icon={<MailOutlined />}
                loading={isBulkSending || emailMutation.isPending}
                onClick={handleConfirmEmail}
              >
                {emailModal.ids.length > 1 ? `Send All (${emailModal.ids.length})` : "Send"}
              </Button>
            </Space>
          </div>
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <Text strong style={{ fontSize: 13 }}>Template:</Text>
          <Select
            value={emailTemplate}
            onChange={(v) => setEmailTemplate(v)}
            style={{ width: 240 }}
            options={[
              { value: "summary", label: "Summary — KPI cards + details" },
              { value: "detailed", label: "Detailed — full tax breakdown" },
              { value: "classic", label: "Classic — paper payslip style" },
              { value: "statement", label: "Statement — bank ledger style" },
              { value: "minimal", label: "Minimal — clean, compact" },
            ]}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Text strong style={{ fontSize: 13 }}>Color:</Text>
            <ColorPicker
              value={emailColor || null}
              onChange={(c) => setEmailColor(c.toHexString())}
              presets={[
                {
                  label: "Brand",
                  colors: [C.primary, "#0b2f78", "#2d7b30"],
                },
                {
                  label: "Standard",
                  colors: ["#1e293b", "#7c3aed", "#0369a1", "#b45309", "#dc2626", "#065f46"],
                },
              ]}
              allowClear
              onClear={() => setEmailColor("")}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {emailColor ? "Custom" : `Company color (${C.primary})`}
            </Text>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Text strong style={{ fontSize: 13 }}>Header:</Text>
            <Select
              value={emailHeader}
              onChange={(v) => setEmailHeader(v)}
              style={{ width: 150 }}
              options={[
                { value: "company", label: "Company name" },
                { value: "department", label: "Department" },
              ]}
            />
          </div>
        </div>
        {emailModal.ids.length === 1 && (
          <div style={{ marginBottom: 12 }}>
            <Row gutter={12}>
              <Col span={12}>
                <Text strong style={{ fontSize: 12 }}>To</Text>
                <Input
                  size="small"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="Employee's email (default)"
                  style={{ marginTop: 4 }}
                />
              </Col>
              <Col span={12}>
                <Text strong style={{ fontSize: 12 }}>Cc</Text>
                <Input
                  size="small"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  placeholder="Comma-separated emails"
                  style={{ marginTop: 4 }}
                />
              </Col>
            </Row>
            <Row gutter={12} style={{ marginTop: 8 }}>
              <Col span={12}>
                <Text strong style={{ fontSize: 12 }}>Recipient Name</Text>
                <Input
                  size="small"
                  value={emailRecipientName}
                  onChange={(e) => setEmailRecipientName(e.target.value)}
                  placeholder="e.g. Simon Maina"
                  style={{ marginTop: 4 }}
                />
              </Col>
              <Col span={12}>
                <Text strong style={{ fontSize: 12 }}>Subject</Text>
                <Input
                  size="small"
                  value={emailSubject}
                  onChange={(e) => {
                    setEmailSubject(e.target.value);
                    setEmailSubjectEdited(true);
                  }}
                  style={{ marginTop: 4 }}
                />
              </Col>
            </Row>
            {/* Editable greeting — this text replaces the intro in the preview below */}
            <div
              style={{
                marginTop: 10,
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "10px 12px",
                background: "#fff",
              }}
            >
              <Text strong style={{ fontSize: 12 }}>Dear {emailRecipientName || "…"},</Text>
              <Input.TextArea
                bordered={false}
                autoSize={{ minRows: 2, maxRows: 5 }}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                style={{ padding: "4px 0 0", fontSize: 12, resize: "none" }}
              />
              <Text type="secondary" style={{ fontSize: 10 }}>
                Type here — the preview below updates as you edit.
              </Text>
            </div>
          </div>
        )}
        {emailModal.ids.length > 1 && (
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 10 }}>
            Preview shows the first payslip — same template and color applies to all {emailModal.ids.length}
          </Text>
        )}
        <Spin spinning={previewLoading} tip="Rendering template…">
          <iframe
            title="Payslip email preview"
            srcDoc={emailPreviewHtml}
            style={{ width: "100%", height: isMobile ? 320 : 430, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f3f4f6" }}
          />
        </Spin>
        <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 8 }}>
          This is the exact email the employee will receive — rendered by the backend template.
        </Text>
      </Modal>

      {/* ── Bulk email progress ── */}
      <Modal
        open={isBulkSending && emailProgress !== null}
        footer={null}
        closable={false}
        maskClosable={false}
        centered
        width={isMobile ? "92%" : 380}
        title="Sending Payslips"
      >
        <Progress
          percent={emailProgress ? Math.round((emailProgress.sent / emailProgress.total) * 100) : 0}
          status="active"
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Emailing payslips… {emailProgress?.sent ?? 0} of {emailProgress?.total ?? 0} processed
        </Text>
      </Modal>
    </div>
  );
};

export default PayslipView;
