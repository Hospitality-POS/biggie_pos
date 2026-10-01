import React, { useRef } from "react";
import { Input, Button } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";

const C = THEME_C;

export interface ChatInputBarProps {
  input: string;
  setInput: (val: string) => void;
  loading: boolean;
  shopName?: string;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  input,
  setInput,
  loading,
  shopName,
  onSend,
  onKeyDown,
}) => {
  const textareaRef = useRef<any>(null);

  return (
    <div
      style={{
        padding: "12px 14px 16px 14px",
        background: "#ffffff",
        borderTop: "1px solid #eef2f6",
      }}
    >
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: "8px 10px 8px 12px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          transition: "border-color 0.15s ease",
        }}
      >
        <Input.TextArea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Ask Biashara AI about ${shopName || "this shop"}...`}
          autoSize={{ minRows: 1, maxRows: 4 }}
          variant="borderless"
          style={{
            padding: 0,
            fontSize: 13,
            background: "transparent",
            resize: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 6,
            paddingTop: 4,
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            Shift + Enter for newline
          </span>

          <Button
            type="primary"
            shape="circle"
            size="small"
            icon={<SendOutlined />}
            onClick={onSend}
            disabled={!input.trim() || loading}
            loading={loading}
            style={{
              background: input.trim() && !loading ? C.primary : "#e2e8f0",
            }}
          />
        </div>
      </div>
    </div>
  );
};
