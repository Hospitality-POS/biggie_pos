import { ModalForm, ProFormText, StepsForm } from "@ant-design/pro-components";
import { Button, Checkbox, Space, Card, Tag, Tooltip, Form } from "antd";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createRole, updateRole } from "@services/Roles";
import { EditOutlined, PlusOutlined, InfoCircleOutlined, UserOutlined, SafetyCertificateOutlined, CheckCircleOutlined } from "@ant-design/icons";
import ShowConfirm from "@utils/ConfirmUtil";
import { fetchAllPermissions } from "@services/permission";

const RoleModal: React.FC<{ edit?: boolean; data?: any; actionRef?: any }> = ({
  edit,
  data,
  actionRef,
}) => {
  console.log('data', data);
  const [form] = Form.useForm();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [role_type, setRoleType] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && data) {
      setSelectedPermissions(data.permissions || []);
      setRoleType(data.role_type);
    }
  }, [open, data]);

  const groupPermissions = (permissions) => {
    return permissions.reduce((acc, permission) => {
      const { group_name, _id, name } = permission;
      if (!acc[group_name]) {
        acc[group_name] = [];
      }
      acc[group_name].push({ id: _id, name });
      return acc;
    }, {});
  };

  const { data: PERMISSIONS = {} } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const permissions = await fetchAllPermissions({ someParam: "value" });
      return groupPermissions(permissions);
    },
    retry: 1,
    refetchInterval: 5000,
    networkMode: "always",
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedPermissions([]);
    }
  };

  const handleFinish = async (values) => {

    const permissions = selectedPermissions.map(id => ({
      _id: id
    }));

    values.permissions = permissions;

    const confirmed = await ShowConfirm({
      title: `Are you sure you want to ${edit ? "update this" : "add new"} Role?`,
      position: true,
    });
    if (confirmed) {
      edit
        ? await updateRole({ values, _id: data?._id })
        : await createRole(values);
      actionRef.current.reload();
      setOpen(false);
      return true;
    }
  };

  const handleCategoryCheckAll = (category: string, checked: boolean) => {
    const categoryPermissions = PERMISSIONS[category]?.map(p => p.id) || [];
    setSelectedPermissions(prev => {
      const otherPermissions = prev.filter(p => !categoryPermissions.includes(p));
      return checked ? [...otherPermissions, ...categoryPermissions] : otherPermissions;
    });
  };

  const isCategoryCheckedAll = (category: string) => {
    return (PERMISSIONS[category] || []).every(p => selectedPermissions.includes(p.id));
  };

  return (
    <ModalForm
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
      form={form}
      open={open}
      onOpenChange={handleOpenChange}
      modalProps={{
        destroyOnClose: true,
        width: "90%",
        style: {
          maxWidth: "850px",
        },
        bodyStyle: {
          overflowY: "auto",
          overflowX: "hidden",
          maxHeight: "80vh",
          padding: "24px",
        },
      }}
      submitter={{
        render: (props, dom) => {
          return (
            <Space>
              {props.step > 0 && (
                <Button onClick={() => props.onPre()}>Previous</Button>
              )}
              {props.step < 2 && (
                <Button type="primary" onClick={() => props.onNext()}>
                  Next
                </Button>
              )}
              {props.step === 2 && (
                <Button type="primary" onClick={() => props.submit()}>
                  Submit
                </Button>
              )}
            </Space>
          );
        },
      }}
    >
      <StepsForm
        formProps={{
          validateMessages: {
            required: "${label} is required",
          },
        }}
        onFinish={handleFinish}
      >
        <StepsForm.StepForm
          name="role_type"
          title="Basic Info"
          initialValues={edit ? { ...data, role_type: role_type } : undefined}
          icon={<UserOutlined />}
          style={{ padding: "24px" }}
        >
          <ProFormText
            name="role_type"
            label="Role Type"
            placeholder="Enter role type"
            value={role_type}
            onChange={(e) => {
              setRoleType(e.target.value);
            }}
            rules={[{ required: true, message: "Role type is required" }]}
          />
        </StepsForm.StepForm>

        <StepsForm.StepForm
          name="permissions"
          title="Permissions"
          icon={<SafetyCertificateOutlined />}
          style={{ padding: "24px" }}
        >
          <Space
            direction="horizontal"
            className="w-full"
            size="large"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px', // to add spacing between the cards
            }}
          >
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
                    <Tag color="blue">
                      {selectedPermissions.filter(p =>
                        permissions.map(cp => cp.id).includes(p)
                      ).length} / {permissions.length}
                    </Tag>
                  </Space>
                }
                style={{ padding: "16px", flex: "1 0 200px" }} // Set a minimum width for each card
              >
                <Space direction="vertical" className="w-full">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center justify-between" style={{ padding: "8px 0" }}>
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
        </StepsForm.StepForm>

        <StepsForm.StepForm
          name="review"
          title="Review"
          icon={<CheckCircleOutlined />}
          style={{ padding: "24px" }}
        >
          <Card size="small" className="mb-8" style={{ padding: "16px" }}>
            <div className="mb-4">
              <h4 className="mb-2 font-medium">Role Type</h4>
              <Tag color="blue" className="text-lg">
                {role_type}
              </Tag>
            </div>
            <div>
              <h4 className="mb-2 font-medium">Selected Permissions ({selectedPermissions.length})</h4>
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
            </div>
          </Card>
        </StepsForm.StepForm>
      </StepsForm>
    </ModalForm>
  );
};

export default RoleModal;