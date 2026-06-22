import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Typography, Card, Row, Col, Descriptions, Button, Space, Table, Divider } from "antd";
import { ArrowLeftOutlined, CalendarOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchShiftScheduleById } from "@services/hr";
import dayjs from "dayjs";

const { Title } = Typography;

const ShiftScheduleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["hr-shift-schedule", id],
    queryFn: () => fetchShiftScheduleById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div style={{ padding: 24 }}>Loading shift schedule...</div>;
  }

  if (!schedule) {
    return <div style={{ padding: 24 }}>Shift schedule not found</div>;
  }

  const shiftColumns = [
    { title: "Day", dataIndex: "day", key: "day" },
    { title: "Shift Name", dataIndex: "shift_name", key: "shift_name" },
    { title: "Start Time", dataIndex: "start_time", key: "start_time" },
    { title: "End Time", dataIndex: "end_time", key: "end_time" },
    { title: "Assigned To", dataIndex: "assigned_to", key: "assigned_to" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/hr/shifts")}>
              Back
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              Shift Schedule Details
            </Title>
          </Space>
          <Button icon={<CalendarOutlined />}>Calendar View</Button>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title="Schedule Information" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Schedule Name">{schedule.schedule_name}</Descriptions.Item>
                <Descriptions.Item label="Start Date">
                  {dayjs(schedule.start_date).format("DD MMM YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="End Date">
                  {dayjs(schedule.end_date).format("DD MMM YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="Total Shifts">{schedule.total_shifts}</Descriptions.Item>
                <Descriptions.Item label="Status">{schedule.status}</Descriptions.Item>
                <Descriptions.Item label="Created By">{schedule.created_by || "-"}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Schedule Statistics" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Total Employees">{schedule.total_employees || 0}</Descriptions.Item>
                <Descriptions.Item label="Morning Shifts">{schedule.shift_counts?.morning || 0}</Descriptions.Item>
                <Descriptions.Item label="Afternoon Shifts">{schedule.shift_counts?.afternoon || 0}</Descriptions.Item>
                <Descriptions.Item label="Night Shifts">{schedule.shift_counts?.night || 0}</Descriptions.Item>
                <Descriptions.Item label="Total Hours">{schedule.total_hours || 0}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        <Divider />

        <Card title="Shift Assignments" size="small">
          <Table columns={shiftColumns} dataSource={schedule.shifts || []} rowKey="shift_id" pagination={false} />
        </Card>
      </Card>
    </div>
  );
};

export default ShiftScheduleDetail;
