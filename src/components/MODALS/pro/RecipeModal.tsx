import React, { useRef } from "react";
import { Button, Form, Space, InputNumber, Tooltip } from "antd";
import {
    ModalForm,
    ProForm,
    ProFormSelect,
} from "@ant-design/pro-form";
import {
    FolderAddTwoTone,
    PlusCircleFilled,
    MinusCircleOutlined,
    SettingOutlined,
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
}

interface unitType {
    name: string;
    _id: string;
}

const RecipeModal: React.FC<RecipeModalProps> = ({ productId, productName }) => {
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

    const InventoryRequest = async () => {
        const data = inventoryItems?.map((item: inventoryItemType) => ({
            label: item?.name,
            value: item?._id,
        }));
        return data;
    };

    const UnitsRequest = async () => {
        const data = units?.map((unit: unitType) => ({
            label: unit?.name,
            value: unit?._id,
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
            // passing the productId and the recipe items
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
                        <span style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '400px', // Adjust based on your design
                            display: 'inline-block'
                        }}>
                            {`Add Recipe for ${productName}`}
                        </span>
                    </Tooltip>
                </Space>
            }
            trigger={
                <SettingOutlined
                    key="setting"
                    style={{ fontSize: "25px", color: "white" }}
                />
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
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                <Form.List name="recipeItems">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, fieldKey, ...restField }) => (
                                <div key={key} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                                    <ProFormSelect
                                        {...restField}
                                        name={[name, "item"]}
                                        showSearch
                                        label="Inventory Item"
                                        placeholder="Select inventory item"
                                        rules={[{ required: true, message: "Inventory item is required" }]}
                                        request={InventoryRequest}
                                        width="sm"
                                        style={{ flex: 2 }} // Flex for width balance
                                    />
                                    <ProFormSelect
                                        {...restField}
                                        name={[name, "unit"]}
                                        showSearch
                                        label="Unit"
                                        placeholder="Select unit"
                                        rules={[{ required: true, message: "Unit is required" }]}
                                        request={UnitsRequest} // Use the UnitsRequest for fetching units
                                        width="sm"
                                        style={{ flex: 1 }} // Flex for width balance
                                    />
                                    <ProForm.Item
                                        {...restField}
                                        name={[name, "quantity"]}
                                        label="Quantity"
                                        rules={[{ required: true, message: "Quantity is required" }]}
                                        style={{ flex: 1 }} // Flex for width balance
                                    >
                                        <InputNumber min={0.1} placeholder="Enter quantity" style={{ width: '100%' }} />
                                    </ProForm.Item>
                                    <Button
                                        type="link"
                                        danger
                                        icon={<MinusCircleOutlined />}
                                        onClick={() => remove(name)}
                                        style={{ alignSelf: 'center' }} // Center the button
                                    >
                                        Remove
                                    </Button>
                                </div>
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