import React, { useCallback, useRef } from "react";
import {
  Button,
  Form,
  InputNumber,
  Tooltip,
  Row,
  Col,
  Spin,
  message,
  Flex,
} from "antd";
import { ModalForm, ProForm, ProFormSelect } from "@ant-design/pro-form";
import {
  PlusCircleFilled,
  MinusCircleOutlined,
  CarryOutOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAllInventoryItems, fetchAllUnits } from "@services/products";
import ShowConfirm from "@utils/ConfirmUtil";
import { createRecipe, deleteRecipe, fetchRecipe, updateRecipe } from "@services/recipe";
import { useAppSelector } from "src/store";

interface RecipeModalProps {
  productId: string;
  productName: string;
  activateInventory: boolean;
}

interface inventoryItemType {
  name: string;
  _id: string;
  unit_id: { _id: string; name: string };
}

interface unitType {
  name: string;
  _id: string;
}

interface recipeItemType {
  _id: string;
  inventory_id: { _id: string; name: string };
  unit_id: { _id: string; name: string };
  quantity: number;
}

const RecipeModal: React.FC<RecipeModalProps> = ({
  productId,
  productName,
  activateInventory,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [recipeItems, setRecipeItems] = React.useState<any[]>([]);

  // Mutation for deleting recipe item
  const { mutate: deleteRecipeMutation } = useMutation({
    mutationFn: deleteRecipe,
    onSuccess: () => {
      message.success("Recipe item deleted successfully");
      // Refetch recipe data after deletion
      fetchRecipeData();
    },
    onError: (error) => {
      message.error("Failed to delete recipe item");
      console.error("Delete error:", error);
    },
  });

  // Mutation for fetching recipe
  const { mutate: fetchRecipeData, isLoading: isLoadingRecipe } = useMutation({
    mutationFn: () => fetchRecipe(productId),
    onSuccess: (data) => {
      setRecipeItems(data); // Store original recipe data

      const formattedData = data?.map((item: recipeItemType) => ({
        _id: item?._id, // Store the recipe ID
        item: item?.inventory_id?._id || "missing_inventory",
        unit: item?.unit_id?._id,
        quantity: item?.quantity,
      })) || [{}];

      form.setFieldsValue({
        recipeItems: formattedData,
      });
      setModalVisible(true);
    },
    onError: (error) => {
      console.error("Failed to fetch recipe:", error);
      form.setFieldsValue({
        recipeItems: [{}],
      });
      setModalVisible(true);
    },
  });

  const handleDeleteRecipeItem = async (recipeId: string, name: number) => {
    const confirmed = await ShowConfirm({
      title: "Are you sure you want to delete this recipe item?",
      position: true,
    });

    if (confirmed) {
      if (recipeId) {
        // If we have a recipe ID, delete from database
        deleteRecipeMutation(recipeId);
      } else {
        // If no recipe ID (new item), just remove from form
        const currentItems = form.getFieldValue("recipeItems");
        const newItems = currentItems.filter(
          (_: any, index: number) => index !== name
        );
        form.setFieldsValue({ recipeItems: newItems });
      }
    }
  };
  // Fetch inventory items and units
  const { data: inventoryItems, isLoading: isLoadingInventory } = useQuery({
    queryKey: ["inventoryItems"],
    queryFn: fetchAllInventoryItems,
    staleTime: 60 * 1000,
    networkMode: "always",
  });

  const { data: units, isLoading: isLoadingUnits } = useQuery({
    queryKey: ["units"],
    queryFn: fetchAllUnits,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    networkMode: "always",
  });

  const InventoryRequest = useCallback(async () => {
    return inventoryItems?.map((item: inventoryItemType) => ({
      label: item?.name,
      value: item?._id,
      unit: item?.unit_id,
    }));
  }, [inventoryItems]);


  const handleTriggerClick = () => {
    form.resetFields();
    fetchRecipeData();
  };

  const handleModalClose = () => {
    form.resetFields();
    setModalVisible(false);
  };



  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  const handleOnFinish = async (values: any) => {
    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${form.getFieldValue("recipeItems")?.length > 1 ? "update" : "save"
        } this Formula?`,
      position: true,
    });

    if (confirmed) {
      try {
        if (form.getFieldValue("recipeItems")?.length > 1) {
          await updateRecipe(productId, values.recipeItems);
        } else {
          await createRecipe(productId, values.recipeItems);
        }
        handleModalClose();
        return true;
      } catch (error) {
        console.error("Error saving Formula:", error);
        return false;
      }
    }
    return false;
  };

  return (
    <ModalForm
      form={form}
      formRef={formRef}
      loading={isLoadingRecipe}
      open={modalVisible}
      onOpenChange={(visible) => {
        if (!visible) handleModalClose();
      }}
      title={
        <Flex gap={4}>
          <CarryOutOutlined />
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
              {`${form.getFieldValue("recipeItems")?.length > 1 ? "Update" : "Add"
                } Formula for ${productName}`}
            </span>
          </Tooltip>
        </Flex>
      }
      trigger={
        activateInventory ? (
          <Button
            onClick={handleTriggerClick}
            loading={isLoadingRecipe}
            type="primary"
            icon={
              <CarryOutOutlined
                style={{
                  fontSize: "25px",
                  color: "white" // Button appears active when activateInventory is true
                }}
              />
            }
            disabled={!activateInventory || !isAdmin}
            style={{
              border: 'none',  // Remove border around the button
            }}
          />
        ) : (
          <Tooltip title="Inventory auto deduction has been disabled, kindly enable to proceed">
            <Button
              onClick={handleTriggerClick}
              loading={isLoadingRecipe}
              type="primary"
              icon={
                <CarryOutOutlined
                  style={{
                    fontSize: "25px",
                    color: "gray" // Button appears inactive when activateInventory is false
                  }}
                />
              }
              disabled={!activateInventory || !isAdmin}
              style={{
                border: 'none',  // Remove border around the button
              }}
            />
          </Tooltip>
        )
      }

      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
        onCancel: handleModalClose,
      }}
      onFinish={handleOnFinish}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: `${form.getFieldValue("recipeItems")?.length > 1 ? "Update" : "Save"
            } Recipe`,
        },
        submitButtonProps: {
          disabled: isLoadingRecipe,
          icon:
            form.getFieldValue("recipeItems")?.length > 1 ? (
              <CheckCircleOutlined />
            ) : (
              <PlusCircleFilled />
            ),
          loading: isLoadingRecipe || isLoadingInventory || isLoadingUnits,
        },
      }}
    >
      {isLoadingRecipe || isLoadingInventory || isLoadingUnits ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Spin tip="Please wait a moment..." />
        </div>
      ) : (
        <div
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            overflowX: "hidden",
            marginBottom: "16px",
          }}
        >
          <Form.List name="recipeItems" initialValue={[{}]}>
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
                          onChange: (value, option: any) => {
                            const selectedUnit = option.unit;
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
                          disabled: true,
                        }}
                        options={units?.map((unit: unitType) => ({
                          label: unit.name,
                          value: unit._id,
                        }))}
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
                        onClick={() => {
                          const recipeId = form.getFieldValue([
                            "recipeItems",
                            name,
                            "_id",
                          ]);
                          handleDeleteRecipeItem(recipeId, name);
                        }}
                      >
                        Remove
                      </Button>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" block onClick={() => add()}>
                  <PlusCircleFilled /> Add Formula Item
                </Button>
              </>
            )}
          </Form.List>
        </div>
      )}
    </ModalForm>
  );
};

export default RecipeModal;
