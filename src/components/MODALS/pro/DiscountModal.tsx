import React, { useRef } from "react";
import { Button, Form, Select, Space } from "antd";
import { ModalForm, ProForm, ProFormDigit } from "@ant-design/pro-form";
import {
  DollarCircleOutlined,
  PercentageOutlined,
  SwapOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { transferBill } from "@services/bills";
import ShowConfirm from "@utils/ConfirmUtil";
import {
  ProFormRate,
  ProFormSelect,
  ProFormTreeSelect,
} from "@ant-design/pro-components";
import { fetchTableUsequery } from "@services/tables";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "src/store";

interface TransferBillModalProps {
  data?: any;
}

const DiscountModal: React.FC<TransferBillModalProps> = ({
  data: cartItem,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef();

  const discountOptions = [
    { value: 10, label: "10%" },
    { value: 20, label: "20%" },
    { value: 30, label: "30%" },
    { value: 40, label: "40%" },
    { value: 50, label: "50%" },
    { value: 60, label: "60%" },
    { value: 70, label: "70%" },
    { value: 80, label: "80%" },
    { value: 90, label: "90%" },
    { value: 100, label: "100%" },
  ];

  return (
    <ModalForm
      form={form}
      formRef={formRef}
      width={400}
      title={
        <Space>
          <PercentageOutlined />
          {"Offer Discount"}
        </Space>
      }
      trigger={
        <Button type="primary" icon={<PercentageOutlined />}>
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
          position: true
        });
        if (confirmed) {
          //   await transferBill(values);
          //   actionRef.current.reset();
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
        <ProForm.Item
          name="order_discount"
          label="Discount (%)"
          rules={[
            { required: true, message: "Please select a discount percentage" },
          ]}
        >
          <ProFormSelect options={discountOptions} width={"md"} />
        </ProForm.Item>
      </ProForm.Group>
    </ModalForm>
  );
};

export default DiscountModal;
