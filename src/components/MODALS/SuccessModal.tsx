import { useCallback, useEffect } from "react";
import { Button } from "antd";
import { useAppDispatch, useAppSelector } from "../../store";
import { closeModal } from "../../features/Order/OrderSlice";
import { usePrimaryColor } from "@context/PrimaryColorContext";

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
      <style>{`
        @keyframes os-card { from { opacity: 0; transform: translateY(12px) scale(.97) } to { opacity: 1; transform: none } }
        @keyframes os-ring { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes os-pulse { 0% { transform: scale(1); opacity: .5 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes os-draw { to { stroke-dashoffset: 0 } }
        @keyframes os-fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @keyframes os-bar { from { transform: scaleX(1) } to { transform: scaleX(0) } }
        @media (prefers-reduced-motion: reduce) {
          .os-anim, .os-anim * { animation-duration: 1ms !important; animation-delay: 0ms !important; }
        }
      `}</style>

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
        <div style={{ position: "relative", width: 84, height: 84, margin: "0 auto 20px" }}>
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: primaryColor,
              animation: "os-pulse 1.4s ease-out .5s both",
            }}
          />
          <div
            style={{
              position: "relative",
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: `${primaryColor}17`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "os-ring .5s cubic-bezier(.2,.8,.2,1) .1s both",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
              <circle
                cx="22"
                cy="22"
                r="20"
                stroke={primaryColor}
                strokeWidth="2.5"
                strokeDasharray="126"
                strokeDashoffset="126"
                style={{ animation: "os-draw .6s ease-out .25s forwards" }}
              />
              <path
                d="M13.5 22.5l6 6 11-12"
                stroke={primaryColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="30"
                strokeDashoffset="30"
                style={{ animation: "os-draw .4s ease-out .7s forwards" }}
              />
            </svg>
          </div>
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
