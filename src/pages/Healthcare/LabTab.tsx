import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { CheckOutlined, DeleteOutlined, ExperimentOutlined, PlusOutlined, PrinterOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  cancelLabOrder,
  collectSample,
  createLabTest,
  fetchLabOrder,
  fetchLabOrders,
  fetchLabTests,
  healthcareError,
  markLabOrderBilled,
  saveLabResults,
  updateLabTest,
  type LabDepartment,
  type LabOrder,
  type LabOrderItem,
  type LabParameter,
  type LabTest,
} from "@services/healthcare";
import { fetchAllSellableItems } from "@services/products";
import { fetchShop } from "@services/shops";
import { useHealthcareSettings } from "@hooks/useHealthcareSettings";
import { LAB_STATUS_TAG, ageOf, money, patientName, printLabReport, useAddToBill, useHealthcareAccess } from "./shared";
import PatientPickModal from "./PatientPickModal";
import LabOrderModal from "./LabOrderModal";

const { Text } = Typography;

type View = "open" | "completed" | "tests";

/** The flag a value would get against a parameter's range (mirrors the API). */
const flagFor = (value: string, p: LabParameter): string => {
  const raw = value.trim();
  if (!raw) return "";
  const n = Number(raw);
  if (Number.isFinite(n) && (p.ref_low != null || p.ref_high != null)) {
    if (p.ref_low != null && n < p.ref_low) return "low";
    if (p.ref_high != null && n > p.ref_high) return "high";
    return "";
  }
  if (p.ref_text && raw.toLowerCase() !== p.ref_text.toLowerCase()) return "abnormal";
  return "";
};

const rangeText = (p: LabParameter) =>
  p.ref_text || (p.ref_low != null && p.ref_high != null ? `${p.ref_low} – ${p.ref_high}` : p.ref_low != null ? `≥ ${p.ref_low}` : p.ref_high != null ? `≤ ${p.ref_high}` : "");

const FlagTag: React.FC<{ flag?: string }> = ({ flag }) =>
  flag ? <Tag color="red">{flag === "high" ? "High" : flag === "low" ? "Low" : "Abnormal"}</Tag> : null;

const LabTab: React.FC = () => {
  const settings = useHealthcareSettings();
  const access = useHealthcareAccess();
  const [view, setView] = useState<View>("open");
  const both = settings.lab && settings.radiology;
  const [department, setDepartment] = useState<LabDepartment | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [walkInPatient, setWalkInPatient] = useState<string>();
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const queryClient = useQueryClient();

  const dept = department === "all" ? undefined : department;
  const { data: orders = [], isFetching } = useQuery({
    queryKey: ["healthcare-lab-orders", view, dept],
    queryFn: () => fetchLabOrders({ status: view === "completed" ? "completed" : "open", department: dept }),
    enabled: view !== "tests",
    refetchInterval: view === "open" ? 30_000 : false,
  });

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <div style={{ flex: "1 1 220px" }}>
          <Text strong style={{ fontSize: 16, display: "block" }}>
            {settings.lab ? "Laboratory" : "Imaging"}
          </Text>
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            Tests ordered by the doctor or brought in on a request form
          </Text>
        </div>
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: "open", label: "Worklist" },
            { value: "completed", label: "Results ready" },
            ...(access.labSetup ? [{ value: "tests" as View, label: "Tests & ranges" }] : []),
          ]}
        />
        {both && view !== "tests" && (
          <Segmented<LabDepartment | "all">
            value={department}
            onChange={setDepartment}
            options={[
              { value: "all", label: "All" },
              { value: "lab", label: "Lab" },
              { value: "radiology", label: "Imaging" },
            ]}
          />
        )}
        {/* Walk-ins with a request form from another doctor */}
        {access.orderLab && view !== "tests" && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setPickOpen(true)}>
            New order
          </Button>
        )}
      </div>
      <PatientPickModal
        open={pickOpen}
        title="New lab order"
        hint="Who are the tests for? (for patients with a request form from another doctor)"
        onClose={() => setPickOpen(false)}
        onPicked={(id) => {
          setPickOpen(false);
          setWalkInPatient(id);
          setWalkInOpen(true);
        }}
      />
      {walkInPatient && (
        <LabOrderModal
          open={walkInOpen}
          onClose={() => setWalkInOpen(false)}
          customerId={walkInPatient}
          onCreated={(orders) => {
            setWalkInPatient(undefined);
            queryClient.invalidateQueries({ queryKey: ["healthcare-lab-orders"] });
            if (orders[0]) setOpenId(orders[0]._id);
          }}
        />
      )}

      {view === "tests" ? (
        <TestsPanel />
      ) : (
        <Table<LabOrder>
          rowKey="_id"
          size="middle"
          loading={isFetching}
          dataSource={orders}
          scroll={{ x: 760 }}
          onRow={(r) => ({ onClick: () => setOpenId(r._id), style: { cursor: "pointer" } })}
          locale={{ emptyText: view === "open" ? "No tests waiting" : "No results yet" }}
          columns={[
            { title: "Ordered", dataIndex: "createdAt", width: 120, render: (d: string) => dayjs(d).format("DD MMM HH:mm") },
            { title: "Order", dataIndex: "order_number", width: 120 },
            {
              title: "Patient",
              render: (_, o) => (
                <span>
                  <Text strong>{patientName(o.customer)}</Text>{" "}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {o.patient_number}
                  </Text>
                </span>
              ),
            },
            { title: "Tests", render: (_, o) => o.items.filter((i) => i.status !== "cancelled").map((i) => i.name).join(", ") },
            {
              title: "",
              width: 200,
              render: (_, o) => (
                <Space size={4} wrap>
                  {o.priority === "urgent" && <Tag color="red">Urgent</Tag>}
                  <Tag color={LAB_STATUS_TAG[o.status].color}>{LAB_STATUS_TAG[o.status].label}</Tag>
                  {o.billed_at && <Tag>Billed</Tag>}
                </Space>
              ),
            },
          ]}
        />
      )}

      <LabOrderDrawer orderId={openId} onClose={() => setOpenId(null)} />
    </Space>
  );
};

