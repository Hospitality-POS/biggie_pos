import React from "react";
import {
  CompassOutlined,
  RocketOutlined,
  RiseOutlined,
  CrownOutlined,
} from "@ant-design/icons";
import { OrbState } from "thinking-orbs";

export type AdvisorStage = "auto" | "early_stage" | "growth_stage" | "mature_stage";

export interface ChatMessage {
  role: "user" | "ai";
  text: string;
  id: number;
  agent?: string;
  timestamp?: string;
  isError?: boolean;
  promptForRetry?: string;
}

export interface StageConfigItem {
  label: string;
  icon: React.ReactNode;
  desc: string;
}

export const STAGE_LABELS: Record<AdvisorStage, StageConfigItem> = {
  auto: {
    label: "Auto (Smart Detect)",
    icon: React.createElement(CompassOutlined),
    desc: "Parent agent automatically picks best advisor",
  },
  early_stage: {
    label: "Early Stage",
    icon: React.createElement(RocketOutlined),
    desc: "Focus on survival, product-market fit & initial sales",
  },
  growth_stage: {
    label: "Growth Stage",
    icon: React.createElement(RiseOutlined),
    desc: "Focus on operational scaling, retention & margins",
  },
  mature_stage: {
    label: "Mature Stage",
    icon: React.createElement(CrownOutlined),
    desc: "Focus on optimization, expansion & multi-unit governance",
  },
};

export interface QuickPrompt {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tag: string;
}

export interface ThinkingPhaseInfo {
  state: OrbState;
  title: string;
  desc: string;
}
