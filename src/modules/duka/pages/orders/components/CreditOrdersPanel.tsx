import React, { useMemo, useState } from "react";
import {
  Alert, Button, Empty, Form, Input, InputNumber, Modal, Select, Space,
  Spin, Table, Tag, Tooltip, Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DollarOutlined, ReloadOutlined, UserOutlined, WalletOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getAllOrders, getCreditSummary, receiveOrderPayment } from "@services/orders";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { fmtKES } from "@utils/formatters";
import { THEME_C } from "@utils/getPrimaryColor";
import { useIsCompact } from "@hooks/useIsCompact";

const { Text } = Typography;
const C = THEME_C;

// Orders → Unpaid: pay-later (credit) sales that still have a balance owed,
// the total owed and who owes it, and "Receive payment" to collect.
const CreditOrdersPanel: React.FC<{ canCollect: boolean }> = ({ canCollect }) => {
  const queryClient = useQueryClient();
  const isCompact = useIsCompact();
  const shopId = localStorage.getItem("shopId") || undefined;
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [collecting, setCollecting] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const summaryQuery = useQuery({
    queryKey: ["creditSummary", shopId],
    queryFn: () => getCreditSummary(shopId),
  });

  const ordersQuery = useQuery({
    queryKey: ["creditOrders", shopId, customerFilter],
    queryFn: () => getAllOrders({ shop_id: shopId, credit: "unpaid", customer_id: customerFilter || undefined }),
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: fetchAllPaymentMethods,
  });
  const methodOptions = useMemo(
    () =>
      (paymentMethods || [])
        // STK push can't be confirmed from here
        .filter((m: any) => !/pal|gateway/i.test(m.name))
        .map((m: any) => ({ value: m._id, label: m.name })),
    [paymentMethods]
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["creditSummary"] });
    queryClient.invalidateQueries({ queryKey: ["creditOrders"] });
  };

  const openCollect = (order: any) => {
    setCollecting(order);
    form.setFieldsValue({ amount: Number(order.amount_due) || 0, method_id: undefined, reference: "", notes: "" });
  };

  const submitCollect = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await receiveOrderPayment(collecting._id, {
        method_id: values.method_id,
        amount: values.amount,
        reference: values.reference || undefined,
        notes: values.notes || undefined,
      });
      setCollecting(null);
      refresh();
    } catch {
      /* message shown by the service */
    } finally {
      setSaving(false);
    }
  };

  const summary = summaryQuery.data;
  const orders: any[] = ordersQuery.data || [];

  const columns: ColumnsType<any> = [
    { title: "Order No.", dataIndex: "order_no", key: "order_no" },
    {
      title: "Customer", key: "customer",
      render: (_: any, r: any) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{r.customer_name || r.customer_id?.customer_name || "—"}</Text>
          {r.customer_phone && <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{r.customer_phone}</Text>}
        </div>
      ),
    },
    { title: "Table", key: "table", render: (_: any, r: any) => r.table_id?.name || "—" },
    { title: "Bill", key: "bill", align: "right", render: (_: any, r: any) => fmtKES(Number(r.order_amount) || 0) },
    { title: "Paid", key: "paid", align: "right", render: (_: any, r: any) => fmtKES(Number(r.amount_paid) || 0) },
    {
      title: "Owed", key: "owed", align: "right",
      render: (_: any, r: any) => <Text strong style={{ color: C.orange }}>{fmtKES(Number(r.amount_due) || 0)}</Text>,
    },
    {
      title: "Sold", key: "sold",
      render: (_: any, r: any) => {
        const days = dayjs().diff(dayjs(r.createdAt), "day");
        return (
          <Tooltip title={dayjs(r.createdAt).format("DD MMM YYYY HH:mm")}>
            <span>
              {dayjs(r.createdAt).format("DD MMM")}{" "}
              {days >= 30 ? <Tag color="red">{days}d</Tag> : days >= 7 ? <Tag color="orange">{days}d</Tag> : null}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "", key: "action", fixed: "right", width: 150,
      render: (_: any, r: any) => (
        <Tooltip title={canCollect ? "" : "You need the Receive Order Payment permission"}>
          <Button type="primary" size="small" icon={<DollarOutlined />} disabled={!canCollect} onClick={() => openCollect(r)}>
            Receive payment
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      {/* Totals */}
      <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", background: "#fff7ed" }}>
          <Text type="secondary" style={{ fontSize: 11 }}>Total owed</Text>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.orange }}>
            {summaryQuery.isLoading ? <Spin size="small" /> : fmtKES(summary?.total_owed || 0)}
          </div>
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <Text type="secondary" style={{ fontSize: 11 }}>Unpaid orders</Text>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.darkText }}>{summary?.open_orders ?? "—"}</div>
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <Text type="secondary" style={{ fontSize: 11 }}>Customers owing</Text>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.darkText }}>{summary?.debtors?.length ?? "—"}</div>
        </div>
      </div>

      {/* Filter by customer */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Select
          allowClear showSearch optionFilterProp="label"
          placeholder={<span><UserOutlined /> All customers owing</span>}
          value={customerFilter}
          onChange={(v) => setCustomerFilter(v ?? null)}
          style={{ minWidth: 260, flex: isCompact ? "1 1 100%" : undefined }}
          options={(summary?.debtors || [])
            .filter((d) => d._id)
            .map((d) => ({
              value: d._id as string,
              label: `${d.customer_name || "Customer"} — ${fmtKES(d.owed)} (${d.orders})`,
            }))}
        />
        <Button icon={<ReloadOutlined />} onClick={refresh}>Refresh</Button>
      </div>

      <Table
        rowKey="_id"
        size="small"
        loading={ordersQuery.isLoading}
        dataSource={orders}
        columns={columns}
        scroll={{ x: 900 }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        locale={{ emptyText: <Empty description="Nothing owed — every pay-later order is paid." /> }}
      />

      <Modal
        open={!!collecting}
        onCancel={() => setCollecting(null)}
        onOk={submitCollect}
        confirmLoading={saving}
        okText="Receive payment"
        width="min(460px, 96vw)"
        title={<span><WalletOutlined style={{ color: C.primary, marginRight: 8 }} />Receive payment — {collecting?.order_no}</span>}
        destroyOnClose
      >
        {collecting && (
          <>
            <Alert
              type="info" showIcon style={{ marginBottom: 14, borderRadius: 8 }}
              message={`${collecting.customer_name || "Customer"} owes ${fmtKES(Number(collecting.amount_due) || 0)} on this order`}
              description={`Bill ${fmtKES(Number(collecting.order_amount) || 0)} · paid so far ${fmtKES(Number(collecting.amount_paid) || 0)}`}
            />
            <Form form={form} layout="vertical">
              <Form.Item
                name="amount" label="Amount received"
                rules={[
                  { required: true, message: "Enter the amount" },
                  {
                    validator: (_, v) =>
                      v > 0 && v <= (Number(collecting.amount_due) || 0) + 0.01
                        ? Promise.resolve()
                        : Promise.reject(new Error(`Between 1 and ${fmtKES(Number(collecting.amount_due) || 0)}`)),
                  },
                ]}
              >
                <InputNumber min={0} precision={2} prefix="KSh" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="method_id" label="Paid with" rules={[{ required: true, message: "Pick a payment method" }]}>
                <Select placeholder="Cash, M-Pesa, card…" options={methodOptions} />
              </Form.Item>
              <Form.Item name="reference" label="Reference (optional)">
                <Input placeholder="e.g. M-Pesa code" />
              </Form.Item>
              <Form.Item name="notes" label="Notes (optional)">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </Space>
  );
};

export default CreditOrdersPanel;
