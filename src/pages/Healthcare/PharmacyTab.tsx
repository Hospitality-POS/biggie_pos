import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Drawer, InputNumber, Modal, Input, Segmented, Space, Spin, Table, Tag, Typography, message } from "antd";
import { FileAddOutlined, PrinterOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  cancelPrescription,
  dispensePrescription,
  fetchPrescription,
  fetchPrescriptions,
  healthcareError,
  type DispensedLine,
  type Prescription,
  type PrescriptionStatus,
} from "@services/healthcare";
import { fetchShop } from "@services/shops";
import { AllergyBanner, AllergyWarnings } from "./AllergyBanner";
import PatientPickModal from "./PatientPickModal";
import PrescriptionModal from "./PrescriptionModal";
import { RX_STATUS, patientName, printDispensingLabels, useAddToBill, useHealthcareAccess, useMedicineOptions } from "./shared";

const { Text } = Typography;

type Filter = "open" | PrescriptionStatus;

const PharmacyTab: React.FC = () => {
  const access = useHealthcareAccess();
  const [filter, setFilter] = useState<Filter>("open");
  const [openId, setOpenId] = useState<string | null>(null);
  const [outsidePatient, setOutsidePatient] = useState<string>();
  const [outsideOpen, setOutsideOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data = [], isFetching } = useQuery({
    queryKey: ["healthcare-prescriptions", filter],
    queryFn: () => fetchPrescriptions({ status: filter }),
    refetchInterval: filter === "open" ? 30_000 : false,
  });

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <div style={{ flex: "1 1 220px" }}>
          <Text strong style={{ fontSize: 16, display: "block" }}>
            Pharmacy
          </Text>
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            Prescriptions from the doctor or brought in from outside
          </Text>
        </div>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "To dispense" },
            { value: "dispensed", label: "Dispensed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        {access.dispense && (
          <Button type="primary" icon={<FileAddOutlined />} onClick={() => setPickOpen(true)}>
            Outside prescription
          </Button>
        )}
      </div>
      <PatientPickModal
        open={pickOpen}
        title="Outside prescription"
        hint="Who is the prescription for?"
        onClose={() => setPickOpen(false)}
        onPicked={(id) => {
          setPickOpen(false);
          setOutsidePatient(id);
          setOutsideOpen(true);
        }}
      />

      <Table<Prescription>
        rowKey="_id"
        size="middle"
        loading={isFetching}
        dataSource={data}
        scroll={{ x: 720 }}
        onRow={(r) => ({ onClick: () => setOpenId(r._id), style: { cursor: "pointer" } })}
        locale={{ emptyText: filter === "open" ? "Nothing waiting at the pharmacy" : "No prescriptions" }}
        columns={[
          { title: "Time", dataIndex: "createdAt", width: 110, render: (d: string) => dayjs(d).format("DD MMM HH:mm") },
          {
            title: "Patient",
            render: (_, r) => (
              <span>
                <Text strong>{patientName(r.customer)}</Text>{" "}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {r.patient_number}
                </Text>
              </span>
            ),
          },
          { title: "Medicines", render: (_, r) => r.items.map((i) => i.name).join(", ") },
          { title: "From", width: 160, render: (_, r) => (r.source === "external" ? r.external_reference || "Outside" : r.prescriber_name || "—") },
          { title: "Status", width: 130, render: (_, r) => <Tag color={RX_STATUS[r.status].color}>{RX_STATUS[r.status].label}</Tag> },
        ]}
      />

      <DispenseDrawer prescriptionId={openId} onClose={() => setOpenId(null)} />
      {outsidePatient && (
        <PrescriptionModal
          open={outsideOpen}
          onClose={() => setOutsideOpen(false)}
          customerId={outsidePatient}
          source="external"
          onCreated={(rx) => {
            queryClient.invalidateQueries({ queryKey: ["healthcare-prescriptions"] });
            setOutsidePatient(undefined);
            setOpenId(rx._id);
          }}
        />
      )}
    </Space>
  );
};

