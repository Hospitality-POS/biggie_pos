import React, { useCallback, useRef, useState } from "react";
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
  Radio,
  Tag,
  Divider,
  Space,
  Select
} from "antd";
import { ModalForm, ProForm, ProFormSelect } from "@ant-design/pro-form";
import {
  PlusCircleFilled,
  MinusCircleOutlined,
  CarryOutOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from "@ant-design/icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAllInventoryItems, fetchAllUnits } from "@services/products";
import ShowConfirm from "@utils/ConfirmUtil";
import { createRecipe, deleteRecipe, fetchRecipe, updateRecipe } from "@services/recipe";
import { useAppSelector } from "src/store";

const RecipeModal = ({ productId, productName, activateInventory }) => {
  const [form] = Form.useForm();
  const formRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [recipeItems, setRecipeItems] = useState([]);

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

      const formattedData = data?.map((item) => ({
        _id: item?._id, // Store the recipe ID
        item: item?.inventory_id?._id || "missing_inventory",
        unit: item?.unit_id?._id,
        quantity: item?.quantity,
        itemFormat: item?.formatType || "direct",
        ratio: item?.ratio || 1
      })) || [{}];

      form.setFieldsValue({
        recipeItems: formattedData
      });
      setModalVisible(true);
    },
    onError: (error) => {
      console.error("Failed to fetch recipe:", error);
      form.setFieldsValue({
        recipeItems: [{}]
      });
      setModalVisible(true);
    },
  });

  const handleDeleteRecipeItem = async (recipeId, name) => {
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
        const newItems = currentItems.filter((_, index) => index !== name);
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
    return inventoryItems?.map((item) => ({
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

  const handleItemFormatChange = (name, value) => {
    // Update the ratio when format changes
    const currentItems = form.getFieldValue("recipeItems");
    const updatedItems = [...currentItems];
    updatedItems[name] = {
      ...updatedItems[name],
      itemFormat: value,
      ratio: value === "ratio" ? (updatedItems[name].ratio || 3) : 1
    };
    form.setFieldsValue({ recipeItems: updatedItems });
  };

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  const handleOnFinish = async (values) => {
    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${form.getFieldValue("recipeItems")?.length > 1 ? "update" : "save"} this Formula?`,
      position: true,
    });

    if (confirmed) {
      try {
        // Each item has its own format and ratio
        const payload = {
          ...values,
          recipeItems: values.recipeItems
        };

        if (recipeItems.length > 0) {
          await updateRecipe(productId, payload);
        } else {
          await createRecipe(productId, payload);
        }

        message.success(`Formula ${recipeItems.length > 0 ? "updated" : "created"} successfully`);
        handleModalClose();
        return true;
      } catch (error) {
        console.error("Error saving Formula:", error);
        message.error("Failed to save formula");
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
              {`${recipeItems.length > 0 ? "Update" : "Add"} Formula for ${productName}`}
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
                  color: "white"
                }}
              />
            }
            disabled={!activateInventory || !isAdmin}
            style={{
              border: 'none',
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
                    color: "gray"
                  }}
                />
              }
              disabled={!activateInventory || !isAdmin}
              style={{
                border: 'none',
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
        width: 900,
      }}
      onFinish={handleOnFinish}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: `${recipeItems.length > 0 ? "Update" : "Save"} Formula`,
        },
        submitButtonProps: {
          disabled: isLoadingRecipe,
          icon: recipeItems.length > 0 ? (
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
        <>
          <div style={{ padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "4px", marginBottom: "16px" }}>
            <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
            <span>
              Each inventory item can use its own deduction format. Direct format uses 1:1 deduction,
              while Ratio format allows multiple sales before deducting inventory.
            </span>
          </div>

          <Divider orientation="left">Recipe Items</Divider>

          <div
            style={{
              maxHeight: "400px",
              overflowY: "auto",
              overflowX: "hidden",
              marginBottom: "16px",
            }}
          >
            <Form.List name="recipeItems" initialValue={[{}]}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, fieldKey, ...restField }) => {
                    const itemFormat = form.getFieldValue(["recipeItems", name, "itemFormat"]) || "direct";

                    return (
                      <Row
                        key={key}
                        gutter={[16, 16]}
                        style={{ marginBottom: "16px", borderBottom: "1px solid #f0f0f0", paddingBottom: "16px" }}
                      >
                        <Col xs={24} sm={12} md={6}>
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
                                form.setFieldValue(
                                  ["recipeItems", name, "unit"],
                                  selectedUnit._id
                                );
                              },
                            }}
                          />
                        </Col>

                        <Col xs={24} sm={12} md={4}>
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

                        <Col xs={24} sm={12} md={4}>
                          <ProFormSelect
                            {...restField}
                            name={[name, "unit"]}
                            label="Unit"
                            placeholder="Auto-filled"
                            fieldProps={{
                              disabled: true,
                            }}
                            options={units?.map((unit) => ({
                              label: unit.name,
                              value: unit._id,
                            }))}
                          />
                        </Col>

                        <Col xs={24} sm={12} md={4}>
                          <Form.Item
                            {...restField}
                            name={[name, "itemFormat"]}
                            label="Format"
                            initialValue="direct"
                            rules={[{ required: true }]}
                          >
                            <Select
                              onChange={(value) => handleItemFormatChange(name, value)}
                              style={{ width: "100%" }}
                            >
                              <Select.Option value="direct">
                                <Tag color="blue">Direct</Tag>
                              </Select.Option>
                              <Select.Option value="ratio">
                                <Tag color="green">Ratio</Tag>
                              </Select.Option>
                            </Select>
                          </Form.Item>
                        </Col>

                        {itemFormat === "ratio" && (
                          <Col xs={24} sm={12} md={4}>
                            <ProForm.Item
                              {...restField}
                              name={[name, "ratio"]}
                              label="Service Ratio"
                              tooltip="How many service sales per 1 inventory deduction"
                              initialValue={3}
                              rules={[
                                { required: true, message: "Ratio is required" },
                              ]}
                            >
                              <InputNumber
                                min={1}
                                placeholder="Enter ratio"
                                style={{ width: "100%" }}
                              />
                            </ProForm.Item>
                          </Col>
                        )}

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
                    );
                  })}
                  <Button type="dashed" block onClick={() => add()}>
                    <PlusCircleFilled /> Add Formula Item
                  </Button>
                </>
              )}
            </Form.List>
          </div>
        </>
      )}
    </ModalForm>
  );
};

export default RecipeModal;