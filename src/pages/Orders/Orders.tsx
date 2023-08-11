import React from "react";
import { useSelector } from "react-redux";
import OrderList from "../../components/Order/OrderList";

interface OrdersProps {
  // Define any props you might need here
}

const Orders: React.FC<OrdersProps> = (props) => {
  const { orders } = useSelector((state: any) => state.order);

  return (
    <div>
      <div style={{ padding: "20px" }}>
        <OrderList orders={orders} />
      </div>
    </div>
  );
};

export default Orders;
