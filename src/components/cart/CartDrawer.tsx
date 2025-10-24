import React, { Key, useEffect, useMemo, useState } from "react";
import CartItemCard from "./CartItemCard";
import PrintBillModal from "../MODALS/PrintBillModal";
import PrintBillSpaModal from "../MODALS/printBillSpaModal";
import {
  cartSent,
  deleteAllCartItems,
  getCart,
} from "../../features/Cart/CartActions";
import PaymentDrawer from "../payment/PaymentDrawer";
import SkeletonCartItemCard from "./SkeletonCartItemCard";
import { useAppDispatch, useAppSelector } from "../../store";
import { useNavigate, useParams } from "react-router-dom";
import CartLoader from "../spinner/cartLoader";
import { Button, Space, Typography, Tag, Empty, Divider, Flex } from "antd";
import {
  CloseCircleOutlined,
  OrderedListOutlined,
  RestOutlined,
  SendOutlined,
  SmileFilled,
  SwitcherOutlined,
} from "@ant-design/icons";
import TransferBillModal from "@components/MODALS/pro/TransferBill";
import ClientPin from "@components/MODALS/ClientPin";

import { usePrimaryColor } from "@context/PrimaryColorContext";
import { ProCard } from "@ant-design/pro-components";

const CartDrawer: React.FC = () => {
  const [loadingData, setLoadingData] = useState(false);
  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;

  const {
    cartDetails,
    totalAmount,
    cartItems: data,
    loading,
  } = useAppSelector((state) => state.cart);
  const { user } = useAppSelector((state) => state.auth);

  const { id } = useParams();

  const dispatch = useAppDispatch();
  const { tableData: td } = useAppSelector((state) => state.Tables);

  const navigate = useNavigate();

  const primaryColor = usePrimaryColor();

  const CartItemCardMemo = React.memo(CartItemCard);

  const memoizedData = useMemo(() => data, [data]);

  const totalCartAmount =
    cartDetails?.items?.length > 0
      ? cartDetails.items.reduce((acc, item) => acc + item.price, 0)
      : 0;

  // Function to calculate the final amount after discount
  const calculateFinalAmount = () => {
    if (!cartDetails?.discount) {
      return totalCartAmount.toLocaleString();
    }
    if (cartDetails?.discount_type === "percentage") {
      const totalAmountCheck1 =
        totalCartAmount - totalCartAmount * (cartDetails?.discount / 100);
      return totalAmountCheck1.toLocaleString();
    } else {
      const totalAmountCheck = totalCartAmount - cartDetails?.discount;
      return totalAmountCheck.toLocaleString();
    }
  };

  // Calculate the total discount amount
  const discountAmount = useMemo(() => {
    if (!cartDetails?.discount) {
      return 0;
    }
    if (cartDetails?.discount_type === "percentage") {
      return totalCartAmount * (cartDetails?.discount / 100);
    } else {
      return cartDetails?.discount;
    }
  }, [totalCartAmount, cartDetails?.discount, cartDetails?.discount_type]);

  const orderNumber = useMemo(
    () => cartDetails?.order_no,
    [cartDetails?.order_no]
  );

  useEffect(() => {
    const dispatchFetchCart = async () => {
      setLoadingData(true);
      try {
        await dispatch(getCart(id));
        if (!data || !cartDetails) {
          navigate("/tables");
        }
      } catch (error) {
        console.log("cart eror", error);
      } finally {
        setLoadingData(false);
      }
    };

    dispatchFetchCart();
  }, [dispatch, id, td._id]);

  return (
    <ProCard
      bordered
      type="inner"
      style={{
        overflow: "hidden",
        overflowY: "auto",
        // maxHeight: "calc(92vh - 120px)",
      }}
      bodyStyle={{ backgroundColor: "white" }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <Button
            style={{
              pl: 2,
              color: primaryColor,
              borderColor: primaryColor,
              "&:hover": {
                borderColor: "#bc8c7c",
                color: "#bc8c7c",
              },
            }}
            icon={<OrderedListOutlined />}
          >
            {orderNumber?.toLocaleUpperCase()}
          </Button>

          <TransferBillModal data={data} />

          <Button type="primary" icon={<SwitcherOutlined />}>
            {td?.name}
          </Button>
        </Space>

        <Space
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "84%",
          }}
        >
          <Typography.Title level={5}>Item</Typography.Title>

          <Typography.Title level={5}>Qty</Typography.Title>

          <Typography.Title level={5}>Price</Typography.Title>

          <Typography.Title level={5}>Delete</Typography.Title>
        </Space>

        <Divider style={{ margin: "4px 0" }} />

        <div
          style={{
            maxHeight: "calc(92vh - 460px)",
            overflowY: "auto",
            width: "100%",
          }}
        >
          {loading
            ? Array.from({ length: data?.length }, (_, index) => (
                <SkeletonCartItemCard key={index} />
              ))
            : data?.map((item: { _id: Key | null | undefined | string }) => (
                <CartItemCardMemo key={item._id} cartItem={item} />
              ))}
          {loadingData && loading ? <CartLoader /> : ""}
        </div>
        {memoizedData?.length ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Flex gap={16} wrap justify="space-between">
              {cartDetails?.tip_amount && (
                <Typography.Text strong>
                  <RestOutlined /> Tip Value:
                  {cartDetails?.tip_type === "amount"
                    ? ` KSH. ${cartDetails?.tip_amount?.toLocaleString()}`
                    : ` ${cartDetails?.tip_amount}%`}
                </Typography.Text>
              )}
            </Flex>

            <Flex gap={16} wrap justify="space-between">
              {cartDetails?.discount && (
                <>
                  <Typography.Text strong>
                    Discount: KSH. {discountAmount.toLocaleString()}{" "}
                    {
                      <Tag color="green">
                        {cartDetails?.discount_type === "percentage"
                          ? `${cartDetails?.discount}% Discount Applied`
                          : `KSH ${cartDetails?.discount?.toLocaleString()} Discount Applied`}
                      </Tag>
                    }
                  </Typography.Text>
                  <Typography.Text delete style={{ opacity: 0.7 }}>
                    Original Amount: KSH. {totalCartAmount.toLocaleString()}
                  </Typography.Text>
                </>
              )}
            </Flex>
            <Flex align="center" justify="space-between" gap={16} wrap>
              <Typography.Text strong style={{ fontSize: "16px" }}>
                Amount Due: KSH.{" "}
                {totalAmount ? (
                  calculateFinalAmount()
                ) : (
                  <Typography>Calculating...</Typography>
                )}
              </Typography.Text>
              <Typography.Text strong>
                Served By: <SmileFilled /> {cartDetails?.created_by?.username}
              </Typography.Text>
            </Flex>

            <Space
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              <Button
                onClick={() => dispatch(cartSent(cartDetails))}
                icon={<SendOutlined />}
                style={{
                  color: primaryColor,
                  borderColor: primaryColor,
                  "&:hover": {
                    borderColor: "#bc8c7c",
                    color: "#bc8c7c",
                  },
                }}
              >
                Send Bill
              </Button>
              <ClientPin cart={cartDetails} />
              {tenant?.business_type?.name === "massage_parlour" ? (
                <PrintBillSpaModal
                  cartDetails={cartDetails}
                  data={data}
                  totalAmount={totalAmount}
                />
              ) : (
                <PrintBillModal
                  cartDetails={cartDetails}
                  data={data}
                  totalAmount={totalAmount}
                />
              )}
            </Space>
            {user?.role === "admin" && (
              <Button
                danger
                block
                onClick={() => dispatch(deleteAllCartItems(cartDetails?._id))}
                icon={<CloseCircleOutlined />}
              >
                Clear
              </Button>
            )}
          </Space>
        ) : (
          <Empty
            title="No items added"
            image="/basket.png"
            imageStyle={{ opacity: 0.6 }}
            description="Add items to your cart to view them here"
          />
        )}
      </Space>

      <div style={{ display: "flex", marginTop: 20 }}>
        {(user?.role === "admin" || user?.role === "cashier") &&
          data?.length > 0 && <PaymentDrawer />}
      </div>
    </ProCard>
  );
};

export default CartDrawer;
