import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Typography, Card, Row, Col, Descriptions, Button, Space, Divider } from "antd";
import { ArrowLeftOutlined, DownloadOutlined, PrinterOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchPayslipById } from "@services/hr";
import dayjs from "dayjs";

const { Title } = Typography;

const PayslipDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: payslip, isLoading } = useQuery({
    queryKey: ["hr-payslip", id],
    queryFn: () => fetchPayslipById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div style={{ padding: 24 }}>Loading payslip...</div>;
  }

  if (!payslip) {
    return <div style={{ padding: 24 }}>Payslip not found</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/hr/payslips")}>
              Back
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              Payslip Details
            </Title>
          </Space>
          <Space>
            <Button icon={<PrinterOutlined />}>Print</Button>
            <Button icon={<DownloadOutlined />}>Download PDF</Button>
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title="Employee Information" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Employee Name">{payslip.employee_name}</Descriptions.Item>
                <Descriptions.Item label="Employee ID">{payslip.employee_id}</Descriptions.Item>
                <Descriptions.Item label="Department">{payslip.department || "-"}</Descriptions.Item>
                <Descriptions.Item label="Position">{payslip.position || "-"}</Descriptions.Item>
                <Descriptions.Item label="Pay Period">
                  {dayjs(payslip.pay_period).format("MMMM YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Date">
                  {payslip.payment_date ? dayjs(payslip.payment_date).format("DD MMM YYYY") : "-"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Payment Summary" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Basic Salary">
                  KES {payslip.basic_salary?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Gross Pay">
                  KES {payslip.gross_pay?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Total Deductions">
                  KES {payslip.total_deductions?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Net Pay">
                  KES {payslip.net_pay?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Status">{payslip.payment_status}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        <Divider />

        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title="Earnings" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Basic Salary">
                  KES {payslip.earnings?.basic_salary?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Overtime">
                  KES {payslip.earnings?.overtime?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Allowances">
                  KES {payslip.earnings?.allowances?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Bonuses">
                  KES {payslip.earnings?.bonuses?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Other Earnings">
                  KES {payslip.earnings?.other?.toLocaleString() || 0}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Deductions" size="small">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="PAYE">
                  KES {payslip.deductions?.paye?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="NHIF">
                  KES {payslip.deductions?.nhif?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="NSSF">
                  KES {payslip.deductions?.nssf?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Housing Levy">
                  KES {payslip.deductions?.housing_levy?.toLocaleString() || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Other Deductions">
                  KES {payslip.deductions?.other?.toLocaleString() || 0}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default PayslipDetail;
