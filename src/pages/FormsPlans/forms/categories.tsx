import React, { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Divider, Input, Select, message, type SelectProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { usePermissions } from "@hooks/usePermissions";
import { createFormCategory, fetchFormCategories, type CustomCategory } from "@services/formCategories";
import { useAudience } from "../audience";
import { CATEGORY_META } from "./constants";
import type { BuiltInCategory, FormCategory } from "./types";

export interface CategoryMeta {
  label: string;
  color: string;
  bg: string;
  emoji: string;
}

const tint = (hex: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}14` : "#f8fafc");

/**
 * Built-in categories for the audience plus the ones the shop added.
 * meta() works for either, so lists show the shop's own treatments properly.
 */
export const useCategories = () => {
  const a = useAudience();
  const { data: custom = [] } = useQuery({
    queryKey: ["form-categories", a.audience],
    queryFn: () => fetchFormCategories(a.audience),
    staleTime: 5 * 60_000,
  });

  const byKey = useMemo(() => new Map(custom.map((c) => [c.key, c])), [custom]);

  const options = useMemo(
    () => [
      ...a.categoryOptions.filter((o) => o.value !== "other"),
      ...custom.map((c) => ({ value: c.key, label: `${c.emoji}  ${c.label}` })),
      ...a.categoryOptions.filter((o) => o.value === "other"),
    ],
    [a.categoryOptions, custom]
  );

  const meta = useCallback(
    (key?: FormCategory | null): CategoryMeta => {
      const builtIn = CATEGORY_META[(key ?? "other") as BuiltInCategory];
      if (builtIn) return builtIn;
      const c = key ? byKey.get(key) : undefined;
      return c ? { label: c.label, color: c.color, bg: tint(c.color), emoji: c.emoji } : CATEGORY_META.other;
    },
    [byKey]
  );

  return { options, meta, custom };
};

type CategorySelectProps = Omit<SelectProps, "options" | "dropdownRender" | "popupRender">;

/**
 * Category picker with "+ Add" at the bottom of the list, so shops add their
 * own treatments (or form types) instead of only the built-in ones.
 */
export const CategorySelect: React.FC<CategorySelectProps> = (props) => {
  const a = useAudience();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const { options } = useCategories();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const canAdd = can(a.perms.categoriesManage);
  const noun = a.audience === "employee" ? "type" : "treatment";

  const add = async () => {
    const label = name.trim();
    if (!label) return;
    setSaving(true);
    try {
      const created = await createFormCategory(a.audience, label);
      queryClient.setQueryData<CustomCategory[]>(["form-categories", a.audience], (old = []) =>
        old.some((c) => c.key === created.key) ? old : [...old, created].sort((x, y) => x.label.localeCompare(y.label))
      );
      setName("");
      // Pick it straight away (adds to the list in multi-select)
      if (props.mode === "multiple") {
        const current = Array.isArray(props.value) ? props.value : [];
        if (!current.includes(created.key)) props.onChange?.([...current, created.key], []);
      } else {
        props.onChange?.(created.key, { value: created.key, label: created.label });
      }
    } catch (e: any) {
      message.error(e?.response?.data?.message || `Couldn't add the ${noun}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select
      showSearch
      optionFilterProp="label"
      {...props}
      options={options}
      dropdownRender={(menu) => (
        <>
          {menu}
          {canAdd && (
            <>
              <Divider style={{ margin: "6px 0" }} />
              <div style={{ display: "flex", gap: 6, padding: "0 6px 4px" }} onMouseDown={(e) => e.stopPropagation()}>
                <Input
                  size="small"
                  value={name}
                  placeholder={`New ${noun}`}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") add();
                  }}
                />
                <Button size="small" type="primary" icon={<PlusOutlined />} loading={saving} disabled={!name.trim()} onClick={add}>
                  Add
                </Button>
              </div>
            </>
          )}
        </>
      )}
    />
  );
};
