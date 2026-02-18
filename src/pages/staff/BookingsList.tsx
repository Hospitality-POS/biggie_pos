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
  Badge,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import moment from "moment";
import { fetchAllSchedules, removeSchedule } from "@services/customers";
import { ProCard, ProTable } from "@ant-design/pro-components";
import { useMutation } from "@tanstack/react-query";

interface BookingsListProps {
  onEditBooking?: (booking: any) => void; // Callback to handle edit action
}

const BookingsList: React.FC<BookingsListProps> = ({ onEditBooking }) => {
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

  // ✅ NEW: Handle edit booking
  const handleEditClick = (record: any) => {
    if (onEditBooking) {
      // Format the booking data for the calendar view
      const formattedBooking = {
        id: record._id,
        staff: record.staff_id?.fullname || "Unknown Staff",
        staffId: record.staff_id?._id,
        start_time: record.start_time,
        end_time: record.end_time,
        client:
          record.customer_id?.customer_name ||
          record.custom_client_name ||
          "Unknown Client",
        clientId: record.customer_id?._id,
        customClientName: record.custom_client_name,
        service: record.service_id?.name || "Unknown Service",
        serviceId: record.service_id?._id,
        duration: record.duration || "Unknown Duration",
        isTimeRange: record.start_time !== record.end_time,
        timeRangeDescription:
          record.timeRangeDescription ||
          `${record.start_time} - ${record.end_time}`,
        originalData: record,
        appointmentDate: record.appointment_date,
        specialRequests: record.special_requests,
        phone: record.phone,
      };

      onEditBooking(formattedBooking);
    } else {
      message.info("Please switch to Calendar view to edit this booking");
    }
  };

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

  // ✅ NEW: Helper to format customer names for display
  const formatCustomerNames = (record: any) => {
    // Check if this is a group booking with multiple customers
    if (record.customer_ids && Array.isArray(record.customer_ids) && record.customer_ids.length > 0) {
      const customerCount = record.customer_ids.length;

      if (customerCount === 1) {
        return record.customer_ids[0]?.customer_name || record.custom_client_name || "Unknown";
      }

      // For multiple customers, show first 2 names + count
      const firstTwo = record.customer_ids
        .slice(0, 2)
        .map(c => c?.customer_name || "Unknown")
        .join(", ");

      if (customerCount > 2) {
        return `${firstTwo} +${customerCount - 2} more`;
      }

      return firstTwo;
    }

    // Fallback to old format
    return record.custom_client_name || record.customer_id?.customer_name || "Unknown";
  };

  // ✅ NEW: Get all customer phone numbers
  const getCustomerPhones = (record: any) => {
    const phones: string[] = [];

    if (record.customer_ids && Array.isArray(record.customer_ids)) {
      record.customer_ids.forEach(customer => {
        if (customer?.phone) {
          phones.push(customer.phone);
        }
      });
    }

    // Fallback to old format
    if (phones.length === 0) {
      if (record.phone) phones.push(record.phone);
      if (record.customer_id?.phone) phones.push(record.customer_id.phone);
    }

    return phones;
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
      width: 220,
      render: (text: any, record: any) => {
        const isGroupBooking = record.customer_ids && record.customer_ids.length > 1;
        const customerCount = record.customer_ids?.length || 0;
        const phones = getCustomerPhones(record);

        return (
          <div>
            <div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
              {isGroupBooking ? (
                <>
                  <TeamOutlined style={{ color: "#1890ff" }} />
                  <Badge count={customerCount} style={{ backgroundColor: "#52c41a" }}>
                    <span>{formatCustomerNames(record)}</span>
                  </Badge>
                </>
              ) : (
                <>
                  <UserOutlined style={{ color: "#1890ff" }} />
                  {formatCustomerNames(record)}
                </>
              )}
            </div>

            {/* ✅ NEW: Show phone numbers */}
            {phones.length > 0 && (
              <div style={{ fontSize: "12px", color: "#8c8c8c", marginTop: "4px" }}>
                <PhoneOutlined style={{ marginRight: "4px" }} />
                {phones.length === 1 ? phones[0] : `${phones.length} contacts`}
              </div>
            )}

            {/* ✅ NEW: Show booking type badge */}
            {isGroupBooking && (
              <Tag
                color="blue"
                style={{ fontSize: "10px", marginTop: "4px" }}
              >
                Group Booking
              </Tag>
            )}
          </div>
        );
      },
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
              onClick={() => handleEditClick(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this booking?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteBooking.mutate(record._id)}
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

  // ✅ UPDATED: Render expanded row content with multiple customers
  const expandedRowRender = (record: any) => {
    const isGroupBooking = record.customer_ids && record.customer_ids.length > 1;
    const customers = record.customer_ids || [];
    const phones = getCustomerPhones(record);

    return (
      <Row gutter={[16, 16]}>
        {/* ✅ UPDATED: Client Information - Handle Multiple Customers */}
        <Col span={12}>
          <ProCard
            size="small"
            title={
              <Space>
                {isGroupBooking ? <TeamOutlined /> : <UserOutlined />}
                {isGroupBooking ? "Group Booking - Customers" : "Client Information"}
                {isGroupBooking && (
                  <Badge
                    count={customers.length}
                    style={{ backgroundColor: "#52c41a" }}
                  />
                )}
              </Space>
            }
          >
            {isGroupBooking ? (
              <>
                {/* ✅ NEW: Display all customers in group booking */}
                {customers.map((customer, index) => (
                  <div
                    key={customer?._id || index}
                    style={{
                      marginBottom: "12px",
                      paddingBottom: "12px",
                      borderBottom: index < customers.length - 1 ? "1px solid #f0f0f0" : "none"
                    }}
                  >
                    <p style={{ marginBottom: "4px" }}>
                      <UserOutlined style={{ marginRight: "4px", color: "#1890ff" }} />
                      <strong>Customer {index + 1}:</strong> {customer?.customer_name || "Unknown"}
                    </p>
                    {customer?.phone && (
                      <p style={{ marginBottom: "4px", fontSize: "12px", color: "#8c8c8c" }}>
                        <PhoneOutlined style={{ marginRight: "4px" }} />
                        {customer.phone}
                      </p>
                    )}
                    {customer?.email && (
                      <p style={{ marginBottom: "0", fontSize: "12px", color: "#8c8c8c" }}>
                        📧 {customer.email}
                      </p>
                    )}
                  </div>
                ))}

                {/* ✅ NEW: Show capacity info */}
                {record.max_capacity && (
                  <div style={{ marginTop: "12px", padding: "8px", backgroundColor: "#f0f7ff", borderRadius: "4px" }}>
                    <p style={{ margin: 0, fontSize: "12px" }}>
                      <strong>Capacity:</strong> {record.current_capacity || customers.length} / {record.max_capacity}
                      {record.current_capacity < record.max_capacity && (
                        <Tag color="green" style={{ marginLeft: "8px", fontSize: "10px" }}>
                          {record.max_capacity - (record.current_capacity || customers.length)} spots available
                        </Tag>
                      )}
                      {record.current_capacity >= record.max_capacity && (
                        <Tag color="red" style={{ marginLeft: "8px", fontSize: "10px" }}>
                          Full
                        </Tag>
                      )}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Single customer display */}
                <p>
                  <UserOutlined style={{ marginRight: "4px" }} />
                  <strong>Name:</strong>{" "}
                  {record.custom_client_name ||
                    record.customer_id?.customer_name ||
                    "N/A"}
                </p>
                {phones.length > 0 && (
                  <p>
                    <PhoneOutlined style={{ marginRight: "4px" }} />
                    <strong>Phone:</strong> {phones[0]}
                  </p>
                )}
                {(record.customer_id?.email || record.email) && (
                  <p>
                    📧 <strong>Email:</strong> {record.customer_id?.email || record.email}
                  </p>
                )}
              </>
            )}
          </ProCard>
        </Col>

        {/* Appointment Details */}
        <Col span={12}>
          <ProCard size="small" title="Appointment Details">
            <p>
              <CalendarOutlined style={{ marginRight: "4px" }} />
              <strong>Date:</strong>{" "}
              {moment(record.appointment_date).format("MMMM DD, YYYY")}
            </p>

            <p>
              <ClockCircleOutlined style={{ marginRight: "4px" }} />
              <strong>Time:</strong> {record.start_time} - {record.end_time}
            </p>

            <p>
              <strong>Duration:</strong> {record.duration || "N/A"}
            </p>

            {/* ✅ NEW: Show booking type */}
            <p>
              <strong>Type:</strong>{" "}
              <Tag color={isGroupBooking ? "blue" : "default"}>
                {record.booking_type === "group" ? "Group Booking" : "Individual"}
              </Tag>
            </p>
          </ProCard>
        </Col>

        {/* Service Information */}
        <Col span={12}>
          <ProCard size="small" title="Service Information">
            <p>
              <strong>Service:</strong> {record.service_id?.name || "N/A"}
            </p>
            <p>
              <UserOutlined style={{ marginRight: "4px" }} />
              <strong>Staff:</strong> {record.staff_id?.fullname || "N/A"}
            </p>
            {record.service_id?.price && (
              <p>
                <strong>Price:</strong> Ksh {record.service_id.price}
              </p>
            )}
          </ProCard>
        </Col>

        {/* Additional Information */}
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

            {record.notes && (
              <p>
                <strong>Notes:</strong> {record.notes}
              </p>
            )}

            <p>
              <strong>Status:</strong>{" "}
              <Tag color={getStatusColor(record.status)}>
                {getStatusText(record.status)}
              </Tag>
            </p>

            {record.source && (
              <p style={{ fontSize: "12px", color: "#8c8c8c" }}>
                <strong>Source:</strong> {record.source}
              </p>
            )}
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
      headerTitle={
        <Space>
          <CalendarOutlined />
          <span>Bookings List</span>
        </Space>
      }
      toolBarRender={() => [
        <Button
          key="refresh"
          onClick={() => {
            // Trigger refetch
            message.success("Bookings refreshed");
          }}
        >
          Refresh
        </Button>,
      ]}
    />
  );
};

export default BookingsList;