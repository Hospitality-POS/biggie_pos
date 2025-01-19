import React, { useEffect, useState } from "react";
import { Space } from "antd";
import classes from "./staff.module.css";
import { Button, Col, Row } from "antd/lib";
import { ModalForm, ProFormText } from "@ant-design/pro-components";
import { useLogin } from "./hook/useLogin";
import { LoginOutlined } from "@ant-design/icons";
import { useAppDispatch } from "src/store";
import { verifyCompanyCode } from "@services/users";
import { useNavigate } from "react-router-dom";

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
  const { handleNumberClick, handleClose, form } = useLogin(
    setOpen,
    tbl
  );


  const dispatch = useAppDispatch();
  const navigation = useNavigate();

  const [companyCode, setCompanyCode] = useState<string | null>(null);
  const [step, setStep] = useState<"companyCode" | "pin">("companyCode");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Check if company code exists in localStorage
    const storedCode = localStorage.getItem("companyCode");
    if (storedCode) {
      setCompanyCode(storedCode);
      setStep("pin");
    }
  }, [open]);

  const handleLogin = () => {
    navigation("/login");
  };


  const handleCompanyCodeSubmit = async (code: string) => {
    try {
      setLoading(true); // Set loading to true before the API call
      dispatch({ type: 'VERIFY_COMPANY_CODE_REQUEST' });

      const result = await verifyCompanyCode({ companyCode: code });

      localStorage.setItem("tenant", JSON.stringify(result.data));

      dispatch({ type: 'VERIFY_COMPANY_CODE_SUCCESS', payload: result });

      localStorage.setItem("companyCode", code);

      setCompanyCode(code);
      setStep("pin");
    } catch (error) {
      dispatch({ type: 'VERIFY_COMPANY_CODE_FAILURE', payload: error });
      console.error("Error verifying company code:", error);
    } finally {
      setLoading(false); // Reset loading state after the API call
    }
  };

  return (
    <>
      <ModalForm
        title="ENTER YOUR 4 DIGIT PIN"
        trigger={
          showButton ? (
            <Button
              type="dashed"
              icon={<LoginOutlined />}
              onClick={handleLogin}
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
          if (step === "companyCode") {
            handleCompanyCodeSubmit(values.companyCode);
          } else {
            setLoading(true); // Set loading to true before login
            await handleLogin(values.pin);
            handleClose();
            setLoading(false); // Reset loading state after login
          }
        }}
        onOpenChange={(visible) => !visible && handleClose()}
        modalProps={{
          destroyOnClose: true,
          centered: true,
        }}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: step === "companyCode" ? "Submit" : "Login",
          },
          submitButtonProps: {
            loading, // Bind the loading state to the submit button
          },
        }}
      >
        {step === "companyCode" && (
          <ProFormText.Password
            width="xl"
            name="companyCode"
            label="Company Code"
            tooltip="Enter Company Code"
            placeholder="Enter Company Code"
            rules={[
              {
                required: true,
                message: "Company Code is required",
              },
            ]}
          />
        )}
        {step === "pin" && (
          <>
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
          </>
        )}
      </ModalForm>
    </>
  );
};

export default StaffModal;
