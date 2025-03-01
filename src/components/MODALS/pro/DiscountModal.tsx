import React, { useRef, useState } from "react";
import { Button, Space } from "antd";
import {
  ModalForm,
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
} from "@ant-design/pro-form";
import { PercentageOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { useAppDispatch, useAppSelector } from "src/store";
import { updateCart } from "@features/Cart/CartActions";

interface DiscountModalProps {
  data?: any;
}

const DiscountModal: React.FC<DiscountModalProps> = ({ data: cartItem }) => {
  const [form] = ProForm.useForm();
  const formRef = useRef<any>();
  const dispatch = useAppDispatch();
  const [discountType, setDiscountType] = useState<string>("amount");

  const { user } = useAppSelector((state) => state.auth);

  const discountOptions = [
    { value: "amount", label: "Amount" },
    { value: "percentage", label: "Percentage" },
    { value: "code", label: "Gift Card" },
  ];

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
      trigger={
        user?.role === "admin" && (
          <Button type="primary" icon={<PercentageOutlined />} block>
            Offer Discount
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      onFinish={async (values) => {
        // console.log("discount", cartItem?._id);
        const confirmed = await ShowConfirm({
          title: "You are about to give the discount, please confirm?",
          position: true,
        });
        if (confirmed) {
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
          />
        ) : null}
      </ProForm.Group>


    </ModalForm>
  );
};

export default DiscountModal;
