import React from "react";
import { Grid, Space, Tag, Tooltip, Typography } from "antd";
import { LeftOutlined, RightOutlined, ShopOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchShop, ShopWhatsappMarketplace } from "@services/shops";
import "./omni.css";

// Keeps a primary button in its own colour despite the global theme override
// (see omni.css). Use with className="omni-btn-tint".
export const tintStyle = (color: string) => ({ "--omni-btn": color }) as React.CSSProperties;

const { Title, Text } = Typography;

/**
 * Shared building blocks for the Omnichannel tabs (SMS, Email, Scripts,
 * Auto-Reply, Analytics, Agents) so every tab has the same header, KPI tiles
 * and marketplace awareness.
 */

// Shop's WhatsApp Marketplace config — tabs add marketplace extras when on.
export const useMarketplace = (shopId: string) => {
    const { data } = useQuery({
        queryKey: ["shop", shopId],
        queryFn: () => fetchShop(shopId),
        enabled: !!shopId,
        staleTime: 60_000,
    });
    const config = data?.whatsapp_marketplace as ShopWhatsappMarketplace | undefined;
    return { enabled: !!config?.enabled, config, shopName: (data?.name as string) || "" };
};

interface PageHeaderProps {
    icon: React.ReactNode;
    color: string;
    bg: string;
    title: string;
    subtitle?: React.ReactNode;
    extra?: React.ReactNode;
    marketplace?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon, color, bg, title, subtitle, extra, marketplace }) => {
    const isMobile = !Grid.useBreakpoint().md;
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: isMobile ? 12 : 16,
            }}
        >
            <Space align="center" size={10} style={{ minWidth: 0 }}>
                <div
                    style={{
                        background: bg,
                        borderRadius: 10,
                        padding: "6px 8px",
                        color,
                        fontSize: 18,
                        display: "flex",
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </div>
                <div style={{ minWidth: 0 }}>
                    <Space size={8} align="center" wrap>
                        <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>
                            {title}
                        </Title>
                        {marketplace && <MarketplaceTag />}
                    </Space>
                    {subtitle && (
                        <Text style={{ fontSize: 12, color: "#64748b", display: "block" }}>{subtitle}</Text>
                    )}
                </div>
            </Space>
            {extra && <Space wrap>{extra}</Space>}
        </div>
    );
};

export const MarketplaceTag: React.FC = () => (
    <Tooltip title="WhatsApp Marketplace is on for this shop — marketplace tools are shown here">
        <Tag
            icon={<ShopOutlined />}
            color="green"
            style={{ marginInlineEnd: 0, fontSize: 11, borderRadius: 999 }}
        >
            Marketplace
        </Tag>
    </Tooltip>
);

export interface KpiTileProps {
    title: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    color: string;
    bg: string;
    border: string;
    hint?: string;
    loading?: boolean;
}

