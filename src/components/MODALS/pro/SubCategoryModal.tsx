import React, { useRef } from "react";
import { Button, Form, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { AimOutlined, EditOutlined, SubnodeOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { ProFormSelect } from "@ant-design/pro-components";
import { addNewSubCategory, editSubCategory, fetchMainCategories } from "@services/categories";

interface SubCategoryModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}

const SubCategoryModal: React.FC<SubCategoryModalProps> = ({
  actionRef,
  edit,
  data,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef();

  return (
    <ModalForm
      title={
        <Space>
          <SubnodeOutlined />
          {edit ? "Edit subcategory" : "Add New subcategory"}
        </Space>
      }
      initialValues={
        edit
          ? {
              ...data,
              main_category: {
                value: data?.main_category?._id,
                lable: data?.main_category?.name,
              },
            }
          : {}
      }
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
          <Button key="button" icon={<SubnodeOutlined />}>
            New
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
          } SubCategory?`,
        });
        if (confirmed) {
          edit
            ? await editSubCategory({ values, _id: data?._id })
            : await addNewSubCategory(values);
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
          submitText: edit ? "Edit Subcategory" : "Add Subcategory",
        },
      }}
    >
      <ProForm.Group>
        <ProFormText
          width="md"
          name="name"
          label="Create New Subcategory"
          rules={[{ required: true, message: "Subcategory is required" }]}
          placeholder="Enter Subcategory name"
        />
        <ProFormSelect
          hasFeedback
          width="md"
          name="main_category"
          label="Main Category"
          rules={[{ required: true, message: "Main Category is required" }]}
          showSearch
          placeholder="Select Main Category"
          request={async () => {
            const data = await fetchMainCategories();
            const values = data.map((e: { name: any; _id: any }) => {
              return { label: e.name, value: e._id };
            });
            return values;
          }}
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default SubCategoryModal;
