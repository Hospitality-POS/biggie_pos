import React from "react";
import { useSelector } from "react-redux";
import OrderList from "../../components/Order/OrderList";

interface SettingsProps {
  // Define any props you might need here
}

const Settings: React.FC<SettingsProps> = (props) => {
  const { orders } = useSelector((state: any) => state.order);

  return (
    <div>
      <div style={{ padding: "20px" }}>
        <OrderList orders={orders} />
      </div>
    </div>
  );
};

export default Settings;
