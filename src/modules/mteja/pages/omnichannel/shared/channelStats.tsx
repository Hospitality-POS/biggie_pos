import React from "react";
import { Alert, Segmented } from "antd";
import { CHANNEL_CONFIG } from "../OmnichannelInboxPage";
import type { OmniChannelKey } from "@services/whatsappService";

/**
 * Channel-aware pieces for the Analytics and Agents tabs: a switcher that
 * narrows every stat on the tab to one channel.
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

/**
 * Shown when a channel is picked but the server answered with all-channel
 * numbers (an API without the channel filter), so the tiles aren't silently
 * showing the wrong channel.
 */
export const ChannelFilterNotice: React.FC<{ requested: ChannelChoice; served?: string }> = ({ requested, served }) => {
    if (requested === "all" || served === requested) return null;
    return (
        <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12, borderRadius: 10 }}
            message={`Showing all channels — the server doesn't support filtering by ${CHANNEL_CONFIG[requested]?.label || requested} yet.`}
        />
    );
};

export const channelLabel = (ch: OmniChannelKey) => CHANNEL_CONFIG[ch]?.label || ch;
export { ChannelBadge };
