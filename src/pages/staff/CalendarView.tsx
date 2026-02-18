import { useState, useMemo, useCallback } from "react";
import {
  Button,
  Space,
  Modal,
  Avatar,
  Form,
  Select,
  TimePicker,
  Tooltip,
  message,
  Spin,
  Popconfirm,
  DatePicker,
  Radio,
  Input,
  InputNumber,
  Row,
  Col,
  Flex,
} from "antd";
import {
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { fetchAllUsersList } from "@services/users";
import {
  createSchedule,
  fetchAllCustomers,
  fetchAllSchedules,
  updateSchedule,
  removeSchedule,
} from "@services/customers";
import { getAllProducts } from "@services/products";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import moment from "moment";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import { reversePhoneNumberBookings } from "@components/PhoneNumber/utils/reversePhoneNumberFormat";
import { ProCard } from "@ant-design/pro-components";

const { Option } = Select;
const { RangePicker } = TimePicker;
const { TextArea } = Input;

const CalendarView = () => {
  const dispatch = useDispatch();

  const [showReservationForm, setShowReservationForm] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [customClientName, setCustomClientName] = useState("");
  const [clientInputMode, setClientInputMode] = useState("existing");
  const [visibleHours, setVisibleHours] = useState([7, 22]);
  const [calendarView, setCalendarView] = useState("day");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [bookingType, setBookingType] = useState<'individual' | 'group'>('individual');
  const [maxCapacity, setMaxCapacity] = useState<number>(1);
  const [form] = Form.useForm();

  // ✅ Changed from 8 to 7 — calendar now starts at 7 AM
  const hourRange = Array.from({ length: 16 }, (_, i) => i + 7);

  const generateTimeSlots = () => {
    const slots = [];
    hourRange.forEach((hour) => {
      [0, 15, 30, 45].forEach((minutes) => {
        if (hour === 22 && minutes > 0) return;

        const period = hour >= 12 ? "PM" : "AM";
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        slots.push(`${displayHour}:${formattedMinutes} ${period}`);
      });
    });
    return slots;
  };

  const allTimeSlots = generateTimeSlots();

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchAllCustomers,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const {
    data: scheduleData,
    refetch: refetchScheduleData,
  } = useQuery({
    queryKey: ["schedule data", selectedDate.toISOString().split("T")[0]],
    queryFn: () => fetchAllSchedules(selectedDate.toISOString().split("T")[0]),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
    networkMode: "always",
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: getAllProducts,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const shopId = localStorage.getItem("shopId");

  const { data: staffMembersData, isLoading } = useQuery({
    queryKey: ["users", shopId],
    enabled: !!shopId,
    queryFn: () =>
      fetchAllUsersList({
        fullname: "",
        email: "",
        shop_id: shopId!,
      }),
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
    select: (data: any[]) =>
      data?.filter((user: any) => {
        const roleType = user.role?.role_type?.toLowerCase();
        return roleType !== "admin" && roleType !== "cleaner";
      }) ?? [],
  });

  const formattedProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];

    const allProductServices: any = [];
    products.forEach((category: any) => {
      if (category.products && Array.isArray(category.products)) {
        category.products.forEach((product: any) => {
          allProductServices.push({
            id: product._id,
            name: product.name,
            price: product.price,
            category: category.name,
          });
        });
      }
    });

    return allProductServices;
  }, [products]);

  const staffMembers = useMemo(() => {
    if (!staffMembersData) return [];

    return staffMembersData.map((user) => ({
      id: user._id,
      name: user.fullname || `${user.username}`,
      role: user.role?.role_type || "staff",
      avatar:
        "https://t4.ftcdn.net/jpg/00/87/28/19/360_F_87281963_29bnkFXa6RQnJYWeRfrSpieagNxw1Rru.jpg",
      schedule: "Full-time",
      status: user.status || "Active",
      email: user.email,
    }));
  }, [staffMembersData]);

  const formattedScheduleData = useMemo(() => {
    if (!scheduleData?.data || !Array.isArray(scheduleData?.data)) return [];

    const selectedDateStr = selectedDate.toISOString().split("T")[0];

    const filteredSchedules = scheduleData?.data?.filter((appointment) => {
      if (appointment.appointment_date) {
        const appointmentDate = new Date(appointment.appointment_date)
          .toISOString()
          .split("T")[0];
        return appointmentDate === selectedDateStr;
      }
      return true;
    });

    return filteredSchedules.map((appointment) => ({
      id: appointment._id,
      staff: appointment.staff_id?.fullname || "Unknown Staff",
      staffId: appointment.staff_id?._id,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      client:
        appointment.customer_id?.customer_name ||
        appointment.custom_client_name ||
        "Unknown Client",
      clientId: appointment.customer_id?._id,
      customClientName: appointment.custom_client_name,
      service: appointment.service_id?.name || "Unknown Service",
      serviceId: appointment.service_id?._id,
      duration: appointment.duration || "Unknown Duration",
      isTimeRange: appointment.start_time !== appointment.end_time,
      timeRangeDescription:
        appointment.timeRangeDescription ||
        `${appointment.start_time} - ${appointment.end_time}`,
      originalData: appointment,
      appointmentDate: appointment.appointment_date,
      specialRequests: appointment.special_requests,
      phone: appointment.phone,
    }));
  }, [scheduleData, selectedDate]);

  const isTimeSlotBooked = (staffName, timeSlot) => {
    const selectedDateStr = selectedDate.toISOString().split("T")[0];

    return formattedScheduleData.some((appointment) => {
      if (appointment.appointmentDate) {
        const appointmentDateStr = new Date(appointment.appointmentDate)
          .toISOString()
          .split("T")[0];
        if (appointmentDateStr !== selectedDateStr) {
          return false;
        }
      }

      if (
        appointment.staff === staffName &&
        appointment.start_time === timeSlot
      ) {
        return true;
      }

      if (appointment.staff === staffName && appointment.isTimeRange) {
        const startIndex = allTimeSlots.indexOf(appointment.start_time);
        const endIndex = allTimeSlots.indexOf(appointment.end_time);
        const timeSlotIndex = allTimeSlots.indexOf(timeSlot);

        return timeSlotIndex >= startIndex && timeSlotIndex < endIndex;
      }

      return false;
    });
  };

  const isTimeRangeAvailable = (staffName, startTime, endTime, excludeAppointmentId = null) => {
    const startIndex = allTimeSlots.indexOf(startTime);
    const endIndex = allTimeSlots.indexOf(endTime);

    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
      return false;
    }

    const selectedDateStr = selectedDate.toISOString().split("T")[0];

    for (let i = startIndex; i < endIndex; i++) {
      const conflictingAppointment = formattedScheduleData.find((appointment) => {
        if (appointment.appointmentDate) {
          const appointmentDateStr = new Date(appointment.appointmentDate)
            .toISOString()
            .split("T")[0];
          if (appointmentDateStr !== selectedDateStr) {
            return false;
          }
        }

        if (excludeAppointmentId && appointment.id === excludeAppointmentId) {
          return false;
        }

        if (appointment.staff !== staffName) {
          return false;
        }

        const apptStartIndex = allTimeSlots.indexOf(appointment.start_time);
        const apptEndIndex = allTimeSlots.indexOf(appointment.end_time);

        return i >= apptStartIndex && i < apptEndIndex;
      });

      if (conflictingAppointment) {
        return false;
      }
    }

    return true;
  };

  const getAppointment = (staffName, time) => {
    const selectedDateStr = selectedDate.toISOString().split("T")[0];

    return formattedScheduleData.find((item) => {
      if (item.appointmentDate) {
        const appointmentDateStr = new Date(item.appointmentDate)
          .toISOString()
          .split("T")[0];
        if (appointmentDateStr !== selectedDateStr) {
          return false;
        }
      }

      return item.staff === staffName && item.start_time === time;
    });
  };

  const getStaffAppointments = (staffName) => {
    const selectedDateStr = selectedDate.toISOString().split("T")[0];

    return formattedScheduleData.filter((item) => {
      if (item.appointmentDate) {
        const appointmentDateStr = new Date(item.appointmentDate)
          .toISOString()
          .split("T")[0];
        if (appointmentDateStr !== selectedDateStr) {
          return false;
        }
      }

      return item.staff === staffName;
    });
  };

  const getNextTimeSlot = (timeSlot) => {
    const index = allTimeSlots.indexOf(timeSlot);
    if (index !== -1 && index < allTimeSlots.length - 1) {
      return allTimeSlots[index + 1];
    }
    return timeSlot;
  };

  const handleTimeSlotClick = useCallback(
    (time, staffName) => {
      const staffMember = staffMembers.find(
        (staff) => staff.name === staffName
      );

      if (isTimeSlotBooked(staffName, time)) {
        const appointment = getAppointment(staffName, time);
        if (appointment) {
          handleEditAppointment(appointment);
        } else {
          message.warning(`This time slot is already booked for ${staffName}.`);
        }
        return;
      }

      form.resetFields();
      setSelectedTimeSlot(time);
      setSelectedStaff(staffMember?.id);
      setShowReservationForm(true);
      setIsEditMode(false);
      setEditingAppointment(null);
      setClientInputMode("existing");
      setBookingType('individual');
      setMaxCapacity(1);
      setSelectedCustomers([]);

      form.setFieldsValue({
        staff: staffMember?.id,
        appointmentDate: moment(selectedDate),
        timeRange: [
          moment.utc(time, "h:mm A"),
          moment.utc(getNextTimeSlot(time), "h:mm A"),
        ],
        bookingType: 'individual',
        maxCapacity: 1,
      });
    },
    [
      form,
      selectedDate,
      staffMembers,
      getAppointment,
      isTimeSlotBooked,
      getNextTimeSlot,
    ]
  );

  const handleDateChange = useCallback((date) => {
    if (date) {
      setSelectedDate(date.toDate());
    }
  }, []);

  const navigateDay = useCallback((direction) => {
    setSelectedDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + direction);
      return newDate;
    });
  }, []);

  const handleNewReservationClick = () => {
    setSelectedTimeSlot(null);
    setEditingAppointment(null);
    setIsEditMode(false);
    setCustomClientName("");
    setClientInputMode("existing");
    setSelectedCustomers([]);
    setBookingType('individual');
    setMaxCapacity(1);

    form.resetFields();

    form.setFieldsValue({
      appointmentDate: moment.utc(selectedDate),
      staff: selectedStaff || undefined,
      bookingType: 'individual',
      maxCapacity: 1,
    });

    setShowReservationForm(true);
  };

  const handleCustomClientNameChange = (event: any) => {
    setCustomClientName(event.target.value);
  };

  const handleEditAppointment = (appointment: any) => {
    console.log("📝 Editing appointment:", appointment);

    setEditingAppointment(appointment);
    setIsEditMode(true);
    setSelectedTimeSlot(appointment.start_time);
    setSelectedStaff(appointment.staffId);
    setCustomClientName(appointment.customClientName || "");
    setClientInputMode(appointment.customClientName ? "custom" : "existing");

    if (appointment.originalData?.customer_ids && appointment.originalData.customer_ids.length > 0) {
      const customerIds = appointment.originalData.customer_ids.map(c => c._id || c);
      setSelectedCustomers(customerIds);
      setBookingType(appointment.originalData.booking_type || 'group');
      setMaxCapacity(appointment.originalData.max_capacity || customerIds.length);
    } else if (appointment.clientId) {
      setSelectedCustomers([appointment.clientId]);
      setBookingType('individual');
      setMaxCapacity(1);
    } else {
      setSelectedCustomers([]);
      setBookingType('individual');
      setMaxCapacity(1);
    }

    setShowReservationForm(true);

    form.resetFields();

    const customerIds = appointment.originalData?.customer_ids?.map(c => c._id || c) || [];
    const formValues = {
      staff: appointment.staffId,
      clientName: appointment.clientId,
      clientNames: customerIds,
      bookingType: appointment.originalData?.booking_type || 'individual',
      maxCapacity: appointment.originalData?.max_capacity || 1,
      customClientName: appointment.customClientName || "",
      service: appointment.serviceId,
      appointmentDate: appointment.originalData?.appointment_date
        ? moment.utc(appointment.originalData.appointment_date)
        : moment.utc(selectedDate),
      timeRange: [
        moment.utc(appointment.start_time, "h:mm A"),
        moment.utc(appointment.end_time, "h:mm A"),
      ],
      specialRequests: appointment.specialRequests || "",
      notes: appointment.originalData?.notes || "",
    };

    console.log("📋 Setting form values:", formValues);
    form.setFieldsValue(formValues);
  };

  const handleDeleteAppointment = useMutation({
    mutationFn: removeSchedule,
    onSuccess: () => {
      message.success("Appointment deleted successfully");
      refetchScheduleData();
      setShowReservationForm(false);
    },
    onError: (error: any) => {
      message.error(
        `Failed to delete appointment: ${error.message || "Unknown error"}`
      );
    },
  });

  const handleFormSubmit = async (values) => {
    console.log("📤 Form submitted with values:", values);
    console.log("🔧 Current state - isEditMode:", isEditMode, "editingAppointment:", editingAppointment);

    let customerIds = [];
    let clientId = null;

    if (clientInputMode === "existing") {
      if (bookingType === 'group') {
        customerIds = values.clientNames || [];
      } else {
        if (values.clientName) {
          customerIds = [values.clientName];
          clientId = values.clientName;
        }
      }
    }

    const service = values.service;
    const staffMember = values.staff || selectedStaff;
    const appointmentDate = values.appointmentDate
      ? values.appointmentDate.format("YYYY-MM-DD")
      : selectedDate.toISOString().split("T")[0];
    const customName =
      clientInputMode === "custom" ? values.customClientName : null;

    const staffName =
      staffMembers.find((staff) => staff.id === staffMember)?.name ||
      "Unknown Staff";

    if (values.timeRange) {
      const startTime = values.timeRange[0].format("h:mm A");
      const endTime = values.timeRange[1].format("h:mm A");

      let matchingStartTime = null;
      let matchingEndTime = null;
      let startIndex = -1;
      let endIndex = -1;

      for (let i = 0; i < allTimeSlots.length; i++) {
        const slot = allTimeSlots[i];
        if (
          slot.replace(/\s+/g, " ").trim().toLowerCase() ===
          startTime.replace(/\s+/g, " ").trim().toLowerCase()
        ) {
          matchingStartTime = slot;
          startIndex = i;
        }
        if (
          slot.replace(/\s+/g, " ").trim().toLowerCase() ===
          endTime.replace(/\s+/g, " ").trim().toLowerCase()
        ) {
          matchingEndTime = slot;
          endIndex = i;
        }
      }

      if (startIndex === -1 || endIndex === -1) {
        const parseTimeString = (timeStr) => {
          const [timePart, ampm] = timeStr.split(" ");
          let [hours, minutes] = timePart
            .split(":")
            .map((num) => parseInt(num, 10));
          if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
          if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
          return { hours, minutes };
        };

        const startTimeParsed = parseTimeString(startTime);
        const endTimeParsed = parseTimeString(endTime);

        for (let i = 0; i < allTimeSlots.length; i++) {
          const slotParsed = parseTimeString(allTimeSlots[i]);

          if (
            slotParsed.hours === startTimeParsed.hours &&
            slotParsed.minutes === startTimeParsed.minutes &&
            startIndex === -1
          ) {
            startIndex = i;
            matchingStartTime = allTimeSlots[i];
          }

          if (
            slotParsed.hours === endTimeParsed.hours &&
            slotParsed.minutes === endTimeParsed.minutes &&
            endIndex === -1
          ) {
            endIndex = i;
            matchingEndTime = allTimeSlots[i];
          }
        }
      }

      if (startIndex === -1 || endIndex === -1) {
        message.error(
          `Unable to match the selected times with available slots. Please select from the dropdown list instead.`
        );
        return;
      }

      if (startIndex >= endIndex) {
        message.error(`End time must be after start time.`);
        return;
      }

      const excludeAppointmentId = isEditMode && editingAppointment ? editingAppointment.id : null;

      if (!isTimeRangeAvailable(staffName, matchingStartTime, matchingEndTime, excludeAppointmentId)) {
        message.error(
          `The selected time range conflicts with existing appointments for ${staffName}.`
        );
        return;
      }

      const timeRangeDescription = `${matchingStartTime} - ${matchingEndTime}`;

      const appointmentData = {
        staff_id: staffMember,
        start_time: matchingStartTime,
        end_time: matchingEndTime,
        client_id: clientId,
        customer_ids: customerIds,
        custom_client_name: customName,
        service_id: service,
        duration: `${Math.round((endIndex - startIndex) * 15)} mins`,
        isTimeRange: true,
        timeRangeDescription,
        appointment_date: appointmentDate,
        special_requests: values.specialRequests,
        source: "admin_portal",
        booking_type: bookingType,
        max_capacity: maxCapacity,
        notes: values.notes,
      };

      console.log("🎯 Appointment data to send:", appointmentData);

      try {
        if (isEditMode && editingAppointment) {
          console.log("✏️ Updating existing appointment:", editingAppointment.id);
          await dispatch(
            updateSchedule({
              id: editingAppointment.id,
              data: appointmentData,
            })
          ).unwrap();
          message.success(`Appointment updated successfully.`);
        } else {
          console.log("➕ Creating new appointment");
          await dispatch(createSchedule(appointmentData)).unwrap();
          message.success(`Appointment booked successfully.`);
        }

        setShowReservationForm(false);
        refetchScheduleData();

        setSelectedCustomers([]);
        setBookingType('individual');
        setMaxCapacity(1);
        setIsEditMode(false);
        setEditingAppointment(null);
        setClientInputMode("existing");
        setCustomClientName("");

      } catch (error: any) {
        const actionType = isEditMode ? "update" : "create";
        console.error(`❌ Failed to ${actionType} appointment:`, error);
        message.error(
          `Failed to ${actionType} appointment: ${error.message || "Unknown error"}`
        );
      }
    } else {
      message.error(`Please select a valid time range for the appointment.`);
    }
  };

  const renderCalendarHeader = () => {
    return (
      <Flex justify="space-between" align="center" gap={16}>
        <Button onClick={() => setSelectedDate(new Date())}>Today</Button>
        <Button icon={<LeftOutlined />} onClick={() => navigateDay(-1)} />
        <DatePicker
          value={moment.utc(selectedDate)}
          onChange={handleDateChange}
          format="MMM DD, YYYY"
          allowClear={false}
          variant="borderless"
          suffixIcon={null}
          style={{ fontSize: "16px", fontWeight: "normal", width: "100px" }}
        />
        <Button icon={<RightOutlined />} onClick={() => navigateDay(1)} />

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
      </Flex>
    );
  };

  const getAppointmentPosition = (startTime, endTime) => {
    const startIndex = allTimeSlots.indexOf(startTime);
    const endIndex = allTimeSlots.indexOf(endTime);

    if (startIndex === -1) return { top: 0, height: 0 };

    const slotHeight = 20;
    const top = startIndex * slotHeight;
    const height = (endIndex - startIndex) * slotHeight || slotHeight;

    return { top, height };
  };

  const renderCalendarGrid = () => {
    if (isLoading || !staffMembers || staffMembers.length === 0) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "40px 0",
          }}
        >
          <Spin size="large" />
          <div style={{ marginLeft: "12px" }}>Loading staff data...</div>
        </div>
      );
    }

    return (
      <div
        className="calendar-container"
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          maxHeight: "calc(100vh - 250px)",
          position: "relative",
        }}
      >
        <div
          className="staff-headers-row"
          style={{
            display: "flex",
            borderBottom: "1px solid #f0f0f0",
            background: "#f7f9fc",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: "60px",
              flexShrink: 0,
              borderRight: "1px solid #f0f0f0",
            }}
          ></div>

          {staffMembers.map((staff) => (
            <div
              key={staff.id}
              className="staff-header"
              style={{
                flex: "1 0 180px",
                minWidth: "180px",
                padding: "8px",
                textAlign: "center",
                borderRight: "1px solid #f0f0f0",
                position: "relative",
              }}
            >
              <Avatar src={staff.avatar} style={{ marginBottom: 4 }} />
              <div style={{ fontWeight: "bold" }}>{staff.name}</div>
              <div style={{ fontSize: "11px", color: "#8c8c8c" }}>
                {staff.role}
              </div>

              <Button
                type="dashed"
                icon={<PlusOutlined />}
                size="small"
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                }}
                title="Add Appointment"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStaff(staff.id);
                  setIsEditMode(false);
                  setEditingAppointment(null);
                  setCustomClientName("");
                  setClientInputMode("existing");
                  setBookingType('individual');
                  setMaxCapacity(1);
                  setSelectedCustomers([]);

                  form.resetFields();
                  setTimeout(() => {
                    form.setFieldsValue({
                      staff: staff.id,
                      appointmentDate: moment.utc(selectedDate),
                      bookingType: 'individual',
                      maxCapacity: 1,
                    });
                    setShowReservationForm(true);
                  }, 0);
                }}
              />
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            overflowY: "auto",
            flexGrow: 1,
          }}
        >
          <div
            className="time-axis"
            style={{
              width: "60px",
              flexShrink: 0,
              borderRight: "1px solid #f0f0f0",
              background: "#f7f9fc",
            }}
          >
            {hourRange.map((hour) => {
              const displayHour = hour > 12 ? hour - 12 : hour;
              const period = hour >= 12 ? "PM" : "AM";
              return (
                <div
                  key={hour}
                  className="hour-marker"
                  style={{
                    height: "80px",
                    borderBottom: "1px solid #f0f0f0",
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    paddingTop: "5px",
                    color: "#8c8c8c",
                    fontWeight: "500",
                    fontSize: "12px",
                  }}
                >
                  {`${displayHour} ${period}`}

                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "20px",
                      borderBottom: "1px dotted #f0f0f0",
                    }}
                  ></div>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "40px",
                      borderBottom: "1px dotted #f0f0f0",
                    }}
                  ></div>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "60px",
                      borderBottom: "1px dotted #f0f0f0",
                    }}
                  ></div>
                </div>
              );
            })}
          </div>

          <div
            className="staff-columns"
            style={{ display: "flex", flexGrow: 1 }}
          >
            {staffMembers.map((staff) => {
              const staffAppointments = getStaffAppointments(staff.name);

              return (
                <div
                  key={staff.id}
                  className="staff-column"
                  style={{
                    flex: "1 0 180px",
                    minWidth: "180px",
                    borderRight: "1px solid #f0f0f0",
                    position: "relative",
                  }}
                >
                  <div className="hour-grid">
                    {hourRange.map((hour) => (
                      <div
                        key={hour}
                        className="hour-block"
                        style={{
                          height: "80px",
                          borderBottom: "1px solid #f0f0f0",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "20px",
                            borderBottom: "1px dotted #f0f0f0",
                            zIndex: 1,
                          }}
                        ></div>
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "40px",
                            borderBottom: "1px dotted #f0f0f0",
                            zIndex: 1,
                          }}
                        ></div>
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "60px",
                            borderBottom: "1px dotted #f0f0f0",
                            zIndex: 1,
                          }}
                        ></div>

                        {[0, 1, 2, 3].map((quarterIdx) => {
                          const minutes = quarterIdx * 15;
                          const quarterHour = `${hour}:${minutes < 10 ? "0" + minutes : minutes}`;
                          const period = hour >= 12 ? "PM" : "AM";
                          const displayHour =
                            hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                          const timeSlot = `${displayHour}:${minutes < 10 ? "0" + minutes : minutes} ${period}`;

                          const isBooked = isTimeSlotBooked(
                            staff.name,
                            timeSlot
                          );

                          return (
                            <div
                              key={quarterIdx}
                              className="quarter-hour-slot"
                              style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top: `${quarterIdx * 20}px`,
                                height: "20px",
                                cursor: isBooked ? "default" : "pointer",
                                zIndex: 2,
                              }}
                              onClick={
                                isBooked
                                  ? undefined
                                  : () =>
                                    handleTimeSlotClick(timeSlot, staff.name)
                              }
                            ></div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {staffAppointments.map((appointment) => {
                    const { top, height } = getAppointmentPosition(
                      appointment.start_time,
                      appointment.end_time
                    );

                    const customerDisplay = appointment.originalData?.customer_ids && appointment.originalData.customer_ids.length > 1
                      ? `${appointment.originalData.customer_ids.length} customers`
                      : appointment.customClientName || appointment.client;

                    return (
                      <Tooltip
                        key={appointment.id}
                        title={
                          <>
                            <div>
                              <strong>Client(s):</strong>{" "}
                              {appointment.originalData?.customer_ids && appointment.originalData.customer_ids.length > 1
                                ? `${appointment.originalData.customer_ids.length} customers (${appointment.originalData.customer_ids
                                  .slice(0, 3)
                                  .map(c => c.customer_name)
                                  .join(', ')
                                }${appointment.originalData.customer_ids.length > 3 ? '...' : ''})`
                                : appointment.customClientName || appointment.client
                              }
                            </div>
                            <div>
                              <strong>Service:</strong> {appointment.service}
                            </div>
                            <div>
                              <strong>Time:</strong>{" "}
                              {appointment.timeRangeDescription}
                            </div>
                            {appointment.originalData?.booking_type === 'group' && (
                              <div>
                                <strong>Type:</strong> Group Booking ({appointment.originalData.current_capacity}/{appointment.originalData.max_capacity})
                              </div>
                            )}
                            {appointment.phone && (
                              <div>
                                <strong>Phone:</strong> {appointment.phone}
                              </div>
                            )}
                            {appointment.specialRequests && (
                              <div>
                                <strong>Special Requests:</strong>{" "}
                                {appointment.specialRequests}
                              </div>
                            )}
                            <div style={{ marginTop: "8px", fontSize: "11px" }}>
                              Click to edit or remove
                            </div>
                          </>
                        }
                      >
                        <div
                          className="appointment"
                          style={{
                            position: "absolute",
                            top: `${top}px`,
                            left: "4px",
                            right: "4px",
                            height: `${height}px`,
                            backgroundColor: "#e6f7ff",
                            borderLeft: "3px solid #1890ff",
                            borderRadius: "3px",
                            padding: "4px 6px",
                            overflow: "hidden",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            cursor: "pointer",
                            zIndex: 3,
                          }}
                          onClick={() => handleEditAppointment(appointment)}
                        >
                          <div
                            style={{
                              fontWeight: "bold",
                              fontSize: "12px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {customerDisplay}
                          </div>
                          {height > 30 && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#666",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {appointment.service}
                            </div>
                          )}
                          {height > 45 && (
                            <div style={{ fontSize: "10px", marginTop: "2px" }}>
                              <ClockCircleOutlined
                                style={{ marginRight: "2px", fontSize: "9px" }}
                              />
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
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });

    return (
      <div
        className="week-view"
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          maxHeight: "calc(100vh - 250px)",
        }}
      >
        <div
          className="day-headers-row"
          style={{
            display: "flex",
            borderBottom: "1px solid #f0f0f0",
            background: "#f7f9fc",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: "60px",
              flexShrink: 0,
              borderRight: "1px solid #f0f0f0",
            }}
          ></div>

          {weekDates.map((date, index) => {
            const isToday = new Date().toDateString() === date.toDateString();
            const isSelected =
              selectedDate.toDateString() === date.toDateString();

            return (
              <div
                key={index}
                className="day-header"
                style={{
                  flex: "1 0 120px",
                  minWidth: "120px",
                  padding: "8px",
                  textAlign: "center",
                  borderRight: "1px solid #f0f0f0",
                  background: isSelected
                    ? "#e6f7ff"
                    : isToday
                      ? "#fffbe6"
                      : "#f7f9fc",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedDate(new Date(date))}
              >
                <div style={{ fontWeight: "bold" }}>
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    color: isToday ? "#1890ff" : "#262626",
                    fontWeight: isToday ? "bold" : "normal",
                  }}
                >
                  {date.getDate()}
                </div>
                <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                  {date.toLocaleDateString("en-US", { month: "short" })}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            overflowY: "auto",
            flexGrow: 1,
          }}
        >
          <div
            className="time-axis"
            style={{
              width: "60px",
              flexShrink: 0,
              borderRight: "1px solid #f0f0f0",
              background: "#f7f9fc",
            }}
          >
            {hourRange.map((hour) => {
              const displayHour = hour > 12 ? hour - 12 : hour;
              const period = hour >= 12 ? "PM" : "AM";
              return (
                <div
                  key={hour}
                  className="hour-marker"
                  style={{
                    height: "80px",
                    borderBottom: "1px solid #f0f0f0",
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    paddingTop: "5px",
                    color: "#8c8c8c",
                    fontWeight: "500",
                    fontSize: "12px",
                  }}
                >
                  {`${displayHour} ${period}`}
                </div>
              );
            })}
          </div>

          <div className="day-columns" style={{ display: "flex", flexGrow: 1 }}>
            {weekDates.map((date, index) => {
              const isToday = new Date().toDateString() === date.toDateString();
              const isSelected =
                selectedDate.toDateString() === date.toDateString();

              return (
                <div
                  key={index}
                  className="day-column"
                  style={{
                    flex: "1 0 120px",
                    minWidth: "120px",
                    borderRight: "1px solid #f0f0f0",
                    position: "relative",
                    background: isSelected
                      ? "#f0f7ff"
                      : isToday
                        ? "#fffbe6"
                        : "transparent",
                  }}
                >
                  <div className="hour-grid">
                    {hourRange.map((hour) => (
                      <div
                        key={hour}
                        className="hour-block"
                        style={{
                          height: "80px",
                          borderBottom: "1px solid #f0f0f0",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "20px",
                            borderBottom: "1px dotted #f0f0f0",
                          }}
                        ></div>
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "40px",
                            borderBottom: "1px dotted #f0f0f0",
                          }}
                        ></div>
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "60px",
                            borderBottom: "1px dotted #f0f0f0",
                          }}
                        ></div>
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
    <div style={{ height: "100vh", background: "#f7f9fc" }}>
      <ProCard
        bordered={false}
        bodyStyle={{ padding: "16px" }}
        title={renderCalendarHeader()}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={(e) => {
                e.stopPropagation();
                handleNewReservationClick();
              }}
            >
              Add Appointment
            </Button>
          </Space>
        }
      >
        <div className="calendar-view">
          {calendarView === "day" ? renderCalendarGrid() : renderWeekView()}
        </div>
      </ProCard>

      <Modal
        title={
          <div style={{ fontSize: "18px", color: "#2a2f3d" }}>
            <Space>
              {isEditMode ? <EditOutlined /> : <PlusOutlined />}
              {isEditMode ? "Edit Appointment" : "New Reservation"}
            </Space>
          </div>
        }
        open={showReservationForm}
        onCancel={() => {
          setShowReservationForm(false);
          setIsEditMode(false);
          setEditingAppointment(null);
          setSelectedCustomers([]);
          setBookingType('individual');
          setMaxCapacity(1);
          setClientInputMode("existing");
          setCustomClientName("");
        }}
        footer={null}
        destroyOnClose
        centered
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{
            staff: selectedStaff,
            appointmentDate: moment.utc(selectedDate),
            bookingType: 'individual',
            maxCapacity: 1,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="appointmentDate"
                label="Appointment Date"
                rules={[{ required: true, message: "Please select a date" }]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="YYYY-MM-DD"
                  disabledDate={(current) => {
                    return current && current < moment.utc().startOf("day");
                  }}
                  onChange={handleDateChange}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="staff"
                label="Staff Member"
                rules={[
                  { required: true, message: "Please select a staff member" },
                ]}
              >
                <Select placeholder="Select staff" loading={isLoading}>
                  {staffMembers &&
                    staffMembers
                      .filter((staff) => {
                        const roleType = staff.role?.toLowerCase();
                        return roleType !== "admin" && roleType !== "cleaner";
                      })
                      .map((staff) => (
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
            rules={[{ required: true, message: "Please select a time range" }]}
            extra="Select start and end times for the appointment (7:00 AM - 10:00 PM)"
          >
            <RangePicker
              format="h:mm A"
              minuteStep={15}
              style={{ width: "100%" }}
              showTime={{
                format: "h:mm A",
                hourStep: 1,
                minuteStep: 15,
                use12Hours: true,
              }}
              disabledTime={() => ({
                // ✅ Updated: 7 is now allowed, removed from disabled list
                disabledHours: () => [0, 1, 2, 3, 4, 5, 6, 22, 23],
                disabledMinutes: (hour) => {
                  return Array.from({ length: 60 })
                    .map((_, i) => i)
                    .filter((m) => m % 15 !== 0);
                },
              })}
            />
          </Form.Item>

          <Form.Item label="Client Information" required>
            <div style={{ marginBottom: "10px" }}>
              <Radio.Group
                buttonStyle="solid"
                style={{ marginBottom: "15px", width: "100%" }}
                onChange={(e) => {
                  setClientInputMode(e.target.value);
                  if (e.target.value === 'custom') {
                    setBookingType('individual');
                    setMaxCapacity(1);
                    setSelectedCustomers([]);
                    form.setFieldsValue({
                      clientName: undefined,
                      clientNames: [],
                      bookingType: 'individual',
                      maxCapacity: 1
                    });
                  }
                }}
                value={clientInputMode}
              >
                <Radio.Button
                  value="existing"
                  style={{ width: "50%", textAlign: "center" }}
                >
                  Select Existing Client(s)
                </Radio.Button>
                <Radio.Button
                  value="custom"
                  style={{ width: "50%", textAlign: "center" }}
                >
                  Enter New Client
                </Radio.Button>
              </Radio.Group>
            </div>

            {clientInputMode === "existing" ? (
              <>
                <Form.Item
                  name="bookingType"
                  label="Booking Type"
                  style={{ marginBottom: '12px' }}
                >
                  <Radio.Group
                    onChange={(e) => {
                      setBookingType(e.target.value);
                      if (e.target.value === 'individual') {
                        setMaxCapacity(1);
                        setSelectedCustomers([]);
                        form.setFieldsValue({ clientNames: [], maxCapacity: 1 });
                      } else {
                        setMaxCapacity(5);
                        form.setFieldsValue({ clientName: undefined, maxCapacity: 5 });
                      }
                    }}
                    value={bookingType}
                  >
                    <Radio value="individual">Individual (1 customer)</Radio>
                    <Radio value="group">Group (multiple customers)</Radio>
                  </Radio.Group>
                </Form.Item>

                {bookingType === 'individual' ? (
                  <Form.Item
                    name="clientName"
                    noStyle
                    rules={[
                      {
                        required: clientInputMode === "existing" && bookingType === 'individual',
                        message: "Please select a client",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Select client"
                      showSearch
                      allowClear
                      loading={isLoadingCustomers}
                      style={{ width: "100%" }}
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.children
                          .toLowerCase()
                          .indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {customers && Array.isArray(customers)
                        ? customers.map((customer) => (
                          <Select.Option key={customer._id} value={customer._id}>
                            {customer.customer_name}
                          </Select.Option>
                        ))
                        : null}
                    </Select>
                  </Form.Item>
                ) : (
                  <>
                    <Form.Item
                      name="clientNames"
                      label="Select Customers"
                      rules={[
                        {
                          required: clientInputMode === "existing" && bookingType === 'group',
                          message: "Please select at least one customer",
                        },
                      ]}
                    >
                      <Select
                        mode="multiple"
                        placeholder="Select customers"
                        showSearch
                        allowClear
                        loading={isLoadingCustomers}
                        style={{ width: "100%" }}
                        optionFilterProp="children"
                        maxTagCount="responsive"
                        filterOption={(input, option) =>
                          option.children
                            .toLowerCase()
                            .indexOf(input.toLowerCase()) >= 0
                        }
                        onChange={(values) => {
                          setSelectedCustomers(values);
                          if (values.length > maxCapacity) {
                            setMaxCapacity(values.length);
                            form.setFieldsValue({ maxCapacity: values.length });
                          }
                        }}
                      >
                        {customers && Array.isArray(customers)
                          ? customers.map((customer) => (
                            <Select.Option key={customer._id} value={customer._id}>
                              {customer.customer_name}
                            </Select.Option>
                          ))
                          : null}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="maxCapacity"
                      label="Maximum Capacity"
                      extra={`Currently selected: ${selectedCustomers.length} customer(s)`}
                    >
                      <InputNumber
                        min={selectedCustomers.length || 1}
                        max={20}
                        value={maxCapacity}
                        onChange={(value) => setMaxCapacity(value || 1)}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </>
                )}
              </>
            ) : (
              <Form.Item
                name="customClientName"
                noStyle
                rules={[
                  {
                    required: clientInputMode === "custom",
                    message: "Please enter client name",
                  },
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

          {/* Phone input removed */}

          <Form.Item
            name="service"
            label="Service"
            rules={[{ required: true, message: "Please select a service" }]}
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
              notFoundContent={
                isLoadingProducts ? <Spin size="small" /> : "No services found"
              }
            >
              {formattedProducts.map((product) => (
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

          <Form.Item name="specialRequests" label="Special Requests">
            <TextArea
              placeholder="Enter any special requests or notes"
              rows={4}
            />
          </Form.Item>

          {bookingType === 'group' && (
            <Form.Item name="notes" label="Additional Notes">
              <TextArea
                placeholder="Enter any additional notes for the group booking"
                rows={2}
              />
            </Form.Item>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "24px",
            }}
          >
            <Space>
              {isEditMode && editingAppointment && (
                <Popconfirm
                  title="Delete this appointment?"
                  description="This action cannot be undone."
                  onConfirm={() => {
                    handleDeleteAppointment.mutate(editingAppointment.id);
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
              <Button onClick={() => {
                setShowReservationForm(false);
                setIsEditMode(false);
                setEditingAppointment(null);
              }}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={isEditMode ? <EditOutlined /> : <CheckCircleOutlined />}
              >
                {isEditMode ? "Update Appointment" : "Confirm Booking"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CalendarView;