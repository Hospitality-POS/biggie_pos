import {
  Space,
  Button,
  Tag,
  Popconfirm,
  message,
  Row,
  Col,
  Tooltip,
  Avatar,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import moment from "moment";
import { fetchAllSchedules, removeSchedule } from "@services/customers";
import { ProCard, ProTable } from "@ant-design/pro-components";
import { useMutation } from "@tanstack/react-query";

const BookingsList = () => {
  const dispatch = useDispatch();

  // Helper function to determine booking status
  function getBookingStatus(appointmentDate, startTime) {
    if (!appointmentDate || !startTime) return "unknown";

    const now = moment();
    const appointmentMoment = moment(
      `${appointmentDate} ${startTime}`,
      "YYYY-MM-DD h:mm A"
    );

    if (appointmentMoment.isBefore(now)) {
      return "completed";
    } else if (appointmentMoment.isSame(now, "day")) {
      return "today";
    } else {
      return "upcoming";
    }
  }

  // Handle booking deletion
  const handleDeleteBooking = useMutation({
    mutationFn: removeSchedule,
    onSuccess: () => {
      message.success("Booking deleted successfully");
    },
    onError: (error: any) => {
      message.error(
        `Failed to delete booking: ${error.message || "Unknown error"}`
      );
    },
  });

  // Get status tag color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "green";
      case "today":
        return "orange";
      case "upcoming":
        return "blue";
      case "cancelled":
        return "red";
      case "pending":
        return "yellow";
      case "confirmed":
        return "blue";
      default:
        return "default";
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "today":
        return "Today";
      case "upcoming":
        return "Upcoming";
      case "cancelled":
        return "Cancelled";
      case "pending":
        return "Pending";
      case "confirmed":
        return "Confirmed";
      default:
        return "Unknown";
    }
  };

  // Table columns configuration
  const columns = [
    {
      title: "Date & Time",
      dataIndex: "appointment_date",
      key: "datetime",
      search: false,
      width: 150,
      render: (text: any, record: any) => (
        <div>
          <div style={{ fontWeight: "bold" }}>
            {moment.utc(text).format("MMM DD, YYYY")}
          </div>
          <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
            <ClockCircleOutlined style={{ marginRight: "4px" }} />
            {record.timeRangeDescription}
          </div>
        </div>
      ),
      sorter: (a, b) =>
        moment(a.appointment_date).unix() - moment(b.appointment_date).unix(),
      defaultSortOrder: "descend",
    },
    {
      title: "Client",
      key: "client",
      dataIndex: "custom_client_name",
      width: 180,
      render: (text: any, record: any) => (
        <div>
          <div style={{ fontWeight: "bold" }}>
            <UserOutlined style={{ marginRight: "6px", color: "#1890ff" }} />
            {text}
          </div>
          {record.phone ||
            (record.customer_id?.phone && (
              <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                <PhoneOutlined style={{ marginRight: "4px" }} />
                {record.phone || record.customer_id?.phone}
              </div>
            ))}
        </div>
      ),
    },
    {
      title: "Staff",
      dataIndex: ["staff_id", "fullname"],
      key: "staff",
      width: 120,
      render: (text: any) => (
        <div>
          <Avatar size="small" style={{ marginRight: "8px" }}>
            {text?.charAt(0)?.toUpperCase()}
          </Avatar>
          {text}
        </div>
      ),
    },
    {
      title: "Service",
      dataIndex: ["service_id", "name"],
      key: "service",
      width: 150,
      render: (text: any, record: any) => (
        <div>
          <div>{text}</div>
          {record.duration && (
            <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
              Duration: {record.duration}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      dataIndex: "status",
      search: false,
      width: 100,
      render: (text: any, record: any) => (
        <Tag
          color={getStatusColor(
            getBookingStatus(record.appointment_date, record.start_time)
          )}
        >
          {getBookingStatus(record.appointment_date, record.start_time)}
        </Tag>
      ),
      filters: [
        { text: "Upcoming", value: "upcoming" },
        { text: "Today", value: "today" },
        { text: "Completed", value: "completed" },
        { text: "Cancelled", value: "cancelled" },
        { text: "Pending", value: "pending" },
        { text: "Confirmed", value: "confirmed" },
      ],
      onFilter: (value: string, record: any) => record.status === value,
    },
    {
      title: "Actions",
      key: "actions",
      search: false,
      width: 120,
      render: (_, record: any) => (
        <Space size="small">
          <Tooltip title="Edit Booking">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                // You can emit an event or use a callback to switch to calendar view and edit
                message.info("Switch to Calendar view to edit this booking");
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this booking?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteBooking.mutate(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete Booking">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Render expanded row content
  const expandedRowRender = (record: any) => {
    return (
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <ProCard size="small" title="Client Information">
            <p>
              <UserOutlined style={{ marginRight: "4px" }} />
              <strong>Name:</strong>{" "}
              {record.custom_client_name ||
                record.customer_id?.customer_name ||
                "N/A"}
            </p>
            {(record.phone || record.customer_id?.phone) && (
              <p>
                <PhoneOutlined style={{ marginRight: "4px" }} />
                <strong>Phone:</strong>{" "}
                {record.phone || record.customer_id?.phone}
              </p>
            )}
          </ProCard>
        </Col>
        <Col span={12}>
          <ProCard size="small" title="Appointment Details">
            <p>
              <CalendarOutlined style={{ marginRight: "4px" }} />
              <strong>Date:</strong>{" "}
              {moment(record.appointment_date).format("MMMM DD, YYYY")}
            </p>

            <p>
              <ClockCircleOutlined style={{ marginRight: "4px" }} />
              <strong>Time:</strong> {record.start_time} - {record.end_time}{" "}
              <strong>Duration:</strong> {record.duration || "N/A"}
            </p>
          </ProCard>
        </Col>
        <Col span={12}>
          <ProCard size="small" title="Service Information">
            <p>
              <strong>Service:</strong> {record.service_id?.name || "N/A"}
            </p>
            <p>
              <UserOutlined style={{ marginRight: "4px" }} />
              <strong>Staff:</strong> {record.staff_id?.fullname || "N/A"}
            </p>
          </ProCard>
        </Col>
        <Col span={12}>
          <ProCard size="small" title="Additional Information">
            {record.special_requests ? (
              <p>
                <strong>Special Requests:</strong> {record.special_requests}
              </p>
            ) : (
              <p style={{ color: "#8c8c8c", fontStyle: "italic" }}>
                No special requests
              </p>
            )}
            <p>
              <strong>Status:</strong>{" "}
              <Tag color={getStatusColor(record.status)}>
                {getStatusText(record.status)}
              </Tag>
            </p>
          </ProCard>
        </Col>
      </Row>
    );
  };

  return (
    <ProTable
      columns={columns}
      rowKey="_id"
      request={async (params) => {
        const result = await fetchAllSchedules();
        return {
          data: result.data,
          success: true,
          total: result?.data?.length,
        };
      }}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} of ${total} bookings`,
      }}
      scroll={{ x: 1200 }}
      search={{
        layout: "vertical",
        labelWidth: "auto",
        searchText: "Search",
        resetText: "Reset",
      }}
      expandable={{
        expandedRowRender,
      }}
    />
  );
};

export default BookingsList;
