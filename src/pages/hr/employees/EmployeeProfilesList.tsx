import React, { useState } from "react";
import { Typography, Card, Table, Button, Space, Tag, Input, Select, Modal, Form, message, Steps, Radio, Row, Col, Drawer, Descriptions, DatePicker, Upload } from "antd";
import { PlusOutlined, EditOutlined, EyeOutlined, SearchOutlined, UserOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEmployeeProfiles, createEmployeeProfile, updateEmployeeProfile, getEmployeeProfileById, terminateEmployee, updateEmployeeStatus, fetchBanks, importEmployeeProfiles, downloadEmployeeProfileTemplate } from "@services/hr";
import dayjs from "dayjs";
import { createUser } from "@features/Auth/AuthActions";
import { useAppDispatch, useAppSelector } from "src/store";
import { fetchAllUsers } from "@features/Auth/AuthActions";
import { fetchAllDepartments } from "@services/crm/departments";

const { Title } = Typography;
const { Option } = Select;
const { Step } = Steps;

const EmployeeProfilesList: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [isEditDrawerVisible, setIsEditDrawerVisible] = useState(false);
  const [isSuspendModalVisible, setIsSuspendModalVisible] = useState(false);
  const [isTerminateModalVisible, setIsTerminateModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const [createdUserId, setCreatedUserId] = useState<string>("");
  const [userSelectionMode, setUserSelectionMode] = useState<"new" | "existing">("new");
  const [form] = Form.useForm();
  const [userForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [terminateForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["hr-employee-profiles", { status: statusFilter, search: searchText }],
    queryFn: () => fetchEmployeeProfiles({ status: statusFilter, search: searchText }),
  });

  const { data: employeeDetail } = useQuery({
    queryKey: ["hr-employee-profile", selectedEmployeeId],
    queryFn: () => getEmployeeProfileById(selectedEmployeeId),
    enabled: !!selectedEmployeeId && isDetailDrawerVisible,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => dispatch(fetchAllUsers()).unwrap(),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["hr-departments"],
    queryFn: () => fetchAllDepartments(),
  });

  const { data: banksData } = useQuery({
    queryKey: ["hr-banks"],
    queryFn: () => fetchBanks({}),
  });

  const departments = Array.isArray(departmentsData) ? departmentsData : departmentsData?.departments || [];
  const banks = Array.isArray(banksData) ? banksData : banksData?.banks || [];

  const { newmessage, IsError, isLoading: isUserCreating } = useAppSelector((state) => state.auth);

  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.profiles || [];
  const users = Array.isArray(usersData) ? usersData : [];

  const createMutation = useMutation({
    mutationFn: createEmployeeProfile,
    onSuccess: () => {
      message.success("Employee profile created successfully");
      setIsModalVisible(false);
      setCurrentStep(0);
      form.resetFields();
      userForm.resetFields();
      setCreatedUserId("");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-profiles"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to create employee profile");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateEmployeeProfile(id, data),
    onSuccess: () => {
      message.success("Employee profile updated successfully");
      setIsEditDrawerVisible(false);
      editForm.resetFields();
      setSelectedEmployeeId("");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-profiles"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to update employee profile");
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => updateEmployeeProfile(id, { employee_status: "Suspended" }),
    onSuccess: () => {
      message.success("Employee suspended successfully");
      setIsSuspendModalVisible(false);
      setSelectedEmployeeId("");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-profiles"] });
    },
    onError: (error: any) => {
      message.error(error.message || "Failed to suspend employee");
    },
  });

  const terminateMutation = useMutation({
    mutationFn: terminateEmployee,
    onSuccess: () => {
      message.success("Employee terminated successfully");
      setIsTerminateModalVisible(false);
      terminateForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["hr-employee-profiles"] });
    },
    onError: (error: any) => {
      message.error(error.message || "Failed to terminate employee");
    },
  });

  const importMutation = useMutation({
    mutationFn: importEmployeeProfiles,
    onSuccess: (data) => {
      message.success(`Imported ${data.imported} employee profiles successfully`);
      setIsImportModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ["hr-employee-profiles"] });
      if (data.errors && data.errors.length > 0) {
        message.warning(`${data.skipped} profiles skipped due to errors`);
      }
    },
    onError: (error: any) => {
      message.error(error.message || "Failed to import employee profiles");
    },
  });

  const handleImportEmployees = (file: File) => {
    importMutation.mutate(file);
    return false;
  };

  const handleDownloadTemplate = () => {
    downloadEmployeeProfileTemplate();
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "user_id",
      key: "name",
      render: (user: any) => user?.fullname || "-",
    },
    {
      title: "Email",
      dataIndex: "user_id",
      key: "email",
      render: (user: any) => user?.email || "-",
    },
    {
      title: "Department",
      dataIndex: "department_id",
      key: "department",
      render: (dept: any) => dept?.name || "-",
    },
    {
      title: "Position",
      dataIndex: "position",
      key: "position",
      render: (position: string) => position || "-",
    },
    {
      title: "Shop",
      dataIndex: "shop_id",
      key: "shop",
      render: (shop: any) => shop?.name || "-",
    },
    {
      title: "Employment Type",
      dataIndex: "employment_type",
      key: "employment_type",
      render: (type: string) => type || "-",
    },
    {
      title: "Status",
      dataIndex: "employee_status",
      key: "employee_status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          Active: "green",
          "On Probation": "orange",
          Suspended: "red",
          Terminated: "default",
          Resigned: "default",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Hire Date",
      dataIndex: "hire_date",
      key: "hire_date",
      render: (date: string) => date ? dayjs(date).format("DD MMM YYYY") : "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewEmployee(record._id)}>
            View
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditEmployee(record)}>
            Edit
          </Button>
          {record.employee_status === "Active" && (
            <Button
              type="link"
              danger
              onClick={() => handleSuspendEmployee(record._id)}
            >
              Suspend
            </Button>
          )}
          {record.employee_status !== "Terminated" && record.employee_status !== "Resigned" && (
            <Button
              type="link"
              danger
              onClick={() => handleTerminateEmployee(record._id)}
            >
              Terminate
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleCreateUser = async (values: any) => {
    try {
      const result = await dispatch(createUser(values)).unwrap();
      if (result?._id) {
        setCreatedUserId(result._id);
        setCurrentStep(1);
        message.success("User created successfully. Now fill in employee details.");
      }
    } catch (error: any) {
      message.error(error?.message || "Failed to create user");
    }
  };

  const handleSelectUser = (userId: string) => {
    const selectedUser = users.find((user: any) => user._id === userId);
    setCreatedUserId(userId);
    
    // Pre-fill employee form with user data
    if (selectedUser) {
      const nameParts = selectedUser.fullname?.split(' ') || ['', ''];
      form.setFieldsValue({
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        employee_id: selectedUser.idNumber || '',
      });
    }
    
    setCurrentStep(1);
  };

  const handleCreateEmployee = (values: any) => {
    createMutation.mutate({
      ...values,
      user_id: createdUserId,
    });
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setCurrentStep(0);
    form.resetFields();
    userForm.resetFields();
    setCreatedUserId("");
    setUserSelectionMode("new");
  };

  const handleViewEmployee = (id: string) => {
    setSelectedEmployeeId(id);
    setIsDetailDrawerVisible(true);
  };

  const handleDetailDrawerClose = () => {
    setIsDetailDrawerVisible(false);
    setSelectedEmployeeId("");
  };

  const handleEditEmployee = (record: any) => {
    setSelectedEmployeeId(record._id);
    editForm.setFieldsValue({
      position: record.position,
      employment_type: record.employment_type,
      employee_status: record.employee_status,
      hire_date: record.hire_date ? dayjs(record.hire_date) : null,
      bank_account_number: record.bank_account_number,
      bank_id: record.bank_id?._id,
      basic_salary: record.wage?.baseAmount,
      kra_pin: record.kra_pin,
      department_id: record.department_id?._id,
    });
    setIsEditDrawerVisible(true);
  };

  const handleEditDrawerClose = () => {
    setIsEditDrawerVisible(false);
    editForm.resetFields();
    setSelectedEmployeeId("");
  };

  const handleEditSubmit = (values: any) => {
    updateMutation.mutate({
      id: selectedEmployeeId,
      data: {
        position: values.position,
        employment_type: values.employment_type,
        employee_status: values.employee_status,
        hire_date: values.hire_date?.format("YYYY-MM-DD"),
        bank_account_number: values.bank_account_number,
        bank_id: values.bank_id,
        basic_salary: values.basic_salary,
        kra_pin: values.kra_pin,
        department_id: values.department_id,
      },
    });
  };

  const handleSuspendEmployee = (id: string) => {
    setSelectedEmployeeId(id);
    setIsSuspendModalVisible(true);
  };

  const handleConfirmSuspend = () => {
    suspendMutation.mutate(selectedEmployeeId);
  };

  const handleTerminateEmployee = (id: string) => {
    setSelectedEmployeeId(id);
    setIsTerminateModalVisible(true);
  };

  const handleConfirmTerminate = (values: any) => {
    terminateMutation.mutate({
      id: selectedEmployeeId,
      data: {
        reason: values.reason,
        termination_date: values.termination_date?.format("YYYY-MM-DD"),
      },
    });
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            Employee Profiles
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ["hr-employee-profiles"] })}>
              Refresh
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleDownloadTemplate}>
              Download Template
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsImportModalVisible(true)}>
              Import Employees
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
              Add Employee
            </Button>
          </Space>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <Input
            placeholder="Search employees..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="Active">Active</Option>
            <Option value="On Probation">On Probation</Option>
            <Option value="Suspended">Suspended</Option>
            <Option value="Terminated">Terminated</Option>
            <Option value="Resigned">Resigned</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={employees}
          loading={isLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Add New Employee"
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={800}
      >
        <Row gutter={24}>
          <Col span={6}>
            <Steps current={currentStep} direction="vertical" style={{ marginTop: 24 }}>
              <Step title="Select User" description="Choose or create user" />
              <Step title="Employee Details" description="Fill employee information" />
            </Steps>
          </Col>
          <Col span={18}>
            {currentStep === 0 && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Radio.Group value={userSelectionMode} onChange={(e) => setUserSelectionMode(e.target.value)} buttonStyle="solid">
                    <Radio.Button value="new">Create New User</Radio.Button>
                    <Radio.Button value="existing">Select Existing User</Radio.Button>
                  </Radio.Group>
                </div>

                {userSelectionMode === "new" && (
                  <Form form={userForm} layout="vertical" onFinish={handleCreateUser}>
                    {IsError && (
                      <div style={{ marginBottom: 16, padding: 12, background: "#fff2f0", border: "1px solid #ffccc7", borderRadius: 4 }}>
                        {newmessage}
                      </div>
                    )}
                    <Form.Item name="fullname" label="Full Name" rules={[{ required: true }]}>
                      <Input prefix={<UserOutlined />} />
                    </Form.Item>
                    <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                      <Input prefix={<UserOutlined />} />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="pin" label="PIN" rules={[{ required: true, pattern: /^[0-9]{4}$/, message: "PIN must be 4 digits" }]}>
                      <Input.Password maxLength={4} />
                    </Form.Item>
                    <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="idNumber" label="ID Number" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="isAdmin" label="Is Admin" initialValue="false">
                      <Select>
                        <Option value="false">No</Option>
                        <Option value="true">Yes</Option>
                      </Select>
                    </Form.Item>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                      <Button type="primary" htmlType="submit" loading={isUserCreating}>
                        Create User & Continue
                      </Button>
                    </div>
                  </Form>
                )}

                {userSelectionMode === "existing" && (
                  <div style={{ marginTop: 16 }}>
                    <Form.Item label="Select User" required>
                      <Select
                        placeholder="Select a user"
                        style={{ width: "100%" }}
                        onChange={handleSelectUser}
                        showSearch
                        filterOption={(input, option) =>
                          String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                        }
                        options={users.map((user: any) => ({
                          label: `${user.fullname} (${user.email})`,
                          value: user._id,
                        }))}
                      />
                    </Form.Item>
                  </div>
                )}
              </div>
            )}

            {currentStep === 1 && (
              <Form form={form} layout="vertical" onFinish={handleCreateEmployee}>
                <Form.Item name="employee_id" label="Employee ID" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="department" label="Department">
                  <Select placeholder="Select department" allowClear showSearch>
                    {departments.map((dept: any) => (
                      <Option key={dept._id} value={dept._id}>
                        {dept.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="position" label="Position">
                  <Input />
                </Form.Item>
                <Form.Item name="employment_type" label="Employment Type" initialValue="Full-time">
                  <Select>
                    <Option value="Full-time">Full-time</Option>
                    <Option value="Part-time">Part-time</Option>
                    <Option value="Contract">Contract</Option>
                    <Option value="Intern">Intern</Option>
                    <Option value="Probation">Probation</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="employee_status" label="Status" initialValue="Active">
                  <Select>
                    <Option value="Active">Active</Option>
                    <Option value="On Probation">On Probation</Option>
                    <Option value="Suspended">Suspended</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="join_date" label="Join Date">
                  <Input type="date" />
                </Form.Item>
                <Form.Item name="basic_salary" label="Basic Salary">
                  <Input type="number" />
                </Form.Item>
                <Form.Item name="bank_account" label="Bank Account">
                  <Input />
                </Form.Item>
                <Form.Item name="kra_pin" label="KRA PIN">
                  <Input />
                </Form.Item>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                  <Button onClick={prevStep}>Back</Button>
                  <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                    Create Employee Profile
                  </Button>
                </div>
              </Form>
            )}
          </Col>
        </Row>
      </Modal>

      <Drawer
        title="Employee Details"
        placement="right"
        width={720}
        open={isDetailDrawerVisible}
        onClose={handleDetailDrawerClose}
      >
        {employeeDetail && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Name" span={2}>
              {employeeDetail.user_id?.fullname || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {employeeDetail.user_id?.email || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {employeeDetail.user_id?.phone || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Department">
              {employeeDetail.department_id?.name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Position">
              {employeeDetail.position || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Shop">
              {employeeDetail.shop_id?.name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Employment Type">
              {employeeDetail.employment_type || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={employeeDetail.employee_status === "Active" ? "green" : "default"}>
                {employeeDetail.employee_status || "-"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Hire Date" span={2}>
              {employeeDetail.hire_date ? dayjs(employeeDetail.hire_date).format("DD MMM YYYY") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Bank" span={2}>
              {employeeDetail.bank_name || employeeDetail.bank_id?.bank_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Bank Branch" span={2}>
              {employeeDetail.bank_branch || employeeDetail.bank_id?.bank_branch || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Bank Account Number" span={2}>
              {employeeDetail.bank_account_number || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Salary" span={2}>
              {employeeDetail.wage?.baseAmount ? `KES ${employeeDetail.wage.baseAmount.toLocaleString()}` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="KRA PIN" span={2}>
              {employeeDetail.kra_pin || "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Drawer
        title="Edit Employee Details"
        placement="right"
        width={720}
        open={isEditDrawerVisible}
        onClose={handleEditDrawerClose}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item name="department_id" label="Department">
            <Select placeholder="Select department" allowClear showSearch>
              {departments.map((dept: any) => (
                <Option key={dept._id} value={dept._id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="position" label="Position" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="employment_type" label="Employment Type" rules={[{ required: true }]}>
            <Select>
              <Option value="Full-time">Full-time</Option>
              <Option value="Part-time">Part-time</Option>
              <Option value="Contract">Contract</Option>
              <Option value="Intern">Intern</Option>
              <Option value="Probation">Probation</Option>
            </Select>
          </Form.Item>
          <Form.Item name="employee_status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Option value="Active">Active</Option>
              <Option value="On Probation">On Probation</Option>
              <Option value="Suspended">Suspended</Option>
              <Option value="Terminated">Terminated</Option>
              <Option value="Resigned">Resigned</Option>
            </Select>
          </Form.Item>
          <Form.Item name="hire_date" label="Hire Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="basic_salary" label="Basic Salary">
            <Input type="number" placeholder="Enter basic salary" />
          </Form.Item>
          <Form.Item name="bank_id" label="Bank">
            <Select placeholder="Select bank" allowClear showSearch>
              {banks.map((bank: any) => (
                <Option key={bank._id} value={bank._id}>
                  {bank.bank_name} - {bank.bank_branch}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="bank_account_number" label="Bank Account Number">
            <Input />
          </Form.Item>
          <Form.Item name="kra_pin" label="KRA PIN">
            <Input />
          </Form.Item>
          <div style={{ marginTop: 24, textAlign: "right" }}>
            <Button onClick={handleEditDrawerClose} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Drawer>

      <Modal
        title="Suspend Employee"
        open={isSuspendModalVisible}
        onOk={handleConfirmSuspend}
        onCancel={() => setIsSuspendModalVisible(false)}
        confirmLoading={suspendMutation.isPending}
        okText="Suspend"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to suspend this employee? They will not be able to access the system while suspended.</p>
      </Modal>

      <Modal
        title="Terminate Employee"
        open={isTerminateModalVisible}
        onCancel={() => {
          setIsTerminateModalVisible(false);
          terminateForm.resetFields();
        }}
        footer={null}
      >
        <Form form={terminateForm} layout="vertical" onFinish={handleConfirmTerminate}>
          <Form.Item
            name="termination_date"
            label="Termination Date"
            rules={[{ required: true, message: "Please select termination date" }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Reason for Termination"
            rules={[{ required: true, message: "Please provide a reason" }]}
          >
            <Input.TextArea rows={4} placeholder="Provide reason for termination..." />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Button
              onClick={() => {
                setIsTerminateModalVisible(false);
                terminateForm.resetFields();
              }}
              style={{ marginRight: 8 }}
            >
              Cancel
            </Button>
            <Button type="primary" danger htmlType="submit" loading={terminateMutation.isPending}>
              Terminate
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Import Employees"
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        footer={null}
      >
        <Upload
          accept=".xlsx,.xls"
          beforeUpload={handleImportEmployees}
          showUploadList={false}
        >
          <Button icon={<PlusOutlined />}>Select Excel File</Button>
        </Upload>
        {importMutation.isPending && <p style={{ marginTop: 16 }}>Importing employees...</p>}
      </Modal>
    </div>
  );
};

export default EmployeeProfilesList;