/** One order: collect the sample, enter results, complete, print, bill. */
export const LabOrderDrawer: React.FC<{ orderId: string | null; onClose: () => void }> = ({ orderId, onClose }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const access = useHealthcareAccess();
  const addToBill = useAddToBill();
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [reports, setReports] = useState<Record<string, string>>({});
  const [billing, setBilling] = useState(false);
  const shopId = localStorage.getItem("shopId");
  const { data: shop } = useQuery({ queryKey: ["shop", shopId], queryFn: () => fetchShop(shopId ?? ""), enabled: !!shopId });
  const permission = access.viewLab ? "HEALTHCARE_LAB_VIEW" : "HEALTHCARE_LAB_ORDER";

  const { data: order, isLoading } = useQuery({
    queryKey: ["healthcare-lab-order", orderId],
    queryFn: () => fetchLabOrder(orderId ?? "", permission),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (!order) return;
    setValues(Object.fromEntries(order.items.map((i) => [i._id, Object.fromEntries(i.results.map((r) => [r.parameter, r.value]))])));
    setReports(Object.fromEntries(order.items.map((i) => [i._id, i.report ?? ""])));
  }, [order]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["healthcare-lab-order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["healthcare-lab-orders"] });
    queryClient.invalidateQueries({ queryKey: ["healthcare-visits"] });
    queryClient.invalidateQueries({ queryKey: ["healthcare-visit"] });
  };

  const collect = useMutation({
    mutationFn: () => collectSample(orderId ?? ""),
    onSuccess: () => {
      message.success("Sample recorded");
      refresh();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't record the sample")),
  });

  const save = useMutation({
    mutationFn: ({ item, complete }: { item: LabOrderItem; complete: boolean }) =>
      saveLabResults(orderId ?? "", [
        {
          item_id: item._id,
          results: (item.parameters ?? []).map((p) => ({ parameter: p.name, value: values[item._id]?.[p.name] ?? "" })),
          report: reports[item._id] ?? "",
          complete,
        },
      ]),
    onSuccess: (_, { complete }) => {
      message.success(complete ? "Result completed" : "Saved");
      refresh();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't save the result")),
  });

  const cancel = () => {
    let reason = "";
    Modal.confirm({
      title: "Cancel this order?",
      content: <Input.TextArea rows={2} placeholder="Reason" onChange={(e) => (reason = e.target.value)} />,
      okText: "Cancel order",
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!reason.trim()) {
          message.error("Give a reason for cancelling");
          return Promise.reject();
        }
        try {
          await cancelLabOrder(orderId ?? "", reason, access.orderLab ? "HEALTHCARE_LAB_ORDER" : "HEALTHCARE_LAB_WORK");
          message.success("Order cancelled");
          refresh();
          onClose();
        } catch (error) {
          message.error(healthcareError(error, "Couldn't cancel"));
        }
      },
    });
  };

  const bill = async () => {
    if (!order) return;
    setBilling(true);
    try {
      const done = order.items.filter((i) => i.status === "completed");
      const { slotName } = await addToBill(
        done.map((i) => ({ product_id: i.product_id, product_type: i.product_type, name: i.name, quantity: 1, price: i.price }))
      );
      await markLabOrderBilled(order._id);
      message.success(`Added to the bill${slotName ? ` on ${slotName}` : ""}`);
      refresh();
      navigate({ search: "?tab=billing" });
    } catch (error) {
      message.error((error as Error).message || "Couldn't add to the bill");
    } finally {
      setBilling(false);
    }
  };

  const open = order && ["ordered", "sample_collected", "in_progress"].includes(order.status);
  const canWork = access.labWork && open;

  return (
    <Drawer
      open={!!orderId}
      onClose={onClose}
      width={Math.min(820, window.innerWidth)}
      destroyOnClose
      title={order ? `${order.order_number} · ${patientName(order.customer)}` : "Order"}
      extra={
        order &&
        open &&
        !order.items.some((i) => i.status === "completed") &&
        (access.orderLab || access.labWork) && (
          <Button danger type="text" onClick={cancel}>
            Cancel order
          </Button>
        )
      }
    >
      {isLoading || !order ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Space wrap>
            <Tag color={LAB_STATUS_TAG[order.status].color}>{LAB_STATUS_TAG[order.status].label}</Tag>
            {order.priority === "urgent" && <Tag color="red">Urgent</Tag>}
            <Text type="secondary">
              {[order.patient_number, ageOf(order.customer?.date_of_birth), order.customer?.gender].filter(Boolean).join(" · ")}
            </Text>
          </Space>
          <Text type="secondary">
            Ordered by {order.ordered_by_name || "—"} · {dayjs(order.createdAt).format("DD MMM, HH:mm")}
            {order.sample_collected_at && ` · sample ${dayjs(order.sample_collected_at).format("HH:mm")} by ${order.sample_collected_by_name}`}
          </Text>
          {order.clinical_notes && <Alert type="info" message="Clinical notes" description={order.clinical_notes} />}

          {canWork && order.status === "ordered" && (
            <Button type="primary" icon={<ExperimentOutlined />} loading={collect.isLoading} onClick={() => collect.mutate()}>
              {order.department === "radiology" ? "Patient seen" : "Sample collected"}
            </Button>
          )}

          {order.items.map((item) => {
            const done = item.status === "completed";
            const params = item.parameters ?? [];
            return (
              <Card
                key={item._id}
                size="small"
                title={
                  <Space>
                    {item.name}
                    {item.sample_type && <Tag>{item.sample_type}</Tag>}
                  </Space>
                }
                extra={<Tag color={LAB_STATUS_TAG[item.status].color}>{LAB_STATUS_TAG[item.status].label}</Tag>}
              >
                {item.status === "cancelled" ? (
                  <Text type="secondary">Cancelled</Text>
                ) : done ? (
                  <>
                    {!!item.results.length && (
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="parameter"
                        dataSource={item.results}
                        columns={[
                          { title: "Test", dataIndex: "parameter" },
                          { title: "Result", render: (_, r) => <Text strong={!!r.flag} type={r.flag ? "danger" : undefined}>{r.value}</Text> },
                          { title: "Unit", dataIndex: "unit" },
                          { title: "Range", dataIndex: "ref_range" },
                          { title: "", render: (_, r) => <FlagTag flag={r.flag} /> },
                        ]}
                      />
                    )}
                    {item.report && <div style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{item.report}</div>}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.completed_by_name} · {item.completed_at ? dayjs(item.completed_at).format("DD MMM HH:mm") : ""}
                    </Text>
                  </>
                ) : (
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {params.map((p) => {
                      const v = values[item._id]?.[p.name] ?? "";
                      return (
                        <div key={p.name} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) 140px 70px minmax(90px, 1fr) 80px", gap: 8, alignItems: "center" }}>
                          <Text>{p.name}</Text>
                          <Input
                            value={v}
                            disabled={!canWork || order.status === "ordered"}
                            onChange={(e) => setValues((all) => ({ ...all, [item._id]: { ...all[item._id], [p.name]: e.target.value } }))}
                          />
                          <Text type="secondary">{p.unit}</Text>
                          <Text type="secondary">{rangeText(p)}</Text>
                          <FlagTag flag={flagFor(v, p)} />
                        </div>
                      );
                    })}
                    <Input.TextArea
                      rows={params.length ? 2 : 5}
                      placeholder={params.length ? "Comments (optional)" : order.department === "radiology" ? "Findings and impression" : "Result"}
                      value={reports[item._id] ?? ""}
                      disabled={!canWork || order.status === "ordered"}
                      onChange={(e) => setReports((all) => ({ ...all, [item._id]: e.target.value }))}
                    />
                    {canWork && order.status !== "ordered" && (
                      <Space>
                        <Button loading={save.isLoading} onClick={() => save.mutate({ item, complete: false })}>
                          Save
                        </Button>
                        <Button type="primary" icon={<CheckOutlined />} loading={save.isLoading} onClick={() => save.mutate({ item, complete: true })}>
                          Complete
                        </Button>
                      </Space>
                    )}
                  </Space>
                )}
              </Card>
            );
          })}

          <Space wrap>
            {order.items.some((i) => i.status === "completed") && (
              <Button
                icon={<PrinterOutlined />}
                onClick={() =>
                  printLabReport({
                    shopName: (shop as { name?: string } | undefined)?.name,
                    order,
                    patient: patientName(order.customer),
                    patientNumber: order.patient_number,
                    ageGender: [ageOf(order.customer?.date_of_birth), order.customer?.gender].filter(Boolean).join(" · "),
                  })
                }
              >
                Print report
              </Button>
            )}
            {access.labWork && order.status === "completed" && !order.billed_at && (
              <Button icon={<ShoppingCartOutlined />} loading={billing} onClick={bill}>
                Add to bill on POS ({money(order.items.filter((i) => i.status === "completed").reduce((s, i) => s + i.price, 0))})
              </Button>
            )}
            {order.billed_at && <Tag>Billed {dayjs(order.billed_at).format("DD MMM HH:mm")}</Tag>}
          </Space>
        </Space>
      )}
    </Drawer>
  );
};

