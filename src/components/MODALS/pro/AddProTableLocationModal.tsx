import React, { useRef } from "react";
import { Button, Form, Space } from "antd";
import { ModalForm, ProFormText, ProForm } from "@ant-design/pro-form";
import { AimOutlined, EditOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { addNewTableLocation, editLocation } from "@services/tables";

interface AddProTableLocationModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}

const AddProTableLocationModal: React.FC<AddProTableLocationModalProps> = ({
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
          <AimOutlined />
          {edit ? "Edit Location" : "Add New Location"}
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
          <Button key="button" icon={<AimOutlined />}>
            New
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
          } Location?`,
        });
        if (confirmed) {
          edit
            ? await editLocation({ values, _id: data?._id })
            : await addNewTableLocation(values);
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
          submitText: edit ? "Edit Location" : "Add Location",
        },
      }}
    >
      <ProForm.Group>
        <ProFormText
          width="md"
          name="name"
          label="Create New Location"
          rules={[{ required: true, message: "Name is required" }]}
          placeholder="Enter Location name"
        />
      </ProForm.Group>
    </ModalForm>
  );
};

export default AddProTableLocationModal;
