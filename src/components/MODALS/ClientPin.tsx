import { KeyOutlined, SearchOutlined, UserOutlined, IdcardOutlined } from "@ant-design/icons";
import ProForm, { ModalForm, ProFormText } from "@ant-design/pro-form";
import { updateCart } from "@features/Cart/CartActions";
import ShowConfirm from "@utils/ConfirmUtil";
import { Button, Form, Input, Select, Space, Typography, Divider, Radio, message, Tag } from "antd";
import { CartDetailsInterface } from "src/interfaces/CartDetailsTypes";
import { useAppDispatch } from "src/store";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { fetchAllCustomers, addNewCustomer } from "@services/customers";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface ClientPinProps {
  cart: CartDetailsInterface;
}

function ClientPin({ cart }: ClientPinProps) {
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  const primaryColor = usePrimaryColor();
  const [inputMode, setInputMode] = useState<"select" | "manual">("select");
  const [customerSearch, setCustomerSearch] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: customers = [], isLoading: loadingCustomers, refetch: refetchCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchAllCustomers(),
    retry: 1,
    staleTime: 30000,
  });

  // Handle customer selection and prefill form
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c: any) => c._id === customerId);
    if (customer) {
      setSelectedCustomer(customer);

      // Prefill all form fields with customer data
      const formValues = {
        customer_id: customer._id,
        client_name: customer.customer_name || "",
        client_phone: customer.phone?.toString() || "",
        client_pin: customer.pin?.toString() || customer.kra_pin?.toString() || customer.client_pin?.toString() || "",
        client_email: customer.email || "",
      };

      form.setFieldsValue(formValues);

      // Show success message with KRA PIN if available
      if (formValues.client_pin) {
        message.success(`Customer loaded with KRA PIN: ${formValues.client_pin}`);
      } else {
        message.info(`Customer "${customer.customer_name}" loaded (No KRA PIN on file)`);
      }
    }
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter((c: any) => {
    const search = customerSearch.toLowerCase();
    return (
      c.customer_name?.toLowerCase().includes(search) ||
      c.phone?.toString().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.code?.toLowerCase().includes(search) ||
      c.kra_pin?.toLowerCase().includes(search) ||
      c.pin?.toLowerCase().includes(search)
    );
  });

  // Reset form when switching input modes
  const handleInputModeChange = (mode: "select" | "manual") => {
    setInputMode(mode);
    setSelectedCustomer(null);
    form.resetFields([
      "customer_select",
      "customer_id",
      "client_name",
      "client_phone",
      "client_pin",
      "client_email",
    ]);

    // If switching to manual, keep existing cart values as defaults
    if (mode === "manual") {
      form.setFieldsValue({
        client_name: cart?.client_name ?? cart?.clientName ?? "",
        client_phone: cart?.client_phone ?? cart?.clientPhone ?? "",
        client_pin: cart?.client_pin ?? cart?.clientPin ?? "",
        client_email: cart?.client_email ?? cart?.clientEmail ?? "",
      });
    }
  };

  // Load existing cart values when modal opens
  useEffect(() => {
    if (cart) {
      form.setFieldsValue({
        client_name: cart?.client_name ?? cart?.clientName ?? "",
        client_phone: cart?.client_phone ?? cart?.clientPhone ?? "",
        client_pin: cart?.client_pin ?? cart?.clientPin ?? "",
        client_email: cart?.client_email ?? cart?.clientEmail ?? "",
        customer_id: cart?.customer_id || null,
      });
    }
  }, [cart, form]);

  // Custom option renderer for customer select
  const renderCustomerOption = (customer: any) => {
    const hasKraPin = !!(customer.kra_pin || customer.pin || customer.client_pin);
    return (
      <Select.Option key={customer._id} value={customer._id}>
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Space>
            <UserOutlined style={{ color: primaryColor }} />
            <strong>{customer.customer_name}</strong>
            {hasKraPin && (
              <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                <IdcardOutlined /> Has PIN
              </Tag>
            )}
          </Space>
          <Space size="small" style={{ fontSize: 12, color: "#666" }}>
            <span>{customer.phone || "No phone"}</span>
            {customer.code && <span>• Code: {customer.code}</span>}
            {customer.email && <span>• {customer.email}</span>}
          </Space>
          {(customer.kra_pin || customer.pin) && (
            <Space size="small" style={{ fontSize: 11, color: "#52c41a" }}>
              <IdcardOutlined />
              <span>KRA PIN: {customer.kra_pin || customer.pin}</span>
            </Space>
          )}
        </Space>
      </Select.Option>
    );
  };

  return (
    <ModalForm
      initialValues={{
        client_name: cart?.client_name ?? cart?.clientName ?? null,
        client_phone: cart?.client_phone ?? cart?.clientPhone ?? null,
        client_pin: cart?.client_pin ?? cart?.clientPin ?? null,
        client_email: cart?.client_email ?? cart?.clientEmail ?? null,
        input_mode: cart?.customer_id ? "select" : "select",
        customer_id: cart?.customer_id || null,
      }}
      title={
        <Space>
          <KeyOutlined />
          <Typography>Client Details</Typography>
        </Space>
      }
      form={form}
      width={520}
      modalProps={{
        destroyOnClose: true,
        centered: true,
      }}
      trigger={
        <Button
          style={{ color: primaryColor, borderColor: primaryColor }}
          icon={<KeyOutlined />}
        >
          Client Details
        </Button>
      }
      onFinish={async (values) => {
        const confirmed = await ShowConfirm({
          title: "Confirm if the client details are correct?",
          position: true,
        });
        if (!confirmed) return false;

        const { input_mode, customer_select, ...rest } = values;

        let resolvedCustomerId = rest.customer_id || null;

        // ── Manual entry: create a new customer record if name or phone provided ──
        if (input_mode === "manual" && (rest.client_name || rest.client_phone)) {
          setSavingCustomer(true);
          try {
            const response = await addNewCustomer({
              customer_name: rest.client_name,
              phone: rest.client_phone,
              pin: rest.client_pin,
              kra_pin: rest.client_pin,
              email: rest.client_email || undefined,
            });

            const newCustomer = response?.data;
            if (newCustomer?._id) {
              resolvedCustomerId = newCustomer._id;
              message.success(`Customer "${rest.client_name || rest.client_phone}" saved with KRA PIN: ${rest.client_pin || "None"}`);
              // Refresh customer list
              refetchCustomers();
            }
          } catch (err) {
            console.error("Could not save new customer:", err);
            message.error("Failed to save customer");
          } finally {
            setSavingCustomer(false);
          }
        }

        const cartData = {
          client_name: rest.client_name || null,
          client_phone: rest.client_phone || null,
          client_pin: rest.client_pin || null,
          client_email: rest.client_email || null,
          customer_id: resolvedCustomerId,
        };

        dispatch(updateCart({ cart, data: cartData }));

        // Show summary of what was saved
        const savedFields = [];
        if (cartData.client_name) savedFields.push("Name");
        if (cartData.client_phone) savedFields.push("Phone");
        if (cartData.client_pin) savedFields.push("KRA PIN");
        if (cartData.client_email) savedFields.push("Email");

        message.success(`Client details saved: ${savedFields.join(", ")}`);
        return true;
      }}
      submitter={{
        submitButtonProps: {
          loading: savingCustomer,
          children: savingCustomer ? "Saving customer…" : "Confirm",
        },
      }}
    >
      <Form.Item name="input_mode" label="Input Method">
        <Radio.Group
          onChange={(e) => handleInputModeChange(e.target.value)}
          value={inputMode}
          optionType="button"
          buttonStyle="solid"
          options={[
            { label: "Select Customer", value: "select" },
            { label: "Enter Manually", value: "manual" },
          ]}
        />
      </Form.Item>

      {inputMode === "select" ? (
        <>
          <Form.Item name="customer_select" label="Search Customer">
            <Select
              showSearch
              placeholder="Search by name, phone, email, code or KRA PIN"
              loading={loadingCustomers}
              filterOption={false}
              onSearch={setCustomerSearch}
              onChange={handleCustomerSelect}
              suffixIcon={<SearchOutlined />}
              notFoundContent={
                loadingCustomers ? "Loading customers..." :
                  customerSearch ? "No customers match your search" : "Start typing to search customers"
              }
              style={{ width: "100%" }}
              optionLabelProp="label"
            >
              {filteredCustomers.map((customer: any) => renderCustomerOption(customer))}
            </Select>
          </Form.Item>

          {/* Display selected customer info if available */}
          {selectedCustomer && (
            <div
              style={{
                background: "#f0f9ff",
                padding: "8px 12px",
                borderRadius: 6,
                marginBottom: 12,
                border: `1px solid ${primaryColor}20`,
              }}
            >
              <Typography.Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                Selected Customer:
              </Typography.Text>
              <Space direction="vertical" size={2}>
                <Typography.Text style={{ fontSize: 12 }}>
                  <strong>Name:</strong> {selectedCustomer.customer_name}
                </Typography.Text>
                {selectedCustomer.phone && (
                  <Typography.Text style={{ fontSize: 12 }}>
                    <strong>Phone:</strong> {selectedCustomer.phone}
                  </Typography.Text>
                )}
                {(selectedCustomer.kra_pin || selectedCustomer.pin) && (
                  <Typography.Text style={{ fontSize: 12, color: "#52c41a" }}>
                    <strong>KRA PIN:</strong> {selectedCustomer.kra_pin || selectedCustomer.pin}
                  </Typography.Text>
                )}
                {selectedCustomer.email && (
                  <Typography.Text style={{ fontSize: 12 }}>
                    <strong>Email:</strong> {selectedCustomer.email}
                  </Typography.Text>
                )}
              </Space>
            </div>
          )}

          <Divider style={{ margin: "12px 0" }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Customer Information (Editable)
            </Typography.Text>
          </Divider>

          <Form.Item name="customer_id" hidden>
            <Input type="hidden" />
          </Form.Item>

          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_name"
              label="Client Name"
              placeholder="Auto-filled or type to override"
              rules={[{ required: false, message: "Client name is optional" }]}
            />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_phone"
              label="Phone Number"
              placeholder="Auto-filled or type to override"
              fieldProps={{ type: "tel" }}
            />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_pin"
              label="KRA PIN"
              placeholder="Auto-filled or type to override"
              fieldProps={{
                prefix: <IdcardOutlined style={{ color: primaryColor }} />,
                maxLength: 11,
              }}
            />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_email"
              label="Client Email"
              placeholder="Auto-filled or type to override"
              fieldProps={{ type: "email" }}
            />
          </ProForm.Group>
        </>
      ) : (
        <>
          <Form.Item name="customer_id" hidden>
            <Input type="hidden" />
          </Form.Item>

          <Typography.Text
            type="secondary"
            style={{ display: "block", marginBottom: 12, fontSize: 12 }}
          >
            A new customer record will be created automatically on save. All fields are optional.
          </Typography.Text>

          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_name"
              label="Client Name"
              placeholder="e.g. Rachel"
            />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_phone"
              label="Phone Number"
              placeholder="e.g. 0712345678"
              fieldProps={{ type: "tel" }}
            />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_pin"
              label="KRA PIN"
              placeholder="e.g. A123456789Z"
              fieldProps={{
                prefix: <IdcardOutlined style={{ color: primaryColor }} />,
                maxLength: 11,
              }}
            />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_email"
              label="Client Email"
              placeholder="e.g. rachel@email.com"
              fieldProps={{ type: "email" }}
            />
          </ProForm.Group>
        </>
      )}
    </ModalForm>
  );
}

export default ClientPin;