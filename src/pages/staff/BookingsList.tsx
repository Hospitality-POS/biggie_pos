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
  onEditBooking?: (booking: any) => void;
}

const BookingsList: React.FC<BookingsListProps> = ({ onEditBooking }) => {
  const dispatch = useDispatch();

  function getBookingStatus(appointmentDate: any, startTime: any) {
    if (!appointmentDate || !startTime) return "unknown";
    const now = moment();
    const appointmentMoment = moment(
      `${appointmentDate} ${startTime}`,
      "YYYY-MM-DD h:mm A"
    );
    if (appointmentMoment.isBefore(now)) return "completed";
    if (appointmentMoment.isSame(now, "day")) return "today";
    return "upcoming";
  }

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

  const handleEditClick = (record: any) => {
    if (onEditBooking) {
      const formattedBooking = {
        id: record._id,
        staff: record.staff_id?.fullname || "Unknown Staff",
        staffId: record.staff_id?._id,
        start_time: record.start_time,
        end_time: record.end_time,
        client: resolveClientName(record),
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

  const resolveClientName = (record: any): string => {
    const cid = record.customer_id;
    const cids = record.customer_ids;
    const ccn = record.custom_client_name;
    console.log("[resolveClientName]", record._id, {
      custom_client_name: ccn,
      customer_id: cid,
      customer_ids: cids,
    });

    // 1. custom_client_name
    if (ccn && typeof ccn === "string" && ccn.trim() !== "") {
      return ccn.trim();
    }

    // 2. customer_id object { customer_name, ... }
    if (cid && typeof cid === "object" && !Array.isArray(cid)) {
      const name = cid.customer_name || cid.name;
      console.log("[resolveClientName] customer_id name:", name);
      if (name && typeof name === "string" && name.trim() !== "") return name.trim();
    }

    // 3. customer_ids array [{ customer_name, ... }]
    if (Array.isArray(cids) && cids.length > 0) {
      const names = cids
        .map((c: any) => (c && (c.customer_name || c.name)) || null)
        .filter((n: any) => n !== null && n !== "");
      if (names.length > 0) return names.join(", ");
    }

    return "Walk-in / Unassigned";
  };

  /**
   * Column display name — truncated for group bookings.
   */
  const formatCustomerNames = (record: any): string => {
    // Group booking: customer_ids[] with 2+ populated objects — show truncated list
    if (Array.isArray(record.customer_ids) && record.customer_ids.length > 1) {
      const populated = record.customer_ids.filter(
        (c: any) => c && (c.customer_name || c.name)
      );
      if (populated.length > 1) {
        const names = populated.map((c: any) => c.customer_name || c.name);
        const firstTwo = names.slice(0, 2).join(", ");
        return populated.length > 2 ? `${firstTwo} +${populated.length - 2} more` : firstTwo;
      }
    }
    // Single customer — resolveClientName handles all three schemas:
    //   custom_client_name | customer_id{} | customer_ids[single]
    return resolveClientName(record);
  };

  /**
   * Collects all phone numbers from a record across all schema shapes.
   */
  const getCustomerPhones = (record: any): string[] => {
    const phones: string[] = [];

    // From customer_ids array
    if (Array.isArray(record.customer_ids)) {
      record.customer_ids.forEach((c: any) => {
        if (c?.phone) phones.push(String(c.phone));
      });
    }

    // From legacy customer_id object
    if (record.customer_id?.phone && !phones.includes(String(record.customer_id.phone))) {
      phones.push(String(record.customer_id.phone));
    }

    // From top-level phone field
    if (record.phone && !phones.includes(String(record.phone))) {
      phones.push(String(record.phone));
    }

    return phones;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "green";
      case "today": return "orange";
      case "upcoming": return "blue";
      case "cancelled": return "red";
      case "pending": return "yellow";
      case "confirmed": return "blue";
      default: return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "today": return "Today";
      case "upcoming": return "Upcoming";
      case "cancelled": return "Cancelled";
      case "pending": return "Pending";
      case "confirmed": return "Confirmed";
      default: return "Unknown";
    }
  };

  // A group booking is one where customer_ids[] has 2+ populated customer objects.
  // customer_id (single object) and custom_client_name are always individual bookings.
  const isGroupBooking = (record: any): boolean => {
    // Only customer_ids[] with 2+ populated objects qualifies as a group booking.
    // customer_id{} (object) and custom_client_name are always individual bookings.
    if (!Array.isArray(record.customer_ids) || record.customer_ids.length < 2) return false;
    const populated = record.customer_ids.filter(
      (c: any) => c && (c.customer_name || c.name)
    );
    return populated.length > 1;
  };

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
      sorter: (a: any, b: any) =>
        moment(a.appointment_date).unix() - moment(b.appointment_date).unix(),
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Client",
      key: "client",
      dataIndex: "_id",
      width: 220,
      render: (_: any, record: any) => {
        const group = isGroupBooking(record);
        // Count customers from whichever schema is present
        const customerCount = Array.isArray(record.customer_ids)
          ? record.customer_ids.length
          : record.customer_id && typeof record.customer_id === "object"
            ? 1
            : 0;
        const phones = getCustomerPhones(record);
        const displayName = formatCustomerNames(record);

        return (
          <div>
            <div
              style={{
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {group ? (
                <>
                  <TeamOutlined style={{ color: "#1890ff" }} />
                  <Badge
                    count={customerCount}
                    style={{ backgroundColor: "#52c41a" }}
                  >
                    <span>{displayName}</span>
                  </Badge>
                </>
              ) : (
                <>
                  <UserOutlined style={{ color: "#1890ff" }} />
                  {displayName}
                </>
              )}
            </div>

            {phones.length > 0 && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#8c8c8c",
                  marginTop: "4px",
                }}
              >
                <PhoneOutlined style={{ marginRight: "4px" }} />
                {phones.length === 1 ? phones[0] : `${phones.length} contacts`}
              </div>
            )}

            {group && (
              <Tag color="blue" style={{ fontSize: "10px", marginTop: "4px" }}>
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
          {text || "Unassigned"}
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
          <div>{text || "—"}</div>
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
      render: (_: any, record: any) => {
        const computed = getBookingStatus(
          record.appointment_date,
          record.start_time
        );
        return <Tag color={getStatusColor(computed)}>{computed}</Tag>;
      },
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
      render: (_: any, record: any) => (
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

  const expandedRowRender = (record: any) => {
    const group = isGroupBooking(record);
    const customers = Array.isArray(record.customer_ids)
      ? record.customer_ids
      : [];
    const phones = getCustomerPhones(record);
    const primaryEmail =
      record.customer_id?.email ||
      record.email ||
      (customers[0]?.email ?? null);

    return (
      <Row gutter={[16, 16]}>
        {/* Client Information */}
        <Col span={12}>
          <ProCard
            size="small"
            title={
              <Space>
                {group ? <TeamOutlined /> : <UserOutlined />}
                {group ? "Group Booking — Customers" : "Client Information"}
                {group && (
                  <Badge
                    count={customers.length}
                    style={{ backgroundColor: "#52c41a" }}
                  />
                )}
              </Space>
            }
          >
            {group ? (
              <>
                {customers.map((customer: any, index: number) => (
                  <div
                    key={customer?._id || index}
                    style={{
                      marginBottom: "12px",
                      paddingBottom: "12px",
                      borderBottom:
                        index < customers.length - 1
                          ? "1px solid #f0f0f0"
                          : "none",
                    }}
                  >
                    <p style={{ marginBottom: "4px" }}>
                      <UserOutlined
                        style={{ marginRight: "4px", color: "#1890ff" }}
                      />
                      <strong>Customer {index + 1}:</strong>{" "}
                      {customer?.customer_name ||
                        customer?.name ||
                        "Unknown"}
                    </p>
                    {customer?.phone && (
                      <p
                        style={{
                          marginBottom: "4px",
                          fontSize: "12px",
                          color: "#8c8c8c",
                        }}
                      >
                        <PhoneOutlined style={{ marginRight: "4px" }} />
                        {customer.phone}
                      </p>
                    )}
                    {customer?.email && (
                      <p
                        style={{
                          marginBottom: 0,
                          fontSize: "12px",
                          color: "#8c8c8c",
                        }}
                      >
                        📧 {customer.email}
                      </p>
                    )}
                  </div>
                ))}

                {record.max_capacity && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "8px",
                      backgroundColor: "#f0f7ff",
                      borderRadius: "4px",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "12px" }}>
                      <strong>Capacity:</strong>{" "}
                      {record.current_capacity || customers.length} /{" "}
                      {record.max_capacity}
                      {(record.current_capacity || customers.length) <
                        record.max_capacity ? (
                        <Tag
                          color="green"
                          style={{ marginLeft: "8px", fontSize: "10px" }}
                        >
                          {record.max_capacity -
                            (record.current_capacity ||
                              customers.length)}{" "}
                          spots available
                        </Tag>
                      ) : (
                        <Tag
                          color="red"
                          style={{ marginLeft: "8px", fontSize: "10px" }}
                        >
                          Full
                        </Tag>
                      )}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p>
                  <UserOutlined style={{ marginRight: "4px" }} />
                  <strong>Name:</strong> {resolveClientName(record)}
                </p>
                {phones.length > 0 && (
                  <p>
                    <PhoneOutlined style={{ marginRight: "4px" }} />
                    <strong>Phone:</strong> {phones[0]}
                  </p>
                )}
                {primaryEmail && (
                  <p>
                    📧 <strong>Email:</strong> {primaryEmail}
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
              <strong>Time:</strong> {record.start_time} — {record.end_time}
            </p>
            <p>
              <strong>Duration:</strong> {record.duration || "N/A"}
            </p>
            <p>
              <strong>Type:</strong>{" "}
              <Tag color={group ? "blue" : "default"}>
                {group ? "Group Booking" : "Individual"}
              </Tag>
            </p>
          </ProCard>
        </Col>

        {/* Service Information */}
        <Col span={12}>
          <ProCard size="small" title="Service Information">
            <p>
              <strong>Service:</strong>{" "}
              {record.service_id?.name || "—"}
            </p>
            <p>
              <UserOutlined style={{ marginRight: "4px" }} />
              <strong>Staff:</strong>{" "}
              {record.staff_id?.fullname || "Unassigned"}
            </p>
            {record.service_id?.price && (
              <p>
                <strong>Price:</strong> Ksh{" "}
                {record.service_id.price.toLocaleString()}
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
              <Tag
                color={getStatusColor(
                  getBookingStatus(
                    record.appointment_date,
                    record.start_time
                  )
                )}
              >
                {getBookingStatus(
                  record.appointment_date,
                  record.start_time
                )}
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
      request={async () => {
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
        showTotal: (total: number, range: [number, number]) =>
          `${range[0]}-${range[1]} of ${total} bookings`,
      }}
      scroll={{ x: 1200 }}
      search={{
        layout: "vertical",
        labelWidth: "auto",
        searchText: "Search",
        resetText: "Reset",
      }}
      expandable={{ expandedRowRender }}
      headerTitle={
        <Space>
          <CalendarOutlined />
          <span>Bookings List</span>
        </Space>
      }
      toolBarRender={() => [
        <Button
          key="refresh"
          onClick={() => message.success("Bookings refreshed")}
        >
          Refresh
        </Button>,
      ]}
    />
  );
};

export default BookingsList;