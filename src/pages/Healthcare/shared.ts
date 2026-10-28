import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { fetchAllInventory } from "@services/inventory";
import { useAppDispatch, useAppSelector } from "src/store";
import { useRetailQueue } from "@context/RetailQueueContext";
import { addItemToCart, createCart, getCart } from "../../features/Cart/CartActions";
import { escapeHtml } from "@utils/escapeHtml";
import { makePermissionChecker } from "@utils/accessControl";
import type { CartDetailsInterface } from "src/interfaces/CartDetailsTypes";
import type { PatientCustomer, PrescriptionItem, VisitStage } from "@services/healthcare";

/** `value`, once it has stopped changing for `delay` ms (for search boxes). */
export const useDebounced = <T,>(value: T, delay = 300): T => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return settled;
};

// ─── Access ──────────────────────────────────────────────────────────────────

/** What this user may do in Healthcare (admins may do everything). */
export const useHealthcareAccess = () => {
  const { user } = useAppSelector((state) => state.auth);
  const u = user as { rolePermissions?: string[]; permissions?: string[]; role?: string } | null;
  const can = makePermissionChecker(u?.rolePermissions ?? u?.permissions ?? [], u?.role === "admin");
  return {
    viewPatients: can("HEALTHCARE_PATIENTS_VIEW"),
    managePatients: can("HEALTHCARE_PATIENTS_MANAGE"),
    viewVisits: can("HEALTHCARE_VISITS_VIEW"),
    manageVisits: can("HEALTHCARE_VISITS_MANAGE"),
    triage: can("HEALTHCARE_TRIAGE"),
    clinicalNotes: can("HEALTHCARE_CLINICAL_NOTES"),
    prescribe: can("HEALTHCARE_PRESCRIBE"),
    viewPrescriptions: can("HEALTHCARE_PRESCRIPTIONS_VIEW"),
    dispense: can("HEALTHCARE_DISPENSE"),
    viewBatches: can("HEALTHCARE_BATCHES_VIEW"),
    manageBatches: can("HEALTHCARE_BATCHES_MANAGE"),
  };
};

export type HealthcareAccess = ReturnType<typeof useHealthcareAccess>;

/** The search permission this user holds, for the patient picker. */
export const searchPermissionFor = (a: HealthcareAccess) =>
  a.viewPatients
    ? "HEALTHCARE_PATIENTS_VIEW"
    : a.manageVisits
      ? "HEALTHCARE_VISITS_MANAGE"
      : a.prescribe
        ? "HEALTHCARE_PRESCRIBE"
        : "HEALTHCARE_DISPENSE";

// ─── Stages ──────────────────────────────────────────────────────────────────

export const STAGES: { key: VisitStage; label: string; color: string }[] = [
  { key: "waiting", label: "Waiting", color: "#64748b" },
  { key: "triage", label: "Triage", color: "#e11d48" },
  { key: "consultation", label: "Doctor", color: "#7c3aed" },
  { key: "pharmacy", label: "Pharmacy", color: "#16a34a" },
  { key: "billing", label: "Billing", color: "#f59e0b" },
];

