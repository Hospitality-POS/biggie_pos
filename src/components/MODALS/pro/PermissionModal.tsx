import React, { useEffect, useState } from "react";
import { Button, Form, Space } from "antd";
import { ModalForm, ProFormText, ProForm, ProFormSelect } from "@ant-design/pro-form";
import { LockOutlined, EditOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { createPermission, updatePermission } from "@services/permission";

interface AddPermissionModalProps {
    actionRef: any;
    edit?: boolean;
    data?: any;
}

const AddProPermissioModal: React.FC<
    AddPermissionModalProps
> = ({ actionRef, edit, data }) => {
    const [form] = Form.useForm();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (open && data) {
            form.setFieldsValue({
                ...data,
            });
        }
    }, [open, data, form]);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            form.resetFields();
        }
    };

    return (
        <ModalForm
            width={500}
            open={open}
            onOpenChange={handleOpenChange}
            title={
                <Space>
                    <LockOutlined />
                    Add New Permission
                </Space>
            }
            initialValues={edit ? { ...data } : {}}
            trigger={
                edit ? (
                    <Button
                        key="button"
                        size="small"
                        icon={
                            <EditOutlined
                                style={{ color: "#6c1c2c" }}
                                onClick={() => form.setFieldsValue(data)}
                            />
                        }
                    >Edit</Button>
                ) : (
                    <Button type="primary" key="button" icon={<LockOutlined />}>
                        New Permission
                    </Button>
                )
            }
            form={form}
            autoFocusFirstInput
            modalProps={{
                destroyOnClose: true,
                centered: true,
            }}
            onFinish={async (values) => {
                const confirmed = await ShowConfirm({
                    title: `Are you sure you want to ${edit ? "update this" : "add new"
                        } permission?`,
                    position: true,
                });
                if (confirmed) {
                    edit
                        ? await updatePermission({ values, _id: data._id })
                        : await createPermission(values);
                    actionRef.current.reset();
                    return true;
                }
            }}
            submitter={{
                searchConfig: {
                    resetText: "Cancel",
                    submitText: edit ? "Edit Permission" : "Add Permission",
                },
                submitButtonProps: {
                    icon: edit ? <EditOutlined /> : <LockOutlined />,
                },
                resetButtonProps: {
                    style: { display: "none" },
                },
            }}
        >
            <ProForm.Group>
                <ProFormText
                    hasFeedback
                    width="lg"
                    name="name"
                    label="Permission Name"
                    rules={[{ required: true, message: "Name is required" }]}
                    placeholder="Enter permission name"
                />
            </ProForm.Group>

            <ProForm.Group>
                <ProFormText
                    hasFeedback
                    width="lg"
                    name="group_name"
                    label="Group Name"
                    rules={[{ required: true, message: "Group Name is required" }]}
                    placeholder="Enter Group name"
                />
            </ProForm.Group>

            <ProForm.Group>
                <ProFormText
                    hasFeedback
                    width="lg"
                    name="route_url"
                    label="Route Url"
                    rules={[{ required: true, message: "Route Url is required" }]}
                    placeholder="Enter Route Url name"
                />
            </ProForm.Group>

            <ProForm.Group>
                <ProFormSelect
                    hasFeedback
                    width="lg"
                    name="method"
                    label="Function"
                    rules={[{ required: true, message: "Function is required" }]}
                    placeholder="Select Function Type"
                    options={[
                        { label: 'Fetching', value: 'GET' },
                        { label: 'Creating', value: 'POST' },
                        { label: 'Updating/Edit', value: 'PUT' },
                        { label: 'Remove/Delete', value: 'DELETE' },
                    ]}
                />
            </ProForm.Group>
        </ModalForm>
    );
};

export default AddProPermissioModal;
