import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Space } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
  ProFormTextArea,
  ProFormDigit,
  ProFormSelect,
  ProFormMoney,
} from "@ant-design/pro-form";
import BusinessIcon from "@mui/icons-material/Business";
import useAddSupplierDialog from "../Hooks/useAddSupplierDialog";
import { ActionType } from "@ant-design/pro-components";
import {
  EditOutlined,
  PlusOutlined,
  ReconciliationOutlined,
  SisternodeOutlined,
} from "@ant-design/icons";
import { fetchSubCategories } from "@services/categories";
import { fetchAllSuppliers } from "@services/supplier";
import { useAddEditProductInventory } from "../Hooks/useAddEditProductInventory";
import { useQuery } from "@tanstack/react-query";
import { fetchAllUnits } from "@services/products";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewInventory, editInventory } from "@services/inventory";

interface inventory {
  name: string;
  quantity: number;
  cost: number;
  price: number;
  min_viable_quantity: number;
  category_id: string;
  supplier_id: string;
  desc: string;
}

interface AddInventoryDialogProps {
  data?: any;
  actionRef?: any;
  edit?: boolean;
}

interface unitType {
  name: string;
  _id: string;
}

const AddEditProInventoryModal: React.FC<AddInventoryDialogProps> = ({
  data,
  actionRef,
  edit,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
        main_category: {
          value: data?.main_category?._id,
          lable: data?.main_category?.name,
        },
      });
    }
  }, [open, data, form]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };

  // Fetch units using React Query
  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: fetchAllUnits,
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const UnitsRequest = async () => {
    const data = units?.map((unit: unitType) => ({
      label: unit?.name,
      value: unit?._id,
    }));
    return data;
  };

  //  Fetch sub categories using React Query
  const { data: subCategories } = useQuery({
    queryKey: ["subCategories"],
    queryFn: fetchSubCategories,
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const SubCategoriesRequest = async () => {
    const data = subCategories?.map((e: { name: string; _id: string }) => {
      return { label: e.name, value: e._id };
    });
    return data;
  };

  return (
    <Space align="center" direction="vertical" size={"small"}>
      <ModalForm
        width={750}
        open={open}
        onOpenChange={handleOpenChange}
        title={
          <Space>
            <ReconciliationOutlined />
            {edit ? "Edit Inventory" : "Add New Inventory"}
          </Space>
        }
        trigger={
          edit ? (
            <Space key="button" size="small" style={{ cursor: "pointer" }}>
              <EditOutlined onClick={() => form.setFieldsValue(data)} /> Edit
            </Space>
          ) : (
            <Button
              type="primary"
              key="button"
              icon={<ReconciliationOutlined />}
            >
              New Inventory
            </Button>
          )
        }
        initialValues={
          edit
            ? {
                ...data,
                subcategory_id: {
                  value: data?.subcategory_id?._id,
                  label: data?.subcategory_id?.name,
                },
                unit_id: {
                  value: data?.unit_id?._id,
                  label: data?.unit_id?.name,
                },
              }
            : {}
        }
        onFinish={async (values) => {
          const confirmed = await ShowConfirm({
            title: `Are you sure you want to ${
              edit ? "update this" : "add new"
            } Inventory?`,
            position: true,
          });
          if (confirmed) {
            edit
              ? await editInventory({ values, _id: data?._id })
              : await addNewInventory(values);
            actionRef.current.reload();
            setOpen(false);
            return true;
          }
        }}
        form={form}
        formRef={formRef}
        autoFocusFirstInput
        modalProps={{
          destroyOnClose: true,
          centered: true,
        }}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: "Add Inventory",
          },
        }}
      >
        <ProForm.Group>
          <ProFormText
            width="md"
            name="name"
            label="Name"
            rules={[{ required: true, message: "Name is required" }]}
            placeholder="Enter Product name"
          />

          <ProFormSelect
            width="md"
            name="subcategory_id"
            label="Subcategory"
            rules={[{ required: true, message: "Subcategory is required" }]}
            showSearch
            placeholder="Select subcategory"
            request={SubCategoriesRequest}
          />
          <ProFormDigit
            width="md"
            name="quantity"
            label="Quantity"
            rules={[
              {
                required: true,
                message: "Invalid Quantinty format",
              },
            ]}
            placeholder="Enter Product Quantinty"
          />
          <ProFormSelect
            name={"unit_id"}
            showSearch
            label="Unit"
            placeholder="Select unit"
            rules={[{ required: true, message: "Unit is required" }]}
            request={UnitsRequest}
            width="md"
          />
          <ProFormMoney
            width="md"
            name="price"
            label="Purchase cost"
            customSymbol="Ksh."
            rules={[
              {
                required: true,
                message: "Invalid money format",
              },
            ]}
            placeholder="Enter Product Quantinty"
          />
          <ProFormDigit
            width="md"
            name="min_viable_quantity"
            label="Minimum viable Quantity"
            placeholder="Enter minimum viable quantity"
          />
          <ProFormTextArea
            width="md"
            name="desc"
            label="Description"
            placeholder="Enter Product description if any."
          />
        </ProForm.Group>
      </ModalForm>
    </Space>
  );
};

export default AddEditProInventoryModal;
