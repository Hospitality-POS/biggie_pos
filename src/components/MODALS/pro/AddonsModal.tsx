import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { EditOutlined, TagsOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { createAddon, editAddon } from "@services/modifierAddons";

interface AddonsModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}

const AddonsModal: React.FC<AddonsModalProps> = ({ actionRef, edit, data }) => {
  const [form] = Form.useForm();
  const formRef = useRef();

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

  const editAddonsPayload = {
    ...data,
  };

  const HandleOnAddonsFinish = async (values: Partial<AddonsType>) => {
    let payload = { name: values?.name, modifier: data?._id };
    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${
        edit ? "update this" : "add new"
      } addons?`,
      position: true,
    });
    if (confirmed) {
      edit
        ? await editAddon({ values, _id: data?._id, name: data?.name })
        : await createAddon(payload);
      actionRef.current.reset();
      return true;
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={handleOpenChange}
      width={550}
      layout="horizontal"
      title={
        <Space>
          <TagsOutlined />
          {edit ? "Edit Addons" : "Add New Addons"}
        </Space>
      }
      initialValues={edit ? editAddonsPayload : {}}
      trigger={
        edit ? (
          <Button
            key="button"
            icon={
              <EditOutlined
                style={{ color: "#6c1c2c" }}
                onClick={() => form.setFieldsValue(editAddonsPayload)}
              />
            }
          >
            Edit
          </Button>
        ) : (
          <Button type="primary" key="button" icon={<TagsOutlined />}>
            Add New Addons
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      onFinish={HandleOnAddonsFinish}
      form={form}
      formRef={formRef}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Edit Addons" : "Add Addons",
        },
      }}
    >
      <ProForm.Group>
        <ProFormText
          width="md"
          name="name"
          label="Create New Addons"
          rules={[{ required: true, message: "Addons Name is required" }]}
          placeholder="Enter Addons Name"
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default AddonsModal;
