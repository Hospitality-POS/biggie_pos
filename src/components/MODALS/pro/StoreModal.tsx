import React, { useRef } from "react";
import { Button, Form, Space } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
  ProFormSelect,
  ProFormTreeSelect,
  ProFormSwitch,
} from "@ant-design/pro-form";
import {
  CarryOutOutlined,
  EditOutlined,
  FolderAddTwoTone,
  PlusCircleFilled,
  TagsOutlined,
} from "@ant-design/icons";
import { ProFormMoney, ProFormTextArea } from "@ant-design/pro-components";
import ShowConfirm from "@utils/ConfirmUtil";
import { fetchAllCategories } from "@services/categories";
import { addNewProduct, editProduct } from "@services/products";
import { getAllModifierAddons } from "@services/modifierAddons";
import { useQuery } from "@tanstack/react-query";
import { FormInstance } from "antd/lib";

interface StoreModalProps {
  edit?: boolean;
  data?: any;
}
interface categoryValueType {
  name: string;
  _id: string;
}
interface modifiersAddonsType {
  name: string;
  _id: string;
  addons: any[];
}

const StoreModal: React.FC<StoreModalProps> = ({ edit, data }) => {
  const [form] = Form.useForm();
  const formRef = useRef<FormInstance>();

  const { data: allAddons } = useQuery({
    queryKey: ["addons"],
    queryFn: getAllModifierAddons,
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const { data: categoryData } = useQuery({
    queryKey: ["store-category"],
    queryFn: () => fetchAllCategories({}),
    refetchInterval: 5000,
    networkMode: "always",
  });

  const AddonsRequest = async () => {
    const values = allAddons?.map((modifierAddon: modifiersAddonsType) => ({
      label: modifierAddon?.name,
      title: modifierAddon?.name,
      value: modifierAddon?._id,
      key: modifierAddon?._id,
      disabled: true,
      children: modifierAddon?.addons?.map((childTable) => ({
        label: childTable?.name,
        title: childTable?.name,
        value: childTable?._id,
        icon: <CarryOutOutlined />,
        key: childTable?._id,
      })),
    }));
    return values;
  };
  const CategoryRequest = async () => {
    // const data = await fetchAllCategories({});
    const values = categoryData?.map((e: categoryValueType) => {
      return { label: e.name, value: e._id, key: e._id };
    });
    return values;
  };

  const editPayload = {
    ...data,
    category: {
      value: data?.category?._id,
      lable: data?.category?.name,
    },
    addons: data?.addons?.map((addon: any) => ({
      value: addon._id,
      label: addon.name,
    })),
  };

  const HandleOnFinish = async (values) => {
    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${edit ? "update this" : "add new"
        } Product?`,
      position: true,
    });
    if (confirmed) {
      const formattedValues = {
        ...values,
        addons: values.addons?.map((addon: any) => addon.value),
      };

      if (edit) {
        await editProduct({
          ...formattedValues,
          _id: data?._id,
        });
      } else {
        await addNewProduct({
          ...formattedValues,
          quantity: 1,
        });
      }
      return true;
    }
  };

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
      initialValues={edit ? editPayload : {}}
      trigger={
        edit ? (
          <Button
            type="link"
            key="button"
            icon={
              <EditOutlined
                style={{ fontSize: "20px", color: "white" }}
                onClick={() => form.setFieldsValue(editPayload)}
              />
            }
          ></Button>
        ) : (
          <Button type="primary" block>
            <PlusCircleFilled />
            New Item
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      onFinish={HandleOnFinish}
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
          request={CategoryRequest}
        />

        {edit && (
          <>
            <ProFormText
              key={"sub_category"}
              disabled
              width="md"
              id="product-sub-category"
              name={["sub_category", "name"]}
              label="Sub-Category"
            />
            <ProFormText
              hasFeedback
              disabled
              width="md"
              id="productcode"
              name="code"
              label="Code"
              convertValue={(value, _) => value.toUpperCase()}
            />
          </>
        )}
        <ProFormMoney
          key={"price"}
          hasFeedback
          width="md"
          name="price"
          customSymbol="Ksh."
          label="Price"
          rules={[{ required: true, message: "Product Price is required" }]}
          placeholder="Enter Product Price"
        />
        <ProFormSwitch
          width="md"
          id="activateInventory"
          name="activateInventory"
          label="Activate Inventory"
          rules={[
            {
              validator: (_, value) => {
                if (value === undefined) {
                  return Promise.reject("Please select if the product should auto deduct Inventory");
                }
                return Promise.resolve();
              },
            },
          ]}
          placeholder="Select if the product should auto deduct Inventory"
          initialValue={true}
        />


        {/* <ProFormSelect
          width={"md"}
          name="printer"
          label="Printer"
          rules={[{ required: true, message: "Printer is required" }]}
          showSearch
          placeholder="Select printer"
          request={async () => {
            const data = await fetchAllPrinters({});
            const values = data?.map((e: { name: any; _id: any }) => {
              return { label: e.name, value: e._id };
            });
            return values;
          }}
        /> */}
      </ProForm.Group>

      <ProForm.Group size={"large"} title="More Info*">
        <ProFormTreeSelect
          name="addons"
          width={"md"}
          key={"addons"}
          label="Addons (optional)"
          request={AddonsRequest}
          placeholder="Select addons"
          allowClear
          fieldProps={{
            id: "addons",
            treeLine: true,
            suffixIcon: <TagsOutlined />,
            treeIcon: true,
            filterTreeNode: true,
            showSearch: true,
            popupMatchSelectWidth: false,
            labelInValue: true,
            treeTitleRender: (value) => (
              <span
                style={{
                  color: "black",
                  fontWeight: "normal",
                  fontSize: "14px",
                }}
              >
                {value.title}
              </span>
            ),
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
        <ProFormTextArea
          key={"desc"}
          hasFeedback
          width="md"
          name="desc"
          label="Description"
          placeholder="Enter Product Description if any."
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default StoreModal;
