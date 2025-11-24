import { ClockCircleOutlined, DeleteOutlined, EditOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Divider, Popover, Space } from "antd";
import { getEmployeeColor } from "../Utils/EmployeeShiftUtils";
import { ShiftCardProps } from "../Utils/Types";

export const ShiftCard = ({ shift, onEdit, onDelete, users }: ShiftCardProps) => {
    const backgroundColor = getEmployeeColor(shift?.employee_id?._id, users);

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