import { loginUser } from "@features/Auth/AuthActions";
import useCheckIfUserIsLoggedIn from "@hooks/useCheckIfUserIsLoggedIn";
import { Form } from "antd/lib";
import { SetStateAction } from "react";
import { useAppDispatch, useAppSelector } from "src/store";

export const useLogin = (setOpen: { (value: SetStateAction<boolean>): void; (arg0: boolean): void; }, tbl: string) => {
  const { user } = useAppSelector((state) => state.auth);
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

  const handleLogin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate the form
      await form.validateFields();

      // Dispatch login action
      const resp = await dispatch(loginUser({ pin }));

      console.log('my user alert', resp);


      // Handle rejected login
      if (resp?.error?.message === "Rejected") {
        return { success: false, error: "Invalid PIN. Please try again." };
      }

      // Check if the payload exists
      if (resp?.payload) {
        return { success: true, user: resp.payload };
      }

      // Fallback for unexpected cases
      return { success: false, error: "Login failed. Please try again." };
    } catch (error) {
      console.error("Error during login:", error);
      return { success: false, error: "An unexpected error occurred during login." };
    }
  };

  return {
    handleLogin,
    handleNumberClick,
    handleClose,
    form,
  };
};
