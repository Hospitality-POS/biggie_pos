import React, { useEffect, useState } from "react";
import { Form, Input, Modal, Select, Space } from "antd";
import { AimOutlined, AppstoreAddOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addNewTable,
  addNewTableLocation,
  getTableLocation,
} from "@services/tables";

const NEW_LOCATION = "__new_location__";

interface QuickAddTableModalProps {
  open: boolean;
  onClose: () => void;
  /** "table" — pick/create a location + table name. "location" — name only. */
  mode?: "table" | "location";
  /** When set (table mode), the location field is hidden and the table is
   *  created directly under this location — asks for a name only. */
  fixedLocationId?: string;
  fixedLocationName?: string;
  /** Preselect a location (e.g. the currently active tab). */
  defaultLocationId?: string | null;
  /** Called with the location id after a table/location is created. */
  onCreated?: (locationId: string) => void;
}

interface LocationOption {
  _id: string;
  name: string;
  isDisabled?: boolean;
}

const QuickAddTableModal: React.FC<QuickAddTableModalProps> = ({
  open,
  onClose,
  mode = "table",
  fixedLocationId,
  fixedLocationName,
  defaultLocationId,
  onCreated,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const watchLocation = Form.useWatch("location", form);

  const isLocationMode = mode === "location";
  const hasFixedLocation = !isLocationMode && !!fixedLocationId;

  const { data: locations, isLoading: locationsLoading } = useQuery<LocationOption[]>({
    queryKey: ["table-locations"],
    queryFn: () => getTableLocation({}),
    enabled: open,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (open && !isLocationMode && !hasFixedLocation) {
      form.setFieldsValue({ location: defaultLocationId || NEW_LOCATION });
    }
  }, [open, defaultLocationId, form, isLocationMode, hasFixedLocation]);

  const activeLocations = (locations || []).filter((l) => !l.isDisabled);
  const locationOptions = [
    ...activeLocations.map((l) => ({ label: l.name, value: l._id })),
    { label: "+ New location", value: NEW_LOCATION },
  ];

  const handleOk = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      let locationId: string | undefined;

      if (isLocationMode) {
        const name = String(values.locationName || "").trim();
        // Reuse an existing location when the typed name already exists
        const existing = activeLocations.find(
          (l) => l.name?.trim().toLowerCase() === name.toLowerCase()
        );
        locationId = existing?._id ?? (await addNewTableLocation({ name }))?._id;
      } else {
        locationId = hasFixedLocation ? fixedLocationId : values.location;

        if (locationId === NEW_LOCATION) {
          const name = String(values.newLocationName || "").trim();
          const existing = activeLocations.find(
            (l) => l.name?.trim().toLowerCase() === name.toLowerCase()
          );
          locationId = existing?._id ?? (await addNewTableLocation({ name }))?._id;
        }

        if (!locationId) return;

        await addNewTable({
          name: String(values.tableName || "").trim(),
          locatedAt: locationId,
        });
      }

      if (!locationId) return;

      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["table-locations"] });
      onCreated?.(locationId);
      form.resetFields();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      centered
      destroyOnClose
      width={420}
      okText={isLocationMode ? "Add Location" : "Add Table"}
      title={
        <Space>
          {isLocationMode ? <AimOutlined /> : <AppstoreAddOutlined />}
          {isLocationMode
            ? "Add Location"
            : hasFixedLocation
            ? `Add Table — ${fixedLocationName || ""}`
            : "Add Table"}
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark={false} preserve={false}>
        {isLocationMode ? (
          <Form.Item
            name="locationName"
            label="Location name"
            rules={[{ required: true, message: "Location name is required" }]}
          >
            <Input placeholder="e.g. Terrace, VIP Lounge" autoFocus />
          </Form.Item>
        ) : (
          <>
            {!hasFixedLocation && (
              <Form.Item
                name="location"
                label="Location"
                rules={[{ required: true, message: "Location is required" }]}
              >
                <Select
                  showSearch
                  loading={locationsLoading}
                  placeholder="Select a location"
                  options={locationOptions}
                  optionFilterProp="label"
                />
              </Form.Item>
            )}

            {!hasFixedLocation && watchLocation === NEW_LOCATION && (
              <Form.Item
                name="newLocationName"
                label={
                  <Space size={4}>
                    <AimOutlined />
                    New location name
                  </Space>
                }
                rules={[{ required: true, message: "Location name is required" }]}
              >
                <Input placeholder="e.g. Terrace, VIP Lounge" autoFocus />
              </Form.Item>
            )}

            <Form.Item
              name="tableName"
              label="Table name"
              rules={[{ required: true, message: "Table name is required" }]}
            >
              <Input placeholder="e.g. Table 12" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default QuickAddTableModal;