export const STAGE_LABEL: Record<VisitStage, string> = {
  waiting: "Waiting",
  triage: "Triage",
  consultation: "Doctor",
  pharmacy: "Pharmacy",
  billing: "Billing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PRIORITY_COLOR = { normal: "default", urgent: "orange", emergency: "red" } as const;

export const VISIT_TYPE_LABEL = {
  outpatient: "Outpatient",
  walk_in_pharmacy: "Pharmacy walk-in",
  follow_up: "Follow-up",
  emergency: "Emergency",
} as const;

export const RX_STATUS = {
  pending: { label: "Pending", color: "blue" },
  partially_dispensed: { label: "Part dispensed", color: "orange" },
  dispensed: { label: "Dispensed", color: "green" },
  cancelled: { label: "Cancelled", color: "default" },
} as const;

// ─── Formatting ──────────────────────────────────────────────────────────────

export const patientName = (c?: PatientCustomer | null) => c?.customer_name || "Unnamed patient";

export const ageOf = (dob?: string) => {
  if (!dob) return "";
  const years = dayjs().diff(dayjs(dob), "year");
  return Number.isFinite(years) && years >= 0 ? `${years} yrs` : "";
};

export const waitedFor = (since: string) => {
  const mins = dayjs().diff(dayjs(since), "minute");
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export const bmiOf = (weightKg?: number | null, heightCm?: number | null) => {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
};

// ─── Medicines ───────────────────────────────────────────────────────────────

export interface MedicineOption {
  _id: string;
  name: string;
  quantity: number;
  price: number;
}

/** The shop's stock items, for choosing medicines and pricing the bill. */
export const useMedicineOptions = (enabled = true) =>
  useQuery({
    queryKey: ["healthcare-medicine-options", localStorage.getItem("shopId")],
    queryFn: async (): Promise<MedicineOption[]> => {
      const res = await fetchAllInventory({ shop_id: localStorage.getItem("shopId") });
      const rows = (Array.isArray(res) ? res : res?.data ?? []) as Partial<MedicineOption>[];
      return rows.map((r) => ({ _id: String(r._id), name: r.name ?? "", quantity: r.quantity ?? 0, price: r.price ?? 0 }));
    },
    enabled,
    staleTime: 60_000,
  });

// ─── Billing ─────────────────────────────────────────────────────────────────

export interface BillLine {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}

/**
 * Adds dispensed medicine to the cart on the POS's active patient slot, the
 * same way tapping the item on the POS does, so stock and payment work as
 * usual. Returns the slot's table id.
 */
export const useAddToBill = () => {
  const dispatch = useAppDispatch();
  const { activeTable } = useRetailQueue();
  const { user } = useAppSelector((state) => state.auth);
  const userId = (user as { id?: string; _id?: string } | null)?.id || (user as { _id?: string } | null)?._id || "";

  return useCallback(
    async (lines: BillLine[]) => {
      const tableId = activeTable?._id;
      if (!tableId) throw new Error("Open a patient slot on the POS first, then add the medicine to the bill.");

      const current = await dispatch(getCart(tableId));
      let cartId = (current.payload as { _id?: string } | undefined)?._id;
      if (!cartId) {
        const created = await dispatch(
          createCart({ table_id: tableId, created_by: userId } as unknown as CartDetailsInterface)
        );
        cartId = (created.payload as { _id?: string } | undefined)?._id;
        if (!cartId) throw new Error("Couldn't open a bill for this patient");
      }

      for (const line of lines) {
        await dispatch(
          addItemToCart({
            cart_id: cartId,
            product_id: line.product_id,
            product_type: "Product_Inventory",
            price: line.price,
            created_by: userId,
            quantity: line.quantity,
            desc: line.name,
            table_id: tableId,
          })
        );
      }
      return { tableId, slotName: (activeTable as { name?: string } | null)?.name || "" };
    },
    [activeTable, dispatch, userId]
  );
};

// ─── Dispensing labels ───────────────────────────────────────────────────────

/** Prints one small label per medicine: patient, drug, how to take it. */
export const printDispensingLabels = (opts: {
  shopName?: string;
  patient: string;
  patientNumber?: string;
  items: Pick<PrescriptionItem, "name" | "dose" | "frequency" | "duration" | "route" | "instructions">[];
  quantities: Record<string, number>;
  dispensedBy?: string;
}) => {
  const date = dayjs().format("DD MMM YYYY");
  const labels = opts.items
    .filter((item) => (opts.quantities[item.name] ?? 0) > 0)
    .map(
      (item) => `
      <div class="label">
        <div class="shop">${escapeHtml(opts.shopName || "")}</div>
        <div class="drug">${escapeHtml(item.name)} &times; ${escapeHtml(opts.quantities[item.name])}</div>
        <div class="how">${escapeHtml([item.dose, item.frequency, item.duration].filter(Boolean).join(" · "))}</div>
        ${item.route ? `<div>Route: ${escapeHtml(item.route)}</div>` : ""}
        ${item.instructions ? `<div class="inst">${escapeHtml(item.instructions)}</div>` : ""}
        <div class="foot">${escapeHtml(opts.patient)}${opts.patientNumber ? ` (${escapeHtml(opts.patientNumber)})` : ""} · ${escapeHtml(date)}${
          opts.dispensedBy ? ` · ${escapeHtml(opts.dispensedBy)}` : ""
        }</div>
        <div class="warn">Keep out of reach of children</div>
      </div>`
    )
    .join("");
  if (!labels) return;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>
    @page { size: 72mm auto; margin: 3mm; }
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; }
    .label { border: 1px dashed #000; padding: 6px; margin-bottom: 6px; page-break-inside: avoid; }
    .shop { font-weight: bold; text-align: center; font-size: 10px; }
    .drug { font-weight: bold; font-size: 13px; margin: 4px 0; }
    .how { font-size: 12px; }
    .inst { margin-top: 2px; font-style: italic; }
    .foot { margin-top: 4px; font-size: 10px; }
    .warn { font-size: 9px; text-align: center; margin-top: 3px; }
  </style></head><body>${labels}</body></html>`;

  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 200);
};
