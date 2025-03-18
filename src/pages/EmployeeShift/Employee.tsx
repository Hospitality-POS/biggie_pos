import React, { useRef, useState, useEffect } from "react";
import {
  Select,
  Button,
  Modal,
  message,
  Space,
  Spin,
  Typography,
  Card,
  Avatar,
  Tooltip,
  Divider,
  List,
  Popover,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SolutionOutlined,
  LeftOutlined,
  RightOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FilePdfOutlined,
  SwitcherOutlined,
} from "@ant-design/icons";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import EmployeeShiftModal from "@components/MODALS/pro/EmployeeShiftModal";
import { deleteShift, fetchAllShifts } from "@services/shifts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchAllUsersList } from "@services/users";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";

// Extend dayjs with plugins
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const RestaurantShiftSchedule = () => {
  const actionRef = useRef({ reset: () => { } });
  const scheduleRef = useRef(null);
  const newShiftButtonRef = useRef(null);
  const editShiftButtonRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [timeFilter, setTimeFilter] = useState('all');
  const [exportLoading, setExportLoading] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch data queries
  const {
    data: shifts,
    isLoading: isLoadingShifts,
    refetch: refetchShifts
  } = useQuery({
    queryKey: ["shifts"],
    queryFn: fetchAllShifts,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: fetchAllUsersList,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  // Delete mutation
  const DeleteShiftMutation = useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      refetchShifts();
      message.success("Shift deleted successfully");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      message.error("Failed to delete shift");
    },
  });

  // Get the days of the current week
  const getWeekDays = () => {
    const startOfWeek = currentDate.startOf("week");
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(startOfWeek.add(i, "day"));
    }
    return days;
  };

  const weekDays = getWeekDays();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Navigation functions
  const goToPreviousWeek = () => {
    setCurrentDate(currentDate.subtract(1, "week"));
  };

  const goToNextWeek = () => {
    setCurrentDate(currentDate.add(1, "week"));
  };

  const goToToday = () => {
    setCurrentDate(dayjs());
  };

  // Get shifts for a specific employee on a specific day
  const getEmployeeShiftsForDay = (employeeId, day) => {
    const dayOfWeek = dayNames[day.day()];

    let filteredShifts = shifts?.filter(
      (shift) =>
        shift.employee_id?._id === employeeId &&
        shift.dayOfWeek === dayOfWeek
    ) || [];

    // Apply time filter if not 'all'
    if (timeFilter !== 'all') {
      filteredShifts = filteredShifts.filter(shift => {
        const hour = parseInt(shift.startTime.split(":")[0]);
        if (timeFilter === 'morning' && hour < 12) return true;
        if (timeFilter === 'afternoon' && hour >= 12 && hour < 17) return true;
        if (timeFilter === 'evening' && hour >= 17) return true;
        return false;
      });
    }

    return filteredShifts;
  };

  // Generate a unique color for each employee
  const getEmployeeColor = (employeeId) => {
    // List of distinct colors
    const colors = [
      "#f56a00", "#7265e6", "#ffbf00", "#00a2ae", "#1890ff",
      "#52c41a", "#722ed1", "#eb2f96", "#fa8c16", "#a0d911",
      "#13c2c2", "#1677ff", "#faad14", "#fadb14", "#a8071a",
      "#006d75", "#0958d9", "#531dab", "#c41d7f", "#d4380d"
    ];

    // Find index of the employee in the users array
    const userIndex = users?.findIndex(user => user._id === employeeId) || 0;

    // Use modulo to ensure we don't go out of bounds
    return colors[userIndex % colors.length];
  };

  // Handle clicking "New Employee Shift" button
  const handleNewShiftClick = () => {
    if (newShiftButtonRef.current) {
      // Find the button element and programmatically click it
      const buttonElement = newShiftButtonRef.current.querySelector('button');
      if (buttonElement) {
        buttonElement.click();
      }
    }
  };

  // Handle click to add a new shift from empty cell
  const handleAddShift = (employeeId, dayOfWeek, date) => {
    console.log("Adding shift for:", employeeId, "on day:", dayOfWeek, "date:", date.format("YYYY-MM-DD"));

    const employee = users?.find(user => user._id === employeeId);

    // Set the current shift data (will be picked up by the modal via initialValues)
    setCurrentShift({
      employee_id: employee?._id,
      dayOfWeek: dayOfWeek,
      date: date.format("YYYY-MM-DD")
    });

    setIsEditMode(false);

    // Delay slightly to ensure state is updated before clicking
    setTimeout(() => {
      if (newShiftButtonRef.current) {
        const buttonElement = newShiftButtonRef.current.querySelector('button');
        if (buttonElement) {
          buttonElement.click();
        }
      }
    }, 50);
  };

  // Handle editing a shift
  const handleEditShift = (shift) => {
    console.log("Editing shift:", shift);

    // Set the current shift data for editing
    setCurrentShift(shift);
    setIsEditMode(true);

    // Delay slightly to ensure state is updated before clicking
    setTimeout(() => {
      if (editShiftButtonRef.current) {
        const buttonElement = editShiftButtonRef.current.querySelector('button');
        if (buttonElement) {
          buttonElement.click();
        }
      }
    }, 50);
  };

  // Export schedule as PDF
  const exportToPDF = async () => {
    if (!scheduleRef.current) return;

    setExportLoading(true);

    try {
      const canvas = await html2canvas(scheduleRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
      });

      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`schedule-week-${currentDate.week()}.pdf`);

      message.success('Schedule exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      message.error('Failed to export schedule');
    } finally {
      setExportLoading(false);
    }
  };

  // Effect to clear current shift data when refetching
  useEffect(() => {
    const handleActionReset = () => {
      setCurrentShift(null);
      refetchShifts();
    };

    // Create a reset method on the action ref
    actionRef.current.reset = handleActionReset;
  }, [refetchShifts]);

  // Shift card component
  const ShiftCard = ({ shift, onEdit, onDelete }) => {
    const backgroundColor = getEmployeeColor(shift?.employee_id?._id);

    return (
      <Popover
        content={
          <div className="shift-popover">
            <div className="shift-detail">
              <UserOutlined /> {shift?.employee_id?.fullname}
            </div>
            <div className="shift-detail">
              <ClockCircleOutlined /> {shift?.startTime} - {shift?.endTime}
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <Space>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(shift);
                }}
              >
                Edit
              </Button>
              <Button
                size="small"
                icon={<DeleteOutlined />}
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(shift._id);
                }}
              >
                Delete
              </Button>
            </Space>
          </div>
        }
        trigger="hover"
        placement="top"
      >
        <div
          className="shift-card"
          style={{ backgroundColor }}
          onClick={() => onEdit(shift)}
        >
          <div className="shift-info">
            <div className="shift-time">{shift?.startTime} - {shift?.endTime}</div>
          </div>
        </div>
      </Popover>
    );
  };

  // Weekly View with users on the side
  const renderWeeklyView = () => {
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
              renderItem={user => (
                <List.Item className="user-list-item">
                  <Space size={12}>
                    <Avatar
                      src={user.avatar}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: getEmployeeColor(user._id) }}
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
                  const employeeShifts = getEmployeeShiftsForDay(user._id, day);

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
                            onEdit={handleEditShift}
                            onDelete={(shiftId) => {
                              Modal.confirm({
                                title: 'Delete Shift',
                                content: 'Are you sure you want to delete this shift?',
                                okText: 'Yes',
                                okType: 'danger',
                                cancelText: 'No',
                                onOk() {
                                  DeleteShiftMutation.mutate(shiftId);
                                }
                              });
                            }}
                          />
                        ))}

                        {employeeShifts.length === 0 && (
                          <div
                            className="empty-slot"
                            onClick={() => handleAddShift(user._id, dayOfWeek, day)}
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
  };

  return (
    <div className="schedule-container-main">
      <Card bordered={false} className="calendar-card">
        {/* Header section */}
        <div className="calendar-header">
          <div className="header-top-row">
            <Typography.Title level={4} className="calendar-title">
              <SolutionOutlined style={{ color: '#6c1c2c', marginRight: 8 }} />
              Staff Schedule
            </Typography.Title>

            <Space size={16}>
              <Space>
                <Button
                  icon={<LeftOutlined />}
                  onClick={goToPreviousWeek}
                />
                <Button onClick={goToToday}>Today</Button>
                <Button
                  icon={<RightOutlined />}
                  onClick={goToNextWeek}
                />
              </Space>

              <div className="current-period">
                {currentDate.format("MMMM YYYY")} - Week {currentDate.week()}
              </div>

              <Space>
                <Tooltip title="Export as PDF">
                  <Button
                    icon={<FilePdfOutlined />}
                    onClick={exportToPDF}
                    loading={exportLoading}
                  >
                    Export
                  </Button>
                </Tooltip>

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleNewShiftClick}
                >
                  New Employee Shift
                </Button>
              </Space>
            </Space>
          </div>

          <div className="header-bottom-row">
            <div></div> {/* Empty space for alignment */}

            <Select
              placeholder="Filter by time"
              style={{ width: 120 }}
              value={timeFilter}
              onChange={setTimeFilter}
              options={[
                { value: 'all', label: 'All Hours' },
                { value: 'morning', label: 'Morning' },
                { value: 'afternoon', label: 'Afternoon' },
                { value: 'evening', label: 'Evening' }
              ]}
            />
          </div>
        </div>

        {/* Main content */}
        <Spin spinning={isLoadingShifts || DeleteShiftMutation.isLoading || exportLoading}>
          <div className="calendar-content">
            {renderWeeklyView()}
          </div>
        </Spin>
      </Card>

      {/* Hidden EmployeeShiftModal components */}
      <div style={{ display: 'none' }}>
        {/* For adding new shifts */}
        <div ref={newShiftButtonRef}>
          <EmployeeShiftModal
            actionRef={actionRef}
            edit={false}
            data={currentShift || {}}
          />
        </div>

        {/* For editing existing shifts */}
        <div ref={editShiftButtonRef}>
          <EmployeeShiftModal
            actionRef={actionRef}
            edit={true}
            data={currentShift || {}}
          />
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .schedule-container-main {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        .calendar-card {
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
        }
        
        /* Header styles */
        .calendar-header {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
          gap: 16px;
        }
        
        .header-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .header-bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .calendar-title {
          margin: 0 !important;
          display: flex;
          align-items: center;
        }
        
        .current-period {
          font-weight: 500;
          font-size: 16px;
          color: #262626;
        }
        
        .calendar-content {
          margin-top: 8px;
          min-height: 720px;
        }
        
        /* Weekly schedule layout */
        .weekly-schedule {
          border: 1px solid #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .schedule-container {
          display: flex;
          width: 100%;
        }
        
        /* User list styles */
        .user-list-col {
          width: 220px;
          border-right: 1px solid #f0f0f0;
          background-color: #fafafa;
          flex-shrink: 0;
        }
        
        .schedule-grid {
          flex: 1;
          overflow-x: auto;
        }
        
        .user-list-header {
          padding: 12px 16px;
          font-weight: 500;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f5f5f5;
          border-bottom: 1px solid #f0f0f0;
          font-size: 16px;
        }
        
        .user-list-item {
          padding: 12px 16px;
          border-bottom: 1px solid #f0f0f0;
          height: 80px;
          display: flex;
          align-items: center;
        }
        
        .user-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
          font-weight: 500;
        }
        
        /* Week header styles */
        .week-header-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background-color: #f5f5f5;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .day-header {
          text-align: center;
          padding: 12px 8px;
          height: 60px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          font-weight: 500;
          border-right: 1px solid #f0f0f0;
        }
        
        .day-header:last-child {
          border-right: none;
        }
        
        .day-name {
          font-size: 14px;
          margin-bottom: 4px;
        }
        
        .day-date {
          font-size: 18px;
          font-weight: 600;
        }
        
        /* Grid styles */
        .employee-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          border-bottom: 1px solid #f0f0f0;
          min-width: 700px;
        }
        
        .employee-row:last-child {
          border-bottom: none;
        }
        
        .day-cell {
          height: 80px;
          border-right: 1px solid #f0f0f0;
          padding: 6px;
          cursor: pointer;
        }
        
        .day-cell:last-child {
          border-right: none;
        }
        
        .today {
          background-color: rgba(24, 144, 255, 0.05);
        }
        
        /* Shift container styles */
        .shift-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          padding: 2px;
        }
        
        .empty-slot {
          height: 100%;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 4px;
        }
        
        .add-icon {
          color: #d9d9d9;
          transition: color 0.3s;
        }
        
        .day-cell:hover {
          background-color: rgba(0, 0, 0, 0.02);
        }
        
        .day-cell:hover .add-icon {
          color: #1890ff;
        }
        
        /* Shift card styles */
        .shift-card {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          margin-bottom: 6px;
          min-height: 28px;
          font-size: 12px;
        }
        
        .shift-info {
          flex: 1;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .shift-time {
          font-weight: 500;
        }
        
        .shift-popover {
          padding: 4px;
          min-width: 200px;
        }
        
        .shift-detail {
          margin-bottom: 8px;
        }
        
        .empty-message {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 300px;
          font-size: 16px;
          color: #8c8c8c;
        }
      `}</style>
    </div>
  );
};

export default RestaurantShiftSchedule;