import { KeyOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import ProForm, { ModalForm, ProFormText } from "@ant-design/pro-form";
import { updateCart } from "@features/Cart/CartActions";
import ShowConfirm from "@utils/ConfirmUtil";
import { Button, Form, Input, Select, Space, Typography, Divider, Radio, message } from "antd";
import { CartDetailsInterface } from "src/interfaces/CartDetailsTypes";
import { useAppDispatch } from "src/store";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { fetchAllCustomers, addNewCustomer } from "@services/customers";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

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

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchAllCustomers(),
    retry: 1,
    staleTime: 30000,
  });

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c: any) => c._id === customerId);
    if (customer) {
      form.setFieldsValue({
        customer_id: customer._id,
        client_name: customer.customer_name,
        client_phone: customer.phone?.toString(),
        client_pin: customer.pin?.toString() ?? "",
        client_email: customer.email,
      });
    }
  };

  const filteredCustomers = customers.filter((c: any) => {
    const search = customerSearch.toLowerCase();
    return (
      c.customer_name?.toLowerCase().includes(search) ||
      c.phone?.toString().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.code?.toLowerCase().includes(search)
    );
  });

  return (
    <ModalForm
      initialValues={{
        ...cart,
        client_phone: cart?.clientPhone ?? cart?.client_phone ?? null,
        client_pin: cart?.clientPin ?? cart?.client_pin ?? null,
        input_mode: "select",
        customer_id: cart?.customer_id || null,
      }}
      title={
        <Space>
          <KeyOutlined />
          <Typography>Client Details</Typography>
        </Space>
      }
      form={form}
      width={480}
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
              email: rest.client_email || undefined,
            });

            const newCustomer = response?.data;
            if (newCustomer?._id) {
              resolvedCustomerId = newCustomer._id;
              message.success(`Customer "${rest.client_name || rest.client_phone}" saved`);
            }
          } catch (err) {
            console.error("Could not save new customer:", err);
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
          onChange={(e) => {
            setInputMode(e.target.value);
            form.resetFields([
              "customer_select",
              "customer_id",
              "client_name",
              "client_phone",
              "client_pin",
              "client_email",
            ]);
          }}
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
              placeholder="Search by name, phone or code"
              loading={loadingCustomers}
              filterOption={false}
              onSearch={setCustomerSearch}
              onChange={handleCustomerSelect}
              suffixIcon={<SearchOutlined />}
              notFoundContent={
                loadingCustomers ? "Loading..." : "No customers found"
              }
              style={{ width: "100%" }}
            >
              {filteredCustomers.map((customer: any) => (
                <Select.Option key={customer._id} value={customer._id}>
                  <Space>
                    <UserOutlined />
                    <span>{customer.customer_name}</span>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {customer.phone} {customer.code ? `· ${customer.code}` : ""}
                    </Typography.Text>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Divider style={{ margin: "12px 0" }} />

          <Form.Item name="customer_id" hidden>
            <Input type="hidden" />
          </Form.Item>

          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_name"
              label="Client Name"
              placeholder="Auto-filled or type to override"
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
              label="Client PIN"
              placeholder="Auto-filled or type to override"
            />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_email"
              label="Client Email"
              placeholder="Auto-filled or type to override"
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
            A new customer record will be created automatically on save.
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
              label="Client PIN"
              placeholder="e.g. A123456789Z"
            />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_email"
              label="Client Email"
              placeholder="e.g. rachel@email.com"
            />
          </ProForm.Group>
        </>
      )}
    </ModalForm>
  );
}

export default ClientPin;