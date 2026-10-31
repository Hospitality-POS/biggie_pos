import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
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
import { DeleteOutlined, FileAddOutlined, PlusOutlined, PrinterOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  approveClaim,
  createClaim,
  createPayer,
  fetchClaim,
  fetchClaims,
  fetchPayers,
  fetchVisitClaimLines,
  fetchVisits,
  healthcareError,
  recordClaimPayment,
  rejectClaim,
  submitClaim,
  updateClaim,
  updatePayer,
  type Claim,
  type ClaimLine,
  type Payer,
  type Scheme,
} from "@services/healthcare";
import { fetchShop } from "@services/shops";
import { escapeHtml } from "@utils/escapeHtml";
import { CLAIM_STATUS_TAG, money, patientName, printHtml, useHealthcareAccess } from "./shared";

const { Text } = Typography;

const LINE_KINDS: { value: ClaimLine["kind"]; label: string }[] = [
  { value: "consultation", label: "Consultation" },
  { value: "lab", label: "Lab" },
  { value: "radiology", label: "Imaging" },
  { value: "medicine", label: "Medicine" },
  { value: "procedure", label: "Procedure" },
  { value: "other", label: "Other" },
];

type View = "outstanding" | "draft" | "paid" | "rejected" | "all" | "payers";

/** The patient's co-pay and the payer's share (mirrors the API). */
const split = (total: number, scheme?: Scheme | null) => {
  let copay = 0;
  if (scheme?.copay_type === "percent") copay = (total * (scheme.copay_value || 0)) / 100;
  if (scheme?.copay_type === "fixed") copay = Math.min(scheme.copay_value || 0, total);
  let claim = total - copay;
  if (scheme?.visit_limit != null && claim > scheme.visit_limit) {
    copay += claim - scheme.visit_limit;
    claim = scheme.visit_limit;
  }
  return { copay, claim };
};

const ClaimsTab: React.FC = () => {
  const access = useHealthcareAccess();
  const [view, setView] = useState<View>("outstanding");
  const [openId, setOpenId] = useState<string | null>(null);
  const [newVisitId, setNewVisitId] = useState<string | null>(null);
  const [pickVisit, setPickVisit] = useState(false);

  const { data: claims = [], isFetching } = useQuery({
    queryKey: ["healthcare-claims", view],
    queryFn: () => fetchClaims(view === "all" || view === "payers" ? {} : { status: view }),
    enabled: view !== "payers",
  });

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: "outstanding", label: "Outstanding" },
            { value: "draft", label: "Drafts" },
            { value: "paid", label: "Paid" },
            { value: "rejected", label: "Rejected" },
            { value: "all", label: "All" },
            ...(access.managePayers ? [{ value: "payers" as View, label: "Insurers & schemes" }] : []),
          ]}
        />
        {access.manageClaims && view !== "payers" && (
          <Button type="primary" icon={<FileAddOutlined />} onClick={() => setPickVisit(true)}>
            New claim
          </Button>
        )}
      </Space>

      {view === "payers" ? (
        <PayersPanel />
      ) : (
        <Table<Claim>
          rowKey="_id"
          size="middle"
          loading={isFetching}
          dataSource={claims}
          scroll={{ x: 820 }}
          onRow={(c) => ({ onClick: () => setOpenId(c._id), style: { cursor: "pointer" } })}
          locale={{ emptyText: "No claims" }}
          columns={[
            { title: "Claim", dataIndex: "claim_number", width: 120 },
            { title: "Date", dataIndex: "createdAt", width: 110, render: (d: string) => dayjs(d).format("DD MMM YYYY") },
            { title: "Patient", render: (_, c) => <Text strong>{patientName(c.customer)}</Text> },
            { title: "Payer", render: (_, c) => `${c.payer_name}${c.scheme_name ? ` · ${c.scheme_name}` : ""}` },
            { title: "Claimed", width: 110, align: "right", render: (_, c) => money(c.claim_amount) },
            { title: "Paid", width: 100, align: "right", render: (_, c) => money(c.paid_amount) },
            { title: "Status", width: 120, render: (_, c) => <Tag color={CLAIM_STATUS_TAG[c.status].color}>{CLAIM_STATUS_TAG[c.status].label}</Tag> },
          ]}
        />
      )}

      <VisitPickerModal
        open={pickVisit}
        onClose={() => setPickVisit(false)}
        onPick={(visitId) => {
          setPickVisit(false);
          setNewVisitId(visitId);
        }}
      />
      <ClaimDrawer
        claimId={openId}
        newVisitId={newVisitId}
        onClose={() => {
          setOpenId(null);
          setNewVisitId(null);
        }}
        onCreated={(id) => {
          setNewVisitId(null);
          setOpenId(id);
        }}
      />
    </Space>
  );
};

