import React, { useState, useEffect, useMemo } from "react";
import {
    Typography, Button, Space, Modal, Card, Avatar, Form,
    Select, TimePicker, Badge, Tooltip, message, Spin,
    Popconfirm, DatePicker, Radio, Input, Row, Col
} from "antd";
import {
    LeftOutlined, RightOutlined, PlusOutlined, ClockCircleOutlined,
    CheckCircleOutlined, EditOutlined, DeleteOutlined,
    CalendarOutlined, ShopOutlined, DownloadOutlined
} from "@ant-design/icons";
import { fetchAllUsersList } from "@services/users";
import {
    createSchedule, fetchAllCustomers, fetchAllSchedules,
    updateSchedule, removeSchedule
} from "@services/customers";
import { getAllProducts } from "@services/products";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import moment from "moment";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import { reversePhoneNumber } from "@components/PhoneNumber/utils/reversePhoneNumberFormat";

const { Option } = Select;
const { RangePicker } = TimePicker;
const { TextArea } = Input;

// Main App Component
const SpaReservationSystem = () => {
    const dispatch = useDispatch();

    // UI State
    const [showReservationForm, setShowReservationForm] = useState(false);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState(null);
    const [editingAppointment, setEditingAppointment] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [customClientName, setCustomClientName] = useState("");
    const [clientInputMode, setClientInputMode] = useState("existing");
    const [visibleHours, setVisibleHours] = useState([8, 22]); // Default: 8am to 10pm
    const [calendarView, setCalendarView] = useState("day"); // "day" or "week"
    const [form] = Form.useForm(); // Using form instance to set values programmatically

    // Time configuration
    const hourRange = Array.from({ length: 15 }, (_, i) => i + 8); // 8AM to 10PM

    // Quarter-hour slots
    const generateTimeSlots = () => {
        const slots = [];
        hourRange.forEach(hour => {
            [0, 15, 30, 45].forEach(minutes => {
                // Don't add 10:15, 10:30, 10:45 PM slots
                if (hour === 22 && minutes > 0) return;

                const period = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
                slots.push(`${displayHour}:${formattedMinutes} ${period}`);
            });
        });
        return slots;
    };

    const allTimeSlots = generateTimeSlots();

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
        // Add a select function to filter the data after fetching
        select: (data) => {
            // Filter out users with admin or cleaner roles
            return data ? data.filter(user => {
                const roleType = user.role?.role_type?.toLowerCase();
                return roleType !== 'admin' && roleType !== 'cleaner';
            }) : [];
        }
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
            client: appointment.customer_id?.customer_name || appointment.custom_client_name || "Unknown Client",
            clientId: appointment.customer_id?._id,
            customClientName: appointment.custom_client_name,
            service: appointment.service_id?.name || "Unknown Service",
            serviceId: appointment.service_id?._id,
            duration: appointment.duration || "Unknown Duration",
            isTimeRange: appointment.start_time !== appointment.end_time,
            timeRangeDescription: appointment.timeRangeDescription || `${appointment.start_time} - ${appointment.end_time}`,
            originalData: appointment, // Keep the original data for reference
            appointmentDate: appointment.appointment_date,
            specialRequests: appointment.special_requests,
            phone: appointment.phone
        }));
    }, [scheduleData, selectedDate]);

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

    // Find appointment for a specific staff member and time slot
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

    // Function to get all appointments for a staff member
    const getStaffAppointments = (staffName) => {
        // Get the selected date string for comparison
        const selectedDateStr = selectedDate.toISOString().split('T')[0];

        return formattedScheduleData.filter(item => {
            // Check if appointment is for the selected date
            if (item.appointmentDate) {
                const appointmentDateStr = new Date(item.appointmentDate).toISOString().split('T')[0];
                if (appointmentDateStr !== selectedDateStr) {
                    return false; // Skip appointments for other dates
                }
            }

            // Match staff
            return item.staff === staffName;
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
            // Find the appointment to edit
            const appointment = getAppointment(staffName, time);
            if (appointment) {
                handleEditAppointment(appointment);
            } else {
                message.warning(`This time slot is already booked for ${staffName}.`);
            }
            return;
        }

        // Reset the form first
        form.resetFields();

        // Set initial values for the form - using the property that matches what's in the Form.Item
        setSelectedTimeSlot(time);
        setSelectedStaff(staffMember?.id); // Use id to match the <Option value={staff.id}>
        setShowReservationForm(true);

        // Set the form values for staff and time range
        form.setFieldsValue({
            staff: staffMember?.id,
            appointmentDate: moment(selectedDate),
            timeRange: [
                moment(time, 'h:mm A'),
                moment(getNextTimeSlot(time), 'h:mm A')
            ]
        });
    };

    // Helper function to get the next time slot (15 min increment)
    const getNextTimeSlot = (timeSlot) => {
        const index = allTimeSlots.indexOf(timeSlot);
        if (index !== -1 && index < allTimeSlots.length - 1) {
            return allTimeSlots[index + 1];
        }
        return timeSlot; // Return same time if can't find next
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
        // Reset all form state
        setSelectedTimeSlot(null);
        setEditingAppointment(null);
        setIsEditMode(false);
        setCustomClientName("");
        setClientInputMode("existing");

        // Clear the form completely
        form.resetFields();

        // Set only the essential default values
        form.setFieldsValue({
            appointmentDate: moment(selectedDate),
            // Auto-select staff if one is already selected
            staff: selectedStaff || undefined
        });

        setShowReservationForm(true);
    };

    const handleCustomClientNameChange = (event) => {
        setCustomClientName(event.target.value);
    };

    const handleEditAppointment = (appointment) => {
        setEditingAppointment(appointment);
        setIsEditMode(true);
        setSelectedTimeSlot(appointment.start_time);
        setSelectedStaff(appointment.staffId);
        setCustomClientName(appointment.customClientName || "");
        setClientInputMode(appointment.customClientName ? "custom" : "existing");
        setShowReservationForm(true);

        // Clear the form first
        form.resetFields();

        // Set all form values including the new fields
        form.setFieldsValue({
            staff: appointment.staffId,
            clientName: appointment.clientId,
            customClientName: appointment.customClientName || "",
            service: appointment.serviceId,
            appointmentDate: appointment.originalData?.appointment_date ?
                moment(appointment.originalData.appointment_date) :
                moment(selectedDate),
            timeRange: [
                moment(appointment.start_time, 'h:mm A'),
                moment(appointment.end_time, 'h:mm A')
            ],
            specialRequests: appointment.specialRequests || "",
            phoneNumber: appointment.phone ? reversePhoneNumber(appointment.phone) : ""
        });
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
        const clientId = clientInputMode === "existing" ? values.clientName : null;
        const service = values.service;
        const staffMember = values.staff || selectedStaff;
        const appointmentDate = values.appointmentDate ? values.appointmentDate.format('YYYY-MM-DD') : selectedDate.toISOString().split('T')[0];
        const customName = clientInputMode === "custom" ? values.customClientName : null;
        const phoneNumber = values.phoneNumber ? getPhoneNumber(values.phoneNumber) : null;

        // Find staff name for checking conflicts (but use ID for submission)
        const staffName = staffMembers.find(staff => staff.id === staffMember)?.name || "Unknown Staff";

        // Handle time range booking
        if (values.timeRange) {
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
                client_id: clientId,
                custom_client_name: customName, // Add the custom client name field
                service_id: service,
                duration: `${Math.round((endIndex - startIndex) * 15)} mins`,
                isTimeRange: true,
                timeRangeDescription,
                appointment_date: appointmentDate,
                // Add the new fields to the appointment data
                special_requests: values.specialRequests,
                phone: phoneNumber,
                source: "admin_portal"
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
        } else {
            message.error(`Please select a valid time range for the appointment.`);
        }
    };

    // Calendar rendering functions
    const renderCalendarHeader = () => {
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button
                        icon={<LeftOutlined />}
                        onClick={() => navigateDay(-1)}
                    />
                    <DatePicker
                        value={moment(selectedDate)}
                        onChange={handleDateChange}
                        format="MMM D, YYYY"
                        allowClear={false}
                        bordered={false}
                        suffixIcon={null}
                        style={{ fontSize: "16px", fontWeight: "bold" }}
                    />
                    <Button
                        icon={<RightOutlined />}
                        onClick={() => navigateDay(1)}
                    />
                    <Button type="link" onClick={() => setSelectedDate(new Date())}>
                        Today
                    </Button>
                </div>

                <Space>
                    <Radio.Group
                        value={calendarView}
                        onChange={(e) => setCalendarView(e.target.value)}
                        buttonStyle="solid"
                    >
                        <Radio.Button value="day">Day</Radio.Button>
                        <Radio.Button value="week">Week</Radio.Button>
                    </Radio.Group>
                </Space>
            </div>
        );
    };

    // Calculate position and height for an appointment in the calendar grid
    const getAppointmentPosition = (startTime, endTime) => {
        const startIndex = allTimeSlots.indexOf(startTime);
        const endIndex = allTimeSlots.indexOf(endTime);

        if (startIndex === -1) return { top: 0, height: 0 };

        // Each time slot is 15 minutes and we have 4 slots per hour
        const slotHeight = 20; // Height in pixels for each 15-minute slot
        const top = startIndex * slotHeight;
        const height = (endIndex - startIndex) * slotHeight || slotHeight; // Default to one slot if same time

        return { top, height };
    };

    // Render a vertical timeline for the day view
    const renderDayTimeline = () => {
        return (
            <div className="timeline-container" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
                <div className="time-labels" style={{ position: 'sticky', left: 0, width: '60px', background: '#f7f9fc' }}>
                    {hourRange.map(hour => {
                        const displayHour = hour > 12 ? hour - 12 : hour;
                        const period = hour >= 12 ? 'PM' : 'AM';
                        return (
                            <div key={hour} className="time-label" style={{
                                height: '80px',
                                borderBottom: '1px solid #f0f0f0',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'center',
                                paddingTop: '5px',
                                color: '#8c8c8c',
                                fontWeight: '500',
                                fontSize: '12px'
                            }}>
                                {`${displayHour} ${period}`}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };


    const renderCalendarGrid = () => {
        if (isLoading || !staffMembers || staffMembers.length === 0) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <Spin size="large" />
                    <div style={{ marginLeft: '12px' }}>Loading staff data...</div>
                </div>
            );
        }

        return (
            <div className="calendar-container" style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                maxHeight: 'calc(100vh - 250px)',
                position: 'relative'
            }}>
                {/* Staff headers row */}
                <div className="staff-headers-row" style={{
                    display: 'flex',
                    borderBottom: '1px solid #f0f0f0',
                    background: '#f7f9fc',
                    zIndex: 10
                }}>
                    {/* Empty cell in top-left corner */}
                    <div style={{
                        width: '60px',
                        flexShrink: 0,
                        borderRight: '1px solid #f0f0f0'
                    }}>
                    </div>

                    {/* Staff header cells */}
                    {staffMembers.map(staff => (
                        <div key={staff.id} className="staff-header" style={{
                            flex: '1 0 180px',
                            minWidth: '180px',
                            padding: '8px',
                            textAlign: 'center',
                            borderRight: '1px solid #f0f0f0',
                            position: 'relative' // Added for absolute positioning of button
                        }}>
                            <Avatar src={staff.avatar} style={{ marginBottom: 4 }} />
                            <div style={{ fontWeight: 'bold' }}>{staff.name}</div>
                            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{staff.role}</div>

                            {/* Add appointment button for each staff */}
                            <Button
                                type="dashed"
                                icon={<PlusOutlined />}
                                size="small"
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent any parent click handlers

                                    // Set the selected staff
                                    setSelectedStaff(staff.id);

                                    // Reset the form first
                                    form.resetFields();

                                    // Then set the staff and date values
                                    setTimeout(() => {
                                        form.setFieldsValue({
                                            staff: staff.id,
                                            appointmentDate: moment(selectedDate)
                                        });

                                        // Open the new reservation form
                                        setShowReservationForm(true);
                                        setIsEditMode(false);
                                        setEditingAppointment(null);
                                        setCustomClientName("");
                                        setClientInputMode("existing");
                                    }, 0);
                                }}
                            >
                                Add
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Time grid with appointments */}
                <div style={{
                    display: 'flex',
                    overflowY: 'auto',
                    flexGrow: 1
                }}>
                    {/* Time axis on the left */}
                    <div className="time-axis" style={{
                        width: '60px',
                        flexShrink: 0,
                        borderRight: '1px solid #f0f0f0',
                        background: '#f7f9fc'
                    }}>
                        {hourRange.map(hour => {
                            const displayHour = hour > 12 ? hour - 12 : hour;
                            const period = hour >= 12 ? 'PM' : 'AM';
                            return (
                                <div key={hour} className="hour-marker" style={{
                                    height: '80px',
                                    borderBottom: '1px solid #f0f0f0',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'center',
                                    paddingTop: '5px',
                                    color: '#8c8c8c',
                                    fontWeight: '500',
                                    fontSize: '12px'
                                }}>
                                    {`${displayHour} ${period}`}

                                    {/* Quarter-hour markers */}
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: '20px', borderBottom: '1px dotted #f0f0f0' }}></div>
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: '40px', borderBottom: '1px dotted #f0f0f0' }}></div>
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: '60px', borderBottom: '1px dotted #f0f0f0' }}></div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Staff columns with appointments */}
                    <div className="staff-columns" style={{ display: 'flex', flexGrow: 1 }}>
                        {staffMembers.map(staff => {
                            const staffAppointments = getStaffAppointments(staff.name);

                            return (
                                <div key={staff.id} className="staff-column" style={{
                                    flex: '1 0 180px',
                                    minWidth: '180px',
                                    borderRight: '1px solid #f0f0f0',
                                    position: 'relative'
                                }}>
                                    {/* Hour grid */}
                                    <div className="hour-grid">
                                        {hourRange.map(hour => (
                                            <div key={hour} className="hour-block" style={{
                                                height: '80px',
                                                borderBottom: '1px solid #f0f0f0',
                                                position: 'relative'
                                            }}>
                                                {/* Quarter-hour markers */}
                                                <div style={{ position: 'absolute', left: 0, right: 0, top: '20px', borderBottom: '1px dotted #f0f0f0', zIndex: 1 }}></div>
                                                <div style={{ position: 'absolute', left: 0, right: 0, top: '40px', borderBottom: '1px dotted #f0f0f0', zIndex: 1 }}></div>
                                                <div style={{ position: 'absolute', left: 0, right: 0, top: '60px', borderBottom: '1px dotted #f0f0f0', zIndex: 1 }}></div>

                                                {/* Time slot areas - 15 min increments */}
                                                {[0, 1, 2, 3].map(quarterIdx => {
                                                    const minutes = quarterIdx * 15;
                                                    const quarterHour = `${hour}:${minutes < 10 ? '0' + minutes : minutes}`;
                                                    const period = hour >= 12 ? 'PM' : 'AM';
                                                    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                                                    const timeSlot = `${displayHour}:${minutes < 10 ? '0' + minutes : minutes} ${period}`;

                                                    const isBooked = isTimeSlotBooked(staff.name, timeSlot);

                                                    // Only add click handlers to slots that aren't already part of a time range
                                                    return (
                                                        <div
                                                            key={quarterIdx}
                                                            className="quarter-hour-slot"
                                                            style={{
                                                                position: 'absolute',
                                                                left: 0,
                                                                right: 0,
                                                                top: `${quarterIdx * 20}px`,
                                                                height: '20px',
                                                                cursor: isBooked ? 'default' : 'pointer',
                                                                zIndex: 2
                                                            }}
                                                            onClick={isBooked ? undefined : () => handleTimeSlotClick(timeSlot, staff.name)}
                                                        ></div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Appointments */}
                                    {staffAppointments.map(appointment => {
                                        const { top, height } = getAppointmentPosition(appointment.start_time, appointment.end_time);

                                        return (
                                            <Tooltip key={appointment.id} title={
                                                <>
                                                    <div><strong>Client:</strong> {appointment.customClientName || appointment.client}</div>
                                                    <div><strong>Service:</strong> {appointment.service}</div>
                                                    <div><strong>Time:</strong> {appointment.timeRangeDescription}</div>
                                                    {appointment.phone && <div><strong>Phone:</strong> {appointment.phone}</div>}
                                                    {appointment.specialRequests && <div><strong>Special Requests:</strong> {appointment.specialRequests}</div>}
                                                    <div style={{ marginTop: '8px', fontSize: '11px' }}>Click to edit or remove</div>
                                                </>
                                            }>
                                                <div
                                                    className="appointment"
                                                    style={{
                                                        position: 'absolute',
                                                        top: `${top}px`,
                                                        left: '4px',
                                                        right: '4px',
                                                        height: `${height}px`,
                                                        backgroundColor: '#e6f7ff',
                                                        borderLeft: '3px solid #1890ff',
                                                        borderRadius: '3px',
                                                        padding: '4px 6px',
                                                        overflow: 'hidden',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                        cursor: 'pointer',
                                                        zIndex: 3
                                                    }}
                                                    onClick={() => handleEditAppointment(appointment)}
                                                >
                                                    <div style={{
                                                        fontWeight: 'bold',
                                                        fontSize: '12px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {appointment.customClientName || appointment.client}
                                                    </div>
                                                    {height > 30 && (
                                                        <div style={{
                                                            fontSize: '11px',
                                                            color: '#666',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {appointment.service}
                                                        </div>
                                                    )}
                                                    {height > 45 && (
                                                        <div style={{ fontSize: '10px', marginTop: '2px' }}>
                                                            <ClockCircleOutlined style={{ marginRight: '2px', fontSize: '9px' }} />
                                                            {appointment.start_time} - {appointment.end_time}
                                                        </div>
                                                    )}
                                                </div>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        // Get the start of the week (Sunday) for the selected date
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

        // Create array of dates for the week
        const weekDates = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            return date;
        });

        return (
            <div className="week-view" style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                maxHeight: 'calc(100vh - 250px)'
            }}>
                {/* Day headers row */}
                <div className="day-headers-row" style={{
                    display: 'flex',
                    borderBottom: '1px solid #f0f0f0',
                    background: '#f7f9fc',
                    zIndex: 10
                }}>
                    {/* Empty cell in top-left corner */}
                    <div style={{
                        width: '60px',
                        flexShrink: 0,
                        borderRight: '1px solid #f0f0f0'
                    }}>
                    </div>

                    {/* Day header cells */}
                    {weekDates.map((date, index) => {
                        const isToday = new Date().toDateString() === date.toDateString();
                        const isSelected = selectedDate.toDateString() === date.toDateString();

                        return (
                            <div
                                key={index}
                                className="day-header"
                                style={{
                                    flex: '1 0 120px',
                                    minWidth: '120px',
                                    padding: '8px',
                                    textAlign: 'center',
                                    borderRight: '1px solid #f0f0f0',
                                    background: isSelected ? '#e6f7ff' : (isToday ? '#fffbe6' : '#f7f9fc'),
                                    cursor: 'pointer'
                                }}
                                onClick={() => setSelectedDate(new Date(date))}
                            >
                                <div style={{ fontWeight: 'bold' }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                <div style={{
                                    fontSize: '16px',
                                    color: isToday ? '#1890ff' : '#262626',
                                    fontWeight: isToday ? 'bold' : 'normal'
                                }}>
                                    {date.getDate()}
                                </div>
                                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                    {date.toLocaleDateString('en-US', { month: 'short' })}
                                </div>

                                {/* Add appointment button for selected day */}
                                {isSelected && (
                                    <Button
                                        type="dashed"
                                        icon={<PlusOutlined />}
                                        size="small"
                                        style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            zIndex: 10
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNewReservationClick();
                                        }}
                                    >
                                        Add
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Time grid with hour slots */}
                <div style={{
                    display: 'flex',
                    overflowY: 'auto',
                    flexGrow: 1
                }}>
                    {/* Time axis on the left */}
                    <div className="time-axis" style={{
                        width: '60px',
                        flexShrink: 0,
                        borderRight: '1px solid #f0f0f0',
                        background: '#f7f9fc'
                    }}>
                        {hourRange.map(hour => {
                            const displayHour = hour > 12 ? hour - 12 : hour;
                            const period = hour >= 12 ? 'PM' : 'AM';
                            return (
                                <div key={hour} className="hour-marker" style={{
                                    height: '80px',
                                    borderBottom: '1px solid #f0f0f0',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'center',
                                    paddingTop: '5px',
                                    color: '#8c8c8c',
                                    fontWeight: '500',
                                    fontSize: '12px'
                                }}>
                                    {`${displayHour} ${period}`}
                                </div>
                            );
                        })}
                    </div>

                    {/* Day columns */}
                    <div className="day-columns" style={{ display: 'flex', flexGrow: 1 }}>
                        {weekDates.map((date, index) => {
                            const isToday = new Date().toDateString() === date.toDateString();
                            const isSelected = selectedDate.toDateString() === date.toDateString();

                            return (
                                <div key={index} className="day-column" style={{
                                    flex: '1 0 120px',
                                    minWidth: '120px',
                                    borderRight: '1px solid #f0f0f0',
                                    position: 'relative',
                                    background: isSelected ? '#f0f7ff' : (isToday ? '#fffbe6' : 'transparent')
                                }}>
                                    {/* Hour grid */}
                                    <div className="hour-grid">
                                        {hourRange.map(hour => (
                                            <div key={hour} className="hour-block" style={{
                                                height: '80px',
                                                borderBottom: '1px solid #f0f0f0',
                                                position: 'relative'
                                            }}>
                                                {/* Quarter-hour markers */}
                                                <div style={{ position: 'absolute', left: 0, right: 0, top: '20px', borderBottom: '1px dotted #f0f0f0' }}></div>
                                                <div style={{ position: 'absolute', left: 0, right: 0, top: '40px', borderBottom: '1px dotted #f0f0f0' }}></div>
                                                <div style={{ position: 'absolute', left: 0, right: 0, top: '60px', borderBottom: '1px dotted #f0f0f0' }}></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ height: '100vh', background: '#f7f9fc' }}>
            {/* Fresha-style Header Card */}
            <Card
                style={{ marginBottom: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
                bordered={false}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ShopOutlined style={{ fontSize: "24px", marginRight: "10px", color: "#6c1c2c" }} />
                        <div>
                            <Typography.Title level={4} style={{ margin: 0 }}>Spa Calendar</Typography.Title>
                            <Typography.Text type="secondary">Appointment Scheduler</Typography.Text>
                        </div>
                    </div>

                    <Space>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleNewReservationClick}
                        >
                            New Reservation
                        </Button>
                    </Space>
                </div>
            </Card>

            {/* Calendar View Card */}
            <Card
                style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)', margin: '0' }}
                bordered={false}
                bodyStyle={{ padding: 0 }}
                title={renderCalendarHeader()}
            >
                {/* Calendar main area */}
                <div className="calendar-view">
                    {calendarView === 'day' ? renderCalendarGrid() : renderWeekView()}
                </div>
            </Card>

            {/* Appointment Form Modal */}
            <Modal
                title={
                    <div style={{ fontSize: '18px', color: '#2a2f3d' }}>
                        <Space>
                            {isEditMode ? <EditOutlined /> : <PlusOutlined />}
                            {isEditMode ? "Edit Appointment" : "New Reservation"}
                        </Space>
                    </div>
                }
                open={showReservationForm}
                onCancel={() => setShowReservationForm(false)}
                footer={null}
                destroyOnClose
                centered
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFormSubmit}
                    initialValues={isEditMode && editingAppointment ? {
                        staff: editingAppointment.staffId,
                        clientName: editingAppointment.clientId,
                        customClientName: editingAppointment.customClientName || "",
                        service: editingAppointment.serviceId,
                        appointmentDate: editingAppointment.originalData?.appointment_date ?
                            moment(editingAppointment.originalData.appointment_date) :
                            moment(selectedDate),
                        // For time range in the time picker
                        timeRange: [
                            moment(editingAppointment.start_time, 'h:mm A'),
                            moment(editingAppointment.end_time, 'h:mm A')
                        ],
                        specialRequests: editingAppointment.specialRequests || "",
                        phoneNumber: editingAppointment.phone ? reversePhoneNumber(editingAppointment.phone) : ""
                    } : {
                        staff: selectedStaff,
                        appointmentDate: moment(selectedDate),
                    }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
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
                        </Col>

                        <Col span={12}>
                            <Form.Item
                                name="staff"
                                label="Staff Member"
                                rules={[{ required: true, message: 'Please select a staff member' }]}
                            >
                                <Select placeholder="Select staff" loading={isLoading}>
                                    {staffMembers && staffMembers
                                        .filter(staff => {
                                            // Filter out users with admin or cleaner roles
                                            const roleType = staff.role?.toLowerCase();
                                            return roleType !== 'admin' && roleType !== 'cleaner';
                                        })
                                        .map(staff => (
                                            <Select.Option key={staff.id} value={staff.id}>
                                                <Space>
                                                    <Avatar src={staff.avatar} size="small" />
                                                    {staff.name}
                                                </Space>
                                            </Select.Option>
                                        ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="timeRange"
                        label="Time Range"
                        rules={[{ required: true, message: 'Please select a time range' }]}
                        extra="Select start and end times for the appointment (8:00 AM - 10:00 PM)"
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
                                disabledHours: () => [0, 1, 2, 3, 4, 5, 6, 7, 22, 23],
                                disabledMinutes: (hour) => {
                                    // Only allow 0, 15, 30, 45 minute intervals
                                    return Array.from({ length: 60 }).map((_, i) => i)
                                        .filter(m => m % 15 !== 0);
                                }
                            })}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Client Information"
                        required
                    >
                        <div style={{ marginBottom: '10px' }}>
                            <Radio.Group
                                defaultValue={editingAppointment && editingAppointment.customClientName ? "custom" : "existing"}
                                buttonStyle="solid"
                                style={{ marginBottom: '15px', width: '100%' }}
                                onChange={(e) => setClientInputMode(e.target.value)}
                                value={clientInputMode}
                            >
                                <Radio.Button value="existing" style={{ width: '50%', textAlign: 'center' }}>
                                    Select Existing Client
                                </Radio.Button>
                                <Radio.Button value="custom" style={{ width: '50%', textAlign: 'center' }}>
                                    Enter New Client
                                </Radio.Button>
                            </Radio.Group>
                        </div>

                        {clientInputMode === "existing" ? (
                            <Form.Item
                                name="clientName"
                                noStyle
                                rules={[
                                    {
                                        required: clientInputMode === "existing",
                                        message: 'Please select a client'
                                    }
                                ]}
                            >
                                <Select
                                    placeholder="Select client"
                                    showSearch
                                    allowClear
                                    loading={isLoadingCustomers}
                                    style={{ width: '100%' }}
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                >
                                    {customers && Array.isArray(customers) ? customers.map(customer => (
                                        <Select.Option key={customer._id} value={customer._id}>{customer.customer_name}</Select.Option>
                                    )) : null}
                                </Select>
                            </Form.Item>
                        ) : (
                            <Form.Item
                                name="customClientName"
                                noStyle
                                rules={[
                                    {
                                        required: clientInputMode === "custom",
                                        message: 'Please enter client name'
                                    }
                                ]}
                            >
                                <Input
                                    placeholder="Enter client name"
                                    value={customClientName}
                                    onChange={handleCustomClientNameChange}
                                />
                            </Form.Item>
                        )}
                    </Form.Item>

                    {/* Phone Number field using PhoneInput component */}
                    <PhoneInput label="Phone" owner="phoneNumber" />

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
                            optionFilterProp="label"
                            filterOption={(input, option) =>
                                option?.label?.toLowerCase().includes(input.toLowerCase())
                            }
                            notFoundContent={isLoadingProducts ? <Spin size="small" /> : "No services found"}
                        >
                            {formattedProducts.map(product => (
                                <Select.Option
                                    key={product.id}
                                    value={product.id}
                                    label={`${product.name} - ${product.category} (ksh ${product.price})`}
                                >
                                    {product.name} - {product.category} (ksh {product.price})
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {/* Field for special requests */}
                    <Form.Item
                        name="specialRequests"
                        label="Special Requests"
                    >
                        <TextArea
                            placeholder="Enter any special requests or notes"
                            rows={4}
                        />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
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
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default SpaReservationSystem;