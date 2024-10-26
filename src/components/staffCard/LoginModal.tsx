import React from "react";
import { Space } from "antd";
import classes from "./staff.module.css";
import { Button, Col, Row } from "antd/lib";
import { ModalForm, ProFormText } from "@ant-design/pro-components";
import { useLogin } from "./hook/useLogin";
import { LoginOutlined } from "@ant-design/icons";

type StaffModalProps = {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  open: boolean;
  tbl: string;
  showButton: boolean;
};

const StaffModal: React.FC<StaffModalProps> = ({
  setOpen,
  open,
  tbl,
  showButton,
}) => {
  const { handleLogin, handleNumberClick, handleClose, form } = useLogin(
    setOpen,
    tbl
  );

  return (
    <>
      <ModalForm
        title="ENTER YOUR 4 DIGIT PIN"
        trigger={
          showButton ? (
            <Button
              type="dashed"
              icon={<LoginOutlined />}
              onClick={() => setOpen(true)}
            >
              Login
            </Button>
          ) : (
            <></>
          )
        }
        size="large"
        open={open}
        width={600}
        form={form}
        onFinish={async (values) => {
          handleLogin(values.pin);
          handleClose();
        }}
        onOpenChange={(visible) => !visible && handleClose()}
        modalProps={{
          destroyOnClose: true,
          centered: true,
        }}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: "Login",
          },
        }}
      >
        <ProFormText.Password
          width="xl"
          name="pin"
          label="Pin"
          tooltip="Users Login PIN 4 digits only"
          normalize={(value) => {
            const numericValue = value.replace(/[^0-9]/g, "");
            return numericValue.slice(0, 4);
          }}
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