/** Dispense a prescription: how much of each line, from which batch, then bill and label it. */
const DispenseDrawer: React.FC<{ prescriptionId: string | null; onClose: () => void }> = ({ prescriptionId, onClose }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const access = useHealthcareAccess();
  const addToBill = useAddToBill();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [lastDispensed, setLastDispensed] = useState<DispensedLine[]>([]);
  const [billing, setBilling] = useState(false);
  const { data: medicines = [] } = useMedicineOptions(!!prescriptionId);
  const shopId = localStorage.getItem("shopId");
  const { data: shop } = useQuery({ queryKey: ["shop", shopId], queryFn: () => fetchShop(shopId ?? ""), enabled: !!shopId });
  const priceOf = useMemo(() => new Map(medicines.map((m) => [m._id, m.price])), [medicines]);

  const { data: rx, isLoading } = useQuery({
    queryKey: ["healthcare-prescription", prescriptionId],
    queryFn: () => fetchPrescription(prescriptionId ?? ""),
    enabled: !!prescriptionId,
  });

  // Default to whatever is still left to give on each line
  useEffect(() => {
    if (!rx) return;
    setQuantities(Object.fromEntries(rx.items.map((i) => [i._id, Math.max(0, i.quantity - i.dispensed_quantity)])));
  }, [rx]);

  useEffect(() => {
    if (!prescriptionId) setLastDispensed([]);
  }, [prescriptionId]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["healthcare-prescription", prescriptionId] });
    queryClient.invalidateQueries({ queryKey: ["healthcare-prescriptions"] });
    queryClient.invalidateQueries({ queryKey: ["healthcare-visits"] });
    queryClient.invalidateQueries({ queryKey: ["healthcare-batches"] });
  };

  const dispense = useMutation({
    mutationFn: () =>
      dispensePrescription(
        prescriptionId ?? "",
        Object.entries(quantities)
          .filter(([, q]) => q > 0)
          .map(([item_id, quantity]) => ({ item_id, quantity }))
      ),
    onSuccess: ({ dispensed }) => {
      message.success("Dispensed");
      setLastDispensed(dispensed);
      refresh();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't dispense")),
  });

  const cancel = () => {
    if (!rx) return;
    let reason = "";
    Modal.confirm({
      title: "Cancel this prescription?",
      content: <Input.TextArea rows={2} placeholder="Reason" onChange={(e) => (reason = e.target.value)} />,
      okText: "Cancel prescription",
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!reason.trim()) {
          message.error("Give a reason for cancelling");
          return Promise.reject();
        }
        try {
          await cancelPrescription(rx._id, reason, rx.source);
          message.success("Prescription cancelled");
          refresh();
          onClose();
        } catch (error) {
          message.error(healthcareError(error, "Couldn't cancel"));
        }
      },
    });
  };

  const bill = async () => {
    setBilling(true);
    try {
      const { slotName } = await addToBill(
        lastDispensed.map((l) => ({ product_id: l.product_id, name: l.name, quantity: l.quantity, price: priceOf.get(l.product_id) ?? 0 }))
      );
      message.success(`Added to the bill${slotName ? ` on ${slotName}` : ""}`);
      setLastDispensed([]);
      // Billing is the next tab on the same hospital screen
      navigate({ search: "?tab=billing" });
    } catch (error) {
      message.error((error as Error).message || "Couldn't add to the bill");
    } finally {
      setBilling(false);
    }
  };

  const printLabels = () => {
    if (!rx) return;
    const given = lastDispensed.length
      ? Object.fromEntries(lastDispensed.map((l) => [l.name, l.quantity]))
      : Object.fromEntries(rx.items.map((i) => [i.name, i.dispensed_quantity]));
    printDispensingLabels({
      shopName: (shop as { name?: string } | undefined)?.name || "",
      patient: patientName(rx.customer),
      patientNumber: rx.profile?.patient_number,
      items: rx.items,
      quantities: given,
      dispensedBy: rx.dispensed_by_name,
    });
  };

  const open = rx && (rx.status === "pending" || rx.status === "partially_dispensed");
  const anyToGive = Object.values(quantities).some((q) => q > 0);

  return (
    <Drawer
      open={!!prescriptionId}
      onClose={onClose}
      width={Math.min(760, window.innerWidth)}
      destroyOnClose
      title={rx ? `Prescription · ${patientName(rx.customer)}` : "Prescription"}
      extra={
        rx &&
        rx.status === "pending" &&
        (rx.source === "external" ? access.dispense : access.prescribe) && (
          <Button danger type="text" onClick={cancel}>
            Cancel
          </Button>
        )
      }
    >
      {isLoading || !rx ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <AllergyBanner allergies={rx.profile?.allergies} />
          <AllergyWarnings warnings={rx.warnings} />
          <Text type="secondary">
            {rx.source === "external" ? `Outside prescription · ${rx.external_reference}` : `Prescribed by ${rx.prescriber_name || "—"}`} ·{" "}
            {dayjs(rx.createdAt).format("DD MMM YYYY, HH:mm")} · <Tag color={RX_STATUS[rx.status].color}>{RX_STATUS[rx.status].label}</Tag>
          </Text>
          {rx.notes && <Alert type="info" message={rx.notes} />}

          <Table
            rowKey="_id"
            size="small"
            pagination={false}
            dataSource={rx.items}
            scroll={{ x: 600 }}
            columns={[
              {
                title: "Medicine",
                render: (_, item) => (
                  <div>
                    <Text strong>{item.name}</Text>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {[item.dose, item.frequency, item.duration, item.route].filter(Boolean).join(" · ")}
                    </div>
                    {item.instructions && <div style={{ fontSize: 12, fontStyle: "italic" }}>{item.instructions}</div>}
                  </div>
                ),
              },
              { title: "Prescribed", dataIndex: "quantity", width: 90 },
              { title: "Given", dataIndex: "dispensed_quantity", width: 70 },
              ...(open && access.dispense
                ? [
                    {
                      title: "Give now",
                      width: 110,
                      render: (_: unknown, item: (typeof rx.items)[number]) => {
                        const left = item.quantity - item.dispensed_quantity;
                        return (
                          <InputNumber
                            min={0}
                            max={left}
                            value={quantities[item._id] ?? 0}
                            disabled={left <= 0}
                            onChange={(v) => setQuantities((q) => ({ ...q, [item._id]: Number(v) || 0 }))}
                            style={{ width: 90 }}
                          />
                        );
                      },
                    },
                  ]
                : []),
              ...(rx.batch_tracking
                ? [
                    {
                      title: "Batch",
                      width: 200,
                      render: (_: unknown, item: (typeof rx.items)[number]) => {
                        if (item.suggested_batches?.length || item.short) {
                          return (
                            <div style={{ fontSize: 12 }}>
                              {item.suggested_batches?.map((b) => (
                                <div key={b.batch_id}>
                                  {b.batch_number} · exp {dayjs(b.expiry_date).format("MM/YY")} · {b.quantity}
                                </div>
                              ))}
                              {!!item.short && <Text type="danger">Short by {item.short} in batches</Text>}
                            </div>
                          );
                        }
                        return (
                          <div style={{ fontSize: 12 }}>
                            {item.dispensed_batches?.map((b, i) => (
                              <div key={i}>
                                {b.batch_number} · exp {dayjs(b.expiry_date).format("MM/YY")} · {b.quantity}
                              </div>
                            )) || "—"}
                          </div>
                        );
                      },
                    },
                  ]
                : []),
            ]}
          />
          {rx.batch_tracking && open && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Stock is taken from the soonest-expiring batch first. Expired batches are skipped.
            </Text>
          )}

          <Space wrap>
            {open && access.dispense && (
              <Button type="primary" disabled={!anyToGive} loading={dispense.isLoading} onClick={() => dispense.mutate()}>
                Dispense
              </Button>
            )}
            {!!lastDispensed.length && (
              <Button icon={<ShoppingCartOutlined />} loading={billing} onClick={bill}>
                Add to bill on POS
              </Button>
            )}
            {rx.items.some((i) => i.dispensed_quantity > 0) && (
              <Button icon={<PrinterOutlined />} onClick={printLabels}>
                Print labels
              </Button>
            )}
          </Space>
        </Space>
      )}
    </Drawer>
  );
};

export default PharmacyTab;
