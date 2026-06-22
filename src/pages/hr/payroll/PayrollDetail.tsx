import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Typography, Card, Row, Col, Descriptions, Button, Space, Tag, Table, Divider } from "antd";
import { ArrowLeftOutlined, DownloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchPayrollById } from "@services/hr";
import dayjs from "dayjs";

const { Title } = Typography;

const PayrollDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: payroll, isLoading } = useQuery({
    queryKey: ["hr-payroll", id],
    queryFn: () => fetchPayrollById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div style={{ padding: 24 }}>Loading payroll details...</div>;
  }

  if (!payroll) {
    return <div style={{ padding: 24 }}>Payroll not found</div>;
  }

  const employeeColumns = [
    { title: "Employee Name", dataIndex: "employee_name", key: "employee_name" },
    { title: "Basic Salary", dataIndex: "basic_salary", key: "basic_salary", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "Gross Pay", dataIndex: "gross_pay", key: "gross_pay", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "Deductions", dataIndex: "deductions", key: "deductions", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "Net Pay", dataIndex: "net_pay", key: "net_pay", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "Status", dataIndex: "status", key: "status", render: (s: string) => <Tag color={s === "Paid" ? "green" : "orange"}>{s}</Tag> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/hr/payroll")}>
              Back
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              Payroll Details
            </Title>
          </Space>
          <Button icon={<DownloadOutlined />}>Export</Button>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title="Payroll Information" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Payroll Period">
                  {dayjs(payroll.payroll_period).format("MMMM YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="Total Employees">{payroll.total_employees}</Descriptions.Item>
                <Descriptions.Item label="Total Payroll">
                  KES {payroll.total_payroll?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Total Deductions">
                  KES {payroll.total_deductions?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Net Pay">KES {payroll.net_pay?.toLocaleString() || 0}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={payroll.status === "Paid" ? "green" : "orange"}>{payroll.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Pay Date">
                  {payroll.pay_date ? dayjs(payroll.pay_date).format("DD MMM YYYY") : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Created By">{payroll.created_by || "-"}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Deductions Summary" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="PAYE">KES {payroll.deductions?.paye?.toLocaleString() || 0}</Descriptions.Item>
                <Descriptions.Item label="NHIF">KES {payroll.deductions?.nhif?.toLocaleString() || 0}</Descriptions.Item>
                <Descriptions.Item label="NSSF">KES {payroll.deductions?.nssf?.toLocaleString() || 0}</Descriptions.Item>
                <Descriptions.Item label="Housing Levy">KES {payroll.deductions?.housing_levy?.toLocaleString() || 0}</Descriptions.Item>
                <Descriptions.Item label="Other Deductions">
                  KES {payroll.deductions?.other?.toLocaleString() || 0}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        <Divider />

        <Card title="Employee Payroll Breakdown" size="small">
          <Table
            columns={employeeColumns}
            dataSource={payroll.employee_payrolls || []}
            rowKey="employee_id"
            pagination={false}
          />
        </Card>
      </Card>
    </div>
  );
};

export default PayrollDetail;
