import React, { useState } from "react";
import {
  Calendar,
  Select,
  Button,
  Form,
  Modal,
  message,
  Badge,
  TimePicker,
  Row,
  Col,
  Popover,
  Space,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  FileAddFilled,
  SolutionOutlined,
} from "@ant-design/icons";
import moment from "moment";

const { Option } = Select;
const { RangePicker } = TimePicker;
const { confirm } = Modal;

const RestaurantShiftSchedule = () => {
  const [shifts, setShifts] = useState([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [form] = Form.useForm();

  const handleAddShift = () => {
    setIsAddModalVisible(true);
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    form.setFieldsValue({
      employee: shift.employee,
      day: shift.day,
      timeRange: [
        moment(shift.timeRange[0], "HH:mm"),
        moment(shift.timeRange[1], "HH:mm"),
      ],
    });
    setIsEditModalVisible(true);
  };

  const handleDeleteShift = (shiftId) => {
    confirm({
      title: "Are you sure you want to delete this shift?",
      icon: <ExclamationCircleOutlined />,
      content: "This action cannot be undone.",
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk() {
        const updatedShifts = shifts.filter((shift) => shift.id !== shiftId);
        setShifts(updatedShifts);
        message.success("Shift deleted successfully");
      },
    });
  };

  const handleAddModalOk = () => {
    form.validateFields().then((values) => {
      const newShift = {
        id: Date.now(),
        employee: values.employee,
        day: values.day,
        timeRange: [
          values.timeRange[0].format("HH:mm"),
          values.timeRange[1].format("HH:mm"),
        ],
      };
      setShifts([...shifts, newShift]);
      setIsAddModalVisible(false);
      form.resetFields();
      message.success("Shift added successfully");
    });
  };

  const handleEditModalOk = () => {
    form.validateFields().then((values) => {
      const updatedShifts = shifts.map((shift) =>
        shift.id === editingShift.id
          ? {
              ...shift,
              employee: values.employee,
              day: values.day,
              timeRange: [
                values.timeRange[0].format("HH:mm"),
                values.timeRange[1].format("HH:mm"),
              ],
            }
          : shift
      );
      setShifts(updatedShifts);
      setIsEditModalVisible(false);
      setEditingShift(null);
      form.resetFields();
      message.success("Shift updated successfully");
    });
  };

  const handleModalCancel = () => {
    setIsAddModalVisible(false);
    setIsEditModalVisible(false);
    setEditingShift(null);
    form.resetFields();
  };

  const getListData = (value) => {
    const dayOfWeek = value.format("dddd");
    return shifts.filter((shift) => shift.day === dayOfWeek);
  };

  const dateCellRender = (value) => {
    const listData = getListData(value);
    return (
      <ul className="events">
        {listData.map((item) => (
          <li key={item.id}>
            <Popover
              content={
                <Space>
                  <Button
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => handleEditShift(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                    onClick={() => handleDeleteShift(item.id)}
                  >
                    Delete
                  </Button>
                </Space>
              }
              trigger="hover"
            >
              <Badge
                status="processing"
                text={`${item.employee}: ${item.timeRange[0]}-${item.timeRange[1]}`}
              />
            </Popover>
          </li>
        ))}
      </ul>
    );
  };

  const ShiftForm = () => (
    <Form form={form} layout="vertical">
      <Form.Item
        name="employee"
        label="Employee"
        rules={[{ required: true, message: "Please select an employee" }]}
      >
        <Select placeholder="Select an employee">
          <Option value="John Doe">John Doe</Option>
          <Option value="Jane Smith">Jane Smith</Option>
          <Option value="Bob Johnson">Bob Johnson</Option>
        </Select>
      </Form.Item>
      <Form.Item
        name="day"
        label="Day of Week"
        rules={[{ required: true, message: "Please select a day" }]}
      >
        <Select placeholder="Select a day">
          {[
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ].map((day) => (
            <Option key={day} value={day}>
              {day}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        name="timeRange"
        label="Shift Time"
        rules={[{ required: true, message: "Please select shift time" }]}
      >
        <RangePicker format="HH:mm" />
      </Form.Item>
    </Form>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        <SolutionOutlined /> Weekly Shift Schedule
      </h1>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={handleAddShift}
        className="mb-4"
      >
        Add Shift
      </Button>
      <Calendar
        cellRender={dateCellRender}
        fullscreen
        // mode="month"
        // validRange={[moment().startOf("month"), moment().endOf("month")]}
      />
      <Modal
        title="Add New Shift"
        open={isAddModalVisible}
        onOk={handleAddModalOk}
        onCancel={handleModalCancel}
        centered
      >
        <ShiftForm />
      </Modal>
      <Modal
        title="Edit Shift"
        open={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={handleModalCancel}
        centered
      >
        <ShiftForm />
      </Modal>
    </div>
  );
};

export default RestaurantShiftSchedule;
