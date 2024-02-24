import { useState } from "react";
import { ProForm } from "@ant-design/pro-components";
import { notification } from "antd/lib";
import { useAppDispatch, useAppSelector } from "../../../store";
import { resetPaymentMessage } from "../../../features/Payment/PaymentMethodSlice";
import { createPaymentMethod } from "@features/Payment/PaymentMethodActions";

interface PaymentMethod {
  _id?: string;
  name: string;
}

interface UseAddPaymentMethodFormProps {
  onAddPaymentMethod: (paymentMethod: PaymentMethod) => void;
}

const useAddPaymentMethodSettingsModal = ({
  onAddPaymentMethod,
}: UseAddPaymentMethodFormProps) => {
  const [form] = ProForm.useForm();
  const dispatch = useAppDispatch();

  const { isSuccess } = useAppSelector((state) => state.PaymentMethods);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmAddPaymentMethod = async (values: PaymentMethod) => {
    try {
      dispatch(createPaymentMethod(values));
      onAddPaymentMethod(values);
      setIsSubmitting(true);
      handleClose();

      if (isSuccess) {
        notification.success({
          message: `Success`,
          description: "Successfully added new supplier",
          placement: "bottomLeft",
        });
      } else {
        notification.error({
          message: `Error`,
          description: "Failed to add a new supplier",
          placement: "bottomLeft",
        });
      }
    } catch (error) {
      setIsSubmitting(false);
      handleClose();
    }
  };

  const handleClose = () => {
    form.resetFields();
    setIsSubmitting(false);
  };
  const handlePaymentMethodChange = (paymentMethod: any) => {
    // Do something with the  PaymentMethodChange change if needed
  };
  return {
    form,
    isSubmitting,
    setIsSubmitting,
    handleClose,
    handleConfirmAddPaymentMethod,
    handlePaymentMethodChange,
  };
};

export default useAddPaymentMethodSettingsModal;
