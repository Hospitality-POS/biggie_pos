import { KeyOutlined, SearchOutlined, UserOutlined, IdcardOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { ModalForm, ProFormText } from "@ant-design/pro-form";
import { updateCart } from "@features/Cart/CartActions";
import ShowConfirm from "@utils/ConfirmUtil";
import { Button, Form, Input, Select, Space, Typography, Divider, Radio, message, Tag, Row, Col, AutoComplete } from "antd";
import { CartDetailsInterface } from "src/interfaces/CartDetailsTypes";
import { useAppDispatch } from "src/store";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { fetchAllCustomers, addNewCustomer, updateCustomer } from "@services/customers";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";

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
  const [addressOptions, setAddressOptions] = useState<any[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);

  const { data: customers = [], isLoading: loadingCustomers, refetch: refetchCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchAllCustomers(),
    retry: 1,
    staleTime: 30000,
  });

  // ── Google Places functionality ───────────────────────────────────────────────
  const loadGoogleMaps = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.maps?.places) { resolve(); return; }
      if (document.getElementById("gmap-script")) {
        const check = setInterval(() => {
          if ((window as any).google?.maps?.places) { clearInterval(check); resolve(); }
        }, 100);
        setTimeout(() => { clearInterval(check); reject("timeout"); }, 10000);
        return;
      }
      const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
      if (!key) { reject("no key"); return; }
      const script = document.createElement("script");
      script.id = "gmap-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const check = setInterval(() => {
          if ((window as any).google?.maps?.places) { clearInterval(check); resolve(); }
        }, 100);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await loadGoogleMaps();
      } catch (error) {
        console.log("Google Maps not available");
      }
    };
    init();
  }, [loadGoogleMaps]);

  const getPlacePredictions = useCallback(async (input: string) => {
    if (!input || !(window as any).google?.maps?.places) {
      setAddressOptions([]);
      return;
    }

    setAddressLoading(true);
    try {
      const service = new (window as any).google.maps.places.AutocompleteService();
      const predictions = await new Promise<any[]>((resolve, reject) => {
        service.getPlacePredictions(
          { input, componentRestrictions: { country: "KE" } },
          (results: any[], status: string) => {
            if (status === "OK") {
              resolve(results);
            } else {
              reject(status);
            }
          }
        );
      });
      
      setAddressOptions(predictions.map(p => ({
        value: p.description,
        label: p.description,
        place_id: p.place_id,
      })));
    } catch (error) {
      setAddressOptions([]);
    } finally {
      setAddressLoading(false);
    }
  }, []);

  const getPlaceDetails = useCallback(async (placeId: string) => {
    if (!placeId || !(window as any).google?.maps?.places) {
      return null;
    }

    try {
      const service = new (window as any).google.maps.places.PlacesService(document.createElement("div"));
      const details = await new Promise<any>((resolve, reject) => {
        service.getDetails(
          { placeId, fields: ['address_components', 'formatted_address'] },
          (result: any, status: string) => {
            if (status === "OK") {
              resolve(result);
            } else {
              reject(status);
            }
          }
        );
      });

      const getComponent = (type: string) =>
        details.address_components?.find((c: any) => c.types.includes(type))?.long_name ?? null;

      return {
        street: getComponent("route") ? `${getComponent("street_number") || ""} ${getComponent("route")}`.trim() : null,
        building: getComponent("establishment") || getComponent("point_of_interest"),
        city: getComponent("locality") || getComponent("administrative_area_level_2"),
        county: getComponent("administrative_area_level_1"),
        postal_code: getComponent("postal_code"),
        country: getComponent("country"),
      };
    } catch (error) {
      return null;
    }
  }, []);

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
        // Address fields
        address: {
          street: customer.address?.street || "",
          building: customer.address?.building || "",
          city: customer.address?.city || "",
          county: customer.address?.county || "",
          postal_code: customer.address?.postal_code || "",
          country: customer.address?.country || "",
        },
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
      "address",
    ]);

    // If switching to manual, keep existing cart values as defaults
    if (mode === "manual") {
      form.setFieldsValue({
        client_name: cart?.client_name ?? cart?.clientName ?? "",
        client_phone: cart?.client_phone ?? cart?.clientPhone ?? "",
        client_pin: cart?.client_pin ?? cart?.clientPin ?? "",
        client_email: cart?.client_email ?? cart?.clientEmail ?? "",
        address: {
          street: cart?.address?.street ?? "",
          building: cart?.address?.building ?? "",
          city: cart?.address?.city ?? "",
          county: cart?.address?.county ?? "",
          postal_code: cart?.address?.postal_code ?? "",
          country: cart?.address?.country ?? "",
        },
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
        address: {
          street: cart?.address?.street ?? "",
          building: cart?.address?.building ?? "",
          city: cart?.address?.city ?? "",
          county: cart?.address?.county ?? "",
          postal_code: cart?.address?.postal_code ?? "",
          country: cart?.address?.country ?? "",
        },
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
        address: {
          street: cart?.address?.street ?? null,
          building: cart?.address?.building ?? null,
          city: cart?.address?.city ?? null,
          county: cart?.address?.county ?? null,
          postal_code: cart?.address?.postal_code ?? null,
          country: cart?.address?.country ?? null,
        },
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
      width={800}
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

        // ── Manual entry: create a new customer record ──
        if (input_mode === "manual") {
          setSavingCustomer(true);
          try {
            const addressData = {
              street: rest.address?.street || undefined,
              building: rest.address?.building || undefined,
              city: rest.address?.city || undefined,
              county: rest.address?.county || undefined,
              postal_code: rest.address?.postal_code || undefined,
              country: rest.address?.country || undefined,
            };

            const response = await addNewCustomer({
              customer_name: rest.client_name || undefined,
              phone: rest.client_phone || undefined,
              pin: rest.client_pin || undefined,
              kra_pin: rest.client_pin || undefined,
              email: rest.client_email || undefined,
              address: addressData,
            });

            const newCustomer = response?.data;
            if (newCustomer?._id) {
              resolvedCustomerId = newCustomer._id;
              message.success(`Customer "${rest.client_name || rest.client_phone || "New Customer"}" created successfully`);
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

        // ── Update existing customer address if address fields are filled ──
        if (input_mode === "select" && resolvedCustomerId) {
          const hasAddressData = !!(
            rest.address?.street ||
            rest.address?.building ||
            rest.address?.city ||
            rest.address?.county ||
            rest.address?.postal_code ||
            rest.address?.country
          );

          if (hasAddressData) {
            setSavingCustomer(true);
            try {
              const addressData = {
                street: rest.address?.street || undefined,
                building: rest.address?.building || undefined,
                city: rest.address?.city || undefined,
                county: rest.address?.county || undefined,
                postal_code: rest.address?.postal_code || undefined,
                country: rest.address?.country || undefined,
              };

              await updateCustomer(resolvedCustomerId, { address: addressData });
              message.success("Customer address updated successfully");
              // Refresh customer list
              refetchCustomers();
            } catch (err) {
              console.error("Could not update customer address:", err);
              message.error("Failed to update customer address");
            } finally {
              setSavingCustomer(false);
            }
          }
        }

        const addressData = {
          street: rest.address?.street || undefined,
          building: rest.address?.building || undefined,
          city: rest.address?.city || undefined,
          county: rest.address?.county || undefined,
          postal_code: rest.address?.postal_code || undefined,
          country: rest.address?.country || undefined,
        };

        const cartData = {
          client_name: rest.client_name || null,
          client_phone: rest.client_phone || null,
          client_pin: rest.client_pin || null,
          client_email: rest.client_email || null,
          address: addressData,
          customer_id: resolvedCustomerId,
        };

        dispatch(updateCart({ cart, data: cartData }));

        // Show summary of what was saved
        const savedFields = [];
        if (cartData.client_name) savedFields.push("Name");
        if (cartData.client_phone) savedFields.push("Phone");
        if (cartData.client_pin) savedFields.push("KRA PIN");
        if (cartData.client_email) savedFields.push("Email");
        if (cartData.address && Object.values(cartData.address).some(v => v)) savedFields.push("Address");

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

          <Row gutter={[12, 8]}>
            <Col span={12}>
              <ProFormText
                width="md"
                name="client_name"
                label="Client Name"
                placeholder="Auto-filled or type to override"
                rules={[{ required: false, message: "Client name is optional" }]}
              />
            </Col>
            <Col span={12}>
              <ProFormText
                width="md"
                name="client_phone"
                label="Phone Number"
                placeholder="Auto-filled or type to override"
                fieldProps={{ type: "tel" }}
              />
            </Col>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
              <ProFormText
                width="md"
                name="client_email"
                label="Client Email"
                placeholder="Auto-filled or type to override"
                fieldProps={{ type: "email" }}
              />
            </Col>
          </Row>

          <Divider style={{ margin: "12px 0" }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Address Information (Editable)
            </Typography.Text>
          </Divider>

          <Row gutter={[12, 8]}>
            <Col span={24}>
              <Form.Item name={["address", "street"]} label="Street Address" style={{ marginBottom: 8 }}>
                <AutoComplete
                  options={addressOptions}
                  onSearch={getPlacePredictions}
                  onSelect={async (value: string, option: any) => {
                    const details = await getPlaceDetails(option.place_id);
                    if (details) {
                      form.setFieldsValue({
                        address: {
                          ...form.getFieldValue('address'),
                          street: details.street || value,
                          building: details.building,
                          city: details.city,
                          county: details.county,
                          postal_code: details.postal_code,
                          country: details.country,
                        }
                      });
                    }
                  }}
                  style={{ width: '100%' }}
                >
                  <Input
                    prefix={<EnvironmentOutlined style={{ color: primaryColor }} />}
                    placeholder="Start typing street address..."
                  />
                </AutoComplete>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={["address", "building"]} label="Building/Landmark" style={{ marginBottom: 8 }}>
                <Input placeholder="Auto-filled or type to override" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={["address", "city"]} label="City/Town" style={{ marginBottom: 8 }}>
                <Input placeholder="Auto-filled or type to override" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={["address", "postal_code"]} label="Postal Code" style={{ marginBottom: 8 }}>
                <Input placeholder="Auto-filled or type to override" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={["address", "county"]} label="County/State" style={{ marginBottom: 8 }}>
                <Input placeholder="Auto-filled or type to override" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={["address", "country"]} label="Country" style={{ marginBottom: 8 }}>
                <Input placeholder="Auto-filled or type to override" />
              </Form.Item>
            </Col>
          </Row>
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

          <Row gutter={[12, 8]}>
            <Col span={12}>
              <ProFormText
                width="md"
                name="client_name"
                label="Client Name"
                placeholder="e.g. Rachel"
              />
            </Col>
            <Col span={12}>
              <ProFormText
                width="md"
                name="client_phone"
                label="Phone Number"
                placeholder="e.g. 0712345678"
                fieldProps={{ type: "tel" }}
              />
            </Col>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
              <ProFormText
                width="md"
                name="client_email"
                label="Client Email"
                placeholder="e.g. rachel@email.com"
                fieldProps={{ type: "email" }}
              />
            </Col>
          </Row>

          <Divider style={{ margin: "12px 0" }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Address Information
            </Typography.Text>
          </Divider>

          <Row gutter={[12, 8]}>
            <Col span={24}>
              <Form.Item name={["address", "street"]} label="Street Address" style={{ marginBottom: 8 }}>
                <AutoComplete
                  options={addressOptions}
                  onSearch={getPlacePredictions}
                  onSelect={async (value: string, option: any) => {
                    const details = await getPlaceDetails(option.place_id);
                    if (details) {
                      form.setFieldsValue({
                        address: {
                          ...form.getFieldValue('address'),
                          street: details.street || value,
                          building: details.building,
                          city: details.city,
                          county: details.county,
                          postal_code: details.postal_code,
                          country: details.country,
                        }
                      });
                    }
                  }}
                  style={{ width: '100%' }}
                >
                  <Input
                    prefix={<EnvironmentOutlined style={{ color: primaryColor }} />}
                    placeholder="Start typing street address..."
                  />
                </AutoComplete>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={["address", "building"]} label="Building/Landmark" style={{ marginBottom: 8 }}>
                <Input placeholder="e.g. Westgate Mall" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={["address", "city"]} label="City/Town" style={{ marginBottom: 8 }}>
                <Input placeholder="e.g. Nairobi" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={["address", "postal_code"]} label="Postal Code" style={{ marginBottom: 8 }}>
                <Input placeholder="e.g. 00100" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={["address", "county"]} label="County/State" style={{ marginBottom: 8 }}>
                <Input placeholder="e.g. Westlands" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={["address", "country"]} label="Country" style={{ marginBottom: 8 }}>
                <Input placeholder="e.g. Kenya" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
    </ModalForm>
  );
}

export default ClientPin;