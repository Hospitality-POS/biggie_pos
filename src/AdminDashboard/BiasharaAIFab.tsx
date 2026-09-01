import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button, Input, Modal, Spin, notification, Typography } from "antd";
import { RobotOutlined, SendOutlined, DownloadOutlined } from "@ant-design/icons";
import Draggable from "react-draggable";
import ReactMarkdown from "react-markdown";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { postRequest } from "@services/request";
import { useTenantModules } from "@hooks/useTenantModules";

const { Text } = Typography;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#8b5cf6",
  teal: "#0d9488",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Biashara AI floating assistant ─────────────────────────────────────────────
const BiasharaAIFab: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string; id: number; modules?: string[]; allowed?: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fabPos, setFabPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);

  useEffect(() => {
    if (open && chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  const { hasPOS, hasAccounting, hasMteja, hasHR, hasDala } = useTenantModules();

  const sampleQuestions = useMemo(() => {
    const questions: string[] = [];
    if (hasPOS) {
      questions.push("How much did we sell yesterday?", "What were my best-selling products this month?");
    }
    if (hasMteja) {
      questions.push("Who are my top customers?", "Who owes us money?");
    }
    if (hasAccounting) {
      questions.push("What's our profit?", "What are our top expenses?", "Why did our profit decrease this month?");
    }
    if (hasHR) {
      questions.push("Who was absent today?", "What is the total payroll this month?");
    }
    if (hasDala) {
      questions.push("Which tenant hasn't paid rent?", "Which properties are underperforming?");
    }
    if (questions.length === 0) {
      questions.push("What can Biashara AI help me with?", "Which modules can I subscribe to?");
    }
    return questions.slice(0, 6);
  }, [hasPOS, hasAccounting, hasMteja, hasHR, hasDala]);

  const ask = useCallback(async (question: string) => {
    if (!question || loading) return;
    const userId = ++messageIdRef.current;
    setMessages((prev) => [...prev, { role: "user", text: question, id: userId }]);
    setLoading(true);

    try {
      const res = await postRequest("/biashara-ai", { question }) as {
        data?: { answer?: string; modules?: string[]; allowed?: boolean };
      };
      const aiId = ++messageIdRef.current;
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: res?.data?.answer || "Biashara AI could not answer.",
          id: aiId,
          modules: res?.data?.modules,
          allowed: res?.data?.allowed,
        },
      ]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const aiId = ++messageIdRef.current;
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: err?.response?.data?.message || "Biashara AI is unavailable. Please try again later.",
          id: aiId,
          allowed: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleSend = useCallback(() => {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");
    ask(question);
  }, [input, loading, ask]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const exportToPdf = async (messageId: number) => {
    const el = document.getElementById(`biashara-msg-${messageId}`);
    if (!el) return;

    const report = document.createElement("div");
    report.innerHTML = `
      <div style="padding: 28px; font-family: Arial, 'Helvetica Neue', sans-serif; color: #0f172a; background: #ffffff;">
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 2px solid #6c1c2c;">
          <div style="width: 42px; height: 42px; border-radius: 10px; background: #6c1c2c; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700;">
            AI
          </div>
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #6c1c2c;">Biashara AI Business Analysis</h1>
            <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">Generated on ${new Date().toLocaleString()} · Basepoint Cloud</p>
          </div>
        </div>
        <div style="font-size: 13px; line-height: 1.7; color: #0f172a;">
          ${el.innerHTML}
        </div>
      </div>
    `;
    report.style.position = "fixed";
    report.style.left = "-9999px";
    report.style.top = "0";
    report.style.width = "800px";
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
      pdf.save(`biashara-ai-analysis-${messageId}.pdf`);
    } catch (e: unknown) {
      notification.error({ message: "PDF export failed", description: String(e), style: { borderRadius: 12 } });
    } finally {
      document.body.removeChild(report);
    }
  };

  const onFabStart = (_: unknown, data: { x: number; y: number }) => {
    isDragging.current = false;
    dragStart.current = { x: data.x, y: data.y };
  };

  const onFabDrag = (_: unknown, data: { x: number; y: number }) => {
    if (Math.abs(data.x - dragStart.current.x) > 2 || Math.abs(data.y - dragStart.current.y) > 2) {
      isDragging.current = true;
    }
  };

  const onFabStop = (_: unknown, data: { x: number; y: number }) => {
    setFabPos({ x: data.x, y: data.y });
  };

  const onFabClick = () => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Draggable
        nodeRef={fabRef}
        defaultPosition={{ x: fabPos.x, y: fabPos.y }}
        onStart={onFabStart}
        onDrag={onFabDrag}
        onStop={onFabStop}
      >
        <div
          ref={fabRef}
          title="Ask Biashara AI"
          onClick={onFabClick}
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            borderRadius: 50,
            background: C.primary,
            color: "#fff",
            boxShadow: "0 8px 24px rgba(108,28,44,0.35)",
            cursor: "grab",
            userSelect: "none",
          }}
        >
          <RobotOutlined style={{ fontSize: 24 }} />
          <Text strong style={{ color: "#fff", fontSize: 14, whiteSpace: "nowrap" }}>Ask Biashara AI</Text>
        </div>
      </Draggable>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width="min(640px, 96vw)"
        style={{ top: 20 }}
        destroyOnClose={false}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.primary + "18", color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              <RobotOutlined />
            </div>
            <div>
              <Text strong style={{ fontSize: 15, color: C.primary, display: "block" }}>Biashara AI</Text>
              <Text style={{ fontSize: 12, color: C.subText }}>Ask across your Basepoint modules</Text>
            </div>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
          <div
            ref={chatBodyRef}
            style={{ height: 360, overflowY: "auto", background: C.bg, borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}
          >
            {messages.length === 0 && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: C.subText }}>
                <RobotOutlined style={{ fontSize: 32, color: C.primary }} />
                <div style={{ textAlign: "center" }}>
                  <Text strong style={{ color: C.darkText, fontSize: 14, display: "block" }}>Ask Biashara AI</Text>
                  <Text style={{ color: C.subText, fontSize: 12 }}>Pick a suggested question based on your active modules</Text>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {sampleQuestions.map((q, i) => (
                    <Button key={i} size="small" onClick={() => ask(q)} style={{ borderRadius: 20, borderColor: C.primary, color: C.primary, background: "#fff" }}>{q}</Button>
                  ))}
                </div>
                <Text style={{ color: C.subText, fontSize: 12, textAlign: "center" }}>Or type your own question below.</Text>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                id={`biashara-msg-${m.id}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: 13,
                    lineHeight: 1.6,
                    background: m.role === "user" ? C.primary : "#fff",
                    color: m.role === "user" ? "#fff" : C.darkText,
                    border: m.role === "user" ? "none" : `1px solid ${C.border}`,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.role === "ai" ? <ReactMarkdown>{m.text}</ReactMarkdown> : m.text}
                </div>
                {m.role === "ai" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                    <Button size="small" icon={<DownloadOutlined />} onClick={() => exportToPdf(m.id)} style={{ borderRadius: 6 }}>Download PDF</Button>
                    {m.allowed === false && <Text type="warning" style={{ fontSize: 11 }}>Module not available</Text>}
                    {m.modules && m.allowed !== false && (
                      <Text style={{ fontSize: 11, color: C.subText }}>Modules: {m.modules.join(", ")}</Text>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && <Spin size="small" style={{ marginTop: 8 }} />}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Input.TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Biashara AI..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ borderRadius: 8, flex: 1 }}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={loading} style={{ borderRadius: 8, background: C.primary, borderColor: C.primary }} />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BiasharaAIFab;
