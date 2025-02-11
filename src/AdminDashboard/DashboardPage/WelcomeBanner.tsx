import React from "react";
import { Button } from "antd";

const WelcomeBanner = () => {
  const bannerStyle = {
    width: "100%",
    borderRadius: "16px",
    marginTop: "20px",
    height: "300px",
    position: "relative",
    overflow: "hidden",
    padding: "40px",
    backgroundImage: `url('https://media.istockphoto.com/id/1954841243/photo/data-analysis-chart-graph-3d-statistics-background.webp?b=1&s=612x612&w=0&k=20&c=2RO_u5WmpvIuvs7zNbTTDYDjGFCa8WkNFX4Q0Rf9a3c=')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    "@media (max-width: 768px)": {
      height: "auto",
      padding: "20px",
    },
  };

  const contentStyle = {
    width: "50%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
    "@media (max-width: 768px)": {
      width: "100%",
      textAlign: "center",
      alignItems: "center",
    },
  };

  const titleStyle = {
    fontSize: "36px",
    marginBottom: "16px",
    fontWeight: "bold",
    "@media (max-width: 768px)": {
      fontSize: "28px",
    },
    "@media (max-width: 480px)": {
      fontSize: "24px",
    },
  };

  const subtitleStyle = {
    fontSize: "16px",
    marginBottom: "24px",
    "@media (max-width: 768px)": {
      fontSize: "14px",
    },
  };

  const overlayStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  };
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const clientName = tenant ? tenant.name : "Relia Pos";

  return (
    <div style={bannerStyle}>
      <div style={overlayStyle}></div>
      <div style={contentStyle}>
        <h2 style={titleStyle}>Welcome back! {clientName}</h2>
        <p style={subtitleStyle}>
          Start creating products/services and managing your inventory with ease.
        </p>
        <Button
          type="primary"
          style={{
            backgroundColor: "#00B517",
            width: "fit-content",
            border: "none",
            height: "40px",
            padding: "0 24px",
          }}
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default WelcomeBanner;