/** Recent insured or corporate visits to claim for. */
const VisitPickerModal: React.FC<{ open: boolean; onClose: () => void; onPick: (visitId: string) => void }> = ({ open, onClose, onPick }) => {
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ["healthcare-visits", "for-claims"],
    queryFn: () => fetchVisits({}),
    enabled: open,
  });
  const insured = visits.filter((v) => v.payer !== "cash" && v.stage !== "cancelled");
  return (
    <Modal title="Claim for which visit?" open={open} onCancel={onClose} footer={null} width={640} destroyOnClose>
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 30 }}>
          <Spin />
        </div>
      ) : insured.length ? (
        <Table
          rowKey="_id"
          size="small"
          dataSource={insured}
          pagination={{ pageSize: 8 }}
          onRow={(v) => ({ onClick: () => onPick(v._id), style: { cursor: "pointer" } })}
          columns={[
            { title: "Date", render: (_, v) => dayjs(v.checked_in_at).format("DD MMM HH:mm"), width: 110 },
            { title: "Visit", dataIndex: "visit_number", width: 100 },
            { title: "Patient", render: (_, v) => patientName(v.customer) },
            { title: "Payer", dataIndex: "payer", width: 100 },
          ]}
        />
      ) : (
        <Empty description="No insured or corporate visits. Choose the payer when checking the patient in." />
      )}
    </Modal>
  );
};

interface ClaimForm {
  payer_id?: string;
  scheme_id?: string;
  member_number?: string;
  principal_member?: string;
  preauth_number?: string;
  notes?: string;
  lines: ClaimLine[];
}

