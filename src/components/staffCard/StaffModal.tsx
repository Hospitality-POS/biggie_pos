import React, { useState } from "react";
import { Modal, Button, Input, Row, Col, Typography, Space } from "antd";
import { LoginOutlined, DeleteOutlined } from "@ant-design/icons";
import { loginUser } from "../../features/Auth/AuthActions";
import classes from "./staff.module.css";
import { useAppDispatch, useAppSelector } from "../../store";
import useCheckIfUserIsLoggedIn from "../../hooks/useCheckIfUserIsLoggedIn";

const { Text } = Typography;

interface StaffModalProps {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPin: React.Dispatch<React.SetStateAction<string>>;
  pin: string;
  open: boolean;
  tbl: string;
}

const StaffModal: React.FC<StaffModalProps> = ({
  setOpen,
  setPin,
  pin,
  open,
  tbl,
}) => {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { isLoading, user } = useAppSelector(
    (state) => state.auth
  );
  const { error: cartError } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const { checkIfUserIsLoggedIn, isUserLoggedIn } = useCheckIfUserIsLoggedIn();

  const handleClose = () => {
    setOpen(false);
    setNotificationOpen(false);
  };

  const handleNumberClick = (number: string | number) => {
    setPin((prevPin) => prevPin + number);
    setNotificationOpen(false);
  };

  const handleClearPin = () => {
    setPin("");
    setNotificationOpen(false);
  };

  const handleLogin = () => {
    dispatch(loginUser({ pin }));
    checkIfUserIsLoggedIn(tbl, user, cartError, setOpen);
    if (!isUserLoggedIn) {
      setOpen(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title="Staff Login"
      width={360}
      footer={[
        <Button
          key="clear"
          danger
          onClick={handleClearPin}
          icon={<DeleteOutlined />}
        >
          Clear
        </Button>,
        <Button
          key="login"
          type="primary"
          loading={isLoading}
          onClick={handleLogin}
          icon={<LoginOutlined />}
        >
          Login
        </Button>,
      ]}
    >
      <div style={{ padding: "8px 0" }}>
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          Enter your PIN to login.
        </Text>
        <Input.Password
          size="large"
          placeholder="Enter PIN"
          autoFocus
          value={pin}
          status={notificationOpen ? "error" : ""}
          onChange={(e) => setPin(e.target.value)}
          style={{ marginBottom: 16, textAlign: "center", fontSize: 18 }}
        />
        <Row gutter={[8, 8]} justify="center">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((number) => (
            <Col span={number === 0 ? 24 : 8} key={number}>
              <Button
                block
                size="large"
                style={{ height: 48, fontSize: 18, fontWeight: "bold" }}
                onClick={() => handleNumberClick(number)}
              >
                {number}
              </Button>
            </Col>
          ))}
        </Row>
      </div>
    </Modal>
  );
};

export default StaffModal;
