import {
  ClockCircleOutlined,
  EditOutlined,
  SnippetsOutlined,
  SwitcherOutlined,
} from "@ant-design/icons";
import {
  ModalForm,
  ProFormDependency,
  ProFormSelect,
} from "@ant-design/pro-components";
import { createShift, fetchAllShifts, updateShift } from "@services/shifts";
import { fetchAllUsersList } from "@services/users";
import { useMutation, useQuery } from "@tanstack/react-query";
import ShowConfirm from "@utils/ConfirmUtil";
import { Button, Form, Space, message } from "antd";
import { useEffect, useState } from "react";

interface EmployeeShiftModalProps {
  actionRef: any;
  edit: boolean;
  data: any;
}

const EmployeeShiftModal: React.FC<EmployeeShiftModalProps> = ({
  actionRef,
  edit,
  data,
}) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

  // Generate time options in 30-minute intervals
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        options.push({
          label: timeString,
          value: timeString,
        });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Populate form data when modal opens in edit mode
  useEffect(() => {
    if (edit && data) {
      form.setFieldsValue({
        employee_id: data.employee_id?._id,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
      });
    }
  }, [data, edit, form]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };

  //  Fetch users using React Query
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: fetchAllUsersList,
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const UserRequest = async () => {
    const data = users?.map((e: { username: string; _id: string }) => {
      return { label: e.username, value: e._id };
    });
    return data;
  };

  const createShiftMutation = useMutation({
    mutationFn: createShift,
    onSuccess: () => {
        // close the modal
        setOpen(false);
        actionRef.current.reset();
      // Refetch shift data after creation
      fetchAllShifts();
    },
    onError: (error) => {
      console.error("Create error:", error);
      actionRef.current.reset();
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: updateShift,
    onSuccess: () => {
        // close the modal
        setOpen(false);
        actionRef.current.reset();
      // Refetch shift data after update
      fetchAllShifts();
    },
    onError: (error) => {
      console.error("Update error:", error);
      actionRef.current.reset();
    },
  });

  const handleFinish = async (values: any) => {
    try {
      // Validate that end time is after start time
      if (values.startTime >= values.endTime) {
        message.error("End time must be after start time");
        return false;
      }
      const confirmed = await ShowConfirm({
        title: `Are you sure you want to ${
          edit ? "update this" : "add new"
        } shift?`,
        position: true,
      });
      if (confirmed) {
        edit
          ? await updateShiftMutation.mutate({ ...values, _id: data?._id })
          : await createShiftMutation.mutate(values);
        setOpen(false);
        actionRef.current.reset();
        return true;
      }
    } catch (error) {
      console.error("Error saving shift:", error);
    }
  };

  return (
    <ModalForm
      title={
        <Space>
          <SnippetsOutlined />
          {edit ? "Edit Employee Shift" : "Add New Employee Shift"}
        </Space>
      }
      form={form}
      autoFocusFirstInput
      open={open}
      onOpenChange={handleOpenChange}
      modalProps={{
        destroyOnClose: true,
        centered: true,
        onCancel: () => {
          form.resetFields();
        },
      }}
      initialValues={
        edit
          ? {
              employee_id: data.employee_id?._id,
              dayOfWeek: data.dayOfWeek,
              startTime: data.startTime,
              endTime: data.endTime,
            }
          : {}
      }
      submitTimeout={2000}
      submitter={{
        searchConfig: {
          submitText: edit ? "Update Shift" : "Create Shift",
        },
        resetButtonProps: {
          style: { display: "none" },
        },
        submitButtonProps: {
          icon: <ClockCircleOutlined />,
        },
      }}
      trigger={
        edit ? (
          <Button
            key="button"
            icon={<EditOutlined style={{ color: "#6c1c2c" }} />}
          >
            Edit
          </Button>
        ) : (
          <Button type="primary" key="button" icon={<SwitcherOutlined />}>
            New Employee Shift
          </Button>
        )
      }
      onFinish={handleFinish}
    >
      <ProFormSelect
        name="employee_id"
        label="Employee"
        placeholder="Select employee"
        rules={[{ required: true, message: "Please select an employee" }]}
        request={UserRequest}
        fieldProps={{
          showSearch: true,
          filterOption: (input: string, option: any) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase()),
        }}
      />

      <ProFormSelect
        name="dayOfWeek"
        label="Day of Week"
        placeholder="Select day of week"
        rules={[{ required: true, message: "Please select a day" }]}
        options={[
          { label: "Monday", value: "Monday" },
          { label: "Tuesday", value: "Tuesday" },
          { label: "Wednesday", value: "Wednesday" },
          { label: "Thursday", value: "Thursday" },
          { label: "Friday", value: "Friday" },
          { label: "Saturday", value: "Saturday" },
          { label: "Sunday", value: "Sunday" },
        ]}
        fieldProps={{
          showSearch: true
        }}
      />

      <Space
        size="large"
        style={{
          display: "flex",
          marginBottom: 16,
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <ProFormSelect
          name="startTime"
          placeholder="Select start time"
          label="Start Time"
          width="md"
          rules={[{ required: true, message: "Please select a start time" }]}
          options={timeOptions}
          fieldProps={{
            showSearch: true,
            prefix: <ClockCircleOutlined />,
          }}
        />

        <ProFormSelect
          name="endTime"
          label="End Time"
          placeholder="Select end time"
          width="md"
          rules={[{ required: true, message: "Please select an end time" }]}
          options={timeOptions}
          fieldProps={{
            showSearch: true,
            prefix: <ClockCircleOutlined />,
          }}
        />
      </Space>

      <ProFormDependency name={["startTime", "endTime"]}>
        {({ startTime, endTime }) => {
          if (startTime && endTime && startTime >= endTime) {
            return (
              <div style={{ color: "#ff4d4f", marginTop: -8 }}>
                End time must be after start time
              </div>
            );
          }
          return null;
        }}
      </ProFormDependency>
    </ModalForm>
  );
};

export default EmployeeShiftModal;
