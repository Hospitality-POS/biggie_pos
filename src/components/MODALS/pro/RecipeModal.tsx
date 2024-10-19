import React, { useRef } from "react";
import { Button, Form, Space, InputNumber, Tooltip, Row, Col } from "antd";
import { ModalForm, ProForm, ProFormSelect } from "@ant-design/pro-form";
import {
  FolderAddTwoTone,
  PlusCircleFilled,
  MinusCircleOutlined,
  CarryOutOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchAllInventoryItems, fetchAllUnits } from "@services/products";
import ShowConfirm from "@utils/ConfirmUtil";

interface RecipeModalProps {
  productId: string;
  productName: string;
}

interface inventoryItemType {
  name: string;
  _id: string;
  unit_id: { _id: string; name: string }; // Adjusted to match your response structure
}

interface unitType {
  name: string;
  _id: string;
}

const RecipeModal: React.FC<RecipeModalProps> = ({
  productId,
  productName,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef(null);

  // Fetch inventory items using React Query
  const { data: inventoryItems } = useQuery({
    queryKey: ["inventoryItems"],
    queryFn: fetchAllInventoryItems,
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  // Fetch units using React Query
  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: fetchAllUnits,
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  // Fetch inventory items and map with unit details
  const InventoryRequest = async () => {
    const data = inventoryItems?.map((item: inventoryItemType) => ({
      label: item?.name,
      value: item?._id,
      unit: item?.unit_id, // Now including the unit_id object from the response
    }));
    return data;
  };

  const handleOnFinish = async (values: any) => {
    const confirmed = await ShowConfirm({
      title: `Are you sure you want to save this recipe?`,
      position: true,
    });

    if (confirmed) {
      // Here you would call your service to save the recipe
      console.log("Saving recipe: ", { productId, ...values });

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
          <Tooltip title={productName}>
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "400px",
                display: "inline-block",
              }}
            >
              {`Add Recipe for ${productName}`}
            </span>
          </Tooltip>
        </Space>
      }
      trigger={
        <Tooltip key="setting" title="Add Recipe">
          <CarryOutOutlined
            key="setting"
            style={{ fontSize: "25px", color: "white" }}
          />
        </Tooltip>
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      onFinish={handleOnFinish}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: "Save Recipe",
        },
      }}
    >
      <div
        style={{ maxHeight: "300px", overflowY: "auto", overflowX:"hidden", marginBottom: "16px" }}
      >
        <Form.List name="recipeItems">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, fieldKey, ...restField }) => (
                <Row
                  key={key}
                  gutter={[16, 16]}
                  style={{ marginBottom: "8px" }}
                >
                  <Col xs={24} sm={12} md={8}>
                    <ProFormSelect
                      {...restField}
                      name={[name, "item"]}
                      showSearch
                      label="Inventory Item"
                      placeholder="Select inventory item"
                      rules={[
                        {
                          required: true,
                          message: "Inventory item is required",
                        },
                      ]}
                      request={InventoryRequest}
                      width="sm"
                      fieldProps={{
                        onChange: (value, option) => {
                          const selectedUnit = option.unit;
                          // Set the unit ID and make it read-only
                          form.setFieldValue(
                            ["recipeItems", name, "unit"],
                            selectedUnit._id
                          );
                        },
                      }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <ProForm.Item
                      {...restField}
                      name={[name, "quantity"]}
                      label="Quantity"
                      rules={[
                        { required: true, message: "Quantity is required" },
                      ]}
                    >
                      <InputNumber
                        min={0.1}
                        placeholder="Enter quantity"
                        style={{ width: "100%" }}
                      />
                    </ProForm.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <ProFormSelect
                      {...restField}
                      name={[name, "unit"]}
                      label="Unit"
                      placeholder="Unit will be auto-filled"
                      fieldProps={{
                        disabled: true, // Disable editing of the unit field
                      }}
                      request={async () =>
                        units?.map((unit: unitType) => ({
                          label: unit.name,
                          value: unit._id,
                        }))
                      }
                    />
                  </Col>
                  <Col
                    xs={24}
                    sm={12}
                    md={2}
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    <Button
                      type="link"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(name)}
                    >
                      Remove
                    </Button>
                  </Col>
                </Row>
              ))}
              <Button type="dashed" block onClick={() => add()}>
                <PlusCircleFilled /> Add Recipe Item
              </Button>
            </>
          )}
        </Form.List>
      </div>
    </ModalForm>
  );
};

export default RecipeModal;