/** A claim, or a new one for a visit: lines, co-pay split, and its journey to paid. */
export const ClaimDrawer: React.FC<{
  claimId: string | null;
  newVisitId?: string | null;
  onClose: () => void;
  onCreated?: (claimId: string) => void;
}> = ({ claimId, newVisitId, onClose, onCreated }) => {
  const queryClient = useQueryClient();
  const access = useHealthcareAccess();
  const [form] = Form.useForm<ClaimForm>();
  const isNew = !claimId && !!newVisitId;
  const open = !!claimId || isNew;
  const shopId = localStorage.getItem("shopId");
  const { data: shop } = useQuery({ queryKey: ["shop", shopId], queryFn: () => fetchShop(shopId ?? ""), enabled: !!shopId && open });

  const { data: payers = [] } = useQuery({ queryKey: ["healthcare-payers", "active"], queryFn: () => fetchPayers(true), enabled: open });
  const { data: claim, isLoading } = useQuery({ queryKey: ["healthcare-claim", claimId], queryFn: () => fetchClaim(claimId ?? ""), enabled: !!claimId });
  const { data: draft, isLoading: draftLoading } = useQuery({
    queryKey: ["healthcare-claim-lines", newVisitId],
    queryFn: () => fetchVisitClaimLines(newVisitId ?? ""),
    enabled: isNew,
  });

  useEffect(() => {
    if (isNew && draft) {
      form.setFieldsValue({
        payer_id: draft.payer_id ?? undefined,
        scheme_id: draft.scheme_id ?? undefined,
        member_number: draft.member_number,
        principal_member: draft.principal_member,
        lines: [{ kind: "consultation", description: "Consultation", quantity: 1, unit_price: 0 }, ...draft.lines],
      });
    } else if (claim) {
      form.setFieldsValue({
        payer_id: claim.payer_id,
        scheme_id: claim.scheme_id ?? undefined,
        member_number: claim.member_number,
        principal_member: claim.principal_member,
        preauth_number: claim.preauth_number,
        notes: claim.notes,
        lines: claim.lines,
      });
    }
  }, [isNew, draft, claim, form]);

  const editable = isNew || claim?.status === "draft";
  const payerId = Form.useWatch("payer_id", form);
  const schemeId = Form.useWatch("scheme_id", form);
  const lines = Form.useWatch("lines", form) ?? [];
  const payer = payers.find((p) => p._id === payerId);
  const scheme = payer?.schemes.find((s) => s._id === schemeId) ?? null;
  const total = lines.reduce((s: number, l: ClaimLine) => s + (Number(l?.quantity) || 0) * (Number(l?.unit_price) || 0), 0);
  const preview = split(total, scheme);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["healthcare-claims"] });
    queryClient.invalidateQueries({ queryKey: ["healthcare-claim", claimId] });
    queryClient.invalidateQueries({ queryKey: ["healthcare-visit"] });
  };

  const save = useMutation({
    mutationFn: async (v: ClaimForm) => {
      const cleanLines = (v.lines ?? []).filter((l) => l?.description);
      if (isNew) {
        return createClaim({
          visit_id: newVisitId ?? undefined,
          payer_id: v.payer_id ?? "",
          scheme_id: v.scheme_id,
          member_number: v.member_number,
          principal_member: v.principal_member,
          preauth_number: v.preauth_number,
          notes: v.notes,
          lines: cleanLines,
        });
      }
      return updateClaim(claimId ?? "", {
        member_number: v.member_number,
        principal_member: v.principal_member,
        preauth_number: v.preauth_number,
        notes: v.notes,
        lines: cleanLines,
      });
    },
    onSuccess: (saved) => {
      message.success(isNew ? `Claim ${saved.claim_number} started` : "Claim saved");
      refresh();
      if (isNew) onCreated?.(saved._id);
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't save the claim")),
  });

  const act = (fn: () => Promise<Claim>, done: string) =>
    fn()
      .then(() => {
        message.success(done);
        refresh();
      })
      .catch((error) => {
        message.error(healthcareError(error, "Couldn't update the claim"));
        throw error;
      });

  const submit = async () => {
    // Save edits first so what is submitted is what is on screen
    const values = await form.validateFields();
    await save.mutateAsync(values);
    await act(() => submitClaim(claimId ?? ""), "Claim submitted");
  };

  const approve = () => {
    let amount = claim?.claim_amount ?? 0;
    Modal.confirm({
      title: "Approved amount",
      content: <InputNumber defaultValue={amount} min={0} max={claim?.claim_amount} style={{ width: "100%" }} onChange={(v) => (amount = Number(v) || 0)} />,
      okText: "Record approval",
      onOk: () => act(() => approveClaim(claimId ?? "", amount), "Approval recorded"),
    });
  };

  const reject = () => {
    let reason = "";
    Modal.confirm({
      title: "Rejected by the payer",
      content: <Input.TextArea rows={2} placeholder="The payer's reason" onChange={(e) => (reason = e.target.value)} />,
      okText: "Record rejection",
      okButtonProps: { danger: true },
      onOk: () => {
        if (!reason.trim()) {
          message.error("Give the payer's reason");
          return Promise.reject();
        }
        return act(() => rejectClaim(claimId ?? "", reason), "Rejection recorded");
      },
    });
  };

  const pay = () => {
    const owed = (claim?.approved_amount ?? claim?.claim_amount ?? 0) - (claim?.paid_amount ?? 0);
    let amount = owed;
    let reference = "";
    let date = dayjs();
    Modal.confirm({
      title: "Payment received",
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <InputNumber defaultValue={owed} min={0} max={owed} style={{ width: "100%" }} addonBefore="Amount" onChange={(v) => (amount = Number(v) || 0)} />
          <Input placeholder="Reference (EFT, cheque no.)" onChange={(e) => (reference = e.target.value)} />
          <DatePicker defaultValue={date} format="DD/MM/YYYY" style={{ width: "100%" }} onChange={(d) => (date = d ?? dayjs())} />
        </Space>
      ),
      okText: "Record payment",
      onOk: () => act(() => recordClaimPayment(claimId ?? "", { amount, reference, date: date.toISOString() }), "Payment recorded"),
    });
  };

  const print = () => {
    if (!claim) return;
    const e = escapeHtml;
    printHtml(
      claim.claim_number,
      `<h1>${e((shop as { name?: string } | undefined)?.name || "")}</h1>
       <div><b>Claim form</b> · ${e(claim.claim_number)} · ${e(dayjs(claim.createdAt).format("DD MMM YYYY"))}</div>
       <table>
         <tr><td><b>Payer</b> ${e(claim.payer_name)}</td><td><b>Scheme</b> ${e(claim.scheme_name || "—")}</td></tr>
         <tr><td><b>Patient</b> ${e(patientName(claim.customer))} ${claim.profile?.patient_number ? `(${e(claim.profile.patient_number)})` : ""}</td><td><b>ID no.</b> ${e(claim.profile?.national_id || "—")}</td></tr>
         <tr><td><b>Member no.</b> ${e(claim.member_number || "—")}</td><td><b>Principal member</b> ${e(claim.principal_member || "—")}</td></tr>
         <tr><td><b>Pre-authorisation</b> ${e(claim.preauth_number || "—")}</td><td></td></tr>
       </table>
       <h2>Diagnosis</h2>
       <div>${(claim.diagnoses ?? []).map((d) => `${e(d.code ? `${d.code} ` : "")}${e(d.description)}`).join("<br>") || "—"}</div>
       <h2>Services</h2>
       <table><tr><th>Item</th><th>Type</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Amount</th></tr>
       ${claim.lines
         .map(
           (l) =>
             `<tr><td>${e(l.description)}</td><td>${e(LINE_KINDS.find((k) => k.value === l.kind)?.label ?? l.kind)}</td><td class="right">${e(l.quantity)}</td><td class="right">${e(
               money(l.unit_price)
             )}</td><td class="right">${e(money(l.amount))}</td></tr>`
         )
         .join("")}
       <tr><td colspan="4" class="right"><b>Total</b></td><td class="right"><b>${e(money(claim.total))}</b></td></tr>
       <tr><td colspan="4" class="right">Paid by patient (co-pay)</td><td class="right">${e(money(claim.copay_amount))}</td></tr>
       <tr><td colspan="4" class="right"><b>Claimed</b></td><td class="right"><b>${e(money(claim.claim_amount))}</b></td></tr></table>
       <div class="sign"><div>Patient signature: ____________________</div><div>Doctor / stamp: ____________________</div></div>`
    );
  };

  const busy = isLoading || (isNew && draftLoading);
  const title = isNew ? "New claim" : claim ? `${claim.claim_number} · ${patientName(claim.customer)}` : "Claim";

  return (
    <Drawer open={open} onClose={onClose} width={Math.min(860, window.innerWidth)} destroyOnClose title={title}>
      {busy ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          {claim && (
            <Space wrap>
              <Tag color={CLAIM_STATUS_TAG[claim.status].color}>{CLAIM_STATUS_TAG[claim.status].label}</Tag>
              {claim.submitted_at && <Text type="secondary">Submitted {dayjs(claim.submitted_at).format("DD MMM YYYY")}</Text>}
            </Space>
          )}
          {claim?.status === "rejected" && <Alert type="error" showIcon message="Rejected" description={claim.rejection_reason} />}

          <Form form={form} layout="vertical" disabled={!editable || !access.manageClaims} onFinish={(v) => save.mutate(v)}>
            <Space wrap>
              <Form.Item name="payer_id" label="Payer" rules={[{ required: true, message: "Choose the payer" }]}>
                <Select
                  style={{ width: 220 }}
                  disabled={!isNew}
                  options={payers.map((p) => ({ value: p._id, label: p.name }))}
                  onChange={() => form.setFieldValue("scheme_id", undefined)}
                  notFoundContent="Set up payers under Insurers & schemes"
                />
              </Form.Item>
              <Form.Item name="scheme_id" label="Scheme">
                <Select
                  allowClear
                  style={{ width: 200 }}
                  disabled={!isNew}
                  options={(payer?.schemes ?? []).filter((s) => s.is_active !== false).map((s) => ({ value: s._id, label: s.name }))}
                />
              </Form.Item>
              <Form.Item name="member_number" label="Member no.">
                <Input style={{ width: 160 }} />
              </Form.Item>
              <Form.Item name="principal_member" label="Principal member">
                <Input style={{ width: 180 }} />
              </Form.Item>
              <Form.Item name="preauth_number" label="Pre-authorisation no.">
                <Input style={{ width: 170 }} />
              </Form.Item>
            </Space>
            {scheme && (
              <Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
                Co-pay: {scheme.copay_type === "none" ? "none" : scheme.copay_type === "percent" ? `${scheme.copay_value}%` : money(scheme.copay_value)}
                {scheme.visit_limit != null && ` · visit limit ${money(scheme.visit_limit)}`}
                {scheme.preauth_above != null && ` · pre-authorisation above ${money(scheme.preauth_above)}`}
              </Text>
            )}

            <Card size="small" title="What is being claimed">
              <Form.List name="lines">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <Space key={field.key} align="start" wrap>
                        <Form.Item name={[field.name, "kind"]} initialValue="other">
                          <Select style={{ width: 130 }} options={LINE_KINDS} />
                        </Form.Item>
                        <Form.Item name={[field.name, "description"]} rules={[{ required: true, message: "Describe it" }]}>
                          <Input placeholder="Description" style={{ width: 240 }} />
                        </Form.Item>
                        <Form.Item name={[field.name, "quantity"]} initialValue={1}>
                          <InputNumber min={0} style={{ width: 70 }} />
                        </Form.Item>
                        <Form.Item name={[field.name, "unit_price"]} initialValue={0}>
                          <InputNumber min={0} style={{ width: 110 }} placeholder="Price" />
                        </Form.Item>
                        <Text style={{ lineHeight: "32px", minWidth: 80, display: "inline-block", textAlign: "right" }}>
                          {money((Number(lines[field.name]?.quantity) || 0) * (Number(lines[field.name]?.unit_price) || 0))}
                        </Text>
                        {editable && access.manageClaims && (
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label="Remove line" />
                        )}
                      </Space>
                    ))}
                    {editable && access.manageClaims && (
                      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ kind: "other", quantity: 1, unit_price: 0 })}>
                        Add line
                      </Button>
                    )}
                  </>
                )}
              </Form.List>
            </Card>

            <Descriptions size="small" column={{ xs: 1, sm: 3 }} bordered style={{ marginTop: 12 }}>
              <Descriptions.Item label="Total">{money(editable ? total : claim?.total)}</Descriptions.Item>
              <Descriptions.Item label="Patient pays (co-pay)">{money(editable ? preview.copay : claim?.copay_amount)}</Descriptions.Item>
              <Descriptions.Item label="Claimed">
                <Text strong>{money(editable ? preview.claim : claim?.claim_amount)}</Text>
              </Descriptions.Item>
              {claim?.approved_amount != null && <Descriptions.Item label="Approved">{money(claim.approved_amount)}</Descriptions.Item>}
              {claim && claim.status !== "draft" && <Descriptions.Item label="Paid">{money(claim.paid_amount)}</Descriptions.Item>}
            </Descriptions>

            <Form.Item name="notes" label="Notes" style={{ marginTop: 12 }}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>

          {!!claim?.payments.length && (
            <Card size="small" title="Payments received">
              {claim.payments.map((p, i) => (
                <div key={p._id ?? i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <Text>
                    {dayjs(p.date).format("DD MMM YYYY")} {p.reference && `· ${p.reference}`}
                  </Text>
                  <Text strong>{money(p.amount)}</Text>
                </div>
              ))}
            </Card>
          )}

          {access.manageClaims && (
            <Space wrap>
              {editable && (
                <Button type={isNew ? "primary" : "default"} loading={save.isLoading} onClick={() => form.submit()}>
                  {isNew ? "Start claim" : "Save draft"}
                </Button>
              )}
              {claim?.status === "draft" && (
                <Button type="primary" onClick={submit}>
                  Submit to payer
                </Button>
              )}
              {claim?.status === "submitted" && <Button onClick={approve}>Approved</Button>}
              {claim && ["submitted", "approved"].includes(claim.status) && (
                <Button danger onClick={reject}>
                  Rejected
                </Button>
              )}
              {claim && ["submitted", "approved", "partially_paid"].includes(claim.status) && (
                <Button type="primary" onClick={pay}>
                  Payment received
                </Button>
              )}
            </Space>
          )}
          {claim && (
            <Button icon={<PrinterOutlined />} onClick={print} style={{ alignSelf: "flex-start" }}>
              Print claim form
            </Button>
          )}
        </Space>
      )}
    </Drawer>
  );
};

