import React, { useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  TimePicker,
  Typography,
  message,
} from "antd";
import {
  CalendarOutlined,
  CarOutlined,
  CheckCircleOutlined,
  GiftOutlined,
  SaveOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchShop,
  updateShopWhatsappMarketplace,
  ShopWhatsappMarketplace,
} from "@services/shops";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text, Title } = Typography;
const { TextArea } = Input;
const C = THEME_C;

const DEFAULT_CONFIRMATION_MESSAGE =
  "Reply YES to confirm your order.";
const DEFAULT_GIFT_PRESETS = [1000, 2500, 5000];

const MarketplaceSettings: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const shopId = localStorage.getItem("shopId");

  const { data: shopData, isLoading } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
  });

  const marketplace = shopData?.whatsapp_marketplace as
    | ShopWhatsappMarketplace
    | undefined;

  useEffect(() => {
    form.setFieldsValue({
      enabled: marketplace?.enabled ?? false,
      sell_inventory: marketplace?.sell_inventory ?? true,
      sell_services: marketplace?.sell_services ?? true,
      sell_gift_cards: marketplace?.sell_gift_cards ?? true,
      require_confirmation: marketplace?.require_confirmation ?? true,
      self_serve_enabled: marketplace?.self_serve_enabled ?? true,
      confirmation_message:
        marketplace?.confirmation_message || DEFAULT_CONFIRMATION_MESSAGE,
      gift_card_presets: (marketplace?.gift_card_presets?.length
        ? marketplace.gift_card_presets
        : DEFAULT_GIFT_PRESETS
      ).map(String),
      booking_enabled: marketplace?.booking_enabled ?? true,
      booking_open_time: dayjs(marketplace?.booking_open_time || "08:00", "HH:mm"),
      booking_close_time: dayjs(marketplace?.booking_close_time || "18:00", "HH:mm"),
      booking_slot_minutes: marketplace?.booking_slot_minutes ?? 30,
      booking_capacity: marketplace?.booking_capacity ?? 1,
      booking_max_days_ahead: marketplace?.booking_max_days_ahead ?? 60,
      booking_require_payment: marketplace?.booking_require_payment ?? false,
      pickup_enabled: marketplace?.pickup_enabled ?? true,
      delivery_enabled: marketplace?.delivery_enabled ?? true,
      delivery_fee: marketplace?.delivery_fee ?? 0,
      delivery_note: marketplace?.delivery_note || "",
    });
  }, [marketplace, form]);

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      updateShopWhatsappMarketplace(shopId!, {
        enabled: !!values.enabled,
        sell_inventory: !!values.sell_inventory,
        sell_services: !!values.sell_services,
        sell_gift_cards: !!values.sell_gift_cards,
        require_confirmation: !!values.require_confirmation,
        self_serve_enabled: !!values.self_serve_enabled,
        confirmation_message: values.confirmation_message,
        gift_card_presets: (values.gift_card_presets || [])
          .map((v: string | number) => Number(String(v).replace(/,/g, "")))
          .filter((n: number) => n > 0),
        booking_enabled: !!values.booking_enabled,
        booking_open_time: values.booking_open_time?.format?.("HH:mm") || "08:00",
        booking_close_time: values.booking_close_time?.format?.("HH:mm") || "18:00",
        booking_slot_minutes: Number(values.booking_slot_minutes) || 30,
        booking_capacity: Number(values.booking_capacity) || 1,
        booking_max_days_ahead: Number(values.booking_max_days_ahead) || 60,
        booking_require_payment: !!values.booking_require_payment,
        pickup_enabled: !!values.pickup_enabled,
        delivery_enabled: !!values.delivery_enabled,
        delivery_fee: Math.max(0, Number(values.delivery_fee) || 0),
        delivery_note: values.delivery_note || "",
      }),
    onSuccess: () => {
      message.success("WhatsApp marketplace settings saved");
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
    },
    onError: () => {
      message.error("Failed to save WhatsApp marketplace settings");
    },
  });

  const enabled = Form.useWatch("enabled", form);
  const sellServices = Form.useWatch("sell_services", form);
  const sellGiftCards = Form.useWatch("sell_gift_cards", form);
  const bookingOn = Form.useWatch("booking_enabled", form);
  const sellInventory = Form.useWatch("sell_inventory", form);
  const pickupOn = Form.useWatch("pickup_enabled", form);
  const deliveryOn = Form.useWatch("delivery_enabled", form);

  if (!shopId) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Shop not found"
        description="Could not determine your shop. Please log out and log back in."
      />
    );
  }

  return (
    <Card loading={isLoading} bordered={false} style={{ maxWidth: 720 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            <ShoppingCartOutlined style={{ color: C.primary, marginRight: 8 }} />
            WhatsApp Marketplace
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Let customers buy items directly inside a WhatsApp chat. When enabled,
            agents get a Sell button in the Omnichannel inbox to build an order,
            send it to the customer for confirmation, and place it — inventory is
            deducted automatically and the customer receives an order code.
          </Text>
        </div>

        {marketplace?.enabled && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="Marketplace is active for this shop"
            style={{ borderRadius: 8 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => saveMutation.mutate(values)}
          disabled={isLoading}
        >
          <Form.Item
            name="enabled"
            label="Enable WhatsApp Marketplace"
            valuePropName="checked"
            style={{ marginBottom: 16 }}
          >
            <Switch />
          </Form.Item>

          <Card
            size="small"
            title={
              <Space>
                <ShopOutlined style={{ color: C.primary }} />
                <Text strong style={{ fontSize: 13 }}>
                  What can customers buy?
                </Text>
              </Space>
            }
            style={{
              borderRadius: 8,
              marginBottom: 16,
              opacity: enabled ? 1 : 0.5,
            }}
          >
            <Space direction="vertical" size={8}>
              <Form.Item
                name="sell_inventory"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Checkbox disabled={!enabled}>
                  Inventory items (stock is deducted automatically on confirm)
                </Checkbox>
              </Form.Item>
              <Form.Item
                name="sell_services"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Checkbox disabled={!enabled}>Services</Checkbox>
              </Form.Item>
              <Form.Item
                name="sell_gift_cards"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Checkbox disabled={!enabled}>
                  Gift cards (a card code is issued and sent to the customer)
                </Checkbox>
              </Form.Item>
            </Space>
          </Card>

          <Card
            size="small"
            title={
              <Space>
                <CarOutlined style={{ color: "#ea580c" }} />
                <Text strong style={{ fontSize: 13 }}>
                  Collect or delivery
                </Text>
              </Space>
            }
            style={{
              borderRadius: 8,
              marginBottom: 16,
              opacity: enabled && sellInventory ? 1 : 0.5,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
              Before paying for physical items, customers choose how they get their
              order. With several shops they also pick which shop to collect from —
              each shop's stock is shown, and if their pick is out of stock the next
              shop that has everything is suggested. Delivery asks for an address or a
              shared location pin, and the fee is added as its own line on the order.
            </Text>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Form.Item name="pickup_enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox disabled={!enabled || !sellInventory || (pickupOn && !deliveryOn)}>
                  Collect at the shop{" "}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    (also lists this shop as a pickup point for orders from your other shops)
                  </Text>
                </Checkbox>
              </Form.Item>
              <Form.Item name="delivery_enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox disabled={!enabled || !sellInventory || (deliveryOn && !pickupOn)}>
                  Delivery
                </Checkbox>
              </Form.Item>
              <Space wrap size={12} style={{ opacity: deliveryOn ? 1 : 0.5 }}>
                <Form.Item name="delivery_fee" label="Delivery fee (Ksh)" style={{ marginBottom: 0 }}>
                  <InputNumber min={0} step={50} disabled={!enabled || !deliveryOn} style={{ width: 140 }} />
                </Form.Item>
                <Form.Item name="delivery_note" label="Note shown to customers" style={{ marginBottom: 0 }}>
                  <Input
                    maxLength={80}
                    disabled={!enabled || !deliveryOn}
                    placeholder="e.g. Within Nairobi, 1–2 hours"
                    style={{ width: 260 }}
                  />
                </Form.Item>
              </Space>
            </Space>
          </Card>

          <Card
            size="small"
            title={
              <Space>
                <GiftOutlined style={{ color: "#c026d3" }} />
                <Text strong style={{ fontSize: 13 }}>
                  Gift card amounts
                </Text>
              </Space>
            }
            style={{
              borderRadius: 8,
              marginBottom: 16,
              opacity: enabled && sellGiftCards ? 1 : 0.5,
            }}
          >
            <Form.Item
              name="gift_card_presets"
              extra="Quick-pick amounts offered in chat — customers can still type any amount."
              style={{ marginBottom: 0 }}
            >
              <Select
                mode="tags"
                tokenSeparators={[" "]}
                disabled={!enabled || !sellGiftCards}
                placeholder="e.g. 1000 2500 5000"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Card>

          <Card
            size="small"
            title={
              <Space>
                <CalendarOutlined style={{ color: "#7c3aed" }} />
                <Text strong style={{ fontSize: 13 }}>
                  Appointment booking in chat
                </Text>
              </Space>
            }
            extra={
              <Form.Item name="booking_enabled" valuePropName="checked" noStyle>
                <Switch size="small" disabled={!enabled || !sellServices} />
              </Form.Item>
            }
            style={{
              borderRadius: 8,
              marginBottom: 16,
              opacity: enabled && sellServices && bookingOn ? 1 : 0.5,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
              Customers pick a service, a day and one of the open time slots. Slots
              come from these hours, skip times that are already booked, and are also
              offered after any paid order that includes a service.
            </Text>
            <Space wrap size={12}>
              <Form.Item name="booking_open_time" label="Opens" style={{ marginBottom: 8 }}>
                <TimePicker format="HH:mm" minuteStep={15} disabled={!enabled || !bookingOn} />
              </Form.Item>
              <Form.Item name="booking_close_time" label="Closes" style={{ marginBottom: 8 }}>
                <TimePicker format="HH:mm" minuteStep={15} disabled={!enabled || !bookingOn} />
              </Form.Item>
              <Form.Item name="booking_slot_minutes" label="Slot every" style={{ marginBottom: 8 }}>
                <Select
                  disabled={!enabled || !bookingOn}
                  style={{ width: 110 }}
                  options={[15, 30, 45, 60].map((m) => ({ value: m, label: `${m} min` }))}
                />
              </Form.Item>
              <Form.Item
                name="booking_capacity"
                label="Bookings at once"
                tooltip="How many customers one service can take in the same slot (e.g. number of stylists)"
                style={{ marginBottom: 8 }}
              >
                <InputNumber min={1} max={50} disabled={!enabled || !bookingOn} />
              </Form.Item>
              <Form.Item name="booking_max_days_ahead" label="Days ahead" style={{ marginBottom: 8 }}>
                <InputNumber min={1} max={365} disabled={!enabled || !bookingOn} />
              </Form.Item>
            </Space>
            <Form.Item
              name="booking_require_payment"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Checkbox disabled={!enabled || !bookingOn}>
                Require payment in chat to confirm a booking (hides “pay at the shop”)
              </Checkbox>
            </Form.Item>
          </Card>

          <Form.Item
            name="self_serve_enabled"
            label="Let customers order by chatting"
            tooltip="Customers text MENU, ORDER, GIFT CARD or BOOK and the assistant walks them step by step to a finished order, gift card or booking — M-Pesa payment details from the System Profile are shared automatically (no payment is triggered)"
            valuePropName="checked"
            style={{ marginBottom: 16 }}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                Keywords: <Text code>MENU</Text> (all options),{" "}
                <Text code>ORDER</Text> / <Text code>SHOP</Text> (catalogue),{" "}
                <Text code>GIFT CARD</Text>, <Text code>BOOK</Text> and{" "}
                <Text code>AGENT</Text> (back to your team). Short requests such as
                “can I book a massage on Friday?” are understood too.
              </Text>
            }
          >
            <Switch disabled={!enabled} />
          </Form.Item>

          <Form.Item
            name="require_confirmation"
            label="Require customer confirmation before placing the order"
            tooltip="The customer must reply YES in the chat before the agent can place the order"
            valuePropName="checked"
            style={{ marginBottom: 16 }}
          >
            <Switch disabled={!enabled} />
          </Form.Item>

          <Form.Item
            name="confirmation_message"
            label="Confirmation prompt sent with the order summary"
            style={{ marginBottom: 16 }}
          >
            <TextArea
              rows={2}
              disabled={!enabled}
              placeholder={DEFAULT_CONFIRMATION_MESSAGE}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            style={{ background: C.primary, borderColor: C.primary }}
          >
            Save WhatsApp Settings
          </Button>
        </Form>
      </Space>
    </Card>
  );
};

const WhatsAppIntegrationSettings: React.FC = () => <MarketplaceSettings />;

export default WhatsAppIntegrationSettings;
