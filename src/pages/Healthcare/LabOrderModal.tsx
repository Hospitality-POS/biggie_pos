import React, { useMemo, useState } from "react";
import { Alert, Checkbox, Empty, Input, Modal, Radio, Space, Spin, Tag, Typography, message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { createLabOrder, fetchLabTests, healthcareError, type LabOrder, type LabTest } from "@services/healthcare";
import { money } from "./shared";

const { Text } = Typography;

interface LabOrderModalProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  visitId?: string;
  onCreated?: (orders: LabOrder[]) => void;
}

/** The doctor picks tests from the catalogue; lab and imaging get separate orders. */
const LabOrderModal: React.FC<LabOrderModalProps> = ({ open, onClose, customerId, visitId, onCreated }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [priority, setPriority] = useState<LabOrder["priority"]>("routine");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["healthcare-lab-tests", "active"],
    queryFn: () => fetchLabTests({ active: true }, "HEALTHCARE_LAB_ORDER"),
    enabled: open,
  });

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const shown = q ? tests.filter((t) => `${t.name} ${t.code ?? ""}`.toLowerCase().includes(q)) : tests;
    return (["lab", "radiology"] as const)
      .map((d) => ({ department: d, tests: shown.filter((t) => t.department === d) }))
      .filter((g) => g.tests.length);
  }, [tests, search]);

  const total = tests.filter((t) => selected.includes(t._id)).reduce((s, t) => s + (t.price ?? 0), 0);

  const close = () => {
    setSelected([]);
    setNotes("");
    setPriority("routine");
    setSearch("");
    onClose();
  };

  const submit = async () => {
    if (!selected.length) {
      message.error("Choose at least one test");
      return;
    }
    setSaving(true);
    try {
      const orders = await createLabOrder({ customer_id: customerId, visit_id: visitId, test_ids: selected, priority, clinical_notes: notes });
      message.success(`Ordered · ${orders.map((o) => o.order_number).join(", ")}`);
      onCreated?.(orders);
      close();
    } catch (error) {
      message.error(healthcareError(error, "Couldn't order the tests"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Order lab tests & imaging" open={open} onCancel={close} onOk={submit} okText={`Order ${selected.length || ""}`} confirmLoading={saving} width={640} destroyOnClose>
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 30 }}>
          <Spin />
        </div>
      ) : !tests.length ? (
        <Empty description="No tests set up yet. Add them in the Lab tab under Tests & ranges." />
      ) : (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Input.Search allowClear placeholder="Search tests" onChange={(e) => setSearch(e.target.value)} />
          {groups.map((g) => (
            <div key={g.department}>
              <Text strong>{g.department === "radiology" ? "Imaging" : "Laboratory"}</Text>
              <Checkbox.Group
                value={selected}
                onChange={(v) => setSelected(v as string[])}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 6, marginTop: 6 }}
                options={g.tests.map((t: LabTest) => ({
                  value: t._id,
                  label: (
                    <span>
                      {t.name} <Text type="secondary" style={{ fontSize: 12 }}>{money(t.price)}</Text>
                      {t.sample_type && <Tag style={{ marginLeft: 4, fontSize: 11 }}>{t.sample_type}</Tag>}
                    </span>
                  ),
                }))}
              />
            </div>
          ))}
          <Radio.Group value={priority} onChange={(e) => setPriority(e.target.value)}>
            <Radio.Button value="routine">Routine</Radio.Button>
            <Radio.Button value="urgent">Urgent</Radio.Button>
          </Radio.Group>
          <Input.TextArea rows={2} placeholder="Clinical notes for the lab (why, what to look for)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {!!selected.length && <Alert type="info" showIcon message={`${selected.length} test(s) · ${money(total)}. The patient goes to the lab next.`} />}
        </Space>
      )}
    </Modal>
  );
};

export default LabOrderModal;
