import { PlusOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, List, Modal, Space } from "antd";
import dayjs from "dayjs";
import { useEmployeeShiftMutation } from "../Hooks/useEmployeeShiftMutation";
import { dayNames, shortDayNames } from "../Utils/Constants";
import { getEmployeeColor, getEmployeeShiftsForDay, handleAddShift, handleEditShift } from "../Utils/EmployeeShiftUtils";
import { User, WeeklyViewProps } from "../Utils/Types";
import { ShiftCard } from "./ShiftCard";

export const WeeklyView = ({
    users,
    weekDays,
    scheduleRef,
    editShiftButtonRef,
    newShiftButtonRef,
    shifts,
    timeFilter,
    setCurrentShift,
    setIsEditMode,
    setAddCurrentShift,
}: WeeklyViewProps) => {
    const { deleteShiftMutation } = useEmployeeShiftMutation()
    if (!users || users.length === 0) {
      return <div className="empty-message">No employees found</div>;
    }

    return (
      <div className="weekly-schedule" ref={scheduleRef}>
        <div className="schedule-container">
          {/* User list on the left */}
          <div className="user-list-col">
            <div className="user-list-header">
              <span>Employees</span>
            </div>
            <List
              className="user-list"
              dataSource={users}
              renderItem={(user: User) => (
                <List.Item className="user-list-item" key={user?._id}>
                  <Space size={12} align="center" style={{ width: '100%', paddingLeft: '8px' }}>
                    <Avatar
                      src={user?.thumbnail || ''}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: getEmployeeColor(user?._id, users) }}
                      size={40}
                    />
                    <span className="user-name">{user.fullname}</span>
                  </Space>
                </List.Item>
              )}
            />
          </div>

          {/* Schedule grid on the right */}
          <div className="schedule-grid">
            {/* Header row with days */}
            <div className="week-header-row">
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  className={`day-header ${day.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD') ? 'today' : ''}`}
                >
                  <div className="day-name">{shortDayNames[day.day()]}</div>
                  <div className="day-date">{day.format("D")}</div>
                </div>
              ))}
            </div>

            {/* Employee rows */}
            {users?.map(user => (
              <div key={user._id} className="employee-row">
                {weekDays.map((day, dayIndex) => {
                  const dayOfWeek = dayNames[day.day()];
                  const employeeShifts = getEmployeeShiftsForDay(user._id, day, shifts, timeFilter);

                  return (
                    <div
                      key={dayIndex}
                      className={`day-cell ${day.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD') ? 'today' : ''}`}
                    >
                      <div className="shift-container">
                        {employeeShifts.map(shift => (
                          <ShiftCard
                            key={shift._id}
                            shift={shift}
                            users={users}
                            onEdit={() => handleEditShift(shift, editShiftButtonRef, setCurrentShift, setIsEditMode)}
                            onDelete={(shiftId) => {
                              Modal.confirm({
                                title: 'Delete Shift',
                                content: 'Are you sure you want to delete this shift?',
                                okText: 'Yes',
                                okType: 'danger',
                                cancelText: 'No',
                                onOk() {
                                  deleteShiftMutation.mutate(shiftId);
                                }
                              });
                            }}
                          />
                        ))}

                        {employeeShifts.length === 0 && (
                          <div
                            className="empty-slot"
                            onClick={() => handleAddShift(user._id, dayOfWeek, day, users, newShiftButtonRef, setAddCurrentShift, setIsEditMode)}
                          >
                            <PlusOutlined className="add-icon" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
}