import React from "react";
import {
  BulbOutlined,
  EditOutlined,
  FieldTimeOutlined,
  FormOutlined,
  MedicineBoxOutlined,
  ScheduleOutlined,
  TeamOutlined,
  WarningFilled,
} from "@ant-design/icons";
import AiInsightsDrawer, { type InsightStyle } from "@components/AiInsights/AiInsightsDrawer";
import { askFormsAssistant, fetchFormsInsights, type FormsInsightsParams, type FormsInsightType } from "@services/formsInsights";
import type { QuickPrompt } from "src/AdminDashboard/BiasharaAI/types/biasharaAI.types";

const INSIGHT_STYLES: Record<FormsInsightType, InsightStyle> = {
  forms: { label: "Forms", icon: <FormOutlined />, color: "#7c3aed", bg: "#f5f3ff" },
  plans: { label: "Plans", icon: <ScheduleOutlined />, color: "#0d9488", bg: "#f0fdfa" },
  alert: { label: "Needs attention", icon: <WarningFilled />, color: "#d03b3b", bg: "#fef2f2" },
  recommendation: { label: "Recommendation", icon: <BulbOutlined />, color: "#047857", bg: "#ecfdf5" },
};

const quickPrompts = (isEmployee: boolean): QuickPrompt[] => [
  {
    icon: <FormOutlined />,
    title: "Unsigned forms",
    desc: "How many forms are still unsigned or waiting for a countersign, and which forms are they mostly?",
    tag: "Forms",
  },
  {
    icon: <FieldTimeOutlined />,
    title: "Time to sign",
    desc: "How long do forms take to get signed, and does sending a link or filling in store work better?",
    tag: "Forms",
  },
  {
    icon: <ScheduleOutlined />,
    title: isEmployee ? "Stalled plans" : "Stalled treatments",
    desc: `Which ${isEmployee ? "plans" : "treatment plans"} are stalling — overdue or skipped ${isEmployee ? "steps" : "sessions"}, cancellations? What should we do?`,
    tag: "Plans",
  },
  {
    icon: <TeamOutlined />,
    title: isEmployee ? "Per supervisor" : "Per therapist",
    desc: `Compare ${isEmployee ? "supervisors / trainers" : "therapists"} by plans, active plans and completion in a table.`,
    tag: "Plans",
  },
  {
    icon: <MedicineBoxOutlined />,
    title: isEmployee ? "Flagged answers" : "Medical alerts",
    desc: `How many ${isEmployee ? "flagged answers" : "medical alerts"} came in, and on which forms?`,
    tag: "Alerts",
  },
  {
    icon: <EditOutlined />,
    title: "Summary",
    desc: "Give me a short summary of this period for the team, with the three things to fix first.",
    tag: "Summary",
  },
];

const THINKING: [string, string][] = [
  ["Reading your forms & plans", "Collecting sign rates, sessions and alerts…"],
  ["Comparing forms and plans", "Looking for backlogs, stalls and outliers…"],
  ["Checking what needs attention", "Reviewing unsigned forms, overdue sessions and flags…"],
  ["Writing it up", "Putting the findings into plain language…"],
];

interface Props {
  open: boolean;
  onClose: () => void;
  params: FormsInsightsParams;
  /** e.g. "Last 30 days" */
  periodLabel: string;
}

/** AI insights drawer on the Forms & Plans analytics tab. */
const FormsAiDrawer: React.FC<Props> = ({ open, onClose, params, periodLabel }) => {
  const isEmployee = params.audience === "employee";
  return (
    <AiInsightsDrawer
      open={open}
      onClose={onClose}
      assistantName="Forms AI"
      subtitle={`${isEmployee ? "Employee forms & plans" : "Client forms & treatment plans"} · ${periodLabel}`}
      queryKey={["forms-insights", params]}
      fetchInsights={(fresh) => fetchFormsInsights({ ...params, fresh })}
      ask={async (question, history) => (await askFormsAssistant({ ...params, question, history })).answer}
      insightStyles={INSIGHT_STYLES}
      quickPrompts={quickPrompts(isEmployee)}
      thinking={THINKING}
      loadingText="Analysing your forms and plans…"
      placeholder="Ask Forms AI about forms and plans…"
      pdfTitle={`Forms & Plans · ${periodLabel}`}
      forbiddenText="You don't have access to Forms & Plans analytics."
    />
  );
};

export default FormsAiDrawer;
