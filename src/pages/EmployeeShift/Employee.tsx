import { ProCard } from "@ant-design/pro-components";
import EmployeeShiftModal from "@components/MODALS/pro/EmployeeShiftModal";
import {
  Spin
} from "antd";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { useEffect, useRef, useState } from "react";
import { CalendarHeader } from "./Components/CalendarHeader";
import { WeeklyView } from "./Components/WeeklyView";
import { useEmployeeShiftMutation } from "./Hooks/useEmployeeShiftMutation";
import { useEmployeeShiftQuery } from "./Hooks/useEmployeeShiftQuery";
import { getWeekDays } from "./Utils/EmployeeShiftUtils";
import { SetCurrentShift, Shift } from "./Utils/Types";

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
  const [currentShift, setCurrentShift] = useState<Shift | SetCurrentShift | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const { shifts, users, isLoadingShifts, refetchShifts } = useEmployeeShiftQuery();
  const { deleteShiftMutation } = useEmployeeShiftMutation();

  const weekDays = getWeekDays(currentDate);


  // Effect to clear current shift data when refetching
  useEffect(() => {
    const handleActionReset = () => {
      setCurrentShift(null);
      refetchShifts();
    };

    // Create a reset method on the action ref
    actionRef.current.reset = handleActionReset;
  }, [refetchShifts]);

  return (
    <div className="schedule-container-main">
      <ProCard bordered={false} className="calendar-card">
        {/* Header section */}
        {/* <div className="calendar-header">
          <div className="header-top-row">
            <Typography.Title level={4} className="calendar-title">
              <SolutionOutlined style={{ color: '#6c1c2c', marginRight: 8 }} />
              Staff Schedule
            </Typography.Title>

            <Space size={16}>
              <div className="current-period">
                {currentDate.format("MMMM YYYY")} - Week {currentDate.week()}
              </div>
              <Space>
                <Button
                  icon={<LeftOutlined />}
                  onClick={() => goToPreviousWeek(currentDate, setCurrentDate)}
                />
                <Button onClick={() => goToToday(setCurrentDate)}>Today</Button>
                <Button
                  icon={<RightOutlined />}
                  onClick={() => goToNextWeek(currentDate, setCurrentDate)}
                />
              </Space>



              <Space>

                <div className="header-bottom-row">
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
                <Tooltip title="Export as PDF">
                  <Button
                    icon={<FilePdfOutlined />}
                    onClick={() => exportToPDF(currentDate, scheduleRef, setExportLoading)}
                    loading={exportLoading}
                  >
                    Export
                  </Button>
                </Tooltip>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleNewShiftClick(newShiftButtonRef)}
                >
                  New Shift
                </Button>
              </Space>
            </Space>
          </div>
        </div> */}
        <CalendarHeader  
          timeFilter={timeFilter}
          exportLoading={exportLoading}
          currentDate={currentDate}
          scheduleRef={scheduleRef}
          newShiftButtonRef={newShiftButtonRef}
          setCurrentDate={setCurrentDate}
          setTimeFilter={setTimeFilter}
          setExportLoading={setExportLoading}
        />

        {/* Main content */}
        <Spin spinning={isLoadingShifts || deleteShiftMutation.isLoading || exportLoading}>
          <div className="calendar-content">
            <WeeklyView 
              users={users}
              weekDays={weekDays}
              scheduleRef={scheduleRef}
              editShiftButtonRef={editShiftButtonRef}
              newShiftButtonRef={newShiftButtonRef}
              shifts={shifts}
              timeFilter={timeFilter}
              setCurrentShift={setCurrentShift}
              setIsEditMode={setIsEditMode}
              setAddCurrentShift={setCurrentShift}
            />
          </div>
        </Spin>
      </ProCard>

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

      {/**
       * TODO: Verify if we need this from Mike
       */}
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