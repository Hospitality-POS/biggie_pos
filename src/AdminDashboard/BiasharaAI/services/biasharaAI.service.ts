import React from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { notification } from "antd";
import {
  LineChartOutlined,
  AlertOutlined,
  ThunderboltOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { sendDukaChatMessage, DukaChatOptions, DukaChatResponse } from "@services/aiDukaService";
import { QuickPrompt } from "../types/biasharaAI.types";

/**
 * Re-export chat query function
 */
export { sendDukaChatMessage };
export type { DukaChatOptions, DukaChatResponse };

/**
 * Build contextual quick prompts based on active store modules.
 */
export const buildCuratedPrompts = (
  _hasPOS: boolean,
  _hasAccounting: boolean
): QuickPrompt[] => {
  return [
    {
      icon: React.createElement(LineChartOutlined, { style: { color: "#2563eb", fontSize: 16 } }),
      title: "Today's Sales Peak",
      desc: "Why did sales peak today and how does it compare to yesterday?",
      tag: "Sales",
    },
    {
      icon: React.createElement(AlertOutlined, { style: { color: "#e11d48", fontSize: 16 } }),
      title: "Stock Alert Check",
      desc: "Which items are at risk of running out before our busiest hours?",
      tag: "Inventory",
    },
    {
      icon: React.createElement(ThunderboltOutlined, { style: { color: "#d97706", fontSize: 16 } }),
      title: "Top Velocity Item",
      desc: "What is our highest-velocity product over the last 7 days?",
      tag: "Products",
    },
    {
      icon: React.createElement(BulbOutlined, { style: { color: "#7c3aed", fontSize: 16 } }),
      title: "Margin & Growth Tip",
      desc: "How can I improve my average transaction value this week?",
      tag: "Strategy",
    },
  ];
};

/**
 * Exports a given message bubble to an executive PDF document.
 */
export const exportMessageToPdf = async (
  messageId: number,
  shopName?: string,
  primaryColor: string = "#2563eb"
): Promise<void> => {
  const el = document.getElementById(`duka-bubble-${messageId}`);
  if (!el) return;

  const report = document.createElement("div");
  report.innerHTML = `
    <div style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #ffffff;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid ${primaryColor};">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: ${primaryColor}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700;">
            AI
          </div>
          <div>
            <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: ${primaryColor};">Biashara AI Executive Brief</h1>
            <p style="margin: 3px 0 0; font-size: 12px; color: #64748b;">${shopName || "Store Analysis"} · Basepoint Cloud</p>
          </div>
        </div>
        <span style="font-size: 11px; color: #94a3b8;">${new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
      </div>
      <div style="font-size: 13px; line-height: 1.8; color: #1e293b;">
        ${el.innerHTML}
      </div>
    </div>
  `;
  report.style.position = "fixed";
  report.style.left = "-9999px";
  report.style.top = "0";
  report.style.width = "750px";
  report.style.background = "#ffffff";
  document.body.appendChild(report);

  try {
    const canvas = await html2canvas(report, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = (pdf as any).getImageProperties(img);
    const ratio = imgProps.width / imgProps.height;
    let w = pageWidth - 20;
    let h = w / ratio;
    if (h > pageHeight - 20) {
      h = pageHeight - 20;
      w = h * ratio;
    }
    pdf.addImage(img, "PNG", 10, 10, w, h);
    pdf.save(`duka-brief-${messageId}.pdf`);
  } catch (e: unknown) {
    notification.error({ message: "PDF export failed", description: String(e) });
  } finally {
    document.body.removeChild(report);
  }
};
