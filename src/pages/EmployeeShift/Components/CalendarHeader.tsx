import { FilePdfOutlined, LeftOutlined, PlusOutlined, RightOutlined, SolutionOutlined } from "@ant-design/icons"
import { Button, Select, Space, Tooltip, Typography } from "antd"
import { exportToPDF, goToNextWeek, goToPreviousWeek, goToToday, handleNewShiftClick } from "../Utils/EmployeeShiftUtils"
import { CalendarHeaderProps } from "../Utils/Types"

export const CalendarHeader = ({
    timeFilter,
    exportLoading,
    currentDate,
    scheduleRef,
    newShiftButtonRef,
    setCurrentDate,
    setTimeFilter,
    setExportLoading,
}: CalendarHeaderProps) => {
    return (
        <div className="calendar-header">
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
                  data-testid="addNewShiftBtn"
                >
                  New Shift
                </Button>
              </Space>
            </Space>
          </div>
        </div>
    )
}