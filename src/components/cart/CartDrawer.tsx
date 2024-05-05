import React, { Key, useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  CardContent,
  Grid,
  Divider,
  CardMedia,
  Paper,
  CardActions,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import CartItemCard from "./CartItemCard";
import PrintIcon from "@mui/icons-material/Print";
import TableBarIcon from "@mui/icons-material/TableBar";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
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
import { useParams } from "react-router-dom";
import CartLoader from "../spinner/cartLoader";
import SendIcon from "@mui/icons-material/Send";
import { clearcart } from "../../features/Cart/CartSlice";
import { Button, Card, Space, Typography } from "antd";
import {
  BoxPlotOutlined,
  CloseCircleOutlined,
  OrderedListOutlined,
  PercentageOutlined,
  PrinterOutlined,
  SendOutlined,
  SmileFilled,
  SwapOutlined,
  SwitcherOutlined,
} from "@ant-design/icons";
import TransferBillModal from "@components/MODALS/pro/TransferBill";

function formatTotal(totalAmount: { toLocaleString: () => number | string }) {
  return totalAmount.toLocaleString();
}

const CartDrawer: React.FC = () => {
  const [openM, setOpenM] = useState(false);
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

  const onCloseM = () => {
    setOpenM(false);
  };
  // const clearCartDetails = useCallback(() => {
  //     dispatch(clearcart());
  // },[dispatch]);

  const CartItemCardMemo = React.memo(CartItemCard);

  const memoizedData = useMemo(() => data, [data]);
  const formattedTotal = useMemo(() => formatTotal(totalAmount), [totalAmount]);
  const orderNumber = useMemo(
    () => cartDetails?.order_no,
    [cartDetails?.order_no]
  );

  useEffect(() => {
    const dispatchFetchCart = async () => {
      setLoadingData(true);
      try {
        await dispatch(getCart(id));
      } catch (error) {
        console.log("cart eror", error);
      } finally {
        setLoadingData(false);
      }
    };

    dispatchFetchCart();
    // clearCartDetails();
  }, [dispatch, id, td._id]);

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
      <PrintBillModal
        openM={openM}
        onCloseM={onCloseM}
        cartDetails={cartDetails}
        data={data}
        totalAmount={totalAmount}
      />
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space
          style={{
            display: "flex",
            justifyContent: "space-between",
            // padding: 4,
            width: "100%",
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

          <TransferBillModal data={data}/>

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
            maxHeight: "calc(92vh - 500px)",
            overflowY: "auto",
            width: "100%",
          }}
        >
          {loading
            ? Array.from({ length: data.length }, (_, index) => (
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
                marginBottom: "20px",
                alignItems: "flex-end",
              }}
            >
              <Typography.Text strong>
                Served By: <SmileFilled /> {cartDetails?.created_by.username}
              </Typography.Text>
              <Typography.Text strong>
                Total : Ksh.
                {totalAmount ? (
                  formattedTotal
                ) : (
                  <Typography>Calculating...</Typography>
                )}
              </Typography.Text>

              <Button type="primary" icon={<PercentageOutlined />}>
                Offer Discount?
              </Button>
            </div>

            <Space
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              {user?.isAdmin && (
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
              <Button
                type="primary"
                onClick={() => setOpenM(true)}
                icon={<PrinterOutlined />}
                style={{
                  color: "#6c1c2c",
                  borderColor: "#6c1c2c",
                  "&:hover": {
                    borderColor: "#bc8c7c",
                    color: "#bc8c7c",
                  },
                }}
              >
                Print Bill
              </Button>
            </Space>
          </Space>
        ) : (
          <Card className={classes.cardm} sx={{ boxShadow: "none" }}>
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
      {user?.isAdmin && data?.length > 0 && (
        <PaymentDrawer
          paymentOpen={false}
          handlePaymentClose={function (): void {
            throw new Error("Function not implemented.");
          }}
        />
      )}
    </Card>
  );
};

export default CartDrawer;
