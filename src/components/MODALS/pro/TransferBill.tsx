import React, { useRef } from "react";
import { Button, Form, Space } from "antd";
import { ModalForm, ProForm, ProFormDigit } from "@ant-design/pro-form";
import { DollarCircleOutlined, SwapOutlined, TableOutlined } from "@ant-design/icons";
import { transferBill } from "@services/bills";
import ShowConfirm from "@utils/ConfirmUtil";
import { ProFormSelect, ProFormTreeSelect } from "@ant-design/pro-components";
import { fetchTableUsequery, transferCartitems } from "@services/tables";
import { useQuery } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "src/store";
import { useNavigate } from "react-router-dom";
import { deleteCartItem } from "@features/Cart/CartActions";

interface TransferBillModalProps {
  data?: any;
}

const TransferBillModal: React.FC<TransferBillModalProps> = ({ data : cartItem }) => {
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
  const dispatch = useAppDispatch()

  const locations = data.map((table: { name: string; _id: string; tables: any[]; }) => ({
    title: table.name,
    value: table._id,
    children: table.tables.map((childTable: { name: string; _id: string; }) => ({
        title: childTable.name,
        value: childTable._id,
      })),
  }));


  console.log("carrrttitems", cartItem);
  
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
            // values.products.forEach((productId) =>
            //   dispatch(deleteCartItem(productId))
            // );
            if (!cartItem.length){
              navigate("/tables");
            }
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
            { required: true, message: "Please select one or more tables" },
          ]}
          request={() => locations}
          allowClear
          fieldProps={{
            treeLine: true,
            suffixIcon: <TableOutlined />,
            filterTreeNode: true,
            showSearch: true,
            popupMatchSelectWidth: false,
            labelInValue: true,
            autoClearSearchValue: true,
            multiple: true,
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
