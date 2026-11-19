import { useCallback, useEffect } from "react";
import { Button } from "antd";
import { useAppDispatch, useAppSelector } from "../../store";
import { closeModal } from "../../features/Order/OrderSlice";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import OrderCompleteCheck, { ORDER_COMPLETE_KEYFRAMES } from "./OrderCompleteCheck";

/** How long the confirmation stays before returning to the tables view */
const AUTO_CLOSE_MS = 2600;

/**
 * Shown on /tables after an order is placed and paid: a soft card with a
 * check that draws itself, the order number and amount, then auto-closes.
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
      onClick={close}
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: `radial-gradient(circle at 50% 40%, ${primaryColor}12 0%, transparent 60%)`,
      }}
    >
      <style>{ORDER_COMPLETE_KEYFRAMES}</style>

      <div
        className="os-anim"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#ffffff",
          borderRadius: 24,
          padding: "36px 28px 24px",
          textAlign: "center",
          border: "1px solid #eef2f6",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08), 0 4px 14px rgba(15, 23, 42, 0.04)",
          position: "relative",
          overflow: "hidden",
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

        <div style={{ marginTop: 22, animation: "os-fade .4s ease-out .85s both" }}>
          <Button
            type="primary"
            size="large"
            block
            onClick={close}
            style={{
              height: 44,
              borderRadius: 12,
              fontWeight: 600,
              background: primaryColor,
              borderColor: primaryColor,
              boxShadow: `0 6px 16px ${primaryColor}33`,
            }}
          >
            Back to tables
          </Button>
        </div>

        {/* Auto-close countdown */}
        <span
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            height: 3,
            width: "100%",
            background: `${primaryColor}66`,
            transformOrigin: "left",
            animation: `os-bar ${AUTO_CLOSE_MS}ms linear both`,
          }}
        />
      </div>
    </div>
  );
}
