import React from "react";
import { Drawer } from "antd";

export interface BiasharaDrawerProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  header: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export const BiasharaDrawer: React.FC<BiasharaDrawerProps> = ({
  open,
  onClose,
  isMobile,
  header,
  children,
  footer,
}) => {
  return (
    <>
      <style>{`
        @keyframes soundWaveBar {
          0% { height: 4px; opacity: 0.5; transform: scaleY(0.7); }
          100% { height: 16px; opacity: 1; transform: scaleY(1); }
        }
      `}</style>

      <Drawer
        open={open}
        onClose={onClose}
        width={isMobile ? "100%" : 480}
        closeIcon={null}
        styles={{
          body: {
            padding: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            background: "#f8fafc",
          },
          header: {
            padding: "12px 16px",
            background: "#ffffff",
            borderBottom: "1px solid #eef2f6",
          },
        }}
        title={header}
      >
        {children}
        {footer}
      </Drawer>
    </>
  );
};
