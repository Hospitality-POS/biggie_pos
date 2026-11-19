import React from "react";
import { Col, Grid, Row, Segmented, Typography } from "antd";
import { CHANNEL_CONFIG } from "../OmnichannelInboxPage";
import type { ChannelStat, OmniChannelKey } from "@services/whatsappService";

const { Text } = Typography;

/**
 * Channel-aware pieces for the Analytics and Agents tabs: a switcher to
 * narrow the stats to one channel, and a per-channel summary row.
 */

export type ConnectedChannels = Record<OmniChannelKey, boolean>;
export type ChannelChoice = "all" | OmniChannelKey;

// WhatsApp is always shown, as before. Messenger and Instagram only appear
// once the shop has connected them — otherwise they're hidden entirely.
export const visibleChannels = (connected?: Partial<ConnectedChannels>): OmniChannelKey[] => {
    const list: OmniChannelKey[] = ["whatsapp"];
    if (connected?.messenger) list.push("messenger");
    if (connected?.instagram) list.push("instagram");
    return list;
};

// A picked channel that's since been disconnected falls back to "all".
export const effectiveChoice = (choice: ChannelChoice, channels: OmniChannelKey[]): ChannelChoice =>
    choice === "all" || channels.includes(choice) ? choice : "all";

const ChannelBadge: React.FC<{ channel: OmniChannelKey; size?: number }> = ({ channel, size = 16 }) => {
    const cfg = CHANNEL_CONFIG[channel];
    return (
        <span
            style={{
                width: size,
                height: size,
                borderRadius: size / 3,
                background: cfg?.color,
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: size * 0.62,
                lineHeight: 1,
            }}
        >
            <span style={{ display: "flex", transform: `scale(${size / 28})` }}>{cfg?.icon}</span>
        </span>
    );
};

interface PickerProps {
    channels: OmniChannelKey[];
    value: ChannelChoice;
    onChange: (v: ChannelChoice) => void;
}

/** "All / WhatsApp / Messenger / Instagram" — hidden when only one channel is on. */
export const ChannelPicker: React.FC<PickerProps> = ({ channels, value, onChange }) => {
    if (channels.length < 2) return null;
    return (
        <Segmented
            size="small"
            value={value}
            onChange={(v) => onChange(v as ChannelChoice)}
            options={[
                { value: "all", label: "All channels" },
                ...channels.map((ch) => ({
                    value: ch,
                    label: (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <ChannelBadge channel={ch} size={14} />
                            {CHANNEL_CONFIG[ch]?.label}
                        </span>
                    ),
                })),
            ]}
        />
    );
};

interface BreakdownProps {
    channels: OmniChannelKey[];
    breakdown?: Partial<Record<OmniChannelKey, ChannelStat>>;
    selected: ChannelChoice;
    onSelect: (v: ChannelChoice) => void;
    formatMinutes: (v?: number | null) => string;
}

/**
 * One card per visible channel. Clicking a card narrows the page to that
 * channel; clicking the selected one goes back to all channels. Hidden when
 * only one channel is on, since it would just repeat the totals.
 */
export const ChannelBreakdown: React.FC<BreakdownProps> = ({ channels, breakdown, selected, onSelect, formatMinutes }) => {
    const isMobile = !Grid.useBreakpoint().md;
    if (channels.length < 2) return null;

    return (
        <div style={{ marginBottom: isMobile ? 8 : 12 }}>
            <Text
                type="secondary"
                style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", display: "block", marginBottom: 6 }}
            >
                By channel
            </Text>
            <Row gutter={isMobile ? [8, 8] : [12, 12]}>
                {channels.map((ch) => {
                    const cfg = CHANNEL_CONFIG[ch];
                    const s = breakdown?.[ch];
                    const active = selected === ch;
                    return (
                        <Col xs={24} sm={12} lg={24 / channels.length} key={ch}>
                            <button
                                type="button"
                                onClick={() => onSelect(active ? "all" : ch)}
                                aria-pressed={active}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    background: cfg?.bg || "#fff",
                                    border: `1px solid ${active ? cfg?.color : "#e2e8f0"}`,
                                    boxShadow: active ? `0 0 0 2px ${cfg?.color}33` : "none",
                                    borderRadius: 12,
                                    padding: isMobile ? "10px 12px" : "12px 16px",
                                    font: "inherit",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                    <ChannelBadge channel={ch} size={22} />
                                    <Text strong style={{ fontSize: 13 }}>{cfg?.label}</Text>
                                </div>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                                    <Text strong style={{ fontSize: isMobile ? 20 : 22, color: "#0f172a", lineHeight: 1.1 }}>
                                        {(s?.conversations ?? 0).toLocaleString()}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>conversations</Text>
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 12, color: "#475569" }}>
                                    <span>{(s?.messages ?? 0).toLocaleString()} messages</span>
                                    <span>{s?.resolutionRate ?? 0}% resolved</span>
                                    <span>1st reply {formatMinutes(s?.averageFirstResponseMinutes)}</span>
                                </div>
                            </button>
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
};

export const channelLabel = (ch: OmniChannelKey) => CHANNEL_CONFIG[ch]?.label || ch;
export { ChannelBadge };
