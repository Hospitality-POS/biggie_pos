import React from "react";
import { Form, Space, Modal } from "antd";
import useCheckIfUserIsLoggedIn from "../../hooks/useCheckIfUserIsLoggedIn";
import { useAppDispatch, useAppSelector } from "../../store";
import { loginUser } from "../../features/Auth/AuthActions";
import classes from "./staff.module.css";
import { Button, Col, Row } from "antd/lib";
import { ModalForm, ProFormText } from "@ant-design/pro-components";

const StaffModal: React.FC<StaffModalProps> = ({
  setOpen,
  setPin,
  pin,
  open,
  tbl,
}) => {
  const { isError, isSuccess, isLoading, user } = useAppSelector(
    (state) => state.auth
  );
  const { error: cartError } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const { checkIfUserIsLoggedIn, isUserLoggedIn } = useCheckIfUserIsLoggedIn();

  const form = Form.useForm()[0];

  const handleClose = () => {
    setOpen(false);
    form.setFieldsValue({
      pin: "",
    });
  };

  const keyedInputs: number[] = [];

  const handleNumberClick = (value: number) => {
    if (keyedInputs.length <= 3) {
      keyedInputs.push(value);
    }
    form.setFieldsValue({
      pin: keyedInputs
        .reduce(
          (accumulator, currentNumber) => accumulator * 10 + currentNumber,
          0
        )
        .toString(),
    });
  };

  const handleLogin = async (pin) => {
    try {
      await form.validateFields();
      dispatch(loginUser({ pin }));
      checkIfUserIsLoggedIn(tbl, user, cartError, setOpen);
      if (!isUserLoggedIn) {
        setOpen(false);
      }
    } catch (error) {
      // Handle form validation error
    }
  };

  return (
    <>
      <ModalForm
        title="ENTER YOUR 4 DIGIT PIN"
        size="large"
        open={open}
        width={600}
        form={form}
        // trigger={}
        onFinish={async (values) => {
          handleLogin(values.pin);
        }}
        onOpenChange={(visible) => !visible && handleClose()}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: "Login",
          },
          // onReset: (values)=>{
          //   values?.form?.resetFields()
          // }
        }}
      >
        <ProFormText.Password
          width="xl"
          name="pin"
          label="Pin"
          tooltip="Users Login PIN 4 digits only"
          // normalize={(value)=>{
          //     console.log('xxxxxxxxxx',value)
          // }}
          rules={[
            {
              required: true,
              pattern: /^[0-9]{4}$/,
              message: "Invalid Pin format",
            },
          ]}
          placeholder="Enter user Pin"
        />

        <Space>
          <Row gutter={8} justify="center" className={classes.numPad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((number) => (
              <Col key={number}>
                <Button
                  className={classes.numPadButton}
                  onClick={() => {
                    handleNumberClick(number);
                  }}
                  type="primary"
                  ghost
                >
                  {number}
                </Button>
              </Col>
            ))}
          </Row>
        </Space>
      </ModalForm>
    </>
  );
};

export default StaffModal;
