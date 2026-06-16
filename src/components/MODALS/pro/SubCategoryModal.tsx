import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Select, Space, Divider } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { EditOutlined, PlusOutlined, SubnodeOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import {
  addNewSubCategory,
  editSubCategory,
  fetchMainCategories,
} from "@services/categories";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MainCategoryModal from "./MainCategoryModal";

interface SubCategoryModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

const SubCategoryModal: React.FC<SubCategoryModalProps> = ({
  actionRef,
  edit,
  data,
  externalOpen,
  onExternalClose,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef<any>();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [addMainCategoryOpen, setAddMainCategoryOpen] = useState(false);

  // ── Persist field values across child modal open/close cycles ─────────────
  const savedValuesRef = useRef<Record<string, any>>({});

  // Sync external open state
  useEffect(() => {
    if (externalOpen !== undefined) setOpen(externalOpen);
  }, [externalOpen]);

  useEffect(() => {
    if (open && data) {
      const values = {
        name: data.name,
        main_category: data?.main_category?._id || data?.main_category,
      };
      form.setFieldsValue(values);
      savedValuesRef.current = values;
    }
  }, [open, data, form]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
      savedValuesRef.current = {};
      onExternalClose?.();
    }
  };

  // ── Live query ─────────────────────────────────────────────────────────────
  const { data: mainCategories } = useQuery({
    queryKey: ["mainCategories"],
    queryFn: fetchMainCategories,
    enabled: open,
    retry: 3,
    networkMode: "always",
    staleTime: 0,
  });

  const mainCategoryOptions = (mainCategories || []).map(
    (e: { name: string; _id: string }) => ({ label: e.name, value: e._id })
  );

  const handleMainCategoryAdded = () => {
    savedValuesRef.current = form.getFieldsValue();
    queryClient.invalidateQueries({ queryKey: ["mainCategories"] });
  };

  const handleMainCategoryModalClose = () => {
    setAddMainCategoryOpen(false);
    handleMainCategoryAdded();
    // Restore whatever the user had typed/selected before the child modal opened
    setTimeout(() => {
      form.setFieldsValue(savedValuesRef.current);
    }, 0);
  };

  return (
    <>
      <ModalForm
        open={open}
        onOpenChange={handleOpenChange}
        title={
          <Space>
            <SubnodeOutlined />
            {edit ? "Edit Subcategory" : "Add New Subcategory"}
          </Space>
        }
        initialValues={
          edit
            ? { name: data?.name, main_category: data?.main_category?._id || data?.main_category }
            : {}
        }
        trigger={
          externalOpen !== undefined ? undefined : edit ? (
            <Button
              key="button"
              size="small"
              icon={<EditOutlined style={{ color: "#6c1c2c" }} />}
              onClick={() => form.setFieldsValue(data)}
            >
              Edit
            </Button>
          ) : (
            <Button type="primary" key="button" icon={<SubnodeOutlined />}>
              New Sub-category
            </Button>
          )
        }
        autoFocusFirstInput
        modalProps={{
          // destroyOnClose: false — same reason as AddProCategoryModal.
          // If true, form fields are wiped when MainCategoryModal opens on top.
          destroyOnClose: false,
          centered: true,
        }}
        onFinish={async (values) => {
          const confirmed = await ShowConfirm({
            title: `Are you sure you want to ${edit ? "update this" : "add new"} SubCategory?`,
            position: true,
          });
          if (confirmed) {
            edit
              ? await editSubCategory({ values, _id: data?._id })
              : await addNewSubCategory(values);
            actionRef?.current?.reset?.();
            setOpen(false);
            onExternalClose?.();
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
            label="Subcategory Name"
            rules={[{ required: true, message: "Subcategory name is required" }]}
            placeholder="Enter subcategory name"
            fieldProps={{
              onChange: () => {
                savedValuesRef.current = {
                  ...savedValuesRef.current,
                  name: form.getFieldValue("name"),
                };
              },
            }}
          />

          <Form.Item
            name="main_category"
            label="Main Category"
            rules={[{ required: true, message: "Main Category is required" }]}
            style={{ width: 328 }}
          >
            <Select
              showSearch
              placeholder="Select Main Category"
              optionFilterProp="label"
              options={mainCategoryOptions}
              onChange={(v) => {
                savedValuesRef.current = { ...savedValuesRef.current, main_category: v };
              }}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "4px 0" }} />
                  <Button
                    type="link"
                    icon={<PlusOutlined />}
                    style={{ width: "100%", textAlign: "left", padding: "4px 8px" }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      // Snapshot before child modal opens
                      savedValuesRef.current = form.getFieldsValue();
                      setAddMainCategoryOpen(true);
                    }}
                  >
                    Add New Main Category
                  </Button>
                </>
              )}
            />
          </Form.Item>
        </ProForm.Group>
      </ModalForm>

      <MainCategoryModal
        actionRef={{ current: { reload: handleMainCategoryAdded, reset: handleMainCategoryAdded } }}
        externalOpen={addMainCategoryOpen}
        onExternalClose={handleMainCategoryModalClose}
      />
    </>
  );
};

export default SubCategoryModal;