import React from "react";
import { Button, Space } from "antd";
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
  PlusOutlined,
  ReconciliationOutlined,
  SisternodeOutlined,
} from "@ant-design/icons";
import { fetchSubCategories } from "@services/categories";
import { fetchAllSuppliers } from "@services/supplier";
import { useAddEditProductInventory } from "../Hooks/useAddEditProductInventory";

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
  onAddInventory: (inventory: inventory) => void;
  actionRef;
}

const AddEditProInventoryModal: React.FC<AddInventoryDialogProps> = ({
  onAddInventory,
  actionRef,
}) => {
  const {
    isSubmitting,
    form,
    handleConfirmAddProductInventory,
    handleClose,
    setIsSubmitting,
  } = useAddEditProductInventory({ onAddInventory });

  return (
    <Space align="center" direction="vertical" size={"small"}>
      <ModalForm
        width={750}
        open={isSubmitting}
        // todo: reuse this for editmodal
        // initialValues={props.data ?props.data :{}}
        title={
          <Space>
            <ReconciliationOutlined />
            Add New Product Inventory
          </Space>
        }
        trigger={
          <Button
            onClick={() => setIsSubmitting(true)}
            key="button"
            icon={<ReconciliationOutlined />}
          >
            New
          </Button>
        }
        onFinish={async (values) => {
          await handleConfirmAddProductInventory(values);
          actionRef.current.reload();
        }}
        onOpenChange={(visible) => !visible && handleClose()}
        form={form}
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
          <ProFormMoney
            width="md"
            name="cost"
            label="Purchase cost"
            rules={[
              {
                required: true,
                message: "Invalid money format",
              },
            ]}
            placeholder="Enter Product Quantinty"
          />
          <ProFormSelect
            width="md"
            name="category_id"
            label="Subcategory"
            rules={[{ required: true, message: "Subcategory is required" }]}
            showSearch
            placeholder="Select subcategory"
            request={async () => {
              const data = await fetchSubCategories();
              const values = data.map((e: { name: string; _id: string }) => {
                return { label: e.name, value: e._id };
              });
              return values;
            }}
            // onChange={handleSubCategoryChange}
          />
          <ProFormDigit
            width="md"
            name="min_viable_quantity"
            label="Minimum viable Quantity"
            placeholder="Enter supplier phone"
          />
          <ProFormSelect
            width="md"
            name="supplier_id"
            label="Supplier"
            rules={[{ required: true, message: "Supplier is required" }]}
            showSearch
            placeholder="Select the name of the Supplier"
            request={async (param) => {
              const data = await fetchAllSuppliers(param);
              const values = data.map((e: { name: string; _id: string }) => {
                return { label: e.name, value: e._id };
              });
              return values;
            }}
          />
          <ProFormTextArea
            width="md"
            name="description"
            label="Description"
            placeholder="Enter Product description if any."
          />
        </ProForm.Group>
      </ModalForm>
    </Space>
  );
};

export default AddEditProInventoryModal;
