import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
} from "@ant-design/pro-components";
import { Button, Form, message, Checkbox, Space, Divider, Card, Tag, Tooltip } from "antd";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRole, updateRole } from "@services/Roles";
import { EditOutlined, PlusOutlined, InfoCircleOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";

// Define available permissions - replace with your actual permissions
const PERMISSIONS = {
  Users: [
    { id: 'view_users', name: 'View Users', description: 'Can view user list and details' },
    { id: 'create_users', name: 'Create Users', description: 'Can create new users' },
    { id: 'edit_users', name: 'Edit Users', description: 'Can modify existing users' },
    { id: 'delete_users', name: 'Delete Users', description: 'Can remove users from the system' },
  ],
  Roles: [
    { id: 'view_roles', name: 'View Roles', description: 'Can view role list and details' },
    { id: 'create_roles', name: 'Create Roles', description: 'Can create new roles' },
    { id: 'edit_roles', name: 'Edit Roles', description: 'Can modify existing roles' },
    { id: 'delete_roles', name: 'Delete Roles', description: 'Can delete roles' },
  ],
  Settings: [
    { id: 'view_settings', name: 'View Settings', description: 'Can view system settings' },
    { id: 'modify_settings', name: 'Modify Settings', description: 'Can modify system settings' },
  ],
};

const RoleModal: React.FC<{ edit?: boolean; data?: any; actionRef?: any }> = ({
  edit,
  data,
  actionRef,
}) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const formRef = useRef();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
      });
      setSelectedPermissions(data.permissions || []);
    }
  }, [open, data, form]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
      setSelectedPermissions([]);
    }
  };

  const roleMutation = useMutation(edit ? updateRole : createRole, {
    onSuccess: () => {
      setOpen(false);
      actionRef?.current?.reload();
      queryClient.invalidateQueries("roles");
    },
    onError: () => {
      setOpen(false);
    },
  });

  const handleSubmit = async (values) => {
    try {
      const confirmed = await ShowConfirm({
        title: `Are you sure you want to ${edit ? "update this" : "add new"
          } role?`,
        position: true,
      });

      if (confirmed) {
        const roleData = {
          ...values,
          permissions: selectedPermissions,
        };

        edit
          ? await roleMutation.mutateAsync({ ...roleData, _id: data._id })
          : await roleMutation.mutateAsync(roleData);
        setOpen(false);
        actionRef?.current?.reload();
        return true;
      }
    } catch (error) {
      console.error("Error saving role:", error);
      return false;
    }
  };

  const handleCategoryCheckAll = (category: string, checked: boolean) => {
    const categoryPermissions = PERMISSIONS[category].map(p => p.id);
    setSelectedPermissions(prev => {
      const otherPermissions = prev.filter(p => !categoryPermissions.includes(p));
      return checked ? [...otherPermissions, ...categoryPermissions] : otherPermissions;
    });
  };

  const isCategoryCheckedAll = (category: string) => {
    return PERMISSIONS[category].every(p => selectedPermissions.includes(p.id));
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
        width: 800,
      }}
      onFinish={handleSubmit}
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

      <Divider>Permissions</Divider>

      <Space direction="vertical" className="w-full" size="large">
        {Object.entries(PERMISSIONS).map(([category, permissions]) => (
          <Card
            key={category}
            size="small"
            title={
              <Space>
                <Checkbox
                  checked={isCategoryCheckedAll(category)}
                  onChange={(e) => handleCategoryCheckAll(category, e.target.checked)}
                >
                  {category}
                </Checkbox>
                <Tag color="blue">{selectedPermissions.filter(p =>
                  permissions.map(cp => cp.id).includes(p)
                ).length} / {permissions.length}</Tag>
              </Space>
            }
          >
            <Space direction="vertical" className="w-full">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-center justify-between">
                  <Checkbox
                    checked={selectedPermissions.includes(permission.id)}
                    onChange={(e) => {
                      setSelectedPermissions(prev =>
                        e.target.checked
                          ? [...prev, permission.id]
                          : prev.filter(p => p !== permission.id)
                      );
                    }}
                  >
                    {permission.name}
                  </Checkbox>
                  <Tooltip title={permission.description}>
                    <InfoCircleOutlined className="text-gray-400" />
                  </Tooltip>
                </div>
              ))}
            </Space>
          </Card>
        ))}
      </Space>

      <Divider>Selected Permissions Preview</Divider>

      <Card size="small" className="bg-gray-50">
        <Space wrap>
          {selectedPermissions.map(permId => {
            const permission = Object.values(PERMISSIONS)
              .flat()
              .find(p => p.id === permId);
            return permission ? (
              <Tag key={permId} color="blue">
                {permission.name}
              </Tag>
            ) : null;
          })}
        </Space>
      </Card>
    </ModalForm>
  );
};

export default RoleModal;