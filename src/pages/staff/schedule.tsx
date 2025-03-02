import React, { useState, useEffect, useMemo } from "react";
import { Typography, Button, Space, Modal, Table, Card, Avatar, Form, Select, TimePicker, Tabs, Badge, Tooltip, message, Spin, Popconfirm, DatePicker } from "antd";
import { LeftOutlined, RightOutlined, PlusOutlined, ClockCircleOutlined, CheckCircleOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from "@ant-design/icons";
import { fetchAllUsersList } from "@services/users";
import { createSchedule, fetchAllCustomers, fetchAllSchedules, updateSchedule, removeSchedule } from "@services/customers";
import { getAllProducts } from "@services/products";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import moment from "moment";

const { Option } = Select;
const { RangePicker } = TimePicker;

// Main App Component
const SpaReservationSystem = () => {
    const dispatch = useDispatch();
    // UI State
    const [showReservationForm, setShowReservationForm] = useState(false);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState(null);
    const [activeTimeSlice, setActiveTimeSlice] = useState("morning");
    const [reservationMode, setReservationMode] = useState("timeRange"); // "timeRange" or "singleSlot"
    const [editingAppointment, setEditingAppointment] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Time slots configuration
    const timeSlotGroups = {
        morning: ['9:00 AM', '9:15 AM', '9:30 AM', '9:45 AM', '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM'],
        afternoon: ['12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM', '1:00 PM', '1:15 PM', '1:30 PM', '1:45 PM', '2:00 PM', '2:15 PM', '2:30 PM', '2:45 PM'],
        evening: ['3:00 PM', '3:15 PM', '3:30 PM', '3:45 PM', '4:00 PM', '4:15 PM', '4:30 PM', '4:45 PM', '5:00 PM', '5:15 PM', '5:30 PM', '5:45 PM', '6:00 PM']
    };

    // All time slots flattened
    const allTimeSlots = [
        ...timeSlotGroups.morning,
        ...timeSlotGroups.afternoon,
        ...timeSlotGroups.evening
    ];

    // API Queries
    // Customer list from API
    const { data: customers, isLoadingCustomers } = useQuery({
        queryKey: ["customers"],
        queryFn: fetchAllCustomers,
        retry: 1,
        refetchInterval: 5000,
        networkMode: "always",
    });

    // Fetch schedule data with the selected date as a parameter
    const { data: scheduleData, isLoadingScheduleData, refetch: refetchScheduleData } = useQuery({
        queryKey: ["schedule data", selectedDate.toISOString().split('T')[0]],
        queryFn: () => fetchAllSchedules(selectedDate.toISOString().split('T')[0]),
        retry: 1,
        refetchInterval: 5000,
        networkMode: "always",
    });

    const { data: products, isLoadingProducts } = useQuery({
        queryKey: ["products"],
        queryFn: getAllProducts,
        retry: 1,
        refetchInterval: 5000,
        networkMode: "always",
    });

    const { data: staffMembersData, isLoading } = useQuery({
        queryKey: ["users"],
        queryFn: fetchAllUsersList,
        retry: 1,
        refetchInterval: 5000,
        networkMode: "always",
    });

    // Processed Data
    // Format products data for use in services dropdown
    const formattedProducts = useMemo(() => {
        if (!products || !Array.isArray(products)) return [];

        // Flatten the products structure
        const allProductServices = [];

        products.forEach(category => {
            if (category.products && Array.isArray(category.products)) {
                category.products.forEach(product => {
                    allProductServices.push({
                        id: product._id,
                        name: product.name,
                        price: product.price,
                        category: category.name
                    });
                });
            }
        });

        return allProductServices;
    }, [products]);

    // Process staff members data to match the format needed
    const staffMembers = useMemo(() => {
        if (!staffMembersData) return [];

        return staffMembersData.map(user => ({
            id: user._id,
            name: user.fullname || `${user.username}`,
            role: user.role?.role_type || "staff",
            avatar: "https://t4.ftcdn.net/jpg/00/87/28/19/360_F_87281963_29bnkFXa6RQnJYWeRfrSpieagNxw1Rru.jpg", // Default avatar
            schedule: "Full-time",
            status: user.status || "Active",
            email: user.email
        }));
    }, [staffMembersData]);

    // Process schedule data to match the format needed for the component
    const formattedScheduleData = useMemo(() => {
        if (!scheduleData || !Array.isArray(scheduleData)) return [];

        // Filter schedules for the selected date
        const selectedDateStr = selectedDate.toISOString().split('T')[0];

        const filteredSchedules = scheduleData.filter(appointment => {
            // If appointment has appointment_date property, filter by it
            if (appointment.appointment_date) {
                // Normalize date format for comparison
                const appointmentDate = new Date(appointment.appointment_date).toISOString().split('T')[0];
                return appointmentDate === selectedDateStr;
            }
            return true; // Include appointments without date (legacy data)
        });

        return filteredSchedules.map(appointment => ({
            id: appointment._id,
            staff: appointment.staff_id?.fullname || "Unknown Staff",
            staffId: appointment.staff_id?._id,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            client: appointment.customer_id?.customer_name || "Unknown Client",
            clientId: appointment.customer_id?._id,
            service: appointment.service_id?.name || "Unknown Service",
            serviceId: appointment.service_id?._id,
            duration: appointment.duration || "Unknown Duration",
            isTimeRange: appointment.start_time !== appointment.end_time,
            timeRangeDescription: appointment.timeRangeDescription || `${appointment.start_time} - ${appointment.end_time}`,
            originalData: appointment, // Keep the original data for reference
            appointmentDate: appointment.appointment_date
        }));
    }, [scheduleData, selectedDate]);

    // Time slot utility functions
    // Function to check if a time slot is already booked for a specific staff member
    const isTimeSlotBooked = (staffName, timeSlot) => {
        // Get current selected date string for comparison
        const selectedDateStr = selectedDate.toISOString().split('T')[0];

        return formattedScheduleData.some(appointment => {
            // Check if appointment is for the selected date
            if (appointment.appointmentDate) {
                const appointmentDateStr = new Date(appointment.appointmentDate).toISOString().split('T')[0];
                if (appointmentDateStr !== selectedDateStr) {
                    return false; // Skip appointments for other dates
                }
            }

            // Direct match for single time slot
            if (appointment.staff === staffName && appointment.start_time === timeSlot) {
                return true;
            }

            // Check if the time slot falls within a time range appointment
            if (appointment.staff === staffName && appointment.isTimeRange) {
                const startIndex = allTimeSlots.indexOf(appointment.start_time);
                const endIndex = allTimeSlots.indexOf(appointment.end_time);
                const timeSlotIndex = allTimeSlots.indexOf(timeSlot);

                // If the slot is within the range (inclusive of start, exclusive of end)
                return timeSlotIndex >= startIndex && timeSlotIndex < endIndex;
            }

            return false;
        });
    };

    // Function to check if a time range overlaps with existing appointments
    const isTimeRangeAvailable = (staffName, startTime, endTime) => {
        // Get indices in the allTimeSlots array
        const startIndex = allTimeSlots.indexOf(startTime);
        const endIndex = allTimeSlots.indexOf(endTime);

        // Get the selected date string for filtering
        const selectedDateStr = selectedDate.toISOString().split('T')[0];

        // Invalid time range
        if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
            console.log(`Invalid time range: ${startTime} to ${endTime} (indices: ${startIndex}, ${endIndex})`);
            return false;
        }

        // Check if any slot in the range is already booked for the selected date
        for (let i = startIndex; i < endIndex; i++) {
            if (isTimeSlotBooked(staffName, allTimeSlots[i])) {
                return false;
            }
        }

        return true;
    };

    const getAppointment = (staffName, time) => {
        // Get the selected date string for comparison
        const selectedDateStr = selectedDate.toISOString().split('T')[0];

        return formattedScheduleData.find(item => {
            // Check if appointment is for the selected date
            if (item.appointmentDate) {
                const appointmentDateStr = new Date(item.appointmentDate).toISOString().split('T')[0];
                if (appointmentDateStr !== selectedDateStr) {
                    return false; // Skip appointments for other dates
                }
            }

            // Match staff and time
            return item.staff === staffName && item.start_time === time;
        });
    };

    // Event handlers
    const handleTimeRangeChange = (range) => {
        if (range && range.length === 2) {
            setSelectedTimeRange(range);
        }
    };

    const handleTimeSlotClick = (time, staffName) => {
        // Find the staff member object using the name
        const staffMember = staffMembers.find(staff => staff.name === staffName);

        // Check if the time slot is already booked
        if (isTimeSlotBooked(staffName, time)) {
            message.warning(`This time slot is already booked for ${staffName}.`);
            return;
        }

        // Set initial values for the form - using the property that matches what's in the Form.Item
        setSelectedTimeSlot(time);
        setSelectedStaff(staffMember?.id); // Use id to match the <Option value={staff.id}>
        setReservationMode("timeRange");
        setShowReservationForm(true);
    };

    const handleDateChange = (date) => {
        if (date) {
            setSelectedDate(date.toDate());
        }
    };

    const navigateDay = (direction) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + direction);
        setSelectedDate(newDate);
    };

    const handleNewReservationClick = () => {
        setSelectedTimeSlot(null);
        setSelectedStaff(null);
        setReservationMode("timeRange"); // Default to time range mode
        setEditingAppointment(null);
        setIsEditMode(false);
        setShowReservationForm(true);
    };

    const handleEditAppointment = (appointment) => {
        setEditingAppointment(appointment);
        setIsEditMode(true);
        setSelectedTimeSlot(appointment.start_time);
        setSelectedStaff(appointment.staffId);
        setReservationMode(appointment.isTimeRange ? "timeRange" : "singleSlot");
        setShowReservationForm(true);
    };

    const handleDeleteAppointment = async (appointmentId) => {
        try {
            await dispatch(removeSchedule(appointmentId)).unwrap();
            message.success('Appointment deleted successfully');
            refetchScheduleData();
        } catch (error) {
            message.error(`Failed to delete appointment: ${error.message || 'Unknown error'}`);
        }
    };

    const handleFormSubmit = async (values) => {
        const clientName = values.clientName;
        const service = values.service;
        const staffMember = values.staff || selectedStaff;
        const mode = values.reservationMode || reservationMode;
        const appointmentDate = values.appointmentDate ? values.appointmentDate.format('YYYY-MM-DD') : selectedDate.toISOString().split('T')[0];

        // Find staff name for checking conflicts (but use ID for submission)
        const staffName = staffMembers.find(staff => staff.id === staffMember)?.name || "Unknown Staff";

        // Handle time range booking
        if (mode === "timeRange" && values.timeRange) {
            // Convert time range values to formatted strings
            const startTime = values.timeRange[0].format('h:mm A');
            const endTime = values.timeRange[1].format('h:mm A');

            // Find matching time slots in our array
            let matchingStartTime = null;
            let matchingEndTime = null;
            let startIndex = -1;
            let endIndex = -1;

            // Find the closest matching time slots
            for (let i = 0; i < allTimeSlots.length; i++) {
                const slot = allTimeSlots[i];
                // Check start time match
                if (slot.replace(/\s+/g, ' ').trim().toLowerCase() === startTime.replace(/\s+/g, ' ').trim().toLowerCase()) {
                    matchingStartTime = slot;
                    startIndex = i;
                }
                // Check end time match
                if (slot.replace(/\s+/g, ' ').trim().toLowerCase() === endTime.replace(/\s+/g, ' ').trim().toLowerCase()) {
                    matchingEndTime = slot;
                    endIndex = i;
                }
            }

            // Use direct indices if found, otherwise look for close matches
            if (startIndex === -1 || endIndex === -1) {
                // Try alternate approach - look for hour and minute match
                const parseTimeString = (timeStr) => {
                    const [timePart, ampm] = timeStr.split(' ');
                    let [hours, minutes] = timePart.split(':').map(num => parseInt(num, 10));
                    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
                    return { hours, minutes };
                };

                const startTimeParsed = parseTimeString(startTime);
                const endTimeParsed = parseTimeString(endTime);

                for (let i = 0; i < allTimeSlots.length; i++) {
                    const slotParsed = parseTimeString(allTimeSlots[i]);

                    if (slotParsed.hours === startTimeParsed.hours &&
                        slotParsed.minutes === startTimeParsed.minutes && startIndex === -1) {
                        startIndex = i;
                        matchingStartTime = allTimeSlots[i];
                    }

                    if (slotParsed.hours === endTimeParsed.hours &&
                        slotParsed.minutes === endTimeParsed.minutes && endIndex === -1) {
                        endIndex = i;
                        matchingEndTime = allTimeSlots[i];
                    }
                }
            }

            // If we still couldn't find matches, show an error
            if (startIndex === -1 || endIndex === -1) {
                message.error(`Unable to match the selected times with available slots. Please select from the dropdown list instead.`);
                return;
            }

            // Check for valid time range
            if (startIndex >= endIndex) {
                message.error(`End time must be after start time.`);
                return;
            }

            // If editing, don't check the current appointment's time slots for conflicts
            let skipConflictCheck = false;
            if (isEditMode && editingAppointment) {
                // Allow the current appointment's time slots to be reused
                skipConflictCheck = true;
            }

            // Check if the time range is available (skip if editing the current appointment)
            if (!skipConflictCheck && !isTimeRangeAvailable(staffName, matchingStartTime, matchingEndTime)) {
                message.error(`The selected time range conflicts with existing appointments for ${staffName}.`);
                return;
            }

            // Create an appointment that spans the entire time range
            const timeRangeDescription = `${matchingStartTime} - ${matchingEndTime}`;
            const appointmentData = {
                staff_id: staffMember, // Use the ID here, not the name
                start_time: matchingStartTime,
                end_time: matchingEndTime,
                client_id: clientName,
                service_id: service,
                duration: `${Math.round((endIndex - startIndex) * 15)} mins`,
                isTimeRange: true,
                timeRangeDescription,
                appointment_date: appointmentDate
            };

            try {
                if (isEditMode && editingAppointment) {
                    // Update existing appointment
                    await dispatch(updateSchedule({
                        id: editingAppointment.id,
                        data: appointmentData
                    })).unwrap();
                    message.success(`Appointment updated successfully.`);
                } else {
                    // Create new appointment
                    await dispatch(createSchedule(appointmentData)).unwrap();
                    message.success(`Appointment booked successfully.`);
                }
                setShowReservationForm(false);
                // Refresh data after creating/updating appointment
                refetchScheduleData();
            } catch (error) {
                const actionType = isEditMode ? "update" : "create";
                message.error(`Failed to ${actionType} appointment: ${error.message || 'Unknown error'}`);
            }
        } else if (mode === "singleSlot") {
            // Handle regular single time slot booking
            const timeSlot = values.timeSlot;
            const duration = values.duration || "60";

            if (!timeSlot) {
                message.error(`Please select a time slot.`);
                return;
            }

            // Skip conflict check if editing current appointment
            let skipConflictCheck = false;
            if (isEditMode && editingAppointment && editingAppointment.start_time === timeSlot) {
                skipConflictCheck = true;
            }

            // Check if the time slot is available (skip if editing the current appointment)
            if (!skipConflictCheck && isTimeSlotBooked(staffName, timeSlot)) {
                message.error(`This time slot is already booked for ${staffName}.`);
                return;
            }

            const appointmentData = {
                staff_id: staffMember, // Use the ID here, not the name
                start_time: timeSlot,
                end_time: timeSlot, // Same as start for single slot
                client_id: clientName,
                service_id: service,
                duration: `${duration} mins`,
                appointment_date: appointmentDate
            };

            try {
                if (isEditMode && editingAppointment) {
                    // Update existing appointment
                    await dispatch(updateSchedule({
                        id: editingAppointment.id,
                        data: appointmentData
                    })).unwrap();
                    message.success(`Appointment updated successfully.`);
                } else {
                    // Create new appointment
                    await dispatch(createSchedule(appointmentData)).unwrap();
                    message.success(`Appointment booked successfully.`);
                }
                setShowReservationForm(false);
                // Refresh data after creating/updating appointment
                refetchScheduleData();
            } catch (error) {
                const actionType = isEditMode ? "update" : "create";
                message.error(`Failed to ${actionType} appointment: ${error.message || 'Unknown error'}`);
            }
        }
    };

    // Schedule columns for the table
    const renderScheduleColumns = (timeSlots) => {
        if (isLoading || !staffMembers || staffMembers.length === 0) {
            // Return loading or empty state columns
            return [
                {
                    title: 'Time',
                    dataIndex: 'time',
                    key: 'time',
                    width: 100,
                    render: (text) => <span>{text}</span>
                },
                {
                    title: 'Loading staff data...',
                    key: 'loading',
                    render: () => <div style={{ textAlign: 'center' }}>Loading...</div>
                }
            ];
        }

        const columns = [
            {
                title: 'Time',
                dataIndex: 'time',
                key: 'time',
                width: 100,
                render: (text) => <span>{text}</span>
            }
        ];

        staffMembers.forEach(staff => {
            columns.push({
                title: (
                    <div style={{ textAlign: 'center' }}>
                        <Avatar src={staff.avatar} style={{ marginRight: 8 }} />
                        <div>{staff.name}</div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{staff.role}</div>
                    </div>
                ),
                dataIndex: staff.name,
                key: staff.name,
                render: (text, record) => {
                    const appointment = getAppointment(staff.name, record.time);
                    const isBooked = isTimeSlotBooked(staff.name, record.time);

                    if (appointment) {
                        return (
                            <Tooltip title={
                                <>
                                    <div><strong>Client:</strong> {appointment.client}</div>
                                    <div><strong>Service:</strong> {appointment.service}</div>
                                    <div><strong>Time:</strong> {appointment.isTimeRange
                                        ? appointment.timeRangeDescription
                                        : appointment.start_time + ' (' + appointment.duration + ')'}</div>
                                    <div style={{ marginTop: '8px', fontSize: '11px' }}>Click to edit or remove</div>
                                </>
                            }>
                                <Card
                                    size="small"
                                    style={{
                                        background: appointment.isTimeRange ? '#e6f7ff' : '#f0f5ff',
                                        borderColor: appointment.isTimeRange ? '#91d5ff' : '#d6e4ff',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => handleEditAppointment(appointment)}
                                >
                                    <div style={{ fontWeight: 'bold', color: '#1890ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {appointment.client}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#8c8c8c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {appointment.isTimeRange
                                            ? <Badge status="processing" text={appointment.timeRangeDescription} />
                                            : <ClockCircleOutlined style={{ marginRight: '4px' }} />}
                                    </div>
                                </Card>
                            </Tooltip>
                        );
                    } else if (isBooked) {
                        // Time slot is part of a time range but not the starting time
                        return (
                            <div style={{
                                height: '100%',
                                background: '#f5f5f5',
                                border: '1px solid #d9d9d9',
                                borderRadius: '4px',
                                color: '#bfbfbf',
                                textAlign: 'center',
                                padding: '8px 4px',
                            }}>
                                <Badge status="default" text="Booked" />
                            </div>
                        );
                    } else {
                        return (
                            <div
                                style={{
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    padding: '8px 4px',
                                    color: '#1890ff',
                                    borderRadius: '4px',
                                    border: '1px dashed #d9d9d9',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s'
                                }}
                                onClick={() => handleTimeSlotClick(record.time, staff.name)}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f0f7ff';
                                    e.currentTarget.style.borderColor = '#91caff';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.borderColor = '#d9d9d9';
                                }}
                            >
                                <PlusOutlined style={{ fontSize: '12px' }} />
                            </div>
                        );
                    }
                }
            });
        });

        return columns;
    };

    // Schedule data for the table based on selected time slice
    const getScheduleTableData = (timeSlots) => {
        return timeSlots.map(time => {
            const row = { time, key: time, start_time: time };
            if (staffMembers && staffMembers.length > 0) {
                staffMembers.forEach(staff => {
                    row[staff.name] = null; // Will be rendered by the column render function
                });
            }
            return row;
        });
    };

    // Prepare tab items for the time periods
    const items = [
        {
            key: "morning",
            label: "Morning (9AM - 12PM)",
            children: (
                <Table
                    columns={renderScheduleColumns(timeSlotGroups.morning)}
                    dataSource={getScheduleTableData(timeSlotGroups.morning)}
                    pagination={false}
                    bordered
                    size="small"
                    scroll={{ x: 'max-content' }}
                    loading={isLoading || isLoadingScheduleData}
                />
            )
        },
        {
            key: "afternoon",
            label: "Afternoon (12PM - 3PM)",
            children: (
                <Table
                    columns={renderScheduleColumns(timeSlotGroups.afternoon)}
                    dataSource={getScheduleTableData(timeSlotGroups.afternoon)}
                    pagination={false}
                    bordered
                    size="small"
                    scroll={{ x: 'max-content' }}
                    loading={isLoading || isLoadingScheduleData}
                />
            )
        },
        {
            key: "evening",
            label: "Evening (3PM - 6PM)",
            children: (
                <Table
                    columns={renderScheduleColumns(timeSlotGroups.evening)}
                    dataSource={getScheduleTableData(timeSlotGroups.evening)}
                    pagination={false}
                    bordered
                    size="small"
                    scroll={{ x: 'max-content' }}
                    loading={isLoading || isLoadingScheduleData}
                />
            )
        }
    ];

    return (
        <div style={{ height: '100vh', background: '#f0f2f5' }}>
            {/* Daily Schedule */}
            <Card
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Daily Schedule</span>
                        <Space>
                            <Button
                                icon={<LeftOutlined />}
                                onClick={() => navigateDay(-1)}
                            />
                            <span>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            <Button
                                icon={<RightOutlined />}
                                onClick={() => navigateDay(1)}
                            />
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleNewReservationClick}
                            >
                                New Reservation
                            </Button>
                        </Space>
                    </div>
                }
            >
                <Tabs
                    defaultActiveKey="morning"
                    items={items}
                    onChange={setActiveTimeSlice}
                    animated
                    size="small"
                    tabBarStyle={{ marginBottom: '8px' }}
                />
            </Card>

            {/* Reservation Form Modal */}
            <Modal
                title={isEditMode ? "Edit Appointment" : "New Reservation"}
                open={showReservationForm}
                onCancel={() => setShowReservationForm(false)}
                footer={null}
                destroyOnClose
            >
                <Form
                    layout="vertical"
                    onFinish={handleFormSubmit}
                    initialValues={isEditMode && editingAppointment ? {
                        timeSlot: editingAppointment.start_time,
                        staff: editingAppointment.staffId,
                        clientName: editingAppointment.clientId,
                        service: editingAppointment.serviceId,
                        reservationMode: editingAppointment.isTimeRange ? "timeRange" : "singleSlot",
                        appointmentDate: editingAppointment.originalData?.appointment_date ?
                            moment(editingAppointment.originalData.appointment_date) :
                            moment(selectedDate)
                    } : {
                        timeSlot: selectedTimeSlot,
                        staff: selectedStaff,
                        appointmentDate: moment(selectedDate)
                    }}
                >
                    <Form.Item
                        name="appointmentDate"
                        label="Appointment Date"
                        rules={[{ required: true, message: 'Please select a date' }]}
                    >
                        <DatePicker
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD"
                            disabledDate={(current) => {
                                // Can't select days before today
                                return current && current < moment().startOf('day');
                            }}
                            onChange={handleDateChange}
                        />
                    </Form.Item>

                    <Form.Item
                        name="timeRange"
                        label="Select Time Range"
                        rules={[{ required: true, message: 'Please select a time range' }]}
                        extra="Select start and end times from available slots (9:00 AM - 6:00 PM)"
                    >
                        <RangePicker
                            format="h:mm A"
                            minuteStep={15}
                            style={{ width: '100%' }}
                            onChange={handleTimeRangeChange}
                            showTime={{
                                format: 'h:mm A',
                                hourStep: 1,
                                minuteStep: 15,
                                use12Hours: true
                            }}
                            disabledTime={() => ({
                                disabledHours: () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 19, 20, 21, 22, 23],
                                disabledMinutes: (hour) => {
                                    // Only allow 0, 15, 30, 45 minute intervals
                                    return Array.from({ length: 60 }).map((_, i) => i)
                                        .filter(m => m % 15 !== 0);
                                }
                            })}
                        />
                    </Form.Item>

                    <Form.Item
                        name="staff"
                        label="Staff Member"
                        rules={[{ required: true, message: 'Please select a staff member' }]}
                    >
                        <Select placeholder="Select staff" loading={isLoading}>
                            {staffMembers && staffMembers.map(staff => (
                                <Option key={staff.id} value={staff.id}>{staff.name} ({staff.role})</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="clientName"
                        label="Client Name"
                        rules={[{ required: true, message: 'Please enter client name' }]}
                    >
                        <Select
                            placeholder="Select or enter client name"
                            showSearch
                            allowClear
                            loading={isLoadingCustomers}
                            maxTagCount={1}
                            style={{ width: '100%' }}
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                        >
                            {customers && Array.isArray(customers) ? customers.map(customer => (
                                <Option key={customer._id} value={customer._id}>{customer.customer_name}</Option>
                            )) : null}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="service"
                        label="Service"
                        rules={[{ required: true, message: 'Please select a service' }]}
                    >
                        <Select
                            placeholder="Select a service"
                            showSearch
                            allowClear
                            loading={isLoadingProducts}
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                option.children && option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                            notFoundContent={isLoadingProducts ? <Spin size="small" /> : "No services found"}
                        >
                            {formattedProducts.map(product => (
                                <Option key={product.id} value={product.id}>
                                    {product.name} - {product.category} (ksh {product.price})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            {isEditMode && editingAppointment && (
                                <Popconfirm
                                    title="Delete this appointment?"
                                    description="This action cannot be undone."
                                    onConfirm={() => {
                                        handleDeleteAppointment(editingAppointment.id);
                                        setShowReservationForm(false);
                                    }}
                                    okText="Yes"
                                    cancelText="No"
                                    okButtonProps={{ danger: true }}
                                >
                                    <Button danger icon={<DeleteOutlined />}>
                                        Delete
                                    </Button>
                                </Popconfirm>
                            )}
                            <Button onClick={() => setShowReservationForm(false)}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit" icon={isEditMode ? <EditOutlined /> : <CheckCircleOutlined />}>
                                {isEditMode ? 'Update Appointment' : 'Confirm Booking'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SpaReservationSystem;