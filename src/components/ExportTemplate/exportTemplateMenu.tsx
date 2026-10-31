import React from "react";
import type { MenuProps } from "antd";
import { BgColorsOutlined, CheckOutlined } from "@ant-design/icons";
import {
  EXPORT_TEMPLATES,
  getExportTheme,
  cssRgb,
  type ExportTemplateId,
} from "@utils/exportTemplates";

/** Tiny page preview: title, header row, two body rows, totals row. */
const TemplateSwatch: React.FC<{ id: ExportTemplateId }> = ({ id }) => {
  const t = getExportTheme(id);
  const bar = (style: React.CSSProperties) => (
    <div style={{ height: 4, borderRadius: 1, marginTop: 2, ...style }} />
  );
  return (
    <div
      style={{
        width: 34,
        height: 30,
        padding: 3,
        borderRadius: 4,
        border: "1px solid #e2e8f0",
        background: "#fff",
        flexShrink: 0,
      }}
    >
      {t.headerBand
        ? bar({ background: cssRgb(t.title), marginTop: 0 })
        : bar({ marginTop: 0, borderBottom: `1.5px solid ${cssRgb(t.rule)}`, height: 3 })}
      {bar({ background: cssRgb(t.headFill), border: `1px solid ${cssRgb(t.headLine)}` })}
      {bar({ background: "#fff", border: "1px solid #e2e8f0" })}
      {bar({
        background: t.totalFill ? cssRgb(t.totalFill) : t.netFill ? cssRgb(t.netFill) : "#fff",
        border: `1px solid ${cssRgb(t.netBorder)}`,
      })}
    </div>
  );
};

/**
 * "Template" submenu for the payroll / payslip export dropdowns. The choice is
 * shared by every payroll and payslip download in this browser.
 */
export const exportTemplateMenuItem = (
  current: ExportTemplateId,
  onChange: (id: ExportTemplateId) => void
): NonNullable<MenuProps["items"]>[number] => ({
  key: "export-template",
  icon: <BgColorsOutlined />,
  label: `Template: ${EXPORT_TEMPLATES.find((t) => t.id === current)?.name}`,
  children: EXPORT_TEMPLATES.map((t) => ({
    key: `export-template-${t.id}`,
    onClick: () => onChange(t.id),
    label: (
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 230, padding: "2px 0" }}>
        <TemplateSwatch id={t.id} />
        <div style={{ flex: 1, lineHeight: 1.3 }}>
          <div style={{ fontWeight: 500 }}>{t.name}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.description}</div>
        </div>
        {current === t.id && <CheckOutlined style={{ color: "#10b981" }} />}
      </div>
    ),
  })),
});
