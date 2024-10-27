import React, { useRef, useState } from "react";
import {
  Calendar,
  Select,
  Button,
  Form,
  Modal,
  message,
  Badge,
  TimePicker,
  Row,
  Col,
  Popover,
  Space,
  Spin,
  Typography,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SolutionOutlined,
} from "@ant-design/icons";
import EmployeeShiftModal from "@components/MODALS/pro/EmployeeShiftModal";
import { deleteShift, fetchAllShifts } from "@services/shifts";
import { useMutation, useQuery } from "@tanstack/react-query";

const RestaurantShiftSchedule = () => {
  const actionRef = useRef(null);

  const { data: shifts, isLoading: isLoadingShifts } = useQuery({
    queryKey: ["shifts"],
    queryFn: fetchAllShifts, 
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const DeleteShiftMutation = useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      // Refetch shift data after deletion
      fetchAllShifts();
    },
    onError: (error) => {
      console.error("Delete error:", error);
    },
  });

  const getListData = (value: Date) => {
    const dayOfWeek = value?.format("dddd");
    return shifts?.filter((shift) => shift.dayOfWeek === dayOfWeek);
  };

  const getShiftStatusColor = (startTime: string) => {
    const hour = parseInt(startTime.split(":")[0]);
    if (hour < 12) return "success";
    if (hour < 17) return "processing";
    return "warning";
  };

  const dateCellRender = (value: Date) => {
    const listData = getListData(value);
    return (
      <ul className="events">
        {listData?.map((item) => (
          <li key={item._id}>
            <Popover
              content={
                <div className="p-2">
                  <div className="mb-2">
                    <strong>Employee:</strong> {item?.employee_id?.fullname}
                  </div>
                  <div className="mb-2">
                    <strong>Time:</strong> {item?.startTime}-{item?.endTime}
                  </div>
                  <Space>
                    <EmployeeShiftModal
                      actionRef={actionRef}
                      edit={true}
                      data={item}
                    />
                    <Button
                      icon={<DeleteOutlined />}
                      danger
                      onClick={() => {
                        DeleteShiftMutation.mutate(item._id);
                      }}
                    >
                      Delete
                    </Button>
                  </Space>
                </div>
              }
              trigger="hover"
              placement="rightTop"
            >
              <Badge
                status={getShiftStatusColor(item?.startTime)}
                text={
                  <span className="shift-text">
                    {`${item?.employee_id?.fullname}: ${item?.startTime}-${item?.endTime}`}
                  </span>
                }
              />
            </Popover>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
    <Space size={16}  style={{ justifyContent: "space-between", width: "100%" }}>
      <Typography.Title level={4}>
        <SolutionOutlined style={{ fontSize: "24px", color: "#6c1c2c" }} />
        Weekly Shift Schedule
      </Typography.Title>
        <EmployeeShiftModal actionRef={actionRef} edit={false} data={{}} />
    </Space>
      <Spin spinning={isLoadingShifts || DeleteShiftMutation.isLoading}>
        <Calendar
          cellRender={dateCellRender}
          fullscreen
          className="shift-calendar"
        />
      </Spin>
      <style jsx>{`
        .events {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .events li {
          margin-bottom: 4px;
        }
        .shift-text {
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
          display: inline-block;
        }
        :global(.shift-calendar .ant-picker-calendar-date-content) {
          height: 80px;
          overflow-y: auto;
        }
        :global(.shift-calendar .ant-badge-status-text) {
          font-size: 12px;
        }
        :global(.ant-popover-inner-content) {
          min-width: 200px;
        }
      `}</style>
    </>
  );
};

export default RestaurantShiftSchedule;
