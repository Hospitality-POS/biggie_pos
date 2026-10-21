import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Space } from "antd";
import { ModalForm, ProFormText, ProFormSelect, ProForm } from "@ant-design/pro-form";
import { AimOutlined, EditOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewTableLocation, editLocation } from "@services/tables";
import { fetchShop, updateShop } from "@services/shops";
import { fetchMainCategories } from "@services/categories";

interface AddProTableLocationModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}

type ZoneRestriction = { main_category: string; locations: string[] };

const AddProTableLocationModal: React.FC<AddProTableLocationModalProps> = ({
  actionRef,
  edit,
  data,
}) => {
  const [form] = Form.useForm();
  const formRef = useRef();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const shopId = localStorage.getItem("shopId");

  const { data: shopData } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
  });
  const zoneRestrictionEnabled = !!shopData?.category_zone_restriction_enabled;

  const { data: mainCategories = [] } = useQuery({
    queryKey: ["Maincategories"],
    queryFn: fetchMainCategories,
    enabled: zoneRestrictionEnabled,
  });

  const restrictions: ZoneRestriction[] = (shopData?.category_zone_restrictions ?? []).map((r: any) => ({
    main_category: String(r.main_category),
    locations: (r.locations ?? []).map(String),
  }));

  const categoriesForLocation = (locationId?: string) =>
    locationId
      ? restrictions.filter((r) => r.locations.includes(locationId)).map((r) => r.main_category)
      : [];

  // Selecting a main category for a zone adds the zone to that category's
  // "sell only in" list; deselecting removes it. The backend drops a
  // category once its list is empty, which makes it sellable everywhere.
  const saveLocationCategories = async (locationId: string, categoryIds: string[]) => {
    const current = categoriesForLocation(locationId);
    const unchanged =
      current.length === categoryIds.length && current.every((id) => categoryIds.includes(id));
    if (unchanged) return;

    const selected = new Set(categoryIds);
    const updated = restrictions.map((r) => {
      const others = r.locations.filter((l) => l !== locationId);
      return { ...r, locations: selected.has(r.main_category) ? [...others, locationId] : others };
    });
    for (const id of categoryIds) {
      if (!updated.some((r) => r.main_category === id)) {
        updated.push({ main_category: id, locations: [locationId] });
      }
    }
    await updateShop({ _id: shopId, category_zone_restrictions: updated });
    queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
  };

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        name: data.name,
        subcategory_id: data.sub_category?._id,
        main_categories: categoriesForLocation(data._id),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data, form, shopData]);

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
      title={
        <Space>
          <AimOutlined />
          {edit ? "Edit Location" : "Add New Location"}
        </Space>
      }
      initialValues={edit ? { ...data } : {}}
      trigger={
        edit ? (
          <Button
            size="small"
            key="button"
            icon={
              <EditOutlined
                style={{ color: "var(--primary-color)" }}
                onClick={() => form.setFieldsValue(data)}
              />
            }
          >
            Edit
          </Button>
        ) : (
          <Button type="primary" key="button" icon={<AimOutlined />}>
            New Location
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
          } Location?`,
          position: true,
        });
        if (confirmed) {
          const saved = edit
            ? await editLocation({ values, _id: data?._id })
            : await addNewTableLocation(values);
          if (zoneRestrictionEnabled) {
            const locationId = edit ? data?._id : saved?._id;
            if (locationId) await saveLocationCategories(String(locationId), values.main_categories ?? []);
          }
          actionRef.current.reset();
          return true;
        }
      }}
      form={form}
      formRef={formRef}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Edit Location" : "Add Location",
        },
        submitButtonProps: {
          icon: edit ? <EditOutlined /> : <AimOutlined />,
        },
        resetButtonProps: {
          style: { display: "none" },
        },
      }}
    >
      <ProFormText
        name="name"
        label="Create New Location"
        rules={[{ required: true, message: "Name is required" }]}
        placeholder="Enter Location name"
      />
      {zoneRestrictionEnabled && (
        <ProFormSelect
          name="main_categories"
          label="Main categories sold here"
          tooltip="This zone will only sell items from the selected main categories, and those categories can only be sold in the zones they are assigned to. Leave empty to let this zone sell any category that isn't assigned elsewhere."
          placeholder="Search and select main categories"
          options={(mainCategories as { name: string; _id: string }[]).map((c) => ({
            label: c.name,
            value: c._id,
          }))}
          fieldProps={{
            mode: "multiple",
            allowClear: true,
            showSearch: true,
            optionFilterProp: "label",
            maxTagCount: "responsive",
          }}
        />
      )}
    </ModalForm>
  );
};

export default AddProTableLocationModal;
