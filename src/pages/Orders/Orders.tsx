import React from "react";
import { useSelector } from "react-redux";
import OrderList from "../../components/Order/OrderList";
import { Typography } from "@mui/material";

interface OrdersProps {
  // Define any props you might need here
}

const Orders: React.FC<OrdersProps> = (props) => {
  const { orders } = useSelector((state: any) => state.order);

  return (
    <div>
      <div style={{ padding: "20px" }}>
        <Typography variant="h6" gutterBottom>
        List of all the Orders
      </Typography>
        <OrderList orders={orders} />
      </div>
    </div>
  );
};

export default Orders;
