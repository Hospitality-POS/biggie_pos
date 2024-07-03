import React, { useRef } from "react";
import { Button, Form, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { CrownOutlined, EditOutlined, TagsOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewMainCategory, editMainCategory } from "@services/categories";

interface AddonsModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}

const AddonsModal: React.FC<AddonsModalProps> = ({
  actionRef,
  edit,
  data,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef();

  return (
    <ModalForm
      width={550}
      layout="horizontal"
      title={
        <Space>
          <TagsOutlined />
          {edit ? "Edit Addons" : "Add New Addons"}
        </Space>
      }
      initialValues={edit ? { ...data } : {}}
      trigger={
        edit ? (
          <Button
            type="link"
            key="button"
            icon={
              <EditOutlined
                style={{ color: "#6c1c2c" }}
                onClick={() => form.setFieldsValue(data)}
              />
            }
          ></Button>
        ) : (
          <Button key="button" icon={<TagsOutlined />}>
            Add New Addons
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        style: { display: "grid", placeContent: "center" },
      }}
      onFinish={async (values) => {
        const confirmed = await ShowConfirm({
          title: `Are you sure you want to ${
            edit ? "update this" : "add new"
          } addons?`,
        });
        if (confirmed) {
          edit
            ? await editMainCategory({ values, _id: data?._id })
            : await addNewMainCategory(values);
          actionRef.current.reset();
          return true;
        }
      }}
      onOpenChange={(visible) => !visible}
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
          placeholder="Enter Main Category Name"
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default AddonsModal;
