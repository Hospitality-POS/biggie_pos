import { useState, useEffect, useMemo } from "react";
import { AdvisorStage, STAGE_LABELS, ThinkingPhaseInfo } from "../types/biasharaAI.types";

export interface UseThinkingPhaseReturn {
  loadingElapsedSec: number;
  thinkingPhase: ThinkingPhaseInfo;
}

export const useThinkingPhase = (
  loading: boolean,
  currentShop: any | null,
  selectedStage: AdvisorStage
): UseThinkingPhaseReturn => {
  const [loadingElapsedSec, setLoadingElapsedSec] = useState(0);

  useEffect(() => {
    if (!loading) {
      setLoadingElapsedSec(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  const thinkingPhase = useMemo<ThinkingPhaseInfo>(() => {
    if (loadingElapsedSec < 3) {
      return {
        state: "searching",
        title: "Scanning Branch Feeds",
        desc: `Gathering real-time orders, stock velocity & transactional records for ${
          currentShop?.name || "this shop"
        }...`,
      };
    }
    if (loadingElapsedSec < 7) {
      return {
        state: "connecting",
        title: "Cross-Referencing Analytics",
        desc: "Analyzing peak transaction windows, margins, and sales patterns...",
      };
    }
    if (loadingElapsedSec < 12) {
      return {
        state: "solving",
        title: "Evaluating Growth Strategy",
        desc: `Consulting ${
          STAGE_LABELS[selectedStage]?.label || "Advisor"
        } models & forecasting actions...`,
      };
    }
    return {
      state: "composing",
      title: "Synthesizing Executive Brief",
      desc: "Polishing high-impact recommendations tailored for immediate store execution...",
    };
  }, [loadingElapsedSec, currentShop, selectedStage]);

  return {
    loadingElapsedSec,
    thinkingPhase,
  };
};
