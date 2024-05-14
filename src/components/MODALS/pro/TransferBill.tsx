import React, { useRef } from "react";
import { Button, Form, Space } from "antd";
import { ModalForm, ProForm, ProFormDigit } from "@ant-design/pro-form";
import {
  CarryOutOutlined,
  DollarCircleOutlined,
  SwapOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { transferBill } from "@services/bills";
import ShowConfirm from "@utils/ConfirmUtil";
import { ProFormSelect, ProFormTreeSelect } from "@ant-design/pro-components";
import { fetchTableUsequery, transferCartitems } from "@services/tables";
import { useQuery } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "src/store";
import { useNavigate, useParams } from "react-router-dom";
import { createCart, deleteCartItem } from "@features/Cart/CartActions";
import useCartItemsData from "@hooks/cartItemsData";
import { reset } from "@features/Auth/AuthSlice";

interface TransferBillModalProps {
  data?: any;
}

const TransferBillModal: React.FC<TransferBillModalProps> = ({
  data: cartItem,
}) => {
  const { data } = useQuery({
    queryKey: ["tables"],
    queryFn: fetchTableUsequery,
    retry: 3,
    refetchInterval: 3000,
    networkMode: "always",
  });
  const [form] = Form.useForm();
  const formRef = useRef();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data: cartItems, refetch } = useCartItemsData();

  const { id } = useParams();

  const locations = data?.map(
    (table: { name: string; _id: string; tables: any[] }) => ({
      title: table?.name,
      value: table?._id,
      disabled: true,
      children: table?.tables
        .filter(
          (childTable: { name: string; _id: string }) => childTable._id !== id
        ) // Efficient filtering
        .map((childTable) => ({
          title: childTable?.name,
          value: childTable?._id,
          icon: <CarryOutOutlined />,
        })),
    })
  );

  const productOptions = cartItem?.map((product) => ({
    label: product.product_id?.name,
    value: product._id,
  }));

  return (
    <ModalForm
      form={form}
      formRef={formRef}
      title={
        <Space>
          <SwapOutlined />
          {"Transfer Bill"}
        </Space>
      }
      trigger={
        <Button
          style={{
            pl: 2,
            color: "#6c1c2c",
            borderColor: "#6c1c2c",
            "&:hover": {
              borderColor: "#bc8c7c",
              color: "#bc8c7c",
            },
          }}
          icon={<SwapOutlined />}
        >
          Transfer Bill
        </Button>
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        style: { display: "grid", placeContent: "center" },
      }}
      onFinish={async (values) => {
        console.log("transfer bilss ddata", values);

        const confirmed = await ShowConfirm({
          title: "Are you sure you want to transfer this bill?",
        });
        if (confirmed) {
          await transferCartitems(values);
          refetch();
          navigate("/tables")
          return true;
        }
      }}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: "Transfer Bill",
        },
      }}
    >
      <ProForm.Group>
        <ProFormSelect
          width={"md"}
          label="Products"
          name="products"
          mode="multiple"
          options={productOptions}
          rules={[
            { required: true, message: "Please select one or more products" },
          ]}
        />

        <ProFormTreeSelect
          width={"md"}
          name="table"
          label="Tables"
          rules={[
            {
              required: true,
              message: "Please select a table location to transfer!",
            },
          ]}
          request={() => locations}
          allowClear
          fieldProps={{
            treeLine: true,
            suffixIcon: <TableOutlined />,
            treeIcon: true,
            filterTreeNode: true,
            showSearch: true,
            popupMatchSelectWidth: false,
            labelInValue: true,
            autoClearSearchValue: true,
            multiple: false,
            treeNodeFilterProp: "title",
            fieldNames: {
              label: "title",
            },
            getPopupContainer: () => document.body,
          }}
          style={{ width: "100%" }}
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default TransferBillModal;
