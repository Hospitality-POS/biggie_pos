import React from "react";
import dayjs from "dayjs";
import {
  BulbOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  RiseOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import AiInsightsDrawer, { type InsightStyle } from "@components/AiInsights/AiInsightsDrawer";
import { askOrdersAssistant, fetchOrderInsights, type OrdersByLocationFilters } from "@services/orders";
import type { QuickPrompt } from "src/AdminDashboard/BiasharaAI/types/biasharaAI.types";

const INSIGHT_STYLES: Record<string, InsightStyle> = {
  location: { label: "Location", icon: <EnvironmentOutlined />, color: "#1d4ed8", bg: "#eff6ff" },
  timing: { label: "Timing", icon: <ClockCircleOutlined />, color: "#475569", bg: "#f1f5f9" },
  staff: { label: "Staff", icon: <TeamOutlined />, color: "#7c3aed", bg: "#f5f3ff" },
  customers: { label: "Customers", icon: <UserOutlined />, color: "#b45309", bg: "#fffbeb" },
  recommendation: { label: "Recommendation", icon: <BulbOutlined />, color: "#047857", bg: "#ecfdf5" },
};

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    icon: <EnvironmentOutlined />,
    title: "Best locations",
    desc: "Which locations bring the most orders and revenue, and where is the average order highest? Show a table.",
    tag: "Location",
  },
  {
    icon: <ClockCircleOutlined />,
    title: "Busiest times",
    desc: "What are our busiest and quietest days and hours? When should we have more staff on?",
    tag: "Timing",
  },
  {
    icon: <TeamOutlined />,
    title: "Staff",
    desc: "Compare staff by orders handled and revenue in a table. Is the workload even?",
    tag: "Staff",
  },
  {
    icon: <UserOutlined />,
    title: "Repeat customers",
    desc: "How many customers came back more than once, and how many orders had no customer recorded?",
    tag: "Customers",
  },
  {
    icon: <CalendarOutlined />,
    title: "Trend",
    desc: "How did orders and revenue move day by day over this period? Any spikes or dips?",
    tag: "Timing",
  },
  {
    icon: <RiseOutlined />,
    title: "Grow sales",
    desc: "Based on these numbers, what three things should we do to grow orders next period?",
    tag: "Plan",
  },
];

const THINKING: [string, string][] = [
  ["Reading your orders", "Collecting orders by location, day and staff…"],
  ["Comparing locations", "Looking for where sales come from…"],
  ["Checking timing", "Finding the busiest days and hours…"],
  ["Writing it up", "Putting the findings into plain language…"],
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** The filters the table was last loaded with */
  filters: OrdersByLocationFilters;
}

/** AI insights drawer on the Order Analysis tab. */
const OrdersAiDrawer: React.FC<Props> = ({ open, onClose, filters }) => {
  const period =
    filters.from || filters.to
      ? `${filters.from ? dayjs(filters.from).format("D MMM") : "…"} – ${filters.to ? dayjs(filters.to).format("D MMM YYYY") : "today"}`
      : "All time";
  const place = [filters.city, filters.county, filters.country].filter(Boolean).join(", ");
  return (
    <AiInsightsDrawer
      open={open}
      onClose={onClose}
      assistantName="Sales AI"
      subtitle={`Order analysis · ${period}${place ? ` · ${place}` : ""}`}
      queryKey={["order-insights", filters]}
      fetchInsights={(fresh) => fetchOrderInsights({ ...filters, fresh })}
      ask={(question, history) => askOrdersAssistant(filters, question, history)}
      insightStyles={INSIGHT_STYLES}
      quickPrompts={QUICK_PROMPTS}
      thinking={THINKING}
      loadingText="Analysing your orders…"
      placeholder="Ask Sales AI about your orders…"
      pdfTitle={`Order Analysis · ${period}`}
      forbiddenText="You don't have permission to view orders."
    />
  );
};

export default OrdersAiDrawer;
