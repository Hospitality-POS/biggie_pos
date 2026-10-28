import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Dropdown,
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
import {
  DeleteOutlined,
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
  PrinterOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  addAdmissionCharge,
  addAdmissionDeposit,
  addWardNote,
  admitPatient,
  cancelAdmission,
  createWard,
  dischargePatient,
  fetchAdmission,
  fetchAdmissions,
  fetchWards,
  healthcareError,
  markAdmissionBilled,
  removeAdmissionCharge,
  transferPatient,
  updateBed,
  updateWard,
  type Bed,
  type BedStatus,
  type DischargeCondition,
  type Ward,
  type WardKind,
} from "@services/healthcare";
import { fetchAllSellableItems } from "@services/products";
import { fetchShop } from "@services/shops";
import { AllergyBanner } from "./AllergyBanner";
import PatientPicker from "./PatientPicker";
import {
  BED_STATUS_STYLE,
  DISCHARGE_CONDITION_LABEL,
  ageOf,
  daysAdmitted,
  money,
  patientName,
  printDischargeSummary,
  printInpatientBill,
  searchPermissionFor,
  useAddToBill,
  useHealthcareAccess,
} from "./shared";

const { Text } = Typography;

const WARD_KINDS: { value: WardKind; label: string }[] = [
  { value: "general", label: "General" },
  { value: "maternity", label: "Maternity" },
  { value: "paediatric", label: "Paediatric" },
  { value: "surgical", label: "Surgical" },
  { value: "icu", label: "ICU / HDU" },
  { value: "private", label: "Private" },
  { value: "other", label: "Other" },
];

type View = "board" | "discharged" | "setup";

interface SellableItem {
  _id: string;
  name: string;
  price?: number;
  type: "service" | "product";
}

/** POS items for charges and bed billing, as "<type>:<id>" select values. */
const useSellableOptions = (enabled: boolean) => {
  const { data = [], isLoading } = useQuery({ queryKey: ["sellable-items"], queryFn: fetchAllSellableItems, enabled, staleTime: 60_000 });
  const options = useMemo(
    () =>
      (data as SellableItem[]).map((i) => ({
        value: `${i.type === "product" ? "Product_Inventory" : "Product"}:${i._id}`,
        label: `${i.name} · ${money(i.price)}`,
        price: i.price ?? 0,
        name: i.name,
      })),
    [data]
  );
  return { options, isLoading };
};

const splitItem = (value: string) => {
  const [type, id] = value.split(":");
  return { product_type: type as "Product" | "Product_Inventory", product_id: id };
};

// ── Tab ──────────────────────────────────────────────────────────────────────

const WardsTab: React.FC = () => {
  const access = useHealthcareAccess();
  const [view, setView] = useState<View>("board");
  const [admitFor, setAdmitFor] = useState<{ wardId?: string; bedId?: string } | null>(null);
  const [openAdmission, setOpenAdmission] = useState<string | null>(null);

  const { data: wards = [], isLoading, refetch } = useQuery({
    queryKey: ["healthcare-wards"],
    queryFn: () => fetchWards(access.viewInpatients ? "HEALTHCARE_INPATIENT_VIEW" : access.admit ? "HEALTHCARE_ADMIT" : "HEALTHCARE_WARDS_MANAGE"),
    refetchInterval: 60_000,
  });

  const active = wards.filter((w) => w.is_active);
  const beds = active.flatMap((w) => w.beds);
  const occupied = beds.filter((b) => b.status === "occupied").length;
  const free = beds.filter((b) => b.status === "available").length;

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <div style={{ flex: "1 1 220px" }}>
          <Text strong style={{ fontSize: 16, display: "block" }}>
            Wards
          </Text>
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            {occupied} of {beds.length} beds occupied · {free} free
          </Text>
        </div>
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: "board", label: "Bed board" },
            { value: "discharged", label: "Discharged" },
            ...(access.manageWards ? [{ value: "setup" as View, label: "Wards & beds" }] : []),
          ]}
        />
        {access.admit && view === "board" && (
          <Button type="primary" icon={<LoginOutlined />} disabled={!free} onClick={() => setAdmitFor({})}>
            Admit patient
          </Button>
        )}
      </div>

      {view === "setup" ? (
        <WardsSetup wards={wards} onChanged={() => refetch()} />
      ) : view === "discharged" ? (
        <DischargedList onOpen={setOpenAdmission} />
      ) : isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : !active.length ? (
        <Empty description="No wards set up yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "40px 0" }}>
          {access.manageWards && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setView("setup")}>
              Set up wards
            </Button>
          )}
        </Empty>
      ) : (
        active.map((ward) => (
          <BedBoardWard
            key={ward._id}
            ward={ward}
            onOpenAdmission={setOpenAdmission}
            onAdmit={(bed) => setAdmitFor({ wardId: ward._id, bedId: bed._id })}
            onChanged={() => refetch()}
          />
        ))
      )}

      <AdmitModal
        open={!!admitFor}
        wardId={admitFor?.wardId}
        bedId={admitFor?.bedId}
        onClose={() => setAdmitFor(null)}
        onAdmitted={(id) => {
          setAdmitFor(null);
          setOpenAdmission(id);
        }}
      />
      <AdmissionDrawer admissionId={openAdmission} onClose={() => setOpenAdmission(null)} />
    </Space>
  );
};

