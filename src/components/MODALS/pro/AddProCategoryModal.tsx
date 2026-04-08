import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Select, Space, Divider } from "antd";
import {
  ModalForm,
  ProFormText,
  ProForm,
} from "@ant-design/pro-form";
import { addNewCategory, fetchSubCategories, updateCategory } from "@services/categories";
import { ApartmentOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "src/store";
import SubCategoryModal from "./SubCategoryModal";

interface AddCategoryDialogProps {
  actionRef: any;
  edit?: boolean;
  data?: {
    _id: string;
    name: string;
    subcategory_id: string;
    sub_category: { name: string; _id: string };
  };
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

const AddProCategoryModal: React.FC<AddCategoryDialogProps> = ({
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
  const [addSubCategoryOpen, setAddSubCategoryOpen] = useState(false);

  // ── Persist field values across child modal open/close cycles ─────────────
  // destroyOnClose on ModalForm wipes the DOM — we save values in a ref and
  // restore them after the child modal closes so nothing is lost.
  const savedValuesRef = useRef<Record<string, any>>({});

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  // Sync external open state
  useEffect(() => {
    if (externalOpen !== undefined) setOpen(externalOpen);
  }, [externalOpen]);

  useEffect(() => {
    if (open && data) {
      const values = { name: data.name, subcategory_id: data.sub_category?._id };
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
  // enabled:open so it only fetches while the modal is visible.
  // The query is kept alive (not destroyed) even when addSubCategoryOpen is true
  // because the parent modal stays mounted — we removed destroyOnClose below.
  const { data: subCategories } = useQuery({
    queryKey: ["subCategories"],
    queryFn: fetchSubCategories,
    enabled: open,
    retry: 3,
    networkMode: "always",
    staleTime: 0, // always re-fetch when invalidated
  });

  const subCategoryOptions = (subCategories || []).map(
    (e: { name: string; _id: string }) => ({ label: e.name, value: e._id })
  );

  const handleSubCategoryAdded = () => {
    // Save current field values before anything can change them
    savedValuesRef.current = form.getFieldsValue();
    // Invalidate so the Select re-renders with the new subcategory immediately
    queryClient.invalidateQueries({ queryKey: ["subCategories"] });
  };

  const handleSubCategoryModalClose = () => {
    setAddSubCategoryOpen(false);
    handleSubCategoryAdded();
    // Restore whatever the user had typed/selected before opening the child modal
    setTimeout(() => {
      form.setFieldsValue(savedValuesRef.current);
    }, 0);
  };

  return (
    <>
      <ModalForm
        form={form}
        open={open}
        onOpenChange={handleOpenChange}
        formRef={formRef}
        title={
          <Space>
            <ApartmentOutlined />
            {edit ? "Edit Category" : "Add New Category"}
          </Space>
        }
        initialValues={edit ? { name: data?.name, subcategory_id: data?.sub_category?._id } : {}}
        trigger={
          externalOpen !== undefined ? undefined : edit ? (
            <Button
              disabled={!isAdmin}
              size="small"
              key="button"
              icon={<EditOutlined style={{ color: "#914F1E" }} />}
              onClick={() => form.setFieldsValue(data)}
            >
              Edit
            </Button>
          ) : (
            <Button type="primary" disabled={!isAdmin} key="button" icon={<ApartmentOutlined />}>
              New Category
            </Button>
          )
        }
        autoFocusFirstInput
        modalProps={{
          // destroyOnClose is intentionally FALSE here.
          // If true, the ModalForm DOM (and form field values) gets destroyed
          // when SubCategoryModal opens on top — the user's selections are lost.
          // We handle reset manually in handleOpenChange instead.
          destroyOnClose: false,
          centered: true,
        }}
        onFinish={async (values) => {
          const confirmed = await ShowConfirm({
            title: `Are you sure you want to ${edit ? "update this" : "add new"} Category?`,
            position: true,
          });
          if (confirmed) {
            data
              ? await updateCategory({ ...values, _id: data?._id })
              : await addNewCategory(values);
            actionRef?.current?.reload?.();
            setOpen(false);
            onExternalClose?.();
            return true;
          }
        }}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: edit ? "Edit Category" : "Add Category",
          },
        }}
      >
        <ProForm.Group>
          <ProFormText
            hasFeedback
            width="md"
            name="name"
            label="Category Name"
            rules={[{ required: true, message: "Name is required" }]}
            placeholder="Enter category name"
            fieldProps={{
              onChange: () => {
                // Keep savedValuesRef in sync as the user types
                savedValuesRef.current = {
                  ...savedValuesRef.current,
                  name: form.getFieldValue("name"),
                };
              },
            }}
          />

          {/*
           * Plain Form.Item + Select.
           * - ProFormSelect with request= has its own internal cache that ignores
           *   React Query invalidations → newly added items don't appear until refresh.
           * - options= reads live from the React Query cache → instant updates.
           */}
          <Form.Item
            name="subcategory_id"
            label="Subcategory"
            rules={[{ required: true, message: "Subcategory is required" }]}
            style={{ width: 328 }}
          >
            <Select
              showSearch
              placeholder="Select subcategory"
              optionFilterProp="label"
              options={subCategoryOptions}
              onChange={(v) => {
                savedValuesRef.current = { ...savedValuesRef.current, subcategory_id: v };
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
                      // Snapshot current values before child modal opens
                      savedValuesRef.current = form.getFieldsValue();
                      setAddSubCategoryOpen(true);
                    }}
                  >
                    Add New Subcategory
                  </Button>
                </>
              )}
            />
          </Form.Item>
        </ProForm.Group>
      </ModalForm>

      {/*
       * SubCategoryModal is rendered OUTSIDE the ModalForm fragment so it is
       * never destroyed when the parent modal re-renders or loses visibility.
       */}
      <SubCategoryModal
        actionRef={{ current: { reload: handleSubCategoryAdded, reset: handleSubCategoryAdded } }}
        externalOpen={addSubCategoryOpen}
        onExternalClose={handleSubCategoryModalClose}
      />
    </>
  );
};

export default AddProCategoryModal;