interface SellableItem {
  _id: string;
  name: string;
  price?: number;
  type: "service" | "product";
}

/** The catalogue of tests: what each bills as, and its parameters and ranges. */
const TestsPanel: React.FC = () => {
  const settings = useHealthcareSettings();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<LabTest | "new" | null>(null);
  const { data: tests = [], isFetching } = useQuery({ queryKey: ["healthcare-lab-tests", "all"], queryFn: () => fetchLabTests() });

  const toggle = useMutation({
    mutationFn: (t: LabTest) => updateLabTest(t._id, { is_active: !t.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["healthcare-lab-tests"] }),
    onError: (error) => message.error(healthcareError(error, "Couldn't update the test")),
  });

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Each test is billed as one of your POS items"
        description="Create the test as a service on the POS first (for example under a Laboratory category) with its price, then add it here with its parameters and reference ranges."
      />
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing("new")} style={{ alignSelf: "flex-start" }}>
        Add test
      </Button>
      <Table<LabTest>
        rowKey="_id"
        size="middle"
        loading={isFetching}
        dataSource={tests}
        scroll={{ x: 700 }}
        locale={{ emptyText: <Empty description="No tests set up yet" /> }}
        onRow={(t) => ({ onClick: () => setEditing(t), style: { cursor: "pointer" } })}
        columns={[
          { title: "Test", dataIndex: "name", render: (n: string) => <Text strong>{n}</Text> },
          { title: "Department", dataIndex: "department", width: 120, render: (d: string) => (d === "radiology" ? "Imaging" : "Lab") },
          { title: "Sample", dataIndex: "sample_type", width: 110, render: (s: string) => s || "—" },
          { title: "Parameters", width: 110, render: (_, t) => (t.parameters.length ? t.parameters.length : "Report") },
          { title: "Price", width: 100, render: (_, t) => (t.price == null ? <Text type="danger">Item missing</Text> : money(t.price)) },
          {
            title: "Active",
            width: 80,
            render: (_, t) => (
              <span onClick={(e) => e.stopPropagation()}>
                <Switch size="small" checked={t.is_active} onChange={() => toggle.mutate(t)} />
              </span>
            ),
          },
        ]}
      />
      <TestModal
        test={editing}
        defaultDepartment={settings.lab ? "lab" : "radiology"}
        onClose={() => setEditing(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["healthcare-lab-tests"] })}
      />
    </Space>
  );
};

