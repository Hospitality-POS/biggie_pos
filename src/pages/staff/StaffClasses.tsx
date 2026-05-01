import { Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchAllSchedules } from "@services/customers";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import dayjs from "dayjs";

const { Text } = Typography;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  indigo: "#6366f1",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

const pill = (bg: string, color: string, border: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 4,
  borderRadius: 5, padding: "2px 8px",
  fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
  background: bg, color, border: `1px solid ${border}`,
});

const StaffClasses = () => {
  const primaryColor = usePrimaryColor();

  // Fetch all bookings
  const { data: allBookings = [], isLoading } = useQuery({
    queryKey: ["staff-classes-bookings"],
    queryFn: async () => {
      const response = await fetchAllSchedules({});
      return response.data || [];
    },
  });

  if (isLoading) {
    return <div style={{ padding: 24, textAlign: "center", color: C.subText }}>Loading classes...</div>;
  }

  return (
    <div style={{ padding: "16px 0" }}>
      {(() => {
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const today = dayjs();
        const startOfWeek = today.startOf('week').add(1, 'day'); // Start from Monday
        
        return daysOfWeek.map((day, dayIndex) => {
          const currentDayDate = startOfWeek.add(dayIndex, 'day');
          const dayBookings = allBookings.filter(b => {
            const bookingDate = dayjs(b.appointment_date);
            return bookingDate.format('dddd') === day &&
                   bookingDate.isSame(currentDayDate, 'day');
          }).sort((a, b) => a.start_time.localeCompare(b.start_time));
          
          return (
            <div key={day} style={{ marginBottom: 24 }}>
              <div style={{ 
                background: primaryColor, 
                color: '#fff', 
                padding: '8px 16px', 
                borderRadius: '8px 8px 0 0',
                fontWeight: 600,
                fontSize: 14
              }}>
                {day.toUpperCase()} {currentDayDate.format('DD MMM')}
              </div>
              <div style={{ 
                border: `1px solid ${C.border}`, 
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                overflow: 'hidden'
              }}>
                {dayBookings.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: C.subText }}>
                    No classes scheduled
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: C.bg }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.darkText, borderBottom: `1px solid ${C.border}` }}>TIME SLOT</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.darkText, borderBottom: `1px solid ${C.border}` }}>SESSION TYPE</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.darkText, borderBottom: `1px solid ${C.border}` }}>SLOTS REMAINING</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: C.darkText, borderBottom: `1px solid ${C.border}` }}>INSTRUCTOR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayBookings.map((booking, idx) => {
                        const isFullyBooked = booking.max_capacity && 
                          booking.current_capacity >= booking.max_capacity;
                        const slotsRemaining = booking.max_capacity 
                          ? booking.max_capacity - (booking.current_capacity || 0)
                          : null;
                        const notes = booking.special_requests || booking.notes;
                        
                        return (
                          <tr key={booking._id} style={{ borderBottom: idx < dayBookings.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                            <td style={{ padding: '12px 16px', fontSize: 12, color: C.darkText }}>
                              {booking.start_time} – {booking.end_time}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12, color: C.darkText }}>
                              <div>
                                <Text strong style={{ fontSize: 12 }}>{booking.service_id?.name || '—'}</Text>
                                {notes && (
                                  <div style={{ fontSize: 11, color: C.subText, marginTop: 2 }}>
                                    {notes}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12 }}>
                              {isFullyBooked ? (
                                <span style={pill('#fef2f2', C.red, '#fecaca')}>FULLY BOOKED</span>
                              ) : slotsRemaining !== null ? (
                                <span style={pill('#f0fdf4', C.green, '#bbf7d0')}>{slotsRemaining} slots</span>
                              ) : (
                                <Text style={{ fontSize: 12, color: C.subText }}>—</Text>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12, color: C.darkText }}>
                              {booking.staff_id?.fullname || 'Unassigned'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
};

export default StaffClasses;
