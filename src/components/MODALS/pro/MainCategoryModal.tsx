import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { CrownOutlined, EditOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewMainCategory, editMainCategory } from "@services/categories";

interface MainCategoryModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}

const MainCategoryModal: React.FC<MainCategoryModalProps> = ({
  actionRef,
  edit,
  data,
}) => {
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

  return (
    <ModalForm
      open={open}
      onOpenChange={handleOpenChange}
      width={550}
      layout="horizontal"
      title={
        <Space>
          <CrownOutlined />
          {edit ? "Edit Main Category" : "Add New Main Category"}
        </Space>
      }
      initialValues={edit ? { ...data } : {}}
      trigger={
        edit ? (
          <Button
        
            key="button"
            icon={
              <EditOutlined
                style={{ color: "#6c1c2c" }}
                onClick={() => form.setFieldsValue(data)}
              />
            }
          >Edit</Button>
        ) : (
          <Button type="primary" key="button" icon={<CrownOutlined />}>
            New Main Category
          </Button>
        )
      }
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      onFinish={async (values) => {
        const confirmed = await ShowConfirm({
          title: `Are you sure you want to ${
            edit ? "update this" : "add new"
          } main category?`,
        });
        if (confirmed) {
          edit
            ? await editMainCategory({ values, _id: data?._id })
            : await addNewMainCategory(values);
          actionRef.current.reset();
          return true;
        }
      }}
      form={form}
      formRef={formRef}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Edit Main Category" : "Add Main Category",
        },
      }}
    >
      <ProForm.Group>
        <ProFormText
          width="md"
          name="name"
          label="Create New Main Category"
          rules={[
            { required: true, message: "Main Category Name is required" },
          ]}
          placeholder="Enter Main Category Name"
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default MainCategoryModal;
