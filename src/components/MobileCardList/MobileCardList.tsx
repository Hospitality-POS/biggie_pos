import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Empty, Skeleton, Typography, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Loads the list for a MobileCardList. `listRef` stands in for a ProTable
 * actionRef, so existing add/edit modals that call
 * actionRef.current.reload() / .reset() refresh the cards too.
 */
export function useMobileListData<T>(fetcher: () => Promise<T[]>, errorText = "Failed to load") {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetcherRef.current();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      message.error(errorText);
    } finally {
      setLoading(false);
    }
  }, [errorText]);

  useEffect(() => {
    reload();
  }, [reload]);

  const listRef = useRef<any>(null);
  listRef.current = { reload, reset: reload, reloadAndRest: reload };

  return { items, loading, reload, listRef };
}

export interface MobileCardStat {
  label: string;
  value: React.ReactNode;
  color: string;
  bg: string;
}

interface MobileCardListProps<T> {
  items: T[];
  loading: boolean;
  onReload: () => void;
  renderCard: (item: T) => React.ReactNode;
  rowKey: (item: T) => string;
  /** Returns true when the item matches the (lower-cased, trimmed) query. */
  matches: (item: T, query: string) => boolean;
  searchPlaceholder?: string;
  addButton?: React.ReactNode;
  stats?: MobileCardStat[];
  emptyText?: string;
}

export const mobileCardStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  height: "100%",
};

export const mobileCardBodyStyle: React.CSSProperties = {
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  height: "100%",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: 10,
};

/**
 * Card-list replacement for a ProTable on phones and tablets: search bar,
 * reload + add buttons, a stats strip, then a responsive grid of cards.
 */
function MobileCardList<T>({
  items,
  loading,
  onReload,
  renderCard,
  rowKey,
  matches,
  searchPlaceholder = "Search…",
  addButton,
  stats,
  emptyText = "Nothing found",
}: MobileCardListProps<T>) {
  const [searchText, setSearchText] = useState("");

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return q ? items.filter((item) => matches(item, q)) : items;
  }, [items, searchText, matches]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          placeholder={searchPlaceholder}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: 1, minWidth: 0, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", padding: "0 12px", fontSize: 13, outline: "none", color: "#0f172a", background: "#f8fafc" }}
        />
        <Button icon={<ReloadOutlined />} onClick={onReload} loading={loading} aria-label="Reload" style={{ borderRadius: 8, height: 36, width: 36, padding: 0, flexShrink: 0 }} />
        {addButton}
      </div>

      {!loading && items.length > 0 && stats && stats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 8, marginBottom: 14 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</Text>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} style={{ borderRadius: 12, border: "1px solid #e2e8f0" }} bodyStyle={{ padding: 14 }}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty description={emptyText} style={{ padding: "40px 0" }} />
      ) : (
        <div style={grid}>
          {filtered.map((item) => (
            <React.Fragment key={rowKey(item)}>{renderCard(item)}</React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

export default MobileCardList;
