import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { closeModal } from "../../features/Order/OrderSlice";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import OrderCompleteCheck, { ORDER_COMPLETE_KEYFRAMES } from "./OrderCompleteCheck";

/** How long the confirmation stays before returning to the tables view */
const AUTO_CLOSE_MS = 2600;

/**
 * Shown on /tables after an order is placed and paid, in place of the tables:
 * a check that draws itself, the order number and amount. It returns to the
 * tables on its own, or sooner on a tap anywhere.
 */
export default function SuccesssModal() {
  const dispatch = useAppDispatch();
  const primaryColor = usePrimaryColor() || "#10b981";
  const lastOrder = useAppSelector((state) => {
    const orders = state.order.orders;
    return orders.length ? orders[orders.length - 1] : null;
  });

  const close = useCallback(() => dispatch(closeModal()), [dispatch]);

  useEffect(() => {
    const t = window.setTimeout(close, AUTO_CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [close]);

  // createOrder resolves to { order, financials }; older responses were the order itself
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = lastOrder as any;
  const order = res?.order ?? res;
  const orderNo: string | undefined = order?.order_no;
  const amount = Number(res?.financials?.finalOrderAmount ?? order?.order_amount);
  const showAmount = Number.isFinite(amount) && amount > 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="os-anim"
      onClick={close}
      style={{
        // Fills the page area under the top bar (its height plus the page
        // padding is about 160px), with no card around the content.
        minHeight: "calc(100vh - 160px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: `radial-gradient(circle at 50% 45%, ${primaryColor}12 0%, transparent 60%)`,
      }}
    >
      <style>{ORDER_COMPLETE_KEYFRAMES}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 360,
          textAlign: "center",
          animation: "os-card .45s cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        {/* Check mark */}
        <div style={{ marginBottom: 20 }}>
          <OrderCompleteCheck color={primaryColor} />
        </div>

        <div style={{ animation: "os-fade .4s ease-out .55s both" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
            Order complete
          </div>
          <div style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>
            Payment received{orderNo ? ` · Order #${orderNo}` : ""}
          </div>
        </div>

        {showAmount && (
          <div
            style={{
              margin: "18px auto 0",
              display: "inline-block",
              padding: "8px 18px",
              borderRadius: 999,
              background: "#f8fafc",
              border: "1px solid #eef2f6",
              fontSize: 18,
              fontWeight: 700,
              color: "#0f172a",
              animation: "os-fade .4s ease-out .7s both",
            }}
          >
            KES {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        )}
      </div>
    </div>
  );
}
