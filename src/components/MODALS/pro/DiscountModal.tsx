import React, { useRef } from "react";
import { Button, Space } from "antd";
import {
  ModalForm,
  ProForm,
  ProFormDigit,
  ProFormSelect,
} from "@ant-design/pro-form";
import { PercentageOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { addDiscount } from "@features/Cart/CartSlice";
import { useAppDispatch } from "src/store";

interface DiscountModalProps {
  data?: any;
}

const DiscountModal: React.FC<DiscountModalProps> = ({ data: cartItem }) => {
  const [form] = ProForm.useForm();
  const formRef = useRef<any>();
  const dispatch = useAppDispatch();

  const discountOptions = [
    { value: "amount", label: "Amount" },
    { value: "percentage", label: "Percentage" },
  ];

  return (
    <ModalForm
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
        <Button type="primary" icon={<PercentageOutlined />} block>
        Offer Discount?
        </Button>
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      onFinish={async (values) => {
        console.log("discount", values);
        const confirmed = await ShowConfirm({
          title: "You are about to give the discount, please confirm?",
          position: true,
        });
        if (confirmed) {
          dispatch(
            addDiscount({
              order_type: values.type,
              order_discount: values.order_discount,
            })
          );
          return true;
        }
      }}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: "Give Discount",
        },
      }}
    >
      <ProForm.Group>
        <ProFormSelect
          name="type"
          label="Discount Type"
          options={discountOptions}
          width={"sm"}
          rules={[{ required: true, message: "Please select a discount type" }]}
        />
        <ProFormDigit
          name="order_discount"
          label="Discount Amount"
          width={"sm"}
          rules={[
            { required: true, message: "Please enter the discount amount" },
          ]}
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default DiscountModal;
