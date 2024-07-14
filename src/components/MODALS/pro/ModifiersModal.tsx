import React, { useRef } from "react";
import { Button, Form, FormInstance, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { EditOutlined, PushpinOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { createModifierAddon, editModifierAddon } from "@services/modifierAddons";

interface ModifiersModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}
interface ModifiersType {
  name: string;
  _id: string;
}

const ModifiersModal: React.FC<ModifiersModalProps> = ({
  actionRef,
  edit,
  data,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef<FormInstance>();

  const editModifiersPayload = {
    ...data,
  };

  const HandleOnModifiersFinish = async (values: Partial<ModifiersType>) => {
    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${
        edit ? "update this" : "add new"
      } modifiers?`,
    });
    if (confirmed) {
      edit
        ? await editModifierAddon({ values, _id: data?._id })
        : await createModifierAddon(values);
      actionRef.current.reset();
      return true;
    }
  };
  return (
    <ModalForm
      width={550}
      layout="horizontal"
      title={
        <Space>
          <PushpinOutlined />
          {edit ? "Edit Modifiers" : "Add New Modifiers"}
        </Space>
      }
      initialValues={edit ? editModifiersPayload : {}}
      trigger={
        edit ? (
          <Button
            type="link"
            key="button"
            icon={
              <EditOutlined
                style={{ color: "#6c1c2c" }}
                onClick={() => form.setFieldsValue(editModifiersPayload)}
              />
            }
          ></Button>
        ) : (
          <Button key="button" icon={<PushpinOutlined />}>
            Add New Modifiers
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      onFinish={HandleOnModifiersFinish}
      onOpenChange={(visible) => !visible}
      form={form}
      formRef={formRef}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Edit Modifiers" : "Add Modifiers",
        },
      }}
    >
      <ProForm.Group>
        <ProFormText
          width="md"
          name="name"
          label="Create New Modifiers"
          rules={[{ required: true, message: "Modifiers Name is required" }]}
          placeholder="Enter Modifiers Name"
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default ModifiersModal;
