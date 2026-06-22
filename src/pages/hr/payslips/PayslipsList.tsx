import React, { useState } from "react";
import { Typography, Card, Table, Button, Space, Tag, DatePicker, Select, Input, Drawer, Descriptions } from "antd";
import { EyeOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPayslips, getPayslipById } from "@services/hr";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const PayslipsList: React.FC = () => {
  const [monthFilter, setMonthFilter] = useState<dayjs.Dayjs>(dayjs());
  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: payslipsData, isLoading } = useQuery({
    queryKey: ["hr-payslips", { month: monthFilter.format("YYYY-MM"), employee: employeeFilter, status: statusFilter }],
    queryFn: () => fetchPayslips({ month: monthFilter.format("YYYY-MM"), employee: employeeFilter, status: statusFilter }),
  });

  const payslips = Array.isArray(payslipsData) ? payslipsData : payslipsData?.payslips || [];

  const { data: payslipDetail } = useQuery({
    queryKey: ["hr-payslip", selectedPayslipId],
    queryFn: () => getPayslipById(selectedPayslipId),
    enabled: !!selectedPayslipId && isDetailDrawerVisible,
  });

  const columns = [
    {
      title: "Employee",
      dataIndex: "employee_name",
      key: "employee_name",
    },
    {
      title: "Month",
      dataIndex: "pay_period",
      key: "pay_period",
      render: (period: string) => dayjs(period).format("MMM YYYY"),
    },
    {
      title: "Gross Pay",
      dataIndex: "gross_pay",
      key: "gross_pay",
      render: (amount: number) => `KES ${amount?.toLocaleString() || 0}`,
    },
    {
      title: "Deductions",
      dataIndex: "total_deductions",
      key: "total_deductions",
      render: (amount: number) => `KES ${amount?.toLocaleString() || 0}`,
    },
    {
      title: "Net Pay",
      dataIndex: "net_pay",
      key: "net_pay",
      render: (amount: number) => `KES ${amount?.toLocaleString() || 0}`,
    },
    {
      title: "Status",
      dataIndex: "payment_status",
      key: "payment_status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          Pending: "orange",
          Paid: "green",
          Cancelled: "red",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewPayslip(record._id)}>
            View
          </Button>
          <Button type="link" icon={<DownloadOutlined />}>
            Download
          </Button>
        </Space>
      ),
    },
  ];

  const handleViewPayslip = (id: string) => {
    setSelectedPayslipId(id);
    setIsDetailDrawerVisible(true);
  };

  const handleDetailDrawerClose = () => {
    setIsDetailDrawerVisible(false);
    setSelectedPayslipId("");
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            Payslips
          </Title>
          <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ["hr-payslips"] })}>
            Refresh
          </Button>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <DatePicker
            picker="month"
            value={monthFilter}
            onChange={(date) => date && setMonthFilter(date)}
            style={{ width: 200 }}
          />
          <Input
            placeholder="Search employee..."
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            style={{ width: 250 }}
          />
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="Pending">Pending</Option>
            <Option value="Paid">Paid</Option>
            <Option value="Cancelled">Cancelled</Option>
          </Select>
        </div>

        <Table columns={columns} dataSource={payslips} loading={isLoading} rowKey="_id" pagination={{ pageSize: 10 }} />
      </Card>

      <Drawer
        title="Payslip Details"
        placement="right"
        width={720}
        open={isDetailDrawerVisible}
        onClose={handleDetailDrawerClose}
      >
        {payslipDetail && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Employee" span={2}>
              {payslipDetail.employee_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Pay Period">
              {payslipDetail.pay_period ? dayjs(payslipDetail.pay_period).format("MMM YYYY") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Status">
              <Tag color={payslipDetail.payment_status === "Paid" ? "green" : "default"}>
                {payslipDetail.payment_status || "-"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Basic Salary">
              KES {payslipDetail.basic_salary?.toLocaleString() || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Gross Pay">
              KES {payslipDetail.gross_pay?.toLocaleString() || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Total Deductions">
              KES {payslipDetail.total_deductions?.toLocaleString() || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Net Pay">
              KES {payslipDetail.net_pay?.toLocaleString() || 0}
            </Descriptions.Item>
            <Descriptions.Item label="PAYE Tax">
              KES {payslipDetail.paye_tax?.toLocaleString() || 0}
            </Descriptions.Item>
            <Descriptions.Item label="NHIF">
              KES {payslipDetail.nhif_deduction?.toLocaleString() || 0}
            </Descriptions.Item>
            <Descriptions.Item label="NSSF">
              KES {payslipDetail.nssf_deduction?.toLocaleString() || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Method">
              {payslipDetail.payment_method || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Bank Account">
              {payslipDetail.bank_account_number || "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default PayslipsList;