const BedBoardWard: React.FC<{
  ward: Ward;
  onOpenAdmission: (id: string) => void;
  onAdmit: (bed: Bed) => void;
  onChanged: () => void;
}> = ({ ward, onOpenAdmission, onAdmit, onChanged }) => {
  const access = useHealthcareAccess();
  const setStatus = (bed: Bed, status: BedStatus) =>
    updateBed(ward._id, bed._id, { status }, access.inpatientCare ? "HEALTHCARE_INPATIENT_CARE" : "HEALTHCARE_WARDS_MANAGE")
      .then(() => {
        message.success(`${bed.label}: ${BED_STATUS_STYLE[status].label.toLowerCase()}`);
        onChanged();
      })
      .catch((error) => message.error(healthcareError(error, "Couldn't update the bed")));

  const occupied = ward.beds.filter((b) => b.status === "occupied").length;
  return (
    <Card
      size="small"
      title={
        <Space>
          {ward.name}
          <Tag>{WARD_KINDS.find((k) => k.value === ward.kind)?.label}</Tag>
        </Space>
      }
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          {occupied}/{ward.beds.length} occupied · {money(ward.daily_rate)}/day
        </Text>
      }
      style={{ borderRadius: 12 }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {ward.beds.map((bed) => {
          const style = BED_STATUS_STYLE[bed.status];
          const a = bed.admission;
          const tile = (
            <div
              key={bed._id}
              onClick={() => {
                if (bed.status === "occupied" && a) onOpenAdmission(a._id);
                else if (bed.status === "available" && access.admit) onAdmit(bed);
              }}
              style={{
                border: `1px solid ${style.color}40`,
                borderLeft: `4px solid ${style.color}`,
                background: style.bg,
                borderRadius: 8,
                padding: "8px 10px",
                minHeight: 76,
                cursor: bed.status === "occupied" || (bed.status === "available" && access.admit) ? "pointer" : "default",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text strong>{bed.label}</Text>
                <Text style={{ fontSize: 11, color: style.color }}>{style.label}</Text>
              </div>
              {bed.status === "occupied" && a ? (
                <>
                  <Text ellipsis style={{ display: "block", fontSize: 13 }}>
                    {patientName(a.customer)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    Day {daysAdmitted(a.admitted_at)} · {a.admission_number}
                  </Text>
                </>
              ) : bed.status === "available" && access.admit ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Click to admit
                </Text>
              ) : null}
            </div>
          );
          if (bed.status === "occupied" || !(access.inpatientCare || access.manageWards)) return tile;
          // Free, cleaning and out-of-service beds: change their status
          return (
            <Dropdown
              key={bed._id}
              trigger={["contextMenu"]}
              menu={{
                items: (["available", "cleaning", "out_of_service"] as BedStatus[])
                  .filter((s) => s !== bed.status)
                  .map((s) => ({ key: s, label: `Mark ${BED_STATUS_STYLE[s].label.toLowerCase()}`, onClick: () => setStatus(bed, s) })),
              }}
            >
              <div>
                {tile}
                {bed.status !== "available" && (
                  <Button size="small" type="link" style={{ padding: 0, fontSize: 12 }} onClick={() => setStatus(bed, "available")}>
                    Mark free
                  </Button>
                )}
              </div>
            </Dropdown>
          );
        })}
      </div>
    </Card>
  );
};

const DischargedList: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const { data = [], isFetching } = useQuery({ queryKey: ["healthcare-admissions", "discharged"], queryFn: () => fetchAdmissions({ status: "discharged" }) });
  return (
    <Table
      rowKey="_id"
      size="middle"
      loading={isFetching}
      dataSource={data}
      scroll={{ x: 760 }}
      onRow={(a) => ({ onClick: () => onOpen(a._id), style: { cursor: "pointer" } })}
      locale={{ emptyText: "No one discharged yet" }}
      columns={[
        { title: "Admission", dataIndex: "admission_number", width: 120 },
        { title: "Patient", render: (_, a) => <Text strong>{patientName(a.customer)}</Text> },
        { title: "Admitted", width: 120, render: (_, a) => dayjs(a.admitted_at).format("DD MMM YYYY") },
        { title: "Discharged", width: 120, render: (_, a) => (a.discharge?.at ? dayjs(a.discharge.at).format("DD MMM YYYY") : "—") },
        { title: "Days", width: 70, render: (_, a) => daysAdmitted(a.admitted_at, a.discharge?.at) },
        {
          title: "Condition",
          width: 170,
          render: (_, a) => DISCHARGE_CONDITION_LABEL[a.discharge?.condition as keyof typeof DISCHARGE_CONDITION_LABEL] ?? "—",
        },
        { title: "Billed", width: 80, render: (_, a) => (a.billed_at ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>) },
      ]}
    />
  );
};

// ── Admit ────────────────────────────────────────────────────────────────────

/** Admit a patient to a free bed — from the bed board, or from their visit. */
export const AdmitModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onAdmitted?: (admissionId: string) => void;
  customerId?: string;
  visitId?: string;
  wardId?: string;
  bedId?: string;
}> = ({ open, onClose, onAdmitted, customerId, visitId, wardId, bedId }) => {
  const access = useHealthcareAccess();
  const queryClient = useQueryClient();
  const [patient, setPatient] = useState<string | undefined>(customerId);
  const [ward, setWard] = useState<string | undefined>(wardId);
  const [bed, setBed] = useState<string | undefined>(bedId);
  const [reason, setReason] = useState("");
  const [doctor, setDoctor] = useState("");

  useEffect(() => {
    if (!open) return;
    setPatient(customerId);
    setWard(wardId);
    setBed(bedId);
    setReason("");
    setDoctor("");
  }, [open, customerId, wardId, bedId]);

  const { data: wards = [] } = useQuery({ queryKey: ["healthcare-wards"], queryFn: () => fetchWards("HEALTHCARE_ADMIT"), enabled: open });
  const wardOptions = wards.filter((w) => w.is_active && w.beds.some((b) => b.status === "available"));
  const bedOptions = wards.find((w) => w._id === ward)?.beds.filter((b) => b.status === "available") ?? [];

  const admit = useMutation({
    mutationFn: () => admitPatient({ customer_id: patient ?? "", visit_id: visitId, ward_id: ward ?? "", bed_id: bed ?? "", reason, doctor_name: doctor }),
    onSuccess: (a) => {
      message.success(`Admitted · ${a.admission_number}`);
      queryClient.invalidateQueries({ queryKey: ["healthcare-wards"] });
      queryClient.invalidateQueries({ queryKey: ["healthcare-admissions"] });
      queryClient.invalidateQueries({ queryKey: ["healthcare-visits"] });
      queryClient.invalidateQueries({ queryKey: ["healthcare-visit"] });
      onAdmitted?.(a._id);
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't admit the patient")),
  });

  return (
    <Modal
      title="Admit patient"
      open={open}
      onCancel={onClose}
      okText="Admit"
      okButtonProps={{ disabled: !patient || !ward || !bed, icon: <LoginOutlined /> }}
      confirmLoading={admit.isLoading}
      onOk={() => admit.mutate()}
      destroyOnClose
    >
      <Form layout="vertical">
        {!customerId && (
          <Form.Item label="Patient" required>
            <PatientPicker value={patient} onChange={setPatient} canRegister={access.managePatients} permission={searchPermissionFor(access)} />
          </Form.Item>
        )}
        <Space wrap style={{ width: "100%" }}>
          <Form.Item label="Ward" required>
            <Select
              value={ward}
              style={{ width: 220 }}
              placeholder="Choose"
              onChange={(v) => {
                setWard(v);
                setBed(undefined);
              }}
              options={wardOptions.map((w) => ({
                value: w._id,
                label: `${w.name} (${w.beds.filter((b) => b.status === "available").length} free)`,
              }))}
              notFoundContent="No free beds"
            />
          </Form.Item>
          <Form.Item label="Bed" required>
            <Select value={bed} style={{ width: 160 }} placeholder="Choose" onChange={setBed} options={bedOptions.map((b) => ({ value: b._id, label: b.label }))} />
          </Form.Item>
        </Space>
        <Form.Item label="Reason for admission">
          <Input.TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Form.Item>
        <Form.Item label="Doctor in charge">
          <Input value={doctor} onChange={(e) => setDoctor(e.target.value)} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ── Admission ────────────────────────────────────────────────────────────────

const AdmissionDrawer: React.FC<{ admissionId: string | null; onClose: () => void }> = ({ admissionId, onClose }) => {
  const access = useHealthcareAccess();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const addToBill = useAddToBill();
  const [chargeOpen, setChargeOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const shopId = localStorage.getItem("shopId");
  const { data: shop } = useQuery({ queryKey: ["shop", shopId], queryFn: () => fetchShop(shopId ?? ""), enabled: !!shopId && !!admissionId });

  const { data: a, isLoading } = useQuery({
    queryKey: ["healthcare-admission", admissionId],
    queryFn: () => fetchAdmission(admissionId ?? ""),
    enabled: !!admissionId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["healthcare-admission", admissionId] });
    queryClient.invalidateQueries({ queryKey: ["healthcare-wards"] });
    queryClient.invalidateQueries({ queryKey: ["healthcare-admissions"] });
    queryClient.invalidateQueries({ queryKey: ["healthcare-visits"] });
  };

  const removeCharge = useMutation({
    mutationFn: (chargeId: string) => removeAdmissionCharge(admissionId ?? "", chargeId),
    onSuccess: refresh,
    onError: (error) => message.error(healthcareError(error, "Couldn't remove the charge")),
  });

  const inWard = a?.status === "admitted";
  const last = a?.stays[a.stays.length - 1];
  const wardLabel = last ? `${last.ward_name} · ${last.bed_label}` : "";
  const people = {
    shopName: (shop as { name?: string } | undefined)?.name,
    patient: patientName(a?.customer),
    patientNumber: a?.patient_number,
    ageGender: [ageOf(a?.customer?.date_of_birth), a?.customer?.gender].filter(Boolean).join(" · "),
  };

  const sendToPos = async () => {
    if (!a) return;
    const billable = a.bill.lines.filter((l) => l.product_id);
    const missing = a.bill.lines.length - billable.length;
    setSending(true);
    try {
      const { slotName } = await addToBill(
        billable.map((l) => ({
          product_id: String(l.product_id),
          product_type: l.product_type,
          name: l.description,
          quantity: l.quantity,
          price: l.unit_price,
        }))
      );
      await markAdmissionBilled(a._id);
      message.success(`Bill added to the POS${slotName ? ` on ${slotName}` : ""}`);
      if (missing) message.warning(`${missing} line(s) have no POS item (set the ward's bed charge item) and were left out`);
      refresh();
      navigate({ search: "?tab=billing" });
    } catch (error) {
      message.error((error as Error).message || "Couldn't add the bill to the POS");
    } finally {
      setSending(false);
    }
  };

  const cancel = () => {
    let reason = "";
    Modal.confirm({
      title: "Cancel this admission?",
      content: <Input.TextArea rows={2} placeholder="Reason (e.g. admitted by mistake)" onChange={(e) => (reason = e.target.value)} />,
      okText: "Cancel admission",
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!reason.trim()) {
          message.error("Give a reason");
          return Promise.reject();
        }
        try {
          await cancelAdmission(admissionId ?? "", reason);
          message.success("Admission cancelled");
          refresh();
          onClose();
        } catch (error) {
          message.error(healthcareError(error, "Couldn't cancel"));
        }
      },
    });
  };

  return (
    <Drawer
      open={!!admissionId}
      onClose={onClose}
      width={Math.min(860, window.innerWidth)}
      destroyOnClose
      title={a ? `${patientName(a.customer)} · ${a.admission_number}` : "Admission"}
      extra={
        a &&
        inWard &&
        access.admit && (
          <Space>
            <Button icon={<SwapOutlined />} onClick={() => setTransferOpen(true)}>
              Transfer
            </Button>
            <Button type="primary" icon={<LogoutOutlined />} onClick={() => setDischargeOpen(true)}>
              Discharge
            </Button>
          </Space>
        )
      }
    >
      {isLoading || !a ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <AllergyBanner allergies={a.profile?.allergies} />
          <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered>
            <Descriptions.Item label="Ward">{wardLabel}</Descriptions.Item>
            <Descriptions.Item label="Admitted">
              {dayjs(a.admitted_at).format("DD MMM, HH:mm")} · day {daysAdmitted(a.admitted_at, a.discharge?.at)}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={inWard ? "blue" : a.status === "discharged" ? "green" : "default"}>{a.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Patient no.">{a.patient_number || "—"}</Descriptions.Item>
            <Descriptions.Item label="Age / gender">{people.ageGender || "—"}</Descriptions.Item>
            <Descriptions.Item label="Doctor">{a.doctor_name || "—"}</Descriptions.Item>
            {a.reason && (
              <Descriptions.Item label="Reason" span={3}>
                {a.reason}
              </Descriptions.Item>
            )}
            {a.stays.length > 1 && (
              <Descriptions.Item label="Moves" span={3}>
                {a.stays.map((s) => `${s.ward_name} · ${s.bed_label} (${dayjs(s.from).format("DD MMM")})`).join(" → ")}
              </Descriptions.Item>
            )}
          </Descriptions>

          <Card
            size="small"
            title={inWard ? "Running bill" : "Final bill"}
            extra={
              <Space wrap>
                {inWard && access.inpatientCare && (
                  <Button size="small" icon={<PlusOutlined />} onClick={() => setChargeOpen(true)}>
                    Add charge
                  </Button>
                )}
                {access.deposits && a.status !== "cancelled" && (
                  <Button size="small" icon={<WalletOutlined />} onClick={() => setDepositOpen(true)}>
                    Deposit
                  </Button>
                )}
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  onClick={() =>
                    printInpatientBill({
                      ...people,
                      admissionNumber: a.admission_number,
                      ward: wardLabel,
                      admittedAt: a.admitted_at,
                      dischargedAt: a.discharge?.at,
                      ...a.bill,
                    })
                  }
                >
                  Print
                </Button>
              </Space>
            }
          >
            <Table
              size="small"
              rowKey={(l, i) => `${l.description}-${i}`}
              pagination={false}
              dataSource={a.bill.lines}
              locale={{ emptyText: "Nothing billed yet" }}
              columns={[
                { title: "Item", dataIndex: "description" },
                { title: "Qty", dataIndex: "quantity", width: 60, align: "right" },
                { title: "Price", dataIndex: "unit_price", width: 100, align: "right", render: (v: number) => money(v) },
                { title: "Amount", dataIndex: "amount", width: 110, align: "right", render: (v: number) => money(v) },
                {
                  title: "",
                  width: 40,
                  render: (_, l) =>
                    l.charge_id && inWard && access.inpatientCare && !a.billed_at ? (
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label="Remove charge"
                        onClick={() => removeCharge.mutate(String(l.charge_id))}
                      />
                    ) : null,
                },
              ]}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginTop: 10, flexWrap: "wrap" }}>
              <Text>
                Total <b>{money(a.bill.total)}</b>
              </Text>
              <Text>
                Deposits <b>{money(a.bill.deposits)}</b>
              </Text>
              <Text>
                Balance <b style={{ color: a.bill.balance > 0 ? "#dc2626" : "#16a34a" }}>{money(a.bill.balance)}</b>
              </Text>
            </div>
            {!!a.deposits?.length && (
              <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 6 }}>
                Deposits: {a.deposits.map((d) => `${money(d.amount)} ${d.method} ${dayjs(d.date).format("DD MMM")}`).join(" · ")}
              </Text>
            )}
            {a.status === "discharged" && access.deposits && (
              <div style={{ marginTop: 12 }}>
                {a.billed_at ? (
                  <Tag color="green">Sent to the POS {dayjs(a.billed_at).format("DD MMM HH:mm")}</Tag>
                ) : (
                  <Button type="primary" icon={<ShoppingCartOutlined />} loading={sending} onClick={sendToPos}>
                    Send bill to the POS
                  </Button>
                )}
                <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 6 }}>
                  Deposits are recorded here, not on the POS: take {money(Math.max(0, a.bill.balance))} at the till.
                </Text>
              </div>
            )}
          </Card>

          <WardNotes admission={a} canWrite={inWard && access.inpatientCare} onAdded={refresh} />

          {a.status === "discharged" && (
            <Card
              size="small"
              title="Discharge"
              extra={
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  onClick={() =>
                    printDischargeSummary({
                      ...people,
                      admissionNumber: a.admission_number,
                      admittedAt: a.admitted_at,
                      dischargedAt: a.discharge?.at,
                      ward: wardLabel,
                      doctor: a.doctor_name,
                      reason: a.reason,
                      discharge: a.discharge ?? {},
                    })
                  }
                >
                  Print summary
                </Button>
              }
            >
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="Condition">
                  {DISCHARGE_CONDITION_LABEL[a.discharge?.condition as keyof typeof DISCHARGE_CONDITION_LABEL] ?? "—"}
                </Descriptions.Item>
                {a.discharge?.diagnoses && <Descriptions.Item label="Diagnoses">{a.discharge.diagnoses}</Descriptions.Item>}
                {a.discharge?.summary && <Descriptions.Item label="Summary">{a.discharge.summary}</Descriptions.Item>}
                {a.discharge?.medications && <Descriptions.Item label="Medicines">{a.discharge.medications}</Descriptions.Item>}
                {a.discharge?.follow_up && <Descriptions.Item label="Follow-up">{a.discharge.follow_up}</Descriptions.Item>}
              </Descriptions>
            </Card>
          )}

          {inWard && access.admit && !a.bill.deposits && a.bill.lines.every((l) => !l.charge_id) && (
            <Button danger type="text" onClick={cancel} style={{ alignSelf: "flex-start" }}>
              Admitted by mistake? Cancel admission
            </Button>
          )}
        </Space>
      )}

      {a && (
        <>
          <ChargeModal open={chargeOpen} admissionId={a._id} onClose={() => setChargeOpen(false)} onDone={refresh} />
          <DepositModal open={depositOpen} admissionId={a._id} balance={a.bill.balance} onClose={() => setDepositOpen(false)} onDone={refresh} />
          <TransferModal open={transferOpen} admissionId={a._id} currentBed={a.bed_id} onClose={() => setTransferOpen(false)} onDone={refresh} />
          <DischargeModal
            open={dischargeOpen}
            admissionId={a._id}
            balance={a.bill.balance}
            onClose={() => setDischargeOpen(false)}
            onDone={(discharged) => {
              refresh();
              printDischargeSummary({
                ...people,
                admissionNumber: a.admission_number,
                admittedAt: a.admitted_at,
                dischargedAt: discharged.discharge?.at,
                ward: wardLabel,
                doctor: a.doctor_name,
                reason: a.reason,
                discharge: discharged.discharge ?? {},
              });
            }}
          />
        </>
      )}
    </Drawer>
  );
};

