import React, { useEffect, useState } from "react";
import { Calendar, Modal, message, Badge, TimePicker, Button, Popover, Select, Space } from "antd";
import { MenuItem, FormControl, InputAdornment } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, SolutionOutlined } from "@ant-design/icons";
import moment from "moment";
import PersonIcon from "@mui/icons-material/Person";
import { fetchAllUsersList } from "@services/users";
import { useForm, Controller } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { createShift, fetchShifts, deleteShift, updateShift } from "../../features/Employee/ShiftActions";

const { confirm } = Modal;

interface ShiftData {
  _id?: string; // Optional ID for existing shifts
  employee_id: string;
  day: string;
  time: {
    start: moment.Moment;
    end: moment.Moment;
  };
}

const RestaurantShiftSchedule = () => {
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftData | null>(null);

  const { control, handleSubmit, reset } = useForm<ShiftData>({
    defaultValues: { employee_id: "", day: "", time: { start: moment(), end: moment() } },
  });

  const { data: users } = useQuery(["users"], fetchAllUsersList, { retry: 3 });

  const dispatch = useDispatch();

  const handleSave = (data: ShiftData) => {
    const shiftDetails: ShiftData = {
      ...data,
      time: {
        start: moment(data.time.start).toISOString(),
        end: moment(data.time.end).toISOString()
      }
    };

    if (editingShift) {
      shiftDetails._id = editingShift._id; // Include the ID for updating
      dispatch(updateShift(shiftDetails));
      message.success("Shift updated successfully");
    } else {
      dispatch(createShift(shiftDetails));
      message.success("Shift added successfully");
    }

    reset();
    setIsAddModalVisible(false);
    setIsEditModalVisible(false);
    setEditingShift(null);
  };

  const handleEditShift = (shift: ShiftData) => {
    setEditingShift(shift);
    reset({
      employee_id: shift.employee_id,
      day: shift.day,
      time: {
        start: moment(shift.time.start),
        end: moment(shift.time.end)
      }
    });
    setIsEditModalVisible(true);
  };

  const handleDeleteShift = (shiftId: string) => {
    confirm({
      title: "Are you sure you want to delete this shift?",
      icon: <ExclamationCircleOutlined />,
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk() {
        dispatch(deleteShift(shiftId)).then(() => {
          message.success("Shift deleted successfully");
        });
      },
    });
  };

  const handleModalCancel = () => {
    setIsAddModalVisible(false);
    setIsEditModalVisible(false);
    setEditingShift(null);
    reset();
  };

  useEffect(() => {
    dispatch(fetchShifts());
  }, [dispatch]);

  const shifts = useSelector((state) => state.shifts.shifts);
  const loading = useSelector((state: any) => state.shift?.loading || false);
  const error = useSelector((state: any) => state.shift?.error || null);

  const getListData = (value: moment.Moment) => {
    if (!Array.isArray(shifts)) return [];
    return shifts.filter((shift) => shift.day === value.format("dddd"));
  };

  const dateCellRender = (value: moment.Moment) => {
    const listData = getListData(value);
    return (
      <ul className="events">
        {listData.map((item) => (
          <li key={item.employee_id}>
            <Popover
              content={
                <Space>
                  <Button icon={<EditOutlined />} size="small" onClick={() => handleEditShift(item)}>
                    Edit
                  </Button>
                  <Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDeleteShift(item._id)}>
                    Delete
                  </Button>
                </Space>
              }
              trigger="hover"
            >
              <Badge
                status="processing"
                text={`${item.employee_id.fullname}: ${moment(item.time.start).format("HH:mm")} - ${moment(item.time.end).format("HH:mm")}`}
              />
            </Popover>
          </li>
        ))}
      </ul>
    );
  };

  const ShiftForm = () => (
    <form onSubmit={handleSubmit(handleSave)}>
      <Controller
        name="employee_id" // Keeping it as employee_id
        control={control}
        rules={{ required: "User is required" }}
        render={({ field }) => (
          <FormControl fullWidth margin="normal">
            <Select
              {...field}
              label="Users"
              startAdornment={
                <InputAdornment position="start">
                  <PersonIcon />
                </InputAdornment>
              }
              onChange={(value) => {
                // On update, set the value as an object; on create, set it as a primitive
                field.onChange({ _id: value });
              }}
              value={editingShift ? editingShift.employee_id._id : field.value} // Auto-select for edit, default for create
            >
              <MenuItem value="">Select User</MenuItem>
              {users && users.map((user) => (
                <MenuItem key={user._id} value={user._id}>
                  {user.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      />

      <Controller
        name="day"
        control={control}
        rules={{ required: "Please select a day" }}
        render={({ field }) => (
          <FormControl fullWidth margin="normal">
            <Select displayEmpty {...field}>
              <MenuItem value="" disabled>
                Select a day
              </MenuItem>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                (day) => (
                  <MenuItem key={day} value={day}>
                    {day}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>
        )}
      />
      <Controller
        name="time.start"
        control={control}
        rules={{ required: "Please select shift start time" }}
        render={({ field }) => (
          <TimePicker
            format="HH:mm"
            {...field}
            placeholder="Start Time"
            onChange={(time) => field.onChange(time)} // time should be a moment object
          />
        )}
      />
      <Controller
        name="time.end"
        control={control}
        rules={{ required: "Please select shift end time" }}
        render={({ field }) => (
          <TimePicker
            format="HH:mm"
            {...field}
            placeholder="End Time"
            onChange={(time) => field.onChange(time)} // time should be a moment object
          />
        )}
      />
    </form>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        <SolutionOutlined /> Weekly Shift Schedule
      </h1>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setIsAddModalVisible(true)}
        className="mb-4"
      >
        Add Shift
      </Button>
      {loading && <p>Loading shifts...</p>}
      {error && <p>Error loading shifts: {error}</p>}
      <Calendar cellRender={dateCellRender} fullscreen />
      <Modal
        title={editingShift ? "Edit Shift" : "Add New Shift"}
        open={isAddModalVisible || isEditModalVisible}
        onOk={handleSubmit(handleSave)} // Use handleSubmit for both Add and Edit
        onCancel={handleModalCancel}
        centered
      >
        <ShiftForm />
      </Modal>
    </div>
  );
};

export default RestaurantShiftSchedule;
