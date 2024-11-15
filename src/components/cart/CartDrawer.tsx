import React, { Key, useEffect, useMemo, useState } from "react";
import { Divider, CardMedia } from "@mui/material";
import CartItemCard from "./CartItemCard";
import classes from "./Cart.module.css";
import PrintBillModal from "../MODALS/PrintBillModal";
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
import { Button, Card, Space, Typography } from "antd";
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

// function formatTotal(totalAmount: { toLocaleString: () => number | string }) {
//   return totalAmount?.toLocaleString();
// }

const CartDrawer: React.FC = () => {
  // const [openM, setOpenM] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
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

  const CartItemCardMemo = React.memo(CartItemCard);

  const memoizedData = useMemo(() => data, [data]);

  const totalCartAmount = cartDetails?.items.reduce((acc, item) => {
    return acc + item.price;
  }, 0);
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
  // const formattedTotal = useMemo(() => formatTotal(calculateFinalAmount()), [calculateFinalAmount()]);
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
    // clearCartDetails();
  }, [dispatch, id, td._id]);

  // console.log("============", data);

  return (
    <Card
      bordered
      type="inner"
      style={{
        overflow: "hidden",
        overflowY: "auto",
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
              color: "#6c1c2c",
              borderColor: "#6c1c2c",
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
        {/* <Card> */}
        <Space
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "54%",
          }}
        >
          <Typography.Title level={5}>Item</Typography.Title>

          <Typography.Title level={5}>Qty</Typography.Title>

          <Typography.Title level={5}>Price</Typography.Title>
        </Space>

        <Divider />
        {/* </Card> */}
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
            <Divider />
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
                alignItems: "baseline",
              }}
            >
              <Typography.Text strong>
                Served By: <SmileFilled /> {cartDetails?.created_by.username}
              </Typography.Text>
              {/* <DiscountModal data={cartDetails} /> */}
            </div>
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
                alignItems: "baseline",
              }}
            >
              {/* <div style={{ display: "grid", gap: 2 }}> */}

              <Typography.Text strong>
                Amount Due : Ksh.{" "}
                {totalAmount ? (
                  calculateFinalAmount()
                ) : (
                  <Typography>Calculating...</Typography>
                )}
              </Typography.Text>
              {cartDetails?.discount && (
                <Typography.Text strong>
                  <RestOutlined /> Discount:
                  {cartDetails?.discount_type === "amount"
                    ? ` KSH. ${cartDetails?.discount?.toLocaleString()}`
                    : ` ${cartDetails?.discount}%`}
                </Typography.Text>
              )}
            </div>

            <Space
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              {user?.role === "admin" && (
                <Button
                  danger
                  onClick={() => dispatch(deleteAllCartItems(cartDetails?._id))}
                  icon={<CloseCircleOutlined />}
                >
                  Clear
                </Button>
              )}
              <Button
                onClick={() => dispatch(cartSent(cartDetails))}
                icon={<SendOutlined />}
                // disabled={cartDetails?.status === "sent"}
                style={{
                  color: "#6c1c2c",
                  borderColor: "#6c1c2c",
                  "&:hover": {
                    borderColor: "#bc8c7c",
                    color: "#bc8c7c",
                  },
                }}
              >
                Send Bill
              </Button>
              <ClientPin cart={cartDetails} />
              <PrintBillModal
                cartDetails={cartDetails}
                data={data}
                totalAmount={totalAmount}
              />
            </Space>
          </Space>
        ) : (
          <Card className={classes.cardm}>
            <div>
              <CardMedia
                component="img"
                alt="Basket"
                className={classes.media}
                image="/basket.png"
                sx={{ width: 100 }}
              />
              <Typography.Title level={4}>No items added</Typography.Title>
            </div>
          </Card>
        )}
      </Space>

      <div style={{ display: "flex", marginTop: 20 }}>
        {(user?.role === "admin" || user?.role === "cashier") && data?.length > 0 && <PaymentDrawer />}
      </div>
    </Card>
  );
};

export default CartDrawer;
