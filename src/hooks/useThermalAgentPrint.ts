import { useMemo, useState } from "react";
import { message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { getConnectedAgents } from "@services/printAgent";
import { printReportLines } from "@services/printer";
import type { PrintLine } from "@services/printAgent";

export type ThermalPrintTarget = "browser" | "agent";

export interface AgentZoneOption {
  key: string;
  zone: string;
  agentId: string;
  deviceName: string;
}

const LINE_WIDTH = 42;

const textOf = (el: Element): string =>
  (el.textContent || "").replace(/\s+/g, " ").trim();

// Two-column row: first cells joined on the left, last cell right-aligned.
const rowLine = (texts: string[]): string => {
  if (texts.length === 1) return texts[0];
  const right = texts[texts.length - 1];
  const left = texts.slice(0, -1).join(" ");
  const gap = Math.max(LINE_WIDTH - left.length - right.length, 1);
  return left + " ".repeat(gap) + right;
};

/**
 * Walk the rendered thermal receipt DOM and convert it into plain-text
 * print lines understood by the print agents ({ type, text }).
 *
 * - dashed/solid top|bottom borders  → divider lines
 * - flex rows                        → left/right-aligned single line
 * - centered bold text               → "header" lines
 * - everything else                  → "footer" (plain) lines
 */
export const receiptDomToLines = (root: HTMLElement): PrintLine[] => {
  const lines: PrintLine[] = [];

  const emitDivider = () => {
    if (lines[lines.length - 1]?.type !== "divider") {
      lines.push({ type: "divider", text: "-".repeat(LINE_WIDTH) });
    }
  };

  const walk = (el: Element) => {
    if (el.tagName === "STYLE" || el.tagName === "SCRIPT") return;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return;

    if (style.borderTopStyle !== "none" && style.borderTopWidth !== "0px") {
      emitDivider();
    }

    const children = Array.from(el.children);
    const isRow =
      style.display.includes("flex") &&
      style.flexDirection !== "column" &&
      children.length > 1;

    if (isRow) {
      const texts = children.map(textOf).filter(Boolean);
      if (texts.length > 1) {
        lines.push({ type: "footer", text: rowLine(texts) });
        return;
      }
    }

    if (children.length === 0) {
      const t = textOf(el);
      if (!t) return;
      const centered = style.textAlign === "center";
      const bold = parseInt(style.fontWeight || "400", 10) >= 600;
      lines.push({ type: centered && bold ? "header" : "footer", text: t });
      return;
    }

    children.forEach(walk);

    if (
      style.borderBottomStyle !== "none" &&
      style.borderBottomWidth !== "0px"
    ) {
      emitDivider();
    }
  };

  Array.from(root.children).forEach(walk);
  return lines;
};

/**
 * Thermal printing for reports: browser print (react-to-print) or direct
 * IP printing — the receipt DOM is converted to text lines and sent to
 * /printer/print-report, which creates a PrinterJob and pushes it to the
 * connected print agent(s) in the chosen zone.
 */
export const useThermalAgentPrint = (
  contentRef: React.RefObject<HTMLElement | null>,
) => {
  const [target, setTarget] = useState<ThermalPrintTarget>("browser");
  const [zoneKey, setZoneKey] = useState<string>();
  const [printing, setPrinting] = useState(false);

  const shopId = localStorage.getItem("shopId") ?? "";
  const companyCode = useMemo(() => {
    try {
      const t = localStorage.getItem("tenant");
      return t ? (JSON.parse(t)?.tenant_code ?? "") : "";
    } catch {
      return "";
    }
  }, []);

  const { data: agentData, isLoading: agentsLoading } = useQuery({
    queryKey: ["connectedAgents", shopId],
    queryFn: () => getConnectedAgents(shopId, companyCode),
    enabled: target === "agent",
    staleTime: 30_000,
    retry: 1,
  });

  const agents = useMemo(
    () => (agentData?.agents ?? []).filter((a) => a.connected),
    [agentData],
  );

  // One option per zone served by a connected agent — an agent that listens
  // on several zones ("Bar", "Kitchen", a location name) yields one entry
  // each, matching how the backend routes print jobs.
  const zoneOptions = useMemo<AgentZoneOption[]>(() => {
    const out: AgentZoneOption[] = [];
    for (const a of agents) {
      const zones = a.zones?.length ? a.zones : [a.zone];
      for (const z of zones.filter(Boolean)) {
        out.push({
          key: `${a.agent_id}::${z}`,
          zone: z,
          agentId: a.agent_id,
          deviceName: a.device_name || a.agent_id,
        });
      }
    }
    return out;
  }, [agents]);

  const printBrowser = useReactToPrint({
    content: () => contentRef.current,
  });

  const print = async () => {
    if (target === "browser") {
      printBrowser();
      return;
    }

    const el = contentRef.current;
    if (!el) {
      message.warning("Receipt preview is not ready yet");
      return;
    }

    const option =
      zoneOptions.find((o) => o.key === zoneKey) ?? zoneOptions[0];
    if (!option) {
      message.warning(
        "No print agents connected — pair one in Printer Settings",
      );
      return;
    }

    const lines = receiptDomToLines(el);
    if (!lines.length) {
      message.warning("Nothing to print");
      return;
    }

    setPrinting(true);
    try {
      const res = await printReportLines({
        shop_id: shopId,
        zone: option.zone,
        documentType: "report",
        lines,
      });
      if ((res?.agentsSent ?? 0) > 0) {
        message.success(
          `Sent to "${option.zone}" printer (${option.deviceName})`,
        );
      } else {
        message.warning(
          "Print job created but no agent was reachable — it will print when the agent connects",
        );
      }
    } catch (e: any) {
      message.error(
        e?.response?.data?.message || e?.message || "Failed to send print job",
      );
    } finally {
      setPrinting(false);
    }
  };

  return {
    target,
    setTarget,
    agents,
    zoneOptions,
    zoneKey,
    setZoneKey,
    printing,
    agentsLoading,
    print,
  };
};
