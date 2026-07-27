import React, { useState } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  DatePicker,
  Row,
  Col,
  Statistic,
  message,
} from "antd";
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchAllAttendance, clockIn, clockOut, fetchClockStatus } from "@services/hr/leave";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
};

const AttendanceTracking: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  // Fetch attendance
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["attendance", dateRange],
    queryFn: () =>
      fetchAllAttendance({
        from: dateRange[0].format("YYYY-MM-DD"),
        to: dateRange[1].format("YYYY-MM-DD"),
      }),
  });

  const attendance = Array.isArray(attendanceData) ? attendanceData : attendanceData?.attendance || [];

  // Fetch clock status
  const { data: clockStatus } = useQuery({
    queryKey: ["clock-status"],
    queryFn: fetchClockStatus,
    refetchInterval: 60000, // Refetch every minute
  });

  const attendanceStats = attendance?.reduce(
    (acc: { total: number; present: number; absent: number; late: number; onLeave: number }, record: any) => {
      acc.total += 1;
      if (record.status === "Present") acc.present += 1;
      if (record.status === "Absent") acc.absent += 1;
      if (record.status === "Late") acc.late += 1;
      if (record.status === "On Leave") acc.onLeave += 1;
      return acc;
    },
    { total: 0, present: 0, absent: 0, late: 0, onLeave: 0 }
  );

  const handleClockIn = async () => {
    try {
      await clockIn();
    } catch (error) {
      // Error handled by service
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut();
    } catch (error) {
      // Error handled by service
    }
  };

  const columns = [
    {
      title: "Employee",
      dataIndex: ["staff_id", "fullname"],
      key: "fullname",
      render: (fullname: string, record: any) => (
        <Space>
          {record.staff_id?.thumbnail && (
            <img
              src={record.staff_id.thumbnail}
              alt=""
              style={{ width: 32, height: 32, borderRadius: "50%" }}
            />
          )}
          <Text strong>{fullname || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) => <Text>{dayjs(date).format("DD MMM YYYY")}</Text>,
    },
    {
      title: "Check In",
      dataIndex: "check_in",
      key: "check_in",
      render: (time: string) => <Text>{time || "—"}</Text>,
    },
    {
      title: "Check Out",
      dataIndex: "check_out",
      key: "check_out",
      render: (time: string) => <Text>{time || "—"}</Text>,
    },
    {
      title: "Hours Worked",
      dataIndex: "hours_worked",
      key: "hours_worked",
      render: (hours: number) => <Text>{hours?.toFixed(1) || 0}h</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          Present: "green",
          Absent: "red",
          Late: "orange",
          "On Leave": "blue",
          "Public Holiday": "purple",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={3} style={{ margin: 0, color: C.darkText }}>
          <ClockCircleOutlined style={{ marginRight: 8, color: C.primary }} />
          Attendance Tracking
        </Title>
        <Space>
          {clockStatus?.clocked_in ? (
            <Button type="primary" danger onClick={handleClockOut}>
              Clock Out
            </Button>
          ) : (
            <Button type="primary" onClick={handleClockIn}>
              Clock In
            </Button>
          )}
        </Space>
      </div>

      {/* Clock Status Card */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col span={12}>
            <Text strong style={{ fontSize: 16 }}>
              Today's Status:{" "}
              <Tag color={clockStatus?.clocked_in ? "green" : "default"}>
                {clockStatus?.clocked_in ? "Clocked In" : "Not Clocked In"}
              </Tag>
            </Text>
          </Col>
          <Col span={12} style={{ textAlign: "right" }}>
            {clockStatus?.clock_in && (
              <Text>
                Clock In: <Text strong>{dayjs(clockStatus.clock_in).format("HH:mm")}</Text>
              </Text>
            )}
            {clockStatus?.hours_so_far && (
              <Text style={{ marginLeft: 16 }}>
                Hours: <Text strong>{clockStatus.hours_so_far.toFixed(1)}h</Text>
              </Text>
            )}
          </Col>
        </Row>
      </Card>

      {/* Attendance Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Records"
              value={attendanceStats.total}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: C.blue, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Present"
              value={attendanceStats.present}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: C.green, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Absent"
              value={attendanceStats.absent}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: C.red, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Late"
              value={attendanceStats.late}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: C.orange, fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            style={{ borderRadius: 8 }}
          />
        </div>
        <Table
          columns={columns}
          dataSource={attendance}
          loading={isLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default AttendanceTracking;
