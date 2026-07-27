import React, { useState } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Input,
  Select,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  message,
  Drawer,
  Descriptions,
  Upload,
  Row,
  Col,
  Steps,
  Tabs,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  UploadOutlined,
  EyeOutlined,
  EditOutlined,
  DollarOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  uploadEmployeeDocument,
  fetchEmployeeDocuments,
  deleteEmployeeDocument,
  type Employee,
  type CreateEmployeeParams,
} from "@services/bandu";
import { fetchAllUsersList } from "@services/users";
import { fetchAllDepartments, type Department } from "@services/crm/departments";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
};

const EmployeeManagement: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDocumentModalVisible, setIsDocumentModalVisible] = useState(false);
  const [isAllowanceModalVisible, setIsAllowanceModalVisible] = useState(false);
  const [isBenefitModalVisible, setIsBenefitModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState("details");
  const [form] = Form.useForm();
  const [documentForm] = Form.useForm();
  const [allowanceForm] = Form.useForm();
  const [benefitForm] = Form.useForm();
  const [allFormValues, setAllFormValues] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();

  // Fetch crew/users for selection
  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => fetchAllUsersList({ page: 1, limit: 1000 }),
  });

  const users = Array.isArray(usersData) ? usersData : usersData?.users || [];

  // Fetch departments for selection
  const { data: departmentsData } = useQuery({
    queryKey: ["departments-list"],
    queryFn: () => fetchAllDepartments({ is_active: true }),
  });

  const departments = departmentsData?.departments || [];

  // Fetch employees
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["bandu-employees", searchText, statusFilter],
    queryFn: () => fetchEmployees({ search: searchText, employment_status: statusFilter }),
  });

  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];

  // Create employee mutation
  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      message.success("Employee created successfully");
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["bandu-employees"] });
    },
  });

  // Update employee mutation
  const updateMutation = useMutation({
    mutationFn: ({ employeeId, params }: { employeeId: string; params: Partial<CreateEmployeeParams> }) =>
      updateEmployee(employeeId, params),
    onSuccess: () => {
      message.success("Employee updated successfully");
      setIsModalVisible(false);
      setIsDrawerVisible(false);
      setSelectedEmployee(null);
      setCurrentStep(0);
      form.resetFields();
      setAllFormValues({});
      queryClient.invalidateQueries({ queryKey: ["bandu-employees"] });
    },
  });

  // Delete employee mutation
  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      message.success("Employee deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["bandu-employees"] });
    },
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: ({
      employeeId,
      file,
      documentType,
      documentName,
      description,
      expirationDate,
      accessLevel,
    }: {
      employeeId: string;
      file: File;
      documentType: string;
      documentName: string;
      description?: string;
      expirationDate?: string;
      accessLevel?: string;
    }) =>
      uploadEmployeeDocument(employeeId, file, documentType, documentName, description, expirationDate, accessLevel),
    onSuccess: () => {
      message.success("Document uploaded successfully");
      setIsDocumentModalVisible(false);
      documentForm.resetFields();
      if (selectedEmployee) {
        queryClient.invalidateQueries({ queryKey: ["employee-documents", selectedEmployee._id] });
      }
    },
  });

  // Fetch employee documents
  const { data: documentsData } = useQuery({
    queryKey: ["employee-documents", selectedEmployee?._id],
    queryFn: () => (selectedEmployee ? fetchEmployeeDocuments(selectedEmployee._id) : Promise.resolve({ documents: [] })),
    enabled: !!selectedEmployee && isDrawerVisible,
  });

  const documents = documentsData?.documents || [];

  const columns = [
    {
      title: "Employee",
      dataIndex: ["user_id", "fullname"],
      key: "fullname",
      render: (fullname: string, record: Employee) => (
        <Space>
          {record.user_id?.thumbnail && (
            <img
              src={record.user_id.thumbnail}
              alt=""
              style={{ width: 32, height: 32, borderRadius: "50%" }}
            />
          )}
          <Text strong>{fullname || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Employee No.",
      dataIndex: "employee_number",
      key: "employee_number",
      render: (num: string) => <Text>{num || "—"}</Text>,
    },
    {
      title: "Department",
      dataIndex: ["department_id", "name"],
      key: "department",
      render: (name: string) => <Text>{name || "—"}</Text>,
    },
    {
      title: "Job Title",
      dataIndex: "job_title",
      key: "job_title",
      render: (title: string) => <Text>{title || "—"}</Text>,
    },
    {
      title: "Status",
      dataIndex: "employment_status",
      key: "employment_status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: "green",
          on_leave: "blue",
          suspended: "orange",
          terminated: "red",
          resigned: "default",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Basic Salary",
      dataIndex: "basic_salary",
      key: "basic_salary",
      render: (salary: number) => <Text>{salary ? `${salary.toLocaleString()} KES` : "—"}</Text>,
    },
    {
      title: "Gender",
      dataIndex: "gender",
      key: "gender",
      render: (gender: string) => <Text style={{ textTransform: "capitalize" }}>{gender || "—"}</Text>,
    },
    {
      title: "Date of Birth",
      dataIndex: "date_of_birth",
      key: "date_of_birth",
      render: (dob: string) => <Text>{dob ? dayjs(dob).format("DD MMM YYYY") : "—"}</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Employee) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedEmployee(record);
              setIsDrawerVisible(true);
            }}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedEmployee(record);
              // Map API response to form field structure
              const initialValues = {
                user_id: record.user_id?._id,
                department_id: record.department_id?._id,
                employee_number: record.employee_number,
                job_title: record.job_title,
                employment_type: record.employment_type,
                employment_status: record.employment_status,
                hire_date: record.hire_date ? dayjs(record.hire_date) : null,
                termination_date: record.termination_date ? dayjs(record.termination_date) : null,
                basic_salary: record.basic_salary,
                currency: record.currency,
                payment_frequency: record.payment_frequency,
                hourly_rate: record.hourly_rate,
                bank_name: record.bank_name,
                bank_account_number: record.bank_account_number,
                kra_pin: record.kra_pin,
                nssf_number: record.nssf_number,
                nhif_number: record.nhif_number,
                date_of_birth: record.date_of_birth ? dayjs(record.date_of_birth) : null,
                gender: record.gender,
                blood_group: record.blood_group,
                marital_status: record.marital_status,
                nationality: record.nationality,
                emergency_contact_name: record.emergency_contact_name,
                emergency_contact_phone: record.emergency_contact_phone,
                emergency_contact_relationship: record.emergency_contact_relationship,
              };
              form.setFieldsValue(initialValues);
              setAllFormValues(initialValues);
              setIsModalVisible(true);
            }}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  const handleCreateEmployee = async (values: CreateEmployeeParams) => {
    try {
      await createMutation.mutateAsync(values);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      // Get all form values from accumulated state and current form
      const currentValues = form.getFieldsValue();
      const allValues = { ...allFormValues, ...currentValues };
      await updateMutation.mutateAsync({ employeeId: selectedEmployee._id, params: allValues });
    } catch (error) {
      // Error handled by mutation
    }
  };


  const handleUploadDocument = async (values: any) => {
    if (!selectedEmployee || !values.file) return;
    try {
      await uploadDocumentMutation.mutateAsync({
        employeeId: selectedEmployee._id,
        file: values.file.file,
        documentType: values.document_type,
        documentName: values.document_name,
        description: values.description,
        expirationDate: values.expiration_date ? dayjs(values.expiration_date).format("YYYY-MM-DD") : undefined,
        accessLevel: values.access_level,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteEmployeeDocument(documentId);
      if (selectedEmployee) {
        queryClient.invalidateQueries({ queryKey: ["employee-documents", selectedEmployee._id] });
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleAddAllowance = async (values: any) => {
    if (!selectedEmployee) return;
    try {
      const updatedAllowances = [...(selectedEmployee.allowances || []), values];
      await updateMutation.mutateAsync({
        employeeId: selectedEmployee._id,
        params: { allowances: updatedAllowances },
      });
      setIsAllowanceModalVisible(false);
      allowanceForm.resetFields();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleAddBenefit = async (values: any) => {
    if (!selectedEmployee) return;
    try {
      const updatedBenefits = [...(selectedEmployee.benefits || []), values];
      await updateMutation.mutateAsync({
        employeeId: selectedEmployee._id,
        params: { benefits: updatedBenefits },
      });
      setIsBenefitModalVisible(false);
      benefitForm.resetFields();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={3} style={{ margin: 0, color: C.darkText }}>
          <UserOutlined style={{ marginRight: 8, color: C.primary }} />
          Employee Management
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Add Employee
        </Button>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
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
            <Option value="active">Active</Option>
            <Option value="on_leave">On Leave</Option>
            <Option value="suspended">Suspended</Option>
            <Option value="terminated">Terminated</Option>
            <Option value="resigned">Resigned</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={employees}
          loading={isLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create/Edit Employee Modal */}
      <Modal
        title={selectedEmployee ? "Edit Employee" : "Add Employee"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedEmployee(null);
          setCurrentStep(0);
          form.resetFields();
          setAllFormValues({});
        }}
        footer={null}
        width={900}
      >
        <Row gutter={24}>
          <Col span={6}>
            <Steps
              current={currentStep}
              direction="vertical"
              size="small"
            >
              <Steps.Step title="Basic Info" />
              <Steps.Step title="Employment" />
              <Steps.Step title="Banking & Tax" />
              <Steps.Step title="Personal Info" />
              <Steps.Step title="Emergency" />
            </Steps>
          </Col>
          <Col span={18}>
            <Form
              form={form}
              layout="vertical"
              onFinish={selectedEmployee ? handleUpdateEmployee : handleCreateEmployee}
            >
          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Select Crew Member" name="user_id" rules={[{ required: true, message: "Required" }]}>
                    <Select
                      placeholder="Select a crew member"
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.label ?? "").toString().toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {users
                        .filter((user: any) => !employees.some((emp: Employee) => emp.user_id?._id === user._id))
                        .map((user: any) => (
                          <Option key={user._id} value={user._id} label={user.fullname}>
                            <Space>
                              {user.thumbnail && (
                                <img
                                  src={user.thumbnail}
                                  alt=""
                                  style={{ width: 24, height: 24, borderRadius: "50%" }}
                                />
                              )}
                              <span>{user.fullname}</span>
                              <span style={{ color: "#94a3b8", fontSize: 12 }}> ({user.email})</span>
                            </Space>
                          </Option>
                        ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Department" name="department_id" rules={[{ required: true, message: "Required" }]}>
                    <Select
                      placeholder="Select a department"
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.label ?? "").toString().toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {departments.map((dept: Department) => (
                        <Option key={dept._id} value={dept._id} label={dept.name}>
                          <Space>
                            {dept.color && (
                              <span
                                style={{
                                  display: "inline-block",
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  backgroundColor: dept.color,
                                }}
                              />
                            )}
                            <span>{dept.name}</span>
                            {dept.code && <span style={{ color: "#94a3b8", fontSize: 12 }}> ({dept.code})</span>}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Employee Number" name="employee_number" rules={[{ required: true, message: "Required" }]}>
                    <Input placeholder="e.g., EMP001" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Job Title" name="job_title" rules={[{ required: true, message: "Required" }]}>
                    <Input placeholder="e.g., Software Engineer" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Step 2: Employment Details */}
          {currentStep === 1 && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Employment Type" name="employment_type" rules={[{ required: true, message: "Required" }]}>
                    <Select placeholder="Select employment type">
                      <Option value="full-time">Full-time</Option>
                      <Option value="part-time">Part-time</Option>
                      <Option value="contract">Contract</Option>
                      <Option value="intern">Intern</Option>
                      <Option value="casual">Casual</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Hire Date" name="hire_date" rules={[{ required: true, message: "Required" }]}>
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Basic Salary" name="basic_salary" rules={[{ required: true, message: "Required" }]}>
                    <InputNumber style={{ width: "100%" }} placeholder="0" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Currency" name="currency" rules={[{ required: true, message: "Required" }]}>
                    <Select placeholder="Select currency">
                      <Option value="KES">KES</Option>
                      <Option value="USD">USD</Option>
                      <Option value="EUR">EUR</Option>
                      <Option value="GBP">GBP</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Payment Frequency" name="payment_frequency" rules={[{ required: true, message: "Required" }]}>
                    <Select placeholder="Select frequency">
                      <Option value="daily">Daily</Option>
                      <Option value="weekly">Weekly</Option>
                      <Option value="bi-weekly">Bi-weekly</Option>
                      <Option value="monthly">Monthly</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Step 3: Banking & Tax */}
          {currentStep === 2 && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Bank Name" name="bank_name">
                    <Input placeholder="Enter bank name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Bank Account Number" name="bank_account_number">
                    <Input placeholder="Enter account number" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="KRA PIN" name="kra_pin">
                    <Input placeholder="Enter KRA PIN" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="NSSF Number" name="nssf_number">
                    <Input placeholder="Enter NSSF number" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="SHA Number" name="nhif_number">
                    <Input placeholder="Enter SHA number" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Step 4: Personal Information */}
          {currentStep === 3 && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Date of Birth" name="date_of_birth">
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Gender" name="gender">
                    <Select placeholder="Select gender">
                      <Option value="male">Male</Option>
                      <Option value="female">Female</Option>
                      <Option value="other">Other</Option>
                      <Option value="prefer_not_to_say">Prefer not to say</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Blood Group" name="blood_group">
                    <Select placeholder="Select blood group">
                      <Option value="A+">A+</Option>
                      <Option value="A-">A-</Option>
                      <Option value="B+">B+</Option>
                      <Option value="B-">B-</Option>
                      <Option value="AB+">AB+</Option>
                      <Option value="AB-">AB-</Option>
                      <Option value="O+">O+</Option>
                      <Option value="O-">O-</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Marital Status" name="marital_status">
                    <Select placeholder="Select marital status">
                      <Option value="single">Single</Option>
                      <Option value="married">Married</Option>
                      <Option value="divorced">Divorced</Option>
                      <Option value="widowed">Widowed</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Nationality" name="nationality">
                    <Input placeholder="Enter nationality" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Step 5: Emergency Contact */}
          {currentStep === 4 && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Emergency Contact Name" name="emergency_contact_name">
                    <Input placeholder="Enter contact name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Emergency Contact Phone" name="emergency_contact_phone">
                    <Input placeholder="Enter phone number" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Emergency Contact Relationship" name="emergency_contact_relationship">
                <Input placeholder="e.g., Spouse, Parent" />
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Space>
              {currentStep > 0 && (
                <Button onClick={() => setCurrentStep(currentStep - 1)}>
                  Previous
                </Button>
              )}
              {currentStep < 4 ? (
                <Button type="primary" onClick={() => {
                  // Save current step values before moving to next step
                  const currentValues = form.getFieldsValue();
                  setAllFormValues({ ...allFormValues, ...currentValues });
                  setCurrentStep(currentStep + 1);
                }}>
                  Next
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={() => form.submit()}
                  loading={createMutation.isLoading || updateMutation.isLoading}
                >
                  {selectedEmployee ? "Update" : "Create"} Employee
                </Button>
              )}
              <Button onClick={() => {
                setIsModalVisible(false);
                setCurrentStep(0);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
          </Col>
        </Row>
      </Modal>

      {/* Employee Details Drawer */}
      <Drawer
        title="Employee Details"
        placement="right"
        width={720}
        open={isDrawerVisible}
        onClose={() => {
          setIsDrawerVisible(false);
          setSelectedEmployee(null);
          setActiveTab("details");
        }}
      >
        {selectedEmployee && (
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.TabPane tab="Details" key="details">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Employee Number">{selectedEmployee.employee_number}</Descriptions.Item>
                <Descriptions.Item label="Full Name">{selectedEmployee.user_id?.fullname}</Descriptions.Item>
                <Descriptions.Item label="Email">{selectedEmployee.user_id?.email}</Descriptions.Item>
                <Descriptions.Item label="Department">{selectedEmployee.department_id?.name}</Descriptions.Item>
                <Descriptions.Item label="Job Title">{selectedEmployee.job_title}</Descriptions.Item>
                <Descriptions.Item label="Employment Type">{selectedEmployee.employment_type}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={selectedEmployee.employment_status === "active" ? "green" : "red"}>
                    {selectedEmployee.employment_status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Basic Salary">
                  {selectedEmployee.basic_salary?.toLocaleString()} {selectedEmployee.currency}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Frequency">{selectedEmployee.payment_frequency}</Descriptions.Item>
                <Descriptions.Item label="Hire Date">
                  {dayjs(selectedEmployee.hire_date).format("DD MMM YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="Gender" style={{ textTransform: "capitalize" }}>
                  {selectedEmployee.gender || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  {selectedEmployee.date_of_birth ? dayjs(selectedEmployee.date_of_birth).format("DD MMM YYYY") : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Blood Group">{selectedEmployee.blood_group || "—"}</Descriptions.Item>
                <Descriptions.Item label="Marital Status" style={{ textTransform: "capitalize" }}>
                  {selectedEmployee.marital_status || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Nationality" style={{ textTransform: "capitalize" }}>
                  {selectedEmployee.nationality || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Bank Name">{selectedEmployee.bank_name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Bank Account">{selectedEmployee.bank_account_number || "—"}</Descriptions.Item>
                <Descriptions.Item label="KRA PIN">{selectedEmployee.kra_pin || "—"}</Descriptions.Item>
                <Descriptions.Item label="NSSF Number">{selectedEmployee.nssf_number || "—"}</Descriptions.Item>
                <Descriptions.Item label="SHA Number">{selectedEmployee.nhif_number || "—"}</Descriptions.Item>
                <Descriptions.Item label="Emergency Contact Name">{selectedEmployee.emergency_contact_name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Emergency Contact Phone">{selectedEmployee.emergency_contact_phone || "—"}</Descriptions.Item>
                <Descriptions.Item label="Emergency Contact Relationship">{selectedEmployee.emergency_contact_relationship || "—"}</Descriptions.Item>
              </Descriptions>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Allowances" key="allowances">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Title level={4}>Allowances</Title>
                <Button
                  type="primary"
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => setIsAllowanceModalVisible(true)}
                >
                  Add Allowance
                </Button>
              </div>

              <Table
                dataSource={selectedEmployee.allowances || []}
                rowKey={(_, index?: number) => `allowance-${index || 0}`}
                pagination={false}
                size="small"
                columns={[
                  { title: "Name", dataIndex: "name" },
                  { title: "Amount", dataIndex: "amount", render: (amount: number) => `${amount.toLocaleString()} KES` },
                  { title: "Frequency", dataIndex: "frequency" },
                  {
                    title: "Taxable",
                    dataIndex: "is_taxable",
                    render: (taxable: boolean) => <Tag color={taxable ? "green" : "default"}>{taxable ? "Yes" : "No"}</Tag>,
                  },
                ]}
              />
            </Tabs.TabPane>

            <Tabs.TabPane tab="Benefits" key="benefits">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Title level={4}>Benefits</Title>
                <Button
                  type="primary"
                  size="small"
                  icon={<GiftOutlined />}
                  onClick={() => setIsBenefitModalVisible(true)}
                >
                  Add Benefit
                </Button>
              </div>

              <Table
                dataSource={selectedEmployee.benefits || []}
                rowKey={(_, index?: number) => `benefit-${index || 0}`}
                pagination={false}
                size="small"
                columns={[
                  { title: "Name", dataIndex: "name" },
                  { title: "Amount", dataIndex: "amount", render: (amount: number) => `${amount.toLocaleString()} KES` },
                  { title: "Frequency", dataIndex: "frequency" },
                  {
                    title: "Taxable",
                    dataIndex: "is_taxable",
                    render: (taxable: boolean) => <Tag color={taxable ? "green" : "default"}>{taxable ? "Yes" : "No"}</Tag>,
                  },
                ]}
              />
            </Tabs.TabPane>

            <Tabs.TabPane tab="Documents" key="documents">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Title level={4}>Documents</Title>
                <Button
                  type="primary"
                  size="small"
                  icon={<UploadOutlined />}
                  onClick={() => setIsDocumentModalVisible(true)}
                >
                  Upload Document
                </Button>
              </div>

              <Table
                dataSource={documents}
                rowKey="_id"
                pagination={false}
                size="small"
                columns={[
                  { title: "Document Name", dataIndex: "document_name" },
                  { title: "Type", dataIndex: "document_type" },
                  {
                    title: "Status",
                    dataIndex: "status",
                    render: (status: string) => <Tag color={status === "active" ? "green" : "red"}>{status}</Tag>,
                  },
                  {
                    title: "Actions",
                    render: (_: unknown, record: any) => (
                      <Button
                        type="link"
                        danger
                        size="small"
                        onClick={() => handleDeleteDocument(record._id)}
                      >
                        Delete
                      </Button>
                    ),
                  },
                ]}
              />
            </Tabs.TabPane>
          </Tabs>
        )}
      </Drawer>

      {/* Upload Document Modal */}
      <Modal
        title="Upload Document"
        open={isDocumentModalVisible}
        onCancel={() => {
          setIsDocumentModalVisible(false);
          documentForm.resetFields();
        }}
        footer={null}
      >
        <Form form={documentForm} layout="vertical" onFinish={handleUploadDocument}>
          <Form.Item label="Document Type" name="document_type" rules={[{ required: true }]}>
            <Select placeholder="Select document type">
              <Option value="employee_contract">Employee Contract</Option>
              <Option value="id_copy">ID Copy</Option>
              <Option value="passport_photo">Passport Photo</Option>
              <Option value="kra_pin">KRA PIN</Option>
              <Option value="bank_details">Bank Details</Option>
              <Option value="academic_certificates">Academic Certificates</Option>
              <Option value="professional_certificates">Professional Certificates</Option>
              <Option value="disciplinary_record">Disciplinary Record</Option>
              <Option value="performance_review">Performance Review</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Document Name" name="document_name" rules={[{ required: true }]}>
            <Input placeholder="Enter document name" />
          </Form.Item>
          <Form.Item label="File" name="file" rules={[{ required: true }]}>
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>
          <Form.Item label="Description" name="description">
            <TextArea rows={3} placeholder="Enter description" />
          </Form.Item>
          <Form.Item label="Expiration Date" name="expiration_date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Access Level" name="access_level" initialValue="private">
            <Select>
              <Option value="private">Private</Option>
              <Option value="hr_only">HR Only</Option>
              <Option value="manager">Manager</Option>
              <Option value="public">Public</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={uploadDocumentMutation.isLoading}>
                Upload
              </Button>
              <Button onClick={() => setIsDocumentModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Allowance Modal */}
      <Modal
        title="Add Allowance"
        open={isAllowanceModalVisible}
        onCancel={() => {
          setIsAllowanceModalVisible(false);
          allowanceForm.resetFields();
        }}
        footer={null}
      >
        <Form form={allowanceForm} layout="vertical" onFinish={handleAddAllowance}>
          <Form.Item label="Allowance Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Housing Allowance" />
          </Form.Item>
          <Form.Item label="Amount" name="amount" rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} placeholder="0" />
          </Form.Item>
          <Form.Item label="Frequency" name="frequency" rules={[{ required: true }]}>
            <Select placeholder="Select frequency">
              <Option value="monthly">Monthly</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="bi-weekly">Bi-weekly</Option>
              <Option value="daily">Daily</Option>
              <Option value="annual">Annual</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Taxable" name="is_taxable" valuePropName="checked">
            <Select placeholder="Select">
              <Option value={true}>Yes</Option>
              <Option value={false}>No</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={updateMutation.isLoading}>
                Add Allowance
              </Button>
              <Button onClick={() => {
                setIsAllowanceModalVisible(false);
                allowanceForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Benefit Modal */}
      <Modal
        title="Add Benefit"
        open={isBenefitModalVisible}
        onCancel={() => {
          setIsBenefitModalVisible(false);
          benefitForm.resetFields();
        }}
        footer={null}
      >
        <Form form={benefitForm} layout="vertical" onFinish={handleAddBenefit}>
          <Form.Item label="Benefit Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Health Insurance" />
          </Form.Item>
          <Form.Item label="Amount" name="amount" rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} placeholder="0" />
          </Form.Item>
          <Form.Item label="Frequency" name="frequency" rules={[{ required: true }]}>
            <Select placeholder="Select frequency">
              <Option value="monthly">Monthly</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="bi-weekly">Bi-weekly</Option>
              <Option value="daily">Daily</Option>
              <Option value="annual">Annual</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Taxable" name="is_taxable" valuePropName="checked">
            <Select placeholder="Select">
              <Option value={true}>Yes</Option>
              <Option value={false}>No</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={updateMutation.isLoading}>
                Add Benefit
              </Button>
              <Button onClick={() => {
                setIsBenefitModalVisible(false);
                benefitForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeeManagement;
