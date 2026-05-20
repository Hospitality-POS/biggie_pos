import React, { useState } from "react";
import { Typography, Card, Table, Button, Space, Tag, DatePicker, Select, Modal, Form, message, Drawer, Descriptions } from "antd";
import { PlusOutlined, EyeOutlined, CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPayrolls, createPayroll, approvePayroll, cancelPayroll, getPayrollById, fetchEmployeeProfiles } from "@services/hr";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const PayrollList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string>("");
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: payrollsData, isLoading } = useQuery({
    queryKey: ["hr-payrolls", { status: statusFilter }],
    queryFn: () => fetchPayrolls({ status: statusFilter, shop_id: localStorage.getItem("shopId") || "" }),
  });

  const payrolls = Array.isArray(payrollsData) ? payrollsData : payrollsData?.payrolls || [];

  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["hr-employee-profiles-active"],
    queryFn: () => fetchEmployeeProfiles({}),
  });

  const activeEmployees = Array.isArray(employeesData) 
    ? employeesData 
    : employeesData?.profiles || employeesData?.employees || [];

  const { data: payrollDetail } = useQuery({
    queryKey: ["hr-payroll", selectedPayrollId],
    queryFn: () => getPayrollById(selectedPayrollId),
    enabled: !!selectedPayrollId && isDetailDrawerVisible,
  });

  const createMutation = useMutation({
    mutationFn: createPayroll,
    onSuccess: () => {
      message.success("Payroll created successfully");
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["hr-payrolls"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to create payroll");
    },
  });

  const approveMutation = useMutation({
    mutationFn: approvePayroll,
    onSuccess: () => {
      message.success("Payroll approved successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-payrolls"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to approve payroll");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPayroll,
    onSuccess: () => {
      message.success("Payroll cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-payrolls"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to cancel payroll");
    },
  });

  const columns = [
    {
      title: "Payroll Period",
      dataIndex: "payroll_period",
      key: "payroll_period",
      render: (period: string) => dayjs(period).format("MMM YYYY"),
    },
    {
      title: "Total Employees",
      dataIndex: "total_employees",
      key: "total_employees",
    },
    {
      title: "Total Payroll",
      dataIndex: "total_payroll",
      key: "total_payroll",
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
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          Draft: "default",
          Processed: "blue",
          Approved: "green",
          Paid: "success",
          Cancelled: "red",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Pay Date",
      dataIndex: "pay_date",
      key: "pay_date",
      render: (date: string) => date ? dayjs(date).format("DD MMM YYYY") : "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewPayroll(record._id)}>
            View
          </Button>
          {record.status === "Processed" && (
            <Button
              type="link"
              icon={<CheckOutlined />}
              onClick={() => approveMutation.mutate(record._id)}
              loading={approveMutation.isPending}
            >
              Approve
            </Button>
          )}
          {record.status === "Draft" && (
            <Button
              type="link"
              danger
              icon={<CloseOutlined />}
              onClick={() => cancelMutation.mutate(record._id)}
              loading={cancelMutation.isPending}
            >
              Cancel
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleCreate = (values: any) => {
    const shopId = localStorage.getItem("shopId") || "";
    createMutation.mutate({
      shop_id: shopId,
      pay_period_start: values.payroll_period?.startOf("month").format("YYYY-MM-DD"),
      pay_period_end: values.payroll_period?.endOf("month").format("YYYY-MM-DD"),
      exclude_employees: values.exclude_employees || [],
    });
  };

  const handleViewPayroll = (id: string) => {
    setSelectedPayrollId(id);
    setIsDetailDrawerVisible(true);
  };

  const handleDetailDrawerClose = () => {
    setIsDetailDrawerVisible(false);
    setSelectedPayrollId("");
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            Payroll Management
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ["hr-payrolls"] })}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
              Process Payroll
            </Button>
          </Space>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          />
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="Draft">Draft</Option>
            <Option value="Processed">Processed</Option>
            <Option value="Approved">Approved</Option>
            <Option value="Paid">Paid</Option>
            <Option value="Cancelled">Cancelled</Option>
          </Select>
        </div>

        <Table columns={columns} dataSource={payrolls} loading={isLoading} rowKey="_id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title="Process New Payroll"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="payroll_period" label="Payroll Period" rules={[{ required: true }]}>
            <DatePicker picker="month" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="exclude_employees" label="Exclude Employees" tooltip="Select employees to exclude from this payroll run">
            <Select
              mode="multiple"
              placeholder="Select employees to exclude"
              allowClear
              showSearch
              loading={isLoadingEmployees}
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            >
              {activeEmployees && activeEmployees.length > 0 ? (
                activeEmployees.map((emp: any) => (
                  <Option key={emp._id} value={emp._id} label={emp.user_id?.fullname || emp.employee_id || emp._id}>
                    {emp.user_id?.fullname || emp.employee_id || emp._id}
                  </Option>
                ))
              ) : (
                <Option disabled value="">No active employees found</Option>
              )}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Payroll Details"
        placement="right"
        width={720}
        open={isDetailDrawerVisible}
        onClose={handleDetailDrawerClose}
      >
        {payrollDetail && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Payroll Period" span={2}>
              {payrollDetail.pay_period_start ? dayjs(payrollDetail.pay_period_start).format("DD MMM YYYY") : "-"} - {payrollDetail.pay_period_end ? dayjs(payrollDetail.pay_period_end).format("DD MMM YYYY") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Total Employees">
              {payrollDetail.total_employees || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Total Payroll">
              KES {payrollDetail.total_gross_pay?.toLocaleString() || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Net Pay">
              KES {payrollDetail.total_net_pay?.toLocaleString() || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Total Deductions">
              KES {payrollDetail.total_deductions?.toLocaleString() || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={payrollDetail.status === "Paid" ? "green" : "default"}>
                {payrollDetail.status || "-"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Pay Date">
              {payrollDetail.pay_date ? dayjs(payrollDetail.pay_date).format("DD MMM YYYY") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Method">
              {payrollDetail.payment_method || "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default PayrollList;