interface TestFormValues {
  name: string;
  code?: string;
  department: LabDepartment;
  sample_type?: string;
  item: string; // "<type>:<id>"
  parameters: LabParameter[];
}

const TestModal: React.FC<{ test: LabTest | "new" | null; defaultDepartment: LabDepartment; onClose: () => void; onSaved: () => void }> = ({
  test,
  defaultDepartment,
  onClose,
  onSaved,
}) => {
  const settings = useHealthcareSettings();
  const [form] = Form.useForm<TestFormValues>();
  const isNew = test === "new";
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["sellable-items"],
    queryFn: fetchAllSellableItems,
    enabled: !!test,
    staleTime: 60_000,
  });
  const itemOptions = useMemo(
    () =>
      (items as SellableItem[]).map((i) => ({
        value: `${i.type === "product" ? "Product_Inventory" : "Product"}:${i._id}`,
        label: `${i.name} · ${money(i.price)}${i.type === "product" ? " (stock)" : ""}`,
        name: i.name,
      })),
    [items]
  );

  useEffect(() => {
    if (!test) return;
    if (test === "new") {
      form.setFieldsValue({ department: defaultDepartment, parameters: [] });
    } else {
      form.setFieldsValue({
        name: test.name,
        code: test.code,
        department: test.department,
        sample_type: test.sample_type,
        item: `${test.product_type}:${test.product_id}`,
        parameters: test.parameters,
      });
    }
  }, [test, form, defaultDepartment]);

  const save = useMutation({
    mutationFn: (v: TestFormValues) => {
      const [productType, productId] = v.item.split(":");
      const body = {
        name: v.name,
        code: v.code,
        department: v.department,
        sample_type: v.sample_type,
        product_id: productId,
        product_type: productType as LabTest["product_type"],
        parameters: v.parameters ?? [],
      };
      return isNew ? createLabTest(body) : updateLabTest((test as LabTest)._id, body);
    },
    onSuccess: () => {
      message.success("Test saved");
      onSaved();
      onClose();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't save the test")),
  });

  return (
    <Modal
      title={isNew ? "Add test" : "Edit test"}
      open={!!test}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Save"
      confirmLoading={save.isLoading}
      width={760}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false} onFinish={(v) => save.mutate(v)}>
        <Form.Item name="item" label="Billed as (POS item)" rules={[{ required: true, message: "Choose the POS item" }]}>
          <Select
            showSearch
            optionFilterProp="label"
            loading={isLoading}
            options={itemOptions}
            onChange={(_, option) => {
              if (!form.getFieldValue("name")) form.setFieldValue("name", (option as { name?: string }).name);
            }}
          />
        </Form.Item>
        <Space wrap>
          <Form.Item name="name" label="Test name" rules={[{ required: true, whitespace: true, message: "Name the test" }]}>
            <Input style={{ width: 240 }} />
          </Form.Item>
          <Form.Item name="code" label="Code">
            <Input style={{ width: 110 }} />
          </Form.Item>
          <Form.Item name="department" label="Department">
            <Select
              style={{ width: 130 }}
              options={[
                ...(settings.lab ? [{ value: "lab", label: "Lab" }] : []),
                ...(settings.radiology ? [{ value: "radiology", label: "Imaging" }] : []),
              ]}
            />
          </Form.Item>
          <Form.Item name="sample_type" label="Sample">
            <Select
              allowClear
              showSearch
              style={{ width: 130 }}
              options={["Blood", "Urine", "Stool", "Sputum", "Swab", "CSF", "Tissue"].map((s) => ({ value: s, label: s }))}
            />
          </Form.Item>
        </Space>
        <Text strong style={{ display: "block", marginBottom: 6 }}>
          Parameters
        </Text>
        <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
          Leave empty for tests reported in words (most imaging). Use low/high for numbers, or the normal text for results like "Negative".
        </Text>
        <Form.List name="parameters">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="start" wrap>
                  <Form.Item name={[field.name, "name"]} rules={[{ required: true, message: "Name" }]}>
                    <Input placeholder="e.g. Haemoglobin" style={{ width: 170 }} />
                  </Form.Item>
                  <Form.Item name={[field.name, "unit"]}>
                    <Input placeholder="Unit" style={{ width: 80 }} />
                  </Form.Item>
                  <Form.Item name={[field.name, "ref_low"]}>
                    <InputNumber placeholder="Low" style={{ width: 80 }} />
                  </Form.Item>
                  <Form.Item name={[field.name, "ref_high"]}>
                    <InputNumber placeholder="High" style={{ width: 80 }} />
                  </Form.Item>
                  <Form.Item name={[field.name, "ref_text"]}>
                    <Input placeholder="or normal text" style={{ width: 120 }} />
                  </Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label="Remove parameter" />
                </Space>
              ))}
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({})}>
                Add parameter
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default LabTab;
