import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { EditOutlined, SubnodeOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { ProFormSelect } from "@ant-design/pro-components";
import {
  addNewSubCategory,
  editSubCategory,
  fetchMainCategories,
} from "@services/categories";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "src/store";

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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
        main_category: {
          value: data?.main_category?._id,
          lable: data?.main_category?.name,
        },
      });
    }
  }, [open, data, form]);


  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };

  const { data: mainCategories } = useQuery({
    queryKey: ["mainCategories"],
    queryFn: fetchMainCategories,
    retry: 3,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const MainCategoriesRequest = async () => {
    const data = mainCategories?.map((e: { name: string; _id: string }) => {
      return { label: e.name, value: e._id };
    });
    return data;
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={handleOpenChange}
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
            disabled={!isAdmin}
            key="button"
            size="small"
            icon={
              <EditOutlined
                style={{ color: "#6c1c2c" }}
                onClick={() => form.setFieldsValue(data)}
              />
            }
          >
            Edit
          </Button>
        ) : (
          <Button type="primary" disabled={!isAdmin} key="button" icon={<SubnodeOutlined />}>
            New Sub-category
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
          title: `Are you sure you want to ${edit ? "update this" : "add new"
            } SubCategory?`,
          position: true,
        });
        if (confirmed) {
          edit
            ? await editSubCategory({ values, _id: data?._id })
            : await addNewSubCategory(values);
          actionRef.current.reset();
          return true;
        }
      }}
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
          request={MainCategoriesRequest}
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default SubCategoryModal;
