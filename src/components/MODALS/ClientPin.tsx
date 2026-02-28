import { KeyOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import ProForm, { ModalForm, ProFormText } from "@ant-design/pro-form";
import { updateCart } from "@features/Cart/CartActions";
import ShowConfirm from "@utils/ConfirmUtil";
import { Button, Form, Input, Select, Space, Typography, Divider, Radio } from "antd";
import { CartDetailsInterface } from "src/interfaces/CartDetailsTypes";
import { useAppDispatch } from "src/store";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { fetchAllCustomers } from "@services/customers";
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
        client_pin: customer.phone?.toString(),
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
        client_pin: cart?.clientPin,
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
        if (confirmed) {
          const { input_mode, customer_select, ...rest } = values;

          const cartData = {
            client_name: rest.client_name || null,
            client_pin: rest.client_pin || null,
            client_email: rest.client_email || null,
            customer_id: rest.customer_id || null,
          };

          dispatch(updateCart({ cart, data: cartData }));
          return true;
        }
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

          {/* Fixed: use antd Input so Form context registers the value */}
          <Form.Item name="customer_id" hidden>
            <Input type="hidden" />
          </Form.Item>

          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_name"
              label="Client Name"
              placeholder="Auto-filled on selection"
              fieldProps={{ readOnly: true }}
            />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_pin"
              label="Client Pin / Phone"
              placeholder="Auto-filled on selection"
              fieldProps={{ readOnly: true }}
            />
          </ProForm.Group>
          <ProForm.Group>
            <ProFormText
              width="md"
              name="client_email"
              label="Client Email"
              placeholder="Auto-filled on selection"
              fieldProps={{ readOnly: true }}
            />
          </ProForm.Group>
        </>
      ) : (
        <>
          {/* Also include hidden customer_id in manual mode - cleared on mode switch */}
          <Form.Item name="customer_id" hidden>
            <Input type="hidden" />
          </Form.Item>

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
              name="client_pin"
              label="Client Pin / Phone"
              placeholder="A**********"
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