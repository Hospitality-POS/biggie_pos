import React, { useEffect, useRef, useState } from "react";
import { Tooltip } from "antd";
import {
    MedicineBoxOutlined,
    ExperimentOutlined,
    HeartOutlined,
    MenuOutlined,
    CloseOutlined,
    PlusCircleOutlined,
} from "@ant-design/icons";
import { usePrimaryColor } from "@context/PrimaryColorContext";

// ── Section icon map ──────────────────────────────────────────────────────────
const DEPT_ICONS: Record<string, React.ReactNode> = {
    Pharmacy: <MedicineBoxOutlined />,
    Laboratory: <ExperimentOutlined />,
    Radiology: <HeartOutlined />,
    Procedures: <PlusCircleOutlined />,
    default: <MedicineBoxOutlined />,
};

const getDeptIcon = (name: string): React.ReactNode =>
    DEPT_ICONS[name] ?? DEPT_ICONS.default;

interface HospitalSidebarProps {
    handleSubCategoryChange: (id: string) => void;
    subcategories: Array<{ _id: string; name: string }>;
}

const HospitalSidebar: React.FC<HospitalSidebarProps> = ({
    handleSubCategoryChange,
    subcategories,
}) => {
    const [selectedKey, setSelectedKey] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const primaryColor = usePrimaryColor();

    // Derive slightly darkened shade for header bg
    const bgDeep = `${primaryColor}dd`;
    const active = "rgba(255,255,255,0.16)";
    const hover = "rgba(255,255,255,0.09)";
    const textMuted = "rgba(255,255,255,0.5)";
    const textColor = "rgba(255,255,255,0.85)";

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    useEffect(() => {
        if (subcategories?.length && !selectedKey) {
            setSelectedKey(subcategories[0]._id);
        }
    }, [subcategories]);

    useEffect(() => {
        if (!drawerOpen) return;
        const handler = (e: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
                setDrawerOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [drawerOpen]);

    const handleSelect = (id: string) => {
        setSelectedKey(id);
        handleSubCategoryChange(id);
        if (isMobile) setDrawerOpen(false);
    };

    if (!subcategories?.length) return null;

    // ── Shared menu item ──────────────────────────────────────────────────────
    const MenuItem = ({
        sub,
        collapsed,
        onClick,
    }: {
        sub: { _id: string; name: string };
        collapsed?: boolean;
        onClick: () => void;
    }) => {
        const isSelected = selectedKey === sub._id;
        const icon = getDeptIcon(sub.name);

        return (
            <Tooltip title={collapsed ? sub.name : ""} placement="right" mouseEnterDelay={0.3}>
                <button
                    onClick={onClick}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: collapsed ? 0 : 10,
                        justifyContent: collapsed ? "center" : "flex-start",
                        width: "100%",
                        padding: collapsed ? "11px 0" : "10px 12px",
                        margin: "2px 0",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        background: isSelected ? active : "transparent",
                        color: isSelected ? "#fff" : textColor,
                        fontSize: 12,
                        fontWeight: isSelected ? 600 : 400,
                        letterSpacing: 0.2,
                        transition: "background 0.15s",
                        outline: "none",
                        position: "relative",
                        overflow: "hidden",
                    }}
                    onMouseEnter={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = hover;
                    }}
                    onMouseLeave={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                >
                    {/* Active side bar */}
                    {isSelected && (
                        <span
                            style={{
                                position: "absolute", left: 0, top: "20%",
                                height: "60%", width: 3,
                                borderRadius: "0 3px 3px 0",
                                background: primaryColor,
                            }}
                        />
                    )}

                    {/* Icon */}
                    <span style={{
                        fontSize: 14, flexShrink: 0,
                        color: isSelected ? primaryColor : textMuted,
                        display: "flex",
                    }}>
                        {icon}
                    </span>

                    {!collapsed && (
                        <span
                            style={{
                                flex: 1, textAlign: "left",
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                color: isSelected ? "#fff" : textColor,
                            }}
                        >
                            {sub.name}
                        </span>
                    )}
                </button>
            </Tooltip>
        );
    };

    // ── Mobile: slide-in drawer ───────────────────────────────────────────────
    if (isMobile) {
        return (
            <>
                {drawerOpen && (
                    <div
                        style={{
                            position: "fixed", inset: 0,
                            background: "rgba(0,0,0,0.4)", zIndex: 1100,
                            backdropFilter: "blur(2px)",
                        }}
                        onClick={() => setDrawerOpen(false)}
                    />
                )}

                <div
                    ref={drawerRef}
                    style={{
                        position: "fixed", top: 0,
                        left: drawerOpen ? 0 : "-260px",
                        height: "100dvh", width: 240,
                        background: primaryColor, zIndex: 1200,
                        transition: "left 0.26s cubic-bezier(0.4,0,0.2,1)",
                        display: "flex", flexDirection: "column",
                        boxShadow: drawerOpen ? "4px 0 24px rgba(0,0,0,0.22)" : "none",
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "16px 14px 12px",
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                            background: bgDeep,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: primaryColor, fontSize: 16, lineHeight: 1, display: "flex" }}>
                                <MedicineBoxOutlined />
                            </span>
                            <span style={{
                                color: "white", fontWeight: 700, fontSize: 12,
                                letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.9,
                            }}>
                                Departments
                            </span>
                        </div>
                        <button
                            onClick={() => setDrawerOpen(false)}
                            style={{
                                background: "rgba(255,255,255,0.12)", border: "none",
                                borderRadius: 6, color: "white", cursor: "pointer",
                                padding: "4px 6px", display: "flex", alignItems: "center",
                            }}
                        >
                            <CloseOutlined style={{ fontSize: 12 }} />
                        </button>
                    </div>

                    {/* Items */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
                        {subcategories.map((sub) => (
                            <MenuItem key={sub._id} sub={sub} onClick={() => handleSelect(sub._id)} />
                        ))}
                    </div>
                </div>

                {/* Floating pill */}
                <button
                    onClick={() => setDrawerOpen(true)}
                    style={{
                        position: "fixed", left: 14, bottom: 80, zIndex: 1050,
                        background: primaryColor, border: "none", borderRadius: 24,
                        color: "white", padding: "10px 16px",
                        display: "flex", alignItems: "center", gap: 7,
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        boxShadow: "0 4px 16px rgba(13,148,136,0.45)",
                        transition: "transform 0.15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                >
                    <MenuOutlined style={{ fontSize: 12 }} />
                    <span>
                        {selectedKey
                            ? subcategories.find((s) => s._id === selectedKey)?.name ?? "Departments"
                            : "Departments"}
                    </span>
                </button>
            </>
        );
    }

    // ── Desktop: collapsible sidebar ──────────────────────────────────────────
    return (
        <div
            style={{
                width: isCollapsed ? 60 : 185,
                minWidth: isCollapsed ? 60 : 185,
                background: primaryColor,
                height: "100%",
                display: "flex", flexDirection: "column",
                transition: "width 0.24s cubic-bezier(0.4,0,0.2,1), min-width 0.24s cubic-bezier(0.4,0,0.2,1)",
                borderRadius: "10px 0 0 10px",
                overflow: "hidden",
                boxShadow: "inset -1px 0 0 rgba(255,255,255,0.06)",
            }}
        >
            {/* Header / collapse toggle */}
            <div
                style={{
                    display: "flex", alignItems: "center",
                    justifyContent: isCollapsed ? "center" : "space-between",
                    padding: isCollapsed ? "12px 0" : "12px 10px 10px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    background: bgDeep, flexShrink: 0,
                }}
            >
                {!isCollapsed && (
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ color: primaryColor, fontSize: 13, lineHeight: 1, display: "flex" }}>
                            <MedicineBoxOutlined />
                        </span>
                        <span style={{
                            color: textMuted, fontSize: 10,
                            letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 700,
                        }}>
                            Dept.
                        </span>
                    </div>
                )}
                <Tooltip title={isCollapsed ? "Expand" : "Collapse"} placement="right">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        style={{
                            background: "rgba(255,255,255,0.1)", border: "none",
                            borderRadius: 6, color: "white", cursor: "pointer",
                            padding: "5px 7px", display: "flex", alignItems: "center",
                            transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.2)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)")}
                    >
                        <MenuOutlined style={{ fontSize: 11 }} />
                    </button>
                </Tooltip>
            </div>

            {/* Items */}
            <div
                style={{
                    flex: 1, overflowY: "auto",
                    padding: isCollapsed ? "8px 6px" : "8px 7px",
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(255,255,255,0.15) transparent",
                }}
            >
                {subcategories.map((sub) => (
                    <MenuItem
                        key={sub._id} sub={sub} collapsed={isCollapsed}
                        onClick={() => handleSelect(sub._id)}
                    />
                ))}
            </div>

            {/* Footer count */}
            {!isCollapsed && (
                <div
                    style={{
                        padding: "8px 12px",
                        borderTop: "1px solid rgba(255,255,255,0.07)",
                        display: "flex", alignItems: "center", gap: 6,
                    }}
                >
                    <span
                        style={{
                            background: "rgba(94,234,212,0.2)", borderRadius: 10,
                            padding: "1px 8px", fontSize: 11,
                            color: primaryColor, fontWeight: 700,
                        }}
                    >
                        {subcategories.length}
                    </span>
                    <span style={{ fontSize: 11, color: textMuted }}>departments</span>
                </div>
            )}
        </div>
    );
};

export default HospitalSidebar;