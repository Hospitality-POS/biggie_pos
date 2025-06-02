import React, { useState, useMemo } from "react";
import {
    Table, Card, Space, Button, Tag, Popconfirm, message,
    Input, Select, DatePicker, Row, Col, Tooltip, Avatar,
    Modal, Form, Badge, Typography
} from "antd";
import {
    EditOutlined, DeleteOutlined, SearchOutlined,
    PhoneOutlined, CalendarOutlined, ClockCircleOutlined,
    UserOutlined, ShopOutlined, EyeOutlined
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import moment from "moment";
import { fetchAllSchedules, updateSchedule, removeSchedule } from "@services/customers";

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

const BookingsList = () => {
    const dispatch = useDispatch();

    // State for filters and search
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [viewModalVisible, setViewModalVisible] = useState(false);

    // Fetch all schedules (you might want to add pagination and date filtering)
    const { data: scheduleData, isLoading, refetch } = useQuery({
        queryKey: ["all-schedules"],
        queryFn: () => fetchAllSchedules(), // You might need to modify this to fetch all schedules
        retry: 1,
        refetchInterval: 30000, // Refresh every 30 seconds
        networkMode: "always",
    });

    // Process and format the schedule data for the table
    const formattedBookings = useMemo(() => {
        if (!scheduleData || !Array.isArray(scheduleData)) return [];

        return scheduleData.map((booking, index) => ({
            key: booking._id || index,
            id: booking._id,
            appointmentDate: booking.appointment_date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            clientName: booking.customer_id?.customer_name || booking.custom_client_name || "Unknown Client",
            clientId: booking.customer_id?._id,
            customClientName: booking.custom_client_name,
            staffName: booking.staff_id?.fullname || "Unknown Staff",
            staffId: booking.staff_id?._id,
            serviceName: booking.service_id?.name || "Unknown Service",
            serviceId: booking.service_id?._id,
            duration: booking.duration,
            phone: booking.phone,
            specialRequests: booking.special_requests,
            status: getBookingStatus(booking.appointment_date, booking.start_time),
            originalData: booking
        }));
    }, [scheduleData]);

    // Helper function to determine booking status
    function getBookingStatus(appointmentDate, startTime) {
        if (!appointmentDate || !startTime) return "unknown";

        const now = moment();
        const appointmentMoment = moment(`${appointmentDate} ${startTime}`, 'YYYY-MM-DD h:mm A');

        if (appointmentMoment.isBefore(now)) {
            return "completed";
        } else if (appointmentMoment.isSame(now, 'day')) {
            return "today";
        } else {
            return "upcoming";
        }
    }

    // Filter bookings based on search and filters
    const filteredBookings = useMemo(() => {
        let filtered = formattedBookings;

        // Search filter
        if (searchText) {
            filtered = filtered.filter(booking =>
                booking.clientName.toLowerCase().includes(searchText.toLowerCase()) ||
                booking.staffName.toLowerCase().includes(searchText.toLowerCase()) ||
                booking.serviceName.toLowerCase().includes(searchText.toLowerCase()) ||
                (booking.phone && booking.phone.includes(searchText))
            );
        }

        // Status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(booking => booking.status === statusFilter);
        }

        // Date range filter
        if (dateRange && dateRange.length === 2) {
            filtered = filtered.filter(booking => {
                const bookingDate = moment(booking.appointmentDate);
                return bookingDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
            });
        }

        return filtered;
    }, [formattedBookings, searchText, statusFilter, dateRange]);

    // Handle booking deletion
    const handleDeleteBooking = async (bookingId) => {
        try {
            await dispatch(removeSchedule(bookingId)).unwrap();
            message.success('Booking deleted successfully');
            refetch();
        } catch (error) {
            message.error(`Failed to delete booking: ${error.message || 'Unknown error'}`);
        }
    };

    // Handle viewing booking details
    const handleViewBooking = (booking) => {
        setSelectedBooking(booking);
        setViewModalVisible(true);
    };

    // Get status tag color
    const getStatusColor = (status) => {
        switch (status) {
            case "completed": return "default";
            case "today": return "orange";
            case "upcoming": return "blue";
            default: return "default";
        }
    };

    // Get status text
    const getStatusText = (status) => {
        switch (status) {
            case "completed": return "Completed";
            case "today": return "Today";
            case "upcoming": return "Upcoming";
            default: return "Unknown";
        }
    };

    // Table columns configuration
    const columns = [
        {
            title: 'Date & Time',
            key: 'datetime',
            width: 150,
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>
                        {moment.utc(record.appointmentDate).format('MMM DD, YYYY')
                        }
                    </div>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        <ClockCircleOutlined style={{ marginRight: '4px' }} />
                        {record.startTime} - {record.endTime}
                    </div>
                </div>
            ),
            sorter: (a, b) => moment(a.appointmentDate).unix() - moment(b.appointmentDate).unix(),
            defaultSortOrder: 'descend',
        },
        {
            title: 'Client',
            key: 'client',
            width: 180,
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>
                        <UserOutlined style={{ marginRight: '6px', color: '#1890ff' }} />
                        {record.clientName}
                    </div>
                    {record.phone && (
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            <PhoneOutlined style={{ marginRight: '4px' }} />
                            {record.phone}
                        </div>
                    )}
                </div>
            ),
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                <div style={{ padding: 8 }}>
                    <Input
                        placeholder="Search client"
                        value={selectedKeys[0]}
                        onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => confirm()}
                        style={{ width: 188, marginBottom: 8, display: 'block' }}
                    />
                    <Space>
                        <Button
                            type="primary"
                            onClick={() => confirm()}
                            icon={<SearchOutlined />}
                            size="small"
                        >
                            Search
                        </Button>
                        <Button onClick={() => clearFilters()} size="small">
                            Reset
                        </Button>
                    </Space>
                </div>
            ),
            onFilter: (value, record) =>
                record.clientName.toLowerCase().includes(value.toLowerCase()),
        },
        {
            title: 'Staff',
            dataIndex: 'staffName',
            key: 'staff',
            width: 120,
            render: (text) => (
                <div>
                    <Avatar size="small" style={{ marginRight: '8px' }}>
                        {text?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    {text}
                </div>
            ),
        },
        {
            title: 'Service',
            dataIndex: 'serviceName',
            key: 'service',
            width: 150,
            render: (text, record) => (
                <div>
                    <div>{text}</div>
                    {record.duration && (
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            Duration: {record.duration}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            width: 100,
            render: (_, record) => (
                <Tag color={getStatusColor(record.status)}>
                    {getStatusText(record.status)}
                </Tag>
            ),
            filters: [
                { text: 'Upcoming', value: 'upcoming' },
                { text: 'Today', value: 'today' },
                { text: 'Completed', value: 'completed' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="View Details">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewBooking(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit Booking">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => {
                                // You can emit an event or use a callback to switch to calendar view and edit
                                message.info('Switch to Calendar view to edit this booking');
                            }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete this booking?"
                        description="This action cannot be undone."
                        onConfirm={() => handleDeleteBooking(record.id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Booking">
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            {/* Filters and Search */}
            <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
                <Row gutter={16} align="middle">
                    <Col span={8}>
                        <Search
                            placeholder="Search by client, staff, service, or phone"
                            allowClear
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </Col>
                    <Col span={6}>
                        <Select
                            placeholder="Filter by status"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: '100%' }}
                        >
                            <Option value="all">All Status</Option>
                            <Option value="upcoming">Upcoming</Option>
                            <Option value="today">Today</Option>
                            <Option value="completed">Completed</Option>
                        </Select>
                    </Col>
                    <Col span={8}>
                        <RangePicker
                            placeholder={['Start Date', 'End Date']}
                            value={dateRange}
                            onChange={setDateRange}
                            style={{ width: '100%' }}
                        />
                    </Col>
                    <Col span={2}>
                        <Button
                            onClick={() => {
                                setSearchText("");
                                setStatusFilter("all");
                                setDateRange(null);
                            }}
                        >
                            Clear
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Bookings Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={filteredBookings}
                    loading={isLoading}
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} bookings`,
                    }}
                    scroll={{ x: 1200 }}
                    size="small"
                />
            </Card>

            {/* Booking Details Modal */}
            <Modal
                title={
                    <Space>
                        <EyeOutlined />
                        Booking Details
                    </Space>
                }
                open={viewModalVisible}
                onCancel={() => setViewModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setViewModalVisible(false)}>
                        Close
                    </Button>
                ]}
                width={600}
            >
                {selectedBooking && (
                    <div>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <Card size="small" title="Client Information">
                                    <p><strong>Name:</strong> {selectedBooking.clientName}</p>
                                    {selectedBooking.phone && (
                                        <p><strong>Phone:</strong> {selectedBooking.phone}</p>
                                    )}
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card size="small" title="Appointment Details">
                                    <p><strong>Date:</strong> {moment(selectedBooking.appointmentDate).format('MMMM DD, YYYY')}</p>
                                    <p><strong>Time:</strong> {selectedBooking.startTime} - {selectedBooking.endTime}</p>
                                    <p><strong>Duration:</strong> {selectedBooking.duration}</p>
                                    <p><strong>Status:</strong> <Tag color={getStatusColor(selectedBooking.status)}>{getStatusText(selectedBooking.status)}</Tag></p>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card size="small" title="Service Information">
                                    <p><strong>Service:</strong> {selectedBooking.serviceName}</p>
                                    <p><strong>Staff:</strong> {selectedBooking.staffName}</p>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card size="small" title="Additional Information">
                                    {selectedBooking.specialRequests ? (
                                        <p><strong>Special Requests:</strong> {selectedBooking.specialRequests}</p>
                                    ) : (
                                        <p style={{ color: '#8c8c8c', fontStyle: 'italic' }}>No special requests</p>
                                    )}
                                </Card>
                            </Col>
                        </Row>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default BookingsList;