/** Insurers, corporate and government payers, and their schemes. */
const PayersPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Payer | "new" | null>(null);
  const { data: payers = [], isFetching } = useQuery({ queryKey: ["healthcare-payers", "all"], queryFn: () => fetchPayers(false, "HEALTHCARE_PAYERS_MANAGE") });
  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing("new")} style={{ alignSelf: "flex-start" }}>
        Add payer
      </Button>
      <Table<Payer>
        rowKey="_id"
        size="middle"
        loading={isFetching}
        dataSource={payers}
        onRow={(p) => ({ onClick: () => setEditing(p), style: { cursor: "pointer" } })}
        locale={{ emptyText: "No payers set up yet" }}
        columns={[
          { title: "Payer", dataIndex: "name", render: (n: string) => <Text strong>{n}</Text> },
          { title: "Type", dataIndex: "kind", width: 120 },
          { title: "Schemes", render: (_, p) => p.schemes.map((s) => <Tag key={s._id ?? s.name}>{s.name}</Tag>) },
          { title: "Pays in", width: 90, render: (_, p) => `${p.payment_terms_days ?? 30} days` },
          { title: "Active", width: 80, render: (_, p) => (p.is_active ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>) },
        ]}
      />
      <PayerModal payer={editing} onClose={() => setEditing(null)} onSaved={() => queryClient.invalidateQueries({ queryKey: ["healthcare-payers"] })} />
    </Space>
  );
};

