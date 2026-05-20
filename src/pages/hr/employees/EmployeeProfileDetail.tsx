import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Typography, Card, Row, Col, Descriptions, Button, Space, Tag, Divider } from "antd";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { getEmployeeProfileById } from "@services/hr";
import dayjs from "dayjs";

const { Title } = Typography;

const EmployeeProfileDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: employee, isLoading } = useQuery({
    queryKey: ["hr-employee-profile", id],
    queryFn: () => getEmployeeProfileById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div style={{ padding: 24 }}>Loading employee profile...</div>;
  }

  if (!employee) {
    return <div style={{ padding: 24 }}>Employee profile not found</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/hr/employees")}>
              Back
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              Employee Profile
            </Title>
          </Space>
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/hr/employees/${id}/edit`)}>
            Edit Profile
          </Button>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title="Personal Information" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Employee ID">{employee.employee_id}</Descriptions.Item>
                <Descriptions.Item label="First Name">{employee.first_name}</Descriptions.Item>
                <Descriptions.Item label="Last Name">{employee.last_name}</Descriptions.Item>
                <Descriptions.Item label="Email">{employee.email}</Descriptions.Item>
                <Descriptions.Item label="Phone">{employee.phone || "-"}</Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  {employee.date_of_birth ? dayjs(employee.date_of_birth).format("DD MMM YYYY") : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Gender">{employee.gender || "-"}</Descriptions.Item>
                <Descriptions.Item label="National ID">{employee.national_id || "-"}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Employment Details" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Department">{employee.department || "-"}</Descriptions.Item>
                <Descriptions.Item label="Position">{employee.position || "-"}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={employee.employee_status === "Active" ? "green" : "orange"}>
                    {employee.employee_status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Employment Type">{employee.employment_type || "-"}</Descriptions.Item>
                <Descriptions.Item label="Join Date">
                  {employee.join_date ? dayjs(employee.join_date).format("DD MMM YYYY") : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Probation End Date">
                  {employee.probation_end_date ? dayjs(employee.probation_end_date).format("DD MMM YYYY") : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Manager">{employee.manager_id || "-"}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Compensation" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Basic Salary">{employee.basic_salary || "-"}</Descriptions.Item>
                <Descriptions.Item label="Gross Salary">{employee.gross_salary || "-"}</Descriptions.Item>
                <Descriptions.Item label="Payment Method">{employee.payment_method || "-"}</Descriptions.Item>
                <Descriptions.Item label="Bank Account">{employee.bank_account || "-"}</Descriptions.Item>
                <Descriptions.Item label="Bank Name">{employee.bank_name || "-"}</Descriptions.Item>
                <Descriptions.Item label="KRA PIN">{employee.kra_pin || "-"}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Contact Information" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Address">{employee.address || "-"}</Descriptions.Item>
                <Descriptions.Item label="City">{employee.city || "-"}</Descriptions.Item>
                <Descriptions.Item label="Postal Code">{employee.postal_code || "-"}</Descriptions.Item>
                <Descriptions.Item label="Emergency Contact">{employee.emergency_contact_name || "-"}</Descriptions.Item>
                <Descriptions.Item label="Emergency Phone">{employee.emergency_contact_phone || "-"}</Descriptions.Item>
                <Descriptions.Item label="Relationship">{employee.emergency_contact_relationship || "-"}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default EmployeeProfileDetail;
