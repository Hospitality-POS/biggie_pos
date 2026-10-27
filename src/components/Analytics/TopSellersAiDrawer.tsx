import React from "react";
import dayjs from "dayjs";
import {
  BulbOutlined,
  DollarOutlined,
  FallOutlined,
  InboxOutlined,
  PercentageOutlined,
  RiseOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import AiInsightsDrawer, { type InsightStyle } from "@components/AiInsights/AiInsightsDrawer";
import { askTopSellersAssistant, fetchTopSellersInsights, type TopSellersFilters } from "@services/inventory";
import type { QuickPrompt } from "src/AdminDashboard/BiasharaAI/types/biasharaAI.types";

const INSIGHT_STYLES: Record<string, InsightStyle> = {
  winner: { label: "Top performer", icon: <TrophyOutlined />, color: "#b45309", bg: "#fffbeb" },
  stock: { label: "Stock", icon: <InboxOutlined />, color: "#d03b3b", bg: "#fef2f2" },
  margin: { label: "Margin", icon: <PercentageOutlined />, color: "#1d4ed8", bg: "#eff6ff" },
  recommendation: { label: "Recommendation", icon: <BulbOutlined />, color: "#047857", bg: "#ecfdf5" },
};

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    icon: <InboxOutlined />,
    title: "What to reorder",
    desc: "Which best sellers are out of stock, low, or will run out in the next two weeks? Give a reorder list in a table.",
    tag: "Stock",
  },
  {
    icon: <PercentageOutlined />,
    title: "Margins",
    desc: "Which items have the lowest and highest margins? Which are missing a buying price?",
    tag: "Margin",
  },
  {
    icon: <TrophyOutlined />,
    title: "Top 5",
    desc: "What are the top 5 items by revenue and by units, and what share of sales do they make up?",
    tag: "Sales",
  },
  {
    icon: <FallOutlined />,
    title: "Slow movers",
    desc: "Which listed items sell slowly compared with how much stock we hold?",
    tag: "Stock",
  },
  {
    icon: <DollarOutlined />,
    title: "Pricing",
    desc: "Are any items priced too low for their buying price? What price changes would you suggest?",
    tag: "Margin",
  },
  {
    icon: <RiseOutlined />,
    title: "What to promote",
    desc: "Which items should we promote or bundle to grow profit, and why?",
    tag: "Sales",
  },
];

const THINKING: [string, string][] = [
  ["Reading your top sellers", "Collecting revenue, units, profit and stock…"],
  ["Ranking the items", "Comparing sales, margins and stock levels…"],
  ["Checking stock", "Looking for best sellers running low…"],
  ["Writing it up", "Putting the findings into plain language…"],
];

interface Props {
  open: boolean;
  onClose: () => void;
  filters: TopSellersFilters;
}

/** AI insights drawer on the inventory Top Sellers report. */
const TopSellersAiDrawer: React.FC<Props> = ({ open, onClose, filters }) => {
  const period =
    filters.start_date || filters.end_date
      ? `${filters.start_date ? dayjs(filters.start_date).format("D MMM") : "…"} – ${filters.end_date ? dayjs(filters.end_date).format("D MMM YYYY") : "today"}`
      : "This month";
  return (
    <AiInsightsDrawer
      open={open}
      onClose={onClose}
      assistantName="Stock AI"
      subtitle={`Top sellers · ${period}`}
      queryKey={["top-sellers-insights", filters]}
      fetchInsights={(fresh) => fetchTopSellersInsights({ ...filters, fresh })}
      ask={(question, history) => askTopSellersAssistant(filters, question, history)}
      insightStyles={INSIGHT_STYLES}
      quickPrompts={QUICK_PROMPTS}
      thinking={THINKING}
      loadingText="Analysing your top sellers…"
      placeholder="Ask Stock AI about your top sellers…"
      pdfTitle={`Top Sellers · ${period}`}
      forbiddenText="You don't have access to the Top Sellers report."
    />
  );
};

export default TopSellersAiDrawer;