const PayerModal: React.FC<{ payer: Payer | "new" | null; onClose: () => void; onSaved: () => void }> = ({ payer, onClose, onSaved }) => {
  const [form] = Form.useForm<Payer>();
  const isNew = payer === "new";
  useEffect(() => {
    if (!payer) return;
    form.setFieldsValue(
      payer === "new"
        ? { kind: "insurance", payment_terms_days: 30, is_active: true, schemes: [{ name: "Outpatient", copay_type: "none", copay_value: 0 }] }
        : payer
    );
  }, [payer, form]);
  const save = useMutation({
    mutationFn: (v: Payer) => (isNew ? createPayer(v) : updatePayer((payer as Payer)._id, v)),
    onSuccess: () => {
      message.success("Payer saved");
      onSaved();
      onClose();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't save the payer")),
  });
  const kindOptions = useMemo(
    () => [
      { value: "insurance", label: "Insurance" },
      { value: "corporate", label: "Corporate (employer)" },
      { value: "government", label: "Government (e.g. SHA)" },
    ],
    []
  );
  return (
    <Modal title={isNew ? "Add payer" : "Edit payer"} open={!!payer} onCancel={onClose} onOk={() => form.submit()} okText="Save" confirmLoading={save.isLoading} width={820} destroyOnClose>
      <Form form={form} layout="vertical" preserve={false} onFinish={(v) => save.mutate(v)}>
        <Space wrap>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Name the payer" }]}>
            <Input placeholder="e.g. Jubilee Insurance" style={{ width: 230 }} />
          </Form.Item>
          <Form.Item name="kind" label="Type">
            <Select style={{ width: 200 }} options={kindOptions} />
          </Form.Item>
          <Form.Item name="payment_terms_days" label="Usually pays in (days)">
            <InputNumber min={0} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>
        <Space wrap>
          <Form.Item name="contact_person" label="Contact person">
            <Input style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="email" label="Claims email">
            <Input style={{ width: 220 }} />
          </Form.Item>
        </Space>
        <Text strong style={{ display: "block", marginBottom: 6 }}>
          Schemes
        </Text>
        <Form.List name="schemes">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="start" wrap>
                  <Form.Item name={[field.name, "_id"]} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name={[field.name, "name"]} rules={[{ required: true, message: "Name" }]}>
                    <Input placeholder="Scheme, e.g. Outpatient" style={{ width: 170 }} />
                  </Form.Item>
                  <Form.Item name={[field.name, "copay_type"]} initialValue="none">
                    <Select
                      style={{ width: 130 }}
                      options={[
                        { value: "none", label: "No co-pay" },
                        { value: "percent", label: "Co-pay %" },
                        { value: "fixed", label: "Fixed co-pay" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name={[field.name, "copay_value"]} initialValue={0}>
                    <InputNumber min={0} style={{ width: 90 }} placeholder="Co-pay" />
                  </Form.Item>
                  <Form.Item name={[field.name, "preauth_above"]} tooltip="Claims above this need a pre-authorisation number">
                    <InputNumber min={0} style={{ width: 130 }} placeholder="Pre-auth above" />
                  </Form.Item>
                  <Form.Item name={[field.name, "visit_limit"]}>
                    <InputNumber min={0} style={{ width: 120 }} placeholder="Visit limit" />
                  </Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label="Remove scheme" />
                </Space>
              ))}
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ copay_type: "none", copay_value: 0 })}>
                Add scheme
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default ClaimsTab;
