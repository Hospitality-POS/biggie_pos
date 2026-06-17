import React from "react";
import { Spin } from "antd";
import { getPrimaryColor } from "@utils/getPrimaryColor";
import { COOP_NAME } from "@utils/config";
import reliaLogo from "/relia.png";

const LogoLoader: React.FC = () => {
  const primaryColor = getPrimaryColor();
  const backgroundColor = primaryColor || "#2c3e50";
  const secondaryColor = primaryColor ? `${primaryColor}99` : "#1a252f";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${backgroundColor} 0%, ${secondaryColor} 100%)`,
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* Decorative background elements */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
          animation: "rotate 20s linear infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: "20%",
          width: "300px",
          height: "300px",
          background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
          borderRadius: "50%",
          animation: "float 6s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          left: "20%",
          width: "200px",
          height: "200px",
          background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
          borderRadius: "50%",
          animation: "float 8s ease-in-out infinite reverse",
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          padding: "48px",
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "140px",
              height: "140px",
              background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)",
              borderRadius: "50%",
              animation: "glow 2s ease-in-out infinite",
            }}
          />
          <img
            src={reliaLogo}
            alt="Relia Logo"
            style={{
              width: 120,
              height: 120,
              objectFit: "contain",
              position: "relative",
              zIndex: 1,
              animation: "floatLogo 3s ease-in-out infinite",
              filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))",
            }}
          />
        </div>

        {/* Spinner */}
        <div style={{ position: "relative" }}>
          <Spin
            size="large"
            style={{ color: "#ffffff" }}
          />
        </div>

        {/* Welcome text */}
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#ffffff",
              marginBottom: 8,
              letterSpacing: 0.5,
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
            }}
          >
            Welcome to {COOP_NAME}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: "rgba(255, 255, 255, 0.8)",
              letterSpacing: 0.3,
            }}
          >
            Loading your experience...
          </div>
        </div>

        {/* Loading dots */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 8,
          }}
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.8)",
                animation: `dotPulse 1.5s ease-in-out infinite`,
                animationDelay: `${index * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.1);
          }
        }

        @keyframes floatLogo {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes glow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        @keyframes dotPulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default LogoLoader;
