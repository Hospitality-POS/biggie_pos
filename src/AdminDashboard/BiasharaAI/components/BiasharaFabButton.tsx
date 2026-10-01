import React from "react";
import Draggable from "react-draggable";
import { Badge, Typography } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { ThinkingOrb } from "thinking-orbs";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;
const C = THEME_C;

export interface BiasharaFabButtonProps {
  fabRef: React.RefObject<HTMLDivElement | null>;
  fabPos: { x: number; y: number };
  onFabStart: (_: unknown, data: { x: number; y: number }) => void;
  onFabDrag: (_: unknown, data: { x: number; y: number }) => void;
  onFabStop: (_: unknown, data: { x: number; y: number }) => void;
  onClick: () => void;
  loading: boolean;
  isMobile: boolean;
}

export const BiasharaFabButton: React.FC<BiasharaFabButtonProps> = ({
  fabRef,
  fabPos,
  onFabStart,
  onFabDrag,
  onFabStop,
  onClick,
  loading,
  isMobile,
}) => {
  return (
    <Draggable
      nodeRef={fabRef as any}
      defaultPosition={{ x: fabPos.x, y: fabPos.y }}
      onStart={onFabStart}
      onDrag={onFabDrag}
      onStop={onFabStop}
    >
      <div
        ref={fabRef as any}
        title="Open Biashara AI Assistant"
        onClick={onClick}
        style={{
          position: "fixed",
          right: isMobile ? 16 : 24,
          bottom: isMobile ? 16 : 24,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "center" : "flex-start",
          gap: 10,
          padding: isMobile ? 0 : "10px 18px",
          width: isMobile ? 48 : "auto",
          height: isMobile ? 48 : "auto",
          borderRadius: 50,
          background: `linear-gradient(135deg, ${C.primary} 0%, #8b1d36 100%)`,
          color: "#fff",
          boxShadow:
            "0 10px 25px -3px rgba(108, 28, 44, 0.45), 0 4px 6px -4px rgba(108, 28, 44, 0.2)",
          cursor: "grab",
          userSelect: "none",
          transition: "transform 0.15s ease",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
            }}
          >
            <ThinkingOrb size={20} state="working" theme="dark" />
          </div>
        ) : (
          <Badge dot status="processing" offset={[-2, 2]}>
            <RobotOutlined style={{ fontSize: isMobile ? 22 : 20, color: "#fff" }} />
          </Badge>
        )}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Text
              strong
              style={{
                color: "#fff",
                fontSize: 13,
                letterSpacing: "0.2px",
                whiteSpace: "nowrap",
              }}
            >
              {loading ? "AI Thinking..." : "Biashara AI"}
            </Text>
            {!loading && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  background: "rgba(255, 255, 255, 0.22)",
                  color: "#fff",
                  padding: "1px 5px",
                  borderRadius: 4,
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  lineHeight: 1.2,
                }}
              >
                Beta
              </span>
            )}
          </div>
        )}
      </div>
    </Draggable>
  );
};