export const KpiTile: React.FC<KpiTileProps> = ({ title, value, icon, color, bg, border, hint, loading }) => {
    const isMobile = !Grid.useBreakpoint().md;
    const tile = (
        <div
            style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: isMobile ? 10 : 12,
                padding: isMobile ? "10px 12px" : "14px 16px",
                height: "100%",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <Text
                    style={{
                        fontSize: isMobile ? 11 : 12,
                        color: "#475569",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {title}
                </Text>
                <div
                    style={{
                        background: "#fff",
                        borderRadius: 7,
                        padding: "3px 6px",
                        color,
                        fontSize: 13,
                        lineHeight: 1,
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </div>
            </div>
            <div
                style={{
                    fontSize: isMobile ? 17 : 22,
                    fontWeight: 700,
                    color: "#0f172a",
                    marginTop: 2,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            >
                {loading ? "…" : value}
            </div>
        </div>
    );
    return hint ? <Tooltip title={hint}>{tile}</Tooltip> : tile;
};

// Soft palette shared by the tiles so tabs stay visually consistent.
export const TONES = {
    blue: { color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
    teal: { color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
    green: { color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
    amber: { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
    orange: { color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
    violet: { color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
    indigo: { color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
    pink: { color: "#c026d3", bg: "#fdf4ff", border: "#f5d0fe" },
    red: { color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
    slate: { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
} as const;

// ── Contact avatar ───────────────────────────────────────────────────────────
// Initials on a colour picked from the name, so the same customer always
// looks the same in the list and the thread (instead of a generic icon).
const AVATAR_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#6366f1", "#ec4899", "#84cc16", "#f97316"];

export const initialsOf = (name?: string) => {
    const clean = String(name || "").replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
    if (!clean) return "?";
    if (/^\+?\d[\d\s]*$/.test(clean)) return "#";
    const parts = clean.split(/\s+/);
    return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

const colorFor = (seed: string) => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

export const ContactAvatar: React.FC<{
    name?: string;
    seed?: string;
    size?: number;
    badgeColor?: string;
    badgeIcon?: React.ReactNode;
}> = ({ name, seed, size = 40, badgeColor, badgeIcon }) => (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
        <div
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: colorFor(seed || name || "?"),
                color: "#fff",
                fontWeight: 600,
                fontSize: Math.round(size * 0.38),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: 0.3,
            }}
        >
            {initialsOf(name)}
        </div>
        {badgeColor && (
            <span
                style={{
                    position: "absolute",
                    bottom: -2,
                    right: -2,
                    width: Math.max(14, Math.round(size * 0.38)),
                    height: Math.max(14, Math.round(size * 0.38)),
                    borderRadius: "50%",
                    background: badgeColor,
                    border: "2px solid #fff",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8,
                    overflow: "hidden",
                }}
            >
                <span style={{ transform: "scale(0.5)", display: "flex" }}>{badgeIcon}</span>
            </span>
        )}
    </div>
);

// WhatsApp-style timestamp: 14:05 today, "Yesterday", weekday this week,
// otherwise dd/mm/yy.
export const chatTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const t = d.getTime();
    if (t >= startToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    if (t >= startToday - 86400000) return "Yesterday";
    if (t >= startToday - 6 * 86400000) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

// ── Sideways scroller ────────────────────────────────────────────────────────
// Rows of pills/chips scroll sideways. Touch screens swipe natively; with a
// mouse or trackpad there's no visible scrollbar, so non-touch devices get
// ‹ › buttons at the edges (only while there's more to see) and the mouse
// wheel scrolls the row sideways.

// "Touch device" = the main pointer is a finger and can't hover (phones,
// tablets). maxTouchPoints alone isn't used: Windows laptops with a mouse
// often report touch support too, and they still need the arrows.
const isTouchDevice = () =>
    typeof window !== "undefined" && !!window.matchMedia?.("(hover: none) and (pointer: coarse)").matches;

export const HScroll: React.FC<{
    children: React.ReactNode;
    gap?: number;
    padding?: string;
    style?: React.CSSProperties;
}> = ({ children, gap = 6, padding = "0", style }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const [touch] = React.useState(isTouchDevice);
    const [edges, setEdges] = React.useState({ left: false, right: false });

    const update = React.useCallback(() => {
        const el = ref.current;
        if (!el) return;
        setEdges({
            left: el.scrollLeft > 2,
            right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
        });
    }, []);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        update();
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
        ro?.observe(el);
        // Wheel → sideways, but only while the row can actually move, so the
        // page still scrolls normally at either end.
        const onWheel = (e: WheelEvent) => {
            if (touch || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
            const max = el.scrollWidth - el.clientWidth;
            if (max <= 0) return;
            const next = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY));
            if (next !== el.scrollLeft) {
                e.preventDefault();
                el.scrollLeft = next;
            }
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => {
            ro?.disconnect();
            el.removeEventListener("wheel", onWheel);
        };
    }, [touch, update, children]);

    const nudge = (dir: 1 | -1) => {
        const el = ref.current;
        if (el) el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.7), behavior: "smooth" });
    };

    const arrow = (dir: 1 | -1) => (
        <button
            type="button"
            aria-label={dir === 1 ? "Scroll right" : "Scroll left"}
            onClick={() => nudge(dir)}
            style={{
                position: "absolute",
                top: "50%",
                [dir === 1 ? "right" : "left"]: 0,
                transform: "translateY(-50%)",
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "1px solid #e2e8f0",
                background: "#fff",
                boxShadow: "0 2px 6px rgba(15,23,42,0.12)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#54656f",
                zIndex: 2,
                padding: 0,
            } as React.CSSProperties}
        >
            {dir === 1 ? <RightOutlined style={{ fontSize: 11 }} /> : <LeftOutlined style={{ fontSize: 11 }} />}
        </button>
    );

    const fade = (side: "left" | "right") => (
        <div
            style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                [side]: 0,
                width: 44,
                pointerEvents: "none",
                background: `linear-gradient(to ${side === "left" ? "right" : "left"}, #fff 35%, rgba(255,255,255,0))`,
                zIndex: 1,
            } as React.CSSProperties}
        />
    );

    return (
        <div style={{ position: "relative", minWidth: 0, ...style }}>
            <div
                ref={ref}
                onScroll={update}
                className="omni-hscroll"
                style={{ display: "flex", gap, overflowX: "auto", padding, scrollbarWidth: "none" }}
            >
                {children}
            </div>
            {!touch && edges.left && fade("left")}
            {!touch && edges.right && fade("right")}
            {!touch && edges.left && arrow(-1)}
            {!touch && edges.right && arrow(1)}
        </div>
    );
};

export const cardChrome: React.CSSProperties = {
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};
