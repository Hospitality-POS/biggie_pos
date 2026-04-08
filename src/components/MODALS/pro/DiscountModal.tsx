import React, { useRef, useState, useEffect } from "react";
import { Button, Space, message } from "antd";
import {
  ModalForm,
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
} from "@ant-design/pro-form";
import { PercentageOutlined, LoadingOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { useAppDispatch, useAppSelector } from "src/store";
import { updateCart } from "@features/Cart/CartActions";
import { fetchGiftCard, updateGiftCard } from "@services/customers";

interface DiscountModalProps {
  data?: any;
}

const DiscountModal: React.FC<DiscountModalProps> = ({ data: cartItem }) => {
  const [form] = ProForm.useForm();
  const formRef = useRef<any>();
  const dispatch = useAppDispatch();
  const [discountType, setDiscountType] = useState<string>("amount");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [giftCardAmount, setGiftCardAmount] = useState<number | null>(null);
  const [giftCardId, setGiftCardId] = useState<string | null>(null);

  const { user } = useAppSelector((state) => state.auth);

  const discountOptions = [
    { value: "amount", label: "Amount" },
    { value: "percentage", label: "Percentage" },
    { value: "code", label: "Gift Card" },
  ];

  // Reset form values when discount type changes
  useEffect(() => {
    if (discountType === "amount" || discountType === "percentage") {
      form.setFieldsValue({
        discount_code: undefined,
        discount: undefined,
      });
      setGiftCardAmount(null);
      setGiftCardId(null);
    } else if (discountType === "code") {
      form.setFieldsValue({
        discount: undefined,
      });
    }
  }, [discountType, form]);

  // Verify gift card and get amount
  const verifyGiftCard = async (code: string) => {
    if (!code || code.trim() === "") return;

    setIsVerifying(true);
    try {
      // Call the fetchGiftCard API
      const response = await fetchGiftCard(code);
      console.log('Gift card response:', response);

      // Check if we have a valid response object
      if (response && typeof response === 'object') {
        // Check if the gift card has already been used (status is false)
        if (response._id && response.status === false) {
          message.error("This gift card has already been used");
          setGiftCardAmount(null);
          setGiftCardId(null);
          return;
        }

        // Based on your actual response structure
        // Your API returns status (not isValid) and amount
        if (response.status === true && typeof response.amount === 'number' && response.amount > 0) {
          setGiftCardAmount(response.amount);
          setGiftCardId(response._id); // Store the gift card ID for later use
          form.setFieldsValue({ discount: response.amount });
          message.success(`Gift card verified! Available balance: ${response.amount}`);
          return;
        } else if (response.status === true && (response.amount === 0 || response.amount === "0")) {
          message.error("Gift card has zero balance");
          setGiftCardAmount(0);
          return;
        } else if (response._id && !response.status) {
          message.error("Gift card is inactive");
          setGiftCardAmount(null);
          return;
        } else if (new Date(response.expiry_date) < new Date()) {
          message.error("Gift card has expired");
          setGiftCardAmount(null);
          return;
        }
      }

      // If we get here, the gift card is invalid or the response format is unexpected
      message.error("Invalid gift card code");
      setGiftCardAmount(null);

    } catch (error) {
      console.error("Error verifying gift card:", error);
      message.error("Failed to verify gift card");
      setGiftCardAmount(null);
    } finally {
      setIsVerifying(false);
    }
  };

  // Update gift card status to false after applying
  const deactivateGiftCard = async (giftCardId: string) => {
    try {
      // Since updateGiftCard is a Redux thunk, we need to dispatch it
      const response = await dispatch(
        updateGiftCard({
          id: giftCardId,
          data: { status: false }
        })
      ).unwrap(); // unwrap() to get the resolved value

      console.log('Gift card deactivated:', response);
      if (response && response.success) {
        console.log('Gift card successfully deactivated');
      } else {
        console.error('Failed to deactivate gift card');
      }
    } catch (error) {
      console.error('Error deactivating gift card:', error);
    }
  };


  return (
    <ModalForm
      initialValues={cartItem}
      form={form}
      formRef={formRef}
      width={520}
      title={
        <Space>
          <PercentageOutlined />
          {"Offer Discount"}
        </Space>
      }
      // trigger={
      //   (user?.role === "admin" || user?.role === "cashier") && (
      //     <Button type="primary" icon={<PercentageOutlined />} block>
      //       Offer Discount
      //     </Button>
      //   )
      // }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      onFinish={async (values) => {
        // Check if gift card amount is more than order amount
        if (discountType === "code" && giftCardAmount !== null) {
          // Calculate the total from items array in the cart
          const itemsTotal = cartItem?.items?.reduce((total, item) => {
            return total + (item.price * item.quantity);
          }, 0) || 0;

          // Account for any existing discount
          const existingDiscount = cartItem?.discount || 0;
          const discountedTotal = itemsTotal - existingDiscount;

          console.log('Gift card amount:', giftCardAmount,
            'Cart items total:', itemsTotal,
            'Existing discount:', existingDiscount,
            'Discounted total:', discountedTotal);

          if (giftCardAmount > discountedTotal) {
            message.warning(
              "Gift card amount exceeds order amount after discounts. Order amount must be greater than or equal to gift card amount."
            );
            return false;
          }
        }

        const confirmed = await ShowConfirm({
          title: "You are about to give the discount, please confirm?",
          position: true,
        });
        if (confirmed) {
          // If using gift card, ensure we're using the verified amount
          if (discountType === "code" && giftCardAmount !== null && giftCardId) {
            values.discount = giftCardAmount;

            // Update gift card status to false (deactivate it)
            await deactivateGiftCard(giftCardId);
          }

          dispatch(
            updateCart({ cart: cartItem, data: values })
          );
          return true;
        }
      }}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: "Apply Discount",
        },
        submitButtonProps: {
          disabled: discountType === "code" && giftCardAmount === null,
        },
      }}
    >
      <ProForm.Group>
        <ProFormSelect
          name="discount_type"
          label="Discount Type"
          options={discountOptions}
          width={"sm"}
          rules={[{ required: true, message: "Please select a discount type" }]}
          onChange={(value) => setDiscountType(value)}
        />
        {discountType === "amount" || discountType === "percentage" ? (
          <ProFormDigit
            name="discount"
            label={discountType === "percentage" ? "Discount (%)" : "Discount Amount"}
            width={"sm"}
            rules={[
              { required: true, message: "Please enter the discount amount" },
            ]}
          />
        ) : discountType === "code" ? (
          <ProFormText
            name="discount_code"
            label="Gift Card Code"
            width={"sm"}
            rules={[{ required: true, message: "Please enter the gift card code" }]}
            fieldProps={{
              suffix: isVerifying ? <LoadingOutlined /> : null,
              onBlur: (e) => verifyGiftCard(e.target.value),
            }}
            extra={
              giftCardAmount !== null
                ? `Available Balance: $${giftCardAmount}`
                : "Enter a valid gift card code"
            }
          />
        ) : null}
      </ProForm.Group>
      {discountType === "code" && giftCardAmount !== null && (
        <ProFormDigit
          name="discount"
          label="Gift Card Amount"
          width={"sm"}
          disabled
        />
      )}
    </ModalForm>
  );
};

export default DiscountModal;