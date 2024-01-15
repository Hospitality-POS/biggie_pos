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

  const handleLogin = async (pin: any) => {
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
  return {
    handleLogin,
    handleNumberClick,
    handleClose,
    form,
  };
};
