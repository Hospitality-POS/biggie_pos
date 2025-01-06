import React, { useRef } from "react";
import { Button, Space } from "antd";
import {
    ModalForm,
    ProForm,
    ProFormDigit,
    ProFormSelect,
} from "@ant-design/pro-form";
import { PercentageOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { useAppDispatch, useAppSelector } from "src/store";
import { updateCart } from "@features/Cart/CartActions";

interface TipModalProps {
    data?: any;
}

const TipModal: React.FC<TipModalProps> = ({ data: cartItem }) => {
    const [form] = ProForm.useForm();
    const formRef = useRef<any>();
    const dispatch = useAppDispatch();


    console.log('ooooh', cartItem);

    const { user } = useAppSelector((state) => state.auth);

    const tipOptions = [
        { value: "amount", label: "Amount" },
        { value: "percentage", label: "Percentage" },
    ];

    return (
        <ModalForm
            initialValues={cartItem}
            form={form}
            formRef={formRef}
            width={520}
            title={
                <Space>
                    <PercentageOutlined />
                    {"Offer Tip"}
                </Space>
            }
            trigger={
                user?.role === "admin" && (
                    <Button type="default" icon={<PercentageOutlined />} block>
                        Offer Tip
                    </Button>
                )
            }
            autoFocusFirstInput
            modalProps={{
                destroyOnClose: true,
                centered: true,
            }}
            onFinish={async (values) => {
                // console.log("discount", cartItem?._id);
                const confirmed = await ShowConfirm({
                    title: "You are about to give a tip , please confirm?",
                    position: true,
                });
                if (confirmed) {
                    dispatch(
                        updateCart({ cart: cartItem, data: values })
                    );
                    return true;
                }
            }}
            submitter={{
                searchConfig: {
                    resetText: "Cancel",
                    submitText: "Give Tip",
                },
            }}
        >
            <ProForm.Group>
                <ProFormSelect
                    name="tip_type"
                    label="Tip Type"
                    options={tipOptions}
                    width={"sm"}
                    rules={[{ required: true, message: "Please select a Tip type" }]}
                />
                <ProFormDigit
                    name="tip_amount"
                    label="Tip value"
                    width={"sm"}
                    rules={[
                        { required: true, message: "Please enter the tip value" },
                    ]}
                />
            </ProForm.Group>
        </ModalForm>
    );
};

export default TipModal;
