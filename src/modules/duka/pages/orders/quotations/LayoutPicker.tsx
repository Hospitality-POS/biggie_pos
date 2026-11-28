import React from "react";
import { CheckCircleOutlined } from "@ant-design/icons";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { THEME_C } from "@utils/getPrimaryColor";
import { QUOTE_LAYOUTS, getLayout } from "./templates";

const C = THEME_C;

/** Quote designs as thumbnail cards, the same way invoices offer theirs */
const LayoutPicker: React.FC<{ value?: string; onChange: (key: string) => void; size?: "small" | "default" }> = ({
    value, onChange, size = "default",
}) => {
    const primary = usePrimaryColor();
    const selectedKey = getLayout(value).key;
    const w = size === "small" ? 96 : 116;

    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {QUOTE_LAYOUTS.map((l) => {
                const on = l.key === selectedKey;
                // Invoice Classic follows the brand colour, as it does on invoices
                const bg = l.key === "invoice-1" ? primary : l.thumbBg;
                return (
                    <button
                        key={l.key}
                        type="button"
                        title={l.description}
                        onClick={() => onChange(l.key)}
                        style={{
                            width: w, cursor: "pointer", padding: 0, background: "#fff", textAlign: "left",
                            border: on ? `2px solid ${primary}` : `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden",
                            boxShadow: on ? `0 0 0 3px ${primary}20` : "none",
                        }}
                    >
                        <div style={{ height: size === "small" ? 48 : 62, background: bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                            <div style={{ width: "70%", opacity: 0.45 }}>
                                <div style={{ height: 3, background: l.thumbAccent, borderRadius: 2, marginBottom: 5 }} />
                                <div style={{ height: 2, background: l.thumbAccent, borderRadius: 2, marginBottom: 3, width: "80%" }} />
                                <div style={{ height: 2, background: l.thumbAccent, borderRadius: 2, width: "55%" }} />
                            </div>
                            {on && (
                                <CheckCircleOutlined style={{ position: "absolute", top: 5, right: 6, color: "#fff", fontSize: 14 }} />
                            )}
                        </div>
                        <div style={{ padding: "5px 8px", fontSize: 11, fontWeight: on ? 700 : 500, color: on ? primary : C.darkText }}>
                            {l.label}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default LayoutPicker;
