/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef } from "react";
import { Badge } from "antd";
import Draggable from "react-draggable";
import { ShoppingCartOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../../services/request";
import { usePrimaryColor } from "@context/PrimaryColorContext";

interface AddToCartIconProps {
  OpenCart: () => void;
}

function AddToCartIcon({ OpenCart }: AddToCartIconProps) {
  const { cartDetails } = useSelector((state: any) => state.cart);
  const primaryColor = usePrimaryColor();
  const draggableRef = useRef<HTMLDivElement>(null);

  const fetchCartItems = async (cartId: string) => {
    try {
      const response = await axiosInstance.get(
        process.env.VITE_BASE_URL + `/cart/cart-items/${cartId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error("Error fetching cart items: " + error.message);
    }
  };

  const { data: cartItems } = useQuery(
    ["cartItems", cartDetails?._id],
    () => fetchCartItems(cartDetails?._id),
    {
      refetchInterval: 1000,
      enabled: !!cartDetails?._id,
    }
  );

  return (
    <>
      <style>{`
        @keyframes cartGlowAnimation {
          0% { box-shadow: 0 0 0 rgba(0, 0, 0, 0.2); }
          50% { box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.35); }
          100% { box-shadow: 0 0 0 rgba(0, 0, 0, 0.2); }
        }
      `}</style>
      <Draggable nodeRef={draggableRef}>
        <div
          ref={draggableRef}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "40px",
            zIndex: 999,
            borderRadius: "50%",
            animation: "cartGlowAnimation 2s ease-in-out infinite",
          }}
        >
          <Badge count={cartItems?.length || 0} overflowCount={50} offset={[-4, 4]}>
            <button
              type="button"
              onClick={OpenCart}
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                backgroundColor: primaryColor,
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                outline: "none",
                transition: "transform 0.15s ease",
              }}
            >
              <ShoppingCartOutlined style={{ fontSize: 28, color: "#ffffff" }} />
            </button>
          </Badge>
        </div>
      </Draggable>
    </>
  );
}

export default AddToCartIcon;