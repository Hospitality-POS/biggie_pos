import { useRef, useState } from "react";
import { CalendarOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import BookingsList from "./BookingsList";
import CalendarView from "./CalendarView";

const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Tab definition ─────────────────────────────────────────────────────────
type TabKey = "calendar" | "list";

const TABS: { key: TabKey; icon: React.ReactNode; label: string }[] = [
  { key: "calendar", icon: <CalendarOutlined />, label: "Calendar View" },
  { key: "list", icon: <UnorderedListOutlined />, label: "Bookings List" },
];

// ── Component ──────────────────────────────────────────────────────────────
const SpaReservationSystem = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("calendar");

  // Ref to CalendarView's openEdit — we expose it via a forwarded callback
  // so BookingsList can trigger edit mode in the calendar from the list tab.
  const calendarEditRef = useRef<((appt: any) => void) | null>(null);

  const handleEditFromList = (booking: any) => {
    // Switch to calendar tab, then open the edit drawer
    setActiveTab("calendar");
    // Use rAF to ensure CalendarView has mounted / re-rendered first
    requestAnimationFrame(() => {
      calendarEditRef.current?.(booking);
    });
  };

  return (
    <div style={{ minHeight: "90vh", background: C.bg, display: "flex", flexDirection: "column" }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <div style={{
        background: "#fff",
        borderBottom: `1px solid ${C.border}`,
        padding: "16px 20px 0",
      }}>
        {/* Title row */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <div style={{
              background: C.primaryLight, borderRadius: 8,
              padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1,
            }}>
              <CalendarOutlined />
            </div>
            <Text strong style={{ fontSize: 16, color: C.darkText }}>Bookings</Text>
          </div>
          <Text style={{ fontSize: 12, color: C.subText, paddingLeft: 38 }}>
            Appointment Management System
          </Text>
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: "8px 8px 0 0",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? C.primary : C.subText,
                  background: active ? C.primaryLight : "transparent",
                  borderBottom: active ? `2px solid ${C.primary}` : "2px solid transparent",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: "16px 20px" }}>

        {/* Calendar view — always rendered so the ref is available */}
        <div style={{ display: activeTab === "calendar" ? "block" : "none" }}>
          <CalendarViewWithRef editRef={calendarEditRef} />
        </div>

        {/* Bookings list — rendered when active */}
        {activeTab === "list" && (
          <BookingsList onEditBooking={handleEditFromList} />
        )}
      </div>
    </div>
  );
};

// ── CalendarView wrapper that exposes openEdit via a ref ───────────────────
// CalendarView manages its own form drawer internally, so we wire into it
// through a stable callback stored in the ref.
import CalendarViewBase from "./CalendarView";

const CalendarViewWithRef = ({
  editRef,
}: {
  editRef: React.MutableRefObject<((appt: any) => void) | null>;
}) => {
  // CalendarView already handles openEdit internally.
  // We pass a prop so it can register its own openEdit with us.
  return (
    <CalendarViewBase
      onRegisterEditHandler={(fn: (appt: any) => void) => {
        editRef.current = fn;
      }}
    />
  );
};

export default SpaReservationSystem;