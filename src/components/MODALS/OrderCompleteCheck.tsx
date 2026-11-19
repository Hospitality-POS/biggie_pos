import React from "react";

/** Keyframes shared by the order/payment complete screens */
export const ORDER_COMPLETE_KEYFRAMES = `
  @keyframes os-card { from { opacity: 0; transform: translateY(12px) scale(.97) } to { opacity: 1; transform: none } }
  @keyframes os-ring { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
  @keyframes os-pulse { 0% { transform: scale(1); opacity: .45 } 100% { transform: scale(1.6); opacity: 0 } }
  @keyframes os-draw { to { stroke-dashoffset: 0 } }
  @keyframes os-fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
  @keyframes os-bar { from { transform: scaleX(1) } to { transform: scaleX(0) } }
  @media (prefers-reduced-motion: reduce) {
    .os-anim, .os-anim * { animation-duration: 1ms !important; animation-delay: 0ms !important; }
  }
`;

/** A check mark in the shop's colour that draws itself inside a soft circle. */
const OrderCompleteCheck: React.FC<{ color: string; size?: number }> = ({ color, size = 84 }) => {
  const icon = Math.round(size * 0.52);
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: color,
          animation: "os-pulse 1.4s ease-out .5s both",
        }}
      />
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          background: `${color}17`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "os-ring .5s cubic-bezier(.2,.8,.2,1) .1s both",
        }}
      >
        <svg width={icon} height={icon} viewBox="0 0 44 44" fill="none" aria-hidden="true">
          <circle
            cx="22"
            cy="22"
            r="20"
            stroke={color}
            strokeWidth="2.5"
            strokeDasharray="126"
            strokeDashoffset="126"
            style={{ animation: "os-draw .6s ease-out .25s forwards" }}
          />
          <path
            d="M13.5 22.5l6 6 11-12"
            stroke={color}
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
  );
};

export default OrderCompleteCheck;
