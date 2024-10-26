import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
} from "@ant-design/pro-components";
import { Button, Form, message } from "antd";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRole, updateRole } from "@services/Roles";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";

const RoleModal: React.FC<{ edit?: boolean; data?: any; actionRef?: any }> = ({
  edit,
  data,
  actionRef,
}) => {
  const queryClient = useQueryClient();
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

  // Handle open and close events
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };

  // Define mutation for creating or updating a role
  const roleMutation = useMutation(edit ? updateRole : createRole, {
    onSuccess: () => {
      setOpen(false);
      actionRef?.current?.reload();
      queryClient.invalidateQueries("roles");
    },
    onError: () =>
      //   message.error(edit ? "Failed to update role" : "Failed to create role"),
      setOpen(false),
  });

  // Submit handler
  const handleSubmit = async (values) => {
    try {
      const confirmed = await ShowConfirm({
        title: `Are you sure you want to ${
          edit ? "update this" : "add new"
        } role?`,
        position: true,
      });

      if (confirmed) {
        edit
          ? await roleMutation.mutateAsync({ ...values, _id: data._id })
          : await roleMutation.mutateAsync(values);
        setOpen(false);
        actionRef?.current?.reload();
        return true;
      }
    } catch (error) {
      console.error("Error saving role:", error);
      return false;
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={handleOpenChange}
      initialValues={edit ? data : {}}
      title={edit ? "Edit Role" : "Create New Role"}
      trigger={
        edit ? (
          <Button
            key="button"
            icon={<EditOutlined style={{ color: "#6c1c2c" }} />}
            size="small"
          >
            Edit
          </Button>
        ) : (
          <Button
            key="button"
            icon={<PlusOutlined />}
            type="primary"
          >
            New Role
          </Button>
        )
      }
      modalProps={{
        destroyOnClose: true,
        centered: true,
        onCancel: () => {
          message.info(edit ? "Edit cancelled" : "Creation cancelled");
        },
      }}
      onFinish={handleSubmit}
      width={550}
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: edit ? "Update Role" : "Create Role",
        },
        submitButtonProps: {
          icon: edit ? <EditOutlined /> : <PlusOutlined />,
        },
        resetButtonProps: {
          style: { display: "none" },
        },
      }}
    >
      <ProFormText
        name="role_type"
        label="Role Type"
        placeholder="Enter role type"
        rules={[{ required: true, message: "Role type is required" }]}
      />
    </ModalForm>
  );
};

export default RoleModal;
