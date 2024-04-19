import React, { useRef } from "react";
import { Button, Form, Space } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
  ProFormSelect,
} from "@ant-design/pro-form";
import {
  EditOutlined,
  FolderAddTwoTone,
  PlusCircleFilled,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import {
  ProFormDigit,
  ProFormMoney,
  ProFormTextArea,
} from "@ant-design/pro-components";
import ShowConfirm from "@utils/ConfirmUtil";
import { fetchAllCategories } from "@services/categories";
import { addNewProduct, editProduct } from "@services/products";

interface StoreModalProps {
  edit?: boolean;
  data?: any;
}

const StoreModal: React.FC<StoreModalProps> = ({ edit, data }) => {
  const [form] = Form.useForm();
  const formRef = useRef();

  return (
    <ModalForm
      form={form}
      formRef={formRef}
      title={
        <Space>
          <FolderAddTwoTone />
          {edit ? "Edit Product" : "Add New Product"}
        </Space>
      }
      initialValues={
        edit
          ? {
              ...data,
              category: {
                value: data?.category?._id,
                lable: data?.category?.name,
              },
            }
          : {}
      }
      trigger={
        edit ? (
          <Button
            type="link"
            key="button"
            icon={
              <EditOutlined
                style={{ fontSize: "20px", color: "white" }}
                onClick={() => form.setFieldsValue(data)}
              />
            }
          ></Button>
        ) : (
          <Button type="primary" block>
            <PlusCircleFilled />
            New Dish
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        style: { display: "grid", placeContent: "center" },
      }}
      onFinish={async (values) => {
        const confirmed = await ShowConfirm({
          title: `Are you sure you want to ${
            edit ? "update this" : "add new"
          } Product?`,
        });
        if (confirmed) {
          edit
            ? await editProduct({ values, _id: data?._id })
            : await addNewProduct(values);
          return true;
        }
      }}
      onOpenChange={(visible) => !visible}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Edit Product" : "Add New Product",
        },
      }}
    >
      <ProForm.Group title="Product Details">
        <ProFormText
          hasFeedback
          width="md"
          id="productName"
          name="name"
          label="Name"
          rules={[{ required: true, message: "Product name is required" }]}
          placeholder="Enter product name"
        />

        <ProFormSelect
          hasFeedback
          width="md"
          name="category"
          label="Category"
          rules={[{ required: true, message: "Product category is required" }]}
          showSearch
          placeholder="Select product category"
          request={async () => {
            const data = await fetchAllCategories({});
            const values = data?.map((e: { name: any; _id: any }) => {
              return { label: e.name, value: e._id };
            });
            return values;
          }}
        />

        <ProFormDigit
          hasFeedback
          width="md"
          name="quantity"
          label="Quantity"
          rules={[{ required: true, message: "Product quantity is required" }]}
          placeholder="Enter Product Quantity"
        />
        {edit && (
          <ProFormText
            disabled
            width="md"
            id="product-sub-category"
            name={["sub_category", "name"]}
            label="sub-category"
          />
        )}
        <ProFormMoney
          hasFeedback
          width="md"
          name="price"
          customSymbol="Ksh."
          label="Price"
          rules={[{ required: true, message: "Product Price is required" }]}
          placeholder="Enter Product Price"
        />
      </ProForm.Group>
      <ProForm.Group size={"large"} title="More Info*">
        <ProFormTextArea
          hasFeedback
          width={"xl"}
          name="desc"
          label="Description"
          placeholder="Enter Product Description if any."
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default StoreModal;
