import React from "react";
import { Typography, Tooltip, Popconfirm, Dropdown, Button, Tag, MenuProps } from "antd";
import {
  RobotOutlined,
  SoundOutlined,
  ClearOutlined,
  MoreOutlined,
  ShopOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";
import { locationDisplay } from "@services/shops";
import { AdvisorStage, STAGE_LABELS } from "../types/biasharaAI.types";

const { Text } = Typography;
const C = THEME_C;

export interface BiasharaDrawerHeaderProps {
  currentShop: any | null;
  shops: any[];
  loadingShops: boolean;
  selectedShopId: string;
  onSelectShopId: (id: string) => void;
  selectedStage: AdvisorStage;
  onSelectStage: (stage: AdvisorStage) => void;
  liveSoundEnabled: boolean;
  onToggleLiveSound: () => void;
  loading: boolean;
  loadingElapsedSec: number;
  hasMessages: boolean;
  onClearChat: () => void;
  onClose: () => void;
}

export const BiasharaDrawerHeader: React.FC<BiasharaDrawerHeaderProps> = ({
  currentShop,
  shops,
  loadingShops,
  selectedShopId,
  onSelectShopId,
  selectedStage,
  onSelectStage,
  liveSoundEnabled,
  onToggleLiveSound,
  loading,
  loadingElapsedSec,
  hasMessages,
  onClearChat,
  onClose,
}) => {
  const shopMenuItems: MenuProps["items"] = shops.map((s: any) => {
    const locText = locationDisplay(s.location);
    return {
      key: s._id,
      label: (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Text strong style={{ fontSize: 13 }}>
            {s.name || s.branch_name || "Branch"}
          </Text>
          {locText && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {locText}
            </Text>
          )}
        </div>
      ),
      icon: <ShopOutlined style={{ color: C.primary }} />,
      onClick: () => onSelectShopId(s._id),
    };
  });

  const stageMenuItems: MenuProps["items"] = (
    Object.keys(STAGE_LABELS) as AdvisorStage[]
  ).map((stageKey) => {
    const item = STAGE_LABELS[stageKey];
    return {
      key: stageKey,
      label: (
        <div style={{ display: "flex", flexDirection: "column", padding: "2px 0" }}>
          <Text strong style={{ fontSize: 13 }}>
            {item.label}
          </Text>
          <Text type="secondary" style={{ fontSize: 11, maxWidth: 220 }}>
            {item.desc}
          </Text>
        </div>
      ),
      icon: <span style={{ color: C.primary }}>{item.icon}</span>,
      onClick: () => onSelectStage(stageKey),
    };
  });

  const moreOptionsMenu: MenuProps["items"] = [
    {
      key: "live-sound",
      label: liveSoundEnabled ? "Sound: Active" : "Sound: Muted",
      icon: (
        <SoundOutlined
          style={{ color: liveSoundEnabled ? "#6366f1" : undefined }}
        />
      ),
      onClick: onToggleLiveSound,
    },
    { type: "divider" },
    {
      key: "clear",
      label: "Clear conversation",
      icon: <ClearOutlined />,
      danger: true,
      disabled: !hasMessages,
      onClick: onClearChat,
    },
  ];

  return (
    <>
      {/* Title Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        {/* Left Title & Status Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <RobotOutlined style={{ fontSize: 18, color: C.primary }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap" }}>
              <Text
                strong
                style={{
                  fontSize: 15,
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Biashara AI
              </Text>
              <Tag
                style={{
                  fontSize: 9,
                  lineHeight: "15px",
                  padding: "0 5px",
                  borderRadius: 4,
                  fontWeight: 700,
                  margin: 0,
                  textTransform: "uppercase",
                  background: "#fffbeb",
                  borderColor: "#fde68a",
                  color: "#d97706",
                  flexShrink: 0,
                }}
              >
                Beta
              </Tag>
              {loading && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#2563eb",
                    background: "#eff6ff",
                    padding: "1px 6px",
                    borderRadius: 10,
                    border: "1px solid #bfdbfe",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#2563eb",
                    }}
                  />
                  {`Thinking (${loadingElapsedSec}s)`}
                </span>
              )}
            </div>
            <Text
              ellipsis
              style={{
                fontSize: 11,
                color: "#64748b",
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Intelligent advisor for {currentShop?.name || "your store"}
            </Text>
          </div>
        </div>

        {/* Right Header Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 8 }}>
          <Tooltip
            title={
              liveSoundEnabled
                ? "Sound: Active (Click to mute)"
                : "Sound: Muted (Click to activate)"
            }
          >
            <button
              type="button"
              onClick={onToggleLiveSound}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 14,
                background: liveSoundEnabled
                  ? "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(236,72,153,0.12) 100%)"
                  : "#f1f5f9",
                border: liveSoundEnabled
                  ? "1px solid rgba(99,102,241,0.35)"
                  : "1px solid #e2e8f0",
                color: liveSoundEnabled ? "#4f46e5" : "#64748b",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <SoundOutlined
                style={{
                  fontSize: 11,
                  color: liveSoundEnabled ? "#6366f1" : "#94a3b8",
                }}
              />
              <span>{liveSoundEnabled ? "Sound" : "Muted"}</span>
            </button>
          </Tooltip>

          {hasMessages && (
            <Popconfirm
              title="Clear this conversation?"
              onConfirm={onClearChat}
              okText="Clear"
              cancelText="Cancel"
              okButtonProps={{ danger: true, size: "small" }}
              cancelButtonProps={{ size: "small" }}
            >
              <Tooltip title="Reset Chat">
                <Button
                  size="small"
                  type="text"
                  icon={<ClearOutlined style={{ color: "#94a3b8" }} />}
                />
              </Tooltip>
            </Popconfirm>
          )}

          <Dropdown menu={{ items: moreOptionsMenu }} trigger={["click"]}>
            <Button
              size="small"
              type="text"
              icon={<MoreOutlined style={{ color: "#94a3b8", fontSize: 16 }} />}
            />
          </Dropdown>

          <Button
            size="small"
            type="text"
            onClick={onClose}
            style={{ color: "#64748b", fontWeight: 600, fontSize: 13 }}
          >
            ✕
          </Button>
        </div>
      </div>

      {/* Control Strip (Branch Pill & Stage Pill) */}
      <div
        style={{
          padding: "8px 14px",
          background: "#ffffff",
          borderBottom: "1px solid #eef2f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          margin: "12px -16px -12px -16px",
        }}
      >
        {/* Branch Pill Dropdown */}
        <Dropdown
          menu={{ items: shopMenuItems, selectedKeys: [selectedShopId] }}
          trigger={["click"]}
          placement="bottomLeft"
        >
          <button
            type="button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 20,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#1e293b",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              maxWidth: 220,
              transition: "all 0.15s ease",
            }}
          >
            <ShopOutlined style={{ color: C.primary, fontSize: 13 }} />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {loadingShops
                ? "Loading..."
                : currentShop?.name || "Select Branch"}
            </span>
            <DownOutlined style={{ fontSize: 9, color: "#94a3b8", marginLeft: 2 }} />
          </button>
        </Dropdown>

        {/* Strategy Stage Pill Dropdown */}
        <Dropdown
          menu={{ items: stageMenuItems, selectedKeys: [selectedStage] }}
          trigger={["click"]}
          placement="bottomRight"
        >
          <button
            type="button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 20,
              background: selectedStage === "auto" ? "#f8fafc" : `${C.primary}0d`,
              border:
                selectedStage === "auto"
                  ? "1px solid #e2e8f0"
                  : `1px solid ${C.primary}30`,
              color: selectedStage === "auto" ? "#475569" : C.primary,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {STAGE_LABELS[selectedStage].icon}
            <span>{STAGE_LABELS[selectedStage].label.split(" ")[0]}</span>
            <DownOutlined style={{ fontSize: 9, color: "#94a3b8", marginLeft: 2 }} />
          </button>
        </Dropdown>
      </div>
    </>
  );
};