const VITALS: { key: string; label: string }[] = [
  { key: "temperature_c", label: "Temp °C" },
  { key: "pulse_bpm", label: "Pulse" },
  { key: "bp_systolic", label: "BP sys" },
  { key: "bp_diastolic", label: "BP dia" },
  { key: "spo2_percent", label: "SpO₂ %" },
  { key: "respiratory_rate", label: "Resp." },
];

const WardNotes: React.FC<{
  admission: { _id: string; notes?: { _id: string; at: string; by_name: string; kind: string; note: string; vitals?: Record<string, number | null | undefined> }[] };
  canWrite: boolean;
  onAdded: () => void;
}> = ({ admission, canWrite, onAdded }) => {
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<"nursing" | "doctor">("nursing");
  const [vitals, setVitals] = useState<Record<string, number | null | undefined>>({});
  const add = useMutation({
    mutationFn: () => addWardNote(admission._id, { kind, note, vitals }),
    onSuccess: () => {
      setNote("");
      setVitals({});
      message.success("Note added");
      onAdded();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't add the note")),
  });
  const notes = [...(admission.notes ?? [])].reverse();
  return (
    <Card size="small" title="Ward notes & vitals">
      {canWrite && (
        <div style={{ marginBottom: 12 }}>
          <Segmented
            size="small"
            value={kind}
            onChange={(v) => setKind(v as "nursing" | "doctor")}
            options={[
              { value: "nursing", label: "Nursing" },
              { value: "doctor", label: "Doctor's round" },
            ]}
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {VITALS.map((v) => (
              <InputNumber
                key={v.key}
                size="small"
                placeholder={v.label}
                value={vitals[v.key] ?? null}
                onChange={(n) => setVitals((all) => ({ ...all, [v.key]: n }))}
                style={{ width: 100 }}
              />
            ))}
          </div>
          <Input.TextArea rows={2} placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="small" type="primary" style={{ marginTop: 8 }} loading={add.isLoading} onClick={() => add.mutate()}>
            Add
          </Button>
        </div>
      )}
      {notes.length ? (
        notes.map((n) => {
          const shown = VITALS.filter((v) => n.vitals?.[v.key] != null);
          return (
            <div key={n._id} style={{ borderTop: "1px solid #f1f5f9", padding: "8px 0" }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(n.at).format("DD MMM HH:mm")} · {n.by_name} · {n.kind === "doctor" ? "Doctor's round" : "Nursing"}
              </Text>
              {!!shown.length && (
                <div style={{ fontSize: 12.5 }}>{shown.map((v) => `${v.label} ${n.vitals?.[v.key]}`).join(" · ")}</div>
              )}
              {n.note && <div style={{ whiteSpace: "pre-wrap" }}>{n.note}</div>}
            </div>
          );
        })
      ) : (
        <Text type="secondary">No notes yet</Text>
      )}
    </Card>
  );
};

const ChargeModal: React.FC<{ open: boolean; admissionId: string; onClose: () => void; onDone: () => void }> = ({ open, admissionId, onClose, onDone }) => {
  const { options, isLoading } = useSellableOptions(open);
  const [item, setItem] = useState<string>();
  const [quantity, setQuantity] = useState(1);
  const [kind, setKind] = useState("nursing");
  const save = useMutation({
    mutationFn: () => addAdmissionCharge(admissionId, { ...splitItem(item ?? ":"), quantity, kind }),
    onSuccess: () => {
      message.success("Charge added");
      setItem(undefined);
      setQuantity(1);
      onDone();
      onClose();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't add the charge")),
  });
  return (
    <Modal title="Add charge" open={open} onCancel={onClose} okText="Add" okButtonProps={{ disabled: !item }} confirmLoading={save.isLoading} onOk={() => save.mutate()} destroyOnClose>
      <Form layout="vertical">
        <Form.Item label="What (from your POS items)" required>
          <Select showSearch optionFilterProp="label" loading={isLoading} value={item} onChange={setItem} options={options} placeholder="e.g. Nursing care, Dressing, IV set" />
        </Form.Item>
        <Space wrap>
          <Form.Item label="Quantity">
            <InputNumber min={1} value={quantity} onChange={(v) => setQuantity(Number(v) || 1)} />
          </Form.Item>
          <Form.Item label="Type">
            <Select
              value={kind}
              onChange={setKind}
              style={{ width: 160 }}
              options={[
                { value: "nursing", label: "Nursing" },
                { value: "procedure", label: "Procedure" },
                { value: "consumable", label: "Consumable" },
                { value: "doctor", label: "Doctor's fee" },
                { value: "other", label: "Other" },
              ]}
            />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
};

const DepositModal: React.FC<{ open: boolean; admissionId: string; balance: number; onClose: () => void; onDone: () => void }> = ({
  open,
  admissionId,
  balance,
  onClose,
  onDone,
}) => {
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const save = useMutation({
    mutationFn: () => addAdmissionDeposit(admissionId, { amount: amount ?? 0, method, reference }),
    onSuccess: () => {
      message.success("Deposit recorded");
      setAmount(null);
      setReference("");
      onDone();
      onClose();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't record the deposit")),
  });
  return (
    <Modal title="Record deposit" open={open} onCancel={onClose} okText="Record" okButtonProps={{ disabled: !amount }} confirmLoading={save.isLoading} onOk={() => save.mutate()} destroyOnClose>
      <Form layout="vertical">
        <Text type="secondary" style={{ display: "block", marginBottom: 10 }}>
          Balance so far: {money(balance)}
        </Text>
        <Space wrap>
          <Form.Item label="Amount" required>
            <InputNumber min={1} value={amount} onChange={(v) => setAmount(v ? Number(v) : null)} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item label="Method">
            <Select
              value={method}
              onChange={setMethod}
              style={{ width: 140 }}
              options={["cash", "M-Pesa", "card", "bank", "insurance"].map((m) => ({ value: m, label: m === "cash" ? "Cash" : m.charAt(0).toUpperCase() + m.slice(1) }))}
            />
          </Form.Item>
          <Form.Item label="Reference">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. M-Pesa code" style={{ width: 180 }} />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
};

const TransferModal: React.FC<{ open: boolean; admissionId: string; currentBed: string; onClose: () => void; onDone: () => void }> = ({
  open,
  admissionId,
  currentBed,
  onClose,
  onDone,
}) => {
  const { data: wards = [] } = useQuery({ queryKey: ["healthcare-wards"], queryFn: () => fetchWards("HEALTHCARE_ADMIT"), enabled: open });
  const [ward, setWard] = useState<string>();
  const [bed, setBed] = useState<string>();
  const beds = wards.find((w) => w._id === ward)?.beds.filter((b) => b.status === "available" && b._id !== currentBed) ?? [];
  const save = useMutation({
    mutationFn: () => transferPatient(admissionId, ward ?? "", bed ?? ""),
    onSuccess: () => {
      message.success("Transferred");
      setWard(undefined);
      setBed(undefined);
      onDone();
      onClose();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't transfer")),
  });
  return (
    <Modal title="Transfer to another bed" open={open} onCancel={onClose} okText="Transfer" okButtonProps={{ disabled: !ward || !bed }} confirmLoading={save.isLoading} onOk={() => save.mutate()} destroyOnClose>
      <Space wrap>
        <Select
          value={ward}
          placeholder="Ward"
          style={{ width: 220 }}
          onChange={(v) => {
            setWard(v);
            setBed(undefined);
          }}
          options={wards.filter((w) => w.is_active).map((w) => ({ value: w._id, label: `${w.name} · ${money(w.daily_rate)}/day` }))}
        />
        <Select value={bed} placeholder="Bed" style={{ width: 160 }} onChange={setBed} options={beds.map((b) => ({ value: b._id, label: b.label }))} notFoundContent="No free beds" />
      </Space>
      <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 10 }}>
        The old bed is marked for cleaning. Days from now are billed at the new ward's rate.
      </Text>
    </Modal>
  );
};

const DischargeModal: React.FC<{
  open: boolean;
  admissionId: string;
  balance: number;
  onClose: () => void;
  onDone: (a: Awaited<ReturnType<typeof dischargePatient>>) => void;
}> = ({ open, admissionId, balance, onClose, onDone }) => {
  const [form] = Form.useForm<{ condition: DischargeCondition; diagnoses?: string; summary?: string; medications?: string; instructions?: string; follow_up?: string }>();
  const save = useMutation({
    mutationFn: (v: Parameters<typeof dischargePatient>[1]) => dischargePatient(admissionId, v),
    onSuccess: (a) => {
      message.success("Discharged");
      onDone(a);
      onClose();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't discharge")),
  });
  return (
    <Modal title="Discharge patient" open={open} onCancel={onClose} okText="Discharge & print summary" confirmLoading={save.isLoading} onOk={() => form.submit()} width={680} destroyOnClose>
      {balance > 0 && (
        <Alert type="warning" showIcon icon={<WarningOutlined />} style={{ marginBottom: 12 }} message={`${money(balance)} is still to pay — settle it at Billing after discharge.`} />
      )}
      <Form form={form} layout="vertical" preserve={false} onFinish={(v) => save.mutate(v)}>
        <Form.Item name="condition" label="Condition on discharge" rules={[{ required: true, message: "Choose the condition" }]}>
          <Select options={Object.entries(DISCHARGE_CONDITION_LABEL).map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        <Form.Item name="diagnoses" label="Diagnoses">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="summary" label="Summary of care">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="medications" label="Medicines to continue">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="instructions" label="Instructions for the patient">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="follow_up" label="Follow-up">
          <Input placeholder="e.g. Review in clinic in 2 weeks" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ── Set-up ───────────────────────────────────────────────────────────────────

const WardsSetup: React.FC<{ wards: Ward[]; onChanged: () => void }> = ({ wards, onChanged }) => {
  const [editing, setEditing] = useState<Ward | "new" | null>(null);
  const toggle = useMutation({
    mutationFn: (w: Ward) => updateWard(w._id, { is_active: !w.is_active }),
    onSuccess: onChanged,
    onError: (error) => message.error(healthcareError(error, "Couldn't update the ward")),
  });
  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Bed-days are billed as a POS item"
        description="Create a service on the POS such as “Bed — General ward”, then choose it here. Its price on the bill is the ward's daily rate."
      />
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing("new")} style={{ alignSelf: "flex-start" }}>
        Add ward
      </Button>
      <Table
        rowKey="_id"
        size="middle"
        dataSource={wards}
        onRow={(w) => ({ onClick: () => setEditing(w), style: { cursor: "pointer" } })}
        locale={{ emptyText: "No wards yet" }}
        columns={[
          { title: "Ward", dataIndex: "name", render: (n: string) => <Text strong>{n}</Text> },
          { title: "Type", dataIndex: "kind", width: 120, render: (k: WardKind) => WARD_KINDS.find((x) => x.value === k)?.label },
          { title: "Beds", width: 80, render: (_, w) => w.beds.length },
          { title: "Daily rate", width: 110, render: (_, w) => money(w.daily_rate) },
          { title: "Billed as", width: 110, render: (_, w) => (w.bed_product_id ? <Tag color="green">Set</Tag> : <Tag color="red">Not set</Tag>) },
          {
            title: "Active",
            width: 80,
            render: (_, w) => (
              <span onClick={(e) => e.stopPropagation()}>
                <Switch size="small" checked={w.is_active} onChange={() => toggle.mutate(w)} />
              </span>
            ),
          },
        ]}
      />
      <WardModal ward={editing} onClose={() => setEditing(null)} onSaved={onChanged} />
    </Space>
  );
};

const WardModal: React.FC<{ ward: Ward | "new" | null; onClose: () => void; onSaved: () => void }> = ({ ward, onClose, onSaved }) => {
  const [form] = Form.useForm<{ name: string; kind: WardKind; daily_rate: number; item?: string; bed_count?: number; add_beds?: string }>();
  const isNew = ward === "new";
  const { options, isLoading } = useSellableOptions(!!ward);
  useEffect(() => {
    if (!ward) return;
    form.setFieldsValue(
      ward === "new"
        ? { kind: "general", daily_rate: 0, bed_count: 10 }
        : {
            name: ward.name,
            kind: ward.kind,
            daily_rate: ward.daily_rate,
            item: ward.bed_product_id ? `${ward.bed_product_type ?? "Product"}:${ward.bed_product_id}` : undefined,
          }
    );
  }, [ward, form]);
  const save = useMutation({
    mutationFn: (v: { name: string; kind: WardKind; daily_rate: number; item?: string; bed_count?: number; add_beds?: string }) => {
      const item = v.item ? splitItem(v.item) : { product_id: undefined, product_type: undefined };
      const body = { name: v.name, kind: v.kind, daily_rate: v.daily_rate, bed_product_id: item.product_id, bed_product_type: item.product_type };
      if (isNew) return createWard({ ...body, bed_count: v.bed_count });
      const add = (v.add_beds ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return updateWard((ward as Ward)._id, { ...body, add_beds: add });
    },
    onSuccess: () => {
      message.success("Ward saved");
      onSaved();
      onClose();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't save the ward")),
  });
  return (
    <Modal title={isNew ? "Add ward" : "Edit ward"} open={!!ward} onCancel={onClose} okText="Save" confirmLoading={save.isLoading} onOk={() => form.submit()} destroyOnClose>
      <Form form={form} layout="vertical" preserve={false} onFinish={(v) => save.mutate(v)}>
        <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Name the ward" }]}>
          <Input placeholder="e.g. Female Medical" />
        </Form.Item>
        <Space wrap>
          <Form.Item name="kind" label="Type">
            <Select options={WARD_KINDS} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="daily_rate" label="Bed charge per day">
            <InputNumber min={0} style={{ width: 160 }} />
          </Form.Item>
          {isNew && (
            <Form.Item name="bed_count" label="Number of beds">
              <InputNumber min={1} max={200} style={{ width: 120 }} />
            </Form.Item>
          )}
        </Space>
        <Form.Item name="item" label="Bed-days billed as (POS item)">
          <Select allowClear showSearch optionFilterProp="label" loading={isLoading} options={options} placeholder="e.g. Bed — General ward" />
        </Form.Item>
        {!isNew && (
          <Form.Item name="add_beds" label="Add beds" extra="Labels separated by commas, e.g. Bed 11, Bed 12">
            <Input />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default WardsTab;
